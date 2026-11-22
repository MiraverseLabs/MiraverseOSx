export type InstitutionId = 'cyberium' | 'dawn' | 'regent';
export type ProjectKind = 'compiler' | 'engineering' | 'archive' | 'civic';

export interface AcademicDepartment {
  id: string;
  name: string;
  chair: string;
  building: string;
  summary: string;
}

export interface FacultyMember {
  id: string;
  name: string;
  title: string;
  department: string;
  office: string;
  officeHours: string;
  email: string;
  bio: string;
  advisingTip: string;
}

export interface DegreeProgram {
  id: string;
  institution: InstitutionId;
  title: string;
  level: 'certificate' | 'diploma' | 'bachelor';
  requiredCredits: number;
  requiredTracks: string[];
  description: string;
}

export interface CampusClub {
  id: string;
  institution: InstitutionId;
  name: string;
  category: string;
  meetingPlace: string;
  schedule: string;
  description: string;
}

export interface CampusBulletin {
  id: string;
  date: string;
  tag: string;
  title: string;
  summary: string;
}

export interface AcademicInstitution {
  id: InstitutionId;
  name: string;
  shortName: string;
  sealText: string;
  domain: string;
  aliases: string[];
  organizationId: 'cyacademy' | 'dawn' | 'regent';
  commsChannelId: string;
  admissionsEmail: string;
  registrarEmail: string;
  established: string;
  location: string;
  motto: string;
  tagline: string;
  description: string;
  campus: string;
  admissionsNote: string;
  faculty: string[];
  facultyDirectory: FacultyMember[];
  departments: AcademicDepartment[];
  degrees: DegreeProgram[];
  clubs: CampusClub[];
  bulletins: CampusBulletin[];
}

