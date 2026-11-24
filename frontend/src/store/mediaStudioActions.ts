import { publishCreativeWork, publicEditorialSources } from '../gameplay/MediaStudio';
import { isWorldPaused } from '../integration/worldStateManager';
export interface MediaStudioActions {
  publishCreativeArtifact: (input: any) => { ok: boolean; message: string; artifact?: any };
  polishPublicMediaSource: (sourceId: string) => Promise<{ ok: boolean; message: string; text?: string }>;
}
export function createMediaStudioActions(set: any, get: any): MediaStudioActions {
  return {
    publishCreativeArtifact: input => {
      if (isWorldPaused()) return { ok: false, message: 'Resume the world before publishing player work.' };
      let result: ReturnType<typeof publishCreativeWork>;
      set((state: any) => {
        result = publishCreativeWork(state.gameplay, input, state.isLoggedIn);
        return result.gameplay ? { gameplay: result.gameplay } : {};
      });
      return { ok: result!.ok, message: result!.message, artifact: result!.artifact };
    },
    polishPublicMediaSource: async sourceId => {
      const state = get();
      const source = publicEditorialSources(state.gameplay).find(s => s.id === sourceId);
      if (!state.isLoggedIn || !source || isWorldPaused()) return { ok: false, message: 'Choose a released public source while the world is running.' };
      try {
        const response = await fetch('/api/ai/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(15000),
          body: JSON.stringify({ npc: 'Meridian editorial desk', activeApp: 'media-editor', contextScope: `public:${source.id}`,
            maxTokens: 200, prompt: 'Suggest a short plain-language deck using only these released facts. Do not add names, causes, dates, quotes or conclusions.',
            context: JSON.stringify({ headline: source.headline, summary: source.summary }) }) });
        if (!response.ok) throw new Error('Editorial assistance unavailable.');
        const data = await response.json();
        if (typeof data.text !== 'string' || !data.text.trim() || data.provider?.startsWith('native-')) throw new Error('Offline editorial copy retained.');
        return { ok: true, text: data.text.trim().slice(0,1800), message: 'Review this optional suggestion against the released facts before using it.' };
      } catch { return { ok: true, text: source.summary, message: 'Using the released summary. Optional assistance is offline or at its budget limit.' }; }
    },
  };
}
