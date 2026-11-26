"""Idempotent Phase 2 migration for persistent entertainment tables & canonical venues in miraverse.db.

Preserves all existing canonical characters, EntertainmentOrganizations, LivingWorldRuns,
and LivingWorldTransactions, and non-destructively backfills existing run snapshots into
the normalized 14-category entertainment tables.
"""
from __future__ import annotations

import json
import sqlite3
import sys
from contextlib import closing
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = ROOT / "miraverse.db"
sys.path.insert(0, str(ROOT / "simulation"))

import entertainment_store


def migrate_entertainment_schema(database: Path = DEFAULT_DB) -> dict:
    with closing(sqlite3.connect(database, timeout=30)) as db:
        db.execute("PRAGMA foreign_keys = ON")

        # Execute DDL (executescript commits pending transaction, then we run transactional seed+backfill)
        entertainment_store.ensure_entertainment_schema(db)

        db.execute("BEGIN IMMEDIATE")
        venues_seeded = entertainment_store.seed_canonical_venues(db)

        # Backfill every existing LivingWorldRuns snapshot into the normalized tables
        backfilled_runs = 0
        totals: dict[str, int] = {}
        has_runs = db.execute(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='LivingWorldRuns'"
        ).fetchone()[0]
        if has_runs:
            rows = db.execute("SELECT RunId, StateJson FROM LivingWorldRuns ORDER BY CreatedAt ASC").fetchall()
            for run_id, state_json in rows:
                try:
                    state = json.loads(state_json) if state_json else {}
                except (TypeError, ValueError):
                    state = {}
                if not isinstance(state, dict):
                    continue
                counts = entertainment_store.sync_run_entertainment_state(db, str(run_id), state)
                backfilled_runs += 1
                for k, v in counts.items():
                    totals[k] = totals.get(k, 0) + v

        # Record ContentMigrations Version 7 if ContentMigrations table exists
        has_content_migrations = db.execute(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='ContentMigrations'"
        ).fetchone()[0]
        if has_content_migrations:
            db.execute(
                """
                INSERT OR REPLACE INTO ContentMigrations (Version, Description)
                VALUES (
                    7,
                    'Phase 2 persistent entertainment relational schema (14 categories), canonical EntertainmentVenues table, and LivingWorldRuns entertainment backfill'
                )
                """
            )

        integrity = db.execute("PRAGMA integrity_check").fetchone()[0]
        if integrity != "ok":
            raise RuntimeError(f"SQLite integrity check failed: {integrity}")
        fk_errors = list(db.execute("PRAGMA foreign_key_check"))
        if fk_errors:
            raise RuntimeError(f"SQLite foreign key check failed: {fk_errors[:5]}")

        db.commit()
        db.execute("PRAGMA wal_checkpoint(PASSIVE)")

    return {
        "database": str(database),
        "venues_seeded": venues_seeded,
        "backfilled_runs": backfilled_runs,
        "projected_totals": totals,
        "integrity_check": "ok",
        "foreign_key_violations": 0,
    }


if __name__ == "__main__":
    print(json.dumps(migrate_entertainment_schema(), indent=2))
