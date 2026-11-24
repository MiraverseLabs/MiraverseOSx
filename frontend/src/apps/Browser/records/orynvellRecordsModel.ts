export type CustodianshipType =
  | 'Primary Custodian'
  | 'Authorized Repository'
  | 'Connected Source'
  | 'Reference Only';

export type JurisdictionType =
  | 'Central Records Administration'
  | 'Municipal / Regional Office'
  | 'Affiliated Institutional Source';

export type RecordCategory =
  | 'Property & Land'
  | 'Civil Registration'
  | 'Business & Organizations'
  | 'Permits & Licensing'
  | 'Government Proceedings'
  | 'Planning & Infrastructure'
  | 'Government Archives'
  | 'Government Publications';

export type AccessClass = 'public' | 'authenticated' | 'restricted' | 'protected';
export type Discoverability = 'publicly-indexed' | 'limited-index' | 'non-discoverable';

export interface PublicRecordEntity {
  name: string;
  role: string;
  effectiveDates: string;
}

export interface PublicRecordVersion {
  version: string;
  date: string;
  summary: string;
  authority: string;
}

export interface PublicRecord {
  id: string;
  title: string;
  category: RecordCategory;
  divisionId: string;
  custodian: string;
  custodianship: CustodianshipType;
  jurisdiction: JurisdictionType;
  district: string;
  registeredDate: string;
  filingStatus: 'accepted' | 'under-review' | 'rejected';
  effectiveStatus: 'current' | 'superseded' | 'expired';
  publicationStatus: 'published' | 'redacted' | 'unpublished';
  preservationStatus: 'active' | 'archived' | 'transferred';
  accessClass: AccessClass;
  discoverability: Discoverability;
  minClearance?: number;
  version: string;
  summary: string;
  structuredFields: Record<string, string>;
  entities: PublicRecordEntity[];
  history: PublicRecordVersion[];
  documentClass: 'Informational Extract' | 'Official Issued Document' | 'Preserved Source Document';
  protectedAuthored?: boolean;
}

export type ServiceRequestType =
  | 'record-access'
  | 'certified-copy'
  | 'correction'
  | 'public-filing'
  | 'status-verification'
  | 'administrative-inquiry';

export type RequestStage =
  | 'submitted'
  | 'intake'
  | 'under-review'
  | 'info-required'
  | 'approved'
  | 'denied'
  | 'fulfilled'
  | 'closed';

export interface IssuedGovernmentDocument {
  docId: string;
  requestId: string;
  recordId: string;
  recordVersion: string;
  title: string;
  documentClass: 'Informational Extract' | 'Official Issued Document' | 'Preserved Source Document';
  issuingAuthority: string;
  issuedCycle: number;
  issuedAt: string;
  bodyText: string;
}

export interface ServiceRequest {
  id: string;
  serviceType: ServiceRequestType;
  serviceLabel: string;
  recordId?: string;
  applicantName: string;
  applicantMaid: string;
  divisionId: string;
  stage: RequestStage;
  details: string;
  feeCredits: number;
  submittedCycle: number;
  updatedCycle: number;
  assignedStaff?: string;
  decisionNote?: string;
  issuedDocId?: string;
  timeline: { cycle: number; stage: string; note: string }[];
}

export interface AuditEvent {
  id: string;
  cycle: number;
  actor: string;
  action: string;
  targetId: string;
  detail: string;
}

export interface OrynvellRecordsState {
  records: PublicRecord[];
  requests: ServiceRequest[];
  issuedDocuments: IssuedGovernmentDocument[];
  savedRecordIds: string[];
  savedSearches: { id: string; query: string; category: string }[];
  draftForm: {
    serviceType: ServiceRequestType;
    recordId: string;
    details: string;
  };
  auditLog: AuditEvent[];
  lastProcessedTick: number;
}

