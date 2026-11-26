import json
import copy
import re
import sqlite3
import uuid
from collections import Counter, defaultdict
from contextlib import closing
from pathlib import Path

import mesa

from living_world import (
    DEFAULT_CALENDAR_CONFIG,
    LivingWorldStore,
    RunConflictError,
    WorldClock,
    validate_calendar_config,
    world_date,
)
from overrides_store import load_all_overrides
from profiles_normalizer import normalize_character_profile
import entertainment


from paths import RUN_DATABASE as DATABASE, SOURCE_DATABASE, WORLD_REFERENCE


def load_characters():

    characters = []
    profiles = defaultdict(list)
    db_aliases = defaultdict(list)

    with closing(
        sqlite3.connect(
            SOURCE_DATABASE.resolve().as_uri() + "?mode=ro",
            uri=True,
        )
    ) as connection:

        connection.row_factory = sqlite3.Row

        for alias_row in connection.execute(
            """
            SELECT CharacterId, Alias
            FROM CharacterAliases
            ORDER BY CharacterId, Position
            """
        ).fetchall():
            db_aliases[alias_row["CharacterId"]].append(alias_row["Alias"])

        rows = connection.execute(
            """
            SELECT CharacterId, Collection, Context, DataJson
            FROM CharacterProfiles
            """
        ).fetchall()

        for row in rows:

            try:
                data = json.loads(row["DataJson"])
            except (TypeError, ValueError):
                continue

            if isinstance(data, dict):
                profiles[row["CharacterId"]].append(
                    {
                        "collection": row["Collection"],
                        "context": row["Context"],
                        "data": data,
                    }
                )

        rows = connection.execute(
            """
            SELECT *
            FROM Characters
            WHERE Kind = 'person'
            AND Status = 'existing'
            ORDER BY CharacterId
            """
        ).fetchall()

        seen = set()

        for row in rows:

            character = dict(row)
            character_id = character["CharacterId"]

            if not character_id or character_id in seen:
                continue

            seen.add(character_id)

            character["profiles"] = profiles.get(
                character_id, []
            )
            character["db_aliases"] = db_aliases.get(
                character_id, []
            )

            characters.append(character)

    return characters