export const INSTITUTIONS: AcademicInstitution[] = [
  {
    id: 'cyberium',
    name: 'Cyberium Academy',
    shortName: 'Cyberium',
    sealText: 'CA',
    domain: 'cyberium.edu',
    aliases: ['cyacademy.edu', 'cyacademy.edu.aure', 'cyacademy.aure'],
    organizationId: 'cyacademy',
    commsChannelId: 'cyacademy-core',
    admissionsEmail: 'admissions@cyberium.edu',
    registrarEmail: 'registrar@cyacademy.edu',
    established: 'Est. Year 942',
    location: 'Academic Quadrangle, Sector 4 · Aureline',
    motto: 'Understand the system. Shape what comes next.',
    tagline: 'Polytechnic Institute of Cybernetics, Signals & Computational Spellcraft',
    description:
      'Aureline’s premier technical academy of cybernetics, signal systems, and computational spellcraft. Formerly Cyacademy, Cyberium carries its laboratory traditions into a new academic era.',
    campus:
      'The Academic Quadrangle connects Compiler Lab 4, the Signal Observatory, the Diagnostics Foundry, and Vector residential halls.',
    admissionsNote:
      'Open merit admission for all verified MAID citizens. Admitted scholars receive a Cyberium Student ID, Compiler Lab 4 access, and #cyacademy-core channel credentials.',
    faculty: [
      'Headmistress Vael · Institutional Leadership',
      'Dean Cassian Rook · Cybernetics & Orientation',
      'Prof. Archmage Hex · Algorithmic Spellcraft',
      'Dr. Franz Hopper · Virtual Dimensions',
      'Jeremie Belpois · Signal Engineering',
      'Aelita Hopper · Code Weaving',
      'Ulrich Stern & Odd Della Robia · Field Testing',
    ],
    departments: [
      {
        id: 'dept-cybernetics',
        name: 'Department of Cybernetics & Control',
        chair: 'Dean Cassian Rook',
        building: 'Diagnostics Foundry, Hall B',
        summary: 'Feedback systems, hardware calibration, sensor isolation, and fault-tolerant municipal engineering.',
      },
      {
        id: 'dept-spell-eng',
        name: 'School of Computational Spellcraft',
        chair: 'Prof. Archmage Hex',
        building: 'Compiler Lab 4',
        summary: 'Formal module contracts, bounded simulations, aura budgeting, and reproducible SpellForge protocols.',
      },
      {
        id: 'dept-signals',
        name: 'Signal Systems & Cryptographic Lab',
        chair: 'Jeremie Belpois',
        building: 'Signal Observatory Tower',
        summary: 'Packet integrity, relay routing, lawful authorization, key isolation, and forensic signal preservation.',
      },
    ],
    facultyDirectory: [
      {
        id: 'fac-vael',
        name: 'Headmistress Vael',
        title: 'Headmistress & Chancellor of Labs',
        department: 'Institutional Leadership',
        office: 'Quadrangle Spire 401',
        officeHours: 'Cycle Days 1 & 4 · 14:00–16:00',
        email: 'vael@cyberium.edu',
        bio: 'Stewards Cyberium Academy’s transition from legacy Cyacademy into an open civic polytechnic.',
        advisingTip: 'Pair foundational Cybernetics with Signal Systems if you plan to pursue DGA or WORKNET engineering tracks.',
      },
      {
        id: 'fac-rook',
        name: 'Dean Cassian Rook',
        title: 'Dean of Cybernetics & Orientation',
        department: 'Department of Cybernetics & Control',
        office: 'Foundry Hall B-12',
        officeHours: 'Daily · 10:00–12:00',
        email: 'c.rook@cyacademy.edu',
        bio: 'Leads first-year orientation and hardware safety standards across all Quadrangle laboratories.',
        advisingTip: 'Always verify independent interlocks before pushing gain—both in exams and in live municipal relays.',
      },
      {
        id: 'fac-hex',
        name: 'Prof. Archmage Hex',
        title: 'Chair of Algorithmic Spellcraft',
        department: 'School of Computational Spellcraft',
        office: 'Compiler Lab 4 · Deck 2',
        officeHours: 'Cycle Days 2 & 5 · 13:00–15:30',
        email: 'hex@cyberium.edu',
        bio: 'Pioneered formal contract verification for elemental and utility SpellForge modules.',
        advisingTip: 'Open your Spell Engineering project in SpellForge Lab before compiling, and keep stamina above 15.',
      },
      {
        id: 'fac-jeremie',
        name: 'Jeremie Belpois',
        title: 'Lead Instructor, Signal Engineering',
        department: 'Signal Systems & Cryptographic Lab',
        office: 'Signal Observatory 3B',
        officeHours: 'Cycle Days 1, 3 & 5 · 16:00–18:00',
        email: 'j.belpois@cyberium.edu',
        bio: 'Architect of Aureline’s deep-packet diagnostic monitors and laboratory simulation sandboxes.',
        advisingTip: 'Never confuse signal integrity with sender authorization; preserve original payloads in every report.',
      },
      {
        id: 'fac-aelita',
        name: 'Aelita Hopper',
        title: 'Senior Research Fellow, Code Weaving',
        department: 'School of Computational Spellcraft',
        office: 'Compiler Lab 4 · Annex',
        officeHours: 'Cycle Days 2 & 4 · 11:00–13:00',
        email: 'aelita.s@cyacademy.edu',
        bio: 'Researches harmonic synthesis between Veil frequencies and reproducible protocol compilers.',
        advisingTip: 'Test module pairs in bounded simulations and record every observed output for peer review.',
      },
    ],
    degrees: [
      {
        id: 'deg-cyb-cert',
        institution: 'cyberium',
        title: 'Certificate in Applied Cybernetics & Signals',
        level: 'certificate',
        requiredCredits: 6,
        requiredTracks: ['Cybernetics'],
        description: 'Demonstrates mastery of feedback control, sensor calibration, and fault recovery.',
      },
      {
        id: 'deg-cyb-spell',
        institution: 'cyberium',
        title: 'Diploma in Computational Spellcraft',
        level: 'diploma',
        requiredCredits: 12,
        requiredTracks: ['Spell Engineering', 'Signal Systems'],
        description: 'Combines verified SpellForge compilation with cryptographic signal integrity.',
      },
      {
        id: 'deg-cyb-bs',
        institution: 'cyberium',
        title: 'B.S. in Integrated Cyberium Systems',
        level: 'bachelor',
        requiredCredits: 18,
        requiredTracks: ['Cybernetics', 'Spell Engineering', 'Signal Systems'],
        description: 'Full polytechnic degree covering all three Cyberium Academy core tracks.',
      },
    ],
    clubs: [
      {
        id: 'club-cyb-compiler',
        institution: 'cyberium',
        name: 'Compiler Lab 4 Guild',
        category: 'Engineering & Labs',
        meetingPlace: 'Compiler Lab 4 · Sub-Deck',
        schedule: 'Evenings · 19:00',
        description: 'Late-night SpellForge protocol benchmarking, module sandboxing, and peer code reviews.',
      },
      {
        id: 'club-cyb-signal',
        institution: 'cyberium',
        name: 'Signal Observatory Society',
        category: 'Cryptography & Telemetry',
        meetingPlace: 'Observatory Dome',
        schedule: 'Cycle Days 2 & 5 · 17:30',
        description: 'Radio-mesh monitoring, packet forensics, and ethical decryption drills.',
      },
      {
        id: 'club-cyb-vector',
        institution: 'cyberium',
        name: 'Vector Robotics & Field Crew',
        category: 'Field Testing',
        meetingPlace: 'Quadrangle Workshop 2',
        schedule: 'Cycle Day 4 · 15:00',
        description: 'Hands-on hardware interlock testing and autonomous drone calibration with Ulrich & Odd.',
      },
    ],
    bulletins: [
      {
        id: 'bul-cyb-1',
        date: 'Autumn 1000 · Week 2',
        tag: 'LAB STATUS',
        title: 'Compiler Lab 4 Sandbox Calibration Complete',
        summary: 'Bounded simulation benches are open for all admitted Spell Engineering students. Stamina recovery pods remain available in Vector Hall.',
      },
      {
        id: 'bul-cyb-2',
        date: 'Autumn 1000 · Week 3',
        tag: 'COLLOQUIUM',
        title: 'Dr. Franz Hopper Archive Lecture: Virtual Dimensions',
        summary: 'Special seminar on historical virtual-mesh containment protocols hosted in the Signal Observatory.',
      },
      {
        id: 'bul-cyb-3',
        date: 'Autumn 1000 · Ongoing',
        tag: 'ADMISSIONS',
        title: 'Rolling Admissions Open for Autumn 1000',
        summary: 'Prospective scholars may apply online via cyberium.edu/admissions for immediate MAID verification and Student ID issuance.',
      },
    ],
  },
  {
    id: 'dawn',
    name: 'Dawn University',
    shortName: 'Dawn Univ.',
    sealText: 'DU',
    domain: 'dawn.edu',
    aliases: ['dawn.edu.aure'],
    organizationId: 'dawn',
    commsChannelId: 'dawn-common-room',
    admissionsEmail: 'admissions@dawn.edu',
    registrarEmail: 'registrar@dawn.edu',
    established: 'Est. Year 812',
    location: 'Dawnson, Aureline',
    motto: 'Knowledge in service of a shared tomorrow.',
    tagline: 'Collegiate University of Civic Scholarship, Natural Sciences & Arcane Humanities',
    description:
      'An open collegiate community in Dawnson, a college town within Aureline, studying Meridion’s civic life, living environments, and arcane traditions through careful inquiry, archival stewardship, and public service.',
    campus:
      'Set in Dawnson, a college town within Aureline, Dawn Court brings together the Concord Reading Hall, the Aether Conservatory, the Botanical Cloister, and the School of Arcane Humanities.',
    admissionsNote:
      'Dawn University in Dawnson welcomes lifelong learners and dual-enrolled scholars. Admitted students gain access to Dawn Court reading collections, advising, and #dawn-common-room.',
    faculty: [
      'Chancellor Ilyana Sol · Civic Scholarship',
      'Dr. Ren Alden · Natural Sciences',
      'Prof. Safiya Lorne · Arcane Humanities',
      'Lecturer Tomas Wren · Public Policy',
    ],
    departments: [
      {
        id: 'dept-civic',
        name: 'College of Civic Studies & Public Policy',
        chair: 'Chancellor Ilyana Sol',
        building: 'Concord Reading Hall',
        summary: 'Primary-source history, municipal charters, public institutions, and evidence-based policy evaluation.',
      },
      {
        id: 'dept-natsci',
        name: 'Aether Conservatory of Natural Sciences',
        chair: 'Dr. Ren Alden',
        building: 'Aether Conservatory',
        summary: 'Experimental controls, ecological stewardship, aether gradients, and environmental monitoring.',
      },
      {
        id: 'dept-humanities',
        name: 'School of Arcane Humanities',
        chair: 'Prof. Safiya Lorne',
        building: 'Lantern Cloister',
        summary: 'Comparative arcane traditions, situated knowledge, custodial consent, and ethical translation.',
      },
    ],
    facultyDirectory: [
      {
        id: 'fac-sol',
        name: 'Chancellor Ilyana Sol',
        title: 'Chancellor & Professor of Civic Scholarship',
        department: 'College of Civic Studies & Public Policy',
        office: 'Concord Hall · West Study',
        officeHours: 'Cycle Days 1 & 3 · 11:00–13:00',
        email: 'i.sol@dawn.edu',
        bio: 'Historian of the Seven Realms and advocate for transparent civic institutions across Aureline.',
        advisingTip: 'Distinguish sequence from causation when examining historical charters—evidence always outweighs rumor.',
      },
      {
        id: 'fac-alden',
        name: 'Dr. Ren Alden',
        title: 'Director of the Aether Conservatory',
        department: 'Aether Conservatory of Natural Sciences',
        office: 'Conservatory Glasshouse 2',
        officeHours: 'Cycle Days 2 & 4 · 14:00–16:00',
        email: 'r.alden@dawn.edu',
        bio: 'Field ecologist tracking aether gradient shifts across the Arcadia Reserve and Aureline wetlands.',
        advisingTip: 'Record units and environmental conditions alongside every observation before drafting your Royal Archives review.',
      },
      {
        id: 'fac-lorne',
        name: 'Prof. Safiya Lorne',
        title: 'Chair of Arcane Humanities',
        department: 'School of Arcane Humanities',
        office: 'Lantern Cloister 108',
        officeHours: 'Cycle Days 3 & 5 · 10:00–12:00',
        email: 's.lorne@dawn.edu',
        bio: 'Specializes in reciprocal community scholarship and cross-realm manuscript translation.',
        advisingTip: 'Honor custodian permissions and keep quotation distinct from interpretation in every analytical essay.',
      },
      {
        id: 'fac-wren',
        name: 'Lecturer Tomas Wren',
        title: 'Senior Lecturer in Applied Public Policy',
        department: 'College of Civic Studies & Public Policy',
        office: 'Concord Hall 214',
        officeHours: 'Cycle Days 1 & 5 · 15:00–17:00',
        email: 't.wren@dawn.edu',
        bio: 'Advises municipal councils on budget tradeoffs, civic equity, and measurable policy outcomes.',
        advisingTip: 'Every strong policy proposal names the responsible institution, its budget tradeoffs, and an observable metric.',
      },
    ],
    degrees: [
      {
        id: 'deg-dwn-cert',
        institution: 'dawn',
        title: 'Certificate in Aether Ecology & Inquiry',
        level: 'certificate',
        requiredCredits: 6,
        requiredTracks: ['Natural Sciences'],
        description: 'Foundational training in controlled observation, replication, and ecological stewardship.',
      },
      {
        id: 'deg-dwn-dip',
        institution: 'dawn',
        title: 'Diploma in Civic & Cultural Scholarship',
        level: 'diploma',
        requiredCredits: 12,
        requiredTracks: ['Civic Studies & History', 'Arcane Humanities'],
        description: 'Prepares scholars for public policy, archival stewardship, and cross-realm cultural advising.',
      },
      {
        id: 'deg-dwn-ba',
        institution: 'dawn',
        title: 'B.A. in Meridion Liberal Studies',
        level: 'bachelor',
        requiredCredits: 18,
        requiredTracks: ['Civic Studies & History', 'Natural Sciences', 'Arcane Humanities'],
        description: 'Complete collegiate degree spanning Dawn University’s civic, scientific, and humanities colleges.',
      },
    ],
    clubs: [
      {
        id: 'club-dwn-concord',
        institution: 'dawn',
        name: 'Concord Debating & Charter Union',
        category: 'Civic Discourse',
        meetingPlace: 'Concord Reading Hall',
        schedule: 'Cycle Day 2 · 18:00',
        description: 'Weekly policy debates, charter readings, and municipal budget simulations.',
      },
      {
        id: 'club-dwn-botanical',
        institution: 'dawn',
        name: 'Aether Conservatory Field Circle',
        category: 'Natural Sciences',
        meetingPlace: 'Conservatory Cloister',
        schedule: 'Cycle Day 4 · 09:00',
        description: 'Low-disturbance ecological sampling walks and botanical sketching sessions.',
      },
      {
        id: 'club-dwn-lantern',
        institution: 'dawn',
        name: 'Lantern Translation Collective',
        category: 'Humanities',
        meetingPlace: 'Lantern Cloister Library',
        schedule: 'Cycle Day 5 · 16:30',
        description: 'Collaborative translation of pre-Collapse folios and oral history preservation.',
      },
    ],
    bulletins: [
      {
        id: 'bul-dwn-1',
        date: 'Autumn 1000 · Week 1',
        tag: 'EXHIBITION',
        title: 'Concord Reading Hall Opens Third Era Charter Folio',
        summary: 'Admitted students may examine annotated civic charters during daytime reading hours.',
      },
      {
        id: 'bul-dwn-2',
        date: 'Autumn 1000 · Week 3',
        tag: 'FIELDWORK',
        title: 'Aether Conservatory Autumn Sampling Fellowship',
        summary: 'Natural Sciences students are invited to log baseline aether gradient readings with Dr. Ren Alden.',
      },
      {
        id: 'bul-dwn-3',
        date: 'Autumn 1000 · Ongoing',
        tag: 'COMMON ROOM',
        title: 'Dawn Common Room Open for Cross-Disciplinary Study',
        summary: 'Join #dawn-common-room in Comms after receiving your admission letter to connect with classmates.',
      },
    ],
  },
  {
    id: 'regent',
    name: 'Regent Hall',
    shortName: 'Regent Hall',
    sealText: 'RH',
    domain: 'regenthall.edu',
    aliases: ['regenthall.edu.aure', 'regent.edu'],
    organizationId: 'regent',
    commsChannelId: 'regent-hall-commons',
    admissionsEmail: 'admissions@regenthall.edu',
    registrarEmail: 'registrar@regenthall.edu',
    established: 'Est. Year 764',
    location: 'Crown Terrace · Serving All Eight Realms',
    motto: 'Crown, counsel, and the concord of eight realms.',
    tagline: 'Royal Collegiate Academy of the Eight Realms & the Exclusive Empress Track',
    description:
      'The preeminent royal educational institution uniting heirs, envoys, and distinguished scholars across all eight realms. Regent Hall offers rigorous instruction in sovereign leadership, eight-realm diplomacy, and the exclusive Empress Track.',
    campus:
      'Crown Terrace encompasses the Sovereign Hall, the Eight-Realms Rotunda, the Empress Study Cloister, and Royal Residential Courts.',
    admissionsNote:
      'Regent Hall admits verified MAID scholars pursuing royal education across all eight realms, including candidates for the exclusive Empress Track. Admitted scholars receive a Regent Hall Crest ID and #regent-hall-commons access.',
    faculty: [
      'Warden Alistair Vance-Harrow · Royal Statecraft & Eight-Realm Studies',
      'Lady Elena Corvin · Sovereign Governance & Protocol',
      'Envoy Maris Delacroix · Eight-Realm Diplomacy',
      'Preceptor Rowan Ashworth · The Empress Track',
    ],
    departments: [
      {
        id: 'dept-royal-studies',
        name: 'College of Eight-Realm Royal Studies',
        chair: 'Lady Elena Corvin',
        building: 'Sovereign Hall',
        summary: 'Constitutional crowns, realm histories, dynastic stewardship, and accountable royal governance across all eight realms.',
      },
      {
        id: 'dept-diplomacy',
        name: 'Court of Eight-Realm Diplomacy',
        chair: 'Envoy Maris Delacroix',
        building: 'Eight-Realms Rotunda',
        summary: 'Inter-realm accords, royal protocol, treaty mediation, and cross-realm delegation leadership.',
      },
      {
        id: 'dept-empress-track',
        name: 'The Empress Track',
        chair: 'Preceptor Rowan Ashworth',
        building: 'Empress Study Cloister',
        summary: 'Regent Hall’s exclusive sovereign curriculum in high-crown stewardship, crisis judgment, and eight-realm concord.',
      },
    ],
    facultyDirectory: [
      {
        id: 'fac-harrow',
        name: 'Warden Alistair Vance-Harrow',
        title: 'Warden of Regent Hall',
        department: 'College of Eight-Realm Royal Studies',
        office: 'Regent Lodge · High Study',
        officeHours: 'Cycle Days 1 & 4 · 10:00–12:00',
        email: 'warden@regenthall.edu',
        bio: 'Stewards Regent Hall’s royal curriculum uniting heirs and scholars from all eight realms.',
        advisingTip: 'True royal authority is measured by the stability and dignity it preserves across every realm, not just the capital.',
      },
      {
        id: 'fac-corvin',
        name: 'Lady Elena Corvin',
        title: 'Chair of Eight-Realm Royal Studies',
        department: 'College of Eight-Realm Royal Studies',
        office: 'Sovereign Hall 202',
        officeHours: 'Cycle Days 2 & 4 · 13:30–15:30',
        email: 'e.corvin@regenthall.edu',
        bio: 'Scholar of royal charters, succession covenants, and eight-realm institutional stewardship.',
        advisingTip: 'Ground every royal decision in verified realm charters and transparent counsel.',
      },
      {
        id: 'fac-delacroix',
        name: 'Envoy Maris Delacroix',
        title: 'Dean of Eight-Realm Diplomacy',
        department: 'Court of Eight-Realm Diplomacy',
        office: 'Eight-Realms Rotunda 14',
        officeHours: 'Cycle Days 3 & 5 · 14:00–16:00',
        email: 'm.delacroix@regenthall.edu',
        bio: 'Negotiated sovereign accords linking all eight realms through formal courtly diplomacy.',
        advisingTip: 'Map every realm delegation’s core constraints before drafting a royal settlement clause.',
      },
      {
        id: 'fac-ashworth',
        name: 'Preceptor Rowan Ashworth',
        title: 'Director of the Empress Track',
        department: 'The Empress Track',
        office: 'Empress Study Cloister 1',
        officeHours: 'Cycle Days 1 & 3 · 15:00–17:00',
        email: 'r.ashworth@regenthall.edu',
        bio: 'Mentors select scholars enrolled in Regent Hall’s exclusive Empress Track in sovereign judgment and realm unity.',
        advisingTip: 'Empress Track seminars demand calm discernment under pressure—weigh counsel from all eight realms before acting.',
      },
    ],
    degrees: [
      {
        id: 'deg-rgh-cert',
        institution: 'regent',
        title: 'Certificate in Eight-Realm Royal Studies',
        level: 'certificate',
        requiredCredits: 6,
        requiredTracks: ['Royal Statecraft'],
        description: 'Foundational royal education in crown charters, succession stewardship, and realm governance.',
      },
      {
        id: 'deg-rgh-empress',
        institution: 'regent',
        title: 'Empress Track Sovereign Distinction',
        level: 'diploma',
        requiredCredits: 12,
        requiredTracks: ['The Empress Track', 'Eight-Realm Diplomacy'],
        description: 'Regent Hall’s exclusive sovereign credential preparing leaders for the highest duties across all eight realms.',
      },
      {
        id: 'deg-rgh-ba',
        institution: 'regent',
        title: 'B.A. in Royal Governance & Eight-Realm Concord',
        level: 'bachelor',
        requiredCredits: 18,
        requiredTracks: ['Royal Statecraft', 'Eight-Realm Diplomacy', 'The Empress Track'],
        description: 'Regent Hall’s flagship royal degree uniting statecraft, diplomacy, and the exclusive Empress Track.',
      },
    ],
    clubs: [
      {
        id: 'club-rgh-council',
        institution: 'regent',
        name: 'Eight-Realms Crown Council',
        category: 'Royal Governance',
        meetingPlace: 'Sovereign Hall Chamber',
        schedule: 'Cycle Day 3 · 18:00',
        description: 'Simulated eight-realm summits, royal charter debates, and inter-realm crisis councils.',
      },
      {
        id: 'club-rgh-envoy',
        institution: 'regent',
        name: 'Royal Diplomatic Circle',
        category: 'Diplomacy',
        meetingPlace: 'Eight-Realms Rotunda',
        schedule: 'Cycle Day 5 · 17:00',
        description: 'Model treaty sessions, courtly protocol briefings, and cross-realm envoy exchanges.',
      },
      {
        id: 'club-rgh-empress',
        institution: 'regent',
        name: 'Empress Track Colloquium',
        category: 'Sovereign Honors',
        meetingPlace: 'Empress Study Cloister',
        schedule: 'Cycle Day 1 · 16:00',
        description: 'Intimate sovereign leadership seminars, ethical statecraft case studies, and realm stewardship dialogues.',
      },
    ],
    bulletins: [
      {
        id: 'bul-rgh-1',
        date: 'Autumn 1000 · Week 2',
        tag: 'EMPRESS TRACK',
        title: 'Autumn 1000 Empress Track Convocation',
        summary: 'Preceptor Rowan Ashworth welcomes candidates to the exclusive Empress Track in the Empress Study Cloister.',
      },
      {
        id: 'bul-rgh-2',
        date: 'Autumn 1000 · Week 4',
        tag: 'EIGHT REALMS',
        title: 'Eight-Realms Royal Summit Practicum',
        summary: 'Admitted scholars across all eight realms convene in the Rotunda for simulated sovereign accord negotiations.',
      },
      {
        id: 'bul-rgh-3',
        date: 'Autumn 1000 · Ongoing',
        tag: 'ADMISSIONS',
        title: 'Regent Hall Royal Admissions Open on VerseNet',
        summary: 'Apply at regenthall.edu/admissions for Eight-Realm Royal Studies and the exclusive Empress Track.',
      },
    ],
  },
];

