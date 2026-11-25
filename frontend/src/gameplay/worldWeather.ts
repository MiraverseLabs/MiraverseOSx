// Deterministic world weather derived from the player's cycle. This replaces the
// legacy EcosystemEngine weather readout without a second authoritative clock.

const WEATHER_TYPES = [
  'Aureline Clear',
  'Prism Drift',
  'Aether Rain',
  'Astral Haze',
  'Verdant Surge',
  'Shadow Static',
];

export function weatherForCycle(cycle: number): string {
  const normalized = Number.isFinite(cycle) ? Math.floor(cycle) : 0;
  const index = Math.abs(normalized) % WEATHER_TYPES.length;
  return WEATHER_TYPES[index];
}