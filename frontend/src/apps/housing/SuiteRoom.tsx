import React, { useEffect, useRef, useState } from 'react';
import { useOSStore } from '../../store/useOSStore';
import type { HomeAmbiance, HomeArea } from '../../gameplay/Housing';
import { HOME_FURNISHINGS } from '../../gameplay/Housing';
import { SUITE_AREAS, SUITE_ART, SUITE_LIGHTING } from './suiteSceneModel';

interface SuiteRoomProps {
  area: HomeArea;
  onSelect: (area: HomeArea) => void;
  installed: string[];
  ambiance: HomeAmbiance;
}

export default function SuiteRoom({ area, onSelect, installed, ambiance }: SuiteRoomProps) {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<ReturnType<typeof import('./SuiteRoomScene').createSuiteRoom> | null>(null);
  const latest = useRef({ area, ambiance, installed, onSelect });
  latest.current = { area, ambiance, installed, onSelect };
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const [motion, setMotion] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const focused = useOSStore(state => state.activeWindowId === 'housing' && !state.windows.find(win => win.id === 'housing')?.isMinimized);
  const shouldPause = useRef(!focused);
  shouldPause.current = !focused;

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => { setReducedMotion(preference.matches); if (preference.matches) setMotion(false); };
    preference.addEventListener('change', change);
    return () => preference.removeEventListener('change', change);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const timeout = window.setTimeout(() => { if (!cancelled) setStatus(value => value === 'ready' ? value : 'fallback'); }, 15000);
    import('./SuiteRoomScene').then(({ createSuiteRoom }) => {
      if (cancelled || !host.current) return;
      engine.current = createSuiteRoom(host.current, { ...latest.current, reducedMotion: media.matches },
        id => latest.current.onSelect(id),
        () => { if (!cancelled) { window.clearTimeout(timeout); setStatus('ready'); } },
        () => { if (!cancelled) { window.clearTimeout(timeout); setStatus('fallback'); } });
      engine.current.setPaused(shouldPause.current || document.hidden);
    }).catch(() => { if (!cancelled) { window.clearTimeout(timeout); setStatus('fallback'); } });
    return () => { cancelled = true; window.clearTimeout(timeout); engine.current?.destroy(); engine.current = null; };
  }, []);

  useEffect(() => { engine.current?.update({ area, ambiance, installed, reducedMotion: reducedMotion || !motion }); }, [area, ambiance, installed, reducedMotion, motion, status]);
  useEffect(() => {
    const sync = () => engine.current?.setPaused(!focused || document.hidden);
    sync(); document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, [focused, status]);

  return <section className="suite-room" aria-label="Suite 4B interactive room" data-renderer={status} data-lighting={ambiance}>
    <div className="suite-room__picture">
      <img className="suite-room__art" src={SUITE_ART} alt="Suite 4B: a furnished apartment with a bed, window desk, sitting area, and keepsake cabinet overlooking Aureline." />
      <div ref={host} className="suite-room__canvas" aria-hidden="true" />
      <div className="suite-room__masthead"><span>VECTOR HOUSE / 04</span><strong>A room of your own.</strong></div>
      <div className="suite-room__caption"><span>{SUITE_LIGHTING[ambiance].caption}</span><span>SUITE 4B</span></div>
    </div>
    <div className="suite-room__toolbar"><p>{status === 'ready' ? 'Select the furniture or choose an area below.' : status === 'loading' ? 'Preparing your room. You can choose an area below.' : 'Room preview · choose an area below to continue.'}</p><button type="button" aria-pressed={motion && !reducedMotion} disabled={reducedMotion || status !== 'ready'} onClick={() => setMotion(value => !value)}>{reducedMotion ? 'Reduced motion' : motion ? 'Pause atmosphere' : 'Resume atmosphere'}</button></div>
    <nav className="suite-room__areas" aria-label="Room areas">{SUITE_AREAS.map((item, index) => <button key={item.id} type="button" aria-pressed={area === item.id} onClick={() => onSelect(item.id)}><span className="suite-room__number" aria-hidden="true">0{index + 1}</span><span><strong>{item.label}</strong><small>{item.detail}</small></span><span aria-hidden="true" className="suite-room__arrow">↗</span></button>)}</nav>
    {installed.length > 0 && <p className="suite-room__fixtures">Installed · {HOME_FURNISHINGS.filter(item => installed.includes(item.id)).map(item => item.name).join(' / ')}</p>}
  </section>;
}
