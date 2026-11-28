"""Isolated tests for the MiraverseOSx Dynamic Population System."""
from __future__ import annotations

import json
import shutil
import sqlite3
import sys
import tempfile
import threading
import unittest
from contextlib import closing
from pathlib import Path
from urllib.request import Request, urlopen

SIM_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = SIM_DIR.parent
if str(SIM_DIR) not in sys.path:
    sys.path.insert(0, str(SIM_DIR))

import dynamic_population
import living_world_api
from population import PopulationModel


def _copy_live_db(tmpdir: Path) -> Path:
    src = REPO_ROOT / "miraverse.db"
    dst = tmpdir / "isolated_miraverse.db"
    with closing(sqlite3.connect(src)) as s, closing(sqlite3.connect(dst)) as d:
        s.backup(d)
    # Reset GeneratedCitizens & PopulationGenerationLog inside the isolated test copy
    # so isolated unit tests always run from a deterministic canonical baseline.
    with closing(sqlite3.connect(dst)) as conn:
        if conn.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='GeneratedCitizens'").fetchone():
            gen_maids = [r[0] for r in conn.execute("SELECT Maid FROM GeneratedCitizens").fetchall()]
            conn.execute("DELETE FROM GeneratedCitizens")
            conn.execute("DELETE FROM PopulationGenerationLog")
            for m in gen_maids:
                conn.execute("DELETE FROM MaidRegistry WHERE Maid = ? AND CharacterId IS NULL", (m,))
            conn.commit()
    return dst


def _http_json(url: str, payload: dict | None = None) -> tuple[int, dict]:
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = Request(
        url,
        data=data,
        headers={"Content-Type": "application/json"} if data is not None else {},
        method="POST" if data is not None else "GET",
    )
    with urlopen(req, timeout=15) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))


