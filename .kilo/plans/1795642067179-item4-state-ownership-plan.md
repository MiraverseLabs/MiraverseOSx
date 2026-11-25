# Item 4 — Player ↔ Living World State Ownership & Synchronization

## Context (verified)

Three separate state owners exist today:

- **Player gameplay (authoritative for the player):** `useOSStore.gameplay` — `player` (name, credits, bits, xp, level), `identity` (citizenId, canonicalPersonId), `timeSegmentIndex`, `timeCycleCount`. Persisted to `localStorage` key `miraverse-os-progress` and mirrored to the .NET `world-saves.db` via `WorldSyncClient` (`frontend/src/backend/worldSync.ts`), whose allowed keys include `miraverse-os-progress` (`WorldSaveApi.cs:16`).
- **Legacy duplicate:** `useGameStore` (`player`, `worldState`, `tickCount`) persisted to idb `miraverse_player_profile`; `EcosystemEngine`. Not authoritative; already bypassed by WORKNET rewards.
- **Living World (authoritative for NPC citizens):** Python `PopulationModel` per run — `WorldClock` (`elapsed_minutes`, `step_minutes` default 30, `tick_count`), citizen `balance`/`savings`/`employment`/`daily_schedule`/relationships, stored in `miraverse.db` (`LivingWorldRuns`/`LivingWorldTransactions`). Reached through the C# proxy `/api/livingworld/*` (`LivingWorldApi.cs`) → Python `living_world_api.py`.

There is **no player↔simulation link**: the player is not a citizen in any run, player time (segments/cycles) is unrelated to `WorldClock`, and player credits are unrelated to citizen balances.

Key API facts:
- `GET /runs` → `{ runs: [{ RunId, Name, UpdatedAt, Revision, Status, ... }] }`.
- `GET /runs/{id}` → `{ run, clock, date, transactions }`; run state citizens keyed by `character_id`.
- `POST /runs/{id}/advance` body `{ steps: 1..1440, expectedRevision? }` → `{ revision, clock, date }`; `409` on stale revision.
- `POST /finances` body `{ runId, characterId, kind, amount, description, requestId?, expectedRevision? }`; `requestId` makes retries idempotent; overdraft rejected.
- `GET /schedules?runId=...`.
- Proxy allows the Vite origin (`:3000`) and same-port origins, so the frontend can call `/api/livingworld/...` directly.

## Decisions (recommended defaults)

1. **Identity** — Player gameplay identity is authoritative for the player; AURA canonical identities are authoritative for issued citizen records; simulation citizens are authoritative for NPCs. A single **player-citizen link** binds the player to one *existing* simulation citizen:
   `gameplay.livingWorldLink = { runId, characterId, canonicalPersonId, displayName, creditMirrorRevision }`.
   No link ⇒ no synchronization (explicit, not implicit).
2. **Time** — Player time is authoritative for player-facing time; `WorldClock` is authoritative for world elapsed time. Mapping: **1 segment = 360 min**, `steps = round(360 / step_minutes)` (default 12). Player advance triggers `advance`; on load, reconcile (run ahead ⇒ adopt run time; run behind ⇒ advance run to match).
3. **Money** — Player credits are authoritative; the linked citizen's `balance` is a **one-way projection** (player → citizen). Credit deltas post a `finances` transaction `kind='player_mirror'` with an idempotent `requestId`; simulation balances are never read back into player credits (prevents split-brain).

## Out of scope

Retiring `useGameStore`, consolidating registries, orchestrator removal, and doc/tracker cleanup (review items 5–6).

## Tasks

### 1. Link module + mapping (new)
Create `frontend/src/integration/livingWorldLink.ts`:
- Types: `LivingWorldRun`, `LivingWorldLink`, `RunClock`.
- Fetch helpers over `/api/livingworld`: `listRuns()`, `getRun(runId)`, `advanceRun(runId, steps, expectedRevision?)`, `transact(runId, body)`, `listSchedules(runId)`; all tolerant of service-unavailable (return `null`/throw typed error).
- Pure mapping: `segmentsToSteps(stepMinutes)`, `stepsToSegments(stepMinutes, steps)`, `creditMirrorRequestId(link, cycle)`.
- `resolveActiveRun(link)`: use `link.runId` if set, else first `RunId` from `listRuns()`.
- `reconcileLink(link, gameplay)`: returns `{ timeSegmentIndex, timeCycleCount, creditBaseline }` from run clock + linked citizen balance.

