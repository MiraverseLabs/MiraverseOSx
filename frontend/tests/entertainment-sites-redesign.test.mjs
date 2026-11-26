import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { fileURLToPath } from 'node:url';

registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (error) {
      if (error.code !== 'ERR_MODULE_NOT_FOUND' || !specifier.startsWith('.')) throw error;
      return next(`${specifier}.ts`, context);
    }
  },
});

const {
  ENTERTAINMENT_SITES,
  SITE_ROUTE_CONFIGS,
  resolveEntertainmentRoute,
  buildSiteUrl,
  entertainmentPageTitle,
} = await import('../src/apps/Browser/entertainment/entertainmentRouter.ts');
const { browserTitle } = await import('../src/apps/Browser/browserModel.ts');
const { VENUE_CATALOG } = await import('../src/gameplay/EntertainmentEcosystem.ts');

const testsDir = path.dirname(fileURLToPath(import.meta.url));
const entDir = path.resolve(testsDir, '..', 'src', 'apps', 'Browser', 'entertainment');
const publicDir = path.resolve(testsDir, '..', 'public');

test('all 25 entertainment websites have distinct shells, organization-specific routes, and clean titles', () => {
  assert.equal(ENTERTAINMENT_SITES.length, 25);
  const shells = new Set();

  for (const site of ENTERTAINMENT_SITES) {
    const cfg = SITE_ROUTE_CONFIGS[site.orgId];
    assert.ok(cfg, `Missing SITE_ROUTE_CONFIGS entry for ${site.orgId}`);
    shells.add(cfg.shell);

    const navRoutes = cfg.routes.filter((r) => r.navGroup === 'primary' || r.navGroup === 'utility');
    assert.ok(navRoutes.length >= 4, `${site.orgId} should expose at least 4 main navigation routes`);

    for (const route of navRoutes) {
      const url = buildSiteUrl(site, route.path);
      const resolved = resolveEntertainmentRoute(url);
      assert.ok(resolved, `Failed to resolve ${url}`);
      assert.equal(resolved.isNotFound, false, `${url} should not be 404`);
      assert.equal(resolved.route?.id, route.id, `${url} should resolve to route ${route.id}`);
      const title = entertainmentPageTitle(url);
      assert.ok(title && title.includes(site.name), `Title for ${url} should include ${site.name}, got ${title}`);
      assert.equal(browserTitle(url), title);
    }

    const badUrl = `${site.url}/nonexistent-redesign-route`;
    const badResolved = resolveEntertainmentRoute(badUrl);
    assert.equal(badResolved?.isNotFound, true, `${badUrl} should resolve as isNotFound`);
    assert.match(entertainmentPageTitle(badUrl) ?? '', /Page unavailable/);
  }

  assert.equal(shells.size, 25, 'All 25 websites must declare distinct shell architectures');
});

test('nested detail routes extract canonical entity IDs across Wave 1–3 sites', () => {
  const detailChecks = [
    ['https://songbird.mer/artist/ART-NYLA', 'artist-detail', 'ART-NYLA'],
    ['https://songbird.mer/album/TRK-SEED-02', 'album-detail', 'TRK-SEED-02'],
    ['https://limelight.mer/stories/MED-SEED-03', 'story-detail', 'MED-SEED-03'],
    ['https://silverleafstadium.mer/events/CON-SEED-03', 'event-detail', 'CON-SEED-03'],
    ['https://willowwhisper.mer/models/ART-VIVIENNE', 'model-detail', 'ART-VIVIENNE'],
    ['https://mirrorastudios.mer/productions/glassline-harbor', 'production-detail', 'glassline-harbor'],
    ['https://opencallcasting.mer/auditions/AUD-SEED-01', 'audition-detail', 'AUD-SEED-01'],
    ['https://marigoldtheatre.mer/productions/CON-SEED-02', 'production-detail', 'CON-SEED-02'],
  ];

  for (const [url, expectedRouteId, expectedId] of detailChecks) {
    const resolved = resolveEntertainmentRoute(url);
    assert.ok(resolved, `Expected resolved route for ${url}`);
    assert.equal(resolved.isNotFound, false);
    assert.equal(resolved.route?.id, expectedRouteId);
    assert.equal(resolved.pathParams.id, expectedId);
  }
});

