import { useEffect } from 'react';
import { useSystemStore } from '../../store/useSystemStore';
import {
  resolveInterfaceAppearance,
  resolveReducedMotion,
  subscribeInterfacePreferences,
  TEXT_SCALE_MULTIPLIERS,
} from '../../store/interfacePreferences';
import { soundEngine } from '../../utils/audio';

export function useInterfaceAppearance() {
  const preferences = useSystemStore(state => state.interfacePreferences);
  const soundEnabled = useSystemStore(state => state.soundEnabled);

  useEffect(() => subscribeInterfacePreferences(interfacePreferences => useSystemStore.setState({ interfacePreferences }), window), []);

  useEffect(() => {
    const darkQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
    const motionQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

    const apply = () => {
      const root = document.documentElement;
      root.dataset.miraAppearance = resolveInterfaceAppearance(preferences.appearance, !!darkQuery?.matches);
      root.dataset.miraDensity = preferences.density;
      root.dataset.miraTextScale = preferences.textScale;
      root.dataset.miraTransparency = preferences.transparency;
      root.dataset.miraReducedMotion = resolveReducedMotion(preferences.reducedMotion, !!motionQuery?.matches) ? 'reduce' : 'full';
      root.dataset.miraNotifications = preferences.notifications;
      root.style.setProperty('--mira-text-scale', TEXT_SCALE_MULTIPLIERS[preferences.textScale] || '1');
    };

    apply();
    darkQuery?.addEventListener('change', apply);
    motionQuery?.addEventListener('change', apply);
    return () => {
      darkQuery?.removeEventListener('change', apply);
      motionQuery?.removeEventListener('change', apply);
    };
  }, [
    preferences.appearance,
    preferences.density,
    preferences.textScale,
    preferences.reducedMotion,
    preferences.transparency,
    preferences.notifications,
  ]);

  useEffect(() => {
    soundEngine.setVolumes(
      soundEnabled ? preferences.musicVolume / 100 : 0,
      soundEnabled ? preferences.effectsVolume / 100 : 0,
    );
  }, [soundEnabled, preferences.musicVolume, preferences.effectsVolume]);
}
