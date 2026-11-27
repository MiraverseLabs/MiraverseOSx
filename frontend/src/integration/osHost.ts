import type { WorldEventCategory, WorldNarrativeEvent } from '../gameplay/WorldEventEngine';

export interface OSWorldEventInput {
  category: WorldEventCategory;
  title: string;
  summary: string;
  institution: string;
  citizenMaid?: string;
  tags?: string[];
  impact?: WorldNarrativeEvent['impact'];
}

export interface OSPlayerRewardInput {
  credits?: number;
  xp?: number;
}

export interface OSHostAdapter {
  openAppWorkspace: (appId: string, section?: string) => void;
  recordWorldEvent: (params: OSWorldEventInput) => void;
  grantPlayerRewards: (rewards: OSPlayerRewardInput) => void;
}

// Register OS store side-effect hooks after store initialization to avoid circular imports
// between useOSStore, sibling stores (e.g. usePostalStore), and integration bridges (e.g. citizenBridge).
let hostAdapter: OSHostAdapter = {
  openAppWorkspace: () => {},
  recordWorldEvent: () => {},
  grantPlayerRewards: () => {},
};

export function registerOSHost(adapter: OSHostAdapter): void {
  hostAdapter = adapter;
}

export function openOSAppWorkspace(appId: string, section?: string): void {
  try {
    hostAdapter.openAppWorkspace(appId, section);
  } catch {
    // Fallback if OS store is not mounted.
  }
}

export function recordOSWorldEvent(params: OSWorldEventInput): void {
  try {
    hostAdapter.recordWorldEvent(params);
  } catch {
    // Ignore if OS store is not mounted.
  }
}

export function grantOSPlayerRewards(rewards: OSPlayerRewardInput): void {
  try {
    hostAdapter.grantPlayerRewards(rewards);
  } catch {
    // Ignore if OS store is not mounted.
  }
}