interface Concept {
  title: string;
  text: string;
  question: string;
  answer: string;
  wrong: string[];
}

interface Track {
  id: string;
  codePrefix: string;
  school: InstitutionId;
  departmentId: string;
  instructorId: string;
  name: string;
  titles: [string, string];
  project: ProjectKind;
  concepts: Concept[];
}

const concept = (title: string, text: string, question: string, answer: string, ...wrong: string[]): Concept => ({
  title,
  text,
  question,
  answer,
  wrong,
});

export const ACADEMIC_TRACKS: Track[] = [
  {
    id: 'cybernetics',
    codePrefix: 'CYB',
    school: 'cyberium',
    departmentId: 'dept-cybernetics',
    instructorId: 'fac-rook',
    name: 'Cybernetics',
    titles: ['Cybernetic Foundations', 'Integrated Cybernetic Systems'],
    project: 'engineering',
    concepts: [
      concept('Feedback', 'A feedback loop compares a measured output with a target and adjusts the next input. A sensor reading is evidence, not permission to increase power without a limit.', 'What guides a feedback controller?', 'The difference between measured output and target', 'The operator’s rank', 'Maximum available power'),
      concept('Calibration', 'Compare a sensor with a known reference before trusting its measurements. Record the offset and repeat the check after maintenance.', 'How do you check a sensor?', 'Compare it with a known reference', 'Assume a new sensor is accurate', 'Disable its warnings'),
      concept('Safe shutdown', 'An independent interlock brings an unstable device to a safe state. Keep it available even when the main controller fails.', 'What protects against controller failure?', 'An independent safety interlock', 'A brighter status light', 'Removing the power limit'),
      concept('Coupled loops', 'Two controllers sharing an actuator can amplify each other’s corrections. Test the combined system under load before increasing gain.', 'What should be tested before increasing gain?', 'The combined system under load', 'Only the idle display', 'The housing color'),
      concept('Fault isolation', 'Compare independent sensors to locate disagreement. Isolate the faulty component rather than replacing the entire measurement with a guess.', 'How should conflicting readings be handled?', 'Compare independent sensors and isolate the fault', 'Average every alarm away', 'Trust the newest reading automatically'),
      concept('Recovery', 'Resume from a known safe checkpoint after verifying sensors and interlocks. Preserve a fault log so later engineers can reproduce the failure.', 'What is needed before restart?', 'Verified safeguards and a known safe checkpoint', 'A cleared fault log', 'An increased output limit'),
    ],
  },
  {
    id: 'spell-engineering',
    codePrefix: 'SPL',
    school: 'cyberium',
    departmentId: 'dept-spell-eng',
    instructorId: 'fac-hex',
    name: 'Spell Engineering',
    titles: ['Spell Engineering', 'Advanced Protocol Design'],
    project: 'compiler',
    concepts: [
      concept('Module contracts', 'Spell modules declare inputs, outputs, and costs. Compatible contracts let a compiler connect modules without relying on their names alone.', 'What establishes module compatibility?', 'Declared input and output contracts', 'Matching colors', 'Identical names'),
      concept('Simulation', 'Test a protocol in a bounded simulation before casting. Examine its effect and resource demand, not only whether compilation succeeds.', 'Where should a new protocol be tested?', 'In a bounded simulation', 'On the public relay first', 'On an unconsenting citizen'),
      concept('Resource budget', 'Compilation draws on stamina and casting can strain aura. Stop when resources are insufficient and use housing recovery before another attempt.', 'What should happen when stamina is insufficient?', 'Recover before compiling again', 'Ignore the resource limit', 'Repeatedly force the cast'),
      concept('Composition', 'A valid pair of modules may still have an unsafe combined effect. Define a target effect and review the composed protocol against it.', 'What should composed protocols be reviewed against?', 'A defined target effect', 'Their longest name', 'Only their purchase price'),
      concept('Containment', 'Limit a protocol’s scope and provide a termination path. Containment keeps a local test from spreading across the civic mesh.', 'What limits an unexpected effect?', 'Bounded scope and a termination path', 'Removing the simulation boundary', 'Broadcasting to more nodes'),
      concept('Reproducibility', 'Record the module pair and observed result. A reproducible protocol can be inspected and tested by another spellwright.', 'What makes a protocol reproducible?', 'Its module pair and observed result', 'Its author’s popularity', 'A secret undocumented change'),
    ],
  },
  {
    id: 'signals',
    codePrefix: 'SIG',
    school: 'cyberium',
    departmentId: 'dept-signals',
    instructorId: 'fac-jeremie',
    name: 'Signal Systems',
    titles: ['Signal Systems', 'Applied Decryption'],
    project: 'engineering',
    concepts: [
      concept('Signal and noise', 'A received message includes both information and noise. Compare repeated samples before treating an isolated spike as an instruction.', 'How should an isolated spike be checked?', 'Compare repeated samples', 'Treat it as an instruction immediately', 'Erase the entire message'),
      concept('Integrity', 'An integrity check reveals whether a payload changed in transit. It does not by itself establish who sent it.', 'What does an integrity check establish?', 'Whether a payload changed', 'The sender’s legal authority', 'The reader’s clearance'),
      concept('Routing', 'A route describes how a message reaches its destination. Verify the destination and avoid sending restricted payloads through untrusted relays.', 'What should be checked before routing a restricted payload?', 'The destination and relay trust', 'Only message length', 'The relay’s visual theme'),
      concept('Authorization', 'Decryption capability does not grant permission to access a message. Confirm scope and authorization before inspecting protected traffic.', 'What is required before decrypting protected traffic?', 'Authorization for the inspection scope', 'Only possession of a tool', 'A faster workstation'),
      concept('Key handling', 'Keep decryption keys separate from public logs. A report can document the process without publishing secrets.', 'Where should keys be kept?', 'Outside public logs', 'In the public report title', 'Inside a shared screenshot'),
      concept('Evidence', 'Preserve the original payload and record each transformation. This lets reviewers distinguish the captured message from the analyst’s interpretation.', 'What should an analyst preserve?', 'The original payload and transformation log', 'Only the final interpretation', 'Only a cropped display'),
    ],
  },
  {
    id: 'civic-history',
    codePrefix: 'CIV',
    school: 'dawn',
    departmentId: 'dept-civic',
    instructorId: 'fac-sol',
    name: 'Civic Studies & History',
    titles: ['Civic Studies & History', 'Applied Public Policy'],
    project: 'civic',
    concepts: [
      concept('Primary sources', 'A charter or contemporary record provides evidence from its own period. Its author and purpose still shape what it can tell us.', 'What should accompany a primary source?', 'Its author, context, and purpose', 'An assumption of perfect neutrality', 'A modern rumor'),
      concept('Chronology', 'Place events in order before claiming one caused another. Sequence can support a hypothesis but does not prove causation.', 'Does sequence alone prove causation?', 'No; other evidence is needed', 'Always', 'Only for official records'),
      concept('Public institutions', 'Civic institutions exercise defined responsibilities. A policy proposal should identify the institution responsible for carrying it out.', 'What must a practical policy identify?', 'The responsible institution', 'Only a slogan', 'The author’s favorite realm'),
      concept('Policy evidence', 'Compare the needs of affected citizens using documented evidence. A vivid anecdote can raise a question without representing the whole population.', 'What supports a population-level decision?', 'Documented evidence from affected groups', 'One vivid anecdote alone', 'The loudest speaker'),
      concept('Tradeoffs', 'A policy allocates limited resources. State costs and benefits, including who receives each, rather than promising an outcome without a budget.', 'What should a policy disclose?', 'Costs, benefits, and their distribution', 'Only its best possible outcome', 'Only its title'),
      concept('Evaluation', 'Choose an observable measure before implementation. Review results and revise a policy when the evidence does not support its intended effect.', 'How should policy effectiveness be assessed?', 'With a predefined observable measure', 'With the author’s confidence', 'By never revisiting the decision'),
    ],
  },
  {
    id: 'natural-sciences',
    codePrefix: 'NAT',
    school: 'dawn',
    departmentId: 'dept-natsci',
    instructorId: 'fac-alden',
    name: 'Natural Sciences',
    titles: ['Natural Sciences', 'Aether Ecology'],
    project: 'archive',
    concepts: [
      concept('Observation', 'Separate what an instrument measures from the explanation you propose. Record conditions and units alongside every observation.', 'What belongs with a measurement?', 'Conditions and units', 'Only an interpretation', 'A guaranteed explanation'),
      concept('Controls', 'A control provides a comparison for the factor being tested. Change one factor where possible so competing explanations remain visible.', 'Why use a control?', 'To compare the tested factor', 'To guarantee the desired result', 'To hide unexpected data'),
      concept('Replication', 'Repeat measurements and report variation. A single result may reflect chance or an unrecognized condition.', 'What increases confidence in a result?', 'Repeated measurements with reported variation', 'Selecting only the largest reading', 'Discarding every disagreement'),
      concept('Aether gradients', 'Compare readings at multiple distances from an aether source. A gradient describes a pattern; it does not establish the source of every observed change.', 'What describes an aether gradient?', 'Readings compared across distance', 'A single unlabeled sample', 'A citizen’s rank'),
      concept('Ecosystem effects', 'Aether exposure can affect connected organisms differently. Compare several indicators rather than assuming one species represents an entire habitat.', 'What supports an ecosystem assessment?', 'Several biological and environmental indicators', 'Only one favored species', 'Only the brightest glow'),
      concept('Stewardship', 'Minimize disturbance during sampling and retain enough context for future comparisons. Research should not destroy the habitat it aims to understand.', 'What is responsible sampling?', 'Minimal disturbance with recorded context', 'Collecting every organism', 'Changing all conditions before measuring'),
    ],
  },
  {
    id: 'arcane-humanities',
    codePrefix: 'ARC',
    school: 'dawn',
    departmentId: 'dept-humanities',
    instructorId: 'fac-lorne',
    name: 'Arcane Humanities',
    titles: ['Arcane Humanities', 'Comparative Arcane Traditions'],
    project: 'archive',
    concepts: [
      concept('Situated knowledge', 'Arcane practices carry the histories of their communities. Describe who practices a tradition and how practitioners explain its purpose.', 'Whose account helps explain a tradition?', 'Its practitioners’ contextual accounts', 'Only an outsider’s label', 'An anonymous stereotype'),
      concept('Interpretation', 'Distinguish a source’s words from your interpretation. Several readings can be plausible, but each should be supported by evidence.', 'What supports an interpretation?', 'Evidence with a clear distinction from quotation', 'The absence of a source', 'Repeating a claim more often'),
      concept('Consent', 'Sacred or restricted knowledge is not automatically public research material. Respect the permissions and limits set by its custodians.', 'What governs use of restricted tradition records?', 'Custodian permission and stated limits', 'Curiosity alone', 'The researcher’s speed'),
      concept('Comparison', 'Compare traditions using explicit questions rather than ranking communities by a single standard. Similar forms may carry different meanings.', 'How should traditions be compared?', 'With explicit contextual questions', 'By assuming similar forms mean the same thing', 'By ranking all communities identically'),
      concept('Translation', 'Document terms whose meanings do not map cleanly across traditions. Keep the original context visible instead of hiding uncertainty.', 'What should a careful translation preserve?', 'Context and acknowledged uncertainty', 'A false claim of exact equivalence', 'Only the shortest wording'),
      concept('Reciprocity', 'Share research findings in an accessible form with participating communities. Invite correction and credit knowledge holders.', 'What supports reciprocal research?', 'Accessible findings, correction, and credit', 'Removing contributors’ names', 'Withholding all results'),
    ],
  },
  {
    id: 'royal-statecraft',
    codePrefix: 'RYL',
    school: 'regent',
    departmentId: 'dept-royal-studies',
    instructorId: 'fac-corvin',
    name: 'Royal Statecraft',
    titles: ['Foundations of Eight-Realm Governance', 'Royal Charters & Realm Stewardship'],
    project: 'civic',
    concepts: [
      concept('Crown charter', 'Every royal decree across the eight realms derives its legitimacy from an enacted charter. Sovereign leaders cite the governing compact before exercising extraordinary powers.', 'What legitimizes a royal decree?', 'A specific grant of authority in an enacted charter', 'The urgency of a court rumor', 'Personal preference alone'),
      concept('Realm equity', 'Governing all eight realms requires weighing regional needs fairly so no outlying province bears hidden burdens for the capital’s convenience.', 'What does eight-realm equity require?', 'Weighing regional needs fairly across all eight realms', 'Prioritizing only the capital city', 'Ignoring outlying realm petitions'),
      concept('Succession covenants', 'Clear succession covenants protect stability across generations by defining eligibility, stewardship oaths, and peaceful transfer of crown duties.', 'What do succession covenants protect?', 'Long-term stability and peaceful transfer of stewardship', 'Unchecked secrecy in court', 'Eliminating all written records'),
      concept('Counsel & review', 'A wise sovereign invites independent counsel before ratifying major policies, testing assumptions against documented evidence from each realm.', 'Why should a sovereign invite independent counsel?', 'To test assumptions against documented evidence from each realm', 'To hear only flattering agreement', 'To delay every decision indefinitely'),
      concept('Recusal & integrity', 'A royal adjudicator with a personal stake in a realm dispute must step aside and entrust the hearing to an impartial council.', 'How should a conflict of interest be handled?', 'Step aside and entrust the hearing to an impartial council', 'Proceed privately without disclosure', 'Erase the petition after deciding'),
      concept('Public remedies', 'When a crown policy harms citizens of any realm, an accountable throne provides a documented remedy and preserves the record of correction.', 'What should a royal correction preserve?', 'A documented remedy alongside the record of correction', 'An erased history with no log', 'Only an informal verbal promise'),
    ],
  },
  {
    id: 'diplomacy',
    codePrefix: 'DIP',
    school: 'regent',
    departmentId: 'dept-diplomacy',
    instructorId: 'fac-delacroix',
    name: 'Eight-Realm Diplomacy',
    titles: ['Eight-Realm Diplomatic Protocol', 'Royal Treaties & Realm Mediation'],
    project: 'civic',
    concepts: [
      concept('Mandate clarity', 'A royal envoy negotiates within a written mandate from their realm. Clarifying authority limits early prevents promises that cannot be ratified.', 'Why must an envoy clarify their mandate?', 'To avoid commitments that cannot be ratified', 'To delay all discussions indefinitely', 'To hide their realm’s identity'),
      concept('Interest mapping', 'Stated court positions often conceal deeper security, trade, or cultural needs. Mapping each realm’s constraints reveals enduring compromises.', 'What helps uncover enduring compromises?', 'Mapping each realm’s underlying interests and constraints', 'Repeating opening demands louder', 'Ignoring smaller realm delegations'),
      concept('Protocol neutrality', 'Balanced seating, accurate translation, and equal speaking time protect eight-realm summits from procedural grievances.', 'What does procedural neutrality prevent?', 'Disputes over unfair process derailing royal talks', 'Written records of agreements', 'Participation by accredited envoys'),
      concept('Ratification clauses', 'A realm accord should specify how and when it enters into force, which councils ratify it, and how wording disputes are settled.', 'What makes a treaty operational?', 'Clear ratification terms and dispute mechanisms', 'Vague slogans without timelines', 'Unrecorded side promises'),
      concept('De-escalation', 'During an inter-realm impasse, separating verified facts from rhetoric and proposing bounded confidence-building steps keeps dialogue alive.', 'What helps during an impasse?', 'Separating verified facts from rhetoric with bounded steps', 'Closing all diplomatic channels', 'Issuing unverified ultimatums'),
      concept('Verification', 'Enduring accords across the eight realms include mutually agreed verification methods so compliance is demonstrated through evidence.', 'How is treaty compliance sustained?', 'Through mutually agreed, evidence-based verification', 'By prohibiting all inspections', 'By assuming goodwill indefinitely'),
    ],
  },
  {
    id: 'empress-track',
    codePrefix: 'EMP',
    school: 'regent',
    departmentId: 'dept-empress-track',
    instructorId: 'fac-ashworth',
    name: 'The Empress Track',
    titles: ['Empress Track: Sovereign Discernment', 'Empress Track: Concord of the Eight Realms'],
    project: 'archive',
    concepts: [
      concept('Sovereign discernment', 'The Empress Track trains leaders to separate urgent noise from structural crisis, verifying primary intelligence from every realm before issuing a directive.', 'What defines sovereign discernment?', 'Verifying primary intelligence before issuing a directive', 'Reacting instantly to unverified rumors', 'Relying solely on a single advisor'),
      concept('Custodial legitimacy', 'Royal lineage and historical charters carry obligations of stewardship; the Empress Track emphasizes proving legitimacy through service and verified records.', 'How is custodial legitimacy sustained?', 'Through accountable stewardship and verified records', 'By suppressing historical records', 'Through ceremonial titles alone'),
      concept('Eight-realm balance', 'A policy that strengthens one realm while destabilizing another weakens the whole concord. Balance requires modeling second-order effects across all eight realms.', 'What must sovereign policy model?', 'Second-order effects across all eight realms', 'Only immediate capital-city gains', 'Only short-term court popularity'),
      concept('Ethical delegation', 'No ruler governs alone. Delegating clear scopes of authority with measurable oversight empowers capable ministers without surrendering accountability.', 'What makes delegation effective?', 'Clear authority scopes paired with measurable oversight', 'Delegating with no review or limits', 'Refusing to delegate any responsibility'),
      concept('Crisis continuity', 'During a realm-wide emergency, pre-established continuity protocols protect essential services, citizen safety, and transparent communication.', 'What protects citizens during a realm crisis?', 'Pre-established continuity protocols and transparent communication', 'Improvising in total secrecy', 'Suspending all verification checks'),
      concept('Enduring concord', 'The highest aim of the Empress Track is leaving institutions stronger, fairer, and more unified across all eight realms than one inherited them.', 'What is the highest aim of the Empress Track?', 'Leaving all eight realms stronger, fairer, and more unified', 'Consolidating personal power without oversight', 'Avoiding all institutional reform'),
    ],
  },
];

