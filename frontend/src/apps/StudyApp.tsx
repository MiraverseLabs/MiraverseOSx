import React, { useEffect, useState } from 'react';
import { ArrowUpRight, BookOpen, CheckCircle2, ClipboardCheck, FlaskConical, GraduationCap } from 'lucide-react';
import {
  COURSES,
  INSTITUTIONS,
  academicCitizenId,
  calculateGpa,
  gradeLabel,
  type AcademicState,
  type InstitutionId,
} from '../gameplay/Academics';
import type { AcademicCommand } from '../store/academicActions';
import { useOSStore } from '../store/useOSStore';
import '../styles/apps/study-lms.css';

type StudyTab = 'modules' | 'project' | 'assessment' | 'syllabus' | 'gradebook';

export default function StudyApp() {
  const state = useOSStore();
  const self = academicCitizenId(state);
  const academics = state.gameplay.academics as AcademicState | undefined;
  const records = self ? academics?.records?.[self] || {} : {};
  const request = state.workspaceRequests.study;

  const enrolledCourses = COURSES.filter(c => records[c.id]?.status === 'active');
  const [schoolFilter, setSchoolFilter] = useState<'all' | InstitutionId>('all');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(enrolledCourses[0]?.id || null);
  const [tab, setTab] = useState<StudyTab>('modules');
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!request) return;
    const sec = request.section;
    if (sec === 'gradebook') {
      setTab('gradebook');
    } else if (INSTITUTIONS.some(i => i.id === sec)) {
      setSchoolFilter(sec as InstitutionId);
      const first = enrolledCourses.find(c => c.institution === sec);
      if (first) setSelectedCourseId(first.id);
    } else if (COURSES.some(c => c.id === sec)) {
      setSelectedCourseId(sec);
      setTab('modules');
      setAnswers({});
    }
    useOSStore.getState().consumeWorkspaceRequest('study', request.revision);
  }, [request]);

  useEffect(() => {
    if (!selectedCourseId && enrolledCourses.length) {
      setSelectedCourseId(enrolledCourses[0].id);
    }
  }, [enrolledCourses.length, selectedCourseId]);

  const visibleCourses =
    schoolFilter === 'all' ? enrolledCourses : enrolledCourses.filter(c => c.institution === schoolFilter);
  const course = COURSES.find(c => c.id === selectedCourseId && records[c.id]?.status === 'active') || visibleCourses[0];
  const record = course ? records[course.id] : undefined;
  const school = course ? INSTITUTIONS.find(i => i.id === course.institution) : undefined;
  const instructor = course && school ? school.facultyDirectory.find(f => f.id === course.instructorId) : undefined;

  const run = async (command: AcademicCommand) => {
    setBusy(true);
    try {
      const res = await state.academicAction(command);
      setMessage(res.message);
    } catch {
      setMessage('Could not save coursework progress. Please retry.');
    } finally {
      setBusy(false);
    }
  };

  function launchProjectWorkspace() {
    if (!course) return;
    if (course.project.kind === 'compiler') {
      state.openAppWorkspace('spellforge');
    } else if (course.project.kind === 'archive') {
      state.openAppWorkspace('lore', 'academic-projects');
    } else {
      state.openAppWorkspace('jobs', 'academic-projects');
    }
  }

  function openEduSite(domain: string) {
    state.openBrowserTab(`https://${domain}/admissions`);
    state.openAppWorkspace('browser');
  }

  const cumulativeGpa = calculateGpa(records);

  return (
    <section className="study-lms" aria-label="AureLearn Student LMS">
      <aside className="study-sidebar">
        <div className="study-brand">
          <div className="study-brand-badge" aria-hidden="true">AL</div>
          <div>
            <strong>AureLearn LMS</strong>
            <span>{academics?.activeTerm || 'Autumn 1000'} · Coursework</span>
          </div>
        </div>

        <div className="study-filters" role="group" aria-label="Filter by institution">
          <button aria-pressed={schoolFilter === 'all'} onClick={() => setSchoolFilter('all')}>All</button>
          {INSTITUTIONS.map(inst => (
            <button key={inst.id} aria-pressed={schoolFilter === inst.id} onClick={() => setSchoolFilter(inst.id)}>
              {inst.shortName}
            </button>
          ))}
        </div>

        <button
          className="study-btn-secondary"
          onClick={() => setTab('gradebook')}
          aria-pressed={tab === 'gradebook'}
        >
          <ClipboardCheck size={14} /> Gradebook (GPA: {cumulativeGpa !== null ? cumulativeGpa.toFixed(2) : '—'})
        </button>

        <div className="study-course-list" aria-label="Enrolled courses">
          {visibleCourses.length ? (
            visibleCourses.map(c => {
              const rec = records[c.id];
              const inst = INSTITUTIONS.find(i => i.id === c.institution)!;
              return (
                <button
                  key={c.id}
                  className="study-course-item"
                  aria-pressed={tab !== 'gradebook' && course?.id === c.id}
                  onClick={() => {
                    setSelectedCourseId(c.id);
                    if (tab === 'gradebook') setTab('modules');
                    setAnswers({});
                    setMessage('');
                  }}
                >
                  <span className="study-course-item-code">{c.code} · {inst.shortName}</span>
                  <strong>{c.title}</strong>
                  <small>
                    {rec.completedAt
                      ? `Passed · ${gradeLabel(rec.bestScore)} (${rec.bestScore}%)`
                      : `${rec.lessons.length}/3 modules · Exam ${rec.bestScore ?? '—'}%`}
                  </small>
                </button>
              );
            })
          ) : (
            <p style={{ fontSize: 12, color: '#64748b' }}>
              No active enrollments{schoolFilter !== 'all' ? ' at this institution' : ''}.
            </p>
          )}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid #e6ebf4', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button className="study-btn-secondary" onClick={() => state.openAppWorkspace('campus', 'transcript')}>
            <GraduationCap size={14} /> Open CAMPUS Registrar
          </button>
        </div>
      </aside>

      <main className="study-main">
        {message && <div className="study-notice" role="status">{message}</div>}

        {tab === 'gradebook' ? (
          <div className="study-card">
            <span className="study-eyebrow">Cross-Institution Academic Record</span>
            <h2>Student Gradebook</h2>
            <p>Cumulative GPA: <strong>{cumulativeGpa !== null ? cumulativeGpa.toFixed(2) : '—'}</strong> across all graded courses.</p>
            <table className="study-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Course</th>
                  <th>Institution</th>
                  <th>Modules</th>
                  <th>Project</th>
                  <th>Best Exam</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>
                {COURSES.filter(c => records[c.id]).map(c => {
                  const rec = records[c.id];
                  const inst = INSTITUTIONS.find(i => i.id === c.institution)!;
                  return (
                    <tr key={c.id}>
                      <td><strong>{c.code}</strong></td>
                      <td>{c.title}</td>
                      <td>{inst.name}</td>
                      <td>{rec.lessons.length}/3</td>
                      <td>{rec.projectCompletedAt ? 'Verified ✓' : rec.projectOpenedAt ? 'In progress' : 'Not started'}</td>
                      <td>{rec.bestScore !== null ? `${rec.bestScore}%` : '—'}</td>
                      <td><strong>{gradeLabel(rec.bestScore)}</strong></td>
                    </tr>
                  );
                })}
                {!COURSES.some(c => records[c.id]) && (
                  <tr>
                    <td colSpan={7}>No coursework recorded yet. Apply and register on any .edu website to begin.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : !course || !record || !school ? (
          <div className="study-card">
            <span className="study-eyebrow">Welcome to AureLearn</span>
            <h2>Enroll on a University Website to Begin Studying</h2>
            <p>
              AureLearn hosts your active course modules, exams, and lab handoffs across Meridion’s accredited institutions.
              Visit any university website in VerseNet Browser to apply for admission and register for courses:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
              {INSTITUTIONS.map(inst => (
                <button key={inst.id} className="study-btn-primary" onClick={() => openEduSite(inst.domain)}>
                  Visit {inst.name} ({inst.domain}) <ArrowUpRight size={14} />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <header className="study-header">
              <div>
                <span className="study-eyebrow">
                  {school.name} · {course.code} · {course.track} · {course.credits} Credits
                </span>
                <h1>{course.title}</h1>
                <p style={{ margin: 0, fontSize: 12.5, color: '#475569' }}>
                  Instructor: {instructor?.name || 'Faculty'} · {record.completedAt ? 'Course Passed ✓' : 'In Progress'}
                </p>
              </div>
              <div className="study-tabs" role="tablist" aria-label="Course sections">
                <button aria-pressed={tab === 'modules'} onClick={() => setTab('modules')}>
                  Modules ({record.lessons.length}/3)
                </button>
                <button aria-pressed={tab === 'assessment'} onClick={() => setTab('assessment')}>
                  Assessment ({record.bestScore ?? '—'}%)
                </button>
                <button aria-pressed={tab === 'project'} onClick={() => setTab('project')}>
                  Practical Lab {record.projectCompletedAt ? '✓' : ''}
                </button>
                <button aria-pressed={tab === 'syllabus'} onClick={() => setTab('syllabus')}>
                  Syllabus
                </button>
              </div>
            </header>

            {tab === 'modules' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {course.lessons.map((lesson, idx) => {
                  const done = record.lessons.includes(idx);
                  return (
                    <article key={lesson.title} className="study-card">
                      <span className="study-eyebrow">Module {idx + 1} of 3</span>
                      <h3>{lesson.title}</h3>
                      <p>{lesson.text}</p>
                      <button
                        className={done ? 'study-btn-secondary' : 'study-btn-primary'}
                        disabled={busy || done}
                        onClick={() => void run({ type: 'lesson', course: course.id, lesson: idx })}
                      >
                        {done ? <><CheckCircle2 size={14} /> Completed ✓</> : 'Mark lesson complete'}
                      </button>
                    </article>
                  );
                })}
              </div>
            )}

            {tab === 'assessment' && (
              <form
                className="study-card study-quiz"
                onSubmit={e => {
                  e.preventDefault();
                  void run({
                    type: 'quiz',
                    course: course.id,
                    answers: course.quiz.map((_, i) => answers[i]),
                  });
                }}
              >
                <span className="study-eyebrow">Course Assessment</span>
                <h2>{course.code} Examination</h2>
                <p>
                  Best score: <strong>{record.bestScore ?? '—'}%</strong> · Attempts: {record.attempts} · Pass mark: 80% · Retries are unlimited.
                </p>
                {record.lessons.length < 3 && (
                  <div className="study-notice">Complete all 3 modules before submitting the assessment.</div>
                )}
                {course.quiz.map((q, i) => (
                  <fieldset key={i} disabled={busy || record.lessons.length < 3}>
                    <legend>{i + 1}. {q.prompt}</legend>
                    {q.options.map((opt, idx) => (
                      <label key={opt} className="study-radio">
                        <input
                          type="radio"
                          required
                          name={`lms-quiz-${course.id}-${i}`}
                          checked={answers[i] === idx}
                          onChange={() => setAnswers(a => ({ ...a, [i]: idx }))}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </fieldset>
                ))}
                <button type="submit" className="study-btn-primary" disabled={busy || record.lessons.length < 3}>
                  Submit assessment
                </button>
              </form>
            )}

            {tab === 'project' && (
              <article className="study-card">
                <span className="study-eyebrow">Practical Component</span>
                <h2>{course.project.title}</h2>
                <p>Source: <strong>{course.project.source}</strong></p>
                <p>
                  {course.project.kind === 'compiler'
                    ? 'Open your project bench in SpellForge Lab, then successfully compile a protocol. Compilation requires 15 stamina.'
                    : `Open your assigned ${course.project.kind === 'archive' ? 'Royal Archives reading' : 'WORKNET civic practicum'} and submit an evidence-based review.`}
                </p>
                {record.projectCompletedAt ? (
                  <div className="study-notice"><CheckCircle2 size={14} style={{ verticalAlign: 'middle' }} /> Project verified ✓</div>
                ) : (
                  <button
                    className="study-btn-primary"
                    disabled={busy || record.lessons.length < 3}
                    onClick={launchProjectWorkspace}
                  >
                    <FlaskConical size={14} /> Open project workspace →
                  </button>
                )}
                {record.lessons.length < 3 && (
                  <p style={{ fontSize: 12, color: '#b45309' }}>Complete all 3 modules to unlock the practical project.</p>
                )}
              </article>
            )}

            {tab === 'syllabus' && (
              <article className="study-card">
                <span className="study-eyebrow">Official Syllabus · {course.term}</span>
                <h2>{course.code}: {course.title}</h2>
                <p>{course.syllabus.overview}</p>
                <h3>Learning Outcomes</h3>
                <ul>
                  {course.syllabus.outcomes.map(o => (
                    <li key={o} style={{ fontSize: 13.5, lineHeight: 1.65 }}>{o}</li>
                  ))}
                </ul>
                <h3>Grading Weights</h3>
                <p>
                  Modules {course.syllabus.weights.lessons}% · Practical Lab {course.syllabus.weights.project}% · Final Assessment {course.syllabus.weights.exam}%
                </p>
                <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                  <button
                    className="study-btn-secondary"
                    onClick={() => {
                      state.openBrowserTab(`https://${school.domain}/courses/${course.id}`);
                      state.openAppWorkspace('browser');
                    }}
                  >
                    <BookOpen size={14} /> View on {school.domain}
                  </button>
                  <button
                    className="study-btn-secondary"
                    disabled={busy}
                    onClick={() => void run({ type: 'withdraw', course: course.id })}
                  >
                    Withdraw from course
                  </button>
                </div>
              </article>
            )}
          </>
        )}
      </main>
    </section>
  );
}
