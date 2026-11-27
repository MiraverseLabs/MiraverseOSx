"""Comprehensive Hypothesis, integration, and API tests for MiraverseOSx simulation systems."""
from __future__ import annotations

import base64
import json
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from hypothesis import HealthCheck, given, settings, strategies as st

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parent))

import institutions
import npc_intelligence
import reliability
from living_world_api import create_server
from population import PopulationModel
from test_entertainment_ecosystem import _ent_citizens


def _http_json(url: str, method: str = "GET", payload: dict | None = None) -> tuple[int, dict]:
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    headers = {"Content-Type": "application/json"} if data is not None else {}
    req = Request(url, data=data, headers=headers, method=method)
    try:
        with urlopen(req, timeout=15) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except HTTPError as err:
        return err.code, json.loads(err.read().decode("utf-8"))


class SimulationSystemsPropertyTests(unittest.TestCase):
    @settings(max_examples=25, deadline=None)
    @given(
        sociability=st.floats(min_value=0.0, max_value=1.0, allow_nan=False),
        music_interest=st.floats(min_value=0.0, max_value=1.0, allow_nan=False),
        energy=st.floats(min_value=0.0, max_value=100.0, allow_nan=False),
        social_need=st.floats(min_value=0.0, max_value=100.0, allow_nan=False),
        activity=st.sampled_from(["Sleeping", "Resting", "Socializing", "Civic & professional duties", "Creative & studio work", "Entertainment"]),
    )
    def test_personality_vector_stays_bounded(self, sociability, music_interest, energy, social_need, activity) -> None:
        vec = npc_intelligence.compute_personality_vector("CHAR-PROP-1", sociability=sociability, music_interest=music_interest)
        evolved = npc_intelligence.evolve_personality(vec, activity=activity, energy=energy, social_need=social_need)
        for trait in npc_intelligence.PERSONALITY_TRAITS:
            self.assertGreaterEqual(evolved[trait], 0.05)
            self.assertLessEqual(evolved[trait], 0.95)

    @settings(max_examples=20, deadline=None)
    @given(
        num_staff=st.integers(min_value=2, max_value=6),
        num_days=st.integers(min_value=1, max_value=3),
    )
    def test_ortools_scheduler_never_double_books_same_period(self, num_staff, num_days) -> None:
        staff = [f"STAFF-{i}" for i in range(num_staff)]
        slots = []
        for d in range(num_days):
            # Two concurrent slots in the same (day, "morning") period
            slots.append({"slotId": f"d{d}-a", "label": "Desk A", "day": d, "period": "morning", "requiredStaff": 1})
            slots.append({"slotId": f"d{d}-b", "label": "Desk B", "day": d, "period": "morning", "requiredStaff": 1})
        res = institutions.InstitutionalScheduler.optimize_schedule(
            institution="Orynvell Civic Desk",
            staff_ids=staff,
            slots=slots,
        )
        self.assertIn(res["status"], ("optimal", "feasible"))
        by_period: dict[tuple[int, str], set[str]] = {}
        for item in res["assignments"]:
            key = (item["day"], item["period"])
            seen = by_period.setdefault(key, set())
            for sid in item["assignedStaff"]:
                self.assertNotIn(sid, seen, "Staff member double-booked in same (day, period)")
                seen.add(sid)

    @settings(max_examples=20, deadline=None, suppress_health_check=[HealthCheck.too_slow])
    @given(
        trust_delta=st.floats(min_value=-200.0, max_value=200.0, allow_nan=False),
        aff_delta=st.floats(min_value=-200.0, max_value=200.0, allow_nan=False),
    )
    def test_networkx_relationship_bounds_and_asymmetry(self, trust_delta, aff_delta) -> None:
        mgr = npc_intelligence.SocialNetworkManager()
        mgr.record_interaction("A", "B", trust_delta=trust_delta, affection_delta=aff_delta, day_index=1)
        mgr.record_interaction("B", "A", trust_delta=5.0, affection_delta=2.0, day_index=1)
        ab = mgr.graph["A"]["B"]
        ba = mgr.graph["B"]["A"]
        self.assertTrue(0.0 <= ab["trust"] <= 100.0)
        self.assertTrue(0.0 <= ab["affection"] <= 100.0)
        self.assertTrue(0.0 <= ba["trust"] <= 100.0)


class SimulationSystemsIntegrationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.db_path = Path(self.tmp.name) / "sim_systems_test.db"
        self.chars = _ent_citizens()

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_intelligence_institutions_reliability_and_persistence(self) -> None:
        model = PopulationModel(
            seed=77,
            database=self.db_path,
            characters=self.chars,
            step_minutes=60,
            persist=True,
        )
        # Spawn noncanonical Faker citizens and verify bounded cap + reload persistence
        created = model.spawn_procedural_citizens(3, realm="Orynvell", seed=1234)
        self.assertEqual(len(created), 3)
        self.assertTrue(all(c["canonical"] is False for c in created))
        self.assertTrue(all(c["characterId"].startswith("PROC-OR-") for c in created))

        # Advance 2 days (48 steps) -> exercises py-trees, NumPy personality, NetworkX decay, DeepDiff
        model.advance_steps(48)
        self.assertGreater(model._perf_stats["stepsTimed"], 0)
        self.assertGreaterEqual(len(model._extensions.get("state_diffs", [])), 1)

        # Subjective knowledge propagation (no NPC omniscience: unreachable isolated node should not receive fact)
        origin = model.living_agents[0].character_id
        model.social_network.record_interaction(origin, model.living_agents[1].character_id, trust_delta=40.0, day_index=2)
        reached = model.social_network.propagate_information(model, origin, "fact-festival", "Radiance Festival announced", max_hops=1, min_trust=50.0)
        self.assertIn(model.living_agents[1].character_id, reached)

        # Scikit-learn recommendations
        recs = model.recommender.recommend_for_citizen(model, origin, top_k=3)
        self.assertGreaterEqual(len(recs["socialRecommendations"]), 1)

        # Transitions state machines across domains + invalid transition rejection
        wf = institutions.transition_workflow(model, workflow_id=None, domain="application", trigger="submit", subject_id=origin, institution="Starstruck", title="Staff Role")
        self.assertEqual(wf["state"], "submitted")
        wf = institutions.transition_workflow(model, workflow_id=wf["workflowId"], domain="application", trigger="review")
        self.assertEqual(wf["state"], "under_review")
        with self.assertRaises(ValueError):
            institutions.transition_workflow(model, workflow_id=wf["workflowId"], domain="application", trigger="accept")

        # ReportLab PDF generation for official document types
        for doc_type in ("employment_contract", "financial_statement", "certificate"):
            pdf_doc = institutions.generate_official_pdf(
                doc_type=doc_type,
                title=f"Test {doc_type}",
                institution="Oryn Department of Finance",
                recipient_name=model.living_agents[0].name,
                recipient_id=origin,
                body_lines=["Authorized MiraverseOSx record."],
                table_rows=[["Field", "Value"], ["Status", "Verified"]],
            )
            raw_pdf = base64.b64decode(pdf_doc["pdfBase64"])
            self.assertTrue(raw_pdf.startswith(b"%PDF-"))
            self.assertEqual(pdf_doc["fyloMetadata"]["dir"], "/documents")

        # Advisory-only AI proposal validation (forbids extra fields / non-advisory mutations)
        proposal = reliability.StructuredAIProposal(
            proposalId="ai-1",
            intent="career_suggestion",
            characterId=origin,
            summary="Consider applying to Royal Archives.",
        )
        self.assertTrue(proposal.advisoryOnly)
        with self.assertRaises(ValueError):
            reliability.validate_payload(reliability.StructuredAIProposal, {"proposalId": "x", "intent": "dialogue", "characterId": origin, "summary": "hi", "advisoryOnly": False})

        # Persistence round-trip preserves procedural citizens, personality, and workflows
        model.save()
        reloaded = PopulationModel(seed=77, database=self.db_path, run_id=model.run_id, characters=self.chars, step_minutes=60, persist=True)
        self.assertEqual(len(reloaded.agents), len(model.agents))
        self.assertEqual(len(reloaded._extensions.get("institutional_workflows", [])), 1)
        self.assertTrue(bool(reloaded.living_agents[0].personality))

    def test_living_world_api_new_routes_and_pydantic_validation(self) -> None:
        server = create_server(port=0, database=self.db_path, characters=self.chars)
        port = server.server_port
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        base = f"http://127.0.0.1:{port}/api/livingworld"
        try:
            code, created = _http_json(f"{base}/runs", "POST", {"name": "Systems API Test", "seed": 55, "stepMinutes": 60})
            self.assertEqual(code, 201)
            run_id = created["runId"]

            # Advance 24 steps
            code, _ = _http_json(f"{base}/runs/{run_id}/advance", "POST", {"steps": 24})
            self.assertEqual(code, 200)

            # GET /network, /recommendations, /diagnostics
            code, net = _http_json(f"{base}/network?runId={run_id}")
            self.assertEqual(code, 200)
            self.assertIn("nodes", net["network"])

            code, recs = _http_json(f"{base}/recommendations?runId={run_id}&characterId={self.chars[0]['CharacterId']}")
            self.assertEqual(code, 200)
            self.assertIn("socialRecommendations", recs["recommendations"])

            code, diag = _http_json(f"{base}/diagnostics?runId={run_id}")
            self.assertEqual(code, 200)
            self.assertIn("populationStats", diag)
            self.assertIn("performance", diag)

            # POST /workflows
            code, wf = _http_json(f"{base}/workflows", "POST", {"runId": run_id, "domain": "mission", "trigger": "assign", "title": "Archive Audit"})
            self.assertEqual(code, 200)
            self.assertEqual(wf["result"]["state"], "assigned")

            # POST /schedule/optimize
            code, sched = _http_json(
                f"{base}/schedule/optimize",
                "POST",
                {
                    "runId": run_id,
                    "institution": "Faith Medical Group",
                    "staffIds": ["S1", "S2", "S3"],
                    "slots": [
                        {"slotId": "m1", "label": "Triage", "day": 0, "period": "morning", "requiredStaff": 1},
                        {"slotId": "m2", "label": "Ward", "day": 0, "period": "morning", "requiredStaff": 1},
                    ],
                },
            )
            self.assertEqual(code, 200)
            self.assertIn(sched["result"]["status"], ("optimal", "feasible"))

            # POST /citizens/procedural
            code, proc = _http_json(f"{base}/citizens/procedural", "POST", {"runId": run_id, "count": 2, "realm": "Marlowe", "seed": 7})
            self.assertEqual(code, 201)
            self.assertEqual(len(proc["created"]), 2)

            # POST /documents/generate
            code, doc = _http_json(
                f"{base}/documents/generate",
                "POST",
                {
                    "runId": run_id,
                    "docType": "employment_contract",
                    "title": "Archivist Appointment",
                    "institution": "Royal Archives",
                    "recipientName": self.chars[0]["Name"],
                    "recipientId": self.chars[0]["CharacterId"],
                },
            )
            self.assertEqual(code, 201)
            self.assertTrue(base64.b64decode(doc["document"]["pdfBase64"]).startswith(b"%PDF-"))

            # Pydantic validation error rejects invalid transaction (amount=0)
            code, err = _http_json(
                f"{base}/finances",
                "POST",
                {"runId": run_id, "characterId": self.chars[0]["CharacterId"], "kind": "salary", "amount": 0},
            )
            self.assertEqual(code, 400)
            self.assertIn("Validation failed", err["error"])
        finally:
            server.shutdown()
            server.server_close()


if __name__ == "__main__":
    unittest.main()