export interface AcademicQuestion {
  prompt: string;
  options: string[];
  correct: number;
}

export interface AcademicCourse {
  id: string;
  code: string;
  credits: number;
  level: 100 | 200;
  term: string;
  institution: InstitutionId;
  departmentId: string;
  instructorId: string;
  track: string;
  title: string;
  prerequisite?: string;
  syllabus: {
    overview: string;
    outcomes: string[];
    weights: { lessons: number; project: number; exam: number };
  };
  lessons: { title: string; text: string }[];
  quiz: AcademicQuestion[];
  project: {
    id: string;
    kind: ProjectKind;
    title: string;
    source: string;
    passage: string;
    question: AcademicQuestion;
  };
}

export const COURSES: AcademicCourse[] = ACADEMIC_TRACKS.flatMap(track =>
  track.titles.map((title, level) => {
    const concepts = track.concepts.slice(level * 3, level * 3 + 3);
    const id = `${track.id}-${level + 1}`;
    const code = `${track.codePrefix}-${level === 0 ? '101' : '201'}`;
    const projectConcept = concepts[2];
    const question = (c: Concept, index: number): AcademicQuestion => {
      const options = [c.answer, ...c.wrong];
      const correct = index % options.length;
      options.splice(correct, 0, options.shift()!);
      return { prompt: c.question, options, correct };
    };
    const labSource =
      track.school === 'dawn'
        ? 'Dawnson Concord Reading Hall'
        : track.school === 'regent'
          ? 'Empress Study Cloister'
          : 'Compiler Lab 4';
    return {
      id,
      code,
      credits: 3,
      level: level === 0 ? 100 : 200,
      term: 'Autumn 1000',
      institution: track.school,
      departmentId: track.departmentId,
      instructorId: track.instructorId,
      track: track.name,
      title,
      prerequisite: level ? `${track.id}-1` : undefined,
      syllabus: {
        overview: `${title} explores ${concepts.map(c => c.title.toLowerCase()).join(', ')} through guided readings, a verified practical project, and a comprehensive assessment.`,
        outcomes: concepts.map(c => `Apply ${c.title.toLowerCase()} principles in verifiable academic and civic contexts.`),
        weights: { lessons: 20, project: 30, exam: 50 },
      },
      lessons: concepts.map(c => ({ title: c.title, text: c.text })),
      quiz: [
        ...concepts.map(question),
        {
          prompt: 'Which record supports a defensible academic result?',
          options: ['An undocumented conclusion', 'Evidence and a reproducible method', 'A claim based only on seniority'],
          correct: 1,
        },
        {
          prompt: 'What should happen when evidence conflicts with your hypothesis?',
          options: ['Discard the conflicting evidence', 'Declare success anyway', 'Review the hypothesis and preserve the evidence'],
          correct: 2,
        },
      ],
      project: {
        id: `project:${id}`,
        kind: track.project,
        title: `${title}: applied review`,
        source: `${labSource} / ${code} field note`,
        passage: `${projectConcept.text} ${concepts[0].text}`,
        question: question(projectConcept, level + 1),
      },
    };
  }),
);

