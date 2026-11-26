"""Non-destructive, versioned SQLite reconciliation migration (ContentMigrations v5).

Preserves all existing canonical Characters (55), Careers (9), EntertainmentOrganizations (25),
CharacterProfiles (91), LivingWorldRuns (47), LivingWorldTransactions (241), and UniqueCharacterMAID.

Adds:
- RetiredCharacters exclusion registry (prevents stale JSON imports from recreating deleted characters)
- MaidRegistry, MaidRetiredSerials (00481926, 00481927, 00481928), and MaidSequences across 8 realms
- Updated BrowseCharacters view exposing FirstName, LastName, Title, Occupation, HomeRealm
- Reconciled Careers (preserves 9 + adds career-press) and CareerProgression metadata table
- Reconciled Missions + MissionCatalogMeta from authored missions.json & broad-street-assignment.json
"""
from __future__ import annotations

import argparse
from contextlib import closing
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import sqlite3
import sys

ROOT = Path(__file__).resolve().parents[1]
MAID_PATTERN = re.compile(r"^MAID-(OR|FR|LU|MA|BR|KA|NE|VR)-(\d{8})$")
VALID_REGIONS = ("OR", "FR", "LU", "MA", "BR", "KA", "NE", "VR")

RETIRED_SERIALS: tuple[tuple[int, str, str], ...] = (
    (481926, "MAID-OR-00481926", "Retired canonical serial (former Elara Vale slot) — permanently reserved."),
    (481927, "MAID-OR-00481927", "Retired canonical serial (former Dr. Julian Paul Vance slot) — permanently reserved."),
    (481928, "MAID-OR-00481928", "Retired canonical serial — permanently reserved."),
)

RETIRED_CHARACTERS: tuple[tuple[str, str, str, str, str], ...] = (
    ("char-elara-vale", "Elara Vale", "elara-vale", "Removed during canonical 55-character roster cleanup", "Historical DGA/Faith Medical case reference; MAID-OR-00481926 retired."),
    ("char-felix-ward", "Felix Ward", "felix-ward", "Removed during canonical 55-character roster cleanup", "Legacy WORKNET INSTITUTIONAL_REGISTRY fixture."),
    ("char-julian-paul-vance", "Dr. Julian Paul Vance", "julian-paul-vance", "Removed during canonical 55-character roster cleanup", "Historical DGA/Registry reference; MAID-OR-00481927 retired."),
    ("char-kaelen", "Kaelen", "kaelen", "Removed during canonical 55-character roster cleanup", "Legacy persona / AI memory seed."),
    ("char-kaelen-vance", "Kaelen Vance", "kaelen-vance", "Removed during canonical 55-character roster cleanup", "Legacy WORKNET INSTITUTIONAL_REGISTRY fixture."),
    ("char-kaelen-voss", "Kaelen Voss", "kaelen-voss", "Removed during canonical 55-character roster cleanup", "Historical FORMAL_INVESTIGATION_CASES subject."),
    ("char-lyric-enya", "Lyric Enya", "lyric-enya", "Removed during canonical 55-character roster cleanup", "Legacy story-bible / entertainment demo seed."),
    ("char-mara-thorne", "Mara Thorne", "mara-thorne", "Removed during canonical 55-character roster cleanup", "Legacy PEOPLE / VerseNet portal fixture."),
    ("char-marcus-vance", "Courier Marcus Vance (No Relation)", "marcus-vance-courier", "Removed during canonical 55-character roster cleanup", "Legacy DGA seedPeople/seedRelationships courier subject."),
    ("char-marcus-vance-technician", "Marcus Vance", "marcus-vance-technician", "Removed during canonical 55-character roster cleanup", "Historical INV_26_402_STARTING_PAYLOAD case subject."),
    ("char-maren-holt", "Maren Holt", "maren-holt", "Removed during canonical 55-character roster cleanup", "Legacy WORKNET INSTITUTIONAL_REGISTRY fixture."),
    ("char-nadia-cruz", "Nadia Cruz", "nadia-cruz", "Removed during canonical 55-character roster cleanup", "Legacy WORKNET INSTITUTIONAL_REGISTRY fixture."),
    ("char-neryx", "Lord Neryx", "neryx", "Removed during canonical 55-character roster cleanup", "Legacy NPCS entry; royal lineage FAC_NERYX remains in organizations."),
    ("char-null-cantor", "Null Cantor", "null-cantor", "Removed during canonical 55-character roster cleanup", "Legacy phone-contact entry."),
    ("char-s-mercer", "Student S. Mercer (Vertex House)", "s-mercer", "Removed during canonical 55-character roster cleanup", "Historical Faith Medical PATIENT_CARE_ASSIGNMENTS / shift subject."),
    ("char-thalia-vane", "Thalia Vane", "thalia-vane", "Removed during canonical 55-character roster cleanup", "Legacy WORKNET INSTITUTIONAL_REGISTRY fixture."),
    ("char-tyler-ross", "Officer Tyler Ross", "tyler-ross", "Removed during canonical 55-character roster cleanup", "Historical MOTORCYCLE_CRASH_MEDICAL_CHART subject."),
    ("char-unidentified-patient-pat95881", "Jane Doe (Unidentified Subject)", "unidentified-patient-pat95881", "Removed during canonical 55-character roster cleanup", "Historical OVERDOSE_TOXICOLOGY_MEDICAL_CHART subject (PAT-95881)."),
    ("char-vaelen", "Vaelen", "vaelen", "Removed during canonical 55-character roster cleanup", "Legacy persona / AI memory seed."),
    ("char-vance-lowe", "Vance Lowe", "vance-lowe", "Removed during canonical 55-character roster cleanup", "Legacy WORKNET INSTITUTIONAL_REGISTRY fixture."),
)

