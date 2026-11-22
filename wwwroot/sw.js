const CACHE_NAME = "miraverse-shell-22a5f1f92731aaea";
const PRECACHE = ["/index.html","/manifest.json","/pwa-icon.svg","/favicon.ico","/images/Logo_Icon - 1.png","/assets/index-Cuvx6wd2.css","/assets/App-DHnyqsfP.css","/assets/DgaosApp-C1_bm3Wk.css","/assets/DocumentStudioApp-BTys34W0.css","/assets/RegistryWorkspaceApp-Dt2SnHHz.css","/assets/PulseApp-C9zT9GFC.css","/assets/BrowserApp-BCMvgYNp.css","/assets/versenet-browser-D_2FH5D3.css","/assets/SocialApp-U0RxSeJg.css","/assets/MailApp-JMX_z9Xy.css","/assets/FileExplorerApp-BLQR67_R.css","/assets/DocumentModal-BtUdRknX.css","/assets/JobWorkstationApp-BYa4WhBN.css","/assets/case-workspace-BnHXnJiX.css","/assets/VitalsApp-CjunPQJt.css","/assets/StudyApp-B4J4BNHK.css","/assets/academics-pj7YXxGM.css","/assets/FieldOperationsApp-BC1EDDM4.css","/assets/EvidenceBoard-V3rltzWT.css","/assets/RichTextEditor-DZHZoGHi.css","/assets/DispatchNewsSite-DG_9Np_i.css","/assets/EduSiteRouter-zvfqyzTr.css","/assets/framer-motion-B0GbNFm6.js","/assets/lucide-icons-yChwnuVN.js","/assets/index-BJTvZfYu.js","/assets/App-CJOM_t9R.js","/assets/DgaosApp-D0HI3Cf4.js","/assets/CommsApp-CM2fZ7hW.js","/assets/DocumentStudioApp-BUi9NknY.js","/assets/RegistryWorkspaceApp-DNDZBB8Y.js","/assets/PortraitStudioModal-CHmaC2v7.js","/assets/CivicProfileApp-CVcLwTw-.js","/assets/citizenEvents-Ch6-1qqe.js","/assets/PulseApp-BlEOohZc.js","/assets/MaiSpaceApp-pvVmsdrr.js","/assets/BrowserApp-BqNUvHYs.js","/assets/versenet-browser--PCleVsr.js","/assets/SocialApp-B7DGeN2r.js","/assets/MailApp-EkOE0mgQ.js","/assets/CommunicationsAccessPanel-CUWFdanf.js","/assets/FileExplorerApp-eYYd-X-8.js","/assets/DocumentModal-CWKe8jqJ.js","/assets/Form-yyTfbMzo.js","/assets/LoreExplorer-CBJiawlY.js","/assets/ProcessMonitorApp-BHCaS9mh.js","/assets/HousingApp-_Ea6ozrN.js","/assets/JobWorkstationApp-DlrKQClM.js","/assets/citizenBridge-BGU0s5we.js","/assets/BroadStreetCasePanel-G0gSgspn.js","/assets/RichMailEditor-BOdUePed.js","/assets/FinanceTerminal-B39JrdXT.js","/assets/VitalsApp-vRA0Epg1.js","/assets/CampusApp-DKFgZfPX.js","/assets/maidIdentityService-CGN_TQP7.js","/assets/StudyApp-CvcUrzbs.js","/assets/SpellForgeApp-B9oD53i2.js","/assets/AcademicProjectDesk-CIn0_pWn.js","/assets/FieldOperationsApp-CQQbaWtr.js","/assets/EvidenceBoard-Cx5PUa3d.js","/assets/RichTextEditor-LRv95YmA.js","/assets/DispatchNewsSite-CuDfry_U.js","/assets/EduSiteRouter-Dd0CQs6S.js","/assets/TunnelScene-BaNtp9mi.js"];
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
