# MIRAVERSE resource integration plan

Prepared November 24, 2026 from the supplied resource inventory, current source inspection, and selected upstream project/license checks. This is a proposed roadmap, not a record of completed integrations. No dependencies are installed by this plan.

## Recommended outcome

Build a more inhabited Meridion by connecting the existing character, workplace, social, news, and media systems. First demonstrate one complete chain: an accepted Glassline relay repair produces an authorized public service update, a small NPC reaction, and a consistent article across the desktop, including after a save reload.

Use the current React/TypeScript and .NET architecture, local saves, game clock, canonical identities, and existing compensation receipts. Preserve authored geography, characters, qualifications, and institutional permissions. The first milestone needs no new runtime library or model API.

## Implementation policy — clarified by the user

Recreate the desired mechanics and features as original MIRAVERSE implementations. External projects provide design references; they are not starting codebases to transplant, fork into the game, or bulk-download.

- Begin with the intended player experience, observable behavior, and the existing MIRAVERSE data/services.
- Describe the mechanic in a project-specific feature brief, then implement and test it in the existing architecture.
- Consult an external source only when a specific unresolved technical or behavioral question makes that useful. Keep the investigation narrow and record the conclusion.
- Do not copy external implementations, sample content, identities, schemas, or presentation wholesale. Similar mechanics do not imply identical balancing, data structures, art, or terminology.
- Keep existing general-purpose libraries. Later specialist-library candidates in this document remain evaluation options, not automatic downloads or installations; distinguish using a library from copying another game's feature implementation.
- The bulk source-fetch attempt was stopped after this clarification. An ignored TownBox reference checkout may be partial; it is not integrated into application code.

## 1. Repository audit

These are source-level findings from targeted inspection, not an exhaustive runtime audit or new test run.

| Inventory area | Current foundation | Priority and useful addition |
| --- | --- | --- |
| World simulation and NPC behavior | `WorknetSimulation`, `WorkSchedule`, professional decision evaluation, canonical character registry; separate DGAOS scheduler, reaction and simulation engines | Highest: shared identity/time contracts and explicit connections between existing simulations; later add household needs and routines |
| Social media | MAI.SPACE has profiles, posts, groups, albums, comments, events, audiences and local media. `npcReactivity` already produces template/personality-based reactions | Highest: react to relevant world events using known identities and visibility, with reproducible decisions and persistent duplicate protection |
| News and publications | Dispatch has authored stories and a cycle/corruption-dependent advisory; existing library, editors, document views and publication boundaries | High: persist event-derived editions with source references and approved images; keep saved stories stable |
| Careers, institutions and economy | Career/mission catalogs, employment contracts, work orders, payroll, departmental budgets and completion receipts already exist | High: route new simulation outcomes through current services; add household/business simulation only after the event pilot works |
| Healthcare and investigations | Faith Medical, VITALS, clinical task receipts, DGAOS/TRACE case workflows, evidence boards and original-source readers | Medium: richer synthetic scenario fixtures and specialist PDF/audio tools, preserving clinical and case ownership |
| Images and environments | World Asset Library, entity catalogs, brand kits, approval/provenance fields, runtime media API, plus existing public images and new Aureline wallpapers | Highest: populate and consistently consume this library; expand its provenance rather than creating another media registry |
| Technical libraries | React Flow, Tiptap, Framer Motion, Phaser, Recharts, Embla, drag-and-drop, date-fns and React Day Picker are installed | Reuse first; add one specialist dependency only when an acceptance case demonstrates a capability gap |
| Creative production | Brand tokens and media slots already provide destinations for original art and exported designs | High: produce a small coherent asset collection tied to existing people, places and organizations |
| Uploaded visual references | Inventory describes style/material references; the actual referenced collections are not supplied here | Reference only; do not treat their artwork, screenshots or colors as automatically licensed or approved canon |
| Additional games and experiences | Current shell, mission procedures and agency apps already own playable behavior; `MissionDirector` explicitly describes operation previews | Study interaction patterns and author new MIRAVERSE scenarios; do not import entire games as competing simulation engines |