export const ORYNVELL_DIVISIONS = [
  { id: 'land', name: 'Land & Property Records', lead: 'Registrar Maren Halverson', remit: 'Property deeds, parcel registers, ownership histories, surveys, and registered restrictions.' },
  { id: 'civil', name: 'Civil Registration & Identity Records', lead: 'Officer Talia Ren', remit: 'Eligible civil extracts, certificate issuance, and administrative corrections (AURA remains authoritative for identity).' },
  { id: 'licensing', name: 'Licensing, Permits & Public Filings', lead: 'Inspector Corin Vance', remit: 'Business registrations, building permits, operating licenses, and organizational filings.' },
  { id: 'archives', name: 'Government Archives & Publications', lead: 'Archivist Nera Solis', remit: 'Historical government filings, official reports, and cross-references to Royal Historic Society.' },
  { id: 'disclosure', name: 'Records Access & Disclosure', lead: 'Review Officer Kaelen Brooks', remit: 'Access requests, disclosure eligibility, redaction reviews, and reconsiderations.' },
  { id: 'public-services', name: 'Public Services & Records Administration', lead: 'Director Soren Alistair', remit: 'Citizen inquiries, intake routing, certified-copy coordination, and quality control.' },
] as const;

export const RECORD_CATEGORIES: readonly RecordCategory[] = [
  'Property & Land',
  'Civil Registration',
  'Business & Organizations',
  'Permits & Licensing',
  'Government Proceedings',
  'Planning & Infrastructure',
  'Government Archives',
  'Government Publications',
] as const;

export const SERVICE_FAMILIES: {
  id: ServiceRequestType;
  label: string;
  divisionId: string;
  feeCredits: number;
  description: string;
}[] = [
  { id: 'certified-copy', label: 'Certified Copy Request', divisionId: 'public-services', feeCredits: 25, description: 'Request an officially issued, version-stamped certified copy of an eligible record.' },
  { id: 'record-access', label: 'Record Access Request', divisionId: 'disclosure', feeCredits: 0, description: 'Request review and release of a restricted or redacted government record.' },
  { id: 'correction', label: 'Correction or Amendment Request', divisionId: 'civil', feeCredits: 0, description: 'Submit supporting evidence to amend an error without overwriting historical versions.' },
  { id: 'public-filing', label: 'Public Filing Submission', divisionId: 'licensing', feeCredits: 15, description: 'Submit a qualifying business, property, or organizational filing for review.' },
  { id: 'status-verification', label: 'Record Status Verification', divisionId: 'public-services', feeCredits: 10, description: 'Obtain formal verification of a record’s current effective or filing status.' },
  { id: 'administrative-inquiry', label: 'Administrative Inquiry', divisionId: 'public-services', feeCredits: 0, description: 'Ask procedural questions or report a public service discrepancy.' },
];

