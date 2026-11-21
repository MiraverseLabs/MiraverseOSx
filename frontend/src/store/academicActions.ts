import type { OSStoreState } from './useOSStore';
import { resolveAuraActor } from '../integration/auraPermissions';
import { COURSES, academicCitizenId, academicSummary, emptyAcademics, type AcademicState, type AcademicEnrollment } from '../gameplay/Academics';

type Result = { ok: boolean; message: string };
export type AcademicCommand =
  | { type: 'enroll' | 'withdraw'; course: string; citizen?: string; reason?: string; registrar?: boolean }
  | { type: 'lesson'; course: string; lesson: number }
  | { type: 'quiz'; course: string; answers: number[] }
  | { type: 'open-project'; course: string }
  | { type: 'project'; course: string; answer: number }
  | { type: 'correct'; course: string; citizen: string; score: number; passed: boolean; reason: string };
export interface AcademicActions { academicAction: (command: AcademicCommand) => Promise<Result>; retryAcademicSync: () => Promise<void> }
export function canManageAcademics(state: OSStoreState) {
  const actor = resolveAuraActor({ player: state.gameplay.player, identity: state.gameplay.identity, isLoggedIn: state.isLoggedIn });
  return actor.roles.includes('admin') || actor.roles.includes('registrar');
}
type Setter = (update: (state: OSStoreState) => Partial<OSStoreState>) => void;
export function createAcademicActions(set: Setter, get: () => OSStoreState): AcademicActions {
  const read = (): AcademicState => get().gameplay.academics || emptyAcademics();
  const write = (change: (academic: AcademicState) => AcademicState) => set(s => ({ gameplay: { ...s.gameplay, academics: change(s.gameplay.academics || emptyAcademics()) } }));
  let syncing: Promise<void> | null = null;
  const sync = (): Promise<void> => {
    if (syncing) return syncing;
    syncing = (async () => {
      const attempted = new Set<string>();
      while (get().isLoggedIn) {
        const entry = Object.entries(read().pendingSync).find(([citizen, note]) => !attempted.has(`${citizen}:${note}`) && (citizen === academicCitizenId(get()) || canManageAcademics(get())));
        if (!entry) break;
        const [citizen, note] = entry;
        attempted.add(`${citizen}:${note}`);
        try {
          const { syncCyacademyOrCivicUpdate } = await import('../integration/citizenBridge');
          if (!get().isLoggedIn || (citizen !== academicCitizenId(get()) && !canManageAcademics(get()))) break;
          const result = await syncCyacademyOrCivicUpdate(citizen, { academicNote: note });
          if (result.success) write(a => {
            const pendingSync = { ...a.pendingSync };
            if (pendingSync[citizen] === note) delete pendingSync[citizen];
            return { ...a, pendingSync };
          });
        } catch { /* Retain the pending summary for an explicit retry. */ }
      }
    })().finally(() => { syncing = null; });
    return syncing;
  };
  return {
    retryAcademicSync: sync,
    academicAction: async command => {
      let self = academicCitizenId(get());
      if (!get().isLoggedIn || !self) return { ok: false, message: 'Sign in and link a MAID citizen identity before studying.' };
      if (!command || !['enroll', 'withdraw', 'lesson', 'quiz', 'open-project', 'project', 'correct'].includes(command.type)) return { ok: false, message: 'Unknown academic action.' };
      const course = COURSES.find(c => c.id === command.course);
      if (!course) return { ok: false, message: 'Course not found.' };
      let citizen = 'citizen' in command && command.citizen ? command.citizen : self;
      const correction = command.type === 'correct';
      const managing = correction || citizen !== self || ('registrar' in command && command.registrar === true);
      if (!managing && !get().gameplay.identity.canonicalPersonId) {
        const { lookupCitizenAuthoritative } = await import('../integration/citizenBridge');
        const lookup = await lookupCitizenAuthoritative(self);
        if (!lookup.person) return { ok: false, message: 'Link a registered MAID identity through Citizen Hub before enrolling in personal studies.' };
        if (!get().isLoggedIn || academicCitizenId(get()) !== self) return { ok: false, message: 'Citizen session changed. Retry the action.' };
        citizen = self = lookup.person.id;
        set(s => ({ gameplay: { ...s.gameplay, identity: { ...s.gameplay.identity, canonicalPersonId: self } } }));
      }
      if (managing) {
        if (!canManageAcademics(get())) return { ok: false, message: 'Registrar or administrator authority is required.' };
        if (!('reason' in command) || !command.reason?.trim()) return { ok: false, message: 'Enter a reason for the registrar record change.' };
        const { lookupCitizenAuthoritative } = await import('../integration/citizenBridge');
        const lookup = await lookupCitizenAuthoritative(citizen);
        if (!lookup.person) return { ok: false, message: 'Select a valid citizen from the MAID registry.' };
        citizen = lookup.person.id;
        if (!get().isLoggedIn || academicCitizenId(get()) !== self || !canManageAcademics(get())) return { ok: false, message: 'Registrar session changed. Retry the action.' };
      }
      const records = read().records[citizen] || {};
      const before = records[course.id];
      const now = new Date().toISOString();
      let next: AcademicEnrollment = before ? { ...before, lessons: [...before.lessons] } : { status: 'active', enrolledAt: now, lessons: [], bestScore: null, attempts: 0 };
      if (command.type === 'enroll') {
        if (before?.status === 'active') return { ok: false, message: 'Already enrolled in this course.' };
        if (course.prerequisite && !records[course.prerequisite]?.completedAt) return { ok: false, message: 'Pass the introductory course first.' };
        next.status = 'active';
      } else if (correction) {
        if (!Number.isFinite(command.score) || command.score < 0 || command.score > 100 || (command.passed && command.score < 80)) return { ok: false, message: 'Use a score from 0 to 100; a passing correction requires at least 80%.' };
        if (!before) return { ok: false, message: 'Enroll this citizen before correcting the record.' };
        next.bestScore = command.score;
        next.completedAt = command.passed ? before.completedAt || now : undefined;
        next.projectCompletedAt = command.passed ? before.projectCompletedAt || now : undefined;
        next.lessons = command.passed ? [0, 1, 2] : next.lessons;
        // Administrative awards must never trigger a later gameplay reward.
        next.rewardClaimed = before.rewardClaimed || command.passed;
      } else {
        if (!before || before.status !== 'active') return { ok: false, message: 'Enroll in this course first.' };
        if (command.type === 'withdraw') next.status = 'withdrawn';
        if (command.type === 'lesson') {
          if (!Number.isInteger(command.lesson) || !course.lessons[command.lesson]) return { ok: false, message: 'Lesson not found.' };
          if (!next.lessons.includes(command.lesson)) next.lessons.push(command.lesson);
        }
        if (command.type === 'quiz') {
          if (next.lessons.length !== 3) return { ok: false, message: 'Complete all three lessons before the quiz.' };
          if (!Array.isArray(command.answers) || command.answers.length !== 5 || Array.from(command.answers).some((a, i) => !Number.isInteger(a) || a < 0 || a >= course.quiz[i].options.length)) return { ok: false, message: 'Answer all five questions.' };
          const score = course.quiz.filter((q, i) => q.correct === command.answers[i]).length * 20;
          next.bestScore = Math.max(next.bestScore ?? 0, score);
          next.attempts++;
        }
        if (command.type === 'open-project') {
          if (next.lessons.length !== 3) return { ok: false, message: 'Complete the course lessons before beginning the project.' };
          next.projectOpenedAt ||= now;
        }
        if (command.type === 'project') {
          if (course.project.kind === 'compiler') return { ok: false, message: 'Complete a successful compilation in SpellForge after opening this project.' };
          if (!next.projectOpenedAt) return { ok: false, message: 'Open the assigned source in its project workspace first.' };
          if (command.answer !== course.project.question.correct) return { ok: false, message: 'Review the assigned source and revise your response.' };
          next.projectCompletedAt ||= now;
        }
      }
      const passed = next.lessons.length === 3 && (next.bestScore ?? 0) >= 80 && !!next.projectCompletedAt;
      if (!correction && passed) next.completedAt ||= now;
      const reward = !managing && !!next.completedAt && !next.rewardClaimed;
      if (reward) next.rewardClaimed = true;
      const significant = ['enroll', 'withdraw', 'correct'].includes(command.type) || (!!next.completedAt && !before?.completedAt);
      const summaryRecords = { ...records, [course.id]: next };
      const note = academicSummary(summaryRecords).filter(s => s.courses.length).map(s => `${s.school.name}: ${s.credits} credits; certificates: ${s.certificates.join(', ') || 'none'}`).join(' | ');
      write(a => ({ ...a, records: { ...a.records, [citizen]: { ...a.records[citizen], [course.id]: next } },
        audit: managing ? [...a.audit, { id: crypto.randomUUID(), actor: self, citizen, course: course.id, at: now, reason: ('reason' in command ? command.reason : '')!.trim(), before: before || null, after: next }] : a.audit,
        pendingSync: significant ? { ...a.pendingSync, [citizen]: `${note} [${now}]` } : a.pendingSync }));
      if (reward) { get().addXP(100); get().addSkillXP('Research', 25); }
      if (significant) void sync();
      return { ok: true, message: next.completedAt ? `${course.title}: passed · 3 credits${reward ? ' · +100 XP · +25 Research XP' : ''}.` : command.type === 'quiz' ? `Best score: ${next.bestScore}%. Pass mark: 80%.` : 'Academic record saved.' };
    },
  };
}

