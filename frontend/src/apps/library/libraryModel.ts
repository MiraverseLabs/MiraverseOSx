export type LibraryCardTier = 'citizen' | 'scholar' | 'royal-researcher';

export interface LibraryCard {
  cardNumber: string;
  holderName: string;
  maid: string;
  homeBranch: string;
  tier: LibraryCardTier;
  tierLabel: string;
  borrowLimit: number;
  issuedCycle: number;
  issuedAt: string;
  status: 'Active' | 'Renewed';
}

export interface LibraryCatalogItem {
  id: string;
  title: string;
  authors: string[];
  year: string;
  field: string;
  collection: string;
  format: 'arch' | 'pdf' | 'doc' | 'map';
  citations: number;
  tldr: string;
  abstract: string;
  callNumber: string;
  coverTone: 'navy' | 'emerald' | 'plum' | 'amber' | 'slate';
  restrictedTier?: LibraryCardTier;
}

export interface LibraryGuide {
  id: string;
  title: string;
  subject: string;
  type: 'Subject Guide' | 'Course Guide' | 'Archival Finding Aid' | 'Civic Policy';
  curator: string;
  summary: string;
  targetCollection?: 'academic-projects' | 'realms' | 'chronology' | 'exploration' | 'factions' | 'locations' | 'npcs';
}

export interface LibraryLoan {
  itemId: string;
  checkedOutCycle: number;
  dueCycle: number;
  progress: number; // 0..100
}

export interface LibraryState {
  card: LibraryCard | null;
  loans: LibraryLoan[];
  completedIds: string[];
  savedReadingListIds: string[];
  viewedGuideIds: string[];
  reflections: string;
  readingGoal: number;
}

export const LIBRARY_BRANCHES = [
  'Aureline Central Library',
  'Royal Historic Society · Sovereign Vault',
  'Dawn Court Concord Reading Hall',
  'Cyberium Lantern Cloister Library',
] as const;

export const LIBRARY_CARD_TIERS: Record<
  LibraryCardTier,
  { label: string; borrowLimit: number; minClearance: number; description: string }
> = {
  citizen: {
    label: 'Citizen Public Reader',
    borrowLimit: 3,
    minClearance: 1,
    description: 'Standard civic borrowing across Meridion Public Archives and Aureline City Library.',
  },
  scholar: {
    label: 'Academic Scholar Pass',
    borrowLimit: 5,
    minClearance: 2,
    description: 'Extended circulation for Cyberium Academy, Dawn University, and Regent Hall research collections.',
  },
  'royal-researcher': {
    label: 'Royal Archive Researcher',
    borrowLimit: 8,
    minClearance: 3,
    description: 'Authorized reading room access to sealed dynastic charters, succession records, and Veil manuscripts.',
  },
};

export const LIBRARY_AUTHORS = [
  { name: 'Queen Maeryn Seraphima', publications: 18, citations: 4820, field: 'Constitutional History' },
  { name: 'Archivist Veyra Solenne', publications: 42, citations: 3190, field: 'Dynastic Archives' },
  { name: 'Headmistress Vael', publications: 29, citations: 2740, field: 'PRISM & Signal Systems' },
  { name: 'Prof. Aldous Thorne', publications: 34, citations: 1985, field: 'Eight-Realm Geography' },
] as const;

