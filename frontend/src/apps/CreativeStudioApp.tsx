import React, { useMemo, useState } from 'react';
import {
  Sparkles, Shield, Layers, Upload, CheckCircle2, Pause, Play,
  RotateCcw, BookOpen, Newspaper, Share2, FileText, Database
} from 'lucide-react';
import { useOSStore } from '../store/useOSStore';
import {
  BRAND_KITS,
  COLOR_PALETTES,
  listAllMediaAssets,
  listWorldLibraryByDomain,
  uploadRuntimeMediaToBackend,
  type WorldDomain,
} from '../game-content/worldAssetLibrary';
import {
  MEDIA_TEMPLATES,
  validateMediaArtifactInput,
  type MediaChannel,
  type PublishedMediaArtifact,
  type VerificationTier,
} from '../components/media/templateModel';
import { MediaTemplateRenderer } from '../components/media/MediaTemplateRenderer';
import {
  captureWorldCheckpoint,
  getPublishedHistory,
  getWorldPauseState,
  listWorldCheckpoints,
  listCreatorDrafts,
  pauseWorld,
  publishCreatorDraft,
  restoreWorldCheckpoint,
  resumeWorld,
  saveCreatorDraft,
} from '../integration/worldStateManager';
import { publicEditorialSources, restoreMediaStudio } from '../gameplay/MediaStudio';
import {
  evaluateCreativeStudioPermissions,
  validateStudioPublishPermission,
  type CreativeStudioPermissions,
} from '../gameplay/creativeStudioModel';
export { evaluateCreativeStudioPermissions, validateStudioPublishPermission, type CreativeStudioPermissions };

