from __future__ import annotations

import html
from collections import Counter, defaultdict
from typing import Callable

import solara
from mesa.visualization.utils import update_counter


CORE_FIELDS: tuple[str, ...] = ("role", "title", "realm", "affiliation")

# 7 Meaningful Integrity Classifications (ordered from highest review priority to informational)
ISSUE_CLASSIFICATIONS: tuple[str, ...] = (
    "Identity conflict",
    "Potential contradiction",
    "Missing information",
    "Contextual variation",
    "Complementary information",
    "Historical information",
    "Not applicable",
)

ACTIONABLE_CLASSIFICATIONS: frozenset[str] = frozenset(
    {
        "Identity conflict",
        "Potential contradiction",
        "Missing information",
    }
)

CLASSIFICATION_META: dict[str, dict[str, str]] = {
    "Identity conflict": {
        "icon": "⛔",
        "badge_cls": "obs-badge-alert",
        "summary": "Two distinct identities or incompatible core records potentially sharing an ID",
    },
    "Potential contradiction": {
        "icon": "▲",
        "badge_cls": "obs-badge-warn",
        "summary": "Incompatible simultaneous statuses, dates, or primary employers requiring review",
    },
    "Missing information": {
        "icon": "○",
        "badge_cls": "obs-badge-warn",
        "summary": "Actionable lore gaps (unprofiled stubs or missing residence/realm for living citizens)",
    },
    "Contextual variation": {
        "icon": "◈",
        "badge_cls": "obs-badge-lavender",
        "summary": "Valid professional, persona, social, or case role differences across contexts",
    },
    "Complementary information": {
        "icon": "✦",
        "badge_cls": "obs-badge-blue",
        "summary": "Additive skills, specializations, or email vs. physical residence across collections",
    },
    "Historical information": {
        "icon": "⏳",
        "badge_cls": "obs-badge-neutral",
        "summary": "Preserved maiden/legacy names, prior titles, or foundational lore roles",
    },
    "Not applicable": {
        "icon": "—",
        "badge_cls": "obs-badge-ok",
        "summary": "Optional attributes (such as formal honorific titles) not expected for this character type",
    },
}

TITLE_EXPECTED_CLASSIFICATIONS: frozenset[str] = frozenset(
    {"Royalty and officials"}
)


def is_missing(value: object) -> bool:
    """Return True when a character attribute is unset or placeholder."""
    if value is None:
        return True
    return str(value).strip().lower() in ("", "unknown", "none", "null")


