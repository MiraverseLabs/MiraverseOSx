const CACHE_NAME = "miraverse-shell-c1936dac9942d083";
const PRECACHE = ["/index.html","/manifest.json","/pwa-icon.svg","/favicon.ico","/images/Logo_Icon - 1.png","/assets/index-BVDxF-Rf.css","/assets/App-DjJi7cb9.css","/assets/DgaosApp-C1_bm3Wk.css","/assets/DocumentStudioApp-BTys34W0.css","/assets/RegistryWorkspaceApp-Dt2SnHHz.css","/assets/PulseApp-C9zT9GFC.css","/assets/BrowserApp-C6Jul_ss.css","/assets/versenet-browser-4wRafFG_.css","/assets/SocialApp-U0RxSeJg.css","/assets/MailApp-JMX_z9Xy.css","/assets/PostalApp-DtLbvUqK.css","/assets/FileExplorerApp-BLQR67_R.css","/assets/DocumentModal-BtUdRknX.css","/assets/HousingApp-BGBEjiOX.css","/assets/JobWorkstationApp-BYa4WhBN.css","/assets/case-workspace-BnHXnJiX.css","/assets/VitalsApp-CjunPQJt.css","/assets/StudyApp-B4J4BNHK.css","/assets/academics-pj7YXxGM.css","/assets/FieldOperationsApp-BC1EDDM4.css","/assets/EvidenceBoard-V3rltzWT.css","/assets/RichTextEditor-DZHZoGHi.css","/assets/DispatchNewsSite-DG_9Np_i.css","/assets/EduSiteRouter-7kAUU4i8.css","/assets/framer-motion-B0GbNFm6.js","/assets/lucide-icons-BDo2aKnc.js","/assets/index-DcE9W0AK.js","/assets/App-BFIHOkzD.js","/assets/DgaosApp-Cb-K-jkd.js","/assets/CommsApp-CsThuAPG.js","/assets/DocumentStudioApp-D4RrSZsM.js","/assets/RegistryWorkspaceApp-BRyqlcvv.js","/assets/PortraitStudioModal-CUW61ttT.js","/assets/CivicProfileApp-BQbGj81d.js","/assets/citizenEvents-Ch6-1qqe.js","/assets/PulseApp-iVBxmE_M.js","/assets/MaiSpaceApp-BKItwEIs.js","/assets/BrowserApp-DcdL1teD.js","/assets/versenet-browser-CKLjK7H_.js","/assets/SocialApp-DSOfzQs1.js","/assets/MailApp-BoVfdhaJ.js","/assets/CommunicationsAccessPanel-Duv5HEKn.js","/assets/PostalApp-BStGADsV.js","/assets/FileExplorerApp-DuIqidwx.js","/assets/DocumentModal-uRtUu0Mj.js","/assets/Form-yyTfbMzo.js","/assets/LoreExplorer-CWxNrVrg.js","/assets/ProcessMonitorApp-D18w8_1W.js","/assets/HousingApp-DXTZCGz5.js","/assets/JobWorkstationApp-BbjaHZg9.js","/assets/citizenBridge-CR61ajtA.js","/assets/BroadStreetCasePanel-DBpFQNOB.js","/assets/RichMailEditor-B4OJ2WQ7.js","/assets/FinanceTerminal-ByYE-iAS.js","/assets/VitalsApp-BL5KfGaJ.js","/assets/CampusApp-Cs8EABAz.js","/assets/maidIdentityService-BEt5l5CS.js","/assets/StudyApp-Bt_caICt.js","/assets/SpellForgeApp-BYtkZ-Mn.js","/assets/AcademicProjectDesk-Ctb2scN9.js","/assets/FieldOperationsApp-CCZahwTy.js","/assets/EvidenceBoard-BGrVte5B.js","/assets/RichTextEditor-F12KhPYi.js","/assets/DispatchNewsSite-DgrvYBJx.js","/assets/EduSiteRouter-Dj2Jtzqg.js","/assets/TunnelScene-SGQPqY6M.js"];
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
