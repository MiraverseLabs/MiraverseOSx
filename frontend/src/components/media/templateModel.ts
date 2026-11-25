import templatesCatalog from '../../game-content/media-assets/templates.json' with { type: 'json' };
import {
  getBrandKit,
  brandKitCssVariables,
  resolveEntityMediaSlot,
  type BrandTokens,
} from '../../game-content/worldAssetLibrary';

export type MediaChannel = 'social' | 'newspaper' | 'magazine' | 'document';

export type SocialTemplateKind =
  | 'personal-photo'
  | 'carousel'
  | 'text-announcement'
  | 'event-promotion'
  | 'product-advertisement'
  | 'recruitment'
  | 'breaking-news'
  | 'article-promotion'
  | 'birthday'
  | 'milestone'
  | 'public-statement'
  | 'poll-question'
  | 'music-release'
  | 'film-release'
  | 'sponsored-collaboration'
  | 'story-announcement';

export type VerificationTier =
  | 'canon_official'
  | 'verified_reporting'
  | 'opinion'
  | 'promo'
  | 'personal_perspective';

export interface TemplateSlotSpec {
  key: string;
  kind: 'text' | 'image' | 'list' | 'slides';
  label: string;
  required: boolean;
  maxLength?: number;
  slotRole?: string;
}

export interface MediaTemplateDefinition {
  id: string;
  name: string;
  channel: MediaChannel;
  socialKind?: SocialTemplateKind;
  aspectRatio: string;
  defaultBrandKitId: string;
  slots: TemplateSlotSpec[];
}

export interface CarouselSlideData {
  id: string;
  headline: string;
  caption: string;
  assetId?: string;
  entityId?: string;
}

export interface PublishedMediaArtifact {
  id: string;
  templateId: string;
  brandKitId: string;
  channel: MediaChannel;
  verificationTier: VerificationTier;
  slotValues: {
    kicker?: string;
    headline: string;
    subhead?: string;
    byline?: string;
    issueNumber?: string;
    issueDate?: string;
    dateLocation?: string;
    pullQuote?: string;
    body?: string;
    imageAssetId?: string;
    primaryEntityId?: string;
    coverLines?: string[];
    pollOptions?: string[];
    slides?: CarouselSlideData[];
  };
  tokenOverrides?: Partial<BrandTokens>;
  /** Reserved forward-compatible slot for future Fabric.js / GrapesJS canvas layers */
  canvasOverrides?: Record<string, unknown>;
  entityRefs: string[];
  authorId: string;
  authorName: string;
  publisherOrgId?: string;
  publishedCycle: number;
  createdAt: string;
}

export interface CollectibleIssuePage {
  id: string;
  pageNumber: number;
  kind: 'cover' | 'contents' | 'editor-letter' | 'department-opener' | 'feature' | 'interview' | 'advertisement' | 'back-cover';
  department?: string;
  kicker: string;
  headline: string;
  subhead?: string;
  byline?: string;
  pullQuote?: string;
  paragraphs: string[];
  assetId?: string;
  entityId?: string;
  adSponsor?: string;
  adCta?: string;
  linkedArticleId?: string;
}

export interface CollectibleIssue {
  id: string;
  publicationId: 'the-social-register' | 'the-meridian';
  brandKitId: string;
  issueNumber: string;
  title: string;
  theme: string;
  cycle: number;
  publishedLabel: string;
  priceCredits: number;
  pages: CollectibleIssuePage[];
}

export const MEDIA_TEMPLATES: readonly MediaTemplateDefinition[] = templatesCatalog.templates as MediaTemplateDefinition[];

export function getMediaTemplate(templateId: string): MediaTemplateDefinition | undefined {
  return MEDIA_TEMPLATES.find(t => t.id === templateId);
}

export function listTemplatesByChannel(channel?: MediaChannel): MediaTemplateDefinition[] {
  return channel ? MEDIA_TEMPLATES.filter(t => t.channel === channel) : [...MEDIA_TEMPLATES];
}

