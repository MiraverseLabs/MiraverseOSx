import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';

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

const { evaluateCreativeStudioPermissions, validateStudioPublishPermission } = await import('../src/gameplay/creativeStudioModel.ts');
const { saveCreatorDraft, publishCreatorDraft, getPublishedHistory } = await import('../src/integration/worldStateManager.ts');
const { DESKTOP_APP_IDS } = await import('../src/store/desktopPreferences.ts');

test('Creative Studio separates Citizen, Press/Artist career, and World Administrator canon permissions', () => {
  assert.ok(DESKTOP_APP_IDS.includes('creativeStudio'));

  // Ordinary citizen can publish personal social/documents, NOT official newspaper/magazine or canon_official
  const citizen = evaluateCreativeStudioPermissions({ name: 'Elara' }, true);
  assert.equal(citizen.isAdmin, false);
  assert.equal(validateStudioPublishPermission(citizen, 'social', 'personal_perspective').ok, true);
  assert.equal(validateStudioPublishPermission(citizen, 'newspaper', 'verified_reporting').ok, false);
  assert.equal(validateStudioPublishPermission(citizen, 'magazine', 'canon_official').ok, false);

  // Contracted Press correspondent unlocks The Meridian & The Social Register verified reporting, still not Admin canon
  const journalist = evaluateCreativeStudioPermissions({ name: 'Elara', employmentContracts: { press: { id: 'EMP:press' } } }, true);
  assert.equal(validateStudioPublishPermission(journalist, 'newspaper', 'verified_reporting').ok, true);
  assert.equal(validateStudioPublishPermission(journalist, 'magazine', 'opinion').ok, true);
  assert.equal(validateStudioPublishPermission(journalist, 'newspaper', 'canon_official').ok, false);

  // World Administrator unlocks full Canon Console and canon_official tier
  const admin = evaluateCreativeStudioPermissions({ name: 'Sovereign Admin', isAdmin: true }, true);
  assert.equal(admin.isAdmin, true);
  assert.equal(validateStudioPublishPermission(admin, 'newspaper', 'canon_official').ok, true);
});

test('Admin CreatorStudioState stages, checkpoints, and seals publication_article drafts into world state', () => {
  const mem = new Map();
  globalThis.localStorage = {
    getItem: k => mem.get(k) ?? null,
    setItem: (k, v) => mem.set(k, String(v)),
    removeItem: k => mem.delete(k),
  };
  mem.set('miraverse-os-progress', JSON.stringify({ state: { gameplay: { timeCycleCount: 28, worldEventLog: [] } } }));

  const unauth = saveCreatorDraft({ title: 'Blocked', summary: 'Not admin', category: 'publication_article', payload: {} }, { isLoggedIn: true, isAdmin: false });
  assert.equal(unauth.ok, false);

  const actor = { isLoggedIn: true, isAdmin: true, name: 'World Administrator' };
  const staged = saveCreatorDraft(
    {
      title: 'Elmore Conservatory Opens Autumn Archive',
      summary: 'House Valmon welcomes inter-realm scholars to Ve’Raylia.',
      category: 'publication_article',
      payload: {
        institution: 'The Meridian',
        mediaArtifact: {
          id: 'canon-mer-elmore-1',
          templateId: 'tpl-news-article',
          brandKitId: 'the-meridian',
          channel: 'newspaper',
          publishedCycle: 28,
          authorName: 'World Administrator',
          slotValues: { kicker: 'World', headline: 'Elmore Conservatory Opens Autumn Archive', subhead: 'House Valmon welcomes scholars.', byline: 'World Administrator', body: 'An authored public announcement from the archive.' },
        },
      },
    },
    actor,
  );
  assert.equal(staged.ok, true);

  const published = publishCreatorDraft(staged.draft.id, actor);
  assert.equal(published.ok, true);
  assert.ok(published.checkpoint?.id);
  assert.equal(getPublishedHistory().length, 1);

  const osSaved = JSON.parse(mem.get('miraverse-os-progress'));
  assert.equal(osSaved.state.gameplay.publishedMediaArtifacts[0].id, 'canon-mer-elmore-1');
  assert.equal(osSaved.state.gameplay.publishedMediaArtifacts[0].verificationTier, 'canon_official');
});
