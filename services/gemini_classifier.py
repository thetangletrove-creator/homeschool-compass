#!/usr/bin/env python3
"""
Gemini Bill Classifier — Homeschool Compass
=============================================
Classifies bill data into structured impact assessments via the local
Gemini proxy (port 5002, which wraps Vertex AI with reliable auth).

Two-tier analysis:
  Tier 1 (Impact) — impact direction + ESA detection + confidence
  Tier 2 (Deep)   — delta, analysis_points, action_required, key_provisions

Usage:
    from services.gemini_classifier import GeminiBillClassifier

    classifier = GeminiBillClassifier()
    result = classifier.analyze_bill(title="SB 1234", state="CA",
                                     description="Adds portfolio review...")
    # => { "impact": "increase", "impact_confidence": 0.92, ... }

    # Batch
    results = classifier.batch_analyze([{"title":..., "state":..., "description":...}])
"""

import os
import json
import time
from typing import Optional, Dict, List, Any
from openai import OpenAI

# ── Configuration ──────────────────────────────────────────────────────

BASE_URL = os.getenv("GEMINI_PROXY_URL", "http://localhost:5002/v1")
API_KEY = os.getenv("GEMINI_PROXY_KEY", "not-needed")
MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
BATCH_DELAY = float(os.getenv("GEMINI_BATCH_DELAY", "0.15"))
MAX_RETRIES = int(os.getenv("GEMINI_MAX_RETRIES", "3"))


# ── System Prompt ──────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a legislative analyst specializing in US homeschool regulation.
Your task is to analyze bill information and return a structured JSON assessment.

For each bill, you must classify:
1. **Impact direction**: whether the bill INCREASES regulatory burden on homeschool families, DECREASES it, or is NEUTRAL
2. **ESA relevance**: whether the bill relates to Education Savings Account (ESA) programs
3. **Confidence**: how confident you are in your assessment (0.0-1.0)
4. **Deep analysis** (Tier 2): delta, analysis points, action required, key provisions

Examples:

Bill: "Adds Annual Portfolio Review Requirement" (CA) — "Requires annual portfolio review conducted by a credentialed teacher for each homeschooled pupil."
→ {"impact": "increase", "impact_confidence": 0.95, "esa_related": false, "esa_confidence": 0.0, "impact_summary": "Adds annual portfolio review requirement", "delta": "No review required → Annual review by certified teacher", "action_required": "If enacted, families must submit portfolios by July 2027.", "analysis_points": ["Establishes new mandatory annual portfolio review", "Reviews must be by credentialed teacher", "July 1 submission deadline starting 2027"], "key_provisions": ["Annual portfolio review", "Credentialed teacher requirement"], "effective_date": "2027-07-01", "target_audience": "All homeschool families in state"}

Bill: "Establishes Universal Education Savings Accounts" (TX) — "Creates universal ESA available to all K-12 students including home educators."
→ {"impact": "decrease", "impact_confidence": 0.92, "esa_related": true, "esa_confidence": 0.98, "impact_summary": "Creates universal ESA, reduces filing burden", "delta": "No state funding → Up to $10,000 per student ESA", "action_required": "Applications open June 1. Enrollment verification required.", "analysis_points": ["Creates universal ESA for all K-12 students", "Maximum award $10,000 per year", "Removes prior notarized affidavit requirement"], "key_provisions": ["Universal ESA program", "Quarterly expense reporting"], "effective_date": null, "target_audience": "All homeschool families in state"}

Bill: "Clarifies Notice of Intent Filing Window" (CO) — "Clarifies the timeframe for filing notice of intent with local school district."
→ {"impact": "neutral", "impact_confidence": 0.88, "esa_related": false, "esa_confidence": 0.0, "impact_summary": "Procedural clarification, no burden change", "delta": "Ambiguous window → Defined 14-day filing window", "action_required": "No new obligations; clarifies existing deadline.", "analysis_points": ["Defines clear 14-day filing window", "No substantive requirement change", "Reduces inconsistent enforcement"], "key_provisions": ["14-day filing window"], "effective_date": null, "target_audience": "Homeschool families filing notice of intent"}

