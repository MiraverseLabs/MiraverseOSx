import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';

registerHooks({resolve(specifier, context, next) {
  try { return next(specifier,context); }
  catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND' || !specifier.startsWith('.')) throw error; return next(`${specifier}.ts`,context); }
}});
const values = new Map();
globalThis.localStorage = { getItem:key=>values.get(key)??null, setItem:(key,value)=>values.set(key,value), removeItem:key=>values.delete(key) };
globalThis.window = { external:{}, localStorage:globalThis.localStorage };
const { useOSStore } = await import('../src/store/useOSStore.ts');
const { useGameStore } = await import('../src/store/useGameStore.ts');
const { WORKNET_ASSIGNMENTS, WORK_DEFINITIONS } = await import('../src/gameplay/ActivityEngine.ts');
const { MissionDirector } = await import('../src/gameplay/MissionDirector.ts');
const { CREATOR_STUDIO_STORAGE_KEY } = await import('../src/integration/worldStateManager.ts');
const initial = useOSStore.getState();
function reset() {
  values.clear();
  useOSStore.setState(initial,true);
  useOSStore.setState(state=>({isLoggedIn:true,gameplay:{...state.gameplay,player:{...state.gameplay.player,xp:0,level:1,credits:1000}}}));
  useGameStore.setState({ missions:[], player:{...useGameStore.getState().player,level:1,xp:0,credits:1000} });
}
test('procedural previews cannot pay rewards, even with completed flags or an IPC-supplied payload',()=>{
  reset();
  const preview = new MissionDirector().generateMission(5);
  preview.status = 'In Progress';
  preview.objectives.forEach(objective=>objective.completed=true);
  useGameStore.getState().handlePhotinoResponse({action:'mission_result',payload:preview});
  const before = useOSStore.getState().gameplay;
  const world = useGameStore.getState().worldState;
  assert.equal(useGameStore.getState().completeMission(preview.id).ok,false);
  assert.equal(useOSStore.getState().gameplay,before);
  assert.equal(useGameStore.getState().worldState,world);
  for (const id of ['MIS-INIT-01','constructor','__proto__','toString']) assert.equal(useGameStore.getState().completeMission(id).ok,false);
});
test('legacy completion requires the canonical work receipts, pays the catalog amount once and respects login and pause',()=>{
  reset();
  const mission = WORKNET_ASSIGNMENTS['qn-02'];
  assert.equal(useGameStore.getState().completeMission(mission.id).ok,false);
  assert.equal(useOSStore.getState().openWorknetOrder(mission.id).ok,true);
  assert.equal(useOSStore.getState().acknowledgeAssignmentBriefing(mission.id).ok,true);
  for (const stage of WORK_DEFINITIONS[mission.id].stages) {
    const answers = Object.fromEntries(stage.fields.map(field=>[field.id,field.kind==='report' ? `Verified work-site observations and report: ${field.contains.join(', ')}` : field.expected]));
    assert.equal(useOSStore.getState().submitWorknetStage(mission.id,stage.id,answers).ok,true);
  }
  // A legacy/native payload must never override the authored compensation.
  useGameStore.getState().handlePhotinoResponse({action:'mission_result',payload:{id:mission.id,rewards:{xp:999999,credits:999999}}});
  const before = useOSStore.getState().gameplay.player;
  useOSStore.setState({isLoggedIn:false});
  assert.equal(useGameStore.getState().completeMission(mission.id).ok,false);
  assert.equal(useOSStore.getState().gameplay.player,before);
  useOSStore.setState({isLoggedIn:true});
  values.set(CREATOR_STUDIO_STORAGE_KEY,JSON.stringify({isPaused:true}));
  assert.equal(useGameStore.getState().completeMission(mission.id).ok,false);
  assert.equal(useOSStore.getState().gameplay.player,before);
  values.delete(CREATOR_STUDIO_STORAGE_KEY);
  assert.equal(useGameStore.getState().completeMission(mission.id).ok,true);
  const after = useOSStore.getState().gameplay.player;
  assert.equal(after.credits-before.credits,mission.rewardCredits);
  assert.equal(after.xp-before.xp,mission.rewardXP);
  assert.equal(useGameStore.getState().player.credits,after.credits);
  assert.equal(useGameStore.getState().completeMission(mission.id).ok,false);
  assert.equal(useOSStore.getState().gameplay.player,after);
});
test('procedural previews scale from canonical progression rather than the stale auxiliary profile',()=>{
  reset();
  useOSStore.setState(state=>({gameplay:{...state.gameplay,player:{...state.gameplay.player,level:12}}}));
  useGameStore.getState().requestMission();
  const preview = useGameStore.getState().missions[0];
  assert.ok(preview.rewards.xp>=1200 && preview.rewards.xp<=2628);
  assert.ok(preview.rewards.credits>=2400 && preview.rewards.credits<=5988);
  for (let index=0;index<8;index++) useGameStore.getState().requestMission();
  assert.equal(useGameStore.getState().missions.length,5);
});
test('missing objectives cannot verify and malformed levels produce finite positive preview rewards',()=>{
  const director = new MissionDirector();
  for (const objectives of [undefined,[],[{}],[{id:'one',completed:1}]]) assert.equal(director.verifyObjectivesComplete({objectives}),false);
  assert.equal(director.verifyObjectivesComplete({objectives:[{id:'one',completed:true}]}),true);
  for (const level of [NaN,Infinity,-1,0,1.5,Number.MAX_SAFE_INTEGER]) {
    const preview = director.generateMission(level);
    assert.ok(Number.isSafeInteger(preview.rewards.xp) && preview.rewards.xp>0);
    assert.ok(Number.isSafeInteger(preview.rewards.credits) && preview.rewards.credits>0);
  }
});