export interface AcademicEnrollment {
  status: 'active' | 'withdrawn';
  enrolledAt: string;
  term?: string;
  lessons: number[];
  bestScore: number | null;
  attempts: number;
  projectOpenedAt?: string;
  projectCompletedAt?: string;
  completedAt?: string;
  rewardClaimed?: boolean;
}

export interface InstitutionalAdmission {
  institution: InstitutionId;
  status: 'admitted';
  studentId: string;
  declaredProgramId?: string;
  statement?: string;
  appliedAt: string;
  admittedAt: string;
}

export interface AcademicAudit {
  id: string;
  actor: string;
  citizen: string;
  course: string;
  at: string;
  reason: string;
  before: AcademicEnrollment | null;
  after: AcademicEnrollment;
}

export interface AcademicState {
  records: Record<string, Record<string, AcademicEnrollment>>;
  admissions: Record<string, Partial<Record<InstitutionId, InstitutionalAdmission>>>;
  clubs: Record<string, string[]>;
  activeTerm: string;
  audit: AcademicAudit[];
  pendingSync: Record<string, string>;
}

export const DEFAULT_ACADEMIC_TERM = 'Autumn 1000';

export const emptyAcademics = (): AcademicState => ({
  records: {},
  admissions: {},
  clubs: {},
  activeTerm: DEFAULT_ACADEMIC_TERM,
  audit: [],
  pendingSync: {},
});

