const CACHE_NAME = "miraverse-shell-50b5a1f567ac2bea";
const PRECACHE = ["/index.html","/manifest.json","/pwa-icon.svg","/favicon.ico","/images/Logo_Icon - 1.png","/images/wallpapers/aureline-city-beneath-the-heavens.png","/images/wallpapers/aureline-across-angel-bay.png","/images/wallpapers/aureline-glassline-twilight.png","/assets/index-s8yNrZGK.css","/assets/App-DWEb1iKT.css","/assets/DgaosApp-DI_pN9Jn.css","/assets/DocumentStudioApp-CREEhC7N.css","/assets/RegistryWorkspaceApp-Dt2SnHHz.css","/assets/BrowserApp-Dtt4Mx05.css","/assets/versenet-browser-BRl5BbTr.css","/assets/SocialApp-U0RxSeJg.css","/assets/MediaTemplateRenderer-BmbpALb4.css","/assets/MailApp-7KCvz72B.css","/assets/PostalApp-DtLbvUqK.css","/assets/FileExplorerApp-DqJTaGmE.css","/assets/DocumentModal-BtUdRknX.css","/assets/LoreExplorer-dhR0VcYo.css","/assets/HousingApp-Dlsx0oUs.css","/assets/JobWorkstationApp-Bw2BuH_v.css","/assets/case-workspace-BnHXnJiX.css","/assets/ProcessMonitorApp-C_YaoY44.css","/assets/VitalsApp-CjunPQJt.css","/assets/StudyApp-B4J4BNHK.css","/assets/academics-pj7YXxGM.css","/assets/FieldOperationsApp-xvWNku50.css","/assets/EvidenceBoard-V3rltzWT.css","/assets/RichTextEditor-DZHZoGHi.css","/assets/BankingWorkspace-Cxz-6J_A.css","/assets/DispatchNewsSite-DG_9Np_i.css","/assets/publications-DoSz2nnA.css","/assets/EduSiteRouter-Q-356gDo.css","/assets/FaithMedSite-D9ZuOV4y.css","/assets/EntertainmentSiteRouter-MvxVxbH3.css","/assets/lucide-icons-DtKmQyuo.js","/assets/framer-motion-u2JRVc-W.js","/assets/index-DwR8bQdm.js","/assets/App-C4YHlOM2.js","/assets/usePostalStore-DH0IclQE.js","/assets/DgaosApp-Bfk7IcPf.js","/assets/CommsApp-B2CTdHiz.js","/assets/DocumentStudioApp-BqJm2hjy.js","/assets/CreativeStudioApp-BwFRyLlQ.js","/assets/RegistryWorkspaceApp-CLDJFtUB.js","/assets/PortraitStudioModal-OQdCu5r_.js","/assets/CivicProfileApp-JDAoufEH.js","/assets/citizenEvents-Ch6-1qqe.js","/assets/MaiSpaceApp-CQXxtJlX.js","/assets/BrowserApp-BTxJ3plA.js","/assets/versenet-browser-iegaDhLP.js","/assets/SocialApp-D8KkYpd5.js","/assets/MediaTemplateRenderer-bCgPazBO.js","/assets/MailApp-BUIFNjt-.js","/assets/CommunicationsAccessPanel-DY4XiV9k.js","/assets/PostalApp-BtuUQXj7.js","/assets/FileExplorerApp-BPXHY5EM.js","/assets/DocumentModal-duhFepyI.js","/assets/Form-CV4rL8iz.js","/assets/LoreExplorer-A5wV6oNg.js","/assets/HousingApp-DcZEWH5w.js","/assets/JobWorkstationApp-qf-eaF94.js","/assets/citizenBridge-BcrDdR-T.js","/assets/BroadStreetCasePanel-7ZHkHJUE.js","/assets/RichMailEditor-D9l3W20h.js","/assets/ProcessMonitorApp-Bu5ThHYL.js","/assets/FinanceTerminal-BLG_v3ac.js","/assets/VitalsApp-CQGzdUAO.js","/assets/CampusApp-CevzVLn8.js","/assets/maidIdentityService-CURAujK-.js","/assets/StudyApp-C5lqTmkM.js","/assets/SpellForgeApp-DZii2vN4.js","/assets/AcademicProjectDesk-DUAkDh3m.js","/assets/FieldOperationsApp-Y9yC8na-.js","/assets/EvidenceBoard-DdtteW6v.js","/assets/RichTextEditor-qHqzPOQH.js","/assets/SongbirdAudioPlayer-D21iRzBK.js","/assets/BankingWorkspace-D3rjg3_g.js","/assets/useMedicalStore-j5LFiSUe.js","/assets/DispatchNewsSite-C4wVcTgE.js","/assets/SocialRegisterSite-Bw6nZgiu.js","/assets/EduSiteRouter-CGgUkw1Q.js","/assets/FaithMedSite-BVM_QLDT.js","/assets/EntertainmentSiteRouter-vby3wjzk.js","/assets/SuiteRoomScene-DASQq9G7.js","/assets/phaser.esm-BwSGr_Za.js","/assets/TunnelScene-BkWBLNlV.js"];
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
