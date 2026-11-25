from __future__ import annotations
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import copy
import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path

from living_world import (
    DEFAULT_CALENDAR_CONFIG,
    LivingWorldStore,
    WorldClock,
    validate_calendar_config,
    world_date,
)
from population import PopulationModel


def _citizens() -> list[dict]:
    return [
        {
            "CharacterId": "TEST-ADA",
            "Name": "Ada Test",
            "Kind": "person",
            "Status": "existing",
            "db_aliases": [],
            "profiles": [
                {
                    "collection": "NPCS",
                    "context": "test",
                    "data": {
                        "role": "Archivist",
                        "title": "Archivist",
                        "realm": "Orynvell",
                        "affiliation": "Royal Archives",
                    },
                },
                {
                    "collection": "defaultInputs",
                    "context": "test",
                    "data": {
                        "occupation": "Archivist",
                        "affiliation": "Royal Archives",
                        "address": (
                            "142 Moonwell Way, Suite 4B, Glassline District, "
                            "Aureline, Orynvell OR-4012"
                        ),
                        "age": "39",
                        "preferences": "research, books, community",
                    },
                },
                {
                    "collection": "seedRelationships",
                    "context": "test",
                    "data": {
                        "type": "friend",
                        "targetName": "Bea Test",
                    },
                },
            ],
        },
        {
            "CharacterId": "TEST-BEA",
            "Name": "Bea Test",
            "Kind": "person",
            "Status": "existing",
            "db_aliases": [],
            "profiles": [
                {
                    "collection": "NPCS",
                    "context": "test",
                    "data": {
                        "role": "Archivist",
                        "title": "Archivist",
                        "realm": "Orynvell",
                        "affiliation": "Royal Archives",
                    },
                },
                {
                    "collection": "defaultInputs",
                    "context": "test",
                    "data": {
                        "occupation": "Archivist",
                        "affiliation": "Royal Archives",
                        "address": "Vector Housing Suite 4B, Aureline, Orynvell",
                        "age": "41",
                    },
                },
            ],
        },
    ]


class WorldCalendarTests(unittest.TestCase):
    def test_meridion_epoch_foundation_and_leap_day(self):
        new_year = world_date(0, 0, DEFAULT_CALENDAR_CONFIG)
        leap_day = world_date(59, 0, DEFAULT_CALENDAR_CONFIG)
        founding_day = world_date(65, 510, DEFAULT_CALENDAR_CONFIG)
        next_year = world_date(366, 0, DEFAULT_CALENDAR_CONFIG)

        self.assertEqual((new_year["year"], new_year["month"], new_year["day"]), (0, "January", 1))
        self.assertEqual(new_year["weekday"], "Monday")
        self.assertEqual((leap_day["month"], leap_day["day"]), ("February", 29))
        self.assertEqual(
            (founding_day["month"], founding_day["day"], founding_day["time"]),
            ("March", 6, "08:30"),
        )
        self.assertEqual([event["name"] for event in founding_day["events"]], ["Founding Day"])
        self.assertEqual((next_year["year"], next_year["month"], next_year["day"]), (1, "January", 1))

    def test_calendar_accepts_custom_months_and_scoped_recurring_events(self):
        config = copy.deepcopy(DEFAULT_CALENDAR_CONFIG)
        config["months"] = [
            {"name": "Dawn", "days": 2},
            {"name": "Bloom", "days": 3},
        ]
        config["weekdays"] = ["Day A", "Day B"]
        config["workdays"] = ["Day A"]
        config["seasons"] = [
            {"name": "Renewal", "months": ["Bloom"]},
            {"name": "Stillness", "months": ["Dawn"]},
        ]
        config["holidays"] = [
            {
                "name": "Fross Thaw",
                "month": "Bloom",
                "day": 2,
                "recurrence": "yearly",
                "every_years": 2,
                "realm": "Fross",
                "kind": "regional",
            },
            {
                "name": "Market Day",
                "day": 1,
                "recurrence": "monthly",
                "kind": "market",
            },
            {
                "name": "House Gathering",
                "weekday": "Day A",
                "recurrence": "weekly",
                "affiliation": "House Lucia",
            },
        ]

        custom = validate_calendar_config(config)
        fross_date = world_date(3, 0, custom, realm="Fross")
        unrelated_date = world_date(3, 0, custom, realm="Lumia")
        house_date = world_date(2, 0, custom, affiliation="House Lucia")

        self.assertEqual((fross_date["month"], fross_date["day"]), ("Bloom", 2))
        self.assertEqual(fross_date["season"], "Renewal")
        self.assertEqual(
            [event["name"] for event in fross_date["events"]],
            ["Fross Thaw"],
        )
        self.assertEqual(unrelated_date["events"], [])
        self.assertIn("House Gathering", [event["name"] for event in house_date["events"]])
        self.assertEqual(custom["workdays"], ["Day A"])

    def test_invalid_calendar_and_clock_intervals_are_rejected(self):
        invalid = copy.deepcopy(DEFAULT_CALENDAR_CONFIG)
        invalid["months"][0]["days"] = 0
        with self.assertRaises(ValueError):
            validate_calendar_config(invalid)
        with self.assertRaises(ValueError):
            WorldClock(step_minutes=0)

    def test_clock_interval_changes_without_rewriting_elapsed_time(self):
        clock = WorldClock(step_minutes=30)
        clock.advance()
        clock.set_step_minutes(60)
        clock.advance()

        self.assertEqual(clock.elapsed_minutes, 90)
        self.assertEqual(clock.tick_count, 2)
        self.assertEqual((clock.hour, clock.minute), (1, 30))


class LivingWorldStoreTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.database = Path(self.temporary_directory.name) / "living-world.db"
        self.store = LivingWorldStore(self.database)
        self.state = {
            "format_version": 1,
            "clock": {"elapsed_minutes": 0, "step_minutes": 30, "tick_count": 0},
            "calendar": copy.deepcopy(DEFAULT_CALENDAR_CONFIG),
            "citizens": {},
            "playing": False,
        }

    def tearDown(self):
        self.temporary_directory.cleanup()

    def test_migration_is_idempotent_and_runs_are_isolated(self):
        first = self.store.create_run("First", self.state)
        second_state = copy.deepcopy(self.state)
        second_state["clock"]["elapsed_minutes"] = 120
        second = self.store.create_run("Second", second_state)
        self.store = LivingWorldStore(self.database)

        self.assertNotEqual(first, second)
        self.assertEqual(self.store.load_run(first)["state"]["clock"]["elapsed_minutes"], 0)
        self.assertEqual(self.store.load_run(second)["state"]["clock"]["elapsed_minutes"], 120)
        self.assertEqual(len(self.store.list_runs()), 2)
        with closing(sqlite3.connect(self.database)) as connection:
            versions = connection.execute(
                "SELECT COUNT(*) FROM LivingWorldSchemaMigrations"
            ).fetchone()[0]
            canonical_tables = connection.execute(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='Characters'"
            ).fetchone()[0]
        self.assertEqual(versions, 1)
        self.assertEqual(canonical_tables, 0)

    def test_state_and_ledger_update_atomically(self):
        run_id = self.store.create_run("Atomic", self.state)
        transaction = {
            "transaction_id": "tx-1",
            "character_id": "TEST-ADA",
            "step_index": 1,
            "world_date": "Year 0 January 1 00:30",
            "kind": "food",
            "amount": -5,
            "balance_after": 245,
            "savings_after": 0,
            "description": "Meal",
        }
        state = copy.deepcopy(self.state)
        state["clock"]["elapsed_minutes"] = 30
        self.assertEqual(self.store.save_run(run_id, state, [transaction]), 1)
        changed_state = copy.deepcopy(state)
        changed_state["clock"]["elapsed_minutes"] = 60
        with self.assertRaises(sqlite3.IntegrityError):
            self.store.save_run(run_id, changed_state, [transaction])

        saved = self.store.load_run(run_id)
        self.assertEqual(saved["revision"], 1)
        self.assertEqual(saved["state"]["clock"]["elapsed_minutes"], 30)
        self.assertEqual(len(self.store.recent_transactions(run_id)), 1)

    def test_cached_queries_follow_other_store_commits_and_isolate_callers(self):
        run_id = self.store.create_run("Shared run", self.state)
        self.assertEqual(len(self.store.list_runs()), 1)
        self.assertEqual(self.store.recent_transactions(run_id), [])
        other = LivingWorldStore(self.database)
        other.create_run("Another browser session", self.state)
        other.save_run(run_id, self.state, [{
            "transaction_id": "external-1", "character_id": "TEST-ADA", "step_index": 1,
            "world_date": "Year 0 January 1 00:30", "kind": "food", "amount": -5,
            "balance_after": 245, "savings_after": 0, "description": "Meal",
        }])
        runs = self.store.list_runs()
        self.assertEqual(len(runs), 2)
        self.assertEqual(next(r for r in runs if r["RunId"] == run_id)["Revision"], 1)
        transactions = self.store.recent_transactions(run_id)
        self.assertEqual(len(transactions), 1)
        runs[0]["Name"] = "Accidental UI mutation"
        transactions[0]["description"] = "Accidental UI mutation"
        self.assertNotIn("Accidental UI mutation", [r["Name"] for r in self.store.list_runs()])
        self.assertEqual(self.store.recent_transactions(run_id)[0]["description"], "Meal")


