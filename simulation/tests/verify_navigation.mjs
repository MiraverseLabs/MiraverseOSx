import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {performance} from 'node:perf_hooks';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const require=createRequire(process.env.MIRAVERSE_FRONTEND_PACKAGE || fileURLToPath(new URL('../../frontend/package.json',import.meta.url)));
const {chromium}=require('@playwright/test');
const out=fileURLToPath(new URL('../output/',import.meta.url));
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1500,height:1050}});
page.setDefaultTimeout(10000);
const logs=[],timings=[];
page.on('console',m=>{if(['error','warning'].includes(m.type()))logs.push({type:m.type(),text:m.text()});});
page.on('pageerror',e=>logs.push({type:'pageerror',text:e.stack}));
async function timed(label,action,ready){const start=performance.now();await action();await ready();await page.evaluate(()=>new Promise(requestAnimationFrame));timings.push({action:label,ms:Math.round(performance.now()-start)});console.log('PASS',label,timings.at(-1).ms+'ms');}
async function nav(name){await timed(name,()=>page.locator('.obs-nav-btn').filter({hasText:name}).click(),()=>page.locator('h1.obs-page-title').filter({hasText:name}).waitFor());}
const heading=()=>page.locator('h2.obs-inspector-name');
try{
 await page.goto(process.env.OBSERVATORY_URL||'http://127.0.0.1:8768/',{waitUntil:'domcontentloaded',timeout:60000});
 await page.locator('.obs-nav-btn').first().waitFor({timeout:60000});
 for(let round=0;round<2;round++)for(const name of ['Citizen Registry','Data Integrity','Population Editor','Living World Engine','World Overview'])await nav(name);
 await nav('Citizen Registry');
 assert.equal(await page.locator('.obs-dir-item').count(),12);
 for(let n=0;n<2;n++){await page.getByRole('button',{name:/Next/}).click();await page.getByText(`Page ${n+2} of 6`,{exact:true}).waitFor();}
 const row=page.locator('.obs-dir-item').nth(5),name=await row.locator('.obs-dir-name').innerText();
 await timed('Registry deep-page Inspect',()=>row.getByRole('button',{name:'Inspect',exact:true}).click(),()=>heading().filter({hasText:name}).waitFor());
 await timed('Registry to Editor',()=>page.getByRole('button',{name:'Edit in Population Editor',exact:true}).click(),()=>page.locator('.obs-editor-column h2.obs-inspector-name').filter({hasText:name}).waitFor());
 await page.getByText('Page 3 of 6',{exact:true}).waitFor();
 assert.equal(await page.getByLabel('Display Name',{exact:true}).inputValue(),name);
 for(const section of ['Careers & Roles','Personality & Relationships','Daily Life & Entertainment','Simulation Settings','Review & Commit','Identity & Geography']){
  await page.locator('.obs-editor-tabs').getByRole('button',{name:new RegExp(section.replace('&','&'))}).click();
  await page.evaluate(()=>new Promise(requestAnimationFrame));
 }
 await timed('Editor to Registry',()=>page.getByRole('button',{name:/View in Registry/}).click(),()=>page.locator('.obs-inspector-column h2.obs-inspector-name').filter({hasText:name}).waitFor());
 await page.getByText('Page 3 of 6',{exact:true}).waitFor();
 await page.getByRole('textbox').first().fill('NO_MATCH_FOR_NAVIGATION_TEST');
 await page.getByRole('textbox').first().press('Enter');
 await page.getByRole('textbox').first().blur();
 await page.getByText(/No citizens match/).waitFor();
 await page.getByRole('textbox').first().fill('');
 await page.getByRole('textbox').first().press('Enter');
 await page.getByRole('textbox').first().blur();
 await page.getByText('Page 3 of 6',{exact:true}).waitFor();
 await nav('Data Integrity');
 await page.getByRole('button',{name:/Next/}).click();
 await page.getByText(/^Page 2 of \d+ \(/).waitFor();
 const conflict=page.locator('.obs-conflict-card').nth(2),conflictName=await conflict.locator('.obs-conflict-name').innerText();
 await timed('Integrity deep-page Inspect',()=>conflict.getByRole('button',{name:'Inspect',exact:true}).click(),()=>heading().filter({hasText:conflictName}).waitFor());
 await nav('Data Integrity');
 const first=page.locator('.obs-conflict-card').first(),editName=await first.locator('.obs-conflict-name').innerText();
 await timed('Integrity to Editor',()=>first.getByRole('button',{name:'Edit Profile',exact:true}).click(),()=>heading().filter({hasText:editName}).waitFor());
 await nav('World Overview');
 await page.screenshot({path:out+'navigation-verified.png'});
 const unexpected=logs.filter(l=>l.type==='pageerror'||l.type==='error'||(!l.text.includes('Feature flags __VUE_')&&!l.text.includes('[Vuetify UPGRADE]')));
 assert.deepEqual(unexpected,[],'Unexpected browser/Vue reconciliation error');
 const report={timings,unexpectedErrors:unexpected,frameworkWarnings:logs.length,profileCommits:0};
 await writeFile(out+'navigation-report.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));
}catch(error){console.log((await page.locator('body').innerText({timeout:1000})).slice(0,4000));console.log(logs);throw error;}
finally{await browser.close();}
