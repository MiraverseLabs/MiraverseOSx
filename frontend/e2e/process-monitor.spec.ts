import {test,expect,type Page} from '@playwright/test';
import {mkdir,readFile} from 'node:fs/promises';
const incident='PM-PRISM-001';
async function login(page:Page) {
 await page.route('**/api/**',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}));
 await page.route(/^https:\/\//,route=>route.abort());
 await page.goto('/');await page.getByRole('button',{name:'Sign In / Login Boot',exact:true}).click();
 await page.getByPlaceholder('e.g. CY-9021-PLAYER or admin').fill('admin');
 await page.getByRole('button',{name:'START LOGIN BOOT',exact:true}).click();await expect(page.getByRole('button',{name:'Open Orbit',exact:true})).toBeVisible();
 await page.evaluate(async()=>{const {useOSStore}=await import('/src/store/useOSStore.ts' as string);const s=useOSStore.getState();useOSStore.setState({gameplay:{...s.gameplay,prismCorruptionLevel:10,player:{...s.gameplay.player,credits:1000,stamina:100,processMonitor:undefined,quarantinedProcessPids:[]}}});useOSStore.getState().openAppWorkspace('process');});
 const app=page.locator('.os-window[data-app=process]');await app.getByRole('button',{name:'Maximize',exact:true}).click();return app.locator('.pm-workspace');
}
async function dga(page:Page) {
 const app=page.locator('.os-window[data-app=dgaos]');
 const unlock=app.getByRole('button',{name:'UNLOCK DGA COMMAND SHELL',exact:true});
 await expect(unlock).toBeVisible();await unlock.click();
 const monitor=app.locator('.pm-workspace[data-host=dga]');await expect(monitor).toBeVisible();return monitor;
}
async function report(monitor:ReturnType<Page['locator']>) {
 await monitor.getByRole('button',{name:'Report',exact:true}).click();
 for(const id of ['512:signature','512:logs','512:trace'])await monitor.getByLabel(id,{exact:true}).check();
 await monitor.getByLabel('Finding',{exact:true}).selectOption('unauthorized-memory-writes');
 await monitor.getByLabel('Action taken',{exact:true}).selectOption('isolated-512');
 await monitor.getByLabel('Verified outcome',{exact:true}).selectOption('writes-and-connection-stopped');
 await monitor.getByLabel('Limitations',{exact:true}).fill('These local observations do not establish the source or the extent of the wider incident.');
 await monitor.getByRole('button',{name:'Submit diagnostic report',exact:true}).click();
}
test('one investigation continues through standalone Monitor, WorkNet and DGA with one payment',async({page})=>{
 const failures:string[]=[];page.on('pageerror',error=>failures.push(error.message));
 const standalone=await login(page);await standalone.getByRole('button',{name:'Compare signature',exact:true}).click();
 await standalone.getByRole('button',{name:'Open WorkNet assignment'}).click();
 await page.locator('.os-window[data-app=jobs]').getByRole('button',{name:'Review assignment & employment terms',exact:true}).click();
 const work=page.locator('.os-window[data-app=jobs] .pm-workspace[data-host=worknet]');await expect(work).toBeVisible();
 await work.getByRole('button',{name:'Inspect memory logs',exact:true}).click();await work.getByRole('button',{name:'Trace connection',exact:true}).click();
 await work.getByRole('button',{name:'Isolate process',exact:true}).click();await work.getByRole('button',{name:'Verify containment',exact:true}).click();
 await work.getByRole('button',{name:'Report',exact:true}).click();await work.getByRole('button',{name:'Accept shared assignment',exact:true}).click();await work.getByRole('button',{name:'Acknowledge briefing',exact:true}).click();
 await mkdir('../output/previews',{recursive:true});
 await page.locator('.os-window[data-app=jobs]').screenshot({path:'../output/previews/process-monitor-worknet.png'});
 await work.getByRole('button',{name:'Open DGA diagnostics'}).click();const agency=await dga(page);
 await expect(agency.getByRole('region',{name:'Shared incident'})).toContainText('3/3 findings acquired');
 await report(agency);
 await page.locator('.os-window[data-app=dgaos]').screenshot({path:'../output/previews/process-monitor-dga.png'});
 await agency.getByRole('button',{name:'Finalize shared WorkNet order',exact:true}).click();
 await expect(agency.getByText('WorkNet sign-off recorded',{exact:true})).toBeVisible();
 const receipt=await page.evaluate(async()=>{const {useOSStore}=await import('/src/store/useOSStore.ts' as string);const {useCommsStore}=await import('/src/store/useCommsStore.ts' as string);const p=useOSStore.getState().gameplay.player;return {credits:p.credits,id:p.processMonitor.completion.workOrderId,mail:useCommsStore.getState().emails.filter((m:any)=>m.id==='JOB-COMPLETED:WORK:ms-process-001:once').length};});
 expect(receipt).toEqual({credits:1250,id:'WORK:ms-process-001:once',mail:1});
 await page.reload();await expect(page.getByRole('button',{name:'Open Orbit',exact:true})).toBeVisible();
 await page.evaluate(async()=>{const {useOSStore}=await import('/src/store/useOSStore.ts' as string);useOSStore.getState().openAppWorkspace('process','incident:PM-PRISM-001');});
 const reopened=page.locator('.os-window[data-app=process] .pm-workspace');await reopened.getByRole('button',{name:'Report',exact:true}).click();await expect(reopened.getByText('WorkNet sign-off recorded',{exact:true})).toBeVisible();
 expect(await page.evaluate(async()=>{const {useOSStore}=await import('/src/store/useOSStore.ts' as string);return useOSStore.getState().completeWorknetMission({id:'ms-process-001'} as any).ok;})).toBe(false);
 expect(failures).toEqual([]);
});
test('legitimate service probes recover, optional commands acquire real evidence, and exports contain acquired findings only',async({page})=>{
 const monitor=await login(page);
 await monitor.getByRole('button',{name:/cyacademy_sync.daemon/}).click();await monitor.getByRole('button',{name:'Isolate process',exact:true}).click();
 await expect(monitor.locator('.pm-facts')).toContainText('delivery probe failed');
 await monitor.getByRole('button',{name:'Inspect memory logs',exact:true}).click();await expect(monitor.getByRole('status')).toContainText('probe failed');
 await monitor.getByRole('button',{name:'Restore process',exact:true}).click();await expect(monitor.locator('.pm-facts')).toContainText('delivery probe passed');
 await monitor.locator('.pm-console summary').click();
 await monitor.getByLabel('Command',{exact:true}).fill('signature 512');await monitor.getByRole('button',{name:'Run',exact:true}).click();
 await expect(monitor.getByRole('log')).toContainText('Publisher cannot be verified');
 await monitor.getByRole('button',{name:'Evidence',exact:true}).click();await expect(monitor.getByText('512:signature',{exact:true})).toBeVisible();
 const downloadPromise=page.waitForEvent('download');await monitor.getByRole('button',{name:'Export acquired evidence'}).click();const download=await downloadPromise;
 const text=await readFile((await download.path())!,'utf8');expect(text).toContain('512:signature');expect(text).not.toContain('AETHERCORE');expect(text).not.toContain('FAITH_WARD');
 await monitor.getByRole('button',{name:'Overview',exact:true}).click();await monitor.getByRole('button',{name:/AETHERCORE.sys/}).click();await expect(monitor.getByRole('button',{name:'Isolate process',exact:true})).toHaveCount(0);await expect(monitor.locator('.pm-inspector')).not.toContainText('erased pre-code operating system');
 await monitor.getByRole('button',{name:/prism_subconduit_bleed.hex/}).click();
 await mkdir('../output/previews',{recursive:true});await monitor.evaluate(el=>el.scrollTo({top:0}));await monitor.screenshot({path:'../output/previews/process-monitor-wide.png'});
 await page.setViewportSize({width:650,height:900});expect(await monitor.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
 await monitor.screenshot({path:'../output/previews/process-monitor-narrow.png'});
});
test('DGA diagnostics respect agency workspace authorization',async({page})=>{
 await login(page);
 await page.evaluate(async()=>{const {useOSStore}=await import('/src/store/useOSStore.ts' as string);const s=useOSStore.getState();useOSStore.setState({gameplay:{...s.gameplay,player:{...s.gameplay.player,isAdmin:false,dgaVerified:false,clearanceLevel:1,organizationMemberships:{},careers:{}}}});useOSStore.getState().openAppWorkspace('dgaos','process:PM-PRISM-001');});
 const app=page.locator('.os-window[data-app=dgaos]');await app.getByRole('button',{name:'UNLOCK DGA COMMAND SHELL',exact:true}).click();
 await expect(app.getByRole('button',{name:'Process Diagnostics',exact:true})).toBeVisible();await app.getByRole('button',{name:'Process Diagnostics',exact:true}).click();
 await expect(app.locator('.pm-workspace[data-host=dga]')).toHaveCount(0);
 await expect(app.getByText(/requires DGA departmental authorization/)).toBeVisible();
});
