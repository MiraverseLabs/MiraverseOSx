import { create } from 'zustand';
import { get, set } from 'idb-keyval';
import { ecosystemEngine } from '../gameplay/EcosystemEngine';
import { missionDirector } from '../gameplay/MissionDirector';
import { harmonyEngine } from '../gameplay/HarmonyEngine';
import { npcEngine } from '../gameplay/NPCEngine';
import { useOSStore } from './useOSStore';
import { WORKNET_ASSIGNMENTS } from '../gameplay/ActivityEngine';
import { isWorldPaused } from '../integration/worldStateManager';

declare global {
  interface External {
    sendMessage?: (msg: string) => void;
    receiveMessage?: (callback: (rawMessage: string) => void) => void;
  }
  interface Window {
    chrome?: {
      webview?: {
        postMessage?: (msg: string) => void;
      };
    };
  }
}

// Photino Bridge helper (optional native notifications)
const sendToPhotinoHost = (action: string, payload: Record<string, any> = {}) => {
  const msg = JSON.stringify({ action, payload });
  if (window.external && window.external.sendMessage) {
    window.external.sendMessage(msg);
  } else if (window.chrome && window.chrome.webview && window.chrome.webview.postMessage) {
    window.chrome.webview.postMessage(msg);
  }
};

export interface GameMission {
  id: string;
  title: string;
  type: string;
  region: string;
  faction: string;
  difficulty: string;
  description: string;
  rewards: { xp?: number; credits?: number; item?: string };
  status: string;
}

export interface DialogueEntry {
  npc: string;
  source: string;
  text: string;
}

export interface GameStoreState {
  tickCount: number;
  worldState: {
    corruption_level: number;
    prism_harmonic: number;
    aether_density: number;
    astral_phase: string;
    weather_condition: string;
    active_anomalies: number;
    regional_health: Record<string, number>;
  };
  player: {
    name: string;
    handle: string;
    class: string;
    level: number;
    xp: number;
    credits: number;
    biometrics: {
      dermalNodes: string;
      opticalGeometry: string;
      auraTelemetry: string;
    };
  };
  missions: GameMission[];
  dialogueHistory: DialogueEntry[];
  spellLog: any[];
  ipcConnected: boolean;

  initializeStore: () => Promise<void>;
  registerPlayer: (profileData: Partial<GameStoreState['player']>) => Promise<void>;
  requestTick: () => void;
  requestMission: () => void;
  completeMission: (missionId: string) => { ok: boolean; reason?: string };
  requestNPCDialogue: (npcName: string, prompt: string) => Promise<void>;
  requestSpellResolution: (element: string, power: number, runeLevel: number) => void;
  handlePhotinoResponse: (data: { action: string; payload: any }) => void;
}