export const INITIAL_ORYNVELL_RECORDS: PublicRecord[] = [
  {
    id: 'DEED-99401',
    title: 'Subterranean Conduit Sector 7 — Deed & Grid Alignment',
    category: 'Property & Land',
    divisionId: 'land',
    custodian: 'Land & Property Records',
    custodianship: 'Primary Custodian',
    jurisdiction: 'Central Records Administration',
    district: 'Sub-Aureline · Sector 7',
    registeredDate: 'Year 0 (Pre-Collapse Transfer)',
    filingStatus: 'accepted',
    effectiveStatus: 'current',
    publicationStatus: 'redacted',
    preservationStatus: 'archived',
    accessClass: 'public',
    discoverability: 'publicly-indexed',
    version: 'v2.1',
    summary: 'Registered subterranean easement and conduit deed for Sector 7. Historical transfer to Aethercore Energy Trust.',
    structuredFields: {
      Property: 'Subterranean Conduit Sector 7',
      'Registered Owner': 'Aethercore Energy Trust (Pre-Collapse)',
      'Access Key Reference': 'Cipher #0x8891 Verified',
      'Easement Status': 'Classified Energy Grid Alignment',
      'Parcel Identifier': 'ORY-AUR-SUB-07',
    },
    entities: [
      { name: 'Aethercore Energy Trust', role: 'Owner', effectiveDates: 'Pre-Collapse – Present' },
      { name: 'Aureline Municipal Works', role: 'Easement Holder', effectiveDates: 'Year 4 – Present' },
    ],
    history: [
      { version: 'v1.0', date: 'Pre-Collapse', summary: 'Initial subterranean easement registration.', authority: 'Orynvell Crown Registry' },
      { version: 'v2.1', date: 'Year 12', summary: 'Energy grid alignment verified under Cipher #0x8891.', authority: 'Land & Property Records' },
    ],
    documentClass: 'Preserved Source Document',
    protectedAuthored: true,
  },
  {
    id: 'PROP-AUR-4B',
    title: 'Vector House Residential Lease Register — Suite 4B',
    category: 'Property & Land',
    divisionId: 'land',
    custodian: 'Aureline Municipal Housing Office',
    custodianship: 'Authorized Repository',
    jurisdiction: 'Municipal / Regional Office',
    district: 'Glassline District · Aureline Central',
    registeredDate: 'Year 24',
    filingStatus: 'accepted',
    effectiveStatus: 'current',
    publicationStatus: 'published',
    preservationStatus: 'active',
    accessClass: 'public',
    discoverability: 'publicly-indexed',
    version: 'v1.0',
    summary: 'Municipal domicile and parcel compliance filing for Cyberium Academy Vector Housing, Suite 4B.',
    structuredFields: {
      Parcel: 'GL-142-VH-4B',
      Address: '142 Moonwell Way, Glassline District, Aureline Central',
      Zoning: 'Academic Residential · Mixed Civic',
      'Occupancy Compliance': 'Verified Active',
    },
    entities: [
      { name: 'Cyberium Academy Housing Trust', role: 'Custodian', effectiveDates: 'Year 10 – Present' },
      { name: 'Aureline Municipal Housing Office', role: 'Approving Authority', effectiveDates: 'Year 24' },
    ],
    history: [
      { version: 'v1.0', date: 'Year 24', summary: 'Annual residential occupancy compliance filed.', authority: 'Aureline Municipal Housing Office' },
    ],
    documentClass: 'Informational Extract',
  },
  {
    id: 'BIZ-FYLO-01',
    title: 'Fylo Systems — Commercial Software Registration',
    category: 'Business & Organizations',
    divisionId: 'licensing',
    custodian: 'Licensing, Permits & Public Filings',
    custodianship: 'Primary Custodian',
    jurisdiction: 'Central Records Administration',
    district: 'Aureline Central',
    registeredDate: 'Year 21',
    filingStatus: 'accepted',
    effectiveStatus: 'current',
    publicationStatus: 'published',
    preservationStatus: 'active',
    accessClass: 'public',
    discoverability: 'publicly-indexed',
    version: 'v1.2',
    summary: 'Active commercial registration for Fylo Systems, developer of the Fylo personal file-management suite.',
    structuredFields: {
      Entity: 'Fylo Systems',
      'Entity Status': 'Active / Good Standing',
      'Business Classification': 'Personal Digital Storage & Consumer Software',
      'Authoritative Boundary': 'Does not hold institutional record authority',
    },
    entities: [
      { name: 'Fylo Systems', role: 'Filing Party', effectiveDates: 'Year 21 – Present' },
      { name: 'Orynvell Commercial Registry', role: 'Issuer', effectiveDates: 'Year 21' },
    ],
    history: [
      { version: 'v1.0', date: 'Year 21', summary: 'Initial commercial entity incorporation.', authority: 'Licensing, Permits & Public Filings' },
      { version: 'v1.2', date: 'Year 24', summary: 'Annual renewal and software compliance statement.', authority: 'Licensing, Permits & Public Filings' },
    ],
    documentClass: 'Official Issued Document',
  },
  {
    id: 'PRM-GL-12A',
    title: 'Transit Junction 12 — Civic Relay Maintenance Permit',
    category: 'Permits & Licensing',
    divisionId: 'licensing',
    custodian: 'Aureline Transit Authority',
    custodianship: 'Connected Source',
    jurisdiction: 'Municipal / Regional Office',
    district: 'Glassline Terminal Junction 12',
    registeredDate: 'Year 24',
    filingStatus: 'accepted',
    effectiveStatus: 'current',
    publicationStatus: 'published',
    preservationStatus: 'active',
    accessClass: 'public',
    discoverability: 'publicly-indexed',
    version: 'v1.0',
    summary: 'Authorized maintenance and lockout permit for Glassline Terminal Junction 12 relay diagnostics.',
    structuredFields: {
      'Permit Number': 'PRM-GL-12A',
      Site: 'Glassline Terminal Junction 12',
      'Safety Requirement': 'Transit supply isolation and lockout mandatory',
      Validity: 'Current',
    },
    entities: [
      { name: 'Aureline Transit Authority', role: 'Issuer', effectiveDates: 'Year 24' },
    ],
    history: [
      { version: 'v1.0', date: 'Year 24', summary: 'Maintenance permit issued for civic bus relay servicing.', authority: 'Aureline Transit Authority' },
    ],
    documentClass: 'Official Issued Document',
  },
  {
    id: 'PLAN-TUN-09',
    title: 'Sub-Aureline Tunnel 09 — Public Platform Isolation & Carrier Notice',
    category: 'Planning & Infrastructure',
    divisionId: 'disclosure',
    custodian: 'Department of Global Affairs · Response Division',
    custodianship: 'Connected Source',
    jurisdiction: 'Affiliated Institutional Source',
    district: 'Sub-Aureline · Tunnel 09',
    registeredDate: 'Year 24',
    filingStatus: 'accepted',
    effectiveStatus: 'current',
    publicationStatus: 'redacted',
    preservationStatus: 'active',
    accessClass: 'restricted',
    discoverability: 'limited-index',
    minClearance: 2,
    version: 'v1.1',
    summary: 'Public infrastructure isolation notice for Tunnel 09 service level. Technical PRISM telemetry remains under DGA authority.',
    structuredFields: {
      Corridor: 'Sub-Aureline Tunnel 09',
      'Public Platform Status': 'Sealed / Protected',
      'Controlling Authority': 'Department of Global Affairs (Response Division)',
      'Disclosure Level': 'Limited Index — Clearance 2+ for full extract',
    },
    entities: [
      { name: 'Department of Global Affairs', role: 'Custodian', effectiveDates: 'Year 24' },
      { name: 'Aureline Transit Authority', role: 'Related Institution', effectiveDates: 'Year 24' },
    ],
    history: [
      { version: 'v1.0', date: 'Year 24', summary: 'Initial platform seal notice published.', authority: 'Aureline Transit Authority' },
      { version: 'v1.1', date: 'Year 24', summary: 'DGA containment reference appended (Operation 512).', authority: 'Records Access & Disclosure' },
    ],
    documentClass: 'Informational Extract',
    protectedAuthored: true,
  },
  {
    id: 'PROC-2026-09',
    title: 'Royal Council Resolution 2026-09 — Municipal Records Access Standard',
    category: 'Government Proceedings',
    divisionId: 'archives',
    custodian: 'Orynvell Public Records Administration',
    custodianship: 'Primary Custodian',
    jurisdiction: 'Central Records Administration',
    district: 'Aureline Capital District',
    registeredDate: 'Year 24',
    filingStatus: 'accepted',
    effectiveStatus: 'current',
    publicationStatus: 'published',
    preservationStatus: 'active',
    accessClass: 'public',
    discoverability: 'publicly-indexed',
    version: 'v1.0',
    summary: 'Published administrative resolution affirming public search rights, certified copy fees, and custodianship transparency.',
    structuredFields: {
      Resolution: 'PROC-2026-09',
      'Effective Status': 'Current Law',
      'Scope': 'Central Administration & Participating Municipal Offices',
    },
    entities: [
      { name: 'Royal Council of Orynvell', role: 'Approving Authority', effectiveDates: 'Year 24' },
    ],
    history: [
      { version: 'v1.0', date: 'Year 24', summary: 'Adopted and published in the public register.', authority: 'Royal Council of Orynvell' },
    ],
    documentClass: 'Official Issued Document',
  },
  {
    id: 'ARCH-RHS-REF',
    title: 'Reference Index — Pre-Collapse Seraphima Succession Charter',
    category: 'Government Archives',
    divisionId: 'archives',
    custodian: 'Royal Historic Society',
    custodianship: 'Reference Only',
    jurisdiction: 'Affiliated Institutional Source',
    district: 'Aureline Sovereign Vault',
    registeredDate: 'Year 0',
    filingStatus: 'accepted',
    effectiveStatus: 'current',
    publicationStatus: 'published',
    preservationStatus: 'archived',
    accessClass: 'public',
    discoverability: 'publicly-indexed',
    version: 'v1.0',
    summary: 'Administrative catalog reference only. Original parchment charter is held exclusively by the Royal Historic Society.',
    structuredFields: {
      'Original Custodian': 'Royal Historic Society (Call No. RHS-CHARTER-001)',
      'Orynvell Role': 'Reference Only — Consult Royal Archive & Library',
    },
    entities: [
      { name: 'Royal Historic Society', role: 'Primary Custodian', effectiveDates: 'Year 0 – Present' },
    ],
    history: [
      { version: 'v1.0', date: 'Year 0', summary: 'Cross-institutional reference recorded.', authority: 'Government Archives & Publications' },
    ],
    documentClass: 'Informational Extract',
  },
  {
    id: 'PUB-STD-2026',
    title: 'Citizen Guide to Public Records, Redactions, and Certified Copies',
    category: 'Government Publications',
    divisionId: 'public-services',
    custodian: 'Public Services & Records Administration',
    custodianship: 'Primary Custodian',
    jurisdiction: 'Central Records Administration',
    district: 'All Orynvell Districts',
    registeredDate: 'Year 24',
    filingStatus: 'accepted',
    effectiveStatus: 'current',
    publicationStatus: 'published',
    preservationStatus: 'active',
    accessClass: 'public',
    discoverability: 'publicly-indexed',
    version: 'v1.0',
    summary: 'Official service standard explaining public discovery, fee schedules, correction evidence, and AURA identity boundaries.',
    structuredFields: {
      Publication: 'PUB-STD-2026',
      'Certified Copy Fee': '25 ₢ (processed via ORYN)',
      'Access Request Fee': 'Free (0 ₢)',
    },
    entities: [
      { name: 'Orynvell Public Records Administration', role: 'Issuer', effectiveDates: 'Year 24' },
    ],
    history: [
      { version: 'v1.0', date: 'Year 24', summary: 'Published for public distribution.', authority: 'Public Services & Records Administration' },
    ],
    documentClass: 'Official Issued Document',
  },
  {
    id: 'CIV-SEALED-901',
    title: 'Protected Appellate Seal — Tribunal Docket #901',
    category: 'Civil Registration',
    divisionId: 'disclosure',
    custodian: 'House Tribunal Appellate Registry',
    custodianship: 'Connected Source',
    jurisdiction: 'Affiliated Institutional Source',
    district: 'Aureline Tribunal Hall',
    registeredDate: 'Year 23',
    filingStatus: 'accepted',
    effectiveStatus: 'current',
    publicationStatus: 'unpublished',
    preservationStatus: 'archived',
    accessClass: 'protected',
    discoverability: 'non-discoverable',
    minClearance: 3,
    version: 'v1.0',
    summary: 'Protected appellate record non-discoverable to unauthenticated or low-clearance visitors.',
    structuredFields: {
      Docket: 'TRB-APP-901',
      'Access Classification': 'Protected — Clearance 3+ or Authorized Staff Only',
    },
    entities: [
      { name: 'House Tribunal Appellate Panel', role: 'Custodian', effectiveDates: 'Year 23' },
    ],
    history: [
      { version: 'v1.0', date: 'Year 23', summary: 'Placed under statutory seal.', authority: 'Records Access & Disclosure' },
    ],
    documentClass: 'Preserved Source Document',
    protectedAuthored: true,
  },
];