Instructions:
- Return ONLY valid JSON. No markdown fences, no commentary. Just the JSON object.
- If uncertain, set lower confidence rather than guessing.
- ESA = Education Savings Account or similar school-choice funding mechanism.
- "increase" = more regulation/burden/reporting. "decrease" = less. "neutral" = no meaningful change.
- At minimum, provide the impact fields. Deep analysis (delta, analysis_points, etc.) is preferred."""


class GeminiBillClassifier:
    """Classifies bills using Gemini via the local proxy (port 5002)."""

    def __init__(
        self,
        model: str = MODEL,
        base_url: str = BASE_URL,
        api_key: str = API_KEY,
        retries: int = MAX_RETRIES,
        batch_delay: float = BATCH_DELAY,
    ):
        self.model = model
        self.retries = retries
        self.batch_delay = batch_delay
        self.client = OpenAI(base_url=base_url, api_key=api_key)

    # ── Core Analysis ────────────────────────────────────────────────

    def _call_gemini(self, prompt_text: str) -> Optional[Dict]:
        """Call Gemini via proxy with retry logic."""
        for attempt in range(self.retries):
            content = ""
            try:
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": prompt_text},
                    ],
                    temperature=0.1,
                    max_tokens=1024,
                )

                content = response.choices[0].message.content
                if not content:
                    raise ValueError("Empty response")

                # Clean markdown fences if present
                cleaned = content.strip()
                if cleaned.startswith("```"):
                    # Strip the opening fence (```json or ```)
                    cleaned = cleaned.split("\n", 1)[-1] if "\n" in cleaned else cleaned[3:]
                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3].strip()

                return json.loads(cleaned)

            except (json.JSONDecodeError, ValueError) as e:
                attempt_msg = f"  ⚠️  JSON parse error (attempt {attempt+1}/{self.retries}): {e}"
                if attempt < self.retries - 1:
                    try:
                        attempt_msg += f" — got: {content[:80]}..."
                    except:
                        pass
                    attempt_msg += ", retrying..."
                print(attempt_msg)
                time.sleep(1 * (attempt + 1))

            except Exception as e:
                attempt_msg = f"  ⚠️  Gemini call failed (attempt {attempt+1}/{self.retries}): {e}"
                if attempt < self.retries - 1:
                    attempt_msg += ", retrying..."
                print(attempt_msg)
                time.sleep(2 * (attempt + 1))

        print("  ✗ All retries exhausted, returning fallback neutral")
        return None

    def analyze_bill(
        self,
        title: str,
        state: str = "",
        description: str = "",
        deep_analysis: bool = True,
    ) -> Dict[str, Any]:
        """
        Classify a single bill.

        Args:
            title: Bill title
            state: State code (e.g. "CA", "TX")
            description: Bill description or summary text
            deep_analysis: If True, full Tier 1 + Tier 2. If False, Tier 1 only.

        Returns:
            Dict with impact, confidence, esa_related, plus deep analysis fields.
        """
        bill_text = title
        if state:
            bill_text += f" ({state})"
        if description:
            bill_text += f" — {description[:500]}"

        if deep_analysis:
            prompt = f"""Analyze this bill for homeschool impact. Provide full analysis including impact, impact_confidence, esa_related, esa_confidence, impact_summary, delta, action_required, analysis_points, key_provisions, effective_date, and target_audience.

{bill_text}"""
        else:
            prompt = f"""Analyze this bill for homeschool impact. Provide basic classification: impact (increase|decrease|neutral), impact_confidence (0.0-1.0), esa_related (bool), esa_confidence (0.0-1.0), and impact_summary (1 sentence).

