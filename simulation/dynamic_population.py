"""Dynamic Population System for MiraverseOSx.

Extends the authoritative miraverse.db schema (preserving all canonical Characters
and sharing MaidRegistry / MaidSequences / MaidRetiredSerials) and integrates directly
with Mesa's PopulationModel using Faker, NumPy, NetworkX, and Pydantic.
"""
from __future__ import annotations

import copy
import json
import sqlite3
import uuid
from collections import Counter
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

import numpy as np
from faker import Faker
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

import npc_intelligence
import species_genetics

MAX_BATCH_SIZE = 250
MAX_PERSISTENT_GENERATED = 500
DEFAULT_DAILY_GENERATION_LIMIT = 5

NAMING_STYLES: tuple[str, ...] = (
    "mixed",
    "contemporary",
    "culturally_diverse",
    "realm_fictional",
)

RESIDENCY_TYPES: tuple[str, ...] = ("permanent", "visitor")
SIMULATION_DEPTHS: tuple[str, ...] = ("Minimal", "Standard", "Expanded")

EMPLOYMENT_STATUSES: tuple[str, ...] = (
    "employed",
    "self_employed",
    "freelance",
    "student",
    "unemployed",
    "retired",
    "homemaker",
)

# 12 everyday & creative occupational sectors with proportional generation weights (sum = 141)
SECTOR_WEIGHTS: dict[str, int] = {
    "retail_hospitality": 25,
    "entertainment_arts": 24,
    "business_services": 15,
    "transport_trades": 14,
    "healthcare_community": 12,
    "fashion_modeling": 12,
    "agriculture_conservation": 10,
    "education_students": 8,
    "media_communications": 7,
    "unemployed_retired_homemaker": 6,
    "government_public": 4,
    "engineering_tech": 4,
}

# Backward-compatible aliases for legacy/API callers
SECTOR_ALIASES: dict[str, str] = {
    "employment": "business_services",
    "education": "education_students",
    "entertainment": "entertainment_arts",
    "institutional": "government_public",
    "civic": "retail_hospitality",
}

DEMAND_SECTORS: tuple[str, ...] = tuple(SECTOR_WEIGHTS.keys())
ALL_ACCEPTED_SECTORS: tuple[str, ...] = (
    "mixed",
    *DEMAND_SECTORS,
    *SECTOR_ALIASES.keys(),
)

REALM_METADATA: tuple[dict[str, Any], ...] = (
    {
        "name": "Orynvell",
        "code": "OR",
        "capital": "Aureline",
        "districts": ("Glassline District", "Chancery Quarter", "Broad Street", "Vector Row", "Harborfront"),
        "target_permanent": 32,
        "target_visitors": 8,
        "abstract_bg": 485000,
        "fictional_first": ("Aurelia", "Caelen", "Soren", "Vesper", "Talia", "Maren", "Dorian", "Lysandra", "Corin", "Nadia"),
        "fictional_last": ("Valemont", "Harrow", "Mercer", "Kestrel", "Vane", "Solis", "Alder", "Sterling", "Quill", "Linden"),
    },
    {
        "name": "Brisland",
        "code": "BR",
        "capital": "Highmoor",
        "districts": ("Verdant Highlands", "Briarwood", "Oakridge", "Meadowgate"),
        "target_permanent": 25,
        "target_visitors": 3,
        "abstract_bg": 180000,
        "fictional_first": ("Rowan", "Maeve", "Gareth", "Fiona", "Cedric", "Clara", "Alistair", "Hazel", "Lachlan", "Briar"),
        "fictional_last": ("Thornfield", "Highmoor", "Ashworth", "Bramwell", "Greenwood", "Fairfax", "Hawthorne", "Oakhurst"),
    },
    {
        "name": "Fross",
        "code": "FR",
        "capital": "Frostmere",
        "districts": ("Glacial Reach", "Northwake Ward", "Rimegate", "Crystal Basin"),
        "target_permanent": 25,
        "target_visitors": 4,
        "abstract_bg": 195000,
        "fictional_first": ("Freya", "Torin", "Astrid", "Bram", "Signe", "Kael", "Ingrid", "Soren", "Eira", "Halvor"),
        "fictional_last": ("Evercrest", "Frostholm", "Norden", "Vinter", "Skald", "Lindholm", "Gale", "Rimewell"),
    },
    {
        "name": "Kaji",
        "code": "KA",
        "capital": "Balisya",
        "districts": ("Hearthlands", "Ember Forge", "Resonance Quarter", "Terrace Steps"),
        "target_permanent": 25,
        "target_visitors": 4,
        "abstract_bg": 175000,
        "fictional_first": ("Kenji", "Sora", "Ren", "Hana", "Daichi", "Yumi", "Kaito", "Mei", "Haruto", "Aoi"),
        "fictional_last": ("Takahashi", "Kuroda", "Mizuhara", "Aoki", "Shimizu", "Kagawa", "Fujimoto", "Hoshino"),
    },
    {
        "name": "Lumia",
        "code": "LU",
        "capital": "Lumen Spire",
        "districts": ("Starlight Quarter", "Helios Promenade", "Prism Terrace", "Solstice Row"),
        "target_permanent": 25,
        "target_visitors": 5,
        "abstract_bg": 240000,
        "fictional_first": ("Lucian", "Solene", "Cyrus", "Aurelie", "Orion", "Celeste", "Elio", "Lyra", "Cassian", "Seraphina"),
        "fictional_last": ("Lumenis", "Aurell", "Solstice", "Brighton", "Radiant", "Ciel", "Vespera", "Dawnbreak"),
    },
    {
        "name": "Marlowe",
        "code": "MA",
        "capital": "Marlowe Harbor",
        "districts": ("Tidal Springs", "Saltmarket", "Lantern Pier", "Cove Terrace"),
        "target_permanent": 25,
        "target_visitors": 5,
        "abstract_bg": 210000,
        "fictional_first": ("Marina", "Declan", "Nyla", "Ronan", "Cora", "Finn", "Sienna", "Callum", "Mireille", "Gideon"),
        "fictional_last": ("Tidewell", "Harbor", "Mariner", "Waverly", "Seabrook", "Coralson", "Bayside", "Morrow"),
    },
    {
        "name": "Ve’Raylia",
        "code": "VR",
        "capital": "Elmore Seat",
        "districts": ("Astral Promenade", "Sylvan Court", "Moonwell", "Grovewalk"),
        "target_permanent": 25,
        "target_visitors": 4,
        "abstract_bg": 190000,
        "fictional_first": ("Sylva", "Thalor", "Elarae", "Kaelen", "Liora", "Faelan", "Seren", "Valen", "Aelith", "Riven"),
        "fictional_last": ("Raylien", "Elmore", "Sylvanus", "Mooncrest", "Vaelor", "Starweaver", "Alderwood", "Veridian"),
    },
    {
        "name": "Nephele",
        "code": "NE",
        "capital": "Cloud-Spire",
        "districts": ("Aether Terrace", "Mistwalk", "Zephyr Heights", "Skybridge"),
        "target_permanent": 20,
        "target_visitors": 4,
        "abstract_bg": 205000,
        "fictional_first": ("Zephyr", "Nyx", "Caelum", "Iris", "Sable", "Elowen", "Orin", "Vela", "Theron", "Aria"),
        "fictional_last": ("Cloudspire", "Aetheris", "Windham", "Skye", "Vesperis", "Mistborne", "Stratos", "Galecrest"),
    },
)

REALM_BY_KEY: dict[str, dict[str, Any]] = {}
for _r in REALM_METADATA:
    REALM_BY_KEY[_r["name"].casefold()] = _r
    REALM_BY_KEY[_r["name"].replace("’", "'").casefold()] = _r
    REALM_BY_KEY[_r["code"].casefold()] = _r

DIVERSE_FIRST_NAMES: tuple[str, ...] = (
    "Amara", "Mateo", "Priya", "Tariq", "Mei-Ling", "Chidi", "Sofia", "Youssef",
    "Ananya", "Kofi", "Leila", "Diego", "Nadia", "Kenzo", "Zainab", "Rafael",
    "Hana", "Kwame", "Fatima", "Tomas", "Amina", "Seojun", "Ines", "Arjun",
    "Camila", "Idris", "Yuki", "Sadia", "Lucas", "Noor", "Rohan", "Chiara",
    "Tessa", "Malik", "Beatriz", "Darius", "Farah", "Henrik", "Kendra", "Samir",
)
DIVERSE_LAST_NAMES: tuple[str, ...] = (
    "Okafor", "Alvarez", "Patel", "Al-Mansoor", "Chen", "Mensah", "Rossi", "Haddad",
    "Nair", "Boateng", "Khoury", "Morales", "Benali", "Sato", "Diallo", "Silva",
    "Kim", "Adeyemi", "Farooq", "Herrera", "Toure", "Park", "Ferreira", "Desai",
    "Mendoza", "Bello", "Watanabe", "Rahman", "Costa", "Saleh", "Kulkarni", "Moretti",
    "Novak", "Lindqvist", "Bautista", "Osei", "Vargas", "Choudhury", "Kowalski", "Ibrahim",
)

