# Wire Existing Visual Assets Into the App

## Context (verified)

- The repo already ships a visual system and art, but much of it is unused:
  - `frontend/src/styles/tokens.css`, `theme.css`, `visual-system.css` define the "Celestial Glass" palette and `.app-glyph` / `.os-window` chrome.
  - `frontend/public/images/wallpapers/*` are used by `SettingsApp` + `DispatchNewsSite`.
  - `frontend/public/media/ornaments/*` (5 SVGs) and `frontend/public/media/brands/*` (4 SVGs) are **referenced nowhere**.
  - `frontend/public/icons/Icons8/*` (12 SVGs) and `frontend/public/icons/Icon set 1/Dark Icons/1x/*` (~90 PNGs) are **referenced nowhere**.
  - `frontend/public/images/{command line.png, comms_window.svg, back_id_card.svg, TerminalOutput.svg, base.png, icons8-speech-bubble-50.png, Logo_Icon - 1.png}` are mostly unused.
- App icons are still generic Lucide glyphs. Two registries carry `icon`:
  - `frontend/src/apps/contents.tsx` (`APPS`, 23 apps).
  - `frontend/src/components/desktop/appDirectory.ts` (`APPS_DIRECTORY`, derived; adds labels/categories/fallback icons).
- Central renderer: `frontend/src/components/ui/AppGlyph.tsx` (used by `Window.tsx` titlebar and `AppLauncherModal.tsx`). Other consumers render `app.icon` directly: `DesktopShortcuts.tsx`, `DesktopSurface.tsx` (shortcut cells), `DesktopTaskbar.tsx`.
- Vite serves `frontend/public/**` at the site root, so `/icons/...`, `/media/...`, `/images/...` resolve in dev and in the built `wwwroot`.

## Decisions

1. **One asset map, keyed by app id** — add `frontend/src/data/designAssets.ts` (no third per-app registry). It exports `APP_ICON_ASSETS`, `APP_ORNAMENTS`, `BRAND_MARKS`, and a categorized `ASSETS` list.
2. **New `AppIcon` component** — renders an `<img>` when an app id has an asset, otherwise the Lucide icon. `AppGlyph` uses `AppIcon` internally so window/launcher tiles inherit the art automatically.
3. **Migrate direct-icon consumers** to `AppIcon`: `DesktopShortcuts`, `DesktopSurface`, `DesktopTaskbar`. `AppLauncherModal` is already covered via `AppGlyph`.
4. **Use ornaments/brands as accents**, not replacements: Document Studio (ornate plaque), Creative Studio (floral crest), Royal Archive (celestial star), Citizen Hub (botanical corner), Maispace (editorial divider); Meridian/Social Register mastheads in Creative Studio and the Browser news pages.
5. **Settings → "Design Assets"** preview section listing the categorized manifest with thumbnails (makes the assets discoverable and verifiable).
6. **`docs/ASSET-MAP.md`** — table of app id → icon asset, ornaments, brands, wallpapers (the "asset map doc").
7. **No docx changes** and **no registry consolidation** in this task (out of scope).

## Default mapping (adjustable)

| App id | Icon asset | Tone |
|---|---|---|
| dgaos | `Icon set 1/Dark Icons/1x/Lock x512.png` | ink |
| meridionRegistry | `Icons8/icons8-male-user-16.svg` | lilac |
| documentStudio | `Icons8/icons8-opened-folder-16.svg` | rose |
| creativeStudio | `Icon set 1/Dark Icons/1x/Musick note x512.png` | rose |
| passport | `Icons8/icons8-user-female-16.svg` | gold |
| housing | `Icon set 1/Dark Icons/1x/House x512.png` | lilac |
| jobs | `Icon set 1/Dark Icons/1x/Market x512.png` | gold |
| comms | `Icon set 1/Dark Icons/1x/Message x512.png` | lilac |
| finance | `Icon set 1/Dark Icons/1x/Money  x512.png` | gold |
| browser | `Icon set 1/Dark Icons/1x/Network  x512.png` | sky |
| process | `Icon set 1/Dark Icons/1x/Monitor x512.png` | ink |
| vitals | `Icon set 1/Dark Icons/1x/Plus x512.png` | sage |
| campus | `Icons8/icons8-bookmark-16.svg` | sky |
| study | `Icons8/icons8-bookmark-16.svg` | sky |
| spellforge | `Icon set 1/Dark Icons/1x/Wrench 1 x512.png` | lilac |
| fieldOperations | `Icon set 1/Dark Icons/1x/Map x512.png` | sage |
| maispace | `images/icons8-speech-bubble-50.png` | rose |
| mail | `Icon set 1/Dark Icons/1x/Mail x512.png` | sky |
| post | `Icon set 1/Dark Icons/1x/Download  x512.png` | gold |
| files | `Icons8/icons8-folder-16.svg` | gold |
| lore | `Icon set 1/Dark Icons/1x/Star x512.png` | lilac |
| terminal | `images/command line.png` | ink |
| settings | `Icon set 1/Dark Icons/1x/Setting 1 x512.png` | lilac |

