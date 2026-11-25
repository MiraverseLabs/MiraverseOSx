// Fire-and-forget NPC dialogue logging. The OS player remains authoritative;
// this only mirrors the generated line to the optional Photino host.
import { npcEngine } from '../gameplay/NPCEngine';

export function logNpcDialogue(npcName: string, prompt: string): void {
  void npcEngine.generateDialogue(npcName, prompt).then((response) => {
    const entry = { npc: response.npc, source: response.source, text: response.text };
    const message = JSON.stringify({ action: 'npc_dialogue', payload: entry });
    try { (window as any)?.chrome?.webview?.postMessage?.(message); } catch { /* optional host */ }
    try { (window as any)?.external?.sendMessage?.(message); } catch { /* optional host */ }
  }).catch(() => undefined);
}