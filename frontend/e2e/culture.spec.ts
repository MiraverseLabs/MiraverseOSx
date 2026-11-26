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

test('arts and culture is a hub with featured destinations and sector filters', async ({ page }) => {
  const browser = await openBrowser(page);
  await navigate(page, 'https://versenet.aure/culture');

  await expect(browser.getByRole('heading', { name: 'Arts and culture', exact: true })).toBeVisible();
  await expect(browser.getByText('Songbird Sessions', { exact: true })).toBeVisible();
  await expect(browser.getByRole('heading', { name: 'Music and talent', exact: true })).toBeVisible();
  await expect(browser.getByRole('heading', { name: 'Fashion and modeling', exact: true })).toBeVisible();

  await page.setViewportSize({ width: 560, height: 920 });
  const network = browser.locator('.vn-network');
  await expect.poll(() => network.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
  await page.setViewportSize({ width: 1440, height: 900 });

  await browser.getByRole('link', { name: 'Fashion and modeling', exact: true }).click();
  await expect(browser.getByRole('heading', { name: 'Fashion and modeling', exact: true })).toBeVisible();
  await expect(browser.getByRole('heading', { name: 'Music and talent', exact: true })).toHaveCount(0);
  await expect(browser.locator('.vn-culture-chips a[aria-current=page]')).toHaveText('Fashion and modeling');
});