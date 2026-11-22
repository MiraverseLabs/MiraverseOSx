import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const bridge = 'data:text/javascript,' + encodeURIComponent(`
export async function lookupCitizenAuthoritative(id) { return { person: ['self','other','MAID-SELF'].includes(id) ? { id: id === 'MAID-SELF' ? 'self' : id, maid: 'MAID-' + id } : null }; }
export async function syncCyacademyOrCivicUpdate() { return { success: true }; }
`);
registerHooks({ resolve(specifier, context, next) {
  if (specifier === '../integration/citizenBridge') return { url: bridge, shortCircuit: true };
  try { return next(specifier, context); } catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND' || !specifier.startsWith('.')) throw error; return next(`${specifier}.ts`, context); }
} });

const { COURSES, academicSummary, calculateGpa, degreeProgress, emptyAcademics, isAdmittedToInstitution } = await import('../src/gameplay/Academics.ts');
const { createAcademicActions, recordAcademicCompilation } = await import('../src/store/academicActions.ts');
const { mergeSavedProgress } = await import('../src/store/osPersistence.ts');
const { externalWebUrl } = await import('../src/apps/Browser/externalWeb.ts');
const { IN_GAME_PORTALS, browserTitle, resolveBrowserInput } = await import('../src/apps/Browser/browserModel.ts');
const { parseEduUrl, eduUrl } = await import('../src/apps/Browser/edu/eduRouter.ts');
const { channelAccess } = await import('../src/integration/communicationsAccess.ts');

function fixture(admin = false) {
  let state = { isLoggedIn: true, gameplay: { academics: emptyAcademics(), identity: { canonicalPersonId: 'self' }, player: { isAdmin: admin, xp: 0, research: 0, organizationMemberships: {} } } };
  const set = update => { state = { ...state, ...update(state) }; };
  const get = () => state;
  Object.assign(state, { addXP: n => state.gameplay.player.xp += n, addSkillXP: (_, n) => state.gameplay.player.research += n }, createAcademicActions(set, get));
  const run = command => get().academicAction(command);
  return { get, set, run, compile: () => recordAcademicCompilation(set, get), record: id => get().gameplay.academics.records.self?.[id] };
}

async function prepare(f, course) {
  if (!isAdmittedToInstitution(f.get().gameplay.academics, 'self', course.institution)) {
    assert.equal((await f.run({ type: 'apply', institution: course.institution })).ok, true);
  }
  assert.equal((await f.run({ type: 'enroll', course: course.id })).ok, true);
  for (let lesson = 0; lesson < 3; lesson++) await f.run({ type: 'lesson', course: course.id, lesson });
}
const answers = c => c.quiz.map(q => q.correct);

test('all three schools are internal Versenet websites with route-aware titles and URL routing', () => {
  for (const [domain, name, id] of [
    ['cyberium.edu', 'Cyberium Academy', 'cyberium'],
    ['dawn.edu', 'Dawn University', 'dawn'],
    ['regenthall.edu', 'Regent Hall', 'regent'],
  ]) {
    assert.equal(externalWebUrl(`https://${domain}`), null);
    assert.equal(resolveBrowserInput(domain), `https://${domain}`);
    assert.equal(browserTitle(`https://${domain}`), name);
    assert.equal(browserTitle(`https://${domain}/admissions`), `Admissions · ${name}`);
    assert.equal(browserTitle(eduUrl(id, 'campus-life')), `Campus Life · ${name}`);
    assert.deepEqual(parseEduUrl(`https://${domain}/faculty`), { institution: id, section: 'faculty', valid: true });
    assert.ok(IN_GAME_PORTALS.find(p => p.domain === domain && p.name === name));
  }
  assert.equal(browserTitle('https://cyacademy.edu'), 'Cyberium Academy');
});

