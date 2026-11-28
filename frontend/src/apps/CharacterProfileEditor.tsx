import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Check, ExternalLink, RotateCcw, UserRound, X } from 'lucide-react';
import { useOSStore } from '../store/useOSStore';
import { LINEAGE_RECORDS, PRACTICE_RECORDS, findSpeciesRecord } from '../game-content/species/registry';
import { readCharacterPortrait, restoreCharacterProfile, type CharacterProfile } from '../gameplay/CharacterProfile';
import '../styles/apps/CharacterProfile.css';

export default function CharacterProfileEditor() {
  const stored = useOSStore(state => state.gameplay.characterProfile);
  const name = useOSStore(state => state.gameplay.identity.profileDisplayName || state.gameplay.player.name || '');
  const saved = useMemo(() => {
    const profile = restoreCharacterProfile(stored);
    return { ...profile, displayName: profile.displayName || name };
  }, [stored, name]);
  const [draft, setDraft] = useState<CharacterProfile>(saved);
  const [interestText, setInterestText] = useState(saved.interests.join(', '));
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const revision = useRef(0);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const species = findSpeciesRecord(draft.speciesId);
  useEffect(() => { if (!dirty) { setDraft(saved); setInterestText(saved.interests.join(', ')); } }, [saved]);
  useEffect(() => () => { revision.current++; }, []);
  const edit = <K extends keyof CharacterProfile>(key: K, value: CharacterProfile[K]) => { setDraft(current => ({ ...current, [key]: value })); setNotice(''); };
  const upload = async (file?: File) => {
    if (!file) return;
    const current = ++revision.current;
    setBusy(true);
    try { const portrait = await readCharacterPortrait(file); if (current === revision.current) edit('portrait', portrait); }
    catch (error) { if (current === revision.current) setNotice(error instanceof Error ? error.message : 'The portrait could not be loaded.'); }
    finally { if (current === revision.current) setBusy(false); }
  };
  const reset = () => { revision.current++; setBusy(false); setDraft(saved); setInterestText(saved.interests.join(', ')); setNotice('Unsaved edits discarded.'); };
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    const result = useOSStore.getState().saveCharacterProfile(draft);
    if (result.ok) { const profile = restoreCharacterProfile(draft); setDraft(profile); setInterestText(profile.interests.join(', ')); }
    setNotice(result.message);
  };

  return <section className="character-editor" aria-label="My Character editor">
    <header className="character-editor-heading"><span>YOUR LIFE / PERSONAL PROFILE</span><p>Make this space yours. Your personal story and appearance stay separate from issued civic records.</p></header>
    <form onSubmit={save}>
      <div className="character-editor-layout">
        <aside className="character-preview" aria-label="Character preview">
          <div className="character-portrait">{draft.portrait ? <img src={draft.portrait} alt={`${draft.displayName || 'Character'} portrait preview`} /> : <UserRound size={58} aria-hidden="true" />}</div>
          <h3>{draft.displayName || 'Your character'}</h3>{draft.alias && <span className="character-alias">@{draft.alias.replace(/^@/, '')}</span>}{draft.pronouns && <small>{draft.pronouns}</small>}
          <p>{species?.name || 'Species not chosen'}{draft.ancestry && <><br />{draft.ancestry}</>}</p>
          <label className="character-upload"><Camera size={15} />{busy ? 'Preparing portrait…' : 'Choose portrait'}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={event => { void upload(event.target.files?.[0]); event.target.value = ''; }} /></label>
          <small>PNG, JPEG or WebP · up to 2 MB</small>
          {draft.portrait && <button type="button" className="character-text-button" onClick={() => { revision.current++; setBusy(false); edit('portrait', ''); }}>Remove portrait</button>}
          {draft.bio && <p className="character-preview-bio">{draft.bio}</p>}
          <p className="character-personal-note">Personal profile preview</p>
        </aside>
        <div className="character-fields">
          <section><h3>The person behind the alias</h3><div className="character-field-grid">
            <label>Display name<input maxLength={80} required value={draft.displayName} onChange={event => edit('displayName', event.target.value)} /></label>
            <label>Alias<input maxLength={40} value={draft.alias} onChange={event => edit('alias', event.target.value)} placeholder="Your online alias" /></label>
            <label>Pronouns<input maxLength={40} value={draft.pronouns} onChange={event => edit('pronouns', event.target.value)} placeholder="Optional" /></label>
            <label>Interests<input maxLength={720} value={interestText} onChange={event => { setInterestText(event.target.value); edit('interests', event.target.value.split(',').slice(0, 12)); }} placeholder="Music, tinkering, gardens…" /></label>
          </div><label>About your character<textarea rows={4} maxLength={2000} value={draft.bio} onChange={event => edit('bio', event.target.value)} placeholder="Your background, personality, and what brings you to Meridion." /></label></section>
          <section><h3>Species & heritage</h3><div className="character-field-grid">
            <label>Species or lineage<select value={draft.speciesId} onChange={event => edit('speciesId', event.target.value)}><option value="">Choose when you’re ready</option>{LINEAGE_RECORDS.map(record => <option value={record.id} key={record.id}>{record.name} · {record.realm}</option>)}</select></label>
            <label>Ancestry<input maxLength={300} value={draft.ancestry} onChange={event => edit('ancestry', event.target.value)} placeholder="Family heritage or mixed ancestry" /></label>
            <label>Personal affinity<input maxLength={160} value={draft.affinity} onChange={event => edit('affinity', event.target.value)} placeholder="Optional; describe your individual affinity" /></label>
            <label>Add a practice or status<select value="" disabled={draft.practiceIds.length >= 12} onChange={event => { if (event.target.value) edit('practiceIds', [...new Set([...draft.practiceIds, event.target.value])]); }}><option value="">Choose a practice or status</option>{PRACTICE_RECORDS.filter(record => !draft.practiceIds.includes(record.id)).map(record => <option key={record.id} value={record.id}>{record.name}</option>)}</select></label>
          </div>{draft.practiceIds.length > 0 && <ul className="character-practices">{draft.practiceIds.map(id => <li key={id}>{findSpeciesRecord(id)?.name}<button type="button" aria-label={`Remove ${findSpeciesRecord(id)?.name}`} onClick={() => edit('practiceIds', draft.practiceIds.filter(value => value !== id))}><X size={12} /></button></li>)}</ul>}
            {species && <div className="character-species-guide"><strong>{species.name}</strong><p>{species.physiology}</p><p>{species.abilityConstraints}</p></div>}
            <button type="button" className="character-text-button" onClick={() => useOSStore.getState().openAppWorkspace('lore', 'species')}>Browse the Species Registry <ExternalLink size={13} /></button>
            <p className="character-field-note">Heritage and practices describe your character. They do not automatically award powers, rare manifestations, or qualifications.</p>
          </section>
          <section><h3>Appearance & your little space</h3><label>Appearance notes<textarea rows={3} maxLength={1200} value={draft.appearance} onChange={event => edit('appearance', event.target.value)} placeholder="Hair, eyes, clothes, markings, and personal style." /></label><label>Your home, in your words<textarea rows={3} maxLength={500} value={draft.homeDescription} onChange={event => edit('homeDescription', event.target.value)} placeholder="What makes your space feel like home?" /></label><p className="character-field-note">Home notes leave your registered address and installed furnishings intact.</p></section>
        </div>
      </div>
      <footer className="character-save-bar"><span role="status">{notice || (dirty ? 'Unsaved changes' : 'Your personal profile is up to date.')}</span><div><button type="button" className="character-discard" onClick={reset} disabled={!dirty && !busy}><RotateCcw size={14} />Discard edits</button><button className="character-save" type="submit" disabled={busy || !draft.displayName.trim() || !dirty}><Check size={15} />Save personal profile</button></div></footer>
    </form>
  </section>;
}
