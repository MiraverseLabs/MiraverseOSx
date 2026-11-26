export interface SeedAgentProfile {
  id: string;
  name: string;
  badgeNumber: string;
  title: string;
  division: string;
  department?: string;
  clearanceLevel: number;
  clearanceCode: string;
  callsign: string;
  station: string;
  dateAssigned: string;
  specializations: string[];
  commendations: string[];
}

export const primarySeedAgent: SeedAgentProfile = {
  id: 'DGA-SA-UNASSIGNED',
  name: 'DGA Operations Director',
  badgeNumber: 'DGA-UNASSIGNED',
  title: 'Operations Director',
  division: 'Directorate Operations',
  clearanceLevel: 5,
  clearanceCode: 'LEVEL 5 // TOP SECRET // NOFORN // SPECIAL COMPARTMENTED',
  callsign: 'DGA-OPS',
  station: 'HQ Secure Node',
  dateAssigned: '2023-04-12',
  specializations: ['Operational Coordination', 'Inter-Agency Liaison'],
  commendations: ['Directorate Citation for Service']
};
