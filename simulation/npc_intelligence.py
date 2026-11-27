"""Hybrid NPC intelligence core for MiraverseOSx Living World.

Integrates NetworkX, py-trees, NumPy, Faker, and Scikit-learn directly into
Mesa's PopulationModel without creating a competing simulation engine.
"""
from __future__ import annotations

import hashlib
import math
import uuid
from datetime import datetime, timezone
from typing import Any

import networkx as nx
import numpy as np
import py_trees
from faker import Faker
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

PERSONALITY_TRAITS: tuple[str, ...] = (
    "openness",
    "conscientiousness",
    "extraversion",
    "agreeableness",
    "neuroticism",
    "ambition",
)

CANONICAL_REALMS: tuple[dict[str, str], ...] = (
    {"name": "Orynvell", "code": "OR", "capital": "Aureline", "district": "Glassline District"},
    {"name": "Fross", "code": "FR", "capital": "Frostmere", "district": "Glacial Reach"},
    {"name": "Lumia", "code": "LU", "capital": "Lumen Spire", "district": "Starlight Quarter"},
    {"name": "Marlowe", "code": "MA", "capital": "Marlowe Harbor", "district": "Tidal Springs"},
    {"name": "Brisland", "code": "BR", "capital": "Highmoor", "district": "Verdant Highlands"},
    {"name": "Kaji", "code": "KA", "capital": "Balisya", "district": "Hearthlands"},
    {"name": "Nephele", "code": "NE", "capital": "Cloud-Spire", "district": "Aether Terrace"},
    {"name": "Ve’Raylia", "code": "VR", "capital": "Elmore Seat", "district": "Astral Promenade"},
)

BACKGROUND_OCCUPATIONS: tuple[tuple[str, str, str], ...] = (
    ("Civic Archivist", "Royal Archives", "Institutional / Chancery Hours"),
    ("Transit Dispatcher", "Aureline Rail Authority", "Shift / Emergency Responder"),
    ("Acoustic Technician", "Kaji Publishing", "Creative & Nightlife Cycle"),
    ("Clinical Intake Nurse", "Faith Medical Group", "Shift / Emergency Responder"),
    ("Research Fellow", "Cyberium Academy", "Academic & Campus Schedule"),
    ("Harbor Logistics Coordinator", "Meridion Post", "Institutional / Chancery Hours"),
    ("Editorial Assistant", "Limelight Magazine", "Creative & Nightlife Cycle"),
    ("Systems Analyst", "Department of Global Affairs", "Institutional / Chancery Hours"),
    ("Botanical Conservator", "Arcadia Reserve", "Standard Daily Routine"),
    ("Treasury Auditor", "Oryn Department of Finance", "Institutional / Chancery Hours"),
)

MAX_MEMORIES_PER_CITIZEN = 25
MAX_KNOWLEDGE_PER_CITIZEN = 30
MAX_PROCEDURAL_CITIZENS = 40


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ---------------------------------------------------------------------------
# NumPy: Layered Personality, Internal State, Weighted Decisions & Stats
# ---------------------------------------------------------------------------

def compute_personality_vector(
    character_id: str,
    *,
    traits_text: str = "",
    sociability: float = 0.5,
    music_interest: float = 0.5,
) -> dict[str, float]:
    """Deterministically seed a 6-axis layered personality vector in [0.05, 0.95]."""
    digest = hashlib.sha256(character_id.encode("utf-8")).digest()
    raw = np.array([b / 255.0 for b in digest[: len(PERSONALITY_TRAITS)]], dtype=np.float64)
    # Center around 0.5 with modest deterministic spread
    base = 0.30 + raw * 0.40
    blob = traits_text.casefold()
    adjustments = np.zeros(len(PERSONALITY_TRAITS), dtype=np.float64)
    adjustments[0] += 0.14 if any(k in blob for k in ("art", "music", "creative", "curious", "research")) else 0.0
    adjustments[1] += 0.14 if any(k in blob for k in ("duty", "discipline", "archive", "finance", "officer")) else 0.0
    adjustments[2] += (float(sociability) - 0.5) * 0.40
    adjustments[3] += 0.10 if any(k in blob for k in ("kind", "medical", "care", "mentor", "community")) else 0.0
    adjustments[4] += 0.10 if any(k in blob for k in ("anxious", "guarded", "cautious", "secret")) else -0.05
    adjustments[5] += 0.12 if any(k in blob for k in ("ambit", "lead", "headliner", "perform", "director")) else 0.0
    adjustments[0] += (float(music_interest) - 0.5) * 0.20
    vec = np.clip(base + adjustments, 0.05, 0.95)
    return {trait: round(float(val), 3) for trait, val in zip(PERSONALITY_TRAITS, vec)}


