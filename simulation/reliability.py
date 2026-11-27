"""Simulation reliability layer: Pydantic v2 validation & DeepDiff state auditing."""
from __future__ import annotations

import copy
from datetime import datetime, timezone
from typing import Any, Literal

from deepdiff import DeepDiff
from pydantic import BaseModel, ConfigDict, Field, ValidationError, field_validator


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


# ---------------------------------------------------------------------------
# Pydantic v2 Validation Schemas (API, NPC Actions, Institutions, AI Envelopes)
# ---------------------------------------------------------------------------

class AssignCareerPayload(BaseModel):
    model_config = ConfigDict(extra="allow")
    characterId: str = Field(min_length=1, max_length=128)
    title: str = Field(min_length=1, max_length=160)
    employer: str = Field(default="", max_length=160)
    salary: float = Field(default=0.0, ge=0.0, le=1e12)
    salaryPeriod: Literal["daily"] = "daily"
    schedule: Literal["fixed", "flexible", "dynamic"] = "flexible"

    @field_validator("schedule", mode="before")
    @classmethod
    def _norm_schedule(cls, v: Any) -> str:
        return str(v or "flexible").casefold()


class TransactPayload(BaseModel):
    model_config = ConfigDict(extra="allow")
    characterId: str = Field(min_length=1, max_length=128)
    kind: str = Field(min_length=1, max_length=64)
    amount: float = Field(ge=-1e12, le=1e12)
    description: str = Field(default="", max_length=300)
    requestId: str | None = Field(default=None, min_length=1, max_length=120)

    @field_validator("amount")
    @classmethod
    def _non_zero(cls, v: float) -> float:
        if v == 0.0:
            raise ValueError("amount must be non-zero")
        return v


class AddRelationshipPayload(BaseModel):
    model_config = ConfigDict(extra="allow")
    fromCharacterId: str = Field(min_length=1, max_length=128)
    toCharacterId: str = Field(min_length=1, max_length=128)
    kind: str = Field(default="acquaintance", min_length=1, max_length=64)
    trust: float = Field(default=0.0, ge=0.0, le=100.0)
    affection: float = Field(default=0.0, ge=0.0, le=100.0)


class ScheduleSlotInput(BaseModel):
    slotId: str = Field(min_length=1, max_length=64)
    label: str = Field(default="Shift", max_length=120)
    day: int = Field(default=0, ge=0, le=10000)
    period: str = Field(default="morning", min_length=1, max_length=32)
    requiredStaff: int = Field(default=1, ge=1, le=50)


class ScheduleOptimizePayload(BaseModel):
    model_config = ConfigDict(extra="allow")
    institution: str = Field(min_length=1, max_length=160)
    staffIds: list[str] = Field(min_length=1, max_length=100)
    slots: list[ScheduleSlotInput] = Field(min_length=1, max_length=100)
    unavailable: dict[str, list[str]] = Field(default_factory=dict)
    maxSlotsPerStaff: int | None = Field(default=None, ge=1, le=100)


class WorkflowTransitionPayload(BaseModel):
    model_config = ConfigDict(extra="allow")
    workflowId: str | None = Field(default=None, max_length=128)
    domain: Literal["career", "application", "mission", "contract", "request", "production"]
    trigger: str | None = Field(default=None, max_length=64)
    subjectId: str = Field(default="", max_length=128)
    institution: str = Field(default="", max_length=160)
    title: str = Field(default="", max_length=160)
    actorId: str = Field(default="", max_length=128)


class DocumentGeneratePayload(BaseModel):
    model_config = ConfigDict(extra="allow")
    docType: Literal[
        "employment_contract",
        "institutional_report",
        "official_correspondence",
        "government_record",
        "case_documentation",
        "financial_statement",
        "certificate",
    ]
    title: str = Field(min_length=1, max_length=180)
    institution: str = Field(min_length=1, max_length=160)
    recipientName: str = Field(min_length=1, max_length=160)
    recipientId: str = Field(default="", max_length=128)
    bodyLines: list[str] = Field(default_factory=list, max_length=50)
    tableRows: list[list[str]] = Field(default_factory=list, max_length=40)


