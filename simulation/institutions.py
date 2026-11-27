"""Functional institutional systems for MiraverseOSx.

Provides:
- OR-Tools CP-SAT institutional shift, appointment, and workload scheduling.
- Transitions finite state machines for career, application, mission, contract,
  institutional request, and production lifecycles.
- ReportLab PDF generation for official contracts, reports, records, case files,
  financial statements, correspondence, and certificates integrated with Fylo,
  WORKNET, Document Studio, and VerseNet metadata.
"""
from __future__ import annotations

import base64
import copy
import io
import uuid
from datetime import datetime, timezone
from typing import Any

from ortools.sat.python import cp_model
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from transitions import Machine, MachineError


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ---------------------------------------------------------------------------
# OR-Tools: Staff Scheduling, Shifts, Appointments & Workload Balancing
# ---------------------------------------------------------------------------

class InstitutionalScheduler:
    """CP-SAT solver for conflict-free shift/appointment scheduling and fair workload."""

    @staticmethod
    def optimize_schedule(
        *,
        institution: str,
        staff_ids: list[str],
        slots: list[dict[str, Any]],
        unavailable: dict[str, list[str]] | None = None,
        max_slots_per_staff: int | None = None,
    ) -> dict[str, Any]:
        """Solve a conflict-free assignment of staff to time slots/appointments.

        Each slot dict: {"slotId": str, "label": str, "day": int, "period": str, "requiredStaff": int}
        Hard constraints:
        - Each slot meets its requiredStaff count (bounded by available staff).
        - No staff member is double-booked in the same (day, period).
        - Unavailable (staff_id -> list of slot_ids) are respected.
        - Optional max_slots_per_staff cap.
        Objective: minimize max workload minus min workload (balanced distribution).
        """
        staff = [str(s) for s in dict.fromkeys(staff_ids) if str(s).strip()]
        if not staff or not slots:
            return {
                "institution": institution,
                "status": "empty",
                "assignments": [],
                "workload": {},
                "conflictsResolved": 0,
            }

        unavail_map = {str(k): set(str(v) for v in vals) for k, vals in (unavailable or {}).items()}
        model = cp_model.CpModel()
        assign: dict[tuple[int, int], cp_model.IntVar] = {}
        for s_idx in range(len(staff)):
            for t_idx in range(len(slots)):
                assign[(s_idx, t_idx)] = model.NewBoolVar(f"a_{s_idx}_{t_idx}")

        # Respect unavailability
        for s_idx, sid in enumerate(staff):
            blocked = unavail_map.get(sid, set())
            for t_idx, slot in enumerate(slots):
                if str(slot.get("slotId") or t_idx) in blocked:
                    model.Add(assign[(s_idx, t_idx)] == 0)

        # No double-booking in identical (day, period)
        period_groups: dict[tuple[int, str], list[int]] = {}
        for t_idx, slot in enumerate(slots):
            key = (int(slot.get("day", 0)), str(slot.get("period", f"slot-{t_idx}")))
            period_groups.setdefault(key, []).append(t_idx)
        for s_idx in range(len(staff)):
            for t_indices in period_groups.values():
                if len(t_indices) > 1:
                    model.Add(sum(assign[(s_idx, t)] for t in t_indices) <= 1)

        # Meet slot staffing requirements
        for t_idx, slot in enumerate(slots):
            req = max(1, min(len(staff), int(slot.get("requiredStaff", 1))))
            model.Add(sum(assign[(s_idx, t_idx)] for s_idx in range(len(staff))) == req)

        # Workload bounds & equity objective
        loads = [model.NewIntVar(0, len(slots), f"load_{s_idx}") for s_idx in range(len(staff))]
        for s_idx in range(len(staff)):
            model.Add(loads[s_idx] == sum(assign[(s_idx, t_idx)] for t_idx in range(len(slots))))
            if max_slots_per_staff is not None:
                model.Add(loads[s_idx] <= max(1, int(max_slots_per_staff)))

        max_load = model.NewIntVar(0, len(slots), "max_load")
        min_load = model.NewIntVar(0, len(slots), "min_load")
        model.AddMaxEquality(max_load, loads)
        model.AddMinEquality(min_load, loads)
        model.Minimize(max_load - min_load)

        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 2.0
        status = solver.Solve(model)
        status_name = solver.StatusName(status)

        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            return {
                "institution": institution,
                "status": status_name.lower(),
                "assignments": [],
                "workload": {sid: 0 for sid in staff},
                "conflictsResolved": 0,
            }

        assignments: list[dict[str, Any]] = []
        workload = {sid: 0 for sid in staff}
        for t_idx, slot in enumerate(slots):
            assigned_staff = []
            for s_idx, sid in enumerate(staff):
                if solver.Value(assign[(s_idx, t_idx)]) == 1:
                    assigned_staff.append(sid)
                    workload[sid] += 1
            assignments.append(
                {
                    "slotId": str(slot.get("slotId") or f"slot-{t_idx}"),
                    "label": str(slot.get("label") or f"Shift {t_idx + 1}"),
                    "day": int(slot.get("day", 0)),
                    "period": str(slot.get("period", f"slot-{t_idx}")),
                    "assignedStaff": assigned_staff,
                }
            )

        overlap_groups = sum(1 for g in period_groups.values() if len(g) > 1)
        return {
            "institution": institution,
            "status": status_name.lower(),
            "assignments": assignments,
            "workload": workload,
            "workloadSpread": int(solver.Value(max_load) - solver.Value(min_load)),
            "conflictsResolved": overlap_groups,
            "solvedAt": _now_iso(),
        }