def evolve_personality(
    personality: dict[str, float],
    *,
    activity: str,
    energy: float,
    social_need: float,
    step_scale: float = 1.0,
) -> dict[str, float]:
    """Apply small bounded personality drift from lived experience."""
    vec = np.array([float(personality.get(t, 0.5)) for t in PERSONALITY_TRAITS], dtype=np.float64)
    delta = np.zeros_like(vec)
    rate = 0.002 * max(0.25, min(2.0, step_scale))
    if activity in ("Creative & studio work", "Entertainment"):
        delta[0] += rate
    elif activity == "Civic & professional duties":
        delta[1] += rate
        delta[5] += rate * 0.5
    elif activity == "Socializing":
        delta[2] += rate
        delta[3] += rate * 0.6
    if energy < 25.0 or social_need > 80.0:
        delta[4] += rate * 0.8
    elif activity in ("Resting", "Sleeping"):
        delta[4] -= rate * 0.5
    updated = np.clip(vec + delta, 0.05, 0.95)
    return {trait: round(float(val), 3) for trait, val in zip(PERSONALITY_TRAITS, updated)}


def weighted_choice(options: list[str], weights: list[float], rng: Any) -> str:
    """NumPy-normalized probabilistic selection with safe fallback."""
    if not options:
        return "Resting"
    arr = np.asarray(weights, dtype=np.float64)
    arr = np.where(np.isfinite(arr) & (arr > 0.0), arr, 0.0)
    total = float(arr.sum())
    if total <= 0.0:
        return options[0]
    probs = arr / total
    cdf = np.cumsum(probs)
    draw = float(rng.random())
    idx = int(np.searchsorted(cdf, draw, side="right"))
    return options[min(idx, len(options) - 1)]


def population_statistics(model: Any) -> dict[str, Any]:
    """Compute NumPy summary statistics across living citizens."""
    living = list(getattr(model, "living_agents", []))
    if not living:
        return {
            "livingCount": 0,
            "energy": {"mean": 0.0, "std": 0.0, "min": 0.0, "max": 0.0},
            "hunger": {"mean": 0.0, "std": 0.0, "min": 0.0, "max": 0.0},
            "balance": {"mean": 0.0, "median": 0.0, "total": 0.0, "p90": 0.0},
            "personalityMeans": {t: 0.5 for t in PERSONALITY_TRAITS},
            "activityCounts": {},
        }
    energies = np.array([float(c.energy) for c in living], dtype=np.float64)
    hungers = np.array([float(c.hunger) for c in living], dtype=np.float64)
    balances = np.array([float(c.balance) for c in living], dtype=np.float64)
    pers_matrix = np.array(
        [[float(getattr(c, "personality", {}).get(t, 0.5)) for t in PERSONALITY_TRAITS] for c in living],
        dtype=np.float64,
    )
    pers_means = np.mean(pers_matrix, axis=0)
    activities: dict[str, int] = {}
    for c in living:
        act = str(getattr(c, "activity", "Resting"))
        activities[act] = activities.get(act, 0) + 1
    return {
        "livingCount": len(living),
        "energy": {
            "mean": round(float(np.mean(energies)), 2),
            "std": round(float(np.std(energies)), 2),
            "min": round(float(np.min(energies)), 2),
            "max": round(float(np.max(energies)), 2),
        },
        "hunger": {
            "mean": round(float(np.mean(hungers)), 2),
            "std": round(float(np.std(hungers)), 2),
            "min": round(float(np.min(hungers)), 2),
            "max": round(float(np.max(hungers)), 2),
        },
        "balance": {
            "mean": round(float(np.mean(balances)), 2),
            "median": round(float(np.median(balances)), 2),
            "total": round(float(np.sum(balances)), 2),
            "p90": round(float(np.percentile(balances, 90)), 2),
        },
        "personalityMeans": {
            trait: round(float(val), 3) for trait, val in zip(PERSONALITY_TRAITS, pers_means)
        },
        "activityCounts": activities,
    }


