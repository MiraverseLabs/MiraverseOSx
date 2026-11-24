import missions from '../data/missions.json' with { type: 'json' };
import broadStreet from '../data/broad-street-assignment.json' with { type: 'json' };
import type { WorknetMission } from '../types';

/** Authored metadata and compensation. Procedures reference these IDs. */
export const MISSION_CATALOG: WorknetMission[] = [...missions, broadStreet] as WorknetMission[];
export const WORKNET_ASSIGNMENTS: Record<string, WorknetMission> = Object.fromEntries(MISSION_CATALOG.map(m => [m.id, m]));

