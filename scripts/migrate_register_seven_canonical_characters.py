"""Versioned, idempotent, transactional migration (ContentMigrations v6):
Register seven approved canonical characters, allocate their next regional MAIDs,
populate WORKNET INSTITUTIONAL_REGISTRY profiles, and record permanent archival
decisions for the six historical case subjects.
"""
from __future__ import annotations

import argparse
from contextlib import closing
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import sqlite3
import sys

ROOT = Path(__file__).resolve().parents[1]
CHAR_DIR = ROOT / "frontend/src/game-content/characters"

NEW_CHARACTERS: tuple[dict, ...] = (
    {
        "id": "char-amara-okafor",
        "name": "Amara Okafor",
        "firstName": "Amara",
        "lastName": "Okafor",
        "title": None,
        "occupation": "Intelligence Analyst",
        "homeRealm": "Orynvell",
        "regionCode": "OR",
        "folder": "amara-okafor",
        "aliases": [],
        "notes": ["Appointed to DGA Eyes Intelligence Bureau / Blackout support seat cw-dga-1."],
        "workplace": {
            "collection": "INSTITUTIONAL_REGISTRY",
            "key": "cw-dga-1",
            "origin": "frontend/src/gameplay/WorkplaceDefinitions.ts:cw-dga-1",
            "context": "INSTITUTIONAL_REGISTRY",
            "data": {
                "id": "cw-dga-1",
                "name": "Amara Okafor",
                "title": "Intelligence Analyst",
                "division": "Eyes Intelligence Bureau",
                "avatar": "AO",
                "status": "Desk",
                "specialty": "Carrier packet analysis & SIGINT threat correlation",
                "quote": "Every anomalous spike leaves a clean timing signature if you trace the full window.",
                "trust": 78,
                "competence": 88,
                "familiarity": 68,
                "cooperation": 84,
                "conflictHistory": 4,
            },
        },
    },
    {
        "id": "char-isabelle-laurent",
        "name": "Isabelle Laurent",
        "firstName": "Isabelle",
        "lastName": "Laurent",
        "title": None,
        "occupation": "Archival Research Specialist",
        "homeRealm": "Lumia",
        "regionCode": "LU",
        "folder": "isabelle-laurent",
        "aliases": [],
        "notes": ["Appointed to Public Archives Physical Restoration Lab seat cw-arc-1."],
        "workplace": {
            "collection": "INSTITUTIONAL_REGISTRY",
            "key": "cw-arc-1",
            "origin": "frontend/src/gameplay/WorkplaceDefinitions.ts:cw-arc-1",
            "context": "INSTITUTIONAL_REGISTRY",
            "data": {
                "id": "cw-arc-1",
                "name": "Isabelle Laurent",
                "title": "Archival Research Specialist",
                "division": "Physical Restoration Lab",
                "avatar": "IL",
                "status": "Desk",
                "specialty": "Degraded micro-card provenance & ink stabilization",
                "quote": "Preserve the marginalia first; the footnotes usually outlive the official summary.",
                "trust": 76,
                "competence": 86,
                "familiarity": 64,
                "cooperation": 85,
                "conflictHistory": 3,
            },
        },
    },
    {
        "id": "char-darius-mensah",
        "name": "Darius Mensah",
        "firstName": "Darius",
        "lastName": "Mensah",
        "title": None,
        "occupation": "Senior Systems Engineer",
        "homeRealm": "Kaji",
        "regionCode": "KA",
        "folder": "darius-mensah",
        "aliases": [],
        "notes": ["Appointed Systems Engineering Directorate supervisor seat sup-engineer."],
        "workplace": {
            "collection": "INSTITUTIONAL_REGISTRY",
            "key": "sup-engineer",
            "origin": "frontend/src/gameplay/WorkplaceDefinitions.ts:sup-engineer",
            "context": "INSTITUTIONAL_REGISTRY",
            "data": {
                "id": "sup-engineer",
                "name": "Darius Mensah",
                "title": "Senior Systems Engineer",
                "department": "Systems Engineering Directorate",
                "avatar": "DM",
                "personality": "Disciplined, hands-on, prioritizes grid fault isolation and clean lockout verification.",
                "expectations": "Log every voltage trace before energizing a junction. Zero undocumented bypasses.",
                "approvalRate": 90,
            },
        },
    },
    {
        "id": "char-mei-lin-zhao",
        "name": "Mei Lin Zhao",
        "firstName": "Mei Lin",
        "lastName": "Zhao",
        "title": None,
        "occupation": "Systems Integration Engineer",
        "homeRealm": "Brisland",
        "regionCode": "BR",
        "folder": "mei-lin-zhao",
        "aliases": [],
        "notes": ["Appointed to Firmware Architecture & Firewall Labs seat cw-eng-1."],
        "workplace": {
            "collection": "INSTITUTIONAL_REGISTRY",
            "key": "cw-eng-1",
            "origin": "frontend/src/gameplay/WorkplaceDefinitions.ts:cw-eng-1",
            "context": "INSTITUTIONAL_REGISTRY",
            "data": {
                "id": "cw-eng-1",
                "name": "Mei Lin Zhao",
                "title": "Systems Integration Engineer",
                "division": "Firmware Architecture & Firewall Labs",
                "avatar": "MZ",
                "status": "Desk",
                "specialty": "Bus telemetry integration & harmonic firewall patching",
                "quote": "Clean interfaces beat heroic debugging every shift of the week.",
                "trust": 80,
                "competence": 90,
                "familiarity": 66,
                "cooperation": 87,
                "conflictHistory": 3,
            },
        },
    },
    {
        "id": "char-samira-el-amin",
        "name": "Samira El-Amin",
        "firstName": "Samira",
        "lastName": "El-Amin",
        "title": None,
        "occupation": "Senior Diplomatic Affairs Officer",
        "homeRealm": "Marlowe",
        "regionCode": "MA",
        "folder": "samira-el-amin",
        "aliases": [],
        "notes": ["Appointed High Council Civic Administration supervisor seat sup-diplomat."],
        "workplace": {
            "collection": "INSTITUTIONAL_REGISTRY",
            "key": "sup-diplomat",
            "origin": "frontend/src/gameplay/WorkplaceDefinitions.ts:sup-diplomat",
            "context": "INSTITUTIONAL_REGISTRY",
            "data": {
                "id": "sup-diplomat",
                "name": "Samira El-Amin",
                "title": "Senior Diplomatic Affairs Officer",
                "department": "High Council Civic Administration",
                "avatar": "SE",
                "personality": "Composed, incisive, balances cross-realm protocol with pragmatic public mediation.",
                "expectations": "Verify treaty citations and preserve equitable representation across all eight realms.",
                "approvalRate": 91,
            },
        },
    },
    {
        "id": "char-mateo-rivera",
        "name": "Mateo Rivera",
        "firstName": "Mateo",
        "lastName": "Rivera",
        "title": None,
        "occupation": "Community Services Coordinator",
        "homeRealm": "Ve’Raylia",
        "regionCode": "VR",
        "folder": "mateo-rivera",
        "aliases": [],
        "notes": ["Appointed to QUESTNOTICE Civic Rapid Response Office seat cw-qn-1."],
        "workplace": {
            "collection": "INSTITUTIONAL_REGISTRY",
            "key": "cw-qn-1",
            "origin": "frontend/src/gameplay/WorkplaceDefinitions.ts:cw-qn-1",
            "context": "INSTITUTIONAL_REGISTRY",
            "data": {
                "id": "cw-qn-1",
                "name": "Mateo Rivera",
                "title": "Community Services Coordinator",
                "division": "Civic Rapid Response Office",
                "avatar": "MR",
                "status": "Desk",
                "specialty": "Neighborhood dispatch, lost-item routing & civic service coordination",
                "quote": "Small favors keep a district connected—no notice on the board is too minor.",
                "trust": 82,
                "competence": 84,
                "familiarity": 74,
                "cooperation": 90,
                "conflictHistory": 2,
            },
        },
    },
    {
        "id": "char-nyla-baptiste",
        "name": "Nyla Baptiste",
        "firstName": "Nyla",
        "lastName": "Baptiste",
        "title": None,
        "occupation": "Recording Artist and Songwriter",
        "homeRealm": "Marlowe",
        "regionCode": "MA",
        "folder": "nyla-baptiste",
        "aliases": ["NYLA"],
        "notes": [
            "Independent emerging recording artist and songwriter performing as NYLA (ART-NYLA).",
            "Genres: Alternative R&B, neo-soul, electronic pop.",
        ],
        "workplace": None,
    },
)

