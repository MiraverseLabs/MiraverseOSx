const CACHE_NAME = "miraverse-shell-852f426d9d104692";
const PRECACHE = ["/index.html","/manifest.json","/pwa-icon.svg","/favicon.ico","/images/Logo_Icon - 1.png","/images/wallpapers/aureline-city-beneath-the-heavens.png","/images/wallpapers/aureline-across-angel-bay.png","/images/wallpapers/aureline-glassline-twilight.png","/assets/index-BjMckV_T.css","/assets/App-vpMWmL_z.css","/assets/DgaosApp-DI_pN9Jn.css","/assets/DocumentStudioApp-BTys34W0.css","/assets/RegistryWorkspaceApp-Dt2SnHHz.css","/assets/BrowserApp-Dx9x7VVR.css","/assets/versenet-browser-Bpx9wDXM.css","/assets/SocialApp-0YCT5znM.css","/assets/MailApp-7KCvz72B.css","/assets/PostalApp-DtLbvUqK.css","/assets/FileExplorerApp-DqJTaGmE.css","/assets/DocumentModal-BtUdRknX.css","/assets/LoreExplorer-dhR0VcYo.css","/assets/HousingApp-Dlsx0oUs.css","/assets/JobWorkstationApp-Bw2BuH_v.css","/assets/case-workspace-BnHXnJiX.css","/assets/ProcessMonitorApp-C_YaoY44.css","/assets/FinanceTerminal-Cxz-6J_A.css","/assets/VitalsApp-CjunPQJt.css","/assets/StudyApp-B4J4BNHK.css","/assets/academics-pj7YXxGM.css","/assets/FieldOperationsApp-xvWNku50.css","/assets/EvidenceBoard-V3rltzWT.css","/assets/RichTextEditor-DZHZoGHi.css","/assets/DispatchNewsSite-DG_9Np_i.css","/assets/publications-BEch_OeH.css","/assets/EduSiteRouter-7kAUU4i8.css","/assets/FaithMedSite-D9ZuOV4y.css","/assets/framer-motion-B0GbNFm6.js","/assets/lucide-icons-B4_qKaQZ.js","/assets/index-DxAySGqe.js","/assets/App-Bq-NzmsF.js","/assets/DgaosApp-B9Mk7x97.js","/assets/CommsApp-DixutKEJ.js","/assets/DocumentStudioApp-BfRumuB3.js","/assets/RegistryWorkspaceApp-6kX04js4.js","/assets/PortraitStudioModal-DqGvvAHG.js","/assets/CivicProfileApp-riswEX8j.js","/assets/citizenEvents-Ch6-1qqe.js","/assets/MaiSpaceApp-DAyMx6NP.js","/assets/BrowserApp-CUA9zavU.js","/assets/versenet-browser-9TYavA5H.js","/assets/SocialApp-uVOszuOh.js","/assets/MailApp-BQI1UKTz.js","/assets/CommunicationsAccessPanel-D5s0yYOj.js","/assets/PostalApp-C7qkW_V0.js","/assets/FileExplorerApp-DZ3awbOf.js","/assets/DocumentModal-CD74tRmH.js","/assets/Form-yyTfbMzo.js","/assets/LoreExplorer-DMe-u-aa.js","/assets/HousingApp-CAmV1MBD.js","/assets/JobWorkstationApp-NghjC0TD.js","/assets/citizenBridge-CWAEJJ11.js","/assets/BroadStreetCasePanel-CGRugNQW.js","/assets/RichMailEditor-BohyCbvZ.js","/assets/ProcessMonitorApp-B5HF_d8P.js","/assets/FinanceTerminal-DEClKmRa.js","/assets/VitalsApp-BwRiTiSp.js","/assets/CampusApp-B_VorEsL.js","/assets/maidIdentityService-C01tDGY1.js","/assets/StudyApp-kbZuYd4Q.js","/assets/SpellForgeApp-AZz-seEh.js","/assets/AcademicProjectDesk-veHM6z9c.js","/assets/FieldOperationsApp-2B5W731Z.js","/assets/EvidenceBoard-B9qH5c-Z.js","/assets/RichTextEditor-Ddrl4xAR.js","/assets/useMedicalStore-Cu0OssoC.js","/assets/DispatchNewsSite-WvbQTU4I.js","/assets/SocialRegisterSite-CvQIbm3T.js","/assets/EduSiteRouter-DiEMCR7M.js","/assets/FaithMedSite-DN4WPDmi.js","/assets/SuiteRoomScene-DcBN8j59.js","/assets/phaser.esm-BwSGr_Za.js","/assets/TunnelScene-BjKFGrKD.js"];
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