class ProceduralCitizenPayload(BaseModel):
    model_config = ConfigDict(extra="allow")
    count: int = Field(default=1, ge=1, le=10)
    realm: str | None = Field(default=None, max_length=64)
    seed: int | None = None


class NPCActionIntent(BaseModel):
    characterId: str = Field(min_length=1, max_length=128)
    activity: str = Field(min_length=1, max_length=80)
    reason: str = Field(min_length=1, max_length=120)
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)


class StructuredAIProposal(BaseModel):
    """Advisory-only validated AI output envelope — never mutates authoritative state directly."""
    model_config = ConfigDict(extra="forbid")
    proposalId: str = Field(min_length=1, max_length=128)
    intent: Literal["dialogue", "narrative_note", "career_suggestion", "social_hint"]
    characterId: str = Field(min_length=1, max_length=128)
    summary: str = Field(min_length=1, max_length=500)
    advisoryOnly: Literal[True] = True


def validate_payload(schema_cls: type[BaseModel], payload: dict[str, Any], model: Any | None = None, context: str = "") -> BaseModel:
    try:
        return schema_cls.model_validate(payload)
    except ValidationError as exc:
        msg = "; ".join(f"{'.'.join(str(x) for x in err['loc'])}: {err['msg']}" for err in exc.errors()[:4])
        if model is not None:
            record_validation_error(model, context or schema_cls.__name__, msg)
        raise ValueError(f"Validation failed ({context or schema_cls.__name__}): {msg}") from None


def record_validation_error(model: Any, context: str, message: str) -> None:
    errors: list[dict[str, Any]] = model._extensions.setdefault("validation_errors", [])
    errors.append({"context": context, "message": str(message)[:240], "at": _now_iso()})
    if len(errors) > 50:
        del errors[:-50]


# ---------------------------------------------------------------------------
# DeepDiff: World-State Auditing & Significant Change Tracking
# ---------------------------------------------------------------------------

class WorldStateAuditor:
    """Computes bounded DeepDiff summaries across simulation checkpoints."""

    @staticmethod
    def snapshot_summary(model: Any) -> dict[str, Any]:
        return {
            "day": int(model.world_clock.day_index),
            "tick": int(model.world_clock.tick_count),
            "citizens": {
                c.character_id: {
                    "activity": c.activity,
                    "balance": round(float(c.balance), 2),
                    "occupation": c.primary_occupation,
                }
                for c in model.living_agents
            },
            "institutions": {
                "artists": len(model._extensions.get("artists", [])),
                "staff": len(model._extensions.get("entertainmentStaff", [])),
                "workflows": len(model._extensions.get("institutional_workflows", [])),
                "concerts": len(model._extensions.get("concerts", [])),
                "releases": len(model._extensions.get("releases", [])),
            },
        }

    @staticmethod
    def diff_snapshots(before: dict[str, Any], after: dict[str, Any]) -> dict[str, Any]:
        diff = DeepDiff(before, after, ignore_order=True, significant_digits=2)
        summary: dict[str, Any] = {
            "fromTick": before.get("tick", 0),
            "toTick": after.get("tick", 0),
            "valuesChangedCount": len(diff.get("values_changed", {})),
            "itemsAddedCount": len(diff.get("dictionary_item_added", [])),
            "itemsRemovedCount": len(diff.get("dictionary_item_removed", [])),
            "sampleChanges": [],
            "at": _now_iso(),
        }
        for path, change in list(diff.get("values_changed", {}).items())[:8]:
            summary["sampleChanges"].append(
                {"path": str(path), "old": change.get("old_value"), "new": change.get("new_value")}
            )
        return summary

    @classmethod
    def record_diff(cls, model: Any, before: dict[str, Any], after: dict[str, Any]) -> dict[str, Any]:
        entry = cls.diff_snapshots(before, after)
        diffs: list[dict[str, Any]] = model._extensions.setdefault("state_diffs", [])
        diffs.append(entry)
        if len(diffs) > 30:
            del diffs[:-30]
        return copy.deepcopy(entry)
