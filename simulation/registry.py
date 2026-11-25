from __future__ import annotations

import html
import json
from typing import Callable

import solara
from mesa.visualization.utils import update_counter

from integrity import analyze_citizen_integrity, is_missing
from profiles_normalizer import CHARACTER_CLASSIFICATIONS


ACTIVITY_ICONS: dict[str, str] = {
    "Sleeping": "🌙",
    "Resting": "🛋️",
    "Eating": "🍽️",
    "Socializing": "💬",
    "Entertainment": "🎵",
    "Personal activities": "🧭",
    "Relaxing": "☕",
    "Civic & professional duties": "🏛️",
    "Creative & studio work": "🎨",
    "Companion duties": "🤝",
    "Commuting": "🚆",
    "Hygiene": "🧼",
    "Exercise": "🏃",
    "Leisure": "🎧",
    "Player Controlled": "🎮",
    "Historical Record": "📜",
    "Inactive (Case / Medical Record)": "📁",
    "Inactive Record": "⏸️",
    "Stationary (Pinned)": "📌",
}


def _activity_badge_html(activity: str, eligible: bool = True) -> str:
    icon = ACTIVITY_ICONS.get(activity, "•")
    cls_name = "obs-activity-pill" if eligible else "obs-badge obs-badge-neutral"
    return (
        f'<span class="{cls_name}">'
        f"<span aria-hidden='true'>{icon}</span> "
        f"<span>{html.escape(str(activity))}</span>"
        f"</span>"
    )


def _render_role_facets_html(norm: dict) -> str:
    facets = [
        ("Primary Occupation", [norm["primary_occupation"]] if norm.get("primary_occupation") else []),
        ("Secondary Occupations", norm.get("secondary_occupations") or []),
        ("Specializations", norm.get("specializations") or []),
        ("Institutional Roles", norm.get("institutional_roles") or []),
        ("Social Affiliations", norm.get("social_affiliations") or []),
        ("Narrative Roles", norm.get("narrative_roles") or []),
        ("Historical Roles", norm.get("historical_roles") or []),
    ]

    populated = [(label, vals) for label, vals in facets if vals]
    if not populated:
        return (
            '<div class="obs-empty-state">'
            "No normalized role facets mapped yet — use Population Editor to author roles."
            "</div>"
        )

    cells = ['<div class="obs-meta-grid">']
    for label, vals in populated:
        joined = " · ".join(html.escape(str(v)) for v in vals)
        cells.append(
            f'<div class="obs-meta-cell">'
            f'  <span class="obs-meta-key">{html.escape(label)}</span>'
            f'  <span class="obs-meta-val">{joined}</span>'
            f"</div>"
        )
    cells.append("</div>")
    return "".join(cells)


def _render_citizen_profiles_html(profiles: list[dict], expand_all: bool) -> str:
    if not profiles:
        return (
            '<div class="obs-empty-state">'
            "○ No canonical records in <code>CharacterProfiles</code> for this character."
            "</div>"
        )

    cards = ['<div class="obs-profiles-stack">']
    for idx, profile in enumerate(profiles):
        collection = html.escape(str(profile.get("collection", "Unknown")))
        context = html.escape(str(profile.get("context", "")))
        data = profile.get("data", {})
        field_count = len(data) if isinstance(data, dict) else 0
        open_attr = " open" if (expand_all or idx == 0) else ""
        raw_json = html.escape(json.dumps(data, indent=2, ensure_ascii=False))
        ctx_html = (
            f'<span class="obs-profile-ctx">Context: {context}</span>'
            if context and context != collection
            else '<span class="obs-profile-ctx">Primary collection entry</span>'
        )
        cards.append(
            f"<details class='obs-profile-details'{open_attr}>"
            f"  <summary class='obs-profile-summary'>"
            f"    <div class='obs-profile-summary-left'>"
            f"      <span class='obs-collection-tag'>{collection}</span>"
            f"      {ctx_html}"
            f"    </div>"
            f"    <span class='obs-badge obs-badge-neutral'>{field_count} fields</span>"
            f"  </summary>"
            f"  <pre class='obs-json-pre'><code>{raw_json}</code></pre>"
            f"</details>"
        )
    cards.append("</div>")
    return "".join(cards)


