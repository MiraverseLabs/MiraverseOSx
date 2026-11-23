import React from 'react';
import { useOSStore } from '../../store/useOSStore';
import { createPortal } from 'react-dom';
import { APPS_DIRECTORY, launchDesktopApp } from './appDirectory';

import { Grid2X2, PanelsTopLeft, SlidersHorizontal, Check, ChevronUp, ChevronDown } from 'lucide-react';
import { useSystemStore } from '../../store/useSystemStore';
import { SoundFX } from '../../utils/audio';

export interface DesktopTaskbarProps {
  onTogglePhone: () => void;
  onOpenLauncher: () => void;
  isLauncherOpen: boolean;
  editing?: boolean;
  onToggleEditing?: () => void;
}

export default function DesktopTaskbar({ onTogglePhone, onOpenLauncher, isLauncherOpen, editing = false, onToggleEditing }: DesktopTaskbarProps) {
  const taskbar = React.useRef<HTMLElement>(null);
  const corner = React.useRef<HTMLButtonElement>(null);
  const [revealed, setRevealed] = React.useState(false);
  const [manuallyCollapsed, setManuallyCollapsed] = React.useState(false);
  const [tooltip, setTooltip] = React.useState<{ text: string; x: number; y: number } | null>(null);
  const showTooltip = (event: React.SyntheticEvent<HTMLButtonElement>, text: string) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltip({ text, x: Math.max(90, Math.min(window.innerWidth - 90, rect.left + rect.width / 2)), y: rect.top - 12 });
  };
  const { windows, toggleApp, activeWindowId, desktopPreferences, toggleShowDesktop, hiddenDesktopWindows } = useOSStore();
  const hasOpenApp = windows.some(win => !win.isMinimized);
  const collapsed = !editing && !isLauncherOpen && (manuallyCollapsed || (hasOpenApp && !revealed));
  const { soundEnabled } = useSystemStore();
  const dismiss = () => { setRevealed(false); setTooltip(null); };
  React.useEffect(() => {
    const outside = (event: PointerEvent) => { if (!taskbar.current?.contains(event.target as Node)) dismiss(); };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && hasOpenApp && revealed && !isLauncherOpen) {
        dismiss(); requestAnimationFrame(() => corner.current?.focus());
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [hasOpenApp, revealed, isLauncherOpen]);
  const playClick = () => { if (soundEnabled) SoundFX.playSnap(); };
  const pins=desktopPreferences.dockPins.map(id=>({id,icon:Grid2X2}));
  const apps = [...pins, ...windows.filter(win=>!desktopPreferences.dockPins.includes(win.id)).map(win=>({id:win.id,icon:Grid2X2}))];

  return (
    <nav ref={taskbar} className="desktop-taskbar" aria-label="Desktop taskbar" data-collapsed={collapsed} data-floating={hasOpenApp}>
      {collapsed ? <div className="dock-corner">
        <button ref={corner} className="dock-corner-orbit" aria-label="Open Orbit" aria-haspopup="dialog" aria-expanded={isLauncherOpen} title="Orbit (Ctrl+Space)" onClick={() => { playClick(); onOpenLauncher(); }}><Grid2X2 size={18}/></button>
        <button className="dock-corner-reveal" aria-label="Show dock" aria-expanded={false} title="Show dock" onClick={() => { setManuallyCollapsed(false); setRevealed(true); requestAnimationFrame(() => taskbar.current?.querySelector<HTMLButtonElement>('.dock-library')?.focus()); }}><ChevronUp size={13}/></button>
      </div> : <div className="desktop-dock" id="desktop-dock">
      <button className="dock-library" aria-label="Open Orbit" aria-haspopup="dialog" aria-expanded={isLauncherOpen} title="Orbit (Ctrl+Space)" onClick={() => { playClick(); onOpenLauncher(); }}><Grid2X2 size={20} /><span>Orbit</span></button>
      <span className="dock-divider" />
      <div className="dock-apps" aria-label="Pinned and running apps" onScroll={() => setTooltip(null)}>
        {apps.map((app) => {
          const meta = APPS_DIRECTORY.find((candidate) => candidate.id === app.id);
          const Icon = meta?.icon || app.icon;
          const win = windows.find((candidate) => candidate.id === app.id);
          const active = win && activeWindowId === app.id && !win.isMinimized;
          const name = meta?.label || win?.title || app.id;
          return <button key={app.id} className={`dock-app ${active ? 'is-active' : ''}`} aria-label={`${win ? 'Toggle' : 'Open'} ${name}`} aria-pressed={!!active} onMouseEnter={event => showTooltip(event, name)} onMouseLeave={() => setTooltip(null)} onFocus={event => showTooltip(event, name)} onBlur={() => setTooltip(null)} onClick={() => { dismiss(); setManuallyCollapsed(false); playClick(); win ? toggleApp(win) : launchDesktopApp(app.id); }}><Icon size={21} strokeWidth={1.6} aria-hidden="true"/>{win && <i aria-hidden="true" className={`dock-running-dot ${active ? 'is-active' : ''}`} />}</button>;
        })}
      </div>
      <span className="dock-divider"/>
      {onToggleEditing && (
        <button
          className={`dock-app ${editing ? 'is-active' : ''}`}
          aria-label={editing ? 'Finish customizing desktop' : 'Customize Desktop'}
          title={editing ? 'Finish customizing desktop' : 'Customize Desktop'}
          aria-pressed={editing}
          onMouseEnter={event => showTooltip(event, editing ? 'Done Customizing' : 'Customize Desktop')}
          onMouseLeave={() => setTooltip(null)}
          onFocus={event => showTooltip(event, editing ? 'Done Customizing' : 'Customize Desktop')}
          onBlur={() => setTooltip(null)}
          onClick={() => { setTooltip(null); playClick(); onToggleEditing(); }}
        >
          {editing ? <Check size={19}/> : <SlidersHorizontal size={19}/>}
        </button>
      )}
      <button className="dock-app" aria-label="Show Desktop" title="Show Desktop" aria-pressed={!!hiddenDesktopWindows.length} onClick={() => { dismiss(); toggleShowDesktop(); }}><PanelsTopLeft size={19}/></button>
      <button className="dock-app dock-collapse" aria-label="Collapse dock" title="Collapse dock" onClick={() => { dismiss(); setManuallyCollapsed(true); requestAnimationFrame(() => corner.current?.focus()); }}><ChevronDown size={16}/></button>
      </div>}
      {!collapsed && tooltip && createPortal(<div className="taskbar-tooltip" role="tooltip" style={{ left: tooltip.x, top: tooltip.y }}>{tooltip.text}</div>, document.body)}
    </nav>
  );
}
