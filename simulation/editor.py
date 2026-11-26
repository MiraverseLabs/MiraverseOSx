from __future__ import annotations

import html
from typing import Any, Callable

import solara
from mesa.visualization.utils import force_update, update_counter

from overrides_store import (
    OVERRIDES_FILE,
    commit_approved_overrides,
    compute_authoritative_diff,
    delete_character_override,
    export_approved_bundle,
    load_all_overrides,
    save_character_override,
    validate_staged_entry,
)
from profiles_normalizer import (
    BEHAVIOR_OVERRIDE_OPTIONS,
    CHARACTER_CLASSIFICATIONS,
    CLASSIFICATION_DESCRIPTIONS,
    KNOWN_REALMS,
    SCHEDULE_PRESETS,
    SIMULATION_DEPTH_OPTIONS,
)


EDITOR_TABS: tuple[tuple[str, str], ...] = (
    ("Identity & Geography", "🪪"),
    ("Careers & Roles", "💼"),
    ("Personality & Relationships", "🤝"),
    ("Daily Life & Entertainment", "🎵"),
    ("Simulation Settings", "⚙️"),
    ("Review & Commit", "✅"),
)


def _join_lines(items: list[str] | None) -> str:
    if not items:
        return ""
    return "\n".join(str(x).strip() for x in items if str(x).strip())


def _parse_lines(raw: str | None) -> list[str]:
    if not raw:
        return []
    out: list[str] = []
    seen: set[str] = set()
    for line in str(raw).replace("\r\n", "\n").split("\n"):
        for piece in line.split(";"):
            cleaned = piece.strip()
            if cleaned and cleaned.lower() not in seen:
                seen.add(cleaned.lower())
                out.append(cleaned)
    return out


def _build_form_from_citizen(citizen) -> dict[str, Any]:
    norm = citizen.normalized
    music_pct = int(round(citizen.music_interest * 100))
    return {
        "name": str(norm.get("name") or citizen.name or ""),
        "first_name": str(norm.get("first_name") or ""),
        "last_name": str(norm.get("last_name") or ""),
        "aliases": _join_lines(norm.get("aliases")),
        "legacy_names": _join_lines(norm.get("legacy_names")),
        "age": str(norm.get("age") or ""),
        "species": str(norm.get("species") or ""),
        "biography": str(norm.get("biography") or ""),
        # Geography (Home Realm kept separate from Origin / Birth Realm)
        "home_realm": str(norm.get("home_realm") or ""),
        "origin_realm": str(norm.get("origin_realm") or ""),
        "current_residence": str(norm.get("current_residence") or ""),
        "workplace": str(norm.get("workplace") or ""),
        # Careers, Education & 7 Role Facets
        "primary_occupation": str(norm.get("primary_occupation") or ""),
        "secondary_occupations": _join_lines(norm.get("secondary_occupations")),
        "specializations": _join_lines(norm.get("specializations")),
        "institutional_roles": _join_lines(norm.get("institutional_roles")),
        "professional_title": str(norm.get("professional_title") or ""),
        "qualifications": _join_lines(norm.get("qualifications")),
        "institutions": _join_lines(norm.get("institutions")),
        # Personality, Social, Narrative & Historical
        "traits": _join_lines(norm.get("traits")),
        "motivations": _join_lines(norm.get("motivations")),
        "hobbies": _join_lines(norm.get("hobbies")),
        "preferences": _join_lines(norm.get("preferences")),
        "social_affiliations": _join_lines(norm.get("social_affiliations")),
        "narrative_roles": _join_lines(norm.get("narrative_roles")),
        "historical_roles": _join_lines(norm.get("historical_roles")),
        # Relationships
        "relationships": _join_lines(norm.get("relationships")),
        # Daily Life
        "schedule_preset": str(
            norm.get("schedule_preset") or "Standard Civic Routine"
        ),
        "habits": _join_lines(norm.get("habits")),
        "obligations": _join_lines(norm.get("obligations")),
        # Entertainment
        "music_interest_pct": max(0, min(100, music_pct)),
        "initial_music_pct": max(0, min(100, music_pct)),
        "has_music_override": norm.get("music_interest_override") is not None,
        "music_tastes": _join_lines(norm.get("music_tastes")),
        "favorite_artists": _join_lines(norm.get("favorite_artists")),
        "creative_interests": _join_lines(norm.get("creative_interests")),
        # Simulation Settings
        "character_classification": str(
            norm.get("character_classification") or "Ordinary citizen"
        ),
        "eligible_for_living_sim": bool(norm.get("eligible_for_living_sim", True)),
        "simulation_depth": str(norm.get("simulation_depth") or "Standard"),
        "behavior_override": str(
            norm.get("behavior_override") or "Auto (Classification Default)"
        ),
        # Review metadata
        "reviewer_notes": str(norm.get("override_notes") or ""),
    }


