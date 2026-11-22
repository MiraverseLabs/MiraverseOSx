const CACHE_NAME = "miraverse-shell-51be37c990752239";
const PRECACHE = ["/index.html","/manifest.json","/pwa-icon.svg","/favicon.ico","/images/Logo_Icon - 1.png","/assets/index-BzW-nE8U.css","/assets/App-DHnyqsfP.css","/assets/DgaosApp-C1_bm3Wk.css","/assets/DocumentStudioApp-BTys34W0.css","/assets/RegistryWorkspaceApp-Dt2SnHHz.css","/assets/PulseApp-C9zT9GFC.css","/assets/BrowserApp-BCMvgYNp.css","/assets/versenet-browser-D_2FH5D3.css","/assets/SocialApp-U0RxSeJg.css","/assets/MailApp-JMX_z9Xy.css","/assets/FileExplorerApp-BLQR67_R.css","/assets/DocumentModal-BtUdRknX.css","/assets/JobWorkstationApp-BYa4WhBN.css","/assets/case-workspace-BnHXnJiX.css","/assets/VitalsApp-CjunPQJt.css","/assets/StudyApp-B4J4BNHK.css","/assets/academics-pj7YXxGM.css","/assets/FieldOperationsApp-BC1EDDM4.css","/assets/EvidenceBoard-V3rltzWT.css","/assets/RichTextEditor-DZHZoGHi.css","/assets/DispatchNewsSite-DG_9Np_i.css","/assets/EduSiteRouter-zvfqyzTr.css","/assets/framer-motion-B0GbNFm6.js","/assets/lucide-icons-yChwnuVN.js","/assets/index-C0mS-ry7.js","/assets/App-DfLvSCxP.js","/assets/DgaosApp-GyQqXeXP.js","/assets/CommsApp-DQytPPt5.js","/assets/DocumentStudioApp-DRYiF71x.js","/assets/RegistryWorkspaceApp-D2XLhnTN.js","/assets/PortraitStudioModal-C0XUBeJi.js","/assets/CivicProfileApp-BuRKPfoI.js","/assets/citizenEvents-Ch6-1qqe.js","/assets/PulseApp-BVVKjWHx.js","/assets/MaiSpaceApp-BLM3EHKG.js","/assets/BrowserApp-CrFNE9xM.js","/assets/versenet-browser-4o_5LvCr.js","/assets/SocialApp-DmcqitSn.js","/assets/MailApp-BO2sRt0x.js","/assets/CommunicationsAccessPanel-CFGhb_cY.js","/assets/FileExplorerApp-CAhLaW67.js","/assets/DocumentModal-DUrDiMAD.js","/assets/Form-yyTfbMzo.js","/assets/LoreExplorer-BFVzxH6f.js","/assets/ProcessMonitorApp-58yQY-a-.js","/assets/HousingApp-DSw_6ydQ.js","/assets/JobWorkstationApp-Cer44gJd.js","/assets/citizenBridge-C8KHYqBO.js","/assets/BroadStreetCasePanel-R1ADJZod.js","/assets/RichMailEditor-C6STPqET.js","/assets/FinanceTerminal-Bq3Wowto.js","/assets/VitalsApp-DCYRPKvE.js","/assets/CampusApp-Zy3VqXh-.js","/assets/maidIdentityService-upRYRr-I.js","/assets/StudyApp-BDhEJ9Xc.js","/assets/SpellForgeApp-CXrAxZWO.js","/assets/AcademicProjectDesk-p4QWOnfI.js","/assets/FieldOperationsApp-BorRrjQv.js","/assets/EvidenceBoard-BI20DnGO.js","/assets/RichTextEditor-0gygxTEX.js","/assets/DispatchNewsSite-B4zPyHE1.js","/assets/EduSiteRouter-BZjX5yl9.js","/assets/TunnelScene-CVR1Zhjx.js"];
// CACHE_NAME and PRECACHE are injected by the production build.
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE)));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('miraverse-shell-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request; const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/') || url.pathname === '/api') return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => response.ok ? response : caches.match('/index.html').then(cached => cached || response)).catch(() => caches.match('/index.html').then(cached => cached || Response.error())));
    return;
  }
  // Public app resources only. Never cache API responses or arbitrary user URLs.
  if (!/^\/(assets|images|icons|sounds)\//.test(url.pathname)) return;
  // Public hashed assets do not vary by request Origin. Module/CSS preloads may
  // carry a different Origin header than install-time requests (Vary: Origin).
  event.respondWith(caches.open(CACHE_NAME).then(cache => cache.match(request, { ignoreVary: true })).then(cached => cached || fetch(request).then(response => {
    if (response.ok && response.type === 'basic') {
      const copy = response.clone(); event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.put(request, copy)));
    }
    return response;
  })));
});
