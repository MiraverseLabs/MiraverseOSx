const CACHE_NAME = "miraverse-shell-5c06928ec9961244";
const PRECACHE = ["/index.html","/manifest.json","/pwa-icon.svg","/favicon.ico","/images/Logo_Icon - 1.png","/assets/index-Bc1jcWI-.css","/assets/App-DmNbae8i.css","/assets/DgaosApp-DI_pN9Jn.css","/assets/DocumentStudioApp-BTys34W0.css","/assets/RegistryWorkspaceApp-Dt2SnHHz.css","/assets/BrowserApp-Dx9x7VVR.css","/assets/versenet-browser-Bpx9wDXM.css","/assets/SocialApp-U0RxSeJg.css","/assets/MailApp-7KCvz72B.css","/assets/PostalApp-DtLbvUqK.css","/assets/FileExplorerApp-DqJTaGmE.css","/assets/DocumentModal-BtUdRknX.css","/assets/LoreExplorer-dhR0VcYo.css","/assets/HousingApp-Dlsx0oUs.css","/assets/JobWorkstationApp-Bw2BuH_v.css","/assets/case-workspace-BnHXnJiX.css","/assets/ProcessMonitorApp-C_YaoY44.css","/assets/FinanceTerminal-Cxz-6J_A.css","/assets/VitalsApp-CjunPQJt.css","/assets/StudyApp-B4J4BNHK.css","/assets/academics-pj7YXxGM.css","/assets/FieldOperationsApp-xvWNku50.css","/assets/EvidenceBoard-V3rltzWT.css","/assets/RichTextEditor-DZHZoGHi.css","/assets/DispatchNewsSite-DG_9Np_i.css","/assets/EduSiteRouter-7kAUU4i8.css","/assets/FaithMedSite-D9ZuOV4y.css","/assets/framer-motion-B0GbNFm6.js","/assets/lucide-icons-DfI9MPAe.js","/assets/index-CG19bE75.js","/assets/App-DcvvN_1v.js","/assets/DgaosApp-Bq7FgtuR.js","/assets/CommsApp-Bz9M4sXD.js","/assets/DocumentStudioApp-RveFNwXd.js","/assets/RegistryWorkspaceApp-CXsqxOfl.js","/assets/PortraitStudioModal-DspK76Za.js","/assets/CivicProfileApp-Dk-kyGlR.js","/assets/citizenEvents-Ch6-1qqe.js","/assets/MaiSpaceApp-BsrXin3g.js","/assets/BrowserApp-jyzDdbce.js","/assets/versenet-browser-BQXjmE2s.js","/assets/SocialApp-Ciz2vSdv.js","/assets/MailApp-BD1byXLG.js","/assets/CommunicationsAccessPanel-D_SUn_2D.js","/assets/PostalApp-CMX-E_Xv.js","/assets/FileExplorerApp-BWSB0T5k.js","/assets/DocumentModal-cchjTTgC.js","/assets/Form-yyTfbMzo.js","/assets/LoreExplorer-BZUteqlZ.js","/assets/HousingApp-DdK0LCyr.js","/assets/JobWorkstationApp-BaNKxHfH.js","/assets/citizenBridge-CU2reUHw.js","/assets/BroadStreetCasePanel-Bq8YRUuM.js","/assets/RichMailEditor-IJSzxQ2n.js","/assets/ProcessMonitorApp-DUJxXQGx.js","/assets/FinanceTerminal-Cp8fUJhr.js","/assets/VitalsApp-D0Y4pa__.js","/assets/CampusApp-DyMbrGpJ.js","/assets/maidIdentityService-D2iNHBbz.js","/assets/StudyApp-Cu8T0KTb.js","/assets/SpellForgeApp-Ba_Q-8nl.js","/assets/AcademicProjectDesk-DsViiOQW.js","/assets/FieldOperationsApp-BWzX8x3Q.js","/assets/EvidenceBoard-DRedB-dc.js","/assets/RichTextEditor-Dwipc-ve.js","/assets/useMedicalStore-8vB4o67P.js","/assets/DispatchNewsSite-wIXzX4KH.js","/assets/EduSiteRouter-BlGgzH4H.js","/assets/FaithMedSite-ChEGmj3H.js","/assets/SuiteRoomScene-ffGBxsi0.js","/assets/phaser.esm-BwSGr_Za.js","/assets/TunnelScene-CY6vCzV7.js"];
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