# ---------------------------------------------------------------------------
# NetworkX: Asymmetric Multidimensional Social & Professional Networks
# ---------------------------------------------------------------------------

class SocialNetworkManager:
    """Maintains an asymmetric NetworkX DiGraph synced with PopulationModel edges."""

    def __init__(self) -> None:
        self.graph: nx.DiGraph = nx.DiGraph()

    def rebuild_from_model(self, model: Any) -> None:
        g = nx.DiGraph()
        day = int(getattr(model, "world_clock", None).day_index) if getattr(model, "world_clock", None) else 0
        for citizen in model.agents:
            g.add_node(
                citizen.character_id,
                name=citizen.name,
                realm=citizen.realm,
                workplace=citizen.workplace,
                classification=citizen.character_classification,
                living=bool(citizen.eligible_for_living_sim),
            )
        for edge in getattr(model, "relationship_edges", []):
            src = str(edge.get("source_id") or "")
            dst = str(edge.get("target_id") or "")
            if not src or not dst or src == dst:
                continue
            kind = str(edge.get("kind") or "acquaintance")
            base_trust = float(edge.get("trust") if edge.get("trust") is not None else (65.0 if kind == "family" else 55.0 if kind == "friend" else 42.0 if kind == "coworker" else 30.0))
            base_aff = float(edge.get("affection") if edge.get("affection") is not None else (72.0 if kind == "family" else 58.0 if kind == "friend" else 35.0 if kind == "coworker" else 28.0))
            respect = float(edge.get("respect") if edge.get("respect") is not None else (52.0 if kind == "coworker" else 45.0))
            familiarity = float(edge.get("familiarity") if edge.get("familiarity") is not None else (75.0 if kind == "family" else 50.0))
            g.add_edge(
                src,
                dst,
                kind=kind,
                trust=round(max(0.0, min(100.0, base_trust)), 2),
                affection=round(max(0.0, min(100.0, base_aff)), 2),
                respect=round(max(0.0, min(100.0, respect)), 2),
                familiarity=round(max(0.0, min(100.0, familiarity)), 2),
                professional_tie=(kind == "coworker"),
                last_interaction_day=int(edge.get("last_interaction_day", day)),
            )
        self.graph = g

    def record_interaction(
        self,
        source_id: str,
        target_id: str,
        *,
        kind: str = "acquaintance",
        trust_delta: float = 1.5,
        affection_delta: float = 1.2,
        respect_delta: float = 0.8,
        day_index: int = 0,
    ) -> None:
        if not source_id or not target_id or source_id == target_id:
            return
        if self.graph.has_edge(source_id, target_id):
            data = self.graph[source_id][target_id]
            data["trust"] = round(max(0.0, min(100.0, float(data.get("trust", 30.0)) + trust_delta)), 2)
            data["affection"] = round(max(0.0, min(100.0, float(data.get("affection", 30.0)) + affection_delta)), 2)
            data["respect"] = round(max(0.0, min(100.0, float(data.get("respect", 40.0)) + respect_delta)), 2)
            data["familiarity"] = round(max(0.0, min(100.0, float(data.get("familiarity", 25.0)) + 2.0)), 2)
            data["last_interaction_day"] = int(day_index)
        else:
            self.graph.add_edge(
                source_id,
                target_id,
                kind=kind,
                trust=round(max(0.0, min(100.0, 30.0 + trust_delta)), 2),
                affection=round(max(0.0, min(100.0, 28.0 + affection_delta)), 2),
                respect=round(max(0.0, min(100.0, 40.0 + respect_delta)), 2),
                familiarity=20.0,
                professional_tie=(kind == "coworker"),
                last_interaction_day=int(day_index),
            )

    def decay_relationships(self, day_index: int) -> int:
        """Gentle daily decay for neglected non-family ties."""
        decayed = 0
        for _, _, data in self.graph.edges(data=True):
            if data.get("kind") == "family":
                continue
            idle = day_index - int(data.get("last_interaction_day", day_index))
            if idle >= 7:
                data["familiarity"] = round(max(5.0, float(data.get("familiarity", 20.0)) - 0.5), 2)
                data["affection"] = round(max(10.0, float(data.get("affection", 25.0)) - 0.3), 2)
                decayed += 1
        return decayed

    def propagate_information(
        self,
        model: Any,
        origin_id: str,
        fact_id: str,
        summary: str,
        *,
        max_hops: int = 2,
        min_trust: float = 35.0,
    ) -> list[str]:
        """Subjective bounded information propagation across trusted neighbors only (no NPC omniscience)."""
        if origin_id not in self.graph:
            return []
        agents_by_id = {c.character_id: c for c in model.agents}
        reached: list[str] = []
        visited = {origin_id}
        frontier = [(origin_id, 0)]
        while frontier:
            current, hop = frontier.pop(0)
            if hop >= max_hops:
                continue
            for neighbor in self.graph.successors(current):
                if neighbor in visited:
                    continue
                edge = self.graph[current][neighbor]
                if float(edge.get("trust", 0.0)) < min_trust:
                    continue
                visited.add(neighbor)
                reached.append(neighbor)
                target_agent = agents_by_id.get(neighbor)
                if target_agent is not None:
                    record_subjective_knowledge(target_agent, fact_id, summary, source=current, confidence=round(float(edge.get("trust", 50.0)) / 100.0, 2))
                frontier.append((neighbor, hop + 1))
        return reached

    def mutual_connections(self, char_a: str, char_b: str) -> list[str]:
        if char_a not in self.graph or char_b not in self.graph:
            return []
        neigh_a = set(self.graph.successors(char_a)) | set(self.graph.predecessors(char_a))
        neigh_b = set(self.graph.successors(char_b)) | set(self.graph.predecessors(char_b))
        return sorted((neigh_a & neigh_b) - {char_a, char_b})

    def summary(self) -> dict[str, Any]:
        node_count = self.graph.number_of_nodes()
        edge_count = self.graph.number_of_edges()
        if node_count == 0:
            return {"nodes": 0, "edges": 0, "density": 0.0, "circles": [], "topInfluencers": [], "asymmetricPairs": 0}
        undirected = self.graph.to_undirected()
        circles: list[list[str]] = []
        if undirected.number_of_edges() > 0:
            try:
                communities = nx.community.greedy_modularity_communities(undirected)
                circles = [sorted(list(comm))[:12] for comm in communities if len(comm) >= 2][:10]
            except Exception:
                circles = []
        centrality = nx.degree_centrality(self.graph) if node_count > 1 else {}
        top_influencers = [
            {"characterId": cid, "name": self.graph.nodes[cid].get("name", cid), "centrality": round(score, 4)}
            for cid, score in sorted(centrality.items(), key=lambda item: item[1], reverse=True)[:10]
        ]
        asymmetric = 0
        seen_pairs: set[tuple[str, str]] = set()
        for u, v, d in self.graph.edges(data=True):
            pair = (min(u, v), max(u, v))
            if pair in seen_pairs:
                continue
            seen_pairs.add(pair)
            if not self.graph.has_edge(v, u):
                asymmetric += 1
            else:
                rev = self.graph[v][u]
                if abs(float(d.get("trust", 0)) - float(rev.get("trust", 0))) > 0.5 or abs(float(d.get("affection", 0)) - float(rev.get("affection", 0))) > 0.5:
                    asymmetric += 1
        return {
            "nodes": node_count,
            "edges": edge_count,
            "density": round(float(nx.density(self.graph)), 4) if node_count > 1 else 0.0,
            "circleCount": len(circles),
            "circles": circles,
            "topInfluencers": top_influencers,
            "asymmetricPairs": asymmetric,
        }


