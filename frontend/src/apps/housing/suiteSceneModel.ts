import type { HomeAmbiance, HomeArea } from '../../gameplay/Housing';

export const SUITE_ART = '/images/housing/suite-4b-evening.webp';
export const SUITE_WIDTH = 1536;
export const SUITE_HEIGHT = 1024;

// Normalized regions keep mouse interaction aligned with the authored room at any size.
export const SUITE_AREAS: { id: HomeArea; label: string; detail: string; x: number; y: number; width: number; height: number }[] = [
  { id: 'rest', label: 'Rest', detail: 'Bedroom', x: .32, y: .44, width: .43, height: .34 },
  { id: 'study', label: 'Study', detail: 'Window desk', x: .74, y: .40, width: .32, height: .24 },
  { id: 'lounge', label: 'Unwind', detail: 'Sitting room', x: .82, y: .70, width: .31, height: .36 },
  { id: 'keepsakes', label: 'Keepsakes', detail: 'Your collection', x: .14, y: .77, width: .24, height: .39 },
];

export const SUITE_LIGHTING: Record<HomeAmbiance, { tint: number; shade: number; glow: number; caption: string }> = {
  warm: { tint: 0xfff0da, shade: .04, glow: .23, caption: 'Evening settles over Aureline' },
  morning: { tint: 0xf2faff, shade: 0, glow: .10, caption: 'A soft light at the window' },
  lantern: { tint: 0xffdfac, shade: .18, glow: .40, caption: 'A quiet room, a little lamplight' },
  starlight: { tint: 0xbacde9, shade: .27, glow: .12, caption: 'The city beneath the two moons' },
};

export interface SuiteSceneState {
  area: HomeArea;
  ambiance: HomeAmbiance;
  installed: string[];
  reducedMotion: boolean;
}
