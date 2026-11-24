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
  LIBRARY_CATALOG,
  LIBRARY_GUIDES,
  emptyLibraryState,
  restoreLibraryState,
  issueOrRenewLibraryCard,
  borrowCatalogItem,
  updateLoanProgress,
  returnCatalogItem,
  formatArchivalCitation,
} = await import('../src/apps/library/libraryModel.ts');

test('Royal Library issues clearance-gated library cards, enforces borrowing tiers, and tracks reading progress', () => {
  let state = emptyLibraryState();
  assert.ok(LIBRARY_CATALOG.length >= 6);
  assert.ok(LIBRARY_GUIDES.length >= 9);

  // Cannot borrow before issuing a Library Card
  assert.equal(borrowCatalogItem(state, 'cat-twin-moons', 1).ok, false);

  // Clearance 1 cannot receive Royal Archive Researcher tier
  assert.equal(
    issueOrRenewLibraryCard(state, {
      holderName: 'Elara Vale',
      maid: 'MAID-OR-00481926',
      homeBranch: 'Aureline Central Library',
      tier: 'royal-researcher',
      clearance: 1,
      cycle: 1,
    }).ok,
    false,
  );

  // Issue Citizen Public Reader card
  const issued = issueOrRenewLibraryCard(state, {
    holderName: 'Elara Vale',
    maid: 'MAID-OR-00481926',
    homeBranch: 'Aureline Central Library',
    tier: 'citizen',
    clearance: 1,
    cycle: 1,
  });
  assert.equal(issued.ok, true);
  assert.match(issued.card.cardNumber, /^RHS-LIB-/);
  assert.equal(issued.card.borrowLimit, 3);
  state = issued.state;

  // Citizen tier can borrow public volume, but not Royal Archive Researcher restricted charter
  assert.equal(borrowCatalogItem(state, 'cat-seraphima-charter', 1).ok, false);
  const borrowed = borrowCatalogItem(state, 'cat-twin-moons', 1);
  assert.equal(borrowed.ok, true);
  state = borrowed.state;

  // Reading progress completes volume and records completion
  state = updateLoanProgress(state, 'cat-twin-moons', 50).state;
  const finished = updateLoanProgress(state, 'cat-twin-moons', 50);
  assert.equal(finished.completed, true);
  assert.ok(finished.state.completedIds.includes('cat-twin-moons'));
  state = finished.state;

  // Returning removes active loan while keeping completed reading record
  const returned = returnCatalogItem(state, 'cat-twin-moons');
  assert.equal(returned.ok, true);
  assert.equal(returned.state.loans.length, 0);
  assert.ok(returned.state.completedIds.includes('cat-twin-moons'));
  state = returned.state;

  // Upgrading/renewing preserves original card number and unlocks Royal Researcher access
  const upgraded = issueOrRenewLibraryCard(state, {
    holderName: 'Elara Vale',
    maid: 'MAID-OR-00481926',
    homeBranch: 'Royal Historic Society · Sovereign Vault',
    tier: 'royal-researcher',
    clearance: 3,
    cycle: 2,
  });
  assert.equal(upgraded.ok, true);
  assert.equal(upgraded.card.cardNumber, issued.card.cardNumber);
  assert.equal(upgraded.card.status, 'Renewed');
  assert.equal(borrowCatalogItem(upgraded.state, 'cat-seraphima-charter', 2).ok, true);

  // Archival citation formatting & malformed save recovery
  const cite = formatArchivalCitation(LIBRARY_CATALOG[0]);
  assert.match(cite, /RHS-CHARTER-001/);
  const recovered = restoreLibraryState({ card: { cardNumber: 'RHS-LIB-2026-1234', tier: 'invalid' }, loans: [{ itemId: 'bad' }] });
  assert.equal(recovered.card.tier, 'citizen');
  assert.equal(recovered.loans.length, 0);
});
