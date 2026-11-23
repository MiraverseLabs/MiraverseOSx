const CACHE_NAME = "miraverse-shell-278cbb119220678c";
const PRECACHE = ["/index.html","/manifest.json","/pwa-icon.svg","/favicon.ico","/images/Logo_Icon - 1.png","/assets/index-kuGZg-Bj.css","/assets/App-C2sFjEOR.css","/assets/DgaosApp-C1_bm3Wk.css","/assets/DocumentStudioApp-BTys34W0.css","/assets/RegistryWorkspaceApp-Dt2SnHHz.css","/assets/PulseApp-C9zT9GFC.css","/assets/BrowserApp-C6Jul_ss.css","/assets/versenet-browser-4wRafFG_.css","/assets/SocialApp-U0RxSeJg.css","/assets/MailApp-JMX_z9Xy.css","/assets/PostalApp-DtLbvUqK.css","/assets/FileExplorerApp-BLQR67_R.css","/assets/DocumentModal-BtUdRknX.css","/assets/JobWorkstationApp-BYa4WhBN.css","/assets/case-workspace-BnHXnJiX.css","/assets/VitalsApp-CjunPQJt.css","/assets/StudyApp-B4J4BNHK.css","/assets/academics-pj7YXxGM.css","/assets/FieldOperationsApp-BC1EDDM4.css","/assets/EvidenceBoard-V3rltzWT.css","/assets/RichTextEditor-DZHZoGHi.css","/assets/DispatchNewsSite-DG_9Np_i.css","/assets/EduSiteRouter-7kAUU4i8.css","/assets/framer-motion-B0GbNFm6.js","/assets/lucide-icons-CGhPokCN.js","/assets/index-B6yl4omz.js","/assets/App-BQsynJHp.js","/assets/DgaosApp-DpgM16zA.js","/assets/CommsApp-Cfuo4wid.js","/assets/DocumentStudioApp-CbmJb5-6.js","/assets/RegistryWorkspaceApp-D_uyF57m.js","/assets/PortraitStudioModal-BknB8Wuo.js","/assets/CivicProfileApp-DrX7LNtw.js","/assets/citizenEvents-Ch6-1qqe.js","/assets/PulseApp-Ck8zgK8q.js","/assets/MaiSpaceApp-ngTZh6to.js","/assets/BrowserApp-neENplXx.js","/assets/versenet-browser-BEAfNC4b.js","/assets/SocialApp-DUElfq-A.js","/assets/MailApp-CHES651U.js","/assets/CommunicationsAccessPanel-Bqrnewxo.js","/assets/PostalApp-DeNahGLW.js","/assets/usePostalStore-npHazwVA.js","/assets/FileExplorerApp-pLB0Oa5-.js","/assets/DocumentModal-BbWVfmcS.js","/assets/Form-yyTfbMzo.js","/assets/LoreExplorer-DgJW7e5P.js","/assets/ProcessMonitorApp-CoP-b48r.js","/assets/HousingApp-es_tV_nz.js","/assets/JobWorkstationApp-KczkCQ2k.js","/assets/citizenBridge-DzgzOE8s.js","/assets/BroadStreetCasePanel-BMAWW0vZ.js","/assets/RichMailEditor-CRCi1gpc.js","/assets/FinanceTerminal-CYOQ5bIR.js","/assets/VitalsApp-Ca4t8Jhi.js","/assets/CampusApp-CaLvPOyu.js","/assets/maidIdentityService-BfKpDYlE.js","/assets/StudyApp-CANnusV5.js","/assets/SpellForgeApp-BW_L6iPv.js","/assets/AcademicProjectDesk-BSAoU2qf.js","/assets/FieldOperationsApp-moMSzkRU.js","/assets/EvidenceBoard-zINaX8sI.js","/assets/RichTextEditor-Bj8FEP67.js","/assets/DispatchNewsSite-BiHT19kX.js","/assets/EduSiteRouter-DggtGxVY.js","/assets/TunnelScene-BgmTM1DX.js"];
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
