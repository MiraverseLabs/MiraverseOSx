import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  fetchSpeciesFacets,
  fetchSpeciesList,
  fetchSpeciesDetail,
  fetchCelestialRegistry,
  fetchDisciplinesRegistry,
  fetchWildlifePopulations,
  type ApiSpeciesRecord,
  type SpeciesAssetItem,
  type SpeciesDetailResponse,
  type SpeciesFacetsResponse,
  type CelestialRegistryResponse,
  type DisciplinesRegistryResponse,
  type WildlifePopulationItem,
} from '../../services/speciesRegistryClient';
import '../../styles/apps/SpeciesRegistry.css';

type RegistryTab = 'catalog' | 'celestial' | 'disciplines' | 'wildlife' | 'gallery';

const REGISTRY_TABS: { id: RegistryTab; label: string }[] = [
  { id: 'catalog', label: 'Species Catalog' },
  { id: 'celestial', label: 'Angelic Choirs & Celestial' },
  { id: 'disciplines', label: 'Magical Disciplines & Witchcraft' },
  { id: 'wildlife', label: 'Fauna & Wildlife' },
  { id: 'gallery', label: 'Illustrated Gallery' },
];

const CLASSIFICATION_OPTIONS = [
  { value: '', label: 'All classifications' },
  { value: 'sapient', label: 'Sapient & Supernatural (All)' },
  { value: 'fauna', label: 'Ordinary & Magical Fauna (All)' },
  { value: 'elemental_human', label: 'Elemental Humans' },
  { value: 'biological_species', label: 'Biological Species' },
  { value: 'regional_subspecies', label: 'Regional Subspecies' },
  { value: 'hybrid_ancestry', label: 'Hybrid Ancestry' },
  { value: 'celestial_being', label: 'Celestial Beings' },
  { value: 'angelic_choir', label: 'Angelic Choirs' },
  { value: 'spiritual_entity', label: 'Spiritual Entities' },
  { value: 'ordinary_animal', label: 'Ordinary Animals' },
  { value: 'magical_animal', label: 'Magical Animals' },
  { value: 'magical_practitioner', label: 'Magical Practitioners' },
  { value: 'witchcraft_tradition', label: 'Witchcraft Traditions' },
  { value: 'supernatural_status', label: 'Supernatural Statuses' },
];

const CLASSIFICATION_LABELS: Record<string, string> = {
  elemental_human: 'Elemental Human',
  biological_species: 'Biological Species',
  regional_subspecies: 'Regional Subspecies',
  hybrid_ancestry: 'Hybrid Ancestry',
  celestial_being: 'Celestial Being',
  angelic_choir: 'Angelic Choir',
  spiritual_entity: 'Spiritual Entity',
  ordinary_animal: 'Ordinary Animal',
  magical_animal: 'Magical Animal',
  magical_practitioner: 'Magical Practitioner',
  witchcraft_tradition: 'Witchcraft Tradition',
  supernatural_status: 'Supernatural Status',
};

export interface SpeciesRegistryProps {
  /** When true (default in VerseNet), hides developer-only canon review annotations from public in-world display. */
  publicMode?: boolean;
  /** Optional initial species ID or name to focus. */
  initialSpeciesId?: string;
}