# ---------------------------------------------------------------------------
# Transitions: Authoritative Institutional State Machines
# ---------------------------------------------------------------------------

WORKFLOW_DEFINITIONS: dict[str, dict[str, Any]] = {
    "career": {
        "states": ["applicant", "onboarded", "active", "senior", "lead", "executive", "resigned"],
        "initial": "applicant",
        "transitions": [
            {"trigger": "hire", "source": "applicant", "dest": "onboarded"},
            {"trigger": "activate", "source": "onboarded", "dest": "active"},
            {"trigger": "promote_senior", "source": "active", "dest": "senior"},
            {"trigger": "promote_lead", "source": "senior", "dest": "lead"},
            {"trigger": "promote_executive", "source": "lead", "dest": "executive"},
            {"trigger": "resign", "source": ["onboarded", "active", "senior", "lead", "executive"], "dest": "resigned"},
        ],
    },
    "application": {
        "states": ["draft", "submitted", "under_review", "interview", "offered", "accepted", "rejected", "withdrawn"],
        "initial": "draft",
        "transitions": [
            {"trigger": "submit", "source": "draft", "dest": "submitted"},
            {"trigger": "review", "source": "submitted", "dest": "under_review"},
            {"trigger": "invite_interview", "source": "under_review", "dest": "interview"},
            {"trigger": "extend_offer", "source": ["under_review", "interview"], "dest": "offered"},
            {"trigger": "accept", "source": "offered", "dest": "accepted"},
            {"trigger": "reject", "source": ["submitted", "under_review", "interview", "offered"], "dest": "rejected"},
            {"trigger": "withdraw", "source": ["draft", "submitted", "under_review", "interview", "offered"], "dest": "withdrawn"},
        ],
    },
    "mission": {
        "states": ["available", "assigned", "in_progress", "review", "completed", "failed"],
        "initial": "available",
        "transitions": [
            {"trigger": "assign", "source": "available", "dest": "assigned"},
            {"trigger": "start", "source": "assigned", "dest": "in_progress"},
            {"trigger": "submit_review", "source": "in_progress", "dest": "review"},
            {"trigger": "complete", "source": ["in_progress", "review"], "dest": "completed"},
            {"trigger": "fail", "source": ["assigned", "in_progress", "review"], "dest": "failed"},
        ],
    },
    "contract": {
        "states": ["draft", "proposed", "negotiated", "active", "completed", "terminated", "expired"],
        "initial": "draft",
        "transitions": [
            {"trigger": "propose", "source": "draft", "dest": "proposed"},
            {"trigger": "negotiate", "source": "proposed", "dest": "negotiated"},
            {"trigger": "approve", "source": ["proposed", "negotiated"], "dest": "active"},
            {"trigger": "complete", "source": "active", "dest": "completed"},
            {"trigger": "terminate", "source": ["proposed", "negotiated", "active"], "dest": "terminated"},
            {"trigger": "expire", "source": "active", "dest": "expired"},
        ],
    },
    "request": {
        "states": ["submitted", "triaged", "approved", "denied", "fulfilled"],
        "initial": "submitted",
        "transitions": [
            {"trigger": "triage", "source": "submitted", "dest": "triaged"},
            {"trigger": "approve", "source": "triaged", "dest": "approved"},
            {"trigger": "deny", "source": ["submitted", "triaged"], "dest": "denied"},
            {"trigger": "fulfill", "source": "approved", "dest": "fulfilled"},
        ],
    },
    "production": {
        "states": ["development", "pre_production", "production", "post_production", "released", "archived"],
        "initial": "development",
        "transitions": [
            {"trigger": "greenlight", "source": "development", "dest": "pre_production"},
            {"trigger": "begin_production", "source": "pre_production", "dest": "production"},
            {"trigger": "wrap_production", "source": "production", "dest": "post_production"},
            {"trigger": "release", "source": "post_production", "dest": "released"},
            {"trigger": "archive", "source": "released", "dest": "archived"},
        ],
    },
}