/** Called only by the successful compiler action, after its resource checks. */
export function recordAcademicCompilation(set: Setter, get: () => OSStoreState) {
  const self = academicCitizenId(get());
  if (!get().isLoggedIn || !self) return;
  const academic: AcademicState = get().gameplay.academics || emptyAcademics();
  const records = { ...academic.records[self] };
  let rewards = 0;
  let changed = false;
  for (const course of COURSES.filter(c => c.project.kind === 'compiler')) {
    const record = records[course.id];
    if (!record || record.status !== 'active' || !record.projectOpenedAt || record.projectCompletedAt) continue;
    const now = new Date().toISOString();
    const next = { ...record, projectCompletedAt: now };
    if (next.lessons.length === 3 && (next.bestScore ?? 0) >= 80) {
      next.completedAt ||= now;
      if (!next.rewardClaimed) { rewards++; next.rewardClaimed = true; }
    }
    records[course.id] = next;
    changed = true;
  }
  if (!changed) return;
  const note = academicSummary(records).filter(s => s.courses.length).map(s => `${s.school.name}: ${s.credits} credits; certificates: ${s.certificates.join(', ') || 'none'}`).join(' | ');
  set(s => ({ gameplay: { ...s.gameplay, academics: { ...academic, records: { ...academic.records, [self]: records }, pendingSync: { ...academic.pendingSync, [self]: `${note} [${new Date().toISOString()}]` } } } }));
  if (rewards) { get().addXP(rewards * 100); get().addSkillXP('Research', rewards * 25); }
  void get().retryAcademicSync();
}