Important owners inspected include `frontend/src/gameplay/WorknetSimulation.ts`, `frontend/src/gameplay/WorkSchedule.ts`, `frontend/src/game-content/characters/registry.ts`, `frontend/src/apps/social/socialModel.ts`, `frontend/src/apps/social/npcReactivity.ts`, `frontend/src/apps/Browser/news/newsModel.ts`, `frontend/src/game-content/worldAssetLibrary.ts`, `MediaAssetApi.cs`, and DGAOS's simulation/scheduler modules. The existing [WORKNET ownership report](WORKNET-DATA-OWNERSHIP.md) remains applicable.

### Concrete gaps to resolve

- **Timing:** WORKNET advances on four game segments per cycle; DGAOS schedules events against wall-clock timestamps. Preserve display timestamps, but give shared gameplay consequences an explicit game-tick boundary. Audit case-specific delayed callbacks before changing their semantics.
- **Reproducibility:** some existing social reactions use `Math.random()`. New cross-app reactions must use a seed derived from stable event/actor IDs and persist their delivery receipts.
- **Public knowledge:** existing world narrative records have category, summary, institution and optional citizen references, but do not establish a general public-release contract. Public projections need an explicitly authored release summary.
- **Media ownership:** the asset library and .NET media API already exist, while social audio/images also have an IndexedDB path. Keep these responsibilities explicit and verify backup behavior; do not assume every media blob is in an ordinary world backup.
- **Identity:** canonical character IDs and legacy social/agency keys coexist. Resolve links through the existing registry. Never merge two similarly named people or issue new MAIDs as a side effect of media or simulation import.

## 2. External resource decisions

The projects below are identified candidates. Where the original inventory lacked a URL, the identified project is a proposed match rather than proof of what an earlier screenshot showed. Licenses describe the checked upstream source; selected release files, bundled media, dependencies and notices must also be checked before copying.

