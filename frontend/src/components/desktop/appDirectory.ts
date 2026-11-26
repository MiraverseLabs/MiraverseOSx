import { DESKTOP_APP_IDS } from '../../store/desktopPreferences';
import { Briefcase, Bookmark, Cpu, Home, Sparkles, Globe, Mail, MessageSquare, UserCheck, Radio, Folder, BookOpen, Terminal, Settings, Shield, Activity, Landmark, ContactRound, Fingerprint, FileText, GraduationCap, Grid2X2, Package } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { APPS } from '../../apps/contents';
import { useOSStore } from '../../store/useOSStore';

export interface ProtocolItem {
  id: string;
  code: string;
  name: string;
  label?: string;
  sector: string;
  icon?: LucideIcon;
  clearance: string;
  aetherTrace: string;
  flux: string;
  desc: string;
  color: string;
  bg: string;
  border: string;
}

export const PROTOCOLS: ProtocolItem[] = [
  {
    id: 'dgaos',
    code: 'DGAOS',
    name: 'DGAOS // Agency Command Center',
    label: 'DGAOS // Agency Command Center',
    sector: 'Department of Global Affairs',
    icon: Shield,
    clearance: 'DGA Senior Officer Clearance',
    aetherTrace: 'AT-0x0901',
    flux: '35.4 MHz',
    desc: 'Agency headquarters: strategic operations, divisions (SHIELD/EYES), investigations, forensic dispatches, and comms.',
    color: 'text-purple-950',
    bg: 'bg-purple-100/80',
    border: 'border-purple-400'
  },
  {
    id: 'meridionRegistry',
    code: 'AURA',
    name: 'AURA // Citizen Registry',
    label: 'AURA // Citizen Registry',
    sector: 'Meridion Civic Identity',
    icon: ContactRound,
    clearance: 'Civic Authority Standard',
    aetherTrace: 'AT-0x0118',
    flux: '19.2 MHz',
    desc: 'Official citizen identity archive: ancestry, affinities, ten-print biometrics, Aura ID, and document studio issuance.',
    color: 'text-indigo-900',
    bg: 'bg-indigo-50',
    border: 'border-indigo-300'
  },
  {
    id: 'documentStudio',
    code: 'STUDIO',
    name: 'STUDIO // Nine-Document Packet',
    label: 'STUDIO // Nine-Document Packet',
    sector: 'Aureline Civic & Crown Archives',
    icon: FileText,
    clearance: 'Civic Records Authority',
    aetherTrace: 'AT-0x0119',
    flux: '24.1 MHz',
    desc: 'Formal nine-document civic and forensic packet generator: passport booklet, birth certificate, biometrics, and local portrait synthesis.',
    color: 'text-purple-900',
    bg: 'bg-purple-50',
    border: 'border-purple-300'
  },
  {
    id: 'creativeStudio',
    code: 'MEDIA',
    name: 'CREATIVE // Editorial & Brand Studio',
    label: 'CREATIVE // Editorial & Brand Studio',
    sector: 'Meridian Press & Velvet Guild',
    icon: Sparkles,
    clearance: 'Citizen / Press / Admin',
    aetherTrace: 'AT-0x0124',
    flux: '26.4 MHz',
    desc: 'Shared visual template composer, World Asset Library browser, brand palettes, periodical publishing, and Admin Canon Console.',
    color: 'text-rose-900',
    bg: 'bg-rose-50',
    border: 'border-rose-300'
  },
  {
    id: 'passport',
    code: 'CIVIC',
    name: 'Citizen Hub',
    label: 'Citizen Hub',
    sector: 'Personal civic services',
    icon: UserCheck,
    clearance: 'Level 1 Citizen',
    aetherTrace: 'AT-0x0114',
    flux: '18.4 MHz',
    desc: 'Your personal profile, document history, civic services, residence, and progress. AURA retains the official identity record.',
    color: 'text-amber-800',
    bg: 'bg-amber-50',
    border: 'border-amber-300'
  },
  {
    id: 'housing',
    code: 'MY HOME',
    name: 'My Home · Suite 4B',
    sector: 'Vector House · Aureline',
    icon: Home,
    clearance: 'Resident Clearance',
    aetherTrace: 'AT-0x0289',
    flux: '32.1 MHz',
    desc: 'Your personal Suite 4B residence: rest & recovery, study desk, keepsake shelf, room ambiance, pinboard, and guest hangouts.',
    color: 'text-indigo-800',
    bg: 'bg-indigo-50',
    border: 'border-indigo-300'
  },
  {
    id: 'jobs',
    code: 'WORKNET',
    name: 'WORKNET // Federal Access',
    sector: 'Federal Career Network',
    icon: Briefcase,
    clearance: 'Contractor Level 1',
    aetherTrace: 'AT-0x0340',
    flux: '24.6 MHz',
    desc: 'Centralized federal work access across DGA, Faith Medical Clinic, Sovereign Treasury & Historic Archives.',
    color: 'text-amber-900',
    bg: 'bg-amber-100/60',
    border: 'border-amber-400'
  },
  {
    id: 'comms',
    code: 'COMMS',
    name: 'COMMS // Institutional Network',
    sector: 'Institutional Comms Grid',
    icon: MessageSquare,
    clearance: 'Encrypted Netmesh',
    aetherTrace: 'AT-0x0412',
    flux: '28.0 MHz',
    desc: 'Dual-pane instant messaging mesh, encrypted Cyberium Academy student channels, and priority career dispatches.',
    color: 'text-emerald-800',
    bg: 'bg-emerald-50',
    border: 'border-emerald-300'
  },
  {
    id: 'finance',
    code: 'ORYN Vault',
    name: 'ORYN // Personal Treasury',
    sector: 'First Orynvell Bank',
    clearance: 'High Council Audited',
    aetherTrace: 'AT-0x0508',
    flux: '21.5 MHz',
    desc: 'Everyday accounts, savings, resident transfers, and your saved transaction history.',
    color: 'text-amber-950',
    bg: 'bg-amber-200/60',
    border: 'border-amber-400'
  },
  {
    id: 'browser',
    code: 'VERSENET',
    name: 'VerseNet',
    sector: 'Versenet Quantum Web',
    clearance: 'Unrestricted Gateway',
    aetherTrace: 'AT-0x0899',
    flux: '48.2 MHz',
    desc: 'Browse VerseNet, open Citizen Hub services and WORKNET opportunities, or access the external Service Directory.',
    color: 'text-sky-800',
    bg: 'bg-sky-50',
    border: 'border-sky-300'
  },
  {
    id: 'process',
    code: 'SYSTEM',
    name: 'SYSTEM // Kernel & PRISM Monitor',
    sector: 'PRISM Core Kernel',
    clearance: 'Root Shell Privilege',
    aetherTrace: 'AT-0x0001',
    flux: '14.2 MHz',
    desc: 'Deep kernel thread inspector, origin trace diagnostics, resource telemetry, and PRISM corruption isolation.',
    color: 'text-slate-800',
    bg: 'bg-slate-100',
    border: 'border-slate-300'
  },
  {
    id: 'vitals',
    code: 'VITALS',
    name: 'VITALS // Bio-Aura Matrix',
    sector: 'Faith Medical Telemetry',
    clearance: 'Patient Baseline',
    aetherTrace: 'AT-0x0910',
    flux: '37.2 MHz',
    desc: 'Real-time bio-aura integrity diagnostics, condition tracking, Veil exposure analysis, and recovery status.',
    color: 'text-rose-800',
    bg: 'bg-rose-50',
    border: 'border-rose-300'
  },
  {
    id: 'lore',
    code: 'LIBRARY',
    name: 'Royal Archive & Library',
    sector: 'Royal Historic Society',
    clearance: 'Public Archive & Library',
    aetherTrace: 'AT-0x1120',
    flux: '16.5 MHz',
    desc: 'Royal Historic Society & Meridion Public Archives: reader dashboard, research catalog, library guides, patron library cards, and Seven Realms atlas.',
    color: 'text-indigo-800',
    bg: 'bg-indigo-50',
    border: 'border-indigo-300'
  },
  {
    id: 'files',
    code: 'FYLO',
    name: 'Fylo // File Manager',
    sector: 'Fylo Systems',
    clearance: 'File System Standard',
    aetherTrace: 'AT-0x1044',
    flux: '20.1 MHz',
    desc: 'Fylo Systems personal file manager: folders, personal notes, retained attachments, 30 canonical file formats, and Trash.',
    color: 'text-amber-800',
    bg: 'bg-amber-50',
    border: 'border-amber-300'
  },
  {
    id: 'campus',
    code: 'CAMPUS',
    name: 'CAMPUS // Academic Registrar',
    sector: 'Meridion Higher Education',
    clearance: 'Student Enrollment',
    aetherTrace: 'AT-0x0218',
    flux: '19.4 MHz',
    desc: 'Unified Student IDs, GPA, degree audits, and transcripts across Cyberium Academy, Dawn University (Dawnson), and Regent Hall.',
    color: 'text-blue-900',
    bg: 'bg-blue-50',
    border: 'border-blue-300'
  },
];

