#!/usr/bin/env python3
"""
Homeschool Compass — Compliance Pack Generator (Redesigned)
Two-column hero layout with sticky deadline rail, bill triage queue,
confidence bars, ESA packet, and legal disclaimer.

Usage:
    python3 compliance-pack.py IA > /tmp/ia-pack.html
    python3 compliance-pack.py --list
    python3 compliance-pack.py --all-esa
"""

import os, sys, json, html as htmlmod
from datetime import datetime, timezone

DB = os.environ.get("DATABASE_URL_ADMIN", "")
if not DB:
    _ENV = "/opt/homeschool-compass/.env"
    if os.path.exists(_ENV):
        with open(_ENV) as f:
            for line in f:
                line = line.strip()
                if line.startswith("DATABASE_URL_ADMIN="):
                    DB = line.split("=", 1)[1].strip("\"'")

import psycopg2
import psycopg2.extras

def q(sql, params=None):
    conn = psycopg2.connect(DB)
    conn.autocommit = True
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as c:
        c.execute(sql, params or ())
        rows = c.fetchall()
    conn.close()
    return rows

STATUS_LABELS = {0:"Introduced",1:"Passed Chamber",2:"Passed Both",3:"Enacted/Signed",4:"Failed",5:"Vetoed"}
H = htmlmod.escape


def fetch_state_data(code):
    code = code.upper()
    s = q("SELECT * FROM states WHERE code=%s", (code,))
    if not s:
        print(f"State {code} not found", file=sys.stderr)
        sys.exit(1)
    s = dict(s[0])

    # Stats
    stats = dict(q("""
        SELECT COUNT(*)::int as total,
               COUNT(*) FILTER(WHERE esa_related=true)::int as esa_bills,
               COUNT(*) FILTER(WHERE impact='increase')::int as inc_bills,
               COUNT(*) FILTER(WHERE impact='decrease')::int as dec_bills,
               COUNT(*) FILTER(WHERE impact='neutral')::int as neu_bills,
               COUNT(*) FILTER(WHERE status_step>=3)::int as enacted,
               COUNT(*) FILTER(WHERE status_step>=3 AND impact='increase')::int as enacted_inc,
               COUNT(*) FILTER(WHERE status_step>=3 AND impact='decrease')::int as enacted_dec
        FROM bills WHERE state_code=%s
    """, (code,))[0])

    # All bills sorted by actionability
    bills = q("""
        SELECT number, title, status_step, impact, impact_summary, delta,
               action_required, esa_related, effective_date, target_audience,
               impact_confidence, esa_related_confidence, analysis::text as analysis_json
        FROM bills WHERE state_code=%s
        ORDER BY
            CASE WHEN status_step>=3 AND impact IN ('increase','decrease') THEN 10
                 WHEN impact IN ('increase','decrease') THEN 5 ELSE 0 END DESC,
            CASE impact WHEN 'increase' THEN 2 WHEN 'decrease' THEN 1 ELSE 0 END DESC,
            date DESC
        LIMIT 30
    """, (code,))

    # ESA bills specifically
    esa_bills = q("""
        SELECT number, title, status_step, impact, impact_summary,
               action_required, effective_date, impact_confidence, esa_related_confidence
        FROM bills WHERE state_code=%s AND esa_related=true
        ORDER BY impact_confidence DESC NULLS LAST
        LIMIT 10
    """, (code,))

    # Live aggregate confidence
    conf = dict(q("""
        SELECT
            AVG(impact_confidence)::double precision as avg_impact_conf,
            AVG(esa_related_confidence)::double precision as avg_esa_conf
        FROM bills WHERE state_code=%s
    """, (code,))[0])

    # Bill text fetch progress
    text_stats = dict(q("""
        SELECT
            COUNT(*)::int as total,
            COUNT(*) FILTER(WHERE fetch_status='fetched')::int as fetched,
            COUNT(*) FILTER(WHERE fetch_status='pending')::int as pending,
            COUNT(*) FILTER(WHERE fetch_status='error')::int as error_count
        FROM bill_full_text
        WHERE bill_id LIKE %s
    """, (f"{code.lower()}-%",))[0])

    return s, stats, bills, esa_bills, conf, text_stats


