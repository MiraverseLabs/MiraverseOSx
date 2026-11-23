import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  FAITH_DEPARTMENTS,
  FAITH_DOCTORS,
  FAITH_PHARMACY_CATALOG,
  INITIAL_TELEMETRY_HISTORY,
  type MedicalAppointment,
  type PrescriptionSupply,
  type TelemetryPoint,
  type WellnessCheckIn,
} from '../gameplay/Medical';

interface MedicalStoreState {
  appointments: MedicalAppointment[];
  prescriptions: PrescriptionSupply[];
  checkIns: WellnessCheckIn[];
  telemetryHistory: TelemetryPoint[];
  lastGroundingCycle: number | null;
  bookAppointment: (input: { doctorId: string; slot: string; reason: string }) => { ok: boolean; message: string; appointment?: MedicalAppointment };
  cancelAppointment: (id: string) => void;
  orderPharmacyItem: (productId: string, playerCredits: number) => { ok: boolean; cost: number; message: string };
  takeMedicationDose: (productId: string) => {
    ok: boolean;
    message: string;
    auraBoost?: number;
    staminaBoost?: number;
    clearsCondition?: string;
  };
  logWellnessCheckIn: (input: { mood: WellnessCheckIn['mood']; energy: number; note: string; cycle: number; aura: number; stamina: number; prism: number }) => WellnessCheckIn;
  completeGroundingExercise: (cycle: number) => { ok: boolean; message: string };
}

async function sendMedicalEmail(payload: { id: string; subject: string; body: string; sender?: string; senderAddress?: string }) {
  try {
    const { useCommsStore } = await import('./useCommsStore');
    const deliver = useCommsStore.getState()?.deliverInstitutionalEmail;
    if (typeof deliver !== 'function') return;
    deliver({
      id: payload.id,
      sender: payload.sender || 'Faith Medical Patient Portal',
      senderAddress: payload.senderAddress || 'intake@faithmed.aure',
      recipientAddress: 'citizen@auremail.aure',
      faction: 'Faith Medical Group',
      subject: payload.subject,
      body: payload.body,
      time: 'Just now',
      read: false,
      folder: 'inbox',
      accountType: 'institutional',
      category: 'institution',
      institutionalSeal: 'FAITH-MED-CLINICAL',
      attachment: null,
    });
  } catch {
    // Non-browser test environments may not mount useCommsStore.
  }
}

