import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
registerHooks({ resolve(specifier, context, next) { try { return next(specifier, context); } catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND' || !specifier.startsWith('.')) throw error; return next(`${specifier}.ts`, context); } } });
const { BROWSER_HOME, MAX_BROWSER_TABS, STARTER_SITES, resolveBrowserInput, restoreBrowserState } = await import('../src/apps/Browser/browserModel.ts');
let sequence = 0;
function storage() { const values = new Map(); globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; return values; }
async function fresh() { return (await import(`../src/store/useOSStore.ts?browser=${sequence++}`)).useOSStore; }

test('addresses normalize and unsupported schemes become inert network searches', () => {
  assert.equal(resolveBrowserInput('  WORKNET.AURE/  '), 'https://worknet.aure');
  assert.equal(resolveBrowserInput('medical work'), `${BROWSER_HOME}/find?q=medical%20work`);
  assert.match(resolveBrowserInput('javascript:alert(1)'), /find\?q=/);
  assert.match(resolveBrowserInput('https://user:secret@worknet.aure'), /find\?q=/);
  assert.equal(STARTER_SITES.length, 5);
  assert.equal(new Set(STARTER_SITES.map(site => site.domain)).size, 5);
});

test('tabs are independent, have one shared limit, and clean up when closed', async () => {
  storage(); const store = await fresh(); const actions = store.getState();
  actions.openBrowserTab(); actions.openBrowserTab();
  assert.equal(store.getState().browserState.tabs.length, 3, 'new tab must create another home page');
  const closed = store.getState().browserState.activeTabId;
  actions.navigateBrowserTab('worknet.aure'); actions.closeBrowserTab(closed);
  assert.equal(store.getState().browserState.historyMap[closed], undefined);
  assert.equal(store.getState().browserState.tabs.find(tab => tab.id === store.getState().browserState.activeTabId).url, BROWSER_HOME);
  actions.setActiveBrowserTab(-1); actions.closeBrowserTab(-1);
  assert.equal(store.getState().browserState.tabs.length, 2);
  for (let index = 0; index < 15; index++) actions.openBrowserTab();
  assert.equal(store.getState().browserState.tabs.length, MAX_BROWSER_TABS);
  actions.setBrowserUrl('faithmed.aure');
  assert.equal(store.getState().browserUrl, 'https://faithmed.aure');
  assert.equal(store.getState().browserState.tabs.length, MAX_BROWSER_TABS);
});

test('back/forward restore titles and a new route drops only the forward branch', async () => {
  storage(); const store = await fresh(); const actions = store.getState();
  actions.navigateBrowserTab('worknet.aure'); actions.navigateBrowserTab('faithmed.aure'); actions.goBrowserBack();
  assert.equal(store.getState().browserState.tabs[0].title, 'WorkNet');
  actions.goBrowserForward(); assert.equal(store.getState().browserState.tabs[0].title, 'Faith Medical Group');
  actions.goBrowserBack(); actions.navigateBrowserTab('civinet.mer'); actions.goBrowserForward();
  assert.equal(store.getState().browserState.tabs[0].title, 'Citizen Hub');
  actions.navigateBrowserTab('civinet.mer');
  assert.deepEqual(store.getState().browserState.historyMap[1].stack, [BROWSER_HOME, 'https://worknet.aure', 'https://civinet.mer']);
});

test('only grouped tabs survive hydration; the homepage opens while bookmarks, history and gameplay remain', async () => {
  const values = storage(); const store = await fresh();
  store.getState().loginUser({ name: 'Browser tester', credits: 500 });
  store.getState().navigateBrowserTab('cyacademy.edu'); store.getState().toggleBrowserBookmark();
  assert.equal(store.getState().createBrowserTabGroup('Research').ok, true);
  store.getState().openBrowserTab('worknet.aure');
  const saved = JSON.parse(values.get('miraverse-os-progress')).state.browserState;
  assert.equal(saved.tabs.some(tab => tab.url === 'https://worknet.aure'), false);
  assert.equal(saved.tabs.some(tab => tab.url === 'https://cyacademy.edu'), true);
  const reloaded = await fresh();
  assert.equal(reloaded.getState().gameplay.player.name, 'Browser tester');
  assert.equal(reloaded.getState().browserState.bookmarks[0].url, 'https://cyacademy.edu');
  assert.equal(reloaded.getState().browserState.tabs.length, 2);
  assert.equal(reloaded.getState().browserUrl, BROWSER_HOME);
  assert.equal(reloaded.getState().browserState.groups[0].name, 'Research');
  assert.equal(reloaded.getState().browserState.tabs.some(tab => tab.url === 'https://worknet.aure'), false);
  assert.equal(reloaded.getState().browserState.visits[0].url, 'https://worknet.aure');
  reloaded.getState().setActiveBrowserTab(1); reloaded.getState().toggleBrowserBookmark();
  assert.equal(reloaded.getState().browserState.bookmarks.length, 0);
});

test('clearing history removes visit records and tab stacks while preserving bookmarks', async () => {
  storage(); const store = await fresh();
  store.getState().navigateBrowserTab('worknet.aure'); store.getState().toggleBrowserBookmark(); store.getState().navigateBrowserTab('civinet.mer');
  store.getState().clearBrowserHistory(); store.getState().goBrowserBack();
  const state = (await fresh()).getState().browserState;
  assert.equal(state.visits.length, 0);
  assert.equal(state.bookmarks.length, 1);
  assert.deepEqual(state.historyMap[state.activeTabId], { stack: [BROWSER_HOME], index: 0 });
});

test('old and partially malformed saves recover to usable navigation', () => {
  assert.equal(restoreBrowserState(undefined).tabs[0].url, BROWSER_HOME);
  const recovered = restoreBrowserState({ tabs: [{ id: 7, url: 'worknet.aure' }, { id: 7, url: 'bad.aure' }], activeTabId: 99, historyMap: { 7: { stack: [], index: 50 } }, bookmarks: [null, { url: 'faithmed.aure' }], visits: [{ url: 'worknet.aure', visitedAt: 'bad' }] });
  assert.equal(recovered.tabs.length, 1); assert.equal(recovered.activeTabId, 1);
  assert.equal(recovered.nextTabId, 8); assert.deepEqual(recovered.historyMap[1], { stack: [BROWSER_HOME], index: 0 });
  assert.equal(recovered.bookmarks.length, 1); assert.equal(recovered.visits.length, 0);
});

test('explicit inter-app links open their destination, while a fresh session opens the homepage', async () => {
  storage(); const store = await fresh();
  store.getState().setBrowserUrl('https://firstfederal.aure/maintenance');
  store.getState().openAppWorkspace('browser');
  assert.equal(store.getState().browserUrl, 'https://firstfederal.aure/maintenance');
  store.getState().openAppWorkspace('browser');
  store.getState().closeWindow('browser');
  store.getState().openAppWorkspace('browser');
  assert.equal(store.getState().browserUrl, BROWSER_HOME);
  const reloaded = (await fresh()).getState();
  assert.equal(reloaded.browserUrl, BROWSER_HOME);
  assert.equal(reloaded.browserState.tabs.find(tab => tab.id === reloaded.browserState.activeTabId).url, reloaded.browserUrl);
  assert.deepEqual(reloaded.browserState.bookmarks, []);
});

test('groups can be renamed and removed; Home never replaces a saved group page', async () => {
  storage(); const store = await fresh(); const a = store.getState();
  a.openAppWorkspace('browser'); a.navigateBrowserTab('dawn.edu');
  assert.equal(a.createBrowserTabGroup(' ').ok, false);
  assert.equal(a.createBrowserTabGroup('Study').ok, true);
  const group = store.getState().browserState.groups[0];
  const savedTab = store.getState().browserState.activeTabId;
  assert.equal(a.createBrowserTabGroup('study').ok, false);
  assert.equal(a.renameBrowserTabGroup(group.id, 'Universities').ok, true);
  a.goBrowserHome();
  assert.equal(store.getState().browserUrl, BROWSER_HOME);
  assert.equal(store.getState().browserState.tabs.find(t => t.id === savedTab).url, 'https://dawn.edu');
  a.navigateBrowserTab('faithmed.aure');
  assert.equal(a.setBrowserTabGroup(store.getState().browserState.activeTabId, group.id).ok, true);
  a.closeWindow('browser'); a.openAppWorkspace('browser');
  assert.equal(store.getState().browserUrl, BROWSER_HOME);
  assert.equal(store.getState().browserState.tabs.filter(t => t.groupId === group.id).length, 2);
  a.removeBrowserTabGroup(group.id);
  assert.equal(store.getState().browserState.tabs.filter(t => t.groupId).length, 0);
  a.closeWindow('browser');
  assert.deepEqual(store.getState().browserState.tabs.map(t => t.url), [BROWSER_HOME]);
});

test('minimizing or switching apps retains live tabs, but closing or logging out drops ordinary tabs', async () => {
  storage(); const store = await fresh(); const a = store.getState();
  a.openAppWorkspace('browser'); a.navigateBrowserTab('dawn.edu');
  a.toggleMinimize('browser'); a.openAppWorkspace('browser');
  assert.equal(store.getState().browserUrl, 'https://dawn.edu');
  a.openAppWorkspace('mail'); a.closeWindow('mail');
  assert.equal(store.getState().browserUrl, 'https://dawn.edu');
  a.openAppWorkspace('browser', 'https://bank.aure');
  a.logoutUser();
  assert.equal(store.getState().browserUrl, BROWSER_HOME);
  assert.equal(store.getState().browserState.tabs.length, 1);
  assert.equal(store.getState().workspaceRequests.browser, undefined);
});

test('saved tab limits leave room for the homepage and external links never replace a saved page at capacity', async () => {
  storage(); const store = await fresh(); const a = store.getState();
  a.navigateBrowserTab('dawn.edu'); a.createBrowserTabGroup('Research');
  const group = store.getState().browserState.groups[0];
  for (let i = 1; i < MAX_BROWSER_TABS - 1; i++) {
    a.openBrowserTab(`https://dawn.edu/courses?entry=${i}`);
    assert.equal(a.setBrowserTabGroup(store.getState().browserState.activeTabId, group.id).ok, true);
  }
  a.openBrowserTab('bank.aure');
  assert.equal(a.setBrowserTabGroup(store.getState().browserState.activeTabId, group.id).ok, false);
  assert.equal(a.createBrowserTabGroup('One too many').ok, false);
  const savedId = store.getState().browserState.tabs.find(t => t.groupId).id;
  a.setActiveBrowserTab(savedId); a.setBrowserUrl('faithmed.aure');
  assert.equal(store.getState().browserState.tabs.find(t => t.id === savedId).url, 'https://dawn.edu');
  a.closeWindow('browser');
  assert.equal(store.getState().browserState.tabs.length, MAX_BROWSER_TABS);
  assert.equal(store.getState().browserUrl, BROWSER_HOME);
  assert.equal(store.getState().browserState.tabs.filter(t => !t.groupId).length, 1);
});

test('invalid saved groups and foreign memberships cannot resurrect ordinary tabs', () => {
  const recovered = restoreBrowserState({
    groups: [{ id: '__proto__', name: 'Invalid' }, { id: 'group-study', name: ' Study ' }, { id: 'group-study', name: 'Duplicate' }],
    tabs: [{ id: 1, url: 'dawn.edu', groupId: 'group-study' }, { id: 2, url: 'bank.aure', groupId: 'group-missing' }],
    activeTabId: 1,
  });
  assert.deepEqual(recovered.groups, [{ id: 'group-study', name: 'Study' }]);
  assert.deepEqual(recovered.tabs.map(t => t.url), [BROWSER_HOME, 'https://dawn.edu']);
  assert.equal(recovered.tabs.find(t => t.id === recovered.activeTabId).url, BROWSER_HOME);
});