def analyze_citizen_integrity(
    citizen,
    shared_base_names: dict[str, list[str]] | None = None,
) -> dict:
    """
    Context-aware, non-destructive audit classifying observations into the 7
    meaningful integrity categories so valid lore is never mistaken for an error.
    """
    norm = getattr(citizen, "normalized", {}) or {}
    cid = str(citizen.character_id)
    cname = str(citizen.name or cid)
    profiles = list(citizen.profiles)
    profile_count = len(profiles)
    char_cls = norm.get("character_classification", "Ordinary citizen")
    eligible = bool(norm.get("eligible_for_living_sim", True))

    findings: list[dict] = []

    # 1. Check Identity Conflicts
    maids = norm.get("maids", [])
    if len(maids) > 1:
        findings.append(
            {
                "classification": "Identity conflict",
                "field": "MAID Identifier",
                "detail": f"Multiple distinct MAID identifiers attached to {cid}: {', '.join(maids)}.",
                "entries": [("Normalized MAIDs", "", m) for m in maids],
            }
        )

    # Detect multi-record persona/employer/status collision suggesting merged character IDs
    statuses = norm.get("statuses", [])
    status_vals_low = [st.lower() for _, st in statuses]
    has_deceased = any("deceased" in s for s in status_vals_low)
    has_active = any(
        s in ("active", "active / monitored", "active / verified")
        for s in status_vals_low
    )

    raw_employers = []
    for p in profiles:
        col = str(p.get("collection", ""))
        d = p.get("data", {})
        if isinstance(d, dict) and col in (
            "seedPeople",
            "defaultInputs",
            "INV_26_402_STARTING_PAYLOAD",
            "DGA_26_194_STARTING_PAYLOAD",
        ):
            aff = str(d.get("affiliation") or "").strip()
            if aff:
                raw_employers.append((col, aff))

    distinct_employers = {emp for _, emp in raw_employers}
    if has_deceased and has_active and len(distinct_employers) >= 3:
        findings.append(
            {
                "classification": "Identity conflict",
                "field": "Cross-Collection Persona / Timeline Collision",
                "detail": (
                    "Record combines an active SCADA engineer (Cygnus Dynamics), a monitored Shadowborn "
                    "Aether-Courier (Old Factory Ward), and a deceased propulsion architect (Apex Dynamics). "
                    "Verify whether two subjects share one ID or represent a staged cover identity."
                ),
                "entries": [(col, "status/affiliation", f"{st}") for col, st in statuses]
                + [(col, "affiliation", emp) for col, emp in raw_employers],
            }
        )

    if has_deceased and has_active:
        findings.append(
            {
                "classification": "Potential contradiction",
                "field": "Vital / Operational Status",
                "detail": "Conflicting simultaneous active and deceased statuses across profile collections.",
                "entries": [(col, "status", st) for col, st in statuses],
            }
        )

    # Check shared base names across distinct character IDs (informational / disambiguation check)
    if shared_base_names:
        base_clean = cname.split("(")[0].replace("Courier ", "").strip().lower()
        peers = [p for p in shared_base_names.get(base_clean, []) if p != cid]
        if peers and "no relation" not in cname.lower():
            findings.append(
                {
                    "classification": "Identity conflict",
                    "field": "Shared Canonical Name Disambiguation",
                    "detail": (
                        f"Shares base name '{cname}' with {', '.join(peers)}; "
                        "confirm profiles are routed to the intended CharacterId."
                    ),
                    "entries": [("Characters", "peer_id", p) for p in peers],
                }
            )

    # 2. Inspect cross-profile raw field variations with context awareness
    by_key: dict[str, list[tuple[str, str, str]]] = defaultdict(list)
    for p in profiles:
        col = str(p.get("collection", ""))
        ctx = str(p.get("context", ""))
        d = p.get("data", {})
        if not isinstance(d, dict):
            continue
        for k, v in d.items():
            if v is None or isinstance(v, (dict, list)):
                continue
            txt = str(v).strip()
            if txt:
                by_key[k].append((col, ctx, txt))

    # Role / Occupation multi-source check
    role_entries = by_key.get("role", []) + [
        (col, f"{ctx} [occupation]", val)
        for col, ctx, val in by_key.get("occupation", [])
    ]
    if len({val.lower() for _, _, val in role_entries}) > 1:
        # Check if any role is historical ("Founder of...")
        if norm.get("historical_roles") and not has_deceased:
            findings.append(
                {
                    "classification": "Historical information",
                    "field": "Historical vs. Current Role",
                    "detail": (
                        f"Preserves foundational/historical role ({', '.join(norm['historical_roles'])}) "
                        f"alongside current role ({norm.get('primary_occupation') or 'active'})."
                    ),
                    "entries": role_entries,
                }
            )
        else:
            facets_populated = [
                label
                for label, key in (
                    ("Primary occupation", "primary_occupation"),
                    ("Secondary occupations", "secondary_occupations"),
                    ("Specializations", "specializations"),
                    ("Social affiliations", "social_affiliations"),
                    ("Narrative roles", "narrative_roles"),
                )
                if norm.get(key)
            ]
            findings.append(
                {
                    "classification": "Contextual variation",
                    "field": "Multi-Faceted Roles",
                    "detail": (
                        f"Distinguished into {', '.join(facets_populated)} rather than discarding "
                        "context-specific roles."
                    ),
                    "entries": role_entries,
                }
            )

    # Address check: email in AUREMAIL_DIRECTORY vs street residence in defaultInputs
    addr_entries = by_key.get("address", [])
    if len({val.lower() for _, _, val in addr_entries}) > 1:
        has_email = any("@" in val for _, _, val in addr_entries)
        has_street = any("@" not in val for _, _, val in addr_entries)
        if has_email and has_street:
            findings.append(
                {
                    "classification": "Complementary information",
                    "field": "Contact Email & Street Residence",
                    "detail": "AUREMAIL_DIRECTORY stores electronic mail while defaultInputs stores physical street residence.",
                    "entries": addr_entries,
                }
            )
        else:
            findings.append(
                {
                    "classification": "Potential contradiction",
                    "field": "Established Residence",
                    "detail": "Multiple distinct physical addresses recorded across profiles.",
                    "entries": addr_entries,
                }
            )

    # Complementary specializations / skills
    if norm.get("specializations") and norm.get("primary_occupation"):
        spec_preview = "; ".join(norm["specializations"][:2])
        findings.append(
            {
                "classification": "Complementary information",
                "field": "Specializations & Skills",
                "detail": f"Supplements primary occupation ({norm['primary_occupation']}) with expertise: {spec_preview}.",
                "entries": [
                    ("Normalized", "primary_occupation", norm["primary_occupation"]),
                    ("Normalized", "specializations", spec_preview),
                ],
            }
        )

    # Status contextual variation (non-deceased, e.g. Active vs Cooperating Medical Staff, Hospitalized vs Hospitalized (Comatose))
    if not (has_deceased and has_active) and len({st.lower() for _, st in statuses}) > 1:
        findings.append(
            {
                "classification": "Contextual variation",
                "field": "Operational vs. Case Status",
                "detail": "Status reflects general standing in one registry and case-specific posture in an investigation payload.",
                "entries": [(col, "status", st) for col, st in statuses],
            }
        )

    # Institution / Faction / Affiliation variations (when not already flagged as 3-way identity collision)
    aff_entries = (
        by_key.get("affiliation", [])
        + by_key.get("institution", [])
        + by_key.get("faction", [])
    )
    if not (has_deceased and has_active) and len({v.lower() for _, _, v in aff_entries}) > 1:
        findings.append(
            {
                "classification": "Complementary information",
                "field": "Institutional & Social Affiliations",
                "detail": "Records parent organization, sub-division, or civic network across separate directories.",
                "entries": aff_entries,
            }
        )

    # Historical / Legacy Names
    if norm.get("legacy_names"):
        findings.append(
            {
                "classification": "Historical information",
                "field": "Legacy / Previous Name",
                "detail": f"Preserves prior or full legal name(s): {', '.join(norm['legacy_names'])}.",
                "entries": [
                    (col, ctx, val)
                    for col, ctx, val in by_key.get("legacyName", [])
                ]
                or [("Normalized", "legacy_names", ", ".join(norm["legacy_names"]))],
            }
        )

    # 3. Missing Information vs. Not Applicable
    missing_fields: list[str] = []
    not_applicable_fields: list[str] = []

    if profile_count == 0 and not norm.get("has_staged_override"):
        missing_fields.extend(["source_profiles", "occupation", "realm", "residence"])
        findings.append(
            {
                "classification": "Missing information",
                "field": "Unprofiled Character Record",
                "detail": "Character exists in Characters table with 0 attached CharacterProfiles records.",
                "entries": [("Characters", "CharacterId", cid)],
            }
        )
    else:
        has_any_role = bool(
            norm.get("primary_occupation")
            or norm.get("institutional_roles")
            or norm.get("narrative_roles")
            or norm.get("social_affiliations")
        )
        if not has_any_role:
            missing_fields.append("occupation")
            findings.append(
                {
                    "classification": "Missing information",
                    "field": "Occupation / Role",
                    "detail": "No occupation, institutional position, or social/narrative role mapped yet.",
                    "entries": [],
                }
            )

        # Realm & Residence check (actionable for living participating citizens)
        has_geo = bool(norm.get("origin_realm") or norm.get("current_residence"))
        if not has_geo and eligible:
            missing_fields.append("geography")
            findings.append(
                {
                    "classification": "Missing information",
                    "field": "Origin Realm & Residence",
                    "detail": "Living citizen has neither an origin realm nor a known current residence.",
                    "entries": [],
                }
            )
        elif not has_geo and not eligible:
            not_applicable_fields.append("residence")
            findings.append(
                {
                    "classification": "Not applicable",
                    "field": "Civic Residence",
                    "detail": f"Residence optional for non-participating {char_cls.lower()} record.",
                    "entries": [],
                }
            )

        # Formal Professional Title check: only expected on Royalty and Officials
        if not norm.get("professional_title"):
            if char_cls in TITLE_EXPECTED_CLASSIFICATIONS:
                missing_fields.append("professional_title")
                findings.append(
                    {
                        "classification": "Missing information",
                        "field": "Official / Sovereign Title",
                        "detail": "Royalty/official classification typically carries a formal title.",
                        "entries": [],
                    }
                )
            else:
                not_applicable_fields.append("professional_title")
                findings.append(
                    {
                        "classification": "Not applicable",
                        "field": "Formal Honorific / Title",
                        "detail": f"{char_cls} does not require a formal honorific or executive title.",
                        "entries": [],
                    }
                )

        # Institutional affiliation check: optional for students, ordinary citizens, unidentified subjects
        if not norm.get("institutions") and not norm.get("social_affiliations"):
            if char_cls in ("Royalty and officials", "Significant NPC"):
                missing_fields.append("affiliation")
                findings.append(
                    {
                        "classification": "Missing information",
                        "field": "Affiliation",
                        "detail": "No institutional or social affiliation recorded.",
                        "entries": [],
                    }
                )
            else:
                not_applicable_fields.append("affiliation")

    classifications_present = {f["classification"] for f in findings}
    actionable_findings = [
        f for f in findings if f["classification"] in ACTIONABLE_CLASSIFICATIONS
    ]
    contextual_findings = [
        f for f in findings if f["classification"] not in ACTIONABLE_CLASSIFICATIONS
    ]

    return {
        "citizen": citizen,
        "character_id": cid,
        "name": cname,
        "profile_count": profile_count,
        "classification": char_cls,
        "eligible": eligible,
        "has_staged_override": bool(norm.get("has_staged_override")),
        "findings": findings,
        "actionable_findings": actionable_findings,
        "contextual_findings": contextual_findings,
        "classifications_present": classifications_present,
        "missing_fields": missing_fields,
        "not_applicable_fields": not_applicable_fields,
        "needs_review": len(actionable_findings) > 0,
        # Backward compatibility keys
        "semantic_conflicts": [
            f
            for f in findings
            if f["classification"] in ("Identity conflict", "Potential contradiction")
        ],
    }


