import React, { useState } from 'react';
import { ArrowUpRight, Folder, X } from 'lucide-react';
import { useOSStore } from '../../store/useOSStore';

export default function BrowserTabGroups({ onOpenTab }: { onOpenTab?: () => void }) {
  const state = useOSStore(s => s.browserState);
  const createGroup = useOSStore(s => s.createBrowserTabGroup);
  const assignGroup = useOSStore(s => s.setBrowserTabGroup);
  const renameGroup = useOSStore(s => s.renameBrowserTabGroup);
  const removeGroup = useOSStore(s => s.removeBrowserTabGroup);
  const activate = useOSStore(s => s.setActiveBrowserTab);
  const [name, setName] = useState('');
  const [notice, setNotice] = useState('');
  const current = state.tabs.find(tab => tab.id === state.activeTabId)!;
  const currentGroup = state.groups.find(group => group.id === current.groupId);
  return <div className="vn-saved-groups">
    <p>Only grouped tabs reopen. Each fresh session starts at the homepage.</p>
    <form onSubmit={event => {
      event.preventDefault();
      const result = createGroup(name);
      setNotice(result.message);
      if (result.ok) setName('');
    }}>
      <label htmlFor="vn-new-group">New group name</label>
      <input id="vn-new-group" value={name} maxLength={40} placeholder="e.g. Research" onChange={event => setName(event.target.value)} required />
      <button type="submit" className="vn-group-action">Create group and save this tab</button>
    </form>
    {notice && <p className="vn-group-notice" role="status">{notice}</p>}
    <div className="vn-current-tab-group"><span>Current tab</span><strong>{current.title}</strong><small>{currentGroup ? `Saved in ${currentGroup.name}` : 'Not saved · closes with this session'}</small>
      {currentGroup && <button className="vn-text-button" onClick={() => setNotice(assignGroup(current.id).message)}>Remove this tab from its group</button>}
    </div>
    {!state.groups.length && <p>No saved groups yet. Create one to keep this tab for next time.</p>}
    {state.groups.map(group => {
      const tabs = state.tabs.filter(tab => tab.groupId === group.id);
      return <section className="vn-saved-group" key={group.id} aria-label={`Saved group ${group.name}`}>
        <header><Folder size={15} aria-hidden="true" /><input aria-label={`Rename ${group.name} group`} defaultValue={group.name} maxLength={40} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} onBlur={event => {
          if (event.currentTarget.value === group.name) return;
          const result = renameGroup(group.id, event.currentTarget.value);
          setNotice(result.message);
          if (!result.ok) event.currentTarget.value = group.name;
        }} /><button className="vn-icon" aria-label={`Remove ${group.name} group`} title="Ungroup these tabs" onClick={() => { removeGroup(group.id); setNotice('Group removed. Its open tabs are now session-only.'); }}><X size={14} /></button></header>
        <ul>{tabs.map(tab => <li key={tab.id}><button onClick={() => { activate(tab.id); onOpenTab?.(); }}><span>{tab.title}</span><small>{new URL(tab.url).hostname}</small><ArrowUpRight size={13} /></button></li>)}</ul>
        {!tabs.length && <small>No tabs in this group.</small>}
        {current.groupId !== group.id && <button className="vn-group-action" onClick={() => setNotice(assignGroup(current.id, group.id).message)}>Save current tab to {group.name}</button>}
      </section>;
    })}
  </div>;
}