export default function CreativeStudioApp() {
  const gameplay = useOSStore(s => s.gameplay);
  const player = gameplay.player;
  const publicSources = useMemo(() => publicEditorialSources(gameplay), [gameplay]);
  const [sourceEventId, setSourceEventId] = useState('');
  const [polishBusy, setPolishBusy] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const cycle = useOSStore(s => s.gameplay.timeCycleCount ?? 28);
  const isLoggedIn = useOSStore(s => s.isLoggedIn);
  const perms = useMemo(() => evaluateCreativeStudioPermissions(player, isLoggedIn), [player, isLoggedIn]);

  const [tab, setTab] = useState<'composer' | 'library' | 'palettes' | 'dynamic' | 'admin'>('composer');
  const [adSpend, setAdSpend] = useState(0);
  const [channel, setChannel] = useState<MediaChannel>('social');
  const templates = useMemo(() => MEDIA_TEMPLATES.filter(t => t.channel === channel), [channel]);
  const [templateId, setTemplateId] = useState<string>('tpl-social-article-promo');
  const [brandKitId, setBrandKitId] = useState<string>('the-social-register');
  const [tier, setTier] = useState<VerificationTier>('personal_perspective');
  const [kicker, setKicker] = useState('SOCIETY & CULTURE');
  const [headline, setHeadline] = useState('Evening Notes Along the Glassline Promenade');
  const [subhead, setSubhead] = useState('Architecture, chamber recitals, and unhurried conversation beneath Radiance and Echo.');
  const [pullQuote, setPullQuote] = useState('A city feels inhabited when its public spaces invite people to linger.');
  const [body, setBody] = useState(
    'Across Aureline’s limestone arcades and Rosemont salons, designers and correspondents are pairing heritage craft with modern civic clarity.',
  );
  const [selectedEntityId, setSelectedEntityId] = useState('REG_ORYNVELL');
  const [selectedAssetId, setSelectedAssetId] = useState('canon:place-aureline-heavens');
  const [accentOverride, setAccentOverride] = useState('');

  // World Asset Library browser state
  const [activeDomain, setActiveDomain] = useState<WorldDomain>('places');
  const [notice, setNotice] = useState('');
  const [adminRefresh, setAdminRefresh] = useState(0);

  const previewArtifact: PublishedMediaArtifact = useMemo(
    () => ({
      id: 'studio-live-preview',
      templateId: templates.some(t => t.id === templateId) ? templateId : templates[0]?.id || 'tpl-social-article-promo',
      brandKitId,
      channel,
      verificationTier: perms.allowedVerificationTiers.includes(tier) ? tier : perms.allowedVerificationTiers[0],
      slotValues: {
        kicker,
        byline: player?.name || 'Citizen Creator',
        issueNumber: `Cycle ${cycle}`,
        headline: headline || 'Untitled Draft',
        subhead,
        pullQuote,
        body,
        issueDate: `Cycle ${cycle}`,
        dateLocation: `Aureline · Cycle ${cycle}`,
        imageAssetId: selectedAssetId || undefined,
        primaryEntityId: selectedEntityId || undefined,
        pollOptions: templateId === 'tpl-social-poll' ? ['Strongly agree', 'Worth exploring further', 'See discussion below'] : undefined,
        slides:
          templateId === 'tpl-social-carousel'
            ? [
                { id: 'p1', headline: headline || 'Frame I', caption: subhead, assetId: selectedAssetId || undefined },
                { id: 'p2', headline: 'Frame II · Context', caption: pullQuote || body.slice(0, 120), entityId: selectedEntityId },
              ]
            : undefined,
      },
      tokenOverrides: accentOverride ? { accentPrimary: accentOverride } : undefined,
      entityRefs: selectedEntityId ? [selectedEntityId] : [],
      authorId: 'you',
      authorName: player?.name || 'Citizen Creator',
      publisherOrgId:
        channel === 'newspaper'
          ? 'ORG_THE_MERIDIAN'
          : channel === 'magazine'
            ? 'ORG_SOCIAL_REGISTER'
            : undefined,
      publishedCycle: cycle,
      createdAt: new Date().toISOString(),
    }),
    [templates, templateId, brandKitId, channel, perms, tier, kicker, headline, subhead, pullQuote, body, cycle, selectedAssetId, selectedEntityId, accentOverride, player?.name],
  );

  const handlePublishPlayerWork = () => {
    const result = useOSStore.getState().publishCreativeArtifact({ ...previewArtifact, verificationTier: tier, sourceEventId, adSpend: tier === 'promo' ? adSpend : 0 });
    setNotice(result.message);
  };

  const handleUploadAsset = async (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = typeof reader.result === 'string' ? reader.result : '';
      const res = await uploadRuntimeMediaToBackend({
        name: file.name,
        mimeType: file.type,
        dataBase64: b64,
        slotRole: 'media.studio',
        entityIds: selectedEntityId ? [selectedEntityId] : [],
        caption: `${file.name} (${player?.name || 'Creator'})`,
        creator: player?.name || 'Citizen Creator',
        scope: perms.isAdmin ? 'admin_canon' : 'player_work',
      });
      if (res.ok && res.asset) {
        setSelectedAssetId(res.asset.id);
        setNotice(`Uploaded & provenance-tagged asset [${res.asset.id}] via Unified Media Registry.`);
      } else {
        setNotice(res.error || 'Upload rejected.');
      }
    };
    reader.readAsDataURL(file);
  };

  // Admin Canon State
  const pauseInfo = useMemo(() => getWorldPauseState(), [adminRefresh]);
  const adminDrafts = useMemo(() => listCreatorDrafts(), [adminRefresh]);
  const checkpoints = useMemo(() => listWorldCheckpoints(), [adminRefresh]);
  const publishedHistory = useMemo(() => getPublishedHistory(), [adminRefresh]);
  const actorOverride = { isLoggedIn, isAdmin: Boolean(player?.isAdmin), name: player?.name || 'World Administrator' };

  const allAssets = listAllMediaAssets(perms.isAdmin);
  const domainEntities = useMemo(() => listWorldLibraryByDomain(activeDomain), [activeDomain]);

  return (
    <div className="h-full w-full overflow-auto bg-[#F8F9FC] text-[#141214] p-5 space-y-5">
      {/* Studio Header */}
      <header className="bg-[#48293D] text-white p-4 rounded-xl border-2 border-[#C6AE73] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-mono tracking-widest uppercase text-[#D8C0CB] flex items-center gap-2">
            <Sparkles size={13} />
            <span>MIRAVERSE CREATIVE & EDITORIAL STUDIO</span>
          </div>
          <h1 className="text-2xl font-bold mt-0.5" style={{ fontFamily: 'var(--font-editorial-masthead)' }}>
            Shared Media, Periodical & Brand Workbench
          </h1>
          <p className="text-xs text-[#EAD8E0] mt-0.5">{perms.roleSummary}</p>
        </div>
        <nav className="flex flex-wrap gap-2" aria-label="Creative Studio Workspaces">
          <button type="button" onClick={() => setTab('composer')} className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${tab === 'composer' ? 'bg-[#C6AE73] text-[#241620] border-[#C6AE73]' : 'bg-[#45304D] text-white border-[#D8C0CB]/40'}`}>
            <Layers size={13} className="inline mr-1" /> Template Composer
          </button>
          <button type="button" onClick={() => setTab('library')} className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${tab === 'library' ? 'bg-[#C6AE73] text-[#241620] border-[#C6AE73]' : 'bg-[#45304D] text-white border-[#D8C0CB]/40'}`}>
            <Database size={13} className="inline mr-1" /> World Asset Library
          </button>
          <button type="button" onClick={() => setTab('palettes')} className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${tab === 'palettes' ? 'bg-[#C6AE73] text-[#241620] border-[#C6AE73]' : 'bg-[#45304D] text-white border-[#D8C0CB]/40'}`}>
            <BookOpen size={13} className="inline mr-1" /> Brand Kits & Palettes
          </button>
          {perms.isAdmin && (
            <button type="button" onClick={() => setTab('admin')} className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${tab === 'admin' ? 'bg-amber-300 text-slate-950 border-amber-200' : 'bg-slate-900 text-amber-200 border-amber-400/50'}`}>
              <Shield size={13} className="inline mr-1" /> Admin Canon Console
            </button>
          )}
          <button type="button" onClick={() => setTab('dynamic')} className="px-3 py-1.5 rounded-lg text-xs font-bold border bg-[#45304D] text-white">Dynamic Media Desk</button>
        </nav>
      </header>

      {notice && (
        <div role="status" className="p-3 rounded-lg bg-white border border-[#C6AE73] text-xs flex items-center justify-between">
          <span className="flex items-center gap-2 font-medium text-[#48293D]">
            <CheckCircle2 size={15} /> {notice}
          </span>
          <button type="button" onClick={() => setNotice('')} className="text-slate-500 hover:text-slate-800 px-2">
            ×
          </button>
        </div>
      )}

      {/* TAB 1: SHARED TEMPLATE COMPOSER */}
      {tab === 'dynamic' && <section className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
        <h2 className="text-lg font-bold">Dynamic Media Desk</h2>
        <p className="text-sm">The desk selects up to two released public service updates and one celestial column when a new game cycle begins. Editions remain saved when the app is closed. Optional AI suggestions never publish automatically.</p>
        <p className="text-xs text-slate-600">Latest editorial cycle: {restoreMediaStudio(gameplay.mediaStudio, cycle).lastEditorialCycle} · Released sources: {publicSources.length} · Saved editorial decisions: {restoreMediaStudio(gameplay.mediaStudio, cycle).editorialReceipts.length}</p>
        {(gameplay.publishedMediaArtifacts || []).filter(a => a.id.startsWith('EDITORIAL:')).slice(0,6).map(a => <article key={a.id} className="border-t pt-3"><strong>{a.slotValues.headline}</strong><p className="text-sm">{a.slotValues.subhead}</p><small>Cycle {a.publishedCycle} · Public reporting</small></article>)}
        <h3 className="font-bold">Next assignments</h3>
        <p className="text-sm">Review an existing newsroom shift or freelance event-card commission in WORKNET. Each uses its own work stages and compensation receipt.</p>
        {['ms-press-01', 'qn-04'].map(id => <button key={id} type="button" className="mr-3 underline text-sm" onClick={() => {
          const store = useOSStore.getState(); store.openAssignment(id); store.openAppWorkspace('jobs', 'assignment');
        }}>{id === 'ms-press-01' ? 'Review the press fact-checking shift' : 'Review the Rosemont freelance commission'}</button>)}
      </section>}
      {tab === 'composer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <section className="lg:col-span-6 bg-white p-5 rounded-xl border border-slate-200 space-y-3.5 shadow-2xs">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#464C55]">1. Configure Channel, Brand & Slots</h2>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="space-y-1 font-semibold">
                <span>Distribution Channel</span>
                <select
                  value={channel}
                  onChange={e => {
                    const next = e.target.value as MediaChannel;
                    setChannel(next);
                    const first = MEDIA_TEMPLATES.find(t => t.channel === next);
                    if (first) {
                      setTemplateId(first.id);
                      setBrandKitId(first.defaultBrandKitId);
                    }
                  }}
                  className="w-full p-2 rounded border border-slate-300 bg-white"
                >
                  <option value="social">MAI.SPACE Social (16 Templates)</option>
                  <option value="newspaper">The Meridian (meridian.mer) {!perms.allowedChannels.includes('newspaper') ? '🔒 Press Role' : ''}</option>
                  <option value="magazine">The Social Register (socialregister.mer) {!perms.allowedChannels.includes('magazine') ? '🔒 Press/Artist' : ''}</option>
                  <option value="document">Fylo Printable Document (.pdf)</option>
                </select>
              </label>
              <label className="space-y-1 font-semibold">
                <span>Reusable Template</span>
                <select value={previewArtifact.templateId} onChange={e => setTemplateId(e.target.value)} className="w-full p-2 rounded border border-slate-300 bg-white">
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="space-y-1 font-semibold">
                <span>Brand Identity Kit</span>
                <select value={brandKitId} onChange={e => setBrandKitId(e.target.value)} className="w-full p-2 rounded border border-slate-300 bg-white">
                  {Object.values(BRAND_KITS).map(k => (
                    <option key={k.id} value={k.id}>{k.name}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 font-semibold">
                <span>Verification Tier</span>
                <select value={previewArtifact.verificationTier} onChange={e => setTier(e.target.value as VerificationTier)} className="w-full p-2 rounded border border-slate-300 bg-white">
                  {perms.allowedVerificationTiers.map(vt => (
                    <option key={vt} value={vt}>{vt}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="space-y-1 font-semibold">
                <span>Department / Kicker</span>
                <input value={kicker} onChange={e => setKicker(e.target.value)} className="w-full p-2 rounded border border-slate-300" />
              </label>
              <label className="space-y-1 font-semibold">
                <span>Accent Color Variable Override</span>
                <input value={accentOverride} onChange={e => setAccentOverride(e.target.value)} placeholder="e.g. #C6AE73 (optional)" className="w-full p-2 rounded border border-slate-300" />
              </label>
            </div>

            <label className="block space-y-1 text-xs font-semibold">
              <span>Headline</span>
              <input value={headline} onChange={e => setHeadline(e.target.value)} className="w-full p-2 rounded border border-slate-300" />
            </label>

            <label className="block space-y-1 text-xs font-semibold">
              <span>Released public source</span>
              <select value={sourceEventId} onChange={e => { setSourceEventId(e.target.value); setSuggestion(''); }} className="w-full p-2 rounded border border-slate-300 bg-white">
                <option value="">Independent composition (use Personal, Opinion or Promotion)</option>
                {publicSources.map(s => <option key={s.id} value={s.id}>{s.headline} · Cycle {s.cycle}</option>)}
              </select>
            </label>
            {sourceEventId && <div className="space-y-2 text-xs">
              <p>{publicSources.find(s => s.id === sourceEventId)?.summary}</p>
              <button type="button" disabled={polishBusy} className="underline disabled:opacity-50" onClick={async () => {
                setPolishBusy(true);
                const result = await useOSStore.getState().polishPublicMediaSource(sourceEventId);
                setSuggestion(result.text || ''); setNotice(result.message); setPolishBusy(false);
              }}>{polishBusy ? 'Preparing suggestion…' : 'Suggest a deck from this public source (optional AI)'}</button>
              {suggestion && <div className="p-3 border rounded bg-slate-50"><p>{suggestion}</p><button type="button" className="underline mt-2" onClick={() => { setSubhead(suggestion); setSuggestion(''); }}>Use suggestion in draft</button></div>}
            </div>}

            <label className="block space-y-1 text-xs font-semibold">
              <span>Deck / Subhead</span>
              <input value={subhead} onChange={e => setSubhead(e.target.value)} className="w-full p-2 rounded border border-slate-300" />
            </label>

            <label className="block space-y-1 text-xs font-semibold">
              <span>Pull Quote (Optional)</span>
              <input value={pullQuote} onChange={e => setPullQuote(e.target.value)} className="w-full p-2 rounded border border-slate-300" />
            </label>

            <label className="block space-y-1 text-xs font-semibold">
              <span>Body Copy</span>
              <textarea rows={4} value={body} onChange={e => setBody(e.target.value)} className="w-full p-2 rounded border border-slate-300" />
            </label>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="space-y-1 font-semibold">
                <span>Visual Asset Slot</span>
                <select value={selectedAssetId} onChange={e => setSelectedAssetId(e.target.value)} className="w-full p-2 rounded border border-slate-300 bg-white">
                  <option value="">Typographic / Brand Ornament Fallback</option>
                  {allAssets.map(a => (
                    <option key={a.id} value={a.id}>{a.caption}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 font-semibold">
                <span>Upload Original Image (/api/media)</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={e => {
                    void handleUploadAsset(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                  className="w-full p-1.5 rounded border border-slate-300 bg-slate-50"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {tier === 'promo' && <label className="text-xs">Promotion budget (game credits)<select value={adSpend} onChange={e => setAdSpend(Number(e.target.value))} className="border rounded p-2 ml-2">{[0,10,25,50].map(n => <option key={n} value={n}>{n} credits</option>)}</select></label>}
              <button
                type="button"
                onClick={handlePublishPlayerWork}
                className="px-4 py-2 rounded-lg bg-[#48293D] text-white text-xs font-bold border border-[#C6AE73] cursor-pointer"
              >
                {channel === 'newspaper' && <Newspaper size={13} className="inline mr-1" />}
                {channel === 'magazine' && <BookOpen size={13} className="inline mr-1" />}
                {channel === 'social' && <Share2 size={13} className="inline mr-1" />}
                {channel === 'document' && <FileText size={13} className="inline mr-1" />}
                Publish to {channel.toUpperCase()}
              </button>
              {perms.isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    const saved = saveCreatorDraft(
                      {
                        title: headline,
                        summary: subhead || body.slice(0, 140),
                        category: channel === 'social' ? 'social_campaign' : 'publication_article',
                        payload: {
                          eventCategory: 'civic',
                          institution: BRAND_KITS[brandKitId]?.name || 'Creative Studio',
                          mediaArtifact: previewArtifact,
                        },
                      },
                      actorOverride,
                    );
                    setAdminRefresh(n => n + 1);
                    setNotice(saved.message);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-amber-100 text-amber-950 text-xs font-bold border border-amber-400 cursor-pointer"
                >
                  Stage in Admin Canon Drafts
                </button>
              )}
            </div>
          </section>

          <section className="lg:col-span-6 space-y-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#464C55]">2. Live Accessible DOM & Brand Token Preview</h2>
            <MediaTemplateRenderer artifact={previewArtifact} density="spacious" />
          </section>
        </div>
      )}

      {/* TAB 2: WORLD ASSET LIBRARY */}
      {tab === 'library' && (
        <section className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-[#141214]">Authoritative World Asset Library</h2>
              <p className="text-xs text-slate-600">Select any canonical entity to link into your active studio composition without duplicating records.</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(['people', 'places', 'organizations', 'objects', 'history'] as WorldDomain[]).map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setActiveDomain(d)}
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase cursor-pointer border ${activeDomain === d ? 'bg-[#506F8A] text-white border-[#506F8A]' : 'bg-slate-100 text-slate-700 border-slate-300'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {domainEntities.slice(0, 36).map(ent => (
              <article key={ent.id} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/70 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-sm text-[#141214]">{ent.name}</strong>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200">{ent.id}</span>
                </div>
                <div className="text-[11px] font-semibold text-[#506F8A]">{ent.subtitle}</div>
                <p className="text-xs text-slate-600 line-clamp-2">{ent.description}</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedEntityId(ent.id);
                    setTab('composer');
                    setNotice(`Linked canonical ${ent.domain} record "${ent.name}" [${ent.id}] into active template.`);
                  }}
                  className="text-[11px] font-bold text-[#48293D] underline cursor-pointer"
                >
                  Use in Composer →
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* TAB 3: BRAND KITS & 5 COLOR REFERENCE COLLECTIONS */}
      {tab === 'palettes' && (
        <section className="bg-white p-5 rounded-xl border border-slate-200 space-y-5">
          <h2 className="text-base font-bold text-[#141214]">Approved Miraverse Color Collections & Brand Systems</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(COLOR_PALETTES).map(([key, pal]) => (
              <div key={key} className="p-4 rounded-xl border border-slate-200 space-y-2.5">
                <strong className="text-sm">{pal.name}</strong>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(pal.swatches).map(([swatchName, hex]) => (
                    <button
                      key={swatchName}
                      type="button"
                      onClick={() => {
                        setAccentOverride(hex);
                        setTab('composer');
                        setNotice(`Applied ${pal.name} swatch ${swatchName} (${hex}) as accent override.`);
                      }}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs cursor-pointer"
                    >
                      <span style={{ width: 16, height: 16, borderRadius: 4, background: hex, border: '1px solid rgba(0,0,0,0.2)' }} />
                      <span>{swatchName}</span>
                      <code className="text-[10px] text-slate-500">{hex}</code>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 4: ADMIN CREATOR STUDIO CONSOLE (Extends CreatorStudioState) */}
      {tab === 'admin' && perms.isAdmin && (
        <section className="bg-white p-5 rounded-xl border-2 border-amber-400 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <span className="text-[11px] font-mono font-bold uppercase text-amber-800">World Administrator Authority</span>
              <h2 className="text-lg font-bold">Admin Canon, World Pause & Checkpoint Console</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {pauseInfo.isPaused ? (
                <button
                  type="button"
                  onClick={() => {
                    const res = resumeWorld(actorOverride);
                    setAdminRefresh(n => n + 1);
                    setNotice(res.message);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  <Play size={13} className="inline mr-1" /> Resume World Simulation
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const res = pauseWorld('Canon issue & asset review in Creative Studio', actorOverride);
                    setAdminRefresh(n => n + 1);
                    setNotice(res.message);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold cursor-pointer"
                >
                  <Pause size={13} className="inline mr-1" /> Pause World Simulation
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const cp = captureWorldCheckpoint(`Manual Studio Snapshot · Cycle ${cycle}`, actorOverride);
                  setAdminRefresh(n => n + 1);
                  setNotice(cp.message);
                }}
                className="px-3 py-1.5 rounded-lg bg-indigo-700 text-white text-xs font-bold cursor-pointer"
              >
                + Capture Pre-Publish Checkpoint
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <h3 className="font-bold uppercase tracking-wider text-slate-600">Staged Canon Drafts ({adminDrafts.length})</h3>
              {adminDrafts.map(d => (
                <div key={d.id} className="p-3 rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                  <div>
                    <strong>{d.title}</strong>
                    <div className="text-[11px] text-slate-500">{d.category} · {d.status} · v{d.version}</div>
                  </div>
                  {d.status !== 'published' && (
                    <button
                      type="button"
                      onClick={() => {
                        const pub = publishCreatorDraft(d.id, actorOverride);
                        if (pub.ok) void useOSStore.persist.rehydrate();
                        setAdminRefresh(n => n + 1);
                        setNotice(pub.message);
                      }}
                      className="px-2.5 py-1 rounded bg-[#48293D] text-white font-bold cursor-pointer"
                    >
                      Validate & Publish Canon
                    </button>
                  )}
                </div>
              ))}
              {!adminDrafts.length && <p className="text-slate-500">Stage a template or issue from the Composer tab to review and seal it here.</p>}
            </div>

            <div className="space-y-2">
              <h3 className="font-bold uppercase tracking-wider text-slate-600">World Checkpoints ({checkpoints.length}) & Published Canon ({publishedHistory.length})</h3>
              {checkpoints.slice(0, 5).map(cp => (
                <div key={cp.id} className="p-3 rounded-lg border border-slate-200 flex items-center justify-between gap-2">
                  <div>
                    <strong>{cp.label}</strong>
                    <div className="text-[11px] text-slate-500">{cp.reason} · {cp.createdAt.slice(0, 19)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await restoreWorldCheckpoint(cp.id, actorOverride);
                      if (res.ok) await useOSStore.persist.rehydrate();
                      setAdminRefresh(n => n + 1);
                      setNotice(res.message);
                    }}
                    className="px-2.5 py-1 rounded bg-slate-100 border border-slate-300 font-bold cursor-pointer"
                  >
                    <RotateCcw size={11} className="inline mr-1" /> Restore
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