def _form_to_payload(form: dict[str, Any], fallback_name: str) -> dict[str, Any]:
    return {
        "name": str(form.get("name") or fallback_name).strip(),
        "first_name": str(form.get("first_name") or "").strip(),
        "last_name": str(form.get("last_name") or "").strip(),
        "aliases": _parse_lines(form.get("aliases")),
        "legacy_names": _parse_lines(form.get("legacy_names")),
        "age": str(form.get("age") or "").strip(),
        "species": str(form.get("species") or "").strip(),
        "biography": str(form.get("biography") or "").strip(),
        "home_realm": str(form.get("home_realm") or "").strip(),
        "origin_realm": str(form.get("origin_realm") or "").strip(),
        "current_residence": str(form.get("current_residence") or "").strip(),
        "workplace": str(form.get("workplace") or "").strip(),
        "primary_occupation": str(form.get("primary_occupation") or "").strip(),
        "secondary_occupations": _parse_lines(form.get("secondary_occupations")),
        "specializations": _parse_lines(form.get("specializations")),
        "institutional_roles": _parse_lines(form.get("institutional_roles")),
        "professional_title": str(form.get("professional_title") or "").strip(),
        "qualifications": _parse_lines(form.get("qualifications")),
        "institutions": _parse_lines(form.get("institutions")),
        "traits": _parse_lines(form.get("traits")),
        "motivations": _parse_lines(form.get("motivations")),
        "hobbies": _parse_lines(form.get("hobbies")),
        "preferences": _parse_lines(form.get("preferences")),
        "social_affiliations": _parse_lines(form.get("social_affiliations")),
        "narrative_roles": _parse_lines(form.get("narrative_roles")),
        "historical_roles": _parse_lines(form.get("historical_roles")),
        "relationships": _parse_lines(form.get("relationships")),
        "schedule_preset": str(
            form.get("schedule_preset") or "Standard Civic Routine"
        ),
        "habits": _parse_lines(form.get("habits")),
        "obligations": _parse_lines(form.get("obligations")),
        "music_interest_override": (
            float(form.get("music_interest_pct", 50)) / 100.0
            if form.get("has_music_override")
            or int(form.get("music_interest_pct", 50))
            != int(form.get("initial_music_pct", 50))
            else None
        ),
        "music_tastes": _parse_lines(form.get("music_tastes")),
        "favorite_artists": _parse_lines(form.get("favorite_artists")),
        "creative_interests": _parse_lines(form.get("creative_interests")),
        "character_classification": str(
            form.get("character_classification") or "Ordinary citizen"
        ),
        "eligible_for_living_sim": bool(form.get("eligible_for_living_sim", True)),
        "simulation_depth": str(form.get("simulation_depth") or "Standard"),
        "behavior_override": str(
            form.get("behavior_override") or "Auto (Classification Default)"
        ),
    }


