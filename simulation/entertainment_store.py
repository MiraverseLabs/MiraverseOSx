"""Persistent relational storage bridge for Phase 2 entertainment tables in miraverse.db.

Complements LivingWorldRuns and LivingWorldTransactions by projecting dynamic run-scoped
entertainment state into normalized SQLite tables across all 14 entertainment data categories,
and managing the canonical EntertainmentVenues reference table.
"""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
SCHEMA_SQL_PATH = REPO_ROOT / "scripts" / "entertainment_schema.sql"

CANONICAL_VENUE_DEFAULTS: tuple[dict[str, Any], ...] = (
    {
        "venueOrgId": "ORG_LOOKING_GLASS",
        "locationId": "loc-looking-glass",
        "name": "The Looking Glass",
        "district": "Glassline District",
        "realm": "Orynvell",
        "capacity": 180,
        "minRecognition": 0.0,
        "rentalCost": 65.0,
        "defaultTicket": 18.0,
    },
    {
        "venueOrgId": "ORG_VELVET_STUDIO",
        "locationId": "loc-velvet-studio",
        "name": "The Velvet Cultural Studio",
        "district": "Promenade Quarter",
        "realm": "Orynvell",
        "capacity": 450,
        "minRecognition": 8.0,
        "rentalCost": 190.0,
        "defaultTicket": 28.0,
    },
    {
        "venueOrgId": "ORG_MARIGOLD_THEATRE",
        "locationId": "loc-marigold-theatre",
        "name": "The Marigold Theatre",
        "district": "Promenade Quarter",
        "realm": "Orynvell",
        "capacity": 1200,
        "minRecognition": 12.0,
        "rentalCost": 480.0,
        "defaultTicket": 45.0,
    },
    {
        "venueOrgId": "ORG_SILVERLEAF_STADIUM",
        "locationId": "loc-silverleaf-stadium",
        "name": "Silverleaf Stadium",
        "district": "Silverleaf Park",
        "realm": "Orynvell",
        "capacity": 45000,
        "minRecognition": 55.0,
        "rentalCost": 4500.0,
        "defaultTicket": 95.0,
    },
)

ENTERTAINMENT_RUN_TABLES: tuple[str, ...] = (
    "EntertainmentArtists",
    "EntertainmentStaff",
    "EntertainmentContracts",
    "EntertainmentTracks",
    "EntertainmentReleases",
    "EntertainmentRights",
    "EntertainmentRevenueLedger",
    "EntertainmentProductions",
    "EntertainmentAuditions",
    "EntertainmentAuditionApplications",
    "EntertainmentConcerts",
    "EntertainmentTickets",
    "EntertainmentMediaItems",
    "EntertainmentCampaigns",
    "EntertainmentControversies",
    "EntertainmentFashionItems",
    "EntertainmentPhotoSessions",
    "EntertainmentFanCommunities",
    "EntertainmentAwardCycles",
    "EntertainmentAwardNominations",
    "EntertainmentTrainingRecords",
)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _packed(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True, allow_nan=False)


def ensure_entertainment_schema(conn: sqlite3.Connection) -> None:
    """Apply the additive Phase 2 entertainment schema DDL idempotently."""
    ddl = SCHEMA_SQL_PATH.read_text(encoding="utf-8")
    conn.executescript(ddl)


def has_entertainment_tables(conn: sqlite3.Connection) -> bool:
    """Return True when the normalized Phase 2 entertainment tables exist in this database."""
    rows = conn.execute(
        """
        SELECT COUNT(*) FROM sqlite_master
        WHERE type = 'table' AND name IN ('EntertainmentVenues', 'EntertainmentArtists', 'EntertainmentConcerts')
        """
    ).fetchone()
    return bool(rows and rows[0] == 3)