def render(c_code):
    c_code = c_code.upper()
    state, stats, bills, esa_bills, conf, text_stats = fetch_state_data(c_code)

    now_dt = datetime.now(timezone.utc).strftime("%B %d, %Y")
    now_short = datetime.now(timezone.utc).strftime("%b %d, %Y")

    # Determine grade
    score = state["score"]
    if score >= 90: grade, note = "A", "Exceptional"
    elif score >= 80: grade, note = "B", "Strong"
    elif score >= 70: grade, note = "C", "Moderate"
    elif score >= 60: grade, note = "D", "Limited"
    else: grade, note = "F", "Restricted"

    subs = state.get("subscores") or {}
    esa_docs = state.get("esa_documentation") or []
    if isinstance(esa_docs, str):
        try: esa_docs = json.loads(esa_docs)
        except: esa_docs = []

    enacted_inc = stats["enacted_inc"]
    enacted_dec = stats["enacted_dec"]
    total_bills = stats["total"]

    # Confidence values
    avg_impact_conf = conf.get("avg_impact_conf") or 0.83
    avg_esa_conf = conf.get("avg_esa_conf") or 0.90
    text_fetched = text_stats.get("fetched", 0)
    text_pending = text_stats.get("pending", 0)
    text_total = text_stats.get("total", 0)
    text_pct = round(text_fetched / max(text_total, 1) * 100, 1)

    # Score/grade colors
    score_color = "#16a34a" if grade == "A" else "#65a30d" if grade == "B" else "#ca8a04" if grade == "C" else "#ea580c" if grade == "D" else "#dc2626"

    parts = []

    # ── HELPER: Bill Card ──
    def bill_card(b):
        imp = b["impact"]
        imp_colors = {
            "increase": ("#b93832", "#fff0ee"),
            "decrease": ("#16815b", "#eaf7ef"),
            "neutral": ("#667085", "#f2f4f7"),
        }
        color, bg = imp_colors.get(imp, ("#667085", "#f2f4f7"))
        status_label = STATUS_LABELS.get(b["status_step"], "Unknown")
        title = H(b["title"][:180])
        num = H(b["number"])
        summary = H(b.get("impact_summary") or "") if b.get("impact_summary") else ""
        action = H(b.get("action_required") or "") if b.get("action_required") else ""
        eff = H(b.get("effective_date") or "") if b.get("effective_date") else ""
        conf_val = b.get("impact_confidence")
        conf_str = f"{conf_val:.0%}" if conf_val else "—"

        imp_label = {"increase": "Risk", "decrease": "Upside", "neutral": "Neutral"}.get(imp, "Neutral")
        tag_class = {"increase": "tag red", "decrease": "tag green", "neutral": "tag"}[imp]

        return f"""<article class="bill">
  <div class="bill-code">{num}</div>
  <div>
    <h4>{title}</h4>
    {f'<p>{summary}</p>' if summary else ''}
    <div class="meta">
      <span class="micro">{status_label}</span>
      <span class="{tag_class}">{imp_label}</span>
      <span class="micro">{conf_str} confidence</span>
      {f'<span class="micro">Effective {eff}</span>' if eff else ''}
    </div>
  </div>
  {f'<div class="bill-action"><strong>Action:</strong> {action}</div>' if action else ''}
</article>"""

    def h(s): return H(s) if s else ""

    # ── TOPBAR ──
    parts.append(f"""<div class="topbar">
  <div class="brand"><div class="logo">&lfloor;h</div> Homeschool Compass</div>
  <div class="pill">Generated {now_short} &middot; LegiScan refresh every 4h &middot; {h(state['name'])}</div>
</div>""")

    # ── HERO ──
    # Build 3 action tiles
    esa_tile = ""
    if state.get("esa_active") and state.get("esa_deadline"):
        esa_tile = f"""<div class="action-tile"><div class="num">1</div><strong>Apply before {h(state['esa_deadline'])}</strong><span>{h(state['esa_name'])} may be worth up to {h(state['esa_max_award'])}/year.</span></div>"""
    else:
        esa_tile = """<div class="action-tile"><div class="num">—</div><strong>No ESA deadline</strong><span>This state does not have an active ESA program.</span></div>"""

    enacted_count = stats["enacted"]
    inc_bills = stats["inc_bills"]
    dec_bills = stats["dec_bills"]

    parts.append(f"""<section class="hero">
  <div class="hero-grid">
    <div>
      <div class="kicker">Parent Action Brief &middot; {h(state['name'])}</div>
      <h1>What changed, what matters, what to do next.</h1>
      <p class="hero-sub">A compliance pack should prioritize decisions: deadlines first, enacted-law risk second, watchlist third.</p>
      <div class="hero-actions">
        {esa_tile}
        <div class="action-tile"><div class="num">{enacted_inc + enacted_dec}</div><strong>Review enacted changes</strong><span>{enacted_inc} regulatory, {enacted_dec} freedom-expanding bills now in effect.</span></div>
        <div class="action-tile"><div class="num">{stats['esa_bills']}</div><strong>Watch ESA/private instruction</strong><span>Bills touching funding, attendance, or curriculum requirements.</span></div>
      </div>
    </div>
    <aside class="hero-panel">
      <div class="panel-header">
        <div><div class="state-badge">{c_code} &middot; {h(state['level'])}</div><div class="score-copy">Freedom score</div></div>
        <div><div class="big-score">{score}</div><div class="score-copy"><span class="grade" style="color:{score_color}">Grade {grade}</span> &middot; {note} freedom</div></div>
      </div>
      <div class="risk-list">
        <div class="risk"><span class="dot" style="background:#b93832"></span><div><b>Oversight pressure</b><small>{inc_bills} bills classified as regulatory increase</small></div><span class="tag red">Risk</span></div>
        <div class="risk"><span class="dot" style="background:#16815b"></span><div><b>Freedom expansion</b><small>{dec_bills} bills classified as freedom increase</small></div><span class="tag green">Upside</span></div>
        <div class="risk"><span class="dot" style="background:#163b66"></span><div><b>ESA surface area</b><small>{stats['esa_bills']} bills relate to ESAs/scholarships</small></div><span class="tag blue">Track</span></div>
      </div>
    </aside>
  </div>
</section>""")

    # ── MAIN TWO-COLUMN ──
    # Left rail with sticky deadline card
    deadline_card = ""
    if state.get("esa_active") and state.get("esa_deadline"):
        dl = state["esa_deadline"]
        dl_parts = dl.split()
        if len(dl_parts) >= 2:
            month = dl_parts[0][:3]
            day = dl_parts[1].rstrip(",")
            esa_checklist = ""
            if esa_docs:
                check_items = "".join(f'<li><span class="check">&#10003;</span><span>{h(d)}</span></li>' for d in esa_docs[:4])
                esa_checklist = f'<ul class="rail-list">{check_items}</ul>'
            deadline_card = f"""<div class="card pad deadline">
  <h3>Next hard deadline</h3>
  <p class="mini-copy">{h(state['esa_name'])}</p>
  <div class="deadline-date"><span class="day">{day}</span><span class="mon">{month}<br>{dl_parts[-1] if len(dl_parts) >= 3 else ''}</span></div>
  <div class="money">Up to {h(state['esa_max_award'])}/year</div>
  {esa_checklist}
</div>"""
        else:
            deadline_card = f"""<div class="card pad deadline">
  <h3>Next hard deadline</h3>
  <p class="mini-copy">{h(state['esa_name'])}</p>
  <div class="money">Up to {h(state['esa_max_award'])}/year</div>
  <p class="mini-copy" style="margin-top:8px">Deadline: {h(state['esa_deadline'])}</p>
</div>"""
    else:
        deadline_card = """<div class="card pad deadline">
  <h3>Deadlines</h3>
  <p class="mini-copy">No hard deadlines detected this period.</p>
  <ul class="rail-list">
    <li><span class="check neutral">&#10003;</span><span>Annual filing requirements are standard — no ESA or new-law deadlines imminent.</span></li>
  </ul>
</div>"""

    # Right rail pack structure
    pack_structure_card = """<div class="card pad">
  <h3>This pack contains</h3>
  <ul class="rail-list">
    <li><span class="check neutral">1</span><span>Executive summary &amp; risk overview</span></li>
    <li><span class="check neutral">2</span><span>Action timeline (upcoming deadlines)</span></li>
    <li><span class="check neutral">3</span><span>Bill triage queue (enacted &rarr; watch &rarr; archive)</span></li>
    <li><span class="check neutral">4</span><span>ESA program packet</span></li>
    <li><span class="check neutral">5</span><span>Data confidence &amp; source appendix</span></li>
  </ul>
</div>"""

    # ── EXECUTIVE SUMMARY ──
    inc_pct = round(inc_bills / max(total_bills, 1) * 100, 1)
    esa_pct = round(stats["esa_bills"] / max(total_bills, 1) * 100, 1)

    parts.append(f"""<div class="main">
  <aside class="rail">
    {deadline_card}
    {pack_structure_card}
  </aside>
  <main class="stack">
    <section class="card pad">
      <div class="section-title">
        <div><h2>Executive summary</h2><p>For a parent, the useful question is not &ldquo;how many bills exist?&rdquo; It is &ldquo;what can hurt me, what can help me, and what needs action?&rdquo;</p></div>
        <span class="tag blue">Parent-facing</span>
      </div>
      <div class="brief-grid">
        <div class="metric"><div class="label">Tracked bills</div><div class="value">{total_bills}</div><div class="note">{h(state['name'])} education/homeschool surface</div></div>
        <div class="metric"><div class="label">Enacted</div><div class="value">{stats['enacted']}</div><div class="note">Review these before proposals</div></div>
        <div class="metric"><div class="label">Oversight</div><div class="value" style="color:#b93832">{inc_bills}</div><div class="note">Potential burden increase ({inc_pct}% of tracked)</div></div>
        <div class="metric"><div class="label">ESA-related</div><div class="value" style="color:#16815b">{stats['esa_bills']}</div><div class="note">Funding and requirements ({esa_pct}%)</div></div>
      </div>
    </section>""")

    # ── CALLOUT SPLIT ──
    callout_opportunity = ""
    callout_risk = ""

    if state.get("esa_active"):
        callout_opportunity = f"""<div class="callout green">
  <h3>Best opportunity</h3>
  <p><strong>{h(state['esa_name'])}</strong> is the obvious above-the-fold item: {h(state['esa_eligibility'])}, up to {h(state['esa_max_award'])}/year, deadline {h(state['esa_deadline'])}.</p>
</div>"""
    else:
        callout_opportunity = """<div class="callout green">
  <h3>No ESA opportunity</h3>
  <p>This state does not currently offer an Education Savings Account program. We are tracking any bills that could change this.</p>
</div>"""

    # Find highest-risk enacted bill for callout
    high_risk_bill = None
    for b in bills:
        if b["impact"] == "increase" and b["status_step"] >= 3 and b.get("impact_summary"):
            high_risk_bill = b
            break
    if high_risk_bill:
        callout_risk = f"""<div class="callout red">
  <h3>Highest compliance risk</h3>
  <p><strong>{h(high_risk_bill['number'])}:</strong> {h(high_risk_bill['impact_summary'][:200])}</p>
</div>"""
    else:
        callout_risk = """<div class="callout red">
  <h3>No high-risk enacted bills</h3>
  <p>No enacted bills with direct homeschool impact increase were detected this period. Watch items below may still require attention.</p>
</div>"""

    parts.append(f"""<section class="split">
  {callout_opportunity}
  {callout_risk}
</section>""")

    # ── ACTION TIMELINE ──
    timeline_items = ""

    # ESA deadline
    if state.get("esa_active") and state.get("esa_deadline"):
        dl = state["esa_deadline"]
        dl_parts = dl.split()
        if len(dl_parts) >= 2:
            month = dl_parts[0][:3]
            day = dl_parts[1].rstrip(",")
            timeline_items += f"""<div class="event"><div class="datebox"><b>{day}</b><span>{month}</span></div><div><h4>Apply for {h(state['esa_name'])}</h4><p>Submit required documentation before deadline.</p></div><span class="status now">Immediate</span></div>"""

    # Bill effective dates
    for b in bills[:6]:
        eff = b.get("effective_date") or ""
        if b["status_step"] >= 3 and eff:
            for sep in ["/", "-"]:
                if sep in eff:
                    pie = eff.split(sep)
                    if len(pie) >= 3:
                        mo = pie[0] if len(pie[0]) == 2 else ""
                        months = {"01":"Jan","02":"Feb","03":"Mar","04":"Apr","05":"May","06":"Jun",
                                  "07":"Jul","08":"Aug","09":"Sep","10":"Oct","11":"Nov","12":"Dec"}
                        month_label = months.get(mo, mo)
                        day_label = pie[1]
                        timeline_items += f"""<div class="event"><div class="datebox"><b>{day_label}</b><span>{month_label}</span></div><div><h4>{h(b['number'])} effective date</h4><p>{h(b['title'][:100])}</p></div><span class="status watch">Review</span></div>"""
                        break

    # Annual items
    lev = state.get("level", "")
    if lev in ("Low Regulation", "Moderate"):
        timeline_items += """<div class="event"><div class="datebox"><b>&#8734;</b><span>Annual</span></div><div><h4>Notice + assessment requirements</h4><p>Keep this as a standing compliance checklist, not mixed into bill tracking.</p></div><span class="status done">Routine</span></div>"""
    elif lev == "No Notice":
        timeline_items += """<div class="event"><div class="datebox"><b>&#8734;</b><span>None</span></div><div><h4>No mandatory filing</h4><p>This state requires no notice or testing for homeschoolers.</p></div><span class="status done">Minimal</span></div>"""

    if not timeline_items:
        timeline_items = """<div class="event"><div class="datebox"><b>—</b><span>None</span></div><div><h4>No deadlines this period</h4><p>No imminent filing dates, ESA deadlines, or bill effective dates detected.</p></div><span class="status done">Clear</span></div>"""

    parts.append(f"""<section class="card pad">
  <div class="section-title">
    <div><h2>Action timeline</h2><p>Concrete sequencing beats dumping every effective date into a calendar.</p></div>
    <span class="tag amber">Do next</span>
  </div>
  <div class="timeline">
    {timeline_items}
  </div>
</section>""")

    # ── BILL TRIAGE QUEUE ──
    enacted_bills = [b for b in bills if b["status_step"] >= 3 and b["impact"] in ("increase", "decrease")]
    watch_bills = [b for b in bills if b["status_step"] < 3 and b["impact"] in ("increase", "decrease")]
    archive_bills = [b for b in bills if b["impact"] == "neutral" or (b["status_step"] in (4, 5))]

    triage_section = f"""<section class="card pad">
  <div class="section-title">
    <div><h2>Bill triage queue</h2><p>Cards sorted by actionability: enacted + high-impact first, then pending watch items, then archive.</p></div>
    <span class="tag red">Compliance review</span>
  </div>
  <div class="bill-table">"""

    if enacted_bills:
        triage_section += '<div class="triage-header"><span class="tag red">Enacted/Signed</span><span class="mini-copy">These bills are law. Review for compliance impact.</span></div>'
        for b in enacted_bills[:6]:
            triage_section += bill_card(b)
    else:
        triage_section += """<div class="triage-header"><span class="tag green">No enacted-impact bills</span><span class="mini-copy">No enacted bills with direct homeschool impact this period.</span></div>"""

    if watch_bills:
        triage_section += '<div class="triage-header" style="margin-top:16px"><span class="tag amber">Watch / Proposed</span><span class="mini-copy">Not yet law, but impactful if passed.</span></div>'
        for b in watch_bills[:6]:
            triage_section += bill_card(b)

    if archive_bills:
        triage_section += '<details class="show-more" style="margin-top:12px"><summary>View {0} neutral/archived bills</summary>'.format(len(archive_bills))
        for b in archive_bills[:6]:
            triage_section += bill_card(b)
        if len(archive_bills) > 6:
            triage_section += f'<p class="more-link">+ {len(archive_bills) - 6} more bills</p>'
        triage_section += "</details>"
    else:
        triage_section += '<p class="mini-copy" style="margin-top:12px;text-align:center">No neutral or archived bills for this state.</p>'

    triage_section += "</div></section>"
    parts.append(triage_section)

    # ── ESA PROGRAM CARD ──
    if state.get("esa_active"):
        esa_detail = ""
        for det_label, det_val in [("Program Name", state["esa_name"]), ("Maximum Award", state["esa_max_award"]),
                                   ("Eligibility", state["esa_eligibility"]),
                                   ("Deadline", state.get("esa_deadline") or "Not specified")]:
            esa_detail += f"""<tr><td class="ed-label">{det_label}</td><td class="ed-value">{h(det_val)}</td></tr>"""

        esa_check_block = ""
        if esa_docs:
            check_rows = "".join(f'<li><span class="check">&#10003;</span><span>{h(d)}</span></li>' for d in esa_docs)
            esa_check_block = f"""<div style="margin-top:12px"><strong>Required docs:</strong><ul class="rail-list">{check_rows}</ul></div>"""

        parts.append(f"""<section class="card pad">
  <div class="section-title">
    <div><h2>ESA program card</h2><p>ESA details should feel like a benefits card plus a compliance checklist.</p></div>
    <span class="tag green">Funding</span>
  </div>
  <div class="split">
    <div class="callout green">
      <h3>{h(state['esa_name'])}</h3>
      <table class="esa-detail-table">
        {esa_detail}
      </table>
    </div>
    <div class="callout blue">
      <h3>Application checklist</h3>
      <p><strong>Deadline:</strong> {h(state['esa_deadline'])}</p>
      {esa_check_block}
    </div>
  </div>
</section>""")
    else:
        parts.append(f"""<section class="card pad">
  <div class="section-title">
    <div><h2>ESA program</h2><p>This state does not currently offer an Education Savings Account program.</p></div>
    <span class="tag">Not available</span>
  </div>
  <div class="callout" style="text-align:center;padding:24px">
    <p style="font-size:15px;color:#667085">No active ESA program in {h(state['name'])}.</p>
    {f'<p style="font-size:13px;color:#163b66;margin-top:8px">We are tracking {stats["esa_bills"]} bills related to ESA/scholarship programs that could change this.</p>' if stats["esa_bills"] > 0 else ''}
  </div>
</section>""")

    # ── NON-ESA PROGRAMS CARD ──
    non_esa_raw = state.get("non_esa_programs") or []
    if isinstance(non_esa_raw, str):
        try: non_esa_raw = json.loads(non_esa_raw)
        except: non_esa_raw = []
    non_esa_progs = [p for p in non_esa_raw if isinstance(p, dict)]
    if non_esa_progs:
        ne_cards = ""
        type_labels = {
            "allotment": "Allotment", "deduction": "Tax Deduction",
            "refundable_tax_credit": "Refundable Tax Credit",
            "non_refundable_tax_credit": "Non-Refundable Tax Credit",
            "voucher": "Voucher", "scholarship": "Scholarship",
            "tuitioning": "Tuitioning", "efct": "EFTC",
            "pending": "Pending", "other": "Other"
        }
        for p in non_esa_progs:
            ptype = type_labels.get(p.get("program_type", ""), p.get("program_type", ""))
            eligible = p.get("homeschool_eligible", False)
            ne_cards += f"""<div class="non-esa-card">
  <div class="ne-header">
    <div class="ne-name">{h(p.get("name", ""))}</div>
    {f'<span class="tag green" style="font-size:10px">Homeschool OK</span>' if eligible else ''}
  </div>
  <div class="ne-meta">
    <span class="ne-type">{ptype}</span>
    {f'<span class="ne-amount">{h(p.get("amount", ""))}</span>' if p.get("amount") else ''}
  </div>
  {f'<p class="ne-desc">{h(p["short_description"])}</p>' if p.get("short_description") else ''}
  <div class="ne-details">
    {f'<span class="micro">{h(p["application_method"])}</span>' if p.get("application_method") else ''}
    {f'<span class="micro">{h(p["application_window"])}</span>' if p.get("application_window") else ''}
    {f'<span class="micro">{h(p["income_cap"])}</span>' if p.get("income_cap") else ''}
  </div>
  {f'<a class="ne-link" href="{h(p["url"])}" target="_blank" rel="noopener">Program info →</a>' if p.get("url") else ''}
</div>"""

        parts.append(f"""<section class="card pad">
  <div class="section-title">
    <div><h2>Alternative funding programs</h2><p>{h(state["name"])} offers {len(non_esa_progs)} non-ESA program{"s" if len(non_esa_progs) != 1 else ""} to support homeschooling costs.</p></div>
    <span class="tag blue">Funding</span>
  </div>
  <div class="non-esa-grid">
    {ne_cards}
  </div>
</section>""")

    # ── CONFIDENCE + DATA QUALITY ──
    conf_bar_impact = min(avg_impact_conf * 100, 100)
    conf_bar_esa = min(avg_esa_conf * 100, 100)
    text_width = min(text_pct, 100)

    parts.append(f"""<section class="card pad">
  <div class="section-title">
    <div><h2>Confidence + data quality</h2><p>Visible trust layer. AI confidence without source completeness is how products become confident little lawsuit pi&ntilde;atas.</p></div>
    <span class="tag amber">Trust layer</span>
  </div>
  <div class="confidence">
    <div class="bar-row"><strong>Impact analysis</strong><div class="bar"><div class="fill" style="width:{conf_bar_impact:.0f}%"></div></div><span>{avg_impact_conf:.2f}</span></div>
    <div class="bar-row"><strong>ESA detection</strong><div class="bar"><div class="fill" style="width:{conf_bar_esa:.0f}%"></div></div><span>{avg_esa_conf:.2f}</span></div>
    <div class="bar-row"><strong>Full bill text coverage</strong><div class="bar"><div class="fill" style="width:{text_width:.0f}%"></div></div><span>{text_fetched}/{text_total}</span></div>
    <div class="data-warning">
      <strong>Recommended gating:</strong> show parent-facing legal impact as &ldquo;confirmed&rdquo; only after full bill text exists and changed sections are extracted. Until then, use &ldquo;needs review,&rdquo; &ldquo;potentially affects,&rdquo; or &ldquo;watch item.&rdquo; Annoying, but so is being wrong at scale.
    </div>
  </div>
</section>""")

    # ── LEGAL DISCLAIMER BANNER ──
    parts.append("""<div class="disclaimer">
  <strong>&#9888; Not legal advice.</strong> This compliance pack is a monitoring and organization tool. It summarizes legislative data from LegiScan and AI-classified impact analysis. Always consult official state sources or qualified legal counsel for definitive guidance on your family&rsquo;s specific situation.
</div>""")

    # Close main stack and main grid
    parts.append("""  </main>
</div>""")

    # ── FOOTER ──
    parts.append(f"""<div class="footer">
  <p>Homeschool Compass &middot; Data from LegiScan &middot; Updated every 4h &middot; Generated {now_dt}</p>
  <p style="margin-top:6px;font-size:11px;opacity:0.6">Not legal advice. Compliance organization and monitoring tool only.</p>
</div>""")

    # ── FULL CSS ──
    css = """
:root{
  --ink:#132032;
  --muted:#667085;
  --faint:#98a2b3;
  --line:#e6e9ef;
  --paper:#fffdf8;
  --wash:#f6f7f2;
  --blue:#163b66;
  --blue2:#245a8f;
  --sky:#e8f2fb;
  --green:#16815b;
  --green-bg:#eaf7ef;
  --red:#b93832;
  --red-bg:#fff0ee;
  --amber:#b7791f;
  --amber-bg:#fff7df;
  --violet:#6f49b6;
  --violet-bg:#f3edff;
  --shadow:0 20px 70px rgba(18,32,50,.12);
  --radius:22px;
}
*{box-sizing:border-box}
body{
  margin:0;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color:var(--ink);
  background:linear-gradient(180deg,#eef2f6 0%,#e8edf2 100%);
  line-height:1.45;
}
a{color:inherit}
.shell{max-width:1220px;margin:0 auto;padding:34px 24px 64px}
.topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;color:#344054;font-size:13px}
.brand{display:flex;align-items:center;gap:10px;font-weight:800;letter-spacing:-.02em}
.logo{width:34px;height:34px;border-radius:12px;background:linear-gradient(145deg,var(--blue),var(--green));display:grid;place-items:center;color:white;box-shadow:0 10px 25px rgba(22,59,102,.24)}
.pill{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--line);background:rgba(255,255,255,.72);padding:8px 11px;border-radius:999px;color:#475467;font-weight:650}

/* HERO */
.hero{
  background:linear-gradient(135deg,#102d4d 0%,#174a78 55%,#0d382e 100%);
  border-radius:32px;overflow:hidden;color:#fff;position:relative;box-shadow:var(--shadow);
}
.hero:before{content:"";position:absolute;inset:auto -20% -55% auto;width:70%;height:120%;background:radial-gradient(ellipse,rgba(255,255,255,.18),transparent 62%);transform:rotate(-18deg)}
.hero-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:28px;padding:40px;position:relative;z-index:1}
.kicker{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.18);padding:7px 12px;border-radius:999px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#dbeafe}
h1{font-size:52px;line-height:.98;letter-spacing:-.055em;margin:22px 0 16px;max-width:680px}
.hero-sub{font-size:18px;color:#dbeafe;max-width:625px;margin:0 0 26px}
.hero-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:20px}
.action-tile{background:rgba(255,255,255,.105);border:1px solid rgba(255,255,255,.17);border-radius:18px;padding:16px;min-height:128px;backdrop-filter:blur(8px)}
.action-tile strong{display:block;font-size:14px;margin-bottom:8px;color:white}.action-tile span{display:block;font-size:13px;color:#dbeafe}.action-tile .num{font-size:30px;font-weight:900;letter-spacing:-.04em;color:#fff;margin-bottom:6px}
.hero-panel{background:rgba(255,255,255,.96);color:var(--ink);border-radius:26px;padding:24px;align-self:stretch;box-shadow:0 24px 70px rgba(0,0,0,.18)}
.panel-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-bottom:1px solid var(--line);padding-bottom:15px;margin-bottom:16px}.state-badge{font-size:13px;font-weight:900;color:var(--blue);background:var(--sky);border-radius:999px;padding:7px 10px}.big-score{font-size:66px;line-height:.9;font-weight:950;letter-spacing:-.07em;color:var(--blue)}.score-copy{font-size:14px;color:var(--muted);margin-top:5px}.grade{font-weight:900;color:var(--amber)}
.risk-list{display:grid;gap:9px}.risk{display:grid;grid-template-columns:auto 1fr auto;gap:11px;align-items:center;border:1px solid var(--line);border-radius:15px;padding:12px;background:#fff}.dot{width:10px;height:10px;border-radius:50%}.risk b{font-size:13px}.risk small{display:block;color:var(--muted);font-size:12px;margin-top:2px}.tag{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.04em;border-radius:999px;padding:5px 8px}.tag.red{color:var(--red);background:var(--red-bg)}.tag.green{color:var(--green);background:var(--green-bg)}.tag.amber{color:var(--amber);background:var(--amber-bg)}.tag.blue{color:var(--blue);background:var(--sky)}

/* MAIN LAYOUT */
.main{display:grid;grid-template-columns:310px minmax(0,1fr);gap:22px;margin-top:22px}.rail{position:sticky;top:20px;align-self:start;display:grid;gap:14px}
.card{background:rgba(255,255,255,.92);border:1px solid rgba(230,233,239,.9);border-radius:var(--radius);box-shadow:0 12px 36px rgba(18,32,50,.06);overflow:hidden}.card.pad{padding:22px}
.section-title{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin:0 0 17px}.section-title h2{font-size:22px;letter-spacing:-.03em;margin:0}.section-title p{font-size:13px;color:var(--muted);margin:5px 0 0;max-width:620px}
.rail h3{margin:0 0 10px;font-size:15px;letter-spacing:-.015em}.mini-copy{color:var(--muted);font-size:13px;margin:0}
.deadline{background:linear-gradient(135deg,var(--amber-bg),#fff);border-color:#f4d98c}
.deadline-date{display:flex;align-items:end;gap:8px;margin:7px 0}.deadline-date .day{font-size:48px;line-height:.9;font-weight:950;letter-spacing:-.06em;color:var(--amber)}.deadline-date .mon{font-weight:900;color:#8a5a12;font-size:13px}.money{font-size:22px;font-weight:950;color:var(--green);letter-spacing:-.03em}
.rail-list{list-style:none;margin:12px 0 0;padding:0;display:grid;gap:10px}.rail-list li{display:flex;gap:9px;font-size:13px;color:#344054}
.check{width:18px;height:18px;border-radius:6px;background:var(--green-bg);color:var(--green);display:grid;place-items:center;font-size:12px;font-weight:950;flex:0 0 auto}
.check.warn{background:var(--red-bg);color:var(--red)}.check.neutral{background:var(--sky);color:var(--blue)}

/* MAIN STACK */
.stack{display:grid;gap:22px}
.brief-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.metric{border:1px solid var(--line);background:#fff;border-radius:18px;padding:16px}.metric .label{font-size:12px;color:var(--muted);font-weight:750;text-transform:uppercase;letter-spacing:.05em}.metric .value{font-size:30px;line-height:1;font-weight:950;letter-spacing:-.05em;margin-top:9px}.metric .note{font-size:12px;color:var(--muted);margin-top:8px}
.split{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.callout{border-radius:20px;padding:18px;border:1px solid var(--line);background:#fff}.callout.green{background:var(--green-bg);border-color:#bde7d0}.callout.red{background:var(--red-bg);border-color:#ffd2cd}.callout.blue{background:var(--sky);border-color:#c5ddf2}.callout h3{margin:0 0 8px;font-size:16px}.callout p{margin:0;color:#475467;font-size:14px}
.timeline{display:grid;gap:12px}.event{display:grid;grid-template-columns:74px 1fr auto;gap:14px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:18px;padding:14px}
.datebox{border-radius:14px;background:var(--wash);padding:10px;text-align:center}.datebox b{display:block;font-size:21px;letter-spacing:-.04em}.datebox span{display:block;color:var(--muted);font-size:11px;text-transform:uppercase;font-weight:850}
.event h4{font-size:15px;margin:0 0 3px}.event p{font-size:13px;color:var(--muted);margin:0}.status{white-space:nowrap;font-size:12px;font-weight:900;border-radius:999px;padding:7px 10px}.status.now{background:var(--red-bg);color:var(--red)}.status.watch{background:var(--amber-bg);color:var(--amber)}.status.done{background:var(--green-bg);color:var(--green)}

/* BILL TABLE */
.bill-table{display:grid;gap:11px}
.triage-header{display:flex;align-items:center;gap:10px;padding:8px 0}
.bill{display:grid;grid-template-columns:94px 1fr 180px;gap:14px;align-items:start;background:#fff;border:1px solid var(--line);border-radius:18px;padding:15px}
.bill-code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:950;color:var(--blue);background:#eef5fb;border-radius:11px;padding:8px;text-align:center;font-size:14px}
.bill h4{margin:0;font-size:15px;line-height:1.28}.bill p{margin:6px 0 0;font-size:13px;color:#475467}.bill .meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}
.micro{font-size:11px;font-weight:850;border-radius:999px;padding:5px 7px;background:#f2f4f7;color:#475467}
.bill-action{border-left:3px solid var(--amber);padding-left:10px;font-size:12px;color:#6b4a0f;margin-top:4px}
.show-more{margin-top:8px}.show-more summary{cursor:pointer;font-size:14px;font-weight:600;color:#2563eb;padding:8px}.more-link{text-align:center;font-size:13px;color:#6b7280;margin-top:8px}

/* ESA DETAIL TABLE */
.esa-detail-table{width:100%;border-collapse:collapse;margin-top:4px}.esa-detail-table td{padding:6px 0;font-size:13px}.esa-detail-table .ed-label{font-weight:700;color:#374151;padding-right:12px;white-space:nowrap}.esa-detail-table .ed-value{color:#1a1a2e}

/* CONFIDENCE */
.confidence{display:grid;gap:10px}.bar-row{display:grid;grid-template-columns:160px 1fr 46px;gap:10px;align-items:center;font-size:13px}.bar{height:10px;background:#edf0f4;border-radius:999px;overflow:hidden}.fill{height:100%;background:linear-gradient(90deg,var(--blue2),var(--green));border-radius:inherit}.data-warning{border:1px dashed #d0d5dd;background:#fbfcfe;border-radius:18px;padding:16px;color:#475467;font-size:13px;margin-top:8px}.data-warning strong{color:var(--ink)}

/* DISCLAIMER */
.disclaimer{margin-top:22px;padding:16px 20px;background:#fff7ed;border:1px solid #fed7aa;border-radius:18px;color:#92400e;font-size:13px;line-height:1.5}.disclaimer strong{color:#78350f}

/* FOOTER */
.footer{margin-top:22px;text-align:center;color:#667085;font-size:12px;padding:20px}

/* NON-ESA CARDS */
.non-esa-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.non-esa-card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:16px}
.ne-header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px}
.ne-name{font-weight:900;font-size:14px;color:var(--violet,#6f49b6)}
.ne-meta{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0}
.ne-type{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:#6f49b6;background:#f3edff;border-radius:999px;padding:4px 8px}
.ne-amount{font-size:17px;font-weight:950;color:var(--blue);letter-spacing:-.02em}
.ne-desc{font-size:13px;color:#475467;margin:6px 0}
.ne-details{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}
.ne-link{display:inline-block;margin-top:8px;font-size:12px;font-weight:700;color:var(--blue2,#245a8f);text-decoration:none}
.ne-link:hover{text-decoration:underline}
@media(max-width:620px){.non-esa-grid{grid-template-columns:1fr}}

/* RESPONSIVE */
@media(max-width:980px){
  .hero-grid,.main,.split{grid-template-columns:1fr}.rail{position:static}
  .hero-actions,.brief-grid{grid-template-columns:1fr 1fr}
  .bill{grid-template-columns:1fr}.event{grid-template-columns:62px 1fr}.event .status{grid-column:2}
  .bar-row{grid-template-columns:1fr}
}
@media(max-width:620px){
  .shell{padding:18px 12px 44px}.hero-grid{padding:24px}
  .hero-actions,.brief-grid{grid-template-columns:1fr}
  h1{font-size:42px}.topbar{align-items:flex-start;gap:10px;flex-direction:column}
  .bill{padding:13px}
}

/* PRINT */
@media print{
  body{background:white}.shell{max-width:100%;padding:0}
  .topbar,.footer{display:none}
  .hero,.card{box-shadow:none;border-radius:0}
  .main{grid-template-columns:1fr}.rail{position:static;grid-template-columns:1fr 1fr}
  .card,.bill,.event,.callout{break-inside:avoid}
  .bill{grid-template-columns:94px 1fr}
  .bill-action{grid-column:1/-1}
  .disclaimer{border:1px solid #ccc;background:#fafafa;color:#333;font-size:11px}
}
"""

    full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Homeschool Compass — {h(state['name'])} Compliance Pack</title>
