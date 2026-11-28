import { hasCreatorAccess } from '../gameplay/localCredentials';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Sparkles, Shield, Layers, Upload, CheckCircle2, Pause, Play,
  RotateCcw, BookOpen, Newspaper, Share2, FileText, Database, Music, Award, Radio, Ticket
} from 'lucide-react';
import { useOSStore } from '../store/useOSStore';
import {
  ENTERTAINMENT_DISCIPLINES,
  FAME_AXES,
  SHIPPED_AUDIO_ASSETS,
  VENUE_CATALOG,
  computeCommunityReception,
  restoreEntertainmentState,
  type EntertainmentDisciplineId,
} from '../gameplay/EntertainmentEcosystem';
import { SongbirdAudioPlayer } from '../components/media/SongbirdAudioPlayer';
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
  STYLE_VARIANTS_BY_TEMPLATE,
  validateMediaArtifactInput,
  type MediaChannel,
  type PublishedMediaArtifact,
  type VerificationTier,
} from '../components/media/templateModel';
import { MediaTemplateRenderer } from '../components/media/MediaTemplateRenderer';
import { useWorldMedia } from '../components/media/useWorldMedia';
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
import { ornamentFor } from '../data/designAssets';
import {
  evaluateCreativeStudioPermissions,
  validateStudioPublishPermission,
  type CreativeStudioPermissions,
} from '../gameplay/creativeStudioModel';
export { evaluateCreativeStudioPermissions, validateStudioPublishPermission, type CreativeStudioPermissions };