export const academicCitizenId = (state: any): string | null =>
  state.gameplay.identity?.canonicalPersonId || state.gameplay.identity?.citizenId || null;

export const coursePassed = (record?: AcademicEnrollment) => !!record?.completedAt;

export const gradeLabel = (score: number | null) =>
  score === null ? '—' : score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

export const gpaPoints = (score: number | null): number | null =>
  score === null
    ? null
    : score >= 90
      ? 4.0
      : score >= 85
        ? 3.5
        : score >= 80
          ? 3.0
          : score >= 75
            ? 2.5
            : score >= 70
              ? 2.0
              : score >= 60
                ? 1.0
                : 0.0;

export function calculateGpa(records: Record<string, AcademicEnrollment> = {}, institution?: InstitutionId): number | null {
  let totalPoints = 0;
  let totalCredits = 0;
  for (const course of COURSES) {
    if (institution && course.institution !== institution) continue;
    const rec = records[course.id];
    if (!rec || rec.bestScore === null) continue;
    if (!rec.completedAt && rec.status === 'withdrawn') continue;
    const pts = gpaPoints(rec.bestScore);
    if (pts === null) continue;
    totalPoints += pts * course.credits;
    totalCredits += course.credits;
  }
  if (!totalCredits) return null;
  return Math.round((totalPoints / totalCredits) * 100) / 100;
}

