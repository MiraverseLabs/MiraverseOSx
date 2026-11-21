import React, { useEffect, useState } from 'react';
import { useOSStore } from '../../store/useOSStore';
import { academicCitizenId, academicSummary, COURSES, INSTITUTIONS, gradeLabel, type AcademicState, type InstitutionId } from '../../gameplay/Academics';
import { canManageAcademics, type AcademicCommand } from '../../store/academicActions';
import { MaidIdentityService, type CanonicalPerson } from '../../services/maidIdentityService';
import '../../styles/apps/academics.css';

export function AcademicTranscript({ citizen }: { citizen: string | null }) {
  const academics = useOSStore(s => s.gameplay.academics as AcademicState | undefined);
  const records = citizen ? academics?.records[citizen] || {} : {};
  return <div className="academic-transcript">{academicSummary(records).map(({ school, courses, credits, certificates }) => <section key={school.id}>
    <h3>{school.name}</h3><p>{credits} earned credits · {certificates.length} track certificates</p>
    {courses.length ? <div className="academic-table-wrap"><table><thead><tr><th>Course</th><th>Status</th><th>Grade</th><th>Credits</th></tr></thead><tbody>{courses.map(c => <tr key={c.id}><td>{c.title}</td><td>{records[c.id].completedAt ? 'Passed' : records[c.id].status === 'withdrawn' ? 'Withdrawn' : 'In progress'}</td><td>{gradeLabel(records[c.id].bestScore)} {records[c.id].bestScore !== null ? `(${records[c.id].bestScore}%)` : ''}</td><td>{records[c.id].completedAt ? 3 : 0}</td></tr>)}</tbody></table></div> : <p>No recorded coursework.</p>}
    {certificates.map(name => <p className="academic-certificate" key={name}>Track certificate · {name}</p>)}
  </section>)}</div>;
}

