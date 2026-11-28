import React, { lazy, Suspense, useEffect, useState } from 'react';
import { canSee, canSeeRecord, PEOPLE, type Audience, type Post } from './socialModel';
import { useSocial, MusicPlayer, SocialImage } from './SocialContext';
import { Comments } from './ProfileCanvas';
import { sanitizeMailHtml, escapeMailText, mailHtmlToText } from '../mail/richText';
import { storeMedia, removeMedia } from './socialMedia';
import { useCommsStore } from '../../store/useCommsStore';
import SortableList from '../../components/ui/SortableList';
import { MediaTemplateRenderer } from '../../components/media/MediaTemplateRenderer';
import { listTemplatesByChannel, type PublishedMediaArtifact } from '../../components/media/templateModel';
import { BRAND_KITS, WORLD_PLACES } from '../../game-content/worldAssetLibrary';
import {
  ACCOUNT_FAMILY_LABELS,
  OFFICIAL_SOCIAL_ACCOUNTS,
  STARTER_SOCIAL_STORIES,
  type SocialAccountFamily,
  type SocialStoryItem,
} from './socialAccountsAndFeed';
import { useOSStore } from '../../store/useOSStore';
import {
  fetchLiveNpcSocialFeed,
  toggleLiveNpcPostLike,
  commentOnLiveNpcPost,
  type LiveNpcSocialPost,
  type NeighborhoodPulseEntry,
} from './livingWorldSocialClient';
const RichTextEditor = lazy(() => import('../../components/editor/RichTextEditor'));
export function AudienceSelect({ value, onChange, includeGroup = false }: { value: Audience; onChange: (v: Audience) => void; includeGroup?: boolean }) { return <label>Audience<select value={value} onChange={e => onChange(e.target.value as Audience)}><option value="public">Public</option><option value="friends">Friends</option><option value="private">Only me</option>{includeGroup && <option value="group">Group members</option>}</select></label>; }
export function PersonLink({ id }: { id: string }) { const { visit, player } = useSocial(); return <button className="ms-person-link" onClick={() => visit(id)}>{id === 'you' ? player.maiSpaceProfile?.handle || player.name : PEOPLE.find(p => p.id === id)?.name || 'Citizen'}</button>; }

