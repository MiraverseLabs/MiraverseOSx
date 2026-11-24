import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';

registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (error) {
      if (error.code !== 'ERR_MODULE_NOT_FOUND' || !specifier.startsWith('.')) throw error;
      return next(`${specifier}.ts`, context);
    }
  },
});

const {
  ORYNVELL_DIVISIONS,
  RECORD_CATEGORIES,
  SERVICE_FAMILIES,
  emptyOrynvellRecordsState,
  restoreOrynvellRecordsState,
  searchOrynvellRecords,
  submitOrynvellRequest,
  staffDecideOrynvellRequest,
  advanceOrynvellRequests,
} = await import('../src/apps/Browser/records/orynvellRecordsModel.ts');

test('Orynvell Public Records enforces access-aware discovery and preserves authored deeds', () => {
  const state = emptyOrynvellRecordsState(0);
  assert.equal(ORYNVELL_DIVISIONS.length, 6);
  assert.equal(RECORD_CATEGORIES.length, 8);
  assert.equal(SERVICE_FAMILIES.length, 6);

  // Public visitor sees DEED-99401 but CANNOT discover non-discoverable CIV-SEALED-901
  const publicVisitor = { isLoggedIn: false, clearance: 1, isStaff: false };
  const publicResults = searchOrynvellRecords(state.records, {}, publicVisitor);
  assert.ok(publicResults.some(r => r.id === 'DEED-99401'));
  assert.equal(publicResults.some(r => r.id === 'CIV-SEALED-901'), false);

  // Authorized staff / Clearance 3+ can discover protected records
  const staffActor = { isLoggedIn: true, clearance: 3, isStaff: true };
  const staffResults = searchOrynvellRecords(state.records, {}, staffActor);
  assert.ok(staffResults.some(r => r.id === 'CIV-SEALED-901'));
});

test('Service requests support staff certification, version-preserving amendments, and NPC session-tick fulfillment', () => {
  let state = emptyOrynvellRecordsState(0);

  // Submit a correction request on PROP-AUR-4B
  const submitted = submitOrynvellRequest(state, {
    serviceType: 'correction',
    recordId: 'PROP-AUR-4B',
    details: 'Update municipal zoning annotation per Council notice.',
    applicantName: 'Elara Vale',
    applicantMaid: 'MAID-OR-00481926',
    cycle: 2,
  });
  assert.equal(submitted.ok, true);
  state = submitted.state;

  // Staff approves amendment: version bumps while preserving v1.0 history, and official document is issued
  const approved = staffDecideOrynvellRequest(state, {
    requestId: submitted.request.id,
    decision: 'approve',
    actorName: 'Registrar Maren Halverson',
    note: 'Verified zoning notice; amendment appended.',
    cycle: 2,
  });
  assert.equal(approved.ok, true);
  assert.ok(approved.issuedDoc);
  const prop = approved.state.records.find(r => r.id === 'PROP-AUR-4B');
  assert.equal(prop.version, 'v1.1');
  assert.equal(prop.history.length, 2);

  // Duplicate decision on already-fulfilled request is rejected
  assert.equal(
    staffDecideOrynvellRequest(approved.state, {
      requestId: submitted.request.id,
      decision: 'deny',
      actorName: 'Registrar Maren Halverson',
      note: 'duplicate',
      cycle: 2,
    }).ok,
    false,
  );

  // Independent NPC processing advances submitted requests strictly on session ticks
  let npcState = submitOrynvellRequest(approved.state, {
    serviceType: 'certified-copy',
    recordId: 'DEED-99401',
    details: 'Certified extract for archival review.',
    applicantName: 'Elara Vale',
    applicantMaid: 'MAID-OR-00481926',
    cycle: 3,
  }).state;
  const reqId = npcState.requests[0].id;
  npcState = advanceOrynvellRequests(npcState, 1);
  assert.equal(npcState.requests.find(r => r.id === reqId).stage, 'under-review');
  npcState = advanceOrynvellRequests(npcState, 2);
  assert.equal(npcState.requests.find(r => r.id === reqId).stage, 'fulfilled');

  // Malformed save recovery preserves protected authored records
  const recovered = restoreOrynvellRecordsState({ records: [{ id: 'DEED-99401', title: 'Tampered' }] });
  assert.equal(recovered.records.find(r => r.id === 'DEED-99401').title, 'Subterranean Conduit Sector 7 — Deed & Grid Alignment');
});
