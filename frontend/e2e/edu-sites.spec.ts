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
  ['dawn', 'dawn.edu'],
  ['cyberium', 'cyberium.edu'],
  ['regent', 'regenthall.edu'],
] as const;

test('university sites expose distinct subpages and preserve admissions', async ({ page }) => {
  const browser = await openBrowser(page);
  for (const [id, domain] of CASES) {
    await navigate(page, `https://${domain}`);
    await expect(browser.locator(`.edu-shell.edu-${id}`)).toBeVisible();

    await navigate(page, `https://${domain}/academics`);
    const section = browser.locator(`.edu-section[data-institution=${id}]`);
    await expect(section).toBeVisible();
    await expect(section.getByRole('heading', { name: /Academics at/ })).toBeVisible();
    await expect(browser.locator('.edu-shell button[aria-current=page]')).toHaveCount(1);

    await page.setViewportSize({ width: 560, height: 920 });
    await expect.poll(() => section.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    await page.setViewportSize({ width: 1440, height: 900 });

    await navigate(page, `https://${domain}/admissions`);
    await expect(browser.getByRole('heading', { name: 'Admissions & Enrollment' })).toBeVisible();
  }
});