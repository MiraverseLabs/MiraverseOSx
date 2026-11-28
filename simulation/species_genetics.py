"""Species Genetics, Power Manifestation, and Aggregated Wildlife Simulation.

Connects the authoritative Meridion Species Registry in miraverse.db to:
- Dynamic population generation (species-specific physiology, regional genetics including
  Northwake/Southwake distinctions, mixed ancestry, hybrid elemental inheritance,
  Nephele 5% pure Nether Manipulation cap, and individual manifested abilities).
- Living-world wildlife & fauna simulation (aggregated wildlife populations, ecological
  roles, conservation status, migration, and Pegasus aerial/carriage transportation).
"""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np

from paths import SOURCE_DATABASE

# Canonical eight realms & foundational elemental human species IDs (authoritative MR IDs)
REALM_ELEMENTAL_HUMAN: dict[str, tuple[str, str, str]] = {
    "Fross": ("MR-001", "Frossian", "Winter / Ice"),
    "Lumia": ("MR-029", "Lumian", "Summer / Light"),
    "Marlowe": ("MR-052", "Marlovian", "Spring / Water"),
    "Brisland": ("MR-091", "Brislandian", "Autumn / Air"),
    "Kaji": ("MR-122", "Kajian", "Fire / Volcanic"),
    "Nephele": ("MR-153", "Nephelian", "Darkness / Nether"),
    "Orynvell": ("MR-211", "Orynvellian", "Aether / Celestial"),
    "Ve’Raylia": ("MR-243", "Ve’Raylian", "Earth / Nature"),
}

# Diverse skin tones, hair, eye, and body variations across Meridion
GENERAL_SKIN_TONES = (
    "Deep Umber", "Rich Espresso", "Warm Mahogany", "Golden Bronze",
    "Warm Olive", "Amber Tan", "Warm Honey", "Fair Peach", "Porcelain", "Cool Ivory",
)
GENERAL_HAIR_TEXTURES = ("Coily", "Curly", "Wavy", "Straight", "Locs", "Braided")
GENERAL_HAIR_COLORS = ("Jet Black", "Dark Espresso", "Chestnut Brown", "Warm Auburn", "Honey Blonde", "Ash Blonde", "Silver-Streaked")
GENERAL_EYE_COLORS = ("Deep Brown", "Warm Amber", "Hazel", "Forest Green", "Slate Blue", "Storm Gray")
GENERAL_BODY_TYPES = ("Athletic", "Slender", "Sturdy", "Broad-Shouldered", "Average", "Tall & Lithe", "Compact")

# Regional genetic characteristics grounded in canon (including Northwake / Southwake Frossian)
NORTHWAKE_TRAITS = {
    "skin": ("Pale Ivory", "Frost-Pale", "Light Ice-Blue", "Translucent Alabaster"),
    "hair": ("Platinum Blonde", "Snow White", "Icy Blue", "Silver-White"),
    "eyes": ("Glacial Blue", "Pale Ice-Blue", "Silver-Gray", "Frost Violet"),
    "ears": ("Small slightly pointed ears",),
}
SOUTHWAKE_TRAITS = {
    "skin": ("Warm Tan", "Olive Tan", "Golden Fair", "Pale Ivory", "Bronze-Tan"),
    "hair": ("Honey Blonde", "Chestnut Brown", "Jet Black", "Snow White", "Ash Brown"),
    "eyes": ("Warm Brown", "Deep Brown", "Hazel", "Amber", "Slate Blue"),
    "ears": ("Small slightly pointed ears",),
}

