# WORKNET data ownership and migration

Implemented November 24, 2026. Design authority: [WORKNET career/action specification](WORKNET-CAREER-ACTION-SPEC.md).

## Definition owners

`frontend/src/gameplay/GameplayRegistry.ts` exposes the definition graph and its reference validator. Runtime consumers import the smaller owning modules to avoid loading the entire graph or introducing dependency cycles. Definitions never contain player progress.

| Domain | Authoritative definition | Consumers / derived views |
| --- | --- | --- |
| Careers, station mapping, titles, relevant skills, qualification assignments, reputation keys, salary offers, development thresholds | `frontend/src/data/careers.json`, exposed by `CareerRegistry.ts` | Database facade, contract offers, career record, promotion titles, initial/admin player careers |
| Career qualification and promotion rules | `gameplay/WorldEventEngine.ts` `CAREER_TRACK_SPECS` | Promotion evaluation; titles and thresholds reference the career catalog directly |
| Mission metadata, tools, credits, bits and XP | `data/missions.json` and `data/broad-street-assignment.json`, combined once by `MissionCatalog.ts` | WORKNET, VerseNet jobs, assignment briefings, shared Process Monitor payout, database facade |
| Work procedures, stage validation, alternative approaches and linked activity objectives | `gameplay/ActivityEngine.ts` | Work orders, task receipts, clinical chart linking, case and diagnostic review, assignment board |
| Opportunity projections, dispatches and collectible unlock descriptions | `gameplay/AssignmentFlow.ts` | WORKNET, phone/email dispatch, Fylo briefings, browser postings |
| Discovery conditions and visibility | `gameplay/ProgressionEngine.ts` | Exploration and opportunity discovery; targets validated against the opportunity graph |
| Institutions, departments, staff roles, routine duties, delegation offers, schedules and workplace events | `gameplay/WorkplaceDefinitions.ts` | WORKNET screens, workplace model, autonomous simulation; `apps/worknet/worknetData.ts` is a compatibility re-export |
| NPC identity and authored professional profiles | `game-content/characters/collections/INSTITUTIONAL_REGISTRY` and its character profile sources | Workplace definitions reference existing canonical character records rather than copying identities |
| Work clock, work-order identity and colleague availability | `gameplay/WorkSchedule.ts` | Work-order actions, workplace delegation, NPC background simulation, schedule projections |
| Payroll rates, levy and receipt lookup | `gameplay/WorkRewards.ts` | Payroll, partial settlements, mission and diagnostic finalization |
| Hybrid action outcome and compensation calculations | `gameplay/WorknetCoreSystems.ts` | Work stages, NPC decisions and payroll |

Paths without a prefix in this table are relative to `frontend/src/`.

## Live-state owners

The persisted `useOSStore` world owns player careers, contracts, orders, task outputs, completion IDs, assignment/discovery journals, compensation receipts and `player.worknetWorkplace`. `worknetSim` owns background workload, NPC professional experience, peer bonds, payroll obligations and career history. Workplace social stats, leave, allocations and delegated dockets live in `player.worknetWorkplace`; background simulation now reads that same state instead of the unused `player.workplace` field.

`WorknetPersistence.ts` runs during OS hydration. Existing world-save and portable-backup infrastructure already transports the OS save together with the separate DGAOS, TRACE, communications and document records; no backend schema change is required.

## Conflicts resolved

