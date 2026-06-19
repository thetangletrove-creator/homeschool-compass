"""
LegiScan API Client for Homeschool Regulation Tracking
Handles rate limiting, caching, and homeschool-relevant bill discovery.
"""
import os
import time
import json
import hashlib
import sqlite3
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, asdict
from pathlib import Path
import requests
from requests.adapters import HTTPAdapter
from urllib.parse import urlencode

# ── Configuration ──────────────────────────────────────────
LEGISCAN_BASE = "https://api.legiscan.com/"
DEFAULT_RATE_LIMIT = 100  # calls per 60s (Public API tier)
MONTHLY_QUOTA = 30_000

# Homeschool-relevant search terms (LegiScan full-text search)
HS_SEARCH_TERMS = [
    "homeschool", "home school", "home education", "home instruction",
    "private school affidavit", "PSA", "education savings account", "ESA",
    "school choice", "voucher", "education scholarship", "parental rights",
    "curriculum approval", "achievement test", "standardized test homeschool",
    "portfolio review", "superintendent notification homeschool",
    "compulsory attendance", "truancy homeschool"
]

# States with known homeschool regulation (all 50 + DC)
STATE_ABBREVS = [
    "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
    "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
    "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
    "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
    "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"
]


@dataclass
class RateLimitState:
    """Tracks API consumption to stay within quota."""
    calls_this_minute: int = 0
    calls_this_month: int = 0
    window_start: float = 0.0

    def can_call(self, limit: int = DEFAULT_RATE_LIMIT) -> bool:
        now = time.time()
        if now - self.window_start > 60:
            self.calls_this_minute = 0
            self.window_start = now
        return self.calls_this_minute < limit and self.calls_this_month < MONTHLY_QUOTA

    def record_call(self):
        self.calls_this_minute += 1
        self.calls_this_month += 1


