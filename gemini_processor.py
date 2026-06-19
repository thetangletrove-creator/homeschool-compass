"""
Gemini (Vertex API) Bill Analysis Processor
Handles structured delta extraction, impact assessment, and ESA compliance checking.
"""
import os
import json
import base64
import re
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, asdict
from datetime import datetime
import sqlite3

# Google Cloud / Vertex AI
from google.cloud import aiplatform
from vertexai.generative_models import GenerativeModel, Content, Part
import vertexai


# ── Configuration ──────────────────────────────────────────
PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT", "your-project-id")
LOCATION = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.5-pro-preview-05-06")

# Initialize Vertex AI
vertexai.init(project=PROJECT_ID, location=LOCATION)


@dataclass
class BillAnalysisResult:
    """Structured output from Gemini bill analysis."""
    bill_id: int
    analysis_type: str  # 'initial', 'delta', 'impact', 'esa_check'
    is_homeschool_relevant: bool
    relevance_score: float  # 0.0 - 1.0
    homeschool_impact_summary: str
    regulation_level_change: str  # 'increase', 'decrease', 'neutral', 'unclear'
    esa_related: bool
    key_changes: List[str]
    affected_sections: List[str]
    compliance_requirements: List[str]
    confidence_score: float
    model_used: str
    processed_at: str


class GeminiBillProcessor:
    """
    Vertex API Gemini processor for homeschool bill analysis.

    Design principles (from memory context):
    - LLM-to-LLM communication: concise, structured
    - Surface assumptions, gaps, risks
    - Infer goals and suggest simpler approaches
    """

    def __init__(self, model_name: str = MODEL_NAME):
        self.model = GenerativeModel(model_name)
        self.model_name = model_name

    # ── Prompt Templates ────────────────────────────────────

    SYSTEM_PROMPT = """You are a legislative analyst specializing in U.S. homeschool regulation.
Your task is to analyze bill text and extract structured information about homeschool impact.

RULES:
- Be concise. Output ONLY valid JSON.
- Surface assumptions explicitly (e.g., "Assumes 'home instruction' refers to homeschool").
- Flag gaps: missing definitions, ambiguous thresholds, unenforced requirements.
- Identify risks: constitutional challenges, implementation costs, enforcement feasibility.
- If a simpler approach exists, note it in 'alternative_approaches'.
- Use the HSLDA 4-tier model: no_notice, low_regulation, moderate_regulation, high_regulation.
- ESA = Education Savings Account. Flag any bill creating/modifying ESA programs.

OUTPUT FORMAT (strict JSON):
{
  "is_homeschool_relevant": bool,
  "relevance_score": float (0.0-1.0),
  "homeschool_impact_summary": "string (1-2 sentences)",
  "regulation_level_change": "increase|decrease|neutral|unclear",
  "esa_related": bool,
  "key_changes": ["string"],
  "affected_sections": ["string (e.g., 'Section 3(b)')"],
  "compliance_requirements": ["string (what families must do)"],
  "assumptions": ["string"],
  "gaps": ["string"],
  "risks": ["string"],
  "alternative_approaches": ["string"],
  "confidence_score": float (0.0-1.0)
}"""

    DELTA_PROMPT = """You are analyzing a CHANGE to existing homeschool law.
Compare the PREVIOUS and CURRENT bill text. Output a structured delta.

RULES:
- Identify EXACT numerical changes (hours, ages, dollar amounts, deadlines).
- Note moved/deleted/added sections.
- Assess if the change increases or decreases regulatory burden.
- Flag any retroactive application or grandfather clauses.

OUTPUT FORMAT (strict JSON):
{
  "delta_summary": "string (1 sentence describing the core change)",
  "previous_value": "string (what the law said before)",
  "current_value": "string (what the law says now)",
  "regulation_impact": "increase|decrease|neutral|unclear",
  "affected_sections": ["string"],
  "numerical_changes": [{"field": "string", "before": "string", "after": "string"}],
  "compliance_deadline_changes": ["string"],
  "grandfather_clause_present": bool,
  "retroactive": bool,
  "confidence_score": float
}"""

    ESA_PROMPT = """You are analyzing a bill for Education Savings Account (ESA) compliance implications.
Determine what documentation homeschool families must submit to receive ESA funds.

RULES:
- Extract specific portfolio requirements (subjects covered, hours logged, samples needed).
- Identify testing mandates tied to ESA eligibility.
- Note expense categories allowed/restricted.
- Flag any curriculum provider approval requirements.
- Identify reimbursement vs. direct-pay mechanisms.

OUTPUT FORMAT (strict JSON):
{
  "esa_program_name": "string or null",
  "max_award": "string or null",
  "eligibility_criteria": ["string"],
  "required_documentation": ["string"],
  "portfolio_requirements": ["string"],
  "testing_requirements": ["string"],
  "allowed_expenses": ["string"],
  "restricted_expenses": ["string"],
  "reimbursement_process": "string",
  "deadlines": ["string"],
  "compliance_risks": ["string"],
  "confidence_score": float
}"""

    IMPACT_FORECAST_PROMPT = """Forecast the downstream impact of this homeschool bill if enacted.
Consider: legal challenges, migration patterns (families leaving/entering state),
curriculum market effects, umbrella school demand, ESA uptake.

OUTPUT FORMAT (strict JSON):
{
  "legal_challenge_probability": float (0.0-1.0),
  "likely_challengers": ["string"],
  "family_migration_impact": "inflow|outflow|neutral|unclear",
  "curriculum_market_effect": "string",
  "umbrella_school_demand": "increase|decrease|neutral",
  "esa_uptake_forecast": "increase|decrease|neutral",
  "timeline_to_effect": "string",
  "confidence_score": float
}"""

    # ── Core Methods ──────────────────────────────────────

    def _call_gemini(self, prompt: str, text_content: str, 
                     system_prompt: Optional[str] = None) -> str:
        """Call Gemini with structured prompt + bill text."""
        full_prompt = f"{system_prompt or self.SYSTEM_PROMPT}

