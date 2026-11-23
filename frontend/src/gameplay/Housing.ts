export type HomeAmbiance = 'warm' | 'morning' | 'lantern' | 'starlight';
export type HomeArea = 'rest' | 'study' | 'lounge' | 'keepsakes';
export interface HomeMemo { id: string; title: string; body: string }
export interface HomeFurnishing { id: string; name: string; effect: string; cost: number; category: 'Rest' | 'Academic' | 'Security' | 'Social' }

export const HOME_FURNISHINGS: HomeFurnishing[] = [
  { id: 'mattress', name: 'Better mattress', effect: 'Adds 20 stamina to the rest recovery calculation, plus room comfort.', cost: 350, category: 'Rest' },
  { id: 'storage', name: 'Expanded storage', effect: 'A larger keepsake cabinet for your suite, plus room comfort.', cost: 450, category: 'Rest' },
  { id: 'desk', name: 'Study desk upgrade', effect: 'Raises quiet-study XP from 120 to 160. Formal coursework remains in AureLearn.', cost: 500, category: 'Academic' },
  { id: 'dock', name: 'Secure terminal dock', effect: 'Adds a terminal fixture and room comfort. File access still requires your existing credentials.', cost: 800, category: 'Security' },
  { id: 'aura_lamp', name: 'Aura lamp', effect: 'Adds 25 aura to the rest recovery calculation and supports recovery from mild Veilwilt during overnight rest.', cost: 600, category: 'Rest' },
  { id: 'banner', name: 'House pride banner', effect: 'A personal touch on your wall, plus room comfort.', cost: 250, category: 'Social' },
  { id: 'seating', name: 'Guest seating', effect: 'Makes room for visits from Aelita, Jeremie, Odd, and Ulrich.', cost: 400, category: 'Social' },
  { id: 'compartment', name: 'Hidden compartment', effect: 'Adds a concealed cabinet fixture and room comfort. Record permissions remain unchanged.', cost: 1200, category: 'Security' },
];

export const HOME_GUESTS = [
  { id: 'aelita', name: 'Aelita Hopper', role: 'Cyberium Academy', note: 'Aelita settles in with a cup of tea and offers to review a SpellForge protocol with you.' },
  { id: 'jeremie', name: 'Jeremie Belpois', role: 'Compiler Lab 4', note: 'Jeremie brings his relay notes. You compare a few diagrams, then put the work away for the evening.' },
  { id: 'odd', name: 'Odd Della Robia', role: 'Vector Hall', note: 'Odd arrives with snacks and plenty of stories. The quiet suite feels a little livelier.' },
  { id: 'ulrich', name: 'Ulrich Stern', role: 'Vector Hall', note: 'Ulrich takes a seat and catches up with you, glad for a moment away from the busy Quadrangle.' },
] as const;

export function restoreHomeAmbiance(value: unknown): HomeAmbiance {
  return ['warm', 'morning', 'lantern', 'starlight'].includes(value as string) ? value as HomeAmbiance : 'warm';
}

export function restoreHomeMemos(value: unknown, fallback: HomeMemo[] = []): HomeMemo[] {
  if (!Array.isArray(value)) return fallback.map(memo => ({ ...memo }));
  const result: HomeMemo[] = [];
  for (const memo of value) {
    if (!memo || typeof memo.id !== 'string' || !memo.id || typeof memo.title !== 'string' || !memo.title.trim() || typeof memo.body !== 'string' || !memo.body.trim() || result.some(item => item.id === memo.id)) continue;
    result.push({ id: memo.id.slice(0, 128), title: memo.title.trim().slice(0, 80), body: memo.body.trim().slice(0, 1200) });
    if (result.length === 50) break;
  }
  return result;
}
