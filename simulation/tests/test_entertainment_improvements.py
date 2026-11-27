from __future__ import annotations

import random
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import entertainment


class _Citizen:
    def __init__(self, preferences: list[str], music_interest: float = 0.5, activity: str = "Relaxing", sociability: float = 0.5):
        self.preferences = preferences
        self.music_interest = music_interest
        self.activity = activity
        self.sociability = sociability


class EntertainmentImprovementTests(unittest.TestCase):
    def test_artist_defaults_include_negotiated_split(self) -> None:
        artist = entertainment._ensure_artist_defaults({})
        self.assertEqual(artist["royaltySplitArtist"], 0.80)

    def test_slot_hour_reflects_each_events_scheduled_time(self) -> None:
        self.assertEqual(entertainment._slot_hour("afternoon"), 14)
        self.assertEqual(entertainment._slot_hour("evening"), 19)
        self.assertEqual(entertainment._slot_hour("late"), 22)
        self.assertEqual(entertainment._slot_hour(""), 19)

    def test_listener_affinity_prefers_genre_and_activity(self) -> None:
        track = {"genre": "Glassline Synth"}
        aligned = _Citizen(["glassline synth", "electronic"], music_interest=0.9, activity="Entertainment")
        unaligned = _Citizen(["jazz"], music_interest=0.1, activity="Commuting")
        self.assertGreater(
            entertainment._listener_affinity(aligned, track),
            entertainment._listener_affinity(unaligned, track),
        )

    def test_choose_track_uses_preference_popularity_and_discovery(self) -> None:
        listener = _Citizen(["glassline synth"])
        tracks = [
            {"trackId": "a", "genre": "Jazz", "quality": 90, "streams": 0, "radioSpins": 0},
            {"trackId": "b", "genre": "Glassline Synth", "quality": 60, "streams": 5, "radioSpins": 2},
        ]
        chosen = entertainment._choose_track(listener, tracks, random.Random(7))
        self.assertIsNotNone(chosen)
        self.assertEqual(chosen["trackId"], "b")

    def test_venue_choices_respect_recognition_budget_and_availability(self) -> None:
        low = {"recognition": 0.0, "totalRoyaltiesEarned": 0.0, "totalBoxOfficeEarned": 0.0}
        choices = entertainment._venue_choices(low, [], 5, random.Random(1))
        self.assertEqual([venue for _, venue, _ in choices], ["ORG_LOOKING_GLASS"])

        high = {"recognition": 100.0, "totalRoyaltiesEarned": 0.0, "totalBoxOfficeEarned": 0.0}
        choices = entertainment._venue_choices(high, [], 5, random.Random(1))
        venues = {venue for _, venue, _ in choices}
        self.assertIn("ORG_LOOKING_GLASS", venues)
        self.assertNotIn("ORG_SILVERLEAF_STADIUM", venues)  # rental 4500 exceeds the 400 budget
        self.assertNotIn("ORG_MARIGOLD_THEATRE", venues)  # rental 480 exceeds the 400 budget

        booked = [
            {
                "status": "scheduled",
                "venueOrgId": "ORG_LOOKING_GLASS",
                "scheduledDay": 5,
                "slot": "evening",
            }
        ]
        choices = entertainment._venue_choices(low, booked, 5, random.Random(1))
        self.assertEqual(choices, [])

    def test_fame_tiers_match_frontend_canonical_scale(self) -> None:
        self.assertEqual(entertainment._fame_tier({"recognition": 2, "mediaVisibility": 3, "commercialInfluence": 4, "artisticCredibility": 16, "culturalInfluence": 4, "fanLoyalty": 10}), "Unlisted")
        self.assertEqual(entertainment._fame_tier({"recognition": 15, "mediaVisibility": 10, "commercialInfluence": 10, "artisticCredibility": 15, "culturalInfluence": 10, "fanLoyalty": 10}), "Local")
        self.assertEqual(entertainment._fame_tier({"recognition": 30, "mediaVisibility": 25, "commercialInfluence": 25, "artisticCredibility": 25, "culturalInfluence": 20, "fanLoyalty": 25}), "Rising")
        self.assertEqual(entertainment._fame_tier({"recognition": 50, "mediaVisibility": 45, "commercialInfluence": 45, "artisticCredibility": 45, "culturalInfluence": 40, "fanLoyalty": 45}), "Established")
        self.assertEqual(entertainment._fame_tier({"recognition": 70, "mediaVisibility": 65, "commercialInfluence": 65, "artisticCredibility": 65, "culturalInfluence": 60, "fanLoyalty": 65}), "Headliner")
        self.assertEqual(entertainment._fame_tier({"recognition": 90, "mediaVisibility": 85, "commercialInfluence": 85, "artisticCredibility": 85, "culturalInfluence": 80, "fanLoyalty": 85}), "Realm Icon")

    def test_staff_dedup_player_protection_ledger_idempotency_and_offline_catchup(self) -> None:
        import sqlite3
        import tempfile
        from contextlib import closing
        from datetime import datetime, timedelta, timezone
        from population import PopulationModel
        from test_entertainment_ecosystem import _ent_citizens

        with tempfile.TemporaryDirectory() as tmp:
            db_path = Path(tmp) / "ent_fixes.db"
            chars = _ent_citizens()
            model = PopulationModel(
                seed=123,
                database=db_path,
                characters=chars,
                step_minutes=60,
                persist=True,
            )
            # Link an entertainment-candidate citizen as the player
            linked_id = chars[0]["CharacterId"]
            model._extensions["linkedPlayerCharacterId"] = linked_id
            model.save()

            # Advance 7 days
            model.advance_steps(24 * 7)

            # 1. No duplicate staff records per citizen
            staff = model._extensions.get("entertainmentStaff", [])
            staff_cids = [s.get("characterId") for s in staff]
            self.assertEqual(len(staff_cids), len(set(staff_cids)))

            # 2. Linked player citizen was neither auto-onboarded nor debited for autonomous tickets
            self.assertFalse(any(a.get("characterId") == linked_id for a in model._extensions.get("artists", [])))
            self.assertFalse(any(s.get("characterId") == linked_id for s in staff))
            with closing(sqlite3.connect(db_path)) as conn:
                auto_tickets = conn.execute(
                    "SELECT COUNT(*) FROM LivingWorldTransactions WHERE RunId = ? AND CharacterId = ? AND Kind = 'entertainment'",
                    (model.run_id, linked_id),
                ).fetchone()[0]
                self.assertEqual(auto_tickets, 0)

                # 3. Ledger RequestId deduplication at SQLite level
                dup_tx = {
                    "transaction_id": "tx-dup-a",
                    "character_id": chars[1]["CharacterId"],
                    "step_index": 999,
                    "world_date": "Year 1 January 1 00:00",
                    "kind": "performance",
                    "amount": 100.0,
                    "balance_after": 500.0,
                    "savings_after": 0.0,
                    "description": "Idempotent test payout",
                    "request_id": "req-ledger-once",
                }
                model._revision = model.store.save_run(model.run_id, model._export_state(), [dup_tx])
                dup_tx2 = {**dup_tx, "transaction_id": "tx-dup-b"}
                model._revision = model.store.save_run(model.run_id, model._export_state(), [dup_tx2])
                req_rows = conn.execute(
                    "SELECT COUNT(*) FROM LivingWorldTransactions WHERE RunId = ? AND RequestId = 'req-ledger-once'",
                    (model.run_id,),
                ).fetchone()[0]
                self.assertEqual(req_rows, 1)

            # 4. Bounded offline catch-up when playing
            model.set_playing(True)
            reloaded = PopulationModel(seed=123, database=db_path, run_id=model.run_id, characters=chars, step_minutes=60, persist=True)
            before_ticks = reloaded.world_clock.tick_count
            future = datetime.now(timezone.utc) + timedelta(minutes=10)
            advanced = reloaded.catch_up_offline(now=future, seconds_per_step=60.0, max_steps=12)
            self.assertGreaterEqual(advanced, 9)
            self.assertEqual(reloaded.world_clock.tick_count, before_ticks + advanced)


if __name__ == "__main__":
    unittest.main()