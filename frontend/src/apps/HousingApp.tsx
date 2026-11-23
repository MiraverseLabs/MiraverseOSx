import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Bed, BookOpen, Check, Home, Moon, Package, Pin, Plus, ShoppingBag, Sun, X } from 'lucide-react';
import { useOSStore } from '../store/useOSStore';
import { usePostalStore } from '../store/usePostalStore';
import { COURSES, academicCitizenId, type AcademicState } from '../gameplay/Academics';
import { FORMATTED_PLAYER_ADDRESS } from '../gameplay/Postal';
import { calculateRestOutcome } from '../gameplay/WorldEventEngine';
import { HOME_FURNISHINGS, HOME_GUESTS, restoreHomeAmbiance, restoreHomeMemos, type HomeArea, type HomeMemo } from '../gameplay/Housing';
import DailyLifePanel from './DailyLifePanel';
import SuiteFloorPlan from './housing/SuiteFloorPlan';
import '../styles/apps/myhome.css';

const DEFAULT_MEMOS: HomeMemo[] = [
  { id: 'memo-1', title: 'Your mailing address', body: FORMATTED_PLAYER_ADDRESS },
  { id: 'memo-2', title: 'A little time to study', body: 'Quiet practice at home, coursework in AureLearn. Dawn University is in Dawnson, a college town in Aureline.' },
];
function saved(key: string): unknown { try { return JSON.parse(localStorage.getItem(key) ?? 'null'); } catch { return null; } }
const SECTIONS = [
  { id: 'room', label: 'Your suite', icon: Home, title: 'A place to come home to.', description: 'Settle in, catch your breath, and make a little space for yourself.' },
  { id: 'life', label: 'Everyday routines', icon: Sun, title: 'The small things, at your pace.', description: 'A meal, a tidy room, a moment with someone. Make the day your own.' },
  { id: 'upgrades', label: 'Furnishings', icon: ShoppingBag, title: 'Make yourself at home.', description: 'Useful additions, considered details, and a room that feels more like you.' },
  { id: 'board', label: 'Pinboard', icon: Pin, title: 'Keep a thought close.', description: 'Notes, plans, and small reminders for the days ahead.' },
  { id: 'dreams', label: 'Dream journal', icon: Moon, title: 'What the night leaves behind.', description: 'A quiet record of the dreams you have experienced while resting.' },
] as const;
const AMBIANCES = { warm: 'Warm evening', morning: 'Morning sun', lantern: 'Lamplight', starlight: 'Starlight' } as const;
const TIMES = ['Morning', 'Afternoon', 'Evening', 'Night'];

