#!/usr/bin/env python3
"""Idempotent importer & migration for the Meridion Species Registry into miraverse.db.

- Preserves all 386 authoritative catalog records (MR-001..MR-386) with exact IDs & raw JSON.
- Normalizes into relational tables while distinguishing biological species, elemental humans,
  regional subspecies, hybrid ancestry, celestial beings, angelic choirs, ordinary/magical fauna,
  spiritual entities, magical practitioners, witchcraft traditions, and supernatural statuses.
- Extracts illustrated JPEG assets from the HTML registry to static offline files (never stores
  base64 blobs in SQLite).
- Extends existing miraverse.db safely without modifying canonical Characters, MAIDs, or
  simulation-generated data.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import re
import sqlite3
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DB = REPO_ROOT / "miraverse.db"
DEFAULT_JSON = REPO_ROOT / "frontend" / "src" / "game-content" / "species" / "records.json"
FALLBACK_JSON = Path(r"C:\Users\mirav\Downloads\Meridion Species Records - Complete Power Profiles.json")
DEFAULT_HTML = Path(r"C:\Users\mirav\Downloads\Meridion Species Registry - Complete Power Profiles.html")
DEFAULT_PUBLIC_MEDIA = REPO_ROOT / "frontend" / "public" / "media" / "species"
DEFAULT_WWWROOT_MEDIA = REPO_ROOT / "wwwroot" / "media" / "species"

EIGHT_REALMS: dict[str, dict[str, str]] = {
    "Orynvell": {"code": "OR", "affinity": "Aether / Celestial"},
    "Fross": {"code": "FR", "affinity": "Winter / Ice"},
    "Lumia": {"code": "LU", "affinity": "Summer / Light"},
    "Marlowe": {"code": "MA", "affinity": "Spring / Water"},
    "Brisland": {"code": "BR", "affinity": "Autumn / Air"},
    "Kaji": {"code": "KA", "affinity": "Fire / Volcanic"},
    "Nephele": {"code": "NE", "affinity": "Darkness / Nether"},
    "Ve’Raylia": {"code": "VR", "affinity": "Earth / Nature"},
}

REGIONAL_SUBSPECIES_FAMILIES = {
    "Elven", "Fairy", "Nymph", "Sprite", "Dwarven", "Aquatic", "Draconic",
}

MORPHOLOGY_KEYWORDS: dict[str, tuple[str, ...]] = {
    "wings": ("wing", "winged", "feather", "pinion"),
    "horns": ("horn", "antler", "crown of horn"),
    "scales": ("scale", "scaled", "scaly", "serpentine"),
    "gills": ("gill", "fin", "webbed", "amphibious"),
    "tails": ("tail", "tailed", "fluke"),
    "crystalline": ("crystal", "crystalline", "gem", "quartz", "ice-crystal"),
    "elemental_markings": ("marking", "rune", "glow", "luminescen", "bioluminescen", "aura", "sigil"),
    "claws_fangs": ("claw", "fang", "talon", "tusk"),
    "ears": ("ear", "pointed ear", "tufted ear"),
}

SCHEMA_SQL = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS SpeciesFamilies (
    family_id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    classification_type TEXT NOT NULL,
    description TEXT,
    record_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS Species (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    realm TEXT NOT NULL,
    category TEXT NOT NULL,
    family_id TEXT NOT NULL REFERENCES SpeciesFamilies(family_id),
    family_name TEXT NOT NULL,
    classification_type TEXT NOT NULL CHECK(classification_type IN (
        'biological_species', 'elemental_human', 'regional_subspecies',
        'hybrid_ancestry', 'celestial_being', 'angelic_choir',
        'ordinary_animal', 'magical_animal', 'spiritual_entity',
        'magical_practitioner', 'witchcraft_tradition', 'magical_discipline',
        'supernatural_status'
    )),
    is_biological_species INTEGER NOT NULL DEFAULT 0,
    is_sapient INTEGER NOT NULL DEFAULT 0,
    is_fauna INTEGER NOT NULL DEFAULT 0,
    is_playable_lineage INTEGER NOT NULL DEFAULT 0,
    affinity TEXT NOT NULL,
    description TEXT NOT NULL,
    canon_status TEXT NOT NULL,
    is_provisional INTEGER NOT NULL DEFAULT 1,
    lifespan TEXT,
    profile_status TEXT,
    abilities_summary TEXT,
    limitations TEXT,
    ability_constraints TEXT,
    power_review TEXT,
    raw_json TEXT NOT NULL CHECK(json_valid(raw_json)),
    source_sha256 TEXT,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS SpeciesAbilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    species_id TEXT NOT NULL REFERENCES Species(id) ON DELETE CASCADE,
    ability_type TEXT NOT NULL CHECK(ability_type IN (
        'passive', 'active', 'technique', 'exceptional', 'transcendent', 'adaptation'
    )),
    ability_name TEXT NOT NULL,
    description TEXT,
    is_innate INTEGER NOT NULL DEFAULT 0,
    is_learned INTEGER NOT NULL DEFAULT 0,
    is_hereditary_restricted INTEGER NOT NULL DEFAULT 0,
    constraints TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE(species_id, ability_type, ability_name)
);

CREATE TABLE IF NOT EXISTS SpeciesAffinities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    species_id TEXT NOT NULL REFERENCES Species(id) ON DELETE CASCADE,
    affinity_name TEXT NOT NULL,
    realm_alignment TEXT,
    is_primary INTEGER NOT NULL DEFAULT 1,
    inheritance_mode TEXT NOT NULL DEFAULT 'hybrid',
    UNIQUE(species_id, affinity_name)
);

CREATE TABLE IF NOT EXISTS SpeciesHabitats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    species_id TEXT NOT NULL REFERENCES Species(id) ON DELETE CASCADE,
    realm TEXT NOT NULL,
    habitat_summary TEXT NOT NULL,
    biome_tags_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(biome_tags_json)),
    is_native INTEGER NOT NULL DEFAULT 1,
    domestication_status TEXT,
    ecological_role TEXT,
    conservation_status TEXT,
    migration_pattern TEXT,
    UNIQUE(species_id, realm)
);

CREATE TABLE IF NOT EXISTS SpeciesInheritance (
    species_id TEXT PRIMARY KEY REFERENCES Species(id) ON DELETE CASCADE,
    inheritance_model TEXT NOT NULL,
    supports_dominant INTEGER NOT NULL DEFAULT 1,
    supports_dual INTEGER NOT NULL DEFAULT 1,
    supports_composite INTEGER NOT NULL DEFAULT 1,
    supports_dormant INTEGER NOT NULL DEFAULT 1,
    supports_ancestral INTEGER NOT NULL DEFAULT 1,
    supports_multiple INTEGER NOT NULL DEFAULT 1,
    regional_variants_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(regional_variants_json)),
    hereditary_restrictions TEXT,
    pure_nether_cap_pct REAL,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS SpeciesPhysiology (
    species_id TEXT PRIMARY KEY REFERENCES Species(id) ON DELETE CASCADE,
    summary TEXT NOT NULL,
    lifespan TEXT,
    skin_traits_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(skin_traits_json)),
    hair_traits_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(hair_traits_json)),
    eye_traits_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(eye_traits_json)),
    ear_traits_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(ear_traits_json)),
    morphological_features_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(morphological_features_json)),
    regional_genetics_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(regional_genetics_json)),
    alternative_forms_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(alternative_forms_json)),
    environmental_requirements TEXT
);

CREATE TABLE IF NOT EXISTS SpeciesReferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    species_id TEXT NOT NULL REFERENCES Species(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    source_type TEXT NOT NULL DEFAULT 'powerlisting',
    verification_status TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE(species_id, title, url)
);

CREATE TABLE IF NOT EXISTS SpeciesAssets (
    asset_id TEXT PRIMARY KEY,
    species_id TEXT REFERENCES Species(id) ON DELETE SET NULL,
    realm TEXT,
    asset_kind TEXT NOT NULL CHECK(asset_kind IN (
        'specimen', 'study', 'realm_art', 'realm_plate', 'cover', 'comparative_plate'
    )),
    title TEXT NOT NULL,
    relative_path TEXT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
    file_size_bytes INTEGER NOT NULL,
    sha256 TEXT NOT NULL,
    source_file TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS AngelicChoirs (
    species_id TEXT PRIMARY KEY REFERENCES Species(id) ON DELETE CASCADE,
    choir_name TEXT NOT NULL UNIQUE,
    sphere TEXT NOT NULL,
    sphere_order INTEGER NOT NULL,
    affinity TEXT NOT NULL,
    description TEXT NOT NULL,
    canon_status TEXT NOT NULL,
    separate_from_ancestry INTEGER NOT NULL DEFAULT 1 CHECK(separate_from_ancestry = 1)
);

CREATE TABLE IF NOT EXISTS MagicalDisciplines (
    discipline_id TEXT PRIMARY KEY,
    species_id TEXT REFERENCES Species(id) ON DELETE CASCADE,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    witchkind_exclusive INTEGER NOT NULL DEFAULT 0,
    description TEXT NOT NULL,
    canon_status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS PractitionerTypes (
    species_id TEXT PRIMARY KEY REFERENCES Species(id) ON DELETE CASCADE,
    name TEXT NOT NULL UNIQUE,
    discipline_id TEXT REFERENCES MagicalDisciplines(discipline_id),
    gender_restriction TEXT,
    species_restriction TEXT,
    is_biological_species INTEGER NOT NULL DEFAULT 0 CHECK(is_biological_species = 0),
    description TEXT NOT NULL,
    canon_status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS WitchTraditions (
    species_id TEXT PRIMARY KEY REFERENCES Species(id) ON DELETE CASCADE,
    tradition_name TEXT NOT NULL UNIQUE,
    realm TEXT NOT NULL,
    affinity TEXT NOT NULL,
    witchkind_exclusive INTEGER NOT NULL DEFAULT 1 CHECK(witchkind_exclusive = 1),
    description TEXT NOT NULL,
    canon_status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS SupernaturalStatuses (
    species_id TEXT PRIMARY KEY REFERENCES Species(id) ON DELETE CASCADE,
    status_name TEXT NOT NULL UNIQUE,
    attainment_kind TEXT NOT NULL,
    auto_assign_allowed INTEGER NOT NULL DEFAULT 0 CHECK(auto_assign_allowed = 0),
    description TEXT NOT NULL,
    canon_status TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS CharacterSpeciesProfiles (
    character_id TEXT PRIMARY KEY,
    character_source TEXT NOT NULL CHECK(character_source IN ('canonical', 'generated')),
    species_id TEXT REFERENCES Species(id),
    subspecies_id TEXT REFERENCES Species(id),
    biological_ancestry_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(biological_ancestry_json)),
    mixed_ancestry_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(mixed_ancestry_json)),
    native_realm TEXT,
    birthplace TEXT,
    citizenship TEXT,
    primary_affinity TEXT,
    secondary_affinities_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(secondary_affinities_json)),
    composite_affinities_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(composite_affinities_json)),
    regional_lineage TEXT,
    hereditary_traits_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(hereditary_traits_json)),
    physiological_adaptations_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(physiological_adaptations_json)),
    innate_abilities_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(innate_abilities_json)),
    learned_abilities_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(learned_abilities_json)),
    dormant_abilities_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(dormant_abilities_json)),
    elemental_proficiency TEXT NOT NULL DEFAULT 'Unassessed',
    magical_specializations_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(magical_specializations_json)),
    angelic_choir_id TEXT REFERENCES AngelicChoirs(species_id),
    supernatural_statuses_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(supernatural_statuses_json)),
    classification_review_needed INTEGER NOT NULL DEFAULT 0,
    review_notes TEXT,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS WildlifePopulations (
    population_id TEXT PRIMARY KEY,
    species_id TEXT NOT NULL REFERENCES Species(id) ON DELETE CASCADE,
    realm TEXT NOT NULL,
    habitat_zone TEXT NOT NULL,
    fauna_class TEXT NOT NULL CHECK(fauna_class IN ('ordinary_animal', 'magical_animal')),
    ecological_role TEXT NOT NULL,
    domestication_status TEXT NOT NULL,
    transport_capable INTEGER NOT NULL DEFAULT 0,
    companion_capable INTEGER NOT NULL DEFAULT 0,
    familiar_capable INTEGER NOT NULL DEFAULT 0,
    working_capable INTEGER NOT NULL DEFAULT 0,
    estimated_population INTEGER NOT NULL DEFAULT 0,
    conservation_status TEXT NOT NULL DEFAULT 'Stable',
    migration_status TEXT NOT NULL DEFAULT 'Resident',
    notes TEXT,
    updated_at TEXT NOT NULL,
    UNIQUE(species_id, realm)
);

CREATE INDEX IF NOT EXISTS idx_species_realm ON Species(realm);
CREATE INDEX IF NOT EXISTS idx_species_category ON Species(category);
CREATE INDEX IF NOT EXISTS idx_species_family ON Species(family_id);
CREATE INDEX IF NOT EXISTS idx_species_classification ON Species(classification_type);
CREATE INDEX IF NOT EXISTS idx_species_affinity ON Species(affinity);
CREATE INDEX IF NOT EXISTS idx_species_status ON Species(canon_status);
CREATE INDEX IF NOT EXISTS idx_species_abilities_species ON SpeciesAbilities(species_id);
CREATE INDEX IF NOT EXISTS idx_species_abilities_type ON SpeciesAbilities(ability_type);
CREATE INDEX IF NOT EXISTS idx_species_affinities_name ON SpeciesAffinities(affinity_name);
CREATE INDEX IF NOT EXISTS idx_species_habitats_realm ON SpeciesHabitats(realm);
CREATE INDEX IF NOT EXISTS idx_species_assets_species ON SpeciesAssets(species_id);
CREATE INDEX IF NOT EXISTS idx_species_assets_realm ON SpeciesAssets(realm);
CREATE INDEX IF NOT EXISTS idx_char_species_species ON CharacterSpeciesProfiles(species_id);
CREATE INDEX IF NOT EXISTS idx_wildlife_realm ON WildlifePopulations(realm);
CREATE INDEX IF NOT EXISTS idx_wildlife_species ON WildlifePopulations(species_id);
"""


