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

const {
  MEDIA_TEMPLATES,
  listTemplatesByChannel,
  validateMediaArtifactInput,
  buildArtifactStandaloneHtml,
} = await import('../src/components/media/templateModel.ts');
const { NEWS_SITE, parseNewsLocation, newsUrl } = await import('../src/apps/Browser/news/newsSite.ts');
const { MERIDIAN_DEPARTMENTS, buildMeridianExpandedEdition, buildMeridianCollectibleIssue } = await import('../src/apps/Browser/news/newsModel.ts');
const {
  SOCIAL_REGISTER_SITE,
  SOCIAL_REGISTER_DEPARTMENTS,
  SOCIAL_REGISTER_ARTICLES,
  buildSocialRegisterIssue01,
  parseSocialRegisterLocation,
  socialRegisterUrl,
  socialRegisterSearchRecords,
} = await import('../src/apps/Browser/publications/socialRegisterModel.ts');

test('Shared Template Engine provides all 16 social templates plus newspaper, magazine, and document layouts', () => {
  const social = listTemplatesByChannel('social');
  assert.equal(social.length, 16);
  assert.ok(MEDIA_TEMPLATES.length >= 22);

  const valid = validateMediaArtifactInput({
    templateId: 'tpl-social-breaking-news',
    brandKitId: 'the-meridian',
    verificationTier: 'verified_reporting',
    slotValues: {
      kicker: 'WORLD',
      headline: 'Concord Envoys Convene in Aureline',
      subhead: 'Delegates from all eight realms open autumn session.',
    },
    authorName: 'The Meridian',
  });
  assert.equal(valid.ok, true);
  assert.match(buildArtifactStandaloneHtml(valid.artifact), /Verified Reporting/);

  const invalid = validateMediaArtifactInput({ templateId: 'tpl-social-poll', slotValues: { headline: 'Poll?', pollOptions: ['Only one'] } });
  assert.equal(invalid.ok, false);
});

test('The Meridian (meridian.mer) covers 10 departments while preserving full dispatch.mer URL and bookmark compatibility', () => {
  assert.equal(NEWS_SITE.domain, 'meridian.mer');
  assert.equal(MERIDIAN_DEPARTMENTS.length, 11); // All Desks + 10 departments
  assert.equal(parseNewsLocation('https://meridian.mer/article/faith-recovery').valid, true);
  assert.equal(parseNewsLocation('https://dispatch.mer/article/faith-recovery').valid, true);
  assert.equal(parseNewsLocation(newsUrl({ section: 'Economy' })).section, 'Economy');

  const expanded = buildMeridianExpandedEdition({ cycle: 28, corruption: 16.2 });
  assert.ok(expanded.length >= 11);
  const issue = buildMeridianCollectibleIssue({ cycle: 28, corruption: 16.2 });
  assert.equal(issue.publicationId, 'the-meridian');
  assert.ok(issue.pages.length >= 4);
});

test('The Social Register (socialregister.mer) launches all 10 confirmed departments and Issue 01 ("Between Tradition and Tomorrow")', () => {
  assert.equal(SOCIAL_REGISTER_SITE.domain, 'socialregister.mer');
  assert.equal(SOCIAL_REGISTER_DEPARTMENTS.length, 11); // All Departments + 10 confirmed departments
  assert.equal(SOCIAL_REGISTER_ARTICLES.length, 10);

  const issue01 = buildSocialRegisterIssue01(28);
  assert.equal(issue01.theme, 'Between Tradition and Tomorrow');
  assert.ok(issue01.pages.length >= 7);

  assert.equal(parseSocialRegisterLocation(socialRegisterUrl({ view: 'issue-01' })).view, 'issue-01');
  assert.equal(parseSocialRegisterLocation(socialRegisterUrl({ department: 'The Courts' })).department, 'The Courts');
  assert.ok(socialRegisterSearchRecords('Vivienne Rose').length >= 1);
});
