import { BROWSER_HOME, MAX_BROWSER_TABS, browserTitle, resolveBrowserInput, recordBrowserVisit, restartBrowserSession } from '../apps/Browser/browserModel';

export function createBrowserActions(set: any, get: any) {
  const open = (input = BROWSER_HOME, title?: string, reuse = false) => {
    const current = get().browserState;
    const resolved = resolveBrowserInput(input);
    if (reuse && current.tabs.length >= MAX_BROWSER_TABS && !current.tabs.some((tab: any) => tab.url === resolved)) {
      const ordinary = current.tabs.find((tab: any) => !tab.groupId);
      if (ordinary) get().setActiveBrowserTab(ordinary.id);
      get().navigateBrowserTab(resolved, title);
      return;
    }
    set((s: any) => {
    const state = s.browserState; const url = resolveBrowserInput(input);
    const existing = reuse && state.tabs.find((tab: any) => tab.url === url);
    if (existing) return { browserUrl: url, browserState: { ...state, activeTabId: existing.id } };
    if (state.tabs.length >= MAX_BROWSER_TABS) return {};
    const id = state.nextTabId;
    return { browserUrl: url, browserState: { ...state, tabs: [...state.tabs, { id, url, title: title || browserTitle(url) }], activeTabId: id, nextTabId: id + 1, historyMap: { ...state.historyMap, [id]: { stack: [url], index: 0 } }, visits: recordBrowserVisit(state, url) } };
    });
  };
  const travel = (offset: number) => set((s: any) => {
    const state = s.browserState; const id = state.activeTabId; const history = state.historyMap[id]; const index = history?.index + offset;
    if (!history || index < 0 || index >= history.stack.length) return {};
    const url = history.stack[index];
    return { browserUrl: url, browserState: { ...state, tabs: state.tabs.map((tab: any) => tab.id === id ? { ...tab, url, title: browserTitle(url) } : tab), historyMap: { ...state.historyMap, [id]: { ...history, index } }, visits: recordBrowserVisit(state, url) } };
  });
  return {
    goBrowserHome: () => {
      const state = get().browserState;
      const home = state.tabs.find((tab: any) => !tab.groupId && tab.url === BROWSER_HOME);
      if (home) { get().setActiveBrowserTab(home.id); return; }
      if (state.tabs.length < MAX_BROWSER_TABS) { open(BROWSER_HOME); return; }
      const ordinary = state.tabs.find((tab: any) => !tab.groupId);
      if (ordinary) { get().setActiveBrowserTab(ordinary.id); get().navigateBrowserTab(BROWSER_HOME); }
    },
    createBrowserTabGroup: (name: string) => {
      const state = get().browserState;
      const trimmed = typeof name === 'string' ? name.trim().slice(0, 40) : '';
      if (!trimmed) return { ok: false, message: 'Enter a group name.' };
      if (state.groups.length >= 20) return { ok: false, message: 'You can save up to 20 tab groups.' };
      if (state.groups.some((group: any) => group.name.toLowerCase() === trimmed.toLowerCase())) return { ok: false, message: 'A group with that name already exists.' };
      const tab = state.tabs.find((item: any) => item.id === state.activeTabId);
      if (!tab?.groupId && state.tabs.filter((item: any) => item.groupId).length >= MAX_BROWSER_TABS - 1) return { ok: false, message: `You can save ${MAX_BROWSER_TABS - 1} grouped tabs. One place is reserved for the homepage.` };
      const id = `group-${crypto.randomUUID()}`;
      set((s: any) => ({ browserState: { ...s.browserState, groups: [...s.browserState.groups, { id, name: trimmed }], tabs: s.browserState.tabs.map((item: any) => item.id === tab.id ? { ...item, groupId: id } : item) } }));
      return { ok: true, message: `Saved this tab in ${trimmed}.` };
    },
    setBrowserTabGroup: (tabId: number, groupId?: string) => {
      const state = get().browserState;
      const tab = state.tabs.find((item: any) => item.id === tabId);
      if (!tab || (groupId && !state.groups.some((group: any) => group.id === groupId))) return { ok: false, message: 'Choose an existing tab and group.' };
      if (groupId && !tab.groupId && state.tabs.filter((item: any) => item.groupId).length >= MAX_BROWSER_TABS - 1) return { ok: false, message: `You can save ${MAX_BROWSER_TABS - 1} grouped tabs. One place is reserved for the homepage.` };
      set((s: any) => ({ browserState: { ...s.browserState, tabs: s.browserState.tabs.map((item: any) => item.id === tabId ? { ...item, groupId } : item) } }));
      return { ok: true, message: groupId ? 'Tab saved to the group.' : 'Tab removed from its saved group. It will close at the end of this session.' };
    },
    renameBrowserTabGroup: (id: string, name: string) => {
      const trimmed = typeof name === 'string' ? name.trim().slice(0, 40) : '';
      const groups = get().browserState.groups;
      if (!trimmed || !groups.some((group: any) => group.id === id)) return { ok: false, message: 'Enter a name for an existing group.' };
      if (groups.some((group: any) => group.id !== id && group.name.toLowerCase() === trimmed.toLowerCase())) return { ok: false, message: 'A group with that name already exists.' };
      set((s: any) => ({ browserState: { ...s.browserState, groups: s.browserState.groups.map((group: any) => group.id === id ? { ...group, name: trimmed } : group) } }));
      return { ok: true, message: 'Group renamed.' };
    },
    removeBrowserTabGroup: (id: string) => set((s: any) => ({ browserState: { ...s.browserState, groups: s.browserState.groups.filter((group: any) => group.id !== id), tabs: s.browserState.tabs.map((tab: any) => tab.groupId === id ? { ...tab, groupId: undefined } : tab) } })),
    setBrowserUrl: (url: string | null) => url ? open(url, undefined, true) : set({ browserUrl: null }),
    openBrowserTab: (url?: string, title?: string) => open(url, title),
    closeBrowserTab: (id: number) => set((s: any) => {
      const state = s.browserState; const index = state.tabs.findIndex((tab: any) => tab.id === id);
      if (index < 0) return {};
      if (state.tabs.length === 1) {
        if (!state.tabs[0].groupId) return {};
        const browserState = restartBrowserSession({ ...state, tabs: [] });
        return { browserState, browserUrl: BROWSER_HOME };
      }
      const tabs = state.tabs.filter((tab: any) => tab.id !== id); const historyMap = { ...state.historyMap }; delete historyMap[id];
      const activeTabId = state.activeTabId === id ? tabs[Math.min(index, tabs.length - 1)].id : state.activeTabId;
      return { browserUrl: tabs.find((tab: any) => tab.id === activeTabId).url, browserState: { ...state, tabs, activeTabId, historyMap } };
    }),
    setActiveBrowserTab: (id: number) => set((s: any) => {
      const tab = s.browserState.tabs.find((tab: any) => tab.id === id);
      return tab ? { browserUrl: tab.url, browserState: { ...s.browserState, activeTabId: id } } : {};
    }),
    navigateBrowserTab: (input: string, title?: string) => set((s: any) => {
      const state = s.browserState; const id = state.activeTabId; const url = resolveBrowserInput(input); const history = state.historyMap[id];
      if (!history || history.stack[history.index] === url) return {};
      const stack = [...history.stack.slice(0, history.index + 1), url].slice(-100);
      return { browserUrl: url, browserState: { ...state, tabs: state.tabs.map((tab: any) => tab.id === id ? { ...tab, url, title: title || browserTitle(url) } : tab), historyMap: { ...state.historyMap, [id]: { stack, index: stack.length - 1 } }, visits: recordBrowserVisit(state, url) } };
    }),
    goBrowserBack: () => travel(-1), goBrowserForward: () => travel(1),
    toggleBrowserBookmark: () => set((s: any) => {
      const state = s.browserState; const tab = state.tabs.find((tab: any) => tab.id === state.activeTabId);
      if (!tab) return {};
      const exists = state.bookmarks.some((item: any) => item.url === tab.url);
      return { browserState: { ...state, bookmarks: exists ? state.bookmarks.filter((item: any) => item.url !== tab.url) : [...state.bookmarks, { url: tab.url, title: browserTitle(tab.url) }].slice(-100) } };
    }),
    removeBrowserBookmark: (url: string) => set((s: any) => ({ browserState: { ...s.browserState, bookmarks: s.browserState.bookmarks.filter((item: any) => item.url !== url) } })),
    clearBrowserHistory: () => set((s: any) => ({ browserState: { ...s.browserState, visits: [], historyMap: Object.fromEntries(s.browserState.tabs.map((tab: any) => [tab.id, { stack: [tab.url], index: 0 }])) } })),
  };
}
