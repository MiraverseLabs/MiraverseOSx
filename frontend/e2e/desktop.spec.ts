import { test, expect, type Page, type Locator } from '@playwright/test';

// Every test has a fresh browser context on a separate origin. Never touch the real save API.
test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Isolated offline browser test"}' }));
  await page.route(/^https:\/\//, route => route.abort());
});
async function login(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign In / Login Boot', exact: true }).click();
  await page.getByPlaceholder('e.g. CY-9021-PLAYER or admin').fill('admin');
  await page.getByRole('button', { name: 'START LOGIN BOOT', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open Orbit', exact: true })).toBeVisible();
}
async function openApp(page: Page, code: string) {
  await page.getByRole('button', { name: 'Open Orbit', exact: true }).click();
  await page.getByRole('button', { name: `Select ${code}`, exact: true }).dblclick();
}

async function saveCurrentTab(browser: Locator, name: string) {
  await browser.getByRole('button', { name: 'Browser library', exact: true }).click();
  const panel = browser.locator('.vn-library');
  await panel.getByRole('button', { name: 'Saved groups', exact: true }).click();
  await panel.getByRole('textbox', { name: 'New group name', exact: true }).fill(name);
  await panel.getByRole('button', { name: 'Create group and save this tab', exact: true }).click();
  await panel.getByRole('button', { name: 'Close browser library', exact: true }).click();
}
test('desktop apps open, maximize and retain appearance after reload', async ({ page }) => {
  const failures: string[] = []; page.on('pageerror', error => failures.push(error.message));
  await login(page);
  await openApp(page, 'SETTINGS');
  await page.getByLabel('System appearance', { exact: true }).selectOption('dark');
  await page.getByLabel('Interface density', { exact: true }).selectOption('comfortable');
  await expect(page.locator('html')).toHaveAttribute('data-mira-appearance', 'dark');
  await page.getByRole('button', { name: 'Maximize', exact: true }).click();
  await expect(page.locator('.os-window[data-app=settings]')).toHaveAttribute('data-maximized', 'true');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Open Orbit', exact: true })).toBeVisible();
  await openApp(page, 'SETTINGS');
  await expect(page.getByLabel('Interface density', { exact: true })).toHaveValue('comfortable');
  await expect(page.getByLabel('System appearance', { exact: true })).toHaveValue('dark');
  await openApp(page, 'WORKNET');
  await expect(page.getByRole('heading', { name: /Your work, in view/ })).toBeVisible();
  await page.setViewportSize({ width: 1024, height: 768 });
  await expect(page.locator('.os-window[data-app=jobs]')).toBeVisible();
  await expect(page.getByText('This app could not display its workspace.')).toHaveCount(0);
  expect(failures).toEqual([]);
});
test('browser opens its homepage after reopening and reload while retaining bookmarks', async ({ page }) => {
  await login(page); await openApp(page, 'VERSENET');
  const browser = page.locator('.os-window[data-app=browser]');
  const address = browser.getByRole('combobox', { name: 'Search VerseNet or enter a web address', exact: true });
  await address.fill('https://firstfederal.aure/maintenance');
  await address.press('Enter');
  await expect(address).toHaveValue('https://firstfederal.aure/maintenance');
  await browser.getByRole('button', { name: 'Bookmark this page', exact: true }).click();
  await browser.getByRole('button', { name: 'Close', exact: true }).click();
  await openApp(page, 'VERSENET');
  await expect(address).toHaveValue('https://versenet.aure');
  await page.reload(); await openApp(page, 'VERSENET');
  await expect(address).toHaveValue('https://versenet.aure');
  await browser.getByRole('button', { name: 'Browser library', exact: true }).click();
  const library = browser.locator('.vn-library');
  await library.getByRole('button', { name: 'Bookmarks', exact: true }).click();
  await expect(library.locator('.vn-library-item')).toHaveCount(1);
  await library.locator('.vn-library-item>button').first().click();
  await expect(address).toHaveValue('https://firstfederal.aure/maintenance');
  await expect(browser.getByRole('button', { name: 'Remove current bookmark', exact: true })).toBeVisible();
});

test('PULSE launcher opens The Meridian (Dispatch) website and preserves reading across reload', async ({ page }) => {
  await login(page);
  await page.evaluate(async () => {
    const { useOSStore } = await import('/src/store/useOSStore.ts' as string);
    useOSStore.getState().openAppWorkspace('pulse');
  });
  const browser = page.locator('.os-window[data-app=browser]');
  const address = browser.getByRole('combobox', { name: 'Search VerseNet or enter a web address', exact: true });
  await expect(address).toHaveValue('https://dispatch.mer');
  const news = browser.getByRole('region', { name: 'The Meridian', exact: true });
  await expect(news).toBeVisible();
  await news.getByRole('navigation', { name: 'News sections' }).getByRole('button', { name: 'Economy', exact: true }).click();
  await news.getByRole('searchbox', { name: 'Search news', exact: true }).fill('contract compensation');
  await news.getByRole('searchbox', { name: 'Search news', exact: true }).press('Enter');
  await expect(news.getByRole('button', { name: 'Before your next shift, read the terms', exact: true })).toBeVisible();
  await news.getByRole('button', { name: 'Before your next shift, read the terms', exact: true }).click();
  await expect(news.getByRole('article', { name: 'Before your next shift, read the terms', exact: true })).toBeVisible();
  await news.getByRole('button', { name: 'Save story', exact: true }).click();
  await expect(address).toHaveValue(/(?:dispatch|meridian)\.mer\/article\/employment-guide/);
  await saveCurrentTab(browser, 'News reading');
  await page.reload(); await openApp(page, 'VERSENET');
  await expect(address).toHaveValue('https://versenet.aure');
  await browser.getByRole('button', { name: 'Browser library', exact: true }).click();
  const library = browser.locator('.vn-library');
  await library.getByRole('button', { name: 'Saved groups', exact: true }).click();
  await library.getByRole('region', { name: 'Saved group News reading' }).getByRole('button', { name: /Article|Before your next shift|Dispatch|Meridian/i }).first().click();
  await expect(news.getByRole('article', { name: 'Before your next shift, read the terms', exact: true })).toBeVisible();
});

test('Dispatch keeps search context through saved views and supports keyboard navigation', async ({ page }) => {
  const failures: string[] = [];
  page.on('pageerror', error => failures.push(error.message));
  await login(page);
  await page.evaluate(async () => {
    const { useOSStore } = await import('/src/store/useOSStore.ts' as string);
    useOSStore.getState().openAppWorkspace('pulse');
  });
  const browser = page.locator('.os-window[data-app=browser]');
  const news = browser.getByRole('region', { name: 'The Meridian', exact: true });
  const address = browser.getByRole('combobox', { name: 'Search VerseNet or enter a web address', exact: true });
  await news.getByRole('navigation', { name: 'News sections' }).getByRole('button', { name: 'Economy', exact: true }).click();
  await news.getByRole('searchbox', { name: 'Search news', exact: true }).fill('contract compensation');
  await news.getByRole('searchbox', { name: 'Search news', exact: true }).press('Enter');
  await news.getByRole('button', { name: 'Save Before your next shift, read the terms', exact: true }).click();
  await news.getByRole('button', { name: /^Saved stories/ }).click();
  await expect(address).toHaveValue(/https:\/\/(?:dispatch|meridian)\.mer\/saved\?section=economy&q=contract\+compensation/);
  await expect(news.getByRole('searchbox', { name: 'Search news', exact: true })).toHaveValue('contract compensation');
  await news.getByRole('button', { name: /^Saved stories/ }).click();
  await expect(address).toHaveValue(/https:\/\/(?:dispatch|meridian)\.mer\/section\/economy\?q=contract\+compensation/);
  await address.fill('https://dispatch.mer/article/missing-story'); await address.press('Enter');
  await expect(news.getByRole('heading', { name: 'Story unavailable', exact: true })).toBeVisible();
  await news.getByRole('button', { name: 'Return to the front page', exact: true }).click();
  await expect(news).toBeVisible();
  expect(failures).toEqual([]);
});

test('news layouts remain readable in light and dark appearance and narrow windows', async ({ page }) => {
  await login(page);
  async function appearance(value: string) {
    await openApp(page, 'SETTINGS');
    await page.getByLabel('System appearance', { exact: true }).selectOption(value);
    await page.locator('.os-window[data-app=settings]').getByRole('button', { name: 'Close', exact: true }).click();
  }
  await appearance('light');
  await page.evaluate(async () => {
    const { useOSStore } = await import('/src/store/useOSStore.ts' as string);
    useOSStore.getState().openAppWorkspace('pulse');
  });
  const browser = page.locator('.os-window[data-app=browser]');
  await browser.getByRole('button', { name: 'Maximize', exact: true }).click();
  const news = browser.getByRole('region', { name: 'The Meridian', exact: true });
  await expect(news).toBeVisible();
  expect(await news.evaluate(element => element.scrollWidth <= element.clientWidth + 2)).toBe(true);
  await page.setViewportSize({ width: 760, height: 900 });
  expect(await news.evaluate(element => element.scrollWidth <= element.clientWidth + 2)).toBe(true);
});

test('VerseNet website directory filters and navigates cleanly across reload', async ({ page }) => {
  await login(page); await openApp(page, 'VERSENET');
  const browser = page.locator('.os-window[data-app=browser]');
  await browser.getByRole('link', { name: 'Directory', exact: true }).click();
  const search = browser.getByRole('searchbox', { name: 'Find a website' });
  await expect(search).toBeVisible();
  await search.fill('Dawn');
  await search.press('Enter');
  await expect(browser.locator('.vn-destination-row')).toHaveCount(1);
  await browser.locator('.vn-destination-row a').first().click();
  await expect(browser.locator('.edu-shell h1')).toHaveText('Dawn University');
});

test('MAI.SPACE layer sorting is keyboard accessible and draft order survives reopening', async ({ page }) => {
  await login(page); await openApp(page, 'mai.space');
  await page.getByRole('button', { name: '✧ Customize', exact: true }).click();
  await page.getByText('Layer order', { exact: true }).click();
  const list = page.getByRole('list', { name: 'Profile section layer order' });
  const before = await list.getByRole('listitem').allTextContents();
  const handle = list.getByRole('button', { name: 'Reorder Profile', exact: true });
  await handle.focus(); await handle.press('Space');
  await expect(handle).toHaveAttribute('aria-pressed', 'true');
  await handle.press('ArrowDown');
  await expect(page.getByRole('status').filter({ hasText: 'moved over droppable area module-1' })).toBeVisible();
  await handle.press('Space');
  await expect.poll(() => list.getByRole('listitem').allTextContents()).not.toEqual(before);
  const after = await list.getByRole('listitem').allTextContents();
  await page.reload(); await openApp(page, 'mai.space');
  await page.getByRole('button', { name: '✧ Customize', exact: true }).click();
  await page.getByText('Layer order', { exact: true }).click();
  await expect(page.getByRole('list', { name: 'Profile section layer order' }).getByRole('listitem')).toHaveText(after);
});
test('evidence board connects sources, reopens originals and removes player hypotheses', async ({ page }) => {
  await page.goto('http://127.0.0.1:6006/iframe.html?id=miraverse-evidence-board--acquired-sources&viewMode=story');
  await page.getByRole('combobox', { name: 'From', exact: true }).selectOption('audit');
  await page.getByRole('combobox', { name: 'To', exact: true }).selectOption('statement');
  await page.getByLabel('Connection note', { exact: true }).fill('Compare timestamps');
  await page.getByRole('button', { name: 'Connect sources', exact: true }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'Compare timestamps' })).toBeVisible();
  await page.getByRole('button', { name: 'Open original source', exact: true }).first().click();
  await expect(page.getByText('Original reader requested: audit', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Remove connection Compare timestamps', exact: true }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'Compare timestamps' })).toHaveCount(0);
});
test('Broad Street board uses acquired sources and restores player connections after reload', async ({ page }) => {
  await login(page); await openApp(page, 'WORKNET');
  const worknet=page.locator('.os-window[data-app=jobs]');
  await worknet.getByRole('button',{name:'Maximize',exact:true}).click();
  await worknet.getByRole('button',{name:'Opportunities',exact:true}).click();
  await page.getByRole('searchbox',{name:'Search opportunities',exact:true}).fill('Broad Street');
  await page.getByRole('button',{name:'Review assignment & employment terms',exact:true}).click();
  await page.getByRole('button',{name:'Accept Broad Street assignment',exact:true}).click();
  await page.getByRole('button',{name:'I’ve read the briefing · begin investigation',exact:true}).click();
  for (const title of ['Vault access audit','HVAC thermal and smoke record']) {
    await page.locator('.os-window[data-active=true] .case-source-grid article').filter({has:page.getByRole('heading',{name:title,exact:true})}).getByRole('button',{name:'Open original source',exact:true}).click();
    const original=page.getByRole('region',{name:title,exact:true});
    await original.getByRole('button',{name:'Acquire source for case notebook',exact:true}).click();
    await original.getByRole('button',{name:'Open DGAOS evidence notebook',exact:true}).click();
    await expect(page.getByRole('region',{name:'Broad Street evidence board',exact:true})).toBeVisible();
  }
  const board=page.getByRole('region',{name:'Broad Street evidence board',exact:true});
  await expect(board.locator('.react-flow__node')).toHaveCount(2);
  await board.getByRole('combobox',{name:'From',exact:true}).selectOption('access-audit');
  await board.getByRole('combobox',{name:'To',exact:true}).selectOption('thermal-log');
  await board.getByLabel('Connection note',{exact:true}).fill('Compare original timestamps');
  await board.getByRole('button',{name:'Connect sources',exact:true}).click();
  await expect(board.getByRole('listitem').filter({hasText:'Compare original timestamps'})).toBeVisible();
  await page.reload(); await openApp(page,'DGAOS');
  await page.getByRole('button',{name:'UNLOCK DGA COMMAND SHELL',exact:true}).click();
  await page.getByRole('button',{name:'Case notebook',exact:true}).click();
  await expect(page.getByRole('region',{name:'Broad Street evidence board',exact:true}).getByRole('listitem').filter({hasText:'Compare original timestamps'})).toBeVisible();
  await page.locator('.os-window[data-app=dgaos]').getByRole('button',{name:'Maximize',exact:true}).click();
  await page.getByRole('region',{name:'Broad Street evidence board',exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:'../output/previews/tools-evidence-board.png',fullPage:false});
});
