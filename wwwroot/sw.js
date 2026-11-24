const CACHE_NAME = "miraverse-shell-cb903c9a8b9b2205";
const PRECACHE = ["/index.html","/manifest.json","/pwa-icon.svg","/favicon.ico","/images/Logo_Icon - 1.png","/assets/index-D5q7JJFj.css","/assets/App-CjvkXTWW.css","/assets/DgaosApp-DI_pN9Jn.css","/assets/DocumentStudioApp-BTys34W0.css","/assets/RegistryWorkspaceApp-Dt2SnHHz.css","/assets/BrowserApp-Dx9x7VVR.css","/assets/versenet-browser-Bpx9wDXM.css","/assets/SocialApp-U0RxSeJg.css","/assets/MailApp-7KCvz72B.css","/assets/PostalApp-DtLbvUqK.css","/assets/FileExplorerApp-DqJTaGmE.css","/assets/DocumentModal-BtUdRknX.css","/assets/LoreExplorer-dhR0VcYo.css","/assets/HousingApp-Dlsx0oUs.css","/assets/JobWorkstationApp-BYa4WhBN.css","/assets/case-workspace-BnHXnJiX.css","/assets/ProcessMonitorApp-C_YaoY44.css","/assets/FinanceTerminal-Cxz-6J_A.css","/assets/VitalsApp-CjunPQJt.css","/assets/StudyApp-B4J4BNHK.css","/assets/academics-pj7YXxGM.css","/assets/FieldOperationsApp-xvWNku50.css","/assets/EvidenceBoard-V3rltzWT.css","/assets/RichTextEditor-DZHZoGHi.css","/assets/DispatchNewsSite-DG_9Np_i.css","/assets/EduSiteRouter-7kAUU4i8.css","/assets/FaithMedSite-D9ZuOV4y.css","/assets/framer-motion-B0GbNFm6.js","/assets/lucide-icons-BJoAFIxm.js","/assets/index-Cp8HAZLz.js","/assets/App-0X8BWknZ.js","/assets/DgaosApp-CtBa-UGA.js","/assets/CommsApp-BWT8u5GV.js","/assets/DocumentStudioApp-CJ1HMtaz.js","/assets/RegistryWorkspaceApp-CZnxSjmB.js","/assets/PortraitStudioModal-PRBiQGQE.js","/assets/CivicProfileApp-V8JZTmLR.js","/assets/citizenEvents-Ch6-1qqe.js","/assets/MaiSpaceApp-DnjfWIxu.js","/assets/BrowserApp-CgXAM_TU.js","/assets/versenet-browser-sKf-q5RT.js","/assets/SocialApp-CBAlHJVV.js","/assets/MailApp-CPG6bGZT.js","/assets/CommunicationsAccessPanel-DY8MV4Qr.js","/assets/PostalApp-CjqcJDUi.js","/assets/FileExplorerApp-DFyygU5a.js","/assets/DocumentModal-iWbWrNbk.js","/assets/Form-yyTfbMzo.js","/assets/LoreExplorer-hdr5WwD_.js","/assets/HousingApp-CpuP3Fct.js","/assets/JobWorkstationApp-e2-36JKj.js","/assets/citizenBridge-CCnpHaxE.js","/assets/BroadStreetCasePanel-Cn5Y7BBD.js","/assets/RichMailEditor-Bhjg0Ej-.js","/assets/ProcessMonitorApp-SRe0IG1J.js","/assets/FinanceTerminal-DNG_SpZM.js","/assets/VitalsApp-CdLzBMbI.js","/assets/CampusApp-DQ_WOtIX.js","/assets/maidIdentityService-COHmDNHq.js","/assets/StudyApp-Cn7T3mcV.js","/assets/SpellForgeApp-xxjBDwM4.js","/assets/AcademicProjectDesk-CCH0UFuH.js","/assets/FieldOperationsApp-CjIMIBIC.js","/assets/EvidenceBoard-DDiGx9XZ.js","/assets/RichTextEditor-CQ_733Ww.js","/assets/useMedicalStore-CKH5FWCO.js","/assets/DispatchNewsSite-C_Ehwp14.js","/assets/EduSiteRouter-t3BVbI4P.js","/assets/FaithMedSite-4qeefKjC.js","/assets/SuiteRoomScene-CKdXbaXR.js","/assets/phaser.esm-BwSGr_Za.js","/assets/TunnelScene-BlsFGMCO.js"];
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