export default function CreativeStudioApp() {
  useWorldMedia();
  const gameplay = useOSStore(s => s.gameplay);
  const player = gameplay.player;
  const publicSources = useMemo(() => publicEditorialSources(gameplay), [gameplay]);
  const [sourceEventId, setSourceEventId] = useState('');
  const [polishBusy, setPolishBusy] = useState(false);
  const [suggestion, setSuggestion] = useState('');
  const cycle = useOSStore(s => s.gameplay.timeCycleCount ?? 28);
  const isLoggedIn = useOSStore(s => s.isLoggedIn);
  const perms = useMemo(() => evaluateCreativeStudioPermissions(player, isLoggedIn), [player, isLoggedIn]);

  const [tab, setTab] = useState<'composer' | 'entertainment' | 'library' | 'palettes' | 'dynamic' | 'admin'>('composer');
  const workspaceReq = useOSStore(s => s.workspaceRequests.creativeStudio);
  useEffect(() => {
    if (!workspaceReq) return;
    if (workspaceReq.section === 'entertainment') setTab('entertainment');
    else if (workspaceReq.section === 'admin' && hasCreatorAccess(player)) setTab('admin');
    useOSStore.getState().consumeWorkspaceRequest('creativeStudio', workspaceReq.revision);
  }, [workspaceReq]);

  const ent = useMemo(() => restoreEntertainmentState(gameplay.entertainment, cycle), [gameplay.entertainment, cycle]);
  const playerArtist = useMemo(
    () => (ent.playerArtistId ? ent.artists.find(a => a.artistId === ent.playerArtistId) : undefined),
    [ent],
  );
  const [stageNameDraft, setStageNameDraft] = useState(playerArtist?.stageName || player?.name || 'Nova Lyric');
  const [bioDraft, setBioDraft] = useState(playerArtist?.bio || 'Independent Aureline performer & studio creator.');
  const [selectedDiscs, setSelectedDiscs] = useState<EntertainmentDisciplineId[]>(playerArtist?.disciplines || ['music']);
  const [privacyDraft, setPrivacyDraft] = useState<'open' | 'guarded' | 'strict'>(playerArtist?.privacyBoundary || 'guarded');
  const [statusDraft, setStatusDraft] = useState<'active' | 'hiatus' | 'retired' | 'comeback'>(playerArtist?.careerStatus || 'active');
  const [prjTitle, setPrjTitle] = useState('Midnight Over Glassline');
  const [prjKind, setPrjKind] = useState<'single' | 'album' | 'film' | 'series' | 'choreography' | 'stage_play' | 'fashion_campaign' | 'promo_kit'>('single');
  const [prjDisc, setPrjDisc] = useState<EntertainmentDisciplineId>('music');
  const [prjAudio, setPrjAudio] = useState<string>(SHIPPED_AUDIO_ASSETS[0].audioUrl);
  const [prjCollab, setPrjCollab] = useState<string>('ART-AELITA');
  const [prjBudget, setPrjBudget] = useState<number>(80);
  const [venueIdDraft, setVenueIdDraft] = useState<string>('ORG_LOOKING_GLASS');
  const [ticketPriceDraft, setTicketPriceDraft] = useState<number>(20);
  const [adSpend, setAdSpend] = useState(0);
  const [channel, setChannel] = useState<MediaChannel>('social');
  const templates = useMemo(() => MEDIA_TEMPLATES.filter(t => t.channel === channel), [channel]);
  const [templateId, setTemplateId] = useState<string>('tpl-social-article-promo');
  const [styleVariant, setStyleVariant] = useState<string>('');
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
      ...(styleVariant ? { styleVariant } : {}),
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
    [templates, templateId, styleVariant, brandKitId, channel, perms, tier, kicker, headline, subhead, pullQuote, body, cycle, selectedAssetId, selectedEntityId, accentOverride, player?.name],
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
        setNotice(res.persisted ? 'Image saved in the media library with its provenance.' : 'Image available for this session. The media host is offline; this image will need to be uploaded again after a reload.');
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
  const actorOverride = { isLoggedIn, isAdmin: hasCreatorAccess(player), name: player?.name || 'World Administrator' };

  const allAssets = listAllMediaAssets(perms.isAdmin);
  const domainEntities = useMemo(() => listWorldLibraryByDomain(activeDomain), [activeDomain]);

  return (
    <div className="h-full w-full overflow-auto bg-[#F8F9FC] text-[#141214] p-5 space-y-5">
      {/* Studio Header */}
      <header className="bg-[#48293D] text-white p-4 rounded-xl border-2 border-[#C6AE73] flex flex-wrap items-center justify-between gap-4">
        <div>
          <img className="app-ornament app-ornament--masthead" src={ornamentFor('creativeStudio')} alt="" aria-hidden="true" style={{ marginBottom: 6 }} />
          <div className="text-[11px] font-mono tracking-widest uppercase text-[#D8C0CB] flex items-center gap-2">
            <Sparkles size={13} />
            <span>MIRAVERSE CREATIVE & EDITORIAL STUDIO</span>
          </div>
          <h1 className="text-2xl font-bold mt-0.5" style={{ fontFamily: 'var(--font-editorial-masthead)', color: '#FFFFFF' }}>
            Miraverse Creative Studio
          </h1>
          <p className="text-xs text-[#EAD8E0] mt-0.5">{perms.roleSummary}</p>
        </div>
        <nav className="flex flex-wrap gap-2" aria-label="Creative Studio Workspaces">
          <button type="button" onClick={() => setTab('composer')} className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${tab === 'composer' ? 'bg-[#C6AE73] text-[#241620] border-[#C6AE73]' : 'bg-[#45304D] text-white border-[#D8C0CB]/40'}`}>
            <Layers size={13} className="inline mr-1" /> Template Composer
          </button>
          <button type="button" onClick={() => setTab('entertainment')} className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer border ${tab === 'entertainment' ? 'bg-[#C6AE73] text-[#241620] border-[#C6AE73]' : 'bg-[#45304D] text-white border-[#D8C0CB]/40'}`}>
            <Music size={13} className="inline mr-1" /> Entertainment & Releases
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
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#464C55]">1. Channel, style & content</h2>
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
                  <option value="document">Fylo Editable Manuscript (.doc)</option>
                </select>
              </label>
              <label className="space-y-1 font-semibold">
                <span>Reusable Template</span>
                <select
                  value={previewArtifact.templateId}
                  onChange={e => {
                    setTemplateId(e.target.value);
                    setStyleVariant('');
                  }}
                  className="w-full p-2 rounded border border-slate-300 bg-white"
                >
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </label>
            </div>

            {(STYLE_VARIANTS_BY_TEMPLATE[previewArtifact.templateId] || []).length > 0 && (
              <label className="block space-y-1 text-xs font-semibold">
                <span>Template Style Variant</span>
                <select
                  value={styleVariant}
                  onChange={e => setStyleVariant(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300 bg-white capitalize"
                >
                  <option value="">Default Layout Variant</option>
                  {(STYLE_VARIANTS_BY_TEMPLATE[previewArtifact.templateId] || []).map(v => (
                    <option key={v.id} value={v.id}>{v.label}</option>
                  ))}
                </select>
              </label>
            )}

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
                <span>Accent color</span>
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
                <span>Upload original image</span>
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
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#464C55]">2. Live preview</h2>
            <MediaTemplateRenderer artifact={previewArtifact} density="spacious" />
          </section>
        </div>
      )}

      {/* TAB 1B: ENTERTAINMENT & CELEBRITY PRODUCTION DESK */}
      {tab === 'entertainment' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <section className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-base font-bold text-[#141214]">1. Performer & Multi-Career Profile</h2>
                {playerArtist && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold">
                    Tier: {playerArtist.tier}
                  </span>
                )}
              </div>
              <label className="block text-xs font-semibold space-y-1">
                <span>Stage / Professional Name (2–60 chars)</span>
                <input value={stageNameDraft} onChange={e => setStageNameDraft(e.target.value)} className="w-full p-2 rounded border border-slate-300" />
              </label>
              <label className="block text-xs font-semibold space-y-1">
                <span>Public Bio & Artistic Direction</span>
                <textarea rows={2} value={bioDraft} onChange={e => setBioDraft(e.target.value)} className="w-full p-2 rounded border border-slate-300" />
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="font-semibold space-y-1">
                  <span>Privacy Boundary</span>
                  <select value={privacyDraft} onChange={e => setPrivacyDraft(e.target.value as any)} className="w-full p-2 rounded border border-slate-300 bg-white">
                    <option value="open">Open Public Access</option>
                    <option value="guarded">Guarded Personal Life</option>
                    <option value="strict">Strict Private Boundaries</option>
                  </select>
                </label>
                <label className="font-semibold space-y-1">
                  <span>Career Status</span>
                  <select value={statusDraft} onChange={e => setStatusDraft(e.target.value as any)} className="w-full p-2 rounded border border-slate-300 bg-white">
                    <option value="active">Active</option>
                    <option value="hiatus">Hiatus</option>
                    <option value="comeback">Comeback Campaign</option>
                    <option value="retired">Retired</option>
                  </select>
                </label>
              </div>
              <fieldset className="space-y-1.5">
                <legend className="text-xs font-semibold text-slate-700">Active Entertainment Disciplines (Multi-Career)</legend>
                <div className="flex flex-wrap gap-1.5">
                  {ENTERTAINMENT_DISCIPLINES.map(d => {
                    const active = selectedDiscs.includes(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() =>
                          setSelectedDiscs(prev =>
                            prev.includes(d.id) ? (prev.length > 1 ? prev.filter(x => x !== d.id) : prev) : [...prev, d.id],
                          )
                        }
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer border ${
                          active ? 'bg-[#48293D] text-white border-[#48293D]' : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        {d.label.split(',')[0]}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const res = useOSStore.getState().registerOrUpdateArtistProfile({
                      stageName: stageNameDraft,
                      bio: bioDraft,
                      disciplines: selectedDiscs,
                      privacyBoundary: privacyDraft,
                      careerStatus: statusDraft,
                    });
                    setNotice(res.message);
                  }}
                  className="px-4 py-2 rounded-lg bg-[#48293D] text-white text-xs font-bold border border-[#C6AE73] cursor-pointer"
                >
                  {playerArtist ? 'Update Performer Profile' : 'Register Performer Profile'}
                </button>
                {playerArtist && Math.floor(playerArtist.unclaimedPlayerRoyalties) > 0 && (
                  <button
                    type="button"
                    onClick={() => setNotice(useOSStore.getState().claimEntertainmentRoyalties().message)}
                    className="px-3.5 py-2 rounded-lg bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                  >
                    Claim {Math.floor(playerArtist.unclaimedPlayerRoyalties)} ₢ Royalties
                  </button>
                )}
              </div>

              {playerArtist && (
                <div className="pt-3 border-t border-slate-200 space-y-2 text-xs">
                  <strong className="block text-slate-800">8-Axis Fame & Community Reception</strong>
                  <div className="grid grid-cols-2 gap-1.5">
                    {FAME_AXES.map(axis => (
                      <div key={axis} className="p-2 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
                        <span className="capitalize text-[11px] text-slate-600">{axis.replace(/([A-Z])/g, ' $1')}</span>
                        <strong className="font-mono text-slate-900">{playerArtist[axis]}</strong>
                      </div>
                    ))}
                  </div>
                  {(() => {
                    const rec = computeCommunityReception(playerArtist);
                    return (
                      <div className="text-[11px] text-slate-600 font-mono pt-1">
                        Public {rec.generalPublic} · Critics {rec.criticsAndPeers} · Fans {rec.dedicatedFans} · Brands {rec.commercialBrands} · Local Scene {rec.localScene}
                      </div>
                    );
                  })()}
                </div>
              )}
            </section>

            <section className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 space-y-4">
              <h2 className="text-base font-bold text-[#141214]">2. Studio Production, Songbird Release & Live Venue Desk</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <label className="font-semibold space-y-1">
                  <span>Project / Track Title</span>
                  <input value={prjTitle} onChange={e => setPrjTitle(e.target.value)} className="w-full p-2 rounded border border-slate-300" />
                </label>
                <label className="font-semibold space-y-1">
                  <span>Format / Medium</span>
                  <select value={prjKind} onChange={e => setPrjKind(e.target.value as any)} className="w-full p-2 rounded border border-slate-300 bg-white">
                    <option value="single">Recorded Single</option>
                    <option value="album">Full-Length Album</option>
                    <option value="film">Mirrora Screen Feature</option>
                    <option value="series">Television Serial</option>
                    <option value="choreography">Dance Choreography</option>
                    <option value="stage_play">Marigold Stage Work</option>
                    <option value="fashion_campaign">Fashion Lookbook</option>
                    <option value="promo_kit">Press & Promo Kit</option>
                  </select>
                </label>
                <label className="font-semibold space-y-1">
                  <span>Discipline</span>
                  <select value={prjDisc} onChange={e => setPrjDisc(e.target.value as any)} className="w-full p-2 rounded border border-slate-300 bg-white">
                    {ENTERTAINMENT_DISCIPLINES.map(d => (
                      <option key={d.id} value={d.id}>{d.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <label className="font-semibold space-y-1">
                  <span>Master Audio Stem (Playable)</span>
                  <select value={prjAudio} onChange={e => setPrjAudio(e.target.value)} className="w-full p-2 rounded border border-slate-300 bg-white">
                    {SHIPPED_AUDIO_ASSETS.map(a => (
                      <option key={a.id} value={a.audioUrl}>{a.label}</option>
                    ))}
                  </select>
                </label>
                <label className="font-semibold space-y-1">
                  <span>NPC Collaborator</span>
                  <select value={prjCollab} onChange={e => setPrjCollab(e.target.value)} className="w-full p-2 rounded border border-slate-300 bg-white">
                    <option value="">Solo Credit</option>
                    {ent.artists.filter(a => a.origin === 'npc').map(a => (
                      <option key={a.artistId} value={a.artistId}>{a.stageName} ({a.genres[0]})</option>
                    ))}
                  </select>
                </label>
                <label className="font-semibold space-y-1">
                  <span>Production Budget (₢)</span>
                  <input type="number" min={0} max={2000} value={prjBudget} onChange={e => setPrjBudget(Number(e.target.value))} className="w-full p-2 rounded border border-slate-300" />
                </label>
              </div>
              <SongbirdAudioPlayer
                audioUrl={prjAudio}
                coverArtUrl={SHIPPED_AUDIO_ASSETS.find(a => a.audioUrl === prjAudio)?.coverArtUrl}
                title={prjTitle || 'Studio Stem Preview'}
                artistName={playerArtist?.stageName || stageNameDraft}
                compact
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setNotice(
                      useOSStore.getState().createEntertainmentProject({
                        title: prjTitle,
                        kind: prjKind,
                        discipline: prjDisc,
                        collaboratorArtistId: prjCollab || undefined,
                        budgetCredits: prjBudget,
                        audioUrl: prjAudio,
                      }).message,
                    )
                  }
                  className="px-3.5 py-2 rounded-lg bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                >
                  + Start Studio Project
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setNotice(
                      useOSStore.getState().publishEntertainmentRelease({
                        title: prjTitle,
                        format: prjKind === 'album' ? 'Album' : 'Single',
                        audioUrl: prjAudio,
                        coverArtUrl: SHIPPED_AUDIO_ASSETS.find(a => a.audioUrl === prjAudio)?.coverArtUrl,
                        collaboratorArtistId: prjCollab || undefined,
                      }).message,
                    )
                  }
                  className="px-3.5 py-2 rounded-lg bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  <Radio size={13} className="inline mr-1" /> Release Direct to Songbird
                </button>
                {(gameplay.publishedMediaArtifacts || []).length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const latest = gameplay.publishedMediaArtifacts[0];
                      setNotice(useOSStore.getState().linkPortfolioToEntertainment(latest.id).message);
                    }}
                    className="px-3.5 py-2 rounded-lg bg-slate-800 text-white text-xs font-bold cursor-pointer"
                  >
                    Attach Latest Studio Publication to Portfolio
                  </button>
                )}
              </div>

              {ent.projects.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200 text-xs">
                  <strong className="block text-slate-700">Active Projects ({ent.projects.length})</strong>
                  {ent.projects.slice(0, 4).map(p => (
                    <div key={p.projectId} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <strong>{p.title}</strong> <span className="text-slate-500">({p.kind} · {p.progress}% · Quality {p.quality}/100 · {p.masterOwnedByArtist ? 'Artist Master' : 'Label Master'})</span>
                      </div>
                      <div className="flex gap-1.5">
                        {p.status === 'in_production' && (
                          <button type="button" onClick={() => setNotice(useOSStore.getState().advanceEntertainmentProject(p.projectId).message)} className="px-2.5 py-1 rounded bg-indigo-600 text-white font-bold cursor-pointer">
                            Run Session (-10 Stamina)
                          </button>
                        )}
                        {p.status === 'completed' && (
                          <button type="button" onClick={() => setNotice(useOSStore.getState().publishEntertainmentRelease({ projectId: p.projectId, title: p.title, audioUrl: p.audioUrl }).message)} className="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold cursor-pointer">
                            Publish to Songbird
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 space-y-2.5 text-xs">
                <strong className="block text-slate-800"><Ticket size={13} className="inline mr-1" /> Quick Venue Booking & Celebrity portals</strong>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <select value={venueIdDraft} onChange={e => setVenueIdDraft(e.target.value)} className="p-2 rounded border border-slate-300 bg-white">
                    {VENUE_CATALOG.map(v => (
                      <option key={v.orgId} value={v.orgId}>{v.name} ({v.capacity.toLocaleString()} cap · Hold {v.rentalCost} ₢)</option>
                    ))}
                  </select>
                  <input type="number" min={5} max={500} value={ticketPriceDraft} onChange={e => setTicketPriceDraft(Number(e.target.value))} className="p-2 rounded border border-slate-300" aria-label="Ticket price in credits" />
                  <button
                    type="button"
                    onClick={() => setNotice(useOSStore.getState().bookEntertainmentVenue({ venueOrgId: venueIdDraft, ticketPrice: ticketPriceDraft }).message)}
                    className="px-3 py-2 rounded-lg bg-[#48293D] text-white font-bold cursor-pointer"
                  >
                    Book Live Performance
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {[
                    ['Songbird Streaming', 'https://songbird.mer'],
                    ['Pop Sticker Radio', 'https://popsticker.mer'],
                    ['Limelight Magazine', 'https://limelight.mer'],
                    ['Starstruck', 'https://starstruck.mer'],
                    ['Marlie Records', 'https://marlierecords.mer'],
                    ['Open Call Casting', 'https://opencallcasting.mer'],
                    ['Word of Mouth PR', 'https://wordofmouth.mer'],
                    ['Radiance Awards', 'https://radianceawards.mer'],
                  ].map(([label, href]) => (
                    <button
                      key={href}
                      type="button"
                      onClick={() => useOSStore.getState().openAppWorkspace('browser', href)}
                      className="px-2.5 py-1 rounded border border-slate-300 bg-slate-50 hover:bg-slate-100 font-semibold cursor-pointer"
                    >
                      {label} ↗
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>
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

      {/* TAB 3: BRAND KITS, 8 UNIVERSAL DESIGN FAMILIES & STYLE GUIDES */}
      {tab === 'palettes' && (
        <section className="bg-white p-5 rounded-xl border border-slate-200 space-y-6">
          <div className="space-y-3">
            <div>
              <h2 className="text-base font-bold text-[#141214]">8 Universal Creative Asset Design Families</h2>
              <p className="text-xs text-slate-600">
                Apply any canonical design family in one click to restyle your Composer canvas, brand typography, and palette tokens.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {Object.values(BRAND_KITS)
                .filter(k => k.id.startsWith('family-'))
                .map(kit => (
                  <article
                    key={kit.id}
                    className="p-3.5 rounded-xl border flex flex-col justify-between gap-2.5"
                    style={{
                      background: kit.tokens.bgSurface,
                      color: kit.tokens.textPrimary,
                      borderColor: kit.tokens.borderOrnament,
                    }}
                  >
                    <div className="space-y-1">
                      <strong className="text-sm block" style={{ fontFamily: kit.tokens.fontDisplay }}>
                        {kit.name}
                      </strong>
                      <p className="text-[11px] opacity-85" style={{ color: kit.tokens.textSecondary }}>
                        {kit.tokens.fontDisplay.split(',')[0]} · {kit.tokens.fontBody.split(',')[0]}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1">
                        {[kit.tokens.bgSurface, kit.tokens.bgSecondary, kit.tokens.accentPrimary, kit.tokens.accentSecondary].map((hex, i) => (
                          <span
                            key={`${kit.id}-${i}`}
                            title={hex}
                            style={{ width: 14, height: 14, borderRadius: 4, background: hex, border: '1px solid rgba(0,0,0,0.22)' }}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setBrandKitId(kit.id);
                          setAccentOverride('');
                          setTab('composer');
                          setNotice(`Applied Design Family "${kit.name}" to Composer.`);
                        }}
                        className="px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer"
                        style={{ background: kit.tokens.accentPrimary, color: kit.tokens.textInverse }}
                      >
                        Apply Family
                      </button>
                    </div>
                  </article>
                ))}
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-200">
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
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-200">
            <div>
              <h2 className="text-base font-bold text-[#141214]">Reference Style Guides & Visual Template Sheets (7)</h2>
              <p className="text-xs text-slate-600">
                Canonical Miraverse brand identity and creative layout specifications registered in the Media Manifest.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allAssets
                .filter(a => a.slotRole === 'media.styleguide')
                .map(guide => (
                  <figure key={guide.id} className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 flex flex-col">
                    <img
                      src={guide.src}
                      alt={guide.caption}
                      loading="lazy"
                      className="w-full aspect-video object-cover border-b border-slate-200 bg-white"
                    />
                    <figcaption className="p-3 text-xs space-y-1.5 flex-1 flex flex-col justify-between">
                      <div>
                        <strong className="block text-[#141214]">{guide.caption}</strong>
                        <code className="text-[10px] text-slate-500">{guide.id}</code>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAssetId(guide.id);
                          setTab('composer');
                          setNotice(`Loaded style guide "${guide.caption}" into active Composer visual slot.`);
                        }}
                        className="self-start text-[11px] font-bold text-[#48293D] underline cursor-pointer"
                      >
                        Use in Composer →
                      </button>
                    </figcaption>
                  </figure>
                ))}
            </div>
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
