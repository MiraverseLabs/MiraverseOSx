import type { OSStoreState } from './useOSStore';
import { resolveAuraActor } from '../integration/auraPermissions';
import {
  COURSES,
  DEFAULT_ACADEMIC_TERM,
  INSTITUTIONS,
  academicCitizenId,
  academicSummary,
  degreeProgress,
  emptyAcademics,
  isAdmittedToInstitution,
  type AcademicEnrollment,
  type AcademicState,
  type InstitutionId,
  type InstitutionalAdmission,
} from '../gameplay/Academics';

type Result = { ok: boolean; message: string };

export type AcademicCommand =
  | { type: 'apply'; institution: InstitutionId; programId?: string; statement?: string; citizen?: string; reason?: string; registrar?: boolean }
  | { type: 'declare-program'; institution: InstitutionId; programId: string }
  | { type: 'toggle-club'; institution: InstitutionId; clubId: string }
  | { type: 'enroll' | 'withdraw'; course: string; citizen?: string; reason?: string; registrar?: boolean }
  | { type: 'lesson'; course: string; lesson: number }
  | { type: 'quiz'; course: string; answers: number[] }
  | { type: 'open-project'; course: string }
  | { type: 'project'; course: string; answer: number }
  | { type: 'correct'; course: string; citizen: string; score: number; passed: boolean; reason: string };

export interface AcademicActions {
  academicAction: (command: AcademicCommand) => Promise<Result>;
  retryAcademicSync: () => Promise<void>;
}

export function canManageAcademics(state: OSStoreState) {
  const actor = resolveAuraActor({ player: state.gameplay.player, identity: state.gameplay.identity, isLoggedIn: state.isLoggedIn });
  return actor.roles.includes('admin') || actor.roles.includes('registrar');
}

function normalizeAcademicState(raw?: Partial<AcademicState>): AcademicState {
  const base = emptyAcademics();
  if (!raw || typeof raw !== 'object') return base;
  return {
    records: raw.records || {},
    admissions: raw.admissions || {},
    clubs: raw.clubs || {},
    activeTerm: raw.activeTerm || DEFAULT_ACADEMIC_TERM,
    audit: Array.isArray(raw.audit) ? raw.audit : [],
    pendingSync: raw.pendingSync || {},
  };
}

function makeStudentId(institution: InstitutionId, citizenId: string): string {
  const prefix = institution === 'cyberium' ? 'CYA' : institution === 'dawn' ? 'DWN' : 'RGH';
  let hash = 0;
  for (let i = 0; i < citizenId.length; i++) hash = (hash * 31 + citizenId.charCodeAt(i)) % 9000;
  return `${prefix}-1000-${String(1000 + hash)}`;
}

async function deliverAcademicMail(payload: {
  id: string;
  sender: string;
  senderAddress: string;
  faction: string;
  subject: string;
  body: string;
  seal: string;
  folder?: 'inbox';
}) {
  try {
    const { useCommsStore } = await import('./useCommsStore');
    const deliver = useCommsStore.getState()?.deliverInstitutionalEmail;
    if (typeof deliver !== 'function') return;
    deliver({
      id: payload.id,
      sender: payload.sender,
      senderAddress: payload.senderAddress,
      recipientAddress: 'citizen@auremail.aure',
      faction: payload.faction,
      subject: payload.subject,
      body: payload.body,
      time: 'Just now',
      read: false,
      folder: 'inbox',
      verifiedSender: true,
      attachment: null,
      institutionalSeal: payload.seal,
    });
  } catch {
    // Non-browser unit test environments may not mount useCommsStore.
  }
}

type Setter = (update: (state: OSStoreState) => Partial<OSStoreState>) => void;