Ornaments: documentStudio → `ornate-plaque.svg`; creativeStudio → `floral-crest.svg`; lore → `celestial-star.svg`; passport → `botanical-corner.svg`; maispace → `editorial-divider.svg`.
Brands: `meridian-masthead.svg` / `meridian-monogram.svg` (Creative Studio + Meridian Society news); `social-register-masthead.svg` / `social-register-monogram.svg` (Maispace + Social Register news).

## Tasks

1. Add `frontend/src/data/designAssets.ts` with typed `APP_ICON_ASSETS`, `APP_ORNAMENTS`, `BRAND_MARKS`, `ASSETS`, and `iconAssetFor(appId)`.
2. Add `frontend/src/components/ui/AppIcon.tsx` (img-or-Lucide, decorative `alt=""`, `draggable={false}`).
3. Update `AppGlyph.tsx` to render `AppIcon` inside the tile (keep `appTone`).
4. Update `DesktopShortcuts.tsx`, `DesktopSurface.tsx` shortcut cells, and `DesktopTaskbar.tsx` to use `AppIcon`.
5. Add ornament/brand accents:
   - `DocumentStudioApp`, `CreativeStudioApp`, `LoreExplorer`, `CivicProfileApp`, `MaiSpaceApp` headers.
   - `DispatchNewsSite` Meridian/Social Register mastheads.
   Use `APP_ORNAMENTS` / `BRAND_MARKS` with subtle CSS (opacity, height) in the existing app CSS files.
6. Add a "Design Assets" section to `SettingsApp.tsx` rendering `ASSETS` grouped by category with thumbnails and the app-icon table.
7. Add `docs/ASSET-MAP.md` (app id → asset, ornaments, brands, wallpapers).
8. Add `frontend/tests/design-assets.test.mjs`:
   - every `APP_ICON_ASSETS` src exists under `frontend/public` (decode URI);
   - every `APPS` id has an icon asset or is in an explicit `NO_CUSTOM_ICON` list;
   - every ornament/brand path exists.

## Risks

- Filenames contain spaces (e.g., `Money  x512.png`); use exact paths and `encodeURI` where building URLs. The test must match raw filenames.
- 512px PNGs are heavier than SVGs; acceptable for desktop, but keep `width/height` set to avoid layout shift.
- Dark glyphs on light tiles may need the existing `data-tone` backgrounds; verify contrast.
- Ornaments can look noisy; keep them as low-opacity header accents and respect reduced-motion.
- `img` must be decorative (`alt=""`, `aria-hidden`) so screen readers keep the app label.

## Validation

- `npm run typecheck` passes.
- `node --test tests/design-assets.test.mjs` passes.
- Full frontend suite (`npm --prefix frontend test`) passes.
- Manual: launch the OS; confirm desktop shortcuts, dock, Orbit launcher, and window titlebars show the custom art; open Settings → Design Assets and confirm thumbnails; open Document/Creative Studio and confirm ornaments/mastheads render.

## Out of scope

- Embedding images in `docs/Game Doc.docx`.
- Deleting/merging the duplicate `APPS` / `APPS_DIRECTORY` registries.
- New artwork; this task only wires existing files.