def seed_canonical_venues(conn: sqlite3.Connection) -> int:
    """Populate EntertainmentVenues from EntertainmentOrganizations + WorldRecords(venues) + defaults."""
    now = _now()
    by_id: dict[str, dict[str, Any]] = {v["venueOrgId"]: dict(v) for v in CANONICAL_VENUE_DEFAULTS}

    # Merge authoritative values from EntertainmentOrganizations where VenueCapacity is populated
    has_orgs = conn.execute(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='EntertainmentOrganizations'"
    ).fetchone()[0]
    if has_orgs:
        rows = conn.execute(
            """
            SELECT OrganizationId, Name, Realm, Seat, VenueCapacity,
                   MinRecognitionRequired, RentalCostCredits, DataJson
            FROM EntertainmentOrganizations
            WHERE VenueCapacity IS NOT NULL
            ORDER BY OrganizationId
            """
        ).fetchall()
        for row in rows:
            org_id = str(row[0])
            existing = by_id.get(org_id, {})
            seat = str(row[3] or existing.get("district") or "Aureline")
            district = seat.split(",")[0].strip() if "," in seat else seat
            by_id[org_id] = {
                "venueOrgId": org_id,
                "locationId": existing.get("locationId") or "",
                "name": str(row[1]),
                "district": existing.get("district") or district,
                "realm": str(row[2] or existing.get("realm") or "Orynvell"),
                "capacity": int(row[4]),
                "minRecognition": float(row[5] if row[5] is not None else existing.get("minRecognition", 0.0)),
                "rentalCost": float(row[6] if row[6] is not None else existing.get("rentalCost", 65.0)),
                "defaultTicket": float(existing.get("defaultTicket", 24.0)),
            }

    # Enrich LocationId / District from WorldRecords(venues) if present
    has_world_records = conn.execute(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='WorldRecords'"
    ).fetchone()[0]
    if has_world_records:
        place_rows = conn.execute(
            "SELECT RecordKey, Name, DataJson FROM WorldRecords WHERE Section = 'venues'"
        ).fetchall()
        name_to_place: dict[str, tuple[str, dict[str, Any]]] = {}
        for rkey, pname, pjson in place_rows:
            try:
                parsed = json.loads(pjson) if pjson else {}
            except (TypeError, ValueError):
                parsed = {}
            if pname:
                name_to_place[str(pname).casefold()] = (str(rkey), parsed if isinstance(parsed, dict) else {})
        for v in by_id.values():
            match = name_to_place.get(v["name"].casefold())
            if match:
                loc_id, pdata = match
                v["locationId"] = loc_id
                if pdata.get("district"):
                    v["district"] = str(pdata["district"])

    count = 0
    for v in sorted(by_id.values(), key=lambda item: (item["capacity"], item["venueOrgId"])):
        conn.execute(
            """
            INSERT INTO EntertainmentVenues (
                VenueOrgId, LocationId, Name, District, Realm, Capacity,
                MinRecognitionRequired, RentalCostCredits, DefaultTicketPrice, DataJson, UpdatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(VenueOrgId) DO UPDATE SET
                LocationId = excluded.LocationId,
                Name = excluded.Name,
                District = excluded.District,
                Realm = excluded.Realm,
                Capacity = excluded.Capacity,
                MinRecognitionRequired = excluded.MinRecognitionRequired,
                RentalCostCredits = excluded.RentalCostCredits,
                DefaultTicketPrice = excluded.DefaultTicketPrice,
                DataJson = excluded.DataJson,
                UpdatedAt = excluded.UpdatedAt
            """,
            (
                v["venueOrgId"],
                v.get("locationId") or None,
                v["name"],
                v["district"],
                v["realm"],
                int(v["capacity"]),
                float(v["minRecognition"]),
                float(v["rentalCost"]),
                float(v["defaultTicket"]),
                _packed(v),
                now,
            ),
        )
        count += 1
    return count


