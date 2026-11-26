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

const CASES = [
  ['companion', 'companion.aure', 'Shared routes & companion etiquette', 'Glassline Canal Path'],
  ['garden', 'gardenreview.aure', 'Seasonal bed notes', 'East Mist House'],
  ['reading', 'readingroom.aure', 'Card-catalog drawers', 'ORY-100'],
] as const;

test('community sites render distinct feature blocks and keep the profile gate', async ({ page }) => {
  const browser = await openBrowser(page);
  for (const [id, domain, heading, firstCard] of CASES) {
    await navigate(page, `https://${domain}`);
    const site = browser.locator('.is-site');
    await expect(browser.locator(`.is-site-${id}`)).toHaveCount(1);
    await expect(site.locator(`.is-feature-${id}`)).toHaveCount(1);
    await expect(site.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(site.getByRole('heading', { name: firstCard, exact: true })).toBeVisible();

    await page.setViewportSize({ width: 560, height: 920 });
    await expect.poll(() => site.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    await page.setViewportSize({ width: 1440, height: 900 });

    await navigate(page, `https://${domain}/request`);
    await expect(site.getByRole('heading', { name: 'Begin with a site profile.' })).toBeVisible();
  }
});