import { CAREER_REGISTRY, careerStation, stationCareer } from './CareerRegistry';
import { MISSION_CATALOG, WORKNET_ASSIGNMENTS } from './MissionCatalog';
import { WORK_DEFINITIONS, LINKED_ACTIVITIES } from './ActivityEngine';
import { CAREER_TRACK_SPECS, WORKNET_DOMAIN_TASKS } from './WorldEventEngine';
import { INSTITUTIONAL_REGISTRY, INITIAL_DELEGATION_TASKS, INITIAL_SCHEDULE_ITEMS, INITIAL_SUBORDINATE_LEAVES, CANONICAL_DYNAMIC_EVENTS } from './WorkplaceDefinitions';
import { OPPORTUNITIES, DISPATCH_SCHEDULE } from './AssignmentFlow';
import { DISCOVERY_POINTS, HIDDEN_OPPORTUNITIES } from './ProgressionEngine';

/** Definition graph only. Player orders, contracts, receipts, and NPC progress stay in saved state. */
export const GAMEPLAY_REGISTRY = {
  careers: CAREER_REGISTRY, missions: WORKNET_ASSIGNMENTS, missionList: MISSION_CATALOG,
  procedures: WORK_DEFINITIONS, activities: LINKED_ACTIVITIES, progression: CAREER_TRACK_SPECS,
  institutions: INSTITUTIONAL_REGISTRY, delegation: INITIAL_DELEGATION_TASKS,
  shifts: INITIAL_SCHEDULE_ITEMS, leaves: INITIAL_SUBORDINATE_LEAVES, events: CANONICAL_DYNAMIC_EVENTS,
  opportunities: OPPORTUNITIES, dispatches: DISPATCH_SCHEDULE, discoveries: DISCOVERY_POINTS,
  hiddenOpportunities: HIDDEN_OPPORTUNITIES, domainTasks: WORKNET_DOMAIN_TASKS,
};

/** Used by CI and authoring checks, with actionable paths instead of silently dropping bad references. */
export function validateGameplayRegistry(registry = GAMEPLAY_REGISTRY): string[] {
  const issues: string[] = [];
  const check = (ok: unknown, path: string, message: string) => { if (!ok) issues.push(`${path}: ${message}`); };
  const unique = (ids: string[], path: string) => check(new Set(ids).size === ids.length, path, 'duplicate IDs');
  const reward = (amount: number, path: string) => check(Number.isSafeInteger(amount) && amount >= 0, path, 'expected nonnegative whole amount');
  unique(registry.missionList.map(m => m.id), 'missions');
  for (const [id, career] of Object.entries(registry.careers)) {
    check(id === career.id, `careers.${id}`, 'key differs from ID');
    check(registry.institutions[careerStation(id)], `careers.${id}`, 'unknown institution');
    check(career.relevantSkills.length && career.tierTitles.length === career.xpThresholds.length, `careers.${id}`, 'invalid skills or tiers');
    check(registry.progression[id]?.rankTitles === career.tierTitles, `careers.${id}`, 'progression must use catalog titles');
    for (const missionId of career.qualificationMissionIds) check(registry.missions[missionId]?.track === id, `careers.${id}.qualifications`, `unknown qualification ${missionId}`);
    reward(career.baseSalaryCredits, `careers.${id}.baseSalaryCredits`);
  }
  for (const mission of registry.missionList) {
    const path = `missions.${mission.id}`, procedure = registry.procedures[mission.id];
    check(registry.careers[mission.track], path, 'unknown career');
    check(procedure && procedure.track === mission.track, path, 'missing procedure or mismatched career');
    for (const key of ['rewardCredits', 'rewardBits', 'rewardXP'] as const) reward(mission[key], `${path}.${key}`);
  }
  for (const [id, procedure] of Object.entries(registry.procedures)) {
    check(registry.missions[id] && procedure.id === id, `procedures.${id}`, 'unknown mission or mismatched ID');
    unique(procedure.stages.map(s => s.id), `procedures.${id}.stages`);
    check(procedure.stages.length, `procedures.${id}`, 'no stages');
    for (const stage of procedure.stages) {
      unique(stage.fields.map(f => f.id), `procedures.${id}.${stage.id}.fields`);
      unique(stage.approaches?.map(a => a.id) || [], `procedures.${id}.${stage.id}.approaches`);
      for (const approach of [stage, ...(stage.approaches || [])]) for (const field of approach.fields) {
        if (field.kind === 'select') check(field.options?.includes(field.expected!), `procedures.${id}.${stage.id}.${field.id}`, 'expected choice is missing');
      }
    }
  }
  unique(registry.activities.map(a => a.id), 'activities');
  for (const activity of registry.activities) {
    unique(activity.milestones.map(m => m.id), `activities.${activity.id}.milestones`);
    for (const milestone of activity.milestones) for (const ref of milestone.requirements)
      check(registry.procedures[ref.definitionId]?.stages.some(s => s.id === ref.stageId), `activities.${activity.id}.${milestone.id}`, `unknown stage ${ref.definitionId}:${ref.stageId}`);
    const chapters = activity.chapters || [];
    unique(chapters.map(c => c.id), `activities.${activity.id}.chapters`);
    chapters.forEach((chapter, index) => {
      check(!chapter.after || chapters.slice(0, index).some(c => c.id === chapter.after), `activities.${activity.id}.${chapter.id}`, 'chapter predecessor must exist earlier');
      for (const id of chapter.milestoneIds) check(activity.milestones.some(m => m.id === id), `activities.${activity.id}.${chapter.id}`, `unknown milestone ${id}`);
    });
  }
  const people = Object.values(registry.institutions).flatMap(org => org.coworkers.map(c => c.id));
  unique(people, 'institutions.coworkers');
  for (const org of Object.values(registry.institutions)) {
    check(registry.careers[stationCareer(org.id)], `institutions.${org.id}`, 'unknown career');
    for (const duty of org.routineDuties) {
      reward(duty.rewardCredits, `duties.${duty.id}.credits`); reward(duty.rewardXP, `duties.${duty.id}.xp`);
    }
  }
  for (const task of registry.delegation) {
    check(registry.institutions[task.stationId], `delegation.${task.id}`, 'unknown institution');
    reward(task.rewardCredits, `delegation.${task.id}.credits`); reward(task.rewardMerit, `delegation.${task.id}.merit`);
  }
  for (const shift of registry.shifts) check(registry.missions[shift.assignmentId]?.track === stationCareer(shift.institutionId), `shifts.${shift.id}`, 'unknown assignment or different institution');
  for (const leave of registry.leaves) check(registry.institutions[leave.stationId]?.coworkers.some(c => c.id === leave.subordinateId), `leaves.${leave.id}`, 'unknown colleague');
  for (const event of registry.events) {
    check(registry.institutions[event.stationId], `events.${event.id}`, 'unknown institution');
    reward(event.rewardCredits, `events.${event.id}.credits`); reward(event.rewardXP, `events.${event.id}.xp`);
  }
  const opportunityIds = new Set(registry.opportunities.map(o => o.id));
  for (const item of [...registry.dispatches, ...registry.discoveries.filter(d => d.opportunityId).map(d => ({ id: d.opportunityId! })), ...Object.keys(registry.hiddenOpportunities).map(id => ({ id }))])
    check(opportunityIds.has(item.id), `opportunities.${item.id}`, 'unknown dispatch or discovery target');
  for (const task of Object.values(registry.domainTasks)) check(registry.missions[task.missionId]?.track === task.track, `domainTasks.${task.missionId}`, 'unknown mission or mismatched career');
  return issues;
}