def slugify(text: str) -> str:
    s = text.replace("’", "").replace("'", "").lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "entry"


def classify_record(rec: dict[str, Any]) -> tuple[str, int, int, int, int]:
    """Return (classification_type, is_biological_species, is_sapient, is_fauna, is_playable_lineage)."""
    cat = rec["category"]
    fam = rec["family"]
    realm = rec["realm"]
    name = rec["name"]

    if cat == "Elemental humans":
        return ("elemental_human", 1, 1, 0, 1)
    if cat == "Angelic choirs":
        return ("angelic_choir", 0, 1, 0, 0)
    if cat == "Celestial & ancestry":
        if fam == "Celestial":
            return ("celestial_being", 0, 1, 0, 1 if name != "Deity" else 0)
        return ("hybrid_ancestry", 1, 1, 0, 1)
    if cat == "Ordinary fauna":
        return ("ordinary_animal", 1, 0, 1, 0)
    if cat == "Magical fauna":
        return ("magical_animal", 1, 0, 1, 0)
    if cat == "Practices & statuses":
        if fam == "Witch tradition":
            return ("witchcraft_tradition", 0, 0, 0, 0)
        if fam == "Practitioner":
            return ("magical_practitioner", 0, 0, 0, 0)
        return ("supernatural_status", 0, 0, 0, 0)
    # Sapient & supernatural
    if fam in ("Spirit", "Spiritual"):
        return ("spiritual_entity", 0, 1, 0, 1)
    # Regional subspecies: realm-specific members of multi-realm sapient families
    if fam in REGIONAL_SUBSPECIES_FAMILIES and realm in EIGHT_REALMS:
        return ("regional_subspecies", 1, 1, 0, 1)
    return ("biological_species", 1, 1, 0, 1)