const GROUPS: Record<string, string> = {
  dgaos: 'Agency', jobs: 'Agency',
  meridionRegistry: 'Civic', documentStudio: 'Civic', campus: 'Civic', study: 'Civic',
  passport: 'Personal', housing: 'Personal', post: 'Personal', finance: 'Personal', vitals: 'Personal',
  browser: 'Connect', comms: 'Connect', mail: 'Connect', maispace: 'Connect', pulse: 'Connect',
  files: 'Tools', process: 'Tools', lore: 'Tools', spellforge: 'Tools', terminal: 'Tools', settings: 'Tools',
};

const additionalApps: ProtocolItem[] = [
  { id: 'creativeStudio', code: 'STUDIO', name: 'STUDIO // Creative & Release Studio', sector: 'Culture, Media & Entertainment', icon: Sparkles, clearance: 'Citizen Creator', aetherTrace: 'AT-0x0311', flux: '24.6 MHz', desc: 'Compose periodical articles, MAI.SPACE media, performer portfolios, studio recordings, Songbird releases, and venue bookings.', color: 'text-rose-900', bg: 'bg-rose-50', border: 'border-rose-300' },
  { id: 'study', code: 'AURELEARN', name: 'AURELEARN // Student LMS', sector: 'Coursework & Exams', icon: BookOpen, clearance: 'Admitted Scholar', aetherTrace: 'AT-0x0219', flux: '21.0 MHz', desc: 'Read course modules, take assessments, track your gradebook, and launch practical labs across all admitted institutions.', color: 'text-sky-900', bg: 'bg-sky-50', border: 'border-sky-300' },
  { id: 'spellforge', code: 'SPELLFORGE', name: 'SPELLFORGE // Protocol Lab', sector: 'Compiler Lab 4', icon: Sparkles, clearance: 'Lab Access', aetherTrace: 'AT-0x0220', flux: '44.8 MHz', desc: 'Synthesize elemental and utility spell modules and verify Cyberium Academy Spell Engineering practical projects.', color: 'text-purple-900', bg: 'bg-purple-50', border: 'border-purple-300' },
  { id: 'fieldOperations', code: 'FIELD', name: 'Field Operations', sector: 'DGA service tunnels', icon: Shield, clearance: 'Assignment Clearance 2', aetherTrace: 'AT-0x0512', flux: '88.2 MHz', desc: 'Explore Tunnel 09, collect evidence, interview a witness, and submit containment findings to WORKNET.', color: 'text-emerald-900', bg: 'bg-emerald-50', border: 'border-emerald-300' },
  { id: 'maispace', code: 'mai.space', name: 'mai.space // Social Network', sector: 'Personal social network', icon: MessageSquare, clearance: 'Citizen Access', aetherTrace: 'AT-0x0733', flux: '22.0 MHz', desc: 'Your existing social profile, posts, friends, and community interactions.', color: 'text-rose-800', bg: 'bg-rose-50', border: 'border-rose-300' },
  { id: 'mail', code: 'AUREMAIL', name: 'AureMail', sector: 'AureMail Digital Relay', icon: Mail, clearance: 'Citizen Access', aetherTrace: 'AT-0x0413', flux: '22.0 MHz', desc: 'Digital email client for personal messages, institutional notices, academic admissions, and delivery alerts.', color: 'text-sky-800', bg: 'bg-sky-50', border: 'border-sky-300' },
  { id: 'post', code: 'POST', name: 'POST // Meridion Post', sector: 'Physical Mail & Parcel Locker', icon: Package, clearance: 'Residential Suite 4B', aetherTrace: 'AT-0x0414', flux: '18.2 MHz', desc: 'Physical residential mailbox, parcel locker unboxing, wax-sealed letters, live shipment tracking, and outbound shipping.', color: 'text-amber-900', bg: 'bg-amber-50', border: 'border-amber-300' },
  { id: 'terminal', code: 'TERMINAL', name: 'TERMINAL // System Console', sector: 'Local System Tools', icon: Terminal, clearance: 'Local Console', aetherTrace: 'AT-0x0002', flux: '14.2 MHz', desc: 'Explore the local system through the command console and SQL workspace.', color: 'text-slate-800', bg: 'bg-slate-100', border: 'border-slate-300' },
  { id: 'settings', code: 'SETTINGS', name: 'SETTINGS // Preferences', sector: 'System Preferences', icon: Settings, clearance: 'Citizen Access', aetherTrace: 'AT-0x0003', flux: '14.2 MHz', desc: 'Make your workspace your own. Manage your system preferences and audio settings.', color: 'text-indigo-800', bg: 'bg-indigo-50', border: 'border-indigo-300' },
];

const FALLBACK_ICONS: Record<string, LucideIcon> = { finance: Landmark, board: Bookmark, browser: Globe, process: Cpu, pulse: Radio, vitals: Activity, lore: BookOpen, files: Folder, spellforge: Sparkles, campus: GraduationCap };

const APP_ORDER = DESKTOP_APP_IDS;

export const APPS_DIRECTORY = [...PROTOCOLS, ...additionalApps].map((app) => ({
  ...app,
  icon: app.icon || FALLBACK_ICONS[app.id] || Grid2X2,
  label: app.name.split(' // ')[1] || app.name,
  category: GROUPS[app.id] || 'Tools',
})).sort((a, b) => APP_ORDER.indexOf(a.id) - APP_ORDER.indexOf(b.id));

// Shortcuts bring existing windows forward instead of minimizing them.
export function launchDesktopApp(id: string) {
  const store = useOSStore.getState();
  if (store.windows.some((window) => window.id === id)) {
    store.focusWindow(id);
    return;
  }
  const app = APPS.find((candidate) => candidate.id === id);
  const metadata = APPS_DIRECTORY.find((candidate) => candidate.id === id);
  store.toggleApp(app || { id, title: metadata?.name || id });
}