export const LIBRARY_CATALOG: readonly LibraryCatalogItem[] = [
  {
    id: 'cat-seraphima-charter',
    title: 'The Pre-Collapse Seraphima Succession Charter & Matriarchal Covenant',
    authors: ['Queen Maeryn Seraphima', 'Archivist Veyra Solenne'],
    year: 'Year 0 (Founding)',
    field: 'Constitutional History',
    collection: 'Royal Historic Society',
    format: 'arch',
    citations: 1420,
    tldr: 'Establishes the founding territorial sovereignty of the Eight Realms distinct from the Seven Color Houses.',
    abstract:
      'Primary parchment charter ratified at Aureline following the Final Exodus. Defines the constitutional boundary between royal realm governance and Color House jurisdiction.',
    callNumber: 'RHS-CHARTER-001',
    coverTone: 'navy',
    restrictedTier: 'royal-researcher',
  },
  {
    id: 'cat-twin-moons',
    title: 'Orbital Mechanics of the Twin Moons and the Meridion Civil Calendar',
    authors: ['Prof. Aldous Thorne', 'Archivist Veyra Solenne'],
    year: 'Year 18',
    field: 'Celestial Chronology',
    collection: 'Meridion Public Archives',
    format: 'pdf',
    citations: 684,
    tldr: 'Reconciles lunar phase cycles, seasonal shifts, and regional climate variance across Orynvell, Fross, and Kaji.',
    abstract:
      'A comprehensive almanac detailing ordinary lunar phases, rare conjunctions, and their civic observance across the Eight Realms.',
    callNumber: 'MPA-AST-204',
    coverTone: 'amber',
  },
  {
    id: 'cat-prism-veil',
    title: 'Non-Invasive Resonance Diagnostics: PRISM Architecture and the Concealed Veil',
    authors: ['Headmistress Vael'],
    year: 'Year 22',
    field: 'Signal Systems',
    collection: 'Cyberium Academy Press',
    format: 'pdf',
    citations: 912,
    tldr: 'Distinguishes ordinary magical practice from PRISM resonance pathways and documents safe containment protocols for carrier bleed.',
    abstract:
      'Foundational monograph for Cyberium Academy signal systems fellows examining AETHERCORE relays, harmonic scoring, and SealLockCrypt containment.',
    callNumber: 'CY-SIG-512',
    coverTone: 'plum',
    restrictedTier: 'scholar',
  },
  {
    id: 'cat-house-tribunal',
    title: 'Color House Affiliation, Petitions, and Independent Appellate Review',
    authors: ['Archivist Veyra Solenne'],
    year: 'Year 20',
    field: 'Civic Law',
    collection: 'Dawn University Jurisprudence',
    format: 'doc',
    citations: 531,
    tldr: 'Explains how permanent Primary House records, Secondary House transfers, and independent appellate panels safeguard citizen rights.',
    abstract:
      'Annotated legal handbook used by Dawn University and the AURA Citizen Registry covering birth affiliation, tribunal petitions, and record integrity.',
    callNumber: 'DU-LAW-118',
    coverTone: 'emerald',
  },
  {
    id: 'cat-glassline-atlas',
    title: 'Cartographic Survey of Aureline Districts and the Glassline Sub-Conduit',
    authors: ['Prof. Aldous Thorne'],
    year: 'Year 23',
    field: 'Eight-Realm Geography',
    collection: 'Aureline City Library',
    format: 'map',
    citations: 419,
    tldr: 'Maps municipal transit junctions, limestone districts, and historical industrial corridors beneath Aureline Central.',
    abstract:
      'Restored municipal blueprints combining surface street grids with subterranean service levels including Sub-Aureline Tunnel 09.',
    callNumber: 'ACL-MAP-089',
    coverTone: 'slate',
  },
  {
    id: 'cat-nephilim-purge',
    title: 'Chronicles of the Nephilim Era (400–300 BM) and the Purge Archives',
    authors: ['Archivist Veyra Solenne', 'Queen Maeryn Seraphima'],
    year: 'Year 4',
    field: 'Historical Archives',
    collection: 'Royal Historic Society',
    format: 'arch',
    citations: 1108,
    tldr: 'Synthesizes surviving pre-founding testimonies and explains why specific lineage folios remain under archival seal.',
    abstract:
      'Curated archival volume preserving verified accounts from the Nephilim Era through the Final Exodus, cross-indexed with Royal Historic Society provenance seals.',
    callNumber: 'RHS-PURGE-014',
    coverTone: 'navy',
    restrictedTier: 'scholar',
  },
];

