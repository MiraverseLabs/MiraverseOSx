from __future__ import annotations

import copy
from typing import Any


CHARACTER_CLASSIFICATIONS: tuple[str, ...] = (
    "Ordinary citizen",
    "Significant NPC",
    "Royalty and officials",
    "Entertainment professional",
    "Investigation subject",
    "Historical character",
    "Companion",
    "Player character",
)

CLASSIFICATION_DESCRIPTIONS: dict[str, str] = {
    "Ordinary citizen": "Regular daily life",
    "Significant NPC": "Expanded individual behavior",
    "Royalty and officials": "Institutional and political responsibilities",
    "Entertainment professional": "Creative projects and industry activities",
    "Investigation subject": "Context-dependent participation",
    "Historical character": "Historical records only",
    "Companion": "Separate companion behavior",
    "Player character": "Primarily controlled by you",
}

SIMULATION_DEPTH_OPTIONS: tuple[str, ...] = (
    "Inactive",
    "Minimal",
    "Standard",
    "Expanded",
)

SCHEDULE_PRESETS: tuple[str, ...] = (
    "Standard Civic Routine",
    "Academic & Campus Schedule",
    "Institutional / Chancery Hours",
    "Creative & Nightlife Cycle",
    "Shift / Emergency Responder",
    "Low-Profile / Restricted",
    "Non-Participating Record",
)

BEHAVIOR_OVERRIDE_OPTIONS: tuple[str, ...] = (
    "Auto (Classification Default)",
    "Focus: Career & Institutional",
    "Focus: Creative & Entertainment",
    "Focus: Social & Community",
    "Focus: Rest & Recovery",
    "Pinned: Stationary / Record Only",
)

INVESTIGATION_COLLECTIONS: frozenset[str] = frozenset(
    {
        "DGA_26_194_STARTING_PAYLOAD",
        "INV_26_402_STARTING_PAYLOAD",
        "FORMAL_INVESTIGATION_CASES",
        "INITIAL_MEDICAL_CHART",
        "MOTORCYCLE_CRASH_MEDICAL_CHART",
        "OVERDOSE_TOXICOLOGY_MEDICAL_CHART",
        "PATIENT_CARE_ASSIGNMENTS",
    }
)

KNOWN_REALMS: tuple[str, ...] = (
    "Orynvell",
    "Fross",
    "Kaji",
    "Lumia",
    "Nephele",
    "Marlowe",
    "Brisland",
    "Ve’Raylia",
)

SOCIAL_ROLE_PHRASES: tuple[str, ...] = (
    "social circle",
    "friend group",
    "community",
    "peer",
)

HISTORICAL_ROLE_PHRASES: tuple[str, ...] = (
    "founder of",
    "former ",
    "late ",
    "emeritus",
    "ancestral",
)

ENTERTAINMENT_KEYWORDS: tuple[str, ...] = (
    "artistic director",
    "sound designer",
    "synthesizer",
    "music",
    "trends editor",
    "socialite",
    "cultural studio",
    "broadcast",
    "singer",
    "choreographer",
    "performer",
    "artist",
)

ROYALTY_OFFICIAL_KEYWORDS: tuple[str, ...] = (
    "monarch",
    "queen",
    "sovereign",
    "lord",
    "chancellor",
    "consul",
    "councilor",
    "ambassador",
    "envoy",
    "crown registrar",
    "deputy director",
    "chief auditor",
    "station chief",
    "executive director",
    "high warden",
    "high forge-master",
    "grand dispatcher",
)


def _clean_str(val: object) -> str:
    if val is None or isinstance(val, (dict, list, bool)):
        return ""
    text = str(val).strip()
    if text.lower() in ("", "unknown", "none", "null", "n/a"):
        return ""
    # Clean occasional mojibake bullet from seed text
    return text.replace("Â·", "·")


def _append_unique(target: list[str], value: str) -> None:
    cleaned = _clean_str(value)
    if not cleaned:
        return
    lower_existing = {item.lower() for item in target}
    if cleaned.lower() not in lower_existing:
        target.append(cleaned)