### 2. Persist the link in player gameplay
In `useOSStore.ts`:
- Add `livingWorldLink: LivingWorldLink | null` to the initial `gameplay` (line ~961) and to the state interface.
- Add actions `linkLivingWorldCitizen(runId, characterId)` and `unlinkLivingWorldCitizen()`; link writes only `gameplay.livingWorldLink` (no new WorldSaveApi key; `miraverse-os-progress` stays an object).
- On `linkLivingWorldCitizen`, auto-fill `canonicalPersonId` from `gameplay.identity.canonicalPersonId` and set `creditMirrorRevision: 0`.

### 3. Time synchronization
In `useOSStore.ts`:
- After `advanceTime` (line ~1124) and `restInDorm` (line ~1154) compute next state, call a serialized `queueAdvanceLinkedRun(prevSegment, prevCycle, nextSegment, nextCycle)` (fire-and-forget; swallow errors; on `409` reload run once and retry).
- `queueAdvanceLinkedRun` reads `livingWorldLink`; if absent, no-op. Converts segment delta to steps via `segmentsToSteps` and calls `advanceRun`.

### 4. Money synchronization
In the `set` wrapper (lines ~302–308, where `journalBalanceChange` runs):
- Compare `prev.gameplay.player.credits` to `next.gameplay.player.credits`; if changed and a link exists, enqueue `mirrorCreditsDelta(delta, cycle)` (serialized with the advance queue).
- `mirrorCreditsDelta` posts `finances` with `kind:'player_mirror'`, `amount: delta`, `requestId: creditMirrorRequestId(link, cycle)`, then increments `creditMirrorRevision` in the link.
- Never apply a negative mirror that would overdraft the citizen; if rejected, record a pending baseline correction to apply on next reconcile.

### 5. Reconciliation on load
- Add `initializeLivingWorldLink()` in `livingWorldLink.ts` and call it after world sync start / login (in `osPersistence.ts` or the app bootstrap).
- If a link exists: `getRun`, reconcile player time from `clock`, and set the citizen balance baseline to player credits via a single `player_mirror` adjustment when `creditMirrorRevision === 0`.

### 6. Minimal link UI
- Add a small "Living World Link" panel (Citizen Hub or Observatory page) listing runs and their citizens; buttons to link/unlink and show status. No new subsystem.

### 7. Tests
- `frontend/tests/living-world-link.test.mjs` (node --test): `segmentsToSteps`/`stepsToSegments` (default 30 → 12; 60 → 6), `creditMirrorRequestId` idempotency, `reconcileLink` ahead/behind cases.
- Extend `simulation/tests/test_living_world_api.py` with a `player_mirror` transaction + `requestId` replay assertion (no Python production change needed).

### 8. Docs
- Update `simulation/README.md` "Data ownership" with: link object, time mapping (1 segment = 360 min), and money one-way projection rule.

## Risks

- Python service down ⇒ sync must degrade silently and retry; never block player actions.
- `409` revision conflicts ⇒ reload-and-retry once, then skip.
- Rounding when `step_minutes` ≠ 30 ⇒ use `round` and clamp `steps` to 1..1440.
- Money mirror rejection (overdraft) ⇒ keep player credits authoritative and re-baseline on next load.
- `miraverse-os-progress` shape change ⇒ additive field only; existing saves without the field default to `null`.

## Validation

- `npm run typecheck` (frontend) passes.
- `node --test frontend/tests/living-world-link.test.mjs` passes.
- Manual: link player to a run citizen, advance time, confirm `advance` called with correct steps and citizen balance mirrors credits; reload and confirm reconciliation.
- `python -m unittest discover -s simulation/tests -p 'test_*.py'` passes.

## Open Questions

- Approve money as one-way player→citizen projection (vs two-way ledger)?
- Approve auto-match by `canonicalPersonId` with manual fallback (vs always manual)?