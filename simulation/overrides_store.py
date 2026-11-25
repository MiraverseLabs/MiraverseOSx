from __future__ import annotations

import hashlib
import json
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from profiles_normalizer import (
    BEHAVIOR_OVERRIDE_OPTIONS,
    CHARACTER_CLASSIFICATIONS,
    SCHEDULE_PRESETS,
    SIMULATION_DEPTH_OPTIONS,
    normalize_character_profile,
)


from paths import SOURCE_DATABASE as CANONICAL_DB, OVERRIDES_FILE
OBSERVATORY_COLLECTION = "OBSERVATORY_PROFILE"


COMPARE_FIELDS: tuple[tuple[str, str], ...] = (
    ("name", "Display Name"),
    ("aliases", "Aliases"),
    ("legacy_names", "Historical / Legacy Names"),
    ("age", "Age"),
    ("species", "Species / Lineage"),
    ("biography", "Biography"),
    ("origin_realm", "Origin Realm"),
    ("current_residence", "Current Residence"),
    ("workplace", "Workplace"),
    ("primary_occupation", "Primary Occupation"),
    ("secondary_occupations", "Secondary Occupations"),
    ("specializations", "Specializations"),
    ("institutional_roles", "Institutional Roles"),
    ("professional_title", "Formal Title"),
    ("qualifications", "Qualifications"),
    ("institutions", "Institutions"),
    ("traits", "Traits"),
    ("motivations", "Motivations"),
    ("hobbies", "Hobbies"),
    ("preferences", "Preferences"),
    ("social_affiliations", "Social Affiliations"),
    ("narrative_roles", "Narrative Roles"),
    ("historical_roles", "Historical Roles"),
    ("relationships", "Relationships"),
    ("schedule_preset", "Daily Schedule"),
    ("habits", "Habits"),
    ("obligations", "Obligations"),
    ("music_interest_override", "Music Affinity Override"),
    ("music_tastes", "Music Tastes"),
    ("favorite_artists", "Favorite Artists"),
    ("creative_interests", "Creative Interests"),
    ("character_classification", "Character Classification"),
    ("eligible_for_living_sim", "Living Sim Eligibility"),
    ("simulation_depth", "Simulation Depth"),
    ("behavior_override", "Behavior Override"),
)


def _read_store(file_path: Path = OVERRIDES_FILE) -> dict[str, dict[str, Any]]:
    if not file_path.exists():
        return {}
    try:
        raw = json.loads(file_path.read_text(encoding="utf-8"))
    except (OSError, ValueError, TypeError):
        return {}
    records = raw.get("records") if isinstance(raw, dict) else None
    if not isinstance(records, dict):
        return {}
    cleaned: dict[str, dict[str, Any]] = {}
    for cid, entry in records.items():
        if not isinstance(entry, dict):
            continue
        payload = entry.get("data")
        cleaned[str(cid)] = {
            "character_id": str(cid),
            "review_status": str(entry.get("review_status") or "draft"),
            "reviewer_notes": str(entry.get("reviewer_notes") or ""),
            "data": payload if isinstance(payload, dict) else {},
            "updated_at": str(entry.get("updated_at") or ""),
        }
    return cleaned


