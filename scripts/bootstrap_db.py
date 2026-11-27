"""Rebuild a fresh miraverse.db with the canonical schema, organizations and venues.

The live database is runtime state and is no longer tracked, so a fresh clone has
none. This script recreates it from what *is* tracked: the schema files under
scripts/ plus the authored catalogues under frontend/src/ (organizations.json for
the Section XIX entertainment organizations, places.json for venue locations).

It never overwrites an existing database unless --force is passed.

This seeds industry data only. Population and archived content tables remain
empty until their separate import workflows run with the required sources.
Running data:build now exports empty legacy tables, overwriting their JSON files.

Usage:
    npm run db:bootstrap
    python scripts/bootstrap_db.py --out backups/db/fresh.db --force
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from contextlib import closing
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Order matters only for readability: SQLite resolves view bodies lazily, so the
# scripts can be applied in dependency order without stubbing missing tables.
SCHEMA_FILES = (
    "scripts/content_categories.sql",
    "scripts/content_schema.sql",
    "scripts/embedded_content_schema.sql",
    "miraverse_schema.sql",
    "scripts/entertainment_schema.sql",
)

ORGANIZATIONS_CATALOG = ROOT / "frontend" / "src" / "game-content" / "organizations" / "organizations.json"


def _apply_schema(conn: sqlite3.Connection, root: Path) -> None:
    for name in SCHEMA_FILES:
        path = root / name
        if not path.is_file():
            raise SystemExit(f"Missing schema file: {path}")
        conn.executescript(path.read_text(encoding="utf-8"))
        print(f"   applied {name}")


def _expected_organizations(root: Path) -> int:
    catalog = json.loads((root / ORGANIZATIONS_CATALOG.relative_to(ROOT)).read_text(encoding="utf-8-sig"))
    return len(catalog.get("entertainmentIndustry", []))


def bootstrap(target: Path, root: Path = ROOT, force: bool = False) -> dict:
    target = Path(target).resolve()
    if target.exists():
        if not force:
            raise SystemExit(
                f"\n  {target} already exists.\n"
                "     Pass --force to rebuild it from the tracked catalogue sources.\n"
                "     Take a checkpoint first with `npm run db:checkpoint`.\n"
            )
        for suffix in ("", "-wal", "-shm"):
            path = target.with_name(target.name + suffix)
            if path.exists():
                path.unlink()

    target.parent.mkdir(parents=True, exist_ok=True)

    sys.path.insert(0, str(root / "simulation"))
    sys.path.insert(0, str(root / "scripts"))
    import entertainment_store
    from migrate_entertainment_ecosystem import migrate_entertainment

    print(f"   rebuilding {target}")
    with closing(sqlite3.connect(target)) as conn:
        conn.execute("PRAGMA journal_mode = WAL")
        _apply_schema(conn, root)
        conn.commit()
        entertainment_store.ensure_entertainment_schema(conn)

    # Canonical organizations come from the tracked catalog; the migration opens
    # its own connection, so it runs outside the schema connection.
    organization_counts = migrate_entertainment(root=root, database=target)

    # Venues seed after organizations so VenueCapacity/rental data can merge.
    with closing(sqlite3.connect(target)) as conn:
        brands_seeded = entertainment_store.seed_canonical_venues(conn)
        integrity = conn.execute("PRAGMA integrity_check").fetchone()[0]
        violations = list(conn.execute("PRAGMA foreign_key_check"))
        organizations = conn.execute("SELECT COUNT(*) FROM EntertainmentOrganizations").fetchone()[0]
        venues = conn.execute("SELECT COUNT(*) FROM EntertainmentVenues").fetchone()[0]
        conn.commit()
        conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")

    expected = _expected_organizations(root)
    if integrity != "ok":
        raise SystemExit(f"Integrity check failed: {integrity}")
    if violations:
        raise SystemExit(f"Foreign key check failed: {violations[:5]}")
    if organizations != expected:
        raise SystemExit(f"Expected {expected} canonical organizations, wrote {organizations}")

    return {
        "database": str(target),
        "organizations": organizations,
        "venues": venues,
        "venues_seeded": brands_seeded,
        "world_records": organization_counts.get("browse_world_catalog_entertainment", 0),
        "integrity_check": integrity,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default="miraverse.db", help="target database path (default: miraverse.db)")
    parser.add_argument("--force", action="store_true", help="replace the target database if it exists")
    args = parser.parse_args()

    summary = bootstrap(ROOT / args.out, force=args.force)
    print()
    print(json.dumps(summary, indent=2))
    print("\n✅ Canonical industry database ready; population and archived content are not populated.")
    print("   data:build exports empty legacy tables too, overwriting their JSON files.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
