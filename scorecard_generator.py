"""
Homeschool Freedom Scorecard Generator
Generates 50-state comparison data + visualization for viral marketing asset.
"""
import os
import json
import sqlite3
from datetime import datetime, date
from typing import Dict, List, Optional
from dataclasses import dataclass
from pathlib import Path

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np


# ── Scoring Rubric ─────────────────────────────────────────

@dataclass
class ScoringRubric:
    """Weights and point assignments for scorecard calculation."""

    # Reporting Burden (30%)
    notification_required: int = 0      # 0=none, 25=optional, 50=required
    annual_filing: int = 0              # 0=none, 25=optional, 50=required
    portfolio_review: int = 0           # 0=none, 25=optional, 50=required
    curriculum_approval: int = 0        # 0=none, 25=optional, 50=required

    # Testing Mandate (25%)
    testing_requirement: str = "none"   # none, optional, periodic, annual, state

    # Curriculum Freedom (25%)
    curriculum_restriction: str = "none"  # none, subject_list, hours, approved_list, mandated

    # Teacher Qualification (20%)
    teacher_requirement: str = "none"   # none, diploma, credits, certificate, certified

    # ESA Program (bonus/penalty)
    esa_program: bool = False
    esa_restrictive: bool = False       # ESA with heavy homeschool compliance strings


# Point mappings
TESTING_POINTS = {
    "none": 100, "optional": 75, "periodic": 50, "annual": 25, "state": 0
}

CURRICULUM_POINTS = {
    "none": 100, "subject_list": 75, "hours": 50, "approved_list": 25, "mandated": 0
}

TEACHER_POINTS = {
    "none": 100, "diploma": 75, "credits": 50, "certificate": 25, "certified": 0
}

GRADE_THRESHOLDS = [
    (97, "A+"), (93, "A"), (90, "A-"),
    (87, "B+"), (83, "B"), (80, "B-"),
    (77, "C+"), (73, "C"), (70, "C-"),
    (67, "D+"), (63, "D"), (60, "D-"),
    (0, "F")
]


def calculate_score(rubric: ScoringRubric) -> Dict[str, float]:
    """Calculate component and overall scores from rubric."""

    # Reporting burden (0-100, weighted 30%)
    reporting = 100 - (rubric.notification_required + rubric.annual_filing + 
                       rubric.portfolio_review + rubric.curriculum_approval)
    reporting = max(0, min(100, reporting))

    # Testing (0-100, weighted 25%)
    testing = TESTING_POINTS.get(rubric.testing_requirement, 50)

    # Curriculum (0-100, weighted 25%)
    curriculum = CURRICULUM_POINTS.get(rubric.curriculum_restriction, 50)

    # Teacher (0-100, weighted 20%)
    teacher = TEACHER_POINTS.get(rubric.teacher_requirement, 50)

    # Weighted overall
    overall = (reporting * 0.30) + (testing * 0.25) + (curriculum * 0.25) + (teacher * 0.20)

    # ESA adjustment
    if rubric.esa_program and rubric.esa_restrictive:
        overall -= 5  # Penalty for restrictive ESA strings
    elif rubric.esa_program:
        overall += 3  # Small bonus for ESA availability

    overall = max(0, min(100, overall))

    # Grade
    grade = "F"
    for threshold, g in GRADE_THRESHOLDS:
        if overall >= threshold:
            grade = g
            break

    return {
        "overall": round(overall, 1),
        "reporting": round(reporting, 1),
        "testing": round(testing, 1),
        "curriculum": round(curriculum, 1),
        "teacher": round(teacher, 1),
        "grade": grade,
        "esa_program": rubric.esa_program
    }


# ── State Data (Seed) ──────────────────────────────────────

