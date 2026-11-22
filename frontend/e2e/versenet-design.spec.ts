import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

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
  const home = browser.locator('.vn-discovery');
  await home.getByRole('button', { name: 'Education', exact: true }).click();
  await expect(home.locator('.vn-destination-row')).toHaveCount(3);
  await home.getByRole('searchbox', { name: 'Find a website', exact: true }).fill('no matching institution');
  await expect(home.getByRole('heading', { name: 'No websites match that search.' })).toBeVisible();
  await home.getByRole('button', { name: 'Show all websites' }).click();
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
});

test('the university and community sites retain distinct layouts at wide and narrow window widths', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const browser = await openBrowser(page);
  await mkdir('../output/previews', { recursive: true });
  await browser.screenshot({ path: '../output/previews/versenet-home.png' });
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
    await browser.screenshot({ path: `../output/previews/versenet-${image}.png` });
    await page.setViewportSize({ width: 560, height: 920 });
    await expect.poll(() => site.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    await site.getByRole('button', { name: 'Admissions', exact: true }).click();
    await expect(site.locator('form')).toBeVisible();
    await browser.screenshot({ path: `../output/previews/versenet-${image}-narrow.png` });
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  for (const domain of ['gardenreview.aure', 'companion.aure', 'readingroom.aure']) {
    await navigate(page, `https://${domain}`);
    await expect(browser.locator('.is-site h1')).toBeVisible();
    await browser.screenshot({ path: `../output/previews/versenet-${domain.split('.')[0]}.png` });
    await page.setViewportSize({ width: 560, height: 920 });
    await expect.poll(() => browser.locator('.is-site').evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    await page.setViewportSize({ width: 1440, height: 900 });
  }
  expect(errors).toEqual([]);
});
