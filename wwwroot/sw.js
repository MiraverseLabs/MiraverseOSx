const CACHE_NAME = "miraverse-shell-69863177a9f61cf6";
const PRECACHE = ["/index.html","/manifest.json","/pwa-icon.svg","/favicon.ico","/images/Logo_Icon - 1.png","/assets/index-DjAJD3Os.css","/assets/App-DHnyqsfP.css","/assets/DgaosApp-C1_bm3Wk.css","/assets/DocumentStudioApp-BTys34W0.css","/assets/RegistryWorkspaceApp-Dt2SnHHz.css","/assets/PulseApp-C9zT9GFC.css","/assets/BrowserApp-C6Jul_ss.css","/assets/versenet-browser-BQ6sJdCC.css","/assets/SocialApp-U0RxSeJg.css","/assets/MailApp-JMX_z9Xy.css","/assets/FileExplorerApp-BLQR67_R.css","/assets/DocumentModal-BtUdRknX.css","/assets/JobWorkstationApp-BYa4WhBN.css","/assets/case-workspace-BnHXnJiX.css","/assets/VitalsApp-CjunPQJt.css","/assets/StudyApp-B4J4BNHK.css","/assets/academics-pj7YXxGM.css","/assets/FieldOperationsApp-BC1EDDM4.css","/assets/EvidenceBoard-V3rltzWT.css","/assets/RichTextEditor-DZHZoGHi.css","/assets/DispatchNewsSite-DG_9Np_i.css","/assets/EduSiteRouter-7kAUU4i8.css","/assets/framer-motion-B0GbNFm6.js","/assets/lucide-icons-OfTFlgOe.js","/assets/index-DkEXjToH.js","/assets/App-C1f7FvKH.js","/assets/DgaosApp-CtcpsSCy.js","/assets/CommsApp-BVOx-V1R.js","/assets/DocumentStudioApp-py7fZwhs.js","/assets/RegistryWorkspaceApp-BpsO_eYG.js","/assets/PortraitStudioModal-l689-CHZ.js","/assets/CivicProfileApp-BdzfZjGd.js","/assets/citizenEvents-Ch6-1qqe.js","/assets/PulseApp-y3zYQdSj.js","/assets/MaiSpaceApp-2NqgWYuS.js","/assets/BrowserApp-Daqj8Rjg.js","/assets/versenet-browser-CtXVrzkl.js","/assets/SocialApp-CZttudqj.js","/assets/MailApp-Cjf4NiML.js","/assets/CommunicationsAccessPanel-BC7octVS.js","/assets/FileExplorerApp-M10gFXGd.js","/assets/DocumentModal-DiZv6BLI.js","/assets/Form-yyTfbMzo.js","/assets/LoreExplorer-C1qjSUXE.js","/assets/ProcessMonitorApp-xGl2maXW.js","/assets/HousingApp-DHfRBU9M.js","/assets/JobWorkstationApp-BEzIlpE_.js","/assets/citizenBridge-DVcRldjT.js","/assets/BroadStreetCasePanel-DC1uLohU.js","/assets/RichMailEditor-C5_rD3Of.js","/assets/FinanceTerminal-BzCjtCf3.js","/assets/VitalsApp-Bn58AyeD.js","/assets/CampusApp-CqkIfv3o.js","/assets/maidIdentityService-BMOmh0r6.js","/assets/StudyApp-C3aC-Sre.js","/assets/SpellForgeApp-DZ_PYzld.js","/assets/AcademicProjectDesk-B1bvAZG-.js","/assets/FieldOperationsApp-D9xTTyba.js","/assets/EvidenceBoard-DuzajdEP.js","/assets/RichTextEditor-CVo4sUVw.js","/assets/DispatchNewsSite-V9VzvByf.js","/assets/EduSiteRouter-BkuNoeDb.js","/assets/TunnelScene-CCFY--IR.js"];
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
