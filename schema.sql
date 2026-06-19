-- ============================================================
-- Homeschool Regulation Tracker — SQLite Schema
-- v2.0: Adds agencies, legal_precedent, regulation_level, ESA tracking
-- ============================================================

-- ── Core Tables ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS states (
    state_code TEXT PRIMARY KEY,  -- e.g., 'CA', 'TX'
    state_name TEXT NOT NULL,
    regulation_level TEXT CHECK(regulation_level IN (
        'none', 'low', 'moderate', 'high'
    )),
    -- HSLDA 4-tier model
    hslda_category TEXT CHECK(hslda_category IN (
        'no_notice', 'low_regulation', 'moderate_regulation', 'high_regulation'
    )),
    compulsory_age_start INTEGER,  -- Age when schooling becomes compulsory
    compulsory_age_end INTEGER,
    portfolio_required INTEGER DEFAULT 0,  -- boolean
    testing_required INTEGER DEFAULT 0,
    curriculum_approval_required INTEGER DEFAULT 0,
    teacher_qualification_required INTEGER DEFAULT 0,
    notification_method TEXT,  -- e.g., 'PSA', 'district_superintendent', 'county_office'
    esa_program_active INTEGER DEFAULT 0,
    esa_program_name TEXT,
    esa_max_amount INTEGER,  -- dollars per child per year
    esa_compliance_notes TEXT,
    last_reviewed_at TIMESTAMP,
    data_source TEXT DEFAULT 'manual',  -- 'manual', 'legiscan', 'openstates'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agencies (
    agency_id INTEGER PRIMARY KEY AUTOINCREMENT,
    state_code TEXT NOT NULL REFERENCES states(state_code),
    agency_name TEXT NOT NULL,
    agency_type TEXT CHECK(agency_type IN (
        'state_doe', 'county_superintendent', 'district_office',
        'private_school_affidavit', 'umbrella_school', 'charter_authorizer'
    )),
    jurisdiction_level TEXT CHECK(jurisdiction_level IN ('state', 'county', 'district')),
    contact_email TEXT,
    contact_phone TEXT,
    website_url TEXT,
    filing_deadline TEXT,  -- e.g., 'October 15' for annual PSA
    required_documents TEXT,  -- JSON array of required docs
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS legal_precedent (
    precedent_id INTEGER PRIMARY KEY AUTOINCREMENT,
    state_code TEXT NOT NULL REFERENCES states(state_code),
    case_name TEXT NOT NULL,
    citation TEXT,  -- e.g., 'People v. Turner, 81 Cal. App. 4th 583'
    court TEXT,
    decision_date DATE,
    summary TEXT,
    impact_on_homeschool TEXT,  -- How this case modified statutory requirements
    status TEXT CHECK(status IN ('good_law', 'overruled', 'distinguished', 'pending_appeal')),
    full_text_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Bill Tracking Tables ──────────────────────────────────

CREATE TABLE IF NOT EXISTS legislative_sessions (
    session_id INTEGER PRIMARY KEY,
    state_code TEXT NOT NULL REFERENCES states(state_code),
    session_name TEXT NOT NULL,
    year_start INTEGER,
    year_end INTEGER,
    session_type TEXT CHECK(session_type IN ('regular', 'special', 'extraordinary')),
    is_current INTEGER DEFAULT 0,
    legiscan_session_id INTEGER UNIQUE,
    openstates_session_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bills (
    bill_id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- External IDs
    legiscan_bill_id INTEGER UNIQUE,
    openstates_bill_id TEXT UNIQUE,

    -- Identification
    state_code TEXT NOT NULL REFERENCES states(state_code),
    session_id INTEGER REFERENCES legislative_sessions(session_id),
    bill_number TEXT NOT NULL,  -- e.g., 'SB 1234', 'HB 567'
    title TEXT NOT NULL,
    description TEXT,

    -- Status
    status TEXT CHECK(status IN (
        'introduced', 'referred', 'committee', 'passed_chamber',
        'passed_both', 'to_governor', 'signed', 'vetoed', 'dead', 'enacted'
    )),
    status_date DATE,

    -- Homeschool relevance
    is_homeschool_relevant INTEGER DEFAULT 0,
    relevance_score REAL DEFAULT 0.0,  -- 0-1 from LLM
    homeschool_impact_summary TEXT,  -- LLM-generated
    regulation_level_change TEXT CHECK(regulation_level_change IN (
        'increase', 'decrease', 'neutral', 'unclear'
    )),
    esa_related INTEGER DEFAULT 0,

    -- Content
    latest_text TEXT,  -- Full text or excerpt
    latest_text_hash TEXT,  -- SHA256 for change detection
    text_mime TEXT,  -- 'text/plain', 'application/pdf', etc.

    -- Change tracking
    change_hash TEXT,  -- From LegiScan getMasterListRaw
    last_synced_at TIMESTAMP,

    -- URLs
    legiscan_url TEXT,
    openstates_url TEXT,
    state_url TEXT,

    -- Metadata
    first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(state_code, session_id, bill_number)
);

CREATE TABLE IF NOT EXISTS bill_actions (
    action_id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL REFERENCES bills(bill_id),
    action_date DATE NOT NULL,
    action_text TEXT NOT NULL,
    chamber TEXT CHECK(chamber IN ('upper', 'lower', 'executive')),
    action_type TEXT,  -- e.g., 'introduction', 'referral', 'vote', 'signature'
    roll_call_id INTEGER,  -- Link to votes if applicable
    sequence INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bill_sponsors (
    sponsor_id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL REFERENCES bills(bill_id),
    person_name TEXT NOT NULL,
    person_id INTEGER,  -- LegiScan people_id
    party TEXT,
    district TEXT,
    is_primary INTEGER DEFAULT 0,
    role TEXT  -- e.g., 'author', 'coauthor', 'sponsor'
);

CREATE TABLE IF NOT EXISTS bill_texts (
    text_id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL REFERENCES bills(bill_id),
    doc_id INTEGER,  -- LegiScan doc_id
    version_date DATE,
    version_type TEXT,  -- 'introduced', 'amended', 'enrolled'
    mime_type TEXT,
    text_content TEXT,  -- Extracted text (decoded from base64)
    text_hash TEXT,  -- SHA256 for dedup
    extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── LLM Processing Tables ─────────────────────────────────

CREATE TABLE IF NOT EXISTS llm_analysis (
    analysis_id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL REFERENCES bills(bill_id),
    analysis_type TEXT CHECK(analysis_type IN (
        'initial_assessment', 'delta_summary', 'impact_forecast', 'esa_compliance_check'
    )),
    model_used TEXT,  -- 'gemini-2.5-pro', etc.
    prompt_version TEXT,
    raw_response TEXT,
    structured_output TEXT,  -- JSON
    confidence_score REAL,
    reviewed_by_human INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS delta_summaries (
    delta_id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id INTEGER NOT NULL REFERENCES bills(bill_id),
    previous_text_hash TEXT,
    current_text_hash TEXT,
    delta_summary TEXT NOT NULL,  -- e.g., "Changes math requirement from 180 to 160 hours"
    affected_sections TEXT,  -- JSON array of section references
    regulation_impact TEXT CHECK(regulation_impact IN ('increase', 'decrease', 'neutral', 'unclear')),
    generated_by TEXT,  -- model name
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Alert & Subscription Tables ────────────────────────────

CREATE TABLE IF NOT EXISTS alert_rules (
    rule_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,  -- Could be API key or user UUID
    rule_name TEXT,
    state_codes TEXT,  -- JSON array, NULL = all states
    keywords TEXT,  -- JSON array of search terms
    regulation_level_filter TEXT,  -- NULL = any
    esa_only INTEGER DEFAULT 0,
    status_filter TEXT,  -- e.g., 'introduced,passed_chamber'
    alert_channels TEXT,  -- JSON: {"email": "...", "webhook": "...", "slack": "..."}
    is_active INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alerts (
    alert_id INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_id INTEGER NOT NULL REFERENCES alert_rules(rule_id),
    bill_id INTEGER NOT NULL REFERENCES bills(bill_id),
    alert_type TEXT CHECK(alert_type IN (
        'new_bill', 'status_change', 'text_change', 'vote_scheduled', 'signed_into_law'
    )),
    severity TEXT CHECK(severity IN ('info', 'warning', 'critical')),
    message TEXT NOT NULL,
    delta_summary_id INTEGER REFERENCES delta_summaries(delta_id),
    sent_at TIMESTAMP,
    acknowledged_at TIMESTAMP
);

-- ── Scorecard & Analytics Tables ──────────────────────────

CREATE TABLE IF NOT EXISTS scorecard_metrics (
    metric_id INTEGER PRIMARY KEY AUTOINCREMENT,
    state_code TEXT NOT NULL REFERENCES states(state_code),
    metric_name TEXT NOT NULL,  -- 'reporting_burden', 'testing_mandate', 'curriculum_freedom'
    score REAL NOT NULL CHECK(score BETWEEN 0 AND 100),
    weight REAL DEFAULT 1.0,
    calculation_method TEXT,
    data_snapshot_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(state_code, metric_name, data_snapshot_date)
);

CREATE TABLE IF NOT EXISTS scorecard_overall (
    scorecard_id INTEGER PRIMARY KEY AUTOINCREMENT,
    state_code TEXT NOT NULL REFERENCES states(state_code),
    overall_score REAL NOT NULL CHECK(overall_score BETWEEN 0 AND 100),
    freedom_grade TEXT CHECK(freedom_grade IN ('A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F')),
    snapshot_date DATE NOT NULL,
    methodology_version TEXT DEFAULT '1.0',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── ESA Compliance Tables ─────────────────────────────────

CREATE TABLE IF NOT EXISTS esa_programs (
    program_id INTEGER PRIMARY KEY AUTOINCREMENT,
    state_code TEXT NOT NULL REFERENCES states(state_code),
    program_name TEXT NOT NULL,
    launch_date DATE,
    max_award_amount INTEGER,
    eligibility_criteria TEXT,  -- JSON
    required_documentation TEXT,  -- JSON array
    compliance_deadline TEXT,
    program_status TEXT CHECK(program_status IN ('active', 'pending', 'suspended', 'ended')),
    statutory_reference TEXT,  -- Bill number or statute citation
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS esa_compliance_checklist (
    checklist_id INTEGER PRIMARY KEY AUTOINCREMENT,
    program_id INTEGER NOT NULL REFERENCES esa_programs(program_id),
    requirement_name TEXT NOT NULL,
    requirement_type TEXT CHECK(requirement_type IN (
        'portfolio', 'testing', 'attendance_log', 'curriculum_plan',
        'expense_receipt', 'quarterly_report', 'annual_evaluation'
    )),
    is_mandatory INTEGER DEFAULT 1,
    deadline_description TEXT,
    template_url TEXT,
    notes TEXT
);

-- ── Sync & Audit Tables ───────────────────────────────────

CREATE TABLE IF NOT EXISTS sync_log (
    sync_id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,  -- 'legiscan', 'openstates', 'manual'
    operation TEXT NOT NULL,  -- 'discover', 'update', 'full_refresh'
    records_processed INTEGER,
    records_inserted INTEGER,
    records_updated INTEGER,
    errors TEXT,  -- JSON array
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds REAL
);

CREATE TABLE IF NOT EXISTS api_usage (
    usage_id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    calls_made INTEGER,
    month TEXT,  -- '2026-06'
    quota_remaining INTEGER,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Indexes ───────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_bills_state ON bills(state_code);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_homeschool ON bills(is_homeschool_relevant);
CREATE INDEX IF NOT EXISTS idx_bills_esa ON bills(esa_related);
CREATE INDEX IF NOT EXISTS idx_bills_change_hash ON bills(change_hash);
CREATE INDEX IF NOT EXISTS idx_bills_last_synced ON bills(last_synced_at);
CREATE INDEX IF NOT EXISTS idx_actions_bill ON bill_actions(bill_id);
CREATE INDEX IF NOT EXISTS idx_actions_date ON bill_actions(action_date);
CREATE INDEX IF NOT EXISTS idx_agencies_state ON agencies(state_code);
CREATE INDEX IF NOT EXISTS idx_precedent_state ON legal_precedent(state_code);
CREATE INDEX IF NOT EXISTS idx_llm_bill ON llm_analysis(bill_id);
CREATE INDEX IF NOT EXISTS idx_delta_bill ON delta_summaries(bill_id);
CREATE INDEX IF NOT EXISTS idx_alerts_rule ON alerts(rule_id);
CREATE INDEX IF NOT EXISTS idx_alerts_bill ON alerts(bill_id);
CREATE INDEX IF NOT EXISTS idx_scorecard_state ON scorecard_overall(state_code);
CREATE INDEX IF NOT EXISTS idx_scorecard_snapshot ON scorecard_overall(snapshot_date);

-- ── Triggers ──────────────────────────────────────────────

CREATE TRIGGER IF NOT EXISTS update_states_timestamp
AFTER UPDATE ON states
BEGIN
    UPDATE states SET updated_at = CURRENT_TIMESTAMP WHERE state_code = NEW.state_code;
END;

CREATE TRIGGER IF NOT EXISTS update_bills_timestamp
AFTER UPDATE ON bills
BEGIN
    UPDATE bills SET updated_at = CURRENT_TIMESTAMP WHERE bill_id = NEW.bill_id;
END;

-- ── Seed Data: HSLDA Regulation Categories ────────────────

INSERT OR IGNORE INTO states (state_code, state_name, regulation_level, hslda_category, 
    compulsory_age_start, compulsory_age_end, notification_method, esa_program_active) 
VALUES
-- No Notice / Low Regulation
('TX', 'Texas', 'none', 'no_notice', 6, 18, 'none', 1),
('AK', 'Alaska', 'none', 'no_notice', 7, 16, 'none', 0),
('ID', 'Idaho', 'none', 'no_notice', 7, 16, 'none', 1),
('IL', 'Illinois', 'none', 'no_notice', 6, 17, 'none', 1),
('IN', 'Indiana', 'none', 'no_notice', 7, 18, 'none', 1),
('MI', 'Michigan', 'none', 'no_notice', 6, 18, 'none', 0),
('MO', 'Missouri', 'none', 'no_notice', 7, 17, 'none', 0),
('NJ', 'New Jersey', 'none', 'no_notice', 6, 16, 'none', 0),
('OK', 'Oklahoma', 'none', 'no_notice', 5, 18, 'none', 1),

-- Low Regulation (notification only)
('CA', 'California', 'low', 'low_regulation', 6, 18, 'PSA', 1),
('FL', 'Florida', 'low', 'low_regulation', 6, 16, 'district_superintendent', 1),
('GA', 'Georgia', 'low', 'low_regulation', 6, 16, 'district_superintendent', 1),
('NC', 'North Carolina', 'low', 'low_regulation', 7, 16, 'state_doe', 0),
('TN', 'Tennessee', 'low', 'low_regulation', 6, 18, 'district_superintendent', 1),
('VA', 'Virginia', 'low', 'low_regulation', 5, 18, 'district_superintendent', 0),

-- Moderate Regulation
('CO', 'Colorado', 'moderate', 'moderate_regulation', 6, 17, 'district_superintendent', 1),
('IA', 'Iowa', 'moderate', 'moderate_regulation', 6, 16, 'district_superintendent', 1),
('LA', 'Louisiana', 'moderate', 'moderate_regulation', 7, 18, 'state_doe', 1),
('MD', 'Maryland', 'moderate', 'moderate_regulation', 5, 18, 'county_superintendent', 0),
('MN', 'Minnesota', 'moderate', 'moderate_regulation', 7, 16, 'district_superintendent', 0),
('NH', 'New Hampshire', 'moderate', 'moderate_regulation', 6, 18, 'district_superintendent', 1),
('ND', 'North Dakota', 'moderate', 'moderate_regulation', 7, 16, 'district_superintendent', 0),
('OH', 'Ohio', 'moderate', 'moderate_regulation', 6, 18, 'district_superintendent', 1),
('OR', 'Oregon', 'moderate', 'moderate_regulation', 6, 18, 'district_superintendent', 0),
('SC', 'South Carolina', 'moderate', 'moderate_regulation', 5, 17, 'district_superintendent', 0),
('SD', 'South Dakota', 'moderate', 'moderate_regulation', 6, 18, 'district_superintendent', 0),
('WA', 'Washington', 'moderate', 'moderate_regulation', 8, 18, 'district_superintendent', 0),
('WV', 'West Virginia', 'moderate', 'moderate_regulation', 6, 17, 'county_superintendent', 1),
('WI', 'Wisconsin', 'moderate', 'moderate_regulation', 6, 18, 'district_superintendent', 0),

-- High Regulation
('MA', 'Massachusetts', 'high', 'high_regulation', 6, 16, 'district_superintendent', 0),
('NY', 'New York', 'high', 'high_regulation', 6, 17, 'district_superintendent', 0),
('PA', 'Pennsylvania', 'high', 'high_regulation', 8, 17, 'district_superintendent', 0),
('RI', 'Rhode Island', 'high', 'high_regulation', 6, 16, 'district_superintendent', 0),
('VT', 'Vermont', 'high', 'high_regulation', 6, 16, 'state_doe', 0);

-- Seed: California PSA agency
INSERT OR IGNORE INTO agencies (state_code, agency_name, agency_type, jurisdiction_level, 
    filing_deadline, required_documents, notes)
VALUES
('CA', 'California Department of Education', 'state_doe', 'state', 
    'October 15', '["Private School Affidavit"]', 
    'PSA must be filed annually between October 1-15. No curriculum approval required.'),
('CA', 'County Office of Education', 'county_superintendent', 'county',
    NULL, '["None for PSA filers"]', 
    'PSA filers do not interact with county offices. Charter and district homeschool programs do.');
