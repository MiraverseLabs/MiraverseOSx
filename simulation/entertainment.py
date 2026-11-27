from __future__ import annotations

import copy
import json
import math
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from living_world import WorldClock, world_date
from paths import SOURCE_DATABASE

FAME_AXES: tuple[str, ...] = (
    "recognition",
    "favorability",
    "industryReputation",
    "fanLoyalty",
    "artisticCredibility",
    "commercialInfluence",
    "culturalInfluence",
    "mediaVisibility",
)

DISCIPLINES: tuple[str, ...] = (
    "music",
    "dance",
    "theatre",
    "acting",
    "modeling",
    "influencing",
    "broadcasting",
    "journalism",
    "talent_management",
    "public_relations",
    "event_production",
)

# Eight career families. Only "artist" roles become recording/performing artists;
# every other role is staff employment connected to WORKNET, contracts and commissions.
ENTERTAINMENT_CAREER_FAMILIES: dict[str, tuple[tuple[str, str], ...]] = {
    "music": (("singer", "artist"), ("songwriter", "artist"), ("composer", "artist"), ("producer", "staff"), ("sound_engineer", "staff")),
    "performance": (("dancer", "artist"), ("choreographer", "artist"), ("actor", "artist"), ("theatre_performer", "artist")),
    "fashion": (("model", "artist"), ("fashion_designer", "staff"), ("stylist", "staff"), ("creative_director", "staff")),
    "visual_media": (("photographer", "staff"), ("animator", "staff"), ("filmmaker", "staff"), ("editor", "staff")),
    "management": (("talent_agent", "staff"), ("artist_manager", "staff"), ("casting_director", "staff")),
    "communications": (("publicist", "staff"), ("journalist", "staff"), ("radio_host", "staff")),
    "production": (("stage_manager", "staff"), ("lighting_technician", "staff"), ("event_coordinator", "staff")),
    "administration": (("licensing_specialist", "staff"), ("royalty_analyst", "staff"), ("membership_coordinator", "staff")),
}

SHIPPED_AUDIO_TRACKS: tuple[dict[str, Any], ...] = (
    {"audioUrl": "/sounds/mixkit-crystal-chime-3108.wav", "genre": "Celestial Ambient", "durationSeconds": 194},
    {"audioUrl": "/sounds/mixkit-sci-fi-high-tech-sounds-860.wav", "genre": "Glassline Synth", "durationSeconds": 212},
    {"audioUrl": "/sounds/mixkit-sci-fi-machine-deep-hum-2137.wav", "genre": "Nephele Drone", "durationSeconds": 228},
    {"audioUrl": "/sounds/mixkit-water-sci-fi-bleep-902.wav", "genre": "Marlowe Tidewave", "durationSeconds": 186},
    {"audioUrl": "/sounds/mixkit-intro-text-glitch-2950.wav", "genre": "Cyberium Pulse", "durationSeconds": 175},
    {"audioUrl": "/sounds/mixkit-futuristic-tech-engine-glitch-2949.wav", "genre": "Kaji Industrial", "durationSeconds": 205},
    {"audioUrl": "/sounds/mixkit-glitch-sci-fi-rewind-transition-1093.wav", "genre": "Brisland Breakbeat", "durationSeconds": 168},
)

_FALLBACK_STAGE_VENUES: dict[str, dict[str, Any]] = {
    "ORG_LOOKING_GLASS": {"orgId": "ORG_LOOKING_GLASS", "locationId": "loc-looking-glass", "name": "The Looking Glass", "district": "Glassline District", "capacity": 180, "minRecognition": 0.0, "rentalCost": 65.0, "defaultTicket": 18.0, "suggestedTicket": 18.0},
    "ORG_VELVET_STUDIO": {"orgId": "ORG_VELVET_STUDIO", "locationId": "loc-velvet-studio", "name": "The Velvet Cultural Studio", "district": "Promenade Quarter", "capacity": 450, "minRecognition": 8.0, "rentalCost": 190.0, "defaultTicket": 28.0, "suggestedTicket": 28.0},
    "ORG_MARIGOLD_THEATRE": {"orgId": "ORG_MARIGOLD_THEATRE", "locationId": "loc-marigold-theatre", "name": "The Marigold Theatre", "district": "Promenade Quarter", "capacity": 1200, "minRecognition": 12.0, "rentalCost": 480.0, "defaultTicket": 45.0, "suggestedTicket": 45.0},
    "ORG_SILVERLEAF_STADIUM": {"orgId": "ORG_SILVERLEAF_STADIUM", "locationId": "loc-silverleaf-stadium", "name": "Silverleaf Stadium", "district": "Silverleaf Park", "capacity": 45000, "minRecognition": 55.0, "rentalCost": 4500.0, "defaultTicket": 95.0, "suggestedTicket": 95.0},
}

_ORGS_CACHE: list[dict[str, Any]] | None = None
_VENUES_CACHE: dict[str, dict[str, Any]] | None = None


def clear_entertainment_caches() -> None:
    """Clear in-process caches for organizations and venues after a DB migration or update."""
    global _ORGS_CACHE, _VENUES_CACHE
    _ORGS_CACHE = None
    _VENUES_CACHE = None


def load_entertainment_venues() -> dict[str, dict[str, Any]]:
    """Load canonical live-event venues from miraverse.db EntertainmentVenues first,
    then EntertainmentOrganizations (VenueCapacity IS NOT NULL), falling back to defaults only if unavailable."""
    global _VENUES_CACHE
    if _VENUES_CACHE is not None:
        return copy.deepcopy(_VENUES_CACHE)

    import sqlite3
    from contextlib import closing
    from paths import SOURCE_DATABASE

    loaded: dict[str, dict[str, Any]] = {}
    if SOURCE_DATABASE.is_file():
        try:
            with closing(
                sqlite3.connect(f"file:{SOURCE_DATABASE.resolve().as_posix()}?mode=ro", uri=True)
            ) as conn:
                conn.row_factory = sqlite3.Row
                has_venues = conn.execute(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='EntertainmentVenues'"
                ).fetchone()[0]
                if has_venues:
                    rows = conn.execute(
                        """
                        SELECT VenueOrgId, LocationId, Name, District, Realm, Capacity,
                               MinRecognitionRequired, RentalCostCredits, DefaultTicketPrice
                        FROM EntertainmentVenues
                        ORDER BY Capacity ASC, VenueOrgId ASC
                        """
                    ).fetchall()
                    for row in rows:
                        org_id = str(row["VenueOrgId"])
                        ticket = float(row["DefaultTicketPrice"] if row["DefaultTicketPrice"] is not None else 18.0)
                        loaded[org_id] = {
                            "orgId": org_id,
                            "locationId": str(row["LocationId"] or ""),
                            "name": str(row["Name"]),
                            "district": str(row["District"] or "Aureline"),
                            "realm": str(row["Realm"] or "Orynvell"),
                            "capacity": int(row["Capacity"]),
                            "minRecognition": float(row["MinRecognitionRequired"] or 0.0),
                            "rentalCost": float(row["RentalCostCredits"] or 0.0),
                            "defaultTicket": ticket,
                            "suggestedTicket": ticket,
                        }
                if not loaded:
                    rows = conn.execute(
                        """
                        SELECT OrganizationId, Name, Realm, Seat, VenueCapacity,
                               MinRecognitionRequired, RentalCostCredits
                        FROM EntertainmentOrganizations
                        WHERE VenueCapacity IS NOT NULL
                        ORDER BY VenueCapacity ASC, OrganizationId ASC
                        """
                    ).fetchall()
                    for row in rows:
                        org_id = str(row["OrganizationId"])
                        fb = _FALLBACK_STAGE_VENUES.get(org_id, {})
                        ticket = float(fb.get("defaultTicket", 24.0))
                        loaded[org_id] = {
                            "orgId": org_id,
                            "locationId": str(fb.get("locationId", "")),
                            "name": str(row["Name"]),
                            "district": str(fb.get("district") or row["Seat"] or "Aureline"),
                            "realm": str(row["Realm"] or "Orynvell"),
                            "capacity": int(row["VenueCapacity"]),
                            "minRecognition": float(row["MinRecognitionRequired"] if row["MinRecognitionRequired"] is not None else fb.get("minRecognition", 0.0)),
                            "rentalCost": float(row["RentalCostCredits"] if row["RentalCostCredits"] is not None else fb.get("rentalCost", 65.0)),
                            "defaultTicket": ticket,
                            "suggestedTicket": ticket,
                        }
                    # Preserve Velvet Cultural Studio if present only in fallback before Phase 2 migration
                    if loaded and "ORG_VELVET_STUDIO" not in loaded:
                        loaded["ORG_VELVET_STUDIO"] = copy.deepcopy(_FALLBACK_STAGE_VENUES["ORG_VELVET_STUDIO"])
        except sqlite3.Error:
            loaded = {}

    if not loaded:
        loaded = copy.deepcopy(_FALLBACK_STAGE_VENUES)

    _VENUES_CACHE = loaded
    return copy.deepcopy(_VENUES_CACHE)


# Backward-compatible module attribute backed by canonical miraverse.db venues
STAGE_VENUES: dict[str, dict[str, Any]] = load_entertainment_venues()


def load_entertainment_organizations() -> list[dict[str, Any]]:
    """Load entertainment organizations from canonical miraverse.db EntertainmentOrganizations first,
    falling back to organizations.json only when the database table is unavailable."""
    global _ORGS_CACHE
    if _ORGS_CACHE is not None:
        return copy.deepcopy(_ORGS_CACHE)

    import sqlite3
    from contextlib import closing
    from paths import SOURCE_DATABASE

    loaded: list[dict[str, Any]] = []
    if SOURCE_DATABASE.is_file():
        try:
            with closing(
                sqlite3.connect(f"file:{SOURCE_DATABASE.resolve().as_posix()}?mode=ro", uri=True)
            ) as conn:
                conn.row_factory = sqlite3.Row
                rows = conn.execute(
                    """
                    SELECT OrganizationId, Name, ShortName, Sector, Kind, Domain, Handle,
                           Realm, Seat, Tagline, CommissionRate, RoyaltySplitArtist,
                           VenueCapacity, MinRecognitionRequired, RentalCostCredits, DataJson
                    FROM EntertainmentOrganizations
                    ORDER BY OrganizationId
                    """
                ).fetchall()
                for row in rows:
                    try:
                        payload = json.loads(row["DataJson"]) if row["DataJson"] else {}
                    except (TypeError, ValueError):
                        payload = {}
                    if not isinstance(payload, dict):
                        payload = {}
                    payload["id"] = row["OrganizationId"]
                    payload["name"] = row["Name"]
                    payload["shortName"] = row["ShortName"]
                    payload["sector"] = row["Sector"]
                    payload["kind"] = row["Kind"]
                    payload["domain"] = row["Domain"]
                    payload["handle"] = row["Handle"]
                    payload["realm"] = row["Realm"]
                    payload["seat"] = row["Seat"]
                    payload["tagline"] = row["Tagline"]
                    if row["CommissionRate"] is not None:
                        payload["commissionRate"] = row["CommissionRate"]
                    if row["RoyaltySplitArtist"] is not None:
                        payload["royaltySplitArtist"] = row["RoyaltySplitArtist"]
                    if row["VenueCapacity"] is not None:
                        payload["venueCapacity"] = row["VenueCapacity"]
                    if row["MinRecognitionRequired"] is not None:
                        payload["minRecognitionRequired"] = row["MinRecognitionRequired"]
                    if row["RentalCostCredits"] is not None:
                        payload["rentalCostCredits"] = row["RentalCostCredits"]
                    loaded.append(payload)
        except sqlite3.Error:
            loaded = []

    if not loaded:
        repo_root = Path(__file__).resolve().parents[1]
        orgs_path = repo_root / "frontend" / "src" / "game-content" / "organizations" / "organizations.json"
        if orgs_path.is_file():
            data = json.loads(orgs_path.read_text(encoding="utf-8-sig"))
            loaded = list(data.get("entertainmentIndustry", []))

    _ORGS_CACHE = loaded
    return copy.deepcopy(_ORGS_CACHE)


def organization_by_id(org_id: str) -> dict[str, Any] | None:
    for org in load_entertainment_organizations():
        if org.get("id") == org_id:
            return org
    return None


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    if not math.isfinite(value):
        return low
    return round(max(low, min(high, float(value))), 2)


def _state(run: dict[str, Any]) -> dict[str, Any]:
    return run["state"]


def _clock(run: dict[str, Any]) -> WorldClock:
    return WorldClock.from_state(_state(run)["clock"])


def _date(run: dict[str, Any]) -> dict[str, Any]:
    clock = _clock(run)
    return world_date(
        clock.day_index,
        clock.minute_of_day,
        run["calendar"],
        realm=str(_state(run).get("realm") or ""),
        affiliation=str(_state(run).get("affiliation") or ""),
    )


