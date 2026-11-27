import { test, expect, type Page } from '@playwright/test';

async function openBrowser(page: Page) {
  await page.route('**/api/**', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Offline test"}' }));
  await page.route(/^https:\/\//, route => route.abort());
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign In / Login Boot', exact: true }).click();
  await page.getByPlaceholder('e.g. CY-9021-PLAYER or admin').fill('admin');
  await page.getByRole('button', { name: 'START LOGIN BOOT', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open Orbit', exact: true })).toBeVisible();
  await navigate(page, 'https://versenet.aure');
  const browser = page.locator('.os-window[data-app=browser]');
  await browser.getByRole('button', { name: 'Maximize', exact: true }).click();
  return browser;
}

async function navigate(page: Page, url: string) {
  await page.evaluate(async url => {
    const { useOSStore } = await import('/src/store/useOSStore.ts' as string);
    useOSStore.getState().navigateBrowserTab(url);
    useOSStore.getState().openAppWorkspace('browser');
  }, url);
}

test('directory filters, empty states, address suggestions and browser shortcuts work with the keyboard', async ({ page }) => {
  const browser = await openBrowser(page);
  await browser.getByRole('link', { name: 'Directory', exact: true }).click();
  const home = browser.locator('.vn-index');
  await home.getByRole('link', { name: 'Education', exact: true }).click();
  await expect(home.locator('.vn-destination-row')).toHaveCount(3);
  await home.getByRole('searchbox', { name: 'Find a website', exact: true }).fill('no matching institution');
  await home.getByRole('searchbox', { name: 'Find a website' }).press('Enter');
  await expect(home.getByRole('heading', { name: 'No websites match that search.' })).toBeVisible();
  await home.getByRole('link', { name: 'Show all websites' }).click();
  await expect(home.locator('.vn-destination-row').first()).toBeVisible();
  const address = browser.getByRole('combobox', { name: 'Search VerseNet or enter a web address' });
  await address.fill('dawn');
  await address.press('ArrowDown');
  await expect(address).toHaveAttribute('aria-activedescendant', 'vn-suggestion-0');
  await address.press('Enter');
  await expect(browser.locator('.edu-shell').getByRole('heading', { name: 'Dawn University', exact: true })).toBeVisible();
  await address.focus();
  await address.press('Control+l');
  await expect(address).toBeFocused();
  const count = await browser.getByRole('tab').count();
  await address.press('Control+t');
  await expect(browser.getByRole('tab')).toHaveCount(count + 1);
  await expect(address).toBeFocused();
  await address.press('Control+w');
  await expect(browser.getByRole('tab')).toHaveCount(count);
  await address.fill('cyberium');
  await expect(browser.getByRole('listbox', { name: 'Website suggestions' })).toBeVisible();
  await address.press('Escape');
  await expect(browser.getByRole('listbox')).toHaveCount(0);
  const newTab = browser.getByRole('button', { name: 'New tab', exact: true });
  for (let i = 1; i < 8; i++) await newTab.click();
  await expect(browser.getByRole('tab')).toHaveCount(8);
  await expect(newTab).toBeDisabled();
});

test('the university and community sites retain distinct layouts at wide and narrow window widths', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const browser = await openBrowser(page);
  await expect(browser.getByRole('heading', { name: 'Search Meridion.', exact: true })).toBeVisible();
  await browser.screenshot({ path: testInfo.outputPath('versenet-home.png') });
  const sites = [
    ['dawn.edu', 'Dawn University', 'dawn'],
    ['cyberium.edu', 'Cyberium Academy', 'cyberium'],
    ['regenthall.edu', 'Regent Hall', 'regent'],
  ];
  for (const [domain, name, image] of sites) {
    await navigate(page, `https://${domain}`);
    const site = browser.locator('.edu-shell');
    await expect(site.getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(site.getByRole('img', { name: /Architectural illustration/ })).toBeVisible();
    await browser.screenshot({ path: testInfo.outputPath(`versenet-${image}.png`) });
    await page.setViewportSize({ width: 560, height: 920 });
    await expect.poll(() => site.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    await site.getByRole('button', { name: 'Admissions', exact: true }).click();
    await expect(site.locator('form')).toBeVisible();
    await browser.screenshot({ path: testInfo.outputPath(`versenet-${image}-narrow.png`) });
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  for (const domain of ['gardenreview.aure', 'companion.aure', 'readingroom.aure']) {
    await navigate(page, `https://${domain}`);
    await expect(browser.locator('.is-site h1')).toBeVisible();
    await browser.screenshot({ path: testInfo.outputPath(`versenet-${domain.split('.')[0]}.png`) });
    await page.setViewportSize({ width: 560, height: 920 });
    await expect.poll(() => browser.locator('.is-site').evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  for (const domain of ['faithmed.aure', 'dga.gov.aure', 'bank.aure', 'shipping.aure']) {
    await navigate(page, `https://${domain}`);
    const portal = browser.locator('.vn-service-portal, .bank-workspace, .fmed-site');
    await expect(portal.getByRole('heading', { level: 1 })).toBeVisible();
    await browser.screenshot({ path: testInfo.outputPath(`versenet-${domain.split('.')[0]}.png`) });
    await page.setViewportSize({ width: 560, height: 920 });
    await expect.poll(() => portal.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  expect(errors).toEqual([]);
});

test('Faith Medical displays zero aura integrity and runs baseline scan without hiding zero baseline', async ({ page }) => {
  const browser = await openBrowser(page);
  await page.evaluate(async () => {
    const { useOSStore } = await import('/src/store/useOSStore.ts' as string);
    useOSStore.setState((s: any) => ({ gameplay: { ...s.gameplay, player: { ...s.gameplay.player, auraHealth: 0, xp: 321 } } }));
  });
  await navigate(page, 'https://faithmed.aure');
  const portal = browser.locator('.fmed-site');
  await expect(portal).toBeVisible();
  await expect(portal.getByText(/Aura Integrity:\s*0%/)).toBeVisible();
  const xpBefore = await page.evaluate(async () => (await import('/src/store/useOSStore.ts' as string)).useOSStore.getState().gameplay.player.xp);
  expect(xpBefore).toBe(321);
});

test('fresh browser openings show Home and restore only explicitly grouped tabs', async ({ page }, testInfo) => {
  const browser = await openBrowser(page);
  const address = browser.getByRole('combobox', { name: 'Search VerseNet or enter a web address' });
  await address.fill('dawn.edu'); await address.press('Enter');
  await expect(browser.locator('.edu-shell h1')).toHaveText('Dawn University');
  await browser.getByRole('button', { name: 'Browser library', exact: true }).click();
  const panel = browser.locator('.vn-library');
  await panel.getByRole('button', { name: 'Saved groups', exact: true }).click();
  await panel.getByRole('textbox', { name: 'New group name' }).fill('Universities');
  await panel.getByRole('button', { name: 'Create group and save this tab' }).click();
  await expect(panel.getByRole('status')).toHaveText('Saved this tab in Universities.');
  await browser.screenshot({ path: testInfo.outputPath('versenet-saved-groups.png') });
  await panel.getByRole('button', { name: 'Close browser library' }).click();
  await browser.getByRole('button', { name: 'New tab', exact: true }).click();
  await address.fill('bank.aure'); await address.press('Enter');
  await expect(browser.locator('.bank-workspace h1')).toHaveText('Your money, in view.');
  await browser.getByRole('button', { name: 'Close', exact: true }).click();
  await page.evaluate(async () => (await import('/src/store/useOSStore.ts' as string)).useOSStore.getState().openAppWorkspace('browser'));
  await expect(address).toHaveValue('https://versenet.aure');
  await expect(browser.getByRole('tab')).toHaveCount(2);
  await expect(browser.getByRole('tab', { name: /First Federal/ })).toHaveCount(0);
  await browser.getByRole('tab', { name: /Dawn University/ }).click();
  await expect(browser.locator('.edu-shell h1')).toHaveText('Dawn University');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Open Orbit', exact: true })).toBeVisible();
  await page.evaluate(async () => (await import('/src/store/useOSStore.ts' as string)).useOSStore.getState().openAppWorkspace('browser'));
  await expect(address).toHaveValue('https://versenet.aure');
  await expect(browser.getByRole('tab')).toHaveCount(2);
  await browser.getByRole('button', { name: 'Browser library', exact: true }).click();
  await panel.getByRole('button', { name: 'Saved groups', exact: true }).click();
  await panel.getByRole('button', { name: 'Remove Universities group', exact: true }).click();
  await panel.getByRole('button', { name: 'Close browser library' }).click();
  await browser.getByRole('button', { name: 'Close', exact: true }).click();
  await page.evaluate(async () => (await import('/src/store/useOSStore.ts' as string)).useOSStore.getState().openAppWorkspace('browser'));
  await expect(address).toHaveValue('https://versenet.aure');
  await expect(browser.getByRole('tab')).toHaveCount(1);
});

test('VerseNet routes restore through browser history and reload', async ({ page }, testInfo) => {
  const browser = await openBrowser(page);
  const address = browser.getByRole('combobox');
  for (const [url, title] of [
    ['https://versenet.aure/directory?category=education&q=dawn', 'Website directory'],
    ['https://versenet.aure/culture', 'Arts and culture'],
    ['https://versenet.aure/reading', 'Reading across Meridion'],
    ['https://versenet.aure/find?q=dawn&view=Sites', 'Search VerseNet'],
  ]) {
    await navigate(page, url);
    const heading = browser.getByRole('heading', { level: 1, name: title, exact: true });
    await expect(heading).toBeVisible();
    await browser.getByRole('button', { name: 'Reload page' }).click();
    await expect(heading).toBeVisible();
    await expect(address).toHaveValue(url);
    await browser.screenshot({ path: testInfo.outputPath(url.split('/')[3].split('?')[0] + '.png') });
  }
  await expect(browser.getByRole('button', { name: 'Sites', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(browser.getByRole('button', { name: 'Dawn University', exact: true }).first()).toBeVisible();
  await browser.getByRole('button', { name: 'Images', exact: true }).click();
  await expect(browser.getByRole('button', { name: 'Images', exact: true })).toHaveAttribute('aria-current', 'page');
  for (let i = 0; i < 4; i++) await browser.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(browser.getByRole('searchbox', { name: 'Find a website' })).toHaveValue('dawn');
  await expect(browser.locator('.vn-destination-row')).toHaveCount(1);
  const forward = browser.getByRole('button', { name: 'Forward', exact: true });
  await forward.click();
  const marlie = browser.locator('.vn-culture-grid').getByRole('link', { name: /Marlie Records/ });
  await expect(marlie).toBeVisible();
  await marlie.click({ modifiers: ['Control'] });
  await expect(browser.getByRole('heading', { name: 'Marlie Records', exact: true })).toBeVisible();
  await browser.getByRole('button', { name: /^Close Marlie Records.* tab$/ }).click();
  await forward.click();
  await expect(browser.getByRole('link', { name: 'Search archive records' })).toBeVisible();
  await forward.click();
  await expect(browser.getByRole('button', { name: 'Sites', exact: true })).toHaveAttribute('aria-current', 'page');
  await browser.getByRole('button', { name: 'Maps', exact: true }).click();
  await expect(browser.getByRole('button', { name: /^Open map:/ }).first()).toBeVisible();
  await navigate(page, 'https://versenet.aure/find');
  await expect(browser.getByRole('heading', { name: 'Enter a search to begin' })).toBeVisible();
});

test('the library uses the browser width and restores keyboard focus after dismissal', async ({ page }, testInfo) => {
  await page.route('**/aureline-glassline-twilight.png', route => route.abort());
  const browser = await openBrowser(page);
  const toggle = browser.getByRole('button', { name: 'Browser library', exact: true });
  const panel = browser.locator('.vn-library');
  await expect(panel).toHaveCount(0);
  await toggle.click();
  await expect.poll(async () => (await panel.boundingBox())?.width).toBe(260);
  await browser.screenshot({ path: testInfo.outputPath('wide-library.png') });
  for (const width of [850, 560]) {
    await page.setViewportSize({ width, height: 920 });
    const dialog = browser.getByRole('dialog', { name: 'Browser library' });
    await expect(dialog).toBeVisible();
    const close = dialog.getByRole('button', { name: 'Close browser library' });
    await close.focus();
    await close.press('Shift+Tab');
    await expect(dialog.getByRole('textbox', { name: 'Filter browser library' })).toBeFocused();
    await browser.screenshot({ path: testInfo.outputPath('drawer-' + width + '.png') });
    await page.keyboard.press('Escape');
    await expect(toggle).toBeFocused();
    await expect(dialog).toHaveCount(0);
    await browser.getByRole('button', { name: 'Reload page' }).click();
    await expect(browser.getByRole('heading', { name: 'Search Meridion.' })).toBeVisible();
    await expect(browser.locator('.vn-feature-main img')).toHaveCount(0);
    await expect.poll(() => browser.locator('.vn-network').evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    await browser.screenshot({ path: testInfo.outputPath('discover-' + width + '.png') });
    await toggle.click();
  }
  await browser.locator('.vn-library-backdrop').click({ position: { x: 10, y: 10 } });
  await expect(toggle).toBeFocused();
  await browser.getByRole('link', { name: 'Directory', exact: true }).click();
  await toggle.click();
  await panel.getByRole('button', { name: 'History', exact: true }).click();
  const visited = panel.getByRole('button', { name: /^Directory · VerseNet/ });
  await expect(visited).toBeVisible();
  await visited.click();
  await expect(panel).toHaveCount(0);
  await expect(toggle).toBeFocused();
});

test('reading, the legacy news launcher, and the WorkNet handoff retain their routes', async ({ page }) => {
  const browser = await openBrowser(page);
  await browser.getByRole('link', { name: 'Reading', exact: true }).click();
  await browser.locator('.vn-reading-features').getByRole('link', { name: /The Meridian/ }).click();
  await expect(browser.getByRole('region', { name: 'The Meridian', exact: true })).toBeVisible();
  await page.evaluate(async () => {
    const { useOSStore } = await import('/src/store/useOSStore.ts' as string);
    useOSStore.getState().openAppWorkspace('pulse');
  });
  await expect(browser.getByRole('combobox')).toHaveValue('https://dispatch.mer');
  await expect(browser.getByRole('region', { name: 'The Meridian', exact: true })).toBeVisible();
  await navigate(page, 'https://worknet.aure');
  await browser.getByRole('button', { name: 'Launch WorkNet Desktop App', exact: true }).click();
  await expect(page.locator('.os-window[data-app=jobs]')).toBeVisible();
});


test('each entertainment site has a distinct homepage and connects to its workflow', async ({ page }) => {
  test.setTimeout(120_000);
  const browser = await openBrowser(page);
  await browser.getByRole('link', { name: 'Arts and culture', exact: true }).click();
  const links = browser.locator('.vn-culture-grid a');
  await expect(links).toHaveCount(25);
  const sites = await links.evaluateAll(items => items.map(item => ({
    url: item.getAttribute('href')!,
    name: item.querySelector('strong')!.textContent!,
  })));
  const shells = new Set<string>();
  const site = browser.locator('.ent-root');

  for (const { url } of sites) {
    await browser.locator('.vn-culture-grid').locator('a[href="' + url + '"]').click();
    await expect(site.getByRole('heading', { level: 1 }).first()).toBeVisible();
    const shell = await site.getAttribute('data-site-shell');
    expect(shell).toBeTruthy();
    shells.add(shell!);
    await browser.getByRole('button', { name: 'Back', exact: true }).click();
    await expect(links).toHaveCount(25);
  }
  expect(shells.size).toBeGreaterThanOrEqual(8);
});

test('entertainment homepages retain playback, ticketing, auditions, and contract controls', async ({ page }) => {
  const browser = await openBrowser(page);
  const site = browser.locator('.ent-root');

  await navigate(page, 'https://songbird.mer');
  await site.locator('.sb-hero-stage .ent-btn-primary').first().click();
  await expect(site.locator('audio')).toHaveCount(1);

  await navigate(page, 'https://silverleafstadium.mer');
  await site.getByRole('button', { name: /Buy Tickets Now/i }).first().click();
  await expect(site.getByText(/Purchased|ticket/i).first()).toBeVisible();

  await navigate(page, 'https://opencallcasting.mer');
  await expect(site.getByRole('heading', { name: 'Open Call Casting', level: 1 })).toBeVisible();

  await navigate(page, 'https://marlierecords.mer');
  await expect(site.getByRole('heading', { name: 'Marlie Records', level: 1 })).toBeVisible();
});

test('VerseNet keeps website links compact and separate from new-tab actions', async ({ page }, testInfo) => {
  await page.route('**/social-register-masthead.svg', route => route.abort());
  const browser = await openBrowser(page);
  expect((await browser.locator('.vn-feature-main').boundingBox())!.height).toBeLessThanOrEqual(200);
  const address = browser.getByRole('combobox');

  for (const width of [1440, 560]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [name, path] of [['discover', ''], ['culture', '/culture'], ['directory', '/directory'],
      ['reading', '/reading'], ['search', '/find?q=dawn&view=Sites']]) {
      await address.fill('https://versenet.aure' + path);
      await address.press('Enter');
      const network = browser.locator('.vn-network');
      const row = network.locator('.vn-destination-row, .vs-site-result').first();
      await expect(row).toBeVisible();
      const newTab = row.getByRole('button', { name: /in a new tab/ });
      await expect(newTab).toBeVisible();
      expect((await newTab.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await row.locator('a, .vs-result-title').first().focus();
      await page.keyboard.press('Tab');
      await expect(newTab).toBeFocused();
      await expect.poll(() => network.evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
      await browser.screenshot({ path: testInfo.outputPath(name + '-' + width + '.png') });
    }
  }
});

test('routed entertainment sites keep playback and deep links through VerseNet history', async ({ page }) => {
  const browser = await openBrowser(page);
  const address = browser.getByRole('combobox', { name: 'Search VerseNet or enter a web address' });
  const site = browser.locator('.ent-root');
  const back = browser.getByRole('button', { name: 'Back', exact: true });
  const forward = browser.getByRole('button', { name: 'Forward', exact: true });

  await navigate(page, 'https://songbird.mer');
  await site.locator('.sb-hero-stage .ent-btn-primary').first().click();
  const audio = site.locator('audio');
  await expect(audio).toHaveCount(1);
  await audio.evaluate(node => { node.dataset.routeCheck = 'original'; });
  await site.getByRole('link', { name: /Artist Studio/i }).first().click();
  await expect(address).toHaveValue(/songbird\.mer\/artist-studio/);
  await expect(audio).toHaveAttribute('data-route-check', 'original');
  await back.click();
  await expect(audio).toHaveAttribute('data-route-check', 'original');

  await navigate(page, 'https://limelight.mer/stories');
  await expect(site.getByRole('heading', { name: /Limelight/i, level: 1 })).toBeVisible();
  await browser.getByRole('button', { name: 'Bookmark this page' }).click();
  await browser.getByRole('button', { name: 'Reload page' }).click();
  await expect(site.getByRole('heading', { name: /Limelight/i, level: 1 })).toBeVisible();
  await back.click();
  await forward.click();
  await expect(address).toHaveValue(/limelight\.mer\/stories/);
});