def analyze_population_integrity(agents) -> dict:
    """Perform a context-aware, non-destructive audit across all 66 canonical records."""
    sorted_citizens = sorted(
        list(agents),
        key=lambda a: (str(getattr(a, "name", "") or "").lower(), str(a.character_id)),
    )

    shared_base_names: dict[str, list[str]] = defaultdict(list)
    for c in sorted_citizens:
        base = (
            str(getattr(c, "name", "") or "")
            .split("(")[0]
            .replace("Courier ", "")
            .strip()
            .lower()
        )
        if base:
            shared_base_names[base].append(str(c.character_id))

    reports = [
        analyze_citizen_integrity(c, shared_base_names=shared_base_names)
        for c in sorted_citizens
    ]
    total = len(reports)

    classification_counts = Counter()
    citizens_per_classification = Counter()
    for rep in reports:
        for f in rep["findings"]:
            classification_counts[f["classification"]] += 1
        for cls_name in rep["classifications_present"]:
            citizens_per_classification[cls_name] += 1

    # Normalized coverage metrics (comparing context-aware normalization vs raw fields)
    with_profiles = sum(1 for r in reports if r["profile_count"] > 0)
    with_any_role = sum(
        1
        for c in sorted_citizens
        if c.normalized.get("primary_occupation")
        or c.normalized.get("institutional_roles")
        or c.normalized.get("narrative_roles")
        or c.normalized.get("social_affiliations")
    )
    with_affiliation = sum(
        1
        for c in sorted_citizens
        if c.normalized.get("institutions") or c.normalized.get("social_affiliations")
    )
    with_geography = sum(
        1
        for c in sorted_citizens
        if c.normalized.get("origin_realm") or c.normalized.get("current_residence")
    )
    actionable_citizens = sum(1 for r in reports if r["needs_review"])
    contradiction_or_id_citizens = sum(
        1
        for r in reports
        if (
            "Identity conflict" in r["classifications_present"]
            or "Potential contradiction" in r["classifications_present"]
        )
    )

    return {
        "total": total,
        "reports": reports,
        "classification_counts": dict(classification_counts),
        "citizens_per_classification": dict(citizens_per_classification),
        "with_profiles": with_profiles,
        "zero_profile_count": total - with_profiles,
        "with_any_role": with_any_role,
        "with_affiliation": with_affiliation,
        "with_geography": with_geography,
        "actionable_citizens": actionable_citizens,
        "contradiction_or_id_citizens": contradiction_or_id_citizens,
        # Backward-compat summary alias used by nav badge
        "semantic_conflict_citizens": contradiction_or_id_citizens,
    }