FRONTEND_TO_DB_CAREER_ID: dict[str, str] = {
    "archivist": "career-archivist",
    "engineer": "career-systems-engineer",
    "diplomat": "career-diplomat",
    "dga": "career-enforcer",
    "artist": "career-artist",
    "medical": "career-healer",
    "warden": "career-ecological-warden",
    "finance": "career-finance",
    "questnotice": "career-odd-jobs",
    "press": "career-press",
}

WORKNET_TYPE_TO_ACTIVITY_SCOPE: dict[str, str] = {
    "Work Shifts": "shift",
    "Special Assignments": "investigation",
    "Career Development": "certification",
    "Field Operations": "field_operation",
    "QUESTNOTICE": "gig",
}

SEVERITY_TO_DIFFICULTY: dict[str, str] = {
    "Routine": "Novice",
    "Elevated": "Adept",
    "Critical": "Master",
}

WORKNET_TYPE_TO_TIER: dict[str, str] = {
    "Work Shifts": "Task",
    "Special Assignments": "Mission",
    "Career Development": "Quest",
    "Field Operations": "Mission",
    "QUESTNOTICE": "Task",
}

SCHEMA_V5_STATEMENTS: tuple[str, ...] = (
    """
    CREATE TABLE IF NOT EXISTS RetiredCharacters (
        CharacterId TEXT PRIMARY KEY,
        Name TEXT NOT NULL,
        Folder TEXT,
        Reason TEXT NOT NULL,
        HistoricalContext TEXT,
        RetiredAt TEXT NOT NULL DEFAULT (datetime('now'))
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS MaidRegistry (
        Maid TEXT PRIMARY KEY,
        RegionCode TEXT NOT NULL CHECK(RegionCode IN ('OR','FR','LU','MA','BR','KA','NE','VR')),
        SerialNumber INTEGER NOT NULL,
        CharacterId TEXT REFERENCES Characters(CharacterId) ON DELETE SET NULL,
        Status TEXT NOT NULL CHECK(Status IN ('active','retired','reserved')),
        IssuedAt TEXT NOT NULL DEFAULT (datetime('now')),
        RetiredAt TEXT,
        Notes TEXT
    )
    """,
    """
    CREATE UNIQUE INDEX IF NOT EXISTS UX_MaidRegistry_Normalized
        ON MaidRegistry(UPPER(TRIM(Maid)))
    """,
    """
    CREATE INDEX IF NOT EXISTS IX_MaidRegistry_RegionSerial
        ON MaidRegistry(RegionCode, SerialNumber)
    """,
    """
    CREATE INDEX IF NOT EXISTS IX_MaidRegistry_Character
        ON MaidRegistry(CharacterId) WHERE CharacterId IS NOT NULL
    """,
    """
    CREATE TABLE IF NOT EXISTS MaidRetiredSerials (
        SerialNumber INTEGER PRIMARY KEY,
        Maid TEXT,
        Reason TEXT NOT NULL,
        RetiredAt TEXT NOT NULL DEFAULT (datetime('now'))
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS MaidSequences (
        RegionCode TEXT PRIMARY KEY CHECK(RegionCode IN ('OR','FR','LU','MA','BR','KA','NE','VR')),
        NextSerial INTEGER NOT NULL CHECK(NextSerial >= 1),
        UpdatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS CareerProgression (
        CareerId TEXT PRIMARY KEY REFERENCES Careers(id) ON DELETE CASCADE,
        FrontendId TEXT NOT NULL UNIQUE,
        Category TEXT NOT NULL,
        StationId TEXT NOT NULL,
        BaseSalaryCredits INTEGER NOT NULL DEFAULT 150,
        ReputationKey TEXT NOT NULL,
        PrimaryAttribute TEXT,
        SpecialistLabel TEXT,
        SupervisoryLabel TEXT,
        Requirements TEXT,
        GameplayConnections TEXT,
        PrimaryWorkplacesJson TEXT NOT NULL CHECK(json_valid(PrimaryWorkplacesJson)),
        DutiesJson TEXT NOT NULL CHECK(json_valid(DutiesJson)),
        TierTitlesJson TEXT NOT NULL CHECK(json_valid(TierTitlesJson)),
        RelevantSkillsJson TEXT NOT NULL CHECK(json_valid(RelevantSkillsJson)),
        XpThresholdsJson TEXT NOT NULL CHECK(json_valid(XpThresholdsJson)),
        QualificationMissionIdsJson TEXT NOT NULL CHECK(json_valid(QualificationMissionIdsJson)),
        UpdatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS MissionCatalogMeta (
        MissionId TEXT PRIMARY KEY REFERENCES Missions(id) ON DELETE CASCADE,
        CareerId TEXT REFERENCES Careers(id) ON DELETE SET NULL,
        FrontendTrack TEXT NOT NULL,
        WorknetCategory TEXT NOT NULL,
        ActivityScope TEXT NOT NULL,
        Department TEXT NOT NULL,
        Location TEXT NOT NULL,
        Workplace TEXT NOT NULL,
        Severity TEXT NOT NULL,
        TargetSubject TEXT,
        ThreatOrSymptom TEXT,
        RequiredAction TEXT,
        RewardBits INTEGER NOT NULL DEFAULT 0,
        PrimaryAttribute TEXT,
        PermittedToolsJson TEXT NOT NULL CHECK(json_valid(PermittedToolsJson)),
        PrerequisitesJson TEXT NOT NULL CHECK(json_valid(PrerequisitesJson)),
        EvidenceRequirementsJson TEXT NOT NULL CHECK(json_valid(EvidenceRequirementsJson)),
        SourcePath TEXT NOT NULL,
        DataJson TEXT NOT NULL CHECK(json_valid(DataJson)),
        UpdatedAt TEXT NOT NULL DEFAULT (datetime('now'))
    )
    """,
    "DROP VIEW IF EXISTS BrowseCharacters",
    """
    CREATE VIEW BrowseCharacters AS
    SELECT c.CharacterId, c.Name, c.FirstName, c.LastName, c.Title,
           c.Occupation, c.HomeRealm, c.Kind, c.Status, c.Maid, c.Folder,
           (SELECT group_concat(Alias, '; ') FROM CharacterAliases a
            WHERE a.CharacterId=c.CharacterId) AS Aliases,
           (SELECT count(*) FROM CharacterProfiles p
            WHERE p.CharacterId=c.CharacterId) AS ProfileCount,
           c.NotesJson
    FROM Characters c
    """,
)


