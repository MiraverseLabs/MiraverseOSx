import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const out=fileURLToPath(new URL('../../output/previews/',import.meta.url));
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1500,height:1100},reducedMotion:'reduce'});
await context.route('**/api/**',r=>r.fulfill({status:503,contentType:'application/json',body:'{}'}));
await context.route('https://**',r=>r.abort());
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console', m=>{if(m.type()==='error' && !m.text().includes('Failed to load resource')) console.log('BROWSER CONSOLE:',m.text());});
try {
 await page.goto('http://127.0.0.1:4178/',{waitUntil:'domcontentloaded'});
 await page.waitForTimeout(1000);
 await page.evaluate(async()=>{
  const {useOSStore:s}=await import('/src/store/useOSStore.ts');
  s.getState().loginUser({name:'Media Browser QA'});
  s.setState(v=>({gameplay:{...v.gameplay,timeCycleCount:28,timeSegmentIndex:0,mediaStudio:{version:1,lastEditorialCycle:28,editorialReceipts:[],feedbackReceipts:[],portfolioCycles:[]},
   worldEventLog:[{id:'PUBLIC:test-relay',cycle:28,visibility:'public',category:'worknet',publicSummary:'The relay repair was accepted after verification.',summary:'SECRET PRIVATE PROCEDURE',title:'SECRET PRIVATE TITLE'}],
   player:{...v.gameplay.player,isAdmin:false,credits:500,employmentContracts:{press:{id:'EMP:press',track:'press'}}}}}));
  s.getState().openAppWorkspace('creativeStudio');
 });
 await page.getByRole('button',{name:'Template Composer',exact:true}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Admin Canon Console'}).count(),0);
 await page.getByLabel('Distribution Channel').selectOption('newspaper');
 await page.getByLabel('Verification Tier').selectOption('verified_reporting');
 await page.getByLabel('Headline',{exact:true}).fill('Glassline service update for residents');
 await page.getByLabel('Released public source').selectOption('PUBLIC:test-relay');
 let scoped=false;
 await page.route('**/api/ai/chat',r=>{
  const data=r.request().postDataJSON();
  scoped=data.activeApp==='media-editor'&&!JSON.stringify(data).includes('SECRET')&&data.contextScope==='public:PUBLIC:test-relay';
  return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({provider:'test',text:'The verified relay repair has been accepted.'})});
 });
 await page.getByRole('button',{name:'Suggest a deck from this public source (optional AI)'}).click();
 await page.getByRole('button',{name:'Use suggestion in draft'}).click();
 assert.equal(scoped,true);
 await page.getByRole('button',{name:'Publish to NEWSPAPER',exact:true}).click();
 await page.getByRole('status').filter({hasText:'Published'}).waitFor();
 await page.getByRole('button',{name:'Publish to NEWSPAPER',exact:true}).click();
 await page.getByRole('status').filter({hasText:'already published'}).waitFor();
 const published=await page.evaluate(async()=>{const{useOSStore:s}=await import('/src/store/useOSStore.ts');return{credits:s.getState().gameplay.player.credits,count:s.getState().gameplay.publishedMediaArtifacts.length};});
 assert.deepEqual(published,{credits:500,count:1});
 await mkdir(out,{recursive:true});
 await page.screenshot({path:out+'creative-studio-composer.png'});
 await page.evaluate(async()=>{const{useOSStore:s}=await import('/src/store/useOSStore.ts');for(let n=0;n<4;n++)s.getState().advanceTime();});
 await page.getByRole('button',{name:'Dynamic Media Desk',exact:true}).click();
 await page.getByRole('strong').filter({hasText:'Under Radiance and Echo'}).waitFor();
 assert.ok(!(await page.locator('body').innerText()).includes('SECRET'));
 await page.screenshot({path:out+'dynamic-media-desk.png'});
 const edition=await page.evaluate(async()=>{const{useOSStore:s}=await import('/src/store/useOSStore.ts');const a=s.getState().gameplay.publishedMediaArtifacts.find(a=>a.id.startsWith('EDITORIAL:PUBLIC'));s.getState().setBrowserUrl('https://meridian.mer/article/'+encodeURIComponent(a.id));s.getState().openAppWorkspace('browser');return a.slotValues.headline;});
 await page.locator('.pulse-reader').getByRole('heading',{name:edition,exact:true}).waitFor();
 await page.getByRole('button',{name:'Cite as Press Lead'}).click();
 const lead=await page.evaluate(async()=>{const{useOSStore:s}=await import('/src/store/useOSStore.ts');return Object.values(s.getState().gameplay.player.assignmentJournal.citations).flat().at(-1);});
 assert.equal(lead.certified,false);assert.ok(lead.recordId.startsWith('EDITORIAL:'));
 await page.screenshot({path:out+'dynamic-meridian-report.png'});
 await page.evaluate(async()=>{const{useOSStore:s}=await import('/src/store/useOSStore.ts');s.setState(v=>({gameplay:{...v.gameplay,player:{...v.gameplay.player,isAdmin:true}}}));s.getState().openAppWorkspace('creativeStudio');});
 await page.getByRole('button',{name:'Template Composer',exact:true}).click();
 await page.getByRole('button',{name:'Stage in Admin Canon Drafts'}).click();
 await page.getByRole('button',{name:'Admin Canon Console',exact:true}).click();
 await page.getByRole('button',{name:'Capture Pre-Publish Checkpoint'}).click();
 await page.getByRole('status').filter({hasText:'checkpoint'}).waitFor();
 await page.getByRole('button',{name:'Validate & Publish Canon'}).click();
 await page.getByRole('status').filter({hasText:'Published'}).waitFor();
 await page.screenshot({path:out+'creative-studio-admin-console.png'});
 await page.reload({waitUntil:'domcontentloaded'});
 const final=await page.evaluate(async()=>{const{useOSStore:s}=await import('/src/store/useOSStore.ts');const g=s.getState().gameplay;return{credits:g.player.credits,artifacts:g.publishedMediaArtifacts.length,decisions:g.mediaStudio.editorialReceipts.length,canon:g.publishedMediaArtifacts.filter(a=>a.verificationTier==='canon_official').length};});
 assert.equal(final.credits,500);assert.equal(final.canon,1);assert.equal(final.artifacts,4);assert.equal(final.decisions,2);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({playerPublishing:true,duplicateSafe:true,publicOnlyAi:true,dynamicEditions:true,adminCheckpoint:true,reload:final,browserErrors:errors},null,2));
} catch(e) {console.log((await page.locator('body').innerText()).slice(-12000));console.log(errors);await mkdir(out,{recursive:true});await page.screenshot({path:out+'media-studio-failure.png'});throw e;}
finally{await context.close();await browser.close();}
