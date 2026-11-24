import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({ resolve(s,c,next) { try { return next(s,c); } catch(e) { if(e.code !== 'ERR_MODULE_NOT_FOUND' || !s.startsWith('.')) throw e; return next(`${s}.ts`,c); } } });
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k,v) => memory.set(k,String(v)), removeItem: k => memory.delete(k) };
const { glasslineRelease, restoreWorldPublications } = await import('../src/gameplay/WorldPublications.ts');
const { releaseAcceptedWork, processPublicReactions } = await import('../src/gameplay/WorldPublicationFlow.ts');
const { buildNewsEdition } = await import('../src/apps/Browser/news/newsModel.ts');
const { newsSearchRecords } = await import('../src/apps/Browser/news/newsSite.ts');
const { initialSocial } = await import('../src/apps/social/socialModel.ts');
const { WORKNET_ASSIGNMENTS } = await import('../src/gameplay/ActivityEngine.ts');
const story = glasslineRelease('WORK:ms-shift-04:28',112,28);
const publications = {version:1, stories:[story], reactionReceipts:{}};
const game = () => ({timeCycleCount:28,timeSegmentIndex:1,worldPublications:structuredClone(publications),player:{maiSpaceWorld:initialSocial({acceptedFriends:['jeremie']})}});

test('public snapshot restore is idempotent, rejects malformed sources and drops unrelated private fields', () => {
  const raw = {...publications, stories:[{...story,privateEvidence:'SECRET'},story,{...story,id:'fake'},null]};
  const restored = restoreWorldPublications(raw);
  assert.equal(restored.stories.length,1);
  assert.ok(!JSON.stringify(restored).includes('SECRET'));
  assert.deepEqual(restoreWorldPublications(JSON.parse(JSON.stringify(restored))),restored);
  assert.deepEqual(restoreWorldPublications(null),{version:1,stories:[],reactionReceipts:{}});
});

test('news and public search use the same approved snapshot, never internal narrative summaries', () => {
  const input = {cycle:28,publications,worldEventLog:[{title:'SECRET',summary:'PRIVATE MEDICAL EVIDENCE'}]};
  const article = buildNewsEdition(input).find(a=>a.id===story.id);
  assert.equal(article.summary,story.summary);
  assert.equal(newsSearchRecords(input).find(a=>a.id===`news:${story.id}`).summary,story.summary);
  assert.ok(!JSON.stringify(buildNewsEdition(input)).includes('SECRET'));
  assert.ok(!buildNewsEdition({cycle:27,publications}).some(a=>a.id===story.id));
});

test('known eligible contact reacts deterministically once with no economy changes', () => {
  const input=game();
  const result=processPublicReactions(input);
  const receipt=result.worldPublications.reactionReceipts[story.id];
  assert.equal(receipt.status,'delivered');
  assert.equal(receipt.actorId,'char-jeremie-belpois');
  assert.deepEqual(result,processPublicReactions(game()));
  assert.equal(result.player.maiSpaceWorld.posts.filter(p=>p.id.startsWith('reaction:')).length,1);
  assert.equal(input.player.maiSpaceWorld.posts.filter(p=>p.id.startsWith('reaction:')).length,0);
  assert.equal(processPublicReactions(result),result);
  assert.equal(processPublicReactions(JSON.parse(JSON.stringify(result))).player.maiSpaceWorld.posts.filter(p=>p.id.startsWith('reaction:')).length,1);
});

test('private, blocked, muted, unavailable and absent contacts never acquire invented public reactions', () => {
  for(const mode of ['blocked','muted','absent','night','commitment']) {
    const input=game();
    if(mode==='blocked'||mode==='muted') input.player.maiSpaceWorld[mode].push('jeremie');
    if(mode==='absent') input.player.maiSpaceWorld.friends=[];
    if(mode==='night') input.timeSegmentIndex=3;
    if(mode==='commitment') input.player.worknetWorkplace={delegatedTasks:[{assigneeId:'char-jeremie-belpois',status:'In Progress'}]};
    const result=processPublicReactions(input);
    assert.equal(result.worldPublications.reactionReceipts[story.id].status,'skipped',mode);
    assert.ok(!result.player.maiSpaceWorld.posts.some(p=>p.id.startsWith('reaction:')),mode);
    assert.equal(processPublicReactions(result),result);
  }
  const sameTick={...game(),timeSegmentIndex:0};
  assert.equal(processPublicReactions(sameTick),sameTick);
  const privateOnly={...game(),worldPublications:undefined,worldEventLog:[{visibility:'private',summary:'SECRET'}]};
  assert.equal(processPublicReactions(privateOnly),privateOnly);
});

