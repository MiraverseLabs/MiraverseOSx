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

const { faithMedPageTitle, parseFaithMedUrl, faithMedUrl } = await import('../src/apps/Browser/medical/faithMedRouter.ts');
const { useMedicalStore } = await import('../src/store/useMedicalStore.ts');

test('faithmed.aure routes all hospital sections and returns route-aware titles', () => {
  assert.deepEqual(parseFaithMedUrl('https://faithmed.aure'), { section: 'home', valid: true });
  assert.deepEqual(parseFaithMedUrl(faithMedUrl('pharmacy')), { section: 'pharmacy', valid: true });
  assert.equal(faithMedPageTitle('https://faithmed.aure/appointments'), 'Book Appointment · Faith Medical');
  assert.equal(faithMedPageTitle('https://faithmed.aure/patient-portal'), 'Patient Portal · Faith Medical');
  assert.equal(parseFaithMedUrl('https://faithmed.aure/unknown').valid, false);
});

test('appointments, Faith Pharmacy orders, VITALS doses, check-ins, and grounding exercise work end to end', () => {
  useMedicalStore.setState({ appointments: [], prescriptions: [], checkIns: [], lastGroundingCycle: null });

  const apt = useMedicalStore.getState().bookAppointment({
    doctorId: 'doc-voss',
    slot: 'Today · 14:30',
    reason: 'Baseline bio-aura review',
  });
  assert.equal(apt.ok, true);
  assert.equal(useMedicalStore.getState().appointments.length, 1);

  assert.equal(useMedicalStore.getState().orderPharmacyItem('rx-veilwilt-salve', 10).ok, false);
  const rx = useMedicalStore.getState().orderPharmacyItem('rx-veilwilt-salve', 100);
  assert.equal(rx.ok, true);
  assert.equal(rx.cost, 65);
  assert.equal(useMedicalStore.getState().prescriptions[0].dosesRemaining, 2);

  const dose = useMedicalStore.getState().takeMedicationDose('rx-veilwilt-salve');
  assert.equal(dose.ok, true);
  assert.equal(dose.clearsCondition, 'Veilwilt');
  assert.equal(useMedicalStore.getState().prescriptions[0].dosesRemaining, 1);

  const checkIn = useMedicalStore.getState().logWellnessCheckIn({
    mood: 'Balanced',
    energy: 90,
    note: 'Feeling steady',
    cycle: 28,
    aura: 95,
    stamina: 88,
    prism: 14,
  });
  assert.equal(checkIn.mood, 'Balanced');
  assert.equal(useMedicalStore.getState().checkIns.length, 1);

  assert.equal(useMedicalStore.getState().completeGroundingExercise(28).ok, true);
  assert.equal(useMedicalStore.getState().completeGroundingExercise(28).ok, false);
});
