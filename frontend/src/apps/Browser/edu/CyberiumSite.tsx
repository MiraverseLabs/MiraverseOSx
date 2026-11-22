import React from 'react';
import { ArrowRight, Cpu, FlaskConical, Radio, Terminal } from 'lucide-react';
import { INSTITUTIONS } from '../../../gameplay/Academics';
import { EduNetworkDirectoryBar, EduSectionContent, useEduContext } from './EduSiteShared';
import { eduUrl, type EduLocation, type EduSection } from './eduRouter';
import InstitutionScene from './InstitutionScene';
import './edu-base.css';
import './cyberium-edu.css';
import './edu-editorial.css';

const NAV_ITEMS: { id: EduSection; label: string }[] = [
  { id: 'home', label: 'Overview' },
  { id: 'admissions', label: 'Admissions' },
  { id: 'academics', label: 'Departments & Degrees' },
  { id: 'courses', label: 'Course Catalog' },
  { id: 'faculty', label: 'Faculty & Labs' },
  { id: 'campus-life', label: 'Campus Life' },
  { id: 'portal', label: 'Student Portal' },
];

export default function CyberiumSite({
  location,
  navigateTab,
}: {
  location: EduLocation;
  navigateTab: (url: string, title?: string) => void;
}) {
  const school = INSTITUTIONS.find(i => i.id === 'cyberium')!;
  const ctx = useEduContext(school);
  const go = (section: EduSection, detailId?: string) => navigateTab(eduUrl('cyberium', section, detailId));

  return (
    <div className="edu-shell edu-cyberium" aria-label="Cyberium Academy website">
      <EduNetworkDirectoryBar currentId="cyberium" navigateTab={navigateTab} />

      <header className="cyb-header">
        <div className="cyb-header-top">
          <button className="cyb-brand" onClick={() => go('home')}>
            <span className="cyb-hex-seal" aria-hidden="true">{school.sealText}</span>
            <div>
              <span className="cyb-brand-sub">{school.domain} Â· {school.established} Â· Sector 4 Quadrangle</span>
              <h1>{school.name}</h1>
            </div>
          </button>
          <button className="cyb-student-access" onClick={() => go('portal')}>Student portal <ArrowRight size={14} /></button>
        </div>
        <nav className="cyb-nav" aria-label="Cyberium Academy sections">
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
            <section className="cyb-hero">
              <div>
                <span className="edu-eyebrow">
                  POLYTECHNIC OF CYBERNETICS & COMPUTATIONAL SPELLCRAFT
                </span>
                <h2>{school.motto}</h2>
                <p>{school.description}</p>
                <div className="edu-btn-row" style={{ marginTop: 18 }}>
                  <button className="edu-btn-primary" onClick={() => go(ctx.admitted ? 'courses' : 'admissions')}>
                    {ctx.admitted ? 'Register for Lab Courses' : 'Apply for Admission'} <ArrowRight size={14} />
                  </button>
                  <button
                    className="edu-btn-secondary"
                    onClick={() => go('portal')}
                  >
                    Student portal
                  </button>
                </div>
              </div>

              <InstitutionScene institution="cyberium" />
            </section>

            <div className="edu-grid-3">
              <article className="edu-card">
                <Cpu size={20} color="#0284c7" />
                <h3>Cybernetics & Control</h3>
                <p>Closed-loop sensor calibration, hardware safety interlocks, and fault isolation in Foundry Hall B.</p>
                <button className="edu-btn-link" onClick={() => go('academics')}>Explore department â†’</button>
              </article>
              <article className="edu-card">
                <FlaskConical size={20} color="#6d28d9" />
                <h3>Computational Spellcraft</h3>
                <p>Formal module contracts and live SpellForge protocol verification in Compiler Lab 4.</p>
                <button className="edu-btn-link" onClick={() => go('courses')}>Browse spell courses â†’</button>
              </article>
              <article className="edu-card">
                <Radio size={20} color="#0284c7" />
                <h3>Signal Systems</h3>
                <p>Payload integrity, authorized decryption, and forensic evidence logs at the Signal Observatory.</p>
                <button className="edu-btn-link" onClick={() => go('faculty')}>Meet lab instructors â†’</button>
              </article>
            </div>

            <section className="edu-subblock">
              <h3>From the academy</h3>
              <div className="edu-grid-3">
                {school.bulletins.map(item => (
                  <article key={item.id} className="edu-card">
                    <span className="edu-eyebrow">{item.tag} Â· {item.date}</span>
                    <h4>{item.title}</h4>
                    <p>{item.summary}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <EduSectionContent school={school} location={location} navigateTab={navigateTab} />
        )}
      </main>

      <footer className="edu-footer">
        <span><Terminal size={12} style={{ verticalAlign: 'middle' }} /> {school.name} Â· {school.location}</span>
        <span>{school.domain} Â· {school.motto}</span>
      </footer>
    </div>
  );
}