# Tuple format: (occupation, employer, employment_status, schedule_preset, base_daily_salary, min_age, max_age, education_choices)
SECTOR_OCCUPATIONS: dict[str, tuple[tuple[str, str, str, str, float, int, int, tuple[str, ...]], ...]] = {
    "retail_hospitality": (
        ("Barista", "Broad Street Roasters", "employed", "Shift / Emergency Responder", 48.0, 18, 42, ("Secondary Civic Diploma", "Technical Guild Certification")),
        ("Baker", "Self-Employed", "self_employed", "Shift / Emergency Responder", 56.0, 21, 62, ("Secondary Civic Diploma", "Technical Guild Certification")),
        ("Chef", "Harborfront Kitchen", "employed", "Creative & Nightlife Cycle", 68.0, 22, 58, ("Technical Guild Certification", "Secondary Civic Diploma")),
        ("Server", "The Looking Glass", "employed", "Creative & Nightlife Cycle", 46.0, 18, 40, ("Secondary Civic Diploma",)),
        ("Cashier", "Broad Street Market", "employed", "Standard Civic Routine", 44.0, 18, 55, ("Secondary Civic Diploma",)),
        ("Receptionist", "Civic Commons Guild", "employed", "Standard Civic Routine", 52.0, 19, 58, ("Secondary Civic Diploma", "Bachelor of Applied Studies")),
        ("Florist", "Self-Employed", "self_employed", "Standard Civic Routine", 54.0, 20, 64, ("Secondary Civic Diploma", "Technical Guild Certification")),
        ("Shop Owner", "Self-Employed", "self_employed", "Standard Civic Routine", 72.0, 26, 65, ("Secondary Civic Diploma", "Bachelor of Applied Studies")),
    ),
    "entertainment_arts": (
        ("Singer", "Marlie Records", "freelance", "Creative & Nightlife Cycle", 64.0, 18, 42, ("Conservatory Diploma", "Secondary Civic Diploma")),
        ("Rapper", "Freelance", "freelance", "Creative & Nightlife Cycle", 60.0, 18, 38, ("Secondary Civic Diploma", "Conservatory Diploma")),
        ("Songwriter", "Kaji Publishing Studios", "freelance", "Creative & Nightlife Cycle", 66.0, 20, 50, ("Conservatory Diploma", "Bachelor of Applied Studies")),
        ("Instrumentalist", "The Looking Glass", "freelance", "Creative & Nightlife Cycle", 62.0, 19, 55, ("Conservatory Diploma", "Secondary Civic Diploma")),
        ("Dancer", "Femme Fatale Dance Company", "employed", "Creative & Nightlife Cycle", 65.0, 18, 36, ("Conservatory Diploma", "Secondary Civic Diploma")),
        ("Choreographer", "Wonder-Wind Dance Company", "employed", "Creative & Nightlife Cycle", 74.0, 24, 48, ("Conservatory Diploma", "Bachelor of Applied Studies")),
        ("Actor", "The Marigold Theatre", "freelance", "Creative & Nightlife Cycle", 68.0, 19, 56, ("Conservatory Diploma", "Bachelor of Applied Studies")),
        ("DJ", "Freelance", "freelance", "Creative & Nightlife Cycle", 60.0, 19, 42, ("Secondary Civic Diploma", "Technical Guild Certification")),
        ("Music Producer", "Kaji Publishing Studios", "employed", "Creative & Nightlife Cycle", 78.0, 23, 52, ("Technical Guild Certification", "Conservatory Diploma")),
        ("Director", "Mirrora Studios", "employed", "Creative & Nightlife Cycle", 82.0, 27, 58, ("Bachelor of Applied Studies", "Conservatory Diploma")),
        ("Photographer", "The Rosemont Portrait House", "freelance", "Creative & Nightlife Cycle", 64.0, 20, 54, ("Technical Guild Certification", "Bachelor of Applied Studies")),
        ("Sound Engineer", "Lunerum Dist", "employed", "Creative & Nightlife Cycle", 76.0, 22, 54, ("Technical Guild Certification", "Bachelor of Applied Studies")),
        ("Stage Technician", "Silverleaf Stadium", "employed", "Shift / Emergency Responder", 66.0, 20, 56, ("Technical Guild Certification", "Secondary Civic Diploma")),
        ("Talent Agent", "Second Act Management", "employed", "Standard Civic Routine", 78.0, 25, 55, ("Bachelor of Applied Studies",)),
        ("Publicist", "Word of Mouth Publicity", "employed", "Standard Civic Routine", 74.0, 23, 52, ("Bachelor of Applied Studies",)),
    ),
    "business_services": (
        ("Accountant", "First Federal Commerce", "employed", "Standard Civic Routine", 82.0, 24, 62, ("Bachelor of Applied Studies", "Master of Civic Sciences")),
        ("Administrative Assistant", "WORKNET Regional Exchange", "employed", "Standard Civic Routine", 56.0, 19, 58, ("Secondary Civic Diploma", "Bachelor of Applied Studies")),
        ("Bookkeeper", "Self-Employed", "self_employed", "Standard Civic Routine", 64.0, 23, 62, ("Technical Guild Certification", "Bachelor of Applied Studies")),
        ("Independent Consultant", "Freelance", "freelance", "Standard Civic Routine", 76.0, 26, 60, ("Bachelor of Applied Studies", "Master of Civic Sciences")),
        ("Event Coordinator", "Velvet Curtain Productions", "employed", "Standard Civic Routine", 68.0, 22, 50, ("Bachelor of Applied Studies", "Secondary Civic Diploma")),
        ("Operations Clerk", "Meridion Post", "employed", "Standard Civic Routine", 58.0, 20, 58, ("Secondary Civic Diploma", "Technical Guild Certification")),
    ),
    "transport_trades": (
        ("Mechanic", "Self-Employed", "self_employed", "Standard Civic Routine", 66.0, 20, 62, ("Technical Guild Certification", "Secondary Civic Diploma")),
        ("Electrician", "Aureline Utilities Board", "employed", "Shift / Emergency Responder", 72.0, 21, 60, ("Technical Guild Certification",)),
        ("Carpenter", "Self-Employed", "self_employed", "Standard Civic Routine", 66.0, 21, 62, ("Technical Guild Certification", "Secondary Civic Diploma")),
        ("Transit Operator", "Aureline Rail Authority", "employed", "Shift / Emergency Responder", 64.0, 22, 62, ("Secondary Civic Diploma", "Technical Guild Certification")),
        ("Courier", "Meridion Post", "employed", "Shift / Emergency Responder", 52.0, 18, 48, ("Secondary Civic Diploma",)),
        ("Maintenance Technician", "Silverleaf Stadium", "employed", "Shift / Emergency Responder", 62.0, 20, 58, ("Technical Guild Certification",)),
    ),
    "healthcare_community": (
        ("Clinical Nurse", "Faith Medical Group", "employed", "Shift / Emergency Responder", 78.0, 23, 60, ("Bachelor of Applied Studies", "Technical Guild Certification")),
        ("Pharmacist", "Faith Medical Group", "employed", "Standard Civic Routine", 84.0, 26, 62, ("Master of Civic Sciences", "Bachelor of Applied Studies")),
        ("Childcare Worker", "Civic Commons Guild", "employed", "Standard Civic Routine", 52.0, 19, 55, ("Secondary Civic Diploma", "Technical Guild Certification")),
        ("Community Librarian", "Royal Archive & Library", "employed", "Standard Civic Routine", 60.0, 23, 62, ("Bachelor of Applied Studies",)),
        ("Community Care Aide", "Faith Medical Group", "employed", "Shift / Emergency Responder", 56.0, 20, 56, ("Secondary Civic Diploma", "Technical Guild Certification")),
    ),
    "fashion_modeling": (
        ("Model", "Willow Whisper Models", "freelance", "Creative & Nightlife Cycle", 66.0, 18, 34, ("Secondary Civic Diploma", "Conservatory Diploma")),
        ("Fashion Designer", "Glassline Designs", "employed", "Creative & Nightlife Cycle", 78.0, 23, 52, ("Conservatory Diploma", "Bachelor of Applied Studies")),
        ("Wardrobe Stylist", "Glassline Designs", "freelance", "Creative & Nightlife Cycle", 68.0, 21, 48, ("Conservatory Diploma", "Technical Guild Certification")),
        ("Tailor", "Self-Employed", "self_employed", "Standard Civic Routine", 62.0, 22, 64, ("Technical Guild Certification", "Secondary Civic Diploma")),
        ("Makeup Artist", "Amrielle", "freelance", "Creative & Nightlife Cycle", 62.0, 19, 46, ("Technical Guild Certification", "Secondary Civic Diploma")),
        ("Hairstylist", "Self-Employed", "self_employed", "Standard Civic Routine", 58.0, 19, 54, ("Technical Guild Certification", "Secondary Civic Diploma")),
        ("Boutique Associate", "Glassline Designs", "employed", "Standard Civic Routine", 48.0, 18, 42, ("Secondary Civic Diploma",)),
        ("Fashion Photographer", "The Rosemont Portrait House", "freelance", "Creative & Nightlife Cycle", 70.0, 21, 50, ("Technical Guild Certification", "Bachelor of Applied Studies")),
    ),
    "agriculture_conservation": (
        ("Farmer", "Self-Employed", "self_employed", "Standard Civic Routine", 60.0, 20, 64, ("Secondary Civic Diploma", "Technical Guild Certification")),
        ("Gardener", "Self-Employed", "self_employed", "Standard Civic Routine", 52.0, 18, 62, ("Secondary Civic Diploma",)),
        ("Botanical Conservator", "Arcadia Reserve", "employed", "Standard Civic Routine", 64.0, 23, 60, ("Bachelor of Applied Studies", "Technical Guild Certification")),
        ("Orchard Keeper", "Self-Employed", "self_employed", "Standard Civic Routine", 58.0, 22, 64, ("Secondary Civic Diploma", "Technical Guild Certification")),
        ("Coastal Fisher", "Self-Employed", "self_employed", "Shift / Emergency Responder", 56.0, 19, 60, ("Secondary Civic Diploma",)),
    ),
    "education_students": (
        ("Undergraduate Student", "Cyberium Academy", "student", "Academic & Campus Schedule", 18.0, 18, 24, ("Secondary Civic Diploma",)),
        ("Conservatory Student", "Lumia Conservatory", "student", "Academic & Campus Schedule", 18.0, 18, 25, ("Secondary Civic Diploma",)),
        ("Teaching Assistant", "Cyberium Academy", "employed", "Academic & Campus Schedule", 46.0, 22, 32, ("Bachelor of Applied Studies",)),
        ("Primary School Teacher", "Civic Commons Guild", "employed", "Academic & Campus Schedule", 62.0, 24, 58, ("Bachelor of Applied Studies",)),
        ("Archival Apprentice", "Royal Archive & Library", "employed", "Academic & Campus Schedule", 48.0, 20, 30, ("Bachelor of Applied Studies", "Secondary Civic Diploma")),
    ),
    "media_communications": (
        ("Staff Reporter", "The Meridian", "employed", "Standard Civic Routine", 68.0, 22, 52, ("Bachelor of Applied Studies",)),
        ("Editorial Assistant", "Limelight", "employed", "Creative & Nightlife Cycle", 58.0, 20, 40, ("Bachelor of Applied Studies", "Secondary Civic Diploma")),
        ("Radio Host", "Pop Sticker Radio", "employed", "Creative & Nightlife Cycle", 70.0, 22, 48, ("Bachelor of Applied Studies", "Conservatory Diploma")),
        ("Broadcast Technician", "Pop Sticker Radio", "employed", "Shift / Emergency Responder", 66.0, 21, 54, ("Technical Guild Certification",)),
        ("Content Producer", "Songbird", "employed", "Creative & Nightlife Cycle", 72.0, 22, 46, ("Bachelor of Applied Studies",)),
    ),
    "unemployed_retired_homemaker": (
        ("Job Seeker", "", "unemployed", "Standard Civic Routine", 0.0, 19, 55, ("Secondary Civic Diploma", "Technical Guild Certification", "Bachelor of Applied Studies")),
        ("Retired Resident", "", "retired", "Standard Civic Routine", 28.0, 65, 84, ("Secondary Civic Diploma", "Technical Guild Certification", "Bachelor of Applied Studies")),
        ("Homemaker", "", "homemaker", "Standard Civic Routine", 0.0, 22, 62, ("Secondary Civic Diploma", "Bachelor of Applied Studies")),
    ),
    "government_public": (
        ("Records Clerk", "Civic Registry Bureau", "employed", "Institutional / Chancery Hours", 62.0, 21, 60, ("Secondary Civic Diploma", "Bachelor of Applied Studies")),
        ("Postal Clerk", "Meridion Post", "employed", "Institutional / Chancery Hours", 56.0, 19, 58, ("Secondary Civic Diploma",)),
        ("Municipal Inspector", "Civic Registry Bureau", "employed", "Institutional / Chancery Hours", 68.0, 25, 60, ("Technical Guild Certification", "Bachelor of Applied Studies")),
    ),
    "engineering_tech": (
        ("Hardware Repair Technician", "Self-Employed", "self_employed", "Standard Civic Routine", 68.0, 20, 56, ("Technical Guild Certification",)),
        ("Network Installer", "Aureline Utilities Board", "employed", "Shift / Emergency Responder", 70.0, 21, 52, ("Technical Guild Certification", "Bachelor of Applied Studies")),
        ("Systems Support Analyst", "WORKNET Regional Exchange", "employed", "Standard Civic Routine", 74.0, 23, 54, ("Bachelor of Applied Studies", "Technical Guild Certification")),
    ),
}