REALM_REGIONAL_TRAITS: dict[str, dict[str, tuple[str, ...]]] = {
    "Orynvell": {
        "skin": GENERAL_SKIN_TONES,
        "hair": GENERAL_HAIR_COLORS + ("Champagne Gold", "Aether-Tinted Silver"),
        "eyes": GENERAL_EYE_COLORS + ("Gilded Amber", "Violet-Flecks"),
        "markings": ("None", "Subtle Aether-Flecked Iris", "Faint Starlight Freckles"),
    },
    "Lumia": {
        "skin": ("Golden Bronze", "Sun-Warm Amber", "Rich Mahogany", "Warm Honey", "Radiant Olive", "Deep Umber"),
        "hair": ("Sunlit Gold", "Chestnut Brown", "Jet Black", "Warm Copper", "Honey Blonde"),
        "eyes": ("Solar Amber", "Warm Gold-Hazel", "Deep Brown", "Bright Hazel"),
        "markings": ("None", "Sun-Warm Freckles", "Subtle Solar Sheen"),
    },
    "Marlowe": {
        "skin": ("Warm Olive", "Sun-Tanned Bronze", "Deep Umber", "Sea-Mist Fair", "Golden Tan"),
        "hair": ("Dark Sea-Brown", "Jet Black", "Sandy Wavy", "Blue-Black", "Chestnut"),
        "eyes": ("Sea-Green", "Teal-Gray", "Deep Brown", "Storm Blue"),
        "markings": ("None", "Salt-Spray Freckles", "Subtle Iridescent Undertone"),
    },
    "Brisland": {
        "skin": GENERAL_SKIN_TONES,
        "hair": ("Autumn Auburn", "Copper Red", "Chestnut Brown", "Jet Black", "Golden Blonde"),
        "eyes": ("Wind-Gray", "Hazel", "Warm Amber", "Forest Green", "Deep Brown"),
        "markings": ("None", "Wind-Swept Freckles", "Faint Cloud-Silver Streaks"),
    },
    "Kaji": {
        "skin": ("Warm Bronze", "Deep Espresso", "Volcanic Olive", "Rich Mahogany", "Warm Tan", "Copper-Undertone"),
        "hair": ("Obsidian Black", "Charcoal", "Ember-Auburn", "Dark Chestnut"),
        "eyes": ("Ember Amber", "Obsidian Brown", "Smoky Hazel", "Copper-Brown"),
        "markings": ("None", "Ash-Freckles", "Warm Ember-Flecks"),
    },
    "Nephele": {
        "skin": ("Deep Obsidian-Brown", "Cool Umber", "Moonlit Olive", "Ashen Fair", "Rich Espresso", "Pale Dusk"),
        "hair": ("Midnight Black", "Raven Blue-Black", "Silver-Ash", "Deep Plum-Black", "Dark Brown"),
        "eyes": ("Obsidian", "Dusk Violet", "Deep Brown", "Storm Silver", "Nocturne Amber"),
        "markings": ("None", "Subtle Umbral Freckles", "Dusk-Tinted Iris"),
    },
    "Ve’Raylia": {
        "skin": ("Rich Earth-Umber", "Warm Mahogany", "Olive-Bronze", "Moss-Undertone Tan", "Warm Honey", "Deep Espresso"),
        "hair": ("Bark Brown", "Jet Black", "Moss-Tinted Chestnut", "Warm Auburn", "Deep Locs"),
        "eyes": ("Forest Green", "Moss Hazel", "Deep Earth Brown", "Warm Amber"),
        "markings": ("None", "Verdant Freckles", "Subtle Bark-Line Patterns"),
    },
}

INHERITANCE_MODES = ("dominant", "dual", "composite", "dormant", "ancestral", "multiple")
PROFICIENCY_TIERS = ("Untrained", "Novice", "Adept", "Practiced", "Skilled")
NEPHELE_PURE_NETHER_CAP = 0.05  # Canonical rule: only 5% of Nephele's population possesses pure Nether Manipulation


def _canonical_realm(realm: str) -> str:
    r = (realm or "Orynvell").strip().replace("'", "’")
    return r if r in REALM_ELEMENTAL_HUMAN else "Orynvell"


def _load_species_abilities(conn: sqlite3.Connection, species_id: str) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {"passive": [], "active": [], "technique": [], "exceptional": []}
    try:
        rows = conn.execute(
            "SELECT ability_type, ability_name FROM SpeciesAbilities WHERE species_id = ? ORDER BY sort_order, id",
            (species_id,),
        ).fetchall()
        for atype, aname in rows:
            if atype in out:
                out[atype].append(aname)
    except sqlite3.Error:
        pass
    return out


def _load_species_morphology(conn: sqlite3.Connection, species_id: str) -> list[str]:
    try:
        row = conn.execute(
            "SELECT morphological_features_json FROM SpeciesPhysiology WHERE species_id = ?",
            (species_id,),
        ).fetchone()
        if row and row[0]:
            return json.loads(row[0])
    except Exception:
        pass
    return []