export const useGameStore = create<GameStoreState>((setStore, getStore) => ({
  // World & Ecosystem State (Initialized from EcosystemEngine)
  tickCount: 1,
  worldState: ecosystemEngine.getState(),

  // Player Profile
  player: {
    name: "Netrunner One",
    handle: "Cipher-9",
    class: "Aether Scholar",
    level: 1,
    xp: 250,
    credits: 1500,
    biometrics: {
      dermalNodes: "Synchronized",
      opticalGeometry: "Calibrated",
      auraTelemetry: "Alpha 4"
    }
  },

  // Active Missions
  missions: [
    {
      id: "MIS-INIT-01",
      title: "Operation Glass Shadow",
      type: "Infiltration",
      region: "Aureline Core",
      faction: "DGA High Command",
      difficulty: "Novice",
      description: "Bypass regional firewalls and sync your biometric profile.",
      rewards: { xp: 200, credits: 350, item: "Aura Credits" },
      status: "Available"
    },
    {
      id: "MIS-INIT-02",
      title: "Aether Matrix Stabilization",
      type: "Aether Purification",
      region: "Orynvell Shallows",
      faction: "Aureline Academy",
      difficulty: "Adept",
      description: "Purge corruption spores infecting the regional node with SpellForge runes.",
      rewards: { xp: 350, credits: 600, item: "Elemental Runes" },
      status: "Available"
    }
  ],

  // Dialogue Log
  dialogueHistory: [
    {
      npc: "Mai",
      source: "system",
      text: "Welcome to MiraverseOSx! Celestial native TypeScript simulation active."
    }
  ],

  // Cast Spell Log
  spellLog: [],

  // IPC Connection Status
  ipcConnected: false,

  // Actions
  initializeStore: async () => {
    try {
      const cachedPlayer = await get('miraverse_player_profile');
      if (cachedPlayer) {
        setStore({ player: cachedPlayer });
      }
    } catch (err) {
      console.warn('idb-keyval error loading profile:', err);
    }

    if (window.external && window.external.receiveMessage) {
      setStore({ ipcConnected: true });
      window.external.receiveMessage((rawMessage: string) => {
        try {
          const data = JSON.parse(rawMessage);
          getStore().handlePhotinoResponse(data);
        } catch (e) {
          console.error('Error parsing Photino message:', e);
        }
      });
    }
  },

  registerPlayer: async (profileData) => {
    const updatedPlayer = { ...getStore().player, ...profileData };
    setStore({ player: updatedPlayer });
    try {
      await set('miraverse_player_profile', updatedPlayer);
    } catch (err) {
      console.warn('idb-keyval error saving profile:', err);
    }
  },

  requestTick: () => {
    const tickRes = ecosystemEngine.processTick(1.0);
    setStore({
      tickCount: tickRes.tick,
      worldState: tickRes.state
    });
    sendToPhotinoHost('tick_result', tickRes);
  },

  requestMission: () => {
    const player = useOSStore.getState().gameplay.player;
    const newMission = missionDirector.generateMission(player.level);
    setStore((state) => ({
      missions: [newMission, ...state.missions.slice(0, 4)]
    }));
    sendToPhotinoHost('mission_result', newMission);
  },

  // Legacy callers must use the same receipts and one-time payment rules as WORKNET.
  // Generated OperationMission objects are previews, not independently payable work orders.
  completeMission: (missionId) => {
    const osState = useOSStore.getState();
    if (!osState.isLoggedIn || isWorldPaused()) {
      return { ok: false, reason: 'Log in and resume the world before finalizing work.' };
    }
    const assignment = Object.hasOwn(WORKNET_ASSIGNMENTS, missionId) ? WORKNET_ASSIGNMENTS[missionId] : undefined;
    if (!assignment) {
      return { ok: false, reason: 'Generated operations are previews. Complete a verified WORKNET assignment to receive rewards.' };
    }
    const result = osState.completeWorknetMission(assignment);
    if (!result.ok) return result;
    const player = useOSStore.getState().gameplay.player;
    setStore(state => ({
      player: { ...state.player, xp: player.xp, level: player.level, credits: player.credits },
      missions: state.missions.filter(mission => mission.id !== missionId),
    }));
    return result;
  },

  requestNPCDialogue: async (npcName, prompt) => {
    const response = await npcEngine.generateDialogue(npcName, prompt);
    const entry: DialogueEntry = {
      npc: response.npc,
      source: response.source,
      text: response.text
    };
    setStore((state) => ({
      dialogueHistory: [entry, ...state.dialogueHistory.slice(0, 9)]
    }));
    sendToPhotinoHost('npc_dialogue', entry);
  },

  requestSpellResolution: (element, power, runeLevel) => {
    const p = getStore().player;
    const corruption = getStore().worldState.corruption_level;
    const resolution = harmonyEngine.calculateSpellPower(element, power, runeLevel, p.level, corruption);
    setStore((state) => ({
      spellLog: [resolution, ...state.spellLog.slice(0, 4)]
    }));
    sendToPhotinoHost('resolution_result', resolution);
  },

  handlePhotinoResponse: (data) => {
    const { action, payload } = data;
    if (action === 'tick_result') {
      setStore({
        tickCount: payload.tick,
        worldState: payload.state
      });
    } else if (action === 'mission_result') {
      setStore((state) => ({
        missions: [payload, ...state.missions.slice(0, 4)]
      }));
    } else if (action === 'npc_result') {
      setStore((state) => ({
        dialogueHistory: [payload, ...state.dialogueHistory.slice(0, 9)]
      }));
    } else if (action === 'resolution_result') {
      setStore((state) => ({
        spellLog: [payload, ...state.spellLog.slice(0, 4)]
      }));
    }
  }
}));
