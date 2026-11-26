const CACHE_NAME = "miraverse-shell-bd1c11e0567e6ebe";
const PRECACHE = ["/index.html","/manifest.json","/pwa-icon.svg","/favicon.ico","/images/Logo_Icon - 1.png","/images/wallpapers/aureline-city-beneath-the-heavens.png","/images/wallpapers/aureline-across-angel-bay.png","/images/wallpapers/aureline-glassline-twilight.png","/assets/index-s8yNrZGK.css","/assets/App-DWEb1iKT.css","/assets/DgaosApp-DI_pN9Jn.css","/assets/DocumentStudioApp-CREEhC7N.css","/assets/RegistryWorkspaceApp-Dt2SnHHz.css","/assets/BrowserApp-Dtt4Mx05.css","/assets/versenet-browser-BRl5BbTr.css","/assets/SocialApp-U0RxSeJg.css","/assets/MediaTemplateRenderer-BmbpALb4.css","/assets/MailApp-7KCvz72B.css","/assets/PostalApp-DtLbvUqK.css","/assets/FileExplorerApp-DqJTaGmE.css","/assets/DocumentModal-BtUdRknX.css","/assets/LoreExplorer-dhR0VcYo.css","/assets/HousingApp-Dlsx0oUs.css","/assets/JobWorkstationApp-Bw2BuH_v.css","/assets/case-workspace-BnHXnJiX.css","/assets/ProcessMonitorApp-C_YaoY44.css","/assets/VitalsApp-CjunPQJt.css","/assets/StudyApp-B4J4BNHK.css","/assets/academics-pj7YXxGM.css","/assets/FieldOperationsApp-xvWNku50.css","/assets/EvidenceBoard-V3rltzWT.css","/assets/RichTextEditor-DZHZoGHi.css","/assets/BankingWorkspace-Cxz-6J_A.css","/assets/DispatchNewsSite-DG_9Np_i.css","/assets/publications-DoSz2nnA.css","/assets/EduSiteRouter-Q-356gDo.css","/assets/FaithMedSite-D9ZuOV4y.css","/assets/EntertainmentSiteRouter-CukUS770.css","/assets/lucide-icons-DJSBpiZ1.js","/assets/framer-motion-DaVRbR0d.js","/assets/index-CMZVLwhZ.js","/assets/App-CXd4GY-d.js","/assets/usePostalStore-65flfeYl.js","/assets/DgaosApp-CuRdZ3Ew.js","/assets/CommsApp-C9Cq20Vo.js","/assets/DocumentStudioApp-DgZhGcUR.js","/assets/CreativeStudioApp-DwPDQ6HT.js","/assets/RegistryWorkspaceApp-DxWo4-FB.js","/assets/PortraitStudioModal-CiqxnP0P.js","/assets/CivicProfileApp-CL5L31zi.js","/assets/citizenEvents-Ch6-1qqe.js","/assets/MaiSpaceApp-BVSy5Kzv.js","/assets/BrowserApp-QJRxg_4o.js","/assets/versenet-browser-BCZu5lSJ.js","/assets/SocialApp-D9UTJ4oD.js","/assets/MediaTemplateRenderer-DX_KZjYk.js","/assets/MailApp-_LLFHsDc.js","/assets/CommunicationsAccessPanel-Sy3h0TlN.js","/assets/PostalApp-DZKm0n_h.js","/assets/FileExplorerApp-CJzujtdr.js","/assets/DocumentModal-DZyqKx5k.js","/assets/Form-DOCgmhLi.js","/assets/LoreExplorer-Vq_1a-9L.js","/assets/HousingApp-CSD0g-fw.js","/assets/JobWorkstationApp-r0ondO24.js","/assets/citizenBridge-CuDpRBT6.js","/assets/BroadStreetCasePanel-B447yWlj.js","/assets/RichMailEditor-aZWSWAYb.js","/assets/ProcessMonitorApp-Cn8aJ0xM.js","/assets/FinanceTerminal-CEPEDUSr.js","/assets/VitalsApp-B3647-sq.js","/assets/CampusApp-B8VnzCTy.js","/assets/maidIdentityService-DVR33vAr.js","/assets/StudyApp-rOJ4TSJV.js","/assets/SpellForgeApp-DEI4b4xm.js","/assets/AcademicProjectDesk-C5KEWwl4.js","/assets/FieldOperationsApp-B40VcdvB.js","/assets/EvidenceBoard-DK4ISt6u.js","/assets/RichTextEditor-CT1eYq3x.js","/assets/SongbirdAudioPlayer-C2m0YSRb.js","/assets/BankingWorkspace-BakvR0lp.js","/assets/useMedicalStore-DJsOl17f.js","/assets/DispatchNewsSite-BB1KMr16.js","/assets/SocialRegisterSite-BFsfalFH.js","/assets/EduSiteRouter-CARXNhry.js","/assets/FaithMedSite-C4Jbfst7.js","/assets/EntertainmentSiteRouter-CLGMLgQN.js","/assets/SuiteRoomScene-F-Hczr4V.js","/assets/phaser.esm-BwSGr_Za.js","/assets/TunnelScene-Cf9j_QS1.js"];
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
