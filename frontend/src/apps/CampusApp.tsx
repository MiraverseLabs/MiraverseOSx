import React, { useEffect, useState } from 'react';
import { ArrowUpRight, Award, BookOpen, FileText, Globe, GraduationCap, ShieldCheck } from 'lucide-react';
import {
  COURSES,
  INSTITUTIONS,
  academicCitizenId,
  academicStanding,
  academicSummary,
  calculateGpa,
  degreeProgress,
  getAdmissionRecord,
  isAdmittedToInstitution,
  type AcademicState,
} from '../gameplay/Academics';
import { canManageAcademics } from '../store/academicActions';
import { MaidIdentityService, type CanonicalPerson } from '../services/maidIdentityService';
import { useOSStore } from '../store/useOSStore';
import { AcademicTranscript } from './academic/AcademicPortal';
import '../styles/apps/academics.css';

type CampusTab = 'hub' | 'degrees' | 'transcript' | 'registrar';

export default function CampusApp() {
  const [tab, setTab] = useState<CampusTab>('hub');
  const state = useOSStore();
  const request = state.workspaceRequests.campus;
  const self = academicCitizenId(state);
  const academics = state.gameplay.academics as AcademicState | undefined;
  const records = self ? academics?.records?.[self] || {} : {};
  const clubs = self ? academics?.clubs?.[self] || [] : [];
  const isRegistrar = canManageAcademics(state);

  useEffect(() => {
    if (!request) return;
    if (request.section === 'transcript') setTab('transcript');
    else if (request.section === 'degrees') setTab('degrees');
    else if (request.section === 'registrar' && isRegistrar) setTab('registrar');
    else setTab('hub');
    useOSStore.getState().consumeWorkspaceRequest('campus', request.revision);
  }, [request, isRegistrar]);

  const cumulativeGpa = calculateGpa(records);
  const totalCredits = academicSummary(records).reduce((sum, s) => sum + s.credits, 0);
  const standing = academicStanding(cumulativeGpa, totalCredits);

  const openWebsite = (url: string) => {
    state.openBrowserTab(url);
    state.openAppWorkspace('browser');
  };

  return (
    <section className="consolidated-workspace" aria-label="CAMPUS Academic Registrar and Advising">
      <nav className="consolidated-tabs" aria-label="CAMPUS sections">
        <strong>CAMPUS REGISTRAR</strong>
        <button aria-pressed={tab === 'hub'} onClick={() => setTab('hub')}>Student Hub & IDs</button>
        <button aria-pressed={tab === 'degrees'} onClick={() => setTab('degrees')}>Degree Audit</button>
        <button aria-pressed={tab === 'transcript'} onClick={() => setTab('transcript')}>Transcript</button>
        {isRegistrar && (
          <button aria-pressed={tab === 'registrar'} onClick={() => setTab('registrar')}>Registrar Desk</button>
        )}
      </nav>

      <div className="consolidated-body" style={{ overflow: 'auto', padding: 24, background: '#f7f8fc' }}>
        <div className="academic-site" style={{ background: 'transparent', minHeight: 'auto' }}>
          <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {self && academics?.pendingSync?.[self] && (
              <p className="academic-notice">
                Academic records are saved. Citizen summary sync is pending.{' '}
                <button onClick={() => void state.retryAcademicSync()}>Retry sync</button>
              </p>
            )}

            {tab === 'hub' && (
              <>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
                  <div>
                    <span className="academic-eyebrow">MERIDION HIGHER EDUCATION REGISTRY · {academics?.activeTerm || 'Autumn 1000'}</span>
                    <h2 style={{ margin: '6px 0' }}>Student Standing & Institutional IDs</h2>
                    <p style={{ margin: 0 }}>
                      Apply and browse catalogs on each school’s VerseNet `.edu` website, study in AureLearn LMS, and track official credentials here.
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button className="academic-primary" onClick={() => state.openAppWorkspace('study')}>
                      <BookOpen size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} /> Open AureLearn LMS
                    </button>
                    <button onClick={() => state.openAppWorkspace('spellforge')}>
                      SpellForge Lab ↗
                    </button>
                  </div>
                </header>

                <div className="academic-grid">
                  <article>
                    <span className="academic-eyebrow">Cumulative GPA</span>
                    <h3>{cumulativeGpa !== null ? cumulativeGpa.toFixed(2) : '—'}</h3>
                    <p>Academic Standing: <strong>{standing}</strong></p>
                  </article>
                  <article>
                    <span className="academic-eyebrow">Total Earned Credits</span>
                    <h3>{totalCredits} Credits</h3>
                    <p>Across Cyberium Academy, Dawn University & Regent Hall</p>
                  </article>
                  <article>
                    <span className="academic-eyebrow">Campus Societies</span>
                    <h3>{clubs.length} Active</h3>
                    <p>Join clubs on any admitted institution’s `/campus-life` page.</p>
                  </article>
                </div>

                <section>
                  <span className="academic-eyebrow">Accredited Institutions</span>
                  <h3>Your Student ID Cards & .edu Websites</h3>
                  <div className="academic-grid">
                    {INSTITUTIONS.map(school => {
                      const admitted = isAdmittedToInstitution(academics, self, school.id);
                      const admission = getAdmissionRecord(academics, self, school.id);
                      const gpa = calculateGpa(records, school.id);
                      const program = school.degrees.find(d => d.id === admission?.declaredProgramId);
                      return (
                        <article key={school.id}>
                          <span className="academic-eyebrow">{school.domain} · {school.established}</span>
                          <h3>{school.name}</h3>
                          {admitted && admission ? (
                            <>
                              <p>
                                <ShieldCheck size={13} style={{ verticalAlign: 'middle' }} /> <strong>Admitted</strong> · ID:{' '}
                                <code>{admission.studentId}</code>
                              </p>
                              <p>Program: {program?.title || school.degrees[0]?.title}</p>
                              <p>School GPA: {gpa !== null ? gpa.toFixed(2) : '—'}</p>
                            </>
                          ) : (
                            <p>Prospective student. Visit {school.domain}/admissions to apply for free.</p>
                          )}
                          <div className="academic-actions" style={{ marginTop: 10 }}>
                            <button
                              className="academic-primary"
                              onClick={() => openWebsite(`https://${school.domain}${admitted ? '/portal' : '/admissions'}`)}
                            >
                              <Globe size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                              {admitted ? `Open ${school.domain}` : `Apply on ${school.domain}`}
                            </button>
                            {admitted && (
                              <button onClick={() => state.openAppWorkspace('study', school.id)}>
                                Courses in LMS <ArrowUpRight size={12} style={{ verticalAlign: 'middle' }} />
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              </>
            )}

            {tab === 'degrees' && (
              <>
                <header>
                  <span className="academic-eyebrow">Degree & Certificate Audit</span>
                  <h2>Credential Pathways</h2>
                  <p>Track your earned credits and required tracks toward Certificates, Diplomas, and Bachelor’s Degrees.</p>
                </header>
                {INSTITUTIONS.map(school => (
                  <section key={school.id}>
                    <h3>{school.name} ({school.domain})</h3>
                    <div className="academic-grid">
                      {degreeProgress(records, school.id).map(({ degree, credits, requiredCredits, earned, percent }) => (
                        <article key={degree.id}>
                          <span className="academic-eyebrow">{degree.level.toUpperCase()} · {percent}%</span>
                          <h3>{degree.title}</h3>
                          <p>{degree.description}</p>
                          <p>
                            Credits: <strong>{credits} / {requiredCredits}</strong> · Tracks: {degree.requiredTracks.join(', ')}
                          </p>
                          {earned && (
                            <p className="academic-certificate">
                              <Award size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} /> Credential Conferred
                            </p>
                          )}
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </>
            )}

            {tab === 'transcript' && (
              <>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <span className="academic-eyebrow">Official Academic Record</span>
                    <h2>Cross-Institution Transcript</h2>
                  </div>
                  <button className="academic-primary" onClick={() => state.openAppWorkspace('documentStudio')}>
                    <FileText size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} /> Export Packet in Document Studio
                  </button>
                </header>
                <AcademicTranscript citizen={self} />
              </>
            )}

            {tab === 'registrar' && isRegistrar && <RegistrarDesk />}
          </div>
        </div>
      </div>
    </section>
  );
}

function RegistrarDesk() {
  const state = useOSStore();
  const [people, setPeople] = useState<CanonicalPerson[]>([]);
  const [query, setQuery] = useState('');
  const [citizen, setCitizen] = useState('');
  const [course, setCourse] = useState(COURSES[0].id);
  const [reason, setReason] = useState('');
  const [score, setScore] = useState(80);
  const [passed, setPassed] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    MaidIdentityService.getAllPersons()
      .then(list => {
        if (alive) setPeople(list);
      })
      .catch(() => {
        if (alive) setMessage('The MAID registry could not be loaded.');
      });
    return () => {
      alive = false;
    };
  }, []);

  const run = async (type: 'enroll' | 'withdraw' | 'correct') => {
    setBusy(true);
    try {
      const result = await state.academicAction(
        type === 'correct'
          ? { type, citizen, course, reason, score, passed }
          : { type, citizen, course, reason, registrar: true },
      );
      setMessage(result.message);
    } catch {
      setMessage('The registrar action failed. Please retry.');
    } finally {
      setBusy(false);
    }
  };

  const audit = (state.gameplay.academics as AcademicState | undefined)?.audit.filter(a => a.citizen === citizen) || [];

  return (
    <section className="academic-registrar">
      <span className="academic-eyebrow">Administrative Authority</span>
      <h2><GraduationCap size={20} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Registrar Desk</h2>
      <p>Manage verified MAID citizens across Cyberium Academy, Dawn University, and Regent Hall. Each administrative change requires a reason and preserves its previous values.</p>
      <label>
        Find citizen
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Name or MAID" />
      </label>
      <label>
        Citizen
        <select value={citizen} onChange={e => setCitizen(e.target.value)}>
          <option value="">Select a citizen</option>
          {people
            .filter(p => `${p.name} ${p.maid}`.toLowerCase().includes(query.toLowerCase()))
            .map(p => (
              <option value={p.id} key={p.id}>
                {p.name} · {p.maid || p.id}
              </option>
            ))}
        </select>
      </label>
      {state.gameplay.player.isAdmin && (
        <button
          disabled={!citizen || busy}
          onClick={async () => {
            const result = await state.linkCitizenHubIdentity(citizen);
            setMessage(result.message);
          }}
        >
          Link selected citizen as my student identity
        </button>
      )}
      <label>
        Course
        <select value={course} onChange={e => setCourse(e.target.value)}>
          {COURSES.map(c => (
            <option value={c.id} key={c.id}>
              {INSTITUTIONS.find(s => s.id === c.institution)?.name} · {c.code} {c.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        Reason
        <textarea value={reason} onChange={e => setReason(e.target.value)} required />
      </label>
      <div className="academic-actions">
        <button disabled={busy || !citizen || !reason.trim()} onClick={() => void run('enroll')}>
          Enroll citizen
        </button>
        <button disabled={busy || !citizen || !reason.trim()} onClick={() => void run('withdraw')}>
          Withdraw citizen
        </button>
      </div>
      <h3>Correct academic result</h3>
      <label>
        Assessment score
        <input type="number" min="0" max="100" value={score} onChange={e => setScore(Number(e.target.value))} />
      </label>
      <label className="academic-radio">
        <input type="checkbox" checked={passed} onChange={e => setPassed(e.target.checked)} />
        Confirm all course requirements were met
      </label>
      <button disabled={busy || !citizen || !reason.trim()} onClick={() => void run('correct')}>
        Save audited correction
      </button>
      {message && <p role="status">{message}</p>}
      {citizen && <AcademicTranscript citizen={citizen} />}
      <h3>Change history</h3>
      {audit.length ? (
        audit
          .slice()
          .reverse()
          .map(a => (
            <details key={a.id}>
              <summary>
                {a.at} · {a.course} · {a.reason}
              </summary>
              <p>Actor: {a.actor}</p>
              <p>
                Before:{' '}
                {a.before
                  ? `${a.before.status}, ${a.before.bestScore ?? 'ungraded'}%, ${a.before.completedAt ? 'passed' : 'incomplete'}`
                  : 'No enrollment'}
              </p>
              <p>
                After: {a.after.status}, {a.after.bestScore ?? 'ungraded'}%, {a.after.completedAt ? 'passed' : 'incomplete'}
              </p>
            </details>
          ))
      ) : (
        <p>No administrative changes for this citizen.</p>
      )}
    </section>
  );
}
