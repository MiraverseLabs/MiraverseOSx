export interface MedicalDepartment {
  id: string;
  name: string;
  wing: string;
  lead: string;
  summary: string;
  hours: string;
}

export interface MedicalDoctor {
  id: string;
  name: string;
  title: string;
  departmentId: string;
  specialty: string;
  location: string;
  nextAvailable: string;
  bio: string;
}

export interface PharmacyProduct {
  id: string;
  name: string;
  category: 'Aura Support' | 'Condition Treatment' | 'Restorative';
  cost: number;
  doses: number;
  clearsCondition?: string;
  auraBoost: number;
  staminaBoost: number;
  description: string;
  usageNote: string;
}

export interface MedicalAppointment {
  id: string;
  doctorId: string;
  doctorName: string;
  department: string;
  slot: string;
  reason: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  bookedAt: string;
}

export interface PrescriptionSupply {
  productId: string;
  name: string;
  dosesRemaining: number;
  lastTakenAt?: string;
  lastFilledAt: string;
  clearsCondition?: string;
  auraBoost: number;
  staminaBoost: number;
}

export interface WellnessCheckIn {
  id: string;
  at: string;
  cycle: number;
  mood: 'Balanced' | 'Fatigued' | 'Strained' | 'Energized';
  energy: number;
  note: string;
}

export interface TelemetryPoint {
  label: string;
  aura: number;
  stamina: number;
  prism: number;
}

export const FAITH_DEPARTMENTS: MedicalDepartment[] = [
  {
    id: 'dept-telemetry',
    name: 'Bio-Aura Telemetry & Diagnostics',
    wing: 'Lantern Wing · Floor 2',
    lead: 'Dr. Sharon Voss',
    summary: 'Baseline aura calibration, PRISM exposure screening, and continuous wearable VITALS synchronization.',
    hours: 'Daily · 07:00–21:00',
  },
  {
    id: 'dept-veilwilt',
    name: 'Veilwilt & Rift Recovery Center',
    wing: 'Marlowe Springs Pavilion',
    lead: 'Dr. Ilyra Saint',
    summary: 'Specialized care for Veilwilt memory fatigue, Frostlung Syndrome, Sunspire Burn Fever, and Riftspine stabilization.',
    hours: '24/7 Inpatient & Outpatient',
  },
  {
    id: 'dept-triage',
    name: 'Aureline Civic Triage & Preventive Care',
    wing: 'East Courtyard Clinic',
    lead: 'Dr. Kaelen Mercer',
    summary: 'Primary civic healthcare, MAID wellness clearances, physicals, and same-cycle consultations.',
    hours: 'Daily · 08:00–20:00',
  },
  {
    id: 'dept-pharmacy',
    name: 'Faith Compounding Pharmacy',
    wing: 'Atrium Level 1 · Courier Dispatch',
    lead: 'Pharmacist Mira Solis',
    summary: 'Verified aura tonics, condition salves, and same-cycle Meridion Post doorstep delivery to residential lockers.',
    hours: 'Daily · 08:00–22:00',
  },
];

export const FAITH_DOCTORS: MedicalDoctor[] = [
  {
    id: 'doc-voss',
    name: 'Dr. Sharon Voss',
    title: 'Chief Researcher, Bio-Aura Telemetry',
    departmentId: 'dept-telemetry',
    specialty: 'PRISM Exposure & Baseline Calibration',
    location: 'Lantern Wing · Suite 204',
    nextAvailable: 'Today · 14:30',
    bio: 'Leads Faith Medical’s deep bio-aura telemetry program and advises citizens on managing high-PRISM field cycles.',
  },
  {
    id: 'doc-saint',
    name: 'Dr. Ilyra Saint',
    title: 'Attending Specialist, Veilwilt & Recovery',
    departmentId: 'dept-veilwilt',
    specialty: 'Veilwilt, Frostlung & Riftspine Care',
    location: 'Marlowe Springs Pavilion · 1B',
    nextAvailable: 'Today · 16:00',
    bio: 'Renowned clinician specializing in non-invasive aura sealing and gentle recovery for citizens exposed to Veil anomalies.',
  },
  {
    id: 'doc-mercer',
    name: 'Dr. Kaelen Mercer',
    title: 'Primary Civic Physician',
    departmentId: 'dept-triage',
    specialty: 'Preventive Care & Citizen Clearances',
    location: 'East Courtyard Clinic · Room 12',
    nextAvailable: 'Tomorrow · 09:30',
    bio: 'Provides routine MAID-covered checkups, fatigue management, and medical clearances for academic and civic work.',
  },
  {
    id: 'doc-solis',
    name: 'Pharmacist Mira Solis',
    title: 'Lead Clinical Apothecary',
    departmentId: 'dept-pharmacy',
    specialty: 'Aura Compounding & Remedy Guidance',
    location: 'Atrium Level 1 · Counter 2',
    nextAvailable: 'Today · Walk-in / Dispatch',
    bio: 'Oversees Faith Pharmacy formulations and coordinates direct Meridion Post deliveries to Aureline residences.',
  },
];