def sync_run_entertainment_state(conn: sqlite3.Connection, run_id: str, state: dict[str, Any]) -> dict[str, int]:
    """Atomically project a run's entertainment state into the 14-category normalized tables.

    Caller owns the SQLite transaction (BEGIN / COMMIT).
    """
    if not has_entertainment_tables(conn):
        return {}

    now = _now()
    clock_day = int((state.get("clock") or {}).get("day_index", 0) or 0)

    # Clear this run's normalized entertainment rows cleanly before re-projecting
    for table in ENTERTAINMENT_RUN_TABLES:
        conn.execute(f'DELETE FROM "{table}" WHERE RunId = ?', (run_id,))

    counts: dict[str, int] = {}

    # 1a. Artists
    artists = state.get("artists") or []
    for a in artists:
        aid = str(a.get("artistId") or "").strip()
        if not aid:
            continue
        conn.execute(
            """
            INSERT OR REPLACE INTO EntertainmentArtists (
                RunId, ArtistId, CharacterId, StageName, Origin, CareerStatus, PrivacyBoundary,
                Tier, GuildMember, ManagerOrgId, LabelOrgId, PublisherOrgId, PrOrgId, DistributorOrgId,
                Recognition, Favorability, IndustryReputation, FanLoyalty, ArtisticCredibility,
                CommercialInfluence, CulturalInfluence, MediaVisibility, FanCount, MonthlyListeners,
                TotalRoyaltiesEarned, TotalBoxOfficeEarned, UnclaimedPlayerRoyalties,
                DisciplinesJson, GenresJson, Bio, LastActiveDay, UpdatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_id,
                aid,
                str(a.get("characterId") or ""),
                str(a.get("stageName") or aid),
                str(a.get("origin") or "npc"),
                str(a.get("careerStatus") or "active"),
                str(a.get("privacyBoundary") or "guarded"),
                str(a.get("tier") or "Emerging Newcomer"),
                1 if a.get("guildMember") else 0,
                str(a.get("managerOrgId") or ""),
                str(a.get("labelOrgId") or ""),
                str(a.get("publisherOrgId") or ""),
                str(a.get("prOrgId") or ""),
                str(a.get("distributorOrgId") or ""),
                float(a.get("recognition") or 0.0),
                float(a.get("favorability") or 50.0),
                float(a.get("industryReputation") or 30.0),
                float(a.get("fanLoyalty") or 10.0),
                float(a.get("artisticCredibility") or 15.0),
                float(a.get("commercialInfluence") or 5.0),
                float(a.get("culturalInfluence") or 5.0),
                float(a.get("mediaVisibility") or 5.0),
                int(a.get("fanCount") or 0),
                int(a.get("monthlyListeners") or 0),
                float(a.get("totalRoyaltiesEarned") or 0.0),
                float(a.get("totalBoxOfficeEarned") or 0.0),
                float(a.get("unclaimedPlayerRoyalties") or 0.0),
                _packed(a.get("disciplines") or ["music"]),
                _packed(a.get("genres") or []),
                str(a.get("bio") or ""),
                int(a.get("lastActiveDay") or a.get("lastActiveCycle") or 0),
                str(a.get("updatedAt") or now),
            ),
        )
    counts["artists"] = len(artists)

    # 1b. Industry Staff
    staff_list = state.get("entertainmentStaff") or []
    for idx, st in enumerate(staff_list):
        sid = str(st.get("staffId") or st.get("characterId") or f"staff-{idx}")
        conn.execute(
            """
            INSERT OR REPLACE INTO EntertainmentStaff (
                RunId, StaffId, CharacterId, Name, OrganizationId, CareerFamily, RoleTitle,
                EmploymentKind, SkillLevel, Status, DataJson, UpdatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_id,
                sid,
                str(st.get("characterId") or ""),
                str(st.get("name") or sid),
                str(st.get("organizationId") or st.get("orgId") or ""),
                str(st.get("careerFamily") or st.get("family") or "production"),
                str(st.get("roleTitle") or st.get("role") or ""),
                str(st.get("employmentKind") or st.get("kind") or "staff"),
                float(st.get("skillLevel") or 50.0),
                str(st.get("status") or "active"),
                _packed(st),
                now,
            ),
        )
    counts["staff"] = len(staff_list)

    # 2. Representation Contracts
    contracts = state.get("entertainment_contracts") or state.get("contracts") or []
    for c in contracts:
        cid = str(c.get("contractId") or "").strip()
        if not cid:
            continue
        conn.execute(
            """
            INSERT OR REPLACE INTO EntertainmentContracts (
                RunId, ContractId, ArtistId, OrganizationId, ContractType, CommissionRate,
                RoyaltySplitArtist, AdvanceCredits, ObligationCount, CompletedObligations,
                StartDay, ExpiresDay, Status, DataJson
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_id,
                cid,
                str(c.get("artistId") or ""),
                str(c.get("orgId") or ""),
                str(c.get("contractType") or "management"),
                float(c.get("commissionRate") or 0.0),
                float(c.get("royaltySplitArtist") if c.get("royaltySplitArtist") is not None else 0.80),
                float(c.get("advanceCredits") or 0.0),
                int(c.get("obligationCount") or 0),
                int(c.get("completedObligations") or 0),
                int(c.get("startDay") or c.get("startCycle") or 0),
                int(c.get("expiresDay") or c.get("expiresCycle") or 0),
                str(c.get("status") or "active"),
                _packed(c),
            ),
        )
    counts["contracts"] = len(contracts)

    # 3a. Music Tracks + 4. Derived Intellectual Property Rights
    tracks = state.get("tracks") or []
    rights_count = 0
    for t in tracks:
        tid = str(t.get("trackId") or "").strip()
        if not tid:
            continue
        artist_id = str(t.get("artistId") or "")
        pub_org = str(t.get("publisherOrgId") or "")
        mmrs = 1 if t.get("mmrsRegistered") else 0
        master_owned = 1 if t.get("masterOwnedByArtist", True) else 0
        conn.execute(
            """
            INSERT OR REPLACE INTO EntertainmentTracks (
                RunId, TrackId, ArtistId, StageName, Title, Kind, Genre, DurationSeconds,
                AudioUrl, CoverArtUrl, ProducerOrgId, PublisherOrgId, MmrsRegistered,
                MasterOwnedByArtist, Quality, Streams, RadioSpins, CreatedDay, DataJson
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_id,
                tid,
                artist_id,
                str(t.get("stageName") or ""),
                str(t.get("title") or tid),
                str(t.get("kind") or "single"),
                str(t.get("genre") or ""),
                int(t.get("durationSeconds") or 180),
                str(t.get("audioUrl") or ""),
                str(t.get("coverArtUrl") or ""),
                str(t.get("producerOrgId") or ""),
                pub_org,
                mmrs,
                master_owned,
                float(t.get("quality") or 60.0),
                int(t.get("streams") or 0),
                int(t.get("radioSpins") or 0),
                int(t.get("createdDay") or t.get("createdCycle") or 0),
                _packed(t),
            ),
        )
        # Derive master right entry
        conn.execute(
            """
            INSERT OR REPLACE INTO EntertainmentRights (
                RunId, RightId, WorkType, WorkId, RightsHolderType, RightsHolderId,
                RightCategory, OwnershipSharePct, MmrsRegistered, LicenseTerms, UpdatedAt
            ) VALUES (?, ?, 'track', ?, ?, ?, 'master', ?, ?, ?, ?)
            """,
            (
                run_id,
                f"master:{tid}",
                tid,
                "artist" if master_owned else "organization",
                artist_id if master_owned else (pub_org or "ORG_MARLIE_RECORDS"),
                100.0 if master_owned else 50.0,
                mmrs,
                "Master recording ownership",
                now,
            ),
        )
        rights_count += 1
        if pub_org:
            conn.execute(
                """
                INSERT OR REPLACE INTO EntertainmentRights (
                    RunId, RightId, WorkType, WorkId, RightsHolderType, RightsHolderId,
                    RightCategory, OwnershipSharePct, MmrsRegistered, LicenseTerms, UpdatedAt
                ) VALUES (?, ?, 'track', ?, 'organization', ?, 'publishing', 50.0, ?, 'Publishing administration share', ?)
                """,
                (run_id, f"pub:{tid}:{pub_org}", tid, pub_org, mmrs, now),
            )
            rights_count += 1

    # Explicit IP rights records if present
    for r in state.get("rights") or []:
        rid = str(r.get("rightId") or "").strip()
        if not rid:
            continue
        conn.execute(
            """
            INSERT OR REPLACE INTO EntertainmentRights (
                RunId, RightId, WorkType, WorkId, RightsHolderType, RightsHolderId,
                RightCategory, OwnershipSharePct, MmrsRegistered, LicenseTerms, UpdatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_id,
                rid,
                str(r.get("workType") or "track"),
                str(r.get("workId") or ""),
                str(r.get("rightsHolderType") or "artist"),
                str(r.get("rightsHolderId") or ""),
                str(r.get("rightCategory") or "master"),
                max(0.0, min(100.0, float(r.get("ownershipSharePct") or 100.0))),
                1 if r.get("mmrsRegistered") else 0,
                str(r.get("licenseTerms") or ""),
                now,
            ),
        )
        rights_count += 1
    counts["tracks"] = len(tracks)
    counts["rights"] = rights_count

    # 3b. Music Releases
    releases = state.get("releases") or []
    for rel in releases:
        rid = str(rel.get("releaseId") or "").strip()
        if not rid:
            continue
        conn.execute(
            """
            INSERT OR REPLACE INTO EntertainmentReleases (
                RunId, ReleaseId, TrackId, ArtistId, Title, Format, DistributorOrgId,
                LabelOrgId, PlatformOrgId, ScheduledDay, ReleasedDay, RoyaltyRate, Status, DataJson
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_id,
                rid,
                str(rel.get("trackId") or ""),
                str(rel.get("artistId") or ""),
                str(rel.get("title") or rid),
                str(rel.get("format") or rel.get("kind") or "Single"),
                str(rel.get("distributorOrgId") or ""),
                str(rel.get("labelOrgId") or ""),
                str(rel.get("platformOrgId") or "ORG_SONGBIRD"),
                int(rel.get("scheduledDay") or rel.get("releaseCycle") or 0),
                int(rel["releasedDay"]) if rel.get("releasedDay") is not None else None,
                float(rel.get("expectedRoyaltyRate") if rel.get("expectedRoyaltyRate") is not None else rel.get("royaltyRate", 0.14)),
                str(rel.get("status") or "scheduled"),
                _packed(rel),
            ),
        )
    counts["releases"] = len(releases)

    # 6. Productions + 10. Fashion + 11. Photography (from explicit collections and production kinds)
    productions = state.get("productions") or []
    fashion_count = 0
    photo_count = 0
    for prod in productions:
        pid = str(prod.get("productionId") or prod.get("projectId") or "").strip()
        if not pid:
            continue
        kind = str(prod.get("kind") or "film")
        studio_org = str(prod.get("studioOrgId") or prod.get("partnerOrgId") or "")
        conn.execute(
            """
            INSERT OR REPLACE INTO EntertainmentProductions (
                RunId, ProductionId, Title, Kind, StudioOrgId, DirectorOrLeadId,
                Stage, Progress, BudgetCredits, Quality, Status, DataJson
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_id,
                pid,
                str(prod.get("title") or pid),
                kind,
                studio_org,
                str(prod.get("artistId") or prod.get("directorId") or ""),
                str(prod.get("stage") or "development"),
                float(prod.get("progress") or 0.0),
                float(prod.get("budgetCredits") or 0.0),
                float(prod.get("quality") or 70.0),
                str(prod.get("status") or "in_production"),
                _packed(prod),
            ),
        )
        if kind.casefold() in ("modeling", "fashion", "fashion_campaign") or studio_org in ("ORG_GLASSLINE_DESIGNS", "ORG_WILLOW_WHISPER", "ORG_AMRIELLE"):
            conn.execute(
                """
                INSERT OR REPLACE INTO EntertainmentFashionItems (
                    RunId, FashionItemId, OrganizationId, ArtistId, Kind, Title, Season, FeeCredits, Status, DataJson
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    run_id,
                    f"prod:{pid}",
                    studio_org,
                    str(prod.get("artistId") or ""),
                    kind,
                    str(prod.get("title") or pid),
                    str(prod.get("season") or f"Day {clock_day}"),
                    float(prod.get("budgetCredits") or 0.0),
                    str(prod.get("status") or "active"),
                    _packed(prod),
                ),
            )
            fashion_count += 1
        if studio_org == "ORG_ROSEMONT_PORTRAIT" or kind.casefold() in ("photography", "portrait", "promo_kit"):
            conn.execute(
                """
                INSERT OR REPLACE INTO EntertainmentPhotoSessions (
                    RunId, SessionId, StudioOrgId, SubjectArtistId, Title, CommissionKind,
                    DeliverableAssetPath, Status, DayIndex, DataJson
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    run_id,
                    f"prod:{pid}",
                    studio_org or "ORG_ROSEMONT_PORTRAIT",
                    str(prod.get("artistId") or ""),
                    str(prod.get("title") or pid),
                    kind,
                    str(prod.get("deliverableAssetPath") or ""),
                    str(prod.get("status") or "scheduled"),
                    clock_day,
                    _packed(prod),
                ),
            )
            photo_count += 1
    counts["productions"] = len(productions)

    for fitem in state.get("fashionItems") or []:
        fid = str(fitem.get("fashionItemId") or "").strip()
        if not fid:
            continue
        conn.execute(
            """
            INSERT OR REPLACE INTO EntertainmentFashionItems (
                RunId, FashionItemId, OrganizationId, ArtistId, Kind, Title, Season, FeeCredits, Status, DataJson
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_id,
                fid,
                str(fitem.get("organizationId") or ""),
                str(fitem.get("artistId") or ""),
                str(fitem.get("kind") or "collection"),
                str(fitem.get("title") or fid),
                str(fitem.get("season") or ""),
                float(fitem.get("feeCredits") or 0.0),
                str(fitem.get("status") or "active"),
                _packed(fitem),
            ),
        )
        fashion_count += 1

    for pitem in state.get("photoSessions") or []:
        sid = str(pitem.get("sessionId") or "").strip()
        if not sid:
            continue
        conn.execute(
            """
            INSERT OR REPLACE INTO EntertainmentPhotoSessions (
                RunId, SessionId, StudioOrgId, SubjectArtistId, Title, CommissionKind,
                DeliverableAssetPath, Status, DayIndex, DataJson
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_id,
                sid,
                str(pitem.get("studioOrgId") or "ORG_ROSEMONT_PORTRAIT"),
                str(pitem.get("subjectArtistId") or ""),
                str(pitem.get("title") or sid),
                str(pitem.get("commissionKind") or "editorial"),
                str(pitem.get("deliverableAssetPath") or ""),
                str(pitem.get("status") or "scheduled"),
                int(pitem.get("dayIndex") or clock_day),
                _packed(pitem),
            ),
        )
        photo_count += 1
    counts["fashion"] = fashion_count
    counts["photography"] = photo_count

    # 7. Auditions & Applications
    auditions = state.get("auditions") or []
    app_count = 0
    for aud in auditions:
        aid = str(aud.get("auditionId") or "").strip()
        if not aid:
            continue
        selected_id = str(aud.get("selectedArtistId") or "")
        conn.execute(
            """
            INSERT OR REPLACE INTO EntertainmentAuditions (
                RunId, AuditionId, Title, OrgId, ProductionOrgId, Discipline,
                MinCredibility, StipendCredits, DeadlineDay, SelectedArtistId, Status, DataJson
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_id,
                aid,
                str(aud.get("title") or aid),
                str(aud.get("orgId") or ""),
                str(aud.get("productionOrgId") or ""),
                str(aud.get("discipline") or "acting"),
                float(aud.get("minCredibility") or 0.0),
                float(aud.get("stipendCredits") or 0.0),
                int(aud.get("deadlineDay") or aud.get("deadlineCycle") or 0),
                selected_id,
                str(aud.get("status") or "open"),
                _packed(aud),
            ),
        )
        for app in aud.get("applicants") or []:
            app_artist_id = str(app.get("artistId") or "").strip()
            if not app_artist_id:
                continue
            conn.execute(
                """
                INSERT OR REPLACE INTO EntertainmentAuditionApplications (
                    RunId, AuditionId, ArtistId, StageName, Score, SubmittedDay, Booked
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    run_id,
                    aid,
                    app_artist_id,
                    str(app.get("stageName") or ""),
                    float(app.get("score") or 0.0),
                    int(app.get("submittedDay") or app.get("submittedCycle") or 0),
                    1 if selected_id and selected_id == app_artist_id else 0,
                ),
            )
            app_count += 1
    counts["auditions"] = len(auditions)
    counts["audition_applications"] = app_count

    # 8b. Concerts + 5. Revenue Ledger (box office settlements)
    concerts = state.get("concerts") or []
    rev_count = 0
    for con in concerts:
        cid = str(con.get("concertId") or "").strip()
        if not cid:
            continue
        conn.execute(
            """
            INSERT OR REPLACE INTO EntertainmentConcerts (
                RunId, ConcertId, ArtistId, StageName, Title, VenueName, VenueOrgId,
                PromoterOrgId, ScheduledDay, Slot, TicketPrice, Capacity, RentalCost,
                TicketsSold, GrossRevenue, NetArtistPayout, ReviewScore, Status, DataJson
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_id,
                cid,
                str(con.get("artistId") or ""),
                str(con.get("stageName") or ""),
                str(con.get("title") or cid),
                str(con.get("venue") or ""),
                str(con.get("venueOrgId") or ""),
                str(con.get("promoterOrgId") or ""),
                int(con.get("scheduledDay") or con.get("scheduledCycle") or 0),
                str(con.get("slot") or "evening"),
                float(con.get("ticketPrice") or 18.0),
                int(con.get("capacity") or 180),
                float(con.get("rentalCost") or 65.0),
                int(con.get("ticketsSold") or 0),
                float(con.get("grossRevenue") or 0.0),
                float(con.get("netArtistPayout") or 0.0),
                float(con["reviewScore"]) if con.get("reviewScore") is not None else None,
                str(con.get("status") or "scheduled"),
                _packed(con),
            ),
        )
        if con.get("status") == "completed" and float(con.get("grossRevenue") or 0.0) > 0:
            conn.execute(
                """
                INSERT OR REPLACE INTO EntertainmentRevenueLedger (
                    RunId, EntryId, ArtistId, CharacterId, OrganizationId, SourceEntityId,
                    Kind, GrossAmount, NetAmount, DayIndex, Description, CreatedAt
                ) VALUES (?, ?, ?, '', ?, ?, 'box_office_settlement', ?, ?, ?, ?, ?)
                """,
                (
                    run_id,
                    f"boxoffice:{cid}",
                    str(con.get("artistId") or ""),
                    str(con.get("venueOrgId") or ""),
                    cid,
                    float(con.get("grossRevenue") or 0.0),
                    float(con.get("netArtistPayout") or 0.0),
                    int(con.get("scheduledDay") or con.get("scheduledCycle") or 0),
                    f"Box office settlement at {con.get('venue', '')} ({con.get('ticketsSold', 0)} tickets)",
                    now,
                ),
            )
            rev_count += 1
    counts["concerts"] = len(concerts)

    # Artist cumulative royalty summary lines in EntertainmentRevenueLedger
    for a in artists:
        aid = str(a.get("artistId") or "").strip()
        roy = float(a.get("totalRoyaltiesEarned") or 0.0)
        if aid and roy > 0:
            conn.execute(
                """
                INSERT OR REPLACE INTO EntertainmentRevenueLedger (
                    RunId, EntryId, ArtistId, CharacterId, OrganizationId, SourceEntityId,
                    Kind, GrossAmount, NetAmount, DayIndex, Description, CreatedAt
                ) VALUES (?, ?, ?, ?, ?, ?, 'royalty_statement', ?, ?, ?, ?, ?)
                """,
                (
                    run_id,
                    f"royalty:{aid}",
                    aid,
                    str(a.get("characterId") or ""),
                    str(a.get("publisherOrgId") or a.get("distributorOrgId") or "ORG_SONGBIRD"),
                    aid,
                    roy,
                    roy,
                    clock_day,
                    f"Cumulative streaming & radio royalty statement for {a.get('stageName', aid)}",
                    now,
                ),
            )
            rev_count += 1

    # 8c. Tickets
    tickets = state.get("tickets") or []
    for tkt in tickets:
        tid = str(tkt.get("ticketId") or "").strip()
        if not tid:
            continue
        conn.execute(
            """
            INSERT OR REPLACE INTO EntertainmentTickets (
                RunId, TicketId, ConcertId, BuyerCharacterId, BuyerName,
                Quantity, PricePaid, PurchasedDay, Attended, DataJson
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_id,
                tid,
                str(tkt.get("concertId") or ""),
                str(tkt.get("buyerCharacterId") or ""),
                str(tkt.get("buyerName") or ""),
                int(tkt.get("quantity") or 1),
                float(tkt.get("pricePaid") or 0.0),
                int(tkt.get("purchasedDay") or tkt.get("purchasedCycle") or 0),
                1 if tkt.get("attended") else 0,
                _packed(tkt),
            ),
        )
    counts["tickets"] = len(tickets)

    # 9a. Publicity Media Items
    media_items = state.get("media_items") or state.get("mediaItems") or []
    for m in media_items:
        mid = str(m.get("mediaId") or "").strip()
        if not mid:
            continue
        conn.execute(
            """
            INSERT OR REPLACE INTO EntertainmentMediaItems (
                RunId, MediaId, OrgId, Kind, Headline, Summary, Sentiment,
                DayIndex, SubjectArtistIdsJson, DataJson
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_id,
                mid,
                str(m.get("orgId") or ""),
                str(m.get("kind") or "feature"),
                str(m.get("headline") or mid),
                str(m.get("summary") or ""),
                str(m.get("sentiment") or "positive"),
                int(m.get("dayIndex") or m.get("cycle") or 0),
                _packed(m.get("subjectArtistIds") or []),
                _packed(m),
            ),
        )
    counts["media_items"] = len(media_items)

    # 9b. Publicity Campaigns / Sponsorships (+ revenue ledger line)
    sponsorships = state.get("sponsorships") or []
    for sp in sponsorships:
        sid = str(sp.get("sponsorshipId") or sp.get("campaignId") or "").strip()
        if not sid:
            continue
        fee = float(sp.get("feeCredits") or 0.0)
        sponsor_org = str(sp.get("sponsorOrgId") or "")
        conn.execute(
            """
            INSERT OR REPLACE INTO EntertainmentCampaigns (
                RunId, CampaignId, ArtistId, SponsorOrgId, CampaignTitle, Kind,
                FeeCredits, StartDay, Status, DataJson
            ) VALUES (?, ?, ?, ?, ?, 'sponsorship', ?, ?, ?, ?)
            """,
            (
                run_id,
                sid,
                str(sp.get("artistId") or ""),
                sponsor_org,
                str(sp.get("campaignTitle") or sid),
                fee,
                int(sp.get("startDay") or sp.get("startCycle") or 0),
                str(sp.get("status") or "active"),
                _packed(sp),
            ),
        )
        if fee > 0:
            conn.execute(
                """
                INSERT OR REPLACE INTO EntertainmentRevenueLedger (
                    RunId, EntryId, ArtistId, CharacterId, OrganizationId, SourceEntityId,
                    Kind, GrossAmount, NetAmount, DayIndex, Description, CreatedAt
                ) VALUES (?, ?, ?, '', ?, ?, 'sponsorship', ?, ?, ?, ?, ?)
                """,
                (
                    run_id,
                    f"sponsor:{sid}",
                    str(sp.get("artistId") or ""),
                    sponsor_org,
                    sid,
                    fee,
                    fee,
                    int(sp.get("startDay") or sp.get("startCycle") or 0),
                    f"Campaign sponsorship: {sp.get('campaignTitle', sid)}",
                    now,
                ),
            )
            rev_count += 1
    counts["campaigns"] = len(sponsorships)
    counts["revenue_entries"] = rev_count

    # 9c. Controversies
    controversies = state.get("controversies") or []
    for cv in controversies:
        cvid = str(cv.get("controversyId") or "").strip()
        if not cvid:
            continue
        conn.execute(
            """
            INSERT OR REPLACE INTO EntertainmentControversies (
                RunId, ControversyId, ArtistId, StageName, Headline, Severity,
                Status, PrOrgId, DayIndex, DataJson
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_id,
                cvid,
                str(cv.get("artistId") or ""),
                str(cv.get("stageName") or ""),
                str(cv.get("headline") or cv.get("topic") or cvid),
                str(cv.get("severity") or "moderate"),
                str(cv.get("status") or "open"),
                str(cv.get("prOrgId") or ""),
                int(cv.get("dayIndex") or cv.get("cycle") or 0),
                _packed(cv),
            ),
        )
    counts["controversies"] = len(controversies)

    # 12. Fandom Communities
    fans = state.get("fan_communities") or state.get("fanCommunities") or []
    for fc in fans:
        fcid = str(fc.get("communityId") or "").strip()
        if not fcid:
            continue
        members = fc.get("memberCharacterIds") or fc.get("memberIds") or []
        conn.execute(
            """
            INSERT OR REPLACE INTO EntertainmentFanCommunities (
                RunId, CommunityId, ArtistId, StageName, Name, MemberCount,
                LoyaltyScore, RecentActivity, MemberIdsJson
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_id,
                fcid,
                str(fc.get("artistId") or ""),
                str(fc.get("stageName") or ""),
                str(fc.get("name") or fcid),
                len(members),
                float(fc.get("loyaltyScore") or 25.0),
                str(fc.get("recentActivity") or ""),
                _packed(members),
            ),
        )
    counts["fan_communities"] = len(fans)

    # 13. Awards & Nominations
    awards = state.get("awards") or []
    nom_count = 0
    for aw in awards:
        awid = str(aw.get("awardCycleId") or "").strip()
        if not awid:
            continue
        conn.execute(
            """
            INSERT OR REPLACE INTO EntertainmentAwardCycles (
                RunId, AwardCycleId, Year, CeremonyDay, Status, DataJson
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                run_id,
                awid,
                int(aw.get("year") or 0),
                int(aw.get("ceremonyDay") or aw.get("ceremonyCycle") or 0),
                str(aw.get("status") or "open"),
                _packed(aw),
            ),
        )
        winner_keys = {
            (str(w.get("category") or ""), str(w.get("artistId") or ""))
            for w in (aw.get("winners") or [])
        }
        for nom in aw.get("nominees") or []:
            cat = str(nom.get("category") or "Radiance Honor")
            naid = str(nom.get("artistId") or "").strip()
            if not naid:
                continue
            conn.execute(
                """
                INSERT OR REPLACE INTO EntertainmentAwardNominations (
                    RunId, AwardCycleId, Category, ArtistId, StageName, WorkTitle, Score, IsWinner
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    run_id,
                    awid,
                    cat,
                    naid,
                    str(nom.get("stageName") or ""),
                    str(nom.get("workTitle") or ""),
                    float(nom.get("score") or 0.0),
                    1 if (cat, naid) in winner_keys else 0,
                ),
            )
            nom_count += 1
    counts["award_cycles"] = len(awards)
    counts["award_nominations"] = nom_count

    # 14. Professional Development / Training Records
    training_records = state.get("trainingRecords") or []
    train_count = 0
    for tr in training_records:
        trid = str(tr.get("trainingId") or "").strip()
        if not trid:
            continue
        conn.execute(
            """
            INSERT OR REPLACE INTO EntertainmentTrainingRecords (
                RunId, TrainingId, CharacterId, ArtistId, Discipline, ProgramTitle,
                ProviderOrgId, Xp, Level, CompletedWorks, Qualification, UpdatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                run_id,
                trid,
                str(tr.get("characterId") or ""),
                str(tr.get("artistId") or ""),
                str(tr.get("discipline") or "music"),
                str(tr.get("programTitle") or ""),
                str(tr.get("providerOrgId") or ""),
                int(tr.get("xp") or 0),
                int(tr.get("level") or 1),
                int(tr.get("completedWorks") or 0),
                str(tr.get("qualification") or ""),
                now,
            ),
        )
        train_count += 1
    # Also project artist discipline baselines so workforce skill progression is queryable
    for a in artists:
        aid = str(a.get("artistId") or "").strip()
        if not aid:
            continue
        for disc in a.get("disciplines") or []:
            trid = f"artist:{aid}:{disc}"
            cred = int(round(float(a.get("artisticCredibility") or 15.0)))
            conn.execute(
                """
                INSERT OR IGNORE INTO EntertainmentTrainingRecords (
                    RunId, TrainingId, CharacterId, ArtistId, Discipline, ProgramTitle,
                    ProviderOrgId, Xp, Level, CompletedWorks, Qualification, UpdatedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
                """,
                (
                    run_id,
                    trid,
                    str(a.get("characterId") or ""),
                    aid,
                    str(disc),
                    f"{str(disc).replace('_', ' ').title()} Craft Track",
                    str(a.get("managerOrgId") or "ORG_PERFORMERS_ASSOC"),
                    cred * 10,
                    max(1, cred // 15 + 1),
                    str(a.get("tier") or "Emerging Newcomer"),
                    now,
                ),
            )
            train_count += 1
    counts["training_records"] = train_count

    return counts