class LegiScanClient:
    """
    Full-featured LegiScan API client with:
    - Rate limiting (respects 100/min public tier)
    - SQLite-backed response cache
    - Change-hash detection for incremental sync
    - Homeschool-specific search orchestration
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        cache_db_path: str = "legiscan_cache.db",
        rate_limit: int = DEFAULT_RATE_LIMIT
    ):
        self.api_key = api_key or os.getenv("LEGISCAN_API_KEY")
        if not self.api_key:
            raise ValueError("LegiScan API key required. Set LEGISCAN_API_KEY env var.")

        self.rate_limit = rate_limit
        self.rate_state = RateLimitState()
        self.cache_path = Path(cache_db_path)
        self._init_cache()

        # Session with retries
        self.session = requests.Session()
        adapter = HTTPAdapter(max_retries=3)
        self.session.mount("https://", adapter)

    def _init_cache(self):
        """Initialize SQLite cache for API responses and change hashes."""
        with sqlite3.connect(self.cache_path) as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS api_cache (
                    cache_key TEXT PRIMARY KEY,
                    response_json TEXT,
                    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS bill_hashes (
                    bill_id INTEGER PRIMARY KEY,
                    change_hash TEXT,
                    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS search_runs (
                    run_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    search_term TEXT,
                    state TEXT,
                    results_count INTEGER,
                    run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_cache_expiry ON api_cache(expires_at);
            """)

    def _cache_key(self, op: str, params: Dict[str, Any]) -> str:
        """Deterministic cache key from operation + params."""
        payload = json.dumps({"op": op, **params}, sort_keys=True)
        return hashlib.sha256(payload.encode()).hexdigest()

    def _get_cached(self, cache_key: str, max_age_minutes: int = 60) -> Optional[Dict]:
        """Retrieve cached response if not expired."""
        with sqlite3.connect(self.cache_path) as conn:
            row = conn.execute(
                """SELECT response_json FROM api_cache 
                   WHERE cache_key = ? AND expires_at > datetime('now')""",
                (cache_key,)
            ).fetchone()
            if row:
                return json.loads(row[0])
        return None

    def _set_cached(self, cache_key: str, data: Dict, ttl_minutes: int = 60):
        """Store response in cache with TTL."""
        with sqlite3.connect(self.cache_path) as conn:
            conn.execute(
                """INSERT OR REPLACE INTO api_cache (cache_key, response_json, expires_at)
                   VALUES (?, ?, datetime('now', '+' || ? || ' minutes'))""",
                (cache_key, json.dumps(data), ttl_minutes)
            )

    def _call(self, op: str, **params) -> Dict[str, Any]:
        """
        Execute API call with rate limiting and caching.
        Returns parsed JSON response.
        """
        # Check cache first
        cache_key = self._cache_key(op, params)
        cached = self._get_cached(cache_key)
        if cached is not None:
            return cached

        # Rate limit check
        if not self.rate_state.can_call(self.rate_limit):
            sleep_time = 60 - (time.time() - self.rate_state.window_start)
            if sleep_time > 0:
                print(f"[RateLimit] Sleeping {sleep_time:.1f}s...")
                time.sleep(sleep_time)
                self.rate_state.can_call(self.rate_limit)  # reset window

        # Build URL
        query = urlencode({"key": self.api_key, "op": op, **params})
        url = f"{LEGISCAN_BASE}?{query}"

        # Execute
        resp = self.session.get(url, timeout=30)
        self.rate_state.record_call()
        resp.raise_for_status()
        data = resp.json()

        # Cache successful responses
        if data.get("status") == "OK":
            self._set_cached(cache_key, data)

        return data

    # ── Core API Operations ─────────────────────────────────

    def get_session_list(self, state: Optional[str] = None) -> List[Dict]:
        """Get available legislative sessions."""
        params = {"state": state} if state else {}
        resp = self._call("getSessionList", **params)
        return resp.get("sessions", [])

    def get_master_list(self, session_id: int) -> List[Dict]:
        """Get all bills in a session."""
        resp = self._call("getMasterList", id=session_id)
        return resp.get("masterlist", [])

    def get_master_list_raw(self, session_id: int) -> List[Dict]:
        """Get master list with change_hash for incremental sync."""
        resp = self._call("getMasterListRaw", id=session_id)
        return resp.get("masterlist", [])

    def get_bill(self, bill_id: int) -> Dict:
        """Get full bill details."""
        return self._call("getBill", id=bill_id)

    def get_bill_text(self, doc_id: int) -> Dict:
        """Get bill text (Base64 encoded in response)."""
        return self._call("getBillText", id=doc_id)

    def get_roll_call(self, roll_call_id: int) -> Dict:
        """Get vote details."""
        return self._call("getRollCall", id=roll_call_id)

    def get_person(self, person_id: int) -> Dict:
        """Get legislator details."""
        return self._call("getPerson", id=person_id)

    def search(self, query: str, state: Optional[str] = None, 
               year: int = 2, page: int = 1) -> Dict:
        """
        Full-text search (50 results/page).
        year: 1=all, 2=current, 3=recent, 4=prior, or specific year
        """
        params = {"query": query, "year": year, "page": page}
        if state:
            params["state"] = state
        return self._call("getSearch", **params)

    def search_raw(self, query: str, state: Optional[str] = None,
                   year: int = 2, page: int = 1) -> Dict:
        """
        Raw search (2000 results/page, abbreviated).
        Optimized for keyword monitoring.
        """
        params = {"query": query, "year": year, "page": page}
        if state:
            params["state"] = state
        return self._call("getSearchRaw", **params)

    def get_dataset_list(self, state: Optional[str] = None) -> List[Dict]:
        """Get available weekly dataset snapshots."""
        params = {"state": state} if state else {}
        resp = self._call("getDatasetList", **params)
        return resp.get("datasetlist", [])

    # ── Homeschool-Specific Operations ──────────────────────

    def discover_homeschool_bills(
        self,
        states: Optional[List[str]] = None,
        year_filter: int = 2
    ) -> List[Dict]:
        """
        Orchestrated discovery: search all states × all HS terms.
        Deduplicates by bill_id. Returns list of bill summaries.
        """
        states = states or STATE_ABBREVS
        discovered = {}

        for state in states:
            for term in HS_SEARCH_TERMS:
                try:
                    # Use searchRaw for efficiency (2000 results/page)
                    resp = self.search_raw(term, state=state, year=year_filter)
                    results = resp.get("searchresult", [])

                    for bill in results:
                        bid = bill.get("bill_id")
                        if bid and bid not in discovered:
                            discovered[bid] = {
                                "bill_id": bid,
                                "number": bill.get("number"),
                                "title": bill.get("title"),
                                "state": state,
                                "session_id": bill.get("session_id"),
                                "status": bill.get("status"),
                                "last_action_date": bill.get("last_action_date"),
                                "last_action": bill.get("last_action"),
                                "url": bill.get("url"),
                                "search_terms_matched": [term],
                                "relevance": bill.get("relevance", 0)
                            }
                        elif bid:
                            discovered[bid]["search_terms_matched"].append(term)

                    # Log search run
                    with sqlite3.connect(self.cache_path) as conn:
                        conn.execute(
                            "INSERT INTO search_runs (search_term, state, results_count) VALUES (?, ?, ?)",
                            (term, state, len(results))
                        )

                except Exception as e:
                    print(f"[Search Error] {state}/{term}: {e}")
                    continue

        return list(discovered.values())

    def get_changed_bills(self, session_id: int) -> List[int]:
        """
        Incremental sync: return bill_ids whose change_hash differs
        from cached value. Efficient for daily polling.
        """
        current = self.get_master_list_raw(session_id)
        changed = []

        with sqlite3.connect(self.cache_path) as conn:
            for bill in current:
                bid = bill.get("bill_id")
                new_hash = bill.get("change_hash")

                row = conn.execute(
                    "SELECT change_hash FROM bill_hashes WHERE bill_id = ?",
                    (bid,)
                ).fetchone()

                if not row or row[0] != new_hash:
                    changed.append(bid)
                    conn.execute(
                        """INSERT OR REPLACE INTO bill_hashes (bill_id, change_hash, last_seen)
                           VALUES (?, ?, datetime('now'))""",
                        (bid, new_hash)
                    )

        return changed

    def get_bill_with_text(self, bill_id: int) -> Dict:
        """
        Fetch full bill + all text versions + sponsors.
        Returns enriched bill object.
        """
        bill_resp = self.get_bill(bill_id)
        bill = bill_resp.get("bill", {})

        # Fetch all text versions
        texts = []
        for text_meta in bill.get("texts", []):
            doc_id = text_meta.get("doc_id")
            if doc_id:
                try:
                    text_resp = self.get_bill_text(doc_id)
                    text_data = text_resp.get("text", {})
                    texts.append({
                        "doc_id": doc_id,
                        "date": text_meta.get("date"),
                        "type": text_meta.get("type"),
                        "mime": text_data.get("mime"),
                        "text": text_data.get("doc")  # Base64 encoded
                    })
                except Exception as e:
                    print(f"[Text Error] doc_id={doc_id}: {e}")

        bill["text_versions"] = texts
        return bill