def split_items(text: str | None) -> list[str]:
    if not text:
        return []
    parts = [p.strip().rstrip(".") for p in re.split(r";|\n", text) if p.strip()]
    seen: set[str] = set()
    out: list[str] = []
    for p in parts:
        key = p.casefold()
        if key not in seen:
            seen.add(key)
            out.append(p)
    return out


def parse_affinities(affinity_text: str) -> list[str]:
    if not affinity_text or affinity_text.strip().lower() in ("none", "varies", "n/a"):
        return [affinity_text.strip() or "Varies"]
    parts = [p.strip() for p in re.split(r"[/,;]+|\band\b|\bor\b", affinity_text, flags=re.I) if p.strip()]
    seen: set[str] = set()
    out: list[str] = []
    for p in parts:
        k = p.casefold()
        if k not in seen:
            seen.add(k)
            out.append(p)
    return out or [affinity_text.strip()]


def extract_physiology_details(rec: dict[str, Any]) -> dict[str, Any]:
    phys = rec.get("physiology") or ""
    low = phys.lower()
    features = [
        feat for feat, kws in MORPHOLOGY_KEYWORDS.items()
        if any(kw in low for kw in kws)
    ]
    skin_traits = re.findall(r"([^.;,]*\bskin\b[^.;,]*)", phys, flags=re.I)
    hair_traits = re.findall(r"([^.;,]*\bhair\b[^.;,]*)", phys, flags=re.I)
    eye_traits = re.findall(r"([^.;,]*\beyes?\b[^.;,]*)", phys, flags=re.I)
    ear_traits = re.findall(r"([^.;,]*\bears?\b[^.;,]*)", phys, flags=re.I)
    alt_forms = re.findall(r"([^.;,]*(?:form|shift|transform|mimicry|metamorph)[^.;,]*)", phys + "; " + (rec.get("abilities") or ""), flags=re.I)

    regional: dict[str, Any] = {}
    if "Northwake:" in phys or "Southwake:" in phys:
        nw = re.search(r"Northwake:\s*([^.]+(?:\.[^.]+)?)", phys)
        sw = re.search(r"Southwake:\s*([^.]+(?:\.[^.]+)?)", phys)
        if nw:
            regional["Northwake"] = nw.group(1).strip()
        if sw:
            regional["Southwake"] = sw.group(1).strip()

    return {
        "skin": [s.strip() for s in skin_traits[:6]],
        "hair": [s.strip() for s in hair_traits[:6]],
        "eyes": [s.strip() for s in eye_traits[:6]],
        "ears": [s.strip() for s in ear_traits[:6]],
        "features": features,
        "regional": regional,
        "alt_forms": [s.strip() for s in alt_forms[:6]],
    }


