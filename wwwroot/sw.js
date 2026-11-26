const CACHE_NAME = "miraverse-shell-93d876aa6bba237d";
const PRECACHE = ["/index.html","/manifest.json","/pwa-icon.svg","/favicon.ico","/images/Logo_Icon - 1.png","/images/wallpapers/aureline-city-beneath-the-heavens.png","/images/wallpapers/aureline-across-angel-bay.png","/images/wallpapers/aureline-glassline-twilight.png","/assets/index-D1PavWgZ.css","/assets/App-DWEb1iKT.css","/assets/DgaosApp-DI_pN9Jn.css","/assets/DocumentStudioApp-CREEhC7N.css","/assets/RegistryWorkspaceApp-Dt2SnHHz.css","/assets/BrowserApp-Dx5jsQAe.css","/assets/versenet-browser-BbJEIuoD.css","/assets/SocialApp-U0RxSeJg.css","/assets/MediaTemplateRenderer-BmbpALb4.css","/assets/MailApp-7KCvz72B.css","/assets/PostalApp-DtLbvUqK.css","/assets/FileExplorerApp-DqJTaGmE.css","/assets/DocumentModal-BtUdRknX.css","/assets/LoreExplorer-dhR0VcYo.css","/assets/HousingApp-Dlsx0oUs.css","/assets/JobWorkstationApp-Bw2BuH_v.css","/assets/case-workspace-BnHXnJiX.css","/assets/ProcessMonitorApp-C_YaoY44.css","/assets/VitalsApp-CjunPQJt.css","/assets/StudyApp-B4J4BNHK.css","/assets/academics-pj7YXxGM.css","/assets/FieldOperationsApp-xvWNku50.css","/assets/EvidenceBoard-V3rltzWT.css","/assets/RichTextEditor-DZHZoGHi.css","/assets/BankingWorkspace-Cxz-6J_A.css","/assets/DispatchNewsSite-DG_9Np_i.css","/assets/publications-DoSz2nnA.css","/assets/EduSiteRouter-7kAUU4i8.css","/assets/FaithMedSite-D9ZuOV4y.css","/assets/EntertainmentSiteRouter-CxeuTNeC.css","/assets/lucide-icons-CTJ10-2A.js","/assets/framer-motion-CwrSBKNw.js","/assets/index-DcGg8qm3.js","/assets/App-BPjKHYgc.js","/assets/usePostalStore-C1YSh3Zq.js","/assets/DgaosApp-B-ihnE4c.js","/assets/CommsApp-NxwBmKYc.js","/assets/DocumentStudioApp-C-PC1Jl1.js","/assets/CreativeStudioApp-ndJVfDIJ.js","/assets/RegistryWorkspaceApp-C3V1yOTU.js","/assets/PortraitStudioModal-CUoszsBb.js","/assets/CivicProfileApp-CkrbbE8t.js","/assets/citizenEvents-Ch6-1qqe.js","/assets/MaiSpaceApp-Cug5PwBh.js","/assets/BrowserApp-BJJdfXc7.js","/assets/versenet-browser-BVCyc3Kb.js","/assets/SocialApp-B3qCFebv.js","/assets/MediaTemplateRenderer-DwzGeS48.js","/assets/MailApp-D1LGoO95.js","/assets/CommunicationsAccessPanel-aO471L1z.js","/assets/PostalApp-CH0089pP.js","/assets/FileExplorerApp-D1_SEx-8.js","/assets/DocumentModal-V3aDHzFN.js","/assets/Form-DVj-gHt2.js","/assets/LoreExplorer-CxJ33GyK.js","/assets/HousingApp-CRaXC8-2.js","/assets/JobWorkstationApp-hen9bk5F.js","/assets/citizenBridge-CZ1MuspF.js","/assets/BroadStreetCasePanel-DLKr9HiD.js","/assets/RichMailEditor-BcJIrk9k.js","/assets/ProcessMonitorApp-D_SeIiyM.js","/assets/FinanceTerminal-B74M3e06.js","/assets/VitalsApp-BGQtiL5X.js","/assets/CampusApp-BaFbSXEA.js","/assets/maidIdentityService-zKmtBTTH.js","/assets/StudyApp-BYDaZYqA.js","/assets/SpellForgeApp-oa0QDSlh.js","/assets/AcademicProjectDesk-Beek0xry.js","/assets/FieldOperationsApp-gVk2YHmm.js","/assets/EvidenceBoard-CeWgInPl.js","/assets/RichTextEditor-TeAKaieM.js","/assets/SongbirdAudioPlayer-CeJjcPVu.js","/assets/BankingWorkspace-JdaMPryi.js","/assets/useMedicalStore-B2aEOTbT.js","/assets/DispatchNewsSite-DSYIQ4D9.js","/assets/SocialRegisterSite-M9jeR1E6.js","/assets/EduSiteRouter-B08QJ97X.js","/assets/FaithMedSite-2u3LatUR.js","/assets/EntertainmentSiteRouter-DopF571p.js","/assets/SuiteRoomScene-D28ECQQo.js","/assets/phaser.esm-BwSGr_Za.js","/assets/TunnelScene-CZC7BJtu.js"];
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
