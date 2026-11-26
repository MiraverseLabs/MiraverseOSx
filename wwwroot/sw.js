const CACHE_NAME = "miraverse-shell-170840e515d84f75";
const PRECACHE = ["/index.html","/manifest.json","/pwa-icon.svg","/favicon.ico","/images/Logo_Icon - 1.png","/images/wallpapers/aureline-city-beneath-the-heavens.png","/images/wallpapers/aureline-across-angel-bay.png","/images/wallpapers/aureline-glassline-twilight.png","/assets/index-NNY7bHja.css","/assets/App-DWEb1iKT.css","/assets/DgaosApp-DI_pN9Jn.css","/assets/DocumentStudioApp-CREEhC7N.css","/assets/RegistryWorkspaceApp-Dt2SnHHz.css","/assets/BrowserApp-Dx9x7VVR.css","/assets/versenet-browser-Bpx9wDXM.css","/assets/SocialApp-U0RxSeJg.css","/assets/MediaTemplateRenderer-DGYueft0.css","/assets/MailApp-7KCvz72B.css","/assets/PostalApp-DtLbvUqK.css","/assets/FileExplorerApp-DqJTaGmE.css","/assets/DocumentModal-BtUdRknX.css","/assets/LoreExplorer-dhR0VcYo.css","/assets/HousingApp-Dlsx0oUs.css","/assets/JobWorkstationApp-Bw2BuH_v.css","/assets/case-workspace-BnHXnJiX.css","/assets/ProcessMonitorApp-C_YaoY44.css","/assets/FinanceTerminal-Cxz-6J_A.css","/assets/VitalsApp-CjunPQJt.css","/assets/StudyApp-B4J4BNHK.css","/assets/academics-pj7YXxGM.css","/assets/FieldOperationsApp-xvWNku50.css","/assets/EvidenceBoard-V3rltzWT.css","/assets/RichTextEditor-DZHZoGHi.css","/assets/DispatchNewsSite-DG_9Np_i.css","/assets/publications-BEch_OeH.css","/assets/EduSiteRouter-7kAUU4i8.css","/assets/FaithMedSite-D9ZuOV4y.css","/assets/EntertainmentSiteRouter-CxeuTNeC.css","/assets/lucide-icons-BKn6-ptP.js","/assets/framer-motion-Bl2GI2lo.js","/assets/index-Dth0HZMa.js","/assets/App-KqRn_LT5.js","/assets/usePostalStore-CnpQb35K.js","/assets/DgaosApp-D4mIkzBF.js","/assets/CommsApp-0XTlQmBt.js","/assets/DocumentStudioApp-JKobgqbU.js","/assets/CreativeStudioApp-TMrphE4y.js","/assets/RegistryWorkspaceApp-DpJJaNZI.js","/assets/PortraitStudioModal-DYJTaP1F.js","/assets/CivicProfileApp-BPI8SCNr.js","/assets/citizenEvents-Ch6-1qqe.js","/assets/MaiSpaceApp-Dhn3cO_h.js","/assets/BrowserApp-BU2f4dke.js","/assets/versenet-browser-Cm5QlpUW.js","/assets/SocialApp-BNeJCm1a.js","/assets/MediaTemplateRenderer-BK4Eq2sN.js","/assets/MailApp-DWrVuf5E.js","/assets/CommunicationsAccessPanel-DN1j0UeC.js","/assets/PostalApp-DOoWIA6f.js","/assets/FileExplorerApp-CWxP-izJ.js","/assets/DocumentModal-DGPRPj2_.js","/assets/Form-DW_qr422.js","/assets/LoreExplorer-BRlGKOAk.js","/assets/HousingApp-BpMf3m0D.js","/assets/JobWorkstationApp-y46j9AmB.js","/assets/citizenBridge-7bd_yAK0.js","/assets/BroadStreetCasePanel-Dqn8-GAU.js","/assets/RichMailEditor-BEPeK0Rb.js","/assets/ProcessMonitorApp-fqUAzZsQ.js","/assets/FinanceTerminal-D-by-IjE.js","/assets/VitalsApp-DPh88h_9.js","/assets/CampusApp-DSmq8oIE.js","/assets/maidIdentityService-F-U7sTcZ.js","/assets/StudyApp-vtAbgIU7.js","/assets/SpellForgeApp-B4E_SnIe.js","/assets/AcademicProjectDesk-__wmmCIc.js","/assets/FieldOperationsApp-BQybxI93.js","/assets/EvidenceBoard-DjsdNSoi.js","/assets/RichTextEditor-DGjuFFFu.js","/assets/SongbirdAudioPlayer-DgQ5uKbG.js","/assets/useMedicalStore-BvSw_ILO.js","/assets/DispatchNewsSite-CWMWtlow.js","/assets/SocialRegisterSite-DRyLSuZ3.js","/assets/EduSiteRouter-Deqzr-0b.js","/assets/FaithMedSite-Bv9-Su5A.js","/assets/EntertainmentSiteRouter-C1Awgzoy.js","/assets/SuiteRoomScene-DJ0TpTyf.js","/assets/phaser.esm-BwSGr_Za.js","/assets/TunnelScene-DQiYGEj-.js"];
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