export const LIBRARY_GUIDES: readonly LibraryGuide[] = [
  { id: 'g-realms', title: 'Eight Realms Geography & Borderlands', subject: 'Geography', type: 'Subject Guide', curator: 'Prof. Aldous Thorne', summary: 'Territorial overview of Orynvell, Fross, Lumia, Marlowe, Brisland, Kaji, Nephele, and Ve’Raylia.', targetCollection: 'realms' },
  { id: 'g-chronology', title: 'Twin Moons & Meridion Civil Chronology', subject: 'Chronology', type: 'Subject Guide', curator: 'Archivist Veyra Solenne', summary: 'Founding dates, Nephilim Era timelines, celestial alignments, and seasonal cycles.', targetCollection: 'chronology' },
  { id: 'g-houses', title: 'Seven Color Houses & Tribunal Procedure', subject: 'Civic Law', type: 'Civic Policy', curator: 'Archivist Veyra Solenne', summary: 'Jurisdiction of Crimson, Violet, Gold, Teal, Silver, Emerald, and White Houses and appellate review.', targetCollection: 'factions' },
  { id: 'g-cyberium', title: 'CY 101 — Cybernetics, Spell Engineering & Signal Systems', subject: 'Signal Systems', type: 'Course Guide', curator: 'Headmistress Vael', summary: 'Assigned reading, laboratory citations, and archival references for Cyberium Academy students.', targetCollection: 'academic-projects' },
  { id: 'g-dawn', title: 'DU 201 — Civic Studies, Public Policy & Arcane Humanities', subject: 'Civic Law', type: 'Course Guide', curator: 'Dawn Concord Desk', summary: 'Primary public-policy texts, legal precedents, and Aether ecology references for Dawn University.', targetCollection: 'academic-projects' },
  { id: 'g-regent', title: 'RHU 300 — Royal Protocol, Succession & Constitutional Law', subject: 'Constitutional History', type: 'Course Guide', curator: 'Royal Historic Society', summary: 'Inter-realm diplomacy, sovereign charters, and council governance curated for Regent Hall pathways.', targetCollection: 'factions' },
  { id: 'g-shrines', title: 'Elemental Shrines & Regional Expedition Logs', subject: 'Geography', type: 'Archival Finding Aid', curator: 'Prof. Aldous Thorne', summary: 'Field records for the eight regional elemental anchors and verified expedition discoveries.', targetCollection: 'locations' },
  { id: 'g-monarchs', title: 'Lineages, Monarchs & Notable Citizens Index', subject: 'Constitutional History', type: 'Archival Finding Aid', curator: 'Archivist Veyra Solenne', summary: 'Biographical dossiers on Queen Maeryn Seraphima, academy faculty, and civic figures.', targetCollection: 'npcs' },
  { id: 'g-journal', title: 'Field Discovery & Archival Citation Standards', subject: 'Research Methods', type: 'Civic Policy', curator: 'Aureline City Library', summary: 'How to cite Royal Historic Society manuscripts, preserve provenance, and archive copies in Fylo.', targetCollection: 'exploration' },
];

export function emptyLibraryState(): LibraryState {
  return {
    card: null,
    loans: [],
    completedIds: [],
    savedReadingListIds: ['cat-twin-moons'],
    viewedGuideIds: [],
    reflections: '',
    readingGoal: 6,
  };
}

