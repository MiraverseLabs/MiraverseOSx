"""Idempotent migration registering Section XIX entertainment organizations, venues, and brand kits in miraverse.db."""
from __future__ import annotations

import hashlib
import json
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = ROOT / "miraverse.db"


def _packed(value) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def _digest(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def migrate_entertainment(root: Path = ROOT, database: Path = DEFAULT_DB) -> dict:
    orgs_rel = "frontend/src/game-content/organizations/organizations.json"
    places_rel = "frontend/src/game-content/places/places.json"
    brands_rel = "frontend/src/game-content/media-assets/brand-kits.json"
    missions_rel = "frontend/src/data/missions.json"

    orgs_bytes = (root / orgs_rel).read_bytes()
    places_bytes = (root / places_rel).read_bytes()
    brands_bytes = (root / brands_rel).read_bytes()
    missions_bytes = (root / missions_rel).read_bytes()

    orgs_json = json.loads(orgs_bytes.decode("utf-8-sig"))
    places_json = json.loads(places_bytes.decode("utf-8-sig"))
    brands_json = json.loads(brands_bytes.decode("utf-8-sig"))
    missions_json = json.loads(missions_bytes.decode("utf-8-sig"))

    ent_orgs = orgs_json.get("entertainmentIndustry", [])
    if len(ent_orgs) < 19:
        raise ValueError(f"Expected at least 19 Section XIX organizations, found {len(ent_orgs)}")

    now = datetime.now(timezone.utc).isoformat(timespec="seconds")

    with closing(sqlite3.connect(database, timeout=30)) as db:
        db.execute("PRAGMA foreign_keys = ON")
        db.execute("BEGIN IMMEDIATE")

        db.execute(
            """
            CREATE TABLE IF NOT EXISTS EntertainmentOrganizations (
                OrganizationId TEXT PRIMARY KEY,
                Name TEXT NOT NULL UNIQUE,
                ShortName TEXT NOT NULL,
                Sector TEXT NOT NULL,
                Kind TEXT NOT NULL,
                Domain TEXT NOT NULL UNIQUE,
                Handle TEXT NOT NULL,
                Realm TEXT NOT NULL,
                Seat TEXT NOT NULL,
                Tagline TEXT NOT NULL,
                CommissionRate REAL,
                RoyaltySplitArtist REAL,
                VenueCapacity INTEGER,
                MinRecognitionRequired REAL,
                RentalCostCredits REAL,
                DataJson TEXT NOT NULL CHECK(json_valid(DataJson)),
                UpdatedAt TEXT NOT NULL
            )
            """
        )

        db.execute(
            """
            INSERT OR IGNORE INTO WorldCategoryMappings (Domain, Section, CategoryId, RecordType)
            VALUES ('organizations', 'entertainmentIndustry', 'organizations', 'Entertainment organization')
            """
        )

        # Upsert ContentSources for updated catalog files
        for rel, category, raw_bytes, parsed in (
            (orgs_rel, "organizations", orgs_bytes, orgs_json),
            (places_rel, "places", places_bytes, places_json),
            (brands_rel, "media", brands_bytes, brands_json),
            (missions_rel, "careers", missions_bytes, missions_json),
        ):
            db.execute(
                """
                INSERT INTO ContentSources (Path, Category, Sha256, ContentJson)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(Path) DO UPDATE SET
                    Category = excluded.Category,
                    Sha256 = excluded.Sha256,
                    ContentJson = excluded.ContentJson
                """,
                (rel, category, _digest(raw_bytes), _packed(parsed)),
            )

        # Sync WorldRecords for entertainmentIndustry, venues, and brandKits
        for idx, org in enumerate(ent_orgs):
            db.execute(
                """
                INSERT INTO WorldRecords (SourcePath, Section, RecordKey, Position, Domain, Name, Description, DataJson)
                VALUES (?, 'entertainmentIndustry', ?, ?, 'organizations', ?, ?, ?)
                ON CONFLICT(SourcePath, Section, RecordKey) DO UPDATE SET
                    Position = excluded.Position,
                    Name = excluded.Name,
                    Description = excluded.Description,
                    DataJson = excluded.DataJson
                """,
                (orgs_rel, org["id"], idx, org["name"], org.get("description"), _packed(org)),
            )
            db.execute(
                """
                INSERT INTO EntertainmentOrganizations (
                    OrganizationId, Name, ShortName, Sector, Kind, Domain, Handle, Realm, Seat, Tagline,
                    CommissionRate, RoyaltySplitArtist, VenueCapacity, MinRecognitionRequired, RentalCostCredits,
                    DataJson, UpdatedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(OrganizationId) DO UPDATE SET
                    Name = excluded.Name,
                    ShortName = excluded.ShortName,
                    Sector = excluded.Sector,
                    Kind = excluded.Kind,
                    Domain = excluded.Domain,
                    Handle = excluded.Handle,
                    Realm = excluded.Realm,
                    Seat = excluded.Seat,
                    Tagline = excluded.Tagline,
                    CommissionRate = excluded.CommissionRate,
                    RoyaltySplitArtist = excluded.RoyaltySplitArtist,
                    VenueCapacity = excluded.VenueCapacity,
                    MinRecognitionRequired = excluded.MinRecognitionRequired,
                    RentalCostCredits = excluded.RentalCostCredits,
                    DataJson = excluded.DataJson,
                    UpdatedAt = excluded.UpdatedAt
                """,
                (
                    org["id"],
                    org["name"],
                    org.get("shortName", org["name"]),
                    org["sector"],
                    org["kind"],
                    org["domain"],
                    org.get("handle", ""),
                    org["realm"],
                    org["seat"],
                    org.get("tagline", ""),
                    org.get("commissionRate"),
                    org.get("royaltySplitArtist"),
                    org.get("venueCapacity"),
                    org.get("minRecognitionRequired"),
                    org.get("rentalCostCredits"),
                    _packed(org),
                    now,
                ),
            )

        for idx, venue in enumerate(places_json.get("venues", [])):
            db.execute(
                """
                INSERT INTO WorldRecords (SourcePath, Section, RecordKey, Position, Domain, Name, Description, DataJson)
                VALUES (?, 'venues', ?, ?, 'places', ?, ?, ?)
                ON CONFLICT(SourcePath, Section, RecordKey) DO UPDATE SET
                    Position = excluded.Position,
                    Name = excluded.Name,
                    Description = excluded.Description,
                    DataJson = excluded.DataJson
                """,
                (places_rel, venue["id"], idx, venue["name"], venue.get("description"), _packed(venue)),
            )

        for idx, (kit_key, kit) in enumerate(brands_json.get("brandKits", {}).items()):
            db.execute(
                """
                INSERT INTO WorldRecords (SourcePath, Section, RecordKey, Position, Domain, Name, Description, DataJson)
                VALUES (?, 'brandKits', ?, ?, 'media', ?, ?, ?)
                ON CONFLICT(SourcePath, Section, RecordKey) DO UPDATE SET
                    Position = excluded.Position,
                    Name = excluded.Name,
                    Description = excluded.Description,
                    DataJson = excluded.DataJson
                """,
                (brands_rel, kit_key, idx, kit.get("name", kit_key), kit.get("organizationId"), _packed(kit)),
            )

        for idx, mission in enumerate(missions_json):
            db.execute(
                """
                INSERT INTO WorldRecords (SourcePath, Section, RecordKey, Position, Domain, Name, Description, DataJson)
                VALUES (?, 'root', ?, ?, 'careers', ?, ?, ?)
                ON CONFLICT(SourcePath, Section, RecordKey) DO UPDATE SET
                    Position = excluded.Position,
                    Name = excluded.Name,
                    Description = excluded.Description,
                    DataJson = excluded.DataJson
                """,
                (missions_rel, mission["id"], idx, mission.get("title"), mission.get("description"), _packed(mission)),
            )

        db.execute(
            """
            INSERT OR REPLACE INTO ContentMigrations (Version, Description)
            VALUES (3, 'Section XIX entertainment organizations, venues, brand kits, and WORKNET commissions')
            """
        )

        if db.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise RuntimeError("SQLite integrity check failed after entertainment migration")
        if list(db.execute("PRAGMA foreign_key_check")):
            raise RuntimeError("SQLite foreign key check failed after entertainment migration")

        org_count = db.execute("SELECT COUNT(*) FROM EntertainmentOrganizations").fetchone()[0]
        world_ent_count = db.execute(
            "SELECT COUNT(*) FROM BrowseWorldCatalog WHERE Section = 'entertainmentIndustry'"
        ).fetchone()[0]
        db.commit()
        db.execute("PRAGMA wal_checkpoint(PASSIVE)")

    return {
        "entertainment_organizations": org_count,
        "browse_world_catalog_entertainment": world_ent_count,
        "venues_total": len(places_json.get("venues", [])),
        "brand_kits_total": len(brands_json.get("brandKits", {})),
    }


if __name__ == "__main__":
    print(json.dumps(migrate_entertainment(), indent=2))