def classify_fauna_ecology(rec: dict[str, Any]) -> dict[str, Any]:
    name_l = rec["name"].lower()
    fam_l = rec["family"].lower()
    desc_l = (rec.get("description") or "").lower()
    hab_l = (rec.get("habitat") or "").lower()
    combined = f"{name_l} {fam_l} {desc_l} {hab_l}"

    is_dragon = "draconic" in fam_l or "dragon" in name_l or "wyvern" in name_l or "wyrm" in name_l
    is_pegasus = "pegasus" in name_l or "pegasi" in name_l
    is_equine = "equine" in fam_l or "horse" in name_l or "unicorn" in name_l or "alicorn" in name_l
    is_companion = "companion" in fam_l or any(w in combined for w in ("companion", "pet", "domestic", "cat", "dog", "hound", "ferret", "rabbit"))
    is_livestock = "livestock" in fam_l or any(w in combined for w in ("livestock", "herd", "flock", "dairy", "wool", "poultry", "cattle", "sheep", "goat", "pig"))
    is_familiar = any(w in combined for w in ("familiar", "witch", "owl", "raven", "crow", "cat", "toad", "fox", "bat", "moth")) and not is_dragon

    # Canonical rule: Do NOT automatically classify dragons or supernatural predators as domesticated
    if is_dragon:
        dom = "Wild / Undomesticated"
        transport = 0
        companion = 0
        working = 0
    elif is_pegasus:
        dom = "Trained / Aerial Transport"
        transport = 1
        companion = 1
        working = 1
    elif is_livestock:
        dom = "Domesticated Livestock"
        transport = 0
        companion = 0
        working = 1
    elif "companion" in fam_l:
        dom = "Domesticated Companion"
        transport = 0
        companion = 1
        working = 0
    elif is_equine and rec["category"] == "Ordinary fauna":
        dom = "Domesticated Working / Transport"
        transport = 1
        companion = 1
        working = 1
    elif is_equine and ("unicorn" in name_l or "alicorn" in name_l):
        dom = "Sacred / Untamed Celestial"
        transport = 0
        companion = 0
        working = 0
    elif is_equine:
        dom = "Semi-Wild / Specialized Mount"
        transport = 1 if ("carriage" in combined or "mount" in combined or "steed" in combined) else 0
        companion = 0
        working = 0
    else:
        dom = "Wild"
        transport = 0
        companion = 1 if (is_companion and rec["category"] == "Ordinary fauna") else 0
        working = 0

    if "aquatic" in fam_l or "marine" in fam_l:
        role = "Aquatic / Marine Fauna"
    elif "avian" in fam_l:
        role = "Avian / Aerial Fauna"
    elif "invertebrate" in fam_l:
        role = "Pollinator / Invertebrate"
    elif is_dragon:
        role = "Apex Magical Predator / Sovereign Fauna"
    elif is_livestock:
        role = "Agricultural / Pastoral"
    elif is_equine:
        role = "Equine / Grazer"
    elif "canid" in fam_l or "feline" in fam_l:
        role = "Predator / Forager"
    else:
        role = "Regional Wildlife"

    migration = "Migratory" if any(w in combined for w in ("migrat", "seasonal", "nomadic", "flock", "shoal", "flight")) else "Resident"
    conservation = "Protected / Rare" if (is_dragon or "unicorn" in name_l or "alicorn" in name_l or "phoenix" in name_l) else "Stable"
    base_pop = 120 if conservation == "Protected / Rare" else (2400 if rec["category"] == "Ordinary fauna" else 650)

    return {
        "domestication_status": dom,
        "ecological_role": role,
        "transport_capable": transport,
        "companion_capable": companion,
        "familiar_capable": 1 if is_familiar else 0,
        "working_capable": working,
        "estimated_population": base_pop,
        "conservation_status": conservation,
        "migration_status": migration,
    }


def extract_js_object(html_text: str, var_name: str) -> dict[str, str]:
    m = re.search(rf"(?:const|let|var)\s+{re.escape(var_name)}\s*=\s*\{{", html_text)
    if not m:
        return {}
    start = m.end() - 1
    depth = 0
    in_str: str | None = None
    esc = False
    end = start
    for i in range(start, len(html_text)):
        c = html_text[i]
        if in_str:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == in_str:
                in_str = None
        else:
            if c in ('"', "'"):
                in_str = c
            elif c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    end = i + 1
                    break
    return json.loads(html_text[start:end])