test('eighteen courses across three schools have valid prerequisites, lessons, assessments, and unique project identities', () => {
  assert.equal(COURSES.length, 18);
  assert.equal(new Set(COURSES.map(c => c.project.id)).size, 18);
  assert.equal(new Set(COURSES.map(c => c.code)).size, 18);
  for (const c of COURSES) {
    assert.equal(c.lessons.length, 3); assert.equal(c.quiz.length, 5);
    assert.ok(c.quiz.every(q => q.correct >= 0 && q.correct < q.options.length));
    if (c.prerequisite) assert.equal(COURSES.find(p => p.id === c.prerequisite).institution, c.institution);
  }
});

test('admissions gates enrollment, issues Student IDs, unlocks Comms channels, and supports club memberships', async () => {
  const f = fixture();
  assert.equal(channelAccess(f.get().gameplay.player, 'regent-hall-commons'), false);
  assert.equal((await f.run({ type: 'enroll', course: 'empress-track-1' })).ok, false);
  const admit = await f.run({ type: 'apply', institution: 'regent', programId: 'deg-rgh-empress', statement: 'Pursuing the Empress Track across all eight realms.' });
  assert.equal(admit.ok, true);
  assert.ok(f.get().gameplay.academics.admissions.self.regent.studentId.startsWith('RGH-1000-'));
  assert.equal(channelAccess(f.get().gameplay.player, 'regent-hall-commons'), true);
  assert.equal((await f.run({ type: 'toggle-club', institution: 'regent', clubId: 'club-rgh-empress' })).ok, true);
  assert.deepEqual(f.get().gameplay.academics.clubs.self, ['club-rgh-empress']);
  assert.equal((await f.run({ type: 'enroll', course: 'empress-track-1' })).ok, true);
});

test('dual enrollment is free after admission; lessons and prerequisite gates are enforced', async () => {
  const f = fixture();
  await f.run({ type: 'apply', institution: 'cyberium' });
  await f.run({ type: 'apply', institution: 'dawn' });
  assert.equal((await f.run({ type: 'enroll', course: 'signals-2' })).ok, false);
  for (const course of ['signals-1', 'natural-sciences-1']) assert.equal((await f.run({ type: 'enroll', course })).ok, true);
  assert.equal((await f.run({ type: 'quiz', course: 'signals-1', answers: [0,0,0,0,0] })).ok, false);
  assert.equal((await f.run({ type: 'lesson', course: 'signals-1', lesson: 99 })).ok, false);
  assert.equal(f.get().gameplay.player.xp, 50); // +25 per admission
});

test('archive projects need opened sources and correct responses; retries preserve the best grade and reward once', async () => {
  const f = fixture(), c = COURSES.find(c => c.id === 'natural-sciences-1');
  await prepare(f, c);
  assert.equal((await f.run({ type: 'project', course: c.id, answer: c.project.question.correct })).ok, false);
  await f.run({ type: 'open-project', course: c.id });
  assert.equal((await f.run({ type: 'project', course: c.id, answer: -1 })).ok, false);
  await f.run({ type: 'quiz', course: c.id, answers: answers(c) });
  assert.equal(f.record(c.id).completedAt, undefined);
  await f.run({ type: 'project', course: c.id, answer: c.project.question.correct });
  assert.ok(f.record(c.id).completedAt);
  await f.run({ type: 'quiz', course: c.id, answers: c.quiz.map(q => (q.correct + 1) % q.options.length) });
  await f.run({ type: 'project', course: c.id, answer: c.project.question.correct });
  assert.equal(f.record(c.id).bestScore, 100);
  assert.equal(calculateGpa(f.get().gameplay.academics.records.self, 'dawn'), 4.0);
  assert.equal(f.get().gameplay.player.xp, 125); // 25 admission + 100 course completion
  assert.equal(f.get().gameplay.player.research, 25);
  assert.equal((await f.run({ type: 'enroll', course: 'natural-sciences-2' })).ok, true);
});