def _date_label(date_info: dict[str, Any]) -> str:
    return f"Year {date_info['year']} {date_info['month']} {date_info['day']} {date_info['time']}"


def _fame_tier(artist: dict[str, Any]) -> str:
    rec = float(artist.get("recognition", 0))
    cred = float(artist.get("artisticCredibility", 0))
    comm = float(artist.get("commercialInfluence", 0))
    cult = float(artist.get("culturalInfluence", 0))
    composite = rec * 0.4 + max(cred, comm) * 0.35 + cult * 0.25
    if composite >= 78 and rec >= 68:
        return "Meridion Icon"
    if composite >= 56 and rec >= 48:
        return "Realm Headliner"
    if composite >= 34:
        return "Established Performer"
    if composite >= 16:
        return "Rising Talent"
    if composite >= 5:
        return "Local Regular"
    return "Emerging Newcomer"


def _ensure_artist_defaults(record: dict[str, Any], day_index: int = 0, step_index: int = 0) -> dict[str, Any]:
    defaults: dict[str, Any] = {
        "recognition": 0.0,
        "favorability": 50.0,
        "industryReputation": 30.0,
        "fanLoyalty": 10.0,
        "artisticCredibility": 15.0,
        "commercialInfluence": 5.0,
        "culturalInfluence": 5.0,
        "mediaVisibility": 5.0,
        "disciplines": ["music"],
        "careerStatus": "active",
        "privacyBoundary": "guarded",
        "managerOrgId": "",
        "labelOrgId": "",
        "publisherOrgId": "",
        "prOrgId": "",
        "distributorOrgId": "",
        "guildMember": False,
        "fanCount": 0,
        "monthlyListeners": 0,
        "totalRoyaltiesEarned": 0.0,
        "totalBoxOfficeEarned": 0.0,
        "unclaimedPlayerRoyalties": 0.0,
        "royaltySplitArtist": 0.80,
        "portfolioIds": [],
        "origin": "npc",
        "activeSinceDay": day_index,
        "lastActiveDay": day_index,
        "lastActiveStep": step_index,
    }
    merged = {**defaults, **record}
    for axis in FAME_AXES:
        merged[axis] = _clamp(float(merged.get(axis, defaults[axis])))
    if not isinstance(merged.get("genres"), list):
        merged["genres"] = []
    if not isinstance(merged.get("disciplines"), list) or not merged["disciplines"]:
        merged["disciplines"] = ["music"]
    else:
        merged["disciplines"] = [str(d) for d in merged["disciplines"] if str(d) in DISCIPLINES] or ["music"]
    merged["tier"] = _fame_tier(merged)
    return merged


def adjust_fame(artist: dict[str, Any], deltas: dict[str, float], day_index: int | None = None, step_index: int | None = None) -> dict[str, Any]:
    for axis, delta in deltas.items():
        if axis in FAME_AXES:
            artist[axis] = _clamp(float(artist.get(axis, 0.0)) + float(delta))
    if day_index is not None:
        artist["lastActiveDay"] = int(day_index)
    if step_index is not None:
        artist["lastActiveStep"] = int(step_index)
    artist["fanCount"] = max(
        int(artist.get("fanCount", 0)),
        int(round((float(artist.get("recognition", 0)) * 28) + (float(artist.get("fanLoyalty", 0)) * 19))),
    )
    artist["tier"] = _fame_tier(artist)
    artist["updatedAt"] = _now()
    return artist


# ---------------------------------------------------------------------------
# Backward-compatible core CRUD functions (tested by test_living_world_api.py)
# ---------------------------------------------------------------------------

def list_artists(run: dict[str, Any]) -> dict[str, Any]:
    artists = [_ensure_artist_defaults(copy.deepcopy(a)) for a in _state(run).get("artists", [])]
    return {"artists": artists}


