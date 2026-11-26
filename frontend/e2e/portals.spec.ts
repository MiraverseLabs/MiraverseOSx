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
  ['dga.gov.aure', 'registry', 'Citizen Clearance Registry'],
  ['shipping.aure', 'routes', 'Route-Hop Diagram'],
  ['vectornet.aure', 'relays', 'Relay Topology'],
] as const;

test('portals expose sub-routes and preserve the royal clearance gate', async ({ page }) => {
  const browser = await openBrowser(page);
  for (const [domain, view, heading] of CASES) {
    await navigate(page, `https://${domain}/${view}`);
    await expect(browser.locator(`.vn-portal-shell[data-view=${view}]`)).toBeVisible();
    await expect(browser.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(browser.locator('.vn-portal-nav button[aria-current=page]')).toHaveCount(1);

    await page.setViewportSize({ width: 560, height: 920 });
    const shell = browser.locator('.vn-portal-shell');
    await expect.poll(() => shell.evaluate(el => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(1);
    await page.setViewportSize({ width: 1440, height: 900 });
  }

  await navigate(page, 'https://dga.gov.aure/registry');
  await browser.locator('.vn-portal-nav').getByRole('button', { name: 'Cipher', exact: true }).click();
  await expect(browser.getByRole('heading', { name: 'Security Clearance Elevation' })).toBeVisible();
  await browser.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(browser.getByRole('heading', { name: 'Citizen Clearance Registry' })).toBeVisible();

  await page.evaluate(async () => {
    const { useOSStore } = await import('/src/store/useOSStore.ts' as string);
    useOSStore.setState((state: any) => ({
      gameplay: { ...state.gameplay, player: { ...state.gameplay.player, clearanceLevel: 1 } },
    }));
  });
  await navigate(page, 'https://royalhistory.mer/charters');
  await expect(browser.getByText(/Tier 2 clearance is required/)).toBeVisible();
});