export function emptyOrynvellRecordsState(tick = 0): OrynvellRecordsState {
  return {
    records: structuredClone(INITIAL_ORYNVELL_RECORDS),
    requests: [],
    issuedDocuments: [],
    savedRecordIds: [],
    savedSearches: [],
    draftForm: { serviceType: 'certified-copy', recordId: 'DEED-99401', details: '' },
    auditLog: [],
    lastProcessedTick: Math.max(0, Math.floor(tick)),
  };
}

export function restoreOrynvellRecordsState(raw: unknown, tick = 0): OrynvellRecordsState {
  const base = emptyOrynvellRecordsState(tick);
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return base;
  const saved = raw as Partial<OrynvellRecordsState>;

  // Merge saved records while guaranteeing protected authored records remain intact
  const savedById = new Map<string, PublicRecord>();
  if (Array.isArray(saved.records)) {
    for (const r of saved.records) {
      if (r && typeof r.id === 'string' && typeof r.title === 'string') savedById.set(r.id, r);
    }
  }
  const mergedRecords: PublicRecord[] = INITIAL_ORYNVELL_RECORDS.map(authored => {
    const existing = savedById.get(authored.id);
    if (!existing) return structuredClone(authored);
    return authored.protectedAuthored ? { ...structuredClone(authored), history: existing.history?.length ? existing.history : authored.history } : existing;
  });
  for (const [id, r] of savedById.entries()) {
    if (!mergedRecords.some(m => m.id === id)) mergedRecords.push(r);
  }

  return {
    records: mergedRecords,
    requests: Array.isArray(saved.requests) ? saved.requests.filter(r => r && typeof r.id === 'string') : [],
    issuedDocuments: Array.isArray(saved.issuedDocuments) ? saved.issuedDocuments.filter(d => d && typeof d.docId === 'string') : [],
    savedRecordIds: Array.isArray(saved.savedRecordIds) ? [...new Set(saved.savedRecordIds.filter(id => typeof id === 'string'))] : [],
    savedSearches: Array.isArray(saved.savedSearches) ? saved.savedSearches.filter(s => s && typeof s.id === 'string') : [],
    draftForm:
      saved.draftForm && typeof saved.draftForm === 'object'
        ? {
            serviceType: SERVICE_FAMILIES.some(s => s.id === saved.draftForm?.serviceType)
              ? saved.draftForm.serviceType!
              : 'certified-copy',
            recordId: typeof saved.draftForm.recordId === 'string' ? saved.draftForm.recordId : '',
            details: typeof saved.draftForm.details === 'string' ? saved.draftForm.details.slice(0, 2000) : '',
          }
        : base.draftForm,
    auditLog: Array.isArray(saved.auditLog) ? saved.auditLog.slice(0, 60) : [],
    lastProcessedTick: Number.isFinite(saved.lastProcessedTick) ? Math.max(0, Math.floor(saved.lastProcessedTick!)) : Math.max(0, Math.floor(tick)),
  };
}