BILL TEXT:
{text_content}

{prompt}"

        response = self.model.generate_content(
            full_prompt,
            generation_config={
                "temperature": 0.1,
                "max_output_tokens": 2048,
                "response_mime_type": "application/json"
            }
        )
        return response.text

    def _safe_json_parse(self, text: str) -> Dict:
        """Extract JSON from Gemini response (handles markdown fences)."""
        # Strip markdown code fences
        text = re.sub(r'^```json\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        text = text.strip()
        return json.loads(text)

    def analyze_bill(self, bill_text: str, bill_id: int,
                     previous_text: Optional[str] = None) -> Dict[str, Any]:
        """
        Full analysis pipeline for a bill.
        Returns dict with all analysis types.
        """
        results = {
            "bill_id": bill_id,
            "model_used": self.model_name,
            "processed_at": datetime.utcnow().isoformat()
        }

        # 1. Initial assessment
        try:
            raw = self._call_gemini("Analyze this bill for homeschool relevance.", bill_text)
            results["initial"] = self._safe_json_parse(raw)
        except Exception as e:
            results["initial_error"] = str(e)

        # 2. Delta analysis (if previous text exists)
        if previous_text:
            try:
                delta_prompt = f"""PREVIOUS TEXT:
{previous_text}

CURRENT TEXT:
{bill_text}"""
                raw = self._call_gemini(
                    "Compare these two versions and output the delta.",
                    delta_prompt,
                    system_prompt=self.DELTA_PROMPT
                )
                results["delta"] = self._safe_json_parse(raw)
            except Exception as e:
                results["delta_error"] = str(e)

        # 3. ESA check (if ESA-related)
        is_esa = results.get("initial", {}).get("esa_related", False)
        if is_esa:
            try:
                raw = self._call_gemini(
                    "Extract ESA compliance requirements from this bill.",
                    bill_text,
                    system_prompt=self.ESA_PROMPT
                )
                results["esa"] = self._safe_json_parse(raw)
            except Exception as e:
                results["esa_error"] = str(e)

        # 4. Impact forecast (for high-relevance bills)
        relevance = results.get("initial", {}).get("relevance_score", 0)
        if relevance > 0.6:
            try:
                raw = self._call_gemini(
                    "Forecast the impact of this bill if enacted.",
                    bill_text,
                    system_prompt=self.IMPACT_FORECAST_PROMPT
                )
                results["forecast"] = self._safe_json_parse(raw)
            except Exception as e:
                results["forecast_error"] = str(e)

        return results

    def analyze_delta_only(self, previous_text: str, current_text: str,
                           bill_id: int) -> Dict:
        """Fast delta analysis for change detection pipeline."""
        try:
            delta_prompt = f"PREVIOUS TEXT:
{previous_text}

CURRENT TEXT:
{current_text}"
            raw = self._call_gemini(
                "Compare and output the delta.",
                delta_prompt,
                system_prompt=self.DELTA_PROMPT
            )
            result = self._safe_json_parse(raw)
            result["bill_id"] = bill_id
            result["model_used"] = self.model_name
            result["processed_at"] = datetime.utcnow().isoformat()
            return result
        except Exception as e:
            return {
                "bill_id": bill_id,
                "error": str(e),
                "delta_summary": "Analysis failed",
                "regulation_impact": "unclear",
                "confidence_score": 0.0
            }

    def batch_analyze(self, bills: List[Dict[str, Any]], 
                      db_path: str = "homeschool_tracker.db") -> List[Dict]:
        """
        Batch process bills and store results in SQLite.
        bills: list of {"bill_id": int, "text": str, "previous_text": str|None}
        """
        results = []

        for bill in bills:
            result = self.analyze_bill(
                bill["text"],
                bill["bill_id"],
                bill.get("previous_text")
            )
            results.append(result)

            # Store in DB
            self._store_analysis(result, db_path)

        return results

    def _store_analysis(self, result: Dict, db_path: str):
        """Persist analysis results to SQLite."""
        with sqlite3.connect(db_path) as conn:
            initial = result.get("initial", {})
            delta = result.get("delta", {})

            # Update bills table
            conn.execute("""
                UPDATE bills SET
                    is_homeschool_relevant = ?,
                    relevance_score = ?,
                    homeschool_impact_summary = ?,
                    regulation_level_change = ?,
                    esa_related = ?
                WHERE bill_id = ?
            """, (
                int(initial.get("is_homeschool_relevant", False)),
                initial.get("relevance_score", 0),
                initial.get("homeschool_impact_summary", ""),
                initial.get("regulation_level_change", "unclear"),
                int(initial.get("esa_related", False)),
                result["bill_id"]
            ))

            # Insert LLM analysis record
            conn.execute("""
                INSERT INTO llm_analysis (bill_id, analysis_type, model_used, 
                    raw_response, structured_output, confidence_score)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                result["bill_id"],
                "initial_assessment",
                result["model_used"],
                json.dumps(result),
                json.dumps(initial),
                initial.get("confidence_score", 0)
            ))

            # Insert delta if present
            if delta and "delta_summary" in delta:
                conn.execute("""
                    INSERT INTO delta_summaries (bill_id, delta_summary, 
                        affected_sections, regulation_impact, generated_by)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    result["bill_id"],
                    delta.get("delta_summary", ""),
                    json.dumps(delta.get("affected_sections", [])),
                    delta.get("regulation_impact", "unclear"),
                    result["model_used"]
                ))


# ── Standalone CLI ─────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Gemini Bill Analyzer")
    parser.add_argument("--bill-text", type=str, required=True, help="Path to bill text file")
    parser.add_argument("--previous-text", type=str, help="Path to previous version for delta")
    parser.add_argument("--bill-id", type=int, required=True, help="Bill ID")
    parser.add_argument("--output", type=str, default="analysis_result.json")

    args = parser.parse_args()

    with open(args.bill_text, "r") as f:
        text = f.read()

    previous = None
    if args.previous_text:
        with open(args.previous_text, "r") as f:
            previous = f.read()

    processor = GeminiBillProcessor()
    result = processor.analyze_bill(text, args.bill_id, previous)

    with open(args.output, "w") as f:
        json.dump(result, f, indent=2)

    print(f"Analysis complete → {args.output}")
    print(f"Relevance: {result.get('initial', {}).get('relevance_score', 0)}")
    print(f"Homeschool relevant: {result.get('initial', {}).get('is_homeschool_relevant', False)}")