export default function AcademicPortal({ institution = 'cyberium', website = false }: { institution?: InstitutionId; website?: boolean }) {
  const [schoolId, setSchool] = useState<InstitutionId>(institution);
  const [tab, setTab] = useState('overview');
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const state = useOSStore();
  const self = academicCitizenId(state);
  const academic: AcademicState | undefined = state.gameplay.academics;
  const records = self ? academic?.records[self] || {} : {};
  const school = INSTITUTIONS.find(s => s.id === schoolId)!;
  const course = COURSES.find(c => c.id === selected && c.institution === schoolId);
  const record = course ? records[course.id] : undefined;
  useEffect(() => { setSchool(institution); setSelected(null); setAnswers({}); setTab('overview'); }, [institution]);
  const run = async (command: AcademicCommand) => {
    setBusy(true);
    try { const result = await state.academicAction(command); setMessage(result.message); }
    catch { setMessage('The academic action could not be saved. Please retry.'); }
    finally { setBusy(false); }
  };
  function openProject() {
    if (!course) return;
    state.openAppWorkspace(course.project.kind === 'compiler' ? 'campus' : ['engineering', 'civic'].includes(course.project.kind) ? 'jobs' : 'lore', course.project.kind === 'compiler' ? 'magic' : 'academic-projects');
  }
  return <div className={`academic-site academic-${schoolId}`} aria-label={`${school.name} ${website ? 'website' : 'campus'}`}>
    <header className="academic-masthead"><div className="academic-wordmark"><span className="academic-seal" aria-hidden="true">{schoolId === 'cyberium' ? 'CA' : 'DU'}</span><div><span className="academic-eyebrow">{school.domain} · Aureline, Meridion</span><h1>{school.name}</h1></div></div>
      {website ? <a href={`https://${schoolId === 'cyberium' ? 'dawn.edu' : 'cyberium.edu'}`} onClick={e => { e.preventDefault(); state.navigateBrowserTab(`https://${schoolId === 'cyberium' ? 'dawn.edu' : 'cyberium.edu'}`); }}>Visit {schoolId === 'cyberium' ? 'Dawn University' : 'Cyberium Academy'} ↗</a> : <label>Institution<select value={schoolId} onChange={e => { setSchool(e.target.value as InstitutionId); setSelected(null); setAnswers({}); }}>{INSTITUTIONS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>}
    </header>
    <nav className="academic-nav" aria-label="School sections">{['overview', 'catalog', 'faculty', 'studies', 'transcript', ...(canManageAcademics(state) ? ['registrar'] : [])].map(t => <button key={t} aria-pressed={tab === t} onClick={() => { setTab(t); setSelected(null); }}>{({ studies: 'My studies', catalog: 'Courses' } as Record<string, string>)[t] || t}</button>)}<button onClick={() => { state.openBrowserTab(`https://${school.domain}`); state.openAppWorkspace('browser'); }}>Open website ↗</button></nav>
    <main className="academic-main">
      {(!state.isLoggedIn || !self) && <p className="academic-notice">Browse freely. Sign in and link your MAID citizen identity to enroll and save progress.</p>}
      {message && <p role="status" className="academic-notice">{message}</p>}
      {self && academic?.pendingSync[self] && <p className="academic-notice">Academic records are saved. Citizen summary sync is pending. <button onClick={() => void state.retryAcademicSync()}>Retry sync</button></p>}
      {tab === 'overview' && <><section className="academic-hero"><span className="academic-eyebrow">{schoolId === 'cyberium' ? 'Build with purpose' : 'A place for inquiry'}</span><h2>{school.motto}</h2><p>{school.description}</p><button className="academic-primary" onClick={() => setTab('catalog')}>Explore our courses →</button><span className="academic-hero-note">Free enrollment · Self paced · Open to dual study</span></section><div className="academic-grid"><article><span className="academic-eyebrow">Our campus</span><h3>{schoolId === 'cyberium' ? 'From the Quad to Compiler Lab 4' : 'The colleges of Dawn Court'}</h3><p>{school.campus}</p></article><article><span className="academic-eyebrow">Your next chapter</span><h3>Six courses. Three paths.</h3><p>Build foundations, test ideas in practical projects, and earn a certificate in each two-course track.</p><button onClick={() => setTab('studies')}>Continue your studies →</button></article></div></>}
      {tab === 'faculty' && <section><span className="academic-eyebrow">People and scholarship</span><h2>Meet the faculty</h2><div className="academic-grid">{school.faculty.map(name => <article key={name}><h3>{name.split(' · ')[0]}</h3><p>{name.split(' · ')[1]}</p></article>)}</div></section>}
      {(tab === 'catalog' || tab === 'studies') && !course && <section><span className="academic-eyebrow">{tab === 'catalog' ? 'Choose your path' : 'Your academic dashboard'}</span><h2>{tab === 'catalog' ? 'Course catalog' : 'My studies'}</h2><div className="academic-grid">{COURSES.filter(c => c.institution === schoolId && (tab !== 'studies' || records[c.id])).map(c => <article key={c.id}><span className="academic-eyebrow">{c.track} · 3 credits</span><h3>{c.title}</h3><p>{c.prerequisite ? `Prerequisite: ${COURSES.find(p => p.id === c.prerequisite)?.title}` : 'Introductory · No prerequisite'}</p><p>{records[c.id]?.completedAt ? 'Passed' : records[c.id]?.status === 'active' ? `${records[c.id].lessons.length}/3 lessons · Quiz ${records[c.id].bestScore ?? '—'}%` : records[c.id]?.status === 'withdrawn' ? 'Withdrawn' : 'Open for enrollment'}</p><button onClick={() => { setSelected(c.id); setAnswers({}); setMessage(''); }}>View course →</button></article>)}</div>{tab === 'studies' && !COURSES.some(c => c.institution === schoolId && records[c.id]) && <p>You have no coursework at this institution. Explore the catalog to begin.</p>}</section>}
      {(tab === 'catalog' || tab === 'studies') && course && <section className="academic-reader" key={course.id}><button onClick={() => setSelected(null)}>← All courses</button><span className="academic-eyebrow">{course.track}</span><h2>{course.title}</h2>
        <p>Three lessons, five quiz questions, and a practical project. Pass the quiz with 80% or higher to earn 3 credits.</p>
        {(!record || record.status === 'withdrawn') && <button className="academic-primary" disabled={busy || !state.isLoggedIn || !self || !!(course.prerequisite && !records[course.prerequisite]?.completedAt)} onClick={() => void run({ type: 'enroll', course: course.id })}>{record ? 'Resume enrollment' : 'Enroll for free'}</button>}
        {course.prerequisite && !records[course.prerequisite]?.completedAt && <p>Pass {COURSES.find(c => c.id === course.prerequisite)?.title} to enroll.</p>}
        {record?.status === 'active' && <><div className="academic-lessons">{course.lessons.map((lesson, index) => <article key={index}><span className="academic-eyebrow">Lesson {index + 1}</span><h3>{lesson.title}</h3><p>{lesson.text}</p><button disabled={busy || record.lessons.includes(index)} onClick={() => void run({ type: 'lesson', course: course.id, lesson: index })}>{record.lessons.includes(index) ? 'Completed ✓' : 'Mark lesson complete'}</button></article>)}</div>
          <form onSubmit={e => { e.preventDefault(); void run({ type: 'quiz', course: course.id, answers: course.quiz.map((_, i) => answers[i]) }); }}><h3>Course assessment</h3><p>Best score: {record.bestScore ?? '—'}% · Attempts: {record.attempts} · Retries are unlimited.</p>{course.quiz.map((q, i) => <fieldset key={i} disabled={busy || record.lessons.length < 3}><legend>{i + 1}. {q.prompt}</legend>{q.options.map((option, index) => <label className="academic-radio" key={option}><input type="radio" required name={`quiz-${course.id}-${i}`} checked={answers[i] === index} onChange={() => setAnswers(a => ({ ...a, [i]: index }))}/>{option}</label>)}</fieldset>)}<button className="academic-primary" disabled={busy || record.lessons.length < 3}>Submit assessment</button></form>
          <article><h3>Practical project</h3><p>{course.project.title}</p><p>{course.project.kind === 'compiler' ? 'Open your project, then successfully compile a protocol in SpellForge. Compilation costs 15 stamina; recover in housing if needed.' : `Read the assigned ${course.project.kind === 'archive' ? 'archive source' : 'WORKNET assignment'} and submit its evidence-based review in the project workspace. No employment contract is needed for these academic training assignments.`}</p>{record.projectCompletedAt ? <p>Project verified ✓</p> : <button disabled={busy || record.lessons.length < 3} onClick={openProject}>Open project workspace →</button>}</article>
          {record.completedAt && <p className="academic-certificate">Course passed · 3 academic credits earned</p>}<button disabled={busy} onClick={() => void run({ type: 'withdraw', course: course.id })}>Withdraw from course</button>
        </>}
      </section>}
      {tab === 'transcript' && <><h2>Academic transcript</h2><AcademicTranscript citizen={self}/></>}
      {tab === 'registrar' && canManageAcademics(state) && <Registrar/>}
    </main><footer className="academic-footer">{school.name} · {school.domain} · Academic year 1000<span>Knowledge belongs in practice.</span></footer>
  </div>;
}

function Registrar() {
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
  useEffect(() => { let alive = true; MaidIdentityService.getAllPersons().then(list => { if (alive) setPeople(list); }).catch(() => { if (alive) setMessage('The MAID registry could not be loaded.'); }); return () => { alive = false; }; }, []);
  const run = async (type: 'enroll' | 'withdraw' | 'correct') => {
    setBusy(true);
    try { const result = await state.academicAction(type === 'correct' ? { type, citizen, course, reason, score, passed } : { type, citizen, course, reason, registrar: true }); setMessage(result.message); }
    catch { setMessage('The registrar action failed. Please retry.'); } finally { setBusy(false); }
  };
  const audit = (state.gameplay.academics as AcademicState | undefined)?.audit.filter(a => a.citizen === citizen) || [];
  return <section className="academic-registrar"><h2>Registrar desk</h2><p>Manage verified MAID citizens. Each administrative change requires a reason and preserves its previous values.</p><label>Find citizen<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Name or MAID"/></label><label>Citizen<select value={citizen} onChange={e => setCitizen(e.target.value)}><option value="">Select a citizen</option>{people.filter(p => `${p.name} ${p.maid}`.toLowerCase().includes(query.toLowerCase())).map(p => <option value={p.id} key={p.id}>{p.name} · {p.maid || p.id}</option>)}</select></label>{state.gameplay.player.isAdmin && <button disabled={!citizen || busy} onClick={async () => { const result = await state.linkCitizenHubIdentity(citizen); setMessage(result.message); }}>Link selected citizen as my student identity</button>}<label>Course<select value={course} onChange={e => setCourse(e.target.value)}>{COURSES.map(c => <option value={c.id} key={c.id}>{INSTITUTIONS.find(s => s.id === c.institution)?.name} · {c.title}</option>)}</select></label><label>Reason<textarea value={reason} onChange={e => setReason(e.target.value)} required/></label><div className="academic-actions"><button disabled={busy || !citizen || !reason.trim()} onClick={() => void run('enroll')}>Enroll citizen</button><button disabled={busy || !citizen || !reason.trim()} onClick={() => void run('withdraw')}>Withdraw citizen</button></div><h3>Correct academic result</h3><label>Assessment score<input type="number" min="0" max="100" value={score} onChange={e => setScore(Number(e.target.value))}/></label><label className="academic-radio"><input type="checkbox" checked={passed} onChange={e => setPassed(e.target.checked)}/>Confirm all course requirements were met</label><button disabled={busy || !citizen || !reason.trim()} onClick={() => void run('correct')}>Save audited correction</button>{message && <p role="status">{message}</p>}{citizen && <AcademicTranscript citizen={citizen}/>}<h3>Change history</h3>{audit.length ? audit.slice().reverse().map(a => <details key={a.id}><summary>{a.at} · {a.course} · {a.reason}</summary><p>Actor: {a.actor}</p><p>Before: {a.before ? `${a.before.status}, ${a.before.bestScore ?? 'ungraded'}%, ${a.before.completedAt ? 'passed' : 'incomplete'}` : 'No enrollment'}</p><p>After: {a.after.status}, {a.after.bestScore ?? 'ungraded'}%, {a.after.completedAt ? 'passed' : 'incomplete'}</p></details>) : <p>No administrative changes for this citizen.</p>}</section>;
}