def _split_list_or_text(raw: object) -> list[str]:
    out: list[str] = []
    if isinstance(raw, list):
        for item in raw:
            if isinstance(item, str):
                _append_unique(out, item)
            elif isinstance(item, dict):
                label = item.get("name") or item.get("title") or item.get("label")
                if label:
                    _append_unique(out, str(label))
    elif isinstance(raw, str):
        for part in raw.replace("Â·", "·").split("·"):
            for sub in part.split(","):
                _append_unique(out, sub)
    return out


def _infer_realm_from_text(text: str) -> str:
    if not text:
        return ""
    lower = text.lower().replace("'", "’")
    for realm in KNOWN_REALMS:
        if realm.lower() in lower:
            return realm
    if "veraylia" in lower.replace("’", "") or "elmore" in lower:
        return "Ve’Raylia"
    if "aureline" in lower or "cyacademy" in lower or "meridion" in lower:
        return "Orynvell"
    if "northwake" in lower:
        return "Fross"
    return ""


def normalize_character_profile(
    character: dict[str, Any],
    staged_override: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """
    Context-aware profile normalizer across all 18 Miraverse profile collections.
    Uses explicit canonical miraverse.db identity columns (FirstName, LastName, Title,
    Occupation, HomeRealm) first before considering legacy profile fallbacks.
    Never interprets HomeRealm as BirthRealm / OriginRealm.
    """
    character_id = str(character.get("CharacterId") or "")
    canonical_name = _clean_str(character.get("Name")) or character_id
    canonical_maid = _clean_str(character.get("Maid"))
    canonical_first_name = _clean_str(character.get("FirstName"))
    canonical_last_name = _clean_str(character.get("LastName"))
    canonical_title = _clean_str(character.get("Title"))
    canonical_occupation = _clean_str(character.get("Occupation"))
    canonical_home_realm = _clean_str(character.get("HomeRealm"))
    canonical_kind = _clean_str(character.get("Kind")) or "person"
    canonical_status = _clean_str(character.get("Status")) or "existing"
    profiles: list[dict[str, Any]] = list(character.get("profiles") or [])

    collections_present = {str(p.get("collection", "")) for p in profiles}

    # 1. Identity & Background
    aliases: list[str] = []
    for db_al in character.get("db_aliases") or []:
        _append_unique(aliases, str(db_al))
    legacy_names: list[str] = []
    age: str = ""
    dob: str = ""
    species: str = ""
    biography_parts: list[str] = []
    emails: list[str] = []
    phones: list[str] = []
    maids: list[str] = []
    if canonical_maid:
        _append_unique(maids, canonical_maid)

    # 2. Geography & Residence — keep HomeRealm strictly separate from BirthRealm / OriginRealm
    home_realm: str = canonical_home_realm
    origin_realm: str = ""
    current_residence: str = ""
    workplace: str = ""

    # 3. Seven Distinct Role Facets — seed explicit canonical DB values first
    primary_occupation: str = canonical_occupation
    secondary_occupations: list[str] = []
    specializations: list[str] = []
    institutional_roles: list[str] = []
    social_affiliations: list[str] = []
    narrative_roles: list[str] = []
    historical_roles: list[str] = []

    # Additional Career / Institution / Title metadata
    professional_title: str = canonical_title
    qualifications: list[str] = []
    institutions: list[str] = []

    # 4. Personality & Interests
    traits: list[str] = []
    motivations: list[str] = []
    hobbies: list[str] = []
    preferences: list[str] = []

    # 5. Relationships
    relationships: list[str] = []

    # 6. Entertainment
    music_tastes: list[str] = []
    favorite_artists: list[str] = []
    creative_interests: list[str] = []

    # Status tracking for simulation eligibility
    statuses: list[tuple[str, str]] = []

    def add_occupation(val: str, prefer_primary: bool = False) -> None:
        nonlocal primary_occupation
        cleaned = _clean_str(val)
        if not cleaned:
            return
        if not primary_occupation:
            primary_occupation = cleaned
        elif prefer_primary and not canonical_occupation and primary_occupation.lower() != cleaned.lower():
            _append_unique(secondary_occupations, primary_occupation)
            primary_occupation = cleaned
        elif primary_occupation.lower() != cleaned.lower():
            _append_unique(secondary_occupations, cleaned)

    for prof in profiles:
        col = str(prof.get("collection") or "")
        data = prof.get("data")
        if not isinstance(data, dict):
            continue

        # Collect MAIDs across profiles for identity verification
        for mkey in ("maid", "fixedMaid", "patientMaid", "subjectMaid"):
            mval = _clean_str(data.get(mkey))
            if mval:
                _append_unique(maids, mval)

        # Legacy / Historical names & Aliases
        lname = _clean_str(data.get("legacyName"))
        if lname and lname.lower() != canonical_name.lower():
            # Short first-name-only persona tags are nicknames/aliases; full prior names are historical
            if " " not in lname and lname.lower() in canonical_name.lower():
                _append_unique(aliases, lname)
            else:
                _append_unique(legacy_names, lname)

        for al in _split_list_or_text(data.get("alias")):
            _append_unique(aliases, al)
        for al in _split_list_or_text(data.get("aliases")):
            _append_unique(aliases, al)
        callsign = _clean_str(data.get("callsign"))
        if callsign:
            _append_unique(aliases, f"Callsign {callsign}")
        handle = _clean_str(data.get("handle"))
        if handle:
            _append_unique(aliases, f"@{handle}")

        # Age / DOB / Species
        if not age and data.get("age") is not None:
            age = str(data.get("age")).strip()
        if not dob and _clean_str(data.get("dob")):
            dob = _clean_str(data.get("dob"))
        if not species and _clean_str(data.get("species")):
            species = _clean_str(data.get("species"))

        # Statuses
        st = _clean_str(data.get("status")) or _clean_str(data.get("clinicalStatus"))
        if st:
            statuses.append((col, st))

        # Collection-specific context-aware normalization
        if col == "NPCS":
            r_role = _clean_str(data.get("role"))
            r_title = _clean_str(data.get("title"))
            r_realm = _clean_str(data.get("realm"))
            r_aff = _clean_str(data.get("affiliation"))
            r_tone = _clean_str(data.get("dialogueTone"))
            if r_role:
                add_occupation(r_role, prefer_primary=True)
            if r_title:
                if not professional_title:
                    professional_title = r_title
                _append_unique(
                    institutional_roles,
                    f"{r_title} ({r_aff})" if r_aff else r_title,
                )
            if r_realm and not origin_realm:
                origin_realm = r_realm
            if r_aff:
                _append_unique(institutions, r_aff)
                if r_aff.lower().startswith("house "):
                    _append_unique(social_affiliations, r_aff)
            if r_tone:
                _append_unique(traits, r_tone)

        elif col == "defaultInputs":
            occ = _clean_str(data.get("occupation"))
            aff = _clean_str(data.get("affiliation"))
            fac = _clean_str(data.get("faction"))
            addr = _clean_str(data.get("address"))
            res = _clean_str(data.get("residency")) or _clean_str(data.get("home"))
            plc = _clean_str(data.get("place"))
            reg = _clean_str(data.get("registrationRegion"))
            abilities = _clean_str(data.get("abilities"))
            clr = _clean_str(data.get("clearance"))
            lore = _clean_str(data.get("lore"))
            hist = _clean_str(data.get("history"))
            story_mode = _clean_str(data.get("storyMode"))
            email = _clean_str(data.get("email"))
            phone = _clean_str(data.get("phone"))

            if occ:
                add_occupation(occ, prefer_primary=True)
            if aff:
                _append_unique(institutions, aff)
                if not workplace:
                    workplace = aff
            if fac:
                _append_unique(social_affiliations, fac)
            if addr:
                current_residence = addr
            elif res and not current_residence:
                current_residence = res
            if plc:
                inferred = _infer_realm_from_text(plc)
                if inferred and not origin_realm:
                    origin_realm = inferred
            if reg and not origin_realm:
                origin_realm = reg
            if not origin_realm:
                origin_realm = _infer_realm_from_text(addr or res)

            for ab in _split_list_or_text(abilities):
                _append_unique(specializations, ab)
            if clr:
                _append_unique(qualifications, clr)
            if lore:
                _append_unique(biography_parts, lore)
            if hist:
                _append_unique(biography_parts, hist)
            if story_mode:
                _append_unique(narrative_roles, story_mode)
            if email:
                _append_unique(emails, email)
            if phone:
                _append_unique(phones, phone)
            for rel_part in _split_list_or_text(data.get("relationships")):
                _append_unique(relationships, rel_part)

        elif col == "AUREMAIL_DIRECTORY":
            a_role = _clean_str(data.get("role"))
            a_inst = _clean_str(data.get("institution"))
            a_fac = _clean_str(data.get("faction"))
            a_addr = _clean_str(data.get("address"))
            a_desc = _clean_str(data.get("description"))

            if a_role:
                add_occupation(a_role, prefer_primary=not bool(primary_occupation))
                if a_inst:
                    _append_unique(institutional_roles, f"{a_role} — {a_inst}")
            if a_inst:
                _append_unique(institutions, a_inst)
                if not workplace:
                    workplace = a_inst
                if not origin_realm:
                    origin_realm = _infer_realm_from_text(a_inst)
            if a_fac:
                _append_unique(social_affiliations, a_fac)
            if a_addr and "@" in a_addr:
                _append_unique(emails, a_addr)
            if a_desc:
                _append_unique(biography_parts, a_desc)

        elif col == "INSTITUTIONAL_REGISTRY":
            i_title = _clean_str(data.get("title"))
            i_dept = _clean_str(data.get("department"))
            i_div = _clean_str(data.get("division"))
            i_spec = _clean_str(data.get("specialty"))
            i_pers = _clean_str(data.get("personality"))
            i_exp = _clean_str(data.get("expectations"))
            org_unit = i_dept or i_div

            if i_title:
                if not professional_title:
                    professional_title = i_title
                add_occupation(i_title)
                _append_unique(
                    institutional_roles,
                    f"{i_title} ({org_unit})" if org_unit else i_title,
                )
            if org_unit:
                _append_unique(institutions, org_unit)
                if not workplace:
                    workplace = org_unit
                if not origin_realm:
                    origin_realm = _infer_realm_from_text(org_unit)
            if i_spec:
                _append_unique(specializations, i_spec)
            if i_pers:
                _append_unique(traits, i_pers)
            if i_exp:
                _append_unique(motivations, i_exp)

        elif col == "personas":
            p_role = _clean_str(data.get("role"))
            p_tone = _clean_str(data.get("tone"))
            p_ctx = _clean_str(data.get("systemContext"))
            if p_role:
                # Persona roles often capture specializations or secondary creative identities
                if not primary_occupation:
                    add_occupation(p_role, prefer_primary=True)
                else:
                    _append_unique(specializations, p_role)
                    if any(k in p_role.lower() for k in ENTERTAINMENT_KEYWORDS):
                        _append_unique(creative_interests, p_role)
            if p_tone:
                for t in _split_list_or_text(p_tone):
                    _append_unique(traits, t)
            if p_ctx:
                _append_unique(biography_parts, p_ctx)

        elif col == "story-bible":
            sb_role = _clean_str(data.get("role"))
            if sb_role:
                low = sb_role.lower()
                if any(phrase in low for phrase in HISTORICAL_ROLE_PHRASES):
                    _append_unique(historical_roles, sb_role)
                elif any(phrase in low for phrase in SOCIAL_ROLE_PHRASES):
                    _append_unique(social_affiliations, sb_role)
                else:
                    _append_unique(narrative_roles, sb_role)

        elif col == "PEOPLE":
            p_bio = _clean_str(data.get("bio"))
            p_int = _clean_str(data.get("interests"))
            p_mood = _clean_str(data.get("mood"))
            if p_bio:
                _append_unique(biography_parts, p_bio)
            if p_int:
                for item in _split_list_or_text(p_int):
                    _append_unique(hobbies, item)
                    if any(
                        w in item.lower()
                        for w in ("music", "art", "melod", "synth", "dance", "fashion")
                    ):
                        _append_unique(creative_interests, item)
            if p_mood:
                _append_unique(traits, f"Disposition: {p_mood}")

        elif col == "primarySeedAgent":
            psa_title = _clean_str(data.get("title"))
            psa_div = _clean_str(data.get("division"))
            psa_station = _clean_str(data.get("station"))
            psa_clr = _clean_str(data.get("clearanceCode"))
            if psa_title:
                if not professional_title:
                    professional_title = psa_title
                _append_unique(
                    institutional_roles,
                    f"{psa_title} — {psa_div}" if psa_div else psa_title,
                )
            if psa_div:
                _append_unique(institutions, psa_div)
            if psa_station and not workplace:
                workplace = psa_station
            if psa_clr:
                _append_unique(qualifications, psa_clr)
            for sp in _split_list_or_text(data.get("specializations")):
                _append_unique(specializations, sp)

        elif col == "seedPeople":
            sp_role = _clean_str(data.get("role"))
            sp_aff = _clean_str(data.get("affiliation"))
            sp_bio = _clean_str(data.get("bio"))
            sp_clr = _clean_str(data.get("clearance"))
            if sp_role:
                add_occupation(sp_role)
            if sp_aff:
                _append_unique(institutions, sp_aff)
                if not workplace:
                    workplace = sp_aff
            if sp_bio:
                _append_unique(biography_parts, sp_bio)
            if sp_clr:
                _append_unique(qualifications, f"Clearance: {sp_clr}")

        elif col == "seedNPCs":
            sn_occ = _clean_str(data.get("occupation"))
            sn_org = _clean_str(data.get("organization"))
            sn_style = _clean_str(data.get("communicationStyle"))
            if sn_occ:
                add_occupation(sn_occ)
            if sn_org:
                _append_unique(institutions, sn_org)
                if not workplace:
                    workplace = sn_org
            if sn_style:
                _append_unique(traits, f"Style: {sn_style.replace('_', ' ')}")
            for concern in _split_list_or_text(data.get("currentConcerns")):
                _append_unique(motivations, concern)

        elif col in ("DGA_26_194_STARTING_PAYLOAD", "INV_26_402_STARTING_PAYLOAD"):
            inv_role = _clean_str(data.get("role"))
            inv_aff = _clean_str(data.get("affiliation"))
            inv_status = _clean_str(data.get("status"))
            case_tag = "DGA-26-194" if "194" in col else "INV-26-402"
            if inv_role:
                _append_unique(narrative_roles, f"{inv_role} ({case_tag})")
                # Only treat as occupation if character has no non-case occupation and role isn't purely victim/suspect
                low_r = inv_role.lower()
                if not primary_occupation and not any(
                    w in low_r for w in ("victim", "suspect", "unidentified", "pursuit")
                ):
                    add_occupation(inv_role)
                elif "victim /" in low_r:
                    # Preserve prior profession as historical if deceased
                    after_slash = inv_role.split("/", 1)[1].strip()
                    if after_slash:
                        if "deceased" in inv_status.lower():
                            _append_unique(historical_roles, after_slash)
                        elif not primary_occupation:
                            add_occupation(after_slash)
            if inv_aff:
                _append_unique(institutions, inv_aff)
                if not workplace:
                    workplace = inv_aff

        elif col == "FORMAL_INVESTIGATION_CASES":
            case_id = _clean_str(data.get("id"))
            case_title = _clean_str(data.get("title"))
            case_inst = _clean_str(data.get("institution"))
            anomaly = _clean_str(data.get("symptomOrAnomaly"))
            if case_title:
                label = (
                    f"Case Subject ({case_id}): {case_title}"
                    if case_id
                    else f"Case Subject: {case_title}"
                )
                _append_unique(narrative_roles, label)
            if case_inst:
                _append_unique(institutions, case_inst)
            if anomaly:
                _append_unique(biography_parts, anomaly)

        elif col == "PATIENT_CARE_ASSIGNMENTS":
            ward = _clean_str(data.get("ward"))
            vitals_txt = _clean_str(data.get("presentingVitals"))
            _append_unique(
                narrative_roles,
                f"Clinical Care Assignment ({ward})" if ward else "Clinical Care Subject",
            )
            if vitals_txt:
                _append_unique(biography_parts, vitals_txt)

        elif col in (
            "INITIAL_MEDICAL_CHART",
            "MOTORCYCLE_CRASH_MEDICAL_CHART",
            "OVERDOSE_TOXICOLOGY_MEDICAL_CHART",
        ):
            case_id = _clean_str(data.get("caseId"))
            c_status = _clean_str(data.get("clinicalStatus"))
            room = _clean_str(data.get("roomBay"))
            hpi = _clean_str(data.get("historyOfPresentIllness"))
            _append_unique(
                narrative_roles,
                f"Medical Chart {case_id} ({c_status or 'Patient'})".strip(),
            )
            if room and not current_residence:
                current_residence = f"Admitted: {room}"
            if hpi:
                _append_unique(biography_parts, hpi)

        elif col == "seedRelationships":
            rel_type = _clean_str(data.get("type")).replace("_", " ")
            target_name = _clean_str(data.get("targetName"))
            notes = _clean_str(data.get("notes"))
            if target_name:
                summary = f"{rel_type.title()}: {target_name}"
                if notes:
                    summary += f" ({notes})"
                _append_unique(relationships, summary)

    # Determine Character Classification & Default Simulation Eligibility (Section 5)
    classification, eligible_default, eligibility_reason = _classify_character(
        character_id=character_id,
        canonical_name=canonical_name,
        canonical_kind=canonical_kind,
        canonical_status=canonical_status,
        collections_present=collections_present,
        primary_occupation=primary_occupation,
        secondary_occupations=secondary_occupations,
        specializations=specializations,
        institutional_roles=institutional_roles,
        historical_roles=historical_roles,
        institutions=institutions,
        statuses=statuses,
    )

    sim_depth_default = _default_sim_depth(classification, eligible_default)
    schedule_default = _default_schedule(
        classification, eligible_default, primary_occupation, institutions
    )

    normalized: dict[str, Any] = {
        "character_id": character_id,
        "name": canonical_name,
        "first_name": canonical_first_name,
        "last_name": canonical_last_name,
        "kind": canonical_kind,
        "record_status": canonical_status,
        "aliases": aliases,
        "legacy_names": legacy_names,
        "maids": maids,
        "age": age,
        "dob": dob,
        "species": species or "Human / Unspecified",
        "biography": " ".join(biography_parts[:2]),
        "emails": emails,
        "phones": phones,
        # Geography & Residence (HomeRealm is strictly distinct from BirthRealm / OriginRealm)
        "home_realm": home_realm,
        "origin_realm": origin_realm,
        "current_residence": current_residence,
        "workplace": workplace,
        # 7 Role Facets (Section 2)
        "primary_occupation": primary_occupation,
        "secondary_occupations": secondary_occupations,
        "specializations": specializations,
        "institutional_roles": institutional_roles,
        "social_affiliations": social_affiliations,
        "narrative_roles": narrative_roles,
        "historical_roles": historical_roles,
        # Additional Career & Education
        "professional_title": professional_title,
        "qualifications": qualifications,
        "institutions": institutions,
        # Personality & Interests
        "traits": traits,
        "motivations": motivations,
        "hobbies": hobbies,
        "preferences": preferences,
        # Relationships
        "relationships": relationships,
        # Daily Life
        "schedule_preset": schedule_default,
        "habits": [],
        "obligations": [],
        # Entertainment Profile
        "music_tastes": music_tastes,
        "favorite_artists": favorite_artists,
        "creative_interests": creative_interests,
        "music_interest_override": None,
        # Simulation Settings & Eligibility (Section 5)
        "character_classification": classification,
        "eligible_for_living_sim": eligible_default,
        "eligibility_reason": eligibility_reason,
        "simulation_depth": sim_depth_default,
        "behavior_override": "Auto (Classification Default)",
        # Audit metadata
        "statuses": statuses,
        "has_authoritative_observatory_profile": False,
        "committed_at": "",
        "has_staged_override": False,
        "override_status": "",
        "override_notes": "",
        "override_updated_at": "",
    }

    # Layer authoritative OBSERVATORY_PROFILE committed inside miraverse.db first
    for prof in profiles:
        if str(prof.get("collection")) == "OBSERVATORY_PROFILE" and isinstance(
            prof.get("data"), dict
        ):
            obs_data = prof["data"]
            normalized = apply_override_dict(
                normalized,
                {
                    "data": obs_data,
                    "review_status": "authoritative",
                    "reviewer_notes": str(obs_data.get("reviewer_notes") or ""),
                    "updated_at": str(obs_data.get("committed_at") or ""),
                },
                is_staged=False,
            )

    # Layer temporary uncommitted staged override (if any) on top
    if staged_override and isinstance(staged_override.get("data"), dict):
        normalized = apply_override_dict(normalized, staged_override, is_staged=True)

    return normalized


def _classify_character(
    *,
    character_id: str,
    canonical_name: str,
    canonical_kind: str = "person",
    canonical_status: str = "existing",
    collections_present: set[str],
    primary_occupation: str,
    secondary_occupations: list[str],
    specializations: list[str],
    institutional_roles: list[str],
    historical_roles: list[str],
    institutions: list[str],
    statuses: list[tuple[str, str]],
) -> tuple[str, bool, str]:
    name_low = canonical_name.lower()
    if canonical_kind.lower() == "companion":
        return (
            "Companion",
            False,
            "Canonical companion record; handled separately from autonomous living citizens.",
        )
    if canonical_status.lower() == "document-only":
        return (
            "Historical character",
            False,
            "Document-only character record; preserved as reference lore and excluded from living citizen loop.",
        )
    combined_roles = " ".join(
        [primary_occupation]
        + secondary_occupations
        + specializations
        + institutional_roles
        + institutions
    ).lower()
    status_texts = " | ".join(st.lower() for _, st in statuses)

    # 1. Player Character
    if "primarySeedAgent" in collections_present:
        return (
            "Player character",
            False,
            "Primary player-controlled protagonist (primarySeedAgent); excluded from autonomous citizen loop by default.",
        )

    # 2. Historical Character
    if historical_roles and not primary_occupation:
        return (
            "Historical character",
            False,
            "Historical lore figure; preserved as archival record only.",
        )

    # 3. Deceased / Unidentified / Acute ICU Investigation & Medical Subjects
    is_unidentified = "unidentified" in name_low or "jane doe" in name_low or "john doe" in name_low
    is_deceased = "deceased" in status_texts
    is_incapacitated = any(
        term in status_texts
        for term in ("comatose", "critical icu", "fugitive / active search")
    )

    if is_deceased:
        return (
            "Investigation subject",
            False,
            "Deceased investigation subject; excluded from living daily activities.",
        )
    if is_unidentified:
        return (
            "Investigation subject",
            False,
            "Unidentified case/medical subject; excluded from ordinary public activities.",
        )
    if is_incapacitated:
        return (
            "Investigation subject",
            False,
            "Incapacitated ICU or fugitive case subject; context-restricted from routine public simulation.",
        )

    # Active investigation subjects (only present in case/medical payloads or under active surveillance)
    non_case_collections = collections_present - INVESTIGATION_COLLECTIONS - {"seedRelationships"}
    if collections_present & INVESTIGATION_COLLECTIONS and (
        not non_case_collections or "surveillance" in status_texts or "person of interest" in status_texts
    ):
        return (
            "Investigation subject",
            True,
            "Active case-linked subject; participates with context-aware low-profile behavior.",
        )

    # 4. Royalty and Officials
    if any(kw in name_low or kw in combined_roles for kw in ROYALTY_OFFICIAL_KEYWORDS):
        return (
            "Royalty and officials",
            True,
            "Sovereign, diplomatic, or senior directorate official with institutional duties.",
        )

    # 5. Entertainment Professional
    if any(kw in combined_roles for kw in ENTERTAINMENT_KEYWORDS):
        return (
            "Entertainment professional",
            True,
            "Creative, broadcast, or cultural arts figure participating in entertainment activities.",
        )

    # 6. Significant NPC (multi-collection core cast or bespoke personas/NPCS)
    if collections_present & {"NPCS", "personas"} or len(collections_present) >= 3:
        return (
            "Significant NPC",
            True,
            "Named story/world NPC with expanded multi-faceted profile.",
        )

    # 7. Unprofiled placeholder check
    if not collections_present:
        return (
            "Historical character",
            False,
            "Unprofiled character stub (0 source profiles); held inactive until profile details are authored.",
        )

    # 8. Ordinary Citizen
    return (
        "Ordinary citizen",
        True,
        "Living Miraverse resident participating in standard daily routines.",
    )


def _default_sim_depth(classification: str, eligible: bool) -> str:
    if not eligible:
        return "Inactive"
    if classification in (
        "Significant NPC",
        "Royalty and officials",
        "Entertainment professional",
        "Companion",
    ):
        return "Expanded"
    if classification == "Investigation subject":
        return "Minimal"
    return "Standard"


def _default_schedule(
    classification: str,
    eligible: bool,
    primary_occupation: str,
    institutions: list[str],
) -> str:
    if not eligible:
        return "Non-Participating Record"
    joined = f"{primary_occupation} {' '.join(institutions)}".lower()
    if classification == "Royalty and officials":
        return "Institutional / Chancery Hours"
    if classification == "Entertainment professional":
        return "Creative & Nightlife Cycle"
    if classification == "Investigation subject":
        return "Low-Profile / Restricted"
    if "cyacademy" in joined or "student" in joined or "academic" in joined:
        return "Academic & Campus Schedule"
    if any(w in joined for w in ("medical", "hospital", "triage", "patrol", "tactical")):
        return "Shift / Emergency Responder"
    return "Standard Civic Routine"


def apply_override_dict(
    base_normalized: dict[str, Any],
    override_record: dict[str, Any],
    *,
    is_staged: bool = True,
) -> dict[str, Any]:
    """Merge authoritative OBSERVATORY_PROFILE or staged Population Editor fields onto a normalized profile dictionary."""
    merged = copy.deepcopy(base_normalized)
    data = override_record.get("data") or {}

    scalar_keys = (
        "name",
        "first_name",
        "last_name",
        "age",
        "dob",
        "species",
        "biography",
        "home_realm",
        "origin_realm",
        "current_residence",
        "workplace",
        "primary_occupation",
        "professional_title",
        "schedule_preset",
        "character_classification",
        "simulation_depth",
        "behavior_override",
    )
    list_keys = (
        "aliases",
        "legacy_names",
        "secondary_occupations",
        "specializations",
        "institutional_roles",
        "social_affiliations",
        "narrative_roles",
        "historical_roles",
        "qualifications",
        "institutions",
        "traits",
        "motivations",
        "hobbies",
        "preferences",
        "relationships",
        "habits",
        "obligations",
        "music_tastes",
        "favorite_artists",
        "creative_interests",
    )

    for skey in scalar_keys:
        if skey in data and data[skey] is not None:
            merged[skey] = str(data[skey]).strip()

    for lkey in list_keys:
        if lkey in data and isinstance(data[lkey], list):
            merged[lkey] = [str(x).strip() for x in data[lkey] if str(x).strip()]

    if "eligible_for_living_sim" in data and isinstance(
        data["eligible_for_living_sim"], bool
    ):
        merged["eligible_for_living_sim"] = data["eligible_for_living_sim"]
        merged["eligibility_reason"] = (
            "Configured via temporary staged Population Editor override."
            if is_staged
            else "Authoritative simulation eligibility committed in miraverse.db."
        )

    if "music_interest_override" in data and data["music_interest_override"] is not None:
        try:
            merged["music_interest_override"] = max(
                0.0, min(1.0, float(data["music_interest_override"]))
            )
        except (TypeError, ValueError):
            pass

    if is_staged:
        merged["has_staged_override"] = True
        merged["override_status"] = str(override_record.get("review_status") or "draft")
        merged["override_notes"] = str(override_record.get("reviewer_notes") or "")
        merged["override_updated_at"] = str(override_record.get("updated_at") or "")
    else:
        merged["has_authoritative_observatory_profile"] = True
        merged["committed_at"] = str(override_record.get("updated_at") or "")
        merged["has_staged_override"] = False
        merged["override_status"] = ""
        merged["override_notes"] = str(override_record.get("reviewer_notes") or "")
        merged["override_updated_at"] = ""
    return merged