export const FAITH_PHARMACY_CATALOG: PharmacyProduct[] = [
  {
    id: 'rx-aura-tonic',
    name: 'Aura Stabilizer Tonic',
    category: 'Aura Support',
    cost: 35,
    doses: 3,
    auraBoost: 18,
    staminaBoost: 8,
    description: 'Gentle mineral-aether suspension that restores Aura Integrity after long terminal or field shifts.',
    usageNote: 'Take 1 dose in VITALS whenever Aura drops below 80%.',
  },
  {
    id: 'rx-stamina-draught',
    name: 'Lantern Electrolyte Draught',
    category: 'Restorative',
    cost: 25,
    doses: 3,
    auraBoost: 5,
    staminaBoost: 22,
    description: 'Clean civic restorative tonic for tired scholars, couriers, and night-shift analysts.',
    usageNote: 'Take 1 dose in VITALS for an immediate +22 Stamina lift.',
  },
  {
    id: 'rx-veilwilt-salve',
    name: 'Veilwilt Memory Seal Salve',
    category: 'Condition Treatment',
    cost: 65,
    doses: 2,
    clearsCondition: 'Veilwilt',
    auraBoost: 15,
    staminaBoost: 5,
    description: 'Clinical topical seal formulated by Dr. Ilyra Saint to clear Veilwilt Disorder and calm static bleed.',
    usageNote: 'Clears active Veilwilt condition and restores +15% Aura.',
  },
  {
    id: 'rx-frostlung-inhaler',
    name: 'Frostlung Thermal Inhaler',
    category: 'Condition Treatment',
    cost: 60,
    doses: 2,
    clearsCondition: 'Frostlung',
    auraBoost: 14,
    staminaBoost: 10,
    description: 'Warm-essence mist inhaler that relieves Frostlung Syndrome and steadies breathing.',
    usageNote: 'Clears active Frostlung Syndrome and restores +14% Aura.',
  },
  {
    id: 'rx-sunspire-cooling',
    name: 'Sunspire Cooling Ampoule',
    category: 'Condition Treatment',
    cost: 60,
    doses: 2,
    clearsCondition: 'Sunspire Burn Fever',
    auraBoost: 14,
    staminaBoost: 8,
    description: 'Thermal-mapping ampoule that reduces Sunspire Burn Fever safely without aura shock.',
    usageNote: 'Clears Sunspire Burn Fever and restores +14% Aura.',
  },
  {
    id: 'rx-riftspine-patch',
    name: 'Riftspine Alignment Patch',
    category: 'Condition Treatment',
    cost: 85,
    doses: 2,
    clearsCondition: 'Riftspine Fracture',
    auraBoost: 20,
    staminaBoost: 10,
    description: 'Precision frequency patch that stabilizes timeline drift and clears Riftspine Fracture.',
    usageNote: 'Clears Riftspine Fracture and restores +20% Aura.',
  },
];

export const INITIAL_TELEMETRY_HISTORY: TelemetryPoint[] = [
  { label: 'C24', aura: 92, stamina: 78, prism: 12 },
  { label: 'C25', aura: 88, stamina: 70, prism: 18 },
  { label: 'C26', aura: 84, stamina: 82, prism: 22 },
  { label: 'C27', aura: 94, stamina: 88, prism: 16 },
  { label: 'C28', aura: 100, stamina: 85, prism: 14 },
];
