import { ArrowLeft, ArrowUpRight, Globe } from 'lucide-react';
import { buildSiteUrl, type EntertainmentSiteMeta } from '../entertainmentRouter';
import type { CanonicalEntertainmentOrg, EntertainmentAudition, EntertainmentPortalData } from '../services/entertainmentDataService';
import { SiteLink } from './SiteLink';

export function SiteNotFoundView({
  site,
  navigate,
}: {
  site: EntertainmentSiteMeta;
  navigate: (url: string) => void;
}) {
  return (
    <section className="ent-not-found">
      <h2>Page unavailable</h2>
      <p>This address does not match a published section on {site.name}.</p>
      <SiteLink href={buildSiteUrl(site, '/')} navigate={navigate} className="ent-btn-secondary">
        <ArrowLeft size={14} aria-hidden="true" />
        <span>Return to {site.name}</span>
      </SiteLink>
    </section>
  );
}

export function OrgAboutSection({
  site,
  org,
  data,
  navigate,
}: {
  site: EntertainmentSiteMeta;
  org: CanonicalEntertainmentOrg;
  data: EntertainmentPortalData;
  navigate: (url: string) => void;
}) {
  return (
    <div className="ent-about-grid">
      <section className="ent-widget-stack">
        <h2>About {site.name}</h2>
        <p>{org.description}</p>
        <p className="ent-empty-note">
          <strong>Seat:</strong> {site.seat} · <strong>Realm:</strong> {site.realm}
        </p>
        {org.departments && org.departments.length > 0 && (
          <>
            <h3>Divisions & Leadership</h3>
            <ul className="ent-dept-list" role="list">
              {org.departments.map((dept) => (
                <li key={dept.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <strong>{dept.name}</strong>
                    <span className="ent-mono-tag">Head: {dept.head}</span>
                  </div>
                  <p className="ent-empty-note" style={{ marginTop: '0.35rem' }}>
                    {dept.focus}
                  </p>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <aside className="ent-widget-stack">
        <h3>Public Standing & Network</h3>
        {org.publicReputation && (
          <div>
            <strong>Public Reputation</strong>
            <p className="ent-empty-note">{org.publicReputation}</p>
          </div>
        )}
        {org.internalTension && (
          <div>
            <strong>Industry Perspective</strong>
            <p className="ent-empty-note">{org.internalTension}</p>
          </div>
        )}
        {data.partnerSites.length > 0 && (
          <div>
            <strong>Connected Meridion Institutions</strong>
            <div className="ent-action-row" style={{ marginTop: '0.45rem' }}>
              {data.partnerSites.map((partner) => (
                <SiteLink key={partner.orgId} href={partner.url} navigate={navigate} className="ent-btn-secondary">
                  <span>{partner.shortName}</span>
                  <ArrowUpRight size={13} aria-hidden="true" />
                </SiteLink>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

export function EcosystemDirectorySection({
  currentSite,
  data,
  navigate,
}: {
  currentSite: EntertainmentSiteMeta;
  data: EntertainmentPortalData;
  navigate: (url: string) => void;
}) {
  return (
    <section className="ent-widget-stack">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Globe size={17} aria-hidden="true" />
        <h2 style={{ margin: 0 }}>Meridion Arts & Culture Network ({data.allSites.length} Sites)</h2>
      </div>
      <div className="ent-directory-grid">
        {data.allSites.map((entry) => (
          <article
            key={entry.orgId}
            className="ent-directory-card"
            style={entry.orgId === currentSite.orgId ? { borderColor: currentSite.accentColor } : undefined}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
              <h3>{entry.name}</h3>
              <span className="ent-mono-tag">{entry.domain}</span>
            </div>
            <p>
              {entry.kind} · {entry.realm}
            </p>
            <p>{entry.tagline}</p>
            <SiteLink href={entry.url} navigate={navigate} className="ent-btn-secondary">
              Visit {entry.shortName}
            </SiteLink>
          </article>
        ))}
      </div>
    </section>
  );
}

export function AuditionListWidget({
  auditions,
  data,
  accentColor,
  navigate,
  detailBaseSite,
}: {
  auditions: EntertainmentAudition[];
  data: EntertainmentPortalData;
  accentColor?: string;
  navigate?: (url: string) => void;
  detailBaseSite?: EntertainmentSiteMeta;
}) {
  if (auditions.length === 0) {
    return <p className="ent-empty-note">No active casting notices match this selection.</p>;
  }
  return (
    <ul className="ent-ticket-list" role="list">
      {auditions.map((aud) => (
        <li key={aud.auditionId} className="ent-ticket-item">
          {aud.posterUrl && (
            <img
              src={aud.posterUrl}
              alt=""
              loading="lazy"
              style={{ inlineSize: '44px', aspectRatio: '2 / 3', objectFit: 'cover', flexShrink: 0 }}
            />
          )}
          <div className="ent-ticket-meta">
            <strong>
              {detailBaseSite && navigate ? (
                <SiteLink
                  href={buildSiteUrl(detailBaseSite, `/auditions/${encodeURIComponent(aud.auditionId)}`)}
                  navigate={navigate}
                >
                  {aud.title}
                </SiteLink>
              ) : (
                aud.title
              )}
            </strong>
            <span>
              {aud.discipline.toUpperCase()} · {aud.openToUnrepresented ? 'Open Call' : 'Agency Representation Required'} ·
              Min Credibility {aud.minCredibility} · Closes Cycle {aud.deadlineCycle}
            </span>
            <small>Stipend: {aud.stipendCredits} ₢</small>
          </div>
          <div className="ent-ticket-controls">
            {aud.status === 'open' ? (
              <button
                type="button"
                className="ent-btn-primary"
                style={accentColor ? { background: accentColor } : undefined}
                onClick={() => data.actions.submitAudition(aud.auditionId)}
              >
                Submit Audition
              </button>
            ) : (
              <span className="ent-mono-tag">{aud.status === 'cast' ? `Cast (${aud.selectedArtistId})` : 'Closed'}</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