export function canAccessStaffWorkspace(player: any, isLoggedIn: boolean): boolean {
  if (!isLoggedIn) return false;
  const clearance = Number(player?.clearanceLevel ?? 1);
  const contracts = player?.employmentContracts || {};
  return Boolean(
    clearance >= 3 ||
      contracts.archivist ||
      contracts.dga ||
      contracts.diplomat ||
      contracts.finance,
  );
}

export function canDiscoverRecord(
  record: PublicRecord,
  actor: { isLoggedIn: boolean; clearance: number; isStaff: boolean },
): boolean {
  if (record.discoverability === 'non-discoverable') {
    return actor.isStaff || (actor.isLoggedIn && actor.clearance >= (record.minClearance ?? 3));
  }
  return true;
}

export function canReadFullRecord(
  record: PublicRecord,
  actor: { isLoggedIn: boolean; clearance: number; isStaff: boolean },
): boolean {
  if (record.accessClass === 'public') return true;
  if (record.accessClass === 'authenticated') return actor.isLoggedIn;
  return actor.isStaff || (actor.isLoggedIn && actor.clearance >= (record.minClearance ?? 2));
}

export function searchOrynvellRecords(
  records: PublicRecord[],
  filters: { query?: string; category?: string; divisionId?: string; effectiveStatus?: string },
  actor: { isLoggedIn: boolean; clearance: number; isStaff: boolean },
): PublicRecord[] {
  const q = (filters.query || '').trim().toLowerCase();
  return records.filter(record => {
    if (!canDiscoverRecord(record, actor)) return false;
    if (filters.category && filters.category !== 'All' && record.category !== filters.category) return false;
    if (filters.divisionId && filters.divisionId !== 'All' && record.divisionId !== filters.divisionId) return false;
    if (filters.effectiveStatus && filters.effectiveStatus !== 'All' && record.effectiveStatus !== filters.effectiveStatus) return false;
    if (!q) return true;
    const hay = `${record.id} ${record.title} ${record.category} ${record.custodian} ${record.district} ${record.summary} ${record.entities.map(e => e.name).join(' ')}`.toLowerCase();
    return hay.includes(q);
  });
}