def _render_coverage_html(audit: dict) -> str:
    total = max(1, audit["total"])
    rows = [
        (
            "Source Profiles Attached",
            audit["with_profiles"],
            "Characters linked to ≥1 CharacterProfiles record",
        ),
        (
            "Normalized Role / Occupation",
            audit["with_any_role"],
            "Mapped across occupation, role, title, persona, or narrative case role",
        ),
        (
            "Institutional or Social Affiliation",
            audit["with_affiliation"],
            "Mapped across affiliation, institution, department, division, or faction",
        ),
        (
            "Origin Realm or Civic Residence",
            audit["with_geography"],
            "Mapped across realm, registrationRegion, home, place, or street address",
        ),
    ]

    parts = ['<div class="obs-coverage-list">']
    for label, count, hint in rows:
        pct = (count / total) * 100.0
        parts.append(
            f'<div class="obs-coverage-row">'
            f'  <div class="obs-coverage-meta">'
            f'    <div><span class="obs-coverage-label">{html.escape(label)}</span> '
            f'    <span class="obs-muted">— {html.escape(hint)}</span></div>'
            f'    <span class="obs-coverage-stats"><strong>{count}/{audit["total"]}</strong> ({pct:.0f}%)</span>'
            f"  </div>"
            f'  <div class="obs-meter-track" role="progressbar" '
            f'       aria-valuenow="{pct:.0f}" aria-valuemin="0" aria-valuemax="100" '
            f'       aria-label="{html.escape(label)}">'
            f'    <div class="obs-meter-fill obs-meter-lavender" style="width: {pct:.1f}%;"></div>'
            f"  </div>"
            f"</div>"
        )
    parts.append("</div>")
    return "".join(parts)