class _WorkflowHolder:
    def __init__(self, state: str):
        self.state = state


def transition_workflow(
    model: Any,
    *,
    workflow_id: str | None,
    domain: str,
    trigger: str | None = None,
    subject_id: str = "",
    institution: str = "",
    title: str = "",
    actor_id: str = "",
) -> dict[str, Any]:
    """Create or advance an institutional Transitions state machine persisted in run extensions."""
    domain_key = str(domain or "").casefold().strip()
    if domain_key not in WORKFLOW_DEFINITIONS:
        raise ValueError(f"Unsupported workflow domain: {domain!r}")
    spec = WORKFLOW_DEFINITIONS[domain_key]
    workflows: list[dict[str, Any]] = model._extensions.setdefault("institutional_workflows", [])

    record = next((w for w in workflows if workflow_id and w.get("workflowId") == workflow_id), None)
    if record is None:
        record = {
            "workflowId": workflow_id or str(uuid.uuid4()),
            "domain": domain_key,
            "subjectId": str(subject_id),
            "institution": str(institution),
            "title": str(title or f"{domain_key.title()} Workflow"),
            "state": spec["initial"],
            "history": [{"from": None, "to": spec["initial"], "trigger": "init", "actor": actor_id, "at": _now_iso()}],
            "createdAt": _now_iso(),
            "updatedAt": _now_iso(),
        }
        workflows.append(record)

    if trigger:
        holder = _WorkflowHolder(record["state"])
        machine = Machine(
            model=holder,
            states=spec["states"],
            transitions=spec["transitions"],
            initial=record["state"],
        )
        previous = holder.state
        try:
            machine.dispatch(trigger)
        except (MachineError, AttributeError) as exc:
            raise ValueError(f"Invalid transition {trigger!r} from state {previous!r} in {domain_key}") from exc
        if holder.state == previous:
            raise ValueError(f"Transition {trigger!r} is not permitted from state {previous!r} in {domain_key}")
        record["state"] = holder.state
        record["updatedAt"] = _now_iso()
        record.setdefault("history", []).append(
            {"from": previous, "to": holder.state, "trigger": trigger, "actor": actor_id, "at": _now_iso()}
        )

    return copy.deepcopy(record)