class Citizen(mesa.Agent):

    def __init__(self, model, character, staged_override=None):

        super().__init__(model)

        # Canonical record & identity preserved
        self._raw_character = character
        self.character_id = character["CharacterId"]
        self.canonical_name = character["Name"]
        self.name = character["Name"]
        self.profiles = character["profiles"]

        # Experimental simulation attributes
        self.simulation_level = 1

        self.energy = self.random.randint(60, 100)
        self.hunger = self.random.randint(0, 40)
        self.social_need = self.random.randint(0, 50)
        self.hygiene_need = self.random.randint(0, 20)
        self.exercise_need = self.random.randint(0, 20)
        self.leisure_need = self.random.randint(0, 20)
        self.employment = None
        self.balance = 250.0
        self.savings = 0.0
        self.work_minutes_today = 0
        self.last_paid_day = -1
        self.last_rent_day = -1
        self.meals_today = 0
        self.meal_day = -1
        self.travel_minutes_remaining = 0
        self.transport_mode = ""
        self.home_location: dict = {}
        self.work_location: dict = {}
        self.current_location: dict = {}
        self.destination: dict = {}
        self.relationship_links: list[dict] = []
        self.daily_schedule: list[dict] = []
        self.schedule_mode = "Dynamic"
        self.age_years: int | None = None
        self.life_stage = "Unknown"

        self._base_music_interest = self.random.random()
        self.music_interest = self._base_music_interest
        self.sociability = self.random.random()

        self.activity = "Resting"

        # Apply context-aware profile normalization + optional staged override
        self.normalized = {}
        self.apply_normalization(staged_override)

    def get_attribute(self, key):

        # Prefer explicit NPC profiles for direct raw lookup compatibility.
        ordered = sorted(
            self.profiles,
            key=lambda p: p["collection"] != "NPCS",
        )

        for profile in ordered:

            value = profile["data"].get(key)

            if value is not None and value != "":
                return value

        return "Unknown"

    def apply_normalization(self, staged_override=None):

        norm = normalize_character_profile(
            self._raw_character,
            staged_override=staged_override,
        )
        self.normalized = norm
        self.name = norm["name"] or self.canonical_name

        # Multi-faceted role attributes
        self.primary_occupation = norm["primary_occupation"]
        self.secondary_occupations = norm["secondary_occupations"]
        self.specializations = norm["specializations"]
        self.institutional_roles = norm["institutional_roles"]
        self.social_affiliations = norm["social_affiliations"]
        self.institutions = norm["institutions"]
        self.narrative_roles = norm["narrative_roles"]
        self.historical_roles = norm["historical_roles"]
        self.preferences = norm["preferences"]
        self.motivations = norm["motivations"]
        self.hobbies = norm["hobbies"]
        self.relationship_descriptions = norm["relationships"]
        self.current_residence = norm["current_residence"]
        self.workplace = norm["workplace"]

        # Enriched backward-compatible lore fields
        self.role = (
            norm["primary_occupation"]
            or (norm["institutional_roles"][0] if norm["institutional_roles"] else "")
            or (norm["narrative_roles"][0] if norm["narrative_roles"] else "")
            or self.get_attribute("role")
        )
        self.title = norm["professional_title"] or (
            self.get_attribute("title")
            if not any(
                p["collection"] == "FORMAL_INVESTIGATION_CASES"
                for p in self.profiles
            )
            else "Unknown"
        )
        self.realm = norm["origin_realm"] or self.get_attribute("realm")
        self.affiliation = (
            (norm["institutions"][0] if norm["institutions"] else "")
            or (norm["social_affiliations"][0] if norm["social_affiliations"] else "")
            or self.get_attribute("affiliation")
        )

        # Classification & Living Population Eligibility
        self.character_classification = norm["character_classification"]
        self.eligible_for_living_sim = bool(norm["eligible_for_living_sim"])
        self.eligibility_reason = norm["eligibility_reason"]
        self.simulation_depth = norm["simulation_depth"]
        self.behavior_override = norm["behavior_override"]
        self.schedule_preset = norm["schedule_preset"]
        self.schedule_mode = self.model.schedule_mode_for(self.schedule_preset)
        age_match = re.search(r"\d+", str(norm.get("age") or ""))
        self.age_years = int(age_match.group()) if age_match else None
        self.life_stage = self.model.life_stage_for(self.age_years)
        self.home_location = self.model.resolve_location(
            self.current_residence, self.realm
        )
        self.work_location = self.model.resolve_location(self.workplace, self.realm)
        if not self.current_location:
            self.current_location = dict(self.home_location)
        self.daily_schedule = self.model.build_daily_schedule(self)

        depth_to_level = {
            "Inactive": 0,
            "Minimal": 1,
            "Standard": 1,
            "Expanded": 2,
        }
        self.simulation_level = depth_to_level.get(self.simulation_depth, 1)

        if norm.get("music_interest_override") is not None:
            self.music_interest = float(norm["music_interest_override"])
        elif self.character_classification == "Entertainment professional":
            self.music_interest = max(self._base_music_interest, 0.78)
        else:
            self.music_interest = self._base_music_interest

        if not self.eligible_for_living_sim or self.simulation_depth == "Inactive":
            self.activity = self._inactive_status_label()
        elif self.activity in (
            "Inactive (Case / Medical Record)",
            "Historical Record",
            "Player Controlled",
            "Stationary (Pinned)",
        ):
            self.activity = "Resting"

    def _inactive_status_label(self) -> str:
        if self.character_classification == "Player character":
            return "Player Controlled"
        if self.character_classification == "Historical character":
            return "Historical Record"
        if self.character_classification == "Investigation subject":
            return "Inactive (Case / Medical Record)"
        return "Inactive Record"

    def step(self):

        # Non-participating characters do not run daily living routines
        if (
            not self.eligible_for_living_sim
            or self.simulation_depth == "Inactive"
            or self.behavior_override == "Pinned: Stationary / Record Only"
        ):
            self.activity = (
                "Stationary (Pinned)"
                if self.behavior_override == "Pinned: Stationary / Record Only"
                else self._inactive_status_label()
            )
            return

        clock = self.model.world_clock
        resolution_minutes = {
            "Minimal": 240,
            "Standard": 60,
            "Expanded": clock.step_minutes,
        }.get(self.simulation_depth, clock.step_minutes)
        effective_resolution = max(resolution_minutes, clock.step_minutes)
        if (
            clock.tick_count > 0
            and effective_resolution > clock.step_minutes
            and clock.elapsed_minutes // effective_resolution
            == (clock.elapsed_minutes - clock.step_minutes) // effective_resolution
        ):
            return

        old_activity = self.activity
        update_scale = (
            clock.step_minutes / 30
            if clock.tick_count == 0
            else effective_resolution / 30
        )
        self.hunger = min(100, self.hunger + 3 * update_scale)
        self.energy = max(0, self.energy - 2 * update_scale)
        self.social_need = min(100, self.social_need + update_scale)
        self.hygiene_need = min(100, self.hygiene_need + update_scale)
        self.exercise_need = min(100, self.exercise_need + update_scale)
        self.leisure_need = min(100, self.leisure_need + update_scale)

        scheduled = self.model.scheduled_activity(self)
        if scheduled == "Commuting":
            self.model.advance_travel(self)
        if scheduled == "Sleeping" or self.energy < 20:
            self.activity = "Sleeping"
            self.energy = min(100, self.energy + 12 * update_scale)
        elif self.hunger >= 70 or scheduled == "Eating":
            self.activity = "Eating"
            self.hunger = max(0, self.hunger - 55)
        elif self.hygiene_need >= 75 or scheduled == "Hygiene":
            self.activity = "Hygiene"
            self.hygiene_need = max(0, self.hygiene_need - 65)
        elif (
            self.social_need >= 65
            and self.character_classification != "Investigation subject"
        ):
            self.activity = "Socializing"
            self.social_need = max(0, self.social_need - 25)
        elif self.exercise_need >= 80 or scheduled == "Exercise":
            self.activity = "Exercise"
            self.exercise_need = max(0, self.exercise_need - 65)
            self.energy = max(0, self.energy - 5)
        elif self.leisure_need >= 75 or scheduled == "Leisure":
            self.activity = "Entertainment"
            self.leisure_need = max(0, self.leisure_need - 60)
        elif self.energy < 40 or self.behavior_override == "Focus: Rest & Recovery":
            self.activity = "Resting"
            self.energy = min(100, self.energy + 6 * update_scale)
        elif scheduled is not None:
            self.activity = scheduled
        elif self.behavior_override == "Focus: Creative & Entertainment":
            self.activity = self.random.choices(
                ["Entertainment", "Creative & studio work", "Socializing"],
                weights=[1.2, 1.0, 0.5],
                k=1,
            )[0]
        elif self.behavior_override == "Focus: Career & Institutional":
            self.activity = "Civic & professional duties"
        elif self.behavior_override == "Focus: Social & Community":
            self.activity = "Socializing"
            self.social_need = max(0, self.social_need - 15)
        else:
            self._choose_autonomous_activity(clock.hour)

        if self.activity in ("Entertainment", "Creative & studio work", "Relaxing"):
            self.leisure_need = max(0, self.leisure_need - 20)
        if self.activity == "Socializing":
            self.social_need = max(0, self.social_need - 10)
        self.model.process_citizen_activity(self, old_activity)

    def _choose_autonomous_activity(self, hour: int) -> None:
        cls = self.character_classification
        if cls == "Royalty and officials" and 8 <= hour < 18:
            options = (
                ["Civic & professional duties", "Socializing", "Personal activities"],
                [1.5, 0.5, 0.3],
            )
        elif cls == "Entertainment professional":
            options = (
                [
                    "Creative & studio work",
                    "Entertainment",
                    "Socializing",
                    "Relaxing",
                ],
                [
                    1.1,
                    max(0.4, self.music_interest * 1.3),
                    max(0.3, self.sociability),
                    0.4,
                ],
            )
        elif cls == "Investigation subject":
            options = (
                ["Personal activities", "Resting", "Civic & professional duties"],
                [1.2, 0.6, 0.5],
            )
        elif cls == "Companion":
            options = (
                ["Companion duties", "Socializing", "Relaxing", "Entertainment"],
                [1.2, 0.8, 0.5, 0.4],
            )
        elif cls == "Significant NPC" and 9 <= hour < 17:
            options = (
                [
                    "Civic & professional duties",
                    "Personal activities",
                    "Entertainment",
                    "Socializing",
                ],
                [1.0, 0.6, self.music_interest, self.sociability],
            )
        else:
            options = (
                ["Personal activities", "Entertainment", "Socializing", "Relaxing"],
                [0.6, self.music_interest, self.sociability, 0.5],
            )
        interests = " ".join(
            str(item)
            for item in (self.preferences + self.motivations + self.hobbies)
        ).casefold()
        preference_terms = {
            "Creative & studio work": ("creative", "art", "music", "perform"),
            "Entertainment": ("entertainment", "music", "dance", "film", "social"),
            "Socializing": ("friend", "family", "community", "social", "relationship"),
            "Civic & professional duties": ("career", "work", "service", "responsibility"),
            "Personal activities": ("personal", "study", "research", "learn"),
        }
        weights = [
            weight
            * (
                1.5
                if any(term in interests for term in preference_terms.get(activity, ()))
                else 1.0
            )
            for activity, weight in zip(options[0], options[1])
        ]
        self.activity = self.random.choices(options[0], weights=weights, k=1)[0]

    def runtime_state(self) -> dict:
        fields = (
            "energy",
            "hunger",
            "social_need",
            "hygiene_need",
            "exercise_need",
            "leisure_need",
            "music_interest",
            "sociability",
            "activity",
            "balance",
            "employment",
            "savings",
            "work_minutes_today",
            "last_paid_day",
            "last_rent_day",
            "meals_today",
            "meal_day",
            "travel_minutes_remaining",
            "transport_mode",
            "home_location",
            "work_location",
            "current_location",
            "destination",
            "relationship_links",
            "daily_schedule",
            "schedule_mode",
            "age_years",
            "life_stage",
        )
        return {field: getattr(self, field) for field in fields}

    def restore_runtime_state(self, state: dict) -> None:
        for field, value in state.items():
            if field in self.runtime_state():
                setattr(self, field, value)


