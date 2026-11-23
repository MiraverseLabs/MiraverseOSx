const CACHE_NAME = "miraverse-shell-e08583558e10820e";
const PRECACHE = ["/index.html","/manifest.json","/pwa-icon.svg","/favicon.ico","/images/Logo_Icon - 1.png","/assets/index-BHGRsypk.css","/assets/App-CjvkXTWW.css","/assets/DgaosApp-C1_bm3Wk.css","/assets/DocumentStudioApp-BTys34W0.css","/assets/RegistryWorkspaceApp-Dt2SnHHz.css","/assets/PulseApp-C9zT9GFC.css","/assets/BrowserApp-C6Jul_ss.css","/assets/versenet-browser-4wRafFG_.css","/assets/SocialApp-U0RxSeJg.css","/assets/MailApp-7KCvz72B.css","/assets/PostalApp-DtLbvUqK.css","/assets/FileExplorerApp-BLQR67_R.css","/assets/DocumentModal-BtUdRknX.css","/assets/HousingApp-Dlsx0oUs.css","/assets/JobWorkstationApp-BYa4WhBN.css","/assets/case-workspace-BnHXnJiX.css","/assets/ProcessMonitorApp-C_YaoY44.css","/assets/BankingWorkspace-Cxz-6J_A.css","/assets/VitalsApp-CjunPQJt.css","/assets/StudyApp-B4J4BNHK.css","/assets/academics-pj7YXxGM.css","/assets/FieldOperationsApp-xvWNku50.css","/assets/EvidenceBoard-V3rltzWT.css","/assets/RichTextEditor-DZHZoGHi.css","/assets/DispatchNewsSite-DG_9Np_i.css","/assets/EduSiteRouter-7kAUU4i8.css","/assets/FaithMedSite-D9ZuOV4y.css","/assets/framer-motion-B0GbNFm6.js","/assets/lucide-icons-ClMDhjqY.js","/assets/index-BvlI6Rii.js","/assets/App-DzUCvO67.js","/assets/DgaosApp-v8ywcquS.js","/assets/CommsApp-BVoMzsH6.js","/assets/DocumentStudioApp-BJx2DMu8.js","/assets/RegistryWorkspaceApp-BGDrVydG.js","/assets/PortraitStudioModal-C_gb7omo.js","/assets/CivicProfileApp-BGo4upMg.js","/assets/citizenEvents-Ch6-1qqe.js","/assets/PulseApp-BUvCz6J-.js","/assets/MaiSpaceApp-1Qhj9Vbk.js","/assets/BrowserApp-CX9ssQYA.js","/assets/versenet-browser-Dv_Hl_Gi.js","/assets/SocialApp-CNCna3ZT.js","/assets/MailApp-CUuDrcTZ.js","/assets/CommunicationsAccessPanel-EAV7OwQW.js","/assets/PostalApp-ClCDw3V9.js","/assets/FileExplorerApp-BkOnvtsF.js","/assets/DocumentModal-jDtnGCYf.js","/assets/Form-yyTfbMzo.js","/assets/LoreExplorer-CbJhksLi.js","/assets/HousingApp-BsWQaGQy.js","/assets/JobWorkstationApp-BXGlEqNI.js","/assets/citizenBridge-CmAz6fGo.js","/assets/BroadStreetCasePanel-D_oNhNLN.js","/assets/RichMailEditor-DtCnYq1H.js","/assets/ProcessMonitorApp-BDRte0Hi.js","/assets/FinanceTerminal-DtFTuH3i.js","/assets/BankingWorkspace-DEWRa_T1.js","/assets/VitalsApp-aCmP5rnP.js","/assets/CampusApp-CHmlq3Bd.js","/assets/maidIdentityService-Bj1wJnt9.js","/assets/StudyApp-iPDutwf0.js","/assets/SpellForgeApp-B4RDFqZu.js","/assets/AcademicProjectDesk-Chg6v0oW.js","/assets/FieldOperationsApp-CwfFsxg_.js","/assets/EvidenceBoard-BOMesPeK.js","/assets/RichTextEditor-Ca9_2GFt.js","/assets/useMedicalStore-CrS8kDgn.js","/assets/DispatchNewsSite-Beoz12sM.js","/assets/EduSiteRouter-BoA-m1qa.js","/assets/FaithMedSite-CdTbwD9_.js","/assets/SuiteRoomScene-FFDhyvVX.js","/assets/phaser.esm-BwSGr_Za.js","/assets/TunnelScene-BGzjuZT-.js"];
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
