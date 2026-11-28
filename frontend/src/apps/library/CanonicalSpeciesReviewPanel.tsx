import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, AlertTriangle, RefreshCw, Save, ShieldCheck } from 'lucide-react';
import {
  fetchCharacterSpeciesReviews,
  fetchSpeciesList,
  fetchCelestialRegistry,
  saveCharacterSpeciesReview,
  validateCharacterSpecies,
  type ApiSpeciesRecord,
  type CharacterSpeciesReviewItem,
} from '../../services/speciesRegistryClient';

const REGIONAL_LINEAGE_SUGGESTIONS = [
  '',
  'Northwake',
  'Southwake',
  'Southwake (Mixed)',
  'Orynvell Regional',
  'Lumia Regional',
  'Marlowe Regional',
  'Brisland Regional',
  'Kaji Regional',
  'Nephele Regional',
  'Ve’Raylia Regional',
];

const SUPERNATURAL_STATUS_OPTIONS = ['Saint', 'Immortal', 'Reincarnated', 'Fallen Angel'];

export default function CanonicalSpeciesReviewPanel() {
  const [characters, setCharacters] = useState<CharacterSpeciesReviewItem[]>([]);
  const [lineages, setLineages] = useState<ApiSpeciesRecord[]>([]);
  const [choirs, setChoirs] = useState<{ speciesId: string; name: string; sphere: string }[]>([]);
  const [fromBackend, setFromBackend] = useState(false);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [realmFilter, setRealmFilter] = useState('');
  const [onlyFlagged, setOnlyFlagged] = useState(true);
  const [selectedId, setSelectedId] = useState<string>('');

  // Editable draft for selected canonical character
  const [speciesId, setSpeciesId] = useState('');
  const [regionalLineage, setRegionalLineage] = useState('');
  const [primaryAffinity, setPrimaryAffinity] = useState('');
  const [angelicChoirId, setAngelicChoirId] = useState('');
  const [specializationsText, setSpecializationsText] = useState('');
  const [statuses, setStatuses] = useState<string[]>([]);
  const [reviewNotes, setReviewNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'err' | 'warn'; text: string } | null>(null);

  const reload = async () => {
    setLoading(true);
    const [rev, sp, cel] = await Promise.all([
      fetchCharacterSpeciesReviews(),
      fetchSpeciesList({ classification: 'sapient', limit: 300 }),
      fetchCelestialRegistry(),
    ]);
    setCharacters(rev.characters);
    setFromBackend(rev.fromBackend);
    setLineages(sp.records.filter(r => r.isPlayableLineage !== false));
    setChoirs(cel?.choirs || []);
    setLoading(false);
    if (!selectedId && rev.characters.length > 0) {
      setSelectedId(rev.characters[0].characterId);
    }
  };

  useEffect(() => { reload(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return characters.filter(c => {
      if (onlyFlagged && !c.classificationReviewNeeded) return false;
      if (realmFilter && (c.homeRealm || 'Unspecified') !== realmFilter) return false;
      if (!q) return true;
      return [c.name, c.characterId, c.maid || '', c.homeRealm || '', c.occupation || '', c.reviewNotes || '']
        .some(v => v.toLowerCase().includes(q));
    });
  }, [characters, search, realmFilter, onlyFlagged]);

  const selected = useMemo(
    () => filtered.find(c => c.characterId === selectedId) || filtered[0] || null,
    [filtered, selectedId],
  );

  useEffect(() => {
    if (!selected) return;
    setSpeciesId(selected.speciesId || '');
    setRegionalLineage(selected.regionalLineage || '');
    setPrimaryAffinity(selected.primaryAffinity || '');
    setAngelicChoirId(selected.angelicChoirId || '');
    setSpecializationsText((selected.magicalSpecializations || []).join(', '));
    setStatuses(selected.supernaturalStatuses || []);
    setReviewNotes(selected.reviewNotes || '');
    setFeedback(null);
  }, [selected?.characterId]);

  const realms = useMemo(
    () => [...new Set(characters.map(c => c.homeRealm || 'Unspecified'))].sort(),
    [characters],
  );

  const flaggedTotal = useMemo(
    () => characters.filter(c => c.classificationReviewNeeded).length,
    [characters],
  );

  const toggleStatus = (name: string) => {
    setStatuses(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]);
  };

  const handleSave = async (approveReview: boolean) => {
    if (!selected) return;
    setSaving(true);
    setFeedback(null);
    const specs = specializationsText.split(',').map(s => s.trim()).filter(Boolean);

    // Run canonical validation first
    const validation = await validateCharacterSpecies({
      speciesId: speciesId || undefined,
      practice: specs[0],
      angelicChoir: angelicChoirId || undefined,
      supernaturalStatus: statuses[0],
      nativeRealm: selected.homeRealm || undefined,
    });

    if (!validation.valid) {
      setSaving(false);
      setFeedback({ kind: 'err', text: validation.errors.join(' ') });
      return;
    }

    const res = await saveCharacterSpeciesReview(selected.characterId, {
      speciesId: speciesId || null,
      primaryAffinity: primaryAffinity || null,
      regionalLineage: regionalLineage || null,
      nativeRealm: selected.homeRealm || null,
      angelicChoirId: angelicChoirId || null,
      magicalSpecializations: specs,
      supernaturalStatuses: statuses,
      classificationReviewNeeded: !approveReview,
      reviewNotes: reviewNotes || null,
    });
    setSaving(false);

    if (!res.saved) {
      setFeedback({ kind: 'err', text: res.error || 'Failed to save classification.' });
      return;
    }

    const warnSuffix = validation.warnings.length ? ` Note: ${validation.warnings.join(' ')}` : '';
    setFeedback({
      kind: validation.warnings.length ? 'warn' : 'ok',
      text: `${approveReview ? 'Approved and saved' : 'Saved draft'} for ${selected.name} in miraverse.db.${warnSuffix}`,
    });
    await reload();
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs text-slate-800" aria-label="Canonical Character Species Review">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 mb-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-indigo-700">
            <ShieldCheck size={14} />
            <span>Canonical Character Species Review Queue</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
              {flaggedTotal} / {characters.length} Flagged
            </span>
          </div>
          <p className="text-xs text-slate-600 mt-1">
            Existing canonical characters retain their original MAIDs, histories, and affiliations. Review and explicitly approve species classifications here; provisional species lore remains untouched.
          </p>
        </div>
        <button
          type="button"
          onClick={reload}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </header>

      {!loading && !fromBackend && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          Backend API (`/api/canonical/species/character-reviews`) is not reachable. Start the MiraverseOSx host on port 5000 to review and persist canonical species assignments.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search canonical name, MAID, occupation…"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
        />
        <select
          value={realmFilter}
          onChange={e => setRealmFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs bg-white"
        >
          <option value="">All realms</option>
          {realms.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 px-2">
          <input
            type="checkbox"
            checked={onlyFlagged}
            onChange={e => setOnlyFlagged(e.target.checked)}
          />
          Show only flagged for review ({flaggedTotal})
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 max-h-[520px] overflow-auto space-y-1.5 pr-1">
          {filtered.map(c => (
            <button
              key={c.characterId}
              type="button"
              onClick={() => setSelectedId(c.characterId)}
              className={`w-full text-left rounded-lg border p-2.5 transition cursor-pointer ${
                selected?.characterId === c.characterId
                  ? 'border-indigo-500 bg-indigo-50/70'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <strong className="text-xs text-slate-900">{c.name}</strong>
                {c.classificationReviewNeeded ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                    <AlertTriangle size={10} /> Review
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                    <CheckCircle2 size={10} /> Approved
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {c.homeRealm || 'Unspecified Realm'} · {c.maid || c.characterId}
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5">
                {c.speciesName ? `Species: ${c.speciesName} (${c.speciesId})` : 'Species: Unassigned'}
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500">
              No canonical characters match the current filter.
            </div>
          )}
        </div>

        <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          {!selected ? (
            <p className="text-xs text-slate-500">Select a canonical character to review.</p>
          ) : (
            <div className="space-y-3">
              <div className="border-b border-slate-200 pb-2">
                <h3 className="text-base font-bold text-slate-900">{selected.name}</h3>
                <p className="text-xs text-slate-600">
                  ID: <code>{selected.characterId}</code> · MAID: <code>{selected.maid || 'None'}</code> · Realm: <strong>{selected.homeRealm || 'Unspecified'}</strong> · Role: {selected.occupation || selected.kind}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                  Biological Species / Lineage
                  <select
                    value={speciesId}
                    onChange={e => {
                      const nextId = e.target.value;
                      setSpeciesId(nextId);
                      const rec = lineages.find(l => l.id === nextId);
                      if (rec && !primaryAffinity) setPrimaryAffinity(rec.affinity);
                    }}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-normal"
                  >
                    <option value="">— Unassigned (keep for review) —</option>
                    {lineages.map(sp => (
                      <option key={sp.id} value={sp.id}>
                        {sp.id} · {sp.name} ({sp.realm} — {sp.category})
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                  Regional Lineage (e.g. Northwake / Southwake)
                  <select
                    value={regionalLineage}
                    onChange={e => setRegionalLineage(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-normal"
                  >
                    {REGIONAL_LINEAGE_SUGGESTIONS.map(opt => (
                      <option key={opt} value={opt}>{opt || '— None / Unspecified —'}</option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                  Primary Elemental Affinity
                  <input
                    type="text"
                    value={primaryAffinity}
                    onChange={e => setPrimaryAffinity(e.target.value)}
                    placeholder="e.g. Winter / Ice, Aether / Celestial"
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-normal"
                  />
                </label>

                <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                  Angelic Choir Affiliation (Separate from Ancestry)
                  <select
                    value={angelicChoirId}
                    onChange={e => setAngelicChoirId(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-normal"
                  >
                    <option value="">— None —</option>
                    {choirs.map(ch => (
                      <option key={ch.speciesId} value={ch.speciesId}>
                        {ch.name} ({ch.sphere})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                Magical Specializations / Practices (comma-separated; Witchcraft restricted to Witchkind)
                <input
                  type="text"
                  value={specializationsText}
                  onChange={e => setSpecializationsText(e.target.value)}
                  placeholder="e.g. Mage, Runesmith, Techno Witch"
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-normal"
                />
              </label>

              <div>
                <div className="text-xs font-semibold text-slate-700 mb-1">
                  Attained Supernatural Statuses (Never auto-assigned)
                </div>
                <div className="flex flex-wrap gap-2">
                  {SUPERNATURAL_STATUS_OPTIONS.map(st => (
                    <label key={st} className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs cursor-pointer">
                      <input type="checkbox" checked={statuses.includes(st)} onChange={() => toggleStatus(st)} />
                      {st}
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex flex-col gap-1 text-xs font-semibold text-slate-700">
                Archival Review Notes
                <textarea
                  rows={2}
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-normal"
                />
              </label>

              {feedback && (
                <div
                  role="status"
                  className={`rounded-lg border p-2.5 text-xs ${
                    feedback.kind === 'err'
                      ? 'border-rose-300 bg-rose-50 text-rose-800'
                      : feedback.kind === 'warn'
                        ? 'border-amber-300 bg-amber-50 text-amber-900'
                        : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                  }`}
                >
                  {feedback.text}
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  disabled={saving || !fromBackend}
                  onClick={() => handleSave(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                >
                  <Save size={13} />
                  Approve &amp; Save to miraverse.db
                </button>
                <button
                  type="button"
                  disabled={saving || !fromBackend}
                  onClick={() => handleSave(false)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                >
                  Save Draft (Keep Flagged)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