export default function HousingApp() {
  const workspace = useRef<HTMLDivElement>(null);
  const state = useOSStore();
  const player = state.gameplay.player;
  const [section, setSection] = useState<typeof SECTIONS[number]['id']>('room');
  const [area, setArea] = useState<HomeArea>('rest');
  const [duration, setDuration] = useState<'short' | 'standard' | 'full'>('full');
  const [ambiance, setAmbiance] = useState(() => restoreHomeAmbiance(saved('miraverse-home-ambiance')));
  const [memos, setMemos] = useState(() => restoreHomeMemos(saved('miraverse-home-memos'), DEFAULT_MEMOS));
  const [memoTitle, setMemoTitle] = useState('');
  const [memoBody, setMemoBody] = useState('');
  const [message, setMessage] = useState('');
  const [guest, setGuest] = useState<string | null>(null);
  const [filter, setFilter] = useState('All');
  const [collectionSearch, setCollectionSearch] = useState('');
  const shipments = usePostalStore(s => s.shipments);
  const parcels = usePostalStore(s => s.collectedItems);
  const collection: string[] = [...parcels, ...(Array.isArray(player.forgedSpells) ? player.forgedSpells : [])];
  const waiting = shipments.filter(item => item.direction === 'incoming' && item.status === 'delivered' && !item.opened).length;
  const installed: string[] = Array.isArray(player.unlockedHousingUpgrades) ? player.unlockedHousingUpgrades : ['banner'];
  const dreams: string[] = Array.isArray(player.dreamLogs) ? player.dreamLogs : [];
  const preview = calculateRestOutcome(state.gameplay, duration);
  const stamina = player.stamina ?? 85;
  const aura = player.auraHealth ?? 100;
  const comfort = player.roomComfort ?? player.dormComfort ?? 50;
  const studyCost = installed.includes('mattress') ? 15 : 20;
  const studyXP = installed.includes('desk') ? 160 : 120;
  const citizen = academicCitizenId(state);
  const records = citizen ? (state.gameplay.academics as AcademicState | undefined)?.records?.[citizen] ?? {} : {};
  const courses = COURSES.filter(course => records[course.id]?.status === 'active');
  const current = SECTIONS.find(item => item.id === section)!;
  useEffect(() => { try { localStorage.setItem('miraverse-home-ambiance', JSON.stringify(ambiance)); } catch {} }, [ambiance]);
  useEffect(() => { try { localStorage.setItem('miraverse-home-memos', JSON.stringify(memos)); } catch {} }, [memos]);
  useEffect(() => { workspace.current?.scrollTo({ top: 0 }); }, [section]);
  const changeSection = (id: typeof section) => { setSection(id); setMessage(''); };
  const post = () => state.openAppWorkspace('post', 'locker');
  const order = (id: string) => {
    const item = HOME_FURNISHINGS.find(item => item.id === id)!;
    const result = state.purchaseHousingUpgrade(id, item.cost);
    setMessage(result.message);
    if (result.ok) usePostalStore.getState().enqueueIncomingDelivery({
      id: `POST-HOME-${id}`, kind: 'parcel', carrier: 'CargoTrack Express', senderName: 'Aureline Furnishings Dispatch',
      senderAddress: '305 Freight Causeway, Dockside, Aureline, Orynvell OR-3305, Meridion', title: `Suite 4B Delivery: ${item.name}`,
      description: `Delivered to Suite 4B: ${item.effect}`, rewards: { xp: 10, itemName: `${item.name} (Suite 4B Fixture)` }, status: 'delivered',
    });
  };
  return <div ref={workspace} className="myhome-workspace" data-ambiance={ambiance}>
    <aside className="myhome-sidebar">
      <div className="myhome-wordmark"><Home size={21} /><span>myhome<span>A little space of your own</span></span></div>
      <div className="myhome-address"><span className="myhome-eyebrow">Vector House</span><strong>Suite 4B<span>04 / B</span></strong><p>Aureline, Meridion</p></div>
      <nav aria-label="MyHome sections">{SECTIONS.map(item => <button key={item.id} aria-current={section === item.id ? 'page' : undefined} onClick={() => changeSection(item.id)}><item.icon size={17}/>{item.label}{section === item.id && <span className="myhome-nav-dot"/>}</button>)}</nav>
      <div className="myhome-doorstep"><Package size={20}/><strong>{waiting ? `${waiting} waiting at your doorstep` : 'Your doorstep is clear'}</strong><p>Deliveries and collected parcels live in Meridion Post.</p><button onClick={post}>Open your locker <ArrowUpRight size={15}/></button></div>
      <div className="myhome-sidebar-footer">Aureline residential directory<br/>Vector House · fourth floor</div>
    </aside>
    <main className="myhome-main">
      <header className="myhome-heading"><div><span className="myhome-eyebrow">MyHome / {current.label}</span><h1>{current.title}</h1><p>{current.description}</p></div><span className="myhome-cycle">{TIMES[state.gameplay.timeSegmentIndex ?? 2]}<small>Cycle {state.gameplay.timeCycleCount}</small></span></header>
      <div className="myhome-vitals" aria-label="Suite and wellbeing"><div><span>Room comfort</span><strong>{comfort}<small>/100</small></strong><meter min="0" max="100" value={comfort}/></div><div><span>Stamina</span><strong data-testid="home-stamina">{stamina}<small>/100</small></strong><meter min="0" max="100" value={stamina}/></div><div><span>Aura</span><strong data-testid="home-aura">{aura}<small>/100</small></strong><meter min="0" max="100" value={aura}/></div><div><span>Available credits</span><strong data-testid="home-credits">{(player.credits ?? 0).toLocaleString()}<small> cr</small></strong><span>For a few thoughtful additions</span></div></div>
      <div role="status" className={`myhome-notice${message ? ' is-visible' : ''}`}>{message}</div>
      {section === 'room' && <>
        <div className="myhome-room-heading"><div><span className="myhome-eyebrow">Your living space</span><h2>Welcome to Suite 4B.</h2></div><label className="myhome-ambiance">Room lighting<select aria-label="Room lighting" value={ambiance} onChange={event => setAmbiance(restoreHomeAmbiance(event.target.value))}>{Object.entries(AMBIANCES).map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label></div>
        <div className="myhome-room-grid"><SuiteFloorPlan area={area} onSelect={setArea} installed={installed}/><section className="myhome-inspector" aria-label="Selected area">
          {area === 'rest' && <><span className="myhome-eyebrow"><Bed size={16}/> The bedroom</span><h2>Rest a while.</h2><p>A short pause or a full night. See how you will feel before turning in.</p><div className="myhome-duration" role="group" aria-label="Rest duration">{([['short', 'Short rest'], ['standard', 'Long rest'], ['full', 'Overnight']] as const).map(([id, label]) => <button key={id} aria-pressed={duration === id} onClick={() => setDuration(id)}>{label}</button>)}</div><div className="myhome-recovery"><div><span>Stamina after rest</span><strong>{preview.nextStamina}<small> +{preview.staminaRecovered}</small></strong></div><div><span>Aura after rest</span><strong>{preview.nextAuraHealth}<small> +{preview.auraRecovered}</small></strong></div><p>Wake {TIMES[preview.nextTimeSegmentIndex].toLowerCase()} · cycle {preview.nextTimeCycleCount}</p></div>{player.conditions?.length > 0 && <p className="myhome-help">Active conditions can limit recovery. An aura lamp supports overnight recovery from mild Veilwilt.</p>}<button className="myhome-primary" onClick={() => setMessage(state.restInDorm(duration).message)}><Moon size={16}/> {duration === 'full' ? 'Rest overnight' : 'Begin rest'}</button><p className="myhome-help">Rest advances world time. Your dreams are saved in the journal.</p></>}
          {area === 'study' && <><span className="myhome-eyebrow"><BookOpen size={16}/> The window desk</span><h2>A moment to focus.</h2><p>Practice independently, or pick up your enrolled coursework in AureLearn.</p><div className="myhome-recovery"><div><span>Quiet study</span><strong>+{studyXP}<small> XP</small></strong></div><div><span>Stamina needed</span><strong>{studyCost}</strong></div></div><button className="myhome-primary" disabled={stamina < studyCost} onClick={() => setMessage(state.studyInHousing().message)}>Begin quiet study</button>{stamina < studyCost && <p>Rest first to recover enough stamina.</p>}<p className="myhome-help">Independent practice builds Research and Programming skills. Course credit is earned in AureLearn.</p><button className="myhome-text-button" onClick={() => state.openAppWorkspace('study')}>Open AureLearn <ArrowUpRight size={15}/></button>{courses.map(course => <button className="myhome-course" key={course.id} onClick={() => state.openAppWorkspace('study', course.id)}>{course.title}<ArrowUpRight size={14}/></button>)}</>}
          {area === 'lounge' && <><span className="myhome-eyebrow">The sitting room</span><h2>Make room for company.</h2><p>A cup of tea and a familiar face can change the evening.</p>{installed.includes('seating') ? <><div className="myhome-guests">{HOME_GUESTS.map(person => <button key={person.id} aria-pressed={guest === person.id} onClick={() => { const result = state.inviteHousingGuest(person.id); setMessage(result.message); if (result.ok) setGuest(person.id); }}><span className="myhome-avatar">{person.name.split(' ').map(word => word[0]).slice(0, 2).join('')}</span><span><strong>{person.name}</strong><small>{person.role}</small></span><Plus size={15}/></button>)}</div>{guest && <blockquote>{HOME_GUESTS.find(person => person.id === guest)?.note}</blockquote>}<p className="myhome-help">Each friend's first visit earns 15 XP per cycle. Reopening a conversation gives no extra reward.</p></> : <div className="myhome-empty"><p>A comfortable seat makes visits possible. Add guest seating to invite a friend over.</p><button className="myhome-primary" onClick={() => changeSection('upgrades')}>Find guest seating</button></div>}</>}
          {area === 'keepsakes' && <><span className="myhome-eyebrow">The cabinet</span><h2>Things with a story.</h2><p>Your collected parcels and mastered SpellForge protocols, kept together. {collection.length} {collection.length === 1 ? 'item' : 'items'} in your collection.</p><label className="myhome-field">Find a keepsake<input type="search" value={collectionSearch} onChange={event => setCollectionSearch(event.target.value)}/></label><ul className="myhome-collection">{collection.filter(item => item.toLowerCase().includes(collectionSearch.toLowerCase())).map((item, index) => <li key={`${item}-${index}`}><Package size={16}/>{item}</li>)}</ul>{collection.length === 0 && <p className="myhome-help">Open a parcel in your locker or master a SpellForge protocol to start your collection.</p>}{collection.length > 0 && !collection.some(item => item.toLowerCase().includes(collectionSearch.toLowerCase())) && <p>No keepsakes match that search.</p>}<button className="myhome-text-button" onClick={post}>Visit your postal locker <ArrowUpRight size={15}/></button></>}
        </section></div>
        <footer className="myhome-room-footer"><span><span className="myhome-eyebrow">Delivered to your door</span>{FORMATTED_PLAYER_ADDRESS}</span><button className="myhome-text-button" onClick={() => changeSection('board')}>Leave yourself a note <ArrowUpRight size={15}/></button></footer>
      </>}
      {section === 'life' && <DailyLifePanel onShop={() => changeSection('upgrades')}/>}
      {section === 'upgrades' && <><div className="myhome-catalog-header"><p>Each installation adds comfort, up to 100. Prices include installation; your delivery receipt goes to Meridion Post.</p><label>Show<select aria-label="Furnishing category" value={filter} onChange={event => setFilter(event.target.value)}>{['All', 'Rest', 'Academic', 'Social', 'Security'].map(item => <option key={item}>{item}</option>)}</select></label></div><div className="myhome-catalog">{HOME_FURNISHINGS.filter(item => filter === 'All' || item.category === filter).map((item, index) => <article key={item.id} className="myhome-product"><div className={`myhome-product-art item-${item.id}`} aria-hidden="true"><span>{String(index + 1).padStart(2, '0')}</span><span className="myhome-furniture-shape"/></div><div className="myhome-product-copy"><span className="myhome-eyebrow">{item.category}</span><h2>{item.name}</h2><p>{item.effect}</p><footer><strong>{item.cost.toLocaleString()} <small>cr</small></strong>{installed.includes(item.id) ? <span className="myhome-installed"><Check size={15}/> Installed</span> : <button disabled={(player.credits ?? 0) < item.cost} onClick={() => order(item.id)}>{(player.credits ?? 0) < item.cost ? 'More credits needed' : 'Order & install'}</button>}</footer></div></article>)}</div></>}
      {section === 'board' && <div className="myhome-board"><form className="myhome-note-form" onSubmit={event => { event.preventDefault(); if (!memoTitle.trim() || !memoBody.trim() || memos.length >= 50) return; setMemos([...memos, { id: crypto.randomUUID(), title: memoTitle.trim(), body: memoBody.trim() }]); setMemoTitle(''); setMemoBody(''); setMessage('Your note is pinned.'); }}><span className="myhome-eyebrow">A new note</span><h2>What's on your mind?</h2><label className="myhome-field">Title<input value={memoTitle} maxLength={80} onChange={event => setMemoTitle(event.target.value)} required/></label><label className="myhome-field">Note<textarea value={memoBody} maxLength={1200} rows={5} onChange={event => setMemoBody(event.target.value)} required/></label><button className="myhome-primary" disabled={memos.length >= 50 || !memoTitle.trim() || !memoBody.trim()}><Plus size={16}/> Pin note</button><p className="myhome-help">{memos.length}/50 notes · saved on this device</p></form><div className="myhome-notes">{memos.map(memo => <article key={memo.id}><Pin size={17}/><h2>{memo.title}</h2><p>{memo.body}</p><button aria-label={`Remove note: ${memo.title}`} onClick={() => { setMemos(memos.filter(item => item.id !== memo.id)); setMessage('Note removed.'); }}><X size={16}/></button></article>)}{!memos.length && <p>Your board is clear. Pin your first thought here.</p>}</div></div>}
      {section === 'dreams' && <div className="myhome-journal">{dreams.length ? dreams.map((dream, index) => <article key={`${index}-${dream}`}><span className="myhome-eyebrow">{index === 0 ? 'Most recent dream' : 'Earlier entry'}</span><p>{dream}</p></article>) : <div className="myhome-empty"><Moon size={32}/><h2>A fresh page.</h2><p>Your journal will begin with your next rest. Come back to see what you remember.</p><button className="myhome-primary" onClick={() => { changeSection('room'); setArea('rest'); }}>Return to the bedroom</button></div>}</div>}
    </main>
  </div>;
}