export function academicStanding(gpa: number | null, completedCredits: number): string {
  if (gpa === null) return completedCredits > 0 ? 'Good Standing' : 'Prospective';
  if (gpa >= 3.7 && completedCredits >= 3) return "Dean's List";
  if (gpa >= 2.0) return 'Good Standing';
  return 'Academic Warning';
}

export function isAdmittedToInstitution(
  academics: AcademicState | undefined,
  citizenId: string | null,
  institution: InstitutionId,
): boolean {
  if (!citizenId || !academics) return false;
  if (academics.admissions?.[citizenId]?.[institution]?.status === 'admitted') return true;
  // Backwards compatibility: existing saves with recorded courses at an institution count as admitted.
  const recs = academics.records?.[citizenId] || {};
  return COURSES.some(c => c.institution === institution && Boolean(recs[c.id]));
}

export function getAdmissionRecord(
  academics: AcademicState | undefined,
  citizenId: string | null,
  institution: InstitutionId,
): InstitutionalAdmission | null {
  if (!citizenId || !academics) return null;
  const explicit = academics.admissions?.[citizenId]?.[institution];
  if (explicit) return explicit;
  if (isAdmittedToInstitution(academics, citizenId, institution)) {
    const prefix = institution === 'cyberium' ? 'CYA' : institution === 'dawn' ? 'DWN' : 'RGH';
    return {
      institution,
      status: 'admitted',
      studentId: `${prefix}-1000-LEGACY`,
      appliedAt: '1000-01-01T00:00:00.000Z',
      admittedAt: '1000-01-01T00:00:00.000Z',
    };
  }
  return null;
}