export function PostCard({ post, onEdit }: { post: Post; onEdit?: (p: Post) => void }) {
  const { social, act } = useSocial();
  if (!canSee(social, post.author, post.audience)) return null;
  return <article className="ms-post ms-card"><header><PersonLink id={post.author}/><small>{post.kind} · Cycle {post.cycle} · {post.draft ? 'Draft — only you' : post.audience}</small></header><h2>{post.title}</h2><div className="ms-prose" dangerouslySetInnerHTML={{ __html: sanitizeMailHtml(post.html) }}/><div className="ms-post-photos">{(post.media || []).map(id => <SocialImage key={id} asset={id} alt={post.title}/>)}</div><div className="ms-actions">{!post.draft && <button aria-pressed={post.likes.includes('you')} onClick={() => act({ type: 'like', id: post.id })}>♡ {post.likes.length} {post.likes.length === 1 ? 'like' : 'likes'}</button>}{post.author === 'you' && <>{onEdit && <button onClick={() => onEdit(post)}>Edit</button>}<button onClick={() => act({ type: 'delete-post', id: post.id })}>Delete post</button></>}</div>{!post.draft && <details><summary>Comments</summary><Comments target={post.id}/></details>}</article>;
}
export function Writing({ kind, selected = '' }: { kind: 'blog' | 'bulletin'; selected?: string }) {
  const { social, act } = useSocial();
  const [media, setMedia] = useState<string[]>([]);
  const [id, setId] = useState(''), [title, setTitle] = useState(''), [html, setHtml] = useState(''), [text, setText] = useState(''), [aud, setAud] = useState<Audience>('friends');
  const edit = (p: Post) => { setId(p.id); setTitle(p.title); setHtml(p.html); setText(''); setAud(p.audience); setMedia(p.media || []); };
  const entries = social.posts.filter(p => (!selected || p.id === selected) && p.kind === kind && (p.author === 'you' || !p.draft) && canSee(social, p.author, p.audience));
  const submit = (draft: boolean) => { if (act({ type: 'post', id, title, html, kind, audience: aud, draft, media })) { setId(''); setTitle(''); setHtml(''); setText(''); setMedia([]); } };
  return <div className="ms-content-width"><div className="ms-section-heading"><div><span className="ms-eyebrow">A PLACE FOR YOUR WORDS</span><h1>{kind === 'blog' ? 'The Journal' : 'Bulletin board'}</h1><p>{kind === 'blog' ? 'Long thoughts, small stories, and things worth keeping.' : 'Announcements, invitations, and what is happening lately.'}</p></div></div>{!selected && <section className="ms-card ms-compose"><h2>{id ? 'Edit your entry' : kind === 'blog' ? 'Start a new page' : 'Leave a bulletin'}</h2><label>Title<input value={title} onChange={e => setTitle(e.target.value)} maxLength={180}/></label>{kind === 'blog' ? <Suspense fallback={<p>Opening editor…</p>}><RichTextEditor label="Blog entry" value={html} onChange={setHtml}/></Suspense> : <textarea aria-label="Bulletin text" maxLength={2000} value={mailHtmlToText(html)} onChange={e => { setText(e.target.value); setHtml(escapeMailText(e.target.value)); }} placeholder="What would you like to share?"/>}{kind === 'blog' && <fieldset><legend>Photographs from my media shelf</legend>{social.assets.filter(a => a.type.startsWith('image/')).map(a => <label key={a.id}><input type="checkbox" checked={media.includes(a.id)} disabled={!media.includes(a.id) && media.length >= 8} onChange={e => setMedia(e.target.checked ? [...media, a.id] : media.filter(id => id !== a.id))}/>{a.name}</label>)}{!social.assets.some(a => a.type.startsWith('image/')) && <small>Upload images through Profile Studio to attach photographs here.</small>}</fieldset>}<AudienceSelect value={aud} onChange={setAud}/><div className="ms-actions"><button className="ms-primary" onClick={() => submit(false)}>Publish {kind}</button><button onClick={() => submit(true)}>Save draft</button>{id && <button onClick={() => { setId(''); setHtml(''); setTitle(''); }}>Cancel edit</button>}</div><small>Publishing is social, not a source of currency or relationship points. Save a draft before leaving.</small></section>}{entries.map(p => <PostCard key={p.id} post={p} onEdit={selected ? undefined : edit}/>)}{!entries.length && <p className="ms-empty">Nothing here yet. A blank page is a good beginning.</p>}</div>;
}
export function TemplateFeedPostCard({ artifact }: { artifact: PublishedMediaArtifact }) {
  const { social, act, visit, player, cycle } = useSocial();
  const official = OFFICIAL_SOCIAL_ACCOUNTS.find(a => a.id === artifact.authorId);
  const person = PEOPLE.find(p => p.id === artifact.authorId);
  const family: SocialAccountFamily = official ? official.family : 'personal';
  const likes = social.templateLikes?.[artifact.id] || [];
  const chosenPoll = social.pollSelections?.[artifact.id] ?? null;
  const pollVotes: Record<number, number> = {};
  if (Array.isArray(artifact.slotValues.pollOptions)) {
    artifact.slotValues.pollOptions.forEach((_, idx) => {
      pollVotes[idx] = (idx === 0 ? 5 : idx === 1 ? 3 : 2) + (chosenPoll === idx ? 1 : 0);
    });
  }

  const citeSocialLead = () => {
    const store = useOSStore.getState();
    const targetMission =
      store.gameplay?.player?.assignmentJournal?.selectedId ||
      Object.keys(store.gameplay?.player?.worknetOrders || {})[0] ||
      'ms-case-002';
    store.citeInstitutionalEvidence({
      missionId: targetMission,
      sourceSystem: 'maispace-public-lead',
      recordId: `MS-${artifact.id.slice(-12).toUpperCase()}`,
      title: `[MAI.SPACE] ${artifact.slotValues.headline}`,
      referenceCode: `MS-C${artifact.publishedCycle}`,
      custodian: `MAI.SPACE Public Post · ${artifact.authorName} (${ACCOUNT_FAMILY_LABELS[family]})`,
      citationText: `MAI.SPACE (${artifact.authorName}, Cycle ${artifact.publishedCycle}): "${artifact.slotValues.headline}" — Cited as social context/timestamp lead, not standalone forensic proof.`,
      excerpt: artifact.slotValues.subhead || artifact.slotValues.body || artifact.slotValues.headline,
      certified: false,
    });
  };

  return (
    <article className="ms-post ms-card" style={{ display: 'grid', gap: '0.75rem' }}>
      {/* Separated Platform UI Chrome (distinct from the graphic template asset below) */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <span
            aria-hidden="true"
            style={{
              width: 34,
              height: 34,
              borderRadius: '9999px',
              background: '#48293D',
              color: '#FFFFFF',
              display: 'grid',
              placeItems: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
              border: '1.5px solid #C6AE73',
            }}
          >
            {official ? official.avatarMonogram : person ? person.icon : '✦'}
          </span>
          <div>
            {person || artifact.authorId === 'you' ? (
              <PersonLink id={artifact.authorId} />
            ) : (
              <strong style={{ fontSize: '0.92rem' }}>{official?.name || artifact.authorName}</strong>
            )}
            <small style={{ display: 'block' }}>
              @{official?.handle || person?.handle || player.maiSpaceProfile?.handle || 'citizen'} ·{' '}
              <strong>{ACCOUNT_FAMILY_LABELS[family]}</strong> · Cycle {artifact.publishedCycle || cycle}
            </small>
          </div>
        </div>
        {official && (
          <button
            type="button"
            onClick={() => act({ type: 'follow-account', accountId: official.id })}
            aria-pressed={(social.followedAccounts || []).includes(official.id)}
          >
            {(social.followedAccounts || []).includes(official.id) ? 'Following ✓' : '+ Follow Page'}
          </button>
        )}
      </header>

      {/* Reusable Graphic Template Slot */}
      <MediaTemplateRenderer
        artifact={artifact}
        density="compact"
        pollVotes={pollVotes}
        selectedPollIndex={chosenPoll}
        onVotePoll={idx => act({ type: 'vote-poll', id: artifact.id, optionIndex: idx })}
      />

      {/* Platform Engagement Bar & Threaded Comments */}
      <div className="ms-actions">
        <button
          type="button"
          aria-pressed={likes.includes('you')}
          onClick={() => act({ type: 'like-template-post', id: artifact.id })}
        >
          ♡ {likes.length} {likes.length === 1 ? 'like' : 'likes'}
        </button>
        <button type="button" onClick={citeSocialLead}>
          Cite / Clip Lead
        </button>
        {official?.id === 'acct:themeridian' && (
          <button type="button" onClick={() => useOSStore.getState().openAppWorkspace('browser', 'https://meridian.mer')}>
            Open meridian.mer →
          </button>
        )}
        {official?.id === 'acct:thesocialregister' && (
          <button type="button" onClick={() => useOSStore.getState().openAppWorkspace('browser', 'https://socialregister.mer')}>
            Open socialregister.mer →
          </button>
        )}
      </div>
      <details>
        <summary>Comments ({social.comments.filter(c => c.target === artifact.id).length})</summary>
        <Comments target={artifact.id} />
      </details>
    </article>
  );
}

export function OfficialAccountsDirectory() {
  const { social, act } = useSocial();
  const [familyFilter, setFamilyFilter] = useState<string>('all');
  const families: ('all' | Exclude<SocialAccountFamily, 'personal'>)[] = ['all', 'media', 'royal', 'institutional', 'creator', 'business'];
  const accounts = OFFICIAL_SOCIAL_ACCOUNTS.filter(a => familyFilter === 'all' || a.family === familyFilter);

  return (
    <div className="ms-content-width">
      <div className="ms-section-heading">
        <div>
          <span className="ms-eyebrow">ACROSS THE EIGHT REALMS</span>
          <h1>Official Pages & Account Families</h1>
          <p>Follow publications, royal chanceries, universities, cultural creators, and ateliers alongside your personal friend circle.</p>
        </div>
      </div>

      <div className="ms-actions" style={{ marginBottom: '1rem', flexWrap: 'wrap' }}>
        {families.map(f => (
          <button key={f} type="button" aria-pressed={familyFilter === f} onClick={() => setFamilyFilter(f)}>
            {f === 'all' ? 'All Account Families' : ACCOUNT_FAMILY_LABELS[f]}
          </button>
        ))}
      </div>

      <div className="ms-people-grid">
        {accounts.map(acct => {
          const following = (social.followedAccounts || []).includes(acct.id);
          return (
            <article key={acct.id} className="ms-card" style={{ display: 'grid', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '9999px',
                    background: '#48293D',
                    color: '#FFFFFF',
                    border: '1.5px solid #C6AE73',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 700,
                  }}
                >
                  {acct.avatarMonogram}
                </span>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{acct.name}</h2>
                  <small>@{acct.handle} · {ACCOUNT_FAMILY_LABELS[acct.family]}</small>
                </div>
              </div>
              <small style={{ color: '#506F8A', fontWeight: 700 }}>✦ {acct.verifiedLabel} · {acct.location}</small>
              <p style={{ margin: 0 }}>{acct.bio}</p>
              <div className="ms-actions">
                <button
                  type="button"
                  className={following ? '' : 'ms-primary'}
                  aria-pressed={following}
                  onClick={() => act({ type: 'follow-account', accountId: acct.id })}
                >
                  {following ? 'Following ✓' : '+ Follow Account'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function HomeFeed() {
  const { social, go, act, player } = useSocial();
  const [filter, setFilter] = useState('all');
  const [realmFilter, setRealmFilter] = useState('');
  const [activeStory, setActiveStory] = useState<SocialStoryItem | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const socialTemplates = listTemplatesByChannel('social');
  const [tplId, setTplId] = useState(socialTemplates[0]?.id || 'tpl-social-personal-photo');
  const [brandKitId, setBrandKitId] = useState('unbranded-editorial');
  const [kicker, setKicker] = useState('AURELINE DISPATCH');
  const [headline, setHeadline] = useState('');
  const [subhead, setSubhead] = useState('');
  const [entityId, setEntityId] = useState('REG_ORYNVELL');

  // Autonomous Living World NPC feed state
  const [liveRunId, setLiveRunId] = useState('');
  const [livePosts, setLivePosts] = useState<LiveNpcSocialPost[]>([]);
  const [livePulse, setLivePulse] = useState<NeighborhoodPulseEntry[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  const refreshLiveFeed = async () => {
    setLiveLoading(true);
    const data = await fetchLiveNpcSocialFeed(realmFilter || undefined);
    if (data) {
      setLiveRunId(data.runId);
      setLivePosts(data.posts || []);
      setLivePulse(data.pulse || []);
    }
    setLiveLoading(false);
  };

  useEffect(() => {
    void refreshLiveFeed();
    const timer = window.setInterval(() => {
      if (!document.hidden) void refreshLiveFeed();
    }, 45_000);
    return () => window.clearInterval(timer);
  }, [realmFilter]);

  const handleLikeLivePost = async (postId: string) => {
    if (!liveRunId) return;
    const updated = await toggleLiveNpcPostLike(liveRunId, postId);
    if (updated) {
      setLivePosts(prev => prev.map(p => p.id === postId ? updated : p));
    }
  };

  const handleCommentLivePost = async (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    const text = (commentDrafts[postId] || '').trim();
    if (!liveRunId || !text) return;
    const updated = await commentOnLiveNpcPost(
      liveRunId,
      postId,
      text,
      player?.name || player?.maiSpaceProfile?.handle || 'You',
    );
    if (updated) {
      setLivePosts(prev => prev.map(p => p.id === postId ? updated : p));
      setCommentDrafts(prev => ({ ...prev, [postId]: '' }));
    }
  };

  const feed = social.posts
    .filter(p => !p.draft && canSee(social, p.author, p.audience) && !social.muted.includes(p.author) && (filter !== 'friends' || p.author === 'you' || social.friends.includes(p.author)))
    .slice()
    .sort((a, b) => b.cycle - a.cycle);

  const templateFeed = (social.templatePosts || []).filter(tp => {
    if (filter === 'friends') return tp.authorId === 'you' || social.friends.includes(tp.authorId);
    if (filter === 'following') return tp.authorId === 'you' || (social.followedAccounts || []).includes(tp.authorId);
    return true;
  });

  const handlePublishGraphicCard = (e: React.FormEvent) => {
    e.preventDefault();
    const isPoll = tplId === 'tpl-social-poll';
    const isCarousel = tplId === 'tpl-social-carousel';
    const ok = act({
      type: 'publish-template-post',
      npcVectors: player?.npcVectors,
      artifact: {
        templateId: tplId,
        brandKitId,
        verificationTier: 'personal_perspective',
        authorId: 'you',
        authorName: player?.name || 'You',
        entityRefs: entityId ? [entityId] : [],
        slotValues: {
          kicker,
          headline,
          subhead,
          dateLocation: subhead || 'Aureline, Orynvell',
          body: subhead,
          primaryEntityId: entityId,
          ...(isPoll ? { pollOptions: ['Count me in', 'Curious to learn more', 'Sharing my view in comments'] } : {}),
          ...(isCarousel
            ? {
                slides: [
                  { id: 's1', headline: headline || 'Slide I', caption: subhead || 'First frame from my studio.' },
                  { id: 's2', headline: 'Slide II · Details', caption: 'Crafted with Miraverse reusable templates.', entityId },
                ],
              }
            : {}),
        },
      },
    });
    if (ok) {
      setHeadline('');
      setSubhead('');
      setComposerOpen(false);
    }
  };

  return (
    <div className="ms-home">
      <section className="ms-welcome">
        <span>EST. IN YOUR LITTLE CORNER OF MERIDION</span>
        <h1>Somewhere to belong.</h1>
        <p>Personal spaces, cultural salons, and live dispatches across all eight realms.</p>
        <div className="ms-actions">
          <button onClick={() => go('Customize')}>Make your page →</button>
          <button onClick={() => setComposerOpen(v => !v)}>✦ Compose Graphic Card (16 Templates)</button>
          <button onClick={() => go('Accounts')}>Explore Official Pages →</button>
        </div>
        <span className="ms-welcome-star" aria-hidden="true">✧</span>
      </section>

      {/* Stories Strip (9:16 Vertical Story Announcements) */}
      <section className="ms-card" aria-label="Stories across MAI.SPACE" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <strong style={{ fontSize: '0.82rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Stories & Moments</strong>
          <small>Click a ring to view</small>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {STARTER_SOCIAL_STORIES.map(story => {
            const seen = (social.seenStoryIds || []).includes(story.id);
            return (
              <button
                key={story.id}
                type="button"
                onClick={() => {
                  setActiveStory(story);
                  act({ type: 'mark-story-seen', id: story.id });
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '9999px',
                  border: seen ? '1.5px solid #9EA7B3' : '2px solid #C6AE73',
                  background: seen ? '#F8FAFC' : '#FAF6F8',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ fontWeight: 700, color: '#48293D' }}>@{story.handle}</span>
                <small>{story.kicker}</small>
              </button>
            );
          })}
        </div>
        {activeStory && (
          <div style={{ marginTop: '0.85rem', padding: '1rem', borderRadius: '10px', background: '#48293D', color: '#FFFFFF', border: '1.5px solid #C6AE73' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <small style={{ color: '#D8C0CB', letterSpacing: '0.12em' }}>
                @{activeStory.handle} · {ACCOUNT_FAMILY_LABELS[activeStory.family]} · {activeStory.kicker}
              </small>
              <button type="button" onClick={() => setActiveStory(null)}>Close ×</button>
            </div>
            <h3 style={{ fontFamily: 'var(--font-editorial-masthead)', margin: '0.35rem 0', fontSize: '1.35rem' }}>{activeStory.headline}</h3>
            <p style={{ margin: 0, color: '#F4EBF0' }}>{activeStory.caption}</p>
          </div>
        )}
      </section>

      {composerOpen && (
        <form className="ms-card ms-compose" onSubmit={handlePublishGraphicCard} style={{ marginBottom: '1rem' }}>
          <h2>Compose Reusable Graphic Card</h2>
          <div className="ms-settings-grid">
            <label>
              Master Template (16 Archetypes)
              <select value={tplId} onChange={e => setTplId(e.target.value)}>
                {socialTemplates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.aspectRatio})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Brand Kit / Palette
              <select value={brandKitId} onChange={e => setBrandKitId(e.target.value)}>
                {Object.values(BRAND_KITS).map(k => (
                  <option key={k.id} value={k.id}>
                    {k.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="ms-settings-grid">
            <label>
              Kicker / Tag
              <input value={kicker} onChange={e => setKicker(e.target.value)} maxLength={60} />
            </label>
            <label>
              World Place / Context Reference
              <select value={entityId} onChange={e => setEntityId(e.target.value)}>
                {WORLD_PLACES.realms.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.capital})
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Headline
            <input required value={headline} onChange={e => setHeadline(e.target.value)} maxLength={140} placeholder="Announce an event, milestone, release, or observation…" />
          </label>
          <label>
            Supporting Copy / Venue
            <input value={subhead} onChange={e => setSubhead(e.target.value)} maxLength={220} placeholder="Details, reflection, or location…" />
          </label>
          <div className="ms-actions">
            <button type="submit" className="ms-primary">Publish Graphic Card</button>
            <button type="button" onClick={() => setComposerOpen(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="ms-home-grid">
        <div>
          <div className="ms-feed-heading">
            <div>
              <h2>Across the neighborhood</h2>
              <small className="ms-live-pill">
                <span className="ms-live-dot" aria-hidden="true" />
                {livePosts.length > 0
                  ? `Live across the Eight Realms · ${livePosts.length} recent dispatches`
                  : 'Connected to MAI.SPACE'}
              </small>
            </div>
            <div className="ms-feed-controls">
              <div className="ms-filter-pills" role="group" aria-label="Feed view">
                {([
                  ['all', 'All'],
                  ['live', 'Citizens'],
                  ['following', 'Official'],
                  ['friends', 'Friends'],
                ] as const).map(([id, label]) => (
                  <button key={id} type="button" aria-pressed={filter === id} onClick={() => setFilter(id)}>
                    {label}
                  </button>
                ))}
              </div>
              <select aria-label="Filter by realm" value={realmFilter} onChange={e => setRealmFilter(e.target.value)}>
                <option value="">All 8 Realms</option>
                {['Orynvell', 'Fross', 'Lumia', 'Marlowe', 'Brisland', 'Kaji', 'Nephele', 'Ve’Raylia'].map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <button type="button" onClick={() => void refreshLiveFeed()} disabled={liveLoading}>
                {liveLoading ? 'Syncing…' : '↻ Refresh'}
              </button>
            </div>
          </div>

          {/* Autonomous Living World NPC Dispatches */}
          {(filter === 'all' || filter === 'live') && livePosts.map(post => (
            <article key={post.id} className="ms-post ms-card ms-live-npc-card">
              <header className="ms-live-npc-header">
                <div className="ms-live-author">
                  <span className="ms-avatar-monogram" aria-hidden="true">
                    {post.authorName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                  </span>
                  <div>
                    <strong>{post.authorName}</strong>
                    <small>
                      @{post.handle} · {post.occupation} · {post.employer}
                    </small>
                  </div>
                </div>
                <div className="ms-live-meta">
                  <span className="ms-chip ms-chip-realm">{post.realm}</span>
                  <span className="ms-chip ms-chip-activity">{post.activity}</span>
                  <small>Day {post.day} · {post.worldTime}</small>
                </div>
              </header>
              <p className="ms-live-body">{post.body}</p>
              <div className="ms-live-tags">
                {post.tags.map(tag => <span key={tag}>{tag}</span>)}
              </div>
              <div className="ms-actions">
                <button
                  type="button"
                  aria-pressed={post.likedByPlayer}
                  onClick={() => void handleLikeLivePost(post.id)}
                >
                  {post.likedByPlayer ? '♥' : '♡'} {post.likes} {post.likes === 1 ? 'like' : 'likes'}
                </button>
                <small>{post.comments.length} {post.comments.length === 1 ? 'reply' : 'replies'}</small>
              </div>
              <details className="ms-live-comments">
                <summary>Replies ({post.comments.length})</summary>
                {post.comments.map(c => (
                  <div key={c.id} className="ms-live-comment-item">
                    <strong>{c.authorName}</strong> <small>{c.worldTime}</small>
                    <p>{c.text}</p>
                  </div>
                ))}
                <form onSubmit={e => void handleCommentLivePost(e, post.id)} className="ms-live-comment-form">
                  <input
                    type="text"
                    value={commentDrafts[post.id] || ''}
                    onChange={e => setCommentDrafts(prev => ({ ...prev, [post.id]: e.target.value }))}
                    placeholder={`Reply to ${post.authorName}…`}
                    maxLength={500}
                  />
                  <button type="submit" className="ms-primary" disabled={!(commentDrafts[post.id] || '').trim()}>
                    Reply
                  </button>
                </form>
              </details>
            </article>
          ))}

          {filter !== 'live' && templateFeed.map(tp => (
            <TemplateFeedPostCard key={tp.id} artifact={tp} />
          ))}
          {filter !== 'following' && filter !== 'live' && feed.map(p => <PostCard key={p.id} post={p} />)}
          {!feed.length && !templateFeed.length && !livePosts.length && <p className="ms-empty">A quiet day. Visit a profile or write a little update.</p>}
        </div>
        <aside>
          {livePulse.length > 0 && (
            <section className="ms-card ms-pulse-card">
              <h2>Neighborhood Pulse</h2>
              <p className="ms-help">Active across the realms right now.</p>
              <ul className="ms-pulse-list">
                {livePulse.slice(0, 6).map(item => (
                  <li key={item.characterId}>
                    <div>
                      <strong>{item.name}</strong>
                      <small>{item.occupation} · {item.realm}</small>
                    </div>
                    <span className="ms-chip ms-chip-activity">{item.activity}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className="ms-card">
            <h2>Official Pages ({(social.followedAccounts || []).length} followed)</h2>
            <p>Follow The Meridian, The Social Register, royal chanceries, and cultural guilds.</p>
            <button onClick={() => go('Accounts')}>Browse 6 Account Families →</button>
          </section>
          <section className="ms-card">
            <h2>A little inspiration</h2>
            <p>Visit an unfamiliar page. Listen to something new. Leave a thoughtful note.</p>
            <button onClick={() => go('Browse')}>Browse the neighborhood →</button>
          </section>
          <section className="ms-card">
            <h2>Your invitations</h2>
            <p>{Object.values(social.requests).filter(s => s === 'incoming').length} friendship requests</p>
            <button onClick={() => go('Friends')}>Open Friends</button>
          </section>
          <section className="ms-card">
            <h2>Community rooms</h2>
            {social.groups.filter(g => !g.private || g.members.includes('you')).map(g => (
              <button className="ms-journal-link" key={g.id} onClick={() => go('Groups')}>
                {g.name}
              </button>
            ))}
          </section>
          <p className="ms-help">Engagement reflects community ties, shared interests, and what is happening across the realms.</p>
        </aside>
      </div>
    </div>
  );
}

export function PeopleDirectory({ friendsOnly = false, query = '' }: { friendsOnly?: boolean; query?: string }) {
  const { social, act, visit, go } = useSocial();
  const [search, setSearch] = useState(query), [reply, setReply] = useState<Record<string, string>>({}), [reason, setReason] = useState('');
  const people = PEOPLE.filter(p => (!friendsOnly || social.friends.includes(p.id) || social.requests[p.id] || social.blocked.includes(p.id)) && `${p.name} ${p.handle} ${p.interests}`.toLowerCase().includes(search.toLowerCase()));
  const feature = (id: string) => act({ type: 'top8', ids: social.top8.includes(id) ? social.top8.filter(p => p !== id) : [...social.top8, id] });
  return <div className="ms-content-width"><div className="ms-section-heading"><div><span className="ms-eyebrow">PEOPLE MAKE A PLACE</span><h1>{friendsOnly ? 'Friends & my Top 8' : 'Browse the neighborhood'}</h1><p>Every page belongs to a citizen of Meridion. Connections take their own time.</p></div><input type="search" aria-label="Find people" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name, interest, or handle…"/></div>{friendsOnly && <section className="ms-card"><h2>My Top 8</h2>{social.top8.length > 1 && <SortableList label="Top 8 friend order" items={social.top8.map(id => ({ id, label: PEOPLE.find(person => person.id === id)?.name || id }))} onReorder={ids => act({ type: 'top8', ids })}/>}<p>Your choice, not a ranking of relationship points. Removing a featured friend does not end a friendship.</p><ol className="ms-featured-list">{social.top8.map((id, i) => <li key={id}><PersonLink id={id}/><button disabled={i === 0} aria-label={`Move ${id} earlier`} onClick={() => { const ids = [...social.top8]; [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]]; act({ type: 'top8', ids }); }}>↑</button><button disabled={i === social.top8.length - 1} aria-label={`Move ${id} later`} onClick={() => { const ids = [...social.top8]; [ids[i + 1], ids[i]] = [ids[i], ids[i + 1]]; act({ type: 'top8', ids }); }}>↓</button><button onClick={() => feature(id)}>Unfeature</button></li>)}</ol>{!social.top8.length && <p className="ms-empty">Choose an accepted friend below to fill your first slot.</p>}</section>}<div className="ms-people-grid">{people.map(p => { const accepted = social.friends.includes(p.id), blocked = social.blocked.includes(p.id), request = social.requests[p.id]; return <article key={p.id} className={`ms-card ms-person-card ms-person-${p.theme}`}><button className="ms-person-avatar" onClick={() => visit(p.id)}>{p.icon}</button><h2><PersonLink id={p.id}/></h2><small>@{p.handle} · Meridion citizen</small><p>{p.interests}</p><div className="ms-actions"><button onClick={() => visit(p.id)}>Visit profile</button>{!blocked && (accepted ? <><button onClick={() => feature(p.id)} disabled={!social.top8.includes(p.id) && social.top8.length >= 8}>{social.top8.includes(p.id) ? 'Featured ♡' : 'Feature in Top 8'}</button><button onClick={() => go(`Mail:${p.id}`)}>Message</button></> : <><button onClick={() => act({ type: 'friend', person: p.id, decision: request === 'pending' ? 'cancel' : 'accept' })}>{request === 'incoming' ? 'Accept request' : request === 'pending' ? 'Cancel pending request' : 'Send friend request'}</button>{request === 'incoming' && <button onClick={() => act({ type: 'friend', person: p.id, decision: 'decline' })}>Decline</button>}</>)}</div>{accepted && !social.memories.includes(`conversation:${p.id}`) && <details><summary>A conversation worth having</summary><p>{p.reply}</p><textarea aria-label={`Reply to ${p.name}`} value={reply[p.id] || ''} onChange={e => setReply({ ...reply, [p.id]: e.target.value })} maxLength={2000}/><button onClick={() => { const comms = useCommsStore.getState(); if (!comms.ensurePersonalThread(p.phone)) return; if (act({ type: 'conversation', person: p.id, text: reply[p.id] })) { comms.sendPhoneMessage(p.phone, reply[p.id], 'You', 'mai.space'); comms.sendPhoneMessage(p.phone, p.response, p.phone, 'mai.space'); setReply({ ...reply, [p.id]: '' }); } }}>Share & listen</button></details>}<details><summary>Boundaries & privacy</summary><div className="ms-actions"><button onClick={() => act({ type: 'block', person: p.id })}>{blocked ? 'Unblock' : 'Block'}</button><button onClick={() => act({ type: 'mute', person: p.id })}>{social.muted.includes(p.id) ? 'Unmute' : 'Mute feed'}</button>{accepted && <button onClick={() => act({ type: 'unfriend', person: p.id })}>End connection</button>}</div><label>Report concern<input value={reason} onChange={e => setReason(e.target.value)} maxLength={500}/></label><button onClick={() => act({ type: 'report', target: `profile:${p.id}`, reason })}>Save local report</button><small>Reports stay on this device; there is no human moderation service.</small></details></article>; })}</div>{!people.length && <p className="ms-empty">No matching citizens.</p>}</div>;
}

export function Photos({ initialAlbum = '' }: { initialAlbum?: string }) {
  const { social, act, go } = useSocial();
  const [albumId, setAlbumId] = useState(initialAlbum), [photoId, setPhotoId] = useState(''), [name, setName] = useState(''), [aud, setAud] = useState<Audience>('friends'), [caption, setCaption] = useState(''), [notice, setNotice] = useState('');
  const albums = social.albums.filter(a => canSeeRecord(social, a));
  const album = albums.find(a => a.id === albumId) || albums[0], photo = album?.photos.find(p => p.id === photoId) || album?.photos[0];
  useEffect(() => setCaption(photo?.caption || ''), [photo?.id]);
  const upload = async (file?: File) => { if (!file || !album || album.author !== 'you') return; try { const asset = await storeMedia(file, social.assets.reduce((n, a) => n + a.size, 0)); if (!act({ type: 'asset', asset })) { await removeMedia(asset.id); return; } act({ type: 'photo', album: album.id, asset: asset.id, caption: file.name }); setNotice('Photograph added and saved on this device.'); } catch (e) { setNotice(e.message); } };
  return <div className="ms-content-width"><div className="ms-section-heading"><div><span className="ms-eyebrow">LITTLE THINGS, KEPT FOREVER</span><h1>Photo albums</h1><p>A picture, a few words, a day you want to remember.</p></div><button onClick={() => go('Customize')}>My media shelf</button></div><div className="ms-photo-layout"><aside className="ms-card"><h2>On the shelf</h2>{albums.map(a => <button className="ms-album-choice" aria-pressed={a.id === album?.id} key={a.id} onClick={() => { setAlbumId(a.id); setPhotoId(''); }}>{a.name}<small>{a.author === 'you' ? 'You' : PEOPLE.find(p => p.id === a.author)?.name} · {a.photos.length} images</small></button>)}<form onSubmit={e => { e.preventDefault(); if (act({ type: 'album', name, audience: aud })) setName(''); }}><h3>Start an album</h3><label>Name<input required value={name} onChange={e => setName(e.target.value)} maxLength={100}/></label><AudienceSelect value={aud} onChange={setAud}/><button>Create album</button></form></aside><section className="ms-card ms-photo-reader">{album ? <><h2>{album.name}</h2><p>{album.audience} · <PersonLink id={album.author}/></p>{album.author === 'you' && <><AudienceSelect includeGroup={Boolean(album.groupId)} value={album.audience} onChange={audience => act({ type: 'album-audience', id: album.id, audience })}/><label className="ms-file">Add a photograph<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e => { upload(e.target.files?.[0]); e.target.value = ''; }}/></label><small>New uploads are untagged. Friends approve tag requests after world time advances.</small></>}{photo ? <><SocialImage className="ms-feature-photo" asset={photo.asset} alt={photo.caption || 'Album photograph'}/><p className="ms-prewrap">{photo.caption}</p>{photo.tags?.length > 0 && <p>In this photograph: {photo.tags.filter(id => !social.blocked.includes(id)).map(id => PEOPLE.find(p => p.id === id)?.name).join(', ')}</p>}{photo.asset.startsWith('builtin:') && <small>Original illustration · not a photograph of a completed event</small>}<div className="ms-thumbnail-strip">{album.photos.map(p => <button key={p.id} aria-pressed={photo.id === p.id} aria-label={`View ${p.caption || 'photograph'}`} onClick={() => setPhotoId(p.id)}><SocialImage asset={p.asset} alt={p.caption}/></button>)}</div>{album.author === 'you' && <><label>Caption<textarea value={caption} onChange={e => setCaption(e.target.value)} maxLength={500}/></label><div className="ms-actions"><button onClick={() => act({ type: 'photo-caption', id: photo.id, caption })}>Save caption</button><button onClick={() => act({ type: 'photo-move', album: album.id, id: photo.id, direction: 'up' })}>← Earlier</button><button onClick={() => act({ type: 'photo-move', album: album.id, id: photo.id, direction: 'down' })}>Later →</button><button onClick={() => act({ type: 'delete-photo', id: photo.id })}>Remove photograph</button></div></>}{album.author === 'you' && <><label>Request a photo tag<select value="" onChange={e => act({ type: 'photo-tag', id: photo.id, person: e.target.value })}><option value="">Choose a friend</option>{social.friends.filter(id => !social.blocked.includes(id) && !photo.tags.includes(id)).map(id => <option key={id} value={id}>{PEOPLE.find(p => p.id === id)?.name}</option>)}</select></label>{Object.keys(photo.tagRequests || {}).length > 0 && <small>Tag approval pending. No identity or attendance is inferred from a tag.</small>}{photo.tags.map(id => <button key={id} onClick={() => act({ type: 'photo-untag', id: photo.id, person: id })}>Remove {PEOPLE.find(p => p.id === id)?.name} tag</button>)}</>}<h3>Under the photograph</h3><Comments target={photo.id}/></> : <p className="ms-empty">No photographs yet. Upload an image to begin this album.</p>}</> : <p>Create your first album to get started.</p>}<p role="status">{notice}</p></section></div></div>;
}

export function Music() {
  const { social, act, go } = useSocial();
  const tracks = ['builtin:stillwater', 'builtin:starlight', ...social.assets.filter(a => a.type.startsWith('audio/')).map(a => a.id)];
  return <div className="ms-content-width"><div className="ms-section-heading"><div><span className="ms-eyebrow">A SOUNDTRACK FOR YOUR CORNER</span><h1>The listening room</h1><p>Original loops and the audio you bring with you.</p></div><button onClick={() => go('Customize')}>Upload music</button></div><div className="ms-music-grid">{tracks.map(track => <section key={track} className="ms-card"><MusicPlayer track={track}/><button aria-pressed={social.track === track} onClick={() => act({ type: 'media-choice', slot: 'track', id: track })}>{social.track === track ? 'My profile song ♫' : 'Make this my profile song'}</button></section>)}</div><section className="ms-card"><h2>My playlist</h2><ol>{social.playlist.map((id, i) => <li key={id}>{id === 'builtin:stillwater' ? 'Stillwater' : id === 'builtin:starlight' ? 'Starlight' : social.assets.find(a => a.id === id)?.name || 'Unavailable audio'}<div className="ms-actions"><button disabled={i === 0} onClick={() => { const ids = [...social.playlist]; [ids[i-1], ids[i]] = [ids[i], ids[i-1]]; act({ type: 'playlist', ids }); }}>↑ Earlier</button><button disabled={i === social.playlist.length - 1} onClick={() => { const ids = [...social.playlist]; [ids[i+1], ids[i]] = [ids[i], ids[i+1]]; act({ type: 'playlist', ids }); }}>↓ Later</button><button onClick={() => act({ type: 'playlist', ids: social.playlist.filter(p => p !== id) })}>Remove from playlist</button></div></li>)}</ol><p>Tracks you select are kept in your playlist. Imported media stays in this browser; export the media backup to move it with your save.</p></section></div>;
}

export function Communities() {
  const { social, act, go } = useSocial();
  const [name, setName] = useState(''), [description, setDescription] = useState(''), [privateGroup, setPrivate] = useState(false);
  return <div className="ms-content-width"><div className="ms-section-heading"><div><span className="ms-eyebrow">FIND YOUR PEOPLE</span><h1>Community rooms</h1><p>Shared interests, small conversations, and open doors.</p></div></div><form className="ms-card" onSubmit={e => { e.preventDefault(); if (act({ type: 'group-create', name, description, private: privateGroup })) { setName(''); setDescription(''); } }}><h2>Start a group</h2><label>Name<input required value={name} onChange={e => setName(e.target.value)} maxLength={100}/></label><label>What brings you together?<textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={1000}/></label><label><input type="checkbox" checked={privateGroup} onChange={e => setPrivate(e.target.checked)}/>Private · membership approval required</label><button>Create group</button></form><div className="ms-people-grid">{social.groups.map(g => { const member = g.members.includes('you'); return <section className="ms-card" key={g.id}><small>{g.private ? 'Private circle' : 'Public community'}</small><h2>{g.name}</h2><p>{g.description}</p>{member ? <><p>{g.members.length} members</p><div className="ms-group-collections"><h3>Shared albums</h3>{social.albums.filter(a => a.groupId === g.id && canSeeRecord(social, a)).map(a => <button key={a.id} onClick={() => go(`Photos:${a.id}`)}>{a.name}</button>)}<button onClick={() => act({ type: 'group-album', id: g.id })}>Start a shared album</button><h3>Group calendar</h3>{social.events.filter(e => e.groupId === g.id && canSeeRecord(social, e)).map(e => <p key={e.id}>{e.title} · Cycle {e.cycle}{e.canceled ? ' · Canceled' : ''}</p>)}<button onClick={() => go(`Events:${g.id}`)}>Plan a group event</button></div><Comments target={g.id}/>{g.owner !== 'you' && <button onClick={() => act({ type: 'group-leave', id: g.id })}>Leave group</button>}{g.owner === 'you' && g.pending.map(id => <div key={id}>Request: {PEOPLE.find(p => p.id === id)?.name || 'Citizen'}<button onClick={() => act({ type: 'group-approve', id: g.id, person: id, accept: true })}>Approve</button><button onClick={() => act({ type: 'group-approve', id: g.id, person: id, accept: false })}>Decline</button></div>)}</> : <><button disabled={g.pending.includes('you')} onClick={() => act({ type: 'group-join', id: g.id })}>{g.pending.includes('you') ? 'Approval pending' : g.private ? 'Request membership' : 'Join group'}</button><p className="ms-help">Discussion and membership details stay inside the group.</p></>}</section>; })}</div><p className="ms-help">Joining a recreational community grants no legal House membership or institutional access.</p></div>;
}

export function Events({ initialGroup = '' }: { initialGroup?: string }) {
  const { social, act, cycle, go } = useSocial();
  const [groupId, setGroupId] = useState(initialGroup);
  const [title, setTitle] = useState(''), [description, setDescription] = useState(''), [location, setLocation] = useState('Home gathering'), [when, setWhen] = useState(cycle + 1), [invited, invite] = useState<string[]>([]), [aud, setAud] = useState<Audience>('friends');
  return <div className="ms-content-width"><div className="ms-section-heading"><div><span className="ms-eyebrow">MAKE TIME FOR EACH OTHER</span><h1>Gatherings & little occasions</h1><p>Desktop activities, real shared memories. No quest required.</p></div></div><form className="ms-card" onSubmit={e => { e.preventDefault(); if (act({ type: 'event', title, description, location, cycle: when, invited, audience: aud, groupId: groupId || undefined })) { setTitle(''); invite([]); } }}><h2>Plan a gathering</h2><label>Title<input required value={title} onChange={e => setTitle(e.target.value)} maxLength={100}/></label><label>Description<textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={2000}/></label><div className="ms-settings-grid"><label>Available activity<select value={location} onChange={e => setLocation(e.target.value)}><option>Home gathering</option><option>Photo Circle online room</option></select></label><label>World cycle<input type="number" min={cycle} value={when} onChange={e => setWhen(+e.target.value)}/></label></div><label>Community<select value={groupId} onChange={e => setGroupId(e.target.value)}><option value="">Personal gathering</option>{social.groups.filter(g => g.members.includes('you')).map(g => <option value={g.id} key={g.id}>{g.name}</option>)}</select></label>{groupId ? <p>This event is visible to group members only.</p> : <AudienceSelect value={aud} onChange={setAud}/>}<fieldset><legend>Invite friends</legend>{social.friends.filter(id => !social.blocked.includes(id)).map(id => <label key={id}><input type="checkbox" checked={invited.includes(id)} onChange={e => invite(e.target.checked ? [...invited, id] : invited.filter(p => p !== id))}/>{PEOPLE.find(p => p.id === id)?.name}</label>)}</fieldset><button>Create event</button><small>Invitations are answered as the day progresses.</small></form>{social.events.filter(e => canSeeRecord(social, e)).map(e => <section className="ms-card" key={e.id}><small>Cycle {e.cycle} · {e.location} · {e.audience}</small><h2>{e.title}</h2><p>{e.description}</p>{e.canceled ? <p>Canceled by host</p> : <><label>Your RSVP<select value={e.rsvp.you || 'maybe'} onChange={v => act({ type: 'rsvp', id: e.id, value: v.target.value })}><option value="going">Going</option><option value="maybe">Maybe</option><option value="declined">Not this time</option></select></label><ul>{e.invited.filter(id => !social.blocked.includes(id)).map(id => <li key={id}>{PEOPLE.find(p => p.id === id)?.name}: {e.rsvp[id] || 'Awaiting a reply'}</li>)}</ul>{e.attendance.includes('you') ? <><p>Memory kept. {e.attendance.length} participant{e.attendance.length > 1 ? 's' : ''} attended this desktop gathering.</p><button onClick={() => go(`Photos:event-album:${e.id}`)}>Open the memory album</button><p className="ms-help">The album starts empty; no photograph or attendance is fabricated.</p></> : <div className="ms-actions"><button disabled={cycle < e.cycle || e.rsvp.you !== 'going'} onClick={() => act({ type: 'attend', id: e.id })}>Attend & share a quiet moment</button>{e.host === 'you' && <button onClick={() => act({ type: 'cancel-event', id: e.id })}>Cancel event</button>}</div>}</>}</section>)}</div>;
}

export function SocialMail({ initialPerson = '' }: { initialPerson?: string }) {
  const { social, act } = useSocial();
  const threads = useCommsStore(s => s.phoneThreads), drafts = useCommsStore(s => s.phoneDrafts);
  const readCounts = useCommsStore(s => s.phoneReadCounts);
  const [person, select] = useState(initialPerson || social.friends[0] || 'jeremie');
  const p = PEOPLE.find(p => p.id === person), permitted = p && !social.blocked.includes(p.id);
  const contact = p?.phone || '', messages = threads[contact] || [];
  useEffect(() => { if (permitted) useCommsStore.getState().markPhoneThreadRead(contact); }, [contact, messages.length, permitted]);
  return <div className="ms-content-width"><div className="ms-section-heading"><div><span className="ms-eyebrow">FROM ONE PERSON TO ANOTHER</span><h1>Personal mail</h1><p>The same personal conversations and drafts as phone Messages. Email stays in AureMail.</p></div></div><div className="ms-photo-layout"><aside className="ms-card">{PEOPLE.map(p => <button className="ms-album-choice" aria-pressed={p.id === person} key={p.id} onClick={() => { select(p.id); useCommsStore.getState().ensurePersonalThread(p.phone); }}>{p.name}{!social.blocked.includes(p.id) && (threads[p.phone] || []).slice(readCounts[p.phone] ?? 0).some(m => m.sender !== 'You') && <small>New personal messages</small>}{social.blocked.includes(p.id) && <small>Blocked</small>}</button>)}</aside><section className="ms-card"><h2>{p?.name}</h2>{permitted ? <><div className="ms-message-history">{messages.map(m => <article key={m.id} className={m.sender === 'You' ? 'ms-my-message' : ''}><small>{m.sender} · {m.source || 'phone'} · {m.time}</small><p>{m.text}</p></article>)}{!messages.length && <p>Start a personal conversation.</p>}</div><form onSubmit={e => { e.preventDefault(); const c = useCommsStore.getState(); if (c.ensurePersonalThread(contact) && c.sendPhoneMessage(contact, drafts[contact] || '', 'You', 'mai.space')) c.setPhoneDraft(contact, ''); }}><textarea aria-label="Personal message" value={drafts[contact] || ''} onChange={e => { const c = useCommsStore.getState(); if (c.ensurePersonalThread(contact)) c.setPhoneDraft(contact, e.target.value); }} maxLength={4000} required/><button>Send message</button></form></> : <p>This contact is blocked. Manage your boundaries in Friends.</p>}</section></div></div>;
}