STATE_RUBRICS: Dict[str, ScoringRubric] = {
    # No Notice / Low Regulation
    "TX": ScoringRubric(0, 0, 0, 0, "none", "none", "none", True, False),
    "AK": ScoringRubric(0, 0, 0, 0, "none", "none", "none", False, False),
    "ID": ScoringRubric(0, 0, 0, 0, "none", "none", "none", True, False),
    "IL": ScoringRubric(0, 0, 0, 0, "none", "none", "none", True, False),
    "IN": ScoringRubric(0, 0, 0, 0, "none", "none", "none", True, False),
    "MI": ScoringRubric(0, 0, 0, 0, "none", "none", "none", False, False),
    "MO": ScoringRubric(0, 0, 0, 0, "none", "none", "none", False, False),
    "NJ": ScoringRubric(0, 0, 0, 0, "none", "none", "none", False, False),
    "OK": ScoringRubric(0, 0, 0, 0, "none", "none", "none", True, False),

    # Low Regulation (notification only)
    "CA": ScoringRubric(25, 25, 0, 0, "none", "none", "none", True, False),
    "FL": ScoringRubric(25, 0, 0, 0, "none", "none", "none", True, False),
    "GA": ScoringRubric(25, 0, 0, 0, "none", "none", "none", True, False),
    "NC": ScoringRubric(25, 0, 0, 0, "none", "none", "none", False, False),
    "TN": ScoringRubric(25, 0, 0, 0, "none", "none", "none", True, False),
    "VA": ScoringRubric(25, 0, 0, 0, "none", "none", "none", False, False),

    # Moderate Regulation
    "CO": ScoringRubric(25, 0, 25, 0, "periodic", "subject_list", "none", True, False),
    "IA": ScoringRubric(25, 0, 25, 0, "periodic", "subject_list", "none", True, False),
    "LA": ScoringRubric(25, 25, 0, 0, "periodic", "subject_list", "none", True, False),
    "MD": ScoringRubric(25, 0, 25, 0, "periodic", "subject_list", "none", False, False),
    "MN": ScoringRubric(25, 0, 25, 0, "periodic", "hours", "none", False, False),
    "NH": ScoringRubric(25, 0, 25, 0, "periodic", "subject_list", "none", True, False),
    "ND": ScoringRubric(25, 0, 25, 0, "periodic", "subject_list", "none", False, False),
    "OH": ScoringRubric(25, 0, 25, 0, "periodic", "subject_list", "none", True, False),
    "OR": ScoringRubric(25, 0, 25, 0, "periodic", "subject_list", "none", False, False),
    "SC": ScoringRubric(25, 0, 25, 0, "periodic", "subject_list", "none", False, False),
    "SD": ScoringRubric(25, 0, 25, 0, "periodic", "subject_list", "none", False, False),
    "WA": ScoringRubric(25, 0, 25, 0, "periodic", "subject_list", "none", False, False),
    "WV": ScoringRubric(25, 0, 25, 0, "periodic", "subject_list", "none", True, False),
    "WI": ScoringRubric(25, 0, 25, 0, "periodic", "subject_list", "none", False, False),

    # High Regulation
    "MA": ScoringRubric(25, 25, 25, 25, "annual", "approved_list", "diploma", False, False),
    "NY": ScoringRubric(25, 25, 25, 25, "annual", "approved_list", "diploma", False, False),
    "PA": ScoringRubric(25, 25, 25, 25, "annual", "approved_list", "diploma", False, False),
    "RI": ScoringRubric(25, 25, 25, 25, "annual", "approved_list", "diploma", False, False),
    "VT": ScoringRubric(25, 25, 25, 25, "annual", "approved_list", "diploma", False, False),
}


def generate_scorecard(db_path: str = "homeschool_tracker.db") -> Dict:
    """Generate complete scorecard data."""
    scores = {}

    for state_code, rubric in STATE_RUBRICS.items():
        scores[state_code] = calculate_score(rubric)

    # Sort by overall score descending
    ranked = sorted(scores.items(), key=lambda x: x[1]["overall"], reverse=True)

    return {
        "generated_at": datetime.utcnow().isoformat(),
        "methodology_version": "1.0",
        "total_states": len(scores),
        "rankings": [
            {"rank": i+1, "state": s, **data}
            for i, (s, data) in enumerate(ranked)
        ],
        "grade_distribution": {
            grade: sum(1 for _, d in scores.items() if d["grade"] == grade)
            for grade in ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"]
        }
    }


