from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from living_world import WorldClock, world_date


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _state(run: dict[str, Any]) -> dict[str, Any]:
    return run["state"]


def _date(run: dict[str, Any]) -> dict[str, Any]:
    clock = WorldClock.from_state(_state(run)["clock"])
    return world_date(
        clock.day_index,
        clock.minute_of_day,
        run["calendar"],
        realm=str(_state(run).get("realm") or ""),
        affiliation=str(_state(run).get("affiliation") or ""),
    )


def list_artists(run: dict[str, Any]) -> dict[str, Any]:
    return {"artists": _state(run).get("artists", [])}


def upsert_artist(run: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    state = _state(run)
    artists = state.setdefault("artists", [])
    artist_id = str(payload.get("artistId") or "").strip() or str(uuid.uuid4())
    record = {
        "artistId": artist_id,
        "stageName": str(payload.get("stageName") or "").strip(),
        "characterId": str(payload.get("characterId") or "").strip(),
        "genres": payload.get("genres") or [],
        "bio": str(payload.get("bio") or ""),
        "updatedAt": _now(),
    }
    if not record["stageName"]:
        raise ValueError("stageName is required")
    for index, existing in enumerate(artists):
        if existing.get("artistId") == artist_id:
            record = {**existing, **record}
            artists[index] = record
            return record
    artists.append(record)
    return record


def list_music(run: dict[str, Any]) -> dict[str, Any]:
    return {"tracks": _state(run).get("tracks", [])}


def add_track(run: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    state = _state(run)
    title = str(payload.get("title") or "").strip()
    if not title:
        raise ValueError("title is required")
    record = {
        "trackId": str(uuid.uuid4()),
        "title": title,
        "artistId": str(payload.get("artistId") or ""),
        "kind": str(payload.get("kind") or "single"),
        "durationSeconds": int(payload.get("durationSeconds") or 0),
        "license": str(payload.get("license") or "original"),
        "releaseDate": payload.get("releaseDate") or _date(run).get("time", ""),
        "createdAt": _now(),
    }
    tracks = state.setdefault("tracks", [])
    tracks.append(record)
    return record


def list_releases(run: dict[str, Any]) -> dict[str, Any]:
    return {"releases": _state(run).get("releases", [])}


def schedule_release(run: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    state = _state(run)
    track_id = str(payload.get("trackId") or "").strip()
    if not track_id:
        raise ValueError("trackId is required")
    record = {
        "releaseId": str(uuid.uuid4()),
        "trackId": track_id,
        "releaseDate": str(payload.get("releaseDate") or ""),
        "expectedRoyaltyRate": float(payload.get("royaltyRate") or 0),
        "status": "scheduled",
        "createdAt": _now(),
    }
    releases = state.setdefault("releases", [])
    releases.append(record)
    return record


def list_concerts(run: dict[str, Any]) -> dict[str, Any]:
    return {"concerts": _state(run).get("concerts", [])}


def schedule_concert(run: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    state = _state(run)
    record = {
        "concertId": str(uuid.uuid4()),
        "artistId": str(payload.get("artistId") or ""),
        "venue": str(payload.get("venue") or ""),
        "date": str(payload.get("date") or ""),
        "ticketPrice": float(payload.get("ticketPrice") or 0),
        "capacity": int(payload.get("capacity") or 0),
        "status": "scheduled",
        "createdAt": _now(),
    }
    concerts = state.setdefault("concerts", [])
    concerts.append(record)
    return record


def fame_profile(run: dict[str, Any], artist_id: str) -> dict[str, Any]:
    artists = _state(run).get("artists", [])
    artist = next((a for a in artists if a.get("artistId") == artist_id), None)
    if artist is None:
        raise KeyError("artist not found")
    return {
        "artistId": artist_id,
        "recognition": float(artist.get("recognition", 0)),
        "favorability": float(artist.get("favorability", 0)),
        "industryReputation": float(artist.get("industryReputation", 0)),
        "fanLoyalty": float(artist.get("fanLoyalty", 0)),
        "artisticCredibility": float(artist.get("artisticCredibility", 0)),
        "commercialInfluence": float(artist.get("commercialInfluence", 0)),
        "culturalInfluence": float(artist.get("culturalInfluence", 0)),
        "mediaVisibility": float(artist.get("mediaVisibility", 0)),
    }