class PopulationModel(mesa.Model):

    def __init__(
        self,
        seed=42,
        database: Path = DATABASE,
        run_id: str | None = None,
        step_minutes: int = 30,
        calendar_config: dict | None = None,
        characters: list[dict] | None = None,
        persist: bool = True,
    ):
        self.store = LivingWorldStore(database)
        saved_run = self.store.load_run(run_id) if run_id else None
        saved_state = saved_run["state"] if saved_run else None
        if saved_state:
            seed = int(saved_state.get("seed", seed))
            step_minutes = int(saved_state["clock"]["step_minutes"])
            calendar_config = saved_run["calendar"]

        super().__init__(seed=seed)
        self._revision = saved_run["revision"] if saved_run else 0
        self._defer_persistence = False
        self._extensions = copy.deepcopy(saved_state or {})
        for key in ("format_version", "seed", "clock", "calendar", "playing", "random_state", "citizens"):
            self._extensions.pop(key, None)
        self.seed = int(seed)
        self.world_clock = (
            WorldClock.from_state(saved_state["clock"])
            if saved_state
            else WorldClock(step_minutes=step_minutes)
        )
        self.calendar_config = validate_calendar_config(
            DEFAULT_CALENDAR_CONFIG if calendar_config is None else calendar_config
        )
        self._is_playing = False
        self._pending_transactions: list[dict] = []
        self.run_id = saved_run["run_id"] if saved_run else ""
        self.run_name = (
            saved_run["name"]
            if saved_run
            else f"Living World Experiment {len(self.store.list_runs()) + 1}"
        )
        self.world_reference = self._load_world_reference()
        self.realm_by_name = {
            str(realm["name"]).casefold(): realm
            for realm in self.world_reference.get("realms", [])
        }

        overrides = load_all_overrides()
        source_characters = load_characters() if characters is None else characters
        for character in source_characters:
            cid = character["CharacterId"]
            Citizen(self, character, staged_override=overrides.get(cid))

        self._orphan_citizens = {cid: copy.deepcopy(v) for cid,v in (saved_state or {}).get("citizens", {}).items() if not any(c.character_id == cid for c in self.agents)}
        if saved_state:
            self._restore_state(saved_state)
        self._restore_service_state()
        self._rebuild_world_graph()

        self.datacollector = mesa.DataCollector(
            model_reporters={
                "Population": lambda m: sum(
                    1 for a in m.agents if a.eligible_for_living_sim
                ),
                "Average Energy": lambda m: (
                    sum(a.energy for a in m.agents if a.eligible_for_living_sim)
                    / max(1, len(m.living_agents))
                ),
                "Entertainment": lambda m: sum(
                    a.activity in ("Entertainment", "Creative & studio work")
                    for a in m.agents
                    if a.eligible_for_living_sim
                ),
                "Socializing": lambda m: sum(
                    a.activity == "Socializing"
                    for a in m.agents
                    if a.eligible_for_living_sim
                ),
            }
        )
        if saved_state:
            random_state = saved_state.get("random_state")
            if random_state is not None:
                self.random.setstate(self._tuple_tree(random_state))
        elif persist:
            self.run_id = self.store.create_run(self.run_name, self._export_state())

    @property
    def living_agents(self):
        return [a for a in self.agents if a.eligible_for_living_sim]

    @property
    def day(self):
        return self.world_clock.day_index + 1

    @property
    def hour(self):
        return self.world_clock.hour

    @property
    def minute(self):
        return self.world_clock.minute

    @property
    def step_minutes(self):
        return self.world_clock.step_minutes

    def current_world_date(self, realm: str = "", affiliation: str = "") -> dict:
        return world_date(
            self.world_clock.day_index,
            self.world_clock.minute_of_day,
            self.calendar_config,
            realm=realm,
            affiliation=affiliation,
            _validated=True,
        )

    @staticmethod
    def schedule_mode_for(schedule_preset: str) -> str:
        if schedule_preset in (
            "Institutional / Chancery Hours",
            "Academic & Campus Schedule",
            "Shift / Emergency Responder",
        ):
            return "Fixed"
        if schedule_preset in ("Creative & Nightlife Cycle", "Low-Profile / Restricted"):
            return "Flexible"
        return "Dynamic"

    @staticmethod
    def life_stage_for(age_years: int | None) -> str:
        if age_years is None:
            return "Unknown"
        if age_years < 13:
            return "Child"
        if age_years < 18:
            return "Adolescent"
        if age_years < 65:
            return "Adult"
        return "Elder"

    _WORLD_REF_CACHE: dict | None = None

    @classmethod
    def _load_world_reference(cls) -> dict:
        if cls._WORLD_REF_CACHE is not None:
            return cls._WORLD_REF_CACHE
        places_path = WORLD_REFERENCE
        if not places_path.is_file():
            raise FileNotFoundError(f"Canonical geography reference not found: {places_path}")
        with places_path.open("r", encoding="utf-8") as source:
            reference = json.load(source)
        if not isinstance(reference, dict) or not isinstance(reference.get("realms"), list):
            raise ValueError(f"Canonical geography reference is invalid: {places_path}")
        cls._WORLD_REF_CACHE = reference
        return reference

    def resolve_location(self, place_name: str, realm_hint: str = "") -> dict:
        text = str(place_name or "").strip()
        normalized = text.casefold()
        realm_record = self.realm_by_name.get(str(realm_hint or "").casefold())
        realm_name = str(realm_record.get("name") or "") if realm_record else ""

        for venue in self.world_reference.get("venues", []):
            candidates = [
                str(venue.get("name") or ""),
                str(venue.get("address") or ""),
                str(venue.get("district") or ""),
            ]
            if normalized and any(
                candidate and candidate.casefold() in normalized
                for candidate in candidates
            ):
                venue_realm = next(
                    (
                        item["name"]
                        for item in self.world_reference["realms"]
                        if item.get("id") == venue.get("realmId")
                    ),
                    realm_name,
                )
                return {
                    "label": str(venue.get("name") or text),
                    "realm": venue_realm,
                    "city": str(venue.get("city") or ""),
                    "district": str(venue.get("district") or ""),
                    "kind": str(venue.get("kind") or ""),
                    "mapping_status": "mapped",
                }

        for realm in self.world_reference["realms"]:
            name = str(realm.get("name") or "")
            capital = str(realm.get("capital") or "")
            if (name and name.casefold() in normalized) or (
                capital and capital.casefold() in normalized
            ):
                realm_record = realm
                realm_name = name
                break

        if realm_record:
            return {
                "label": text or str(realm_record.get("capital") or realm_name),
                "realm": realm_name,
                "city": str(realm_record.get("capital") or ""),
                "district": "",
                "kind": "Realm",
                "mapping_status": "realm",
            }
        return {
            "label": text or "Unassigned",
            "realm": realm_name,
            "city": "",
            "district": "",
            "kind": "Unmapped",
            "mapping_status": "unmapped",
        }

    def _travel_minutes(self, citizen: Citizen) -> int:
        home_realm = str(citizen.home_location.get("realm") or "")
        work_realm = str(citizen.work_location.get("realm") or "")
        if home_realm and work_realm and home_realm.casefold() != work_realm.casefold():
            return 120
        home_city = str(citizen.home_location.get("city") or "")
        work_city = str(citizen.work_location.get("city") or "")
        return 30 if home_city.casefold() == work_city.casefold() else 60

    def build_daily_schedule(self, citizen: Citizen) -> list[dict]:
        preset = citizen.schedule_preset
        if preset == "Creative & Nightlife Cycle":
            sleep = (2 * 60, 9 * 60)
            work_start = 13 * 60
        elif preset == "Academic & Campus Schedule":
            sleep = (22 * 60, 6 * 60)
            work_start = 8 * 60 + 30
        elif preset == "Shift / Emergency Responder":
            sleep = (22 * 60, 6 * 60)
            work_start = 7 * 60
        elif preset == "Institutional / Chancery Hours":
            sleep = (22 * 60, 6 * 60)
            work_start = 8 * 60
        else:
            sleep = (22 * 60 + 30, 6 * 60)
            work_start = 9 * 60

        schedule = [
            {
                "label": "Sleep",
                "activity": "Sleeping",
                "start": sleep[0],
                "end": sleep[1],
                "flexibility": citizen.schedule_mode.lower(),
                "weekdays": [],
            },
            {
                "label": "Morning hygiene",
                "activity": "Hygiene",
                "start": 6 * 60 + 15,
                "end": 7 * 60,
                "flexibility": "flexible",
                "weekdays": [],
            },
            {
                "label": "Breakfast",
                "activity": "Eating",
                "start": 7 * 60,
                "end": 7 * 60 + 30,
                "flexibility": "flexible",
                "weekdays": [],
            },
            {
                "label": "Lunch",
                "activity": "Eating",
                "start": 12 * 60,
                "end": 12 * 60 + 30,
                "flexibility": "flexible",
                "weekdays": [],
            },
            {
                "label": "Dinner",
                "activity": "Eating",
                "start": 18 * 60,
                "end": 18 * 60 + 30,
                "flexibility": "flexible",
                "weekdays": [],
            },
            {
                "label": "Exercise",
                "activity": "Exercise",
                "start": 17 * 60,
                "end": 17 * 60 + 45,
                "flexibility": "dynamic",
                "weekdays": [],
            },
            {
                "label": "Leisure",
                "activity": "Leisure",
                "start": 19 * 60,
                "end": 21 * 60,
                "flexibility": "dynamic",
                "weekdays": [],
            },
            {
                "label": "Evening hygiene",
                "activity": "Hygiene",
                "start": 21 * 60,
                "end": 21 * 60 + 30,
                "flexibility": "flexible",
                "weekdays": [],
            },
        ]

        has_work = bool(
            citizen.primary_occupation
            and citizen.primary_occupation.casefold() not in ("unknown", "none")
        )
        if has_work:
            shift_length = 6 * 60 if preset == "Academic & Campus Schedule" else 8 * 60
            work_end = work_start + shift_length
            weekdays = (
                []
                if preset in (
                    "Shift / Emergency Responder",
                    "Creative & Nightlife Cycle",
                )
                else self.calendar_config["workdays"]
            )
            travel = self._travel_minutes(citizen)
            schedule.extend(
                [
                    {
                        "label": "Commute to work",
                        "activity": "Commuting",
                        "start": max(0, work_start - travel),
                        "end": work_start,
                        "flexibility": "fixed",
                        "weekdays": weekdays,
                        "destination": "work",
                    },
                    {
                        "label": "Work shift",
                        "activity": "Civic & professional duties",
                        "start": work_start,
                        "end": work_end,
                        "flexibility": "fixed",
                        "weekdays": weekdays,
                    },
                    {
                        "label": "Commute home",
                        "activity": "Commuting",
                        "start": work_end,
                        "end": min(1440, work_end + travel),
                        "flexibility": "fixed",
                        "weekdays": weekdays,
                        "destination": "home",
                    },
                ]
            )
        return schedule

    def scheduled_activity(self, citizen: Citizen) -> str | None:
        date = self.current_world_date(
            citizen.realm,
            citizen.social_affiliations[0] if citizen.social_affiliations else "",
        )
        minute = self.world_clock.minute_of_day
        civic_holiday = any(event["kind"] == "civic" for event in date["events"])
        for block in citizen.daily_schedule:
            if (
                citizen.schedule_mode == "Dynamic"
                and block["flexibility"] == "dynamic"
            ):
                continue
            if block["weekdays"] and date["weekday"] not in block["weekdays"]:
                continue
            if civic_holiday and block["activity"] in (
                "Civic & professional duties",
                "Commuting",
            ):
                continue
            start = block["start"]
            end = block["end"]
            if start == end:
                continue
            within = start <= minute < end if start < end else minute >= start or minute < end
            if not within and block["flexibility"] == "flexible":
                within = (
                    (start - 60) % 1440 <= minute < start
                    or end <= minute < (end + 60) % 1440
                )
            if within:
                return block["activity"]
        return None

    def advance_travel(self, citizen: Citizen) -> None:
        home_label = citizen.home_location.get("label")
        work_label = citizen.work_location.get("label")
        if not work_label or work_label == "Unassigned":
            return
        if citizen.destination:
            destination = citizen.destination
        elif citizen.current_location.get("label") == home_label:
            destination = citizen.work_location
        else:
            destination = citizen.home_location
        if citizen.current_location.get("label") == destination.get("label"):
            citizen.travel_minutes_remaining = 0
            citizen.destination = {}
            return
        if citizen.travel_minutes_remaining <= 0:
            citizen.destination = dict(destination)
            citizen.travel_minutes_remaining = self._travel_minutes(citizen)
            if citizen.travel_minutes_remaining <= 30:
                citizen.transport_mode = "Walking"
            elif citizen.home_location.get("realm") != citizen.work_location.get("realm"):
                citizen.transport_mode = "Inter-realm transit"
            else:
                citizen.transport_mode = "Transit"
            self.record_transaction(
                citizen,
                "transport",
                -3.0,
                f"{citizen.transport_mode} fare",
            )
        citizen.travel_minutes_remaining = max(
            0, citizen.travel_minutes_remaining - self.step_minutes
        )
        if citizen.travel_minutes_remaining == 0:
            citizen.current_location = dict(citizen.destination)
            citizen.destination = {}

    def record_transaction(
        self,
        citizen: Citizen,
        kind: str,
        amount: float,
        description: str,
        *,
        savings: bool = False,
    ) -> None:
        if savings:
            citizen.savings += amount
            balance_after = citizen.balance
            savings_after = citizen.savings
        else:
            citizen.balance += amount
            balance_after = citizen.balance
            savings_after = citizen.savings
        date = self.current_world_date(citizen.realm)
        self._pending_transactions.append(
            {
                "transaction_id": str(uuid.uuid4()),
                "character_id": citizen.character_id,
                "step_index": self.world_clock.tick_count,
                "world_date": (
                    f"Year {date['year']} {date['month']} {date['day']} "
                    f"{date['time']}"
                ),
                "kind": kind,
                "amount": amount,
                "balance_after": balance_after,
                "savings_after": savings_after,
                "description": description,
            }
        )

    def process_citizen_activity(self, citizen: Citizen, previous_activity: str) -> None:
        if citizen.activity == "Eating" and previous_activity != "Eating":
            if citizen.meal_day != self.world_clock.day_index:
                citizen.meal_day = self.world_clock.day_index
                citizen.meals_today = 0
            if citizen.meals_today < 3:
                citizen.meals_today += 1
                self.record_transaction(citizen, "food", -5.0, "Meal")

        if citizen.activity != "Civic & professional duties":
            return
        if not citizen.primary_occupation:
            return
        citizen.work_minutes_today += self.step_minutes
        if citizen.work_minutes_today < 8 * 60 or citizen.last_paid_day == self.world_clock.day_index:
            return
        citizen.last_paid_day = self.world_clock.day_index
        gross_pay = (
            150.0
            if citizen.character_classification == "Royalty and officials"
            else (
                120.0
                if citizen.character_classification == "Entertainment professional"
                else 100.0
            )
        )
        if citizen.employment is not None:
            gross_pay = float(citizen.employment["salary"])
        self.record_transaction(
            citizen, "salary", gross_pay * 0.9, "Verified daily shift compensation"
        )
        self.record_transaction(
            citizen,
            "savings",
            gross_pay * 0.1,
            "Automatic savings contribution",
            savings=True,
        )

    def _on_new_day(self, previous_year: int) -> None:
        current_date = self.current_world_date()
        for citizen in self.agents:
            if not citizen.eligible_for_living_sim:
                continue
            citizen.work_minutes_today = 0
            citizen.meals_today = 0
            citizen.meal_day = self.world_clock.day_index
            if current_date["year"] > previous_year and citizen.age_years is not None:
                citizen.age_years += current_date["year"] - previous_year
                citizen.life_stage = self.life_stage_for(citizen.age_years)
            if (
                self.world_clock.day_index % 7 == 0
                and citizen.home_location.get("label") not in ("", "Unassigned")
                and citizen.last_rent_day != self.world_clock.day_index
            ):
                citizen.last_rent_day = self.world_clock.day_index
                self.record_transaction(citizen, "housing", -50.0, "Weekly housing expense")

    def _rebuild_world_graph(self) -> None:
        by_name: dict[str, Citizen] = {}
        for citizen in self.agents:
            for name in [citizen.name, *citizen.normalized.get("aliases", [])]:
                if name:
                    by_name.setdefault(str(name).casefold(), citizen)
            citizen.relationship_links = []
        edges: dict[tuple[str, str, str], dict] = {}

        def link(source: Citizen, target: Citizen | None, kind: str, label: str) -> None:
            target_id = target.character_id if target else ""
            key = (source.character_id, target_id or label.casefold(), kind)
            if key in edges or (target and target.character_id == source.character_id):
                return
            edge = {
                "kind": kind,
                "target_id": target_id,
                "target_name": target.name if target else label,
                "source": "profile" if target else "unresolved profile reference",
            }
            edges[key] = edge
            source.relationship_links.append(edge)

        for citizen in self.agents:
            for description in citizen.relationship_descriptions:
                raw = str(description).strip()
                if ":" in raw:
                    relation, target_name = raw.split(":", 1)
                else:
                    relation, target_name = "acquaintance", raw
                kind_text = relation.casefold()
                kind = (
                    "family"
                    if any(
                        word in kind_text
                        for word in (
                            "family",
                            "parent",
                            "mother",
                            "father",
                            "sibling",
                            "child",
                            "daughter",
                            "son",
                            "spouse",
                            "cousin",
                            "guardian",
                        )
                    )
                    else (
                        "friend"
                        if "friend" in kind_text
                        else (
                            "coworker"
                            if "coworker" in kind_text or "colleague" in kind_text
                            else "acquaintance"
                        )
                    )
                )
                target_name = target_name.strip()
                target = by_name.get(target_name.casefold())
                link(citizen, target, kind, target_name)

        coworkers: dict[str, list[Citizen]] = defaultdict(list)
        for citizen in self.living_agents:
            workplace = str(citizen.workplace or "").strip().casefold()
            if workplace:
                coworkers[workplace].append(citizen)
        for group in coworkers.values():
            ordered = sorted(group, key=lambda person: person.character_id)
            for index, citizen in enumerate(ordered):
                for other in ordered[index + 1 : index + 6]:
                    link(citizen, other, "coworker", other.name)
                    link(other, citizen, "coworker", citizen.name)

        citizens_by_realm: dict[str, list[Citizen]] = defaultdict(list)
        for citizen in self.living_agents:
            realm = str(citizen.realm or "").strip()
            if realm and realm.casefold() != "unknown":
                citizens_by_realm[realm.casefold()].append(citizen)
        for group in citizens_by_realm.values():
            ordered = sorted(group, key=lambda person: person.character_id)
            for index, citizen in enumerate(ordered):
                added = 0
                for other in ordered[index + 1 :] + ordered[:index]:
                    if citizen.workplace and (
                        citizen.workplace.casefold()
                        == str(other.workplace or "").casefold()
                    ):
                        continue
                    link(citizen, other, "acquaintance", other.name)
                    added += 1
                    if added == 3:
                        break
        self.relationship_edges = [
            {"source_id": source_id, **edge}
            for (source_id, _, _), edge in edges.items()
        ]
        for record in self._extensions.get("relationships", []):
            source = next((c for c in self.agents if c.character_id == record.get("fromCharacterId")), None)
            target = next((c for c in self.agents if c.character_id == record.get("toCharacterId")), None)
            if source is not None and target is not None:
                edge = {"source_id": source.character_id, "target_id": target.character_id,
                        "target_name": target.name, "kind": record.get("kind", "acquaintance"),
                        "source": "run service", "trust": record.get("trust", 0), "affection": record.get("affection", 0)}
                source.relationship_links.append({k: v for k, v in edge.items() if k != "source_id"})
                self.relationship_edges.append(edge)
        institutions: dict[str, dict] = {}
        for citizen in self.living_agents:
            names = list(citizen.institutions)
            if citizen.workplace:
                names.append(citizen.workplace)
            for name in names:
                label = str(name).strip()
                if not label:
                    continue
                key = label.casefold()
                if any(word in key for word in ("academy", "school", "university", "college")):
                    kind = "school"
                elif any(
                    word in key
                    for word in ("council", "department", "government", "civic", "ministry")
                ):
                    kind = "government"
                elif any(word in key for word in ("medical", "hospital", "clinic", "service")):
                    kind = "service"
                elif any(
                    word in key
                    for word in (
                        "bank",
                        "business",
                        "company",
                        "market",
                        "press",
                        "publisher",
                        "shop",
                        "studio",
                    )
                ):
                    kind = "business"
                else:
                    kind = "institution"
                institution = institutions.setdefault(
                    key,
                    {"name": label, "kind": kind, "citizen_ids": []},
                )
                if citizen.character_id not in institution["citizen_ids"]:
                    institution["citizen_ids"].append(citizen.character_id)
        self.institutions = sorted(
            institutions.values(), key=lambda institution: institution["name"].casefold()
        )

    def _export_state(self) -> dict:
        return {
            **copy.deepcopy(self._extensions),
            "format_version": 1,
            "seed": self.seed,
            "clock": self.world_clock.to_state(),
            "calendar": self.calendar_config,
            "playing": self._is_playing,
            "random_state": self._json_tree(self.random.getstate()),
            "citizens": {**copy.deepcopy(self._orphan_citizens), **{
                citizen.character_id: citizen.runtime_state()
                for citizen in self.agents
            }},
        }

    @staticmethod
    def _json_tree(value):
        if isinstance(value, tuple):
            return [PopulationModel._json_tree(item) for item in value]
        if isinstance(value, list):
            return [PopulationModel._json_tree(item) for item in value]
        return value

    @staticmethod
    def _tuple_tree(value):
        if isinstance(value, list):
            return tuple(PopulationModel._tuple_tree(item) for item in value)
        return value

    def _restore_state(self, state: dict) -> None:
        if int(state.get("format_version", 1)) > 1:
            raise ValueError("This world run was saved by a newer simulation format")
        for citizen in self.agents:
            saved = state.get("citizens", {}).get(citizen.character_id)
            if isinstance(saved, dict):
                citizen.restore_runtime_state(saved)

    def save(self) -> None:
        if not self.run_id:
            raise RuntimeError("Cannot save a living-world run without a run ID")
        if self._defer_persistence:
            return
        self._revision = self.store.save_run(
            self.run_id,
            self._export_state(),
            self._pending_transactions,
            expected_revision=self._revision,
        )
        self._pending_transactions.clear()

    def _restore_service_state(self) -> None:
        citizens = {c.character_id: c for c in self.agents}
        # The old API accounts started at zero and represent run-scoped deltas.
        # Archive the original data and apply each known citizen's delta once.
        legacy_accounts = self._extensions.pop("accounts", None)
        if legacy_accounts is not None:
            archive = self._extensions.setdefault("legacy_service_state", {})
            archive["accounts"] = copy.deepcopy(legacy_accounts)
            for cid, amount in legacy_accounts.items():
                if cid in citizens:
                    citizens[cid].balance += float(amount)
        changed = set()
        assignments = {a.get("characterId"): a for a in self._extensions.get("careers", [])}
        for assignment in assignments.values():
            citizen = citizens.get(assignment.get("characterId"))
            if citizen is not None:
                if citizen.employment != assignment:
                    changed.add(citizen.character_id)
                citizen.employment = copy.deepcopy(assignment)
        for citizen in citizens.values():
            if citizen.employment:
                citizen.primary_occupation = citizen.role = citizen.employment["title"]
                citizen.workplace = citizen.employment.get("employer", "")
                citizen.work_location = self.resolve_location(citizen.workplace, citizen.realm)
                citizen.schedule_mode = str(citizen.employment.get("schedule", "Flexible")).title()
                if citizen.character_id in changed:
                    citizen.daily_schedule = self.build_daily_schedule(citizen)

    def advance_steps(self, steps: int) -> None:
        if type(steps) is not int or not 1 <= steps <= 1440:
            raise ValueError("steps must be an integer between 1 and 1440")
        self._defer_persistence = True
        try:
            for _ in range(steps):
                self.step()
        finally:
            self._defer_persistence = False
        self.save()

    def set_playing(self, playing: bool) -> None:
        self._is_playing = bool(playing)
        self.save()

    def set_step_minutes(self, minutes: int) -> None:
        self.world_clock.set_step_minutes(minutes)
        self.save()

    def configure_calendar(self, config: dict) -> None:
        validated = validate_calendar_config(config)
        self.calendar_config = validated
        for citizen in self.agents:
            citizen.daily_schedule = self.build_daily_schedule(citizen)
        self.save()

    def reload_overrides(self):
        overrides = load_all_overrides()
        for agent in self.agents:
            agent.apply_normalization(overrides.get(agent.character_id))
        self._rebuild_world_graph()
        self.save()

    def reload_from_database(self):
        fresh_by_id = {c["CharacterId"]: c for c in load_characters()}
        overrides = load_all_overrides()
        for agent in self.agents:
            fresh_char = fresh_by_id.get(agent.character_id)
            if fresh_char is not None:
                agent._raw_character = fresh_char
                agent.canonical_name = fresh_char["Name"]
                agent.profiles = fresh_char["profiles"]
            agent.apply_normalization(overrides.get(agent.character_id))
        self._rebuild_world_graph()
        self.save()

    def step(self):
        if self.run_id and not self._defer_persistence:
            record = next((r for r in self.store.list_runs() if r["RunId"] == self.run_id), None)
            if record is None or record["Revision"] != self._revision:
                raise RunConflictError("This run changed in another client. Reload it before advancing.")
        previous_year = self.current_world_date()["year"]
        self.agents.shuffle_do("step")
        self.datacollector.collect(self)
        previous_day = self.world_clock.day_index
        self.world_clock.advance()
        day_rolled = self.world_clock.day_index != previous_day
        if day_rolled:
            self._on_new_day(previous_year)
        entertainment.step_entertainment(self, day_rolled=day_rolled, previous_year=previous_year)
        # Persist immediately on manual steps/scripts; checkpoint daily during high-speed Play (Pause also saves)
        if not self._is_playing or day_rolled:
            self.save()


if __name__ == "__main__":

    model = PopulationModel()

    print("\nMIRAVERSE POPULATION SIMULATOR")
    print("=" * 50)

    print(f"Total character records: {len(model.agents)}")
    print(f"Living participating citizens: {len(model.living_agents)}")

    print("\n--- CITIZEN DIRECTORY ---")

    for citizen in model.agents:

        print(
            f"{citizen.name} | "
            f"{citizen.character_classification} | "
            f"{'Living' if citizen.eligible_for_living_sim else 'Excluded'} | "
            f"{citizen.role} | "
            f"{citizen.realm}"
        )

    print("\n--- SIMULATION STARTED ---")

    for _ in range(48):

        current_time = f"{model.hour:02d}:{model.minute:02d}"

        model.step()

        if current_time.endswith(":00"):

            print(f"\nTime: {current_time}")

            activities = Counter(
                citizen.activity
                for citizen in model.living_agents
            )

            for activity, count in activities.items():
                print(f"  {activity}: {count}")

    print("\nSimulation completed.")
    print(
        "Canonical character records remain unchanged; "
        "experimental run state is saved separately."
    )
