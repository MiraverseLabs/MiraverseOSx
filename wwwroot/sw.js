const CACHE_NAME = "miraverse-shell-d27f2f4b6de379d6";
const PRECACHE = ["/index.html","/manifest.json","/pwa-icon.svg","/favicon.ico","/images/Logo_Icon - 1.png","/assets/index-a8pdHyYO.css","/assets/App-DjJi7cb9.css","/assets/DgaosApp-C1_bm3Wk.css","/assets/DocumentStudioApp-BTys34W0.css","/assets/RegistryWorkspaceApp-Dt2SnHHz.css","/assets/PulseApp-C9zT9GFC.css","/assets/BrowserApp-C6Jul_ss.css","/assets/versenet-browser-4wRafFG_.css","/assets/SocialApp-U0RxSeJg.css","/assets/MailApp-JMX_z9Xy.css","/assets/PostalApp-DtLbvUqK.css","/assets/FileExplorerApp-BLQR67_R.css","/assets/DocumentModal-BtUdRknX.css","/assets/HousingApp-BGBEjiOX.css","/assets/JobWorkstationApp-BYa4WhBN.css","/assets/case-workspace-BnHXnJiX.css","/assets/ProcessMonitorApp-C_YaoY44.css","/assets/VitalsApp-CjunPQJt.css","/assets/StudyApp-B4J4BNHK.css","/assets/academics-pj7YXxGM.css","/assets/FieldOperationsApp-BC1EDDM4.css","/assets/EvidenceBoard-V3rltzWT.css","/assets/RichTextEditor-DZHZoGHi.css","/assets/DispatchNewsSite-DG_9Np_i.css","/assets/EduSiteRouter-7kAUU4i8.css","/assets/FaithMedSite-D9ZuOV4y.css","/assets/framer-motion-B0GbNFm6.js","/assets/lucide-icons-BDo2aKnc.js","/assets/index-DxaxSkEr.js","/assets/App-CGjQL7Z1.js","/assets/DgaosApp-bPquc1YL.js","/assets/CommsApp-PzWFB3eC.js","/assets/DocumentStudioApp-VtZ1SaJu.js","/assets/RegistryWorkspaceApp-jDvbrRvD.js","/assets/PortraitStudioModal-B24JWvPp.js","/assets/CivicProfileApp-DwaBk-DX.js","/assets/citizenEvents-Ch6-1qqe.js","/assets/PulseApp-C0y38ZqZ.js","/assets/MaiSpaceApp-BQO0x2c1.js","/assets/BrowserApp-BFRXsGWx.js","/assets/versenet-browser-BB0mxx5d.js","/assets/SocialApp-BRIZ56z1.js","/assets/MailApp-DGGmXNe2.js","/assets/CommunicationsAccessPanel-BC6E69m6.js","/assets/PostalApp-CwJIk6IF.js","/assets/FileExplorerApp-Cjgm2_eP.js","/assets/DocumentModal-C62yPTJv.js","/assets/Form-yyTfbMzo.js","/assets/LoreExplorer-BBbXvLZ0.js","/assets/HousingApp-BwEuB3VL.js","/assets/JobWorkstationApp-iHEOSnfL.js","/assets/citizenBridge-DZJzTEFL.js","/assets/BroadStreetCasePanel-CJtsIypQ.js","/assets/RichMailEditor-q9_PQIg6.js","/assets/ProcessMonitorApp-CPUtYckH.js","/assets/FinanceTerminal-BzJB4vG4.js","/assets/VitalsApp-BMiq1B_G.js","/assets/CampusApp-D6nJplk_.js","/assets/maidIdentityService-CoAeUzG-.js","/assets/StudyApp-CbFzUEbW.js","/assets/SpellForgeApp-C35z7-m7.js","/assets/AcademicProjectDesk-hRJsmLK4.js","/assets/FieldOperationsApp-DFzcchJQ.js","/assets/EvidenceBoard-lzBKvLHx.js","/assets/RichTextEditor-DofxggWB.js","/assets/useMedicalStore-B8-_oU1G.js","/assets/DispatchNewsSite-C4U-nZpX.js","/assets/EduSiteRouter-B0vH-U5V.js","/assets/FaithMedSite-LofZzcG4.js","/assets/TunnelScene-Yjj6be2C.js"];
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