export function validateMediaArtifactInput(input: Partial<PublishedMediaArtifact>): {
  ok: boolean;
  errors: string[];
  artifact?: PublishedMediaArtifact;
} {
  const errors: string[] = [];
  if (!input || typeof input !== 'object' || !input.slotValues || typeof input.slotValues !== 'object') return { ok: false, errors: ['A structured media composition is required.'] };
  const tpl = input.templateId ? getMediaTemplate(input.templateId) : undefined;
  if (!tpl) errors.push(`Unknown media template '${input.templateId || ''}'.`);
  const headline = typeof input.slotValues.headline === 'string' ? input.slotValues.headline.trim() : '';
  for (const key of ['kicker','subhead','byline','issueNumber','issueDate','dateLocation','pullQuote','body','imageAssetId','primaryEntityId']) {
    const v = input.slotValues[key];
    if (v !== undefined && (typeof v !== 'string' || v.length > (key === 'body' ? 20000 : 2000))) errors.push(`Invalid ${key} field.`);
  }
  if (input.entityRefs !== undefined && (!Array.isArray(input.entityRefs) || input.entityRefs.length > 30 || input.entityRefs.some(v => typeof v !== 'string'))) errors.push('Invalid entity references.');
  if (input.tokenOverrides && Object.values(input.tokenOverrides).some(v => typeof v !== 'string' || /[<>;{}]/.test(v) || v.length > 200)) errors.push('Brand token overrides must be plain color or font values.');
  if (input.slotValues.slides !== undefined && (!Array.isArray(input.slotValues.slides) || input.slotValues.slides.length > 12 || input.slotValues.slides.some(s => !s || typeof s.id !== 'string' || typeof s.headline !== 'string' || typeof s.caption !== 'string'))) errors.push('Invalid carousel slides.');
  for (const key of ['pollOptions', 'coverLines']) if (input.slotValues[key] !== undefined && (!Array.isArray(input.slotValues[key]) || input.slotValues[key].length > 20 || input.slotValues[key].some(v => typeof v !== 'string' || v.length > 500))) errors.push(`Invalid ${key}.`);
  if (headline.length < 2) errors.push('A headline of at least 2 characters is required.');

  if (tpl) {
    for (const slot of tpl.slots) {
      if (!slot.required) continue;
      if (slot.key === 'headline' && !headline) errors.push(`${slot.label} is required.`);
      else if (slot.kind === 'text' && slot.key !== 'headline') {
        const val = String((input.slotValues as any)?.[slot.key] || '').trim();
        if (!val) errors.push(`${slot.label} is required.`);
      } else if (slot.kind === 'slides' && (!Array.isArray(input.slotValues?.slides) || input.slotValues!.slides!.length === 0)) {
        errors.push('At least one carousel slide is required.');
      } else if (slot.kind === 'list' && slot.key === 'pollOptions' && (!Array.isArray(input.slotValues?.pollOptions) || input.slotValues!.pollOptions!.length < 2)) {
        errors.push('At least two poll choices are required.');
      }
    }
  }

  if (errors.length > 0 || !tpl) return { ok: false, errors };

  const validTiers: VerificationTier[] = ['canon_official', 'verified_reporting', 'opinion', 'promo', 'personal_perspective'];
  const tier: VerificationTier = validTiers.includes(input.verificationTier as VerificationTier)
    ? (input.verificationTier as VerificationTier)
    : tpl.channel === 'newspaper'
      ? 'verified_reporting'
      : 'personal_perspective';

  const artifact: PublishedMediaArtifact = {
    id: input.id || `MED-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    templateId: tpl.id,
    brandKitId: input.brandKitId || tpl.defaultBrandKitId,
    channel: tpl.channel,
    verificationTier: tier,
    slotValues: {
      ...input.slotValues,
      headline: headline.slice(0, 180),
    },
    tokenOverrides: input.tokenOverrides,
    canvasOverrides: input.canvasOverrides,
    entityRefs: Array.isArray(input.entityRefs) ? [...new Set(input.entityRefs)] : [],
    authorId: input.authorId || 'you',
    authorName: input.authorName || 'Citizen Creator',
    publisherOrgId: input.publisherOrgId,
    publishedCycle: Number.isSafeInteger(input.publishedCycle) ? input.publishedCycle! : 28,
    createdAt: input.createdAt || new Date().toISOString(),
  };

  return { ok: true, errors: [], artifact };
}

export function verificationBadgeLabel(tier: VerificationTier): string {
  switch (tier) {
    case 'canon_official':
      return 'Official Record';
    case 'verified_reporting':
      return 'Verified Reporting';
    case 'opinion':
      return 'Editorial Perspective';
    case 'promo':
      return 'Sponsored / House Notice';
    case 'personal_perspective':
      return 'Personal Dispatch';
  }
}

export function buildCollectibleIssueTextSummary(issue: CollectibleIssue): string {
  const lines: string[] = [
    `${issue.title.toUpperCase()} — ${issue.issueNumber}`,
    `Theme: ${issue.theme}`,
    `Published: ${issue.publishedLabel} (Cycle ${issue.cycle})`,
    '══════════════════════════════════════════════════════════════',
    '',
  ];
  for (const page of issue.pages) {
    lines.push(`[Page ${page.pageNumber} · ${page.kicker}] ${page.headline}`);
    if (page.subhead) lines.push(`  ${page.subhead}`);
    if (page.byline) lines.push(`  ${page.byline}`);
    if (page.pullQuote) lines.push(`  “${page.pullQuote}”`);
    for (const p of page.paragraphs) lines.push(`  ${p}`);
    lines.push('');
  }
  return lines.join('\n');
}

export function buildArtifactStandaloneHtml(artifact: PublishedMediaArtifact): string {
  const kit = getBrandKit(artifact.brandKitId);
  const vars = brandKitCssVariables(artifact.brandKitId, artifact.tokenOverrides);
  const cssVarText = Object.entries(vars).map(([k, v]) => `${k}:${v}`).join(';');
  const resolved = resolveEntityMediaSlot({
    assetId: artifact.slotValues.imageAssetId,
    entityId: artifact.slotValues.primaryEntityId || artifact.entityRefs[0],
    brandKitId: artifact.brandKitId,
    fallbackLabel: artifact.slotValues.headline,
  });
  const esc = (s?: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>${esc(artifact.slotValues.headline)} — ${esc(kit.name)}</title>
<style>
  body { margin: 0; padding: 32px; background: #f3f4f8; font-family: Georgia, serif; }
  article { max-width: 720px; margin: 0 auto; padding: 36px; background: var(--mk-bg-surface); color: var(--mk-text-primary); border: 2px solid var(--mk-border-ornament); }
  .kicker { text-transform: uppercase; letter-spacing: 0.16em; font-size: 12px; color: var(--mk-accent-primary); font-weight: 700; }
  h1 { font-family: var(--mk-font-display); font-size: 36px; margin: 12px 0; line-height: 1.15; }
  .deck { font-style: italic; color: var(--mk-text-secondary); font-size: 18px; margin-bottom: 18px; }
  blockquote { border-left: 3px solid var(--mk-accent-primary); padding-left: 16px; font-style: italic; margin: 20px 0; }
  p { line-height: 1.7; font-size: 16px; }
  footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid var(--mk-border-ornament); font-size: 12px; color: var(--mk-text-secondary); }
</style>
</head>
<body>
  <article style="${esc(cssVarText)}">
    <div class="kicker">${esc(artifact.slotValues.kicker || kit.name)} · ${esc(verificationBadgeLabel(artifact.verificationTier))}</div>
    <h1>${esc(artifact.slotValues.headline)}</h1>
    ${artifact.slotValues.subhead ? `<p class="deck">${esc(artifact.slotValues.subhead)}</p>` : ''}
    ${artifact.slotValues.pullQuote ? `<blockquote>“${esc(artifact.slotValues.pullQuote)}”</blockquote>` : ''}
    ${artifact.slotValues.body ? artifact.slotValues.body.split(/\n+/).map(p => `<p>${esc(p)}</p>`).join('') : ''}
    <footer>Published by ${esc(artifact.authorName)} · Cycle ${artifact.publishedCycle} · Visual Slot: ${esc(resolved.caption)}</footer>
  </article>
</body>
</html>`;
}