def upsert_artist(run: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    state = _state(run)
    clock = _clock(run)
    artists = state.setdefault("artists", [])
    artist_id = str(payload.get("artistId") or "").strip() or str(uuid.uuid4())
    stage_name = str(payload.get("stageName") or "").strip()
    if not stage_name:
        raise ValueError("stageName is required")
    character_id = str(payload.get("characterId") or "").strip()

    existing_idx = next(
        (
            idx
            for idx, item in enumerate(artists)
            if item.get("artistId") == artist_id
            or (character_id and item.get("characterId") == character_id and not payload.get("artistId"))
        ),
        None,
    )
    base = copy.deepcopy(artists[existing_idx]) if existing_idx is not None else {}
    if existing_idx is not None:
        artist_id = str(base.get("artistId") or artist_id)

    disciplines = payload.get("disciplines")
    if disciplines is not None:
        if not isinstance(disciplines, list) or any(str(d) not in DISCIPLINES for d in disciplines):
            raise ValueError(f"disciplines must be selected from {', '.join(DISCIPLINES)}")

    privacy = str(payload.get("privacyBoundary") or base.get("privacyBoundary") or "guarded")
    if privacy not in ("open", "guarded", "strict"):
        raise ValueError("privacyBoundary must be open, guarded, or strict")

    career_status = str(payload.get("careerStatus") or base.get("careerStatus") or "active")
    if career_status not in ("active", "hiatus", "retired", "comeback"):
        raise ValueError("careerStatus must be active, hiatus, retired, or comeback")

    record = _ensure_artist_defaults(
        {
            **base,
            "artistId": artist_id,
            "stageName": stage_name,
            "characterId": character_id or str(base.get("characterId") or ""),
            "genres": payload.get("genres") if payload.get("genres") is not None else base.get("genres", []),
            "bio": str(payload.get("bio") if payload.get("bio") is not None else base.get("bio") or ""),
            "disciplines": disciplines if disciplines is not None else base.get("disciplines", ["music"]),
            "privacyBoundary": privacy,
            "careerStatus": career_status,
            "origin": str(payload.get("origin") or base.get("origin") or "npc"),
            "guildMember": bool(payload.get("guildMember", base.get("guildMember", False))),
            "updatedAt": _now(),
        },
        day_index=clock.day_index,
        step_index=clock.tick_count,
    )
    for axis in FAME_AXES:
        if axis in payload and payload[axis] is not None:
            record[axis] = _clamp(float(payload[axis]))
    record["tier"] = _fame_tier(record)

    if existing_idx is not None:
        artists[existing_idx] = record
    else:
        artists.append(record)
    return copy.deepcopy(record)


def list_music(run: dict[str, Any]) -> dict[str, Any]:
    return {"tracks": copy.deepcopy(_state(run).get("tracks", []))}


def add_track(run: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    state = _state(run)
    clock = _clock(run)
    title = str(payload.get("title") or "").strip()
    if not title:
        raise ValueError("title is required")
    artist_id = str(payload.get("artistId") or "").strip()
    tracks = state.setdefault("tracks", [])
    request_id = str(payload.get("requestId") or "").strip()
    if request_id:
        existing = next((t for t in tracks if t.get("requestId") == request_id), None)
        if existing:
            return {**copy.deepcopy(existing), "alreadyApplied": True}

    default_audio = SHIPPED_AUDIO_TRACKS[len(tracks) % len(SHIPPED_AUDIO_TRACKS)]
    duration = int(payload.get("durationSeconds") or default_audio["durationSeconds"])
    quality = _clamp(float(payload.get("quality", 68.0)), 10.0, 100.0)
    collaborators = [str(c) for c in (payload.get("collaboratorArtistIds") or []) if str(c).strip()]
    artist = next((a for a in state.get("artists", []) if a.get("artistId") == artist_id), None)

    record = {
        "trackId": str(payload.get("trackId") or uuid.uuid4()),
        "title": title,
        "artistId": artist_id,
        "stageName": artist.get("stageName", "") if artist else str(payload.get("stageName") or ""),
        "kind": str(payload.get("kind") or "single"),
        "genre": str(payload.get("genre") or (artist.get("genres", [default_audio["genre"]])[0] if artist and artist.get("genres") else default_audio["genre"])),
        "durationSeconds": duration,
        "audioUrl": str(payload.get("audioUrl") or default_audio["audioUrl"]),
        "license": str(payload.get("license") or "original"),
        "producerOrgId": str(payload.get("producerOrgId") or (artist.get("publisherOrgId") if artist else "") or "ORG_KAJI_PUBLISHING"),
        "publisherOrgId": str(payload.get("publisherOrgId") or (artist.get("publisherOrgId") if artist else "") or ""),
        "collaboratorArtistIds": collaborators,
        "mmrsRegistered": bool(payload.get("mmrsRegistered", True)),
        "quality": quality,
        "streams": int(payload.get("streams") or 0),
        "radioSpins": int(payload.get("radioSpins") or 0),
        "stickerEdition": str(payload.get("stickerEdition") or ""),
        "releaseDate": payload.get("releaseDate") or _date(run).get("time", ""),
        "createdDay": clock.day_index,
        "createdAt": _now(),
        **({"requestId": request_id} if request_id else {}),
    }
    tracks.append(record)
    if artist is not None:
        adjust_fame(
            artist,
            {"artisticCredibility": 2.2 + (quality - 50.0) * 0.03, "industryReputation": 1.2},
            day_index=clock.day_index,
            step_index=clock.tick_count,
        )
    return copy.deepcopy(record)


def list_releases(run: dict[str, Any]) -> dict[str, Any]:
    return {"releases": copy.deepcopy(_state(run).get("releases", []))}


def schedule_release(run: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    state = _state(run)
    clock = _clock(run)
    track_id = str(payload.get("trackId") or "").strip()
    if not track_id:
        raise ValueError("trackId is required")
    releases = state.setdefault("releases", [])
    request_id = str(payload.get("requestId") or "").strip()
    if request_id:
        existing = next((r for r in releases if r.get("requestId") == request_id), None)
        if existing:
            return {**copy.deepcopy(existing), "alreadyApplied": True}

    track = next((t for t in state.get("tracks", []) if t.get("trackId") == track_id), None)
    artist_id = str(payload.get("artistId") or (track.get("artistId") if track else "") or "")
    artist = next((a for a in state.get("artists", []) if a.get("artistId") == artist_id), None)

    scheduled_day = payload.get("scheduledDay")
    if scheduled_day is None:
        scheduled_day = clock.day_index
    scheduled_day = max(0, int(scheduled_day))
    immediate = bool(payload.get("publishNow")) or scheduled_day <= clock.day_index

    royalty_rate = float(payload.get("royaltyRate") if payload.get("royaltyRate") is not None else 0.14)
    distributor_id = str(
        payload.get("distributorOrgId")
        or (artist.get("distributorOrgId") if artist else "")
        or "ORG_LUNERUM_DIST"
    )
    label_id = str(payload.get("labelOrgId") or (artist.get("labelOrgId") if artist else "") or "")

    record = {
        "releaseId": str(payload.get("releaseId") or uuid.uuid4()),
        "trackId": track_id,
        "artistId": artist_id,
        "title": str(payload.get("title") or (track.get("title") if track else "Untitled Release")),
        "kind": str(payload.get("kind") or (track.get("kind") if track else "single")),
        "distributorOrgId": distributor_id,
        "labelOrgId": label_id,
        "platformOrgId": "ORG_SONGBIRD",
        "releaseDate": str(payload.get("releaseDate") or _date_label(_date(run))),
        "scheduledDay": scheduled_day,
        "expectedRoyaltyRate": royalty_rate,
        "status": "released" if immediate else "scheduled",
        "streams": 0,
        "royaltiesGenerated": 0.0,
        "createdAt": _now(),
        **({"releasedDay": clock.day_index} if immediate else {}),
        **({"requestId": request_id} if request_id else {}),
    }
    releases.append(record)
    if immediate and artist is not None:
        adjust_fame(
            artist,
            {"recognition": 3.5, "mediaVisibility": 4.0, "commercialInfluence": 2.0, "fanLoyalty": 1.8},
            day_index=clock.day_index,
            step_index=clock.tick_count,
        )
    return copy.deepcopy(record)


def list_concerts(run: dict[str, Any]) -> dict[str, Any]:
    return {"concerts": copy.deepcopy(_state(run).get("concerts", []))}


def _resolve_venue_meta(venue_input: str, venue_org_id: str = "", capacity_override: int = 0) -> tuple[str, str, int, float, float]:
    venues = load_entertainment_venues()
    if venue_org_id and venue_org_id in venues:
        meta = venues[venue_org_id]
        return venue_org_id, meta["name"], capacity_override or meta["capacity"], meta["minRecognition"], meta["rentalCost"]
    lowered = venue_input.casefold()
    for org_id, meta in venues.items():
        if meta["name"].casefold() in lowered or lowered in meta["name"].casefold():
            return org_id, meta["name"], capacity_override or meta["capacity"], meta["minRecognition"], meta["rentalCost"]
    return venue_org_id or "ORG_LOOKING_GLASS", venue_input, capacity_override or 180, 0.0, 50.0


def schedule_concert(run: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    state = _state(run)
    clock = _clock(run)
    concerts = state.setdefault("concerts", [])
    request_id = str(payload.get("requestId") or "").strip()
    if request_id:
        existing = next((c for c in concerts if c.get("requestId") == request_id), None)
        if existing:
            return {**copy.deepcopy(existing), "alreadyApplied": True}

    artist_id = str(payload.get("artistId") or "").strip()
    artist = next((a for a in state.get("artists", []) if a.get("artistId") == artist_id), None)
    venue_raw = str(payload.get("venue") or "").strip()
    venue_org_id = str(payload.get("venueOrgId") or "").strip()
    venues = load_entertainment_venues()
    if not venue_raw and venue_org_id in venues:
        venue_raw = venues[venue_org_id]["name"]
    if not venue_raw:
        raise ValueError("venue is required")

    cap_in = int(payload.get("capacity") or 0)
    resolved_org_id, canonical_venue_name, default_cap, min_rec, rental_cost = _resolve_venue_meta(
        venue_raw, venue_org_id, cap_in
    )
    if artist is not None and payload.get("enforceVenueTier") and float(artist.get("recognition", 0)) < min_rec:
        raise ValueError(
            f"{canonical_venue_name} requires at least {min_rec:.0f} public recognition (current: {float(artist.get('recognition', 0)):.1f})"
        )

    scheduled_day = payload.get("scheduledDay")
    scheduled_day = int(scheduled_day) if scheduled_day is not None else clock.day_index + 1
    slot = str(payload.get("slot") or "evening").casefold()
    if slot not in ("afternoon", "evening", "late"):
        slot = "evening"

    # Prevent conflicting double-bookings on the same venue, day, and slot when explicit day is scheduled
    if payload.get("scheduledDay") is not None or payload.get("venueOrgId"):
        conflict = next(
            (
                c
                for c in concerts
                if c.get("status") == "scheduled"
                and c.get("scheduledDay") == scheduled_day
                and c.get("slot", "evening") == slot
                and (c.get("venueOrgId") == resolved_org_id or str(c.get("venue", "")).casefold() == venue_raw.casefold())
            ),
            None,
        )
        if conflict is not None:
            raise ValueError(f"{venue_raw} is already booked on day {scheduled_day} ({slot} slot)")

    ticket_price = float(payload.get("ticketPrice") if payload.get("ticketPrice") is not None else 15.0)
    promoter_org = str(payload.get("promoterOrgId") or ("ORG_VELVET_CURTAIN" if default_cap >= 1000 else ""))

    record = {
        "concertId": str(payload.get("concertId") or uuid.uuid4()),
        "artistId": artist_id,
        "stageName": artist.get("stageName", "") if artist else str(payload.get("stageName") or ""),
        "title": str(payload.get("title") or f"{artist.get('stageName', 'Live')} at {venue_raw}"),
        "venue": venue_raw,
        "venueOrgId": resolved_org_id,
        "promoterOrgId": promoter_org,
        "date": str(payload.get("date") or f"Day {scheduled_day + 1} · {slot.title()}"),
        "scheduledDay": scheduled_day,
        "slot": slot,
        "ticketPrice": ticket_price,
        "capacity": cap_in if cap_in > 0 else default_cap,
        "rentalCost": rental_cost,
        "ticketsSold": int(payload.get("ticketsSold") or 0),
        "attendeeCharacterIds": [],
        "grossRevenue": 0.0,
        "netArtistPayout": 0.0,
        "status": "scheduled",
        "createdAt": _now(),
        **({"requestId": request_id} if request_id else {}),
    }
    concerts.append(record)
    return copy.deepcopy(record)


def fame_profile(run: dict[str, Any], artist_id: str) -> dict[str, Any]:
    artists = _state(run).get("artists", [])
    raw = next((a for a in artists if a.get("artistId") == artist_id or a.get("characterId") == artist_id), None)
    if raw is None:
        raise KeyError("artist not found")
    artist = _ensure_artist_defaults(copy.deepcopy(raw))
    rec = float(artist["recognition"])
    fav = float(artist["favorability"])
    rep = float(artist["industryReputation"])
    loy = float(artist["fanLoyalty"])
    cred = float(artist["artisticCredibility"])
    comm = float(artist["commercialInfluence"])
    cult = float(artist["culturalInfluence"])
    vis = float(artist["mediaVisibility"])
    return {
        "artistId": artist["artistId"],
        "characterId": artist.get("characterId", ""),
        "stageName": artist.get("stageName", ""),
        "tier": _fame_tier(artist),
        "careerStatus": artist.get("careerStatus", "active"),
        "disciplines": artist.get("disciplines", ["music"]),
        "recognition": rec,
        "favorability": fav,
        "industryReputation": rep,
        "fanLoyalty": loy,
        "artisticCredibility": cred,
        "commercialInfluence": comm,
        "culturalInfluence": cult,
        "mediaVisibility": vis,
        "fanCount": int(artist.get("fanCount", 0)),
        "monthlyListeners": int(artist.get("monthlyListeners", 0)),
        "communityReception": {
            "generalPublic": _clamp(rec * 0.45 + fav * 0.55),
            "criticsAndPeers": _clamp(cred * 0.6 + rep * 0.4),
            "dedicatedFans": _clamp(loy * 0.7 + fav * 0.3),
            "commercialBrands": _clamp(comm * 0.55 + rec * 0.25 + fav * 0.2),
            "localScene": _clamp(cred * 0.5 + loy * 0.35 + (100.0 - min(60.0, comm * 0.4)) * 0.15),
        },
    }


# ---------------------------------------------------------------------------
# Extended Player & NPC Industry Services (Auditions, Contracts, Tickets, PR, Awards)
# ---------------------------------------------------------------------------

def list_auditions(run: dict[str, Any]) -> dict[str, Any]:
    return {"auditions": copy.deepcopy(_state(run).get("auditions", []))}


def handle_audition(run: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    state = _state(run)
    clock = _clock(run)
    auditions = state.setdefault("auditions", [])
    action = str(payload.get("action") or "apply").casefold()

    if action == "create":
        title = str(payload.get("title") or "").strip()
        if not title:
            raise ValueError("title is required")
        org_id = str(payload.get("orgId") or "ORG_OPEN_CALL")
        discipline = str(payload.get("discipline") or "acting")
        if discipline not in DISCIPLINES:
            raise ValueError("Unsupported entertainment discipline")
        record = {
            "auditionId": str(uuid.uuid4()),
            "title": title,
            "orgId": org_id,
            "productionOrgId": str(payload.get("productionOrgId") or "ORG_MIRRORA_STUDIOS"),
            "discipline": discipline,
            "openToUnrepresented": bool(payload.get("openToUnrepresented", True)),
            "minCredibility": _clamp(float(payload.get("minCredibility", 10.0))),
            "stipendCredits": max(0.0, float(payload.get("stipendCredits", 180.0))),
            "deadlineDay": int(payload.get("deadlineDay", clock.day_index + 3)),
            "applicants": [],
            "selectedArtistId": "",
            "status": "open",
            "createdAt": _now(),
        }
        auditions.append(record)
        return copy.deepcopy(record)

    audition_id = str(payload.get("auditionId") or "").strip()
    audition = next((a for a in auditions if a.get("auditionId") == audition_id), None)
    if audition is None:
        raise KeyError("audition not found")
    if audition.get("status") != "open":
        raise ValueError("This audition call has already closed")

    artist_id = str(payload.get("artistId") or "").strip()
    artist = next((a for a in state.get("artists", []) if a.get("artistId") == artist_id), None)
    if artist is None:
        raise ValueError("Register an artist/performer profile before auditioning")
    _ensure_artist_defaults(artist, clock.day_index, clock.tick_count)

    disc = str(audition.get("discipline") or "").casefold()
    if (
        disc
        and disc not in [str(d).casefold() for d in artist.get("disciplines", [])]
        and not payload.get("allowCrossDiscipline")
    ):
        raise ValueError(f"This casting call requires the {disc} discipline")

    if not audition.get("openToUnrepresented", True) and not artist.get("managerOrgId"):
        raise ValueError("This casting call requires representation from Starstruck, Second Act, or Willow Whisper")

    skill_bonus = _clamp(float(payload.get("skillScore", 50.0)), 0.0, 100.0)
    score = round(
        float(artist.get("artisticCredibility", 15)) * 0.4
        + float(artist.get("industryReputation", 30)) * 0.3
        + skill_bonus * 0.3,
        2,
    )
    existing_app = next((x for x in audition["applicants"] if x.get("artistId") == artist_id), None)
    if existing_app:
        return {"audition": copy.deepcopy(audition), "score": existing_app["score"], "alreadyApplied": True}

    audition["applicants"].append(
        {
            "artistId": artist_id,
            "stageName": artist.get("stageName", ""),
            "score": score,
            "submittedDay": clock.day_index,
        }
    )
    if discipline := audition.get("discipline"):
        if discipline not in artist["disciplines"]:
            artist["disciplines"].append(discipline)

    booked = False
    if payload.get("evaluateImmediately") and score >= float(audition.get("minCredibility", 10.0)) + 12.0:
        audition["status"] = "cast"
        audition["selectedArtistId"] = artist_id
        booked = True
        adjust_fame(
            artist,
            {"industryReputation": 4.0, "artisticCredibility": 3.0, "recognition": 2.5, "mediaVisibility": 2.0},
            clock.day_index,
            clock.tick_count,
        )
        productions = state.setdefault("productions", [])
        productions.append(
            {
                "productionId": str(uuid.uuid4()),
                "title": audition["title"],
                "kind": audition["discipline"],
                "studioOrgId": audition.get("productionOrgId", audition["orgId"]),
                "castArtistIds": [artist_id],
                "budget": round(float(audition.get("stipendCredits", 180.0)) * 6, 2),
                "stipendCredits": float(audition.get("stipendCredits", 180.0)),
                "status": "in_production",
                "scheduledDay": clock.day_index + 1,
                "createdAt": _now(),
            }
        )
    else:
        adjust_fame(artist, {"industryReputation": 0.8}, clock.day_index, clock.tick_count)

    return {"audition": copy.deepcopy(audition), "score": score, "booked": booked}


def list_contracts(run: dict[str, Any]) -> dict[str, Any]:
    return {"contracts": copy.deepcopy(_state(run).get("entertainment_contracts", []))}


def manage_contract(run: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    state = _state(run)
    clock = _clock(run)
    contracts = state.setdefault("entertainment_contracts", [])
    request_id = str(payload.get("requestId") or "").strip()
    if request_id:
        existing = next((c for c in contracts if c.get("requestId") == request_id), None)
        if existing:
            return {**copy.deepcopy(existing), "alreadyApplied": True}

    action = str(payload.get("action") or "sign").casefold()
    if action in ("terminate", "leave"):
        contract_id = str(payload.get("contractId") or "").strip()
        target = next((c for c in contracts if c.get("contractId") == contract_id), None)
        if target is None:
            raise KeyError("contract not found")
        target["status"] = "terminated"
        target["endedDay"] = clock.day_index
        artist = next((a for a in state.get("artists", []) if a.get("artistId") == target.get("artistId")), None)
        if artist is not None:
            field_map = {
                "management": "managerOrgId",
                "label": "labelOrgId",
                "publishing": "publisherOrgId",
                "publicity": "prOrgId",
                "distribution": "distributorOrgId",
            }
            slot = field_map.get(str(target.get("contractType")), "")
            if slot and artist.get(slot) == target.get("orgId"):
                artist[slot] = ""
            if target.get("contractType") == "guild":
                artist["guildMember"] = False
        return copy.deepcopy(target)

    artist_id = str(payload.get("artistId") or "").strip()
    artist = next((a for a in state.get("artists", []) if a.get("artistId") == artist_id), None)
    if artist is None:
        raise ValueError("artistId must reference an artist in this run")
    _ensure_artist_defaults(artist, clock.day_index, clock.tick_count)

    org_id = str(payload.get("orgId") or "").strip()
    org = organization_by_id(org_id)
    if org is None:
        raise ValueError("orgId must reference a registered Section XIX entertainment organization")

    contract_type = str(payload.get("contractType") or "management").casefold()
    if contract_type not in ("management", "label", "publishing", "publicity", "distribution", "guild", "ensemble"):
        raise ValueError("Unsupported contractType")

    # Enforce exclusive slots unless replacing terminated/expired contracts
    exclusive_types = {"management": "managerOrgId", "label": "labelOrgId", "publicity": "prOrgId", "distribution": "distributorOrgId", "publishing": "publisherOrgId"}
    if contract_type in exclusive_types:
        active_conflict = next(
            (
                c
                for c in contracts
                if c.get("artistId") == artist_id and c.get("contractType") == contract_type and c.get("status") == "active"
            ),
            None,
        )
        if active_conflict is not None:
            if payload.get("switchAgency"):
                active_conflict["status"] = "replaced"
                active_conflict["endedDay"] = clock.day_index
            else:
                raise ValueError(
                    f"Artist already has an active {contract_type} agreement with {active_conflict.get('orgName')}. Terminate or switch agencies first."
                )

    negotiated_split = payload.get("royaltySplitArtist")
    default_split = float(org.get("royaltySplitArtist") or 0.80)
    if negotiated_split is not None:
        split = _clamp(float(negotiated_split) * 100.0, 40.0, 96.0) / 100.0
        # High demands require industry reputation or Performers Association backing
        rep = float(artist.get("industryReputation", 30.0)) + (8.0 if artist.get("guildMember") else 0.0)
        if split > default_split + 0.08 and rep < 55.0:
            raise ValueError(
                f"{org['name']} declined a {split*100:.0f}% artist split; build industry reputation (55+) or join Meridion Performers Association."
            )
    else:
        split = default_split

    commission = float(org.get("commissionRate") or (0.15 if contract_type in ("management", "publicity") else 0.10))
    advance = max(0.0, float(payload.get("advanceCredits") or (250.0 if org_id == "ORG_STARSTRUCK" else 120.0 if contract_type == "label" else 0.0)))
    duration_days = max(7, int(payload.get("durationDays") or 30))

    record = {
        "contractId": str(uuid.uuid4()),
        "artistId": artist_id,
        "characterId": artist.get("characterId", ""),
        "orgId": org_id,
        "orgName": org["name"],
        "contractType": contract_type,
        "commissionRate": round(commission, 3),
        "royaltySplitArtist": round(split, 3),
        "advanceCredits": round(advance, 2),
        "obligationCount": max(1, int(payload.get("obligationCount") or 2)),
        "completedObligations": 0,
        "startDay": clock.day_index,
        "expiresDay": clock.day_index + duration_days,
        "status": "active",
        "createdAt": _now(),
        **({"requestId": request_id} if request_id else {}),
    }
    contracts.append(record)

    if contract_type in exclusive_types:
        artist[exclusive_types[contract_type]] = org_id
    if contract_type == "guild" or org_id == "ORG_PERFORMERS_ASSOC":
        artist["guildMember"] = True

    fame_delta: dict[str, float] = {"industryReputation": 2.5}
    if org_id == "ORG_STARSTRUCK":
        fame_delta.update({"mediaVisibility": 6.0, "commercialInfluence": 5.0, "recognition": 3.0})
    elif org_id in ("ORG_MARLIE_RECORDS", "ORG_SECOND_ACT", "ORG_KAJI_PUBLISHING"):
        fame_delta.update({"artisticCredibility": 4.5, "fanLoyalty": 2.5})
    elif org_id == "ORG_WORD_OF_MOUTH":
        fame_delta.update({"mediaVisibility": 4.0, "favorability": 2.0})
    adjust_fame(artist, fame_delta, clock.day_index, clock.tick_count)
    return copy.deepcopy(record)


def list_productions(run: dict[str, Any]) -> dict[str, Any]:
    return {"productions": copy.deepcopy(_state(run).get("productions", []))}


def create_or_advance_production(run: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    state = _state(run)
    clock = _clock(run)
    productions = state.setdefault("productions", [])
    action = str(payload.get("action") or "create").casefold()

    if action == "complete":
        prod_id = str(payload.get("productionId") or "").strip()
        prod = next((p for p in productions if p.get("productionId") == prod_id), None)
        if prod is None:
            raise KeyError("production not found")
        if prod.get("status") == "released":
            return {**copy.deepcopy(prod), "alreadyApplied": True}
        prod["status"] = "released"
        prod["releasedDay"] = clock.day_index
        prod["acclaim"] = _clamp(float(payload.get("acclaim", 74.0)), 20.0, 100.0)
        prod["audienceCount"] = max(120, int(prod["acclaim"] * 85))
        for aid in prod.get("castArtistIds", []):
            art = next((a for a in state.get("artists", []) if a.get("artistId") == aid), None)
            if art is not None:
                adjust_fame(
                    art,
                    {
                        "recognition": 4.5,
                        "artisticCredibility": 4.0,
                        "culturalInfluence": 3.5,
                        "mediaVisibility": 4.0,
                    },
                    clock.day_index,
                    clock.tick_count,
                )
        return copy.deepcopy(prod)

    title = str(payload.get("title") or "").strip()
    if not title:
        raise ValueError("title is required")
    kind = str(payload.get("kind") or "film").casefold()
    studio_id = str(payload.get("studioOrgId") or ("ORG_MIRRORA_STUDIOS" if kind in ("film", "series", "acting") else "ORG_MARIGOLD_THEATRE"))
    cast_ids = [str(a) for a in (payload.get("castArtistIds") or []) if str(a).strip()]
    record = {
        "productionId": str(uuid.uuid4()),
        "title": title,
        "kind": kind,
        "studioOrgId": studio_id,
        "castArtistIds": cast_ids,
        "budget": max(0.0, float(payload.get("budget") or 1200.0)),
        "stipendCredits": max(0.0, float(payload.get("stipendCredits") or 220.0)),
        "status": "in_production",
        "scheduledDay": int(payload.get("scheduledDay") or clock.day_index + 1),
        "acclaim": 0.0,
        "audienceCount": 0,
        "createdAt": _now(),
    }
    productions.append(record)
    for aid in cast_ids:
        art = next((a for a in state.get("artists", []) if a.get("artistId") == aid), None)
        if art is not None:
            if kind in DISCIPLINES and kind not in art.setdefault("disciplines", ["music"]):
                art["disciplines"].append(kind)
            adjust_fame(art, {"industryReputation": 2.0, "artisticCredibility": 1.8}, clock.day_index, clock.tick_count)
    return copy.deepcopy(record)


def list_tickets(run: dict[str, Any]) -> dict[str, Any]:
    return {"tickets": copy.deepcopy(_state(run).get("tickets", []))}


def purchase_ticket(run: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    state = _state(run)
    clock = _clock(run)
    tickets = state.setdefault("tickets", [])
    request_id = str(payload.get("requestId") or "").strip()
    if request_id:
        existing = next((t for t in tickets if t.get("requestId") == request_id), None)
        if existing:
            return {**copy.deepcopy(existing), "alreadyApplied": True}

    concert_id = str(payload.get("concertId") or "").strip()
    concert = next((c for c in state.get("concerts", []) if c.get("concertId") == concert_id), None)
    if concert is None:
        raise KeyError("concert not found")
    if concert.get("status") == "canceled":
        raise ValueError("This performance was canceled")
    sold = int(concert.get("ticketsSold") or 0)
    capacity = int(concert.get("capacity") or 180)
    qty = max(1, min(10, int(payload.get("quantity") or 1)))
    if sold + qty > capacity:
        raise ValueError("Performance is sold out for the requested quantity")

    buyer_id = str(payload.get("buyerCharacterId") or "player")
    buyer_name = str(payload.get("buyerName") or "Citizen Attendee")
    unit_price = float(concert.get("ticketPrice") or 0.0)
    total_paid = round(unit_price * qty, 2)

    concert["ticketsSold"] = sold + qty
    concert["grossRevenue"] = round(float(concert.get("grossRevenue") or 0.0) + total_paid, 2)
    attendees = concert.setdefault("attendeeCharacterIds", [])
    if buyer_id not in attendees:
        attendees.append(buyer_id)

    artist = next((a for a in state.get("artists", []) if a.get("artistId") == concert.get("artistId")), None)
    if artist is not None:
        adjust_fame(artist, {"fanLoyalty": 0.6 * qty, "commercialInfluence": 0.4 * qty}, clock.day_index, clock.tick_count)

    ticket = {
        "ticketId": str(uuid.uuid4()),
        "concertId": concert_id,
        "concertTitle": concert.get("title") or concert.get("venue"),
        "venue": concert.get("venue"),
        "artistId": concert.get("artistId"),
        "buyerCharacterId": buyer_id,
        "buyerName": buyer_name,
        "quantity": qty,
        "pricePaid": total_paid,
        "purchasedDay": clock.day_index,
        "attended": bool(payload.get("attendNow", False)),
        "createdAt": _now(),
        **({"requestId": request_id} if request_id else {}),
    }
    tickets.append(ticket)
    return copy.deepcopy(ticket)


def handle_publicity_or_fan_action(run: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    state = _state(run)
    clock = _clock(run)
    action = str(payload.get("action") or "").casefold()
    request_id = str(payload.get("requestId") or "").strip()
    receipts = state.setdefault("entertainment_receipts", [])
    if request_id and request_id in receipts:
        return {"ok": True, "alreadyApplied": True, "action": action}

    if action == "stream_track":
        track_id = str(payload.get("trackId") or "").strip()
        track = next((t for t in state.get("tracks", []) if t.get("trackId") == track_id), None)
        if track is None:
            raise KeyError("track not found")
        plays = max(1, min(50, int(payload.get("plays") or 1)))
        track["streams"] = int(track.get("streams") or 0) + plays
        artist = next((a for a in state.get("artists", []) if a.get("artistId") == track.get("artistId")), None)
        release = next((r for r in state.get("releases", []) if r.get("trackId") == track_id), None)
        rate = float(release.get("expectedRoyaltyRate", 0.14)) if release else 0.12
        split = float(artist.get("royaltySplitArtist", 0.80)) if artist else 0.80
        royalty = round(plays * rate * split, 2)
        if artist is not None:
            artist["monthlyListeners"] = int(artist.get("monthlyListeners") or 0) + plays
            artist["totalRoyaltiesEarned"] = round(float(artist.get("totalRoyaltiesEarned") or 0.0) + royalty, 2)
            if artist.get("origin") == "player":
                artist["unclaimedPlayerRoyalties"] = round(float(artist.get("unclaimedPlayerRoyalties") or 0.0) + royalty, 2)
            adjust_fame(artist, {"recognition": 0.15 * plays, "commercialInfluence": 0.12 * plays}, clock.day_index, clock.tick_count)
        if request_id:
            receipts.append(request_id)
        return {"trackId": track_id, "streams": track["streams"], "royaltyAccrued": royalty}

    if action == "submit_radio":
        track_id = str(payload.get("trackId") or "").strip()
        track = next((t for t in state.get("tracks", []) if t.get("trackId") == track_id), None)
        if track is None:
            raise KeyError("track not found")
        artist = next((a for a in state.get("artists", []) if a.get("artistId") == track.get("artistId")), None)
        accepted = float(track.get("quality", 65.0)) + (float(artist.get("industryReputation", 30.0)) * 0.35 if artist else 0.0) >= 62.0
        if accepted:
            track["radioSpins"] = int(track.get("radioSpins") or 0) + 12
            if not track.get("stickerEdition"):
                track["stickerEdition"] = f"Pop Sticker #{len(state.get('tracks', [])):02d}: {track['title']}"
            if artist is not None:
                adjust_fame(
                    artist,
                    {"recognition": 3.8, "mediaVisibility": 3.5, "culturalInfluence": 2.0, "fanLoyalty": 2.2},
                    clock.day_index,
                    clock.tick_count,
                )
            state.setdefault("media_items", []).insert(
                0,
                {
                    "mediaId": str(uuid.uuid4()),
                    "orgId": "ORG_POP_STICKER",
                    "kind": "radio_premiere",
                    "headline": f"Pop Sticker Premiere: “{track['title']}”",
                    "summary": f"{track.get('stageName') or 'Featured artist'} enters rotation with limited collector sticker {track['stickerEdition']}.",
                    "subjectArtistIds": [track.get("artistId", "")],
                    "sentiment": "positive",
                    "dayIndex": clock.day_index,
                },
            )
        if request_id:
            receipts.append(request_id)
        return {"accepted": accepted, "track": copy.deepcopy(track)}

    if action == "book_interview":
        artist_id = str(payload.get("artistId") or "").strip()
        artist = next((a for a in state.get("artists", []) if a.get("artistId") == artist_id), None)
        if artist is None:
            raise KeyError("artist not found")
        outlet = str(payload.get("orgId") or "ORG_LIMELIGHT")
        tone = str(payload.get("tone") or "candid").casefold()
        headline = str(payload.get("headline") or f"{artist['stageName']} Speaks with Limelight on Craft & Next Chapter")
        deltas = {"mediaVisibility": 5.5, "recognition": 3.0}
        if tone == "candid":
            deltas.update({"favorability": 3.5, "fanLoyalty": 3.0, "artisticCredibility": 2.0})
        elif tone == "promotional":
            deltas.update({"commercialInfluence": 4.0, "recognition": 4.0})
        else:
            deltas.update({"artisticCredibility": 3.5, "industryReputation": 2.5})
        adjust_fame(artist, deltas, clock.day_index, clock.tick_count)
        item = {
            "mediaId": str(uuid.uuid4()),
            "orgId": outlet,
            "kind": "interview",
            "headline": headline,
            "summary": str(payload.get("summary") or f"In-depth {tone} conversation covering current releases, creative boundaries, and life in Meridion."),
            "subjectArtistIds": [artist_id],
            "sentiment": "positive",
            "dayIndex": clock.day_index,
        }
        state.setdefault("media_items", []).insert(0, item)
        if request_id:
            receipts.append(request_id)
        return {"mediaItem": item, "fame": fame_profile(run, artist_id)}

    if action == "respond_controversy":
        controversy_id = str(payload.get("controversyId") or "").strip()
        controversies = state.setdefault("controversies", [])
        item = next((c for c in controversies if c.get("controversyId") == controversy_id), None)
        if item is None:
            raise KeyError("controversy not found")
        artist = next((a for a in state.get("artists", []) if a.get("artistId") == item.get("artistId")), None)
        strategy = str(payload.get("strategy") or "accountable_statement").casefold()
        has_pr = bool(artist and artist.get("prOrgId") == "ORG_WORD_OF_MOUTH")
        bonus = 3.0 if has_pr else 0.0
        if strategy == "accountable_statement":
            deltas = {"favorability": 6.0 + bonus, "industryReputation": 3.0 + bonus * 0.5, "mediaVisibility": 2.0}
        elif strategy == "set_privacy_boundary":
            if artist is not None:
                artist["privacyBoundary"] = "strict"
            deltas = {"favorability": 3.0 + bonus, "fanLoyalty": 3.5, "mediaVisibility": -4.0}
        elif strategy == "deny_and_deflect":
            deltas = {"favorability": -3.5 + bonus * 0.5, "mediaVisibility": 6.0}
        else:
            deltas = {"mediaVisibility": -2.5, "favorability": 1.0}
        item["status"] = "resolved"
        item["resolutionStrategy"] = strategy
        item["resolvedDay"] = clock.day_index
        if artist is not None:
            adjust_fame(artist, deltas, clock.day_index, clock.tick_count)
        if request_id:
            receipts.append(request_id)
        return {"controversy": copy.deepcopy(item), "fame": fame_profile(run, artist["artistId"]) if artist else None}

    if action == "accept_sponsorship":
        artist_id = str(payload.get("artistId") or "").strip()
        artist = next((a for a in state.get("artists", []) if a.get("artistId") == artist_id), None)
        if artist is None:
            raise KeyError("artist not found")
        brand_org = str(payload.get("brandOrgId") or "ORG_AMRIELLE")
        min_rec = float(payload.get("minRecognition") or 12.0)
        if float(artist.get("recognition", 0.0)) < min_rec:
            raise ValueError(f"Brand campaign requires {min_rec:.0f} recognition (current: {float(artist.get('recognition', 0.0)):.1f})")
        payout = max(50.0, float(payload.get("payoutCredits") or 320.0))
        deal = {
            "sponsorshipId": str(uuid.uuid4()),
            "artistId": artist_id,
            "brandOrgId": brand_org,
            "title": str(payload.get("title") or f"{artist['stageName']} × {brand_org.replace('ORG_', '').title()} Campaign"),
            "payoutCredits": round(payout, 2),
            "dayIndex": clock.day_index,
            "status": "completed",
        }
        state.setdefault("sponsorships", []).append(deal)
        adjust_fame(
            artist,
            {"commercialInfluence": 5.5, "recognition": 3.2, "mediaVisibility": 3.0, "artisticCredibility": -0.5},
            clock.day_index,
            clock.tick_count,
        )
        if request_id:
            receipts.append(request_id)
        return {"sponsorship": deal, "fame": fame_profile(run, artist_id)}

    if action == "award_campaign":
        artist_id = str(payload.get("artistId") or "").strip()
        artist = next((a for a in state.get("artists", []) if a.get("artistId") == artist_id), None)
        if artist is None:
            raise KeyError("artist not found")
        category = str(payload.get("category") or "Recorded Music of the Year")
        awards = state.setdefault("awards", [])
        current_cycle = next((aw for aw in awards if aw.get("status") == "open"), None)
        if current_cycle is None:
            current_cycle = {
                "awardCycleId": f"RADIANCE-Y{_date(run)['year']}-D{clock.day_index}",
                "year": _date(run)["year"],
                "ceremonyDay": clock.day_index + 7,
                "status": "open",
                "nominees": [],
                "winners": [],
            }
            awards.append(current_cycle)
        if not any(n.get("artistId") == artist_id and n.get("category") == category for n in current_cycle["nominees"]):
            score = round(
                float(artist.get("artisticCredibility", 15)) * 0.45
                + float(artist.get("culturalInfluence", 5)) * 0.25
                + float(artist.get("industryReputation", 30)) * 0.20
                + float(artist.get("commercialInfluence", 5)) * 0.10,
                2,
            )
            current_cycle["nominees"].append(
                {
                    "artistId": artist_id,
                    "stageName": artist["stageName"],
                    "category": category,
                    "workTitle": str(payload.get("workTitle") or artist["stageName"]),
                    "score": score,
                }
            )
            adjust_fame(
                artist,
                {"industryReputation": 4.0, "artisticCredibility": 2.5, "mediaVisibility": 3.5},
                clock.day_index,
                clock.tick_count,
            )
        if request_id:
            receipts.append(request_id)
        return {"awardCycle": copy.deepcopy(current_cycle)}

    if action == "join_fan_community":
        artist_id = str(payload.get("artistId") or "").strip()
        member_id = str(payload.get("memberCharacterId") or "player")
        artist = next((a for a in state.get("artists", []) if a.get("artistId") == artist_id), None)
        if artist is None:
            raise KeyError("artist not found")
        communities = state.setdefault("fan_communities", [])
        comm = next((fc for fc in communities if fc.get("artistId") == artist_id), None)
        if comm is None:
            comm = {
                "communityId": f"fanclub:{artist_id}",
                "artistId": artist_id,
                "stageName": artist["stageName"],
                "name": f"{artist['stageName']} Listener Circle",
                "memberCharacterIds": [],
                "loyaltyScore": float(artist.get("fanLoyalty", 20.0)),
                "recentActivity": f"Discussing {artist['stageName']}'s latest sessions on MAI.SPACE.",
            }
            communities.append(comm)
        if member_id not in comm["memberCharacterIds"]:
            comm["memberCharacterIds"].append(member_id)
            adjust_fame(artist, {"fanLoyalty": 1.8, "favorability": 1.0}, clock.day_index, clock.tick_count)
            comm["loyaltyScore"] = float(artist.get("fanLoyalty", 20.0))
        if request_id:
            receipts.append(request_id)
        return {"community": copy.deepcopy(comm)}

    if action == "claim_player_royalties":
        artist_id = str(payload.get("artistId") or "").strip()
        artist = next((a for a in state.get("artists", []) if a.get("artistId") == artist_id), None)
        if artist is None:
            raise KeyError("artist not found")
        unclaimed = round(float(artist.get("unclaimedPlayerRoyalties") or 0.0), 2)
        artist["unclaimedPlayerRoyalties"] = 0.0
        if request_id:
            receipts.append(request_id)
        return {"artistId": artist_id, "claimedCredits": unclaimed}

    raise ValueError(f"Unsupported publicity/entertainment action: {action!r}")


def list_organizations(model: Any) -> dict[str, Any]:
    rows: list[Any] = []
    for database in (model.database, SOURCE_DATABASE):
        try:
            with world_services._connection(database) as conn:
                rows = conn.execute(
                    "SELECT OrganizationId,Name,ShortName,Sector,Kind,Domain,Realm,Seat,Tagline,VenueCapacity "
                    "FROM EntertainmentOrganizations ORDER BY OrganizationId"
                ).fetchall()
            if rows:
                break
        except Exception:
            continue
    orgs = [dict(row) for row in rows]
    state = model._extensions
    artists = state.get("artists", [])
    staff = state.get("entertainmentStaff", [])
    productions = state.get("productions", [])
    concerts = state.get("concerts", [])
    for org in orgs:
        oid = org["OrganizationId"]
        org["artistCount"] = sum(
            1 for a in artists
            if oid in (a.get("managerOrgId"), a.get("labelOrgId"), a.get("publisherOrgId"), a.get("prOrgId"), a.get("distributorOrgId"))
        )
        org["staffCount"] = sum(1 for s in staff if s.get("employerOrgId") == oid)
        org["productionCount"] = sum(1 for p in productions if p.get("studioOrgId") == oid)
        org["concertCount"] = sum(1 for c in concerts if oid in (c.get("venueOrgId"), c.get("promoterOrgId")))
        org["state"] = copy.deepcopy(state.get("organizationStates", {}).get(oid))
    return {"organizations": orgs}


def list_projects(run: dict[str, Any]) -> dict[str, Any]:
    projects = []
    for prod in run["state"].get("productions", []):
        projects.append(
            {
                "projectId": prod.get("productionId"),
                "title": prod.get("title"),
                "kind": prod.get("kind"),
                "studioOrgId": prod.get("studioOrgId"),
                "leadId": prod.get("directorOrLeadId"),
                "stage": prod.get("stage"),
                "progress": prod.get("progress"),
                "budget": prod.get("budgetCredits"),
                "quality": prod.get("quality"),
                "status": prod.get("status"),
                "milestones": prod.get("milestones", []),
            }
        )
    return {"projects": projects}


def list_rights(run: dict[str, Any]) -> dict[str, Any]:
    return {"rights": copy.deepcopy(run["state"].get("rights", []))}


def list_licensing(run: dict[str, Any]) -> dict[str, Any]:
    rights = [r for r in run["state"].get("rights", []) if str(r.get("licenseTerms") or "").strip()]
    return {"licenses": copy.deepcopy(rights)}


def list_royalties(run: dict[str, Any]) -> dict[str, Any]:
    ledger = run["state"].get("revenueLedger", [])
    totals: dict[str, float] = {}
    for entry in ledger:
        kind = str(entry.get("kind") or "other")
        totals[kind] = round(totals.get(kind, 0.0) + float(entry.get("netAmount") or 0.0), 2)
    artists = [
        {
            "artistId": a.get("artistId"),
            "stageName": a.get("stageName"),
            "totalRoyaltiesEarned": a.get("totalRoyaltiesEarned", 0.0),
            "unclaimedPlayerRoyalties": a.get("unclaimedPlayerRoyalties", 0.0),
        }
        for a in run["state"].get("artists", [])
    ]
    return {"totalsByKind": totals, "artists": artists, "entries": copy.deepcopy(ledger[-100:])}


def list_charts(run: dict[str, Any]) -> dict[str, Any]:
    tracks = sorted(
        run["state"].get("tracks", []),
        key=lambda t: (int(t.get("streams") or 0), int(t.get("radioSpins") or 0)),
        reverse=True,
    )[:20]
    return {"charts": [{"trackId": t.get("trackId"), "title": t.get("title"), "artistId": t.get("artistId"), "streams": t.get("streams", 0), "radioSpins": t.get("radioSpins", 0)} for t in tracks]}


def list_media(run: dict[str, Any]) -> dict[str, Any]:
    return {"media": copy.deepcopy(run["state"].get("media_items", []))}


def list_memberships(run: dict[str, Any]) -> dict[str, Any]:
    return {
        "fanCommunities": copy.deepcopy(run["state"].get("fan_communities", [])),
        "staff": copy.deepcopy(run["state"].get("entertainmentStaff", [])),
    }


def list_bookings(run: dict[str, Any]) -> dict[str, Any]:
    return {"bookings": copy.deepcopy(run["state"].get("concerts", []))}


def list_tours(run: dict[str, Any]) -> dict[str, Any]:
    tours: dict[str, list[dict[str, Any]]] = {}
    for concert in run["state"].get("concerts", []):
        tours.setdefault(str(concert.get("artistId") or ""), []).append(copy.deepcopy(concert))
    return {"tours": [{"artistId": artist_id, "bookings": bookings} for artist_id, bookings in tours.items()]}


def list_broadcasting(run: dict[str, Any]) -> dict[str, Any]:
    tracks = [t for t in run["state"].get("tracks", []) if int(t.get("radioSpins") or 0) > 0]
    return {"broadcasting": [{"trackId": t.get("trackId"), "title": t.get("title"), "radioSpins": t.get("radioSpins", 0)} for t in tracks]}


def list_campaigns(run: dict[str, Any]) -> dict[str, Any]:
    return {"campaigns": copy.deepcopy(run["state"].get("sponsorships", []))}


def list_awards(run: dict[str, Any]) -> dict[str, Any]:
    return {"awards": copy.deepcopy(run["state"].get("awardCycles", []))}


def industry_snapshot(run: dict[str, Any]) -> dict[str, Any]:
    state = _state(run)
    artists = [_ensure_artist_defaults(copy.deepcopy(a)) for a in state.get("artists", [])]
    tracks = copy.deepcopy(state.get("tracks", []))
    releases = copy.deepcopy(state.get("releases", []))
    concerts = copy.deepcopy(state.get("concerts", []))
    productions = copy.deepcopy(state.get("productions", []))
    auditions = copy.deepcopy(state.get("auditions", []))
    contracts = copy.deepcopy(state.get("entertainment_contracts", []))
    sponsorships = copy.deepcopy(state.get("sponsorships", []))
    media_items = copy.deepcopy(state.get("media_items", [])[:40])
    controversies = copy.deepcopy(state.get("controversies", [])[:25])
    awards = copy.deepcopy(state.get("awards", []))
    fan_communities = copy.deepcopy(state.get("fan_communities", []))
    entertainment_staff = copy.deepcopy(state.get("entertainmentStaff", []))
    organization_states = copy.deepcopy(state.get("organizationStates", {}))
    tickets = copy.deepcopy(state.get("tickets", [])[-60:])

    top_tracks = sorted(
        tracks,
        key=lambda t: (int(t.get("streams", 0)) + int(t.get("radioSpins", 0)) * 8, float(t.get("quality", 0))),
        reverse=True,
    )[:10]
    top_artists = sorted(
        artists,
        key=lambda a: (float(a.get("recognition", 0)) + float(a.get("artisticCredibility", 0)) * 0.5 + float(a.get("commercialInfluence", 0)) * 0.5),
        reverse=True,
    )[:12]

    total_streams = sum(int(t.get("streams", 0)) for t in tracks)
    total_radio_spins = sum(int(t.get("radioSpins", 0)) for t in tracks)
    total_tickets_sold = sum(int(c.get("ticketsSold", 0)) for c in concerts)
    total_box_office = round(sum(float(c.get("grossRevenue", 0.0)) for c in concerts), 2)
    total_royalties = round(sum(float(a.get("totalRoyaltiesEarned", 0.0)) for a in artists), 2)

    return {
        "organizations": load_entertainment_organizations(),
        "venues": list(load_entertainment_venues().values()),
        "artists": artists,
        "fameProfiles": [fame_profile(run, a["artistId"]) for a in artists],
        "tracks": tracks,
        "releases": releases,
        "concerts": concerts,
        "productions": productions,
        "auditions": auditions,
        "contracts": contracts,
        "sponsorships": sponsorships,
        "mediaItems": media_items,
        "controversies": controversies,
        "awards": awards,
        "fanCommunities": fan_communities,
        "entertainmentStaff": entertainment_staff,
        "organizationStates": organization_states,
        "tickets": tickets,
        "charts": {
            "songbirdTopTracks": top_tracks,
            "limelightPowerRanking": top_artists,
        },
        "metrics": {
            "organizationCount": len(load_entertainment_organizations()),
            "activeArtists": sum(1 for a in artists if a.get("careerStatus") in ("active", "comeback")),
            "totalArtists": len(artists),
            "totalEntertainmentStaff": len(entertainment_staff),
            "totalTracks": len(tracks),
            "releasedWorks": sum(1 for r in releases if r.get("status") == "released"),
            "scheduledConcerts": sum(1 for c in concerts if c.get("status") == "scheduled"),
            "completedConcerts": sum(1 for c in concerts if c.get("status") == "completed"),
            "openAuditions": sum(1 for a in auditions if a.get("status") == "open"),
            "activeContracts": sum(1 for c in contracts if c.get("status") == "active"),
            "totalStreams": total_streams,
            "totalRadioSpins": total_radio_spins,
            "totalTicketsSold": total_tickets_sold,
            "totalBoxOfficeCredits": total_box_office,
            "totalRoyaltiesCredits": total_royalties,
        },
    }


# ---------------------------------------------------------------------------
# Autonomous Living World Entertainment Simulation (PopulationModel.step hook)
# ---------------------------------------------------------------------------

def _is_entertainment_candidate(citizen: Any) -> bool:
    if not getattr(citizen, "eligible_for_living_sim", False):
        return False
    if getattr(citizen, "character_classification", "") == "Entertainment professional":
        return True
    blob = " ".join(
        str(x)
        for x in (
            getattr(citizen, "primary_occupation", ""),
            getattr(citizen, "role", ""),
            getattr(citizen, "workplace", ""),
            *(getattr(citizen, "hobbies", []) or []),
            *(getattr(citizen, "preferences", []) or []),
            *(getattr(citizen, "specializations", []) or []),
        )
    ).casefold()
    keywords = ("music", "sing", "song", "dance", "actor", "actress", "stage", "theat", "film", "model", "fashion", "photo", "velvet", "radio", "artist", "perform", "creative")
    return any(k in blob for k in keywords)


def _infer_disciplines(citizen: Any) -> list[str]:
    blob = " ".join(
        str(x)
        for x in (
            getattr(citizen, "primary_occupation", ""),
            getattr(citizen, "role", ""),
            *(getattr(citizen, "hobbies", []) or []),
            *(getattr(citizen, "preferences", []) or []),
        )
    ).casefold()
    found: list[str] = []
    mapping = (
        ("music", ("music", "sing", "song", "compos", "sound", "synth", "band")),
        ("dance", ("dance", "choreo", "ballet", "cabaret")),
        ("theatre", ("theat", "stage", "drama", "play")),
        ("acting", ("film", "screen", "actor", "actress", "cinema")),
        ("modeling", ("model", "fashion", "couture", "portrait", "style")),
        ("journalism", ("journal", "press", "editor", "writer", "meridian", "limelight")),
        ("broadcasting", ("radio", "broadcast", "host", "present")),
    )
    for disc, keys in mapping:
        if any(k in blob for k in keys):
            found.append(disc)
    return found or ["music"]


def _entertainment_role_for(citizen: Any, rng: Any) -> tuple[str, str, str]:
    blob = " ".join(
        str(x)
        for x in (
            getattr(citizen, "primary_occupation", ""),
            getattr(citizen, "role", ""),
            *(getattr(citizen, "hobbies", []) or []),
            *(getattr(citizen, "preferences", []) or []),
        )
    ).casefold()
    if any(k in blob for k in ("journal", "press", "editor", "publicist", "radio")):
        family = "communications"
    elif any(k in blob for k in ("model", "fashion", "couture", "stylist")):
        family = "fashion"
    elif any(k in blob for k in ("dance", "choreo", "ballet")):
        family = "performance"
    elif any(k in blob for k in ("actor", "actress", "theat", "film", "cinema")):
        family = "performance"
    elif any(k in blob for k in ("music", "sing", "song", "compos", "sound")):
        family = "music"
    elif any(k in blob for k in ("stage manager", "stagecraft", "lighting", "event coordinator", "stage crew")):
        family = "production"
    elif any(k in blob for k in ("talent", "agent", "manager", "casting")):
        family = "management"
    elif any(k in blob for k in ("photo", "animat", "edit")):
        family = "visual_media"
    elif any(k in blob for k in ("licens", "royalt", "member", "admin")):
        family = "administration"
    else:
        family = "production"

    roles = ENTERTAINMENT_CAREER_FAMILIES[family]
    artists = [r for r in roles if r[1] == "artist"]
    staff = [r for r in roles if r[1] == "staff"]
    if artists and family in ("music", "performance", "fashion"):
        bias = 0.30 + float(getattr(citizen, "music_interest", 0.5)) * 0.35
        if rng.random() < bias:
            return family, rng.choice(artists)[0], "artist"
    if staff:
        return family, rng.choice(staff)[0], "staff"
    return family, roles[0][0], roles[0][1]


def _citizen_is_player_linked(model: Any, character_id: str) -> bool:
    linked = str(model._extensions.get("linkedPlayerCharacterId") or "")
    if linked and linked == character_id:
        return True
    citizen = next((c for c in model.agents if c.character_id == character_id), None)
    if citizen and citizen.employment and float(citizen.employment.get("salary", -1)) == 0.0:
        return True
    return False


def _slot_hour(slot: str) -> int:
    return {"afternoon": 14, "evening": 19, "late": 22}.get(str(slot or "evening").casefold(), 19)


def _listener_affinity(citizen: Any, track: dict[str, Any]) -> float:
    prefs = " ".join(str(x) for x in (getattr(citizen, "preferences", []) or [])).casefold()
    genre = str(track.get("genre") or "").casefold()
    score = float(getattr(citizen, "music_interest", 0.0)) * 0.6
    if genre and genre in prefs:
        score += 2.0
    if getattr(citizen, "activity", "") in ("Entertainment", "Socializing"):
        score += 1.2
    if float(getattr(citizen, "sociability", 0.0)) > 0.6:
        score += 0.4
    return score


def _choose_track(listener: Any, tracks: list[dict[str, Any]], rng: Any) -> dict[str, Any] | None:
    if not tracks:
        return None
    prefs = " ".join(str(x) for x in (getattr(listener, "preferences", []) or [])).casefold()
    best: dict[str, Any] | None = None
    best_score = -1.0
    for track in tracks:
        score = float(track.get("quality", 50.0)) * 0.01
        score += math.log1p(max(0, int(track.get("streams", 0)))) * 0.06
        score += min(3.0, int(track.get("radioSpins", 0)) * 0.03)
        genre = str(track.get("genre") or "").casefold()
        if genre and genre in prefs:
            score += 1.4
        score += rng.random() * 0.9
        if score > best_score:
            best_score = score
            best = track
    return best


def _venue_choices(
    actor: dict[str, Any], concerts: list[dict[str, Any]], target_day: int, rng: Any
) -> list[tuple[float, str, dict[str, Any]]]:
    rec = float(actor.get("recognition", 0.0))
    budget = 400.0 + float(actor.get("totalRoyaltiesEarned", 0.0)) * 0.08 + float(actor.get("totalBoxOfficeEarned", 0.0)) * 0.05
    choices: list[tuple[float, str, dict[str, Any]]] = []
    for venue_org, meta in load_entertainment_venues().items():
        if rec < float(meta["minRecognition"]):
            continue
        if float(meta["rentalCost"]) > budget:
            continue
        available = not any(
            c.get("status") == "scheduled"
            and c.get("venueOrgId") == venue_org
            and int(c.get("scheduledDay", -1)) == target_day
            and str(c.get("slot", "evening")) == "evening"
            for c in concerts
        )
        if not available:
            continue
        ideal = max(180.0, rec * 650.0)
        fit = -abs(float(meta["capacity"]) - ideal) / 1200.0
        cost = -float(meta["rentalCost"]) / 6000.0
        score = fit + cost + rng.random() * 0.4
        choices.append((score, venue_org, meta))
    choices.sort(key=lambda item: item[0], reverse=True)
    return choices


def step_entertainment(model: Any, *, day_rolled: bool, previous_year: int) -> None:
    """Bounded interval-driven autonomous industry simulation inside PopulationModel.step()."""
    living = model.living_agents
    if len(living) < 3:
        # Tiny 2-citizen unit-test fixtures stay untouched unless explicitly commanded via API.
        return

    clock = model.world_clock
    ext = model._extensions
    run_env = {
        "run_id": model.run_id,
        "name": model.run_name,
        "revision": model._revision,
        "calendar": model.calendar_config,
        "state": ext,
    }
    ext["clock"] = clock.to_state()
    try:
        # Process autonomous industry pulses on 6-hour segment boundaries (every 360 elapsed minutes)
        prev_elapsed = max(0, clock.elapsed_minutes - clock.step_minutes)
        segment_crossed = (clock.elapsed_minutes // 360) != (prev_elapsed // 360)
        if not segment_crossed and not day_rolled:
            return

        rng = model.random
        citizens_by_id = {c.character_id: c for c in living}
        artists = ext.setdefault("artists", [])
        tracks = ext.setdefault("tracks", [])
        releases = ext.setdefault("releases", [])
        concerts = ext.setdefault("concerts", [])
        auditions = ext.setdefault("auditions", [])
        contracts = ext.setdefault("entertainment_contracts", [])
        media_items = ext.setdefault("media_items", [])
        fan_communities = ext.setdefault("fan_communities", [])

        # Organizational autonomy: objectives, resources and recovery. Orgs are
        # never deleted; setbacks reduce activity and can be recovered.
        org_states = ext.setdefault("organizationStates", {})
        objectives = (
            "maintain operations",
            "develop new work",
            "recruit professional staff",
            "restore financial health",
            "expand regional audiences",
        )
        for staff in ext.get("entertainmentStaff", []):
            org_states.setdefault(str(staff.get("employerOrgId") or "ORG_OPEN_CALL"), {})
        for production in ext.get("productions", []):
            org_states.setdefault(str(production.get("studioOrgId") or "ORG_OPEN_CALL"), {})
        for entry in org_states.values():
            entry.setdefault("orgId", entry.get("orgId", "ORG_OPEN_CALL"))
            entry.setdefault("budget", 5000.0)
            entry.setdefault("status", "active")
            budget = float(entry.get("budget") or 0.0)
            if entry.get("status") == "dormant":
                if budget >= 1000.0:
                    entry["status"] = "active"
            elif budget < 100.0:
                entry["status"] = "dormant"
            elif budget < 500.0:
                entry["status"] = "restructuring"
            else:
                entry["status"] = "active"
            entry["budget"] = round(max(0.0, budget + rng.uniform(-50.0, 120.0)), 2)
            entry["objective"] = objectives[(clock.day_index + len(str(entry.get("orgId", "")))) % len(objectives)]

        # 1. Talent discovery & NPC artist onboarding (scales with eligible population and demand)
        existing_char_ids = {a.get("characterId") for a in artists if a.get("characterId")}
        open_auditions = [a for a in auditions if a.get("status") == "open"]
        target_roster = max(4, min(80, len(living) // 3 + len(open_auditions)))
        recruit_slots = max(0, min(3, target_roster - len(artists)))
        for _ in range(recruit_slots):
            candidates = [c for c in living if c.character_id not in existing_char_ids and _is_entertainment_candidate(c)]
            if not candidates:
                break
            if not any(a.get("origin") == "npc" for a in artists):
                music_candidates = [c for c in candidates if "music" in _infer_disciplines(c)]
                recruit = rng.choice(music_candidates or candidates)
            else:
                recruit = rng.choice(candidates)
            existing_char_ids.add(recruit.character_id)
            family, role_id, role_kind = _entertainment_role_for(recruit, rng)
            if (
                role_kind != "artist"
                and family in ("music", "performance", "fashion")
                and not any(a.get("origin") == "npc" for a in artists)
            ):
                role_kind = "artist"
                role_id = next(r[0] for r in ENTERTAINMENT_CAREER_FAMILIES[family] if r[1] == "artist")
            if role_kind != "artist":
                staff = ext.setdefault("entertainmentStaff", [])
                employer = rng.choice(["ORG_OPEN_CALL", "ORG_MIRRORA_STUDIOS", "ORG_LIMELIGHT", "ORG_KAJI_PUBLISHING", "ORG_GLASSLINE_DESIGNS"])
                salary = round(120.0 + float(getattr(recruit, "music_interest", 0.5)) * 80.0, 2)
                staff.append(
                    {
                        "staffId": str(uuid.uuid4()),
                        "characterId": recruit.character_id,
                        "name": recruit.name,
                        "family": family,
                        "role": role_id,
                        "kind": "staff",
                        "employerOrgId": employer,
                        "salary": salary,
                        "hiredDay": clock.day_index,
                    }
                )
                employment = getattr(recruit, "employment", None)
                if isinstance(employment, dict):
                    employment["salary"] = salary
                    employment["role"] = role_id
                continue
            disciplines = _infer_disciplines(recruit)
            genres = ["Celestial Ambient"] if recruit.realm in ("Orynvell", "Lumia") else ["Marlowe Tidewave"] if recruit.realm == "Marlowe" else ["Glassline Synth"]
            created = upsert_artist(
                run_env,
                {
                    "characterId": recruit.character_id,
                    "stageName": recruit.name,
                    "genres": genres,
                    "disciplines": disciplines,
                    "bio": f"{recruit.role or 'Performer'} from {recruit.realm or 'Aureline'} active in Meridion's entertainment scene.",
                    "recognition": round(8.0 + recruit.music_interest * 18.0, 2),
                    "artisticCredibility": round(20.0 + recruit.music_interest * 25.0, 2),
                    "favorability": round(52.0 + recruit.sociability * 18.0, 2),
                    "fanLoyalty": round(14.0 + recruit.sociability * 16.0, 2),
                    "origin": "npc",
                },
            )
            # Sign initial independent or major representation for some discovered NPCs
            rep_org = rng.choice(["ORG_STARSTRUCK", "ORG_SECOND_ACT", "ORG_MARLIE_RECORDS", ""])
            if rep_org:
                ctype = "label" if rep_org == "ORG_MARLIE_RECORDS" else "management"
                manage_contract(run_env, {"artistId": created["artistId"], "orgId": rep_org, "contractType": ctype})

        # 2. Ensure auditions stay populated from actual productions and organizational activity
        if len(open_auditions) < 3:
            productions = ext.setdefault("productions", [])
            derived: list[tuple[str, str, str, str, float, float]] = []
            for prod in productions:
                kind = str(prod.get("kind") or "").casefold()
                if kind in DISCIPLINES and prod.get("status") in ("in_production", "released"):
                    derived.append(
                        (
                            f"{prod.get('title') or 'Untitled Production'} — {kind.title()} Call",
                            str(prod.get("studioOrgId") or "ORG_OPEN_CALL"),
                            str(prod.get("studioOrgId") or "ORG_MIRRORA_STUDIOS"),
                            kind,
                            12.0,
                            220.0,
                        )
                    )
            if not derived:
                derived = [
                    ("Mirrora Evening Drama — Supporting Lead", "ORG_OPEN_CALL", "ORG_MIRRORA_STUDIOS", "acting", 16.0, 260.0),
                    ("The Looking Glass — Emerging Acoustic Showcase", "ORG_LOOKING_GLASS", "ORG_LOOKING_GLASS", "music", 8.0, 120.0),
                    ("Femme Fatale — Promenade Cabaret Ensemble", "ORG_FEMME_FATALE", "ORG_MARIGOLD_THEATRE", "dance", 18.0, 210.0),
                    ("Willow Whisper × Glassline Designs — Autumn Lookbook", "ORG_WILLOW_WHISPER", "ORG_GLASSLINE_DESIGNS", "modeling", 14.0, 240.0),
                    ("Storyloom Studios — Lantern Voices Ensemble", "ORG_OPEN_CALL", "ORG_STORYLOOM_STUDIOS", "acting", 12.0, 195.0),
                    ("Marigold Theatre — Repertory Understudy Call", "ORG_MARIGOLD_THEATRE", "ORG_MARIGOLD_THEATRE", "theatre", 15.0, 200.0),
                ]
            pick_tpl = derived[(clock.day_index + len(auditions)) % len(derived)]
            handle_audition(
                run_env,
                {
                    "action": "create",
                    "title": pick_tpl[0],
                    "orgId": pick_tpl[1],
                    "productionOrgId": pick_tpl[2],
                    "discipline": pick_tpl[3],
                    "minCredibility": pick_tpl[4],
                    "stipendCredits": pick_tpl[5],
                    "deadlineDay": clock.day_index + 3,
                },
            )

        # 3. Active NPC artists record music, audition, schedule releases & concerts
        active_npc_artists = [
            a for a in artists if a.get("origin") != "player" and a.get("careerStatus") in ("active", "comeback")
        ]
        if active_npc_artists:
            actor = active_npc_artists[clock.tick_count % len(active_npc_artists)]
            _ensure_artist_defaults(actor, clock.day_index, clock.tick_count)
            artist_tracks = [t for t in tracks if t.get("artistId") == actor["artistId"]]

            catalog_target = min(12, 3 + int(float(actor.get("recognition", 0.0)) // 18))
            if len(artist_tracks) < catalog_target and "music" in actor.get("disciplines", ["music"]):
                titles = ("Glassline Nocturne", "Tidewater Signal", "Balisya Brass", "Echoes Over Angel Bay", "Velvet Static", "Elodia Windward", "Radiance After Midnight")
                title = f"{titles[(len(tracks) + clock.day_index) % len(titles)]}"
                new_track = add_track(
                    run_env,
                    {
                        "artistId": actor["artistId"],
                        "title": title,
                        "quality": round(55.0 + rng.random() * 38.0, 1),
                        "producerOrgId": "ORG_KAJI_PUBLISHING",
                    },
                )
                schedule_release(
                    run_env,
                    {
                        "trackId": new_track["trackId"],
                        "artistId": actor["artistId"],
                        "scheduledDay": clock.day_index + 1,
                        "royaltyRate": 0.15,
                        "distributorOrgId": actor.get("distributorOrgId") or "ORG_LUNERUM_DIST",
                    },
                )
                projects = ext.setdefault("recordingProjects", [])
                if not any(p.get("artistId") == actor["artistId"] and p.get("status") == "recording" for p in projects):
                    projects.append(
                        {
                            "projectId": str(uuid.uuid4()),
                            "artistId": actor["artistId"],
                            "title": f"{actor.get('stageName', 'Artist')} — Day {clock.day_index + 1} Sessions",
                            "status": "recording",
                            "startedDay": clock.day_index,
                            "targetTracks": catalog_target,
                        }
                    )

            # Apply to an open audition the artist is actually eligible for
            actor_disciplines = {str(d).casefold() for d in actor.get("disciplines", [])}
            for aud in auditions:
                if aud.get("status") != "open":
                    continue
                disc = str(aud.get("discipline") or "").casefold()
                if disc and disc not in actor_disciplines:
                    continue
                if any(ap.get("artistId") == actor["artistId"] for ap in aud.get("applicants", [])):
                    continue
                handle_audition(run_env, {"auditionId": aud["auditionId"], "artistId": actor["artistId"], "skillScore": 60.0 + rng.random() * 30.0})
                break

            # Schedule an upcoming live venue performance if none pending for this artist
            has_scheduled_show = any(c.get("artistId") == actor["artistId"] and c.get("status") == "scheduled" for c in concerts)
            if not has_scheduled_show and len(concerts) < 30:
                target_day = clock.day_index + 1
                choices = _venue_choices(actor, concerts, target_day, rng)
                if choices:
                    _, venue_org, vmeta = choices[0]
                    try:
                        schedule_concert(
                            run_env,
                            {
                                "artistId": actor["artistId"],
                                "venue": vmeta["name"],
                                "venueOrgId": venue_org,
                                "scheduledDay": target_day,
                                "slot": "evening",
                                "ticketPrice": vmeta["defaultTicket"],
                                "capacity": vmeta["capacity"],
                            },
                        )
                    except ValueError:
                        pass

        # 4. Citizen streaming, Pop Sticker radio airplay & concert attendance
        released_ids = {r.get("trackId") for r in releases if r.get("status") == "released"}
        playable_tracks = [t for t in tracks if t.get("trackId") in released_ids or len(releases) == 0]
        if playable_tracks:
            listener_pool = [c for c in living if c.activity in ("Entertainment", "Relaxing", "Commuting", "Socializing")]
            listener_pool.sort(
                key=lambda c: _listener_affinity(c, playable_tracks[0]) + float(getattr(c, "music_interest", 0.0)),
                reverse=True,
            )
            audience = listener_pool[: max(8, min(30, len(listener_pool)))]
            releases_by_track = {r.get("trackId"): r for r in releases if r.get("status") == "released"}
            for listener in audience:
                chosen = _choose_track(listener, playable_tracks, rng)
                if chosen is None:
                    break
                chosen["streams"] = int(chosen.get("streams") or 0) + 1
                art = next((a for a in artists if a.get("artistId") == chosen.get("artistId")), None)
                if art is not None:
                    art["monthlyListeners"] = int(art.get("monthlyListeners") or 0) + 1
                    release = releases_by_track.get(chosen.get("trackId"))
                    rate = float(release.get("expectedRoyaltyRate", 0.14)) if release else 0.12
                    split = float(art.get("royaltySplitArtist", 0.80))
                    royalty = round(rate * split, 4)
                    art["totalRoyaltiesEarned"] = round(float(art.get("totalRoyaltiesEarned") or 0.0) + royalty, 2)
                    cid = str(art.get("characterId") or "")
                    if art.get("origin") == "player" or _citizen_is_player_linked(model, cid):
                        art["unclaimedPlayerRoyalties"] = round(float(art.get("unclaimedPlayerRoyalties") or 0.0) + royalty, 2)
                    elif cid in citizens_by_id:
                        model.record_transaction(
                            citizens_by_id[cid],
                            "royalty",
                            round(royalty, 2),
                            f"Songbird & MMRS streaming royalty: {chosen['title']}",
                        )
                    adjust_fame(art, {"recognition": 0.08, "commercialInfluence": 0.06}, clock.day_index, clock.tick_count)

        # Execute scheduled concerts whose day/window has arrived
        settled = ext.setdefault("settled_concert_ids", [])
        for concert in concerts:
            if concert.get("status") != "scheduled":
                continue
            sday = int(concert.get("scheduledDay", clock.day_index))
            slot_hour = _slot_hour(str(concert.get("slot", "evening")))
            if clock.day_index < sday or (clock.day_index == sday and clock.hour < slot_hour):
                continue
            cid_key = str(concert.get("concertId"))
            if cid_key in settled:
                concert["status"] = "completed"
                continue

            art = next((a for a in artists if a.get("artistId") == concert.get("artistId")), None)
            price = float(concert.get("ticketPrice") or 12.0)
            cap = int(concert.get("capacity") or 180)
            already_sold = int(concert.get("ticketsSold") or 0)
            draw_factor = min(0.95, 0.18 + (float(art.get("recognition", 10.0)) + float(art.get("fanLoyalty", 15.0))) / 160.0) if art else 0.25

            # Actual living citizens buy tickets if affordable, plus wider realm audience for big rooms
            eligible_buyers = [c for c in living if c.balance >= price + 20.0 and c.character_id != (art.get("characterId") if art else "")]
            npc_buyers = eligible_buyers[: min(len(eligible_buyers), max(1, int(len(eligible_buyers) * draw_factor * 0.35)))]
            for buyer in npc_buyers:
                if int(concert.get("ticketsSold") or 0) >= cap:
                    break
                model.record_transaction(buyer, "entertainment", -price, f"Ticket: {concert.get('title') or concert.get('venue')}")
                concert["ticketsSold"] = int(concert.get("ticketsSold") or 0) + 1
                concert.setdefault("attendeeCharacterIds", []).append(buyer.character_id)

            # Broader city/realm walk-up demand scaled by recognition & venue size
            walkup = min(cap - int(concert.get("ticketsSold") or 0), int(cap * draw_factor * 0.65))
            total_sold = max(already_sold, int(concert.get("ticketsSold") or 0) + max(0, walkup))
            gross = round(total_sold * price, 2)
            rental = float(concert.get("rentalCost") or 50.0)
            promoter_cut = round(gross * (0.15 if concert.get("promoterOrgId") else 0.05), 2)
            mgmt_rate = 0.22 if (art and art.get("managerOrgId") == "ORG_STARSTRUCK") else 0.14 if (art and art.get("managerOrgId") == "ORG_SECOND_ACT") else 0.0
            net_payout = round(max(0.0, (gross - rental - promoter_cut) * (1.0 - mgmt_rate)), 2)

            concert["ticketsSold"] = total_sold
            concert["grossRevenue"] = gross
            concert["netArtistPayout"] = net_payout
            concert["reviewScore"] = round(min(98.0, 62.0 + (float(art.get("artisticCredibility", 20.0)) * 0.32 if art else 10.0)), 1)
            concert["status"] = "completed"
            settled.append(cid_key)

            if art is not None:
                art["totalBoxOfficeEarned"] = round(float(art.get("totalBoxOfficeEarned") or 0.0) + net_payout, 2)
                char_id = str(art.get("characterId") or "")
                if art.get("origin") == "player" or _citizen_is_player_linked(model, char_id):
                    art["unclaimedPlayerRoyalties"] = round(float(art.get("unclaimedPlayerRoyalties") or 0.0) + net_payout, 2)
                elif char_id in citizens_by_id and net_payout > 0:
                    model.record_transaction(
                        citizens_by_id[char_id],
                        "performance",
                        net_payout,
                        f"Box-office settlement: {concert.get('venue')} ({total_sold} tickets)",
                    )
                fill_ratio = total_sold / max(1, cap)
                adjust_fame(
                    art,
                    {
                        "recognition": 2.5 + fill_ratio * 4.5,
                        "fanLoyalty": 2.2 + fill_ratio * 3.0,
                        "commercialInfluence": 1.8 + fill_ratio * 4.0,
                        "culturalInfluence": 2.5 if cap >= 1000 else 1.0,
                        "mediaVisibility": 3.0,
                    },
                    clock.day_index,
                    clock.tick_count,
                )
                ext.setdefault("events", []).append(
                    {
                        "eventId": str(uuid.uuid4()),
                        "kind": "entertainment",
                        "title": f"{art['stageName']} performed at {concert['venue']}",
                        "description": f"Attendance {total_sold}/{cap} · Gross {gross:.0f} cr · Review {concert['reviewScore']}/100.",
                        "worldDate": model.current_world_date(),
                        "at": _now(),
                    }
                )

        # 5. Daily industry lifecycle: release drops, audition casting, Limelight press, fame decay, awards
        if day_rolled:
            for rel in releases:
                if rel.get("status") == "scheduled" and int(rel.get("scheduledDay", 0)) <= clock.day_index:
                    rel["status"] = "released"
                    rel["releasedDay"] = clock.day_index
                    art = next((a for a in artists if a.get("artistId") == rel.get("artistId")), None)
                    if art is not None:
                        adjust_fame(
                            art,
                            {"recognition": 3.2, "mediaVisibility": 4.0, "fanLoyalty": 2.0},
                            clock.day_index,
                            clock.tick_count,
                        )
                        media_items.insert(
                            0,
                            {
                                "mediaId": str(uuid.uuid4()),
                                "orgId": "ORG_LIMELIGHT",
                                "kind": "release_review",
                                "headline": f"Limelight Review: {art['stageName']} Releases “{rel.get('title', 'New Single')}”",
                                "summary": f"Distributed onto Songbird via {rel.get('distributorOrgId', 'ORG_LUNERUM_DIST')}. Listeners across Aureline and Marlowe weigh in.",
                                "subjectArtistIds": [art["artistId"]],
                                "sentiment": "positive",
                                "dayIndex": clock.day_index,
                            },
                        )

            # Close due auditions & cast highest-scoring applicant
            for aud in auditions:
                if aud.get("status") != "open":
                    continue
                if int(aud.get("deadlineDay", 0)) > clock.day_index:
                    continue
                if not aud.get("applicants"):
                    aud["status"] = "expired"
                    aud["closedDay"] = clock.day_index
                    continue
                winner = max(aud["applicants"], key=lambda ap: float(ap.get("score", 0.0)))
                aud["status"] = "cast"
                aud["selectedArtistId"] = winner["artistId"]
                art = next((a for a in artists if a.get("artistId") == winner["artistId"]), None)
                if art is not None:
                    stipend = float(aud.get("stipendCredits") or 180.0)
                    char_id = str(art.get("characterId") or "")
                    if art.get("origin") == "player" or _citizen_is_player_linked(model, char_id):
                        art["unclaimedPlayerRoyalties"] = round(float(art.get("unclaimedPlayerRoyalties") or 0.0) + stipend, 2)
                    elif char_id in citizens_by_id:
                        model.record_transaction(citizens_by_id[char_id], "commission", stipend, f"Booked role: {aud['title']}")
                    adjust_fame(
                        art,
                        {"industryReputation": 3.5, "artisticCredibility": 2.8, "recognition": 2.2},
                        clock.day_index,
                        clock.tick_count,
                    )

            # Expire finished contracts
            for contract in contracts:
                if contract.get("status") == "active" and int(contract.get("expiresDay", 999999)) <= clock.day_index:
                    contract["status"] = "expired"

            # Natural fame decay for prolonged inactivity + occasional celebrity relationship or controversy
            for art in artists:
                _ensure_artist_defaults(art, clock.day_index, clock.tick_count)
                idle_days = clock.day_index - int(art.get("lastActiveDay", clock.day_index))
                if idle_days >= 5 and art.get("careerStatus") == "active":
                    art["mediaVisibility"] = _clamp(float(art["mediaVisibility"]) - 1.5)
                    art["recognition"] = _clamp(float(art["recognition"]) - 0.6)
                    if idle_days >= 18 and art.get("origin") != "player":
                        art["careerStatus"] = "hiatus"
                elif art.get("careerStatus") == "hiatus" and idle_days >= 10 and art.get("origin") != "player" and rng.random() < 0.25:
                    art["careerStatus"] = "comeback"
                    adjust_fame(art, {"mediaVisibility": 6.0, "fanLoyalty": 3.0}, clock.day_index, clock.tick_count)
                art["tier"] = _fame_tier(art)

            # Occasional controversy or celebrity collaboration
            if len(artists) >= 2 and clock.day_index % 4 == 0:
                pair = rng.sample(artists, 2)
                if rng.random() < 0.65:
                    for member in pair:
                        adjust_fame(member, {"culturalInfluence": 2.0, "fanLoyalty": 1.5, "mediaVisibility": 2.5}, clock.day_index, clock.tick_count)
                    media_items.insert(
                        0,
                        {
                            "mediaId": str(uuid.uuid4()),
                            "orgId": "ORG_LIMELIGHT",
                            "kind": "collaboration",
                            "headline": f"{pair[0]['stageName']} & {pair[1]['stageName']} Spotted at Kaji / Velvet Sessions",
                            "summary": "Industry insiders hint at a cross-discipline collaboration bridging their audiences.",
                            "subjectArtistIds": [pair[0]["artistId"], pair[1]["artistId"]],
                            "sentiment": "positive",
                            "dayIndex": clock.day_index,
                        },
                    )
                else:
                    subject = pair[0]
                    controversy = {
                        "controversyId": str(uuid.uuid4()),
                        "artistId": subject["artistId"],
                        "stageName": subject["stageName"],
                        "kind": "public_scrutiny",
                        "headline": f"Debate Swirls Around {subject['stageName']} Tour Pricing & Contract Terms",
                        "severity": "moderate",
                        "status": "open",
                        "prOrgId": subject.get("prOrgId", ""),
                        "dayIndex": clock.day_index,
                    }
                    ext.setdefault("controversies", []).insert(0, controversy)
                    adjust_fame(subject, {"favorability": -4.0, "mediaVisibility": 5.5}, clock.day_index, clock.tick_count)

            # Radiance Awards cycle every 30 simulation days or new calendar year
            if (clock.day_index > 0 and clock.day_index % 30 == 0) or (
                model.current_world_date()["year"] > previous_year and artists
            ):
                ranked = sorted(
                    artists,
                    key=lambda a: (
                        float(a.get("artisticCredibility", 0)) * 0.45
                        + float(a.get("culturalInfluence", 0)) * 0.25
                        + float(a.get("industryReputation", 0)) * 0.20
                        + float(a.get("commercialInfluence", 0)) * 0.10
                    ),
                    reverse=True,
                )
                nominees = [
                    {
                        "artistId": a["artistId"],
                        "stageName": a["stageName"],
                        "category": "Radiance Artist & Craft Honor",
                        "workTitle": a["stageName"],
                        "score": round(float(a.get("artisticCredibility", 0)) + float(a.get("culturalInfluence", 0)), 2),
                    }
                    for a in ranked[: min(5, len(ranked))]
                ]
                winners = nominees[:1]
                for w in winners:
                    win_art = next((a for a in artists if a.get("artistId") == w["artistId"]), None)
                    if win_art is not None:
                        adjust_fame(
                            win_art,
                            {
                                "recognition": 8.0,
                                "industryReputation": 9.0,
                                "artisticCredibility": 7.0,
                                "culturalInfluence": 8.0,
                                "mediaVisibility": 10.0,
                            },
                            clock.day_index,
                            clock.tick_count,
                        )
                ext.setdefault("awards", []).append(
                    {
                        "awardCycleId": f"RADIANCE-D{clock.day_index}",
                        "year": model.current_world_date()["year"],
                        "ceremonyDay": clock.day_index,
                        "status": "completed",
                        "nominees": nominees,
                        "winners": winners,
                    }
                )
                if winners:
                    media_items.insert(
                        0,
                        {
                            "mediaId": str(uuid.uuid4()),
                            "orgId": "ORG_RADIANCE_AWARDS",
                            "kind": "awards",
                            "headline": f"The Radiance Awards Crown {winners[0]['stageName']} at Radiance Hall",
                            "summary": f"{len(nominees)} nominees honored across recorded music, screen, dance, and stagecraft.",
                            "subjectArtistIds": [w["artistId"] for w in nominees],
                            "sentiment": "celebratory",
                            "dayIndex": clock.day_index,
                        },
                    )

            # Bound history lists to keep run snapshots lean
            if len(media_items) > 80:
                del media_items[80:]
            if len(fan_communities) == 0 and artists:
                top = artists[0]
                fan_communities.append(
                    {
                        "communityId": f"fanclub:{top['artistId']}",
                        "artistId": top["artistId"],
                        "stageName": top["stageName"],
                        "name": f"{top['stageName']} Listener Circle",
                        "memberCharacterIds": [c.character_id for c in living[: min(4, len(living))]],
                        "loyaltyScore": float(top.get("fanLoyalty", 25.0)),
                        "recentActivity": f"Trading Pop Sticker editions and following {top['stageName']} shows.",
                    }
                )
    finally:
        ext.pop("clock", None)