export default function SpeciesRegistry({ publicMode = true, initialSpeciesId }: SpeciesRegistryProps) {
  const baseId = useId();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [activeTab, setActiveTab] = useState<RegistryTab>('catalog');
  const [facets, setFacets] = useState<SpeciesFacetsResponse | null>(null);
  const [records, setRecords] = useState<ApiSpeciesRecord[]>([]);
  const [totalCount, setTotalCount] = useState(386);
  const [fromBackend, setFromBackend] = useState<boolean | null>(null);
  const [loadingList, setLoadingList] = useState(true);

  const [query, setQuery] = useState('');
  const [realm, setRealm] = useState('');
  const [category, setCategory] = useState('');
  const [family, setFamily] = useState('');
  const [affinity, setAffinity] = useState('');
  const [classification, setClassification] = useState('');
  const [limit, setLimit] = useState(24);
  const [selectedId, setSelectedId] = useState(initialSpeciesId || 'MR-001');
  const [detail, setDetail] = useState<SpeciesDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [celestial, setCelestial] = useState<CelestialRegistryResponse | null>(null);
  const [disciplines, setDisciplines] = useState<DisciplinesRegistryResponse | null>(null);
  const [wildlife, setWildlife] = useState<WildlifePopulationItem[]>([]);
  const [wildlifeRealm, setWildlifeRealm] = useState('');
  const [wildlifeTransportOnly, setWildlifeTransportOnly] = useState(false);

  // Load facets & assets once
  useEffect(() => {
    let active = true;
    fetchSpeciesFacets().then(data => {
      if (!active) return;
      setFacets(data);
      setTotalCount(data.total);
      setFromBackend(data.fromBackend);
    });
    return () => { active = false; };
  }, []);

  // Query backend species list whenever filters change
  useEffect(() => {
    let active = true;
    setLoadingList(true);
    const timer = setTimeout(() => {
      fetchSpeciesList({
        q: query,
        realm,
        category,
        family,
        affinity,
        classification,
        includeCanonMeta: !publicMode,
        limit: 500,
      }).then(res => {
        if (!active) return;
        setRecords(res.records);
        setFromBackend(res.fromBackend);
        setLoadingList(false);
        if (res.records.length > 0 && !res.records.some(r => r.id === selectedId)) {
          setSelectedId(res.records[0].id);
        }
      });
    }, 120);
    return () => { active = false; clearTimeout(timer); };
  }, [query, realm, category, family, affinity, classification, publicMode]);

  // Load detailed profile + abilities + physiology + assets + related species
  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    setLoadingDetail(true);
    fetchSpeciesDetail(selectedId, !publicMode).then(res => {
      if (!active) return;
      setDetail(res);
      setLoadingDetail(false);
    });
    return () => { active = false; };
  }, [selectedId, publicMode]);

  // Lazy-load specialized tabs when selected
  useEffect(() => {
    if (activeTab === 'celestial' && !celestial) {
      fetchCelestialRegistry().then(setCelestial);
    } else if (activeTab === 'disciplines' && !disciplines) {
      fetchDisciplinesRegistry().then(setDisciplines);
    }
  }, [activeTab, celestial, disciplines]);

  useEffect(() => {
    if (activeTab === 'wildlife') {
      fetchWildlifePopulations({ realm: wildlifeRealm || undefined, transportOnly: wildlifeTransportOnly })
        .then(res => setWildlife(res.populations));
    }
  }, [activeTab, wildlifeRealm, wildlifeTransportOnly]);

  const selectTab = (tabId: RegistryTab) => {
    setActiveTab(tabId);
    tabRefs.current[tabId]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  const handleTabKeyDown = (event: React.KeyboardEvent, idx: number) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const next = (idx + (event.key === 'ArrowRight' ? 1 : -1) + REGISTRY_TABS.length) % REGISTRY_TABS.length;
      const nextId = REGISTRY_TABS[next].id;
      tabRefs.current[nextId]?.focus();
      selectTab(nextId);
    }
  };

  const resetFilters = () => {
    setQuery('');
    setRealm('');
    setCategory('');
    setFamily('');
    setAffinity('');
    setClassification('');
    setLimit(24);
  };

  const openProfile = (id: string) => {
    setSelectedId(id);
    setActiveTab('catalog');
  };

  const coverAsset = useMemo(
    () => facets?.assets.find(a => a.kind === 'cover'),
    [facets],
  );
  const realmPlates = useMemo(
    () => (facets?.assets.filter(a => a.kind === 'realm_plate') || []).sort((a, b) => (a.realm || '').localeCompare(b.realm || '')),
    [facets],
  );
  const comparativePlate = useMemo(
    () => facets?.assets.find(a => a.kind === 'comparative_plate'),
    [facets],
  );

  const selectedRecord = detail?.record || records.find(r => r.id === selectedId) || records[0];
  const specimenAssets = (detail?.assets || []).filter(a => a.kind === 'specimen' || a.kind === 'study');
  const realmArtAsset = (detail?.assets || []).find(a => a.kind === 'realm_art');

  return (
    <section className="species-registry" aria-label="Meridion Species Registry">
      <header className="species-registry-hero">
        {coverAsset && (
          <img
            className="species-cover-art"
            src={coverAsset.url}
            alt="Meridion Species Registry illustrated archival cover"
            loading="eager"
          />
        )}
        <div className="species-registry-heading">
          <span>
            ROYAL ARCHIVE &amp; VERSENET NATURAL HISTORY ·{' '}
            {fromBackend === true ? 'LIVE DATABASE CATALOG' : fromBackend === false ? 'OFFLINE SNAPSHOT' : 'CONNECTING…'}
          </span>
          <h2>Meridion Species Registry</h2>
          <p>
            {totalCount} authoritative entries across the Eight Realms of Meridion, anchored by the AETHERCORE.
            Distinguishing biological species, elemental humans, regional subspecies, celestial choirs, fauna,
            magical disciplines, witchcraft traditions, and attained statuses.
          </p>
        </div>
      </header>

      {realmPlates.length > 0 && (
        <div className="species-realm-strip" role="group" aria-label="Filter by Eight Realms">
          {realmPlates.map((plate: SpeciesAssetItem) => {
            const isSelected = realm === plate.realm;
            return (
              <button
                key={plate.assetId}
                type="button"
                className="species-realm-plate"
                aria-pressed={isSelected}
                onClick={() => {
                  setRealm(isSelected ? '' : (plate.realm || ''));
                  setActiveTab('catalog');
                  setLimit(24);
                }}
                title={`Filter by ${plate.realm}`}
              >
                <img src={plate.url} alt={`${plate.realm} emblem plate`} loading="lazy" />
                <span>{plate.realm}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="species-tablist" role="tablist" aria-label="Registry sections">
        {REGISTRY_TABS.map((tab, idx) => {
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={el => { tabRefs.current[tab.id] = el; }}
              id={`${baseId}-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={isSelected}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => selectTab(tab.id)}
              onKeyDown={e => handleTabKeyDown(e, idx)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: SPECIES CATALOG */}
      <div
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-catalog`}
        hidden={activeTab !== 'catalog'}
      >
        <div className="species-panel-inner">
          <div className="species-filters">
            <label>
              Search profiles
              <input
                type="search"
                value={query}
                onChange={e => { setQuery(e.target.value); setLimit(24); }}
                placeholder="Name, powers, habitat, affinity, or ID (e.g. MR-001)"
              />
            </label>
            <label>
              Realm
              <select value={realm} onChange={e => { setRealm(e.target.value); setLimit(24); }}>
                <option value="">All realms</option>
                {(facets?.realms || []).map(item => (
                  <option key={item.name} value={item.name}>{item.name} ({item.count})</option>
                ))}
              </select>
            </label>
            <label>
              Classification
              <select value={classification} onChange={e => { setClassification(e.target.value); setLimit(24); }}>
                {CLASSIFICATION_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
            <label>
              Family
              <select value={family} onChange={e => { setFamily(e.target.value); setLimit(24); }}>
                <option value="">All families</option>
                {(facets?.families || []).map(item => (
                  <option key={item.name} value={item.name}>{item.name} ({item.count})</option>
                ))}
              </select>
            </label>
            <label>
              Elemental Affinity
              <select value={affinity} onChange={e => { setAffinity(e.target.value); setLimit(24); }}>
                <option value="">All affinities</option>
                {(facets?.affinities || []).slice(0, 40).map(item => (
                  <option key={item.name} value={item.name}>{item.name} ({item.count})</option>
                ))}
              </select>
            </label>
            <label>
              Category
              <select value={category} onChange={e => { setCategory(e.target.value); setLimit(24); }}>
                <option value="">All categories</option>
                {(facets?.categories || []).map(item => (
                  <option key={item.name} value={item.name}>{item.name} ({item.count})</option>
                ))}
              </select>
            </label>
          </div>

          <div className="species-results-summary">
            <p role="status">
              {loadingList ? 'Querying registry…' : `${records.length} of ${totalCount} profiles`}
            </p>
            <button type="button" onClick={resetFilters}>Reset filters</button>
          </div>

          {!selectedRecord ? (
            <div className="species-empty">
              <h3>No matching profiles</h3>
              <p>Try a broader term or reset the filters.</p>
            </div>
          ) : (
            <div className="species-workspace">
              <nav className="species-results" aria-label="Species profiles">
                {records.slice(0, limit).map(record => (
                  <button
                    type="button"
                    key={record.id}
                    aria-pressed={record.id === selectedRecord.id}
                    onClick={() => setSelectedId(record.id)}
                  >
                    <small>{record.id} · {record.realm}</small>
                    <strong>{record.name}</strong>
                    <span>
                      {record.family} · {CLASSIFICATION_LABELS[record.classificationType || ''] || record.category}
                    </span>
                  </button>
                ))}
                {records.length > limit && (
                  <button type="button" onClick={() => setLimit(v => v + 24)}>
                    Show more profiles ({records.length - limit} remaining)
                  </button>
                )}
              </nav>

              <article className="species-profile" aria-label={`${selectedRecord.name} profile`}>
                <header>
                  <div className="species-badges">
                    <span className="species-record-id">{selectedRecord.id}</span>
                    <span className="species-badge">{CLASSIFICATION_LABELS[selectedRecord.classificationType || ''] || selectedRecord.category}</span>
                    <span className="species-badge species-badge-realm">{selectedRecord.realm}</span>
                    {selectedRecord.isFauna && <span className="species-badge species-badge-fauna">Fauna</span>}
                    {selectedRecord.isSapient && <span className="species-badge species-badge-sapient">Sapient</span>}
                  </div>
                  <h3>{selectedRecord.name}</h3>
                  <p>{selectedRecord.description}</p>
                </header>

                {(specimenAssets.length > 0 || realmArtAsset) && (
                  <div className="species-artwork-row">
                    {specimenAssets.map(asset => (
                      <figure key={asset.assetId} className="species-figure">
                        <img src={asset.url} alt={asset.title} loading="lazy" />
                        <figcaption>{asset.title}</figcaption>
                      </figure>
                    ))}
                    {specimenAssets.length === 0 && realmArtAsset && (
                      <figure className="species-figure species-figure-realm">
                        <img src={realmArtAsset.url} alt={realmArtAsset.title} loading="lazy" />
                        <figcaption>{realmArtAsset.title}</figcaption>
                      </figure>
                    )}
                  </div>
                )}

                {selectedRecord.category === 'Practices & statuses' && (
                  <p className="species-practice-note">
                    This record describes a magical discipline, witchcraft tradition, or attained status.
                    It is kept separate from biological species and ancestry.
                  </p>
                )}
                {selectedRecord.category === 'Angelic choirs' && (
                  <p className="species-practice-note">
                    Angelic choirs are celestial orders separate from biological ancestry, royal dynasties,
                    and ancient ancestral Houses.
                  </p>
                )}

                <dl className="species-facts">
                  <div><dt>Native Realm</dt><dd>{selectedRecord.realm}</dd></div>
                  <div><dt>Species Family</dt><dd>{selectedRecord.family}</dd></div>
                  <div><dt>Elemental Affinity</dt><dd>{selectedRecord.affinity}</dd></div>
                  <div><dt>Natural Lifespan</dt><dd>{selectedRecord.lifespan || 'Unspecified'}</dd></div>
                </dl>

                {detail?.physiology?.regionalGenetics && Object.keys(detail.physiology.regionalGenetics).length > 0 && (
                  <div className="species-regional-box">
                    <h4>Regional Genetics</h4>
                    <dl>
                      {Object.entries(detail.physiology.regionalGenetics).map(([region, desc]) => (
                        <div key={region}><dt>{region}</dt><dd>{desc}</dd></div>
                      ))}
                    </dl>
                  </div>
                )}

                {detail?.inheritance?.pureNetherCapPct != null && (
                  <p className="species-practice-note">
                    Hereditary Note: Only {detail.inheritance.pureNetherCapPct}% of Nephele’s population
                    possesses pure Nether Manipulation.
                  </p>
                )}

                <div className="species-power-sections">
                  {[
                    ['Physiology & Morphology', selectedRecord.physiology],
                    ['Native Habitat & Ecology', selectedRecord.habitat],
                    ['Passive Abilities', selectedRecord.passiveAbilities],
                    ['Active Powers', selectedRecord.activePowers],
                    ['Learned Techniques', selectedRecord.techniques],
                    ['Exceptional Manifestations', selectedRecord.exceptionalManifestations],
                    ['Power Constraints & Exhaustion', selectedRecord.abilityConstraints],
                    ['Limitations & Inheritance', selectedRecord.limitations],
                  ].map(([title, text]) => (
                    <section key={title}>
                      <h4>{title}</h4>
                      <p>{text || 'Not specified in this record.'}</p>
                    </section>
                  ))}
                </div>

                {detail?.habitats?.[0]?.domesticationStatus && (
                  <dl className="species-facts species-ecology-facts">
                    <div><dt>Ecological Role</dt><dd>{detail.habitats[0].ecologicalRole}</dd></div>
                    <div><dt>Domestication</dt><dd>{detail.habitats[0].domesticationStatus}</dd></div>
                    <div><dt>Conservation</dt><dd>{detail.habitats[0].conservationStatus}</dd></div>
                    <div><dt>Migration</dt><dd>{detail.habitats[0].migrationPattern}</dd></div>
                  </dl>
                )}

                <p className="species-power-note">
                  Individual hereditary potential, education, training, experience, and exceptional awakening
                  determine a character’s manifested abilities. Species-wide potential does not grant every listed power.
                </p>

                {detail && detail.related.length > 0 && (
                  <section className="species-related" aria-label="Related species">
                    <h4>Related Registry Entries</h4>
                    <div className="species-related-chips">
                      {detail.related.map(rel => (
                        <button
                          key={rel.id}
                          type="button"
                          onClick={() => openProfile(rel.id)}
                        >
                          <strong>{rel.name}</strong>
                          <small>{rel.id} · {rel.realm}</small>
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                <details className="species-source-notes">
                  <summary>Archival References &amp; Provenance {loadingDetail ? '(updating…)' : ''}</summary>
                  {!publicMode && selectedRecord.status && (
                    <dl>
                      <dt>Canon Status (Developer Archive)</dt><dd>{selectedRecord.status}</dd>
                      {selectedRecord.profileStatus && <><dt>Profile Notes</dt><dd>{selectedRecord.profileStatus}</dd></>}
                      {selectedRecord.powerReview && <><dt>Power Review</dt><dd>{selectedRecord.powerReview}</dd></>}
                    </dl>
                  )}
                  {(detail?.references || selectedRecord.powerReferences || []).length > 0 ? (
                    <ul>
                      {(detail?.references || selectedRecord.powerReferences || []).map((ref, idx) => (
                        <li key={`${ref.url}-${idx}`}>
                          {/^https:\/\//.test(ref.url)
                            ? <a href={ref.url} target="_blank" rel="noopener noreferrer">{ref.title}</a>
                            : ref.title}
                          <small>{ref.verification}</small>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No external research references recorded for this entry.</p>
                  )}
                </details>
              </article>
            </div>
          )}
        </div>
      </div>

      {/* TAB 2: ANGELIC CHOIRS & CELESTIAL */}
      <div
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-celestial`}
        hidden={activeTab !== 'celestial'}
      >
        <div className="species-panel-inner">
          <p className="species-practice-note">
            {celestial?.note || 'Angelic choirs are separate from biological ancestry, royal dynasties, and ancient ancestral Houses.'}
          </p>
          <h3 className="species-section-title">The Nine Angelic Choirs</h3>
          <div className="species-card-grid">
            {(celestial?.choirs || []).map(choir => (
              <article key={choir.speciesId} className="species-mini-card">
                <span className="species-record-id">{choir.speciesId} · {choir.sphere}</span>
                <h4>{choir.name}</h4>
                <p>{choir.description}</p>
                <button type="button" onClick={() => openProfile(choir.speciesId)}>Inspect full profile</button>
              </article>
            ))}
          </div>
          <h3 className="species-section-title">Celestial Beings &amp; Hybrid Lineages</h3>
          <div className="species-card-grid">
            {(celestial?.celestialAndHybridLineages || []).map(item => (
              <article key={item.id} className="species-mini-card">
                <span className="species-record-id">{item.id} · {item.family}</span>
                <h4>{item.name}</h4>
                <p>{item.description}</p>
                <button type="button" onClick={() => openProfile(item.id)}>Inspect full profile</button>
              </article>
            ))}
          </div>
        </div>
      </div>

      {/* TAB 3: MAGICAL DISCIPLINES & WITCHCRAFT */}
      <div
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-disciplines`}
        hidden={activeTab !== 'disciplines'}
      >
        <div className="species-panel-inner">
          <p className="species-practice-note">
            {disciplines?.witchcraftRule || 'Witchcraft is exclusive to Witchkind. Other species may learn general magic and other magical crafts.'}
          </p>
          <h3 className="species-section-title">Magical Practitioners ({disciplines?.practitioners.length || 0})</h3>
          <div className="species-card-grid">
            {(disciplines?.practitioners || []).map(item => (
              <article key={item.speciesId} className="species-mini-card">
                <span className="species-record-id">
                  {item.speciesId}
                  {item.speciesRestriction ? ` · ${item.speciesRestriction} only` : ''}
                  {item.genderRestriction ? ` · ${item.genderRestriction}` : ''}
                </span>
                <h4>{item.name}</h4>
                <p>{item.description}</p>
                <button type="button" onClick={() => openProfile(item.speciesId)}>Inspect full profile</button>
              </article>
            ))}
          </div>
          <h3 className="species-section-title">Witchcraft Traditions — Witchkind Exclusive ({disciplines?.witchTraditions.length || 0})</h3>
          <div className="species-card-grid">
            {(disciplines?.witchTraditions || []).map(item => (
              <article key={item.speciesId} className="species-mini-card">
                <span className="species-record-id">{item.speciesId} · {item.realm} · {item.affinity}</span>
                <h4>{item.name}</h4>
                <p>{item.description}</p>
                <button type="button" onClick={() => openProfile(item.speciesId)}>Inspect full profile</button>
              </article>
            ))}
          </div>
          <h3 className="species-section-title">Attained Supernatural Statuses ({disciplines?.supernaturalStatuses.length || 0})</h3>
          <div className="species-card-grid">
            {(disciplines?.supernaturalStatuses || []).map(item => (
              <article key={item.speciesId} className="species-mini-card">
                <span className="species-record-id">{item.speciesId} · {item.attainmentKind}</span>
                <h4>{item.name}</h4>
                <p>{item.description}</p>
                <button type="button" onClick={() => openProfile(item.speciesId)}>Inspect full profile</button>
              </article>
            ))}
          </div>
        </div>
      </div>

      {/* TAB 4: FAUNA & WILDLIFE */}
      <div
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-wildlife`}
        hidden={activeTab !== 'wildlife'}
      >
        <div className="species-panel-inner">
          <div className="species-wildlife-controls">
            <label>
              Filter Realm
              <select value={wildlifeRealm} onChange={e => setWildlifeRealm(e.target.value)}>
                <option value="">All realms</option>
                {(facets?.realms || []).map(r => (
                  <option key={r.name} value={r.name}>{r.name}</option>
                ))}
              </select>
            </label>
            <label className="species-checkbox-label">
              <input
                type="checkbox"
                checked={wildlifeTransportOnly}
                onChange={e => setWildlifeTransportOnly(e.target.checked)}
              />
              Transport &amp; Carriage Fauna only (Pegasi &amp; Working Equines)
            </label>
          </div>
          <p className="species-results-summary">{wildlife.length} aggregated wildlife populations tracked in living-world simulation.</p>
          <div className="species-card-grid">
            {wildlife.slice(0, 60).map(pop => (
              <article key={pop.populationId} className="species-mini-card">
                <span className="species-record-id">
                  {pop.speciesId} · {pop.realm} · {pop.faunaClass === 'magical_animal' ? 'Magical Fauna' : 'Ordinary Fauna'}
                </span>
                <h4>{pop.name}</h4>
                <p><strong>Role:</strong> {pop.ecologicalRole} · <strong>Status:</strong> {pop.domesticationStatus}</p>
                <p>
                  <strong>Est. Population:</strong> {pop.estimatedPopulation.toLocaleString()} ·{' '}
                  <strong>Conservation:</strong> {pop.conservationStatus} · {pop.migrationStatus}
                </p>
                {pop.transportCapable && <span className="species-badge species-badge-sapient">Transport / Carriage Eligible</span>}
                <button type="button" onClick={() => openProfile(pop.speciesId)}>Inspect species profile</button>
              </article>
            ))}
          </div>
        </div>
      </div>

      {/* TAB 5: ILLUSTRATED GALLERY */}
      <div
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-gallery`}
        hidden={activeTab !== 'gallery'}
      >
        <div className="species-panel-inner">
          {comparativePlate && (
            <figure className="species-comparative-plate">
              <img src={comparativePlate.url} alt={comparativePlate.title} loading="lazy" />
              <figcaption>{comparativePlate.title} — Offline Illustrated Archive</figcaption>
            </figure>
          )}
          <div className="species-gallery-grid">
            {(facets?.assets || [])
              .filter(a => a.kind === 'specimen' || a.kind === 'study' || a.kind === 'realm_art')
              .map(asset => (
                <figure key={asset.assetId} className="species-gallery-card">
                  <img src={asset.url} alt={asset.title} loading="lazy" />
                  <figcaption>
                    <strong>{asset.title}</strong>
                    <small>{asset.kind.replace('_', ' ')}{asset.realm ? ` · ${asset.realm}` : ''}</small>
                    {asset.speciesId && (
                      <button type="button" onClick={() => openProfile(asset.speciesId!)}>
                        Open {asset.speciesId}
                      </button>
                    )}
                  </figcaption>
                </figure>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}