# Flat index of all occupations for Menu Option 6 (Generate by occupation)
ALL_OCCUPATIONS: dict[str, tuple[str, tuple[str, str, str, str, float, int, int, tuple[str, ...]]]] = {}
for _sec, _items in SECTOR_OCCUPATIONS.items():
    for _item in _items:
        ALL_OCCUPATIONS[_item[0].casefold()] = (_sec, _item)

ALMA_MATERS: tuple[str, ...] = (
    "Cyberium Academy",
    "Lumia Conservatory",
    "Aureline Technical Institute",
    "Marlowe Maritime College",
    "Highmoor Civic College",
    "Balisya Resonance School",
    "Cloud-Spire Lyceum",
    "Elmore Naturalist Academy",
)

INTEREST_POOL: tuple[str, ...] = (
    "music", "astronomy", "archival reading", "harbor walking", "theatre",
    "synth design", "civic debate", "cooking", "gardening", "photography",
    "ceramic craft", "tea brewing", "urban cycling", "acoustic folk", "fashion history",
    "botany", "chess", "public transit design", "cinema", "calligraphy",
    "baking", "street fashion", "live concerts", "woodworking", "podcasts",
)

GOAL_KINDS: tuple[dict[str, Any], ...] = (
    {"kind": "career_growth", "label": "Grow career craft and financial stability"},
    {"kind": "creative_mastery", "label": "Build an independent creative portfolio"},
    {"kind": "social_connection", "label": "Deepen neighborhood and community ties"},
    {"kind": "wellbeing", "label": "Maintain a healthy and balanced daily rhythm"},
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def resolve_realm(realm: str | None) -> dict[str, Any] | None:
    if not realm:
        return None
    return REALM_BY_KEY.get(str(realm).strip().casefold())


def normalize_sector(sector: str | None) -> str:
    raw = str(sector or "mixed").strip().casefold()
    if raw == "mixed":
        return "mixed"
    if raw in SECTOR_WEIGHTS:
        return raw
    if raw in SECTOR_ALIASES:
        return SECTOR_ALIASES[raw]
    raise ValueError(f"Unknown occupational sector: {sector!r}")


def life_stage_for_age(age: int) -> str:
    if age < 13:
        return "Child"
    if age < 18:
        return "Adolescent"
    if age < 65:
        return "Adult"
    return "Elder"


# ---------------------------------------------------------------------------
# Pydantic v2 Schemas & Validation
# ---------------------------------------------------------------------------

class GeneratedCitizenRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")

    characterId: str = Field(min_length=6, max_length=64)
    maid: str = Field(min_length=10, max_length=32)
    name: str = Field(min_length=2, max_length=120)
    firstName: str = Field(min_length=1, max_length=60)
    lastName: str = Field(min_length=1, max_length=60)
    namingStyle: Literal["contemporary", "culturally_diverse", "realm_fictional"]
    gender: Literal["Female", "Male", "Non-binary"]
    age: int = Field(ge=18, le=95)
    lifeStage: Literal["Adult", "Elder"]
    residencyType: Literal["permanent", "visitor"] = "permanent"
    simulationDepth: Literal["Minimal", "Standard", "Expanded"] = "Standard"
    homeRealm: str = Field(min_length=2, max_length=64)
    currentRealm: str = Field(min_length=2, max_length=64)
    residence: str = Field(min_length=4, max_length=200)
    occupation: str = Field(min_length=2, max_length=120)
    employmentStatus: Literal[
        "employed", "self_employed", "freelance", "student", "unemployed", "retired", "homemaker"
    ] = "employed"
    employer: str = Field(default="", max_length=160)
    sector: str = Field(min_length=2, max_length=64)
    educationLevel: str = Field(min_length=2, max_length=120)
    almaMater: str = Field(min_length=2, max_length=120)
    schedulePreset: str = Field(min_length=2, max_length=100)
    initialBalance: float = Field(ge=0.0, le=1e9)
    salary: float = Field(ge=0.0, le=1e6)
    personality: dict[str, float]
    interests: list[str] = Field(min_length=1, max_length=8)
    goals: list[dict[str, Any]] = Field(min_length=1, max_length=5)
    backgroundHistory: str = Field(min_length=10, max_length=500)
    relationships: list[dict[str, Any]] = Field(default_factory=list, max_length=10)
    demandReason: str = Field(default="manual", max_length=120)
    batchId: str = Field(default="", max_length=80)
    seed: int | None = None
    simDayCreated: int = Field(default=0, ge=0)
    canonical: Literal[False] = False
    status: Literal["active", "departed", "archived"] = "active"
    speciesId: str | None = None
    primaryAffinity: str | None = None
    regionalLineage: str | None = None
    genetics: dict[str, Any] | None = None
    manifestedAbilities: dict[str, Any] | None = None

    @field_validator("homeRealm", "currentRealm")
    @classmethod
    def _validate_realm(cls, v: str) -> str:
        resolved = resolve_realm(v)
        if resolved is None:
            raise ValueError(f"Unknown canonical realm: {v!r}")
        return str(resolved["name"])

    @field_validator("sector")
    @classmethod
    def _validate_sector(cls, v: str) -> str:
        norm = normalize_sector(v)
        if norm == "mixed":
            raise ValueError("GeneratedCitizenRecord.sector must be a concrete sector")
        return norm

    @model_validator(mode="after")
    def _check_demographics(self) -> "GeneratedCitizenRecord":
        expected = life_stage_for_age(self.age)
        if self.lifeStage != expected:
            raise ValueError(f"lifeStage {self.lifeStage!r} inconsistent with age {self.age} (expected {expected!r})")
        if self.employmentStatus == "retired" and self.age < 60:
            raise ValueError(f"Retired citizen age {self.age} must be >= 60")
        if self.employmentStatus in ("unemployed", "retired", "homemaker") and self.employer.strip():
            raise ValueError(f"Employment status {self.employmentStatus!r} should not have a forced employer")
        for trait in npc_intelligence.PERSONALITY_TRAITS:
            val = float(self.personality.get(trait, -1.0))
            if not (0.0 <= val <= 1.0):
                raise ValueError(f"personality trait {trait!r} out of [0, 1]: {val}")
        return self


class PopulationBatchRequest(BaseModel):
    model_config = ConfigDict(extra="allow")
    count: int = Field(default=5, ge=1, le=MAX_BATCH_SIZE)
    realm: str | None = Field(default=None, max_length=64)
    residencyType: Literal["permanent", "visitor"] = "permanent"
    namingStyle: Literal["mixed", "contemporary", "culturally_diverse", "realm_fictional"] = "mixed"
    sector: str = Field(default="mixed", max_length=64)
    occupation: str | None = Field(default=None, max_length=120)
    simulationDepth: Literal["Minimal", "Standard", "Expanded"] = "Standard"
    seed: int | None = None
    authorizedSeeding: bool = False
    triggerKind: Literal[
        "manual",
        "initial_seeding",
        "demand_employment",
        "demand_education",
        "demand_entertainment",
        "demand_institutional",
        "migration",
    ] = "manual"
    demandReason: str = Field(default="manual", max_length=120)

    @field_validator("sector")
    @classmethod
    def _norm_sector(cls, v: str) -> str:
        return normalize_sector(v)


class DemandFulfillmentRequest(BaseModel):
    model_config = ConfigDict(extra="allow")
    sector: str = Field(min_length=2, max_length=64)
    neededCount: int = Field(default=2, ge=1, le=20)
    realm: str | None = Field(default=None, max_length=64)
    role: str | None = Field(default=None, max_length=120)
    employer: str | None = Field(default=None, max_length=160)
    residencyType: Literal["permanent", "visitor"] = "permanent"
    namingStyle: Literal["mixed", "contemporary", "culturally_diverse", "realm_fictional"] = "mixed"
    simulationDepth: Literal["Minimal", "Standard", "Expanded"] = "Standard"
    commitToDb: bool = True
    seed: int | None = None

    @field_validator("sector")
    @classmethod
    def _norm_sector(cls, v: str) -> str:
        norm = normalize_sector(v)
        if norm == "mixed":
            raise ValueError("DemandFulfillmentRequest.sector must be a concrete sector")
        return norm


class RealmConfigUpdatePayload(BaseModel):
    model_config = ConfigDict(extra="allow")
    realmName: str = Field(min_length=2, max_length=64)
    targetPermanent: int | None = Field(default=None, ge=0, le=500)
    targetVisitors: int | None = Field(default=None, ge=0, le=200)
    abstractBackgroundPopulation: int | None = Field(default=None, ge=0, le=100_000_000)
    maxGenerationPerDay: int | None = Field(default=None, ge=0, le=100)
    allowInMigration: bool | None = None
    allowOutMigration: bool | None = None
    ageMin: int | None = Field(default=None, ge=18, le=80)
    ageMax: int | None = Field(default=None, ge=18, le=95)


# ---------------------------------------------------------------------------
# Database Schema & Authoritative MAID Allocation
# ---------------------------------------------------------------------------

def ensure_population_schema(conn: sqlite3.Connection) -> None:
    """Idempotently create additive dynamic population tables without touching canonical Characters."""
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS MaidRegistry (
            Maid TEXT PRIMARY KEY,
            RegionCode TEXT NOT NULL,
            SerialNumber INTEGER NOT NULL,
            CharacterId TEXT,
            Status TEXT NOT NULL DEFAULT 'active',
            IssuedAt TEXT NOT NULL,
            RetiredAt TEXT,
            Notes TEXT
        );
        CREATE UNIQUE INDEX IF NOT EXISTS UX_MaidRegistry_Normalized
            ON MaidRegistry(UPPER(TRIM(Maid)));
        CREATE INDEX IF NOT EXISTS IX_MaidRegistry_RegionSerial
            ON MaidRegistry(RegionCode, SerialNumber);

        CREATE TABLE IF NOT EXISTS MaidSequences (
            RegionCode TEXT PRIMARY KEY,
            NextSerial INTEGER NOT NULL,
            UpdatedAt TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS MaidRetiredSerials (
            SerialNumber INTEGER PRIMARY KEY,
            Maid TEXT,
            Reason TEXT NOT NULL,
            RetiredAt TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS GeneratedCitizens (
            CharacterId TEXT PRIMARY KEY,
            Maid TEXT NOT NULL UNIQUE,
            Name TEXT NOT NULL,
            FirstName TEXT NOT NULL,
            LastName TEXT NOT NULL,
            NamingStyle TEXT NOT NULL,
            Gender TEXT NOT NULL,
            Age INTEGER NOT NULL,
            LifeStage TEXT NOT NULL,
            ResidencyType TEXT NOT NULL DEFAULT 'permanent',
            SimulationDepth TEXT NOT NULL DEFAULT 'Standard',
            HomeRealm TEXT NOT NULL,
            CurrentRealm TEXT NOT NULL,
            Residence TEXT NOT NULL,
            Occupation TEXT NOT NULL,
            Employer TEXT NOT NULL DEFAULT '',
            Sector TEXT NOT NULL,
            EducationLevel TEXT NOT NULL,
            AlmaMater TEXT NOT NULL,
            SchedulePreset TEXT NOT NULL,
            InitialBalance REAL NOT NULL DEFAULT 250.0,
            Salary REAL NOT NULL DEFAULT 0.0,
            PersonalityJson TEXT NOT NULL,
            InterestsJson TEXT NOT NULL,
            GoalsJson TEXT NOT NULL,
            BackgroundHistory TEXT NOT NULL,
            RelationshipsJson TEXT NOT NULL DEFAULT '[]',
            DemandReason TEXT NOT NULL DEFAULT 'manual',
            BatchId TEXT,
            Seed INTEGER,
            Canonical INTEGER NOT NULL DEFAULT 0 CHECK (Canonical = 0),
            Status TEXT NOT NULL DEFAULT 'active',
            CreatedAt TEXT NOT NULL,
            UpdatedAt TEXT NOT NULL,
            FOREIGN KEY (Maid) REFERENCES MaidRegistry(Maid)
        );
        CREATE INDEX IF NOT EXISTS IX_GeneratedCitizens_RealmStatus
            ON GeneratedCitizens(CurrentRealm, Status, ResidencyType);
        CREATE INDEX IF NOT EXISTS IX_GeneratedCitizens_Sector
            ON GeneratedCitizens(Sector, Status);

        CREATE TABLE IF NOT EXISTS PopulationRealmConfig (
            RealmName TEXT PRIMARY KEY,
            RegionCode TEXT NOT NULL UNIQUE,
            TargetPermanent INTEGER NOT NULL,
            TargetVisitors INTEGER NOT NULL,
            AbstractBackgroundPopulation INTEGER NOT NULL,
            MaxGenerationPerDay INTEGER NOT NULL DEFAULT 5,
            AllowInMigration INTEGER NOT NULL DEFAULT 1,
            AllowOutMigration INTEGER NOT NULL DEFAULT 1,
            AgeMin INTEGER NOT NULL DEFAULT 18,
            AgeMax INTEGER NOT NULL DEFAULT 84,
            UpdatedAt TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS PopulationGenerationLog (
            BatchId TEXT PRIMARY KEY,
            TriggerKind TEXT NOT NULL,
            Realm TEXT,
            RequestedCount INTEGER NOT NULL,
            ExistingEligibleCount INTEGER NOT NULL DEFAULT 0,
            GeneratedCount INTEGER NOT NULL,
            ResidencyType TEXT NOT NULL DEFAULT 'permanent',
            DemandDetailsJson TEXT NOT NULL DEFAULT '{}',
            Seed INTEGER,
            CommittedToDb INTEGER NOT NULL DEFAULT 1,
            CreatedAt TEXT NOT NULL
        );
        """
    )
    # Additive non-destructive columns on existing GeneratedCitizens tables
    existing_cols = {
        r[1] for r in conn.execute("PRAGMA table_info(GeneratedCitizens)").fetchall()
    }
    if "EmploymentStatus" not in existing_cols:
        conn.execute(
            "ALTER TABLE GeneratedCitizens ADD COLUMN EmploymentStatus TEXT NOT NULL DEFAULT 'employed'"
        )
    if "SimDayCreated" not in existing_cols:
        conn.execute(
            "ALTER TABLE GeneratedCitizens ADD COLUMN SimDayCreated INTEGER NOT NULL DEFAULT 0"
        )

    now = _now_iso()
    for realm in REALM_METADATA:
        conn.execute(
            """
            INSERT OR IGNORE INTO MaidSequences (RegionCode, NextSerial, UpdatedAt)
            VALUES (?, 481990, ?)
            """,
            (realm["code"], now),
        )
        conn.execute(
            """
            INSERT OR IGNORE INTO PopulationRealmConfig (
                RealmName, RegionCode, TargetPermanent, TargetVisitors,
                AbstractBackgroundPopulation, MaxGenerationPerDay,
                AllowInMigration, AllowOutMigration, AgeMin, AgeMax, UpdatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, 1, 1, 18, 84, ?)
            """,
            (
                realm["name"],
                realm["code"],
                realm["target_permanent"],
                realm["target_visitors"],
                realm["abstract_bg"],
                DEFAULT_DAILY_GENERATION_LIMIT,
                now,
            ),
        )


def allocate_next_maid(
    conn: sqlite3.Connection,
    region_code: str,
    character_id: str,
    *,
    notes: str = "",
) -> str:
    """Atomically allocate the next globally unique, non-retired MAID using MaidSequences & MaidRegistry."""
    code = region_code.upper().strip()
    row = conn.execute(
        "SELECT NextSerial FROM MaidSequences WHERE RegionCode = ?", (code,)
    ).fetchone()
    serial = int(row[0]) if row else 481990
    retired = {
        int(r[0]) for r in conn.execute("SELECT SerialNumber FROM MaidRetiredSerials").fetchall()
    }
    used_serials = {
        int(r[0]) for r in conn.execute("SELECT SerialNumber FROM MaidRegistry").fetchall()
    }
    has_chars = bool(
        conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='Characters'"
        ).fetchone()
    )
    while True:
        if serial in retired or serial in used_serials:
            serial += 1
            continue
        maid = f"MAID-{code}-{serial:08d}"
        if conn.execute(
            "SELECT 1 FROM MaidRegistry WHERE UPPER(TRIM(Maid)) = ?", (maid,)
        ).fetchone():
            serial += 1
            continue
        if has_chars and conn.execute(
            "SELECT 1 FROM Characters WHERE UPPER(TRIM(Maid)) = ?", (maid,)
        ).fetchone():
            serial += 1
            continue
        break

    now = _now_iso()
    conn.execute(
        """
        INSERT INTO MaidRegistry (Maid, RegionCode, SerialNumber, CharacterId, Status, IssuedAt, Notes)
        VALUES (?, ?, ?, NULL, 'active', ?, ?)
        """,
        (maid, code, serial, now, notes or f"Generated citizen: {character_id}"),
    )
    conn.execute(
        """
        INSERT INTO MaidSequences (RegionCode, NextSerial, UpdatedAt)
        VALUES (?, ?, ?)
        ON CONFLICT(RegionCode) DO UPDATE SET
            NextSerial = MAX(NextSerial, excluded.NextSerial),
            UpdatedAt = excluded.UpdatedAt
        """,
        (code, serial + 1, now),
    )
    return maid


def load_realm_configs(database: Path) -> dict[str, dict[str, Any]]:
    if not Path(database).is_file():
        return {
            r["name"]: {
                "realmName": r["name"],
                "regionCode": r["code"],
                "targetPermanent": r["target_permanent"],
                "targetVisitors": r["target_visitors"],
                "abstractBackgroundPopulation": r["abstract_bg"],
                "maxGenerationPerDay": DEFAULT_DAILY_GENERATION_LIMIT,
                "allowInMigration": True,
                "allowOutMigration": True,
                "ageMin": 18,
                "ageMax": 84,
            }
            for r in REALM_METADATA
        }
    with closing(sqlite3.connect(database)) as conn:
        conn.row_factory = sqlite3.Row
        ensure_population_schema(conn)
        conn.commit()
        rows = conn.execute(
            "SELECT * FROM PopulationRealmConfig ORDER BY RealmName"
        ).fetchall()
    return {
        row["RealmName"]: {
            "realmName": row["RealmName"],
            "regionCode": row["RegionCode"],
            "targetPermanent": int(row["TargetPermanent"]),
            "targetVisitors": int(row["TargetVisitors"]),
            "abstractBackgroundPopulation": int(row["AbstractBackgroundPopulation"]),
            "maxGenerationPerDay": int(row["MaxGenerationPerDay"]),
            "allowInMigration": bool(row["AllowInMigration"]),
            "allowOutMigration": bool(row["AllowOutMigration"]),
            "ageMin": int(row["AgeMin"]),
            "ageMax": int(row["AgeMax"]),
            "updatedAt": row["UpdatedAt"],
        }
        for row in rows
    }


def update_realm_config(database: Path, payload: RealmConfigUpdatePayload) -> dict[str, Any]:
    resolved = resolve_realm(payload.realmName)
    if resolved is None:
        raise ValueError(f"Unknown canonical realm: {payload.realmName!r}")
    realm_name = resolved["name"]
    with closing(sqlite3.connect(database)) as conn:
        conn.row_factory = sqlite3.Row
        ensure_population_schema(conn)
        current = dict(
            conn.execute(
                "SELECT * FROM PopulationRealmConfig WHERE RealmName = ?", (realm_name,)
            ).fetchone()
        )
        age_min = payload.ageMin if payload.ageMin is not None else int(current["AgeMin"])
        age_max = payload.ageMax if payload.ageMax is not None else int(current["AgeMax"])
        if age_min > age_max:
            raise ValueError("ageMin cannot exceed ageMax")
        conn.execute(
            """
            UPDATE PopulationRealmConfig SET
                TargetPermanent = ?,
                TargetVisitors = ?,
                AbstractBackgroundPopulation = ?,
                MaxGenerationPerDay = ?,
                AllowInMigration = ?,
                AllowOutMigration = ?,
                AgeMin = ?,
                AgeMax = ?,
                UpdatedAt = ?
            WHERE RealmName = ?
            """,
            (
                payload.targetPermanent if payload.targetPermanent is not None else int(current["TargetPermanent"]),
                payload.targetVisitors if payload.targetVisitors is not None else int(current["TargetVisitors"]),
                payload.abstractBackgroundPopulation if payload.abstractBackgroundPopulation is not None else int(current["AbstractBackgroundPopulation"]),
                payload.maxGenerationPerDay if payload.maxGenerationPerDay is not None else int(current["MaxGenerationPerDay"]),
                int(payload.allowInMigration) if payload.allowInMigration is not None else int(current["AllowInMigration"]),
                int(payload.allowOutMigration) if payload.allowOutMigration is not None else int(current["AllowOutMigration"]),
                age_min,
                age_max,
                _now_iso(),
                realm_name,
            ),
        )
        conn.commit()
    return load_realm_configs(database)[realm_name]


def generated_row_to_character_dict(row: dict[str, Any]) -> dict[str, Any]:
    """Convert a GeneratedCitizens DB row (or GeneratedCitizenRecord dict) into a Citizen()-compatible dict."""
    personality = (
        json.loads(row["PersonalityJson"])
        if isinstance(row.get("PersonalityJson"), str)
        else (row.get("personality") or {})
    )
    interests = (
        json.loads(row["InterestsJson"])
        if isinstance(row.get("InterestsJson"), str)
        else (row.get("interests") or [])
    )
    goals = (
        json.loads(row["GoalsJson"])
        if isinstance(row.get("GoalsJson"), str)
        else (row.get("goals") or [])
    )
    relationships = (
        json.loads(row["RelationshipsJson"])
        if isinstance(row.get("RelationshipsJson"), str)
        else (row.get("relationships") or [])
    )
    cid = row.get("CharacterId") or row.get("characterId")
    maid = row.get("Maid") or row.get("maid")
    name = row.get("Name") or row.get("name")
    first_name = row.get("FirstName") or row.get("firstName") or ""
    last_name = row.get("LastName") or row.get("lastName") or ""
    occupation = row.get("Occupation") or row.get("occupation") or "Resident"
    employer = row.get("Employer") if row.get("Employer") is not None else (row.get("employer") or "")
    employment_status = row.get("EmploymentStatus") or row.get("employmentStatus") or "employed"
    home_realm = row.get("HomeRealm") or row.get("homeRealm") or "Orynvell"
    current_realm = row.get("CurrentRealm") or row.get("currentRealm") or home_realm
    residence = row.get("Residence") or row.get("residence") or current_realm
    age = int(row.get("Age") or row.get("age") or 28)
    schedule_preset = row.get("SchedulePreset") or row.get("schedulePreset") or "Standard Civic Routine"
    education_level = row.get("EducationLevel") or row.get("educationLevel") or ""
    alma_mater = row.get("AlmaMater") or row.get("almaMater") or ""
    residency_type = row.get("ResidencyType") or row.get("residencyType") or "permanent"
    simulation_depth = row.get("SimulationDepth") or row.get("simulationDepth") or "Standard"
    naming_style = row.get("NamingStyle") or row.get("namingStyle") or "contemporary"
    sector = row.get("Sector") or row.get("sector") or "retail_hospitality"
    background = row.get("BackgroundHistory") or row.get("backgroundHistory") or ""
    initial_balance = float(row.get("InitialBalance") if row.get("InitialBalance") is not None else row.get("initialBalance", 250.0))
    salary = float(row.get("Salary") if row.get("Salary") is not None else row.get("salary", 0.0))

    rel_descriptions = [
        f"{r.get('kind', 'acquaintance')}: {r.get('targetName', '')}"
        for r in relationships
        if r.get("targetName")
    ]

    return {
        "CharacterId": cid,
        "Name": name,
        "FirstName": first_name,
        "LastName": last_name,
        "Kind": "person",
        "Status": "generated",
        "Maid": maid,
        "Occupation": occupation,
        "HomeRealm": home_realm,
        "origin": "dynamic-population",
        "canonical": False,
        "db_aliases": [],
        "generated_meta": {
            "maid": maid,
            "namingStyle": naming_style,
            "gender": row.get("Gender") or row.get("gender") or "Non-binary",
            "age": age,
            "lifeStage": row.get("LifeStage") or row.get("lifeStage") or life_stage_for_age(age),
            "residencyType": residency_type,
            "simulationDepth": simulation_depth,
            "homeRealm": home_realm,
            "currentRealm": current_realm,
            "sector": sector,
            "employmentStatus": employment_status,
            "educationLevel": education_level,
            "almaMater": alma_mater,
            "initialBalance": initial_balance,
            "salary": salary,
            "personality": personality,
            "goals": goals,
            "backgroundHistory": background,
            "relationships": relationships,
            "demandReason": row.get("DemandReason") or row.get("demandReason") or "manual",
            "batchId": row.get("BatchId") or row.get("batchId") or "",
        },
        "profiles": [
            {
                "collection": "NPCS",
                "context": "dynamic-population",
                "data": {
                    "role": occupation,
                    "title": occupation,
                    "realm": current_realm,
                    "home_realm": home_realm,
                    "affiliation": employer,
                    "maid": maid,
                    "hobbies": interests,
                    "education": f"{education_level}, {alma_mater}" if alma_mater else education_level,
                    "background": background,
                    "relationships": rel_descriptions,
                    "residency_type": residency_type,
                    "employment_status": employment_status,
                    "simulation_depth": simulation_depth,
                },
            },
            {
                "collection": "defaultInputs",
                "context": "dynamic-population",
                "data": {
                    "occupation": occupation,
                    "affiliation": employer,
                    "address": residence,
                    "age": str(age),
                    "preferences": ", ".join(interests),
                    "schedule_preset": schedule_preset,
                    "maid": maid,
                },
            },
        ],
    }


def load_generated_citizens(database: Path, *, include_departed: bool = False) -> list[dict[str, Any]]:
    """Load persistent generated citizens from the authoritative database."""
    if not Path(database).is_file():
        return []
    with closing(sqlite3.connect(database)) as conn:
        conn.row_factory = sqlite3.Row
        has_table = conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='GeneratedCitizens'"
        ).fetchone()
        if not has_table:
            return []
        where = "" if include_departed else "WHERE Status = 'active'"
        rows = conn.execute(
            f"SELECT * FROM GeneratedCitizens {where} ORDER BY CreatedAt, CharacterId"
        ).fetchall()
    return [generated_row_to_character_dict(dict(r)) for r in rows]


def list_generation_history(database: Path, limit: int = 25) -> list[dict[str, Any]]:
    if not Path(database).is_file():
        return []
    with closing(sqlite3.connect(database)) as conn:
        conn.row_factory = sqlite3.Row
        has_table = conn.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='PopulationGenerationLog'"
        ).fetchone()
        if not has_table:
            return []
        rows = conn.execute(
            "SELECT * FROM PopulationGenerationLog ORDER BY CreatedAt DESC LIMIT ?",
            (int(limit),),
        ).fetchall()
    return [
        {
            "batchId": r["BatchId"],
            "triggerKind": r["TriggerKind"],
            "realm": r["Realm"] or "Mixed",
            "requestedCount": int(r["RequestedCount"]),
            "existingEligibleCount": int(r["ExistingEligibleCount"]),
            "generatedCount": int(r["GeneratedCount"]),
            "residencyType": r["ResidencyType"],
            "demandDetails": json.loads(r["DemandDetailsJson"] or "{}"),
            "seed": r["Seed"],
            "committedToDb": bool(r["CommittedToDb"]),
            "createdAt": r["CreatedAt"],
        }
        for r in rows
    ]


def calculate_population_deficits(model: Any) -> dict[str, Any]:
    """Dynamically calculate per-realm permanent and visitor deficits from DB config and Mesa agents."""
    db_path = Path(model.database)
    configs = load_realm_configs(db_path)

    per_realm: dict[str, dict[str, Any]] = {}
    for r in REALM_METADATA:
        rcfg = configs.get(r["name"], {})
        per_realm[r["name"]] = {
            "realmName": r["name"],
            "regionCode": r["code"],
            "canonicalCount": 0,
            "generatedPermanent": 0,
            "generatedVisitors": 0,
            "currentPermanent": 0,
            "targetPermanent": int(rcfg.get("targetPermanent", r["target_permanent"])),
            "targetVisitors": int(rcfg.get("targetVisitors", r["target_visitors"])),
            "permanentDeficit": 0,
            "visitorDeficit": 0,
            "maxGenerationPerDay": int(rcfg.get("maxGenerationPerDay", DEFAULT_DAILY_GENERATION_LIMIT)),
        }

    for agent in model.agents:
        is_gen = getattr(agent, "record_status", "") in ("generated", "procedural")
        res_type = getattr(agent, "residency_type", "permanent")
        realm_key = getattr(agent, "home_realm", "") if not is_gen else getattr(agent, "realm", "")
        resolved = resolve_realm(realm_key or getattr(agent, "realm", ""))
        if not resolved or resolved["name"] not in per_realm:
            continue
        slot = per_realm[resolved["name"]]
        if not is_gen:
            slot["canonicalCount"] += 1
        elif res_type == "visitor":
            slot["generatedVisitors"] += 1
        else:
            slot["generatedPermanent"] += 1

    total_perm_target = 0
    total_perm_current = 0
    total_perm_deficit = 0
    total_vis_target = 0
    total_vis_current = 0
    total_vis_deficit = 0

    for slot in per_realm.values():
        slot["currentPermanent"] = slot["canonicalCount"] + slot["generatedPermanent"]
        slot["permanentDeficit"] = max(0, slot["targetPermanent"] - slot["currentPermanent"])
        slot["visitorDeficit"] = max(0, slot["targetVisitors"] - slot["generatedVisitors"])
        total_perm_target += slot["targetPermanent"]
        total_perm_current += slot["currentPermanent"]
        total_perm_deficit += slot["permanentDeficit"]
        total_vis_target += slot["targetVisitors"]
        total_vis_current += slot["generatedVisitors"]
        total_vis_deficit += slot["visitorDeficit"]

    return {
        "totalPermanentTarget": total_perm_target,
        "totalPermanentCurrent": total_perm_current,
        "totalPermanentDeficit": total_perm_deficit,
        "totalVisitorTarget": total_vis_target,
        "totalVisitorCurrent": total_vis_current,
        "totalVisitorDeficit": total_vis_deficit,
        "realms": list(per_realm.values()),
    }


# ---------------------------------------------------------------------------
# Dynamic Population Generator & Manager
# ---------------------------------------------------------------------------

class DynamicPopulationManager:
    """Coordinates procedural citizen preview, validation, DB persistence, demand fulfillment, and migration."""

    @staticmethod
    def _generate_name(
        style: str,
        realm_meta: dict[str, Any],
        rng: np.random.Generator,
        fake: Faker,
        existing_names: set[str],
    ) -> tuple[str, str, str, str]:
        chosen_style = style
        if style == "mixed":
            chosen_style = str(
                rng.choice(
                    ["contemporary", "culturally_diverse", "realm_fictional"],
                    p=[0.40, 0.35, 0.25],
                )
            )
        first, last = "Alex", "Mercer"
        for _ in range(32):
            if chosen_style == "contemporary":
                first = fake.first_name()
                last = fake.last_name()
            elif chosen_style == "culturally_diverse":
                first = str(DIVERSE_FIRST_NAMES[int(rng.integers(0, len(DIVERSE_FIRST_NAMES)))])
                last = str(DIVERSE_LAST_NAMES[int(rng.integers(0, len(DIVERSE_LAST_NAMES)))])
            else:
                f_pool = realm_meta["fictional_first"]
                l_pool = realm_meta["fictional_last"]
                first = str(f_pool[int(rng.integers(0, len(f_pool)))]).capitalize()
                last = str(l_pool[int(rng.integers(0, len(l_pool)))])
            full = f"{first} {last}"
            if full.casefold() not in existing_names:
                return full, first, last, chosen_style
        suffix = uuid.uuid4().hex[:4].upper()
        return f"{first} {last}-{suffix}", first, f"{last}-{suffix}", chosen_style

    @staticmethod
    def _weighted_sector_plan(count: int, rng: np.random.Generator) -> list[str]:
        """Build a proportional sector sequence matching SECTOR_WEIGHTS for balanced occupational diversity."""
        sectors = list(SECTOR_WEIGHTS.keys())
        weights = np.array([SECTOR_WEIGHTS[s] for s in sectors], dtype=np.float64)
        probs = weights / weights.sum()
        if count <= 0:
            return []
        if count >= 20:
            # Largest-remainder proportional allocation so large batches match approved weights closely
            exact = probs * count
            floors = np.floor(exact).astype(int)
            remainder = count - int(floors.sum())
            if remainder > 0:
                frac_order = np.argsort(exact - floors)[::-1]
                for idx in frac_order[:remainder]:
                    floors[idx] += 1
            plan: list[str] = []
            for sec, n in zip(sectors, floors):
                plan.extend([sec] * int(n))
            rng.shuffle(plan)
            return plan
        return [str(sectors[int(i)]) for i in rng.choice(len(sectors), size=count, p=probs)]

    @classmethod
    def preview_batch(
        cls,
        model: Any,
        request: PopulationBatchRequest,
        *,
        role_override: str | None = None,
        employer_override: str | None = None,
        realm_sequence: list[str] | None = None,
    ) -> dict[str, Any]:
        """Generate and Pydantic-validate a preview batch without writing to miraverse.db."""
        db_path = Path(model.database)
        configs = load_realm_configs(db_path)
        deficits = calculate_population_deficits(model)
        deficit_by_realm = {r["realmName"]: r for r in deficits["realms"]}

        existing_ids = {c.character_id for c in model.agents}
        existing_names = {c.name.casefold() for c in model.agents}
        existing_generated_count = sum(
            1 for c in model.agents if getattr(c, "record_status", "") in ("generated", "procedural")
        )
        remaining_global = max(0, MAX_PERSISTENT_GENERATED - existing_generated_count)

        rng = np.random.default_rng(request.seed)
        fake = Faker()
        if request.seed is not None:
            Faker.seed(request.seed)
            fake.seed_instance(request.seed)

        batch_id = f"POP-{uuid.uuid4().hex[:10].upper()}"
        target_realm_meta = resolve_realm(request.realm) if request.realm else None
        if request.realm and target_realm_meta is None:
            raise ValueError(f"Unknown canonical realm: {request.realm!r}")

        # Simulation calendar day rate-limit tracking (uses SimDayCreated on model.world_clock.day_index)
        sim_day = int(getattr(getattr(model, "world_clock", None), "day_index", 0))
        generated_this_sim_day: Counter[str] = Counter()
        if db_path.is_file():
            with closing(sqlite3.connect(db_path)) as conn:
                if conn.execute(
                    "SELECT 1 FROM sqlite_master WHERE type='table' AND name='GeneratedCitizens'"
                ).fetchone():
                    cols = {r[1] for r in conn.execute("PRAGMA table_info(GeneratedCitizens)").fetchall()}
                    if "SimDayCreated" in cols:
                        for r_realm, r_cnt in conn.execute(
                            "SELECT CurrentRealm, COUNT(*) FROM GeneratedCitizens WHERE SimDayCreated = ? AND Status = 'active' GROUP BY CurrentRealm",
                            (sim_day,),
                        ).fetchall():
                            generated_this_sim_day[str(r_realm)] = int(r_cnt)

        actual_count = min(int(request.count), remaining_global)
        records: list[dict[str, Any]] = []
        warnings: list[str] = []
        if actual_count < request.count:
            warnings.append(
                f"Capped batch from {request.count} to {actual_count} due to global limit ({MAX_PERSISTENT_GENERATED})."
            )

        living_by_realm: dict[str, list[Any]] = {}
        for c in model.living_agents:
            living_by_realm.setdefault(str(c.realm or "Orynvell"), []).append(c)

        # Resolve optional specific occupation request
        forced_occ_entry = None
        if request.occupation:
            occ_key = request.occupation.strip().casefold()
            if occ_key in ALL_OCCUPATIONS:
                forced_occ_entry = ALL_OCCUPATIONS[occ_key]

        # Sector plan
        if forced_occ_entry is not None:
            sector_plan = [forced_occ_entry[0]] * actual_count
        elif request.sector != "mixed":
            sector_plan = [request.sector] * actual_count
        else:
            sector_plan = cls._weighted_sector_plan(actual_count, rng)

        # Realm selection weights biased toward realms with remaining deficits
        realm_weights = []
        for rmeta in REALM_METADATA:
            dslot = deficit_by_realm.get(rmeta["name"], {})
            deficit = int(
                dslot.get("visitorDeficit", 1)
                if request.residencyType == "visitor"
                else dslot.get("permanentDeficit", 1)
            )
            realm_weights.append(float(max(1, deficit)))
        realm_probs = np.array(realm_weights, dtype=np.float64)
        realm_probs = realm_probs / realm_probs.sum()

        # Track remaining realm target capacity during ordinary or seeded batches
        remaining_realm_cap: dict[str, int] = {}
        for rmeta in REALM_METADATA:
            dslot = deficit_by_realm.get(rmeta["name"], {})
            remaining_realm_cap[rmeta["name"]] = int(
                dslot.get("visitorDeficit", 0)
                if request.residencyType == "visitor"
                else dslot.get("permanentDeficit", 0)
            )

        for idx in range(actual_count):
            if realm_sequence is not None and idx < len(realm_sequence):
                current_meta = resolve_realm(realm_sequence[idx]) or REALM_METADATA[0]
            elif target_realm_meta is not None:
                current_meta = target_realm_meta
            else:
                r_idx = int(rng.choice(len(REALM_METADATA), p=realm_probs))
                current_meta = REALM_METADATA[r_idx]

            rcfg = configs.get(current_meta["name"], {})
            daily_cap = int(rcfg.get("maxGenerationPerDay", DEFAULT_DAILY_GENERATION_LIMIT))
            if not request.authorizedSeeding:
                if generated_this_sim_day[current_meta["name"]] >= daily_cap:
                    warnings.append(
                        f"Simulation-day limit ({daily_cap}/day) reached for {current_meta['name']} (Day {sim_day + 1})."
                    )
                    continue
                generated_this_sim_day[current_meta["name"]] += 1

            # Prevent exceeding configured realm target during deficit/ordinary seeding
            if request.authorizedSeeding and remaining_realm_cap.get(current_meta["name"], 0) <= 0:
                warnings.append(f"Realm target already satisfied for {current_meta['name']}.")
                continue
            remaining_realm_cap[current_meta["name"]] = max(
                0, remaining_realm_cap.get(current_meta["name"], 0) - 1
            )

            if request.residencyType == "visitor":
                other_realms = [r for r in REALM_METADATA if r["name"] != current_meta["name"]]
                home_meta = other_realms[int(rng.integers(0, len(other_realms)))]
            else:
                home_meta = current_meta

            full_name, first_name, last_name, actual_style = cls._generate_name(
                request.namingStyle, home_meta, rng, fake, existing_names
            )
            existing_names.add(full_name.casefold())

            char_id = f"GEN-{home_meta['code']}-{uuid.uuid4().hex[:8].upper()}"
            while char_id in existing_ids:
                char_id = f"GEN-{home_meta['code']}-{uuid.uuid4().hex[:8].upper()}"
            existing_ids.add(char_id)

            preview_maid = f"MAID-{home_meta['code']}-PREVIEW{idx + 1:03d}"

            sector = sector_plan[idx]
            if forced_occ_entry is not None:
                occ, employer, emp_status, sched_preset, base_salary, occ_age_min, occ_age_max, edu_pool = forced_occ_entry[1]
            else:
                occ_pool = SECTOR_OCCUPATIONS[sector]
                occ, employer, emp_status, sched_preset, base_salary, occ_age_min, occ_age_max, edu_pool = occ_pool[
                    int(rng.integers(0, len(occ_pool)))
                ]

            if role_override:
                occ = role_override.strip()
            if employer_override is not None:
                employer = employer_override.strip()
                if employer and emp_status in ("unemployed", "retired", "homemaker"):
                    emp_status = "employed"

            cfg_age_min = max(18, int(rcfg.get("ageMin", 18)))
            cfg_age_max = max(cfg_age_min, int(rcfg.get("ageMax", 84)))
            eff_min = max(cfg_age_min, occ_age_min)
            eff_max = min(cfg_age_max, occ_age_max)
            if eff_min > eff_max:
                eff_min, eff_max = occ_age_min, occ_age_max
            age = int(rng.integers(eff_min, eff_max + 1))
            life_stage = life_stage_for_age(age)
            gender = str(rng.choice(["Female", "Male", "Non-binary"], p=[0.46, 0.46, 0.08]))

            district = str(current_meta["districts"][int(rng.integers(0, len(current_meta["districts"])))])
            street_num = int(rng.integers(12, 480))
            if request.residencyType == "visitor":
                residence = f"Guest Residence {street_num}, {district}, {current_meta['capital']}, {current_meta['name']}"
            else:
                residence = f"{street_num} {district}, {current_meta['capital']}, {current_meta['name']}"

            education_level = str(edu_pool[int(rng.integers(0, len(edu_pool)))])
            alma_mater = str(ALMA_MATERS[int(rng.integers(0, len(ALMA_MATERS)))])
            picked_interests = [
                str(INTEREST_POOL[i]) for i in rng.choice(len(INTEREST_POOL), size=3, replace=False)
            ]

            personality = npc_intelligence.compute_personality_vector(
                char_id,
                traits_text=f"{occ} {employer} {' '.join(picked_interests)}",
                sociability=float(rng.uniform(0.25, 0.85)),
                music_interest=float(
                    rng.uniform(0.45, 0.92)
                    if sector in ("entertainment_arts", "fashion_modeling")
                    else rng.uniform(0.15, 0.70)
                ),
            )

            # Calibrated starting balance & income
            if emp_status == "student":
                initial_balance = round(float(np.clip(rng.lognormal(mean=5.1, sigma=0.45), 90.0, 1200.0)), 2)
            elif emp_status == "retired":
                initial_balance = round(float(np.clip(rng.lognormal(mean=6.8, sigma=0.55), 400.0, 9500.0)), 2)
            elif emp_status == "unemployed":
                initial_balance = round(float(np.clip(rng.lognormal(mean=5.0, sigma=0.50), 80.0, 950.0)), 2)
            else:
                initial_balance = round(float(np.clip(rng.lognormal(mean=5.9, sigma=0.55), 140.0, 6500.0)), 2)

            salary = round(float(base_salary * rng.uniform(0.88, 1.18)), 2) if base_salary > 0 else 0.0

            primary_goal = copy.deepcopy(
                GOAL_KINDS[1]
                if sector in ("entertainment_arts", "fashion_modeling", "media_communications")
                else GOAL_KINDS[2]
                if emp_status in ("retired", "homemaker", "unemployed")
                else GOAL_KINDS[0]
            )
            primary_goal["priority"] = round(float(rng.uniform(0.60, 0.90)), 2)
            secondary_goal = copy.deepcopy(GOAL_KINDS[3])
            secondary_goal["priority"] = round(float(rng.uniform(0.35, 0.65)), 2)
            goals = [primary_goal, secondary_goal]

            if emp_status == "retired":
                bg_history = (
                    f"Longtime resident of {current_meta['capital']} ({current_meta['name']}); "
                    f"studied at {alma_mater} and now enjoys retirement focused on {picked_interests[0]} and community life."
                )
            elif emp_status == "homemaker":
                bg_history = (
                    f"Permanent resident of {current_meta['capital']} ({current_meta['name']}); "
                    f"completed {education_level} at {alma_mater} and manages household life in {district}."
                )
            elif emp_status == "unemployed":
                bg_history = (
                    f"Resident of {current_meta['capital']} ({current_meta['name']}) with a {education_level} from {alma_mater}, "
                    f"currently seeking new local opportunities via WORKNET."
                )
            elif request.residencyType == "visitor":
                bg_history = (
                    f"Raised in {home_meta['name']} and educated at {alma_mater} ({education_level}), "
                    f"{first_name} is visiting {current_meta['name']} working as a {occ}"
                    + (f" ({employer})." if employer else ".")
                )
            else:
                emp_phrase = (
                    "working independently"
                    if emp_status in ("self_employed", "freelance") and employer in ("Self-Employed", "Freelance", "")
                    else f"with {employer}" if employer else "locally"
                )
                bg_history = (
                    f"Permanent resident of {current_meta['capital']} ({current_meta['name']}); "
                    f"completed {education_level} at {alma_mater} and works as a {occ} {emp_phrase}."
                )

            # Seed 1-2 non-invasive social/professional ties to existing living citizens
            seeded_rels: list[dict[str, Any]] = []
            realm_peers = living_by_realm.get(current_meta["name"], [])
            if realm_peers:
                peer_count = min(2, len(realm_peers))
                peer_indices = rng.choice(len(realm_peers), size=peer_count, replace=False)
                for p_idx in peer_indices:
                    peer = realm_peers[int(p_idx)]
                    kind = (
                        "coworker"
                        if employer and str(peer.workplace or "").casefold() == employer.casefold()
                        else "acquaintance"
                    )
                    seeded_rels.append(
                        {
                            "targetId": peer.character_id,
                            "targetName": peer.name,
                            "kind": kind,
                            "trust": round(float(rng.uniform(32.0, 58.0)), 1),
                            "affection": round(float(rng.uniform(28.0, 54.0)), 1),
                        }
                    )

            record_model = GeneratedCitizenRecord(
                characterId=char_id,
                maid=preview_maid,
                name=full_name,
                firstName=first_name,
                lastName=last_name,
                namingStyle=actual_style,  # type: ignore[arg-type]
                gender=gender,  # type: ignore[arg-type]
                age=age,
                lifeStage=life_stage,  # type: ignore[arg-type]
                residencyType=request.residencyType,
                simulationDepth=request.simulationDepth,
                homeRealm=home_meta["name"],
                currentRealm=current_meta["name"],
                residence=residence,
                occupation=occ,
                employmentStatus=emp_status,  # type: ignore[arg-type]
                employer=employer,
                sector=sector,
                educationLevel=education_level,
                almaMater=alma_mater,
                schedulePreset=sched_preset,
                initialBalance=initial_balance,
                salary=salary,
                personality=personality,
                interests=picked_interests,
                goals=goals,
                backgroundHistory=bg_history,
                relationships=seeded_rels,
                demandReason=request.demandReason,
                batchId=batch_id,
                seed=request.seed,
                simDayCreated=sim_day,
                canonical=False,
                status="active",
            )
            records.append(record_model.model_dump())

        return {
            "batchId": batch_id,
            "valid": True,
            "requestedCount": request.count,
            "previewCount": len(records),
            "warnings": warnings,
            "realmDistribution": dict(Counter(r["currentRealm"] for r in records)),
            "sectorDistribution": dict(Counter(r["sector"] for r in records)),
            "occupationDistribution": dict(Counter(r["occupation"] for r in records)),
            "employmentStatusDistribution": dict(Counter(r["employmentStatus"] for r in records)),
            "namingStyleDistribution": dict(Counter(r["namingStyle"] for r in records)),
            "records": records,
        }

    @classmethod
    def preview_deficit_fill(
        cls,
        model: Any,
        *,
        residency_type: Literal["permanent", "visitor"] = "permanent",
        naming_style: Literal["mixed", "contemporary", "culturally_diverse", "realm_fictional"] = "mixed",
        simulation_depth: Literal["Minimal", "Standard", "Expanded"] = "Standard",
        seed: int | None = 42,
    ) -> dict[str, Any]:
        """Preview an authorized seeding batch filling exact dynamic deficits across all 8 realms."""
        deficits = calculate_population_deficits(model)
        realm_sequence: list[str] = []
        for slot in deficits["realms"]:
            need = slot["visitorDeficit"] if residency_type == "visitor" else slot["permanentDeficit"]
            realm_sequence.extend([slot["realmName"]] * int(need))

        if not realm_sequence:
            return {
                "batchId": f"POP-{uuid.uuid4().hex[:10].upper()}",
                "valid": True,
                "requestedCount": 0,
                "previewCount": 0,
                "warnings": [f"All 8 realms already meet their {residency_type} population targets."],
                "realmDistribution": {},
                "sectorDistribution": {},
                "occupationDistribution": {},
                "employmentStatusDistribution": {},
                "namingStyleDistribution": {},
                "records": [],
                "deficits": deficits,
            }

        req = PopulationBatchRequest(
            count=len(realm_sequence),
            realm=None,
            residencyType=residency_type,
            namingStyle=naming_style,
            sector="mixed",
            simulationDepth=simulation_depth,
            seed=seed,
            authorizedSeeding=True,
            triggerKind="initial_seeding",
            demandReason=f"authorized_{residency_type}_deficit_fill",
        )
        preview = cls.preview_batch(model, req, realm_sequence=realm_sequence)
        preview["deficits"] = deficits
        return preview

    @classmethod
    def commit_batch(
        cls,
        model: Any,
        records: list[dict[str, Any]],
        *,
        batch_id: str | None = None,
        trigger_kind: str = "manual",
        existing_eligible_count: int = 0,
        demand_details: dict[str, Any] | None = None,
        seed: int | None = None,
        persist_to_db: bool = True,
    ) -> dict[str, Any]:
        """Validate, atomically allocate authoritative MAIDs, persist to DB, and register in Mesa & living systems."""
        if not records:
            return {
                "batchId": batch_id or f"POP-{uuid.uuid4().hex[:10].upper()}",
                "committedCount": 0,
                "citizens": [],
            }

        validated: list[GeneratedCitizenRecord] = []
        seen_ids: set[str] = {c.character_id for c in model.agents}
        for raw in records:
            rec = GeneratedCitizenRecord.model_validate(raw)
            if rec.characterId in seen_ids:
                raise ValueError(f"Duplicate characterId prevented: {rec.characterId}")
            seen_ids.add(rec.characterId)
            validated.append(rec)

        final_batch_id = batch_id or validated[0].batchId or f"POP-{uuid.uuid4().hex[:10].upper()}"
        sim_day = int(getattr(getattr(model, "world_clock", None), "day_index", 0))
        now = _now_iso()
        committed_records: list[dict[str, Any]] = []
        db_path = Path(model.database)

        if persist_to_db:
            with closing(sqlite3.connect(db_path)) as conn:
                ensure_population_schema(conn)
                conn.commit()
                try:
                    conn.execute("BEGIN")
                    for rec in validated:
                        home_meta = resolve_realm(rec.homeRealm)
                        region_code = home_meta["code"] if home_meta else "OR"
                        real_maid = allocate_next_maid(
                            conn,
                            region_code,
                            rec.characterId,
                            notes=f"Generated {rec.residencyType} citizen ({rec.sector}): {rec.name}",
                        )
                        rec_dict = rec.model_dump()
                        rec_dict["maid"] = real_maid
                        rec_dict["batchId"] = final_batch_id
                        rec_dict["simDayCreated"] = sim_day

                        # Enrich with species genetics & individual manifested abilities when Species tables exist
                        gen_profile = None
                        try:
                            has_species = conn.execute(
                                "SELECT 1 FROM sqlite_master WHERE type='table' AND name='Species'"
                            ).fetchone() is not None
                            if has_species:
                                gen_rng = np.random.default_rng(
                                    (int(seed) if seed is not None else 42) + abs(hash(rec.characterId)) % 100000
                                )
                                gen_profile = species_genetics.generate_citizen_genetics(
                                    conn,
                                    home_realm=rec_dict["homeRealm"],
                                    rng=gen_rng,
                                    species_id=rec_dict.get("speciesId"),
                                    age=int(rec_dict["age"]),
                                )
                                rec_dict["speciesId"] = gen_profile["species_id"]
                                rec_dict["primaryAffinity"] = gen_profile["primary_affinity"]
                                rec_dict["regionalLineage"] = gen_profile["regional_lineage"]
                                rec_dict["genetics"] = gen_profile["genetics"]
                                rec_dict["manifestedAbilities"] = gen_profile["manifested"]
                        except Exception:
                            gen_profile = None

                        conn.execute(
                            """
                            INSERT INTO GeneratedCitizens (
                                CharacterId, Maid, Name, FirstName, LastName, NamingStyle,
                                Gender, Age, LifeStage, ResidencyType, SimulationDepth,
                                HomeRealm, CurrentRealm, Residence, Occupation, Employer,
                                EmploymentStatus, Sector, EducationLevel, AlmaMater, SchedulePreset,
                                InitialBalance, Salary, PersonalityJson, InterestsJson, GoalsJson,
                                BackgroundHistory, RelationshipsJson, DemandReason, BatchId, Seed,
                                SimDayCreated, Canonical, Status, CreatedAt, UpdatedAt
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'active', ?, ?)
                            """,
                            (
                                rec_dict["characterId"],
                                real_maid,
                                rec_dict["name"],
                                rec_dict["firstName"],
                                rec_dict["lastName"],
                                rec_dict["namingStyle"],
                                rec_dict["gender"],
                                rec_dict["age"],
                                rec_dict["lifeStage"],
                                rec_dict["residencyType"],
                                rec_dict["simulationDepth"],
                                rec_dict["homeRealm"],
                                rec_dict["currentRealm"],
                                rec_dict["residence"],
                                rec_dict["occupation"],
                                rec_dict["employer"],
                                rec_dict["employmentStatus"],
                                rec_dict["sector"],
                                rec_dict["educationLevel"],
                                rec_dict["almaMater"],
                                rec_dict["schedulePreset"],
                                rec_dict["initialBalance"],
                                rec_dict["salary"],
                                json.dumps(rec_dict["personality"]),
                                json.dumps(rec_dict["interests"]),
                                json.dumps(rec_dict["goals"]),
                                rec_dict["backgroundHistory"],
                                json.dumps(rec_dict["relationships"]),
                                rec_dict["demandReason"],
                                final_batch_id,
                                seed,
                                sim_day,
                                now,
                                now,
                            ),
                        )
                        if gen_profile is not None:
                            gc_cols = {
                                r[1] for r in conn.execute("PRAGMA table_info(GeneratedCitizens)").fetchall()
                            }
                            if "SpeciesId" in gc_cols:
                                conn.execute(
                                    """
                                    UPDATE GeneratedCitizens
                                    SET SpeciesId = ?, SubspeciesId = ?, PrimaryAffinity = ?,
                                        RegionalLineage = ?, GeneticsJson = ?, ManifestedAbilitiesJson = ?
                                    WHERE CharacterId = ?
                                    """,
                                    (
                                        gen_profile["species_id"],
                                        gen_profile["subspecies_id"],
                                        gen_profile["primary_affinity"],
                                        gen_profile["regional_lineage"],
                                        json.dumps(gen_profile["genetics"], ensure_ascii=False),
                                        json.dumps(gen_profile["manifested"], ensure_ascii=False),
                                        rec_dict["characterId"],
                                    ),
                                )
                            has_csp = conn.execute(
                                "SELECT 1 FROM sqlite_master WHERE type='table' AND name='CharacterSpeciesProfiles'"
                            ).fetchone() is not None
                            if has_csp:
                                species_genetics.upsert_citizen_species_profile(
                                    conn,
                                    character_id=rec_dict["characterId"],
                                    home_realm=rec_dict["homeRealm"],
                                    birthplace=rec_dict["homeRealm"],
                                    citizenship=rec_dict["currentRealm"],
                                    profile=gen_profile,
                                )
                        committed_records.append(rec_dict)

                    realms_in_batch = sorted({r["currentRealm"] for r in committed_records})
                    conn.execute(
                        """
                        INSERT OR REPLACE INTO PopulationGenerationLog (
                            BatchId, TriggerKind, Realm, RequestedCount, ExistingEligibleCount,
                            GeneratedCount, ResidencyType, DemandDetailsJson, Seed, CommittedToDb, CreatedAt
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
                        """,
                        (
                            final_batch_id,
                            trigger_kind,
                            realms_in_batch[0] if len(realms_in_batch) == 1 else "Mixed",
                            len(records),
                            int(existing_eligible_count),
                            len(committed_records),
                            committed_records[0]["residencyType"],
                            json.dumps(demand_details or {}),
                            seed,
                            now,
                        ),
                    )
                    conn.commit()
                except Exception:
                    conn.rollback()
                    raise
        else:
            for rec in validated:
                rec_dict = rec.model_dump()
                rec_dict["batchId"] = final_batch_id
                committed_records.append(rec_dict)

        # Register into Mesa PopulationModel + WORKNET careers + finances + NetworkX relationships
        from population import Citizen
        import world_services

        for rec_dict in committed_records:
            char_dict = generated_row_to_character_dict(rec_dict)
            agent = Citizen(model, char_dict, staged_override=None)
            agent.balance = float(rec_dict["initialBalance"])
            agent.personality = copy.deepcopy(rec_dict["personality"])
            agent.active_goals = copy.deepcopy(rec_dict["goals"])
            agent.simulation_depth = rec_dict["simulationDepth"]
            agent.residency_type = rec_dict["residencyType"]
            agent.naming_style = rec_dict["namingStyle"]
            agent.background_history = rec_dict["backgroundHistory"]
            agent.education_level = rec_dict["educationLevel"]
            agent.alma_mater = rec_dict["almaMater"]
            agent.sector = rec_dict["sector"]

            # Connect employed / self-employed / freelance / student citizens to WORKNET career service
            if (
                rec_dict["employmentStatus"] in ("employed", "self_employed", "freelance")
                and rec_dict["occupation"]
            ):
                world_services.assign_career(
                    model,
                    {
                        "characterId": agent.character_id,
                        "title": rec_dict["occupation"],
                        "employer": rec_dict["employer"] or rec_dict["employmentStatus"].replace("_", " ").title(),
                        "salary": rec_dict["salary"],
                        "schedule": "fixed"
                        if "Institutional" in rec_dict["schedulePreset"]
                        or "Academic" in rec_dict["schedulePreset"]
                        or "Shift" in rec_dict["schedulePreset"]
                        else "flexible",
                    },
                )

            for rel in rec_dict.get("relationships", []):
                target_id = rel.get("targetId")
                if target_id and any(c.character_id == target_id for c in model.agents):
                    world_services.add_relationship(
                        model,
                        {
                            "fromCharacterId": agent.character_id,
                            "toCharacterId": target_id,
                            "kind": rel.get("kind", "acquaintance"),
                            "trust": rel.get("trust", 40.0),
                            "affection": rel.get("affection", 35.0),
                        },
                    )

        model._rebuild_world_graph()
        return {
            "batchId": final_batch_id,
            "committedCount": len(committed_records),
            "persistedToDb": persist_to_db,
            "citizens": committed_records,
        }

    @classmethod
    def evaluate_and_fulfill_demand(
        cls,
        model: Any,
        request: DemandFulfillmentRequest,
    ) -> dict[str, Any]:
        """Evaluate existing eligible citizens FIRST before generating new ones to fill demand."""
        target_realm = resolve_realm(request.realm)["name"] if request.realm and resolve_realm(request.realm) else None
        if request.realm and target_realm is None:
            raise ValueError(f"Unknown canonical realm: {request.realm!r}")

        player_ids = set(model._extensions.get("player_character_ids", []))
        eligible: list[dict[str, Any]] = []
        for citizen in model.living_agents:
            if citizen.character_id in player_ids or citizen.character_classification in (
                "Player character",
                "Historical character",
                "Investigation subject",
                "Royalty and officials",
            ):
                continue
            if target_realm and str(citizen.realm or "").casefold() != target_realm.casefold():
                continue
            occ_blob = f"{citizen.primary_occupation} {citizen.workplace} {getattr(citizen, 'sector', '')}".casefold()
            already_employed_same = bool(
                request.employer
                and str(citizen.workplace or "").casefold() == request.employer.casefold()
            )
            if already_employed_same:
                continue
            if request.sector in ("entertainment_arts", "fashion_modeling", "media_communications"):
                matches = (
                    citizen.character_classification == "Entertainment professional"
                    or getattr(citizen, "music_interest", 0.0) >= 0.65
                    or getattr(citizen, "sector", "") in ("entertainment_arts", "fashion_modeling")
                )
            elif request.sector == "education_students":
                matches = (
                    (citizen.age_years is not None and 18 <= citizen.age_years <= 32)
                    or "academy" in occ_blob
                    or "student" in occ_blob
                    or "fellow" in occ_blob
                    or not citizen.employment
                )
            elif request.sector in ("government_public", "healthcare_community"):
                matches = not citizen.employment or "civic" in occ_blob or "archive" in occ_blob or "medical" in occ_blob
            else:
                matches = not citizen.employment or getattr(citizen, "salary", 0.0) <= 0.0
            if matches:
                eligible.append(
                    {
                        "characterId": citizen.character_id,
                        "name": citizen.name,
                        "realm": citizen.realm,
                        "occupation": citizen.primary_occupation,
                        "canonical": getattr(citizen, "record_status", "") != "generated",
                    }
                )

        existing_count = len(eligible)
        shortfall = max(0, int(request.neededCount) - existing_count)
        generated_result: dict[str, Any] = {"batchId": None, "committedCount": 0, "citizens": []}

        if shortfall > 0:
            trigger_map = {
                "entertainment_arts": "demand_entertainment",
                "fashion_modeling": "demand_entertainment",
                "education_students": "demand_education",
                "government_public": "demand_institutional",
                "healthcare_community": "demand_institutional",
            }
            trigger_kind = trigger_map.get(request.sector, "demand_employment")
            batch_req = PopulationBatchRequest(
                count=min(shortfall, MAX_BATCH_SIZE),
                realm=target_realm,
                residencyType=request.residencyType,
                namingStyle=request.namingStyle,
                sector=request.sector,
                simulationDepth=request.simulationDepth,
                seed=request.seed,
                triggerKind=trigger_kind,  # type: ignore[arg-type]
                demandReason=f"demand:{request.sector}:{request.role or 'general'}",
            )
            preview = cls.preview_batch(
                model,
                batch_req,
                role_override=request.role,
                employer_override=request.employer,
            )
            generated_result = cls.commit_batch(
                model,
                preview["records"],
                batch_id=preview["batchId"],
                trigger_kind=batch_req.triggerKind,
                existing_eligible_count=existing_count,
                demand_details={
                    "sector": request.sector,
                    "role": request.role,
                    "employer": request.employer,
                    "neededCount": request.neededCount,
                    "shortfall": shortfall,
                },
                seed=request.seed,
                persist_to_db=request.commitToDb,
            )

        return {
            "sector": request.sector,
            "realm": target_realm or "Any",
            "neededCount": request.neededCount,
            "existingEligibleCount": existing_count,
            "existingEligible": eligible[: request.neededCount],
            "shortfall": shortfall,
            "generatedCount": generated_result["committedCount"],
            "generated": generated_result["citizens"],
            "batchId": generated_result["batchId"],
        }

    @classmethod
    def step_daily_population(cls, model: Any) -> dict[str, Any]:
        """Run bounded daily visitor migration on simulation day roll (never spawns bulk citizens per tick)."""
        db_path = Path(model.database)
        if not db_path.is_file():
            return {"migrated": 0, "abstractUpdated": False}
        configs = load_realm_configs(db_path)
        rng = np.random.default_rng(model.seed + model.world_clock.day_index * 31)
        migrated = 0

        visitors = [
            c for c in model.living_agents if getattr(c, "residency_type", "permanent") == "visitor"
        ]
        if visitors and float(rng.random()) < 0.35:
            visitor = visitors[int(rng.integers(0, len(visitors)))]
            cur_cfg = configs.get(visitor.realm, {})
            if cur_cfg.get("allowOutMigration", True):
                destinations = [
                    r["name"]
                    for r in REALM_METADATA
                    if r["name"] != visitor.realm and configs.get(r["name"], {}).get("allowInMigration", True)
                ]
                if destinations:
                    new_realm = destinations[int(rng.integers(0, len(destinations)))]
                    visitor.realm = new_realm
                    visitor.current_location = model.resolve_location(new_realm, new_realm)
                    migrated = 1
                    with closing(sqlite3.connect(db_path)) as conn:
                        if conn.execute(
                            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='GeneratedCitizens'"
                        ).fetchone():
                            conn.execute(
                                "UPDATE GeneratedCitizens SET CurrentRealm = ?, UpdatedAt = ? WHERE CharacterId = ?",
                                (new_realm, _now_iso(), visitor.character_id),
                            )
                            conn.commit()
        return {"migrated": migrated, "abstractUpdated": True}

    @classmethod
    def population_summary(cls, model: Any) -> dict[str, Any]:
        """Comprehensive population management & diagnostics summary for API and Solara Observatory."""
        db_path = Path(model.database)
        configs = load_realm_configs(db_path)
        history = list_generation_history(db_path, limit=25)
        deficits = calculate_population_deficits(model)
        deficit_map = {r["realmName"]: r for r in deficits["realms"]}

        canonical_count = 0
        generated_permanent = 0
        generated_visitors = 0
        realm_breakdown: dict[str, dict[str, Any]] = {}
        for r in REALM_METADATA:
            rcfg = configs.get(r["name"], {})
            dslot = deficit_map.get(r["name"], {})
            realm_breakdown[r["name"]] = {
                "realmName": r["name"],
                "regionCode": r["code"],
                "canonical": int(dslot.get("canonicalCount", 0)),
                "generatedPermanent": int(dslot.get("generatedPermanent", 0)),
                "generatedVisitors": int(dslot.get("generatedVisitors", 0)),
                "totalActive": int(dslot.get("currentPermanent", 0)) + int(dslot.get("generatedVisitors", 0)),
                "targetPermanent": int(rcfg.get("targetPermanent", r["target_permanent"])),
                "targetVisitors": int(rcfg.get("targetVisitors", r["target_visitors"])),
                "permanentDeficit": int(dslot.get("permanentDeficit", 0)),
                "visitorDeficit": int(dslot.get("visitorDeficit", 0)),
                "abstractBackgroundPopulation": int(rcfg.get("abstractBackgroundPopulation", r["abstract_bg"])),
                "maxGenerationPerDay": int(rcfg.get("maxGenerationPerDay", DEFAULT_DAILY_GENERATION_LIMIT)),
                "allowInMigration": bool(rcfg.get("allowInMigration", True)),
                "allowOutMigration": bool(rcfg.get("allowOutMigration", True)),
            }

        occupations: Counter[str] = Counter()
        depths: Counter[str] = Counter()
        naming_styles: Counter[str] = Counter()
        sectors: Counter[str] = Counter()

        for c in model.agents:
            is_gen = getattr(c, "record_status", "") in ("generated", "procedural")
            res_type = getattr(c, "residency_type", "permanent")
            if is_gen:
                if res_type == "visitor":
                    generated_visitors += 1
                else:
                    generated_permanent += 1
            else:
                canonical_count += 1

            occ = str(getattr(c, "primary_occupation", "") or "Unassigned")
            occupations[occ] += 1
            depths[str(getattr(c, "simulation_depth", "Standard"))] += 1
            if is_gen:
                naming_styles[str(getattr(c, "naming_style", "contemporary"))] += 1
                sectors[str(getattr(c, "sector", "retail_hospitality"))] += 1

        total_abstract = sum(v["abstractBackgroundPopulation"] for v in realm_breakdown.values())

        return {
            "canonicalCount": canonical_count,
            "generatedPermanentCount": generated_permanent,
            "generatedVisitorCount": generated_visitors,
            "totalSimulatedCitizens": len(model.agents),
            "livingCitizensCount": len(model.living_agents),
            "totalPermanentTarget": deficits["totalPermanentTarget"],
            "totalPermanentDeficit": deficits["totalPermanentDeficit"],
            "totalVisitorTarget": deficits["totalVisitorTarget"],
            "totalVisitorDeficit": deficits["totalVisitorDeficit"],
            "totalAbstractBackgroundPopulation": total_abstract,
            "globalGeneratedCap": MAX_PERSISTENT_GENERATED,
            "realmBreakdown": list(realm_breakdown.values()),
            "topOccupations": [{"occupation": k, "count": v} for k, v in occupations.most_common(20)],
            "simulationDepths": dict(depths),
            "namingStyles": dict(naming_styles),
            "sectors": dict(sectors),
            "generationHistory": history,
        }
