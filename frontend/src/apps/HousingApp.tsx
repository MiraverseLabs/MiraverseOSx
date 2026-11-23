import React, { useEffect, useState } from 'react';
import {
  ArrowUpRight, Bed, BookOpen, Box, CheckCircle2, Coffee, Home, Lamp,
  MapPin, Moon, Package, Pin, Plus, Sparkles, Users, X,
} from 'lucide-react';
import { useOSStore } from '../store/useOSStore';
import { usePostalStore } from '../store/usePostalStore';
import { COURSES, academicCitizenId, type AcademicState } from '../gameplay/Academics';
import { FORMATTED_PLAYER_ADDRESS } from '../gameplay/Postal';
import DailyLifePanel from './DailyLifePanel';

export interface RoomUpgrade {
  id: string;
  name: string;
  effect: string;
  cost: number;
  unlocked: boolean;
  category: 'Rest' | 'Academic' | 'Security' | 'Social';
}

const INITIAL_UPGRADES: RoomUpgrade[] = [
  { id: 'mattress', name: 'Better Mattress', effect: 'Improves stamina recovery and lowers next-day fatigue', cost: 350, unlocked: false, category: 'Rest' },
  { id: 'storage', name: 'Expanded Storage', effect: 'Expands Suite 4B safekeeping capacity from 20 to 36 slots', cost: 450, unlocked: false, category: 'Rest' },
  { id: 'desk', name: 'Study Desk Upgrade', effect: 'Improves coursework focus, research XP, and exam preparation', cost: 500, unlocked: false, category: 'Academic' },
  { id: 'dock', name: 'Secure Terminal Dock', effect: 'Adds safer access to hidden files and Process Monitor tools', cost: 800, unlocked: false, category: 'Security' },
  { id: 'aura_lamp', name: 'Aura Lamp', effect: 'Stabilizes personal aura and bathes Suite 4B in warm golden light', cost: 600, unlocked: false, category: 'Rest' },
  { id: 'banner', name: 'House Pride Banner', effect: 'Boosts House identity and House-specific social reactions', cost: 250, unlocked: true, category: 'Social' },
  { id: 'seating', name: 'Guest Seating', effect: 'Unlocks cozy Suite 4B hangouts and study visits with friends', cost: 400, unlocked: false, category: 'Social' },
  { id: 'compartment', name: 'Hidden Compartment', effect: 'Stores restricted files, lineage clues, and contraband modules safely', cost: 1200, unlocked: false, category: 'Security' },
];

type AmbianceId = 'warm' | 'morning' | 'lantern' | 'starlight';

const AMBIANCES: Record<AmbianceId, { label: string; bg: string; tint: string }> = {
  warm: { label: 'Warm Evening', bg: '#fbf7f0', tint: '#fef3c7' },
  morning: { label: 'Morning Sun', bg: '#f8fafc', tint: '#e0f2fe' },
  lantern: { label: 'Lantern Study', bg: '#f7f3eb', tint: '#fde68a' },
  starlight: { label: 'Starlight Aura', bg: '#f4f3fb', tint: '#e9d5ff' },
};

interface PinMemo {
  id: string;
  title: string;
  body: string;
}

const DEFAULT_MEMOS: PinMemo[] = [
  { id: 'memo-1', title: 'Suite 4B Mailing Address', body: `${FORMATTED_PLAYER_ADDRESS} — Check Meridion Post when packages arrive.` },
  { id: 'memo-2', title: 'Campus & Study Routine', body: 'Apply on cyberium.edu, dawn.edu (Dawnson), or regenthall.edu, then study at your desk in AureLearn.' },
];

