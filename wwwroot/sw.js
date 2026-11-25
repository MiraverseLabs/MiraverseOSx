const CACHE_NAME = "miraverse-shell-5ab896e9879d66c9";
const PRECACHE = ["/index.html","/manifest.json","/pwa-icon.svg","/favicon.ico","/images/Logo_Icon - 1.png","/images/wallpapers/aureline-city-beneath-the-heavens.png","/images/wallpapers/aureline-across-angel-bay.png","/images/wallpapers/aureline-glassline-twilight.png","/assets/index-DKlgt2iX.css","/assets/App-vpMWmL_z.css","/assets/DgaosApp-DI_pN9Jn.css","/assets/DocumentStudioApp-BTys34W0.css","/assets/RegistryWorkspaceApp-Dt2SnHHz.css","/assets/BrowserApp-Dx9x7VVR.css","/assets/versenet-browser-Bpx9wDXM.css","/assets/SocialApp-U0RxSeJg.css","/assets/MediaTemplateRenderer-DGYueft0.css","/assets/MailApp-7KCvz72B.css","/assets/PostalApp-DtLbvUqK.css","/assets/FileExplorerApp-DqJTaGmE.css","/assets/DocumentModal-BtUdRknX.css","/assets/LoreExplorer-dhR0VcYo.css","/assets/HousingApp-Dlsx0oUs.css","/assets/JobWorkstationApp-Bw2BuH_v.css","/assets/case-workspace-BnHXnJiX.css","/assets/ProcessMonitorApp-C_YaoY44.css","/assets/FinanceTerminal-Cxz-6J_A.css","/assets/VitalsApp-CjunPQJt.css","/assets/StudyApp-B4J4BNHK.css","/assets/academics-pj7YXxGM.css","/assets/FieldOperationsApp-xvWNku50.css","/assets/EvidenceBoard-V3rltzWT.css","/assets/RichTextEditor-DZHZoGHi.css","/assets/DispatchNewsSite-DG_9Np_i.css","/assets/publications-BEch_OeH.css","/assets/EduSiteRouter-7kAUU4i8.css","/assets/FaithMedSite-D9ZuOV4y.css","/assets/framer-motion-B0GbNFm6.js","/assets/lucide-icons-LHWcePBh.js","/assets/index-CJOwfnff.js","/assets/App-CZpuOVAN.js","/assets/DgaosApp-BQuPW1Vm.js","/assets/CommsApp-Zmhoe3l8.js","/assets/DocumentStudioApp-Dh1zPIFg.js","/assets/CreativeStudioApp-An7J6K5Y.js","/assets/RegistryWorkspaceApp-BKenUCwb.js","/assets/PortraitStudioModal-B0jDuPrc.js","/assets/CivicProfileApp-Cp-AtzA4.js","/assets/citizenEvents-Ch6-1qqe.js","/assets/MaiSpaceApp-CUqS5Azu.js","/assets/BrowserApp-CG-hJ6jk.js","/assets/versenet-browser-pO9gjO3O.js","/assets/SocialApp-DZ0wbx_2.js","/assets/MediaTemplateRenderer-BVu6AH6G.js","/assets/MailApp-CYeShgoq.js","/assets/CommunicationsAccessPanel-aM6pWqcK.js","/assets/PostalApp-B-w-kIN-.js","/assets/FileExplorerApp-DAqyF1B6.js","/assets/DocumentModal-DRxgfdAW.js","/assets/Form-yyTfbMzo.js","/assets/LoreExplorer-0PdTawMY.js","/assets/HousingApp-C7krBAqV.js","/assets/JobWorkstationApp-DegJ2JgY.js","/assets/citizenBridge-CnjZgFbY.js","/assets/BroadStreetCasePanel-BF2SW-Gt.js","/assets/RichMailEditor-CAOmTkrJ.js","/assets/ProcessMonitorApp-B7Yc0DbN.js","/assets/FinanceTerminal-CYd-xzYh.js","/assets/VitalsApp-B4HFBoHv.js","/assets/CampusApp-BfejdTHF.js","/assets/maidIdentityService-BFi-eadB.js","/assets/StudyApp-BY14n3JB.js","/assets/SpellForgeApp-CclGJYJW.js","/assets/AcademicProjectDesk-PLVGivHB.js","/assets/FieldOperationsApp-ZjB1e3Wn.js","/assets/EvidenceBoard-D9JyxqZa.js","/assets/RichTextEditor-CxSOuOHC.js","/assets/useMedicalStore-DBZ6XH6U.js","/assets/DispatchNewsSite-D4-qwrPe.js","/assets/SocialRegisterSite-CY00dYwa.js","/assets/EduSiteRouter-CVIvyor7.js","/assets/FaithMedSite-CooEUczG.js","/assets/SuiteRoomScene-BeAUgq-t.js","/assets/phaser.esm-BwSGr_Za.js","/assets/TunnelScene-DWaG-YHE.js"];
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