def extract_html_assets(
    html_path: Path,
    asset_dirs: list[Path],
    species_by_name: dict[str, str],
) -> list[dict[str, Any]]:
    if not html_path.exists():
        print(f"[warn] HTML source not found at {html_path}; skipping asset extraction.")
        return []

    html_text = html_path.read_text(encoding="utf-8", errors="replace")
    for d in asset_dirs:
        d.mkdir(parents=True, exist_ok=True)

    extracted: list[dict[str, Any]] = []
    source_name = html_path.name

    def save_data_uri(asset_id: str, subdir: str, filename: str, data_uri: str,
                      species_id: str | None, realm: str | None, asset_kind: str, title: str) -> None:
        m = re.match(r"data:image/([a-zA-Z0-9+.-]+);base64,(.+)", data_uri, flags=re.S)
        if not m:
            return
        ext = "jpg" if m.group(1).lower() in ("jpeg", "jpg") else m.group(1).lower()
        raw = base64.b64decode(m.group(2))
        digest = hashlib.sha256(raw).hexdigest()
        rel_name = f"{filename}.{ext}"
        rel_url = f"/media/species/{subdir}/{rel_name}" if subdir else f"/media/species/{rel_name}"
        for base_dir in asset_dirs:
            out_dir = base_dir / subdir if subdir else base_dir
            out_dir.mkdir(parents=True, exist_ok=True)
            out_path = out_dir / rel_name
            if not out_path.exists() or hashlib.sha256(out_path.read_bytes()).hexdigest() != digest:
                out_path.write_bytes(raw)
        extracted.append({
            "asset_id": asset_id,
            "species_id": species_id,
            "realm": realm,
            "asset_kind": asset_kind,
            "title": title,
            "relative_path": rel_url,
            "mime_type": f"image/{m.group(1).lower()}",
            "file_size_bytes": len(raw),
            "sha256": digest,
            "source_file": source_name,
        })

    # 1. Cover art
    m_cover = re.search(r'<img class="cover-art" src="(data:image/[^"]+)"', html_text)
    if m_cover:
        save_data_uri("asset-cover-registry", "plates", "meridion-registry-cover",
                      m_cover.group(1), None, None, "cover", "Meridion Species Registry Cover")

    # 2. Mystical equines comparative plate
    m_eq = re.search(r'Mystical equines comparative plate</summary><img[^>]+src="(data:image/[^"]+)"', html_text)
    if m_eq:
        save_data_uri("asset-plate-mystical-equines", "plates", "mystical-equines-comparative",
                      m_eq.group(1), None, "Multiple realms", "comparative_plate",
                      "Mystical Equines Comparative Plate")

    # 3. Specimen artwork
    for name, uri in extract_js_object(html_text, "specimenArt").items():
        sid = species_by_name.get(name.casefold())
        slug = slugify(name)
        save_data_uri(f"asset-specimen-{slug}", "specimens", slug, uri,
                      sid, None, "specimen", f"{name} Specimen Illustration")

    # 4. Study artwork
    for name, uri in extract_js_object(html_text, "studyArt").items():
        sid = species_by_name.get(name.casefold())
        slug = slugify(name)
        save_data_uri(f"asset-study-{slug}", "studies", f"{slug}-study", uri,
                      sid, None, "study", f"{name} Comparative Study")

    # 5. Realm full artwork
    for realm_name, uri in extract_js_object(html_text, "realmArt").items():
        slug = slugify(realm_name)
        save_data_uri(f"asset-realm-art-{slug}", "realms", f"{slug}-realm", uri,
                      None, realm_name, "realm_art", f"{realm_name} Realm Illustration")

    # 6. Realm plates (thumbnail/emblem plates; deduplicated vs button tags automatically)
    for realm_name, uri in extract_js_object(html_text, "plates").items():
        slug = slugify(realm_name)
        save_data_uri(f"asset-realm-plate-{slug}", "realms", f"{slug}-plate", uri,
                      None, realm_name, "realm_plate", f"{realm_name} Realm Plate")

    return extracted


def ensure_generated_citizens_columns(cur: sqlite3.Cursor) -> list[str]:
    existing = {row[1] for row in cur.execute("PRAGMA table_info(GeneratedCitizens)").fetchall()}
    if not existing:
        return []
    additions = [
        ("SpeciesId", "TEXT"),
        ("SubspeciesId", "TEXT"),
        ("PrimaryAffinity", "TEXT"),
        ("RegionalLineage", "TEXT"),
        ("GeneticsJson", "TEXT"),
        ("ManifestedAbilitiesJson", "TEXT"),
    ]
    added: list[str] = []
    for col, col_type in additions:
        if col not in existing:
            cur.execute(f'ALTER TABLE GeneratedCitizens ADD COLUMN "{col}" {col_type}')
            added.append(col)
    return added


def seed_canonical_character_review_profiles(cur: sqlite3.Cursor, now: str) -> int:
    """Create non-destructive CharacterSpeciesProfiles rows for existing canonical Characters.

    Never overwrites existing profile rows or randomly assigns species/ancestry/abilities.
    Flags missing classifications with classification_review_needed = 1.
    """
    existing_chars = cur.execute(
        "SELECT CharacterId, Name, HomeRealm, Kind FROM Characters"
    ).fetchall()
    # Pull any already-documented species/ancestry strings from CharacterProfiles without modifying them
    profile_hints: dict[str, dict[str, Any]] = {}
    for cid, djson in cur.execute("SELECT CharacterId, DataJson FROM CharacterProfiles"):
        try:
            d = json.loads(djson)
        except Exception:
            continue
        if not isinstance(d, dict):
            continue
        hint = profile_hints.setdefault(cid, {})
        for k in ("species", "Species", "ancestry", "affinity", "realm"):
            if d.get(k) and k.lower() not in hint:
                hint[k.lower()] = d[k]

    inserted = 0
    for cid, name, home_realm, kind in existing_chars:
        hint = profile_hints.get(cid, {})
        raw_species = str(hint.get("species") or "").strip()
        raw_ancestry = str(hint.get("ancestry") or "").strip()
        raw_affinity = str(hint.get("affinity") or "").strip()
        needs_review = 1
        review_notes = (
            f"Retained existing canonical profile ({raw_species or 'species unspecified'}). "
            "Flagged for canonical species classification review; not auto-assigned."
        )
        cur.execute(
            """
            INSERT OR IGNORE INTO CharacterSpeciesProfiles (
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
                ?, 'canonical', NULL, NULL,
                ?, '[]',
                ?, NULL, ?,
                ?, '[]', '[]',
                NULL, '{}', '[]',
                '[]', '[]', '[]',
                'Unassessed', '[]',
                NULL, '[]',
                ?, ?, ?
            )
            """,
            (
                cid,
                json.dumps([raw_ancestry] if raw_ancestry else []),
                home_realm,
                home_realm,
                raw_affinity or None,
                needs_review,
                review_notes,
                now,
            ),
        )
        if cur.rowcount:
            inserted += 1
    return inserted