def list_workflows(model: Any) -> dict[str, Any]:
    return {"workflows": copy.deepcopy(model._extensions.get("institutional_workflows", []))}


# ---------------------------------------------------------------------------
# ReportLab: Official Document & PDF Generation (Fylo / WORKNET / Doc Studio)
# ---------------------------------------------------------------------------

DOCUMENT_TYPES: tuple[str, ...] = (
    "employment_contract",
    "institutional_report",
    "official_correspondence",
    "government_record",
    "case_documentation",
    "financial_statement",
    "certificate",
)


def generate_official_pdf(
    *,
    doc_type: str,
    title: str,
    institution: str,
    recipient_name: str,
    recipient_id: str = "",
    body_lines: list[str] | None = None,
    table_rows: list[list[str]] | None = None,
    reference_code: str | None = None,
    world_date: str = "",
) -> dict[str, Any]:
    """Render an official MiraverseOSx PDF via ReportLab and return bytes + Fylo/DocStudio metadata."""
    kind = str(doc_type or "institutional_report").casefold().strip()
    if kind not in DOCUMENT_TYPES:
        raise ValueError(f"Unsupported document type: {doc_type!r}")

    ref = reference_code or f"MRV-{kind[:4].upper()}-{uuid.uuid4().hex[:8].upper()}"
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=letter,
        leftMargin=0.8 * inch,
        rightMargin=0.8 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
        title=title,
        author=institution,
    )
    styles = getSampleStyleSheet()
    header_style = ParagraphStyle(
        "MiraverseHeader",
        parent=styles["Heading1"],
        fontSize=15,
        textColor=colors.HexColor("#241620"),
        spaceAfter=6,
    )
    meta_style = ParagraphStyle(
        "MiraverseMeta",
        parent=styles["Normal"],
        fontSize=9,
        textColor=colors.HexColor("#5a6480"),
        spaceAfter=10,
    )
    body_style = ParagraphStyle(
        "MiraverseBody",
        parent=styles["Normal"],
        fontSize=10.5,
        leading=15,
        spaceAfter=8,
    )

    story: list[Any] = [
        Paragraph(f"{institution} — Official {kind.replace('_', ' ').title()}", header_style),
        Paragraph(
            f"<b>Title:</b> {title}<br/>"
            f"<b>Reference:</b> {ref} &nbsp;|&nbsp; <b>Recipient:</b> {recipient_name}"
            + (f" ({recipient_id})" if recipient_id else "")
            + (f" &nbsp;|&nbsp; <b>World Date:</b> {world_date}" if world_date else ""),
            meta_style,
        ),
        Spacer(1, 0.1 * inch),
    ]

    for line in (body_lines or ["Official record issued through MiraverseOSx authoritative institutional services."]):
        story.append(Paragraph(str(line), body_style))

    if table_rows:
        story.append(Spacer(1, 0.12 * inch))
        tbl = Table(table_rows, hAlign="LEFT")
        tbl.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2d2642")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cfd6ea")),
                    ("FONTSIZE", (0, 0), (-1, -1), 9),
                    ("PADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        story.append(tbl)

    story.append(Spacer(1, 0.25 * inch))
    story.append(Paragraph(f"Verified Seal: {ref} · MiraverseOSx Canonical Document Pipeline", meta_style))

    doc.build(story)
    pdf_bytes = buf.getvalue()
    filename = f"{ref.lower()}.pdf"
    return {
        "documentId": ref,
        "docType": kind,
        "title": title,
        "institution": institution,
        "recipientName": recipient_name,
        "recipientId": recipient_id,
        "filename": filename,
        "mimeType": "application/pdf",
        "sizeBytes": len(pdf_bytes),
        "pdfBase64": base64.b64encode(pdf_bytes).decode("ascii"),
        "fyloMetadata": {
            "dir": "/documents",
            "origin": "institutional_pdf",
            "publisher": institution,
            "name": filename,
        },
        "generatedAt": _now_iso(),
    }