# ---------------------------------------------------------------------------
# Selective Memory & Subjective Knowledge (Bounded, No Omniscience)
# ---------------------------------------------------------------------------

def record_selective_memory(citizen: Any, event_kind: str, summary: str, *, salience: float = 0.5, day_index: int = 0) -> None:
    memories: list[dict[str, Any]] = getattr(citizen, "selective_memory", [])
    entry = {
        "kind": str(event_kind),
        "summary": str(summary)[:180],
        "salience": round(max(0.0, min(1.0, float(salience))), 2),
        "day": int(day_index),
    }
    memories.append(entry)
    if len(memories) > MAX_MEMORIES_PER_CITIZEN:
        # Retain highest-salience + most recent memories
        memories.sort(key=lambda m: (m["day"] * 0.02 + m["salience"]), reverse=True)
        del memories[MAX_MEMORIES_PER_CITIZEN:]
    citizen.selective_memory = memories


def record_subjective_knowledge(citizen: Any, fact_id: str, summary: str, *, source: str = "direct", confidence: float = 0.8) -> None:
    knowledge: dict[str, dict[str, Any]] = getattr(citizen, "subjective_knowledge", {})
    knowledge[str(fact_id)] = {
        "summary": str(summary)[:180],
        "source": str(source),
        "confidence": round(max(0.0, min(1.0, float(confidence))), 2),
    }
    if len(knowledge) > MAX_KNOWLEDGE_PER_CITIZEN:
        oldest = next(iter(knowledge))
        del knowledge[oldest]
    citizen.subjective_knowledge = knowledge


