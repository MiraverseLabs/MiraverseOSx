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

const { initialSocial, changeSocial, restoreSocial, normalizeLayout } = await import('../src/apps/social/socialModel.ts');
const { OFFICIAL_SOCIAL_ACCOUNTS, STARTER_SOCIAL_STORIES, ACCOUNT_FAMILY_LABELS } = await import('../src/apps/social/socialAccountsAndFeed.ts');

test('MAI.SPACE supports all 6 account families, Stories, follow state, polls, and weighted NPC engagement while preserving ProfileCanvas', () => {
  assert.deepEqual(Object.keys(ACCOUNT_FAMILY_LABELS).sort(), ['business', 'creator', 'institutional', 'media', 'personal', 'royal']);
  assert.ok(OFFICIAL_SOCIAL_ACCOUNTS.length >= 10);
  assert.ok(STARTER_SOCIAL_STORIES.length >= 4);

  let s = initialSocial();
  const originalLayout = JSON.stringify(normalizeLayout(s.layout));

  // Toggle follow on an official account
  const unfollowed = changeSocial(s, { type: 'follow-account', accountId: 'acct:themeridian' }, 28, 't1');
  assert.equal(unfollowed.ok, true);
  assert.ok(!unfollowed.state.followedAccounts.includes('acct:themeridian'));
  const refollowed = changeSocial(unfollowed.state, { type: 'follow-account', accountId: 'acct:themeridian' }, 28, 't2');
  assert.ok(refollowed.state.followedAccounts.includes('acct:themeridian'));
  s = refollowed.state;

  // Publish a structured visual template card and trigger weighted NPC reactions
  const published = changeSocial(
    s,
    {
      type: 'publish-template-post',
      npcVectors: { aelita: { friendship: 88, trust: 80 } },
      artifact: {
        templateId: 'tpl-social-music-release',
        brandKitId: 'velvet-studio',
        slotValues: {
          kicker: 'NEW TRACK',
          headline: 'Piano & Starlight Over Angel Bay',
          subhead: 'Recorded late evening in Aureline.',
        },
      },
    },
    28,
    'tpl-new-1',
  );
  assert.equal(published.ok, true);
  s = published.state;
  assert.equal(s.templatePosts[0].id, 'tpl-new-1');
  assert.ok((s.templateLikes['tpl-new-1'] || []).includes('aelita'));
  assert.ok(s.comments.some(c => c.target === 'tpl-new-1'));

  // Poll voting & story seen state survive restoreSocial without touching personal ProfileCanvas
  s = changeSocial(s, { type: 'vote-poll', id: 'soc-post-velvet-poll', optionIndex: 1 }, 28, 'v1').state;
  s = changeSocial(s, { type: 'mark-story-seen', id: 'story:sr-issue-01' }, 28, 'st1').state;

  const restored = restoreSocial(JSON.parse(JSON.stringify(s)));
  assert.equal(JSON.stringify(restored.layout), originalLayout);
  assert.equal(restored.pollSelections['soc-post-velvet-poll'], 1);
  assert.ok(restored.seenStoryIds.includes('story:sr-issue-01'));
});
