const CACHE_NAME = "miraverse-shell-274ec475d4069589";
const PRECACHE = ["/index.html","/manifest.json","/pwa-icon.svg","/favicon.ico","/images/Logo_Icon - 1.png","/images/wallpapers/aureline-city-beneath-the-heavens.png","/images/wallpapers/aureline-across-angel-bay.png","/images/wallpapers/aureline-glassline-twilight.png","/assets/index-NNY7bHja.css","/assets/App-DWEb1iKT.css","/assets/DgaosApp-DI_pN9Jn.css","/assets/DocumentStudioApp-CREEhC7N.css","/assets/RegistryWorkspaceApp-Dt2SnHHz.css","/assets/BrowserApp-Dx9x7VVR.css","/assets/versenet-browser-Bpx9wDXM.css","/assets/SocialApp-U0RxSeJg.css","/assets/MediaTemplateRenderer-DGYueft0.css","/assets/MailApp-7KCvz72B.css","/assets/PostalApp-DtLbvUqK.css","/assets/FileExplorerApp-DqJTaGmE.css","/assets/DocumentModal-BtUdRknX.css","/assets/LoreExplorer-dhR0VcYo.css","/assets/HousingApp-Dlsx0oUs.css","/assets/JobWorkstationApp-Bw2BuH_v.css","/assets/case-workspace-BnHXnJiX.css","/assets/ProcessMonitorApp-C_YaoY44.css","/assets/FinanceTerminal-Cxz-6J_A.css","/assets/VitalsApp-CjunPQJt.css","/assets/StudyApp-B4J4BNHK.css","/assets/academics-pj7YXxGM.css","/assets/FieldOperationsApp-xvWNku50.css","/assets/EvidenceBoard-V3rltzWT.css","/assets/RichTextEditor-DZHZoGHi.css","/assets/DispatchNewsSite-DG_9Np_i.css","/assets/publications-BEch_OeH.css","/assets/EduSiteRouter-7kAUU4i8.css","/assets/FaithMedSite-D9ZuOV4y.css","/assets/EntertainmentSiteRouter-CxeuTNeC.css","/assets/lucide-icons-BKn6-ptP.js","/assets/framer-motion-Bl2GI2lo.js","/assets/index-DRuValev.js","/assets/App-DAMBxH9F.js","/assets/usePostalStore-DpngE_1T.js","/assets/DgaosApp-HxgHLGhT.js","/assets/CommsApp-CqwU0PGC.js","/assets/DocumentStudioApp-C7c7jRVT.js","/assets/CreativeStudioApp-CxM5bU4h.js","/assets/RegistryWorkspaceApp-Dw03Ly1m.js","/assets/PortraitStudioModal-IuYdzwyv.js","/assets/CivicProfileApp-ren53VXB.js","/assets/citizenEvents-Ch6-1qqe.js","/assets/MaiSpaceApp-bHa11GTW.js","/assets/BrowserApp-C51wAXHv.js","/assets/versenet-browser-BF02906-.js","/assets/SocialApp-B3ct0ICL.js","/assets/MediaTemplateRenderer-Dh57WwFj.js","/assets/MailApp-Bc9XQK76.js","/assets/CommunicationsAccessPanel-Df-z-au1.js","/assets/PostalApp-BBMtrATZ.js","/assets/FileExplorerApp-B_lm8pCx.js","/assets/DocumentModal-B9kEG4Mf.js","/assets/Form-DW_qr422.js","/assets/LoreExplorer-6KliGtGn.js","/assets/HousingApp-DcFG_zQl.js","/assets/JobWorkstationApp-BxaezXEX.js","/assets/citizenBridge-DNrVkiPi.js","/assets/BroadStreetCasePanel-CVyEYq7r.js","/assets/RichMailEditor-BaQlfalw.js","/assets/ProcessMonitorApp-D2cRkzvx.js","/assets/FinanceTerminal-CBTSxAAW.js","/assets/VitalsApp-BsFlLK1H.js","/assets/CampusApp-DbP0TcWg.js","/assets/maidIdentityService-CNO_kVyc.js","/assets/StudyApp-o4QDIlbc.js","/assets/SpellForgeApp-Biqc3j54.js","/assets/AcademicProjectDesk-SX5KKNNR.js","/assets/FieldOperationsApp-2DUXhCql.js","/assets/EvidenceBoard-DCQ9ypSN.js","/assets/RichTextEditor-Ca_dHtXD.js","/assets/SongbirdAudioPlayer-ssURPrmr.js","/assets/useMedicalStore-DxqInMW8.js","/assets/DispatchNewsSite-BUzR0w3y.js","/assets/SocialRegisterSite-CbPqMOSq.js","/assets/EduSiteRouter-BKDYPGAu.js","/assets/FaithMedSite-OTm1nWwO.js","/assets/EntertainmentSiteRouter-DFsEmZFU.js","/assets/SuiteRoomScene-CbCiy78F.js","/assets/phaser.esm-BwSGr_Za.js","/assets/TunnelScene-aE4FUdaU.js"];
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