export function degreeProgress(records: Record<string, AcademicEnrollment> = {}, institution: InstitutionId) {
  const school = INSTITUTIONS.find(s => s.id === institution)!;
  const completedTracks = ACADEMIC_TRACKS.filter(
    t => t.school === institution && COURSES.filter(c => c.track === t.name).every(c => coursePassed(records[c.id])),
  ).map(t => t.name);
  const credits = COURSES.filter(c => c.institution === institution && coursePassed(records[c.id])).reduce(
    (sum, c) => sum + c.credits,
    0,
  );
  return school.degrees.map(deg => {
    const tracksMet = deg.requiredTracks.every(tr => completedTracks.includes(tr));
    const earned = credits >= deg.requiredCredits && tracksMet;
    const percent = Math.min(100, Math.round((credits / deg.requiredCredits) * 100));
    return { degree: deg, credits, requiredCredits: deg.requiredCredits, completedTracks, earned, percent };
  });
}

export function academicSummary(records: Record<string, AcademicEnrollment> = {}) {
  return INSTITUTIONS.map(school => {
    const courses = COURSES.filter(c => c.institution === school.id && records[c.id]);
    const passed = courses.filter(c => coursePassed(records[c.id]));
    const certificates = ACADEMIC_TRACKS.filter(
      t => t.school === school.id && COURSES.filter(c => c.track === t.name).every(c => coursePassed(records[c.id])),
    ).map(t => t.name);
    const credits = passed.reduce((sum, c) => sum + c.credits, 0);
    const gpa = calculateGpa(records, school.id);
    const degrees = degreeProgress(records, school.id).filter(d => d.earned).map(d => d.degree.title);
    return { school, courses, credits, certificates, gpa, degrees, standing: academicStanding(gpa, credits) };
  });
}