# ---------------------------------------------------------------------------
# py-trees: NPC Behavioral Decision Tree with Interruption & Recovery
# ---------------------------------------------------------------------------

class _NeedBehavior(py_trees.behaviour.Behaviour):
    def __init__(self, name: str, predicate: Any, action: Any):
        super().__init__(name)
        self._predicate = predicate
        self._action = action

    def update(self) -> py_trees.common.Status:
        if self._predicate():
            self._action()
            return py_trees.common.Status.SUCCESS
        return py_trees.common.Status.FAILURE


class NPCBehaviorController:
    """Evaluates a bounded py-trees Selector for a single citizen step."""

    @staticmethod
    def decide_activity(
        citizen: Any,
        *,
        scheduled: str | None,
        hour: int,
        update_scale: float,
        day_index: int,
    ) -> tuple[str, str]:
        """Return (chosen_activity, decision_reason) via py-trees priority selection."""
        chosen: dict[str, str] = {"activity": "", "reason": ""}

        def pick(activity: str, reason: str, *, interruptible: bool = False) -> None:
            if interruptible and citizen.activity and citizen.activity not in ("Sleeping", "Resting", activity):
                citizen.interrupted_activity = citizen.activity
            chosen["activity"] = activity
            chosen["reason"] = reason

        # 1. Critical physiological needs (can interrupt current obligation)
        def act_sleep() -> None:
            pick("Sleeping", "critical_energy_or_sleep_block", interruptible=True)
            citizen.energy = min(100, citizen.energy + 12 * update_scale)

        def act_eat() -> None:
            pick("Eating", "hunger_need_or_meal_block", interruptible=True)
            citizen.hunger = max(0, citizen.hunger - 55)

        def act_hygiene() -> None:
            pick("Hygiene", "hygiene_need_or_block", interruptible=False)
            citizen.hygiene_need = max(0, citizen.hygiene_need - 65)

        # 2. Recovery of previously interrupted activity once critical needs are satisfied
        def can_recover() -> bool:
            return bool(
                getattr(citizen, "interrupted_activity", "")
                and citizen.energy >= 45
                and citizen.hunger < 55
                and scheduled is None
            )

        def act_recover() -> None:
            prev = citizen.interrupted_activity
            citizen.interrupted_activity = ""
            pick(prev, "recovered_interrupted_activity")

        # 3. Social / Exercise / Leisure / Rest needs
        def act_social() -> None:
            pick("Socializing", "social_need_threshold")
            citizen.social_need = max(0, citizen.social_need - 25)

        def act_exercise() -> None:
            pick("Exercise", "exercise_need_or_block")
            citizen.exercise_need = max(0, citizen.exercise_need - 65)
            citizen.energy = max(0, citizen.energy - 5)

        def act_leisure() -> None:
            pick("Entertainment", "leisure_need_or_block")
            citizen.leisure_need = max(0, citizen.leisure_need - 60)

        def act_rest() -> None:
            pick("Resting", "low_energy_or_rest_override")
            citizen.energy = min(100, citizen.energy + 6 * update_scale)

        # 4. Scheduled obligation
        def act_scheduled() -> None:
            pick(str(scheduled), "scheduled_obligation")

        # 5. Behavior override or active goal pursuit
        def act_override_or_goal() -> None:
            override = getattr(citizen, "behavior_override", "None")
            if override == "Focus: Creative & Entertainment":
                act = weighted_choice(
                    ["Entertainment", "Creative & studio work", "Socializing"],
                    [1.2, 1.0, 0.5],
                    citizen.random,
                )
                pick(act, "behavior_override_creative")
                return
            if override == "Focus: Career & Institutional":
                pick("Civic & professional duties", "behavior_override_career")
                return
            if override == "Focus: Social & Community":
                pick("Socializing", "behavior_override_social")
                citizen.social_need = max(0, citizen.social_need - 15)
                return
            goals = getattr(citizen, "active_goals", [])
            if goals:
                top_goal = goals[0]
                goal_map = {
                    "career_growth": "Civic & professional duties",
                    "creative_mastery": "Creative & studio work",
                    "social_connection": "Socializing",
                    "wellbeing": "Relaxing",
                }
                act = goal_map.get(top_goal.get("kind", ""), "Personal activities")
                pick(act, f"goal:{top_goal.get('kind', 'general')}")
                return
            # Contextual spontaneous choice weighted by NumPy + layered personality
            pers = getattr(citizen, "personality", {})
            cls = citizen.character_classification
            if cls == "Royalty and officials" and 8 <= hour < 18:
                opts, w = ["Civic & professional duties", "Socializing", "Personal activities"], [1.5 + pers.get("conscientiousness", 0.5), 0.5 + pers.get("extraversion", 0.5), 0.3]
            elif cls == "Entertainment professional":
                opts, w = ["Creative & studio work", "Entertainment", "Socializing", "Relaxing"], [1.1 + pers.get("openness", 0.5), max(0.4, citizen.music_interest * 1.3), max(0.3, citizen.sociability), 0.4]
            elif cls == "Investigation subject":
                opts, w = ["Personal activities", "Resting", "Civic & professional duties"], [1.2, 0.6, 0.5]
            elif cls == "Companion":
                opts, w = ["Companion duties", "Socializing", "Relaxing", "Entertainment"], [1.2, 0.8 + pers.get("agreeableness", 0.5), 0.5, 0.4]
            else:
                opts, w = ["Personal activities", "Entertainment", "Socializing", "Relaxing"], [0.6 + pers.get("openness", 0.5) * 0.4, citizen.music_interest, citizen.sociability + pers.get("extraversion", 0.5) * 0.4, 0.5]
            pick(weighted_choice(opts, w, citizen.random), "spontaneous_personality_weighted")

        root = py_trees.composites.Selector(name="CitizenDecisionRoot", memory=False)
        root.add_children(
            [
                _NeedBehavior("SleepCheck", lambda: scheduled == "Sleeping" or citizen.energy < 20, act_sleep),
                _NeedBehavior("HungerCheck", lambda: citizen.hunger >= 70 or scheduled == "Eating", act_eat),
                _NeedBehavior("HygieneCheck", lambda: citizen.hygiene_need >= 75 or scheduled == "Hygiene", act_hygiene),
                _NeedBehavior("RecoverInterrupted", can_recover, act_recover),
                _NeedBehavior("SocialNeedCheck", lambda: citizen.social_need >= 65 and citizen.character_classification != "Investigation subject", act_social),
                _NeedBehavior("ExerciseCheck", lambda: citizen.exercise_need >= 80 or scheduled == "Exercise", act_exercise),
                _NeedBehavior("LeisureCheck", lambda: citizen.leisure_need >= 75 or scheduled == "Leisure", act_leisure),
                _NeedBehavior("RestCheck", lambda: citizen.energy < 40 or getattr(citizen, "behavior_override", "") == "Focus: Rest & Recovery", act_rest),
                _NeedBehavior("ScheduledObligation", lambda: scheduled is not None, act_scheduled),
                _NeedBehavior("GoalOrSpontaneous", lambda: True, act_override_or_goal),
            ]
        )
        tree = py_trees.trees.BehaviourTree(root)
        tree.tick()

        activity = chosen["activity"] or "Resting"
        reason = chosen["reason"] or "fallback"
        citizen.last_decision_reason = reason
        if reason.startswith("goal:") or reason in ("critical_energy_or_sleep_block", "recovered_interrupted_activity"):
            record_selective_memory(citizen, "decision", f"{activity} ({reason})", salience=0.45, day_index=day_index)
        return activity, reason