def _write_or_prune_store(
    records: dict[str, dict[str, Any]],
    file_path: Path = OVERRIDES_FILE,
) -> None:
    """
    Write temporary staged overrides, or delete the staging JSON file completely
    when empty so it never persists as a permanent secondary data store.
    """
    if not records:
        if file_path.exists():
            file_path.unlink()
        return

    document = {
        "schema": "miraverse.population.temporary_staging.v1",
        "ephemeral": True,
        "note": (
            "Temporary staged edits awaiting review and commit to authoritative "
            "miraverse.db. Entries are automatically removed upon commit."
        ),
        "records": dict(sorted(records.items())),
    }
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(
        json.dumps(document, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def load_all_overrides(file_path: Path = OVERRIDES_FILE) -> dict[str, dict[str, Any]]:
    """Load temporary uncommitted character overrides from the staging queue."""
    return _read_store(file_path=file_path)


def save_character_override(
    character_id: str,
    override_data: dict[str, Any],
    review_status: str = "draft",
    reviewer_notes: str = "",
    file_path: Path = OVERRIDES_FILE,
) -> dict[str, Any]:
    """Stage a temporary proposed character edit (draft or approved for commit)."""
    records = _read_store(file_path=file_path)
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    entry = {
        "character_id": character_id,
        "review_status": review_status,
        "reviewer_notes": reviewer_notes,
        "data": override_data,
        "updated_at": now_iso,
    }
    records[character_id] = entry
    _write_or_prune_store(records, file_path=file_path)
    return entry


def delete_character_override(
    character_id: str,
    file_path: Path = OVERRIDES_FILE,
) -> None:
    """Discard a temporary staged edit and remove the staging file if empty."""
    records = _read_store(file_path=file_path)
    if character_id in records:
        del records[character_id]
    _write_or_prune_store(records, file_path=file_path)


def _format_val_for_diff(val: Any) -> str:
    if val is None:
        return "(default)"
    if isinstance(val, bool):
        return "Eligible (Living)" if val else "Excluded (Non-Participating)"
    if isinstance(val, float):
        return f"{val * 100:.0f}%"
    if isinstance(val, list):
        cleaned = [str(x).strip() for x in val if str(x).strip()]
        return "; ".join(cleaned) if cleaned else "(empty)"
    txt = str(val).strip()
    return txt if txt else "(empty)"


def compute_authoritative_diff(
    raw_character: dict[str, Any],
    staged_entry: dict[str, Any],
) -> list[dict[str, str]]:
    """
    Compare authoritative miraverse.db state against a temporary staged entry,
    returning a list of changed attributes with before/after strings.
    """
    auth_norm = normalize_character_profile(raw_character, staged_override=None)
    prop_norm = normalize_character_profile(raw_character, staged_override=staged_entry)

    diffs: list[dict[str, str]] = []
    for key, label in COMPARE_FIELDS:
        before_val = auth_norm.get(key)
        after_val = prop_norm.get(key)
        before_fmt = _format_val_for_diff(before_val)
        after_fmt = _format_val_for_diff(after_val)
        if before_fmt != after_fmt:
            diffs.append(
                {
                    "key": key,
                    "label": label,
                    "before": before_fmt,
                    "after": after_fmt,
                }
            )
    return diffs


def validate_staged_entry(
    raw_character: dict[str, Any] | None,
    staged_entry: dict[str, Any],
    existing_names_by_id: dict[str, str],
) -> dict[str, Any]:
    """
    Validate a staged character override against miraverse.db constraints before
    approval or commit.
    """
    errors: list[str] = []
    warnings: list[str] = []
    cid = str(staged_entry.get("character_id") or "")
    data = staged_entry.get("data") or {}

    if raw_character is None or not cid:
        errors.append(f"CharacterId '{cid}' does not exist in authoritative miraverse.db.")
        return {"valid": False, "errors": errors, "warnings": warnings, "diffs": []}

    proposed_name = str(data.get("name") or "").strip()
    if not proposed_name:
        errors.append("Display Name cannot be empty (Characters.Name NOT NULL).")
    else:
        norm_lower = proposed_name.lower()
        for other_cid, other_name in existing_names_by_id.items():
            if other_cid != cid and other_name.strip().lower() == norm_lower:
                errors.append(
                    f"Display Name '{proposed_name}' conflicts with unique index UX_Characters_Name on {other_cid}."
                )
                break

    cls_val = str(data.get("character_classification") or "")
    if cls_val and cls_val not in CHARACTER_CLASSIFICATIONS:
        errors.append(f"Invalid character classification: '{cls_val}'.")

    depth_val = str(data.get("simulation_depth") or "")
    if depth_val and depth_val not in SIMULATION_DEPTH_OPTIONS:
        errors.append(f"Invalid simulation depth: '{depth_val}'.")

    sched_val = str(data.get("schedule_preset") or "")
    if sched_val and sched_val not in SCHEDULE_PRESETS:
        errors.append(f"Invalid schedule preset: '{sched_val}'.")

    beh_val = str(data.get("behavior_override") or "")
    if beh_val and beh_val not in BEHAVIOR_OVERRIDE_OPTIONS:
        errors.append(f"Invalid behavior override: '{beh_val}'.")

    if data.get("music_interest_override") is not None:
        try:
            mval = float(data["music_interest_override"])
            if not (0.0 <= mval <= 1.0):
                errors.append("Music affinity override must be between 0% and 100%.")
        except (TypeError, ValueError):
            errors.append("Music affinity override is not a valid number.")

    try:
        json.dumps(data, ensure_ascii=False)
    except (TypeError, ValueError) as exc:
        errors.append(f"Payload failed JSON serialization check: {exc}")

    diffs = compute_authoritative_diff(raw_character, staged_entry)
    if not diffs:
        warnings.append(
            "No effective attribute changes relative to current authoritative miraverse.db."
        )

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "diffs": diffs,
    }


def commit_approved_overrides(
    character_ids: list[str] | None = None,
    db_path: Path = CANONICAL_DB,
    file_path: Path = OVERRIDES_FILE,
) -> dict[str, Any]:
    """
    Validate and atomically commit approved staged overrides into authoritative
    miraverse.db, then purge committed entries from staged_population_overrides.json
    (deleting the temporary JSON file if no uncommitted drafts remain).
    """
    records = _read_store(file_path=file_path)
    target_ids = (
        [cid for cid in character_ids if cid in records]
        if character_ids is not None
        else [
            cid
            for cid, entry in records.items()
            if entry.get("review_status") == "approved"
        ]
    )

    if not target_ids:
        return {
            "committed_ids": [],
            "errors": ["No approved staged changes selected for commit."],
            "remaining_staged": len(records),
        }

    # Ensure every selected record is marked approved
    unapproved = [
        cid for cid in target_ids if records[cid].get("review_status") != "approved"
    ]
    if unapproved:
        return {
            "committed_ids": [],
            "errors": [
                f"Staged changes must be marked 'Approved' before committing to miraverse.db ({', '.join(unapproved)})."
            ],
            "remaining_staged": len(records),
        }

    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    committed_ids: list[str] = []

    with closing(sqlite3.connect(str(db_path), timeout=15.0)) as conn:
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")

        try:
            conn.execute("BEGIN IMMEDIATE")

            # Load current authoritative characters & profiles for validation
            char_rows = {
                str(r["CharacterId"]): dict(r)
                for r in conn.execute("SELECT * FROM Characters").fetchall()
            }
            prof_by_cid: dict[str, list[dict[str, Any]]] = {}
            for pr in conn.execute(
                "SELECT CharacterId, Collection, Context, DataJson FROM CharacterProfiles"
            ).fetchall():
                try:
                    pdata = json.loads(pr["DataJson"])
                except (TypeError, ValueError):
                    continue
                if isinstance(pdata, dict):
                    prof_by_cid.setdefault(str(pr["CharacterId"]), []).append(
                        {
                            "collection": pr["Collection"],
                            "context": pr["Context"],
                            "data": pdata,
                        }
                    )

            alias_by_cid: dict[str, list[str]] = {}
            for ar in conn.execute(
                "SELECT CharacterId, Alias FROM CharacterAliases ORDER BY CharacterId, Position"
            ).fetchall():
                alias_by_cid.setdefault(str(ar["CharacterId"]), []).append(
                    str(ar["Alias"])
                )

            existing_names = {
                cid: str(crow["Name"]) for cid, crow in char_rows.items()
            }
            # Include intra-batch proposed names in collision check
            for cid in target_ids:
                pname = str(records[cid].get("data", {}).get("name") or "").strip()
                if pname:
                    existing_names_check = dict(existing_names)
                    raw_char = dict(char_rows[cid]) if cid in char_rows else None
                    if raw_char is not None:
                        raw_char["profiles"] = prof_by_cid.get(cid, [])
                        raw_char["db_aliases"] = alias_by_cid.get(cid, [])
                    v_res = validate_staged_entry(
                        raw_char, records[cid], existing_names_check
                    )
                    if not v_res["valid"]:
                        conn.rollback()
                        return {
                            "committed_ids": [],
                            "errors": [f"{cid}: {err}" for err in v_res["errors"]],
                            "remaining_staged": len(records),
                        }
                    existing_names[cid] = pname

            max_order_row = conn.execute(
                "SELECT COALESCE(MAX(CollectionOrder), 0) FROM CharacterProfiles"
            ).fetchone()
            next_collection_order = int(max_order_row[0]) + 1

            for cid in target_ids:
                entry = records[cid]
                payload = dict(entry["data"])
                crow = char_rows[cid]
                folder = str(crow["Folder"])
                new_name = str(payload.get("name") or crow["Name"]).strip()

                # 1. Update Characters.Name if changed
                if new_name != str(crow["Name"]):
                    conn.execute(
                        "UPDATE Characters SET Name = ? WHERE CharacterId = ?",
                        (new_name, cid),
                    )

                # 2. Sync CharacterAliases in miraverse.db
                merged_aliases: list[str] = []
                for item in (payload.get("aliases") or []) + (
                    payload.get("legacy_names") or []
                ):
                    cleaned_al = str(item).strip()
                    if (
                        cleaned_al
                        and cleaned_al.lower() != new_name.lower()
                        and cleaned_al.lower() not in {x.lower() for x in merged_aliases}
                    ):
                        merged_aliases.append(cleaned_al)

                conn.execute(
                    "DELETE FROM CharacterAliases WHERE CharacterId = ?",
                    (cid,),
                )
                for idx, alias_val in enumerate(merged_aliases):
                    conn.execute(
                        """
                        INSERT INTO CharacterAliases (CharacterId, Alias, Position)
                        VALUES (?, ?, ?)
                        """,
                        (cid, alias_val, idx),
                    )

                # 3. Upsert ContentSources + authoritative OBSERVATORY_PROFILE in CharacterProfiles
                obs_source_path = (
                    f"frontend/src/game-content/characters/people/{folder}/observatory.json"
                )
                authoritative_data = {
                    **payload,
                    "characterId": cid,
                    "committed_at": now_iso,
                    "reviewer_notes": str(entry.get("reviewer_notes") or ""),
                }
                data_json = json.dumps(authoritative_data, ensure_ascii=False)

                existing_prof = conn.execute(
                    """
                    SELECT CollectionOrder, OriginalJson
                    FROM CharacterProfiles
                    WHERE Collection = ? AND RecordKey = ?
                    """,
                    (OBSERVATORY_COLLECTION, cid),
                ).fetchone()

                if existing_prof is not None:
                    col_order = int(existing_prof["CollectionOrder"])
                    orig_json = str(existing_prof["OriginalJson"])
                else:
                    col_order = next_collection_order
                    next_collection_order += 1
                    orig_json = data_json

                source_content_obj = [
                    {
                        "collection": OBSERVATORY_COLLECTION,
                        "key": cid,
                        "origin": "Miraverse Population Observatory",
                        "context": "population-observatory",
                        "data": authoritative_data,
                        "original": json.loads(orig_json),
                    }
                ]
                source_content_json = json.dumps(
                    source_content_obj, ensure_ascii=False
                )
                source_sha = hashlib.sha256(
                    source_content_json.encode("utf-8")
                ).hexdigest()

                conn.execute(
                    """
                    INSERT INTO ContentSources (Path, Category, Sha256, ContentJson)
                    VALUES (?, 'character-profiles', ?, ?)
                    ON CONFLICT(Path) DO UPDATE SET
                        Sha256 = excluded.Sha256,
                        ContentJson = excluded.ContentJson
                    """,
                    (obs_source_path, source_sha, source_content_json),
                )

                conn.execute(
                    """
                    INSERT INTO CharacterProfiles (
                        Collection, RecordKey, CharacterId, Context, Origin,
                        SourcePath, SourceIndex, CollectionOrder, DataJson, OriginalJson
                    )
                    VALUES (?, ?, ?, 'population-observatory', 'Miraverse Population Observatory', ?, 0, ?, ?, ?)
                    ON CONFLICT(Collection, RecordKey) DO UPDATE SET
                        DataJson = excluded.DataJson,
                        SourcePath = excluded.SourcePath
                    """,
                    (
                        OBSERVATORY_COLLECTION,
                        cid,
                        cid,
                        obs_source_path,
                        col_order,
                        data_json,
                        orig_json,
                    ),
                )
                committed_ids.append(cid)

            fk_violations = conn.execute("PRAGMA foreign_key_check").fetchall()
            if fk_violations:
                conn.rollback()
                return {
                    "committed_ids": [],
                    "errors": [
                        f"Foreign key integrity check failed: {len(fk_violations)} violation(s)."
                    ],
                    "remaining_staged": len(records),
                }

            conn.commit()
        except Exception as exc:
            conn.rollback()
            return {
                "committed_ids": [],
                "errors": [f"Database commit aborted: {exc}"],
                "remaining_staged": len(records),
            }

    # Purge committed entries from temporary staging file (and remove file if empty)
    for cid in committed_ids:
        records.pop(cid, None)
    _write_or_prune_store(records, file_path=file_path)

    return {
        "committed_ids": committed_ids,
        "errors": [],
        "remaining_staged": len(records),
        "staging_file_removed": not file_path.exists(),
    }


def export_approved_bundle(file_path: Path = OVERRIDES_FILE) -> str:
    """Return a JSON preview of temporary staged changes awaiting commit."""
    overrides = _read_store(file_path=file_path)
    bundle = {
        "schema": "miraverse.population.temporary_staging.v1",
        "authoritative_database": str(CANONICAL_DB),
        "temporary_staging_file": str(file_path),
        "total_staged": len(overrides),
        "approved_ready_to_commit": sum(
            1 for item in overrides.values() if item["review_status"] == "approved"
        ),
        "records": list(overrides.values()),
    }
    return json.dumps(bundle, ensure_ascii=False, indent=2)