class TestDynamicPopulationSystem(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.db_path = _copy_live_db(Path(self._tmp.name))

    def tearDown(self) -> None:
        self._tmp.cleanup()

    def test_schema_canon_protection_and_preview_commit_reload(self) -> None:
        with closing(sqlite3.connect(self.db_path)) as conn:
            canon_before = conn.execute(
                "SELECT CharacterId, Name, Maid, Status FROM Characters ORDER BY CharacterId"
            ).fetchall()
            self.assertEqual(len(canon_before), 62)
            retired_serials = {
                int(r[0]) for r in conn.execute("SELECT SerialNumber FROM MaidRetiredSerials").fetchall()
            }

        model = PopulationModel(seed=101, database=self.db_path)
        initial_agents = len(model.agents)

        # Preview across all 3 naming styles without mutating DB
        preview = model.preview_population_batch(
            {
                "count": 6,
                "residencyType": "permanent",
                "namingStyle": "mixed",
                "sector": "mixed",
                "simulationDepth": "Standard",
                "seed": 2026,
            }
        )
        self.assertTrue(preview["valid"])
        self.assertEqual(preview["previewCount"], 6)
        with closing(sqlite3.connect(self.db_path)) as conn:
            has_gen = conn.execute(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name='GeneratedCitizens'"
            ).fetchone()
            if has_gen:
                self.assertEqual(conn.execute("SELECT COUNT(*) FROM GeneratedCitizens").fetchone()[0], 0)

        # Commit batch to isolated DB + Mesa + WORKNET + NetworkX
        committed = model.commit_population_batch(
            preview["records"],
            batch_id=preview["batchId"],
            trigger_kind="manual",
            seed=2026,
            persist_to_db=True,
        )
        self.assertEqual(committed["committedCount"], 6)
        self.assertEqual(len(model.agents), initial_agents + 6)

        # Duplicate commit of same records must be rejected
        with self.assertRaises(ValueError):
            model.commit_population_batch(preview["records"], persist_to_db=True)

        # Verify MAIDs are unique, properly formatted, registered in MaidRegistry, and never reuse retired serials
        maids = [c["maid"] for c in committed["citizens"]]
        self.assertEqual(len(set(maids)), 6)
        for m in maids:
            self.assertTrue(m.startswith("MAID-"))
            serial = int(m.split("-")[-1])
            self.assertNotIn(serial, retired_serials)

        # Verify canonical 62 characters are completely untouched & DB integrity is clean
        with closing(sqlite3.connect(self.db_path)) as conn:
            canon_after = conn.execute(
                "SELECT CharacterId, Name, Maid, Status FROM Characters ORDER BY CharacterId"
            ).fetchall()
            self.assertEqual(canon_before, canon_after)
            self.assertEqual(conn.execute("PRAGMA integrity_check").fetchone()[0], "ok")
            self.assertEqual(conn.execute("PRAGMA foreign_key_check").fetchall(), [])
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM GeneratedCitizens").fetchone()[0], 6)
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM PopulationGenerationLog").fetchone()[0], 1)

        # Advance simulation with mixed simulation depths and verify reload preserves persistent state
        first_gen_id = committed["citizens"][0]["characterId"]
        first_agent = next(a for a in model.agents if a.character_id == first_gen_id)
        first_agent.simulation_depth = "Minimal"
        model.advance_steps(8)

        reloaded = PopulationModel(seed=101, database=self.db_path, run_id=model.run_id)
        reloaded_agent = next((a for a in reloaded.agents if a.character_id == first_gen_id), None)
        self.assertIsNotNone(reloaded_agent)
        self.assertEqual(reloaded_agent.maid, committed["citizens"][0]["maid"])
        self.assertEqual(reloaded_agent.simulation_depth, "Minimal")
        self.assertTrue(reloaded_agent.background_history)

    def test_naming_styles_and_rate_limits(self) -> None:
        model = PopulationModel(seed=77, database=self.db_path)
        for style in ("contemporary", "culturally_diverse", "realm_fictional"):
            prev = model.preview_population_batch(
                {"count": 3, "realm": "Lumia", "namingStyle": style, "seed": 42}
            )
            self.assertEqual(prev["previewCount"], 3)
            for rec in prev["records"]:
                self.assertEqual(rec["namingStyle"], style)
                self.assertEqual(rec["homeRealm"], "Lumia")

        # Enforce daily rate limit for Kaji
        dynamic_population.update_realm_config(
            self.db_path,
            dynamic_population.RealmConfigUpdatePayload(
                realmName="Kaji", maxGenerationPerDay=2, targetPermanent=20
            ),
        )
        prev_kaji = model.preview_population_batch({"count": 5, "realm": "Kaji", "seed": 9})
        self.assertEqual(prev_kaji["previewCount"], 2)
        self.assertTrue(any("limit" in w.lower() for w in prev_kaji["warnings"]))

    def test_demand_evaluates_existing_eligible_before_generating(self) -> None:
        model = PopulationModel(seed=55, database=self.db_path)

        # Small demand in Orynvell should be satisfied by existing eligible citizens (0 generated)
        res_small = model.fulfill_population_demand(
            {
                "sector": "employment",
                "neededCount": 2,
                "realm": "Orynvell",
                "commitToDb": True,
                "seed": 11,
            }
        )
        self.assertGreaterEqual(res_small["existingEligibleCount"], 2)
        self.assertEqual(res_small["shortfall"], 0)
        self.assertEqual(res_small["generatedCount"], 0)

        # Demand larger than existing eligible citizens in Kaji should generate ONLY the shortfall
        res_kaji = model.fulfill_population_demand(
            {
                "sector": "entertainment",
                "neededCount": 6,
                "realm": "Kaji",
                "role": "Stage Technician",
                "employer": "Balisya Sound Hall",
                "commitToDb": True,
                "seed": 12,
            }
        )
        expected_shortfall = max(0, 6 - res_kaji["existingEligibleCount"])
        self.assertEqual(res_kaji["shortfall"], expected_shortfall)
        self.assertEqual(res_kaji["generatedCount"], expected_shortfall)
        for gen in res_kaji["generated"]:
            self.assertEqual(gen["occupation"], "Stage Technician")
            self.assertEqual(gen["employer"], "Balisya Sound Hall")

    def test_visitors_migration_and_api_endpoints(self) -> None:
        server = living_world_api.create_server(port=0, database=self.db_path)
        port = server.server_port
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            base = f"http://127.0.0.1:{port}"
            status, created_run = _http_json(f"{base}/runs", {"name": "DynPop API Test", "seed": 33})
            self.assertEqual(status, 201)
            run_id = created_run["runId"]

            # 1. GET /population/summary
            st, summary = _http_json(f"{base}/population/summary?runId={run_id}")
            self.assertEqual(st, 200)
            self.assertEqual(len(summary["realmBreakdown"]), 8)
            self.assertGreater(summary["totalAbstractBackgroundPopulation"], 1_000_000)

            # 2. POST /population/preview (visitors)
            st, prev = _http_json(
                f"{base}/population/preview",
                {
                    "runId": run_id,
                    "count": 3,
                    "realm": "Marlowe",
                    "residencyType": "visitor",
                    "namingStyle": "realm_fictional",
                    "simulationDepth": "Expanded",
                    "seed": 99,
                },
            )
            self.assertEqual(st, 200)
            self.assertEqual(prev["previewCount"], 3)
            for rec in prev["records"]:
                self.assertEqual(rec["residencyType"], "visitor")
                self.assertNotEqual(rec["homeRealm"], rec["currentRealm"])

            # 3. POST /population/commit
            st, committed = _http_json(
                f"{base}/population/commit",
                {"runId": run_id, "batchId": prev["batchId"], "records": prev["records"]},
            )
            self.assertEqual(st, 201)
            self.assertEqual(committed["committedCount"], 3)

            # 4. POST /population/config
            st, cfg = _http_json(
                f"{base}/population/config",
                {"runId": run_id, "realmName": "Marlowe", "targetVisitors": 12, "allowInMigration": True},
            )
            self.assertEqual(st, 200)
            self.assertEqual(cfg["config"]["targetVisitors"], 12)

            # 5. POST /population/demand
            st, dem = _http_json(
                f"{base}/population/demand",
                {"runId": run_id, "sector": "education", "neededCount": 3, "realm": "Fross", "seed": 15},
            )
            self.assertEqual(st, 200)
            self.assertEqual(dem["existingEligibleCount"] + dem["generatedCount"], max(3, dem["existingEligibleCount"]))
        finally:
            server.shutdown()
            server.server_close()

    def test_deficit_fill_diversity_atomic_rollback_and_full_population_benchmark(self) -> None:
        import importlib.util
        import time

        # 1. Verify Population Manager.py loads and previews without modifying DB
        spec = importlib.util.spec_from_file_location("pop_mgr", SIM_DIR / "Population Manager.py")
        pop_mgr = importlib.util.module_from_spec(spec)
        assert spec and spec.loader
        spec.loader.exec_module(pop_mgr)

        cli = pop_mgr.PopulationManagerCLI(self.db_path)
        deficits = cli.show_deficits()
        self.assertEqual(deficits["totalPermanentTarget"], 202)
        self.assertEqual(deficits["totalVisitorTarget"], 37)
        self.assertEqual(deficits["totalPermanentCurrent"] + deficits["totalPermanentDeficit"], 202)

        preview = cli.preview_fill_deficits("permanent", seed=42)
        self.assertEqual(preview["previewCount"], deficits["totalPermanentDeficit"])
        # Verify all 12 sectors are represented in the 141-citizen deficit fill
        self.assertEqual(len(preview["sectorDistribution"]), 12)
        # Verify preview did NOT write to isolated DB
        integrity_before = pop_mgr.validate_database_integrity(self.db_path)
        self.assertEqual(integrity_before["activeGeneratedCitizens"], 0)

        # 2. Verify atomic rollback on failed commit (corrupt second record's duplicate ID mid-batch)
        bad_batch = [dict(preview["records"][0]), dict(preview["records"][0])]
        model = PopulationModel(seed=42, database=self.db_path)
        with self.assertRaises(ValueError):
            model.commit_population_batch(bad_batch, persist_to_db=True)
        with closing(sqlite3.connect(self.db_path)) as conn:
            self.assertEqual(conn.execute("SELECT COUNT(*) FROM GeneratedCitizens").fetchone()[0], 0)

        # 3. Commit full permanent deficit fill (141 citizens -> 202 total) in isolated DB
        committed = model.commit_population_batch(
            preview["records"],
            batch_id=preview["batchId"],
            trigger_kind="initial_seeding",
            seed=42,
            persist_to_db=True,
        )
        self.assertEqual(committed["committedCount"], deficits["totalPermanentDeficit"])
        self.assertEqual(len(model.agents), 202)

        # 4. Repeated deficit fill must generate 0 additional citizens (targets satisfied!)
        second_preview = model.preview_deficit_fill(residency_type="permanent", seed=99)
        self.assertEqual(second_preview["previewCount"], 0)

        # 5. Short performance benchmark with full 202-citizen population + restart persistence
        t0 = time.perf_counter()
        model.advance_steps(12)
        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        self.assertLess(elapsed_ms, 15000.0)

        reloaded = PopulationModel(seed=42, database=self.db_path, run_id=model.run_id)
        self.assertEqual(len(reloaded.agents), 202)
        self.assertEqual(reloaded.world_clock.tick_count, 12)
        integrity_after = pop_mgr.validate_database_integrity(self.db_path)
        self.assertEqual(integrity_after["integrity"], "ok")
        self.assertEqual(integrity_after["foreignKeyErrors"], 0)
        self.assertEqual(integrity_after["duplicateMaids"], 0)


if __name__ == "__main__":
    unittest.main()