export function submitOrynvellRequest(
  state: OrynvellRecordsState,
  input: {
    serviceType: ServiceRequestType;
    recordId?: string;
    details: string;
    applicantName: string;
    applicantMaid: string;
    cycle: number;
  },
): { state: OrynvellRecordsState; request?: ServiceRequest; ok: boolean; reason: string } {
  const details = (input.details || '').trim();
  if (!details) return { state, ok: false, reason: 'Provide details or grounds for your service request.' };
  const service = SERVICE_FAMILIES.find(s => s.id === input.serviceType);
  if (!service) return { state, ok: false, reason: 'Select a valid government service.' };

  const id = `OPR-${input.cycle}-${String(state.requests.length + 101)}`;
  const request: ServiceRequest = {
    id,
    serviceType: service.id,
    serviceLabel: service.label,
    recordId: input.recordId?.trim() || undefined,
    applicantName: input.applicantName || 'Authenticated Citizen',
    applicantMaid: input.applicantMaid || 'MAID-OR-CITIZEN',
    divisionId: service.divisionId,
    stage: 'submitted',
    details,
    feeCredits: service.feeCredits,
    submittedCycle: input.cycle,
    updatedCycle: input.cycle,
    timeline: [{ cycle: input.cycle, stage: 'Submitted', note: `Application ${id} received by ${service.label} intake.` }],
  };

  const audit: AuditEvent = {
    id: `AUD-${crypto.randomUUID()}`,
    cycle: input.cycle,
    actor: request.applicantName,
    action: 'REQUEST_SUBMITTED',
    targetId: id,
    detail: `${service.label}${request.recordId ? ` for ${request.recordId}` : ''}`,
  };

  return {
    state: {
      ...state,
      requests: [request, ...state.requests],
      draftForm: { serviceType: service.id, recordId: '', details: '' },
      auditLog: [audit, ...state.auditLog].slice(0, 60),
    },
    request,
    ok: true,
    reason: `Submitted ${service.label} (${id}). Track progress in My Requests.`,
  };
}