const GUEST_FRIENDS = [
  {
    id: 'aelita',
    name: 'Aelita Hopper',
    role: 'Code Weaving · Cyberium Academy',
    quote: '“Your Suite 4B acoustics are so peaceful—thanks for the tea! Whenever you need a second pair of eyes on a SpellForge protocol, just ping me.”',
  },
  {
    id: 'jeremie',
    name: 'Jeremie Belpois',
    role: 'Signal Engineering · Compiler Lab 4',
    quote: '“Nice desk setup! We ran through two signal-integrity drills and calibrated your relay notes. Don’t forget to rest before heavy lab sessions.”',
  },
  {
    id: 'odd',
    name: 'Odd Della Robia',
    role: 'Field Testing · Vector Hall',
    quote: '“Finally, real guest seating! Brought snacks from Sector 4—ten out of ten hangout spot, way cozier than the observatory stairwell.”',
  },
  {
    id: 'ulrich',
    name: 'Ulrich Stern',
    role: 'Field Testing · Vector Hall',
    quote: '“Good catching up outside the Quadrangle. Take a breather tonight—Aureline gets hectic fast if you never step away from the terminal.”',
  },
];

function loadSaved<T>(key: string, fallback: T): T {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function HousingApp() {
  const [activeTab, setActiveTab] = useState<'room' | 'life' | 'board' | 'upgrades' | 'dreams'>('room');
  const [sleepDuration, setSleepDuration] = useState<'short' | 'standard' | 'full'>('full');
  const [restMessage, setRestMessage] = useState<string | null>(null);
  const [ambiance, setAmbiance] = useState<AmbianceId>(() => loadSaved<AmbianceId>('miraverse-home-ambiance', 'warm'));
  const [memos, setMemos] = useState<PinMemo[]>(() => loadSaved<PinMemo[]>('miraverse-home-memos', DEFAULT_MEMOS));
  const [memoTitle, setMemoTitle] = useState('');
  const [memoBody, setMemoBody] = useState('');
  const [activeGuest, setActiveGuest] = useState<typeof GUEST_FRIENDS[number] | null>(null);

  useEffect(() => {
    try { globalThis.localStorage?.setItem('miraverse-home-ambiance', JSON.stringify(ambiance)); } catch {}
  }, [ambiance]);

  useEffect(() => {
    try { globalThis.localStorage?.setItem('miraverse-home-memos', JSON.stringify(memos)); } catch {}
  }, [memos]);

  const osState = useOSStore();
  const player = osState.gameplay.player;
  const credits = player?.credits || 0;
  const bits = player?.bits || 0;
  const stamina = player?.stamina ?? 85;
  const auraHealth = player?.auraHealth ?? 100;
  const activeConditions: string[] = Array.isArray(player?.conditions) ? player.conditions : [];
  const unlockedIds: string[] = player?.unlockedHousingUpgrades || ['banner'];
  const forgedSpells: string[] = player?.forgedSpells || [];
  const dreamLogs = player?.dreamLogs || [
    'DREAM_ENTRY #04: A mirrored cathedral under coastal rain. A woman with silver hair whispers: "The code was never code, it was memory."',
    'DREAM_ENTRY #03: Falling through the Supercomputer factory floor. Glowing blue lines trace my pulse.',
  ];

  const selfId = academicCitizenId(osState);
  const academics = osState.gameplay.academics as AcademicState | undefined;
  const records = selfId ? academics?.records?.[selfId] || {} : {};
  const activeCourses = COURSES.filter(c => records[c.id]?.status === 'active');

  const shipments = usePostalStore(s => s.shipments);
  const collectedItems = usePostalStore(s => s.collectedItems);
  const waitingParcels = shipments.filter(s => s.direction === 'incoming' && s.status === 'delivered' && !s.opened).length;

  const upgrades: RoomUpgrade[] = INITIAL_UPGRADES.map(u => ({
    ...u,
    unlocked: unlockedIds.includes(u.id),
  }));

  const restInDorm = useOSStore(s => s.restInDorm);
  const studyInHousing = useOSStore(s => s.studyInHousing);
  const purchaseHousingUpgrade = useOSStore(s => s.purchaseHousingUpgrade);

  const flash = (msg: string) => {
    setRestMessage(msg);
    window.setTimeout(() => setRestMessage(null), 4500);
  };

  const handleRest = () => {
    const res = restInDorm(sleepDuration);
    flash(res?.message || 'Rest complete. Stamina & Aura recovered.');
  };

  const handleStudy = () => {
    const res = studyInHousing();
    flash(res.message);
  };

  const handleBuyUpgrade = (upgradeId: string, cost: number, bitCost: number = 0) => {
    const res = purchaseHousingUpgrade(upgradeId, cost, bitCost);
    flash(res.message);
    if (res.ok) {
      const item = INITIAL_UPGRADES.find(u => u.id === upgradeId);
      if (item) {
        void import('../store/usePostalStore')
          .then(({ usePostalStore: store }) => {
            store.getState().enqueueIncomingDelivery({
              id: `POST-HOME-${upgradeId}`,
              kind: 'parcel',
              carrier: 'CargoTrack Express',
              senderName: 'Aureline Furnishings Dispatch',
              senderAddress: '305 Freight Causeway, Dockside, Aureline, Orynvell OR-3305, Meridion',
              title: `Suite 4B Delivery: ${item.name}`,
              description: `Delivered to Suite 4B: ${item.effect}.`,
              rewards: { xp: 10, itemName: `${item.name} (Suite 4B Fixture)` },
              status: 'delivered',
            });
          })
          .catch(() => {});
      }
    }
  };

  const handleInviteGuest = (guest: typeof GUEST_FRIENDS[number]) => {
    setActiveGuest(guest);
    osState.addXP(15);
    flash(`${guest.name} stopped by Suite 4B for a visit (+15 XP).`);
  };

  const handleAddMemo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memoTitle.trim() || !memoBody.trim()) return;
    setMemos(prev => [{ id: `memo-${Date.now()}`, title: memoTitle.trim(), body: memoBody.trim() }, ...prev]);
    setMemoTitle('');
    setMemoBody('');
  };

  const storageCapacity = unlockedIds.includes('storage') ? 36 : 20;
  const safekeepingEntries = [
    ...collectedItems.map(name => ({ name, tag: 'KEEPSAKE' })),
    ...forgedSpells.map(name => ({ name, tag: 'SPELL' })),
  ];

  const sections = [
    { id: 'room', label: 'Living space', icon: Home, title: 'My Home · Suite 4B', description: 'Rest, study at your desk, host friends, and keep the things that matter close.' },
    { id: 'life', label: 'Everyday life', icon: Coffee, title: 'Time that is yours.', description: 'Simple routines, familiar places, and a home to live in.' },
    { id: 'board', label: 'Pinboard', icon: Pin, title: 'Suite 4B Pinboard', description: 'Personal reminders, doorstep deliveries, and notes around Vector House.' },
    { id: 'upgrades', label: 'Furnishings', icon: Box, title: 'Make it your own.', description: 'Thoughtful upgrades that appear right on your Suite 4B floor plan.' },
    { id: 'dreams', label: 'Dream journal', icon: Moon, title: 'What the night leaves behind.', description: 'Fragments, discoveries, and the occasional familiar voice.' },
  ];
  const section = sections.find(item => item.id === activeTab)!;
  const currentAmbiance = AMBIANCES[ambiance];

  return (
    <div className="homecraft-workspace" style={{ background: currentAmbiance.bg }}>
      <aside className="homecraft-index" aria-label="Residence navigation">
        <span className="workspace-kicker">My Home · Aureline</span>
        <div className="homecraft-address">
          <span>VECTOR HOUSE</span>
          <strong>4B<span> / your suite</span></strong>
        </div>

        {/* Interactive Floor Plan reflecting unlocked furnishings */}
        <svg className="homecraft-plan" viewBox="0 0 160 126" fill="none" aria-label="Interactive Suite 4B floor plan" role="img">
          {unlockedIds.includes('aura_lamp') && (
            <circle cx="42" cy="44" r="24" fill="#fde68a" opacity="0.45" />
          )}
          <path d="M12 12h136v102H90m-25 0H12V12m86 0v46h50M12 78h50v36" />
          <path d="M65 114a25 25 0 0 1 25-25v25M98 58a21 21 0 0 1-21-21h21" />
          {/* Bed */}
          <rect x="23" y="24" width="38" height="43" fill={unlockedIds.includes('mattress') ? '#e0e7ff' : 'none'} />
          <path d="M23 36h38" />
          {/* Study Desk */}
          <rect x="108" y="18" width="28" height="24" fill={unlockedIds.includes('desk') ? '#bae6fd' : 'none'} />
          {/* Guest Seating */}
          <rect x="24" y="88" width="24" height="14" fill={unlockedIds.includes('seating') ? '#fde68a' : 'none'} />
          {/* Storage / Hidden Compartment */}
          <rect x="112" y="72" width="24" height="28" fill={unlockedIds.includes('storage') || unlockedIds.includes('compartment') ? '#ddd6fe' : 'none'} />
          <path d="M62 12h20m66 59v23" strokeWidth="4" />
        </svg>

        {/* Room Ambiance Selector */}
        <div className="mb-2 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <Lamp size={11} /> Room Ambiance
          </div>
          <div className="grid grid-cols-2 gap-1">
            {(Object.entries(AMBIANCES) as [AmbianceId, typeof AMBIANCES.warm][]).map(([id, preset]) => (
              <button
                key={id}
                type="button"
                aria-pressed={ambiance === id}
                onClick={() => setAmbiance(id)}
                className={`rounded-md border px-1.5 py-1 text-[10px] font-semibold transition cursor-pointer ${
                  ambiance === id
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-950'
                    : 'border-slate-200 bg-white/80 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <nav>
          {sections.map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} aria-pressed={activeTab === item.id} onClick={() => setActiveTab(item.id as typeof activeTab)}>
                <Icon size={16} />
                <span>{item.label}</span>
                {item.id === 'dreams' && <small>{dreamLogs.length}</small>}
                {item.id === 'board' && <small>{memos.length}</small>}
              </button>
            );
          })}
        </nav>

        {/* Live Doorstep Postal Link */}
        <button
          type="button"
          onClick={() => osState.openAppWorkspace('post', 'locker')}
          className="mt-2 w-full rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-2 text-left text-[11px] font-semibold text-amber-950 hover:bg-amber-100 transition cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1"><Package size={12} /> Suite 4B Doorstep</span>
            {waitingParcels > 0 && (
              <span className="rounded-full bg-amber-700 px-1.5 py-0.2 text-[9.5px] font-bold text-white">{waitingParcels}</span>
            )}
          </div>
          <div className="text-[9.5px] text-amber-800/80 truncate mt-0.5">OR-4012 · Open Meridion Post →</div>
        </button>

        <dl className="homecraft-stats">
          <div><dt>Room comfort</dt><dd>{player?.roomComfort ?? player?.dormComfort ?? 50}<small>/100</small></dd></div>
          <div><dt>Stamina</dt><dd>{stamina}<small>/100</small></dd></div>
          <div><dt>Available credits</dt><dd>{credits.toLocaleString()} ₢</dd></div>
        </dl>
      </aside>

      <div className="homecraft-body">
        <header className="homecraft-heading">
          <span className="workspace-kicker">My Home · Suite 4B / {section.label}</span>
          <h1>{section.title}</h1>
          <p>{section.description}</p>
        </header>

        {restMessage && (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 text-xs font-ui text-amber-900 font-semibold flex items-center justify-between" role="status">
            <span>{restMessage}</span>
          </div>
        )}

        <div className="homecraft-content">
          {activeTab === 'life' && <DailyLifePanel onShop={() => setActiveTab('upgrades')} />}

          {activeTab === 'room' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Bed Station */}
                <div className="homecraft-station flex flex-col justify-between space-y-4">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-indigo-700 font-bold font-mono">
                        <Bed size={16} />
                        <span>Rest & recovery</span>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        AURA {auraHealth}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Choose how long to rest. Your mattress, Aura Lamp, and conditions shape your recovery.
                    </p>
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      {[
                        { id: 'short', label: 'Short Nap', sub: '+1 Seg' },
                        { id: 'standard', label: 'Standard', sub: '+2 Segs' },
                        { id: 'full', label: 'Overnight', sub: 'Next Day' },
                      ].map(opt => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setSleepDuration(opt.id as any)}
                          className={`rounded-lg border px-2 py-1.5 text-center font-mono text-[10px] transition cursor-pointer ${
                            sleepDuration === opt.id
                              ? 'border-indigo-500 bg-indigo-50 font-bold text-indigo-900'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <div>{opt.label}</div>
                          <div className="text-[9px] text-slate-400">{opt.sub}</div>
                        </button>
                      ))}
                    </div>
                    {activeConditions.length > 0 && !unlockedIds.includes('aura_lamp') && (
                      <div className="rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5 text-[10px] text-amber-900 font-mono">
                        Active Condition ({activeConditions.join(', ')}) reduces peak recovery until treated at Faith Medical or stabilized with an Aura Lamp.
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleRest}
                    className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Moon size={14} />
                    <span>Rest in Suite 4B ({sleepDuration.toUpperCase()})</span>
                  </button>
                </div>

                {/* Study Desk Station — Linked to AureLearn LMS */}
                <div className="homecraft-station flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sky-700 font-bold font-mono">
                        <BookOpen size={16} />
                        <span>At your desk</span>
                      </div>
                      <span className="text-[11px] font-mono text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                        {activeCourses.length} ACTIVE
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Review notes for XP or jump straight into your enrolled university classes in AureLearn LMS.
                    </p>
                    {activeCourses.length > 0 && (
                      <div className="space-y-1">
                        {activeCourses.slice(0, 2).map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => osState.openAppWorkspace('study', c.id)}
                            className="w-full p-2 rounded-lg bg-sky-50/70 hover:bg-sky-100 border border-sky-200 flex items-center justify-between text-[11px] font-semibold text-sky-950 transition cursor-pointer"
                          >
                            <span className="truncate">{c.code}: {c.title}</span>
                            <ArrowUpRight size={12} className="shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <button
                      onClick={() => osState.openAppWorkspace('study')}
                      className="w-full py-2 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-mono text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <BookOpen size={13} /> Open AureLearn LMS
                    </button>
                    <button
                      onClick={handleStudy}
                      className="w-full py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Coffee size={13} /> Quiet Desk Study (+120 XP)
                    </button>
                  </div>
                </div>

                {/* Real Safekeeping & Keepsake Shelf */}
                <div className="homecraft-station flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-800 font-bold font-mono">
                        <Box size={16} />
                        <span>Keepsakes & Safe</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {safekeepingEntries.length} / {storageCapacity} SLOTS
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Holds your real unboxed Meridion Post items, wax-sealed folios, and mastered SpellForge protocols.
                    </p>
                    <div className="space-y-1 text-xs font-mono max-h-36 overflow-auto">
                      {safekeepingEntries.length ? (
                        safekeepingEntries.slice(0, 6).map((item, idx) => (
                          <div key={`${item.name}-${idx}`} className="p-2 rounded bg-slate-50 border border-slate-200 flex justify-between gap-2 text-slate-700">
                            <span className="truncate">• {item.name}</span>
                            <span className="text-[10px] text-amber-800 font-bold shrink-0">{item.tag}</span>
                          </div>
                        ))
                      ) : (
                        <div className="p-2.5 rounded bg-slate-50 border border-dashed border-slate-300 text-[11px] text-slate-500">
                          Your shelf is ready. Unbox packages in Meridion Post or forge spells in SpellForge!
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => osState.openAppWorkspace('post', 'keepsakes')}
                    className="w-full py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 font-mono text-xs font-bold transition cursor-pointer"
                  >
                    View Parcel Locker ({waitingParcels} waiting) →
                  </button>
                </div>
              </div>

              {/* Guest Seating & Cozy Hangouts */}
              <section className="homecraft-station space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-purple-900 font-bold font-mono text-xs uppercase">
                    <Users size={15} /> Suite 4B Lounge & Guest Hangouts
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {unlockedIds.includes('seating') ? 'Guest Seating Installed ✓' : 'Unlock Guest Seating in Furnishings'}
                  </span>
                </div>
                {unlockedIds.includes('seating') ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {GUEST_FRIENDS.map(friend => (
                        <button
                          key={friend.id}
                          type="button"
                          onClick={() => handleInviteGuest(friend)}
                          className={`rounded-xl border px-3 py-2 text-left text-xs transition cursor-pointer ${
                            activeGuest?.id === friend.id
                              ? 'border-purple-500 bg-purple-50 text-purple-950 font-bold'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div>{friend.name}</div>
                          <div className="text-[10px] text-slate-400">{friend.role}</div>
                        </button>
                      ))}
                    </div>
                    {activeGuest && (
                      <blockquote className="rounded-xl border-l-4 border-purple-500 bg-purple-50/60 p-3.5 text-xs text-slate-800 leading-relaxed">
                        <strong className="block text-purple-950 mb-1">{activeGuest.name} is visiting Suite 4B:</strong>
                        {activeGuest.quote}
                      </blockquote>
                    )}
                  </>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
                    <span>Add Guest Seating to invite Aelita, Jeremie, Odd, or Ulrich over for tea and study hangouts.</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('upgrades')}
                      className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-white font-bold text-xs cursor-pointer"
                    >
                      Browse Furnishings →
                    </button>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* INTERACTIVE PINBOARD TAB */}
          {activeTab === 'board' && (
            <div className="space-y-5">
              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-amber-950">
                  <strong className="flex items-center gap-1.5"><MapPin size={13} /> Suite 4B Official Mailing Address</strong>
                  <span className="font-mono text-[11px]">{FORMATTED_PLAYER_ADDRESS}</span>
                </div>
                <button
                  type="button"
                  onClick={() => osState.openAppWorkspace('post', 'locker')}
                  className="rounded-lg bg-amber-800 hover:bg-amber-900 px-3 py-1.5 text-xs font-bold text-white cursor-pointer"
                >
                  Open Meridion Post ({waitingParcels} waiting) →
                </button>
              </div>

              <form onSubmit={handleAddMemo} className="rounded-xl border border-slate-200 bg-white p-4 space-y-2.5">
                <div className="text-xs font-bold text-slate-800 uppercase font-mono flex items-center gap-1.5">
                  <Plus size={14} /> Pin a Personal Memo to Your Wall
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input
                    value={memoTitle}
                    onChange={e => setMemoTitle(e.target.value)}
                    placeholder="Memo title (e.g. Exam Friday)"
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                    required
                  />
                  <input
                    value={memoBody}
                    onChange={e => setMemoBody(e.target.value)}
                    placeholder="Write your reminder…"
                    className="md:col-span-2 rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                    required
                  />
                </div>
                <button type="submit" className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-3.5 py-1.5 text-xs font-bold text-white cursor-pointer">
                  Pin to Board
                </button>
              </form>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {memos.map(memo => (
                  <div key={memo.id} className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between gap-2 text-amber-950 font-bold text-xs font-mono">
                      <span>📌 {memo.title}</span>
                      <button
                        type="button"
                        aria-label={`Remove memo ${memo.title}`}
                        onClick={() => setMemos(prev => prev.filter(m => m.id !== memo.id))}
                        className="rounded p-1 text-amber-800 hover:bg-amber-200/70 cursor-pointer"
                      >
                        <X size={13} />
                      </button>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed m-0">{memo.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FURNISHINGS / UPGRADES TAB */}
          {activeTab === 'upgrades' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-sm text-slate-900 font-mono uppercase">Suite 4B Furnishings & Upgrades</h3>
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span>Balance: <strong className="text-amber-800 font-bold">{credits} ₢</strong></span>
                  <span>•</span>
                  <span><strong className="text-emerald-700 font-bold">{bits} ◈ BITS</strong></span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upgrades.map(u => (
                  <div
                    key={u.id}
                    className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-bold text-sm text-slate-900">{u.name}</h4>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {u.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{u.effect}</p>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <span className="text-xs font-mono font-bold text-amber-800">{u.cost} ₢</span>
                      {u.unlocked ? (
                        <span className="text-xs font-mono font-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircle2 size={13} /> INSTALLED
                        </span>
                      ) : (
                        <button
                          onClick={() => handleBuyUpgrade(u.id, u.cost)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs font-bold transition shadow-xs cursor-pointer"
                        >
                          Order & Install
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DREAM JOURNAL TAB */}
          {activeTab === 'dreams' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-sm text-slate-900 font-mono uppercase">Veil Dream Journal</h3>
                <span className="text-xs text-purple-700 font-mono font-bold flex items-center gap-1">
                  <Sparkles size={13} /> Lightborn Signal Active
                </span>
              </div>
              <div className="space-y-3">
                {dreamLogs.map((entry: string, idx: number) => (
                  <div key={idx} className="bg-white p-4 rounded-xl border border-purple-200 text-xs text-slate-700 font-mono leading-relaxed shadow-xs">
                    {entry}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