def generate_citizen_genetics(
    conn: sqlite3.Connection,
    *,
    home_realm: str,
    rng: np.random.Generator,
    species_id: str | None = None,
    age: int = 30,
) -> dict[str, Any]:
    """Generate species identity, regional genetics, hereditary traits, and manifested abilities.

    - Elemental humans are Meridion's foundational human species (natural lifespan up to 200 years).
    - Respects Northwake / Southwake Frossian distinctions.
    - Supports mixed ancestry influencing physical appearance independently of elemental affinity.
    - Enforces Nephele's 5% pure Nether Manipulation cap.
    - Never auto-assigns immortality or sainthood.
    - Distinguishes species-wide potential abilities from an individual's actual manifested abilities.
    """
    realm = _canonical_realm(home_realm)
    default_sid, default_name, default_affinity = REALM_ELEMENTAL_HUMAN[realm]
    chosen_sid = species_id or default_sid
    chosen_name = default_name
    chosen_affinity = default_affinity
    classification_type = "elemental_human"

    try:
        row = conn.execute(
            "SELECT id, name, affinity, classification_type, realm FROM Species WHERE id = ?",
            (chosen_sid,),
        ).fetchone()
        if row:
            chosen_sid, chosen_name, chosen_affinity, classification_type, _ = row
    except sqlite3.Error:
        pass

    # Mixed ancestry (independent of elemental affinity)
    all_realms = list(REALM_ELEMENTAL_HUMAN.keys())
    has_mixed_ancestry = bool(rng.random() < 0.24)
    secondary_realm: str | None = None
    mixed_ancestry: list[str] = []
    if has_mixed_ancestry:
        other_realms = [r for r in all_realms if r != realm]
        secondary_realm = str(rng.choice(other_realms))
        sec_sid, sec_name, _ = REALM_ELEMENTAL_HUMAN[secondary_realm]
        mixed_ancestry.append(f"{sec_name} ({sec_sid})")

    # Regional lineage (including Northwake vs Southwake for Frossian)
    regional_lineage: str | None = None
    if realm == "Fross" and chosen_sid == "MR-001":
        if has_mixed_ancestry:
            regional_lineage = "Southwake (Mixed)"
            trait_bank = SOUTHWAKE_TRAITS
        else:
            is_northwake = bool(rng.random() < 0.45)
            regional_lineage = "Northwake" if is_northwake else "Southwake"
            trait_bank = NORTHWAKE_TRAITS if is_northwake else SOUTHWAKE_TRAITS
        skin_tone = str(rng.choice(trait_bank["skin"]))
        hair_color = str(rng.choice(trait_bank["hair"]))
        eye_color = str(rng.choice(trait_bank["eyes"]))
        ear_morphology = str(rng.choice(trait_bank["ears"]))
        markings = "Frost-Tinted Undertone" if regional_lineage == "Northwake" else "None"
    else:
        # Mixed ancestry can contribute physical appearance independently of elemental affinity
        appearance_realm = secondary_realm if (secondary_realm and rng.random() < 0.40) else realm
        bank = REALM_REGIONAL_TRAITS.get(appearance_realm, REALM_REGIONAL_TRAITS["Orynvell"])
        skin_tone = str(rng.choice(bank["skin"]))
        hair_color = str(rng.choice(bank["hair"]))
        eye_color = str(rng.choice(bank["eyes"]))
        ear_morphology = "Human Standard" if classification_type == "elemental_human" else "Species-Typical"
        markings = str(rng.choice(bank.get("markings", ("None",))))
        regional_lineage = f"{realm} Regional"

    hair_texture = str(rng.choice(GENERAL_HAIR_TEXTURES))
    body_type = str(rng.choice(GENERAL_BODY_TYPES))
    morph_features = _load_species_morphology(conn, chosen_sid)

    # Hybrid elemental inheritance model
    inh_roll = float(rng.random())
    if inh_roll < 0.58:
        inheritance_mode = "dominant"
    elif inh_roll < 0.74:
        inheritance_mode = "dormant"
    elif inh_roll < 0.86 and secondary_realm:
        inheritance_mode = "dual"
    elif inh_roll < 0.93 and secondary_realm:
        inheritance_mode = "composite"
    elif inh_roll < 0.98:
        inheritance_mode = "ancestral"
    else:
        inheritance_mode = "multiple"

    primary_affinity = chosen_affinity
    secondary_affinities: list[str] = []
    composite_affinities: list[str] = []

    if secondary_realm and inheritance_mode in ("dual", "multiple"):
        secondary_affinities.append(REALM_ELEMENTAL_HUMAN[secondary_realm][2])
    if secondary_realm and inheritance_mode == "composite":
        composite_affinities.append(f"{chosen_affinity} × {REALM_ELEMENTAL_HUMAN[secondary_realm][2]}")

    # Canonical rule: Only 5% of Nephele's population possesses pure Nether Manipulation
    pure_nether_manifested = False
    if realm == "Nephele":
        pure_nether_manifested = bool(rng.random() < NEPHELE_PURE_NETHER_CAP)
        if not pure_nether_manifested and "Nether" in primary_affinity:
            primary_affinity = "Darkness / Umbral (Non-Pure Nether)"

    # Individual manifested abilities (never grant every species-wide ability)
    pool = _load_species_abilities(conn, chosen_sid)
    innate: list[str] = []
    learned: list[str] = []
    dormant: list[str] = []

    if pool["passive"]:
        k = min(len(pool["passive"]), int(rng.integers(1, min(3, len(pool["passive"]) + 1))))
        innate = [str(x) for x in rng.choice(pool["passive"], size=k, replace=False)]

    if inheritance_mode != "dormant":
        active_candidates = [
            a for a in pool["active"]
            if pure_nether_manifested or "pure nether" not in a.lower()
        ]
        if active_candidates and rng.random() < 0.65:
            learned.append(str(rng.choice(active_candidates)))
        if pool["technique"] and age >= 22 and rng.random() < 0.45:
            learned.append(str(rng.choice(pool["technique"])))
    else:
        if pool["active"]:
            dormant.append(str(rng.choice(pool["active"])))

    if pool["exceptional"] and rng.random() < 0.08:
        dormant.append(str(rng.choice(pool["exceptional"])))

    proficiency = (
        "Dormant" if inheritance_mode == "dormant"
        else str(rng.choice(PROFICIENCY_TIERS[:4] if age < 35 else PROFICIENCY_TIERS))
    )

    genetics = {
        "speciesId": chosen_sid,
        "speciesName": chosen_name,
        "classificationType": classification_type,
        "regionalLineage": regional_lineage,
        "biologicalAncestry": [f"{chosen_name} ({chosen_sid})"],
        "mixedAncestry": mixed_ancestry,
        "inheritanceMode": inheritance_mode,
        "pureNetherManifested": pure_nether_manifested,
        "naturalLifespanMax": 200 if classification_type == "elemental_human" else None,
        "appearance": {
            "skinTone": skin_tone,
            "hairColor": hair_color,
            "hairTexture": hair_texture,
            "eyeColor": eye_color,
            "earMorphology": ear_morphology,
            "bodyType": body_type,
            "elementalMarkings": markings,
            "morphologicalFeatures": morph_features,
        },
        "supernaturalStatuses": [],  # Never auto-assign immortality or sainthood
        "angelicChoirId": None,
    }

    manifested = {
        "primaryAffinity": primary_affinity,
        "secondaryAffinities": secondary_affinities,
        "compositeAffinities": composite_affinities,
        "elementalProficiency": proficiency,
        "innateAbilities": innate,
        "learnedAbilities": learned,
        "dormantAbilities": dormant,
        "exhaustionLevel": 0.0,
    }

    return {
        "species_id": chosen_sid,
        "subspecies_id": None,
        "primary_affinity": primary_affinity,
        "regional_lineage": regional_lineage,
        "genetics": genetics,
        "manifested": manifested,
    }


