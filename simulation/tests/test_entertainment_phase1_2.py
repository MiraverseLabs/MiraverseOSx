from __future__ import annotations

import sqlite3
import sys
import tempfile
import unittest
from contextlib import closing
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "simulation"))
sys.path.insert(0, str(ROOT / "scripts"))

import entertainment
import entertainment_store
from living_world import LivingWorldStore
from migrate_entertainment_schema import migrate_entertainment_schema
from population import PopulationModel
from tests.test_entertainment_ecosystem import _ent_citizens


class EntertainmentPhase1And2Tests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.db_path = Path(self.temp_dir.name) / "phase1_2_test.db"

    def tearDown(self) -> None:
        self.temp_dir.cleanup()

    def test_venues_load_from_canonical_miraverse_db_and_appear_in_snapshot(self) -> None:
        entertainment.clear_entertainment_caches()
        venues = entertainment.load_entertainment_venues()
        self.assertIn("ORG_LOOKING_GLASS", venues)
        self.assertIn("ORG_MARIGOLD_THEATRE", venues)
        self.assertIn("ORG_SILVERLEAF_STADIUM", venues)
        self.assertEqual(venues["ORG_LOOKING_GLASS"]["capacity"], 180)
        self.assertEqual(venues["ORG_MARIGOLD_THEATRE"]["capacity"], 1200)
        self.assertEqual(venues["ORG_MARIGOLD_THEATRE"]["minRecognition"], 12.0)
        self.assertEqual(venues["ORG_SILVERLEAF_STADIUM"]["capacity"], 45000)

        run_stub = {"state": {}, "calendar": {}}
        snap = entertainment.industry_snapshot(run_stub)
        self.assertIn("venues", snap)
        self.assertGreaterEqual(len(snap["venues"]), 4)

    def test_phase2_schema_migration_and_atomic_run_projection_cover_all_14_categories(self) -> None:
        # Initialize LivingWorldStore first, then apply Phase 2 entertainment schema
        store = LivingWorldStore(self.db_path)
        result = migrate_entertainment_schema(self.db_path)
        self.assertEqual(result["integrity_check"], "ok")
        self.assertEqual(result["foreign_key_violations"], 0)
        self.assertEqual(result["venues_seeded"], 4)

        # Running the migration a second time must be idempotent
        second = migrate_entertainment_schema(self.db_path)
        self.assertEqual(second["integrity_check"], "ok")
        self.assertEqual(second["venues_seeded"], 4)

        # Create a live simulation run and populate across entertainment domains
        model = PopulationModel(
            seed=204,
            database=self.db_path,
            characters=_ent_citizens(),
            step_minutes=60,
            persist=True,
        )
        run_env = {
            "run_id": model.run_id,
            "name": model.run_name,
            "calendar": model.calendar_config,
            "state": model._export_state(),
        }
        art = entertainment.upsert_artist(
            run_env,
            {
                "artistId": "ART-P2-1",
                "characterId": "ENT-NYL",
                "stageName": "NYLA",
                "disciplines": ["music", "modeling"],
                "genres": ["Alternative R&B", "neo-soul"],
                "recognition": 32,
                "artisticCredibility": 45,
            },
        )
        trk = entertainment.add_track(
            run_env,
            {
                "trackId": "TRK-P2-1",
                "artistId": art["artistId"],
                "title": "Harbor Nocturne",
                "genre": "Alternative R&B",
                "durationSeconds": 195,
                "publisherOrgId": "ORG_KAJI_PUBLISHING",
                "mmrsRegistered": True,
            },
        )
        entertainment.schedule_release(
            run_env,
            {"trackId": trk["trackId"], "artistId": art["artistId"], "scheduledDay": 0},
        )
        entertainment.manage_contract(
            run_env,
            {"action": "sign", "artistId": art["artistId"], "orgId": "ORG_SECOND_ACT", "contractType": "management"},
        )
        entertainment.create_or_advance_production(
            run_env,
            {
                "action": "create",
                "title": "Glassline Autumn Lookbook",
                "kind": "modeling",
                "studioOrgId": "ORG_GLASSLINE_DESIGNS",
                "artistId": art["artistId"],
                "budgetCredits": 500,
            },
        )
        entertainment.create_or_advance_production(
            run_env,
            {
                "action": "create",
                "title": "Rosemont Portrait Folio",
                "kind": "portrait",
                "studioOrgId": "ORG_ROSEMONT_PORTRAIT",
                "artistId": art["artistId"],
                "budgetCredits": 250,
            },
        )
        entertainment.schedule_concert(
            run_env,
            {
                "concertId": "CON-P2-1",
                "artistId": art["artistId"],
                "venueOrgId": "ORG_LOOKING_GLASS",
                "scheduledDay": 2,
                "ticketPrice": 22,
            },
        )
        entertainment.purchase_ticket(
            run_env,
            {
                "concertId": "CON-P2-1",
                "buyerCharacterId": "ENT-FAN1",
                "buyerName": "Mina Vance",
                "quantity": 2,
                "requestId": "REQ-P2-TKT",
            },
        )

        # Persist state through PopulationModel.save() -> LivingWorldStore.save_run()
        model._extensions = {
            k: v
            for k, v in run_env["state"].items()
            if k not in ("format_version", "seed", "clock", "calendar", "playing", "random_state", "citizens")
        }
        model.save()

        # Verify normalized tables were populated atomically for this run
        with closing(sqlite3.connect(self.db_path)) as conn:
            self.assertEqual(conn.execute("PRAGMA integrity_check").fetchone()[0], "ok")
            self.assertEqual(list(conn.execute("PRAGMA foreign_key_check")), [])

            for table_name in (
                "EntertainmentVenues",
                "EntertainmentArtists",
                "EntertainmentContracts",
                "EntertainmentTracks",
                "EntertainmentReleases",
                "EntertainmentRights",
                "EntertainmentProductions",
                "EntertainmentConcerts",
                "EntertainmentTickets",
                "EntertainmentFashionItems",
                "EntertainmentPhotoSessions",
                "EntertainmentTrainingRecords",
            ):
                count = conn.execute(f'SELECT COUNT(*) FROM "{table_name}"').fetchone()[0]
                self.assertGreaterEqual(count, 1, f"Expected normalized rows in {table_name}")

            # Verify all 22 Phase 2 tables exist
            existing = {
                r[0]
                for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")
            }
            for expected in ("EntertainmentVenues", *entertainment_store.ENTERTAINMENT_RUN_TABLES):
                self.assertIn(expected, existing)

            # Verify cascade delete cleans up run-scoped entertainment rows cleanly
            conn.execute("PRAGMA foreign_keys = ON")
            conn.execute("DELETE FROM LivingWorldRuns WHERE RunId = ?", (model.run_id,))
            conn.commit()
            self.assertEqual(
                conn.execute("SELECT COUNT(*) FROM EntertainmentArtists WHERE RunId = ?", (model.run_id,)).fetchone()[0],
                0,
            )
            self.assertEqual(
                conn.execute("SELECT COUNT(*) FROM EntertainmentVenues").fetchone()[0],
                4,
                "Deleting a run must never delete canonical EntertainmentVenues",
            )


if __name__ == "__main__":
    unittest.main()
