import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({ resolve(s,c,next) {try{return next(s,c);}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND'||!s.startsWith('.'))throw e;return next(`${s}.ts`,c);}} });
const mem=new Map();
globalThis.localStorage={getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)};
const {publishCreativeWork,advanceDynamicMedia,restoreMediaStudio,publicEditorialSources}=await import('../src/gameplay/MediaStudio.ts');
const {initialSocial,restoreSocial}=await import('../src/apps/social/socialModel.ts');
const {newsSearchRecords}=await import('../src/apps/Browser/news/newsSite.ts');
const {validateMediaArtifactInput}=await import('../src/components/media/templateModel.ts');
const {uploadRuntimeMediaToBackend}=await import('../src/game-content/worldAssetLibrary.ts');
const {WORKNET_ASSIGNMENTS}=await import('../src/gameplay/ActivityEngine.ts');
const {saveCreatorDraft,publishCreatorDraft,restoreWorldCheckpoint,getPublishedHistory}=await import('../src/integration/worldStateManager.ts');
function game(){return {timeCycleCount:28,timeSegmentIndex:1,mediaStudio:restoreMediaStudio(null),
  worldEventLog:[{id:'public-relay',cycle:28,category:'worknet',visibility:'public',publicSummary:'The relay repair has been accepted.',title:'SECRET title',summary:'SECRET clinical or procedure details',institution:'SECRET personnel'},
    {id:'private',cycle:28,category:'civic',summary:'SECRET sealed findings'},
    {id:'clinical',cycle:28,category:'medical',visibility:'public',publicSummary:'SECRET chart'},
    {id:'forensic',cycle:28,category:'forensic',visibility:'public',publicSummary:'SECRET sealed case'},
    {id:'identified',cycle:28,category:'civic',visibility:'public',citizenMaid:'PRIVATE-ID',publicSummary:'SECRET identified record'}],
  player:{name:'Test Correspondent',credits:500,bits:10,employmentContracts:{press:{id:'EMP:press'},artist:{id:'EMP:artist'}},maiSpaceWorld:initialSocial({acceptedFriends:['jeremie']}),npcVectors:{jeremie:{trust:50,friendship:50}},reputation:{press:50}}};}
function composition(overrides={}){return {templateId:'tpl-news-article',brandKitId:'the-meridian',channel:'newspaper',verificationTier:'verified_reporting',sourceEventId:'public-relay',entityRefs:['char-jeremie-belpois'],
  slotValues:{kicker:'Local Editions',headline:'A verified relay repair',subhead:'A completed service order was accepted.',body:'The report refers only to the released acceptance summary.',byline:'Spoofed identity'},...overrides};}

test('public editorial selector never copies internal titles, summaries, charts, dockets or personnel',()=>{
  const sources=publicEditorialSources(game());
  assert.equal(sources.length,1);
  assert.equal(sources[0].summary,'The relay repair has been accepted.');
  assert.ok(!JSON.stringify(sources).includes('SECRET'));
});
test('publication is permission checked, source checked, idempotent, and cannot mint credits or duplicate portfolio/reputation',()=>{
  const original=game(),snapshot=JSON.stringify(original);
  assert.equal(publishCreativeWork(original,composition(),false).ok,false);
  assert.equal(publishCreativeWork({...original,player:{...original.player,employmentContracts:{}}},composition(),true).ok,false);
  assert.equal(publishCreativeWork(original,composition({verificationTier:'canon_official'}),true).ok,false);
  assert.equal(publishCreativeWork(original,composition({sourceEventId:'private'}),true).ok,false);
  assert.equal(publishCreativeWork(original,composition({templateId:'tpl-social-text-announcement'}),true).ok,false);
  const first=publishCreativeWork(original,composition(),true);
  assert.equal(first.ok,true);
  assert.equal(first.artifact.authorName,'Test Correspondent');
  assert.equal(first.artifact.slotValues.byline,'Test Correspondent');
  assert.equal(first.gameplay.player.credits,500);
  assert.equal(first.gameplay.player.npcVectors.jeremie.trust,51);
  assert.equal(first.gameplay.player.reputation.press,51);
  assert.equal(JSON.stringify(original),snapshot);
  assert.equal(publishCreativeWork(first.gameplay,composition(),true).gameplay,undefined);
  const changed=publishCreativeWork(first.gameplay,composition({slotValues:{...composition().slotValues,headline:'Another account of the same relay'}}),true);
  assert.equal(changed.gameplay.player.npcVectors.jeremie.trust,51);
  assert.equal(changed.gameplay.player.reputation.press,51);
  assert.equal(changed.gameplay.player.creativePortfolioIds.length,1);
  assert.equal(changed.gameplay.player.mediaMemories.length,1);
  const opinion=publishCreativeWork(original,composition({verificationTier:'opinion',sourceEventId:undefined}),true);
  assert.equal(opinion.gameplay.player.npcVectors.jeremie.trust,50);
  const search=newsSearchRecords({cycle:28,publishedArtifacts:[opinion.artifact]});
  assert.ok(search.some(s=>s.id===`news:${opinion.artifact.id}`));
});
test('paid promotion spends only its explicit budget once and preserves insufficient balances',()=>{
  const input=composition({templateId:'tpl-social-product-ad',channel:'social',verificationTier:'promo',adSpend:25});
  const first=publishCreativeWork(game(),input,true);
  assert.equal(first.ok,true);
  assert.equal(first.gameplay.player.credits,475);
  assert.equal(publishCreativeWork(first.gameplay,input,true).gameplay,undefined);
  for(const adSpend of [-1,NaN,51,1.5]) assert.equal(publishCreativeWork(game(),{...input,adSpend},true).ok,false);
  const poor=game();poor.player.credits=2;
  assert.equal(publishCreativeWork(poor,input,true).ok,false);
  assert.equal(poor.player.credits,2);
});
test('editorial simulation uses bounded deterministic cycle decisions, persists channel copies and does not replay after reload',()=>{
  const input=game(); input.timeCycleCount=29;
  const before=JSON.stringify(input),first=advanceDynamicMedia(input);
  assert.equal(first.publishedMediaArtifacts.length,2);
  assert.deepEqual(first,advanceDynamicMedia(structuredClone(input)));
  assert.ok(!JSON.stringify(first.publishedMediaArtifacts).includes('SECRET'));
  assert.equal(first.player.credits,input.player.credits);
  assert.equal(JSON.stringify(input),before);
  assert.equal(advanceDynamicMedia(first),first);
  const reloaded=JSON.parse(JSON.stringify(first));
  assert.equal(advanceDynamicMedia(reloaded),reloaded);
  reloaded.timeCycleCount=100;
  const jump=advanceDynamicMedia(reloaded);
  assert.equal(jump.publishedMediaArtifacts.length,3,'a long gap produces one current column, not offline catch-up');
  const muted=game();muted.timeCycleCount=29;muted.player.maiSpaceWorld.muted.push('acct:themeridian');
  const mutedResult=advanceDynamicMedia(muted);
  assert.equal(mutedResult.player.maiSpaceWorld.templatePosts.length,muted.player.maiSpaceWorld.templatePosts.length);
  assert.equal(restoreSocial(first.player.maiSpaceWorld).templatePosts.filter(a=>a.id.startsWith('EDITORIAL:')).length,2);
});
test('malformed template posts and media receipts restore without losing the personal profile',()=>{
  const s=initialSocial(); const normalized=restoreSocial(s).layout;
  for(const value of [null,{},42,{templateId:'tpl-social-carousel',slotValues:{headline:42,slides:[null]}}]) assert.equal(validateMediaArtifactInput(value).ok,false);
  const restored=restoreSocial({...s,templatePosts:[null,{},42]});
  assert.deepEqual(restored.layout,normalized);
  assert.deepEqual(restored.templatePosts,[]);
  assert.equal(validateMediaArtifactInput(composition({tokenOverrides:{accentPrimary:'red; background:url(https://foreign.invalid)'}})).ok,false);
  assert.deepEqual(restoreMediaStudio(restoreMediaStudio({editorialReceipts:['one','one',null]},28),28),restoreMediaStudio({editorialReceipts:['one']},28));
});
test('private manuscripts do not become NPC memories and rejected uploads are not presented as saved images',async()=>{
  const doc=publishCreativeWork(game(),composition({channel:'document',templateId:'tpl-doc-press-release',verificationTier:'personal_perspective'}),true);
  assert.equal(doc.ok,true);
  assert.equal(doc.gameplay.player.mediaMemories,undefined);
  assert.equal(Object.values(doc.gameplay.player.fylo.files)[0].type,'doc');
  const input={name:'proof.png',mimeType:'image/png',dataBase64:'AAAA',slotRole:'media.studio',creator:'Test',scope:'player_work'};
  const rejected=await uploadRuntimeMediaToBackend(input,async()=>({ok:false,status:400}));
  assert.equal(rejected.ok,false);
  const offline=await uploadRuntimeMediaToBackend(input,async()=>{throw new Error('offline');});
  assert.equal(offline.ok,true);
  assert.equal(offline.persisted,false);
});
test('store commits publication, ad spend and ORYN entry once; pauses, reloads and certified media-lead forgery are safe',async()=>{
  mem.clear();
  const {useOSStore:s}=await import('../src/store/useOSStore.ts?media=first');
  s.setState(v=>({isLoggedIn:true,gameplay:{...v.gameplay,...game()}}));
  mem.set('miraverse-creator-studio-state-v1',JSON.stringify({isPaused:true}));
  assert.equal(s.getState().publishCreativeArtifact(composition()).ok,false);
  mem.delete('miraverse-creator-studio-state-v1');
  const promo=composition({templateId:'tpl-social-product-ad',channel:'social',verificationTier:'promo',adSpend:25});
  assert.equal(s.getState().socialAction({type:'publish-template-post',artifact:promo}).ok,true);
  assert.equal(s.getState().gameplay.player.credits,475);
  assert.equal(s.getState().gameplay.player.banking.entries.at(-1).credits,-25);
  assert.equal(s.getState().publishCreativeArtifact(promo).ok,true);
  assert.equal(s.getState().gameplay.player.banking.entries.length,1);
  const citation=s.getState().citeInstitutionalEvidence({missionId:'ms-case-002',sourceSystem:'meridian-press-lead',recordId:'public-relay',title:'Public lead',referenceCode:'MER1',custodian:'The Meridian',citationText:'Public reporting',excerpt:'A relay was repaired.',certified:true});
  assert.equal(citation.ok,true);
  assert.equal(citation.citation.certified,false);
  const {useOSStore:r}=await import('../src/store/useOSStore.ts?media=reload');
  assert.equal(r.getState().gameplay.player.credits,475);
  assert.equal(r.getState().publishCreativeArtifact(promo).gameplay,undefined);
  r.getState().advanceTime();r.getState().advanceTime();r.getState().advanceTime();
  const count=r.getState().gameplay.publishedMediaArtifacts.length;
  assert.ok(count>1,'new cycle publishes with Creative Studio and VerseNet closed');
  await r.persist.rehydrate();
  assert.equal(r.getState().gameplay.publishedMediaArtifacts.length,count);
});
test('press shift and freelance commission pay through verified work orders once and survive reload',async()=>{
  mem.clear(); const {useOSStore:s}=await import('../src/store/useOSStore.ts?media=employment');
  s.setState(v=>({gameplay:{...v.gameplay,player:{...v.gameplay.player,stamina:100,clearanceLevel:5}}}));
  assert.equal(s.getState().acceptEmployment('press').ok,true);
  const payBefore=s.getState().gameplay.player.credits;
  for(const [id,stages] of [['ms-press-01',[
    ['factcheck',{capital:'Elmore',lineage:'House Valmon'}],['standards',{policy:'Publish verified public facts; exclude sealed cases and private charts'}],
    ['file',{report:'MER-DESK-801: public Eight Realms attributions verified. Elmore is the capital of Ve’Raylia; House Valmon is its ruling lineage.'}]]],
    ['qn-04',[['palette',{colors:'Old Burgundy #48293D & Pearl Gold #C6AE73'}],['venue',{streetNumber:'7'}]]]]){
    assert.equal(s.getState().openWorknetOrder(id).ok,true,id);
    assert.equal(s.getState().acknowledgeAssignmentBriefing(id).ok,true);
    for(const [stage,values] of stages)assert.equal(s.getState().submitWorknetStage(id,stage,values).ok,true,stage);
    assert.equal(s.getState().completeWorknetMission(WORKNET_ASSIGNMENTS[id]).ok,true);
    assert.equal(s.getState().completeWorknetMission(WORKNET_ASSIGNMENTS[id]).ok,false);
  }
  assert.equal(s.getState().gameplay.player.credits,payBefore+215+135);
  const {useOSStore:r}=await import('../src/store/useOSStore.ts?media=employment-reload');
  assert.equal(r.getState().gameplay.player.employmentContracts.press.id,s.getState().gameplay.player.employmentContracts.press.id);
  assert.equal(r.getState().gameplay.player.credits,s.getState().gameplay.player.credits);
  assert.ok(r.getState().gameplay.player.careers.press.xp>0);
});
test('admin publication requires valid copy, checkpoints before publishing, seals history and preserves canon on restore',async()=>{
  mem.clear();mem.set('miraverse-os-progress',JSON.stringify({state:{gameplay:game()}}));
  const actor={isLoggedIn:true,isAdmin:true,name:'World Administrator'};
  const bad=saveCreatorDraft({title:'Invalid media',summary:'Not a valid template',category:'publication_article',payload:{mediaArtifact:{}}},actor);
  assert.equal(publishCreatorDraft(bad.draft.id,actor).ok,false);
  const staged=saveCreatorDraft({title:'Public acceptance bulletin',summary:'The relay repair has been accepted.',category:'publication_article',payload:{mediaArtifact:composition()}},actor);
  const published=publishCreatorDraft(staged.draft.id,actor);
  assert.equal(published.ok,true);
  assert.equal(publishCreatorDraft(staged.draft.id,actor).ok,false);
  assert.equal(getPublishedHistory().length,1);
  const after=JSON.parse(mem.get('miraverse-os-progress')).state.gameplay;
  assert.equal(after.publishedMediaArtifacts[0].verificationTier,'canon_official');
  const restored=await restoreWorldCheckpoint(published.checkpoint.id,actor);
  assert.equal(restored.ok,true);
  assert.equal(JSON.parse(mem.get('miraverse-os-progress')).state.gameplay.publishedMediaArtifacts[0].verificationTier,'canon_official');
});
test('a publication-history storage failure rolls back the public artifact and leaves the draft unsealed',()=>{
  mem.clear();
  const os=JSON.stringify({state:{gameplay:game()}});mem.set('miraverse-os-progress',os);
  const actor={isLoggedIn:true,isAdmin:true,name:'World Administrator'};
  const draft=saveCreatorDraft({title:'Rollback proof',summary:'A released public statement.',category:'publication_article',payload:{mediaArtifact:composition()}},actor);
  const storage=globalThis.localStorage;
  globalThis.localStorage={...storage,setItem:(k,v)=>{if(k==='miraverse-creator-studio-state-v1'&&JSON.parse(v).publishedHistory.length)throw new Error('storage full');storage.setItem(k,v);}};
  try {assert.equal(publishCreatorDraft(draft.draft.id,actor).ok,false);assert.equal(mem.get('miraverse-os-progress'),os);assert.equal(getPublishedHistory().length,0);}
  finally{globalThis.localStorage=storage;}
});
