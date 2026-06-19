"""
OpenStates API v3 Client for Homeschool Regulation Tracking
Complements LegiScan with bill actions, sponsors, and vote data.
"""
import os
import time
import json
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
import requests
from requests.adapters import HTTPAdapter

# OpenStates v3 endpoints
OPENSTATES_BASE = "https://v3.openstates.org"
DEFAULT_RATE_LIMIT = 30  # requests per minute (free tier)

# Homeschool-relevant classification filters for OpenStates
HS_CLASSIFICATIONS = [
    "education", "school choice", "voucher", "homeschool",
    "parental rights", "compulsory attendance"
]


class OpenStatesClient:
    """
    OpenStates API v3 client with rate limiting and homeschool bill filtering.

    Free tier: ~30 requests/minute. API key via X-API-KEY header.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("OPENSTATES_API_KEY")
        if not self.api_key:
            raise ValueError("OpenStates API key required. Set OPENSTATES_API_KEY env var.")

        self.session = requests.Session()
        self.session.headers.update({"X-API-KEY": self.api_key})
        adapter = HTTPAdapter(max_retries=3)
        self.session.mount("https://", adapter)
        self._last_call = 0.0
        self._call_interval = 60.0 / DEFAULT_RATE_LIMIT  # seconds between calls

    def _rate_limited_get(self, endpoint: str, params: Optional[Dict] = None) -> Dict:
        """GET with per-minute rate limiting."""
        elapsed = time.time() - self._last_call
        if elapsed < self._call_interval:
            time.sleep(self._call_interval - elapsed)

        url = f"{OPENSTATES_BASE}{endpoint}"
        resp = self.session.get(url, params=params or {}, timeout=30)
        self._last_call = time.time()
        resp.raise_for_status()
        return resp.json()

    # ── Core Endpoints ──────────────────────────────────────

    def get_jurisdictions(self) -> List[Dict]:
        """List all jurisdictions (states, DC, PR, municipalities)."""
        data = self._rate_limited_get("/jurisdictions")
        return data.get("results", [])

    def get_jurisdiction(self, jurisdiction_id: str) -> Dict:
        """Get metadata for a specific jurisdiction."""
        return self._rate_limited_get(f"/jurisdictions/{jurisdiction_id}")

    def search_bills(
        self,
        jurisdiction: Optional[str] = None,
        session: Optional[str] = None,
        classification: Optional[str] = None,
        subject: Optional[str] = None,
        sponsor: Optional[str] = None,
        updated_since: Optional[str] = None,
        page: int = 1,
        per_page: int = 20
    ) -> Dict:
        """
        Search bills with filters.

        Args:
            jurisdiction: State abbreviation (e.g., 'ca')
            session: Session identifier
            classification: Bill classification (e.g., 'education')
            subject: Bill subject
            sponsor: Legislator name or ID
            updated_since: ISO datetime for incremental sync
            page: Page number
            per_page: Results per page (max 100)
        """
        params = {
            "page": page,
            "per_page": min(per_page, 100)
        }
        if jurisdiction:
            params["jurisdiction"] = jurisdiction
        if session:
            params["session"] = session
        if classification:
            params["classification"] = classification
        if subject:
            params["subject"] = subject
        if sponsor:
            params["sponsor"] = sponsor
        if updated_since:
            params["updated_since"] = updated_since

        return self._rate_limited_get("/bills", params)

    def get_bill(self, jurisdiction: str, session: str, bill_id: str) -> Dict:
        """Get full bill by jurisdiction/session/bill_id."""
        return self._rate_limited_get(f"/bills/{jurisdiction}/{session}/{bill_id}")

    def get_bill_by_uuid(self, openstates_bill_id: str) -> Dict:
        """Get bill by internal OpenStates UUID."""
        return self._rate_limited_get(f"/bills/ocd-bill/{openstates_bill_id}")

    def get_people(self, jurisdiction: Optional[str] = None,
                   name: Optional[str] = None,
                   org_classification: Optional[str] = None) -> Dict:
        """Search legislators/people."""
        params = {}
        if jurisdiction:
            params["jurisdiction"] = jurisdiction
        if name:
            params["name"] = name
        if org_classification:
            params["org_classification"] = org_classification
        return self._rate_limited_get("/people", params)

    def get_committees(self, jurisdiction: str) -> Dict:
        """Get committees for a jurisdiction."""
        return self._rate_limited_get("/committees", {"jurisdiction": jurisdiction})

    # ── Homeschool-Specific Operations ──────────────────────

    def discover_homeschool_bills(
        self,
        states: Optional[List[str]] = None,
        updated_since: Optional[str] = None,
        max_pages: int = 5
    ) -> List[Dict]:
        """
        Discover homeschool-relevant bills across states.
        Uses classification='education' + keyword filtering on title.
        """
        states = states or [
            "al","ak","az","ar","ca","co","ct","de","fl","ga",
            "hi","id","il","in","ia","ks","ky","la","me","md",
            "ma","mi","mn","ms","mo","mt","ne","nv","nh","nj",
            "nm","ny","nc","nd","oh","ok","or","pa","ri","sc",
            "sd","tn","tx","ut","vt","va","wa","wv","wi","wy","dc"
        ]

        keywords = [
            "homeschool", "home school", "home education", "private school affidavit",
            "education savings", "ESA", "school choice", "voucher",
            "parental rights", "compulsory attendance", "portfolio",
            "achievement test", "standardized test"
        ]

        discovered = {}

        for state in states:
            for page in range(1, max_pages + 1):
                try:
                    resp = self.search_bills(
                        jurisdiction=state,
                        classification="education",
                        updated_since=updated_since,
                        page=page,
                        per_page=100
                    )

                    results = resp.get("results", [])
                    if not results:
                        break

                    for bill in results:
                        title = (bill.get("title") or "").lower()
                        bid = bill.get("id")

                        # Keyword filter on title
                        if any(kw in title for kw in keywords):
                            if bid not in discovered:
                                discovered[bid] = {
                                    "openstates_id": bid,
                                    "identifier": bill.get("identifier"),
                                    "title": bill.get("title"),
                                    "state": state.upper(),
                                    "session": bill.get("session"),
                                    "classification": bill.get("classification"),
                                    "subject": bill.get("subject", []),
                                    "latest_action_date": bill.get("latest_action_date"),
                                    "latest_action_description": bill.get("latest_action_description"),
                                    "sponsors": [
                                        {"name": s.get("name"), "person": s.get("person")}
                                        for s in bill.get("sponsorships", [])
                                    ],
                                    "url": f"https://openstates.org/{state}/bills/{bill.get('session', {}).get('identifier', '')}/{bill.get('identifier', '')}/"
                                    if isinstance(bill.get("session"), dict)
                                    else None
                                }

                except Exception as e:
                    print(f"[OpenStates Error] {state} page {page}: {e}")
                    break

        return list(discovered.values())

    def get_bill_actions(self, jurisdiction: str, session: str, bill_id: str) -> List[Dict]:
        """Get chronological action history for a bill."""
        bill = self.get_bill(jurisdiction, session, bill_id)
        return bill.get("actions", [])

    def get_bill_votes(self, jurisdiction: str, session: str, bill_id: str) -> List[Dict]:
        """Get vote records for a bill."""
        bill = self.get_bill(jurisdiction, session, bill_id)
        return bill.get("votes", [])

    def get_bill_sponsors(self, jurisdiction: str, session: str, bill_id: str) -> List[Dict]:
        """Get sponsor details with contact info."""
        bill = self.get_bill(jurisdiction, session, bill_id)
        sponsors = []
        for s in bill.get("sponsorships", []):
            person = s.get("person")
            if person:
                sponsors.append({
                    "name": s.get("name"),
                    "primary": s.get("primary", False),
                    "classification": s.get("classification"),
                    "party": person.get("party"),
                    "district": person.get("district"),
                    "email": person.get("email"),
                    "image": person.get("image")
                })
            else:
                sponsors.append({
                    "name": s.get("name"),
                    "primary": s.get("primary", False),
                    "classification": s.get("classification")
                })
        return sponsors


# ── Unified Dual-Source Client ─────────────────────────────

class UnifiedLegislativeClient:
    """
    Combines LegiScan + OpenStates for redundant homeschool bill coverage.
    Deduplicates by (state, bill_number, session_year).
    """

    def __init__(self, legiscan_key: Optional[str] = None,
                 openstates_key: Optional[str] = None):
        self.legiscan = LegiScanClient(api_key=legiscan_key)
        self.openstates = OpenStatesClient(api_key=openstates_key)

    def discover_all(self, states: Optional[List[str]] = None) -> Dict[str, List[Dict]]:
        """
        Pull from both APIs, return unified results with provenance tracking.
        """
        print("[Unified] Discovering from LegiScan...")
        ls_results = self.legiscan.discover_homeschool_bills(states=states)

        print("[Unified] Discovering from OpenStates...")
        os_results = self.openstates.discover_homeschool_bills(
            states=[s.lower() for s in (states or [])] if states else None
        )

        # Deduplicate by (state, number)
        unified = {}
        for bill in ls_results:
            key = (bill.get("state", ""), bill.get("number", ""))
            unified[key] = {**bill, "sources": ["legiscan"]}

        for bill in os_results:
            key = (bill.get("state", ""), bill.get("identifier", ""))
            if key in unified:
                unified[key]["sources"].append("openstates")
                unified[key]["openstates_id"] = bill.get("openstates_id")
            else:
                unified[key] = {**bill, "sources": ["openstates"]}

        return {
            "legiscan_count": len(ls_results),
            "openstates_count": len(os_results),
            "unified_count": len(unified),
            "bills": list(unified.values())
        }


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="OpenStates Homeschool Bill Tracker")
    parser.add_argument("--discover", action="store_true", help="Run homeschool bill discovery")
    parser.add_argument("--state", type=str, help="Limit to specific state (lowercase)")
    parser.add_argument("--bill", type=str, nargs=3, metavar=("JURISDICTION", "SESSION", "BILL_ID"),
                        help="Get bill details: jurisdiction session bill_id")
    parser.add_argument("--output", type=str, default="openstates_output.json", help="Output file")

    args = parser.parse_args()
    client = OpenStatesClient()

    if args.discover:
        states = [args.state] if args.state else None
        results = client.discover_homeschool_bills(states=states)
        with open(args.output, "w") as f:
            json.dump(results, f, indent=2)
        print(f"Discovered {len(results)} bills → {args.output}")

    elif args.bill:
        result = client.get_bill(args.bill[0], args.bill[1], args.bill[2])
        with open(args.output, "w") as f:
            json.dump(result, f, indent=2)
        print(f"Bill → {args.output}")