def _ensure_character_columns(conn: sqlite3.Connection) -> None:
    cols = {row[1] for row in conn.execute("PRAGMA table_info(Characters)").fetchall()}
    for col in ("FirstName", "LastName", "Title", "Occupation", "HomeRealm"):
        if col not in cols:
            conn.execute(f'ALTER TABLE Characters ADD COLUMN "{col}" TEXT')
    conn.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS UniqueCharacterMAID
        ON Characters (UPPER(TRIM(Maid)))
        WHERE Maid IS NOT NULL
        AND TRIM(Maid) != ''
        """
    )


def _load_authored_careers(root: Path) -> list[dict]:
    path = root / "frontend/src/data/careers.json"
    return json.loads(path.read_text(encoding="utf-8-sig"))


def _load_authored_missions(root: Path) -> list[tuple[str, dict]]:
    missions_path = root / "frontend/src/data/missions.json"
    broad_path = root / "frontend/src/data/broad-street-assignment.json"
    items: list[tuple[str, dict]] = []
    for m in json.loads(missions_path.read_text(encoding="utf-8-sig")):
        items.append(("frontend/src/data/missions.json", m))
    items.append(("frontend/src/data/broad-street-assignment.json", json.loads(broad_path.read_text(encoding="utf-8-sig"))))
    return items


def apply_migration(db_path: Path, root: Path = ROOT, check_only: bool = False) -> dict:
    if check_only:
        conn = sqlite3.connect(f"file:{db_path.resolve().as_posix()}?mode=ro", uri=True)
        conn.row_factory = sqlite3.Row
        try:
            integrity = [r[0] for r in conn.execute("PRAGMA integrity_check").fetchall()]
            fks = [dict(r) for r in conn.execute("PRAGMA foreign_key_check").fetchall()]
            return {
                "mode": "check",
                "integrity": integrity,
                "foreignKeyIssues": len(fks),
                "characters": conn.execute("SELECT COUNT(*) FROM Characters").fetchone()[0],
                "retiredCharacters": conn.execute("SELECT COUNT(*) FROM RetiredCharacters").fetchone()[0],
                "maidRegistry": conn.execute("SELECT COUNT(*) FROM MaidRegistry").fetchone()[0],
                "maidRetiredSerials": conn.execute("SELECT COUNT(*) FROM MaidRetiredSerials").fetchone()[0],
                "careers": conn.execute("SELECT COUNT(*) FROM Careers").fetchone()[0],
                "careerProgression": conn.execute("SELECT COUNT(*) FROM CareerProgression").fetchone()[0],
                "missions": conn.execute("SELECT COUNT(*) FROM Missions").fetchone()[0],
                "missionCatalogMeta": conn.execute("SELECT COUNT(*) FROM MissionCatalogMeta").fetchone()[0],
                "entertainmentOrganizations": conn.execute("SELECT COUNT(*) FROM EntertainmentOrganizations").fetchone()[0],
                "browseCharactersColumns": [r[1] for r in conn.execute("PRAGMA table_info(BrowseCharacters)").fetchall()],
                "migrations": [dict(r) for r in conn.execute("SELECT * FROM ContentMigrations ORDER BY Version").fetchall()],
            }
        finally:
            conn.close()

    careers_data = _load_authored_careers(root)
    missions_data = _load_authored_missions(root)
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    with closing(sqlite3.connect(str(db_path), timeout=20)) as conn:
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        conn.execute("BEGIN IMMEDIATE")
        try:
            _ensure_character_columns(conn)
            for stmt in SCHEMA_V5_STATEMENTS:
                conn.execute(stmt)

            # 1. Populate RetiredCharacters (skip any ID currently active in Characters)
            active_ids = {r[0] for r in conn.execute("SELECT CharacterId FROM Characters").fetchall()}
            for cid, name, folder, reason, ctx in RETIRED_CHARACTERS:
                if cid in active_ids:
                    raise ValueError(f"Retired character {cid} is present in active Characters table!")
                conn.execute(
                    """
                    INSERT OR IGNORE INTO RetiredCharacters
                        (CharacterId, Name, Folder, Reason, HistoricalContext, RetiredAt)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (cid, name, folder, reason, ctx, now_iso),
                )

            # 2. Populate MaidRetiredSerials & MaidRegistry retired entries
            retired_serial_nums = set()
            for serial_num, maid_str, reason in RETIRED_SERIALS:
                retired_serial_nums.add(serial_num)
                conn.execute(
                    """
                    INSERT OR IGNORE INTO MaidRetiredSerials (SerialNumber, Maid, Reason, RetiredAt)
                    VALUES (?, ?, ?, ?)
                    """,
                    (serial_num, maid_str, reason, now_iso),
                )
                m = MAID_PATTERN.match(maid_str)
                assert m is not None
                conn.execute(
                    """
                    INSERT OR IGNORE INTO MaidRegistry
                        (Maid, RegionCode, SerialNumber, CharacterId, Status, IssuedAt, RetiredAt, Notes)
                    VALUES (?, ?, ?, NULL, 'retired', ?, ?, ?)
                    """,
                    (maid_str, m.group(1), serial_num, now_iso, now_iso, reason),
                )

            # 3. Sync all 46 active MAIDs from Characters into MaidRegistry
            max_serial = max(retired_serial_nums)
            char_rows = conn.execute(
                "SELECT CharacterId, Name, Maid, HomeRealm FROM Characters WHERE Maid IS NOT NULL AND TRIM(Maid) != ''"
            ).fetchall()
            for row in char_rows:
                maid = row["Maid"].strip().upper()
                m = MAID_PATTERN.match(maid)
                if not m:
                    raise ValueError(f"Canonical character {row['CharacterId']} has invalid MAID format: {maid!r}")
                region_code = m.group(1)
                serial_num = int(m.group(2))
                if serial_num in retired_serial_nums:
                    raise ValueError(f"Canonical character {row['CharacterId']} uses retired serial {serial_num}!")
                if serial_num > max_serial:
                    max_serial = serial_num
                existing_reg = conn.execute(
                    "SELECT CharacterId, Status FROM MaidRegistry WHERE UPPER(TRIM(Maid)) = ?", (maid,)
                ).fetchone()
                if existing_reg is None:
                    conn.execute(
                        """
                        INSERT INTO MaidRegistry
                            (Maid, RegionCode, SerialNumber, CharacterId, Status, IssuedAt, Notes)
                        VALUES (?, ?, ?, ?, 'active', ?, ?)
                        """,
                        (maid, region_code, serial_num, row["CharacterId"], now_iso, f"Canonical citizen: {row['Name']}"),
                    )
                else:
                    if existing_reg["CharacterId"] and existing_reg["CharacterId"] != row["CharacterId"]:
                        raise ValueError(f"MAID {maid} conflict between {existing_reg['CharacterId']} and {row['CharacterId']}")
                    conn.execute(
                        "UPDATE MaidRegistry SET CharacterId = ?, Status = 'active' WHERE UPPER(TRIM(Maid)) = ?",
                        (row["CharacterId"], maid),
                    )

            # 4. Initialize MaidSequences for all 8 regional codes above highest used/retired serial
            next_serial = max_serial + 1
            for region in VALID_REGIONS:
                existing_seq = conn.execute(
                    "SELECT NextSerial FROM MaidSequences WHERE RegionCode = ?", (region,)
                ).fetchone()
                if existing_seq is None:
                    conn.execute(
                        "INSERT INTO MaidSequences (RegionCode, NextSerial, UpdatedAt) VALUES (?, ?, ?)",
                        (region, next_serial, now_iso),
                    )
                elif existing_seq["NextSerial"] < next_serial:
                    conn.execute(
                        "UPDATE MaidSequences SET NextSerial = ?, UpdatedAt = ? WHERE RegionCode = ?",
                        (next_serial, now_iso, region),
                    )

            # 5. Reconcile Careers (preserve all 9 existing rows + add career-press non-destructively)
            conn.execute(
                """
                INSERT OR IGNORE INTO Careers
                    (id, name, archetype, description, lore_snippet, primary_stat, starting_credits, starting_xp, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    "career-press",
                    "Press, Publishing & Public Relations",
                    "Journalism",
                    "Investigative and civic reporting, periodical editing, feature writing, and institutional public communications across all eight realms.",
                    None,
                    "Communication",
                    1500,
                    0,
                    now_iso,
                ),
            )

            for c in careers_data:
                fid = c["id"]
                db_cid = FRONTEND_TO_DB_CAREER_ID[fid]
                conn.execute(
                    """
                    INSERT INTO CareerProgression (
                        CareerId, FrontendId, Category, StationId, BaseSalaryCredits,
                        ReputationKey, PrimaryAttribute, SpecialistLabel, SupervisoryLabel,
                        Requirements, GameplayConnections, PrimaryWorkplacesJson, DutiesJson,
                        TierTitlesJson, RelevantSkillsJson, XpThresholdsJson,
                        QualificationMissionIdsJson, UpdatedAt
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(CareerId) DO UPDATE SET
                        FrontendId=excluded.FrontendId,
                        Category=excluded.Category,
                        StationId=excluded.StationId,
                        BaseSalaryCredits=excluded.BaseSalaryCredits,
                        ReputationKey=excluded.ReputationKey,
                        PrimaryAttribute=excluded.PrimaryAttribute,
                        SpecialistLabel=excluded.SpecialistLabel,
                        SupervisoryLabel=excluded.SupervisoryLabel,
                        Requirements=excluded.Requirements,
                        GameplayConnections=excluded.GameplayConnections,
                        PrimaryWorkplacesJson=excluded.PrimaryWorkplacesJson,
                        DutiesJson=excluded.DutiesJson,
                        TierTitlesJson=excluded.TierTitlesJson,
                        RelevantSkillsJson=excluded.RelevantSkillsJson,
                        XpThresholdsJson=excluded.XpThresholdsJson,
                        QualificationMissionIdsJson=excluded.QualificationMissionIdsJson,
                        UpdatedAt=excluded.UpdatedAt
                    """,
                    (
                        db_cid,
                        fid,
                        c.get("category", ""),
                        c.get("stationId", fid),
                        int(c.get("baseSalaryCredits", 150)),
                        c.get("reputationKey", fid),
                        c.get("primaryAttribute", ""),
                        c.get("specialistLabel", ""),
                        c.get("supervisoryLabel", ""),
                        c.get("requirements", ""),
                        c.get("gameplayConnections", ""),
                        json.dumps(c.get("primaryWorkplaces", []), ensure_ascii=False),
                        json.dumps(c.get("duties", []), ensure_ascii=False),
                        json.dumps(c.get("tierTitles", []), ensure_ascii=False),
                        json.dumps(c.get("relevantSkills", []), ensure_ascii=False),
                        json.dumps(c.get("xpThresholds", [0, 100, 220, 360, 520, 700]), ensure_ascii=False),
                        json.dumps(c.get("qualificationMissionIds", []), ensure_ascii=False),
                        now_iso,
                    ),
                )

            # 6. Reconcile authored Missions + MissionCatalogMeta (non-destructive)
            for source_path, m in missions_data:
                mid = m["id"]
                worknet_cat = m.get("type", "Work Shifts")
                track = m.get("track", "questnotice")
                db_cid = FRONTEND_TO_DB_CAREER_ID.get(track)
                severity = m.get("severity", "Routine")
                difficulty = SEVERITY_TO_DIFFICULTY.get(severity, "Novice")
                tier = WORKNET_TYPE_TO_TIER.get(worknet_cat, "Task")
                activity_scope = WORKNET_TYPE_TO_ACTIVITY_SCOPE.get(worknet_cat, "task")
                objectives = [m["requiredAction"]] if m.get("requiredAction") else []
                prereqs = m.get("prerequisites", [])
                evidence_reqs = m.get("evidenceRequirements", [])
                if mid == "ms-case-002" and not evidence_reqs:
                    evidence_reqs = ["Acquire six sources", "Document structured findings with citations", "Submit written explanation for review"]

                conn.execute(
                    """
                    INSERT OR IGNORE INTO Missions (
                        id, title, type, tier, region_id, faction_id, difficulty,
                        description, objectives, reward_xp, reward_credits,
                        reward_item, min_level, status, created_at
                    ) VALUES (?, ?, ?, ?, NULL, NULL, ?, ?, ?, ?, ?, NULL, 1, 'Available', ?)
                    """,
                    (
                        mid,
                        m["title"],
                        worknet_cat,
                        tier,
                        difficulty,
                        m.get("description", ""),
                        json.dumps(objectives, ensure_ascii=False),
                        int(m.get("rewardXP", 100)),
                        int(m.get("rewardCredits", 100)),
                        now_iso,
                    ),
                )

                conn.execute(
                    """
                    INSERT INTO MissionCatalogMeta (
                        MissionId, CareerId, FrontendTrack, WorknetCategory, ActivityScope,
                        Department, Location, Workplace, Severity, TargetSubject,
                        ThreatOrSymptom, RequiredAction, RewardBits, PrimaryAttribute,
                        PermittedToolsJson, PrerequisitesJson, EvidenceRequirementsJson,
                        SourcePath, DataJson, UpdatedAt
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(MissionId) DO UPDATE SET
                        CareerId=excluded.CareerId,
                        FrontendTrack=excluded.FrontendTrack,
                        WorknetCategory=excluded.WorknetCategory,
                        ActivityScope=excluded.ActivityScope,
                        Department=excluded.Department,
                        Location=excluded.Location,
                        Workplace=excluded.Workplace,
                        Severity=excluded.Severity,
                        TargetSubject=excluded.TargetSubject,
                        ThreatOrSymptom=excluded.ThreatOrSymptom,
                        RequiredAction=excluded.RequiredAction,
                        RewardBits=excluded.RewardBits,
                        PrimaryAttribute=excluded.PrimaryAttribute,
                        PermittedToolsJson=excluded.PermittedToolsJson,
                        PrerequisitesJson=excluded.PrerequisitesJson,
                        EvidenceRequirementsJson=excluded.EvidenceRequirementsJson,
                        SourcePath=excluded.SourcePath,
                        DataJson=excluded.DataJson,
                        UpdatedAt=excluded.UpdatedAt
                    """,
                    (
                        mid,
                        db_cid,
                        track,
                        worknet_cat,
                        activity_scope,
                        m.get("department", ""),
                        m.get("location", ""),
                        m.get("workplace", ""),
                        severity,
                        m.get("targetSubject"),
                        m.get("threatOrSymptom"),
                        m.get("requiredAction"),
                        int(m.get("rewardBits", 0)),
                        m.get("primaryAttribute", ""),
                        json.dumps(m.get("permittedTools", []), ensure_ascii=False),
                        json.dumps(prereqs, ensure_ascii=False),
                        json.dumps(evidence_reqs, ensure_ascii=False),
                        source_path,
                        json.dumps(m, ensure_ascii=False),
                        now_iso,
                    ),
                )

            # 7. Record versioned migration 5
            conn.execute(
                """
                INSERT OR REPLACE INTO ContentMigrations (Version, Description)
                VALUES (5, 'Unified canonical reconciliation: RetiredCharacters, MaidRegistry/Sequences/RetiredSerials, BrowseCharacters v2, CareerProgression, Missions/MissionCatalogMeta')
                """
            )

            integrity = [r[0] for r in conn.execute("PRAGMA integrity_check").fetchall()]
            fks = conn.execute("PRAGMA foreign_key_check").fetchall()
            if integrity != ["ok"]:
                raise RuntimeError(f"Integrity check failed: {integrity}")
            if fks:
                raise RuntimeError(f"Foreign key violations detected: {[dict(r) for r in fks]}")

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
