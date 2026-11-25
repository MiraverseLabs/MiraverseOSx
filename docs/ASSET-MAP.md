# Asset Map

Single source: `frontend/src/data/designAssets.ts`. Vite serves `frontend/public/**`
at the site root, so every path below is a public-root URL.

## App icons

| App id | Asset |
|---|---|
| dgaos | `/icons/Icon set 1/Dark Icons/1x/Lock x512.png` |
| meridionRegistry | `/icons/Icons8/icons8-male-user-16.svg` |
| documentStudio | `/icons/Icons8/icons8-opened-folder-16.svg` |
| creativeStudio | `/icons/Icon set 1/Dark Icons/1x/Musick note x512.png` |
| passport | `/icons/Icons8/icons8-user-female-16.svg` |
| housing | `/icons/Icon set 1/Dark Icons/1x/House x512.png` |
| jobs | `/icons/Icon set 1/Dark Icons/1x/Market x512.png` |
| comms | `/icons/Icon set 1/Dark Icons/1x/Message x512.png` |
| finance | `/icons/Icon set 1/Dark Icons/1x/Money  x512.png` |
| browser | `/icons/Icon set 1/Dark Icons/1x/Network  x512.png` |
| process | `/icons/Icon set 1/Dark Icons/1x/Monitor x512.png` |
| vitals | `/icons/Icon set 1/Dark Icons/1x/Plus x512.png` |
| campus | `/icons/Icons8/icons8-bookmark-16.svg` |
| study | `/icons/Icons8/icons8-bookmark-16.svg` |
| spellforge | `/icons/Icon set 1/Dark Icons/1x/Wrench 1 x512.png` |
| fieldOperations | `/icons/Icon set 1/Dark Icons/1x/Map x512.png` |
| maispace | `/images/icons8-speech-bubble-50.png` |
| mail | `/icons/Icon set 1/Dark Icons/1x/Mail x512.png` |
| post | `/icons/Icon set 1/Dark Icons/1x/Download  x512.png` |
| files | `/icons/Icons8/icons8-folder-16.svg` |
| lore | `/icons/Icon set 1/Dark Icons/1x/Star x512.png` |
| terminal | `/images/command line.png` |
| settings | `/icons/Icon set 1/Dark Icons/1x/Setting 1 x512.png` |

## Ornaments

| App id | Asset |
|---|---|
| documentStudio | `/media/ornaments/ornate-plaque.svg` |
| creativeStudio | `/media/ornaments/floral-crest.svg` |
| lore | `/media/ornaments/celestial-star.svg` |
| passport | `/media/ornaments/botanical-corner.svg` |
| maispace | `/media/ornaments/editorial-divider.svg` |

## Brand marks

| Key | Asset |
|---|---|
| meridianMasthead | `/media/brands/meridian-masthead.svg` |
| meridianMonogram | `/media/brands/meridian-monogram.svg` |
| socialRegisterMasthead | `/media/brands/social-register-masthead.svg` |
| socialRegisterMonogram | `/media/brands/social-register-monogram.svg` |

## Wallpapers

| Key | Asset |
|---|---|
| wallpaper-aureline-city | `/images/wallpapers/aureline-city-beneath-the-heavens.png` |
| wallpaper-angel-bay | `/images/wallpapers/aureline-across-angel-bay.png` |
| wallpaper-glassline | `/images/wallpapers/aureline-glassline-twilight.png` |

## Consumers

- `AppIcon` renders the mapped image, falling back to the Lucide glyph.
- `AppGlyph` (window titlebar, Orbit launcher) uses `AppIcon`.
- Desktop shortcuts, the dock, and the taskbar use `AppIcon`.
- Settings → **Design assets** previews the full manifest.
- Ornaments appear in Document Studio and Creative Studio headers.

## Adding an asset

1. Drop the file in `frontend/public/...`.
2. Add a path to `APP_ICON_ASSETS`, `APP_ORNAMENTS`, or `BRAND_MARKS` in `designAssets.ts`.
3. Add it to `ASSETS` if it should appear in the Settings preview.
4. Run `node --test tests/design-assets.test.mjs` to verify the file exists.