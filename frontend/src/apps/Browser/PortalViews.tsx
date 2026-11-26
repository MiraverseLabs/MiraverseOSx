import React from 'react';
import { ArrowRight, Lock } from 'lucide-react';
import { useOSStore } from '../../store/useOSStore';
import { DGAPortal, DarkWebOnionPortal, RoyalHistoryPortal, ShippingPortal } from './Portals';
import PortalNav from './PortalNav';
import { parsePortalUrl, portalUrl, type PortalId } from './portalRouter';

type NavigateTab = (url: string, title?: string) => void;
interface ViewProps {
  url?: string;
  navigateTab?: NavigateTab;
}

const DGA_REGISTRY = [
  { name: 'Director Evelyn Cross', maid: 'MAID-OR-00481939', dept: 'Department of Global Affairs · Executive Command', clearance: 'Tier 3 (Master)' },
  { name: 'Deputy Chief Nathaniel Miller', maid: 'MAID-OR-00481954', dept: 'DGA Tactical & TRACE Forensic Bureau', clearance: 'Tier 2 (High)' },
  { name: 'Jeremie Belpois', maid: 'MAID-OR-00481935', dept: 'Cyberium Academy Compiler Lab 4', clearance: 'Tier 2 (Academic)' },
  { name: 'Aelita Hopper', maid: 'MAID-OR-00481945', dept: 'Cyberium Academy Research / Node Liaison', clearance: 'Tier 2 (Academic)' },
  { name: 'Dr. Sharon Voss', maid: 'MAID-FR-00481974', dept: 'Faith Medical & Deep Telemetry', clearance: 'Tier 2 (Clinical)' },
];

function Shell({
  id,
  view,
  navigateTab,
  children,
}: {
  id: PortalId;
  view: string;
  navigateTab?: NavigateTab;
  children: React.ReactNode;
}) {
  return (
    <div className="vn-portal-shell" data-portal={id} data-view={view}>
      <PortalNav id={id} view={view} navigateTab={navigateTab} />
      {children}
    </div>
  );
}

function ViewBody({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="vn-portal-view">
      <h2 className="vn-portal-view-title">{title}</h2>
      {children}
    </div>
  );
}

function BackToOverview({ id, navigateTab, label = 'Back to overview' }: { id: PortalId; navigateTab?: NavigateTab; label?: string }) {
  return (
    <button className="vn-portal-back" onClick={() => navigateTab?.(portalUrl(id, 'overview'))}>
      {label} <ArrowRight size={13} />
    </button>
  );
}

export function DgaPortalView({ url, navigateTab }: ViewProps) {
  const view = parsePortalUrl(url || '')?.view || 'overview';
  if (view === 'overview') return <Shell id="dga" view={view} navigateTab={navigateTab}><DGAPortal /></Shell>;
  if (view === 'registry') {
    return (
      <Shell id="dga" view={view} navigateTab={navigateTab}>
        <ViewBody title="Citizen Clearance Registry">
          <div className="vn-portal-list">
            {DGA_REGISTRY.map(entry => (
              <article key={entry.maid} className="vn-portal-row">
                <strong>{entry.name}</strong>
                <span className="font-mono">{entry.maid}</span>
                <small>{entry.dept} · {entry.clearance}</small>
              </article>
            ))}
          </div>
          <BackToOverview id="dga" navigateTab={navigateTab} label="Open the full lookup terminal" />
        </ViewBody>
      </Shell>
    );
  }
  if (view === 'cipher') {
    return (
      <Shell id="dga" view={view} navigateTab={navigateTab}>
        <ViewBody title="Security Clearance Elevation">
          <p className="vn-portal-copy">The cipher terminal, MAID biometric lookup, and executive directive board remain on the gateway. Elevated clearance is required before restricted case files are released.</p>
          <BackToOverview id="dga" navigateTab={navigateTab} label="Open the cipher terminal" />
        </ViewBody>
      </Shell>
    );
  }
  return (
    <Shell id="dga" view={view} navigateTab={navigateTab}>
      <ViewBody title="Formal Case Reasoning">
        <p className="vn-portal-copy">Case intake, evidence verification, and canonical filing run from the gateway's Formal Case Reasoning board. Each determination is validated against the shared evidence set.</p>
        <BackToOverview id="dga" navigateTab={navigateTab} label="Open case reasoning" />
      </ViewBody>
    </Shell>
  );
}