test('authenticated member/artist/client portals are explicitly gated across sites', () => {
  const gatedSites = [
    'ORG_SONGBIRD',
    'ORG_LIMELIGHT',
    'ORG_GLASSLINE_DESIGNS',
    'ORG_SILVERLEAF_STADIUM',
    'ORG_WILLOW_WHISPER',
    'ORG_MIRRORA_STUDIOS',
    'ORG_MUSIC_RIGHTS_SOCIETY',
    'ORG_PERFORMERS_ASSOC',
    'ORG_OPEN_CALL',
    'ORG_MARLIE_RECORDS',
    'ORG_KAJI_PUBLISHING',
    'ORG_LUNERUM_DIST',
    'ORG_SECOND_ACT',
    'ORG_WORD_OF_MOUTH',
    'ORG_RADIANCE_AWARDS',
    'ORG_STARSTRUCK',
  ];

  for (const orgId of gatedSites) {
    const cfg = SITE_ROUTE_CONFIGS[orgId];
    assert.ok(
      cfg.routes.some((r) => r.access === 'authenticated'),
      `${orgId} must explicitly mark its private portal route as authenticated`,
    );
  }
});

test('all 25 site modules are registered and reference only existing local media assets and canonical facts', () => {
  const registryText = fs.readFileSync(path.join(entDir, 'sites', 'registry.tsx'), 'utf8');
  for (const site of ENTERTAINMENT_SITES) {
    assert.ok(registryText.includes(`${site.orgId}:`), `sites/registry.tsx missing ${site.orgId}`);
  }

  // Canonical invariants
  const silverleafVenue = VENUE_CATALOG.find((v) => v.orgId === 'ORG_SILVERLEAF_STADIUM');
  assert.equal(silverleafVenue?.capacity, 45000);
  const silverleafSource = fs.readFileSync(path.join(entDir, 'sites', 'wave1', 'SilverleafStadiumSite.tsx'), 'utf8');
  assert.ok(silverleafSource.includes('45,000'), 'Silverleaf Stadium must display canonical 45,000 capacity');
  assert.equal(silverleafSource.includes('60,000'), false, 'Silverleaf Stadium must not adopt 60,000 mockup stat');

  const lookingGlassSource = fs.readFileSync(path.join(entDir, 'sites', 'wave2', 'LookingGlassSite.tsx'), 'utf8');
  assert.ok(lookingGlassSource.includes('180'), 'The Looking Glass must preserve 180-capacity live-music club identity');
  assert.ok(lookingGlassSource.includes('9 Lantern Alley'), 'The Looking Glass must preserve canonical Glassline address');

  const velvetSource = fs.readFileSync(path.join(entDir, 'sites', 'wave3', 'VelvetCurtainSite.tsx'), 'utf8');
  assert.ok(velvetSource.includes('Velvet Curtain'), 'ORG_VELVET_CURTAIN must preserve Velvet Curtain touring identity');

  // Verify every /media/... and /icons/... path referenced in all 25 site components resolves to a real file
  const waveDirs = ['wave1', 'wave2', 'wave3'].map((w) => path.join(entDir, 'sites', w));
  let assetChecks = 0;
  for (const dir of waveDirs) {
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.tsx')) continue;
      const src = fs.readFileSync(path.join(dir, file), 'utf8');
      const matches = src.matchAll(/['"](\/(?:media|icons)\/[^'"]+)['"]/g);
      for (const m of matches) {
        const rel = m[1].replace(/^\//, '');
        const full = path.join(publicDir, rel);
        assert.equal(fs.existsSync(full), true, `Missing asset ${m[1]} referenced in ${file}`);
        assetChecks++;
      }
    }
  }
  assert.ok(assetChecks >= 10, `Expected >= 10 verified local media/icon asset references, checked ${assetChecks}`);
});