# ---------------------------------------------------------------------------
# Faker: Procedural Noncanonical Background Citizens (Bounded)
# ---------------------------------------------------------------------------

def generate_background_citizen(
    *,
    seed: int | None = None,
    realm: str | None = None,
    existing_ids: set[str] | None = None,
) -> dict[str, Any]:
    """Generate a realm-consistent noncanonical background citizen dict compatible with Citizen()."""
    fake = Faker()
    if seed is not None:
        Faker.seed(seed)
        fake.seed_instance(seed)
    rng = np.random.default_rng(seed)

    chosen_realm = next((r for r in CANONICAL_REALMS if realm and r["name"].casefold() == realm.casefold()), None)
    if chosen_realm is None:
        chosen_realm = CANONICAL_REALMS[int(rng.integers(0, len(CANONICAL_REALMS)))]

    occ, workplace, sched_preset = BACKGROUND_OCCUPATIONS[int(rng.integers(0, len(BACKGROUND_OCCUPATIONS)))]
    existing = existing_ids or set()
    char_id = f"PROC-{chosen_realm['code']}-{uuid.uuid4().hex[:8].upper()}"
    while char_id in existing:
        char_id = f"PROC-{chosen_realm['code']}-{uuid.uuid4().hex[:8].upper()}"

    full_name = fake.name()
    age = int(rng.integers(20, 62))
    hobby_pool = ["music", "astronomy", "archival reading", "harbor walking", "theatre", "synth design", "civic debate", "cooking", "gardening", "photography"]
    picked_hobbies = [hobby_pool[i] for i in rng.choice(len(hobby_pool), size=3, replace=False)]

    return {
        "CharacterId": char_id,
        "Name": full_name,
        "Kind": "person",
        "Status": "procedural",
        "origin": "procedural",
        "canonical": False,
        "db_aliases": [],
        "profiles": [
            {
                "collection": "NPCS",
                "context": "procedural-faker",
                "data": {
                    "role": occ,
                    "title": occ,
                    "realm": chosen_realm["name"],
                    "affiliation": workplace,
                    "hobbies": picked_hobbies,
                },
            },
            {
                "collection": "defaultInputs",
                "context": "procedural-faker",
                "data": {
                    "occupation": occ,
                    "affiliation": workplace,
                    "address": f"{int(rng.integers(10, 420))} {chosen_realm['district']}, {chosen_realm['capital']}, {chosen_realm['name']}",
                    "age": str(age),
                    "preferences": ", ".join(picked_hobbies),
                    "schedule_preset": sched_preset,
                },
            },
        ],
    }