export function staffDecideOrynvellRequest(
  state: OrynvellRecordsState,
  input: {
    requestId: string;
    decision: 'approve' | 'deny' | 'info-required';
    actorName: string;
    note: string;
    cycle: number;
  },
): { state: OrynvellRecordsState; issuedDoc?: IssuedGovernmentDocument; ok: boolean; reason: string } {
  const req = state.requests.find(r => r.id === input.requestId);
  if (!req) return { state, ok: false, reason: 'Request not found.' };
  if (req.stage === 'fulfilled' || req.stage === 'denied' || req.stage === 'closed') {
    return { state, ok: false, reason: 'This request has already been decided and closed.' };
  }

  let issuedDoc: IssuedGovernmentDocument | undefined;
  let nextRecords = state.records;
  let nextStage: RequestStage = input.decision === 'approve' ? 'fulfilled' : input.decision === 'deny' ? 'denied' : 'info-required';

  if (input.decision === 'approve') {
    const sourceRecord = req.recordId ? state.records.find(r => r.id === req.recordId) : undefined;
    // If correction approved, append new version while preserving prior versions!
    if (req.serviceType === 'correction' && sourceRecord) {
      const minor = Number(sourceRecord.version.split('.')[1] || '0') + 1;
      const major = sourceRecord.version.split('.')[0] || 'v1';
      const nextVersion = `${major}.${minor}`;
      const updatedRecord: PublicRecord = {
        ...sourceRecord,
        version: nextVersion,
        history: [
          ...sourceRecord.history,
          {
            version: nextVersion,
            date: `Cycle ${input.cycle}`,
            summary: `Approved amendment (${req.id}): ${input.note || req.details}`,
            authority: input.actorName,
          },
        ],
      };
      nextRecords = state.records.map(r => (r.id === sourceRecord.id ? updatedRecord : r));
    }

    const docId = `CERT-${req.id}`;
    issuedDoc = {
      docId,
      requestId: req.id,
      recordId: sourceRecord?.id || 'GENERAL',
      recordVersion: sourceRecord?.version || 'v1.0',
      title: `${req.serviceLabel} — ${sourceRecord?.title || req.id}`,
      documentClass: 'Official Issued Document',
      issuingAuthority: `Orynvell Public Records Administration (${input.actorName})`,
      issuedCycle: input.cycle,
      issuedAt: new Date().toISOString(),
      bodyText: `OFFICIAL ISSUANCE — ORYNVELL PUBLIC RECORDS ADMINISTRATION\nDocument Ref: ${docId}\nRequest ID: ${req.id}\nSource Record: ${sourceRecord ? `${sourceRecord.id} (${sourceRecord.version})` : 'Administrative Determination'}\nApplicant: ${req.applicantName} (${req.applicantMaid})\nIssued Cycle: ${input.cycle}\n\nDetermination:\n${input.note || 'Approved and certified according to Orynvell Public Records standards.'}`,
    };
  }

  const nextRequests = state.requests.map(r =>
    r.id === req.id
      ? {
          ...r,
          stage: nextStage,
          updatedCycle: input.cycle,
          assignedStaff: input.actorName,
          decisionNote: input.note || (input.decision === 'approve' ? 'Approved and fulfilled.' : 'Decision recorded.'),
          issuedDocId: issuedDoc?.docId || r.issuedDocId,
          timeline: [
            ...r.timeline,
            {
              cycle: input.cycle,
              stage: nextStage === 'fulfilled' ? 'Fulfilled & Issued' : nextStage === 'denied' ? 'Denied' : 'Additional Info Required',
              note: `${input.actorName}: ${input.note || 'Determination recorded.'}`,
            },
          ],
        }
      : r,
  );

  const audit: AuditEvent = {
    id: `AUD-${crypto.randomUUID()}`,
    cycle: input.cycle,
    actor: input.actorName,
    action: `STAFF_${input.decision.toUpperCase()}`,
    targetId: req.id,
    detail: input.note || `Request transitioned to ${nextStage}`,
  };

  return {
    state: {
      ...state,
      records: nextRecords,
      requests: nextRequests,
      issuedDocuments: issuedDoc ? [issuedDoc, ...state.issuedDocuments] : state.issuedDocuments,
      auditLog: [audit, ...state.auditLog].slice(0, 60),
    },
    issuedDoc,
    ok: true,
    reason: issuedDoc ? `Request ${req.id} approved and certified (${issuedDoc.docId}).` : `Request ${req.id} updated to ${nextStage}.`,
  };
}