def save_scorecard_to_db(scorecard: Dict, db_path: str):
    """Persist scorecard metrics to SQLite."""
    with sqlite3.connect(db_path) as conn:
        snapshot_date = date.today().isoformat()

        for entry in scorecard["rankings"]:
            state = entry["state"]

            # Component metrics
            for metric_name in ["reporting", "testing", "curriculum", "teacher"]:
                conn.execute("""
                    INSERT OR REPLACE INTO scorecard_metrics
                    (state_code, metric_name, score, weight, calculation_method, data_snapshot_date)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (state, metric_name, entry[metric_name], 
                      {"reporting": 0.30, "testing": 0.25, "curriculum": 0.25, "teacher": 0.20}[metric_name],
                      "rubric_v1", snapshot_date))

            # Overall score
            conn.execute("""
                INSERT OR REPLACE INTO scorecard_overall
                (state_code, overall_score, freedom_grade, snapshot_date, methodology_version)
                VALUES (?, ?, ?, ?, ?)
            """, (state, entry["overall"], entry["grade"], snapshot_date, "1.0"))


def create_scorecard_visualization(scorecard: Dict, output_path: str = "scorecard_2026.png"):
    """Generate publication-ready scorecard visualization."""

    rankings = scorecard["rankings"]
    states = [r["state"] for r in rankings]
    scores = [r["overall"] for r in rankings]
    grades = [r["grade"] for r in rankings]

    # Grade colors
    grade_colors = {
        "A+": "#1a9850", "A": "#2ca25f", "A-": "#41ab5d",
        "B+": "#74c476", "B": "#a1d99b", "B-": "#c7e9c0",
        "C+": "#fee08b", "C": "#fdae61", "C-": "#f46d43",
        "D+": "#d73027", "D": "#a50026", "D-": "#7f0000",
        "F": "#4d0000"
    }
    colors = [grade_colors.get(g, "#999") for g in grades]

    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(16, 14), 
                                    gridspec_kw={"height_ratios": [3, 1]})

    # ── Top: Horizontal bar chart ─────────────────────────
    y_pos = np.arange(len(states))
    bars = ax1.barh(y_pos, scores, color=colors, edgecolor="white", linewidth=0.5)
    ax1.set_yticks(y_pos)
    ax1.set_yticklabels(states, fontsize=8)
    ax1.invert_yaxis()
    ax1.set_xlim(0, 105)
    ax1.set_xlabel("Freedom Score (0-100)", fontsize=12)
    ax1.set_title("🏠 Homeschool Freedom Scorecard 2026
50-State Regulatory Burden Rankings", 
                  fontsize=16, fontweight="bold", pad=20)

    # Add grade labels
    for bar, score, grade in zip(bars, scores, grades):
        ax1.text(bar.get_width() + 1, bar.get_y() + bar.get_height()/2,
                f"{score:.0f} {grade}", va="center", fontsize=7, fontweight="bold")

    # Add vertical reference lines
    for threshold in [60, 70, 80, 90]:
        ax1.axvline(x=threshold, color="gray", linestyle="--", alpha=0.3, linewidth=0.5)

    # Legend
    legend_patches = [mpatches.Patch(color=c, label=g) 
                      for g, c in grade_colors.items() 
                      if g in set(grades)]
    ax1.legend(handles=legend_patches, loc="lower right", fontsize=8, 
             title="Grade", title_fontsize=9)

    # ── Bottom: Grade distribution ──────────────────────────
    dist = scorecard["grade_distribution"]
    dist_sorted = {k: dist[k] for k in grade_colors.keys() if dist.get(k, 0) > 0}

    ax2.bar(dist_sorted.keys(), dist_sorted.values(), 
            color=[grade_colors[g] for g in dist_sorted.keys()],
            edgecolor="white", linewidth=0.5)
    ax2.set_ylabel("Number of States", fontsize=11)
    ax2.set_xlabel("Grade", fontsize=11)
    ax2.set_title("Grade Distribution", fontsize=12, fontweight="bold")

    # Add count labels
    for i, (grade, count) in enumerate(dist_sorted.items()):
        ax2.text(i, count + 0.1, str(count), ha="center", fontsize=10, fontweight="bold")

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches="tight", facecolor="white")
    plt.close()

    print(f"📊 Scorecard visualization saved → {output_path}")
    return output_path


def create_state_detail_card(state_code: str, db_path: str = "homeschool_tracker.db") -> str:
    """Generate markdown detail card for a single state."""

    rubric = STATE_RUBRICS.get(state_code)
    if not rubric:
        return f"No data for {state_code}"

    score = calculate_score(rubric)

    # Query recent bills
    with sqlite3.connect(db_path) as conn:
        bills = conn.execute("""
            SELECT bill_number, title, status, homeschool_impact_summary, regulation_level_change
            FROM bills WHERE state_code = ? AND is_homeschool_relevant = 1
            ORDER BY updated_at DESC LIMIT 5
        """, (state_code,)).fetchall()

    md = f"""# {state_code} — Homeschool Regulation Profile

**Overall Freedom Score:** {score["overall"]}/100 | **Grade:** {score["grade"]}

## Component Breakdown

| Category | Score | Weight |
|----------|-------|--------|
| Reporting Burden | {score["reporting"]} | 30% |
| Testing Mandate | {score["testing"]} | 25% |
| Curriculum Freedom | {score["curriculum"]} | 25% |
| Teacher Qualification | {score["teacher"]} | 20% |

## Current Requirements

- **Notification:** {"Required" if rubric.notification_required > 0 else "Not required"}
- **Annual Filing:** {"Required" if rubric.annual_filing > 0 else "Not required"}
- **Portfolio Review:** {"Required" if rubric.portfolio_review > 0 else "Not required"}
- **Curriculum Approval:** {"Required" if rubric.curriculum_approval > 0 else "Not required"}
- **Testing:** {rubric.testing_requirement.replace("_", " ").title()}
- **Teacher Qualification:** {rubric.teacher_requirement.replace("_", " ").title()}
- **ESA Program:** {"Active" if rubric.esa_program else "Not active"}

## Recent Legislative Activity

"""

    if bills:
        for b in bills:
            md += f"- **{b[0]}** ({b[2]}): {b[1]}
"
            if b[3]:
                md += f"  - Impact: {b[3]}
"
            if b[4]:
                md += f"  - Direction: {b[4]}
"
    else:
        md += "_No recent homeschool-relevant bills tracked._
"

    return md


# ── CLI ───────────────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Homeschool Freedom Scorecard Generator")
    parser.add_argument("--generate", action="store_true", help="Generate full scorecard")
    parser.add_argument("--visualize", action="store_true", help="Create visualization")
    parser.add_argument("--state", type=str, help="Generate detail card for specific state")
    parser.add_argument("--db", type=str, default="homeschool_tracker.db")
    parser.add_argument("--output", type=str, default="scorecard_2026.png")
    parser.add_argument("--json", type=str, default="scorecard_data.json")

    args = parser.parse_args()

    if args.generate or args.visualize:
        scorecard = generate_scorecard(args.db)

        # Save JSON
        with open(args.json, "w") as f:
            json.dump(scorecard, f, indent=2)
        print(f"📄 Scorecard JSON → {args.json}")

        # Save to DB
        save_scorecard_to_db(scorecard, args.db)

        # Create visualization
        if args.visualize:
            create_scorecard_visualization(scorecard, args.output)

    elif args.state:
        card = create_state_detail_card(args.state.upper(), args.db)
        output_file = f"{args.state.upper()}_profile.md"
        with open(output_file, "w") as f:
            f.write(card)
        print(f"📄 State profile → {output_file}")