| Resource | Verified source / license | Decision |
| --- | --- | --- |
| TownBox | [Repository](https://github.com/Maudfer/townBox), [MIT license](https://github.com/Maudfer/townBox/blob/main/LICENSE) | Mechanics reference for people, households and event histories. Recreate needed behavior with MIRAVERSE IDs and session time; consult source only for a specific unresolved question |
| Vice Social | [Repository](https://github.com/codewithnuh/vice_social) | Interaction reference for local social feedback. No reusable-code license was verified in this review; do not copy code or GTA-related sample assets |
| daedalOS | [Repository](https://github.com/dustinbrett/daedalOS), [MIT license](https://github.com/dustinbrett/daedalOS/blob/main/LICENSE) | Reference for OS interactions and file handling. Extend MIRAVERSE's existing shell |
| LeafThrough | [Repository and MIT license](https://github.com/dmtrbrl/leafthrough) | Later, isolated React publication prototype. Its three.js-based presentation must retain an accessible reading mode and reduced-motion alternative |
| PDF.js | [Project](https://github.com/mozilla/pdf.js), [Apache-2.0 license](https://github.com/mozilla/pdf.js/blob/master/LICENSE) | First specialist document candidate when actual multipage PDF reading, text selection or search is required; lazy-load its worker/viewer |
| WaveSurfer.js | [Project](https://github.com/katspaugh/wavesurfer.js), [BSD-3-Clause license](https://github.com/katspaugh/wavesurfer.js/blob/main/LICENSE) | Later audio-evidence prototype: waveform, timestamps and transcript links. Existing music playback remains with the current player |
| Faker | [Project](https://github.com/faker-js/faker), [MIT license](https://github.com/faker-js/faker/blob/next/LICENSE) | Development-only, seeded fixtures for unnamed background citizens/businesses. Generated fixtures never overwrite authored identities or runtime saves |
| FullCalendar | [Official licensing](https://fullcalendar.io/license) | Later Standard-only calendar prototype if current date-picker/list views cannot express the required schedule. Standard is MIT; Premium has separate terms. Calendar is a view over game-time scheduling, never its authority |
| Synthea | [Project](https://github.com/synthetichealth/synthea), [Apache-2.0 license](https://github.com/synthetichealth/synthea/blob/master/LICENSE) | Offline synthetic-record/test-fixture generator. Import only reviewed fields through a MIRAVERSE adapter; authored fictional illnesses and patient workflows remain authoritative |
| OASIS | [Project](https://github.com/camel-ai/oasis), [Apache-2.0 license](https://github.com/camel-ai/oasis/blob/main/LICENSE) | Optional research sandbox. Its Python/model-backed workflow should not become a requirement for desktop gameplay or the first pilot |
| AzuraCast | [Project and AGPL-3.0 license](https://github.com/AzuraCast/AzuraCast) | Defer the self-hosted broadcast service. First author local station schedules, clips and announcements using existing audio playback |

### Visual assets: correction and acquisition policy

- **VN Background Photos:** a likely match is Andrea “Jens” Demetrio's pack. The [author's release notice](https://andreajens.itch.io/vn-reference-photos-pack/devlog/1487952/a-free-pack-of-200-pictures-for-everyone-to-use) specifies CC BY 4.0 and gives a picture-title/creator attribution format. Record that credit, source and any modifications per selected image. Check visual consistency with the celestial setting before approval.
- **Modern City Background Pack:** the identified [FlameFoxGames pack](https://flamefoxgames.itch.io/modern-city-background-pack) states custom terms allowing commercial/project use while restricting direct asset resale; it discloses AI-assisted production. Do not label it CC BY 4.0. Confirm this is the intended pack before acquiring it.
- **Modern Portraits, City Life 01, Hospital and Clinic Background Pack, Workplace Backgrounds:** original creator/download identity remains unverified. Hold these packs until exact pages and included license/readme files are identified. Matching a generic title is insufficient.
- Original generated artwork and newly commissioned material also receive asset records, provenance and visual QA. Existing Aureline concepts are appearance references; they do not redefine geography or name new landmarks.

### Remaining inventory disposition

- **Further identification required:** Digital World Simulation, Scheduled NPC Interaction System, Dead Internet, Godot Simulation Plugins, ALife SDK, MockSocial, OpenPost, Open Mock, Vael Paper, The Lamplighter, CongressFish, Business Tycoon, SimDev, Libreconomy, Township, MineWorld, ICTHospital, MINDTRACE AI, Storie Engine, The 8th Hour and Music Industry Simulator. These names are not approved dependencies. A possible [Murmur project](https://github.com/codejunkie99/murmur) was located, but its match to the original reference and its reuse terms need confirmation.
- **Later specialist evaluation:** Fabric.js, Photo Sphere Viewer, Pannellum, SurveyJS, JSON Forms, Tracery, GrapesJS, Video.js, MapLibre GL JS and Cytoscape.js. None is needed for the first event pilot. Select one panorama viewer, one form approach or one relationship-graph tool only after documenting a concrete gap in existing components.
- **Separate service/data integrations:** Navidrome, MusicBrainz Server, OpenBroadcaster and OpenTimelineIO require individually scoped media workflows. Start with fictional local media and the current player before introducing service infrastructure or external catalogs.
- **Production tools, not game dependencies:** Figma, Figma Community, Canva, Pinterest, the wireframe kit and Figma Weave/character-sheet references. Use them for original designs and exports after confirming the exact resource and reuse terms. Keep reference imagery separate from approved in-world assets.

## 3. Implementation sequence

| Stage | Concrete work | Exit condition |
| --- | --- | --- |
| 1. Contracts and timing | Record ownership and identity mappings; extend existing narrative events with optional stable source reference, game tick, visibility and authorized public summary; inventory DGAOS callback timing | Legacy events remain private by default; no second clock or payout owner is introduced |
| 2. Connected-event pilot | Connect one accepted `ms-shift-04` engineering order to one public service bulletin, one Dispatch story and one eligible canonical NPC reaction | One accepted order yields the same cross-app outcome after reload; private procedure/evidence fields never reach public text |
| 3. Visual storytelling pack | Use the existing world-asset registry for six reviewed assets: two place images, two distinct canonical portraits, one institutional graphic and one editorial illustration | Relevant views resolve the same entity/asset IDs; credits and approval status are recorded; missing assets fall back cleanly |
| 4. Everyday NPC life | Extend current simulation with bounded work/rest/commute commitments and a small needs model, starting with existing engineering staff and public-facing social reactions | One actor cannot occupy conflicting commitments; sleep/reload/rendering cannot generate duplicate actions |
| 5. Documents, publications and audio | Add an actual PDF-reading case first if needed; then an optional magazine presentation and waveform/transcript case | Each tool loads only in its owning view and preserves evidence/citation identity, keyboard access, offline fallback and save behavior |
| 6. Larger systems | Design household/business finance, synthetic medical scenarios and civic deliberation as separate extensions of current domain services | Each feature has an approved design, balanced consequences, bounded simulation cost and a save migration before implementation |

Stages 1–2 are the first implementation milestone. Stage 3 can follow immediately once its entity slots are selected. Later libraries are candidates for their own milestones, not part of an automatic install batch.

## 4. First milestone: connected Glassline service update

### Player-visible behavior

The player completes and submits the existing engineering repair. WORKNET accepts the original order and issues its existing reward once. An authorized city-service summary becomes visible in a bulletin and Dispatch; a relevant NPC can react through MAI.SPACE. The story refers to restored service, not a classified cause, private patient details, investigative conclusions or player identity without an explicit release policy.

### Implementation tickets

1. **Define the shared contract.** Extend the existing world narrative event type with optional `sourceRef`, `occurredAtTick`, `visibility` and `publicSummary`. Use the work order's stable ID as the source, not its rendered title. These fields supplement current category/institution/cycle metadata.
2. **Add one release definition.** Author the public-safe summary and publication eligibility for `ms-shift-04`. Emit after successful institutional acceptance. Failed stages, drafts, partial settlements and background workload never publish a completed repair.
3. **Persist projection receipts.** Record deliveries by source order ID, projection kind and actor where relevant. Commit outputs and their receipts together using existing saved-world ownership. Reopening a view, reprocessing an event or reloading a save must be idempotent. A later cycle's genuinely new shift has a distinct identity.
4. **Connect public views.** Extend news-edition construction to merge persisted released stories with current authored content. Store the published headline/body/cycle and source reference so saved editions do not change when a template changes. The bulletin and article point to the same released event.
5. **Connect one NPC reaction.** Use the existing engineering/social character links and persona templates, resolving legacy keys through the canonical registry. Respect audience, friendship, block/mute and availability rules. Use seeded selection keyed by event and actor; rendering does not mutate state. If no actor is eligible, skip the reaction rather than inventing a new person.
6. **Attach approved media.** Reference an existing approved infrastructure illustration through the World Asset Library. A missing/unapproved image uses the current typographic fallback. Do not relabel an illustration as documentary photography or evidence of an event.
7. **Migrate and verify.** Add empty projection/receipt defaults to old saves. Retain all employment, case, clinical and compensation records. Add focused tests and an isolated browser walkthrough before packaging the .NET host assets.

### Timing and authority defaults

The pilot follows session game ticks and pauses when the world is paused or closed. Real timestamps remain display/audit metadata. DGAOS retains ownership of its case callbacks until their conversion rules are explicitly designed; unrelated agency timers are not silently migrated in this milestone. LLM services are optional future authoring/research aids and cannot decide payment, clearance, canonical identity, medical acceptance or mission completion.

## 5. Acceptance and rollout

- Same save, seed and game ticks produce the same pilot outcome. Repeated processing and reloads do not duplicate posts, notifications, articles, payments or XP.
- Rejected/incomplete work produces no completed-service publication. A new accepted repeatable shift remains distinguishable from the previous cycle.
- Private legacy events and restricted case/clinical content stay out of public search, news, social posts, captions and notifications. Public projections are built from release-approved fields rather than free-text log scraping.
- Blocked/muted or unavailable NPCs do not react. Character IDs resolve consistently across WORKNET and MAI.SPACE.
- Old saves gain defaults without resetting careers, household data, evidence or media. Backup/restore retains the pilot's released stories and delivery receipts. Media files have their existing explicit backup policy.
- UI activity is never the simulation clock. Public updates occur while the relevant app is closed, become visible when opened, and do not advance just because the desktop rerenders.
- Approved local assets remain available offline. External packs preserve per-file attribution, source/license links, modification notes and approval evidence. Extend existing provenance fields only as needed.
- Run targeted character, WORKNET, social, news, world-asset and persistence tests; then typecheck, the full frontend suite and a production build. Browser tests use isolated storage and stub the real save API.
- Roll out the single authored pilot first with internal source/delivery diagnostics. Generalize to another institution only after the pilot passes; keep diagnostic IDs out of ordinary player copy.

## Immediate recommendation

Implement stages 1–2 as original MIRAVERSE features, using TownBox and Vice Social only as mechanics/interaction references when useful. Follow with six coherent world assets in the existing library. PDF.js and WaveSurfer.js are the strongest later specialist-library candidates; larger services, whole-game imports and model-driven social simulations remain separate research work.