/**
 * Independent NPC Records Staff processing synced strictly to session ticks.
 * Moves submitted requests to under-review, then fulfills eligible routine requests automatically.
 */
export function advanceOrynvellRequests(raw: unknown, currentTick: number): OrynvellRecordsState {
  let state = restoreOrynvellRecordsState(raw, currentTick);
  const tick = Math.max(0, Math.floor(currentTick));
  if (tick <= state.lastProcessedTick) return state;
  const cycle = Math.floor(tick / 4);

  for (const req of state.requests) {
    if (req.stage === 'submitted') {
      state = {
        ...state,
        requests: state.requests.map(r =>
          r.id === req.id
            ? {
                ...r,
                stage: 'under-review',
                updatedCycle: cycle,
                assignedStaff: 'Clerk Mara Lin (NPC)',
                timeline: [...r.timeline, { cycle, stage: 'Under Review', note: 'Assigned to Clerk Mara Lin for record verification.' }],
              }
            : r,
        ),
      };
    } else if (req.stage === 'under-review' && req.assignedStaff === 'Clerk Mara Lin (NPC)') {
      const decided = staffDecideOrynvellRequest(state, {
        requestId: req.id,
        decision: 'approve',
        actorName: 'Certification Officer Soren Alistair (NPC)',
        note: 'Verified against authoritative custodian registry and issued.',
        cycle,
      });
      if (decided.ok) state = decided.state;
    }
  }

  return { ...state, lastProcessedTick: tick };
}
