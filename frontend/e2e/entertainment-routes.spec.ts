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
  const shell = browser.locator('.ent-site-shell');

  await navigate(page, 'https://songbird.mer/listen');
  await expect(shell.getByRole('heading', { name: 'Songbird Pan-Meridion Top Streaming Chart' })).toBeVisible();
  await expect(shell.getByRole('link', { name: 'Listen & Top Charts' })).toHaveAttribute('aria-current', 'page');

  await shell.getByRole('link', { name: 'Artist Studio' }).click();
  await expect(shell.getByRole('link', { name: 'Artist Studio' })).toHaveAttribute('aria-current', 'page');
  await expect(shell.getByRole('heading', { name: 'Performer / Professional Registration & Quick Release' })).toBeVisible();
  await browser.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(shell.getByRole('heading', { name: 'Songbird Pan-Meridion Top Streaming Chart' })).toBeVisible();
  await browser.getByRole('button', { name: 'Forward', exact: true }).click();
  await expect(shell.getByRole('link', { name: 'Artist Studio' })).toHaveAttribute('aria-current', 'page');

  await navigate(page, 'https://limelight.mer/stories');
  await expect(shell.getByRole('heading', { name: 'The Greenroom & Cover Dispatch' })).toBeVisible();
  await expect(shell.locator('.ent-limelight-index')).toBeVisible();

  await navigate(page, 'https://silverleafstadium.mer/box-office');
  await expect(shell.getByRole('heading', { name: 'Live Box Office & Performance Calendar' })).toBeVisible();
  await expect(shell.getByText(/Section guide only/)).toBeVisible();

  await navigate(page, 'https://glasslinedesigns.mer/commissions');
  await expect(shell.getByRole('heading', { name: 'Atelier brief' })).toBeVisible();
  await expect(shell.locator('.ent-atelier-brief')).toBeVisible();
});

test('Silverleaf seating stays informational and does not sell seats', async ({ page }) => {
  const browser = await openBrowser(page);
  await navigate(page, 'https://silverleafstadium.mer/box-office?section=club-box');
  const shell = browser.locator('.ent-site-shell');
  const guide = shell.locator('.ent-seating-guide');
  await expect(guide).toBeVisible();
  await expect(guide.getByText(/Section guide only/)).toBeVisible();
  await expect(guide.getByRole('button', { name: /buy|purchase|checkout/i })).toHaveCount(0);
});

test('Songbird playback survives navigation within the site', async ({ page }) => {
  const browser = await openBrowser(page);
  await navigate(page, 'https://songbird.mer/listen');
  const shell = browser.locator('.ent-site-shell');
  await shell.getByRole('button', { name: /^Cue track/ }).first().click();
  const player = shell.locator('.ent-pilot-player');
  await expect(player.locator('audio')).toHaveCount(1);
  const before = await player.locator('audio').getAttribute('src');

  await shell.getByRole('link', { name: 'Industry Directory' }).click();
  await expect(shell.getByRole('heading', { name: /Meridion Entertainment Ecosystem Directory/ })).toBeVisible();
  await shell.getByRole('link', { name: 'Listen & Top Charts' }).click();

  await expect(player.locator('audio')).toHaveCount(1);
  expect(await player.locator('audio').getAttribute('src')).toEqual(before);
});

test('bookmarking an entertainment route reflects the current page', async ({ page }) => {
  const browser = await openBrowser(page);
  await navigate(page, 'https://songbird.mer/listen');
  await browser.getByRole('button', { name: 'Bookmark this page', exact: true }).click();
  const remove = browser.getByRole('button', { name: 'Remove current bookmark', exact: true });
  await expect(remove).toHaveAttribute('aria-pressed', 'true');
  await expect(browser.getByRole('tab', { name: /Listen & Top Charts/ })).toBeVisible();
});