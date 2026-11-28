"""Autonomous Living-World NPC Social Media Feed for MAI.SPACE.

Generates rate-limited, deterministic, in-character citizen posts driven by the
shared real-time clock, NPC schedules, careers, employers, realms, and interests.
Supports offline catch-up without flooding and player likes/comments persistence.
"""
from __future__ import annotations

import hashlib
from typing import Any

MAX_FEED_POSTS = 60
POST_INTERVAL_MINUTES = 30

REALM_ATMOSPHERE: dict[str, tuple[str, ...]] = {
    "Orynvell": (
        "golden Aetherlight catching the Glassline towers",
        "the Broad Street trams humming past the Chancery",
        "a quiet evening breeze along Harborfront",
    ),
    "Fross": (
        "crisp frost-mist drifting across Frostmere",
        "clear glacial skies over Northwake Ward",
        "lanterns glowing against the Rimegate snow",
    ),
    "Lumia": (
        "bright solstice sun along Helios Promenade",
        "warm starlight reflections off Lumen Spire",
        "late-afternoon music drifting through Starlight Quarter",
    ),
    "Marlowe": (
        "salt breeze rolling in off Marlowe Harbor",
        "lanterns swaying along Lantern Pier",
        "high tide shimmering near Tidal Springs",
    ),
    "Brisland": (
        "autumn wind sweeping over Highmoor",
        "amber leaves gathering along Meadowgate",
        "clear highland air out past Briarwood",
    ),
    "Kaji": (
        "warm forge-glow rising over Balisya",
        "sparks and evening chatter in Resonance Quarter",
        "volcanic twilight across the Terrace Steps",
    ),
    "Nephele": (
        "silver cloud-mist curling around Cloud-Spire",
        "quiet dusk lanterns along Mistwalk",
        "cool starlit air across Skybridge",
    ),
    "Ve’Raylia": (
        "emerald canopy light over Elmore Seat",
        "morning dew along Grovewalk and Moonwell",
        "soft botanical scent drifting through Sylvan Court",
    ),
}

ACTIVITY_TEMPLATES: dict[str, tuple[str, ...]] = {
    "work": (
        "Wrapping up a busy stretch as {occupation} with {employer}. Nothing beats seeing {atmosphere} on the walk out.",
        "Mid-shift check-in from {employer} — keeping {realm} moving one task at a time.",
        "Good momentum today in my {occupation} work at {employer}. Treating myself to a quiet evening after this.",
    ),
    "study": (
        "Deep in notes and research right now ({interest}). The quiet hours are when everything finally clicks.",
        "Reviewing new material on {interest} while watching {atmosphere}.",
        "Study break! Trying to balance {occupation} prep with my side interest in {interest}.",
    ),
    "social": (
        "Catching up with friends in {realm} — {atmosphere} makes the whole evening feel brighter.",
        "Good conversation over tea and small plates tonight. Grateful for this corner of {realm}.",
        "Running into familiar faces around town while talking about {interest}.",
    ),
    "leisure": (
        "Taking a slow hour for {interest} today. {atmosphere_cap} outside my window.",
        "Unwinding after a full schedule — finally getting back to {interest}.",
        "Small joy of the day: {atmosphere}, no rush, and time for {interest}.",
    ),
    "commute": (
        "On the transit line across {realm} watching {atmosphere} pass by.",
        "Heading out for the next part of the day — {realm} is lively right now.",
    ),
    "rest": (
        "Winding down for the night in {realm}. Wishing everyone a restful cycle ahead.",
        "Quiet nightcap after a full day as {occupation}. See you all tomorrow on MAI.SPACE.",
    ),
}


def _det_int(seed_text: str) -> int:
    return int(hashlib.sha256(seed_text.encode("utf-8")).hexdigest()[:8], 16)