<style>{css}</style>
</head>
<body>
<div class="shell">
{"".join(parts)}
</div>
</body>
</html>"""

    return full_html


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--list":
        states = q("SELECT code, name, score, level, esa_active FROM states ORDER BY code")
        print(f"{'Code':<6} {'State':<24} {'Score':<8} {'Level':<20} {'ESA':<8}")
        print("-" * 70)
        for s in states:
            esa = "Yes" if s["esa_active"] else "No"
            print(f"{s['code']:<6} {s['name']:<24} {s['score']:<8} {s['level']:<20} {esa:<8}")
        sys.exit(0)

    if len(sys.argv) > 1 and sys.argv[1] == "--all-esa":
        states = q("SELECT code FROM states WHERE esa_active=true ORDER BY code")
        for s in states:
            code = s["code"]
            html = render(code)
            path = f"/tmp/hc-pack-{code.lower()}.html"
            with open(path, "w") as f:
                f.write(html)
            print(f"Generated {path}")
        sys.exit(0)

    if len(sys.argv) > 1 and sys.argv[1] in ("--all", "--all-states"):
        states = q("SELECT code FROM states ORDER BY code")
        for s in states:
            code = s["code"]
            html = render(code)
            path = f"/tmp/hc-pack-{code.lower()}.html"
            with open(path, "w") as f:
                f.write(html)
            print(f"Generated {path}")
        sys.exit(0)

    code = sys.argv[1] if len(sys.argv) > 1 else "IA"
    html = render(code)
    print(html)