class PopulationWorldTests(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.database = Path(self.temporary_directory.name) / "simulation.db"
        self.characters = _citizens()

    def tearDown(self):
        self.temporary_directory.cleanup()

    def test_run_round_trip_preserves_clock_schedule_and_citizen_state(self):
        model = PopulationModel(
            seed=19,
            database=self.database,
            characters=self.characters,
        )
        ada = next(citizen for citizen in model.agents if citizen.character_id == "TEST-ADA")
        model.set_step_minutes(60)
        ada.energy = 44
        ada.balance = 312.5
        ada.daily_schedule[0]["label"] = "Rest block"
        model.step()

        restored = PopulationModel(
            database=self.database,
            run_id=model.run_id,
            characters=self.characters,
        )
        restored_ada = next(
            citizen for citizen in restored.agents if citizen.character_id == "TEST-ADA"
        )

        self.assertEqual(restored.world_clock.elapsed_minutes, 60)
        self.assertEqual(restored.world_clock.tick_count, 1)
        self.assertEqual(restored_ada.energy, ada.energy)
        self.assertEqual(restored_ada.balance, ada.balance)
        self.assertEqual(restored_ada.daily_schedule[0]["label"], "Rest block")
        self.assertFalse(restored._is_playing)
        self.assertEqual(restored.store.load_run(model.run_id)["status"], "paused")

    def test_geography_relationships_and_multiple_experiments(self):
        first = PopulationModel(
            seed=3,
            database=self.database,
            characters=self.characters,
        )
        second = PopulationModel(
            seed=4,
            database=self.database,
            characters=self.characters,
        )
        ada = next(citizen for citizen in first.agents if citizen.character_id == "TEST-ADA")
        friend_names = {
            link["target_name"]
            for link in ada.relationship_links
            if link["kind"] == "friend"
        }

        self.assertNotEqual(first.run_id, second.run_id)
        self.assertEqual(ada.home_location["district"], "Glassline District")
        self.assertIn("Bea Test", friend_names)
        self.assertTrue(any(link["kind"] == "coworker" for link in ada.relationship_links))
        self.assertTrue(first.institutions)
        archives = next(
            institution
            for institution in first.institutions
            if institution["name"] == "Royal Archives"
        )
        self.assertEqual(archives["kind"], "institution")
        self.assertEqual(len(first.store.list_runs()), 2)


if __name__ == "__main__":
    unittest.main()
