import { evaluateWorkOrder, type WorkOrder } from './ActivityEngine';
import { worldWorkTick, actorHasCommitment } from './WorkSchedule';
import { glasslineRelease, publicationId, restoreWorldPublications } from './WorldPublications';
import { PEOPLE, restoreSocial } from '../apps/social/socialModel';
import { getCharacterById } from '../game-content/characters/registry';
import { newsUrl } from '../apps/Browser/news/newsSite';

/** Called inside the same store transaction as acceptance and its compensation receipt. */
export function releaseAcceptedWork(game: any, order: WorkOrder): any {
  if (order.definitionId !== 'ms-shift-04' || order.status !== 'accepted' ||
    game.player.worknetOrders?.[order.definitionId]?.id !== order.id ||
    game.player.worknetOrders?.[order.definitionId]?.status !== 'accepted' ||
    !game.player.compensationReceiptIds?.includes(order.id) || !evaluateWorkOrder(order, game.player.taskResults || {})) return game;
  const publications = restoreWorldPublications(game.worldPublications);
  if (publications.stories.some(s => s.id === publicationId(order.id))) return game;
  const story = glasslineRelease(order.id, worldWorkTick(game), game.timeCycleCount);
  return { ...game, worldPublications: { ...publications, stories: [story, ...publications.stories] },
    worldEventLog: [{ id: story.sourceEventId, category: 'worknet', title: story.headline, summary: story.summary,
      publicSummary: story.summary, visibility: 'public', sourceRef: story.sourceRef, occurredAtTick: story.occurredAtTick,
      institution: 'WORKNET', cycle: story.cycle, timestamp: new Date().toISOString(), tags: ['worknet', 'public-service'] },
      ...(game.worldEventLog || []).slice(0, 29)] };
}

/** One bounded decision per release, driven by game-time advancement, even with MAI.SPACE closed. */
export function processPublicReactions(game: any): any {
  const tick = worldWorkTick(game);
  const publications = restoreWorldPublications(game.worldPublications);
  const due = publications.stories.filter(s => s.occurredAtTick < tick && !publications.reactionReceipts[s.id]);
  if (!due.length) return game;
  const social = restoreSocial(game.player.maiSpaceWorld, game.player);
  social.notifications = [...social.notifications];
  const canonicalId = 'char-jeremie-belpois';
  const persona = PEOPLE.find(p => p.characterId === canonicalId);
  // Authored public-contact window: afternoon/evening. This grants no employment or new identity.
  const available = [1, 2].includes(tick % 4) &&
    ![canonicalId, persona?.id].some(id => id && (actorHasCommitment(game.player.worknetWorkplace, id) ||
      game.player.worknetWorkplace?.subordinateLeaves?.some((l: any) => l.subordinateId === id && l.status === 'Approved' && tick < l.untilTick)));
  const eligible = persona && getCharacterById(canonicalId) && available && social.friends.includes(persona.id) &&
    !social.blocked.some(id => [persona.id, canonicalId].includes(id)) && !social.muted.some(id => [persona.id, canonicalId].includes(id));
  for (const story of due) {
    const postId = `reaction:${story.id}:${canonicalId}`;
    if (eligible && !social.posts.some(p => p.id === postId)) {
      // Stable choice, independent of render count, wall time and model availability.
      const seed = [...story.id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 0);
      const text = [
        'Good to see verified maintenance making it into the public Glassline updates. Small repairs matter to an everyday network.',
        'The latest Glassline service bulletin confirms a verified repair. Clear public updates make the network a little easier to follow.',
      ][seed % 2];
      social.posts.unshift({ id: postId, author: persona.id, kind: 'bulletin', title: 'Following the Glassline service update',
        html: `<p>${text}</p><p><a href="${newsUrl({ articleId: story.id })}">Read the public service update</a></p>`, audience: 'public', cycle: game.timeCycleCount, draft: false, likes: [] });
      social.notifications.unshift({ id: postId, text: `${persona.name || 'Your contact'} shared a Glassline service update.`, destination: 'Home', read: false });
    }
    publications.reactionReceipts[story.id] = { status: eligible ? 'delivered' : 'skipped', tick, ...(eligible ? { actorId: canonicalId } : {}) };
  }
  return { ...game, worldPublications: publications, player: { ...game.player, maiSpaceWorld: social } };
}
