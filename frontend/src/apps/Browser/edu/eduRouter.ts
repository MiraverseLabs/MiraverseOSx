import { COURSES, INSTITUTIONS, type InstitutionId } from '../../../gameplay/Academics';

export type EduSection = 'home' | 'admissions' | 'academics' | 'courses' | 'faculty' | 'campus-life' | 'portal';

export interface EduLocation {
  institution: InstitutionId;
  section: EduSection;
  courseId?: string;
  valid: boolean;
}

const DOMAIN_MAP: Record<string, InstitutionId> = {};
for (const inst of INSTITUTIONS) {
  DOMAIN_MAP[inst.domain.toLowerCase()] = inst.id;
  for (const alias of inst.aliases) DOMAIN_MAP[alias.toLowerCase()] = inst.id;
}

export function institutionFromHostname(hostname: string): InstitutionId | null {
  return DOMAIN_MAP[hostname.toLowerCase()] || null;
}

export function isEduUrl(url: string): boolean {
  try {
    return institutionFromHostname(new URL(url).hostname) !== null;
  } catch {
    return false;
  }
}

export function eduUrl(institution: InstitutionId, section: EduSection = 'home', detailId?: string): string {
  const inst = INSTITUTIONS.find(i => i.id === institution)!;
  if (section === 'home') return `https://${inst.domain}`;
  if (section === 'courses' && detailId) return `https://${inst.domain}/courses/${encodeURIComponent(detailId)}`;
  return `https://${inst.domain}/${section}`;
}

export function parseEduUrl(url: string): EduLocation | null {
  try {
    const parsed = new URL(url);
    const institution = institutionFromHostname(parsed.hostname);
    if (!institution) return null;
    const segments = parsed.pathname.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
    if (!segments.length) return { institution, section: 'home', valid: true };
    const [head, second] = segments;
    if (head === 'courses') {
      if (!second) return { institution, section: 'courses', valid: true };
      const course = COURSES.find(c => c.id === second && c.institution === institution);
      return { institution, section: 'courses', courseId: second, valid: Boolean(course) };
    }
    const allowed: EduSection[] = ['admissions', 'academics', 'faculty', 'campus-life', 'portal'];
    if (allowed.includes(head as EduSection) && !second) {
      return { institution, section: head as EduSection, valid: true };
    }
    return { institution, section: 'home', valid: false };
  } catch {
    return null;
  }
}

export function eduPageTitle(url: string): string | null {
  const loc = parseEduUrl(url);
  if (!loc) return null;
  const inst = INSTITUTIONS.find(i => i.id === loc.institution)!;
  if (!loc.valid) return `Page unavailable · ${inst.name}`;
  if (loc.section === 'home') return inst.name;
  if (loc.section === 'courses' && loc.courseId) {
    const course = COURSES.find(c => c.id === loc.courseId);
    return course ? `${course.code} ${course.title} · ${inst.name}` : `Courses · ${inst.name}`;
  }
  const labels: Record<EduSection, string> = {
    home: inst.name,
    admissions: 'Admissions',
    academics: 'Academics & Degrees',
    courses: 'Course Catalog',
    faculty: 'Faculty & Office Hours',
    'campus-life': 'Campus Life',
    portal: 'Student Portal',
  };
  return `${labels[loc.section]} · ${inst.name}`;
}