@solara.component
def CitizenRegistry(
    model,
    selected_id: str | None = None,
    on_select_id: Callable[[str | None], None] | None = None,
    on_edit_citizen: Callable[[str], None] | None = None,
):
    """Searchable Citizen Directory with classification/eligibility/realm/role filters and Inspector."""
    update_counter.get()

    search, set_search = solara.use_state("")
    realm, set_realm = solara.use_state("All realms")
    role, set_role = solara.use_state("All roles")
    cls_filter, set_cls_filter = solara.use_state("All classifications")
    elig_filter, set_elig_filter = solara.use_state("All records")
    sort_by, set_sort_by = solara.use_state("Name (A–Z)")
    expand_all_profiles, set_expand_all_profiles = solara.use_state(False)
    local_selected, set_local_selected = solara.use_state(None)
    page_state, set_page_state = solara.use_state((0, None, None))
    page_size = 12

    active_selected = selected_id if on_select_id is not None else local_selected
    select_citizen = on_select_id if on_select_id is not None else set_local_selected

    citizens = list(model.agents)

    realms = ["All realms"] + sorted({str(c.realm) for c in citizens})
    roles = ["All roles"] + sorted({str(c.role) for c in citizens})
    classifications = ["All classifications"] + list(CHARACTER_CLASSIFICATIONS)
    elig_options = [
        "All records",
        "Living population only",
        "Excluded / inactive only",
        "Staged overrides only",
    ]
    sort_options = [
        "Name (A–Z)",
        "Classification",
        "Activity",
        "Energy (Low → High)",
        "Energy (High → Low)",
        "Profiles (Most)",
    ]

    effective_realm = realm if realm in realms else "All realms"
    effective_role = role if role in roles else "All roles"

    query = search.strip().lower()
    filtered = []
    for c in citizens:
        norm = c.normalized
        if query:
            haystack = " ".join(
                [
                    str(c.name or ""),
                    str(c.character_id or ""),
                    str(c.role or ""),
                    str(c.affiliation or ""),
                    str(c.realm or ""),
                    str(c.character_classification or ""),
                    " ".join(norm.get("specializations") or []),
                    " ".join(norm.get("social_affiliations") or []),
                    " ".join(norm.get("narrative_roles") or []),
                    " ".join(norm.get("legacy_names") or []),
                ]
            ).lower()
            if query not in haystack:
                continue

        if effective_realm != "All realms" and str(c.realm) != effective_realm:
            continue
        if effective_role != "All roles" and str(c.role) != effective_role:
            continue
        if (
            cls_filter != "All classifications"
            and c.character_classification != cls_filter
        ):
            continue
        if elig_filter == "Living population only" and not c.eligible_for_living_sim:
            continue
        if elig_filter == "Excluded / inactive only" and c.eligible_for_living_sim:
            continue
        if elig_filter == "Staged overrides only" and not norm.get(
            "has_staged_override"
        ):
            continue

        filtered.append(c)

    if sort_by == "Classification":
        filtered.sort(
            key=lambda c: (
                str(c.character_classification),
                str(c.name or "").lower(),
            )
        )
    elif sort_by == "Activity":
        filtered.sort(key=lambda c: (str(c.activity), str(c.name or "").lower()))
    elif sort_by == "Energy (Low → High)":
        filtered.sort(key=lambda c: (c.energy, str(c.name or "").lower()))
    elif sort_by == "Energy (High → Low)":
        filtered.sort(key=lambda c: (-c.energy, str(c.name or "").lower()))
    elif sort_by == "Profiles (Most)":
        filtered.sort(key=lambda c: (-len(c.profiles), str(c.name or "").lower()))
    else:
        filtered.sort(key=lambda c: str(c.name or "").lower())

    citizen = next(
        (c for c in citizens if c.character_id == active_selected),
        None,
    )
    if citizen is None and filtered:
        citizen = filtered[0]

    total_pages = max(1, (len(filtered) + page_size - 1) // page_size)
    filter_sig = (
        query,
        effective_realm,
        effective_role,
        cls_filter,
        elig_filter,
        sort_by,
    )
    manual_page, synced_sel, synced_sig = page_state
    if active_selected != synced_sel or filter_sig != synced_sig:
        if active_selected and filtered:
            idx = next(
                (i for i, item in enumerate(filtered) if item.character_id == active_selected),
                None,
            )
            effective_page = (idx // page_size) if idx is not None else 0
        else:
            effective_page = 0
    else:
        effective_page = manual_page

    safe_page = max(0, min(effective_page, total_pages - 1))
    visible_entries = filtered[safe_page * page_size : (safe_page + 1) * page_size]

    has_filters = (
        bool(query)
        or effective_realm != "All realms"
        or effective_role != "All roles"
        or cls_filter != "All classifications"
        or elig_filter != "All records"
        or sort_by != "Name (A–Z)"
    )

    def clear_filters():
        set_search("")
        set_realm("All realms")
        set_role("All roles")
        set_cls_filter("All classifications")
        set_elig_filter("All records")
        set_sort_by("Name (A–Z)")

    living_count = sum(1 for c in citizens if c.eligible_for_living_sim)

    with solara.Div(classes=["obs-page"]):
        # Header
        solara.HTML(
            tag="div",
            unsafe_innerHTML=(
                '<div class="obs-page-header">'
                "  <div>"
                '    <h1 class="obs-page-title">Citizen Registry</h1>'
                '    <p class="obs-page-subtitle">'
                "      Explore normalized multi-faceted roles, living simulation eligibility, live telemetry, and canonical source profiles."
                "    </p>"
                "  </div>"
                f'  <div class="obs-count-pill">'
                f"    Showing <strong>{len(filtered)}</strong> of <strong>{len(citizens)}</strong> records "
                f"    <span class='obs-muted'>({living_count} living)</span>"
                f"  </div>"
                "</div>"
            ),
        )

        # Compact Filter Bar
        with solara.Div(classes=["obs-surface-card", "obs-filter-bar"]):
            with solara.Div(classes=["obs-filter-controls"]):
                solara.InputText(
                    label="Search name, ID, occupation, specialization, or realm",
                    value=search,
                    on_value=lambda v: set_search(v or ""),
                    continuous_update=True,
                    clearable=True,
                    dense=True,
                    hide_details=True,
                    classes=["obs-filter-item", "obs-filter-search"],
                )
                solara.Select(
                    label="Classification",
                    values=classifications,
                    value=cls_filter,
                    on_value=lambda v: set_cls_filter(v or "All classifications"),
                    dense=True,
                    classes=["obs-filter-item"],
                )
                solara.Select(
                    label="Eligibility",
                    values=elig_options,
                    value=elig_filter,
                    on_value=lambda v: set_elig_filter(v or "All records"),
                    dense=True,
                    classes=["obs-filter-item"],
                )
                solara.Select(
                    label="Realm",
                    values=realms,
                    value=effective_realm,
                    on_value=lambda v: set_realm(v or "All realms"),
                    dense=True,
                    classes=["obs-filter-item"],
                )
                solara.Select(
                    label="Primary Role",
                    values=roles,
                    value=effective_role,
                    on_value=lambda v: set_role(v or "All roles"),
                    dense=True,
                    classes=["obs-filter-item"],
                )
                solara.Select(
                    label="Sort",
                    values=sort_options,
                    value=sort_by,
                    on_value=lambda v: set_sort_by(v or "Name (A–Z)"),
                    dense=True,
                    classes=["obs-filter-item"],
                )
                if has_filters:
                    solara.Button(
                        label="Reset Filters",
                        outlined=True,
                        on_click=clear_filters,
                        classes=["obs-btn-secondary"],
                    )

        # Side-by-Side Directory & Inspector
        with solara.Div(classes=["obs-registry-grid"]):
            # LEFT: Compact Citizen Directory
            with solara.Div(classes=["obs-surface-card", "obs-directory-panel"]):
                solara.HTML(
                    tag="div",
                    unsafe_innerHTML=(
                        '<div class="obs-section-head obs-directory-head">'
                        '  <h2 class="obs-section-title">Citizen Directory</h2>'
                        f'  <span class="obs-badge obs-badge-lavender">{len(filtered)} listed</span>'
                        "</div>"
                    ),
                )

                if not filtered:
                    solara.HTML(
                        tag="div",
                        unsafe_innerHTML=(
                            '<div class="obs-empty-state">'
                            "No citizens match your active search or filters."
                            "</div>"
                        ),
                    )
                else:
                    with solara.Div(classes=["obs-directory-list"]):
                        for entry in visible_entries:
                            is_active = (
                                citizen is not None
                                and entry.character_id == citizen.character_id
                            )
                            row_classes = ["obs-dir-item"]
                            if is_active:
                                row_classes.append("obs-dir-item-active")

                            role_text = (
                                str(entry.role)
                                if not is_missing(entry.role)
                                else "Unmapped role"
                            )
                            realm_text = (
                                str(entry.realm)
                                if not is_missing(entry.realm)
                                else "Unspecified realm"
                            )
                            act_icon = ACTIVITY_ICONS.get(entry.activity, "•")
                            override_mark = (
                                ' <span class="obs-dir-profiles" title="Has staged editor override">✎ Staged</span>'
                                if entry.normalized.get("has_staged_override")
                                else ""
                            )
                            vitals_snippet = (
                                f'<span class="obs-dir-vital" title="Energy">⚡ {entry.energy:.0f}%</span>'
                                f'<span class="obs-dir-vital" title="Hunger">🍽 {entry.hunger:.0f}%</span>'
                                if entry.eligible_for_living_sim
                                else '<span class="obs-dir-vital">Excluded from living loop</span>'
                            )

                            with solara.Div(classes=row_classes).key(
                                f"reg-{entry.character_id}"
                            ):
                                solara.HTML(
                                    tag="div",
                                    classes=["obs-dir-item-main"],
                                    unsafe_innerHTML=(
                                        f'<div class="obs-dir-top">'
                                        f'  <span class="obs-dir-name">{html.escape(str(entry.name))}</span>'
                                        f'  <span class="obs-dir-profiles">{len(entry.profiles)}p</span>'
                                        f"  {override_mark}"
                                        f"</div>"
                                        f'<div class="obs-dir-meta">'
                                        f"  {html.escape(entry.character_classification)} · {html.escape(role_text)} · {html.escape(realm_text)}"
                                        f"</div>"
                                        f'<div class="obs-dir-vitals">'
                                        f'  <span class="obs-dir-act">{act_icon} {html.escape(str(entry.activity))}</span>'
                                        f"  {vitals_snippet}"
                                        f"</div>"
                                    ),
                                )
                                solara.Button(
                                    label="Inspecting" if is_active else "Inspect",
                                    outlined=not is_active,
                                    color="primary" if is_active else None,
                                    on_click=lambda cid=entry.character_id: select_citizen(
                                        cid
                                    ),
                                    classes=[
                                        "obs-btn-inspect-active"
                                        if is_active
                                        else "obs-btn-inspect"
                                    ],
                                )

                    if total_pages > 1:
                        with solara.Div(classes=["obs-pager"]):
                            solara.Button(
                                label="◀ Prev",
                                outlined=True,
                                disabled=safe_page <= 0,
                                on_click=lambda: set_page_state(
                                    (max(0, safe_page - 1), active_selected, filter_sig)
                                ),
                                classes=["obs-btn-compact"],
                            )
                            solara.HTML(
                                tag="span",
                                unsafe_innerHTML=(
                                    f'<span class="obs-muted">Page <strong>{safe_page + 1}</strong> of <strong>{total_pages}</strong></span>'
                                ),
                            )
                            solara.Button(
                                label="Next ▶",
                                outlined=True,
                                disabled=safe_page >= total_pages - 1,
                                on_click=lambda: set_page_state(
                                    (
                                        min(total_pages - 1, safe_page + 1),
                                        active_selected,
                                        filter_sig,
                                    )
                                ),
                                classes=["obs-btn-compact"],
                            )

            # RIGHT: Citizen Inspector
            with solara.Div(classes=["obs-inspector-column"]):
                if citizen is None:
                    with solara.Div(classes=["obs-surface-card"]):
                        solara.HTML(
                            tag="div",
                            unsafe_innerHTML=(
                                '<div class="obs-empty-state">'
                                "Select a citizen from the directory to inspect normalized facets, live telemetry, and source profiles."
                                "</div>"
                            ),
                        )
                else:
                    norm = citizen.normalized
                    integrity_info = analyze_citizen_integrity(citizen)

                    # 1. Identity, Classification & Multi-Faceted Roles Card
                    with solara.Div(classes=["obs-surface-card", "obs-inspector-card"]):
                        elig_pill = (
                            '<span class="obs-badge obs-badge-ok">● Living Population</span>'
                            if citizen.eligible_for_living_sim
                            else '<span class="obs-badge obs-badge-neutral">⏸ Non-Participating</span>'
                        )
                        staged_pill = (
                            f'<span class="obs-badge obs-badge-lavender">✎ Staged Override ({html.escape(norm.get("override_status", "draft"))})</span>'
                            if norm.get("has_staged_override")
                            else ""
                        )
                        review_pill = (
                            f'<span class="obs-badge obs-badge-warn">▲ {len(integrity_info["actionable_findings"])} review item(s)</span>'
                            if integrity_info["actionable_findings"]
                            else '<span class="obs-badge obs-badge-ok">✓ Profile verified</span>'
                        )

                        with solara.Div(classes=["obs-inspector-header"]):
                            solara.HTML(
                                tag="div",
                                unsafe_innerHTML=(
                                    f'<h2 class="obs-inspector-name">{html.escape(str(citizen.name))}</h2>'
                                    f'<div class="obs-inspector-id-row">'
                                    f'  <code class="obs-id-pill">{html.escape(str(citizen.character_id))}</code>'
                                    f'  <span class="obs-badge obs-badge-blue">{html.escape(citizen.character_classification)}</span>'
                                    f"  {elig_pill}"
                                    f"  {review_pill}"
                                    f"  {staged_pill}"
                                    f"</div>"
                                ),
                            )
                            with solara.Div(
                                style={"display": "flex", "alignItems": "center", "gap": "8px", "flexWrap": "wrap"}
                            ):
                                solara.HTML(
                                    tag="div",
                                    unsafe_innerHTML=_activity_badge_html(
                                        citizen.activity,
                                        citizen.eligible_for_living_sim,
                                    ),
                                )
                                if on_edit_citizen is not None:
                                    solara.Button(
                                        label="Edit in Population Editor",
                                        color="primary",
                                        on_click=lambda cid=citizen.character_id: on_edit_citizen(
                                            cid
                                        ),
                                        classes=["obs-btn-compact"],
                                    )

                        # Geography, Identity & Eligibility Summary
                        aliases_txt = ", ".join(norm.get("aliases") or [])
                        legacy_txt = ", ".join(norm.get("legacy_names") or [])
                        geo_cells = [
                            ("Origin Realm", norm.get("origin_realm") or "Unspecified"),
                            (
                                "Residence",
                                norm.get("current_residence") or "Unspecified",
                            ),
                            ("Workplace / Org", norm.get("workplace") or "Unspecified"),
                            ("Species", norm.get("species") or "Human / Unspecified"),
                        ]
                        if norm.get("professional_title"):
                            geo_cells.append(
                                ("Formal Title", norm["professional_title"])
                            )
                        if aliases_txt or legacy_txt:
                            combined_names = " · ".join(
                                x for x in (aliases_txt, legacy_txt) if x
                            )
                            geo_cells.append(("Aliases / Legacy Names", combined_names))

                        geo_html = "".join(
                            f'<div class="obs-meta-cell">'
                            f'  <span class="obs-meta-key">{html.escape(k)}</span>'
                            f'  <span class="obs-meta-val">{html.escape(str(v))}</span>'
                            f"</div>"
                            for k, v in geo_cells
                        )
                        bio_html = (
                            f'<p class="obs-section-desc" style="margin-block:10px 12px;">'
                            f'{html.escape(norm["biography"])}</p>'
                            if norm.get("biography")
                            else ""
                        )

                        solara.HTML(
                            tag="div",
                            unsafe_innerHTML=(
                                bio_html
                                + f'<div class="obs-meta-grid" style="margin-block-end:14px;">{geo_html}</div>'
                                + '<div class="obs-section-head" style="margin-block-bottom:8px;">'
                                + '  <h3 class="obs-section-title">Normalized Multi-Faceted Roles</h3>'
                                + '  <span class="obs-muted">Context-preserved across collections</span>'
                                + "</div>"
                                + _render_role_facets_html(norm)
                            ),
                        )

                    # 2. Live Simulation & Eligibility Telemetry Card
                    with solara.Div(classes=["obs-surface-card", "obs-inspector-card"]):
                        vitals_html = []
                        if citizen.eligible_for_living_sim:
                            for vlabel, vval, vcls in (
                                ("Energy", citizen.energy, "obs-meter-lavender"),
                                ("Hunger", citizen.hunger, "obs-meter-blue"),
                                ("Social Need", citizen.social_need, "obs-meter-indigo"),
                            ):
                                clamped = max(0, min(100, int(vval)))
                                vitals_html.append(
                                    f'<div class="obs-vital-row">'
                                    f'  <div class="obs-vital-head">'
                                    f'    <span class="obs-vital-label">{vlabel}</span>'
                                    f'    <span class="obs-vital-num">{clamped} / 100</span>'
                                    f"  </div>"
                                    f'  <div class="obs-meter-track" role="progressbar" '
                                    f'       aria-valuenow="{clamped}" aria-valuemin="0" aria-valuemax="100" '
                                    f'       aria-label="{vlabel}">'
                                    f'    <div class="obs-meter-fill {vcls}" style="width: {clamped}%;"></div>'
                                    f"  </div>"
                                    f"</div>"
                                )
                            vitals_block = f'<div class="obs-vitals-stack">{"".join(vitals_html)}</div>'
                        else:
                            vitals_block = (
                                f'<div class="obs-empty-state">'
                                f"<strong>Excluded from daily autonomous routines:</strong> "
                                f"{html.escape(citizen.eligibility_reason)}"
                                f"</div>"
                            )

                        solara.HTML(
                            tag="div",
                            unsafe_innerHTML=(
                                '<div class="obs-section-head">'
                                '  <h3 class="obs-section-title">Simulation Eligibility &amp; Live Telemetry</h3>'
                                f'  <span class="obs-badge obs-badge-blue">Depth: {html.escape(citizen.simulation_depth)}</span>'
                                "</div>"
                                '<div class="obs-sim-traits">'
                                '  <div class="obs-trait-box">'
                                '    <span class="obs-trait-label">Current State</span>'
                                f'    <span class="obs-trait-value">{html.escape(str(citizen.activity))}</span>'
                                "  </div>"
                                '  <div class="obs-trait-box">'
                                '    <span class="obs-trait-label">Schedule</span>'
                                f'    <span class="obs-trait-value">{html.escape(str(citizen.schedule_preset))}</span>'
                                "  </div>"
                                '  <div class="obs-trait-box">'
                                '    <span class="obs-trait-label">Music Interest</span>'
                                f'    <span class="obs-trait-value">{citizen.music_interest * 100:.1f}%</span>'
                                "  </div>"
                                '  <div class="obs-trait-box">'
                                '    <span class="obs-trait-label">Sociability</span>'
                                f'    <span class="obs-trait-value">{citizen.sociability * 100:.1f}%</span>'
                                "  </div>"
                                "</div>"
                                + vitals_block
                            ),
                        )

                    # 3. Canonical Source Profiles Card
                    with solara.Div(classes=["obs-surface-card", "obs-inspector-card"]):
                        with solara.Div(classes=["obs-section-head"]):
                            solara.HTML(
                                tag="div",
                                unsafe_innerHTML=(
                                    f'<h3 class="obs-section-title">'
                                    f"Canonical Source Profiles ({len(citizen.profiles)})"
                                    f"</h3>"
                                ),
                            )
                            if len(citizen.profiles) > 1:
                                solara.Button(
                                    label=(
                                        "Collapse Extra"
                                        if expand_all_profiles
                                        else "Expand All"
                                    ),
                                    text=True,
                                    on_click=lambda: set_expand_all_profiles(
                                        not expand_all_profiles
                                    ),
                                    classes=["obs-btn-link"],
                                )

                        solara.HTML(
                            tag="div",
                            unsafe_innerHTML=_render_citizen_profiles_html(
                                citizen.profiles, expand_all_profiles
                            ),
                        )
