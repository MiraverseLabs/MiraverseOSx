import React from 'react';
import { ArrowRight, Landmark, Scale, ScrollText, Shield } from 'lucide-react';
import { INSTITUTIONS } from '../../../gameplay/Academics';
import { EduNetworkDirectoryBar, EduSectionContent, useEduContext } from './EduSiteShared';
import { eduUrl, type EduLocation, type EduSection } from './eduRouter';
import InstitutionScene from './InstitutionScene';
import './edu-base.css';
import './regent-edu.css';

const NAV_ITEMS: { id: EduSection; label: string }[] = [
  { id: 'home', label: 'Hall' },
  { id: 'admissions', label: 'Admissions' },
  { id: 'academics', label: 'Faculties & Degrees' },
  { id: 'courses', label: 'Curriculum' },
  { id: 'faculty', label: 'Fellows & Faculty' },
  { id: 'campus-life', label: 'Societies' },
  { id: 'portal', label: 'Student Portal' },
];

export default function RegentHallSite({
  location,
  navigateTab,
}: {
  location: EduLocation;
  navigateTab: (url: string, title?: string) => void;
}) {
  const school = INSTITUTIONS.find(i => i.id === 'regent')!;
  const ctx = useEduContext(school);
  const go = (section: EduSection, detailId?: string) => navigateTab(eduUrl('regent', section, detailId));

  return (
    <div className="edu-shell edu-regent" aria-label="Regent Hall website">
      <EduNetworkDirectoryBar currentId="regent" navigateTab={navigateTab} />

      <header className="rgh-header">
        <div className="rgh-crest-bar">
          <button className="rgh-brand" onClick={() => go('home')}>
            <span className="rgh-shield" aria-hidden="true">{school.sealText}</span>
            <div>
              <span className="rgh-sub">{school.domain} · {school.established} · {school.location}</span>
              <h1>{school.name}</h1>
            </div>
          </button>
          <span className="rgh-motto-pill">“{school.motto}”</span>
        </div>
        <div className="rgh-nav-wrap">
          <nav className="rgh-nav" aria-label="Regent Hall sections">
            {NAV_ITEMS.map(item => (
              <button key={item.id} aria-pressed={location.section === item.id} onClick={() => go(item.id)}>
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="edu-main">
        {location.section === 'home' ? (
          <div className="edu-section">
            <section className="rgh-hero">
              <div>
                <span className="edu-eyebrow" style={{ color: '#9c7330' }}>
                  REGENT HALL · THE EIGHT REALMS
                </span>
                <h2>An education in the service of the realms.</h2>
                <p>{school.description}</p>
                <div className="edu-btn-row" style={{ marginTop: 18 }}>
                  <button className="edu-btn-primary" onClick={() => go(ctx.admitted ? 'courses' : 'admissions')}>
                    {ctx.admitted ? 'Register for Seminars' : 'Apply for Admission'} <ArrowRight size={14} />
                  </button>
                  <button className="edu-btn-secondary" onClick={() => go('portal')}>
                    Royal Portal
                  </button>
                </div>
              </div>

              <InstitutionScene institution="regent" />
            </section>

            <div className="edu-grid-3">
              <article className="edu-card">
                <Scale size={20} color="#182b4d" />
                <h3>Eight-Realm Royal Statecraft</h3>
                <p>Crown charters, succession covenants, and accountable stewardship uniting all eight realms.</p>
                <button className="edu-btn-link" onClick={() => go('courses')}>View Statecraft courses →</button>
              </article>
              <article className="edu-card">
                <Landmark size={20} color="#9c7330" />
                <h3>Eight-Realm Diplomacy</h3>
                <p>Royal protocol, treaty drafting, and inter-realm mediation inside the Eight-Realms Rotunda.</p>
                <button className="edu-btn-link" onClick={() => go('academics')}>Explore Diplomacy →</button>
              </article>
              <article className="edu-card">
                <ScrollText size={20} color="#182b4d" />
                <h3>The Empress Track</h3>
                <p>Regent Hall’s exclusive sovereign curriculum in crisis discernment and eight-realm concord.</p>
                <button className="edu-btn-link" onClick={() => go('faculty')}>Meet Preceptors →</button>
              </article>
            </div>

            <section className="edu-subblock">
              <h3>Hall Notices & Colloquia</h3>
              <div className="edu-grid-3">
                {school.bulletins.map(item => (
                  <article key={item.id} className="edu-card">
                    <span className="edu-eyebrow" style={{ color: '#9c7330' }}>{item.tag} · {item.date}</span>
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
        <span><Shield size={12} style={{ verticalAlign: 'middle' }} /> {school.name} · {school.location}</span>
        <span>{school.domain} · {school.motto}</span>
      </footer>
    </div>
  );
}
