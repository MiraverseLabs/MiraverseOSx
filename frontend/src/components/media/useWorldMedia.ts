import { useEffect, useSyncExternalStore } from 'react';
import { getMediaRevision, subscribeMediaRegistry, syncRuntimeMediaFromBackend } from '../../game-content/worldAssetLibrary';
let requested = false;
/** Runtime bytes stay in the host store; components subscribe to the small metadata mirror. */
export function useWorldMedia() {
  useSyncExternalStore(subscribeMediaRegistry, getMediaRevision, getMediaRevision);
  useEffect(() => {
    if (requested) return;
    requested = true;
    void syncRuntimeMediaFromBackend();
  }, []);
}
