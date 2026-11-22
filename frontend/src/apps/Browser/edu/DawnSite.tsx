import React from 'react';
import { ArrowRight, BookMarked, Feather, Leaf, Scale } from 'lucide-react';
import { INSTITUTIONS } from '../../../gameplay/Academics';
import { EduNetworkDirectoryBar, EduSectionContent, useEduContext } from './EduSiteShared';
import { eduUrl, type EduLocation, type EduSection } from './eduRouter';
import InstitutionScene from './InstitutionScene';
import './edu-base.css';
import './dawn-edu.css';
import './edu-editorial.css';

const NAV_ITEMS: { id: EduSection; label: string }[] = [
  { id: 'home', label: 'Dawn Court' },
  { id: 'admissions', label: 'Admissions' },
  { id: 'academics', label: 'Colleges & Degrees' },
  { id: 'courses', label: 'Course Catalog' },
  { id: 'faculty', label: 'Faculty' },
  { id: 'campus-life', label: 'Campus Life' },
  { id: 'portal', label: 'Student Portal' },
];

export default function DawnSite({
  location,
  navigateTab,
}: {
  location: EduLocation;
  navigateTab: (url: string, title?: string) => void;
}) {
  const school = INSTITUTIONS.find(i => i.id === 'dawn')!;
  const ctx = useEduContext(school);
  const go = (section: EduSection, detailId?: string) => navigateTab(eduUrl('dawn', section, detailId));

  return (
    <div className="edu-shell edu-dawn" aria-label="Dawn University website">
      <EduNetworkDirectoryBar currentId="dawn" navigateTab={navigateTab} />

      <header className="dwn-header">
        <div className="dwn-masthead">
          <button className="dwn-brand" onClick={() => go('home')}>
            <span className="dwn-crest" aria-hidden="true">{school.sealText}</span>
            <div>
              <span className="dwn-sub">{school.domain} Â· {school.established} Â· {school.location}</span>
              <h1>{school.name}</h1>
            </div>
          </button>
          <div className="edu-btn-row">
            <button className="edu-btn-secondary" onClick={() => go('portal')}>
              {ctx.admitted ? `Scholar Portal (${ctx.admission?.studentId})` : 'Student Portal'}
            </button>
            {!ctx.admitted && (
              <button className="edu-btn-primary" onClick={() => go('admissions')}>
                Apply to Dawn
              </button>
            )}
          </div>
        </div>
        <nav className="dwn-nav" aria-label="Dawn University sections">
          {NAV_ITEMS.map(item => (
            <button key={item.id} aria-pressed={location.section === item.id} onClick={() => go(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="edu-main">
        {location.section === 'home' ? (
          <div className="edu-section">
            <section className="dwn-hero">
              <div>
                <span className="edu-eyebrow" style={{ color: '#9a6f1d' }}>
                  DAWNSON, AURELINE
                </span>
                <h2>{school.motto}</h2>
                <p>{school.description}</p>

                <div className="edu-btn-row" style={{ marginTop: 18 }}>
                  <button className="edu-btn-primary" onClick={() => go(ctx.admitted ? 'courses' : 'admissions')}>
                    {ctx.admitted ? 'Explore Course Catalog' : 'Begin Your Application'} <ArrowRight size={14} />
                  </button>
                  <button className="edu-btn-secondary" onClick={() => go('academics')}>
                    Degrees & Colleges
                  </button>
                </div>
              </div>

              <InstitutionScene institution="dawn" />
              <aside className="dwn-almanac" aria-label="Dawn Court Almanac">
                <h3>Dawn Court Almanac</h3>
                {school.bulletins.map(item => (
                  <div key={item.id} className="dwn-almanac-item">
                    <span className="edu-eyebrow" style={{ color: '#9a6f1d' }}>{item.tag} Â· {item.date}</span>
                    <strong>{item.title}</strong>
                    <p style={{ margin: '4px 0 0', fontSize: 12.5 }}>{item.summary}</p>
                  </div>
                ))}
              </aside>
            </section>

            <div className="edu-grid-3">
              <article className="edu-card">
                <Scale size={20} color="#9a6f1d" />
                <h3>Civic Studies & History</h3>
                <p>Primary charters, institutional history, and evidence-backed public policy in Concord Reading Hall.</p>
                <button className="edu-btn-link" onClick={() => go('academics')}>Explore Civic Studies â†’</button>
              </article>
              <article className="edu-card">
                <Leaf size={20} color="#1f4b3f" />
                <h3>Aether Conservatory</h3>
                <p>Controlled observation, replication, and ecological stewardship across Meridionâ€™s living biomes.</p>
                <button className="edu-btn-link" onClick={() => go('courses')}>View Natural Sciences â†’</button>
              </article>
              <article className="edu-card">
                <Feather size={20} color="#6b2737" />
                <h3>Arcane Humanities</h3>
                <p>Situated knowledge, custodial consent, and comparative arcane traditions in Lantern Cloister.</p>
                <button className="edu-btn-link" onClick={() => go('faculty')}>Meet the Faculty â†’</button>
              </article>
            </div>
          </div>
        ) : (
          <EduSectionContent school={school} location={location} navigateTab={navigateTab} />
        )}
      </main>

      <footer className="edu-footer">
        <span><BookMarked size={12} style={{ verticalAlign: 'middle' }} /> {school.name} Â· {school.location}</span>
        <span>{school.domain} Â· {school.motto}</span>
      </footer>
    </div>
  );
}
