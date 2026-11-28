import React, { useRef, useState } from 'react';
import { SEVEN_REALMS, GEOGRAPHIC_LANDMARKS, RealmDefinition } from '../data/meridionWorld';
import { Compass, Star, MapPin, Shield, Thermometer, Wind, Sparkles, Mountain, Waves, Sun, Snowflake, Flame, Moon, ZoomIn, ZoomOut, Maximize2, RotateCcw, X } from 'lucide-react';

const REALM_MAP_ASSETS: Record<string, { src: string; subtitle: string }> = {
  OR: { src: '/media/maps/orynvell.jpg', subtitle: 'Orynvell — The Aetherial Realm' },
  FR: { src: '/media/maps/fross.jpg', subtitle: 'Fross — The Winter Realm' },
  LU: { src: '/media/maps/lumia.jpg', subtitle: 'Lumia — The Realm of Summer and Light' },
  MA: { src: '/media/maps/marlowe.jpg', subtitle: 'Marlowe — The Radiant Water Realm' },
  BR: { src: '/media/maps/brisland.jpg', subtitle: 'Brisland — The Windlit Realm' },
  KA: { src: '/media/maps/kaji.jpg', subtitle: 'Kaji — The Volcanic Realm of Pyre' },
  NE: { src: '/media/maps/nephele.jpg', subtitle: 'Nephele — The Realm of Shadows and the Nether' },
  VR: { src: '/media/maps/veraylia.jpg', subtitle: 'Ve’Raylia — The Emerald Realm' },
};

