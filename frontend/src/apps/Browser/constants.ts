import { 
    Activity, Building, Shield, BookOpen, Globe, Newspaper, 
    FileText, Landmark, Truck, Eye, Grid, LucideIcon, Sparkles 
} from 'lucide-react';
import { ENTERTAINMENT_SITES } from './entertainment/entertainmentRouter';

export interface PortalInfo {
    title: string;
    category: string;
    icon: LucideIcon;
    accent: string;
    domain: string;
}

export interface SampleArchive {
    id: string;
    title: string;
    address: string;
    type: string;
    excerpt: string;
}

export const PORTALS: Record<string, PortalInfo> = {
    'cyberium.edu': { title: 'Cyberium Academy', category: 'Academic Portal', icon: Building, accent: 'purple', domain: 'cyberium.edu' },
    'dawn.edu': { title: 'Dawn University', category: 'Academic Portal', icon: Building, accent: 'amber', domain: 'dawn.edu' },
    'meridian.mer': { title: 'The Meridian', category: 'News Analysis Perspective World Politics Economy Culture Eight Realms', icon: Newspaper, accent: 'blue', domain: 'meridian.mer' },
    'dispatch.mer': { title: 'The Meridian (Meridion Dispatch)', category: 'News Headlines Civic Health Economy Culture', icon: Newspaper, accent: 'purple', domain: 'dispatch.mer' },
    'socialregister.mer': { title: 'The Social Register', category: 'Society Magazine Courts Style Interview Residences Heritage Calendar', icon: BookOpen, accent: 'rose', domain: 'socialregister.mer' },
    'companion.aure': { title: 'Aureline Companion', category: 'Dogs Cats Companions Community Profiles Enquiries', icon: Globe, accent: 'purple', domain: 'companion.aure' },
    'gardenreview.aure': { title: 'Glassline Garden Review', category: 'Plants Garden Visitors Community Profiles', icon: Building, accent: 'purple', domain: 'gardenreview.aure' },
    'readingroom.aure': { title: 'Aureline Open Reading Room', category: 'Library Education Research Profiles Records', icon: BookOpen, accent: 'purple', domain: 'readingroom.aure' },
    'versenet.aure': { title: 'Versenet Search Engine', category: 'Search Engine', icon: Globe, accent: 'green', domain: 'versenet.aure' },
    'worknet.aure': { title: 'WorkNet', category: 'Work Careers Jobs Opportunities', icon: Building, accent: 'emerald', domain: 'worknet.aure' },
    'civinet.mer': { title: 'CIVINET Municipal Services Hub', category: 'Civic Governance', icon: Landmark, accent: 'indigo', domain: 'civinet.mer' },
    'questnotice.mer': { title: 'QUESTNOTICE Civic Notice Tracker', category: 'Public Errands', icon: FileText, accent: 'amber', domain: 'questnotice.mer' },
    'royalhistory.mer': { title: 'Royal Historic Society', category: 'Restricted Archive', icon: BookOpen, accent: 'cyan', domain: 'royalhistory.mer' },
    'faithmed.aure': { title: 'Faith Medical Group', category: 'Medical Intranet', icon: Activity, accent: 'emerald', domain: 'faithmed.aure' },
    'dga.gov': { title: 'Department of Global Affairs', category: 'Global Affairs', icon: Shield, accent: 'blue', domain: 'dga.gov' },
    'records.orynvell.gov': { title: 'Orynvell Public Records', category: 'Legal & Deeds', icon: FileText, accent: 'amber', domain: 'records.orynvell.gov' },
    'shipping.aure': { title: 'CargoTrack Logistics', category: 'Cargo & Logistics', icon: Truck, accent: 'orange', domain: 'shipping.aure' },
    'vectornet.onion': { title: 'Vector DarkNet', category: 'Anonymized Darkweb', icon: Eye, accent: 'cyan', domain: 'vectornet.onion' },
    'auresuite.aure': { title: 'AureSuite Cloud Workspace', category: 'Cloud Tools Hub', icon: Grid, accent: 'rose', domain: 'auresuite.aure' },
    'mai.space.aure': { title: 'Mai.space Social Grid', category: 'Public Social Network', icon: Globe, accent: 'purple', domain: 'mai.space.aure' },
    ...Object.fromEntries(
        ENTERTAINMENT_SITES.map(site => [
            site.domain,
            {
                title: site.name,
                category: `Entertainment Celebrity ${site.sector} ${site.kind} ${site.shortName}`,
                icon: Sparkles,
                accent: 'rose',
                domain: site.domain,
            },
        ])
    ),
};

export const SAMPLE_ARCHIVES: SampleArchive[] = [
    { id: 'ARC-001', title: 'Pre-Collapse AETHERCORE Blueprint Fragment', address: 'records.orynvell.gov/deeds/aethercore-01', type: 'Archive', excerpt: 'Deep energy resonance maps indicating AETHERCORE subterranean conduit lines under the Old Factory Ward.' },
    { id: 'ARC-002', title: 'Purge-Era Student Genealogy Index', address: 'cyberium.edu/archives/lineage-index', type: 'Archive', excerpt: 'Classified records detailing Lightborn lineage bloodlines and hereditary Veil sensitivities.' },
    { id: 'ARC-003', title: 'PRISM Cult Signal Intercept #88', address: 'dga.gov/intercepts/prism-88', type: 'Security Log', excerpt: 'Intercepted frequency wave containing corrupted binary runes targeting Cyberium Academy node gateways.' },
    { id: 'ARC-004', title: 'Clinical Study: Veilwilt & Sunspire Fever', address: 'faithmed.aure/research/veilwilt-study', type: 'Medical Report', excerpt: 'Telemetry analysis showing direct correlation between elemental spell strain and aura corruption.' },
    { id: 'ARC-005', title: 'Wire Transfer Audit: Account #0994-AURA', address: 'records.orynvell.gov/audits/transfer-994', type: 'Financial Record', excerpt: 'Traced wire transfer of 50,000 ₡ to offshore vector address.' },
    { id: 'ARC-006', title: 'Package Manifest #CG-8821 (Dangerous Goods)', address: 'shipping.aure/manifests/cg-8821', type: 'Logistics Manifest', excerpt: 'Cargo manifest listing unrefined mana crystals bound for Sector 3 Warehouse.' },
];