# ---------------------------------------------------------------------------
# Scikit-learn: Adaptive Preferences, Similarity, Matching & Clustering
# ---------------------------------------------------------------------------

class PreferenceRecommender:
    """Scikit-learn TF-IDF + cosine similarity recommender for entertainment, careers, and social ties."""

    @staticmethod
    def _citizen_doc(citizen: Any) -> str:
        parts = [
            str(getattr(citizen, "primary_occupation", "") or ""),
            str(getattr(citizen, "role", "") or ""),
            str(getattr(citizen, "workplace", "") or ""),
            str(getattr(citizen, "realm", "") or ""),
            " ".join(str(x) for x in (getattr(citizen, "preferences", []) or [])),
            " ".join(str(x) for x in (getattr(citizen, "hobbies", []) or [])),
            " ".join(str(x) for x in (getattr(citizen, "motivations", []) or [])),
            " ".join(str(x) for x in (getattr(citizen, "specializations", []) or [])),
        ]
        return " ".join(p for p in parts if p).strip() or "resident meridion"

    def recommend_for_citizen(self, model: Any, character_id: str, *, top_k: int = 5) -> dict[str, Any]:
        citizens = list(model.living_agents)
        target = next((c for c in citizens if c.character_id == character_id), None)
        if target is None:
            raise KeyError(f"Living citizen {character_id!r} not found")

        # 1. Social / citizen similarity recommendations
        docs = [self._citizen_doc(c) for c in citizens]
        target_idx = citizens.index(target)
        social_recs: list[dict[str, Any]] = []
        clusters_summary: dict[str, int] = {}
        if len(citizens) >= 2:
            vec = TfidfVectorizer(stop_words="english", max_features=256)
            matrix = vec.fit_transform(docs)
            sims = cosine_similarity(matrix[target_idx : target_idx + 1], matrix).ravel()
            order = np.argsort(sims)[::-1]
            for idx in order:
                if idx == target_idx:
                    continue
                other = citizens[int(idx)]
                social_recs.append(
                    {
                        "characterId": other.character_id,
                        "name": other.name,
                        "realm": other.realm,
                        "occupation": other.primary_occupation,
                        "similarity": round(float(sims[idx]), 4),
                    }
                )
                if len(social_recs) >= top_k:
                    break

            # Behavioral/interest clustering when population is large enough
            if len(citizens) >= 6:
                n_clusters = min(4, max(2, len(citizens) // 8))
                km = KMeans(n_clusters=n_clusters, n_init=5, random_state=42)
                labels = km.fit_predict(matrix)
                for lbl in labels:
                    key = f"cluster_{int(lbl)}"
                    clusters_summary[key] = clusters_summary.get(key, 0) + 1

        # 2. Personalized entertainment recommendations (tracks)
        tracks = list(model._extensions.get("tracks", []))
        ent_recs: list[dict[str, Any]] = []
        if tracks:
            track_docs = [f"{t.get('title', '')} {t.get('genre', '')} {t.get('stageName', '')}" for t in tracks]
            vec_t = TfidfVectorizer(max_features=128)
            mat_t = vec_t.fit_transform([self._citizen_doc(target)] + track_docs)
            sims_t = cosine_similarity(mat_t[0:1], mat_t[1:]).ravel()
            for idx in np.argsort(sims_t)[::-1][:top_k]:
                tr = tracks[int(idx)]
                ent_recs.append(
                    {
                        "trackId": tr.get("trackId"),
                        "title": tr.get("title"),
                        "stageName": tr.get("stageName"),
                        "genre": tr.get("genre"),
                        "matchScore": round(float(sims_t[idx]) * 0.7 + min(0.3, float(tr.get("quality", 50.0)) / 333.0), 4),
                    }
                )

        # 3. Career & opportunity matching
        import world_services
        careers = world_services.load_canonical_careers()
        career_recs: list[dict[str, Any]] = []
        if careers:
            c_docs = [f"{c.get('name', '')} {c.get('archetype', '')} {c.get('description', '')} {c.get('primaryStat', '')}" for c in careers]
            vec_c = TfidfVectorizer(max_features=128)
            mat_c = vec_c.fit_transform([self._citizen_doc(target)] + c_docs)
            sims_c = cosine_similarity(mat_c[0:1], mat_c[1:]).ravel()
            for idx in np.argsort(sims_c)[::-1][:top_k]:
                car = careers[int(idx)]
                career_recs.append(
                    {
                        "canonicalId": car.get("canonicalId"),
                        "name": car.get("name"),
                        "archetype": car.get("archetype"),
                        "matchScore": round(float(sims_c[idx]), 4),
                    }
                )

        return {
            "characterId": target.character_id,
            "name": target.name,
            "socialRecommendations": social_recs,
            "entertainmentRecommendations": ent_recs,
            "careerRecommendations": career_recs,
            "interestClusters": clusters_summary,
        }