const repairWork = [
  ['preflight', { site: 'Terminal Junction 12', kit: 'Oscilloscope, flasher and soldering kit' }],
  ['inspect', { node: 'C4', loss: '18' }],
  ['diagnose', { test: 'Voltage across C4', drop: '4.2', component: 'C4' }],
  ['repair', { power: 'Isolated and locked out', part: '470 µF capacitor at C4', bus: 'Reconnected after replacement' }],
  ['verify', { firmware: 'Bus Telemetry v2.4', voltage: '5', loss: '0' }],
  ['report', { report: 'GL-12A: isolated power, replaced C4 with 470 µF capacitor, restored v2.4 firmware. Final output 5 V, packet loss 0%.' }],
];
test('real acceptance saves release and pay together; reload, paused play and repeated completion cannot duplicate either', async () => {
  memory.clear();
  const {useOSStore:store}=await import('../src/store/useOSStore.ts?publications=first');
  store.setState(s=>({isLoggedIn:true,gameplay:{...s.gameplay,timeSegmentIndex:0,player:{...s.gameplay.player,stamina:100,clearanceLevel:5,maiSpaceWorld:initialSocial({acceptedFriends:['jeremie']})}}}));
  assert.equal(store.getState().acceptEmployment('engineer').ok,true);
  assert.equal(store.getState().openWorknetOrder('ms-shift-04').ok,true);
  assert.equal(store.getState().acknowledgeAssignmentBriefing('ms-shift-04').ok,true);
  assert.equal(store.getState().completeWorknetMission(WORKNET_ASSIGNMENTS['ms-shift-04']).ok,false);
  assert.equal(store.getState().gameplay.worldPublications.stories.length,0);
  for(const [stage,values] of repairWork) assert.equal(store.getState().submitWorknetStage('ms-shift-04',stage,values).ok,true,stage);
  memory.set('miraverse-creator-studio-state-v1',JSON.stringify({isPaused:true}));
  assert.equal(store.getState().completeWorknetMission(WORKNET_ASSIGNMENTS['ms-shift-04']).ok,false);
  assert.equal(store.getState().gameplay.worldPublications.stories.length,0);
  memory.delete('miraverse-creator-studio-state-v1');
  const credits=store.getState().gameplay.player.credits;
  const observed=[];
  const stop=store.subscribe(s=>{if(s.gameplay.worldPublications.stories.length) observed.push({accepted:s.gameplay.player.worknetOrders['ms-shift-04'].status,paid:s.gameplay.player.compensationReceiptIds.length});});
  assert.equal(store.getState().completeWorknetMission(WORKNET_ASSIGNMENTS['ms-shift-04']).ok,true);
  stop();
  const accepted=store.getState().gameplay;
  assert.equal(accepted.worldPublications.stories.length,1);
  assert.ok(observed.every(v=>v.accepted==='accepted'&&v.paid>0));
  assert.equal(accepted.player.credits,credits+WORKNET_ASSIGNMENTS['ms-shift-04'].rewardCredits);
  assert.equal(releaseAcceptedWork(accepted,accepted.player.worknetOrders['ms-shift-04']),accepted);
  assert.equal(store.getState().completeWorknetMission(WORKNET_ASSIGNMENTS['ms-shift-04']).ok,false);
  const {useOSStore:reloaded}=await import('../src/store/useOSStore.ts?publications=reload');
  assert.deepEqual(reloaded.getState().gameplay.worldPublications,accepted.worldPublications);
  assert.equal(reloaded.getState().gameplay.player.credits,accepted.player.credits);
  assert.ok(!reloaded.getState().gameplay.player.maiSpaceWorld.posts.some(p=>p.id.startsWith('reaction:')));
  memory.set('miraverse-creator-studio-state-v1',JSON.stringify({isPaused:true}));
  reloaded.getState().advanceTime();
  assert.equal(reloaded.getState().gameplay.timeSegmentIndex,0);
  memory.delete('miraverse-creator-studio-state-v1');
  reloaded.getState().advanceTime();
  assert.equal(reloaded.getState().gameplay.player.maiSpaceWorld.posts.filter(p=>p.id.startsWith('reaction:')).length,1);
  assert.equal(reloaded.getState().gameplay.player.credits,accepted.player.credits);
  // A new cycle needs its own fresh work; copied earlier outputs cannot publish it.
  reloaded.setState(s=>({gameplay:{...s.gameplay,timeCycleCount:29,player:{...s.gameplay.player,stamina:100}}}));
  assert.equal(reloaded.getState().openWorknetOrder('ms-shift-04').ok,true);
  assert.equal(reloaded.getState().completeWorknetMission(WORKNET_ASSIGNMENTS['ms-shift-04']).ok,false);
  assert.equal(reloaded.getState().acknowledgeAssignmentBriefing('ms-shift-04').ok,true);
  for(const [stage,values] of repairWork) assert.equal(reloaded.getState().submitWorknetStage('ms-shift-04',stage,values).ok,true);
  assert.equal(reloaded.getState().completeWorknetMission(WORKNET_ASSIGNMENTS['ms-shift-04']).ok,true);
  const stories=reloaded.getState().gameplay.worldPublications.stories;
  assert.equal(stories.length,2);
  assert.notEqual(stories[0].sourceRef.id,stories[1].sourceRef.id);
  assert.equal(stories[1].cycle,28);

});
