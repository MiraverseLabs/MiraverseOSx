import React, { useState } from 'react';
import {
  ArrowRight, ArrowUpRight, Award, BookOpen, Calendar, CheckCircle2,
  Compass, GraduationCap, Mail, MapPin, MessageSquare, ShieldCheck, Users,
} from 'lucide-react';
import {
  COURSES,
  INSTITUTIONS,
  academicCitizenId,
  academicStanding,
  calculateGpa,
  coursePassed,
  degreeProgress,
  getAdmissionRecord,
  gradeLabel,
  isAdmittedToInstitution,
  type AcademicInstitution,
  type AcademicState,
} from '../../../gameplay/Academics';
import type { AcademicCommand } from '../../../store/academicActions';
import { useOSStore } from '../../../store/useOSStore';
import { eduUrl, type EduLocation } from './eduRouter';

export interface EduSectionProps {
  school: AcademicInstitution;
  location: EduLocation;
  navigateTab: (url: string, title?: string) => void;
}

export function useEduContext(school: AcademicInstitution) {
  const state = useOSStore();
  const self = academicCitizenId(state);
  const academics = state.gameplay.academics as AcademicState | undefined;
  const records = self ? academics?.records?.[self] || {} : {};
  const admitted = isAdmittedToInstitution(academics, self, school.id);
  const admission = getAdmissionRecord(academics, self, school.id);
  const joinedClubs = self ? academics?.clubs?.[self] || [] : [];
  const schoolCourses = COURSES.filter(c => c.institution === school.id);
  const enrolledCourses = schoolCourses.filter(c => records[c.id]?.status === 'active');
  const gpa = calculateGpa(records, school.id);
  const earnedCredits = schoolCourses
    .filter(c => coursePassed(records[c.id]))
    .reduce((sum, c) => sum + c.credits, 0);
  const standing = academicStanding(gpa, earnedCredits);
  const degrees = degreeProgress(records, school.id);

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const run = async (command: AcademicCommand) => {
    setBusy(true);
    try {
      const res = await state.academicAction(command);
      setNotice(res.message);
      return res;
    } catch {
      setNotice('The academic request could not be saved. Please retry.');
      return { ok: false, message: 'Error' };
    } finally {
      setBusy(false);
    }
  };

  return {
    state,
    self,
    academics,
    records,
    admitted,
    admission,
    joinedClubs,
    schoolCourses,
    enrolledCourses,
    gpa,
    earnedCredits,
    standing,
    degrees,
    busy,
    notice,
    setNotice,
    run,
  };
}