def upsert_citizen_species_profile(
    conn: sqlite3.Connection,
    *,
    character_id: str,
    home_realm: str,
    birthplace: str | None,
    citizenship: str | None,
    profile: dict[str, Any],
) -> None:
    """Persist a generated citizen's species & genetics profile in CharacterSpeciesProfiles."""
    now = datetime.now(timezone.utc).isoformat()
    gen = profile["genetics"]
    man = profile["manifested"]
    conn.execute(
        """
        INSERT INTO CharacterSpeciesProfiles (
            character_id, character_source, species_id, subspecies_id,
            biological_ancestry_json, mixed_ancestry_json,
            native_realm, birthplace, citizenship,
            primary_affinity, secondary_affinities_json, composite_affinities_json,
            regional_lineage, hereditary_traits_json, physiological_adaptations_json,
            innate_abilities_json, learned_abilities_json, dormant_abilities_json,
            elemental_proficiency, magical_specializations_json,
            angelic_choir_id, supernatural_statuses_json,
            classification_review_needed, review_notes, updated_at
        ) VALUES (
            ?, 'generated', ?, ?,
            ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, '[]',
            NULL, '[]',
            0, NULL, ?
        )
        ON CONFLICT(character_id) DO UPDATE SET
            species_id = excluded.species_id,
            primary_affinity = excluded.primary_affinity,
            regional_lineage = excluded.regional_lineage,
            hereditary_traits_json = excluded.hereditary_traits_json,
            innate_abilities_json = excluded.innate_abilities_json,
            learned_abilities_json = excluded.learned_abilities_json,
            dormant_abilities_json = excluded.dormant_abilities_json,
            elemental_proficiency = excluded.elemental_proficiency,
            updated_at = excluded.updated_at
        """,
        (
            character_id,
            profile["species_id"],
            profile["subspecies_id"],
            json.dumps(gen["biologicalAncestry"], ensure_ascii=False),
            json.dumps(gen["mixedAncestry"], ensure_ascii=False),
            _canonical_realm(home_realm),
            birthplace or _canonical_realm(home_realm),
            citizenship or _canonical_realm(home_realm),
            man["primaryAffinity"],
            json.dumps(man["secondaryAffinities"], ensure_ascii=False),
            json.dumps(man["compositeAffinities"], ensure_ascii=False),
            profile["regional_lineage"],
            json.dumps(gen["appearance"], ensure_ascii=False),
            json.dumps(gen["appearance"].get("morphologicalFeatures", []), ensure_ascii=False),
            json.dumps(man["innateAbilities"], ensure_ascii=False),
            json.dumps(man["learnedAbilities"], ensure_ascii=False),
            json.dumps(man["dormantAbilities"], ensure_ascii=False),
            man["elementalProficiency"],
            now,
        ),
    )


