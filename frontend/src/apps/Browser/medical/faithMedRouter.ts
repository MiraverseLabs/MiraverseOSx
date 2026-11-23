export type FaithMedSection =
  | 'home'
  | 'departments'
  | 'doctors'
  | 'appointments'
  | 'pharmacy'
  | 'patient-portal';

export function isFaithMedUrl(url: string): boolean {
  try {
    return new URL(url).hostname.toLowerCase() === 'faithmed.aure';
  } catch {
    return false;
  }
}

export function faithMedUrl(section: FaithMedSection = 'home'): string {
  return section === 'home' ? 'https://faithmed.aure' : `https://faithmed.aure/${section}`;
}

export function parseFaithMedUrl(url: string): { section: FaithMedSection; valid: boolean } | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.toLowerCase() !== 'faithmed.aure') return null;
    const seg = parsed.pathname.replace(/^\/+|\/+$/g, '');
    if (!seg) return { section: 'home', valid: true };
    const allowed: FaithMedSection[] = ['departments', 'doctors', 'appointments', 'pharmacy', 'patient-portal'];
    if (allowed.includes(seg as FaithMedSection)) return { section: seg as FaithMedSection, valid: true };
    return { section: 'home', valid: false };
  } catch {
    return null;
  }
}

export function faithMedPageTitle(url: string): string | null {
  const parsed = parseFaithMedUrl(url);
  if (!parsed) return null;
  if (!parsed.valid) return 'Page unavailable · Faith Medical';
  const labels: Record<FaithMedSection, string> = {
    home: 'Faith Medical Group',
    departments: 'Departments · Faith Medical',
    doctors: 'Doctors & Specialists · Faith Medical',
    appointments: 'Book Appointment · Faith Medical',
    pharmacy: 'Faith Pharmacy · Faith Medical',
    'patient-portal': 'Patient Portal · Faith Medical',
  };
  return labels[parsed.section];
}
