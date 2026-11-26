const CACHE_NAME = "miraverse-shell-a35ba391dc5020d8";
const PRECACHE = ["/index.html","/manifest.json","/pwa-icon.svg","/favicon.ico","/images/Logo_Icon - 1.png","/images/wallpapers/aureline-city-beneath-the-heavens.png","/images/wallpapers/aureline-across-angel-bay.png","/images/wallpapers/aureline-glassline-twilight.png","/assets/index-BZ4mZ6Yx.css","/assets/App-DWEb1iKT.css","/assets/DgaosApp-DI_pN9Jn.css","/assets/DocumentStudioApp-CREEhC7N.css","/assets/RegistryWorkspaceApp-Dt2SnHHz.css","/assets/BrowserApp-Dtt4Mx05.css","/assets/versenet-browser-BRl5BbTr.css","/assets/SocialApp-U0RxSeJg.css","/assets/MediaTemplateRenderer-BmbpALb4.css","/assets/MailApp-7KCvz72B.css","/assets/PostalApp-DtLbvUqK.css","/assets/FileExplorerApp-DqJTaGmE.css","/assets/DocumentModal-BtUdRknX.css","/assets/LoreExplorer-dhR0VcYo.css","/assets/HousingApp-Dlsx0oUs.css","/assets/JobWorkstationApp-Bw2BuH_v.css","/assets/case-workspace-BnHXnJiX.css","/assets/ProcessMonitorApp-C_YaoY44.css","/assets/VitalsApp-CjunPQJt.css","/assets/StudyApp-B4J4BNHK.css","/assets/academics-pj7YXxGM.css","/assets/FieldOperationsApp-xvWNku50.css","/assets/EvidenceBoard-V3rltzWT.css","/assets/RichTextEditor-DZHZoGHi.css","/assets/BankingWorkspace-Cxz-6J_A.css","/assets/DispatchNewsSite-DG_9Np_i.css","/assets/publications-DoSz2nnA.css","/assets/EduSiteRouter-Q-356gDo.css","/assets/FaithMedSite-D9ZuOV4y.css","/assets/EntertainmentSiteRouter-U2wSZLlo.css","/assets/lucide-icons-aKmharIV.js","/assets/framer-motion-C1oor_IG.js","/assets/index-DpSjTEez.js","/assets/App-Bb89GeNQ.js","/assets/usePostalStore-CA1FYz_Y.js","/assets/DgaosApp-kffwhKjl.js","/assets/CommsApp-WkovVNpP.js","/assets/DocumentStudioApp-abOSZ1Ow.js","/assets/CreativeStudioApp-DllGGLE-.js","/assets/RegistryWorkspaceApp-CuO8o8n5.js","/assets/PortraitStudioModal-B3-oaNZD.js","/assets/CivicProfileApp-DIa1EF4w.js","/assets/citizenEvents-Ch6-1qqe.js","/assets/MaiSpaceApp-DKYUMqAQ.js","/assets/BrowserApp-DUXN81fK.js","/assets/versenet-browser-C8m577zJ.js","/assets/SocialApp-zRmNVwOp.js","/assets/MediaTemplateRenderer-CsoFAalp.js","/assets/MailApp-pe7Wj7AY.js","/assets/CommunicationsAccessPanel-CbjECl_Y.js","/assets/PostalApp-DiaEzDRn.js","/assets/FileExplorerApp-B2Jp-jZK.js","/assets/DocumentModal-CsT9rf0V.js","/assets/Form-B7sbskO4.js","/assets/LoreExplorer-BMrNX32T.js","/assets/HousingApp-Cua206_e.js","/assets/JobWorkstationApp-BEx_a-Ro.js","/assets/citizenBridge-BfdW8m7W.js","/assets/BroadStreetCasePanel-BONZM50H.js","/assets/RichMailEditor-j7WjV-Fb.js","/assets/ProcessMonitorApp-Baf2kBdx.js","/assets/FinanceTerminal-RpNZRi4-.js","/assets/VitalsApp-mbRDtC75.js","/assets/CampusApp-BfduNWK9.js","/assets/maidIdentityService-Bqd7PB64.js","/assets/StudyApp-p-n4wcRG.js","/assets/SpellForgeApp-BZpqiSLt.js","/assets/AcademicProjectDesk-p3wLT-r2.js","/assets/FieldOperationsApp-D73GFPpx.js","/assets/EvidenceBoard-DchLSCRU.js","/assets/RichTextEditor-o-3kzY53.js","/assets/SongbirdAudioPlayer-D6Z1w6jF.js","/assets/BankingWorkspace-wTntCSIy.js","/assets/useMedicalStore-Cms0Mb0f.js","/assets/DispatchNewsSite-B4WPKFBu.js","/assets/SocialRegisterSite-a9rChXNK.js","/assets/EduSiteRouter-DXwIXFc8.js","/assets/FaithMedSite-D3i92Tdx.js","/assets/EntertainmentSiteRouter-C1hCw8Pa.js","/assets/SuiteRoomScene-Cnv20MNS.js","/assets/phaser.esm-BwSGr_Za.js","/assets/TunnelScene-BguMpgWM.js"];
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