export function ShippingPortalView({ url, navigateTab }: ViewProps) {
  const view = parsePortalUrl(url || '')?.view || 'overview';
  if (view === 'overview') return <Shell id="shipping" view={view} navigateTab={navigateTab}><ShippingPortal /></Shell>;
  if (view === 'routes') {
    return (
      <Shell id="shipping" view={view} navigateTab={navigateTab}>
        <ViewBody title="Route-Hop Diagram">
          <svg viewBox="0 0 420 140" role="img" aria-label="Route diagram: Kaelis Spire to Sector 3, diverted to Conduit Sector 7" className="vn-portal-diagram">
            <line x1="24" y1="46" x2="190" y2="46" stroke="#0284c7" strokeWidth="2" />
            <line x1="190" y1="46" x2="396" y2="46" stroke="#e11d48" strokeWidth="2" strokeDasharray="6 4" />
            <circle cx="24" cy="46" r="6" fill="#0284c7" />
            <circle cx="190" cy="46" r="6" fill="#0284c7" />
            <circle cx="396" cy="46" r="6" fill="#e11d48" />
            <text x="24" y="28" fontSize="11" fill="#0f172a">Kaelis Spire</text>
            <text x="190" y="28" fontSize="11" fill="#0f172a">Sector 3 Hub</text>
            <text x="330" y="72" fontSize="11" fill="#e11d48">Conduit Sector 7</text>
            <text x="24" y="112" fontSize="11" fill="#64748b">Manifest CG-8821 · seals compromised · courier disappeared</text>
          </svg>
          <BackToOverview id="shipping" navigateTab={navigateTab} label="Open consignment tracking" />
        </ViewBody>
      </Shell>
    );
  }
  return (
    <Shell id="shipping" view={view} navigateTab={navigateTab}>
      <ViewBody title="Waybill Seal Inspector">
        <div className="vn-portal-seal">
          <span className="font-mono">#CG-8821</span>
          <p>Seal ring intact on the outer pallet; inner mana-crystal seal shows harmonic bleed consistent with Conduit Sector 7.</p>
          <small>Audit the route discrepancy from the tracking view to file the finding.</small>
        </div>
        <BackToOverview id="shipping" navigateTab={navigateTab} label="Open route audit" />
      </ViewBody>
    </Shell>
  );
}

export function RoyalHistoryPortalView({ url, navigateTab }: ViewProps) {
  const view = parsePortalUrl(url || '')?.view || 'overview';
  const clearance = useOSStore(s => s.gameplay.player?.clearanceLevel ?? 1);
  if (view === 'overview') return <Shell id="royalhistory" view={view} navigateTab={navigateTab}><RoyalHistoryPortal /></Shell>;
  if (clearance < 2) {
    return (
      <Shell id="royalhistory" view={view} navigateTab={navigateTab}>
        <ViewBody title="Restricted Codex">
          <div className="vn-portal-locked"><Lock size={18} /> Tier 2 clearance is required to read this codex.</div>
          <BackToOverview id="royalhistory" navigateTab={navigateTab} />
        </ViewBody>
      </Shell>
    );
  }
  const copy: Record<string, string> = {
    charters: 'Pre-Collapse Council Charters confirm the sovereign authority of the Seraphima lineage across upper Orynvell.',
    lineages: 'Eight-Realms Royal Lineages record the succession covenants binding the eight realms to the Regent Hall charter.',
    chronicle: 'AETHERCORE blueprint notes describe the early energy grid and the sealed conduits beneath Broad Street.',
  };
  return (
    <Shell id="royalhistory" view={view} navigateTab={navigateTab}>
      <ViewBody title={view[0].toUpperCase() + view.slice(1)}>
        <p className="vn-portal-copy">{copy[view] || 'Restricted archive codex.'}</p>
        <BackToOverview id="royalhistory" navigateTab={navigateTab} />
      </ViewBody>
    </Shell>
  );
}

export function VectorNetPortalView({ url, navigateTab }: ViewProps) {
  const view = parsePortalUrl(url || '')?.view || 'overview';
  if (view === 'overview') return <Shell id="vectornet" view={view} navigateTab={navigateTab}><DarkWebOnionPortal /></Shell>;
  if (view === 'relays') {
    return (
      <Shell id="vectornet" view={view} navigateTab={navigateTab}>
        <ViewBody title="Relay Topology">
          <div className="vn-portal-list">
            <article className="vn-portal-row"><strong>Sector 3 Warehouse</strong><small>Node 1 · active</small></article>
            <article className="vn-portal-row"><strong>Subterranean Conduit 7</strong><small>88.2 MHz carrier</small></article>
            <article className="vn-portal-row"><strong>First Federal Broad Street</strong><small>Fault detected · 88.4 MHz</small></article>
          </div>
          <BackToOverview id="vectornet" navigateTab={navigateTab} label="Open the intel market" />
        </ViewBody>
      </Shell>
    );
  }
  return (
    <Shell id="vectornet" view={view} navigateTab={navigateTab}>
      <ViewBody title="Interactive Console">
        <p className="vn-portal-copy">The anonymous terminal accepts /help, /status, /clearance, /trace, /decrypt and /clear. Commands run against the current citizen identity.</p>
        <BackToOverview id="vectornet" navigateTab={navigateTab} label="Open the console" />
      </ViewBody>
    </Shell>
  );
}