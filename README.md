# MiraverseOSx

**A privately developed, systems-driven life simulation and interactive world project.**

**Project status:** Active development · **Availability:** Not publicly distributed

MiraverseOSx is a solo-developed game project built around the idea of inhabiting a persistent, interconnected world rather than moving through a single predetermined storyline. It combines an operating-system-style interface, simulation of civic and everyday life, institutional activities, character relationships, investigative workflows, and AI-assisted interactions.

Its principal setting is **Meridion**, a fictional sovereign world whose institutions, technologies, neighborhoods, communities, and histories provide the context for play. The focus of development is the interaction between game systems: information discovered in one context should remain meaningful in another, institutions should retain their own responsibilities, and characters should exist beyond a single interaction with the player.

> **Development note:** This README describes the project direction and what is supported by the documentation currently available. Design intent is not a claim that every feature is operational. This repository is the complete application; `multi-role-terminal-orchestrator/` is an optional standalone prototype with its own server (port 3000) and is not launched by `npm start` or part of normal gameplay. Implementation notes have not been independently revalidated against the latest build.

## Contents

1. [Project approach](#project-approach)
2. [Gameplay and simulation](#gameplay-and-simulation)
3. [The operating system and applications](#the-operating-system-and-applications)
4. [AI and character systems](#ai-and-character-systems)
5. [Civic identity, institutions, and permissions](#civic-identity-institutions-and-permissions)
6. [Investigations and DGAOS](#investigations-and-dgaos)
7. [Education, careers, and progression](#education-careers-and-progression)
8. [Economy, homes, and daily life](#economy-homes-and-daily-life)
9. [World framework](#world-framework)
10. [Architecture and persistence](#architecture-and-persistence)
11. [Development status](#development-status)
12. [Development priorities](#development-priorities)
13. [Documentation and continuity](#documentation-and-continuity)

## Project approach

MiraverseOSx is designed as a continuing world in which ordinary activities and larger events coexist. A player may pursue study, work, personal relationships, creative projects, civic responsibilities, investigation, or exploration. These activities should not need to become quests to matter.

The core design principles are:

- **Player-directed participation.** Players can form their own routines and priorities without every experience being organized around a mandatory plot.
- **Connected systems.** A record, action, relationship, or event should be able to affect the relevant applications and institutions without losing its context.
- **Persistent consequences.** Outcomes, discoveries, permissions, and relationships should survive beyond a single screen or session.
- **Institutional coherence.** Government offices, schools, workplaces, medical providers, and social spaces have distinct functions and responsibilities.
- **Character continuity.** NPCs have identities, roles, histories, and social connections that are not interchangeable or defined solely by the player's needs.
- **Everyday texture.** Travel, correspondence, appointments, housing, work, classes, and community activities are part of the world alongside unusual and consequential events.
- **Controlled knowledge and access.** The fact that data exists in the game does not mean every character, application, or player role can see it.

## Gameplay and simulation

Rather than relying on a single universal activity loop, MiraverseOSx organizes play around overlapping activities and their consequences.

| Area | Intended player experience | System connections |
| --- | --- | --- |
| Personal life | Maintain an identity, residence, routines, relationships, and individual interests | Citizen services, communications, calendar, finances, social data |
| Education | Enroll, study, complete practical work, and acquire qualifications | Academic records, institutional websites, competencies, careers |
| Work and public service | Undertake professional and temporary responsibilities | WORKNET, permissions, institutions, income, reputation |
| Investigation | Receive cases, examine evidence, interview people, and follow legal processes | DGAOS, TRACE, AURA records, dispatch, courts |
| Social interaction | Communicate with people and develop evolving personal or professional relationships | AureMail, MAI SPACE, phone and dialogue records |
| Exploration | Encounter neighborhoods, addresses, institutions, and regional differences | Geography, travel, location records, local activity |
| Creative and technical practice | Build skills through programming, engineering, research, magic, and related activities | Education, tools, professional authorization, progression |

The design distinguishes **tasks, quests, missions, adventures, and journeys** by their purpose and scope. They do not all need to nest within each other. An achievement may advance more than one responsibility without becoming several separate accomplishments, while setbacks can affect resources, time, trust, or available options.

## The operating system and applications

The OS interface is an organizing layer for the world's digital services and player workflows. Its applications are intended to feel like parts of an inhabited society, with meaningful records, access boundaries, and relationships to one another.

### Identity and civic services

- **Citizen Hub:** Access point for personal civic services.
- **AURA Registry:** Authoritative civic identity records, including distinctions between a person's birth House and current House.
- **VerseNet:** A wider information and service environment, including institutional discovery and personal records.
- **MAI:** An in-world intelligent companion and assistance concept.

### Communication and social systems

- **AureMail:** Personal and institutional correspondence.
- **MAI SPACE:** Social interaction and community presence.
- **VerseNet:** Information access, personal records, and connected institutional experiences.

Communication should preserve the difference between a citizen's identity, their contact information, their professional roles, and what a recipient is authorized to know.

### Work, care, and finance

- **WORKNET:** A shared access point for employment and civic opportunities, with distinctions between institutional assignments and broader local requests.
- **Faith Medical:** Clinical services and care.
- **Vitals:** Personal health and well-being information, distinct from clinical authority.
- **ORYN:** Citizen-facing financial services, separate from the Oryn Department of Finance as an institution.

### Specialist institutional systems

- **DGAOS:** The Department of Global Affairs' operations and investigative workspace.
- **TRACE:** A specialist forensic workspace operating within the DGAOS ecosystem rather than as a disconnected, universal tool.

Application names and responsibilities follow the supplied world documentation. This section is a system directory, not a claim that every listed application is feature-complete.

## AI and character systems

The long-term NPC design aims for believable inhabitants who maintain recognizable identities, relationships, responsibilities, and situational knowledge. NPCs should be capable of existing in the world when the player is not directly addressing them.

Key design concerns include:

- **Identity:** Separate people must remain distinct even if they share names, surnames, or professional contexts.
- **Role-specific information:** A person can have civic, workplace, social, dialogue, mail, agency, or investigation profiles without those records becoming one flattened biography.
- **Memory and continuity:** Interactions and outcomes should be retained in appropriate persistent stores rather than rewriting authored character defaults.
- **Knowledge boundaries:** Sensitive information, case evidence, records, and discoveries should remain subject to the appropriate clearance and discovery rules.
- **Interaction modes:** Conversations may involve authored responses, structured state, or AI assistance depending on the feature and its maturity.

### Character data organization

The character migration documentation records **76 named character folders and 120 source records**. It also describes preservation of **83 pre-existing shared IDs**, with seven duplicate IDs redirected to consolidated identities, and a documented conflict-resolution process.

Character content is organized by named person, with identity metadata and profiles for their relevant domains. Application modules can continue to consume generated collection loaders, while mutable outcomes remain in save stores. Historical names and identifiers are retained as provenance or aliases where appropriate, not automatically used as permission-granting identities.

This matters particularly for investigations: a character's case-context status is not necessarily a universal statement about the person across every other record.

### AI providers and memory

MAI and NPC dialogue use the main C# `/api/ai/chat` router, with optional Gemini, OpenAI, and Groq providers. Configure credentials and models in `.env` using `.env.example`. `AI_PREFERRED_PROVIDER` accepts `gemini` (or `google-gemini`), `openai`, or `groq`; a request's `preferredProvider` overrides that default. The preferred configured provider runs first, followed by the remaining configured providers in Gemini, OpenAI, Groq order. Failed or empty responses fall through to the next provider, then the deterministic persona engine.

Provider identity is reported in responses, cost logs, and `/api/ai/telemetry`, including `groqConfigured`. Telemetry's `activeProvider` identifies the first configured provider under the default preference, not a guarantee of remote availability. SQLite NPC memories, MAI personas, shared world memory, investigation context isolation, and daily budget limits remain in the main system. The separate experimental Groq agent server and its simulated tools have been retired.

## Civic identity, institutions, and permissions

A central system rule is that **authored identity, issued civic identity, professional roles, and mutable game state are separate concepts**.

The AURA Registry is responsible for issued citizen identity. A case investigator can link a registered person to a case or create a case-specific investigative profile without manufacturing an official citizen record. Employment or educational credentials likewise do not automatically confer authority to perform regulated work.

Institutions preserve their own domains: an academic program grants education, a medical provider handles clinical care, and DGAOS governs authorized investigative processes. This distinction supports more consistent gameplay, especially when records are shared between applications.

## Investigations and DGAOS

The **Department of Global Affairs Operating System (DGAOS)** is one of the most extensively documented implementation areas in the supplied archive. Its build-batch notes describe progressively integrated case management, forensic work, legal procedures, emergency intake, dispatch, radio, and NPC communications.

### Casework and evidence

Documented workflows include creating and managing case dockets, assigning participants, collecting and linking evidence, recording interviews, maintaining task histories, and generating findings grounded in case-local sources. A person may participate in multiple cases without receiving a new civic identity in each case.

TRACE supports case-specific forensic examination records and linked submissions. Its return path is designed to verify the originating request, examination, case, and intended recipient rather than applying a lab result to whichever case happens to be open.

### Records, law, and courts

DGAOS documentation also covers vehicle and citizen searches, reports, BOLOs, arrests, warrant grounds and approval, charges under a configurable fictional penal code, hearings, verdicts, sentencing, and inmate records. These are recorded as distinct actions with authorization and history. An acquittal cannot simply advance into sentencing.

### Emergency response and dispatch

The documented emergency workflow covers incoming calls, incident creation, follow-up conversations, transfers, callbacks, incident-to-case links, and dispatch of persistent police, tactical, fire, or medical units. The later build batches add radio and response-related behavior, with explicit attention to persistence and consistent shared state.

### Reliability and verification

The supplied build-batch log reports automated Node, browser, backend, database, and AI-subsystem checks, plus frontend and .NET builds. It documents corrections for cross-case information leakage, stale scheduled events, incomplete writes, callback linkage, and restore behavior.

**Verification scope:** These are reported results from the provided development notes. They are not a new independent test of the latest working tree. DGAOS should be presented as a substantial documented implementation, not as proof that every intended gameplay or agency feature is complete.

## Education, careers, and progression

Meridion's education system is meant to support practical specialization and everyday institutional life rather than serve as a decorative source of character backstory.

Its principal documented institutions are:

- **Cyberium Academy:** Advanced study of magical cyberspace, technology, virtual reality, information, engineering, machines, robotics, AI, and technological forensics.
- **Dawn University:** A separate academic institution in Dawnson, within Aureline, with its own vocational and disciplinary scope.
- **Regent Hall University:** An institution with distinct civic, professional, and royal-adjacent educational pathways described in the education design reference.

The Game Doc distinguishes established institutional purposes and accepted material from proposed curricula, college structures, traditions, and policies. Those proposed extensions remain **proposals**, not automatically approved canon or implemented courses.

The intended academic experience connects enrollment, campus services, course participation, applied projects, records, skills, and later opportunities. Graduation, professional qualification, employment, and institutional appointment remain separate stages.

## Economy, homes, and daily life

MiraverseOSx's economic and domestic systems are intended to make ordinary life consequential.

**CREDITS** support common economic activity such as wages, contracts, sales, services, housing, and furnishings. **BITS** serve a separate economy associated with exceptional accomplishments and selected special purchases. ORYN is the interface for personal financial services.

The world also distinguishes addresses, residences, neighborhoods, travel routes, workplaces, and local geography. A residence can be known through physical location, civic records, and the lived circumstances of its inhabitants. Household routines, appointments, markets, and community obligations can coexist with larger political, investigative, or magical events.

These areas are part of the documented system vision; implementation maturity varies and requires confirmation against the current application.

## World framework

MiraverseOSx takes place primarily in **Meridion**, a sovereign world of **eight realms**. Its civic and imperial center, **Aureline**, is located in **Orynvell**. The world also contains **seven Color Houses**, which are social and resonant affiliations rather than synonyms for its geographic realms.

Meridion's foundational history, calendar, technologies, magical practices, institutions, and geography provide rules that game systems must respect. Important world concepts include **MAI**, **PRISM**, **AETHERCORE**, **the Veil**, and resonance. These belong to a larger setting whose details are maintained in the Game Doc rather than reproduced in full here.

The world reference identifies the realms as Orynvell, Fross, Lumia, Marlowe, Brisland, Kaji, Nephele, and Ve’Raylia. The accompanying map asset uses an older *Seven Realms* title; the written eight-realm reference is used here, and map consistency remains a documentation follow-up.

## Architecture and persistence

The available documentation describes multiple layers rather than one monolithic source of truth:

| Layer | Responsibility |
| --- | --- |
| Authored world and character content | Stable identities, profiles, setting details, organizations, and source-context facts |
| Generated loaders and compatibility indexes | Preserve existing imports, record IDs, and known historical references during data organization |
| Application and institutional modules | Enforce domain-specific workflows, permissions, and rules |
| Mutable world saves | Store decisions, relationships, discoveries, outcomes, cases, and user progress |
| External AI services and orchestration | Support selected interactions, subject to integration, authentication, and game-state boundaries |

The character data notes identify `frontend/src/game-content/characters/people` as the named character directory. They also distinguish legacy exported frontend data from game content and a separate backend world-save database. The DGAOS notes describe database snapshots, browser-side mirrors, portable backup and restore, and specialist TRACE records.

A central architectural principle is to **preserve existing identities and records without allowing older aliases, unrelated case data, or stale snapshots to bypass ownership and access rules**.

The provided archive is not sufficient to publish a definitive, current repository tree, full dependency inventory, deployment model, or technical setup procedure. Those details are deliberately omitted rather than inferred.

## Development status

This status summary uses conservative descriptions based on the supplied files, not a full source-code audit.

| Area | Status supported by the available materials |
| --- | --- |
| Worldbuilding and setting | Extensive documented reference, including explicitly proposed sections |
| Character organization | Documented migration and consolidation, with recorded preservation rules |
| DGAOS investigation and operations | Extensive implementation notes and reported automated verification |
| TRACE forensic integration | Documented case-linked workflow and persistence behavior |
| Civic, social, academic, and financial applications | Described system responsibilities; current implementation depth not fully established by this archive |
| AI dialogue routing | Optional Gemini, OpenAI, and Groq providers with persona fallback and persistent NPC memories |
| Autonomous NPC daily life | Core project direction; end-to-end operational status not established by the supplied archive |
| Full cross-system simulation | Architectural objective with selected documented integrations; overall completeness unverified |

**No public release or download is being advertised through this repository overview.**

## Development priorities

The following are proposed documentation and engineering review priorities, **not an approved release roadmap**:

1. **Audit the latest application tree.** Match documented systems to real modules, data stores, and test coverage before making stronger completion claims.
2. **Clarify system boundaries.** Identify the authoritative source for civic identity, character profiles, relationships, case records, academic records, and permissions.
3. **Strengthen cross-application consistency.** Verify that changes propagate correctly without exposing records across cases, roles, or unrelated identities.
4. **Mature agent integration.** Replace illustrative tool outputs with authenticated, permission-aware access to actual game state, including meaningful failure handling.
5. **Review persistence end to end.** Confirm that backups, restoration, migrations, and long-running NPC or institutional state behave consistently.
6. **Reconcile design and canon.** Track approved educational details, newer proposals, and mismatched map terminology without silently changing established lore.

## Committing

Keep history readable and the repository light.

**Message format:** `<type>(<scope>): <one line>` — imperative, and specific enough that the line alone explains the change, for example `fix(simulation): keep royalties revenue-aware for non-artist acts`. Types in use are `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, and `perf`. Add a body only when the reason is not obvious from the subject line.

**Never commit generated output or local runtime state.** `wwwroot/` is `vite build` output (regenerate with `npm run build:frontend`), while `backups/`, `2026-11-25/`, and `miraverse.db*` are runtime data. Design sources (`*.psd`, `*.ai`) are kept outside the repository. Take a database snapshot on purpose with `npm run db:checkpoint`, which folds the WAL and writes a vacuumed copy under `backups/db/`; archive that copy where you keep releases rather than on every change.

**Type strictness ratchet.** `frontend/tsconfig.json` still runs with `strict: false`, so enabling `noImplicitAny` globally today would fail on the existing backlog. `npm run typecheck:strict` recompiles with `noImplicitAny` and compares the result against `frontend/tsconfig.strict-baseline.json`, failing only when a file gains new implicit anys. Clear a feature, run `npm run typecheck:strict:update`, and commit the lowered baseline; never raise it to get a change through.

## Documentation and continuity

The project documentation is divided between gameplay and system implementation, structured data, and broader world references.

| Document | Purpose |
| --- | --- |
| `docs/Game Doc.docx` | World framework, civic life, gameplay concepts, educational design, and canon/proposal distinctions |
| `docs/DGAOS-BUILD-BATCHES.md` | Agency-system implementation batches, workflows, fixes, and reported validation |
| `docs/data/README.md` | Character content ownership, migration, data rules, and persistence boundaries |
| `docs/data/CHARACTER_INVENTORY.md` | Character directory and resolved identity conflicts |
| `Ai/` | Main AI router, optional cloud providers, and persistent NPC memories |
| `docs/npc_profiles.docx` | NPC profile material |
| `docs/familytree.pdf` | Relationship and family reference |
| `docs/Meridion_ The Seven Realms Map.png` | Existing geographic visual reference requiring title/canon reconciliation |

### Working with canon

A feature described in design documentation is not automatically implemented. A proposal is not automatically approved world canon. An authored character fact is not automatically a live-world outcome. Likewise, a historical ID is not automatically a valid credential.

Changes should preserve established names, prior decisions, source context, and relevant compatibility behavior unless a revision is explicitly approved. Any new system should be evaluated for its effect on related applications, player saves, NPC knowledge, and the ongoing world.

---

*MiraverseOSx is an evolving private game development project. This overview is intentionally focused on its gameplay architecture, connected systems, and documented development rather than public distribution.*