export function restoreLibraryState(raw: unknown): LibraryState {
  const base = emptyLibraryState();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
  const saved = raw as Partial<LibraryState>;
  const validItemIds = new Set(LIBRARY_CATALOG.map(i => i.id));
  const validGuideIds = new Set(LIBRARY_GUIDES.map(g => g.id));

  let card: LibraryCard | null = null;
  if (saved.card && typeof saved.card === 'object' && typeof saved.card.cardNumber === 'string' && saved.card.cardNumber.trim()) {
    const tier: LibraryCardTier =
      saved.card.tier === 'royal-researcher' || saved.card.tier === 'scholar' ? saved.card.tier : 'citizen';
    card = {
      cardNumber: saved.card.cardNumber.trim(),
      holderName: typeof saved.card.holderName === 'string' && saved.card.holderName.trim() ? saved.card.holderName.trim() : 'Citizen Reader',
      maid: typeof saved.card.maid === 'string' ? saved.card.maid : 'MAID-PENDING',
      homeBranch: typeof saved.card.homeBranch === 'string' && saved.card.homeBranch.trim() ? saved.card.homeBranch : LIBRARY_BRANCHES[0],
      tier,
      tierLabel: LIBRARY_CARD_TIERS[tier].label,
      borrowLimit: LIBRARY_CARD_TIERS[tier].borrowLimit,
      issuedCycle: Number.isFinite(saved.card.issuedCycle) ? Math.max(0, Math.floor(saved.card.issuedCycle)) : 0,
      issuedAt: typeof saved.card.issuedAt === 'string' ? saved.card.issuedAt : new Date().toISOString(),
      status: saved.card.status === 'Renewed' ? 'Renewed' : 'Active',
    };
  }

  const loans = Array.isArray(saved.loans)
    ? saved.loans
        .filter((l): l is LibraryLoan => Boolean(l && typeof l.itemId === 'string' && validItemIds.has(l.itemId)))
        .map(l => ({
          itemId: l.itemId,
          checkedOutCycle: Number.isFinite(l.checkedOutCycle) ? Math.max(0, Math.floor(l.checkedOutCycle)) : 0,
          dueCycle: Number.isFinite(l.dueCycle) ? Math.max(1, Math.floor(l.dueCycle)) : 7,
          progress: Number.isFinite(l.progress) ? Math.max(0, Math.min(100, Math.floor(l.progress))) : 0,
        }))
    : [];

  return {
    card,
    loans,
    completedIds: Array.isArray(saved.completedIds) ? [...new Set(saved.completedIds.filter(id => validItemIds.has(id)))] : [],
    savedReadingListIds: Array.isArray(saved.savedReadingListIds)
      ? [...new Set(saved.savedReadingListIds.filter(id => validItemIds.has(id)))]
      : base.savedReadingListIds,
    viewedGuideIds: Array.isArray(saved.viewedGuideIds) ? [...new Set(saved.viewedGuideIds.filter(id => validGuideIds.has(id)))] : [],
    reflections: typeof saved.reflections === 'string' ? saved.reflections.slice(0, 4000) : '',
    readingGoal: Number.isFinite(saved.readingGoal) ? Math.max(1, Math.min(50, Math.floor(saved.readingGoal!))) : 6,
  };
}

const TIER_RANK: Record<LibraryCardTier, number> = { citizen: 1, scholar: 2, 'royal-researcher': 3 };

