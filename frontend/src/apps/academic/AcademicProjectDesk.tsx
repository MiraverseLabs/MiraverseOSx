import React, { useState } from 'react';
import { COURSES, academicCitizenId, type AcademicState } from '../../gameplay/Academics';
import { useOSStore } from '../../store/useOSStore';
import '../../styles/apps/academics.css';

export default function AcademicProjectDesk({ workspace }: { workspace: 'archive' | 'worknet' | 'compiler' }) {
  const state = useOSStore();
  const self = academicCitizenId(state);
  const records = self ? (state.gameplay.academics as AcademicState | undefined)?.records[self] || {} : {};
  const courses = COURSES.filter(c => records[c.id]?.status === 'active' && (workspace === 'archive' ? c.project.kind === 'archive' : workspace === 'compiler' ? c.project.kind === 'compiler' : ['engineering', 'civic'].includes(c.project.kind)));
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function run(command: Parameters<typeof state.academicAction>[0]) { setBusy(true); try { setMessage((await state.academicAction(command)).message); } catch { setMessage('Project could not be saved. Please retry.'); } finally { setBusy(false); } }
  return <section className="academic-project-desk"><header><span className="academic-eyebrow">{workspace === 'archive' ? 'Royal Archives · Assigned reading collection' : workspace === 'compiler' ? 'Compiler Lab 4 · Practical bench' : 'WORKNET · Academic training assignments'}</span><h2>Course projects</h2><p>{workspace === 'compiler' ? 'Begin the assigned project before compiling a protocol below. A successful compilation supplies verified project evidence.' : 'Open your assigned source and use its evidence to complete the review. Training assignments are available without employment enrollment.'}</p><button onClick={() => state.openAppWorkspace('campus')}>Return to CAMPUS →</button></header>{message && <p role="status">{message}</p>}{!courses.length && <p>No active course projects here. Enroll through CAMPUS to begin.</p>}{courses.map(c => <article key={c.id}><h3>{c.project.title}</h3><p>{c.project.id}</p>{records[c.id].projectCompletedAt ? <p>Verified ✓</p> : <><button disabled={busy || records[c.id].lessons.length < 3} onClick={() => void run({ type: 'open-project', course: c.id })}>{records[c.id].projectOpenedAt ? 'Source opened ✓' : 'Open assigned source'}</button>{records[c.id].lessons.length < 3 && <p>Complete all three course lessons first.</p>}{records[c.id].projectOpenedAt && <><blockquote><strong>{c.project.source}</strong><p>{c.project.passage}</p></blockquote>{workspace !== 'compiler' && <form onSubmit={e => { e.preventDefault(); void run({ type: 'project', course: c.id, answer: answers[c.id] }); }}><fieldset disabled={busy}><legend>{c.project.question.prompt}</legend>{c.project.question.options.map((option, i) => <label className="academic-radio" key={option}><input type="radio" name={c.id} required checked={answers[c.id] === i} onChange={() => setAnswers(a => ({ ...a, [c.id]: i }))}/>{option}</label>)}</fieldset><button disabled={busy}>Submit evidence review</button></form>}</>}</>}</article>)}</section>;
}
