import React, { createContext, useContext, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

interface WindowChrome {
  target: HTMLElement | null;
  setIntegrated: (integrated: boolean) => void;
}
export const WindowChromeContext = createContext<WindowChrome | null>(null);
export function useWindowChrome() { return useContext(WindowChromeContext); }

// App-native navigation shares the existing frame rather than adding a second title row.
// Outside a desktop window (for example in a preview), it renders in place.
export function WindowTitlebarContent({ children }: { children: React.ReactNode }) {
  const chrome = useWindowChrome();
  const setIntegrated = chrome?.setIntegrated;
  useLayoutEffect(() => {
    setIntegrated?.(true);
    return () => setIntegrated?.(false);
  }, [setIntegrated]);
  return chrome?.target ? createPortal(children, chrome.target) : <>{children}</>;
}
