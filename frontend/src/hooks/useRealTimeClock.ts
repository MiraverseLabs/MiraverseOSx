import { useEffect } from 'react';
import { useOSStore } from '../store/useOSStore';

export function useRealTimeClock() {
  const loggedIn = useOSStore(s => s.isLoggedIn);
  useEffect(() => {
    if (!loggedIn) return;
    let stopped = false;
    let syncing = false;
    const tick = () => {
      if (stopped) return;
      useOSStore.getState().tickRealTimeClock();
      if (!syncing) {
        syncing = true;
        void useOSStore.getState().syncRealTimeClock().finally(() => { syncing = false; });
      }
    };
    tick();
    const timer = window.setInterval(tick, 10_000);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);
    return () => { stopped = true; window.clearInterval(timer); window.removeEventListener('focus', tick); document.removeEventListener('visibilitychange', tick); };
  }, [loggedIn]);
}
