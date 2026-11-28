import React, { useState } from 'react';
import { useOSStore } from '../store/useOSStore';
import { hasCreatorAccess, isLocalWorld } from '../gameplay/localCredentials';
import '../styles/apps/CharacterProfile.css';

export default function LocalCredentials() {
  const player = useOSStore(s => s.gameplay.player);
  const signedIn = useOSStore(s => s.isLoggedIn);
  const [notice, setNotice] = useState('');
  const local = isLocalWorld(globalThis.location?.hostname || '');
  const enabled = hasCreatorAccess(player);
  return <section className="settings-group" aria-label="Creator tools settings">
    <h3>Your world, your tools</h3><p>{player.name} · Player clearance {player.clearanceLevel ?? 1}</p>
    <p>Open editing and maintenance tools while keeping your character’s name, money, skills, careers, and institutional memberships.</p>
    <div className="settings-preference-row"><div><strong id="creator-mode-label">Creator tools</strong><p id="creator-mode-help">Enable world editing in AURA, Creative Studio, and world checkpoints. Turn it off to return to your character’s earned permissions.</p></div><button className="settings-switch" type="button" role="switch" aria-labelledby="creator-mode-label" aria-describedby="creator-mode-help" aria-checked={enabled} disabled={!local || !signedIn || player.isAdmin === true} onClick={() => setNotice(useOSStore.getState().setCreatorMode(!enabled).message)}><span /></button></div>
    {player.isAdmin ? <p className="creator-access-note">This existing Administrator profile keeps its original privileges and progress. A personal player profile can use Creator tools independently, without becoming an Administrator account.</p> : <p className="creator-access-note">Creator tools {enabled ? 'are on' : 'are off'}. They do not award civic clearance, qualifications, memberships, or player rewards. Edits you deliberately save still change the world.</p>}
    {enabled && <div className="settings-preference-row"><div><strong>World workspaces</strong><p>Open the tool you need, then return to playing.</p></div><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}><button type="button" className="settings-secondary-button" onClick={() => useOSStore.getState().openAppWorkspace('meridionRegistry')}>AURA registry</button><button type="button" className="settings-secondary-button" onClick={() => useOSStore.getState().openAppWorkspace('creativeStudio', 'admin')}>Creative Studio</button><button type="button" className="settings-secondary-button" onClick={() => useOSStore.getState().openAppWorkspace('settings', 'save')}>Save & sync</button></div></div>}
    {!local && <p>Creator tools are available in the local single-player world.</p>}
    <p role="status">{notice}</p>
  </section>;
}