# ── CLI Interface ─────────────────────────────────────────

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="LegiScan Homeschool Bill Tracker")
    parser.add_argument("--discover", action="store_true", help="Run full homeschool bill discovery")
    parser.add_argument("--state", type=str, help="Limit to specific state")
    parser.add_argument("--session", type=int, help="Get master list for session")
    parser.add_argument("--bill", type=int, help="Get full bill details")
    parser.add_argument("--changed", type=int, help="Get changed bills for session_id")
    parser.add_argument("--search", type=str, help="Search term")
    parser.add_argument("--output", type=str, default="legiscan_output.json", help="Output file")

    args = parser.parse_args()
    client = LegiScanClient()

    if args.discover:
        states = [args.state] if args.state else None
        results = client.discover_homeschool_bills(states=states)
        with open(args.output, "w") as f:
            json.dump(results, f, indent=2)
        print(f"Discovered {len(results)} unique bills → {args.output}")

    elif args.session:
        results = client.get_master_list(args.session)
        with open(args.output, "w") as f:
            json.dump(results, f, indent=2)
        print(f"Master list ({len(results)} bills) → {args.output}")

    elif args.bill:
        result = client.get_bill_with_text(args.bill)
        with open(args.output, "w") as f:
            json.dump(result, f, indent=2)
        print(f"Bill {args.bill} → {args.output}")

    elif args.changed:
        changed = client.get_changed_bills(args.changed)
        print(f"Changed bills in session {args.changed}: {changed}")

    elif args.search:
        results = client.search(args.search, state=args.state)
        with open(args.output, "w") as f:
            json.dump(results, f, indent=2)
        print(f"Search results → {args.output}")