export default function SevenRealmsMapPanel() {
  const [selectedRealmId, setSelectedRealmId] = useState<string>('REG_ORYNVELL');
  const [zoom, setZoom] = useState<number>(1);
  const [modalZoom, setModalZoom] = useState<number>(1);
  const lightboxRef = useRef<HTMLDialogElement>(null);
  const selectedRealm = SEVEN_REALMS.find(r => r.id === selectedRealmId) || SEVEN_REALMS[0];
  const mapAsset = REALM_MAP_ASSETS[selectedRealm.regionCode] || REALM_MAP_ASSETS.OR;

  const selectRealm = (id: string) => {
    setSelectedRealmId(id);
    setZoom(1);
  };

  const openLightbox = () => {
    setModalZoom(1);
    lightboxRef.current?.showModal();
  };

  const closeLightbox = () => {
    lightboxRef.current?.close();
  };

  const getElementIcon = (element: string) => {
    if (element.includes('Celestial') || element.includes('Aether')) return <Sparkles size={16} className="text-amber-500" />;
    if (element.includes('Ice') || element.includes('Winter')) return <Snowflake size={16} className="text-sky-500" />;
    if (element.includes('Light') || element.includes('Summer')) return <Sun size={16} className="text-amber-400" />;
    if (element.includes('Water') || element.includes('Spring')) return <Waves size={16} className="text-emerald-500" />;
    if (element.includes('Air') || element.includes('Autumn')) return <Wind size={16} className="text-orange-500" />;
    if (element.includes('Fire') || element.includes('Volcanic')) return <Flame size={16} className="text-rose-500" />;
    if (element.includes('Earth') || element.includes('Nature')) return <Mountain size={16} className="text-emerald-700" />;
    return <Moon size={16} className="text-purple-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-white p-5 rounded-2xl border border-[#d8dce8] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-indigo-700 uppercase tracking-wider">
            <Compass size={14} />
            <span>Atlas Concord of the Eight Realms</span>
          </div>
          <h2 className="text-lg font-bold text-[#1e2640] mt-1">Sovereign Geography of Meridion</h2>
          <p className="text-xs text-slate-600 max-w-2xl mt-0.5 leading-relaxed">
            Eight elemental realms under royal succession law, including inland Ve’Raylia. Star markers (★) designate sovereign capital anchors. Kailo, Kanifan, and Pyre are held under Kaji jurisdiction.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700">
          <Star size={13} className="text-amber-500 fill-amber-500" />
          <span>★ = Capital Anchor</span>
        </div>
      </div>

      {/* Main Grid: Interactive Realm Selector + Detail Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Eight Realms Grid */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider px-1">
            Eight Realms & Anchors
          </div>
          <div className="grid grid-cols-1 gap-2.5">
            {SEVEN_REALMS.map((realm) => {
              const isSelected = realm.id === selectedRealmId;
              return (
                <button
                  type="button"
                  key={realm.id}
                  onClick={() => selectRealm(realm.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-white border-indigo-500 shadow-md ring-2 ring-indigo-500/10'
                      : 'bg-white/70 hover:bg-white border-[#d8dce8] hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border"
                      style={{
                        backgroundColor: `${realm.color}15`,
                        borderColor: `${realm.color}35`,
                      }}
                    >
                      {getElementIcon(realm.element)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-[#1e2640]">{realm.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {realm.regionCode}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Star size={10} className="text-amber-500 fill-amber-500 shrink-0" />
                        <span className="font-semibold text-slate-700">{realm.capital}</span>
                        <span className="text-slate-400">·</span>
                        <span>{realm.rulingLineage}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: `${realm.color}12`, color: realm.color }}>
                      {realm.element.split('/')[0].trim()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Realm Comprehensive Dossier */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-[#d8dce8] p-6 shadow-sm space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-mono font-bold px-2 py-0.5 rounded border"
                    style={{
                      backgroundColor: `${selectedRealm.color}15`,
                      borderColor: `${selectedRealm.color}40`,
                      color: selectedRealm.color,
                    }}
                  >
                    {selectedRealm.regionCode} · {selectedRealm.element}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Cycle Danger: LVL {selectedRealm.dangerLevel}
                  </span>
                </div>
                <h3 className="text-2xl font-serif font-bold text-[#1e2640] mt-1.5 flex items-center gap-2">
                  <span>{selectedRealm.name}</span>
                  <span className="text-xs font-sans font-normal text-slate-500">
                    ({selectedRealm.season})
                  </span>
                </h3>
              </div>

              <div className="text-right sm:text-right">
                <div className="text-[11px] font-mono text-slate-400 uppercase">Ruling Lineage</div>
                <div className="font-bold text-sm text-[#1e2640]">{selectedRealm.rulingLineage}</div>
              </div>
            </div>

            {/* Illustrated Sovereign Realm Map with Zoom & Fullscreen Lightbox */}
            <div className="rounded-xl border border-slate-200 bg-slate-950/95 overflow-hidden shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-slate-900 text-slate-100 border-b border-slate-800">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <MapPin size={13} className="text-amber-400" />
                  <span>{mapAsset.subtitle}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setZoom(z => Math.max(1, Number((z - 0.5).toFixed(2))))}
                    disabled={zoom <= 1}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 cursor-pointer"
                    aria-label="Zoom out map"
                    title="Zoom out"
                  >
                    <ZoomOut size={14} />
                  </button>
                  <span className="text-[11px] font-mono text-slate-300 min-w-[42px] text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoom(z => Math.min(2.5, Number((z + 0.5).toFixed(2))))}
                    disabled={zoom >= 2.5}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 cursor-pointer"
                    aria-label="Zoom in map"
                    title="Zoom in"
                  >
                    <ZoomIn size={14} />
                  </button>
                  {zoom > 1 && (
                    <button
                      type="button"
                      onClick={() => setZoom(1)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                      aria-label="Reset map zoom"
                      title="Reset zoom"
                    >
                      <RotateCcw size={13} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={openLightbox}
                    className="ml-1 inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-[11px] font-semibold cursor-pointer"
                    title="Inspect full-resolution realm map"
                  >
                    <Maximize2 size={12} />
                    <span>Expand</span>
                  </button>
                </div>
              </div>
              <div className="overflow-auto max-h-[420px] bg-slate-950">
                <img
                  src={mapAsset.src}
                  alt={mapAsset.subtitle}
                  onClick={() => setZoom(z => (z >= 2 ? 1 : Number((z + 0.5).toFixed(2))))}
                  style={{
                    width: `${zoom * 100}%`,
                    maxWidth: 'none',
                    display: 'block',
                    cursor: zoom >= 2 ? 'zoom-out' : 'zoom-in',
                    transition: 'width 0.2s ease',
                  }}
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto p-2 bg-slate-900/95 border-t border-slate-800" aria-label="Switch realm map">
                {SEVEN_REALMS.map(r => {
                  const thumb = REALM_MAP_ASSETS[r.regionCode];
                  if (!thumb) return null;
                  const active = r.id === selectedRealm.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => selectRealm(r.id)}
                      className={`shrink-0 flex flex-col items-center gap-1 p-1 rounded-lg border transition cursor-pointer ${
                        active
                          ? 'border-amber-400 bg-amber-400/15 text-amber-200'
                          : 'border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <img src={thumb.src} alt="" className="w-16 h-10 object-cover rounded" loading="lazy" />
                      <span className="text-[10px] font-semibold">{r.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <dialog
              ref={lightboxRef}
              onClick={e => { if (e.target === lightboxRef.current) closeLightbox(); }}
              className="m-auto w-[94vw] max-w-6xl max-h-[92vh] rounded-2xl border border-slate-700 bg-slate-950 text-white p-0 shadow-2xl backdrop:bg-slate-950/80"
            >
              <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-900 border-b border-slate-800">
                <strong className="text-sm">{mapAsset.subtitle}</strong>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setModalZoom(z => Math.max(1, Number((z - 0.5).toFixed(2))))} disabled={modalZoom <= 1} className="px-2 py-1 rounded bg-slate-800 text-xs disabled:opacity-40 cursor-pointer">−</button>
                  <span className="text-xs font-mono min-w-[44px] text-center">{Math.round(modalZoom * 100)}%</span>
                  <button type="button" onClick={() => setModalZoom(z => Math.min(3, Number((z + 0.5).toFixed(2))))} disabled={modalZoom >= 3} className="px-2 py-1 rounded bg-slate-800 text-xs disabled:opacity-40 cursor-pointer">+</button>
                  <button type="button" onClick={closeLightbox} className="ml-2 p-1.5 rounded bg-slate-800 hover:bg-slate-700 cursor-pointer" aria-label="Close expanded map"><X size={15} /></button>
                </div>
              </div>
              <div className="overflow-auto max-h-[82vh] bg-slate-950">
                <img
                  src={mapAsset.src}
                  alt={mapAsset.subtitle}
                  style={{ width: `${modalZoom * 100}%`, maxWidth: 'none', display: 'block' }}
                />
              </div>
            </dialog>

            {/* Anchors & Capital */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="text-[10px] font-mono font-bold text-amber-700 flex items-center gap-1 uppercase">
                  <Star size={11} className="fill-amber-500 text-amber-500" />
                  <span>Sovereign Capital Anchor</span>
                </div>
                <div className="font-bold text-base text-slate-900 mt-1">
                  {selectedRealm.capital} ★
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  Designated official star marker on canonical atlas.
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div className="text-[10px] font-mono font-bold text-indigo-700 flex items-center gap-1 uppercase">
                  <Shield size={11} />
                  <span>Jurisdiction Status</span>
                </div>
                <div className="font-bold text-base text-slate-900 mt-1">
                  {selectedRealm.secondaryAnchor ? 'Dual Sovereign Anchors' : 'Single Seat of Power'}
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  {selectedRealm.secondaryAnchor || 'Unified central administration.'}
                </div>
              </div>
            </div>

            {/* Postal Routing & Addressing Standard (RR-NNNN) */}
            <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="font-bold text-indigo-700 uppercase">National Postal Format (RR-NNNN)</span>
                <span className="bg-indigo-50 border border-indigo-200 text-indigo-800 font-bold px-2 py-0.5 rounded">
                  Prefix: {selectedRealm.regionCode}-####
                </span>
              </div>
              <div className="text-xs text-slate-600">
                <span className="text-slate-400 font-mono">Standard Address Syntax:</span>{' '}
                <code className="font-mono text-slate-800 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                  [Building & Street], {selectedRealm.capital}, {selectedRealm.name} {selectedRealm.regionCode}-1000, Meridion
                </code>
              </div>
            </div>

            {/* Realm Role & Law */}
            <div>
              <div className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Constitutional Role & Character
              </div>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                {selectedRealm.role}
              </p>
            </div>

            {/* Climate & Seasons */}
            <div>
              <div className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Thermometer size={13} className="text-indigo-600" />
                <span>Atmosphere, Climate & Seasons</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed bg-indigo-50/30 p-3.5 rounded-xl border border-indigo-100">
                {selectedRealm.climate}
              </p>
            </div>

            {/* Landmarks & Subregions */}
            <div className="space-y-2">
              <div className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">
                Key Landmarks & Territories
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedRealm.landmarks.map((landmark, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 text-xs font-mono bg-white px-3 py-1 rounded-lg border border-slate-200 text-slate-800 shadow-2xs"
                  >
                    <MapPin size={12} className="text-indigo-600" />
                    <span>{landmark}</span>
                  </span>
                ))}
                {selectedRealm.subregions?.map((sub, idx) => (
                  <span
                    key={`sub-${idx}`}
                    className="inline-flex items-center gap-1.5 text-xs font-mono bg-amber-50/70 px-3 py-1 rounded-lg border border-amber-200 text-amber-900"
                  >
                    <Mountain size={12} className="text-amber-700" />
                    <span>{sub} (Integrated)</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Housing & Navigation Tier Guidance */}
            <div className="border-t border-slate-100 pt-4 grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-800">Tier A</div>
                <div className="text-[10px] text-slate-500">Fully Interactive</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-800">Tier B</div>
                <div className="text-[10px] text-slate-500">Visitable Seat</div>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                <div className="font-bold text-slate-800">Tier C</div>
                <div className="text-[10px] text-slate-500">Registered Only</div>
              </div>
            </div>
          </div>

          {/* Named Maritime & Continental Landmarks Strip */}
          <div className="bg-white rounded-2xl border border-[#d8dce8] p-5 shadow-xs space-y-3">
            <div className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Waves size={13} className="text-sky-600" />
              <span>Continental & Maritime Waters</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {GEOGRAPHIC_LANDMARKS.slice(0, 4).map((g) => (
                <div key={g.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>{g.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-white rounded border border-slate-200 text-slate-600">
                      {g.designation}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1 leading-snug">{g.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