@solara.component
def PopulationEditor(
    model,
    selected_id: str | None = None,
    on_select_id: Callable[[str | None], None] | None = None,
    on_inspect_citizen: Callable[[str], None] | None = None,
    on_overrides_changed: Callable[[], None] | None = None,
    revision: int = 0,
):
    """
    Authoritative Population Editor implementing the 5-step workflow:
    miraverse.db (Authoritative) -> Population Editor -> Temporary Staged Overrides
    -> Review & Validation -> Commit to miraverse.db (purging temporary staging).
    """
    _ = revision
    search, set_search = solara.use_state("")
    list_filter, set_list_filter = solara.use_state("All characters")
    active_section, set_active_section = solara.use_state("Identity & Geography")
    show_bundle, set_show_bundle = solara.use_state(False)
    status_banner, set_status_banner = solara.use_state("")
    error_banner, set_error_banner = solara.use_state("")
    page_state, set_page_state = solara.use_state((0, None, None))
    draft_forms, set_draft_forms = solara.use_state({})
    page_size = 12

    local_selected, set_local_selected = solara.use_state(None)
    active_selected = selected_id if on_select_id is not None else local_selected
    select_citizen = on_select_id if on_select_id is not None else set_local_selected

    citizens = sorted(
        list(model.agents),
        key=lambda c: str(c.name or "").lower(),
    )
    existing_names_by_id = {
        c.character_id: str(c.canonical_name or c.name or "") for c in citizens
    }

    query = search.strip().lower()
    filtered = []
    for c in citizens:
        norm = c.normalized
        if query:
            haystack = f"{c.name} {c.character_id} {c.character_classification} {c.role}".lower()
            if query not in haystack:
                continue
        if list_filter == "Temporary staged" and not norm.get("has_staged_override"):
            continue
        if list_filter == "Approved ready to commit" and norm.get("override_status") != "approved":
            continue
        if list_filter == "Authoritative curated in DB" and not norm.get("has_authoritative_observatory_profile"):
            continue
        if list_filter == "Excluded from living sim" and c.eligible_for_living_sim:
            continue
        filtered.append(c)

    citizen = next(
        (c for c in citizens if c.character_id == active_selected),
        None,
    )
    if citizen is None and filtered:
        citizen = filtered[0]

    total_pages = max(1, (len(filtered) + page_size - 1) // page_size)
    filter_sig = (query, list_filter)
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
    visible_queue = filtered[safe_page * page_size : (safe_page + 1) * page_size]

    target_cid = citizen.character_id if citizen is not None else ""
    base_form = _build_form_from_citizen(citizen) if citizen is not None else {}
    form = draft_forms.get(target_cid, base_form)

    def update_field(key: str, value: Any):
        if not target_cid:
            return
        set_draft_forms(
            lambda prev: {
                **prev,
                target_cid: {**prev.get(target_cid, base_form), key: value},
            }
        )

    def _clear_draft(cid: str):
        set_draft_forms(lambda prev: {k: v for k, v in prev.items() if k != cid})

    def _notify_parent():
        if on_overrides_changed is not None:
            on_overrides_changed()
        force_update()

    def handle_stage(review_status: str):
        if citizen is None:
            return
        set_error_banner("")
        payload = _form_to_payload(form, citizen.canonical_name)
        candidate_entry = {
            "character_id": citizen.character_id,
            "review_status": review_status,
            "reviewer_notes": str(form.get("reviewer_notes") or "").strip(),
        "data": payload,
        }
        v_check = validate_staged_entry(
            citizen._raw_character,
            candidate_entry,
            existing_names_by_id,
        )
        if not v_check["valid"]:
            set_error_banner("Validation failed: " + " | ".join(v_check["errors"]))
            set_status_banner("")
            return

        if review_status == "approved" and not v_check["diffs"]:
            set_error_banner(
                "No attribute differences detected relative to authoritative miraverse.db — modify at least one attribute before approving for commit."
            )
            set_status_banner("")
            return

        entry = save_character_override(
            character_id=citizen.character_id,
            override_data=payload,
            review_status=review_status,
            reviewer_notes=str(form.get("reviewer_notes") or "").strip(),
        )
        citizen.apply_normalization(entry)
        _clear_draft(citizen.character_id)
        if review_status == "approved":
            set_active_section("Review & Commit")
            set_status_banner(
                f"Validated and marked {citizen.name} ({citizen.character_id}) Approved — ready to commit into authoritative miraverse.db."
            )
        else:
            set_status_banner(
                f"Staged temporary draft for {citizen.name} ({citizen.character_id}) in {OVERRIDES_FILE.name}."
            )
        _notify_parent()

    def handle_discard():
        if citizen is None:
            return
        set_error_banner("")
        delete_character_override(citizen.character_id)
        citizen.apply_normalization(None)
        _clear_draft(citizen.character_id)
        file_note = (
            " (temporary staging file removed — 0 staged items remain)"
            if not OVERRIDES_FILE.exists()
            else ""
        )
        set_status_banner(
            f"Discarded temporary staged edit for {citizen.name}; restored authoritative miraverse.db state{file_note}."
        )
        _notify_parent()

    def handle_commit_single():
        if citizen is None:
            return
        set_error_banner("")
        res = commit_approved_overrides(character_ids=[citizen.character_id])
        if res["errors"]:
            set_error_banner("Commit blocked: " + " | ".join(res["errors"]))
            set_status_banner("")
            return
        model.reload_from_database()
        refreshed = next(
            (c for c in model.agents if c.character_id == citizen.character_id),
            citizen,
        )
        _clear_draft(citizen.character_id)
        cleanup_note = (
            " Temporary staging file deleted (0 pending drafts)."
            if res.get("staging_file_removed")
            else f" {res['remaining_staged']} other draft(s) still staged."
        )
        set_status_banner(
            f"Committed {refreshed.name} ({refreshed.character_id}) to authoritative miraverse.db!{cleanup_note}"
        )
        _notify_parent()

    def handle_commit_all_approved():
        set_error_banner("")
        res = commit_approved_overrides(character_ids=None)
        if res["errors"]:
            set_error_banner("Batch commit blocked: " + " | ".join(res["errors"]))
            set_status_banner("")
            return
        model.reload_from_database()
        committed_set = set(res.get("committed_ids") or [])
        set_draft_forms(
            lambda prev: {k: v for k, v in prev.items() if k not in committed_set}
        )
        cleanup_note = (
            " Temporary staging file deleted (0 pending drafts)."
            if res.get("staging_file_removed")
            else f" {res['remaining_staged']} draft(s) remain staged."
        )
        set_status_banner(
            f"Committed {len(res['committed_ids'])} approved record(s) to authoritative miraverse.db!{cleanup_note}"
        )
        _notify_parent()

    all_overrides = load_all_overrides()
    staged_total = len(all_overrides)
    approved_total = sum(
        1 for item in all_overrides.values() if item.get("review_status") == "approved"
    )
    realm_suggestions = [""] + list(KNOWN_REALMS)

    with solara.Div(classes=["obs-page"]):
        # Header & 5-Stage Lifecycle Pipeline
        solara.HTML(
            tag="div",
            unsafe_innerHTML=(
                '<div class="obs-page-header">'
                "  <div>"
                '    <h1 class="obs-page-title">Population Editor</h1>'
                '    <p class="obs-page-subtitle">'
                "      Authoritative workflow: <strong>miraverse.db</strong> → Edit → Temporary Staged Draft → Validate &amp; Approve → Commit back to <strong>miraverse.db</strong>."
                "    </p>"
                "  </div>"
                f'  <div class="obs-readonly-pill">'
                f"    <span>Temporary staging: <strong>{staged_total}</strong> pending · <strong>{approved_total}</strong> approved to commit</span>"
                f"  </div>"
                "</div>"
            ),
        )

        if error_banner:
            solara.HTML(
                tag="div",
                unsafe_innerHTML=(
                    f'<div class="obs-banner-err">⛔ {html.escape(error_banner)}</div>'
                ),
            )
        if status_banner:
            solara.HTML(
                tag="div",
                unsafe_innerHTML=(
                    f'<div class="obs-banner-ok">✓ {html.escape(status_banner)}</div>'
                ),
            )

        # Top Queue Filter & Batch Commit Bar
        with solara.Div(classes=["obs-surface-card", "obs-filter-bar"]):
            with solara.Div(classes=["obs-filter-controls"]):
                solara.InputText(
                    label="Search character to edit",
                    value=search,
                    on_value=lambda v: set_search(v or ""),
                    continuous_update=True,
                    clearable=True,
                    dense=True,
                    hide_details=True,
                    classes=["obs-filter-item", "obs-filter-search"],
                )
                solara.Select(
                    label="Filter Queue",
                    values=[
                        "All characters",
                        "Temporary staged",
                        "Approved ready to commit",
                        "Authoritative curated in DB",
                        "Excluded from living sim",
                    ],
                    value=list_filter,
                    on_value=lambda v: set_list_filter(v or "All characters"),
                    dense=True,
                    classes=["obs-filter-item"],
                )
                if approved_total > 0:
                    solara.Button(
                        label=f"↑ Commit All Approved ({approved_total}) to miraverse.db",
                        color="primary",
                        on_click=handle_commit_all_approved,
                        classes=["obs-btn-compact"],
                    )
                if staged_total > 0:
                    solara.Button(
                        label=(
                            "Hide Temporary Staging JSON"
                            if show_bundle
                            else f"Inspect Staging Queue ({staged_total})"
                        ),
                        outlined=True,
                        on_click=lambda: set_show_bundle(not show_bundle),
                        classes=["obs-btn-secondary"],
                    )

            if show_bundle and staged_total > 0:
                bundle_json = html.escape(export_approved_bundle())
                solara.HTML(
                    tag="div",
                    unsafe_innerHTML=(
                        f'<pre class="obs-json-pre" style="border-radius:8px;max-height:260px;overflow-y:auto;">'
                        f"<code>{bundle_json}</code></pre>"
                    ),
                )

        # Two-Column Editor Layout: Character Queue + Editor/Review Workspace
        with solara.Div(classes=["obs-registry-grid"]):
            # LEFT: Character Queue
            with solara.Div(classes=["obs-surface-card", "obs-directory-panel"]):
                solara.HTML(
                    tag="div",
                    unsafe_innerHTML=(
                        '<div class="obs-section-head obs-directory-head">'
                        '  <h2 class="obs-section-title">Character Queue</h2>'
                        f'  <span class="obs-badge obs-badge-lavender">{len(filtered)}</span>'
                        "</div>"
                    ),
                )
                if not filtered:
                    solara.HTML(
                        tag="div",
                        unsafe_innerHTML='<div class="obs-empty-state">No characters match this queue filter.</div>',
                    )
                else:
                    with solara.Div(classes=["obs-directory-list"]):
                        for entry in visible_queue:
                            is_cur = (
                                citizen is not None
                                and entry.character_id == citizen.character_id
                            )
                            r_cls = ["obs-dir-item"]
                            if is_cur:
                                r_cls.append("obs-dir-item-active")

                            has_ov = entry.normalized.get("has_staged_override")
                            ov_status = entry.normalized.get("override_status", "")
                            has_auth = entry.normalized.get(
                                "has_authoritative_observatory_profile"
                            )

                            state_badge = ""
                            if has_ov and ov_status == "approved":
                                state_badge = '<span class="obs-badge obs-badge-ok">✓ Approved</span>'
                            elif has_ov:
                                state_badge = '<span class="obs-badge obs-badge-warn">⏳ Staged</span>'
                            elif has_auth:
                                state_badge = '<span class="obs-badge obs-badge-blue">🗄️ Curated DB</span>'

                            elig_dot = "● Living" if entry.eligible_for_living_sim else "⏸ Excluded"

                            with solara.Div(classes=r_cls).key(
                                f"ed-q-{entry.character_id}"
                            ):
                                solara.HTML(
                                    tag="div",
                                    classes=["obs-dir-item-main"],
                                    unsafe_innerHTML=(
                                        f'<div class="obs-dir-top">'
                                        f'  <span class="obs-dir-name">{html.escape(str(entry.name))}</span>'
                                        f"  {state_badge}"
                                        f"</div>"
                                        f'<div class="obs-dir-meta">'
                                        f"  {html.escape(entry.character_classification)} · {elig_dot}"
                                        f"</div>"
                                    ),
                                )
                                solara.Button(
                                    label="Editing" if is_cur else "Select",
                                    outlined=not is_cur,
                                    color="primary" if is_cur else None,
                                    on_click=lambda cid=entry.character_id: select_citizen(
                                        cid
                                    ),
                                    classes=[
                                        "obs-btn-inspect-active"
                                        if is_cur
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

            # RIGHT: 8-Domain Editor & Authoritative Commit Workspace
            with solara.Div(classes=["obs-editor-column"]):
                if citizen is None:
                    with solara.Div(classes=["obs-surface-card"]):
                        solara.HTML(
                            tag="div",
                            unsafe_innerHTML='<div class="obs-empty-state">Select a character from the queue to review or edit attributes.</div>',
                        )
                else:
                    norm = citizen.normalized
                    has_ov = bool(norm.get("has_staged_override"))
                    is_approved = has_ov and norm.get("override_status") == "approved"
                    has_auth = bool(norm.get("has_authoritative_observatory_profile"))

                    if is_approved:
                        source_pill = (
                            f'<span class="obs-badge obs-badge-ok">'
                            f"✓ Approved Staged Change · Ready to commit to miraverse.db</span>"
                        )
                    elif has_ov:
                        source_pill = (
                            f'<span class="obs-badge obs-badge-warn">'
                            f"⏳ Temporary Staged Draft (uncommitted)</span>"
                        )
                    elif has_auth:
                        source_pill = (
                            f'<span class="obs-badge obs-badge-blue">'
                            f'🗄️ Authoritative in miraverse.db (committed {html.escape(norm.get("committed_at", ""))})</span>'
                        )
                    else:
                        source_pill = (
                            '<span class="obs-badge obs-badge-neutral">'
                            "🗄️ Authoritative miraverse.db baseline</span>"
                        )

                    # Live validation & diff preview against authoritative miraverse.db
                    live_candidate = {
                        "character_id": citizen.character_id,
                        "review_status": norm.get("override_status") or "draft",
                        "reviewer_notes": str(form.get("reviewer_notes") or ""),
                        "data": _form_to_payload(form, citizen.canonical_name),
                    }
                    validation = validate_staged_entry(
                        citizen._raw_character,
                        live_candidate,
                        existing_names_by_id,
                    )
                    diff_count = len(validation["diffs"])

                    staged_entry_for_cid = all_overrides.get(citizen.character_id)
                    has_unapproved_form_edits = (
                        staged_entry_for_cid is not None
                        and live_candidate["data"] != staged_entry_for_cid.get("data")
                    )

                    # Editor Action Header Card
                    with solara.Div(classes=["obs-surface-card"]):
                        solara.HTML(
                            tag="div",
                            unsafe_innerHTML=(
                                f'<h2 class="obs-inspector-name">{html.escape(str(citizen.name))}</h2>'
                                f'<div class="obs-inspector-id-row">'
                                f'  <code class="obs-id-pill">{html.escape(str(citizen.character_id))}</code>'
                                f"  {source_pill}"
                                f'  <span class="obs-badge obs-badge-lavender">{diff_count} field change(s) vs. miraverse.db</span>'
                                f"</div>"
                            ),
                        )
                        with solara.Div(classes=["obs-editor-actions"]):
                            solara.Button(
                                label="📝 Stage Draft",
                                outlined=True,
                                on_click=lambda: handle_stage("draft"),
                                classes=["obs-btn-compact"],
                            )
                            solara.Button(
                                label="✓ Validate & Approve",
                                color="primary" if (not is_approved or has_unapproved_form_edits) else None,
                                outlined=(is_approved and not has_unapproved_form_edits),
                                on_click=lambda: handle_stage("approved"),
                                classes=["obs-btn-compact"],
                            )
                            if is_approved:
                                solara.Button(
                                    label="↑ Commit to miraverse.db",
                                    color="primary",
                                    disabled=not validation["valid"] or has_unapproved_form_edits,
                                    on_click=handle_commit_single,
                                    classes=["obs-btn-compact"],
                                )
                            if has_ov:
                                solara.Button(
                                    label="✕ Discard Staged Draft",
                                    outlined=True,
                                    on_click=handle_discard,
                                    classes=["obs-btn-compact"],
                                )
                            if on_inspect_citizen is not None:
                                solara.Button(
                                    label="View in Registry →",
                                    text=True,
                                    on_click=lambda cid=citizen.character_id: on_inspect_citizen(
                                        cid
                                    ),
                                    classes=["obs-btn-compact"],
                                )

                        # Section Tabs
                        with solara.Div(classes=["obs-editor-tabs"]):
                            for tab_label, tab_icon in EDITOR_TABS:
                                is_tab = active_section == tab_label
                                t_cls = ["obs-tax-btn"]
                                if is_tab:
                                    t_cls.append("obs-tax-btn-active")
                                badge_suffix = (
                                    f" ({diff_count})"
                                    if tab_label == "Review & Commit"
                                    else ""
                                )
                                solara.Button(
                                    label=f"{tab_icon} {tab_label}{badge_suffix}",
                                    outlined=not is_tab,
                                    on_click=lambda t=tab_label: set_active_section(t),
                                    classes=t_cls,
                                )

                    # TAB 1: Identity & Geography
                    if active_section == "Identity & Geography":
                        with solara.Div(classes=["obs-surface-card"]).key("ed-t1-id"):
                            solara.HTML(
                                tag="div",
                                unsafe_innerHTML=(
                                    '<div class="obs-section-head">'
                                    '  <h3 class="obs-section-title">1. Identity &amp; Background</h3>'
                                    '  <span class="obs-muted">Names, aliases, historical names, age, species, and biography</span>'
                                    "</div>"
                                ),
                            )
                            with solara.Div(classes=["obs-form-grid"]):
                                solara.InputText(
                                    label="Display Name",
                                    value=str(form.get("name", "")),
                                    on_value=lambda v: update_field("name", v or ""),
                                    continuous_update=True,
                                    dense=True,
                                )
                                solara.InputText(
                                    label="Age",
                                    value=str(form.get("age", "")),
                                    on_value=lambda v: update_field("age", v or ""),
                                    continuous_update=True,
                                    dense=True,
                                )
                                solara.InputText(
                                    label="Species / Lineage",
                                    value=str(form.get("species", "")),
                                    on_value=lambda v: update_field("species", v or ""),
                                    continuous_update=True,
                                    dense=True,
                                )
                                solara.InputText(
                                    label="Aliases / Handles (semicolon or newline separated)",
                                    value=str(form.get("aliases", "")),
                                    on_value=lambda v: update_field("aliases", v or ""),
                                    continuous_update=True,
                                    dense=True,
                                )
                                solara.InputText(
                                    label="Historical / Legacy Names",
                                    value=str(form.get("legacy_names", "")),
                                    on_value=lambda v: update_field(
                                        "legacy_names", v or ""
                                    ),
                                    continuous_update=True,
                                    dense=True,
                                )
                            solara.InputTextArea(
                                label="Biography & Background Summary",
                                value=str(form.get("biography", "")),
                                on_value=lambda v: update_field("biography", v or ""),
                                continuous_update=True,
                                rows=3,
                            )

                        with solara.Div(classes=["obs-surface-card"]).key("ed-t1-geo"):
                            solara.HTML(
                                tag="div",
                                unsafe_innerHTML=(
                                    '<div class="obs-section-head">'
                                    '  <h3 class="obs-section-title">2. Geography &amp; Residence</h3>'
                                    '  <span class="obs-muted">Origin realm, current civic residence, and primary workplace</span>'
                                    "</div>"
                                ),
                            )
                            with solara.Div(classes=["obs-form-grid"]):
                                current_realm_val = str(form.get("origin_realm", ""))
                                realm_vals = (
                                    realm_suggestions
                                    if current_realm_val in realm_suggestions
                                    else realm_suggestions + [current_realm_val]
                                )
                                solara.Select(
                                    label="Origin / Registered Realm",
                                    values=realm_vals,
                                    value=current_realm_val,
                                    on_value=lambda v: update_field(
                                        "origin_realm", v or ""
                                    ),
                                    dense=True,
                                )
                                solara.InputText(
                                    label="Current Residence (Street / Ward / Housing)",
                                    value=str(form.get("current_residence", "")),
                                    on_value=lambda v: update_field(
                                        "current_residence", v or ""
                                    ),
                                    continuous_update=True,
                                    dense=True,
                                )
                                solara.InputText(
                                    label="Primary Workplace / Station",
                                    value=str(form.get("workplace", "")),
                                    on_value=lambda v: update_field(
                                        "workplace", v or ""
                                    ),
                                    continuous_update=True,
                                    dense=True,
                                )

                    # TAB 2: Careers, Education & Multi-Faceted Roles
                    elif active_section == "Careers & Roles":
                        with solara.Div(classes=["obs-surface-card"]).key("ed-t2-car"):
                            solara.HTML(
                                tag="div",
                                unsafe_innerHTML=(
                                    '<div class="obs-section-head">'
                                    '  <h3 class="obs-section-title">3. Careers, Education &amp; Multi-Faceted Roles</h3>'
                                    '  <span class="obs-muted">Supports simultaneous occupations, specializations, institutional, social, narrative, and historical roles</span>'
                                    "</div>"
                                ),
                            )
                            with solara.Div(classes=["obs-form-grid"]):
                                solara.InputText(
                                    label="Primary Occupation (Main responsibility)",
                                    value=str(form.get("primary_occupation", "")),
                                    on_value=lambda v: update_field(
                                        "primary_occupation", v or ""
                                    ),
                                    continuous_update=True,
                                    dense=True,
                                )
                                solara.InputText(
                                    label="Formal / Sovereign Title (if applicable)",
                                    value=str(form.get("professional_title", "")),
                                    on_value=lambda v: update_field(
                                        "professional_title", v or ""
                                    ),
                                    continuous_update=True,
                                    dense=True,
                                )
                            with solara.Div(classes=["obs-form-grid"]):
                                solara.InputTextArea(
                                    label="Secondary Occupations (one per line — e.g. Choreographer, Café Owner, University Student)",
                                    value=str(form.get("secondary_occupations", "")),
                                    on_value=lambda v: update_field(
                                        "secondary_occupations", v or ""
                                    ),
                                    continuous_update=True,
                                    rows=2,
                                )
                                solara.InputTextArea(
                                    label="Specializations (Areas of expertise)",
                                    value=str(form.get("specializations", "")),
                                    on_value=lambda v: update_field(
                                        "specializations", v or ""
                                    ),
                                    continuous_update=True,
                                    rows=2,
                                )
                                solara.InputTextArea(
                                    label="Institutional Roles (Positions within organizations)",
                                    value=str(form.get("institutional_roles", "")),
                                    on_value=lambda v: update_field(
                                        "institutional_roles", v or ""
                                    ),
                                    continuous_update=True,
                                    rows=2,
                                )
                                solara.InputTextArea(
                                    label="Social Affiliations (Communities, houses, social circles)",
                                    value=str(form.get("social_affiliations", "")),
                                    on_value=lambda v: update_field(
                                        "social_affiliations", v or ""
                                    ),
                                    continuous_update=True,
                                    rows=2,
                                )
                                solara.InputTextArea(
                                    label="Narrative Roles (Relevance to stories & cases)",
                                    value=str(form.get("narrative_roles", "")),
                                    on_value=lambda v: update_field(
                                        "narrative_roles", v or ""
                                    ),
                                    continuous_update=True,
                                    rows=2,
                                )
                                solara.InputTextArea(
                                    label="Historical Roles (Previous occupations & positions)",
                                    value=str(form.get("historical_roles", "")),
                                    on_value=lambda v: update_field(
                                        "historical_roles", v or ""
                                    ),
                                    continuous_update=True,
                                    rows=2,
                                )
                                solara.InputTextArea(
                                    label="Institutions & Employers",
                                    value=str(form.get("institutions", "")),
                                    on_value=lambda v: update_field(
                                        "institutions", v or ""
                                    ),
                                    continuous_update=True,
                                    rows=2,
                                )
                                solara.InputTextArea(
                                    label="Qualifications, Degrees & Clearances",
                                    value=str(form.get("qualifications", "")),
                                    on_value=lambda v: update_field(
                                        "qualifications", v or ""
                                    ),
                                    continuous_update=True,
                                    rows=2,
                                )

                    # TAB 3: Personality & Relationships
                    elif active_section == "Personality & Relationships":
                        with solara.Div(classes=["obs-surface-card"]).key("ed-t3-per"):
                            solara.HTML(
                                tag="div",
                                unsafe_innerHTML=(
                                    '<div class="obs-section-head">'
                                    '  <h3 class="obs-section-title">4. Personality &amp; Interests</h3>'
                                    '  <span class="obs-muted">Traits, motivations, hobbies, and personal preferences</span>'
                                    "</div>"
                                ),
                            )
                            with solara.Div(classes=["obs-form-grid"]):
                                solara.InputTextArea(
                                    label="Personality Traits & Tone",
                                    value=str(form.get("traits", "")),
                                    on_value=lambda v: update_field("traits", v or ""),
                                    continuous_update=True,
                                    rows=2,
                                )
                                solara.InputTextArea(
                                    label="Motivations & Current Concerns",
                                    value=str(form.get("motivations", "")),
                                    on_value=lambda v: update_field(
                                        "motivations", v or ""
                                    ),
                                    continuous_update=True,
                                    rows=2,
                                )
                                solara.InputTextArea(
                                    label="Hobbies & Pastimes",
                                    value=str(form.get("hobbies", "")),
                                    on_value=lambda v: update_field("hobbies", v or ""),
                                    continuous_update=True,
                                    rows=2,
                                )
                                solara.InputTextArea(
                                    label="Personal Preferences",
                                    value=str(form.get("preferences", "")),
                                    on_value=lambda v: update_field(
                                        "preferences", v or ""
                                    ),
                                    continuous_update=True,
                                    rows=2,
                                )

                        with solara.Div(classes=["obs-surface-card"]).key("ed-t3-rel"):
                            solara.HTML(
                                tag="div",
                                unsafe_innerHTML=(
                                    '<div class="obs-section-head">'
                                    '  <h3 class="obs-section-title">5. Relationships</h3>'
                                    '  <span class="obs-muted">Family, friends, coworkers, mentors, and case links</span>'
                                    "</div>"
                                ),
                            )
                            solara.InputTextArea(
                                label="Relationships (one entry per line)",
                                value=str(form.get("relationships", "")),
                                on_value=lambda v: update_field(
                                    "relationships", v or ""
                                ),
                                continuous_update=True,
                                rows=4,
                            )

                    # TAB 4: Daily Life & Entertainment
                    elif active_section == "Daily Life & Entertainment":
                        with solara.Div(classes=["obs-surface-card"]).key("ed-t4-day"):
                            solara.HTML(
                                tag="div",
                                unsafe_innerHTML=(
                                    '<div class="obs-section-head">'
                                    '  <h3 class="obs-section-title">6. Daily Life</h3>'
                                    '  <span class="obs-muted">Circadian schedule preset, recurring habits, and personal obligations</span>'
                                    "</div>"
                                ),
                            )
                            solara.Select(
                                label="Daily Schedule Preset",
                                values=list(SCHEDULE_PRESETS),
                                value=str(
                                    form.get(
                                        "schedule_preset", "Standard Civic Routine"
                                    )
                                ),
                                on_value=lambda v: update_field(
                                    "schedule_preset", v or "Standard Civic Routine"
                                ),
                                dense=True,
                            )
                            with solara.Div(
                                classes=["obs-form-grid"],
                                style={"marginTop": "12px"},
                            ):
                                solara.InputTextArea(
                                    label="Daily Habits & Routines",
                                    value=str(form.get("habits", "")),
                                    on_value=lambda v: update_field("habits", v or ""),
                                    continuous_update=True,
                                    rows=2,
                                )
                                solara.InputTextArea(
                                    label="Personal & Institutional Obligations",
                                    value=str(form.get("obligations", "")),
                                    on_value=lambda v: update_field(
                                        "obligations", v or ""
                                    ),
                                    continuous_update=True,
                                    rows=2,
                                )

                        with solara.Div(classes=["obs-surface-card"]).key("ed-t4-ent"):
                            solara.HTML(
                                tag="div",
                                unsafe_innerHTML=(
                                    '<div class="obs-section-head">'
                                    '  <h3 class="obs-section-title">7. Entertainment Profile</h3>'
                                    '  <span class="obs-muted">Music affinity, genres, favorite artists, and creative pursuits</span>'
                                    "</div>"
                                ),
                            )
                            solara.SliderInt(
                                label="Music & Live Entertainment Affinity (%)",
                                value=int(form.get("music_interest_pct", 50)),
                                min=0,
                                max=100,
                                step=1,
                                on_value=lambda v: update_field(
                                    "music_interest_pct", int(v)
                                ),
                            )
                            with solara.Div(classes=["obs-form-grid"]):
                                solara.InputTextArea(
                                    label="Music Tastes & Genres",
                                    value=str(form.get("music_tastes", "")),
                                    on_value=lambda v: update_field(
                                        "music_tastes", v or ""
                                    ),
                                    continuous_update=True,
                                    rows=2,
                                )
                                solara.InputTextArea(
                                    label="Favorite Artists & Performers",
                                    value=str(form.get("favorite_artists", "")),
                                    on_value=lambda v: update_field(
                                        "favorite_artists", v or ""
                                    ),
                                    continuous_update=True,
                                    rows=2,
                                )
                                solara.InputTextArea(
                                    label="Creative Interests & Disciplines",
                                    value=str(form.get("creative_interests", "")),
                                    on_value=lambda v: update_field(
                                        "creative_interests", v or ""
                                    ),
                                    continuous_update=True,
                                    rows=2,
                                )

                    # TAB 5: Simulation Settings
                    elif active_section == "Simulation Settings":
                        cls_val = str(
                            form.get("character_classification", "Ordinary citizen")
                        )
                        cls_desc = CLASSIFICATION_DESCRIPTIONS.get(cls_val, "")
                        with solara.Div(classes=["obs-surface-card"]).key("ed-t5-sim"):
                            solara.HTML(
                                tag="div",
                                unsafe_innerHTML=(
                                    '<div class="obs-section-head">'
                                    '  <h3 class="obs-section-title">8. Simulation Eligibility &amp; Behavior Settings</h3>'
                                    '  <span class="obs-muted">Determines whether and how this character participates in the living population</span>'
                                    "</div>"
                                ),
                            )
                            with solara.Div(classes=["obs-form-grid"]):
                                solara.Select(
                                    label="Character Classification",
                                    values=list(CHARACTER_CLASSIFICATIONS),
                                    value=cls_val,
                                    on_value=lambda v: update_field(
                                        "character_classification",
                                        v or "Ordinary citizen",
                                    ),
                                    dense=True,
                                )
                                solara.Select(
                                    label="Simulation Depth",
                                    values=list(SIMULATION_DEPTH_OPTIONS),
                                    value=str(
                                        form.get("simulation_depth", "Standard")
                                    ),
                                    on_value=lambda v: update_field(
                                        "simulation_depth", v or "Standard"
                                    ),
                                    dense=True,
                                )
                                solara.Select(
                                    label="Behavior Override",
                                    values=list(BEHAVIOR_OVERRIDE_OPTIONS),
                                    value=str(
                                        form.get(
                                            "behavior_override",
                                            "Auto (Classification Default)",
                                        )
                                    ),
                                    on_value=lambda v: update_field(
                                        "behavior_override",
                                        v or "Auto (Classification Default)",
                                    ),
                                    dense=True,
                                )

                            solara.Checkbox(
                                label="Eligible to participate in the autonomous living population",
                                value=bool(form.get("eligible_for_living_sim", True)),
                                on_value=lambda v: update_field(
                                    "eligible_for_living_sim", bool(v)
                                ),
                            )

                            solara.HTML(
                                tag="div",
                                unsafe_innerHTML=(
                                    f'<div class="obs-muted" style="margin-block:6px 12px;">'
                                    f"<strong>{html.escape(cls_val)}:</strong> {html.escape(cls_desc)} · "
                                    f"Baseline reason: {html.escape(citizen.eligibility_reason)}"
                                    f"</div>"
                                ),
                            )

                            solara.InputTextArea(
                                label="Reviewer / Commit Notes",
                                value=str(form.get("reviewer_notes", "")),
                                on_value=lambda v: update_field(
                                    "reviewer_notes", v or ""
                                ),
                                continuous_update=True,
                                rows=2,
                            )

                    # TAB 6: Review, Validation & Authoritative Commit
                    elif active_section == "Review & Commit":
                        with solara.Div(classes=["obs-surface-card"]).key("ed-t6-rev"):
                            v_badge = (
                                '<span class="obs-badge obs-badge-ok">✓ Schema &amp; Constraint Checks Passed</span>'
                                if validation["valid"]
                                else '<span class="obs-badge obs-badge-alert">⛔ Validation Errors</span>'
                            )
                            solara.HTML(
                                tag="div",
                                unsafe_innerHTML=(
                                    '<div class="obs-section-head">'
                                    "  <div>"
                                    '    <h3 class="obs-section-title">Pre-Commit Validation &amp; Authoritative Diff</h3>'
                                    '    <p class="obs-section-desc">'
                                    "      Compares proposed edits against authoritative <code>miraverse.db</code> records. "
                                    "      Once committed, changes are written into <code>miraverse.db</code> and removed from temporary staging."
                                    "    </p>"
                                    "  </div>"
                                    f"  {v_badge}"
                                    "</div>"
                                ),
                            )

                            if validation["errors"]:
                                err_items = "".join(
                                    f"<li>{html.escape(e)}</li>"
                                    for e in validation["errors"]
                                )
                                solara.HTML(
                                    tag="div",
                                    unsafe_innerHTML=f'<div class="obs-banner-err"><ul>{err_items}</ul></div>',
                                )

                            if not validation["diffs"]:
                                solara.HTML(
                                    tag="div",
                                    unsafe_innerHTML=(
                                        '<div class="obs-empty-state">'
                                        "No pending differences relative to authoritative <code>miraverse.db</code>."
                                        "</div>"
                                    ),
                                )
                            else:
                                diff_rows = []
                                for ditem in validation["diffs"]:
                                    diff_rows.append(
                                        f'<div class="obs-diff-row">'
                                        f'  <div class="obs-diff-label">{html.escape(ditem["label"])}</div>'
                                        f'  <div class="obs-diff-before">{html.escape(ditem["before"])}</div>'
                                        f'  <div class="obs-diff-after">{html.escape(ditem["after"])}</div>'
                                        f"</div>"
                                    )
                                solara.HTML(
                                    tag="div",
                                    unsafe_innerHTML=(
                                        '<div class="obs-diff-table">'
                                        '  <div class="obs-diff-head">'
                                        "    <span>Attribute</span>"
                                        "    <span>Authoritative miraverse.db</span>"
                                        "    <span>Proposed Change</span>"
                                        "  </div>"
                                        + "".join(diff_rows)
                                        + "</div>"
                                    ),
                                )

                            solara.InputTextArea(
                                label="Approval / Commit Notes",
                                value=str(form.get("reviewer_notes", "")),
                                on_value=lambda v: update_field(
                                    "reviewer_notes", v or ""
                                ),
                                continuous_update=True,
                                rows=2,
                            )

                            with solara.Div(classes=["obs-editor-actions"]):
                                if not is_approved or has_unapproved_form_edits:
                                    solara.Button(
                                        label="✓ Validate & Mark Approved",
                                        color="primary",
                                        disabled=not validation["valid"]
                                        or not validation["diffs"],
                                        on_click=lambda: handle_stage("approved"),
                                        classes=["obs-btn-compact"],
                                    )
                                else:
                                    solara.Button(
                                        label="↑ Commit Approved Changes to miraverse.db",
                                        color="primary",
                                        disabled=not validation["valid"],
                                        on_click=handle_commit_single,
                                        classes=["obs-btn-compact"],
                                    )
                                if has_ov:
                                    solara.Button(
                                        label="✕ Discard Temporary Staged Draft",
                                        outlined=True,
                                        on_click=handle_discard,
                                        classes=["obs-btn-compact"],
                                    )