def list_wildlife_summary(
    db_path: Path = SOURCE_DATABASE,
    *,
    realm: str | None = None,
    transport_only: bool = False,
) -> dict[str, Any]:
    """Return aggregated wildlife populations and transport fauna (e.g. Pegasi) without per-animal agents."""
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    try:
        clauses: list[str] = []
        params: list[Any] = []
        if realm:
            clauses.append("lower(w.realm) = lower(?)")
            params.append(realm.strip())
        if transport_only:
            clauses.append("w.transport_capable = 1")
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        rows = conn.execute(
            f"""
            SELECT w.population_id, w.species_id, s.name, s.family_name, s.affinity,
                   w.realm, w.habitat_zone, w.fauna_class, w.ecological_role,
                   w.domestication_status, w.transport_capable, w.companion_capable,
                   w.familiar_capable, w.working_capable, w.estimated_population,
                   w.conservation_status, w.migration_status
            FROM WildlifePopulations w
            JOIN Species s ON s.id = w.species_id
            {where}
            ORDER BY w.realm, s.name
            """,
            params,
        ).fetchall()
        populations = [dict(r) for r in rows]
        pegasus_transport = [
            p for p in populations
            if p["transport_capable"] and ("pegasus" in p["name"].lower() or p["family_name"].lower() == "equine")
        ]
        return {
            "count": len(populations),
            "ordinaryCount": sum(1 for p in populations if p["fauna_class"] == "ordinary_animal"),
            "magicalCount": sum(1 for p in populations if p["fauna_class"] == "magical_animal"),
            "transportFauna": pegasus_transport,
            "populations": populations,
        }
    finally:
        conn.close()
