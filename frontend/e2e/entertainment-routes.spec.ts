import { test, expect, type Page } from '@playwright/test';

test.setTimeout(120000);

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

test('the four entertainment pilots support direct links, titles and Back/Forward', async ({ page }) => {
  const browser = await openBrowser(page);
  const address = browser.getByRole('combobox', { name: 'Search VerseNet or enter a web address' });
  const root = browser.locator('.ent-root');

  await navigate(page, 'https://songbird.mer/charts');
  await expect(root.getByRole('heading', { name: 'Songbird', level: 1 })).toBeVisible();
  await root.getByRole('link', { name: /Artist Studio/i }).first().click();
  await expect(address).toHaveValue(/songbird\.mer\/artist-studio/);
  await browser.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(address).toHaveValue(/songbird\.mer\/charts/);
  await browser.getByRole('button', { name: 'Forward', exact: true }).click();
  await expect(address).toHaveValue(/songbird\.mer\/artist-studio/);

  await navigate(page, 'https://limelight.mer/stories');
  await expect(root.getByRole('heading', { name: /Limelight/i, level: 1 })).toBeVisible();

  await navigate(page, 'https://silverleafstadium.mer/events');
  await expect(root.getByRole('heading', { name: 'Silverleaf Stadium', level: 1 })).toBeVisible();

  await navigate(page, 'https://glasslinedesigns.mer/collections');
  await expect(root.getByRole('heading', { name: 'Glassline Designs', level: 1 })).toBeVisible();
});

test('Silverleaf seating stays informational and does not sell seats', async ({ page }) => {
  const browser = await openBrowser(page);
  await navigate(page, 'https://silverleafstadium.mer/events');
  const guide = browser.locator('.sl-bowl-card');
  await expect(guide).toBeVisible();
  await expect(guide.getByRole('img', { name: /Schematic seating bowl/i })).toBeVisible();
  await expect(guide.getByRole('button', { name: /buy|purchase|checkout/i })).toHaveCount(0);
});

test('Songbird playback survives navigation within the site', async ({ page }) => {
  const browser = await openBrowser(page);
  await navigate(page, 'https://songbird.mer');
  const root = browser.locator('.ent-root');
  await root.locator('.sb-hero-stage .ent-btn-primary').first().click();
  await expect(root.locator('audio')).toHaveCount(1);
  const before = await root.locator('audio').getAttribute('src');

  await root.getByRole('link', { name: /Charts/i }).first().click();
  await expect(root.locator('audio')).toHaveCount(1);
  expect(await root.locator('audio').getAttribute('src')).toEqual(before);
});

test('bookmarking an entertainment route reflects the current page', async ({ page }) => {
  const browser = await openBrowser(page);
  await navigate(page, 'https://songbird.mer/charts');
  await browser.getByRole('button', { name: 'Bookmark this page', exact: true }).click();
  const remove = browser.getByRole('button', { name: 'Remove current bookmark', exact: true });
  await expect(remove).toHaveAttribute('aria-pressed', 'true');
  await expect(browser.getByRole('tab', { name: /Songbird/i })).toBeVisible();
});