test('compiler evidence only comes from a successful compilation after opening the project', async () => {
  const f = fixture(), c = COURSES.find(c => c.id === 'spell-engineering-1');
  await prepare(f, c); f.compile();
  assert.equal(f.record(c.id).projectCompletedAt, undefined);
  await f.run({ type: 'open-project', course: c.id });
  assert.equal((await f.run({ type: 'project', course: c.id, answer: c.project.question.correct })).ok, false);
  f.compile(); assert.ok(f.record(c.id).projectCompletedAt);
  await f.run({ type: 'quiz', course: c.id, answers: answers(c) }); f.compile();
  assert.equal(f.get().gameplay.player.xp, 125); // 25 admission + 100 course completion
});

test('students cannot mutate other citizens; registrar changes retain audit values and award no rewards', async () => {
  const f = fixture();
  assert.equal((await f.run({ type: 'enroll', course: 'signals-1', citizen: 'other', reason: 'test' })).ok, false);
  f.get().gameplay.player.isAdmin = true;
  assert.equal((await f.run({ type: 'enroll', course: 'signals-1', citizen: 'other' })).ok, false);
  assert.equal((await f.run({ type: 'enroll', course: 'signals-1', citizen: 'missing', reason: 'Verified request' })).ok, false);
  await f.run({ type: 'enroll', course: 'signals-1', citizen: 'other', reason: 'Verified request' });
  assert.equal((await f.run({ type: 'correct', course: 'signals-1', citizen: 'other', score: 70, passed: true, reason: 'Review' })).ok, false);
  await f.run({ type: 'correct', course: 'signals-1', citizen: 'other', score: 90, passed: true, reason: 'Verified external assessment' });
  const a = f.get().gameplay.academics;
  assert.equal(a.audit.length, 2); assert.equal(a.audit[1].before.bestScore, null); assert.equal(a.audit[1].after.bestScore, 90);
  assert.equal(a.records.self, undefined); assert.ok(a.records.other['signals-1'].completedAt);
  assert.equal(f.get().gameplay.player.xp, 0);
});

test('withdrawal, logout, malformed answers, and unknown commands cannot complete coursework', async () => {
  const f = fixture(), c = COURSES[0]; await prepare(f, c);
  assert.equal((await f.run({ type: 'quiz', course: c.id, answers: Array(5) })).ok, false);
  assert.equal((await f.run({ type: 'invent', course: c.id })).ok, false);
  await f.run({ type: 'withdraw', course: c.id });
  assert.equal((await f.run({ type: 'open-project', course: c.id })).ok, false);
  f.get().isLoggedIn = false;
  assert.equal((await f.run({ type: 'enroll', course: c.id })).ok, false);
});

test('track certificates & degrees require completed courses; old saves initialize cleanly and retain legacy admission', async () => {
  const f = fixture();
  for (const c of COURSES.filter(c => c.track === 'Natural Sciences')) {
    await prepare(f, c); await f.run({ type: 'quiz', course: c.id, answers: answers(c) });
    await f.run({ type: 'open-project', course: c.id }); await f.run({ type: 'project', course: c.id, answer: c.project.question.correct });
  }
  const summary = academicSummary(f.get().gameplay.academics.records.self);
  assert.equal(summary[1].credits, 6);
  assert.deepEqual(summary[1].certificates, ['Natural Sciences']);
  assert.equal(summary[1].gpa, 4.0);
  assert.equal(summary[1].standing, "Dean's List");
  assert.equal(degreeProgress(f.get().gameplay.academics.records.self, 'dawn')[0].earned, true);
  assert.equal(summary[0].credits, 0);
  assert.deepEqual(mergeSavedProgress({ academics: emptyAcademics() }, {}).academics.records, {});
  const restored = mergeSavedProgress({ academics: emptyAcademics() }, JSON.parse(JSON.stringify(f.get().gameplay)));
  assert.equal(restored.academics.records.self['natural-sciences-2'].bestScore, 100);
  // Legacy save without admissions object still counts as admitted if records exist
  const legacyOnly = { ...emptyAcademics(), records: { self: { 'signals-1': { status: 'active', enrolledAt: '2026-01-01', lessons: [], bestScore: null, attempts: 0 } } } };
  assert.equal(isAdmittedToInstitution(legacyOnly, 'self', 'cyberium'), true);
});