1. **Career IDs and titles:** `dga` is canonical for Enforcer / Guardian; `enforcer` remains an input/save alias. Station aliases map `faithmed` to `medical` and `archives` to `archivist`. The previously active progression titles win over the older catalog titles. New initial and admin careers are generated from this catalog. Employment position remains the signed organizational title, independent of career development tier.
2. **Pay offers versus signed terms:** new offers use the nine numerical catalog salaries (100–250 credits per cycle). Existing contracts retain their saved salary; contracts predating the numerical field retain the former 150-credit terms. Routine and delegated rewards are numerical fields; their descriptions are generated. Department merit/funds stay departmental. Accepted delegated stage outputs preserve assigner, colleague, submitted output and reviewer attribution; the same colleague cannot be selected while holding an open departmental docket.
3. **Scheduling:** one session clock produces four work segments per cycle. Suggested shifts reference authored assignment IDs and expose numerical start ticks. Their displayed cycle/segment and acceptance status derive from the clock and saved orders. Leave remains flexible with no absence penalty. Workplace state initializes on simulation sync even when WORKNET is closed. NPC availability and open commitments are shared by delegation, stage-mode selection and background work; urgency cannot double-book an actor.
4. **Procedures and objectives:** metadata and procedures remain separately authored, joined by assignment ID. Registry checks cover duplicate mission IDs, career references, numeric rewards, procedure/stage IDs, choices, milestone references, chapter predecessors, qualification assignments, staff, leave, schedules, domain procedures, dispatches and discovery targets.
5. **Compensation and XP:** career summaries read `player.careers[track].xp`, relevant skills and distinct completions for that career. Global XP is no longer professional expertise. Career qualification counts use qualifying assignments and explicitly career-tagged certificates. Mission payout takes its amount and track from the catalog, including Process Monitor sign-off. Existing clinical payment linking remains intact.
6. **Applications:** the database facade now returns the same catalog objects as mission execution. Existing WORKNET, VerseNet, Fylo and diagnostic consumers keep their APIs. The schedule opens its linked assignment. DGAOS/TRACE continue using the OS player for authority and the shared diagnostic/case flows for WORKNET work; their agency case libraries, operational roles and examination records retain domain ownership.
7. **Persistence:** alias migration keeps the maximum earned rank/XP rather than adding duplicate progress, retains signed positions and pay, preserves evidence and receipts, and seeds salary receipts from historical claims. Repeat migration is idempotent. Duplicate saved payroll claim IDs collapse with issued receipts taking precedence.

## Receipt and payroll rules

- Assignment payments retain `WORK:<mission>:<cycle|once>` identity. Existing `rewardedWorkOrderIds` remains readable; `compensationReceiptIds` also records current entitlements.
- Salary uses `SALARY:<career>:<cycle>` independently of contract lifetime, preventing a same-cycle resignation/rehire payout. Skipped cycles are not backpaid.
- Hourly pay uses a shared `HOURLY:player:<tick>` receipt for each elapsed session segment at the central 40-credit rate. Caller-supplied rates cannot change compensation. The same player segment cannot be claimed at two employers. This remains an explicitly logged time model; it does not infer attendance from wall-clock time.
- Partial settlement earns 35 credits per recorded, unpaid stage before the payroll levy. Closing settles that order identity, including when it produces no payable; it cannot reopen as a second paid order in that cycle. A repeatable shift can open in a later cycle with a fresh identity.
- Hourly and partial obligations retain the earned → issued ledger and 5% civic levy. Salary and assignment receipts record immediate issuance. Credits and the corresponding issued receipt are committed together. XP follows successful acceptance, protected by the order receipt.

## Authoring pipeline and boundaries

The legacy SQLite `Careers` and `Missions` schemas are not the playable WORKNET schema. On Windows, their exported `Careers.json` / `Missions.json` names would collide with authored lowercase catalogs. `scripts/build_data.py` now writes those raw tables under `data/generated/sqlite/` and builds the combined world's career view from the authored catalog. Its isolated regression test verifies that neither authored catalog is overwritten.

`MissionDirector.ts` generates operation previews rather than playable WORKNET assignments. Separate DGAOS agency cases and TRACE examination libraries are domain records, not duplicate employment or payout catalogs. This change does not turn previews, every agency case, or unpaid routine-duty descriptions into new reward-bearing missions. Institutions still carry presentation metadata beside their professional definitions; the compatibility re-export permits a future styling-only split without moving data ownership back into an app.

## Validation

Run `npm run typecheck --prefix frontend`, `npm test --prefix frontend`, and `python -m unittest discover -s scripts -p test_worknet_data_ownership.py`.

`frontend/tests/gameplay-registry.test.mjs` validates the real definition graph and intentional broken references, scoped career evaluation, legacy migration, shared NPC commitments/leave, structured rewards, linked schedule projections, invalid compensation inputs, duplicate payroll recovery, all nine contracts, salary rehire protection, hourly overlap protection, and partial-settlement receipt hydration. Existing mission, clinical, diagnostic, career, oversight and whole-world save tests cover participating applications. Final checks passed: 347 frontend tests, TypeScript checking, the isolated Python exporter test, and a Vite production build to a temporary output directory. Live browser visual review was not performed; build warnings report large existing application chunks.