export const useMedicalStore = create<MedicalStoreState>()(
  persist(
    (set, get) => ({
      appointments: [],
      prescriptions: [
        {
          productId: 'rx-aura-tonic',
          name: 'Aura Stabilizer Tonic',
          dosesRemaining: 2,
          lastFilledAt: 'Cycle 28',
          auraBoost: 18,
          staminaBoost: 8,
        },
      ],
      checkIns: [
        {
          id: 'chk-init-1',
          at: 'Cycle 28 · 08:30 AM',
          cycle: 28,
          mood: 'Balanced',
          energy: 85,
          note: 'Baseline bio-aura steady after morning routine in Suite 4B.',
        },
      ],
      telemetryHistory: INITIAL_TELEMETRY_HISTORY,
      lastGroundingCycle: null,

      bookAppointment: ({ doctorId, slot, reason }) => {
        const doctor = FAITH_DOCTORS.find(d => d.id === doctorId);
        if (!doctor) return { ok: false, message: 'Select a Faith Medical clinician.' };
        if (!slot.trim() || !reason.trim()) return { ok: false, message: 'Choose a time slot and enter a visit reason.' };
        const dept = FAITH_DEPARTMENTS.find(d => d.id === doctor.departmentId);
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const appointment: MedicalAppointment = {
          id: `APT-${Math.floor(1000 + Math.random() * 9000)}`,
          doctorId: doctor.id,
          doctorName: doctor.name,
          department: dept?.name || doctor.specialty,
          slot: slot.trim(),
          reason: reason.trim(),
          status: 'scheduled',
          bookedAt: `Today · ${now}`,
        };
        set(s => ({ appointments: [appointment, ...s.appointments] }));
        void sendMedicalEmail({
          id: `MED-APT-${appointment.id}`,
          subject: `Appointment Confirmed: ${doctor.name} (${appointment.slot})`,
          body: `Your civic healthcare appointment with Faith Medical Group is confirmed (covered at 0 ₡ under MAID Civic Care).\n\n• Confirmation ID: ${appointment.id}\n• Clinician: ${doctor.name} (${doctor.title})\n• Location: ${doctor.location}\n• Time Slot: ${appointment.slot}\n• Visit Reason: ${appointment.reason}\n\nYou can review your visit details anytime at https://faithmed.aure/patient-portal or in your VITALS app.`,
        });
        return {
          ok: true,
          message: `Appointment ${appointment.id} confirmed with ${doctor.name} (${appointment.slot}). Confirmation emailed to AureMail.`,
          appointment,
        };
      },

      cancelAppointment: id =>
        set(s => ({
          appointments: s.appointments.map(a => (a.id === id ? { ...a, status: 'cancelled' } : a)),
        })),

      orderPharmacyItem: (productId, playerCredits) => {
        const product = FAITH_PHARMACY_CATALOG.find(p => p.id === productId);
        if (!product) return { ok: false, cost: 0, message: 'Pharmacy item not found.' };
        if (playerCredits < product.cost) {
          return { ok: false, cost: 0, message: `Insufficient Credits (${product.cost} ₡ required, ${playerCredits} ₡ available).` };
        }
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        set(s => {
          const existing = s.prescriptions.find(p => p.productId === product.id);
          if (existing) {
            return {
              prescriptions: s.prescriptions.map(p =>
                p.productId === product.id
                  ? { ...p, dosesRemaining: p.dosesRemaining + product.doses, lastFilledAt: `Today · ${now}` }
                  : p,
              ),
            };
          }
          return {
            prescriptions: [
              {
                productId: product.id,
                name: product.name,
                dosesRemaining: product.doses,
                lastFilledAt: `Today · ${now}`,
                clearsCondition: product.clearsCondition,
                auraBoost: product.auraBoost,
                staminaBoost: product.staminaBoost,
              },
              ...s.prescriptions,
            ],
          };
        });

        // Dispatch physical pharmacy parcel to Suite 4B via Meridion Post (which also emails a receipt to AureMail!)
        void import('./usePostalStore')
          .then(({ usePostalStore }) => {
            usePostalStore.getState().enqueueIncomingDelivery({
              id: `POST-RX-${product.id}-${Date.now()}`,
              kind: 'parcel',
              carrier: 'Meridion Post',
              senderName: 'Faith Compounding Pharmacy',
              senderAddress: '88 Lantern Boulevard, Sector 2, Aureline, Orynvell OR-2088, Meridion',
              title: `Faith Pharmacy Order: ${product.name} (${product.doses} doses)`,
              description: `${product.description} Doses are synced to your VITALS medication tracker.`,
              rewards: { xp: 10, itemName: `${product.name} (Pharmacy Pack)` },
              status: 'delivered',
            });
          })
          .catch(() => {});

        return {
          ok: true,
          cost: product.cost,
          message: `Filled ${product.name} (+${product.doses} doses added to VITALS · ${product.cost} ₡). Physical pack delivered via Meridion Post.`,
        };
      },

      takeMedicationDose: productId => {
        const supply = get().prescriptions.find(p => p.productId === productId);
        if (!supply || supply.dosesRemaining <= 0) {
          return { ok: false, message: 'No doses remaining. Refill at faithmed.aure/pharmacy.' };
        }
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        set(s => ({
          prescriptions: s.prescriptions.map(p =>
            p.productId === productId
              ? { ...p, dosesRemaining: p.dosesRemaining - 1, lastTakenAt: `Today · ${now}` }
              : p,
          ),
        }));
        return {
          ok: true,
          auraBoost: supply.auraBoost,
          staminaBoost: supply.staminaBoost,
          clearsCondition: supply.clearsCondition,
          message: `Took 1 dose of ${supply.name} (+${supply.auraBoost}% Aura, +${supply.staminaBoost} Stamina${supply.clearsCondition ? `, cleared ${supply.clearsCondition}` : ''}).`,
        };
      },

      logWellnessCheckIn: ({ mood, energy, note, cycle, aura, stamina, prism }) => {
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const entry: WellnessCheckIn = {
          id: `chk-${Date.now()}`,
          at: `Cycle ${cycle} · ${now}`,
          cycle,
          mood,
          energy,
          note: note.trim() || `Logged ${mood.toLowerCase()} check-in.`,
        };
        set(s => ({
          checkIns: [entry, ...s.checkIns].slice(0, 30),
          telemetryHistory: [...s.telemetryHistory.slice(-7), { label: `C${cycle}`, aura, stamina, prism }],
        }));
        return entry;
      },

      completeGroundingExercise: cycle => {
        if (get().lastGroundingCycle === cycle) {
          return { ok: false, message: 'You already completed guided aura stabilization this cycle.' };
        }
        set({ lastGroundingCycle: cycle });
        return { ok: true, message: 'Aura stabilization complete: +10% Aura Integrity and +8 Stamina.' };
      },
    }),
    {
      name: 'miraverse-medical-v1',
    },
  ),
);
