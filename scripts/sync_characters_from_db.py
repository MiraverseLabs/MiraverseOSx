"""Reconcile frontend/src/game-content/characters/* from canonical miraverse.db (read-only).

- Authoritative source: miraverse.db Characters (55 rows), CharacterAliases, CharacterLegacyIds, RetiredCharacters (20 rows).
- Updates all 14 outdated character names and 43 outdated MAIDs in retained character.json & active profile JSONs.
- Adds firstName, lastName, title, occupation, homeRealm, and maid to retained character.json records.
- Removes the 20 deleted/retired characters from active manifest.characters and active institutional/population rosters.
- Preserves historical case/medical/archived subject records separately under manifest.archivedSubjects (never substituting retained characters).
- Never modifies miraverse.db (opens with ?mode=ro).
"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "miraverse.db"
CHAR_DIR = ROOT / "frontend/src/game-content/characters"

ARCHIVED_HISTORICAL_COLLECTIONS = {
    "FORMAL_INVESTIGATION_CASES",
    "PATIENT_CARE_ASSIGNMENTS",
    "INV_26_402_STARTING_PAYLOAD",
    "MOTORCYCLE_CRASH_MEDICAL_CHART",
    "OVERDOSE_TOXICOLOGY_MEDICAL_CHART",
    "seedPeople",
    "seedRelationships",
}


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def save_json(path: Path, value) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    conn = sqlite3.connect(f"file:{DB_PATH.resolve().as_posix()}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    try:
        db_chars = {
            r["CharacterId"]: dict(r)
            for r in conn.execute(
                """
                SELECT CharacterId, Name, FirstName, LastName, Title, Occupation, HomeRealm,
                       Kind, Status, Folder, Maid, NotesJson, SourcePath
                FROM Characters
                ORDER BY CharacterId
                """
            ).fetchall()
        }
        aliases_by_char: dict[str, list[str]] = {}
        for r in conn.execute("SELECT CharacterId, Alias FROM CharacterAliases ORDER BY CharacterId, Position"):
            aliases_by_char.setdefault(r["CharacterId"], []).append(r["Alias"])

        legacy_by_char: dict[str, list[str]] = {}
        for r in conn.execute("SELECT CharacterId, LegacyId FROM CharacterLegacyIds ORDER BY CharacterId, Position"):
            legacy_by_char.setdefault(r["CharacterId"], []).append(r["LegacyId"])

        retired_rows = [
            dict(r)
            for r in conn.execute(
                "SELECT CharacterId, Name, Folder, Reason, HistoricalContext FROM RetiredCharacters ORDER BY CharacterId"
            ).fetchall()
        ]
    finally:
        conn.close()

    retired_map = {r["CharacterId"]: r for r in retired_rows}
    manifest_path = CHAR_DIR / "manifest.json"
    manifest = load_json(manifest_path)

    # Gather all known character entries (from both characters and any prior archivedSubjects)
    existing_items_by_id: dict[str, dict] = {}
    for item in manifest.get("characters", []):
        existing_items_by_id[item["id"]] = item
    for item in manifest.get("archivedSubjects", []):
        existing_items_by_id.setdefault(item["id"], item)

    new_characters = []
    archived_subjects = []
    active_ref_tokens: set[tuple[str, str]] = set()
    archived_ref_tokens: set[tuple[str, str]] = set()

    names_updated = 0
    maids_updated = 0

    # Preserve existing order for retained canonical characters, then append any new DB character
    ordered_ids = [item["id"] for item in manifest.get("characters", []) if item["id"] in db_chars]
    for cid in sorted(db_chars):
        if cid not in ordered_ids:
            ordered_ids.append(cid)

    for cid in ordered_ids:
        db = db_chars[cid]
        folder = db["Folder"]
        char_json_path = CHAR_DIR / "people" / folder / "character.json"
        person = load_json(char_json_path)

        old_name = person.get("name")
        old_maid = person.get("maid")
        new_name = db["Name"]
        new_maid = db["Maid"]

        if old_name != new_name:
            names_updated += 1
        if (old_maid or None) != (new_maid or None):
            maids_updated += 1

        person["id"] = cid
        person["name"] = new_name
        person["firstName"] = db["FirstName"]
        person["lastName"] = db["LastName"]
        person["title"] = db["Title"]
        person["occupation"] = db["Occupation"]
        person["homeRealm"] = db["HomeRealm"]
        person["kind"] = db["Kind"]
        person["status"] = db["Status"]
        person["folder"] = folder
        person["maid"] = new_maid
        person["aliases"] = aliases_by_char.get(cid, [])
        person["legacyIds"] = legacy_by_char.get(cid, [])
        person["notes"] = json.loads(db["NotesJson"]) if db["NotesJson"] else []
        person.pop("retiredFromCanon", None)
        save_json(char_json_path, person)

        # Update matching display name & MAID in retained character profile files (preserve original untouched)
        files_seen = []
        for ref in person.get("references", []):
            rel_file = ref["file"]
            if rel_file not in files_seen:
                files_seen.append(rel_file)
            active_ref_tokens.add((ref["collection"], ref["key"]))

        for rel_file in files_seen:
            pfile = CHAR_DIR / rel_file
            entries = load_json(pfile)
            changed = False
            for entry in entries:
                data = entry.get("data")
                if not isinstance(data, dict):
                    continue
                if "name" in data and data["name"] and data["name"] != new_name:
                    # Keep short first-name persona/SMS display if not conflicting, or update canonical name
                    if entry.get("collection") not in ("phone-contact",):
                        data["name"] = new_name
                        changed = True
                if entry.get("collection") == "AUREMAIL_DIRECTORY" and new_maid:
                    if data.get("maid") != new_maid:
                        data["maid"] = new_maid
                        changed = True
                if entry.get("collection") == "defaultInputs" and new_maid:
                    if data.get("fixedMaid") != new_maid:
                        data["fixedMaid"] = new_maid
                        changed = True
                if entry.get("collection") == "NPCS":
                    if db["Title"] and data.get("title") != db["Title"]:
                        data["title"] = db["Title"]
                        changed = True
                    if db["HomeRealm"] and data.get("realm") != db["HomeRealm"]:
                        data["realm"] = db["HomeRealm"]
                        changed = True
            if changed:
                save_json(pfile, entries)

        prev_item = existing_items_by_id.get(cid, {})
        new_characters.append({
            "id": cid,
            "name": new_name,
            "firstName": db["FirstName"],
            "lastName": db["LastName"],
            "title": db["Title"],
            "occupation": db["Occupation"],
            "homeRealm": db["HomeRealm"],
            "kind": db["Kind"],
            "status": db["Status"],
            "maid": new_maid,
            "folder": folder,
            "files": prev_item.get("files") or files_seen,
        })

    # Process retired / deleted characters: mark retiredFromCanon, keep ONLY historical/case refs in archivedSubjects
    for cid, rinfo in retired_map.items():
        folder = rinfo["Folder"]
        char_json_path = CHAR_DIR / "people" / folder / "character.json"
        if not char_json_path.exists():
            continue
        person = load_json(char_json_path)
        person["retiredFromCanon"] = True
        person["retirementReason"] = rinfo["Reason"]
        save_json(char_json_path, person)

        hist_refs = [
            ref for ref in person.get("references", [])
            if ref["collection"] in ARCHIVED_HISTORICAL_COLLECTIONS
        ]
        if hist_refs:
            hist_files = []
            for ref in hist_refs:
                archived_ref_tokens.add((ref["collection"], ref["key"]))
                if ref["file"] not in hist_files:
                    hist_files.append(ref["file"])
            archived_subjects.append({
                "id": cid,
                "name": person["name"],
                "folder": folder,
                "reason": rinfo["Reason"],
                "historicalContext": rinfo["HistoricalContext"],
                "files": hist_files,
                "references": hist_refs,
            })

    # Reconcile manifest.order: keep only active refs + historical archived refs (drop deleted active-roster refs)
    allowed_tokens = active_ref_tokens | archived_ref_tokens
    new_order = [
        ref for ref in manifest.get("order", [])
        if (ref["collection"], ref["key"]) in allowed_tokens
    ]
    seen_order = {(r["collection"], r["key"]) for r in new_order}
    for token in sorted(allowed_tokens):
        if token not in seen_order:
            new_order.append({"collection": token[0], "key": token[1]})

    manifest["version"] = 2
    manifest["canonicalRosterCount"] = len(new_characters)
    manifest["characters"] = new_characters
    manifest["retiredCharacters"] = [
        {
            "id": r["CharacterId"],
            "name": r["Name"],
            "folder": r["Folder"],
            "reason": r["Reason"],
            "historicalContext": r["HistoricalContext"],
        }
        for r in retired_rows
    ]
    manifest["archivedSubjects"] = archived_subjects
    manifest["order"] = new_order

    save_json(manifest_path, manifest)

    print(json.dumps({
        "canonicalCharacters": len(new_characters),
        "retiredCharacters": len(retired_rows),
        "archivedSubjectsWithHistoricalCases": len(archived_subjects),
        "activeProfiles": len(active_ref_tokens),
        "archivedHistoricalProfiles": len(archived_ref_tokens),
        "namesUpdated": names_updated,
        "maidsUpdated": maids_updated,
    }, indent=2))


if __name__ == "__main__":
    main()