{bill_text}"""

        result = self._call_gemini(prompt)

        if result is None:
            return self._fallback_result()

        return self._validate_result(result)

    def batch_analyze(
        self,
        bills: List[Dict[str, str]],
        deep_analysis: bool = True,
    ) -> List[Dict[str, Any]]:
        """
        Analyze multiple bills sequentially with rate limiting.

        Args:
            bills: List of dicts with keys 'title', 'state', 'description'
            deep_analysis: Whether to request deep (Tier 2) analysis

        Returns:
            List of result dicts
        """
        results = []
        for i, bill in enumerate(bills):
            title = bill.get("title", "")
            state = bill.get("state", "")
            description = bill.get("description", "")

            print(f"  [{i+1}/{len(bills)}] {state} {title[:50]}...")
            result = self.analyze_bill(
                title=title,
                state=state,
                description=description,
                deep_analysis=deep_analysis,
            )
            result["_index"] = i
            results.append(result)

            if i < len(bills) - 1:
                time.sleep(self.batch_delay)

        return results

    # ── Fallback / Validation ───────────────────────────────────────

    def _fallback_result(self) -> Dict[str, Any]:
        """Return safe fallback when Gemini is unreachable."""
        return {
            "impact": "neutral",
            "impact_confidence": 0.0,
            "esa_related": False,
            "esa_confidence": 0.0,
            "impact_summary": "Analysis unavailable",
            "delta": "",
            "action_required": None,
            "analysis_points": [],
            "key_provisions": [],
            "effective_date": None,
            "target_audience": None,
            "_fallback": True,
        }

    def _validate_result(self, result: Dict) -> Dict:
        """Ensure required fields exist, fill defaults if missing."""
        valid_impacts = {"increase", "decrease", "neutral"}
        impact = result.get("impact", "neutral")
        if impact not in valid_impacts:
            impact = "neutral"

        return {
            "impact": impact,
            "impact_confidence": float(result.get("impact_confidence", 0.0)),
            "esa_related": bool(result.get("esa_related", False)),
            "esa_confidence": float(result.get("esa_confidence", 0.0)),
            "impact_summary": result.get("impact_summary", ""),
            "delta": result.get("delta", ""),
            "action_required": result.get("action_required"),
            "analysis_points": result.get("analysis_points", []),
            "key_provisions": result.get("key_provisions", []),
            "effective_date": result.get("effective_date"),
            "target_audience": result.get("target_audience"),
            "_fallback": False,
        }


# ── Standalone CLI ──────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Gemini Bill Classifier")
    parser.add_argument("--title", type=str, help="Bill title")
    parser.add_argument("--state", type=str, default="", help="State code")
    parser.add_argument("--description", type=str, default="", help="Bill description")
    parser.add_argument("--quick", action="store_true", help="Tier 1 only")
    parser.add_argument("--test", action="store_true", help="Run test cases")

    args = parser.parse_args()

    classifier = GeminiBillClassifier()

    if args.test:
        test_bills = [
            {"title": "Adds Annual Portfolio Review Requirement", "state": "CA", "description": "Requires annual portfolio review conducted by a credentialed teacher for each homeschooled pupil."},
            {"title": "Establishes Universal Education Savings Accounts", "state": "TX", "description": "Creates universal ESA available to all K-12 students including home educators."},
            {"title": "Clarifies Notice of Intent Filing Window", "state": "CO", "description": "Clarifies the timeframe for filing notice of intent with local school district."},
        ]
        results = classifier.batch_analyze(test_bills, deep_analysis=not args.quick)
        for i, r in enumerate(results):
            print(f"\n--- Result {i+1} ---")
            print(json.dumps(r, indent=2))
    else:
        result = classifier.analyze_bill(
            title=args.title,
            state=args.state,
            description=args.description,
            deep_analysis=not args.quick,
        )
        print(json.dumps(result, indent=2))