export function createAcademicActions(set: Setter, get: () => OSStoreState): AcademicActions {
  const read = (): AcademicState => normalizeAcademicState(get().gameplay.academics);
  const write = (change: (academic: AcademicState) => AcademicState) =>
    set(s => ({ gameplay: { ...s.gameplay, academics: change(normalizeAcademicState(s.gameplay.academics)) } }));

  let syncing: Promise<void> | null = null;
  const sync = (): Promise<void> => {
    if (syncing) return syncing;
    syncing = (async () => {
      const attempted = new Set<string>();
      while (get().isLoggedIn) {
        const entry = Object.entries(read().pendingSync).find(
          ([citizen, note]) => !attempted.has(`${citizen}:${note}`) && (citizen === academicCitizenId(get()) || canManageAcademics(get())),
        );
        if (!entry) break;
        const [citizen, note] = entry;
        attempted.add(`${citizen}:${note}`);
        try {
          const { syncCyacademyOrCivicUpdate } = await import('../integration/citizenBridge');
          if (!get().isLoggedIn || (citizen !== academicCitizenId(get()) && !canManageAcademics(get()))) break;
          const result = await syncCyacademyOrCivicUpdate(citizen, { academicNote: note });
          if (result.success) {
            write(a => {
              const pendingSync = { ...a.pendingSync };
              if (pendingSync[citizen] === note) delete pendingSync[citizen];
              return { ...a, pendingSync };
            });
          }
        } catch {
          /* Retain the pending summary for an explicit retry. */
        }
      }
    })().finally(() => {
      syncing = null;
    });
    return syncing;
  };

  async function resolveCitizenContext(
    command: { citizen?: string; reason?: string; registrar?: boolean },
    isCorrection: boolean,
  ): Promise<{ ok: true; self: string; citizen: string; managing: boolean } | { ok: false; message: string }> {
    let self = academicCitizenId(get());
    if (!get().isLoggedIn || !self) {
      return { ok: false, message: 'Sign in and link a MAID citizen identity before studying.' };
    }
    let citizen = command.citizen ? command.citizen : self;
    const managing = isCorrection || citizen !== self || command.registrar === true;
    if (!managing && !get().gameplay.identity.canonicalPersonId) {
      const { lookupCitizenAuthoritative } = await import('../integration/citizenBridge');
      const lookup = await lookupCitizenAuthoritative(self);
      if (!lookup.person) {
        return { ok: false, message: 'Link a registered MAID identity through Citizen Hub before enrolling in personal studies.' };
      }
      if (!get().isLoggedIn || academicCitizenId(get()) !== self) {
        return { ok: false, message: 'Citizen session changed. Retry the action.' };
      }
      citizen = self = lookup.person.id;
      set(s => ({ gameplay: { ...s.gameplay, identity: { ...s.gameplay.identity, canonicalPersonId: self } } }));
    }
    if (managing) {
      if (!canManageAcademics(get())) return { ok: false, message: 'Registrar or administrator authority is required.' };
      if (!command.reason?.trim()) return { ok: false, message: 'Enter a reason for the registrar record change.' };
      const { lookupCitizenAuthoritative } = await import('../integration/citizenBridge');
      const lookup = await lookupCitizenAuthoritative(citizen);
      if (!lookup.person) return { ok: false, message: 'Select a valid citizen from the MAID registry.' };
      citizen = lookup.person.id;
      if (!get().isLoggedIn || academicCitizenId(get()) !== self || !canManageAcademics(get())) {
        return { ok: false, message: 'Registrar session changed. Retry the action.' };
      }
    }
    return { ok: true, self, citizen, managing };
  }

  return {
    retryAcademicSync: sync,
    academicAction: async command => {
      if (
        !command ||
        !['apply', 'declare-program', 'toggle-club', 'enroll', 'withdraw', 'lesson', 'quiz', 'open-project', 'project', 'correct'].includes(
          command.type,
        )
      ) {
        return { ok: false, message: 'Unknown academic action.' };
      }

      const now = new Date().toISOString();

      // ── Admissions Application ─────────────────────────────────────────────
      if (command.type === 'apply') {
        const school = INSTITUTIONS.find(s => s.id === command.institution);
        if (!school) return { ok: false, message: 'Institution not found.' };
        const ctx = await resolveCitizenContext(command, false);
        if (ctx.ok === false) return ctx;
        const { citizen, managing } = ctx;
        const current = read();
        const existing = current.admissions[citizen]?.[school.id];
        if (existing?.status === 'admitted') {
          return { ok: false, message: `Already admitted to ${school.name} (Student ID: ${existing.studentId}).` };
        }
        const program = school.degrees.find(d => d.id === command.programId) || school.degrees[0];
        const studentId = makeStudentId(school.id, citizen);
        const admission: InstitutionalAdmission = {
          institution: school.id,
          status: 'admitted',
          studentId,
          declaredProgramId: program?.id,
          statement: (command.statement || '').trim().slice(0, 600),
          appliedAt: now,
          admittedAt: now,
        };
        write(a => ({
          ...a,
          admissions: {
            ...a.admissions,
            [citizen]: { ...(a.admissions[citizen] || {}), [school.id]: admission },
          },
        }));

        if (!managing) {
          // Activate organization membership so the school's Comms channel unlocks.
          set(s => ({
            gameplay: {
              ...s.gameplay,
              player: {
                ...s.gameplay.player,
                organizationMemberships: {
                  ...(s.gameplay.player.organizationMemberships || {}),
                  [school.organizationId]: {
                    status: 'active',
                    issuedAt: now,
                    issuedBy: `${school.name} Admissions`,
                    via: 'invitation',
                  },
                },
              },
            },
          }));
          get().addXP(25);
          void deliverAcademicMail({
            id: `ACAD-ADMIT-${school.id}-${citizen}`,
            sender: `${school.name} Admissions Office`,
            senderAddress: school.admissionsEmail,
            faction: school.name,
            subject: `Official Offer of Admission — ${school.name} (${current.activeTerm})`,
            seal: `${school.sealText}-ADMISSIONS-SEAL`,
            body: `Dear Scholar,\n\nCongratulations! Your application to ${school.name} has been approved for the ${current.activeTerm} term.\n\n• Official Student ID: ${studentId}\n• Declared Program: ${program?.title || 'General Studies'}\n• Campus Channel Unlocked: #${school.commsChannelId} (in Comms)\n\nNext steps:\n1. Visit https://${school.domain}/courses to register for your classes.\n2. Open AureLearn (Student LMS) to read course modules, complete assessments, and launch practical labs.\n3. Track your GPA, Student ID, and degree audit anytime in CAMPUS.\n\n"${school.motto}"\n\n— Office of Admissions, ${school.name}`,
          });
        }

        return {
          ok: true,
          message: `Admitted to ${school.name}! Student ID: ${studentId}. Acceptance letter delivered to AureMail and #${school.commsChannelId} unlocked in Comms.`,
        };
      }

      // ── Declare Degree Program ─────────────────────────────────────────────
      if (command.type === 'declare-program') {
        const school = INSTITUTIONS.find(s => s.id === command.institution);
        if (!school) return { ok: false, message: 'Institution not found.' };
        const program = school.degrees.find(d => d.id === command.programId);
        if (!program) return { ok: false, message: 'Degree program not found.' };
        const ctx = await resolveCitizenContext({}, false);
        if (ctx.ok === false) return ctx;
        const { citizen } = ctx;
        const current = read();
        if (!isAdmittedToInstitution(current, citizen, school.id)) {
          return { ok: false, message: `Apply for admission to ${school.name} before declaring a program.` };
        }
        const existing = current.admissions[citizen]?.[school.id] || {
          institution: school.id,
          status: 'admitted' as const,
          studentId: makeStudentId(school.id, citizen),
          appliedAt: now,
          admittedAt: now,
        };
        write(a => ({
          ...a,
          admissions: {
            ...a.admissions,
            [citizen]: { ...(a.admissions[citizen] || {}), [school.id]: { ...existing, declaredProgramId: program.id } },
          },
        }));
        return { ok: true, message: `Declared program updated: ${program.title}.` };
      }

      // ── Campus Club Membership Toggle ──────────────────────────────────────
      if (command.type === 'toggle-club') {
        const school = INSTITUTIONS.find(s => s.id === command.institution);
        if (!school) return { ok: false, message: 'Institution not found.' };
        const club = school.clubs.find(c => c.id === command.clubId);
        if (!club) return { ok: false, message: 'Campus organization not found.' };
        const ctx = await resolveCitizenContext({}, false);
        if (ctx.ok === false) return ctx;
        const { citizen } = ctx;
        const current = read();
        if (!isAdmittedToInstitution(current, citizen, school.id)) {
          return { ok: false, message: `Apply for admission to ${school.name} to join campus societies.` };
        }
        const existing = current.clubs[citizen] || [];
        const joined = existing.includes(club.id);
        const nextClubs = joined ? existing.filter(id => id !== club.id) : [...existing, club.id];
        write(a => ({ ...a, clubs: { ...a.clubs, [citizen]: nextClubs } }));
        return {
          ok: true,
          message: joined ? `Left ${club.name}.` : `Joined ${club.name} (${club.meetingPlace}).`,
        };
      }

      // ── Course-Scoped Academic Actions ─────────────────────────────────────
      const course = COURSES.find(c => c.id === command.course);
      if (!course) return { ok: false, message: 'Course not found.' };
      const school = INSTITUTIONS.find(s => s.id === course.institution)!;
      const correction = command.type === 'correct';
      const ctx = await resolveCitizenContext(
        {
          citizen: 'citizen' in command ? command.citizen : undefined,
          reason: 'reason' in command ? command.reason : undefined,
          registrar: 'registrar' in command ? command.registrar : undefined,
        },
        correction,
      );
      if (ctx.ok === false) return ctx;
      const { self, citizen, managing } = ctx;

      const currentState = read();
      const records = currentState.records[citizen] || {};
      const before = records[course.id];
      let next: AcademicEnrollment = before
        ? { ...before, lessons: [...before.lessons] }
        : { status: 'active', enrolledAt: now, term: currentState.activeTerm, lessons: [], bestScore: null, attempts: 0 };

      if (command.type === 'enroll') {
        if (!managing && !isAdmittedToInstitution(currentState, citizen, course.institution)) {
          return { ok: false, message: `Apply for admission at ${school.name} (${school.domain}/admissions) before enrolling.` };
        }
        if (before?.status === 'active') return { ok: false, message: 'Already enrolled in this course.' };
        if (course.prerequisite && !records[course.prerequisite]?.completedAt) {
          return { ok: false, message: 'Pass the introductory course first.' };
        }
        next.status = 'active';
        next.term = next.term || currentState.activeTerm;
      } else if (correction) {
        if (!Number.isFinite(command.score) || command.score < 0 || command.score > 100 || (command.passed && command.score < 80)) {
          return { ok: false, message: 'Use a score from 0 to 100; a passing correction requires at least 80%.' };
        }
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
          if (
            !Array.isArray(command.answers) ||
            command.answers.length !== 5 ||
            Array.from(command.answers).some((a, i) => !Number.isInteger(a) || a < 0 || a >= course.quiz[i].options.length)
          ) {
            return { ok: false, message: 'Answer all five questions.' };
          }
          const score = course.quiz.filter((q, i) => q.correct === command.answers[i]).length * 20;
          next.bestScore = Math.max(next.bestScore ?? 0, score);
          next.attempts++;
        }
        if (command.type === 'open-project') {
          if (next.lessons.length !== 3) return { ok: false, message: 'Complete the course lessons before beginning the project.' };
          next.projectOpenedAt ||= now;
        }
        if (command.type === 'project') {
          if (course.project.kind === 'compiler') {
            return { ok: false, message: 'Complete a successful compilation in SpellForge after opening this project.' };
          }
          if (!next.projectOpenedAt) return { ok: false, message: 'Open the assigned source in its project workspace first.' };
          if (command.answer !== course.project.question.correct) {
            return { ok: false, message: 'Review the assigned source and revise your response.' };
          }
          next.projectCompletedAt ||= now;
        }
      }

      const passed = next.lessons.length === 3 && (next.bestScore ?? 0) >= 80 && !!next.projectCompletedAt;
      if (!correction && passed) next.completedAt ||= now;
      const reward = !managing && !!next.completedAt && !next.rewardClaimed;
      if (reward) next.rewardClaimed = true;

      const significant = ['enroll', 'withdraw', 'correct'].includes(command.type) || (!!next.completedAt && !before?.completedAt);
      const summaryRecords = { ...records, [course.id]: next };
      const note = academicSummary(summaryRecords)
        .filter(s => s.courses.length)
        .map(s => `${s.school.name}: ${s.credits} credits; certificates: ${s.certificates.join(', ') || 'none'}`)
        .join(' | ');

      write(a => ({
        ...a,
        records: { ...a.records, [citizen]: { ...a.records[citizen], [course.id]: next } },
        audit: managing
          ? [
              ...a.audit,
              {
                id: crypto.randomUUID(),
                actor: self,
                citizen,
                course: course.id,
                at: now,
                reason: ('reason' in command ? command.reason : '')!.trim(),
                before: before || null,
                after: next,
              },
            ]
          : a.audit,
        pendingSync: significant ? { ...a.pendingSync, [citizen]: `${note} [${now}]` } : a.pendingSync,
      }));

      if (reward) {
        get().addXP(100);
        get().addSkillXP('Research', 25);
        const newlyEarnedDegrees = degreeProgress(summaryRecords, school.id)
          .filter(d => d.earned && !degreeProgress(records, school.id).find(prev => prev.degree.id === d.degree.id)?.earned)
          .map(d => d.degree.title);
        if (newlyEarnedDegrees.length) {
          void deliverAcademicMail({
            id: `ACAD-DEG-${school.id}-${course.id}-${citizen}`,
            sender: `${school.name} Office of the Registrar`,
            senderAddress: school.registrarEmail,
            faction: school.name,
            subject: `Credential Conferred: ${newlyEarnedDegrees.join(', ')}`,
            seal: `${school.sealText}-REGISTRAR-SEAL`,
            body: `Congratulations!\n\nFollowing your completion of ${course.code} (${course.title}), ${school.name} has conferred the following academic credential:\n\n• ${newlyEarnedDegrees.join('\n• ')}\n\nYour official transcript in CAMPUS and Document Studio has been updated.\n\n— Office of the Registrar, ${school.name}`,
          });
        }
      }
      if (significant) void sync();

      return {
        ok: true,
        message: next.completedAt
          ? `${course.title}: passed · ${course.credits} credits${reward ? ' · +100 XP · +25 Research XP' : ''}.`
          : command.type === 'quiz'
            ? `Best score: ${next.bestScore}%. Pass mark: 80%.`
            : 'Academic record saved.',
      };
    },
  };
}

/** Called only by the successful compiler action, after its resource checks. */
export function recordAcademicCompilation(set: Setter, get: () => OSStoreState) {
  const self = academicCitizenId(get());
  if (!get().isLoggedIn || !self) return;
  const academic: AcademicState = normalizeAcademicState(get().gameplay.academics);
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
      if (!next.rewardClaimed) {
        rewards++;
        next.rewardClaimed = true;
      }
    }
    records[course.id] = next;
    changed = true;
  }
  if (!changed) return;
  const note = academicSummary(records)
    .filter(s => s.courses.length)
    .map(s => `${s.school.name}: ${s.credits} credits; certificates: ${s.certificates.join(', ') || 'none'}`)
    .join(' | ');
  set(s => ({
    gameplay: {
      ...s.gameplay,
      academics: {
        ...academic,
        records: { ...academic.records, [self]: records },
        pendingSync: { ...academic.pendingSync, [self]: `${note} [${new Date().toISOString()}]` },
      },
    },
  }));
  if (rewards) {
    get().addXP(rewards * 100);
    get().addSkillXP('Research', rewards * 25);
  }
  void get().retryAcademicSync();
}