@solara.component
def DataIntegrity(
    model,
    on_inspect_citizen: Callable[[str], None] | None = None,
    on_edit_citizen: Callable[[str], None] | None = None,
    revision: int = 0,
):
    """Context-aware Data Integrity audit distinguishing genuine conflicts from complementary lore."""
    search, set_search = solara.use_state("")
    selected_class, set_selected_class = solara.use_state("Actionable Review Needed")
    elig_filter, set_elig_filter = solara.use_state("All Records")
    page_state, set_page_state = solara.use_state((0, None))
    page_size = 10

    audit = solara.use_memo(
        lambda: analyze_population_integrity(model.agents),
        [model, revision],
    )
    query = search.strip().lower()

    filter_options = [
        "Actionable Review Needed",
        "Identity conflict",
        "Potential contradiction",
        "Missing information",
        "Contextual variation",
        "Complementary information",
        "Historical information",
        "Not applicable",
        "All 66 Citizens",
    ]
    elig_options = [
        "All Records",
        "Living Population Only",
        "Excluded / Non-Participating",
    ]

    filtered_reports = []
    for rep in audit["reports"]:
        if query:
            haystack = (
                f"{rep['name']} {rep['character_id']} {rep['classification']} "
                + " ".join(f["field"] + " " + f["detail"] for f in rep["findings"])
            ).lower()
            if query not in haystack:
                continue

        if elig_filter == "Living Population Only" and not rep["eligible"]:
            continue
        if elig_filter == "Excluded / Non-Participating" and rep["eligible"]:
            continue

        if selected_class == "Actionable Review Needed":
            if not rep["needs_review"]:
                continue
        elif selected_class != "All 66 Citizens":
            if selected_class not in rep["classifications_present"]:
                continue

        filtered_reports.append(rep)

    def reset_filters():
        set_search("")
        set_selected_class("Actionable Review Needed")
        set_elig_filter("All Records")

    has_custom = (
        bool(query)
        or selected_class != "Actionable Review Needed"
        or elig_filter != "All Records"
    )

    with solara.Div(classes=["obs-page"]):
        # Header
        solara.HTML(
            tag="div",
            unsafe_innerHTML=(
                '<div class="obs-page-header">'
                "  <div>"
                '    <h1 class="obs-page-title">Data Integrity &amp; Context-Aware Profile Audit</h1>'
                '    <p class="obs-page-subtitle">'
                "      Separates genuine identity conflicts and contradictions from valid occupational, narrative, historical, and non-applicable variations."
                "    </p>"
                "  </div>"
                '  <div class="obs-readonly-pill">'
                "    <span aria-hidden='true'>🔒</span>"
                "    <span>miraverse.db Read-Only · Lore preserved</span>"
                "  </div>"
                "</div>"
            ),
        )

        # Top KPI Summary
        id_cnt = audit["citizens_per_classification"].get("Identity conflict", 0)
        contra_cnt = audit["citizens_per_classification"].get("Potential contradiction", 0)
        ctx_cnt = audit["citizens_per_classification"].get("Contextual variation", 0)
        comp_cnt = audit["citizens_per_classification"].get("Complementary information", 0)
        na_cnt = audit["citizens_per_classification"].get("Not applicable", 0)

        solara.HTML(
            tag="div",
            unsafe_innerHTML=(
                '<div class="obs-kpi-grid">'
                '  <div class="obs-surface-card obs-kpi-card">'
                '    <div class="obs-kpi-label">Identity &amp; Contradictions</div>'
                f'    <div class="obs-kpi-value">{audit["contradiction_or_id_citizens"]}'
                '      <span class="obs-kpi-unit">citizens</span></div>'
                f'    <div class="obs-kpi-foot">{id_cnt} identity collision risk · {contra_cnt} status/address contradictions</div>'
                "  </div>"
                '  <div class="obs-surface-card obs-kpi-card obs-kpi-blue">'
                '    <div class="obs-kpi-label">Contextual &amp; Complementary</div>'
                f'    <div class="obs-kpi-value">{ctx_cnt + comp_cnt}'
                '      <span class="obs-kpi-unit">preserved</span></div>'
                f'    <div class="obs-kpi-foot">{ctx_cnt} multi-role variations · {comp_cnt} additive profile records</div>'
                "  </div>"
                '  <div class="obs-surface-card obs-kpi-card">'
                '    <div class="obs-kpi-label">Actionable Missing Info</div>'
                f'    <div class="obs-kpi-value">{audit["citizens_per_classification"].get("Missing information", 0)}'
                '      <span class="obs-kpi-unit">citizens</span></div>'
                f'    <div class="obs-kpi-foot">{audit["zero_profile_count"]} unprofiled stubs · living realm/residence gaps</div>'
                "  </div>"
                '  <div class="obs-surface-card obs-kpi-card obs-kpi-blue">'
                '    <div class="obs-kpi-label">Not Applicable (Expected)</div>'
                f'    <div class="obs-kpi-value">{na_cnt}'
                '      <span class="obs-kpi-unit">citizens</span></div>'
                '    <div class="obs-kpi-foot">Ordinary citizens/students not needing formal titles</div>'
                "  </div>"
                "</div>"
            ),
        )

        # 7-Classification Taxonomy Legend & Interactive Selector
        with solara.Div(classes=["obs-surface-card"]):
            solara.HTML(
                tag="div",
                unsafe_innerHTML=(
                    '<div class="obs-section-head">'
                    '  <h2 class="obs-section-title">Issue Classification Taxonomy</h2>'
                    '  <span class="obs-muted">Click any classification below to filter citizens</span>'
                    "</div>"
                ),
            )
            with solara.Div(classes=["obs-taxonomy-grid"]):
                for cls_name in ISSUE_CLASSIFICATIONS:
                    meta = CLASSIFICATION_META[cls_name]
                    c_count = audit["citizens_per_classification"].get(cls_name, 0)
                    f_count = audit["classification_counts"].get(cls_name, 0)
                    is_sel = selected_class == cls_name
                    btn_cls = ["obs-tax-btn"]
                    if is_sel:
                        btn_cls.append("obs-tax-btn-active")
                    solara.Button(
                        label=f"{meta['icon']} {cls_name} ({c_count} citizens · {f_count})",
                        outlined=not is_sel,
                        color="primary" if is_sel else None,
                        on_click=lambda target=cls_name: set_selected_class(target),
                        classes=btn_cls,
                    )

        # Normalized Coverage Panel
        with solara.Div(classes=["obs-surface-card"]):
            solara.HTML(
                tag="div",
                unsafe_innerHTML=(
                    '<div class="obs-section-head">'
                    '  <h2 class="obs-section-title">Normalized Cross-Schema Coverage</h2>'
                    '  <span class="obs-muted">Recognizes occupation, specialty, institution, division, faction, and regional fields</span>'
                    "</div>"
                    + _render_coverage_html(audit)
                ),
            )

        # Filter Bar
        with solara.Div(classes=["obs-surface-card", "obs-filter-bar"]):
            with solara.Div(classes=["obs-filter-controls"]):
                solara.InputText(
                    label="Search citizen, ID, or finding",
                    value=search,
                    on_value=lambda v: set_search(v or ""),
                    continuous_update=True,
                    clearable=True,
                    dense=True,
                    hide_details=True,
                    classes=["obs-filter-item", "obs-filter-search"],
                )
                solara.Select(
                    label="Classification Filter",
                    values=filter_options,
                    value=selected_class,
                    on_value=lambda v: set_selected_class(
                        v or "Actionable Review Needed"
                    ),
                    dense=True,
                    classes=["obs-filter-item"],
                )
                solara.Select(
                    label="Population Eligibility",
                    values=elig_options,
                    value=elig_filter,
                    on_value=lambda v: set_elig_filter(v or "All Records"),
                    dense=True,
                    classes=["obs-filter-item"],
                )
                if has_custom:
                    solara.Button(
                        label="Reset Filters",
                        outlined=True,
                        on_click=reset_filters,
                        classes=["obs-btn-secondary"],
                    )

            solara.HTML(
                tag="div",
                unsafe_innerHTML=(
                    f'<div class="obs-filter-summary">'
                    f"Showing <strong>{len(filtered_reports)}</strong> of "
                    f'<strong>{audit["total"]}</strong> records for '
                    f"<strong>{html.escape(selected_class)}</strong>"
                    f"</div>"
                ),
            )

        # Classified Citizen Findings Cards
        with solara.Div(classes=["obs-surface-card"]):
            solara.HTML(
                tag="div",
                unsafe_innerHTML=(
                    '<div class="obs-section-head">'
                    "  <div>"
                    '    <h2 class="obs-section-title">Classified Integrity &amp; Context Report</h2>'
                    '    <p class="obs-section-desc">'
                    "      Actionable contradictions and missing data are highlighted alongside preserved contextual, complementary, historical, and non-applicable notes."
                    "    </p>"
                    "  </div>"
                    f'  <span class="obs-badge obs-badge-lavender">{len(filtered_reports)} citizens</span>'
                    "</div>"
                ),
            )

            if not filtered_reports:
                solara.HTML(
                    tag="div",
                    unsafe_innerHTML=(
                        '<div class="obs-empty-state">'
                        "No citizens match the selected classification and filter criteria."
                        "</div>"
                    ),
                )
            else:
                filter_sig = (query, selected_class, elig_filter)
                manual_page, synced_sig = page_state
                effective_page = manual_page if filter_sig == synced_sig else 0
                total_pages = max(1, (len(filtered_reports) + page_size - 1) // page_size)
                safe_page = max(0, min(effective_page, total_pages - 1))
                visible_reports = filtered_reports[
                    safe_page * page_size : (safe_page + 1) * page_size
                ]
                with solara.Div(classes=["obs-conflict-grid"]):
                    for rep in visible_reports:
                        cid = rep["character_id"]
                        # Show findings matching specific class if filtered to one class, else show all findings for citizen
                        shown_findings = (
                            [
                                f
                                for f in rep["findings"]
                                if f["classification"] == selected_class
                            ]
                            if selected_class in ISSUE_CLASSIFICATIONS
                            else rep["findings"]
                        )

                        elig_badge = (
                            '<span class="obs-badge obs-badge-ok">● Living Sim</span>'
                            if rep["eligible"]
                            else '<span class="obs-badge obs-badge-neutral">⏸ Excluded</span>'
                        )
                        staged_badge = (
                            '<span class="obs-badge obs-badge-lavender">✎ Staged Override</span>'
                            if rep["has_staged_override"]
                            else ""
                        )

                        finding_blocks = ['<div class="obs-conflict-stack">']
                        for fitem in shown_findings:
                            cmeta = CLASSIFICATION_META[fitem["classification"]]
                            entries_html = []
                            for col, ctx, val in fitem.get("entries", [])[:6]:
                                ctx_lbl = f" · {html.escape(ctx)}" if ctx and ctx != col else ""
                                entries_html.append(
                                    f'<div class="obs-conflict-entry">'
                                    f'  <span class="obs-collection-tag">{html.escape(col)}{ctx_lbl}</span>'
                                    f'  <span class="obs-conflict-val">{html.escape(val)}</span>'
                                    f"</div>"
                                )
                            entries_wrap = (
                                f'<div class="obs-conflict-entries">{"".join(entries_html)}</div>'
                                if entries_html
                                else ""
                            )
                            finding_blocks.append(
                                f'<div class="obs-conflict-field">'
                                f'  <div class="obs-conflict-field-head">'
                                f'    <span class="obs-badge {cmeta["badge_cls"]}">'
                                f'      {cmeta["icon"]} {html.escape(fitem["classification"])}'
                                f"    </span>"
                                f'    <strong style="font-size:0.86rem;">{html.escape(fitem["field"])}</strong>'
                                f"  </div>"
                                f'  <div class="obs-muted" style="color:var(--obs-text-secondary);">{html.escape(fitem["detail"])}</div>'
                                f"  {entries_wrap}"
                                f"</div>"
                            )
                        finding_blocks.append("</div>")

                        with solara.Div(classes=["obs-conflict-card"]).key(
                            f"int-{cid}"
                        ):
                            with solara.Div(classes=["obs-conflict-card-top"]):
                                solara.HTML(
                                    tag="div",
                                    unsafe_innerHTML=(
                                        f'<div class="obs-conflict-title-wrap">'
                                        f'  <span class="obs-conflict-name">{html.escape(rep["name"])}</span>'
                                        f'  <code class="obs-id-pill">{html.escape(cid)}</code>'
                                        f'  <span class="obs-badge obs-badge-blue">{html.escape(rep["classification"])}</span>'
                                        f"  {elig_badge}"
                                        f"  {staged_badge}"
                                        f"</div>"
                                    ),
                                )
                                with solara.Div(
                                    style={"display": "flex", "gap": "6px", "flexWrap": "wrap"}
                                ):
                                    if on_inspect_citizen is not None:
                                        solara.Button(
                                            label="Inspect",
                                            outlined=True,
                                            on_click=lambda target=cid: on_inspect_citizen(
                                                target
                                            ),
                                            classes=["obs-btn-compact"],
                                        )
                                    if on_edit_citizen is not None:
                                        solara.Button(
                                            label="Edit Profile",
                                            color="primary",
                                            on_click=lambda target=cid: on_edit_citizen(
                                                target
                                            ),
                                            classes=["obs-btn-compact"],
                                        )

                            solara.HTML(
                                tag="div",
                                unsafe_innerHTML="".join(finding_blocks),
                            )

                if total_pages > 1:
                    with solara.Div(classes=["obs-pager"]):
                        solara.Button(
                            label="◀ Prev",
                            outlined=True,
                            disabled=safe_page <= 0,
                            on_click=lambda: set_page_state(
                                (max(0, safe_page - 1), filter_sig)
                            ),
                            classes=["obs-btn-compact"],
                        )
                        solara.HTML(
                            tag="span",
                            unsafe_innerHTML=(
                                f'<span class="obs-muted">Page <strong>{safe_page + 1}</strong> of <strong>{total_pages}</strong> ({len(filtered_reports)} total)</span>'
                            ),
                        )
                        solara.Button(
                            label="Next ▶",
                            outlined=True,
                            disabled=safe_page >= total_pages - 1,
                            on_click=lambda: set_page_state(
                                (min(total_pages - 1, safe_page + 1), filter_sig)
                            ),
                            classes=["obs-btn-compact"],
                        )
