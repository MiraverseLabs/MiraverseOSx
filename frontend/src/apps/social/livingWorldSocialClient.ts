/**
 * Client for autonomous Living-World NPC social media posts & neighborhood pulse.
 * Connects to /api/livingworld/clock and /api/livingworld/social/*.
 */
export interface LiveNpcSocialComment {
  id: string;
  authorName: string;
  text: string;
  worldTime: string;
}

export interface LiveNpcSocialPost {
  id: string;
  authorId: string;
  authorName: string;
  handle: string;
  realm: string;
  occupation: string;
  employer: string;
  activity: string;
  body: string;
  tags: string[];
  elapsedMinutes: number;
  day: number;
  worldTime: string;
  worldDate: string;
  likes: number;
  likedByPlayer: boolean;
  comments: LiveNpcSocialComment[];
  source: string;
}

export interface NeighborhoodPulseEntry {
  characterId: string;
  name: string;
  realm: string;
  occupation: string;
  activity: string;
}

export interface LiveSocialFeedResponse {
  runId: string;
  elapsedMinutes: number;
  worldDate: string;
  posts: LiveNpcSocialPost[];
  pulse: NeighborhoodPulseEntry[];
}

function canFetch(): boolean {
  return typeof fetch === 'function' && typeof window !== 'undefined' && /^https?:$/i.test(window.location?.protocol || '');
}

async function resolveActiveRunId(): Promise<string | null> {
  if (!canFetch()) return null;
  try {
    const res = await fetch('/api/livingworld/clock', { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      if (data?.runId) return String(data.runId);
    }
    const runsRes = await fetch('/api/livingworld/runs', { headers: { Accept: 'application/json' } });
    if (runsRes.ok) {
      const runsData = await runsRes.json();
      const first = Array.isArray(runsData?.runs) ? runsData.runs[0] : null;
      if (first?.runId || first?.run_id) return String(first.runId || first.run_id);
    }
  } catch {
    // Offline or Living World not running
  }
  return null;
}

export async function fetchLiveNpcSocialFeed(realm?: string): Promise<LiveSocialFeedResponse | null> {
  const runId = await resolveActiveRunId();
  if (!runId) return null;
  try {
    const params = new URLSearchParams({ runId });
    if (realm) params.set('realm', realm);
    const res = await fetch(`/api/livingworld/social/feed?${params.toString()}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    return (await res.json()) as LiveSocialFeedResponse;
  } catch {
    return null;
  }
}

export async function toggleLiveNpcPostLike(runId: string, postId: string): Promise<LiveNpcSocialPost | null> {
  if (!canFetch() || !runId) return null;
  try {
    const res = await fetch('/api/livingworld/social/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ runId, postId }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.post as LiveNpcSocialPost) || null;
  } catch {
    return null;
  }
}

export async function commentOnLiveNpcPost(
  runId: string,
  postId: string,
  text: string,
  authorName: string,
): Promise<LiveNpcSocialPost | null> {
  if (!canFetch() || !runId || !text.trim()) return null;
  try {
    const res = await fetch('/api/livingworld/social/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ runId, postId, text: text.trim(), authorName }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.post as LiveNpcSocialPost) || null;
  } catch {
    return null;
  }
}
