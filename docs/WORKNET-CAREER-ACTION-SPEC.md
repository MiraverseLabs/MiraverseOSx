# MIRAVERSEOSX
## WORKNET, Career, Mission & Action Systems — Consolidated Design Decision Report (Working Draft 2.0)

### Part I. Established System Design
- **Activity Hierarchy:** Task, Quest, Mission, Adventure, Journey (independent scopes, not a forced sequence).
- **WORKNET Activity Categories:** Work Shifts, Special Assignments, Career Development, Field Operations, QUESTNOTICE.
- **Established Careers (9):** Archivist / Researcher, Systems Engineer, Council Diplomat, Enforcer / Guardian, Artist / Performer, Healer / Medical Support, Ecological Warden, Finance Clerk / Banking Support, QUESTNOTICE Odd Jobs.
- **Mission Action Vocabulary (16):** Observe, Interact, Collect, Communicate, Investigate, Analyze, Create, Modify, Transport, Navigate, Operate, Verify, Decide, Submit, Manage, Practice — mapped onto existing WORKNET mechanics (`evidence`, `documents`, `diagnostics`, `equipment`, `investigation`, `dialogue`, `logistics`, `creative`).
- **Hybrid Execution Modes (4):** Direct, Guided, Assisted, Delegated.
- **Hybrid Outcome Evaluation:** Separates (1) Action validity, (2) Result quality, (3) Objective satisfaction, and (4) Institutional acceptance.
- **Hybrid Objective Patterns (5):** Sequential, Alternative-path, Convergent, Conditional, Open-ended.
- **Session-Based Timing:** One authoritative world clock; simulation pauses when the game is closed.

### Part II. NPC Decision-Making
- **Six Elements:** Personal Context, Professional Context, Situational Awareness, Social Context, Current Needs & Commitments, Institutional Constraints.
- **Autonomy Contexts:** Routine, Situational, Supervised.
- **Hard Guardrail:** Urgency and personal preference never override institutional safety or authorization constraints.
- **Delegation Attribution:** Preserves `assignedBy`, `assigneeId` / `assigneeName`, submitted output, and `approvedBy`.

### Part III. Career Progression
- **Five Distinct Professional Dimensions:** Skills, Qualifications, Professional Experience, Employment Position (separated from Career Development Tier), and Institutional Reputation.
- **Progression Paths:** Specialist development, Supervisory development, Lateral movement, Independent professional development, Career transition.

### Part IV. Compensation Logic
- **Models:** Salaried, Hourly, Assignment-Based, Commission / Performance, Bonuses & Additional Payments.
- **Lifecycle Separation:** Work performed → Work accepted/verified → Pay earned → Payment issued (with strict duplicate-claim protection via receipt IDs and Oryn Department of Finance reconciliation).

### Implementation Reference
- Core shared engine: `frontend/src/gameplay/WorknetCoreSystems.ts`
- Stage action vocabulary mapping: `frontend/src/gameplay/ActivityEngine.ts` (`stageActionTypes`)
- Delegation attribution: `frontend/src/apps/worknet/workplaceModel.ts`
- Career Record 5-dimension UI: `frontend/src/apps/worknet/sections/WorknetCareerRecord.tsx`
- Unit tests: `frontend/tests/worknet-core-systems.test.mjs`