export function EduSectionContent({ school, location, navigateTab }: EduSectionProps) {
  const ctx = useEduContext(school);
  const [selectedProgram, setSelectedProgram] = useState(school.degrees[0]?.id || '');
  const [statement, setStatement] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');

  const go = (section: EduLocation['section'], detailId?: string) =>
    navigateTab(eduUrl(school.id, section, detailId));

  const openLms = (courseId?: string) => {
    ctx.state.openAppWorkspace('study', courseId || school.id);
  };

  const openRegistrar = () => ctx.state.openAppWorkspace('campus', 'transcript');
  const openMail = () => ctx.state.openAppWorkspace('mail');
  const openComms = () => ctx.state.openAppWorkspace('comms');

  const statusBanners = (
    <>
      {(!ctx.state.isLoggedIn || !ctx.self) && (
        <div className="edu-banner edu-banner-info" role="note">
          Browse freely. Sign in and link your MAID citizen identity in Citizen Hub to apply, enroll, and track official credits.
        </div>
      )}
      {ctx.notice && (
        <div className="edu-banner edu-banner-status" role="status">
          {ctx.notice}
        </div>
      )}
    </>
  );

  // ── /admissions ──────────────────────────────────────────────────────────
  if (location.section === 'admissions') {
    return (
      <div className="edu-section">
        {statusBanners}
        <header className="edu-page-header">
          <span className="edu-eyebrow">Office of Admissions · {ctx.academics?.activeTerm || 'Autumn 1000'}</span>
          <h2>Admissions & Enrollment</h2>
          <p>{school.admissionsNote}</p>
        </header>

        {ctx.admitted && ctx.admission ? (
          <div className="edu-admitted-card">
            <div className="edu-admitted-badge">
              <CheckCircle2 size={18} />
              <span>Admitted Scholar · Active Standing</span>
            </div>
            <div className="edu-id-grid">
              <div>
                <span className="edu-meta-label">Institution</span>
                <strong>{school.name}</strong>
              </div>
              <div>
                <span className="edu-meta-label">Official Student ID</span>
                <strong className="edu-mono">{ctx.admission.studentId}</strong>
              </div>
              <div>
                <span className="edu-meta-label">Declared Program</span>
                <strong>
                  {school.degrees.find(d => d.id === ctx.admission?.declaredProgramId)?.title || school.degrees[0]?.title}
                </strong>
              </div>
              <div>
                <span className="edu-meta-label">Campus Channel</span>
                <strong className="edu-mono">#{school.commsChannelId}</strong>
              </div>
            </div>

            <div className="edu-program-switcher">
              <label>
                <span>Update Declared Degree / Certificate Program</span>
                <select
                  value={ctx.admission.declaredProgramId || school.degrees[0]?.id}
                  disabled={ctx.busy}
                  onChange={e => void ctx.run({ type: 'declare-program', institution: school.id, programId: e.target.value })}
                >
                  {school.degrees.map(deg => (
                    <option key={deg.id} value={deg.id}>
                      {deg.title} ({deg.requiredCredits} credits)
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="edu-btn-row">
              <button className="edu-btn-primary" onClick={() => go('courses')}>
                Browse & Register for Courses <ArrowRight size={14} />
              </button>
              <button className="edu-btn-secondary" onClick={() => openLms()}>
                Open AureLearn LMS <ArrowUpRight size={14} />
              </button>
              <button className="edu-btn-secondary" onClick={openMail}>
                <Mail size={14} /> View Acceptance Letter
              </button>
              <button className="edu-btn-secondary" onClick={openComms}>
                <MessageSquare size={14} /> Open #{school.commsChannelId}
              </button>
            </div>
          </div>
        ) : (
          <div className="edu-two-col">
            <form
              className="edu-card edu-form"
              onSubmit={e => {
                e.preventDefault();
                void ctx.run({
                  type: 'apply',
                  institution: school.id,
                  programId: selectedProgram,
                  statement,
                });
              }}
            >
              <span className="edu-eyebrow">Application Form</span>
              <h3>Apply to {school.name}</h3>
              <p>Applications are verified against your linked MAID identity. Dual enrollment across Meridion institutions is welcome.</p>

              <label>
                <span>Intended Academic Program</span>
                <select value={selectedProgram} onChange={e => setSelectedProgram(e.target.value)}>
                  {school.degrees.map(deg => (
                    <option key={deg.id} value={deg.id}>
                      {deg.title} ({deg.requiredCredits} credits · {deg.level})
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Brief Statement of Academic Purpose (optional)</span>
                <textarea
                  rows={4}
                  value={statement}
                  onChange={e => setStatement(e.target.value)}
                  placeholder={`Tell ${school.name} Admissions what you hope to study or contribute...`}
                />
              </label>

              <button
                type="submit"
                className="edu-btn-primary"
                disabled={ctx.busy || !ctx.state.isLoggedIn || !ctx.self}
              >
                {ctx.busy ? 'Submitting Application…' : `Submit Application to ${school.name}`}
              </button>
            </form>

            <aside className="edu-card">
              <span className="edu-eyebrow">What Admission Unlocks</span>
              <h3>Your Scholar Credentials</h3>
              <ul className="edu-checklist">
                <li>Official {school.name} Student ID recorded in CAMPUS</li>
                <li>Signed Offer of Admission delivered to your AureMail inbox</li>
                <li>Direct course registration across all {ctx.schoolCourses.length} courses</li>
                <li>Access to <span className="edu-mono">#{school.commsChannelId}</span> in Comms</li>
                <li>Membership in campus societies & practical lab benches</li>
              </ul>
            </aside>
          </div>
        )}
      </div>
    );
  }

  // ── /academics ───────────────────────────────────────────────────────────
  if (location.section === 'academics') {
    return (
      <div className="edu-section">
        {statusBanners}
        <header className="edu-page-header">
          <span className="edu-eyebrow">Colleges, Departments & Credentials</span>
          <h2>Academics at {school.name}</h2>
          <p>Explore our academic departments and structured degree pathways.</p>
        </header>

        <section className="edu-subblock">
          <h3>Academic Departments</h3>
          <div className="edu-grid-3">
            {school.departments.map(dept => (
              <article key={dept.id} className="edu-card">
                <span className="edu-eyebrow">{dept.building}</span>
                <h4>{dept.name}</h4>
                <p>{dept.summary}</p>
                <div className="edu-card-meta">Chair: {dept.chair}</div>
                <button
                  className="edu-btn-link"
                  onClick={() => {
                    setDeptFilter(dept.id);
                    go('courses');
                  }}
                >
                  View department courses <ArrowRight size={13} />
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="edu-subblock">
          <h3>Degrees, Diplomas & Certificates</h3>
          <div className="edu-grid-3">
            {ctx.degrees.map(({ degree, credits, requiredCredits, earned, percent }) => (
              <article key={degree.id} className={`edu-card ${earned ? 'edu-card-earned' : ''}`}>
                <span className="edu-eyebrow">{degree.level.toUpperCase()} · {requiredCredits} CREDITS</span>
                <h4>{degree.title}</h4>
                <p>{degree.description}</p>
                <div className="edu-card-meta">Required tracks: {degree.requiredTracks.join(', ')}</div>
                <div className="edu-progress-bar" aria-label={`${percent}% complete`}>
                  <div style={{ width: `${percent}%` }} />
                </div>
                <div className="edu-progress-label">
                  {earned ? (
                    <span className="edu-earned-tag"><Award size={13} /> Credential Conferred</span>
                  ) : (
                    <span>{credits} / {requiredCredits} credits ({percent}%)</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    );
  }

  // ── /courses & /courses/:id ──────────────────────────────────────────────
  if (location.section === 'courses') {
    const selectedCourse = location.courseId
      ? ctx.schoolCourses.find(c => c.id === location.courseId)
      : undefined;

    if (selectedCourse) {
      const rec = ctx.records[selectedCourse.id];
      const instructor = school.facultyDirectory.find(f => f.id === selectedCourse.instructorId);
      const dept = school.departments.find(d => d.id === selectedCourse.departmentId);
      const prereqCourse = selectedCourse.prerequisite
        ? COURSES.find(c => c.id === selectedCourse.prerequisite)
        : undefined;
      const prereqMet = !prereqCourse || Boolean(ctx.records[prereqCourse.id]?.completedAt);

      return (
        <div className="edu-section">
          {statusBanners}
          <button className="edu-btn-link" onClick={() => go('courses')}>
            ← Back to Course Catalog
          </button>

          <article className="edu-syllabus">
            <header className="edu-syllabus-head">
              <div>
                <span className="edu-eyebrow">
                  {selectedCourse.code} · {selectedCourse.track} · {selectedCourse.credits} Credits · {selectedCourse.term}
                </span>
                <h2>{selectedCourse.title}</h2>
                <p>{selectedCourse.syllabus.overview}</p>
              </div>
              <div className="edu-syllabus-actions">
                {!ctx.admitted ? (
                  <button className="edu-btn-primary" onClick={() => go('admissions')}>
                    Apply for Admission to Enroll <ArrowRight size={14} />
                  </button>
                ) : rec?.status === 'active' ? (
                  <>
                    <button className="edu-btn-primary" onClick={() => openLms(selectedCourse.id)}>
                      <BookOpen size={14} /> Study in AureLearn LMS
                    </button>
                    <button
                      className="edu-btn-secondary"
                      disabled={ctx.busy}
                      onClick={() => void ctx.run({ type: 'withdraw', course: selectedCourse.id })}
                    >
                      Drop / Withdraw
                    </button>
                  </>
                ) : (
                  <button
                    className="edu-btn-primary"
                    disabled={ctx.busy || !prereqMet}
                    onClick={() => void ctx.run({ type: 'enroll', course: selectedCourse.id })}
                  >
                    {rec?.status === 'withdrawn' ? 'Re-enroll in Course' : 'Register for Course'}
                  </button>
                )}
                {!prereqMet && prereqCourse && (
                  <span className="edu-prereq-warn">Requires passing {prereqCourse.code}: {prereqCourse.title}</span>
                )}
              </div>
            </header>

            <div className="edu-syllabus-meta">
              <div>
                <span className="edu-meta-label">Department</span>
                <strong>{dept?.name || selectedCourse.track}</strong>
              </div>
              <div>
                <span className="edu-meta-label">Instructor</span>
                <strong>{instructor?.name || 'Faculty Staff'}</strong>
              </div>
              <div>
                <span className="edu-meta-label">Practical Component</span>
                <strong>
                  {selectedCourse.project.kind === 'compiler'
                    ? 'SpellForge Lab'
                    : selectedCourse.project.kind === 'archive'
                      ? 'Royal Archives Review'
                      : 'WORKNET Civic Practicum'}
                </strong>
              </div>
              <div>
                <span className="edu-meta-label">Your Status</span>
                <strong>
                  {rec?.completedAt
                    ? `Passed · ${gradeLabel(rec.bestScore)} (${rec.bestScore}%)`
                    : rec?.status === 'active'
                      ? `Enrolled · ${rec.lessons.length}/3 modules`
                      : 'Not registered'}
                </strong>
              </div>
            </div>

            <div className="edu-two-col">
              <div className="edu-card">
                <span className="edu-eyebrow">Syllabus Modules</span>
                <h3>Course Curriculum</h3>
                <ol className="edu-module-list">
                  {selectedCourse.lessons.map((lesson, idx) => (
                    <li key={lesson.title}>
                      <strong>Module {idx + 1}: {lesson.title}</strong>
                      <p>{lesson.text}</p>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="edu-card">
                <span className="edu-eyebrow">Assessment & Outcomes</span>
                <h3>Learning Outcomes</h3>
                <ul className="edu-checklist">
                  {selectedCourse.syllabus.outcomes.map(outcome => (
                    <li key={outcome}>{outcome}</li>
                  ))}
                </ul>
                <h4>Grading Breakdown</h4>
                <p>
                  Modules: {selectedCourse.syllabus.weights.lessons}% · Practical Lab/Project: {selectedCourse.syllabus.weights.project}% · Final Assessment: {selectedCourse.syllabus.weights.exam}% (80% minimum pass).
                </p>
              </div>
            </div>
          </article>
        </div>
      );
    }

    const filteredCourses =
      deptFilter === 'all'
        ? ctx.schoolCourses
        : ctx.schoolCourses.filter(c => c.departmentId === deptFilter);

    return (
      <div className="edu-section">
        {statusBanners}
        <header className="edu-page-header">
          <span className="edu-eyebrow">Registrar Catalog · {ctx.academics?.activeTerm || 'Autumn 1000'}</span>
          <h2>Course Catalog</h2>
          <p>
            {ctx.admitted
              ? 'Select a course to inspect its syllabus, register, or launch coursework in AureLearn.'
              : `Browse all ${ctx.schoolCourses.length} courses offered at ${school.name}. Apply via Admissions to register.`}
          </p>
        </header>

        <div className="edu-filter-bar" role="group" aria-label="Filter courses by department">
          <button aria-pressed={deptFilter === 'all'} onClick={() => setDeptFilter('all')}>
            All Departments ({ctx.schoolCourses.length})
          </button>
          {school.departments.map(dept => (
            <button key={dept.id} aria-pressed={deptFilter === dept.id} onClick={() => setDeptFilter(dept.id)}>
              {dept.name}
            </button>
          ))}
        </div>

        <div className="edu-grid-2">
          {filteredCourses.map(c => {
            const rec = ctx.records[c.id];
            const instructor = school.facultyDirectory.find(f => f.id === c.instructorId);
            return (
              <article key={c.id} className="edu-card edu-course-card">
                <div className="edu-course-top">
                  <span className="edu-code-pill">{c.code}</span>
                  <span className="edu-credit-pill">{c.credits} credits · Level {c.level}</span>
                </div>
                <h3>{c.title}</h3>
                <p>{c.syllabus.overview}</p>
                <div className="edu-card-meta">
                  Instructor: {instructor?.name || 'Faculty'} ·{' '}
                  {c.prerequisite
                    ? `Prereq: ${COURSES.find(p => p.id === c.prerequisite)?.code}`
                    : 'No prerequisite'}
                </div>
                <div className="edu-course-footer">
                  <span className="edu-status-chip">
                    {rec?.completedAt
                      ? `Passed (${gradeLabel(rec.bestScore)})`
                      : rec?.status === 'active'
                        ? `Enrolled · ${rec.lessons.length}/3 modules`
                        : rec?.status === 'withdrawn'
                          ? 'Withdrawn'
                          : 'Open'}
                  </span>
                  <div className="edu-btn-row">
                    <button className="edu-btn-secondary" onClick={() => go('courses', c.id)}>
                      Syllabus & Details <ArrowRight size={13} />
                    </button>
                    {rec?.status === 'active' && (
                      <button className="edu-btn-primary" onClick={() => openLms(c.id)}>
                        Open in LMS
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  // ── /faculty ─────────────────────────────────────────────────────────────
  if (location.section === 'faculty') {
    return (
      <div className="edu-section">
        {statusBanners}
        <header className="edu-page-header">
          <span className="edu-eyebrow">People & Scholarship</span>
          <h2>Faculty & Office Hours</h2>
          <p>Connect with instructors, advisors, and laboratory chairs across {school.name}.</p>
        </header>

        <div className="edu-grid-2">
          {school.facultyDirectory.map(member => (
            <article key={member.id} className="edu-card edu-faculty-card">
              <span className="edu-eyebrow">{member.department}</span>
              <h3>{member.name}</h3>
              <div className="edu-faculty-title">{member.title}</div>
              <p>{member.bio}</p>
              <div className="edu-faculty-meta">
                <span><MapPin size={13} /> {member.office}</span>
                <span><Calendar size={13} /> {member.officeHours}</span>
                <span className="edu-mono"><Mail size={13} /> {member.email}</span>
              </div>
              <blockquote className="edu-advising-tip">
                <strong>Advising Note:</strong> {member.advisingTip}
              </blockquote>
              <button className="edu-btn-secondary" onClick={openMail}>
                Contact via AureMail <ArrowUpRight size={13} />
              </button>
            </article>
          ))}
        </div>
      </div>
    );
  }

  // ── /campus-life ─────────────────────────────────────────────────────────
  if (location.section === 'campus-life') {
    return (
      <div className="edu-section">
        {statusBanners}
        <header className="edu-page-header">
          <span className="edu-eyebrow">Community, Societies & Bulletins</span>
          <h2>Campus Life at {school.name}</h2>
          <p>{school.campus}</p>
        </header>

        <section className="edu-subblock">
          <h3>Student Societies & Clubs</h3>
          <div className="edu-grid-3">
            {school.clubs.map(club => {
              const isMember = ctx.joinedClubs.includes(club.id);
              return (
                <article key={club.id} className="edu-card">
                  <span className="edu-eyebrow">{club.category}</span>
                  <h4>{club.name}</h4>
                  <p>{club.description}</p>
                  <div className="edu-card-meta">
                    {club.meetingPlace} · {club.schedule}
                  </div>
                  <button
                    className={isMember ? 'edu-btn-secondary' : 'edu-btn-primary'}
                    disabled={ctx.busy || !ctx.admitted}
                    onClick={() => void ctx.run({ type: 'toggle-club', institution: school.id, clubId: club.id })}
                  >
                    <Users size={13} /> {isMember ? 'Member ✓ (Leave)' : ctx.admitted ? 'Join Society' : 'Admission Required'}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="edu-subblock">
          <h3>Campus Bulletin & Events</h3>
          <div className="edu-grid-3">
            {school.bulletins.map(item => (
              <article key={item.id} className="edu-card">
                <span className="edu-eyebrow">{item.tag} · {item.date}</span>
                <h4>{item.title}</h4>
                <p>{item.summary}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    );
  }

  // ── /portal ──────────────────────────────────────────────────────────────
  return (
    <div className="edu-section">
      {statusBanners}
      <header className="edu-page-header">
        <span className="edu-eyebrow">Single Sign-On · MAID Authenticated</span>
        <h2>{school.name} Student Portal</h2>
        <p>Launch your coursework in AureLearn, review your official standing in CAMPUS, or connect in Comms.</p>
      </header>

      {!ctx.admitted || !ctx.admission ? (
        <div className="edu-card">
          <h3>Not Yet Admitted to {school.name}</h3>
          <p>Submit a free admissions application to receive your Student ID, unlock course registration, and access the Student Portal.</p>
          <button className="edu-btn-primary" onClick={() => go('admissions')}>
            Go to Admissions Portal <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <>
          <div className="edu-kpi-row">
            <div className="edu-kpi">
              <span className="edu-meta-label">Student ID</span>
              <strong className="edu-mono">{ctx.admission.studentId}</strong>
            </div>
            <div className="edu-kpi">
              <span className="edu-meta-label">Institution GPA</span>
              <strong>{ctx.gpa !== null ? ctx.gpa.toFixed(2) : '—'}</strong>
            </div>
            <div className="edu-kpi">
              <span className="edu-meta-label">Earned Credits</span>
              <strong>{ctx.earnedCredits}</strong>
            </div>
            <div className="edu-kpi">
              <span className="edu-meta-label">Standing</span>
              <strong>{ctx.standing}</strong>
            </div>
          </div>

          <div className="edu-btn-row">
            <button className="edu-btn-primary" onClick={() => openLms()}>
              <BookOpen size={14} /> Launch AureLearn LMS
            </button>
            <button className="edu-btn-secondary" onClick={openRegistrar}>
              <GraduationCap size={14} /> Open CAMPUS Registrar & Transcript
            </button>
            <button className="edu-btn-secondary" onClick={openComms}>
              <MessageSquare size={14} /> Open #{school.commsChannelId}
            </button>
            <button className="edu-btn-secondary" onClick={() => go('courses')}>
              <Compass size={14} /> Add / Drop Courses
            </button>
          </div>

          <section className="edu-subblock">
            <h3>Active Courses ({ctx.enrolledCourses.length})</h3>
            {ctx.enrolledCourses.length ? (
              <div className="edu-grid-2">
                {ctx.enrolledCourses.map(c => {
                  const rec = ctx.records[c.id];
                  return (
                    <article key={c.id} className="edu-card">
                      <span className="edu-eyebrow">{c.code} · {c.track}</span>
                      <h4>{c.title}</h4>
                      <p>
                        Modules: {rec.lessons.length}/3 · Best Assessment: {rec.bestScore ?? '—'}% · Project:{' '}
                        {rec.projectCompletedAt ? 'Verified ✓' : 'Pending'}
                      </p>
                      <button className="edu-btn-primary" onClick={() => openLms(c.id)}>
                        Continue in AureLearn <ArrowUpRight size={13} />
                      </button>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p>You have no active classes this term. Visit the Course Catalog to register.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export function EduNetworkDirectoryBar({
  currentId,
  navigateTab,
}: {
  currentId: AcademicInstitution['id'];
  navigateTab: (url: string, title?: string) => void;
}) {
  return (
    <div className="edu-network-strip" aria-label="Meridion Higher Education Network">
      <span><ShieldCheck size={12} /> Meridion Higher Education</span>
      <div className="edu-network-links">
        {INSTITUTIONS.map(inst => (
          <a
            key={inst.id}
            href={`https://${inst.domain}`}
            aria-current={inst.id === currentId ? 'page' : undefined}
            onClick={e => {
              e.preventDefault();
              navigateTab(`https://${inst.domain}`);
            }}
          >
            {inst.shortName}
          </a>
        ))}
      </div>
    </div>
  );
}
