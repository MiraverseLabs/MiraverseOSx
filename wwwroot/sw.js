const CACHE_NAME = "miraverse-shell-c7a8a701f67698b9";
const PRECACHE = ["/index.html","/manifest.json","/pwa-icon.svg","/favicon.ico","/images/Logo_Icon - 1.png","/images/wallpapers/aureline-city-beneath-the-heavens.png","/images/wallpapers/aureline-across-angel-bay.png","/images/wallpapers/aureline-glassline-twilight.png","/assets/index-CBky5L2j.css","/assets/App-DWEb1iKT.css","/assets/DgaosApp-DI_pN9Jn.css","/assets/DocumentStudioApp-CREEhC7N.css","/assets/RegistryWorkspaceApp-Dt2SnHHz.css","/assets/BrowserApp-Dtt4Mx05.css","/assets/versenet-browser-BRl5BbTr.css","/assets/SocialApp-U0RxSeJg.css","/assets/MediaTemplateRenderer-BmbpALb4.css","/assets/MailApp-7KCvz72B.css","/assets/PostalApp-DtLbvUqK.css","/assets/FileExplorerApp-DqJTaGmE.css","/assets/DocumentModal-BtUdRknX.css","/assets/LoreExplorer-dhR0VcYo.css","/assets/HousingApp-Dlsx0oUs.css","/assets/JobWorkstationApp-Bw2BuH_v.css","/assets/case-workspace-BnHXnJiX.css","/assets/ProcessMonitorApp-C_YaoY44.css","/assets/VitalsApp-CjunPQJt.css","/assets/StudyApp-B4J4BNHK.css","/assets/academics-pj7YXxGM.css","/assets/FieldOperationsApp-xvWNku50.css","/assets/EvidenceBoard-V3rltzWT.css","/assets/RichTextEditor-DZHZoGHi.css","/assets/BankingWorkspace-Cxz-6J_A.css","/assets/DispatchNewsSite-DG_9Np_i.css","/assets/publications-DoSz2nnA.css","/assets/EduSiteRouter-Q-356gDo.css","/assets/FaithMedSite-D9ZuOV4y.css","/assets/EntertainmentSiteRouter-U2wSZLlo.css","/assets/lucide-icons-aKmharIV.js","/assets/framer-motion-C1oor_IG.js","/assets/index-CwX3O7Gg.js","/assets/App-Cq_MhTqQ.js","/assets/usePostalStore-DEHYPRWI.js","/assets/DgaosApp-Dd1AvEMr.js","/assets/CommsApp-BQpqldd2.js","/assets/DocumentStudioApp-OXITDDzh.js","/assets/CreativeStudioApp-f4QKG4s-.js","/assets/RegistryWorkspaceApp-Dg-eSXeF.js","/assets/PortraitStudioModal-DBxIP2lA.js","/assets/CivicProfileApp-Bc9Otkx6.js","/assets/citizenEvents-Ch6-1qqe.js","/assets/MaiSpaceApp-CtKlb9u0.js","/assets/BrowserApp-C8gGYA9A.js","/assets/versenet-browser-o1xl1Nrm.js","/assets/SocialApp-D1CzVF4h.js","/assets/MediaTemplateRenderer-BV27C0Fk.js","/assets/MailApp-CLPotjOW.js","/assets/CommunicationsAccessPanel-cdCLpUl6.js","/assets/PostalApp-CGzJQ23L.js","/assets/FileExplorerApp-DThboTdH.js","/assets/DocumentModal-j62DTMNt.js","/assets/Form-B7sbskO4.js","/assets/LoreExplorer-ZitNaUto.js","/assets/HousingApp-CfXhH6Z5.js","/assets/JobWorkstationApp-CdhFOQsj.js","/assets/citizenBridge-CVxxVaGB.js","/assets/BroadStreetCasePanel-Ck1jgz4z.js","/assets/RichMailEditor-9IuIwut1.js","/assets/ProcessMonitorApp-D66QYuhe.js","/assets/FinanceTerminal-Bfrlyouo.js","/assets/VitalsApp-0cbqrP4o.js","/assets/CampusApp-BS4Sj3bB.js","/assets/maidIdentityService-DP2czU2V.js","/assets/StudyApp-BUWV_v4G.js","/assets/SpellForgeApp-D3qKThoL.js","/assets/AcademicProjectDesk-s9M0PJxf.js","/assets/FieldOperationsApp-Bk1rpRfe.js","/assets/EvidenceBoard-ARVvqm2S.js","/assets/RichTextEditor-znZR1KUv.js","/assets/SongbirdAudioPlayer-CMvL7NxH.js","/assets/BankingWorkspace-DlYaRAFi.js","/assets/useMedicalStore-BIM5QXJb.js","/assets/DispatchNewsSite-B93MA9Bc.js","/assets/SocialRegisterSite-sOGQH7o8.js","/assets/EduSiteRouter-DyCZutTy.js","/assets/FaithMedSite-N69AZWsp.js","/assets/EntertainmentSiteRouter-CKd8czIT.js","/assets/SuiteRoomScene-DkPtdiP7.js","/assets/phaser.esm-BwSGr_Za.js","/assets/TunnelScene-CoddYSWh.js"];
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
