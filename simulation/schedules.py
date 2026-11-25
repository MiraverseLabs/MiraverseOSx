from __future__ import annotations

from typing import Any

DEFAULT_ROUTINE: list[dict[str, Any]] = [
    {"start": 0, "duration": 480, "activity": "Sleeping", "category": "rest"},
    {"start": 480, "duration": 60, "activity": "Breakfast", "category": "meal"},
    {"start": 540, "duration": 120, "activity": "Working", "category": "work"},
    {"start": 660, "duration": 60, "activity": "Lunch", "category": "meal"},
    {"start": 720, "duration": 120, "activity": "Working", "category": "work"},
    {"start": 840, "duration": 60, "activity": "Exercise", "category": "health"},
    {"start": 900, "duration": 120, "activity": "Socializing", "category": "social"},
    {"start": 1020, "duration": 120, "activity": "Relaxation", "category": "leisure"},
    {"start": 1140, "duration": 60, "activity": "Dinner", "category": "meal"},
    {"start": 1200, "duration": 240, "activity": "Sleeping", "category": "rest"},
]

NEED_WEIGHTS = {
    "rest": 0.3,
    "meal": 0.2,
    "work": 0.2,
    "social": 0.15,
    "leisure": 0.1,
    "health": 0.05,
}


def build_schedule(
    character: dict[str, Any],
    clock: dict[str, int],
    level: int = 1,
) -> dict[str, Any]:
    """Deterministically derive a daily routine for one character.

    Level 0 characters are archival and receive no routine. Level 1 uses the
    shared default routine. Levels 2 and 3 add preference-driven variations
    while preserving the same activity vocabulary.
    """
    if level <= 0:
        return {"characterId": character.get("CharacterId", ""), "level": 0, "blocks": []}

    blocks = [dict(block) for block in DEFAULT_ROUTINE]
    if level >= 2:
        preference = str(character.get("preference") or "").casefold()
        if preference in ("night", "nocturnal"):
            blocks = [
                {"start": 0, "duration": 240, "activity": "Working", "category": "work"},
                {"start": 240, "duration": 120, "activity": "Relaxation", "category": "leisure"},
                {"start": 360, "duration": 480, "activity": "Sleeping", "category": "rest"},
                {"start": 840, "duration": 120, "activity": "Working", "category": "work"},
                {"start": 960, "duration": 480, "activity": "Socializing", "category": "social"},
            ]
        elif preference in ("creative", "artist"):
            blocks[4] = {"start": 720, "duration": 180, "activity": "Creative activities", "category": "work"}
    if level >= 3:
        blocks.append(
            {
                "start": 660,
                "duration": 30,
                "activity": "Personal goal review",
                "category": "goal",
            }
        )

    return {
        "characterId": character.get("CharacterId", ""),
        "name": character.get("Name", ""),
        "level": level,
        "minuteOfDay": clock.get("elapsed_minutes", 0) % 1440,
        "blocks": blocks,
        "needs": dict(NEED_WEIGHTS),
    }