def _format_clock(elapsed_minutes: int) -> tuple[int, str]:
    day = (elapsed_minutes // 1440) + 1
    mod = elapsed_minutes % 1440
    hh, mm = divmod(mod, 60)
    return day, f"{hh:02d}:{mm:02d}"


def _agent_activity(agent: Any, minute_of_day: int) -> str:
    blocks = getattr(agent, "daily_schedule", None) or []
    for block in blocks:
        start = int(block.get("start_minute", 0))
        end = int(block.get("end_minute", 1440))
        if start <= minute_of_day < end:
            kind = str(block.get("kind") or block.get("activity") or "leisure").lower()
            for key in ACTIVITY_TEMPLATES:
                if key in kind:
                    return key
            if "shift" in kind or "job" in kind:
                return "work"
            if "sleep" in kind:
                return "rest"
    if 22 * 60 <= minute_of_day or minute_of_day < 6 * 60:
        return "rest"
    if 9 * 60 <= minute_of_day < 17 * 60:
        return "work"
    return "leisure"


def _build_post_for_agent(model: Any, agent: Any, slot_minute: int) -> dict[str, Any]:
    cid = str(getattr(agent, "character_id", "") or getattr(agent, "unique_id", "citizen"))
    name = str(getattr(agent, "name", "Meridion Citizen"))
    handle = "".join(ch for ch in name.lower() if ch.isalnum() or ch in ("_", ".")).strip(".") or "citizen"
    realm = str(getattr(agent, "home_realm", None) or getattr(agent, "realm", None) or "Orynvell")
    occupation = str(getattr(agent, "occupation", None) or "Resident")
    employer = str(getattr(agent, "employer", None) or f"{realm} Commons")
    interests = getattr(agent, "interests", None) or []
    interest = str(interests[_det_int(f"{cid}:{slot_minute}:int") % len(interests)]) if interests else "local life"

    minute_of_day = slot_minute % 1440
    activity = _agent_activity(agent, minute_of_day)
    templates = ACTIVITY_TEMPLATES.get(activity, ACTIVITY_TEMPLATES["leisure"])
    atm_pool = REALM_ATMOSPHERE.get(realm, REALM_ATMOSPHERE["Orynvell"])

    h = _det_int(f"{model.run_id}:{cid}:{slot_minute}")
    atm = atm_pool[h % len(atm_pool)]
    tpl = templates[(h >> 4) % len(templates)]
    body = tpl.format(
        occupation=occupation,
        employer=employer,
        realm=realm,
        interest=interest,
        atmosphere=atm,
        atmosphere_cap=atm[0].upper() + atm[1:],
    )

    day, hhmm = _format_clock(slot_minute)
    world_date = model.current_world_date() if hasattr(model, "current_world_date") else f"Day {day}"
    tag_realm = "".join(ch for ch in realm if ch.isalnum())
    tag_act = activity.capitalize()

    return {
        "id": f"lw-post-{slot_minute}-{cid}",
        "authorId": cid,
        "authorName": name,
        "handle": handle,
        "realm": realm,
        "occupation": occupation,
        "employer": employer,
        "activity": activity,
        "body": body,
        "tags": [f"#{tag_realm}", f"#{tag_act}"],
        "elapsedMinutes": slot_minute,
        "day": day,
        "worldTime": hhmm,
        "worldDate": str(world_date),
        "likes": 1 + (h % 14),
        "likedByPlayer": False,
        "comments": [],
        "source": "living_world_autonomous",
    }


def sync_autonomous_posts(model: Any, *, max_new: int = 8) -> list[dict[str, Any]]:
    """Advance autonomous NPC social posts up to the current Living World clock.

    Rate-limited to one slot per POST_INTERVAL_MINUTES so offline catch-up
    produces a natural highlight stream instead of flooding.
    """
    feed: list[dict[str, Any]] = list(model._extensions.get("social_feed") or [])
    existing_ids = {p["id"] for p in feed if isinstance(p, dict) and "id" in p}

    now_min = int(getattr(model.world_clock, "elapsed_minutes", 0))
    last_min = int(model._extensions.get("social_feed_last_minute", -1))

    eligible = [
        a for a in getattr(model, "agents", [])
        if getattr(a, "name", None) and getattr(a, "character_id", None)
    ]
    if not eligible:
        return feed

    slots: list[int] = []
    if last_min < 0:
        # Seed 6 recent posts leading up to the current real-time clock so the feed is immediately alive
        for k in range(5, -1, -1):
            slots.append(max(0, now_min - k * POST_INTERVAL_MINUTES))
    elif now_min >= last_min + POST_INTERVAL_MINUTES:
        start_slot = ((last_min // POST_INTERVAL_MINUTES) + 1) * POST_INTERVAL_MINUTES
        all_slots = list(range(start_slot, now_min + 1, POST_INTERVAL_MINUTES))
        # During long offline catch-ups, sample evenly up to max_new posts
        if len(all_slots) > max_new:
            step = max(1, len(all_slots) // max_new)
            slots = all_slots[-max_new * step :: step][-max_new:]
        else:
            slots = all_slots

    added = 0
    for slot in slots:
        idx = _det_int(f"{model.run_id}:slot:{slot}") % len(eligible)
        agent = eligible[idx]
        post = _build_post_for_agent(model, agent, slot)
        if post["id"] not in existing_ids:
            feed.insert(0, post)
            existing_ids.add(post["id"])
            added += 1

    if slots:
        feed.sort(key=lambda p: int(p.get("elapsedMinutes", 0)), reverse=True)
        feed = feed[:MAX_FEED_POSTS]
        model._extensions["social_feed"] = feed
        model._extensions["social_feed_last_minute"] = now_min

    return feed


def toggle_like(model: Any, post_id: str) -> dict[str, Any]:
    feed = sync_autonomous_posts(model)
    for post in feed:
        if post.get("id") == post_id:
            liked = not bool(post.get("likedByPlayer"))
            post["likedByPlayer"] = liked
            post["likes"] = max(0, int(post.get("likes", 0)) + (1 if liked else -1))
            model._extensions["social_feed"] = feed
            return post
    raise ValueError(f"Post not found: {post_id}")


def add_comment(model: Any, post_id: str, text: str, author_name: str = "You") -> dict[str, Any]:
    clean = (text or "").strip()[:500]
    if not clean:
        raise ValueError("Comment text is required")
    feed = sync_autonomous_posts(model)
    for post in feed:
        if post.get("id") == post_id:
            comments = list(post.get("comments") or [])
            day, hhmm = _format_clock(int(getattr(model.world_clock, "elapsed_minutes", 0)))
            comments.append({
                "id": f"cmt-{len(comments)+1}-{_det_int(clean + str(day) + hhmm)}",
                "authorName": (author_name or "You").strip()[:80],
                "text": clean,
                "worldTime": f"Day {day} · {hhmm}",
            })
            post["comments"] = comments[-30:]
            model._extensions["social_feed"] = feed
            return post
    raise ValueError(f"Post not found: {post_id}")


def neighborhood_pulse(model: Any, limit: int = 8) -> list[dict[str, Any]]:
    """Return a snapshot of active NPCs and their current scheduled activities."""
    now_min = int(getattr(model.world_clock, "elapsed_minutes", 0))
    minute_of_day = now_min % 1440
    eligible = [a for a in getattr(model, "agents", []) if getattr(a, "name", None)]
    if not eligible:
        return []
    offset = (now_min // 15) % len(eligible)
    out: list[dict[str, Any]] = []
    for i in range(min(limit, len(eligible))):
        a = eligible[(offset + i * 7) % len(eligible)]
        out.append({
            "characterId": str(getattr(a, "character_id", "")),
            "name": str(getattr(a, "name", "Citizen")),
            "realm": str(getattr(a, "home_realm", None) or "Orynvell"),
            "occupation": str(getattr(a, "occupation", None) or "Resident"),
            "activity": _agent_activity(a, minute_of_day),
        })
    return out
