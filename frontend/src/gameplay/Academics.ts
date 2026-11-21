export type InstitutionId = 'cyberium' | 'dawn';
export type ProjectKind = 'compiler' | 'engineering' | 'archive' | 'civic';
export interface AcademicInstitution { id: InstitutionId; name: string; domain: string; motto: string; description: string; campus: string; faculty: string[] }
export const INSTITUTIONS: AcademicInstitution[] = [
  { id: 'cyberium', name: 'Cyberium Academy', domain: 'cyberium.edu', motto: 'Understand the system. Shape what comes next.', description: 'Aureline’s academy of cybernetics, signal systems, and computational spellcraft. Formerly Cyacademy, Cyberium carries its laboratory traditions into a new academic era.', campus: 'The Academic Quadrangle connects Compiler Lab 4, the Signal Observatory, and Vector residential halls.', faculty: ['Headmistress Vael · Institutional Leadership', 'Dean Cassian Rook · Cybernetics & Orientation', 'Prof. Archmage Hex · Algorithmic Spellcraft', 'Dr. Franz Hopper · Virtual Dimensions', 'Jeremie Belpois · Signal Engineering', 'Aelita Hopper · Code Weaving', 'Ulrich Stern & Odd Della Robia · Field Testing'] },
  { id: 'dawn', name: 'Dawn University', domain: 'dawn.edu', motto: 'Knowledge in service of a shared tomorrow.', description: 'An open collegiate community studying Meridion’s civic life, living environments, and arcane traditions through careful inquiry and public service.', campus: 'Dawn Court brings together the Concord Reading Hall, Aether Conservatory, and School of Arcane Humanities in Aureline.', faculty: ['Chancellor Ilyana Sol · Civic Scholarship', 'Dr. Ren Alden · Natural Sciences', 'Prof. Safiya Lorne · Arcane Humanities', 'Lecturer Tomas Wren · Public Policy'] },
];
interface Concept { title: string; text: string; question: string; answer: string; wrong: string[] }
interface Track { id: string; school: InstitutionId; name: string; titles: [string, string]; project: ProjectKind; concepts: Concept[] }
const concept = (title: string, text: string, question: string, answer: string, ...wrong: string[]): Concept => ({ title, text, question, answer, wrong });
export const ACADEMIC_TRACKS: Track[] = [
  { id: 'cybernetics', school: 'cyberium', name: 'Cybernetics', titles: ['Cybernetic Foundations', 'Integrated Cybernetic Systems'], project: 'engineering', concepts: [
    concept('Feedback', 'A feedback loop compares a measured output with a target and adjusts the next input. A sensor reading is evidence, not permission to increase power without a limit.', 'What guides a feedback controller?', 'The difference between measured output and target', 'The operator’s rank', 'Maximum available power'),
    concept('Calibration', 'Compare a sensor with a known reference before trusting its measurements. Record the offset and repeat the check after maintenance.', 'How do you check a sensor?', 'Compare it with a known reference', 'Assume a new sensor is accurate', 'Disable its warnings'),
    concept('Safe shutdown', 'An independent interlock brings an unstable device to a safe state. Keep it available even when the main controller fails.', 'What protects against controller failure?', 'An independent safety interlock', 'A brighter status light', 'Removing the power limit'),
    concept('Coupled loops', 'Two controllers sharing an actuator can amplify each other’s corrections. Test the combined system under load before increasing gain.', 'What should be tested before increasing gain?', 'The combined system under load', 'Only the idle display', 'The housing color'),
    concept('Fault isolation', 'Compare independent sensors to locate disagreement. Isolate the faulty component rather than replacing the entire measurement with a guess.', 'How should conflicting readings be handled?', 'Compare independent sensors and isolate the fault', 'Average every alarm away', 'Trust the newest reading automatically'),
    concept('Recovery', 'Resume from a known safe checkpoint after verifying sensors and interlocks. Preserve a fault log so later engineers can reproduce the failure.', 'What is needed before restart?', 'Verified safeguards and a known safe checkpoint', 'A cleared fault log', 'An increased output limit'),
  ] },
  { id: 'spell-engineering', school: 'cyberium', name: 'Spell Engineering', titles: ['Spell Engineering', 'Advanced Protocol Design'], project: 'compiler', concepts: [
    concept('Module contracts', 'Spell modules declare inputs, outputs, and costs. Compatible contracts let a compiler connect modules without relying on their names alone.', 'What establishes module compatibility?', 'Declared input and output contracts', 'Matching colors', 'Identical names'),
    concept('Simulation', 'Test a protocol in a bounded simulation before casting. Examine its effect and resource demand, not only whether compilation succeeds.', 'Where should a new protocol be tested?', 'In a bounded simulation', 'On the public relay first', 'On an unconsenting citizen'),
    concept('Resource budget', 'Compilation draws on stamina and casting can strain aura. Stop when resources are insufficient and use housing recovery before another attempt.', 'What should happen when stamina is insufficient?', 'Recover before compiling again', 'Ignore the resource limit', 'Repeatedly force the cast'),
    concept('Composition', 'A valid pair of modules may still have an unsafe combined effect. Define a target effect and review the composed protocol against it.', 'What should composed protocols be reviewed against?', 'A defined target effect', 'Their longest name', 'Only their purchase price'),
    concept('Containment', 'Limit a protocol’s scope and provide a termination path. Containment keeps a local test from spreading across the civic mesh.', 'What limits an unexpected effect?', 'Bounded scope and a termination path', 'Removing the simulation boundary', 'Broadcasting to more nodes'),
    concept('Reproducibility', 'Record the module pair and observed result. A reproducible protocol can be inspected and tested by another spellwright.', 'What makes a protocol reproducible?', 'Its module pair and observed result', 'Its author’s popularity', 'A secret undocumented change'),
  ] },
  { id: 'signals', school: 'cyberium', name: 'Signal Systems', titles: ['Signal Systems', 'Applied Decryption'], project: 'engineering', concepts: [
    concept('Signal and noise', 'A received message includes both information and noise. Compare repeated samples before treating an isolated spike as an instruction.', 'How should an isolated spike be checked?', 'Compare repeated samples', 'Treat it as an instruction immediately', 'Erase the entire message'),
    concept('Integrity', 'An integrity check reveals whether a payload changed in transit. It does not by itself establish who sent it.', 'What does an integrity check establish?', 'Whether a payload changed', 'The sender’s legal authority', 'The reader’s clearance'),
    concept('Routing', 'A route describes how a message reaches its destination. Verify the destination and avoid sending restricted payloads through untrusted relays.', 'What should be checked before routing a restricted payload?', 'The destination and relay trust', 'Only message length', 'The relay’s visual theme'),
    concept('Authorization', 'Decryption capability does not grant permission to access a message. Confirm scope and authorization before inspecting protected traffic.', 'What is required before decrypting protected traffic?', 'Authorization for the inspection scope', 'Only possession of a tool', 'A faster workstation'),
    concept('Key handling', 'Keep decryption keys separate from public logs. A report can document the process without publishing secrets.', 'Where should keys be kept?', 'Outside public logs', 'In the public report title', 'Inside a shared screenshot'),
    concept('Evidence', 'Preserve the original payload and record each transformation. This lets reviewers distinguish the captured message from the analyst’s interpretation.', 'What should an analyst preserve?', 'The original payload and transformation log', 'Only the final interpretation', 'Only a cropped display'),
  ] },
  { id: 'civic-history', school: 'dawn', name: 'Civic Studies & History', titles: ['Civic Studies & History', 'Applied Public Policy'], project: 'civic', concepts: [
    concept('Primary sources', 'A charter or contemporary record provides evidence from its own period. Its author and purpose still shape what it can tell us.', 'What should accompany a primary source?', 'Its author, context, and purpose', 'An assumption of perfect neutrality', 'A modern rumor'),
    concept('Chronology', 'Place events in order before claiming one caused another. Sequence can support a hypothesis but does not prove causation.', 'Does sequence alone prove causation?', 'No; other evidence is needed', 'Always', 'Only for official records'),
    concept('Public institutions', 'Civic institutions exercise defined responsibilities. A policy proposal should identify the institution responsible for carrying it out.', 'What must a practical policy identify?', 'The responsible institution', 'Only a slogan', 'The author’s favorite realm'),
    concept('Policy evidence', 'Compare the needs of affected citizens using documented evidence. A vivid anecdote can raise a question without representing the whole population.', 'What supports a population-level decision?', 'Documented evidence from affected groups', 'One vivid anecdote alone', 'The loudest speaker'),
    concept('Tradeoffs', 'A policy allocates limited resources. State costs and benefits, including who receives each, rather than promising an outcome without a budget.', 'What should a policy disclose?', 'Costs, benefits, and their distribution', 'Only its best possible outcome', 'Only its title'),
    concept('Evaluation', 'Choose an observable measure before implementation. Review results and revise a policy when the evidence does not support its intended effect.', 'How should policy effectiveness be assessed?', 'With a predefined observable measure', 'With the author’s confidence', 'By never revisiting the decision'),
  ] },
  { id: 'natural-sciences', school: 'dawn', name: 'Natural Sciences', titles: ['Natural Sciences', 'Aether Ecology'], project: 'archive', concepts: [
    concept('Observation', 'Separate what an instrument measures from the explanation you propose. Record conditions and units alongside every observation.', 'What belongs with a measurement?', 'Conditions and units', 'Only an interpretation', 'A guaranteed explanation'),
    concept('Controls', 'A control provides a comparison for the factor being tested. Change one factor where possible so competing explanations remain visible.', 'Why use a control?', 'To compare the tested factor', 'To guarantee the desired result', 'To hide unexpected data'),
    concept('Replication', 'Repeat measurements and report variation. A single result may reflect chance or an unrecognized condition.', 'What increases confidence in a result?', 'Repeated measurements with reported variation', 'Selecting only the largest reading', 'Discarding every disagreement'),
    concept('Aether gradients', 'Compare readings at multiple distances from an aether source. A gradient describes a pattern; it does not establish the source of every observed change.', 'What describes an aether gradient?', 'Readings compared across distance', 'A single unlabeled sample', 'A citizen’s rank'),
    concept('Ecosystem effects', 'Aether exposure can affect connected organisms differently. Compare several indicators rather than assuming one species represents an entire habitat.', 'What supports an ecosystem assessment?', 'Several biological and environmental indicators', 'Only one favored species', 'Only the brightest glow'),
    concept('Stewardship', 'Minimize disturbance during sampling and retain enough context for future comparisons. Research should not destroy the habitat it aims to understand.', 'What is responsible sampling?', 'Minimal disturbance with recorded context', 'Collecting every organism', 'Changing all conditions before measuring'),
  ] },
  { id: 'arcane-humanities', school: 'dawn', name: 'Arcane Humanities', titles: ['Arcane Humanities', 'Comparative Arcane Traditions'], project: 'archive', concepts: [
    concept('Situated knowledge', 'Arcane practices carry the histories of their communities. Describe who practices a tradition and how practitioners explain its purpose.', 'Whose account helps explain a tradition?', 'Its practitioners’ contextual accounts', 'Only an outsider’s label', 'An anonymous stereotype'),
    concept('Interpretation', 'Distinguish a source’s words from your interpretation. Several readings can be plausible, but each should be supported by evidence.', 'What supports an interpretation?', 'Evidence with a clear distinction from quotation', 'The absence of a source', 'Repeating a claim more often'),
    concept('Consent', 'Sacred or restricted knowledge is not automatically public research material. Respect the permissions and limits set by its custodians.', 'What governs use of restricted tradition records?', 'Custodian permission and stated limits', 'Curiosity alone', 'The researcher’s speed'),
    concept('Comparison', 'Compare traditions using explicit questions rather than ranking communities by a single standard. Similar forms may carry different meanings.', 'How should traditions be compared?', 'With explicit contextual questions', 'By assuming similar forms mean the same thing', 'By ranking all communities identically'),
    concept('Translation', 'Document terms whose meanings do not map cleanly across traditions. Keep the original context visible instead of hiding uncertainty.', 'What should a careful translation preserve?', 'Context and acknowledged uncertainty', 'A false claim of exact equivalence', 'Only the shortest wording'),
    concept('Reciprocity', 'Share research findings in an accessible form with participating communities. Invite correction and credit knowledge holders.', 'What supports reciprocal research?', 'Accessible findings, correction, and credit', 'Removing contributors’ names', 'Withholding all results'),
  ] },
];
export interface AcademicQuestion { prompt: string; options: string[]; correct: number }
export interface AcademicCourse { id: string; institution: InstitutionId; track: string; title: string; prerequisite?: string; lessons: { title: string; text: string }[]; quiz: AcademicQuestion[]; project: { id: string; kind: ProjectKind; title: string; source: string; passage: string; question: AcademicQuestion } }
export const COURSES: AcademicCourse[] = ACADEMIC_TRACKS.flatMap(track => track.titles.map((title, level) => {
  const concepts = track.concepts.slice(level * 3, level * 3 + 3);
  const id = `${track.id}-${level + 1}`;
  const projectConcept = concepts[2];
  const question = (c: Concept, index: number): AcademicQuestion => {
    const options = [c.answer, ...c.wrong];
    const correct = index % options.length;
    options.splice(correct, 0, options.shift()!);
    return { prompt: c.question, options, correct };
  };
  return { id, institution: track.school, track: track.name, title, prerequisite: level ? `${track.id}-1` : undefined,
    lessons: concepts.map(c => ({ title: c.title, text: c.text })),
    quiz: [...concepts.map(question), { prompt: 'Which record supports a defensible academic result?', options: ['An undocumented conclusion', 'Evidence and a reproducible method', 'A claim based only on seniority'], correct: 1 }, { prompt: 'What should happen when evidence conflicts with your hypothesis?', options: ['Discard the conflicting evidence', 'Declare success anyway', 'Review the hypothesis and preserve the evidence'], correct: 2 }],
    project: { id: `project:${id}`, kind: track.project, title: `${title}: applied review`, source: `${track.school === 'dawn' ? 'Concord Reading Hall' : 'Compiler Lab 4'} / ${id.toUpperCase()} field note`, passage: `${projectConcept.text} ${concepts[0].text}`, question: question(projectConcept, level + 1) },
  };
}));
export interface AcademicEnrollment { status: 'active' | 'withdrawn'; enrolledAt: string; lessons: number[]; bestScore: number | null; attempts: number; projectOpenedAt?: string; projectCompletedAt?: string; completedAt?: string; rewardClaimed?: boolean }
export interface AcademicAudit { id: string; actor: string; citizen: string; course: string; at: string; reason: string; before: AcademicEnrollment | null; after: AcademicEnrollment }
export interface AcademicState { records: Record<string, Record<string, AcademicEnrollment>>; audit: AcademicAudit[]; pendingSync: Record<string, string> }
export const emptyAcademics = (): AcademicState => ({ records: {}, audit: [], pendingSync: {} });
export const academicCitizenId = (state: any): string | null => state.gameplay.identity?.canonicalPersonId || state.gameplay.identity?.citizenId || null;
export const coursePassed = (record?: AcademicEnrollment) => !!record?.completedAt;
export const gradeLabel = (score: number | null) => score === null ? '—' : score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
export function academicSummary(records: Record<string, AcademicEnrollment> = {}) {
  return INSTITUTIONS.map(school => {
    const courses = COURSES.filter(c => c.institution === school.id && records[c.id]);
    const passed = courses.filter(c => coursePassed(records[c.id]));
    const certificates = ACADEMIC_TRACKS.filter(t => t.school === school.id && COURSES.filter(c => c.track === t.name).every(c => coursePassed(records[c.id]))).map(t => t.name);
    return { school, courses, credits: passed.length * 3, certificates };
  });
}
