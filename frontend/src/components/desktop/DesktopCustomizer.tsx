import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Plus } from 'lucide-react';
import { useOSStore } from '../../store/useOSStore';
import { WIDGET_IDS, widgetTitle, type LayoutId } from '../../store/desktopPreferences';
import { APPS_DIRECTORY } from './appDirectory';

export default function DesktopCustomizer({ onDone }: { onDone?: () => void }) {
  const preferences = useOSStore(state => state.desktopPreferences);
  const action = useOSStore(state => state.desktopAction);
  const groups = preferences.layouts[preferences.activeLayout].groups;
  const [title, setTitle] = useState('');
  const done = useRef<HTMLButtonElement>(null);
  useEffect(() => { done.current?.focus(); }, []);
  const movePin = (id: string, delta: number) => {
    const pins = [...preferences.dockPins], index = pins.indexOf(id), target = index + delta;
    if (index < 0 || target < 0 || target >= pins.length) return;
    [pins[index], pins[target]] = [pins[target], pins[index]];
    action({ type: 'pins', ids: pins });
  };
  return <aside className="desktop-customizer" aria-label="Customize Desktop">
    <header className="desktop-customizer-header"><div><span>YOUR DESKTOP</span><h2>Make it yours.</h2></div><button ref={done} className="desktop-customizer-done" type="button" onClick={onDone}><Check size={14}/> Done</button></header>
    <div className="desktop-customizer-body">
      <p className="desktop-customizer-intro">Arrange your widgets and shortcuts. Changes save automatically to this layout.</p>
      <section><h3>Desktop layout</h3><label className="desktop-customizer-field">Choose a workspace<select aria-label="Desktop layout" value={preferences.activeLayout} onChange={event => action({type:'layout',id:event.target.value as LayoutId})}><option value="everyday">Everyday</option><option value="personal">Personal</option><option value="work">Work</option></select></label></section>
      <section><h3>Widgets</h3><p>Show the things you want close at hand.</p><div className="desktop-widget-picker">{WIDGET_IDS.map(id => {
        const group = groups.find(item => item.widget === id);
        return group && <label key={id}><input type="checkbox" checked={!group.hidden} onChange={event => action({type:'group',id:group.id,patch:{hidden:!event.target.checked}})}/><span>{widgetTitle[id]}</span></label>;
      })}</div></section>
      <section><h3>Shortcut groups</h3><p>Drag a group by its handle, or use its arrow controls to move it between columns.</p><div className="desktop-widget-picker">{groups.filter(group => !group.widget).map(group => <label key={group.id}><input type="checkbox" checked={!group.hidden} onChange={event => action({type:'group',id:group.id,patch:{hidden:!event.target.checked}})}/><span>{group.title}</span></label>)}</div><form onSubmit={event => {event.preventDefault(); if (title.trim()) {action({type:'add-group',title:title.trim()});setTitle('');}}}><input aria-label="New shortcut group title" value={title} maxLength={60} onChange={event => setTitle(event.target.value)} placeholder="New group name" required/><button type="submit" disabled={!title.trim()}><Plus size={13}/> Add group</button></form></section>
      <section><h3>Pinned dock apps</h3><p>The dock folds into a corner launcher while apps are open. Use its chevron to reveal these shortcuts.</p><div className="desktop-customizer-pins">{preferences.dockPins.map((id,index) => <div className="desktop-pin-row" key={id}><span>{APPS_DIRECTORY.find(app => app.id === id)?.label || id}</span><button type="button" aria-label={`Move dock ${id} earlier`} disabled={!index} onClick={() => movePin(id,-1)}><ArrowUp size={12}/></button><button type="button" aria-label={`Move dock ${id} later`} disabled={index === preferences.dockPins.length-1} onClick={() => movePin(id,1)}><ArrowDown size={12}/></button><button type="button" aria-label={`Unpin dock ${id}`} onClick={() => action({type:'pins',ids:preferences.dockPins.filter(pin => pin !== id)})}>Unpin</button></div>)}</div><select aria-label="Pin app to dock" value="" onChange={event => event.target.value && action({type:'pins',ids:[...preferences.dockPins,event.target.value]})}><option value="">Add an app to the dock…</option>{APPS_DIRECTORY.filter(app => !preferences.dockPins.includes(app.id)).map(app => <option key={app.id} value={app.id}>{app.label}</option>)}</select></section>
      <footer><button className="desktop-reset" type="button" onClick={() => action({type:'reset-layout'})}>Reset this layout</button><p>Restores this layout’s widget arrangement and shortcut groups.</p></footer>
    </div>
  </aside>;
}
