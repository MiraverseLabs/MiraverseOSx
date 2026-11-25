# Media ecosystem implementation

Updated November 24, 2026. This continues the supplied **Miraverse Media & Asset Ecosystem — Architectural Plan** and the interrupted Creative Studio work. Earlier asset-library, publication, social and document work is retained.

## Player and administrator studios

`creativeStudio` opens **Miraverse Creative Studio** from the desktop. Its composer reuses the existing media templates, brand kits, approved canon assets and runtime upload registry. A signed-in citizen can publish personal social work and manuscripts. Press, artist and institutional contracts grant their existing professional channels and verification tiers. The store checks these permissions again when publishing; a caller cannot bypass them by choosing another template's channel.

Verified reporting requires a released public source. Opinion, promotion and personal perspectives retain their own labels. Canon goes through the Admin Console, draft validation and a pre-publish checkpoint. Published drafts are sealed; revalidating cannot reopen them. Failure to save publication history rolls back the public artifact. Restoring a checkpoint preserves already published canon alongside historical events and canonical identities.

Player publishing saves content, channel copies, portfolio progress and bounded relationship feedback together. Identical compositions in the same cycle reuse their saved ID. Portfolio progression and press reputation are bounded per cycle; featured known NPCs receive at most one feedback update per cycle. Private manuscripts do not become NPC memories. Commission income remains with accepted WORKNET work orders. An explicitly selected promotion budget spends 0–50 whole game credits once and uses the existing banking journal.

The press fact-checking shift (`ms-press-01`) and Rosemont freelance commission (`qn-04`) retain their authored procedures, contracts, XP and payment receipts. The Dynamic Media Desk links back to these existing assignments for review.

## Dynamic Media Desk

The shared game clock runs the desk with the studio and publications closed. At a new cycle, it selects at most two unprocessed public service releases, prioritizing recent institutional service updates, and adds one column from the canonical Radiance/Echo calendar. Released text and stable editorial receipts are saved in the ordinary world state. A long gap produces the current edition instead of replaying every missed cycle. Pauses, rerenders and hydration do not create new editions.

Public editorial inputs are projected from authorized release summaries. Private legacy events, medical/forensic categories, identified citizen records, future events, internal titles, raw procedure summaries and personnel fields are excluded. Dynamic editions appear in The Meridian and public search. Followed, unblocked, unmuted official accounts can deliver matching MAI.SPACE cards. Existing NPC engagement scoring uses interests, brand affinity and relationship vectors; delivery respects shared work commitments, leave, mute/block state and quiet hours.

Optional deck assistance sends only the selected released headline and summary to `/api/ai/chat` in a scoped `media-editor` workspace. The backend excludes global NPC memories and memory writes and retains its cost ceiling, cache and provider fallbacks. Suggestions require review and an explicit author action; model output cannot publish, award money or certify evidence. Offline or capped assistance returns the existing public summary.

## Media, citations and persistence

Runtime media metadata is restored from the existing host API and shared through a subscribed in-memory mirror. Binary uploads stay outside the world-save envelope. Explicit upload rejections are surfaced; offline previews are labeled session-only. Missing artwork falls back to typography. Public editorial illustrations require approved canon provenance.

Media citations retain stable article IDs. Both saved citations and assignment files force media leads to `certified: false`, even when a caller requests otherwise. Clippings remain leads or public timestamp corroboration and do not satisfy forensic or clinical proof requirements. Independent and promotional newspaper items retain appropriate article labels.

Saved state ownership remains `gameplay.mediaStudio`, `gameplay.publishedMediaArtifacts`, existing social/portfolio/NPC state, existing banking and existing creator checkpoints/history. Restoration preserves personal MAI.SPACE layouts, muted official accounts, malformed-post safety and previously accepted work. Manuscripts are stored as editable `.doc` files; existing publication/document export tools own PDF output.

## Verification

- All **372 frontend unit tests** passed; TypeScript checking passed.
- Character and world-asset audits passed after refreshing the generated character source inventory.
- .NET build passed with zero warnings/errors.
- AI routing checks passed, including public editorial scope isolation and budget fallback.
- Isolated backend world-save integration: **22 checks passed**.
- Isolated media host integration: **10 checks passed**, including byte/metadata persistence after restart, player provenance, executable SVG rejection and foreign-origin rejection.
- Isolated browser walkthrough passed: citizen/admin boundaries, press publishing, duplicate protection, public-only AI request, cycle edition, uncertified clipping, checkpoint/canon publishing and reload. No page errors occurred; test API/model responses were intercepted.

Reproducible checks: `frontend/tests/dynamic-media-studio.test.mjs`, `frontend/scripts/verify-media-studio.mjs` (Vite on port 4178 with hot reload disabled), `scripts/test_backend_media.ps1`, and the existing world-save/AI test suites. Screenshots are under `output/previews/creative-studio-*.png` and `output/previews/dynamic-*.png`.

Both packaged web roots (`wwwroot` and `bin/Debug/net8.0/wwwroot`) contain the reviewed production build and the shared public media. All 85 service-worker precache entries were verified in each destination.