export function issueOrRenewLibraryCard(
  state: LibraryState,
  input: { holderName: string; maid: string; homeBranch: string; tier: LibraryCardTier; clearance: number; cycle: number },
): { state: LibraryState; card?: LibraryCard; ok: boolean; reason: string } {
  const holderName = (input.holderName || '').trim();
  if (!holderName) return { state, ok: false, reason: 'Enter the patron’s full name to issue a Royal Library Card.' };
  const tierSpec = LIBRARY_CARD_TIERS[input.tier] || LIBRARY_CARD_TIERS.citizen;
  if ((input.clearance ?? 1) < tierSpec.minClearance) {
    return {
      state,
      ok: false,
      reason: `${tierSpec.label} requires Clearance ${tierSpec.minClearance}. Choose Citizen Public Reader or raise your clearance.`,
    };
  }
  const existing = state.card;
  const suffix = existing
    ? existing.cardNumber
    : `RHS-LIB-${String(2026 + Math.floor((input.cycle || 0) / 12))}-${String(Math.floor(1000 + Math.random() * 9000))}`;

  const card: LibraryCard = {
    cardNumber: suffix,
    holderName,
    maid: (input.maid || '').trim() || 'MAID-OR-CITIZEN',
    homeBranch: input.homeBranch || LIBRARY_BRANCHES[0],
    tier: input.tier,
    tierLabel: tierSpec.label,
    borrowLimit: tierSpec.borrowLimit,
    issuedCycle: input.cycle,
    issuedAt: new Date().toISOString(),
    status: existing ? 'Renewed' : 'Active',
  };
  return {
    state: { ...state, card },
    card,
    ok: true,
    reason: existing
      ? `Library card ${card.cardNumber} updated to ${card.tierLabel}.`
      : `Issued Royal Library Card ${card.cardNumber} (${card.tierLabel}).`,
  };
}

export function borrowCatalogItem(
  state: LibraryState,
  itemId: string,
  cycle: number,
): { state: LibraryState; ok: boolean; reason: string } {
  if (!state.card) return { state, ok: false, reason: 'Issue a Royal Library Card first to borrow volumes.' };
  const item = LIBRARY_CATALOG.find(i => i.id === itemId);
  if (!item) return { state, ok: false, reason: 'Volume not found in catalog.' };
  if (item.restrictedTier && TIER_RANK[state.card.tier] < TIER_RANK[item.restrictedTier]) {
    return {
      state,
      ok: false,
      reason: `This volume requires ${LIBRARY_CARD_TIERS[item.restrictedTier].label} privileges.`,
    };
  }
  if (state.loans.some(l => l.itemId === itemId)) {
    return { state, ok: false, reason: 'You already have this volume checked out.' };
  }
  if (state.loans.length >= state.card.borrowLimit) {
    return { state, ok: false, reason: `Borrow limit reached (${state.card.borrowLimit} active loans). Return a volume first.` };
  }
  const loan: LibraryLoan = { itemId, checkedOutCycle: cycle, dueCycle: cycle + 7, progress: 15 };
  return {
    state: { ...state, loans: [loan, ...state.loans] },
    ok: true,
    reason: `Checked out "${item.title}" (${item.callNumber}). Due Cycle ${loan.dueCycle}.`,
  };
}

export function updateLoanProgress(
  state: LibraryState,
  itemId: string,
  delta = 35,
): { state: LibraryState; ok: boolean; completed: boolean; reason: string } {
  const loan = state.loans.find(l => l.itemId === itemId);
  if (!loan) return { state, ok: false, completed: false, reason: 'Volume is not currently checked out.' };
  const nextProgress = Math.min(100, loan.progress + delta);
  const completed = nextProgress >= 100;
  const loans = state.loans.map(l => (l.itemId === itemId ? { ...l, progress: nextProgress } : l));
  const completedIds = completed ? [...new Set([...state.completedIds, itemId])] : state.completedIds;
  return {
    state: { ...state, loans, completedIds },
    ok: true,
    completed,
    reason: completed ? 'Completed reading volume! Logged in your reading record.' : `Reading progress updated to ${nextProgress}%.`,
  };
}

export function returnCatalogItem(
  state: LibraryState,
  itemId: string,
): { state: LibraryState; ok: boolean; reason: string } {
  if (!state.loans.some(l => l.itemId === itemId)) return { state, ok: false, reason: 'Volume is not checked out.' };
  return {
    state: { ...state, loans: state.loans.filter(l => l.itemId !== itemId) },
    ok: true,
    reason: 'Volume returned to the Royal Historic Archive.',
  };
}

export function formatArchivalCitation(item: LibraryCatalogItem): string {
  return `${item.authors.join(', ')}. (${item.year}). "${item.title}." ${item.collection}, Call No. ${item.callNumber}.`;
}