def import_species_registry(
    db_path: Path,
    json_path: Path,
    html_path: Path,
    asset_dirs: list[Path],
) -> dict[str, Any]:
    if not json_path.exists():
        if FALLBACK_JSON.exists():
            json_path = FALLBACK_JSON
        else:
            raise FileNotFoundError(f"Species JSON not found: {json_path}")

    raw_bytes = json_path.read_bytes()
    source_sha256 = hashlib.sha256(raw_bytes).hexdigest()
    records: list[dict[str, Any]] = json.loads(raw_bytes.decode("utf-8"))
    if len(records) != 386:
        raise ValueError(f"Expected 386 catalog records, got {len(records)}")

    now = datetime.now(timezone.utc).isoformat()
    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA busy_timeout = 10000;")

    try:
        conn.executescript(SCHEMA_SQL)
        cur = conn.cursor()
        added_citizen_cols = ensure_generated_citizens_columns(cur)

        # Build family catalog
        family_meta: dict[str, dict[str, Any]] = {}
        classification_counts: Counter[str] = Counter()
        species_by_name: dict[str, str] = {}

        for rec in records:
            ctype, is_bio, is_sap, is_fau, is_play = classify_record(rec)
            classification_counts[ctype] += 1
            species_by_name[rec["name"].casefold()] = rec["id"]
            fam_name = rec["family"]
            fam_id = f"fam-{slugify(fam_name)}"
            if fam_id not in family_meta:
                family_meta[fam_id] = {
                    "family_id": fam_id,
                    "name": fam_name,
                    "category": rec["category"],
                    "classification_type": ctype,
                    "count": 0,
                }
            family_meta[fam_id]["count"] += 1

        with conn:
            for fm in family_meta.values():
                cur.execute(
                    """
                    INSERT INTO SpeciesFamilies (family_id, name, category, classification_type, description, record_count)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(family_id) DO UPDATE SET
                        name = excluded.name,
                        category = excluded.category,
                        classification_type = excluded.classification_type,
                        record_count = excluded.record_count
                    """,
                    (
                        fm["family_id"],
                        fm["name"],
                        fm["category"],
                        fm["classification_type"],
                        f"{fm['name']} ({fm['category']})",
                        fm["count"],
                    ),
                )

            sphere_order_map = {"First sphere": 1, "Second sphere": 2, "Third sphere": 3}
            used_slugs: set[str] = set()
            wildlife_count = 0
            choir_count = 0
            witch_trad_count = 0
            practitioner_count = 0
            discipline_count = 0
            status_count = 0

            for rec in records:
                sid = rec["id"]
                name = rec["name"]
                slug = slugify(name)
                if slug in used_slugs:
                    slug = f"{slug}-{sid.lower()}"
                used_slugs.add(slug)

                ctype, is_bio, is_sap, is_fau, is_play = classify_record(rec)
                fam_id = f"fam-{slugify(rec['family'])}"
                is_provisional = 0 if rec["status"] == "Established" else 1

                cur.execute(
                    """
                    INSERT INTO Species (
                        id, name, slug, realm, category, family_id, family_name,
                        classification_type, is_biological_species, is_sapient, is_fauna,
                        is_playable_lineage, affinity, description, canon_status, is_provisional,
                        lifespan, profile_status, abilities_summary, limitations,
                        ability_constraints, power_review, raw_json, source_sha256, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        name = excluded.name,
                        slug = excluded.slug,
                        realm = excluded.realm,
                        category = excluded.category,
                        family_id = excluded.family_id,
                        family_name = excluded.family_name,
                        classification_type = excluded.classification_type,
                        is_biological_species = excluded.is_biological_species,
                        is_sapient = excluded.is_sapient,
                        is_fauna = excluded.is_fauna,
                        is_playable_lineage = excluded.is_playable_lineage,
                        affinity = excluded.affinity,
                        description = excluded.description,
                        canon_status = excluded.canon_status,
                        is_provisional = excluded.is_provisional,
                        lifespan = excluded.lifespan,
                        profile_status = excluded.profile_status,
                        abilities_summary = excluded.abilities_summary,
                        limitations = excluded.limitations,
                        ability_constraints = excluded.ability_constraints,
                        power_review = excluded.power_review,
                        raw_json = excluded.raw_json,
                        source_sha256 = excluded.source_sha256,
                        updated_at = excluded.updated_at
                    """,
                    (
                        sid, name, slug, rec["realm"], rec["category"], fam_id, rec["family"],
                        ctype, is_bio, is_sap, is_fau, is_play,
                        rec["affinity"], rec["description"], rec["status"], is_provisional,
                        rec["lifespan"], rec["profileStatus"], rec["abilities"], rec["limitations"],
                        rec["abilityConstraints"], rec["powerReview"],
                        json.dumps(rec, ensure_ascii=False), source_sha256, now,
                    ),
                )

                # Refresh normalized child rows idempotently for this species
                cur.execute("DELETE FROM SpeciesAbilities WHERE species_id = ?", (sid,))
                ability_groups = [
                    ("passive", rec.get("passiveAbilities"), 1, 0),
                    ("active", rec.get("activePowers"), 1 if is_bio else 0, 1),
                    ("technique", rec.get("techniques"), 0, 1),
                    ("exceptional", rec.get("exceptionalManifestations"), 0, 1),
                ]
                hereditary_restricted = 1 if ("witchkind" in (rec.get("abilityConstraints") or "").lower() or ctype == "witchcraft_tradition") else 0
                order_idx = 0
                for atype, raw_text, is_innate, is_learned in ability_groups:
                    for item in split_items(raw_text):
                        order_idx += 1
                        cur.execute(
                            """
                            INSERT OR IGNORE INTO SpeciesAbilities (
                                species_id, ability_type, ability_name, description,
                                is_innate, is_learned, is_hereditary_restricted, constraints, sort_order
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            (sid, atype, item, item, is_innate, is_learned,
                             hereditary_restricted, rec.get("abilityConstraints"), order_idx),
                        )

                # Affinities
                cur.execute("DELETE FROM SpeciesAffinities WHERE species_id = ?", (sid,))
                aff_list = parse_affinities(rec["affinity"])
                for idx, aff in enumerate(aff_list):
                    cur.execute(
                        """
                        INSERT OR IGNORE INTO SpeciesAffinities (
                            species_id, affinity_name, realm_alignment, is_primary, inheritance_mode
                        ) VALUES (?, ?, ?, ?, ?)
                        """,
                        (sid, aff, rec["realm"], 1 if idx == 0 else 0, "hybrid"),
                    )

                # Physiology
                phys = extract_physiology_details(rec)
                cur.execute(
                    """
                    INSERT INTO SpeciesPhysiology (
                        species_id, summary, lifespan, skin_traits_json, hair_traits_json,
                        eye_traits_json, ear_traits_json, morphological_features_json,
                        regional_genetics_json, alternative_forms_json, environmental_requirements
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(species_id) DO UPDATE SET
                        summary = excluded.summary,
                        lifespan = excluded.lifespan,
                        skin_traits_json = excluded.skin_traits_json,
                        hair_traits_json = excluded.hair_traits_json,
                        eye_traits_json = excluded.eye_traits_json,
                        ear_traits_json = excluded.ear_traits_json,
                        morphological_features_json = excluded.morphological_features_json,
                        regional_genetics_json = excluded.regional_genetics_json,
                        alternative_forms_json = excluded.alternative_forms_json,
                        environmental_requirements = excluded.environmental_requirements
                    """,
                    (
                        sid, rec["physiology"], rec["lifespan"],
                        json.dumps(phys["skin"], ensure_ascii=False),
                        json.dumps(phys["hair"], ensure_ascii=False),
                        json.dumps(phys["eyes"], ensure_ascii=False),
                        json.dumps(phys["ears"], ensure_ascii=False),
                        json.dumps(phys["features"], ensure_ascii=False),
                        json.dumps(phys["regional"], ensure_ascii=False),
                        json.dumps(phys["alt_forms"], ensure_ascii=False),
                        rec.get("habitat"),
                    ),
                )

                # Inheritance
                pure_nether_cap = 5.0 if (rec["realm"] == "Nephele" or name == "Nephelian") else None
                inh_model = "hybrid_elemental" if ctype == "elemental_human" else (
                    "non_hereditary_practice" if ctype in ("magical_practitioner", "witchcraft_tradition", "supernatural_status", "angelic_choir")
                    else "biological_hybrid"
                )
                cur.execute(
                    """
                    INSERT INTO SpeciesInheritance (
                        species_id, inheritance_model, supports_dominant, supports_dual,
                        supports_composite, supports_dormant, supports_ancestral, supports_multiple,
                        regional_variants_json, hereditary_restrictions, pure_nether_cap_pct, notes
                    ) VALUES (?, ?, 1, 1, 1, 1, 1, 1, ?, ?, ?, ?)
                    ON CONFLICT(species_id) DO UPDATE SET
                        inheritance_model = excluded.inheritance_model,
                        regional_variants_json = excluded.regional_variants_json,
                        hereditary_restrictions = excluded.hereditary_restrictions,
                        pure_nether_cap_pct = excluded.pure_nether_cap_pct,
                        notes = excluded.notes
                    """,
                    (
                        sid, inh_model, json.dumps(phys["regional"], ensure_ascii=False),
                        rec.get("abilityConstraints"), pure_nether_cap, rec.get("limitations"),
                    ),
                )

                # Habitat
                cur.execute("DELETE FROM SpeciesHabitats WHERE species_id = ?", (sid,))
                eco = classify_fauna_ecology(rec) if is_fau else None
                biome_tags = [b.strip() for b in re.split(r"[,;]+|\band\b", rec.get("habitat") or "") if b.strip()][:8]
                cur.execute(
                    """
                    INSERT OR IGNORE INTO SpeciesHabitats (
                        species_id, realm, habitat_summary, biome_tags_json, is_native,
                        domestication_status, ecological_role, conservation_status, migration_pattern
                    ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)
                    """,
                    (
                        sid, rec["realm"], rec.get("habitat") or "",
                        json.dumps(biome_tags, ensure_ascii=False),
                        eco["domestication_status"] if eco else None,
                        eco["ecological_role"] if eco else None,
                        eco["conservation_status"] if eco else None,
                        eco["migration_status"] if eco else None,
                    ),
                )

                # External References (Powerlisting provenance — offline metadata only)
                cur.execute("DELETE FROM SpeciesReferences WHERE species_id = ?", (sid,))
                for idx, ref in enumerate(rec.get("powerReferences") or []):
                    cur.execute(
                        """
                        INSERT OR IGNORE INTO SpeciesReferences (
                            species_id, title, url, source_type, verification_status, sort_order
                        ) VALUES (?, ?, ?, 'powerlisting', ?, ?)
                        """,
                        (sid, ref.get("title", ""), ref.get("url", ""),
                         ref.get("verification", "Unverified"), idx + 1),
                    )

                # Specialized tables
                if ctype == "angelic_choir":
                    choir_count += 1
                    cur.execute(
                        """
                        INSERT INTO AngelicChoirs (
                            species_id, choir_name, sphere, sphere_order, affinity,
                            description, canon_status, separate_from_ancestry
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
                        ON CONFLICT(species_id) DO UPDATE SET
                            choir_name = excluded.choir_name,
                            sphere = excluded.sphere,
                            sphere_order = excluded.sphere_order,
                            affinity = excluded.affinity,
                            description = excluded.description,
                            canon_status = excluded.canon_status
                        """,
                        (sid, name, rec["family"], sphere_order_map.get(rec["family"], 3),
                         rec["affinity"], rec["description"], rec["status"]),
                    )

                elif ctype == "witchcraft_tradition":
                    witch_trad_count += 1
                    disc_id = f"disc-{slug}"
                    discipline_count += 1
                    cur.execute(
                        """
                        INSERT INTO MagicalDisciplines (
                            discipline_id, species_id, name, category,
                            witchkind_exclusive, description, canon_status
                        ) VALUES (?, ?, ?, 'Witchcraft Tradition', 1, ?, ?)
                        ON CONFLICT(discipline_id) DO UPDATE SET
                            name = excluded.name,
                            description = excluded.description,
                            canon_status = excluded.canon_status
                        """,
                        (disc_id, sid, name, rec["description"], rec["status"]),
                    )
                    cur.execute(
                        """
                        INSERT INTO WitchTraditions (
                            species_id, tradition_name, realm, affinity,
                            witchkind_exclusive, description, canon_status
                        ) VALUES (?, ?, ?, ?, 1, ?, ?)
                        ON CONFLICT(species_id) DO UPDATE SET
                            tradition_name = excluded.tradition_name,
                            realm = excluded.realm,
                            affinity = excluded.affinity,
                            description = excluded.description,
                            canon_status = excluded.canon_status
                        """,
                        (sid, name, rec["realm"], rec["affinity"], rec["description"], rec["status"]),
                    )

                elif ctype == "magical_practitioner":
                    practitioner_count += 1
                    disc_id = f"disc-{slug}"
                    discipline_count += 1
                    witch_excl = 1 if name == "Witch" else 0
                    gender_restr = "Male" if name == "Warlock" else ("Female" if name == "Enchantress" else None)
                    species_restr = "Witchkind" if name == "Witch" else None
                    cur.execute(
                        """
                        INSERT INTO MagicalDisciplines (
                            discipline_id, species_id, name, category,
                            witchkind_exclusive, description, canon_status
                        ) VALUES (?, ?, ?, 'Magical Practice', ?, ?, ?)
                        ON CONFLICT(discipline_id) DO UPDATE SET
                            name = excluded.name,
                            witchkind_exclusive = excluded.witchkind_exclusive,
                            description = excluded.description,
                            canon_status = excluded.canon_status
                        """,
                        (disc_id, sid, name, witch_excl, rec["description"], rec["status"]),
                    )
                    cur.execute(
                        """
                        INSERT INTO PractitionerTypes (
                            species_id, name, discipline_id, gender_restriction,
                            species_restriction, is_biological_species, description, canon_status
                        ) VALUES (?, ?, ?, ?, ?, 0, ?, ?)
                        ON CONFLICT(species_id) DO UPDATE SET
                            name = excluded.name,
                            discipline_id = excluded.discipline_id,
                            gender_restriction = excluded.gender_restriction,
                            species_restriction = excluded.species_restriction,
                            description = excluded.description,
                            canon_status = excluded.canon_status
                        """,
                        (sid, name, disc_id, gender_restr, species_restr, rec["description"], rec["status"]),
                    )

                elif ctype == "supernatural_status":
                    status_count += 1
                    cur.execute(
                        """
                        INSERT INTO SupernaturalStatuses (
                            species_id, status_name, attainment_kind, auto_assign_allowed,
                            description, canon_status
                        ) VALUES (?, ?, 'Attained / Existential', 0, ?, ?)
                        ON CONFLICT(species_id) DO UPDATE SET
                            status_name = excluded.status_name,
                            description = excluded.description,
                            canon_status = excluded.canon_status
                        """,
                        (sid, name, rec["description"], rec["status"]),
                    )

                # Aggregated WildlifePopulations for ordinary & magical fauna
                if is_fau and eco is not None:
                    wildlife_count += 1
                    pop_id = f"wild-{sid.lower()}-{slugify(rec['realm'])}"
                    cur.execute(
                        """
                        INSERT INTO WildlifePopulations (
                            population_id, species_id, realm, habitat_zone, fauna_class,
                            ecological_role, domestication_status,
                            transport_capable, companion_capable, familiar_capable, working_capable,
                            estimated_population, conservation_status, migration_status, notes, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(species_id, realm) DO UPDATE SET
                            habitat_zone = excluded.habitat_zone,
                            ecological_role = excluded.ecological_role,
                            domestication_status = excluded.domestication_status,
                            transport_capable = excluded.transport_capable,
                            companion_capable = excluded.companion_capable,
                            familiar_capable = excluded.familiar_capable,
                            working_capable = excluded.working_capable,
                            conservation_status = excluded.conservation_status,
                            migration_status = excluded.migration_status,
                            updated_at = excluded.updated_at
                        """,
                        (
                            pop_id, sid, rec["realm"], rec.get("habitat") or rec["realm"],
                            ctype, eco["ecological_role"], eco["domestication_status"],
                            eco["transport_capable"], eco["companion_capable"],
                            eco["familiar_capable"], eco["working_capable"],
                            eco["estimated_population"], eco["conservation_status"],
                            eco["migration_status"], rec["description"], now,
                        ),
                    )

            # Extract & register visual assets from HTML
            assets = extract_html_assets(html_path, asset_dirs, species_by_name)
            for asset in assets:
                cur.execute(
                    """
                    INSERT INTO SpeciesAssets (
                        asset_id, species_id, realm, asset_kind, title,
                        relative_path, mime_type, file_size_bytes, sha256, source_file
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(asset_id) DO UPDATE SET
                        species_id = excluded.species_id,
                        realm = excluded.realm,
                        asset_kind = excluded.asset_kind,
                        title = excluded.title,
                        relative_path = excluded.relative_path,
                        file_size_bytes = excluded.file_size_bytes,
                        sha256 = excluded.sha256,
                        source_file = excluded.source_file
                    """,
                    (
                        asset["asset_id"], asset["species_id"], asset["realm"],
                        asset["asset_kind"], asset["title"], asset["relative_path"],
                        asset["mime_type"], asset["file_size_bytes"], asset["sha256"],
                        asset["source_file"],
                    ),
                )

            # Non-destructively seed canonical character review rows
            seeded_chars = seed_canonical_character_review_profiles(cur, now)

        summary = {
            "database": str(db_path),
            "source_json": str(json_path),
            "source_sha256": source_sha256,
            "total_records": len(records),
            "classifications": dict(sorted(classification_counts.items())),
            "families": len(family_meta),
            "angelic_choirs": choir_count,
            "witch_traditions": witch_trad_count,
            "practitioner_types": practitioner_count,
            "magical_disciplines": discipline_count,
            "supernatural_statuses": status_count,
            "wildlife_populations": wildlife_count,
            "assets_extracted": len(assets),
            "added_generated_citizen_columns": added_citizen_cols,
            "canonical_character_profiles_seeded": seeded_chars,
        }
        return summary
    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Import Meridion Species Registry into miraverse.db")
    parser.add_argument("--db", type=Path, default=DEFAULT_DB)
    parser.add_argument("--json", type=Path, default=DEFAULT_JSON)
    parser.add_argument("--html", type=Path, default=DEFAULT_HTML)
    args = parser.parse_args()

    result = import_species_registry(
        db_path=args.db,
        json_path=args.json,
        html_path=args.html,
        asset_dirs=[DEFAULT_PUBLIC_MEDIA, DEFAULT_WWWROOT_MEDIA],
    )
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
