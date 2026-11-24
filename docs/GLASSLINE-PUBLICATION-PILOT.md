# Glassline public-service pilot

This original MIRAVERSE implementation connects acceptance of `ms-shift-04` to WORKNET Field Bulletins, The Meridian (formerly Dispatch), public search and an eligible MAI.SPACE contact. No external implementation or new runtime dependency is used.

## Ownership

| Record | Authority |
| --- | --- |
| Procedure, verified outputs and accepted order | ActivityEngine and existing WORKNET actions |
| Compensation and career advancement | Existing WORKNET receipt/payment flow; publications never pay |
| Authorized public text | Authored Glassline release in WorldPublications |
| Saved article snapshot, original order reference and reaction receipt | `gameplay.worldPublications` in the ordinary OS save |
| Public narrative event | Stable `PUBLIC:<order ID>` event; private acceptance details remain separate |
| NPC identity | Existing canonical character registry and PEOPLE social mapping |
| Reaction delivery | Shared game tick subscription, independent of open windows |
| Illustration | Existing approved World Asset Library infrastructure asset |

Acceptance saves the public snapshot in the same transaction as the accepted order and compensation receipt. It requires all procedure outputs, a matching accepted order and the existing payment receipt. Repeated processing has no effect. A later repeatable shift gets its own order and release. Old saves gain an empty publication state; old event visibility remains private by default.

The news story and bulletin share saved public copy; private work text, pay details, personnel information and investigative causes are never interpolated. Public search requires explicit public visibility and an authorized summary. Changing the release template does not rewrite earlier saved editions. Public illustrations must be approved canonical assets and are labeled illustrations, with the current typographic fallback when unavailable.

## NPC policy

The first eligible reaction uses the existing Jeremie Belpois contact, resolved as `char-jeremie-belpois`. A confirmed friendship is required. Blocked, muted, committed or absent actors do not react. This pilot authors an afternoon/evening public-contact window; it does not infer employment or invent a person. At the first later game tick, a deterministic template is delivered once or a terminal skipped receipt is saved. Skipped reactions do not appear retrospectively after befriending or unblocking a contact. Notifications, posts and receipts are saved together. No reputation, credits or XP are issued for the reaction.

Paused play, rerenders and closed-game wall time do not advance this pilot. Explicit store hydration is excluded from clock processing. Existing DGAOS operational timing is separate.

## DGAOS timing inventory

The existing scheduler in `frontend/src/dgaos/lib/simulation/scheduler.ts` stores ISO wall-clock deadlines. `simulation-engine.ts` processes due events both during ticks and offline reconciliation. The mounted agency shell calls `runSimulationTick` every four seconds; `dga-store.ts` guards the live tick with world pause. Consequence-engine, reaction-engine and system-state schedule agency callbacks. Automatic response assignments also use ISO deadlines. These behaviors remain owned by DGAOS; converting them requires explicit rules for case deadlines and offline consequences. None is used to schedule the Glassline public reaction.

## Validation

`frontend/tests/world-publications.test.mjs` covers real six-stage acceptance, atomic release/payment, reloads, pauses, deterministic reactions, eligibility, private-data exclusion, malformed-save restoration and duplicate protection. Existing WORKNET, navigation, social, news, media and world-sync tests remain relevant. The broader roadmap's new asset pack, everyday needs, document/audio tools and larger economy/clinical systems are later milestones.

Verified November 24, 2026: all 360 frontend tests passed, TypeScript checking passed, and the production build succeeded. An isolated Playwright walkthrough (API requests stubbed, separate local storage) verified bulletin-to-article navigation, approved illustration, NPC delivery and reload counts of one story/post/receipt without browser errors. The resulting build was synchronized to both `wwwroot` and `bin/Debug/net8.0/wwwroot`; all 82 service-worker precache entries exist in both destinations. The verification script is `frontend/scripts/verify-glassline.mjs` and expects a local Vite server on port 4176; disable hot reload for a stable walkthrough when other chats are editing the same working tree.