PERMANENT_ARCHIVED_CASES: tuple[tuple[str, str], ...] = (
    ("char-elara-vale", "Permanently preserved as archived historical case subject (CASE-FM-401 / pc-vale); MAID-OR-00481926 permanently retired; excluded from active population."),
    ("char-kaelen-voss", "Permanently preserved as archived historical case subject (CASE-DGA-402); excluded from active population."),
    ("char-s-mercer", "Permanently preserved as archived historical case subject (pc-mercer); excluded from active population."),
    ("char-marcus-vance-technician", "Permanently preserved as archived historical case subject (P-402 / INV-26-402); excluded from active population."),
    ("char-tyler-ross", "Permanently preserved as archived historical case subject (PAT-94102); excluded from active population."),
    ("char-unidentified-patient-pat95881", "Permanently preserved as archived historical case subject (PAT-95881); excluded from active population."),
)


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _packed(val) -> str:
    return json.dumps(val, ensure_ascii=False, separators=(",", ":"))


def _write_json(path: Path, value) -> bytes:
    path.parent.mkdir(parents=True, exist_ok=True)
    raw = (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    path.write_bytes(raw)
    return raw


def _allocate_next_maid(conn: sqlite3.Connection, region_code: str) -> tuple[str, int]:
    candidate = int(
        conn.execute("SELECT COALESCE(MAX(NextSerial), 481929) FROM MaidSequences").fetchone()[0]
    )
    retired = {int(r[0]) for r in conn.execute("SELECT SerialNumber FROM MaidRetiredSerials").fetchall()}
    used = {int(r[0]) for r in conn.execute("SELECT SerialNumber FROM MaidRegistry").fetchall()}

    while True:
        if candidate in retired or candidate in used:
            candidate += 1
            continue
        maid = f"MAID-{region_code}-{candidate:08d}"
        clash = conn.execute(
            """
            SELECT 1 FROM Characters WHERE UPPER(TRIM(Maid)) = ?
            UNION ALL
            SELECT 1 FROM MaidRegistry WHERE UPPER(TRIM(Maid)) = ?
            LIMIT 1
            """,
            (maid, maid),
        ).fetchone()
        if clash is None:
            return maid, candidate
        candidate += 1


def apply_migration(db_path: Path, root: Path = ROOT, check_only: bool = False) -> dict:
    if check_only:
        with closing(sqlite3.connect(f"file:{db_path.resolve().as_posix()}?mode=ro", uri=True)) as conn:
            conn.row_factory = sqlite3.Row
            integrity = [r[0] for r in conn.execute("PRAGMA integrity_check").fetchall()]
            fks = [dict(r) for r in conn.execute("PRAGMA foreign_key_check").fetchall()]
            breakdown = [
                dict(r)
                for r in conn.execute(
                    "SELECT Kind, Status, COUNT(*) AS Cnt FROM Characters GROUP BY Kind, Status ORDER BY Kind, Status"
                ).fetchall()
            ]
            dup_maids = conn.execute(
                """
                SELECT UPPER(TRIM(Maid)) AS M, COUNT(*) AS C
                FROM Characters
                WHERE Maid IS NOT NULL AND TRIM(Maid) != ''
                GROUP BY M HAVING C > 1
                """
            ).fetchall()
            new_rows = [
                dict(r)
                for r in conn.execute(
                    """
                    SELECT CharacterId, Name, FirstName, LastName, Occupation, HomeRealm, Maid, Kind, Status
                    FROM Characters
                    WHERE CharacterId IN ({})
                    ORDER BY Maid
                    """.format(",".join("?" for _ in NEW_CHARACTERS)),
                    tuple(c["id"] for c in NEW_CHARACTERS),
                ).fetchall()
            ]
            return {
                "mode": "check",
                "integrity": integrity,
                "foreignKeyIssues": len(fks),
                "duplicateMaids": len(dup_maids),
                "totalCharacters": conn.execute("SELECT COUNT(*) FROM Characters").fetchone()[0],
                "characterBreakdown": breakdown,
                "maidRegistryCount": conn.execute("SELECT COUNT(*) FROM MaidRegistry").fetchone()[0],
                "maidSequences": dict(conn.execute("SELECT RegionCode, NextSerial FROM MaidSequences ORDER BY RegionCode").fetchall()),
                "registeredNewCharacters": new_rows,
                "migrations": [dict(r) for r in conn.execute("SELECT * FROM ContentMigrations ORDER BY Version").fetchall()],
            }

    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    char_dir = root / "frontend/src/game-content/characters"

    with closing(sqlite3.connect(str(db_path), timeout=20)) as conn:
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("BEGIN IMMEDIATE")
        try:
            max_order = int(
                conn.execute("SELECT COALESCE(MAX(CollectionOrder), 0) FROM CharacterProfiles").fetchone()[0]
            )

            for spec in NEW_CHARACTERS:
                cid = spec["id"]
                folder = spec["folder"]
                existing = conn.execute(
                    "SELECT CharacterId, Maid FROM Characters WHERE CharacterId = ?", (cid,)
                ).fetchone()

                if existing and existing["Maid"]:
                    maid = existing["Maid"].strip().upper()
                    serial_num = int(maid.split("-")[-1])
                else:
                    maid, serial_num = _allocate_next_maid(conn, spec["regionCode"])

                references = []
                workplace_spec = spec["workplace"]
                workplace_rel = f"frontend/src/game-content/characters/people/{folder}/workplace.json"
                workplace_bytes = None
                workplace_payload = None
                if workplace_spec is not None:
                    references.append(
                        {
                            "collection": workplace_spec["collection"],
                            "key": workplace_spec["key"],
                            "file": f"people/{folder}/workplace.json",
                        }
                    )
                    workplace_entry = {
                        "collection": workplace_spec["collection"],
                        "key": workplace_spec["key"],
                        "origin": workplace_spec["origin"],
                        "context": workplace_spec["context"],
                        "data": workplace_spec["data"],
                        "original": workplace_spec["data"],
                    }
                    workplace_payload = [workplace_entry]
                    workplace_bytes = _write_json(char_dir / "people" / folder / "workplace.json", workplace_payload)

                char_json_obj = {
                    "id": cid,
                    "name": spec["name"],
                    "kind": "person",
                    "aliases": list(spec["aliases"]),
                    "status": "existing",
                    "notes": list(spec["notes"]),
                    "legacyIds": [],
                    "references": references,
                    "maid": maid,
                    "legacyMaids": [],
                    "folder": folder,
                    "firstName": spec["firstName"],
                    "lastName": spec["lastName"],
                    "title": spec["title"],
                    "occupation": spec["occupation"],
                    "homeRealm": spec["homeRealm"],
                }
                char_rel = f"frontend/src/game-content/characters/people/{folder}/character.json"
                char_bytes = _write_json(char_dir / "people" / folder / "character.json", char_json_obj)

                readme_lines = [
                    f"# {spec['name']}",
                    "",
                    f"- Canonical ID: `{cid}`",
                    f"- MAID: `{maid}`",
                    f"- Occupation: {spec['occupation']}",
                    f"- Home Realm: {spec['homeRealm']}",
                    "",
                    "Files:",
                    "- `character.json`",
                ]
                if workplace_spec is not None:
                    readme_lines.append("- `workplace.json`")
                (char_dir / "people" / folder / "README.md").write_text(
                    "\n".join(readme_lines) + "\n", encoding="utf-8"
                )

                # Upsert ContentSources for character.json
                conn.execute(
                    """
                    INSERT INTO ContentSources (Path, Category, Sha256, ContentJson)
                    VALUES (?, 'character-identity', ?, ?)
                    ON CONFLICT(Path) DO UPDATE SET Sha256=excluded.Sha256, ContentJson=excluded.ContentJson
                    """,
                    (char_rel, _sha256_bytes(char_bytes), _packed(char_json_obj)),
                )

                if existing is None:
                    conn.execute(
                        """
                        INSERT INTO Characters (
                            CharacterId, Name, Kind, Status, Folder, Maid, NotesJson, SourcePath,
                            FirstName, LastName, Title, Occupation, HomeRealm
                        ) VALUES (?, ?, 'person', 'existing', ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            cid,
                            spec["name"],
                            folder,
                            maid,
                            _packed(spec["notes"]),
                            char_rel,
                            spec["firstName"],
                            spec["lastName"],
                            spec["title"],
                            spec["occupation"],
                            spec["homeRealm"],
                        ),
                    )
                else:
                    conn.execute(
                        """
                        UPDATE Characters
                        SET Name=?, FirstName=?, LastName=?, Title=?, Occupation=?, HomeRealm=?, Maid=?, NotesJson=?, SourcePath=?
                        WHERE CharacterId=?
                        """,
                        (
                            spec["name"],
                            spec["firstName"],
                            spec["lastName"],
                            spec["title"],
                            spec["occupation"],
                            spec["homeRealm"],
                            maid,
                            _packed(spec["notes"]),
                            char_rel,
                            cid,
                        ),
                    )

                # Aliases
                for pos, alias in enumerate(spec["aliases"]):
                    conn.execute(
                        "INSERT OR IGNORE INTO CharacterAliases (CharacterId, Alias, Position) VALUES (?, ?, ?)",
                        (cid, alias, pos),
                    )

                # MaidRegistry & MaidSequences
                conn.execute(
                    """
                    INSERT OR IGNORE INTO MaidRegistry (Maid, RegionCode, SerialNumber, CharacterId, Status, IssuedAt, Notes)
                    VALUES (?, ?, ?, ?, 'active', ?, ?)
                    """,
                    (maid, spec["regionCode"], serial_num, cid, now_iso, f"Canonical registration: {spec['name']}"),
                )
                conn.execute(
                    "UPDATE MaidRegistry SET CharacterId=?, Status='active' WHERE UPPER(TRIM(Maid))=?",
                    (cid, maid),
                )
                conn.execute(
                    "UPDATE MaidSequences SET NextSerial = MAX(NextSerial, ?), UpdatedAt = ?",
                    (serial_num + 1, now_iso),
                )

                # Workplace profile in ContentSources & CharacterProfiles
                if workplace_spec is not None and workplace_bytes is not None and workplace_payload is not None:
                    conn.execute(
                        """
                        INSERT INTO ContentSources (Path, Category, Sha256, ContentJson)
                        VALUES (?, 'character-profiles', ?, ?)
                        ON CONFLICT(Path) DO UPDATE SET Sha256=excluded.Sha256, ContentJson=excluded.ContentJson
                        """,
                        (workplace_rel, _sha256_bytes(workplace_bytes), _packed(workplace_payload)),
                    )
                    existing_prof = conn.execute(
                        "SELECT CollectionOrder FROM CharacterProfiles WHERE Collection=? AND RecordKey=?",
                        (workplace_spec["collection"], workplace_spec["key"]),
                    ).fetchone()
                    if existing_prof is None:
                        max_order += 1
                        conn.execute(
                            """
                            INSERT INTO CharacterProfiles (
                                Collection, RecordKey, CharacterId, Context, Origin,
                                SourcePath, SourceIndex, CollectionOrder, DataJson, OriginalJson
                            ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
                            """,
                            (
                                workplace_spec["collection"],
                                workplace_spec["key"],
                                cid,
                                workplace_spec["context"],
                                workplace_spec["origin"],
                                workplace_rel,
                                max_order,
                                _packed(workplace_spec["data"]),
                                _packed(workplace_spec["data"]),
                            ),
                        )
                    else:
                        conn.execute(
                            """
                            UPDATE CharacterProfiles
                            SET CharacterId=?, Context=?, Origin=?, SourcePath=?, DataJson=?, OriginalJson=?
                            WHERE Collection=? AND RecordKey=?
                            """,
                            (
                                cid,
                                workplace_spec["context"],
                                workplace_spec["origin"],
                                workplace_rel,
                                _packed(workplace_spec["data"]),
                                _packed(workplace_spec["data"]),
                                workplace_spec["collection"],
                                workplace_spec["key"],
                            ),
                        )

            # Finalize permanent archival notes for the 6 approved historical case subjects
            for retired_cid, ctx in PERMANENT_ARCHIVED_CASES:
                conn.execute(
                    "UPDATE RetiredCharacters SET HistoricalContext = ? WHERE CharacterId = ?",
                    (ctx, retired_cid),
                )

            conn.execute(
                """
                INSERT OR REPLACE INTO ContentMigrations (Version, Description)
                VALUES (6, 'Register seven approved canonical characters (Amara Okafor, Isabelle Laurent, Darius Mensah, Mei Lin Zhao, Samira El-Amin, Mateo Rivera, Nyla Baptiste), allocate regional MAIDs 00481975-00481981, complete six WORKNET appointments, and finalize historical case archival status')
                """
            )

            integrity = [r[0] for r in conn.execute("PRAGMA integrity_check").fetchall()]
            fks = conn.execute("PRAGMA foreign_key_check").fetchall()
            if integrity != ["ok"]:
                raise RuntimeError(f"Integrity check failed: {integrity}")
            if fks:
                raise RuntimeError(f"Foreign key violations: {[dict(r) for r in fks]}")
            total_chars = conn.execute("SELECT COUNT(*) FROM Characters").fetchone()[0]
            if total_chars != 62:
                raise RuntimeError(f"Expected 62 canonical characters, found {total_chars}")

            conn.commit()
        except Exception:
            conn.rollback()
            raise

    return apply_migration(db_path, root=root, check_only=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path, default=ROOT / "miraverse.db")
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    result = apply_migration(args.database.resolve(), root=args.root.resolve(), check_only=args.check)
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
