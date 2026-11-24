import { validateMediaArtifactInput, type PublishedMediaArtifact } from '../components/media/templateModel';
import { evaluateCreativeStudioPermissions, validateStudioPublishPermission } from './creativeStudioModel';
import { getMediaAssetById } from '../game-content/worldAssetLibrary';
import { getCharacterById } from '../game-content/characters/registry';
import { PEOPLE, restoreSocial } from '../apps/social/socialModel';
import { restoreFyloState, formatFileSize } from '../apps/files/fyloStore';
import { worldWorkTick } from './WorkSchedule';
import { restoreWorldPublications } from './WorldPublications';
import { getCelestialState } from '../data/meridionWorld';

export interface MediaStudioState {
  version: 1;
  lastEditorialCycle: number;
  editorialReceipts: string[];
  feedbackReceipts: string[];
  portfolioCycles: number[];
}
const strings = (v: any): string[] => Array.isArray(v) ? [...new Set<string>(v.filter(x => typeof x === 'string' && x.length < 300))] : [];
export function restoreMediaStudio(raw: any, cycle = 28): MediaStudioState {
  return { version: 1, lastEditorialCycle: Number.isSafeInteger(raw?.lastEditorialCycle) && raw.lastEditorialCycle >= 0 ? raw.lastEditorialCycle : cycle,
    editorialReceipts: strings(raw?.editorialReceipts), feedbackReceipts: strings(raw?.feedbackReceipts),
    portfolioCycles: Array.isArray(raw?.portfolioCycles) ? [...new Set<number>(raw.portfolioCycles.filter(Number.isSafeInteger))] : [] };
}
export const mediaFingerprint = (value: string): string => [...value].reduce((n,c) => Math.imul(n ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261).toString(16);
export interface EditorialSource { id: string; headline: string; summary: string; cycle: number; institution: string; assetId?: string }
/** Public copy only. Never pass narrative objects, private stage text or NPC dialogue to an editor/model. */
export function publicEditorialSources(game: any): EditorialSource[] {
  const cycle = game.timeCycleCount ?? 28;
  const sources: EditorialSource[] = restoreWorldPublications(game.worldPublications).stories.filter(s => s.cycle <= cycle)
    .map(s => ({ id: s.sourceEventId, headline: s.headline, summary: s.summary, cycle: s.cycle, institution: 'WORKNET', assetId: s.assetId }));
  const seen = new Set(sources.map(s => s.id));
  for (const e of Array.isArray(game.worldEventLog) ? game.worldEventLog : []) {
    if (!e || seen.has(e.id) || e.visibility !== 'public' || e.citizenMaid ||
      !['civic', 'worknet', 'housing', 'archive'].includes(e.category) || typeof e.id !== 'string' || e.id.startsWith('EDITORIAL:') ||
      !Number.isSafeInteger(e.cycle) || e.cycle > cycle ||
      typeof e.publicSummary !== 'string' || !e.publicSummary.trim() || e.publicSummary.length > 2000 ||
      (e.occurredAtTick !== undefined && (!Number.isSafeInteger(e.occurredAtTick) || e.occurredAtTick > worldWorkTick(game)))) continue;
    // Titles and institutions in legacy logs are not necessarily cleared for release.
    sources.push({ id: e.id, headline: 'Public service dispatch', summary: e.publicSummary, cycle: e.cycle, institution: 'Public service desk' });
    seen.add(e.id);
  }
  return sources;
}
export function approvedEditorialAsset(id?: string): string | undefined {
  const a = getMediaAssetById(id);
  return a && a.provenance.approvalStatus === 'approved' && (!a.scope || ['canon','admin_canon'].includes(a.scope)) ? a.id : undefined;
}

/** Player publishing commits content, portfolio and bounded feedback together. Compensation stays with accepted WORKNET orders. */
export function publishCreativeWork(game: any, input: any, loggedIn: boolean): { ok: boolean; message: string; gameplay?: any; artifact?: PublishedMediaArtifact } {
  if (!input || typeof input !== 'object') return { ok: false, message: 'Choose a valid composition.' };
  const perms = evaluateCreativeStudioPermissions(game.player, loggedIn);
  const gate = validateStudioPublishPermission(perms, input.channel, input.verificationTier);
  if (!gate.ok) return { ok: false, message: gate.reason! };
  if (input.verificationTier === 'canon_official') return { ok: false, message: 'Stage official canon in the Admin Console for validation and a pre-publish checkpoint.' };
  const selectedSource = publicEditorialSources(game).find(s => s.id === input.sourceEventId);
  if (input.verificationTier === 'verified_reporting' && !selectedSource) return { ok: false, message: 'Verified reporting requires a released public source. Choose Opinion for an independent account.' };
  let checked: ReturnType<typeof validateMediaArtifactInput>;
  try { checked = validateMediaArtifactInput(input); } catch { return { ok: false, message: 'The composition contains invalid fields.' }; }
  if (!checked.ok || !checked.artifact) return { ok: false, message: checked.errors.join(' ') };
  if (checked.artifact.channel !== input.channel) return { ok: false, message: 'The selected template belongs to a different distribution channel.' };
  const a = checked.artifact;
  const adSpend = input.adSpend ?? 0;
  if (!Number.isSafeInteger(adSpend) || adSpend < 0 || adSpend > 50 || (adSpend > 0 && a.verificationTier !== 'promo'))
    return { ok: false, message: 'Promotion budgets must be 0–50 whole game credits and apply only to Promotion.' };
  const slotValues = { ...a.slotValues, byline: game.player.name || 'Citizen Creator' };
  const id = `creative:${game.timeCycleCount}:${mediaFingerprint(JSON.stringify([a.channel,a.templateId,a.brandKitId,a.verificationTier,slotValues,a.entityRefs,adSpend]))}`;
  const existing: PublishedMediaArtifact[] = Array.isArray(game.publishedMediaArtifacts) ? game.publishedMediaArtifacts : [];
  if (existing.some(p => p.id === id)) return { ok: true, message: 'This composition is already published.', artifact: existing.find(p => p.id === id) };
  if (adSpend > 0 && (!Number.isSafeInteger(game.player.credits) || game.player.credits < adSpend)) return { ok: false, message: 'Insufficient game credits for this promotion budget.' };
  const artifact = { ...a, id, slotValues, authorId: 'you', authorName: game.player.name || 'Citizen Creator',
    publisherOrgId: a.channel === 'newspaper' ? 'ORG_THE_MERIDIAN' : a.channel === 'magazine' ? 'ORG_SOCIAL_REGISTER' : undefined,
    publishedCycle: game.timeCycleCount, createdAt: new Date().toISOString(), publicationOrigin: 'player',
    ...(selectedSource ? { sourceEventId: selectedSource.id } : {}) };
  const state = restoreMediaStudio(game.mediaStudio, game.timeCycleCount);
  const player = { ...game.player, ...(adSpend > 0 ? { credits: game.player.credits - adSpend } : {}) };
  if (!state.portfolioCycles.includes(game.timeCycleCount)) {
    state.portfolioCycles.push(game.timeCycleCount);
    player.creativePortfolioIds = [...new Set([...(player.creativePortfolioIds || []), id])];
    if (artifact.verificationTier === 'verified_reporting' && perms.hasPressContract)
      player.reputation = { ...player.reputation, press: Math.min(100, (player.reputation?.press ?? 50) + 1) };
  }
  if (artifact.channel === 'social') {
    const social = restoreSocial(player.maiSpaceWorld, player.maiSpaceProfile);
    player.maiSpaceWorld = { ...social, templatePosts: [artifact, ...(social.templatePosts || []).filter(p => p.id !== id)] };
  }
  if (artifact.channel === 'document') {
    const fylo = restoreFyloState(player.fylo);
    const body = [artifact.slotValues.headline, artifact.slotValues.subhead, artifact.slotValues.body].filter(Boolean).join('\n\n');
    // Fylo's text manuscript remains editable; a real PDF is exported by the existing document reader.
    fylo.files[id] = { id, name: `${artifact.slotValues.headline.replace(/[^a-zA-Z0-9 -]/g,'').slice(0,60) || 'Studio manuscript'}.doc`, type: 'doc', dir: '/documents',
      body, size: formatFileSize(body), desc: 'Creative Studio manuscript', owner: 'player', origin: 'document-studio', publisher: artifact.authorName,
      createdAt: artifact.createdAt, updatedAt: artifact.createdAt };
    fylo.folders = [...new Set([...fylo.folders, '/documents'])];
    player.fylo = fylo;
  }
  // Publishing records a bounded memory; opinion/promotion never earns trust or "proof".
  const social = restoreSocial(player.maiSpaceWorld, player.maiSpaceProfile);
  const featured = artifact.entityRefs.map(getCharacterById).filter(Boolean).map(c => PEOPLE.find(p => p.characterId === c!.id)).filter(Boolean);
  const eligible = featured.filter(p => social.friends.includes(p!.id) && !social.blocked.includes(p!.id) && !social.muted.includes(p!.id) &&
    !state.feedbackReceipts.includes(`actor:${game.timeCycleCount}:${p!.characterId}`));
  if (eligible.length) {
    state.feedbackReceipts.push(...eligible.map(p => `actor:${game.timeCycleCount}:${p!.characterId}`));
    player.mediaMemories = [...(player.mediaMemories || []), { artifactId: id, cycle: game.timeCycleCount, headline: artifact.slotValues.headline, actorIds: eligible.map(p => p!.characterId) }].slice(-20);
    if (artifact.verificationTier === 'verified_reporting') {
      player.npcVectors = { ...player.npcVectors };
      for (const p of eligible.slice(0,3)) {
        const before = player.npcVectors[p!.id] || { friendship:50, trust:50, rivalry:0, sync:50, corruption:0 };
        player.npcVectors[p!.id] = { ...before, trust: Math.min(100, (before.trust ?? 50) + 1) };
      }
    }
  }
  return { ok: true, message: `Published “${artifact.slotValues.headline}”. Commission pay is issued through accepted WORKNET orders.`, artifact,
    gameplay: { ...game, player, mediaStudio: state, publishedMediaArtifacts: [artifact,...existing] } };
}

/** At most two public beats per cycle, plus one celestial column; no catch-up loop or model requests. */
export function advanceDynamicMedia(game: any): any {
  const cycle = game.timeCycleCount ?? 28;
  const state = restoreMediaStudio(game.mediaStudio, cycle);
  if (cycle <= state.lastEditorialCycle) return game;
  state.lastEditorialCycle = cycle;
  const sources = publicEditorialSources(game).filter(s => !state.editorialReceipts.includes(s.id)).sort((a,b) => b.cycle-a.cycle || a.id.localeCompare(b.id)).slice(0,2);
  const celestial = getCelestialState(cycle);
  const ambient: EditorialSource = { id: `celestial:${cycle}`, headline: 'Under Radiance and Echo',
    summary: `Cycle ${cycle}: Radiance is ${celestial.radiance.phaseName}; Echo is ${celestial.echo.phaseName}. ${celestial.alignment}.`, cycle, institution: 'The Meridian · Life Desk' };
  const generated: PublishedMediaArtifact[] = [];
  const social = restoreSocial(game.player.maiSpaceWorld, game.player.maiSpaceProfile);
  const templatePosts = [...(social.templatePosts || [])];
  for (const s of [...sources, ambient]) {
    const id = `EDITORIAL:${s.id}`;
    if ((game.publishedMediaArtifacts || []).some((a: any) => a.id === id)) { state.editorialReceipts.push(s.id); continue; }
    const artifact: PublishedMediaArtifact = { id, templateId: 'tpl-news-article', brandKitId: 'the-meridian', channel: 'newspaper', verificationTier: 'verified_reporting',
      slotValues: { kicker: s.id.startsWith('celestial:') ? 'Life' : 'Local Editions', headline: s.headline, subhead: s.summary,
        body: `${s.summary}\n\n${s.id.startsWith('celestial:') ? 'This is a public calendar column, not a live observation or a forecast.' : 'From a released public service summary. The report does not establish responsibility or replace institutional evidence.'}`,
        byline: s.institution, imageAssetId: approvedEditorialAsset(s.assetId) }, entityRefs: [], authorId: 'acct:themeridian', authorName: 'The Meridian · Public Desk',
      publisherOrgId: 'ORG_THE_MERIDIAN', publishedCycle: cycle, createdAt: `game-cycle:${cycle}` };
    generated.push(artifact);
    const post = { ...artifact, id: `${id}:social`, templateId: 'tpl-social-article-promo', channel: 'social' as const };
    if (!social.blocked.includes('acct:themeridian') && !social.muted.includes('acct:themeridian') && social.followedAccounts?.includes('acct:themeridian')) templatePosts.unshift(post);
    state.editorialReceipts.push(s.id);
  }
  return { ...game, mediaStudio: state, publishedMediaArtifacts: [...generated,...(game.publishedMediaArtifacts || [])], player: { ...game.player, maiSpaceWorld: { ...social, templatePosts } } };
}
