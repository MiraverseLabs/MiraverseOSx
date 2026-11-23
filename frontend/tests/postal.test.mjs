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

const { classifyInboxCategory, matchesAccountScope } = await import('../src/apps/mail/mailCategories.ts');
const { FORMATTED_PLAYER_ADDRESS, POSTAGE_RATES, buildInitialShipments } = await import('../src/gameplay/Postal.ts');
const { usePostalStore } = await import('../src/store/usePostalStore.ts');

test('AureMail smart inbox categories cleanly separate primary, institutional, and physical delivery alerts', () => {
  assert.equal(
    classifyInboxCategory({ id: '1', sender: 'Meridion Post Notifications', senderAddress: 'notices@meridionpost.aure', faction: 'Meridion Post', subject: 'Package Delivered [MP-OR-4012]', time: 'Now', read: false, body: 'Arrived.', trackingNumber: 'MP-OR-4012' }),
    'delivery',
  );
  assert.equal(
    classifyInboxCategory({ id: '2', sender: 'Regent Hall Admissions', senderAddress: 'admissions@regenthall.edu', faction: 'Regent Hall', subject: 'Offer of Admission', time: 'Now', read: false, body: 'Welcome.' }),
    'institution',
  );
  assert.equal(
    classifyInboxCategory({ id: '3', sender: 'Friend', senderAddress: 'friend@auremail.aure', faction: 'Personal', subject: 'Coffee in Dawnson?', time: 'Now', read: false, body: 'Meet at noon.' }),
    'primary',
  );
});

test('AureMail account scope pills filter personal, academic .edu, and work/gov messages', () => {
  const accounts = [{ id: 'a1', address: 'citizen@auremail.aure', accountType: 'personal' }];
  const eduMail = { id: 'e1', sender: 'Dawn Univ', senderAddress: 'admissions@dawn.edu', recipientAddress: 'citizen@auremail.aure', faction: 'Dawn University', subject: 'Welcome', time: 'Now', read: false, body: 'Hi' };
  const workMail = { id: 'w1', sender: 'DGA Dispatch', senderAddress: 'dispatch@dga.gov', recipientAddress: 'citizen@auremail.aure', faction: 'DGA', subject: 'Directive', time: 'Now', read: false, body: 'Hi' };
  assert.equal(matchesAccountScope(eduMail, 'academic', accounts), true);
  assert.equal(matchesAccountScope(eduMail, 'work', accounts), false);
  assert.equal(matchesAccountScope(workMail, 'work', accounts), true);
  assert.equal(matchesAccountScope(workMail, 'ALL', accounts), true);
});

test('Meridion Post initializes Suite 4B residential deliveries, supports unboxing, tracking advancement, and outbound shipping', () => {
  assert.match(FORMATTED_PLAYER_ADDRESS, /Suite 4B.*Aureline.*OR-4012/);
  usePostalStore.setState({ shipments: buildInitialShipments(), collectedItems: [] });

  // Unbox delivered welcome package once
  const unbox1 = usePostalStore.getState().unboxShipment('POST-INIT-1');
  assert.equal(unbox1.ok, true);
  assert.ok(usePostalStore.getState().collectedItems.includes('Vector House Brass Locker Key'));
  assert.equal(usePostalStore.getState().unboxShipment('POST-INIT-1').ok, false);

  // Advance out-for-delivery parcel to delivered, then unbox
  const adv = usePostalStore.getState().advanceShipment('POST-INIT-4');
  assert.equal(adv.ok, true);
  assert.equal(usePostalStore.getState().shipments.find(s => s.id === 'POST-INIT-4').status, 'delivered');
  assert.equal(usePostalStore.getState().unboxShipment('POST-INIT-4').ok, true);

  // Send outbound parcel
  const sent = usePostalStore.getState().sendOutboundShipment({
    recipientName: 'Regent Hall',
    recipientAddress: '1 Crown Terrace, Orynvell OR-1001, Meridion',
    kind: 'official_seal',
    title: 'Empress Track Dossier',
    note: 'Submitted for review.',
  });
  assert.equal(sent.ok, true);
  assert.equal(sent.shipment.postagePaid, POSTAGE_RATES.official_seal.cost);
  assert.equal(sent.shipment.direction, 'outgoing');
});
