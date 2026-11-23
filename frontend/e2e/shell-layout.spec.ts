import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

async function desktop(page: Page) {
  await page.route('**/api/**', route => route.fulfill({status:503,contentType:'application/json',body:'{}'}));
  await page.route(/^https:\/\//, route => route.abort());
  await page.goto('/');
  await page.getByRole('button',{name:'Sign In / Login Boot',exact:true}).click();
  await page.getByPlaceholder('e.g. CY-9021-PLAYER or admin').fill('admin');
  await page.getByRole('button',{name:'START LOGIN BOOT',exact:true}).click();
  await expect(page.getByRole('button',{name:'Open Orbit',exact:true})).toBeVisible();
}

test('maximized apps fill the workspace, with a slim top bar and recoverable corner dock', async ({page}) => {
  await desktop(page);
  await page.getByRole('button',{name:'Enter Home',exact:true}).click();
  const home = page.locator('.os-window[data-app=housing]');
  await expect(page.getByRole('button',{name:'Show dock',exact:true})).toBeVisible();
  await expect(page.locator('.desktop-dock')).toHaveCount(0);
  await home.getByRole('button',{name:'Maximize',exact:true}).click();
  for (const size of [{width:1440,height:900},{width:650,height:900},{width:390,height:844}]) {
    await page.setViewportSize(size);
    await expect.poll(async () => {
      const shell = await page.locator('#mira-screen-frame').boundingBox();
      const app = await home.boundingBox();
      const bar = await page.locator('.desktop-menubar').boundingBox();
      return Math.abs(bar!.height - 36) < 1 && Math.abs(app!.y - shell!.y - 36) < 1 && Math.abs(app!.width - shell!.width) < 1 && Math.abs(app!.y + app!.height - shell!.y - shell!.height) < 1;
    }).toBe(true);
    const headerFits = await page.locator('.desktop-menubar').evaluate(el => el.scrollWidth <= el.clientWidth + 1);
    expect(headerFits).toBe(true);
    await expect(home.getByRole('button',{name:'Restore window',exact:true})).toBeInViewport();
  }
  await page.getByRole('button',{name:'Show dock',exact:true}).click();
  await expect(page.getByRole('button',{name:'Collapse dock',exact:true})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'Show dock',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Open Orbit',exact:true}).click();
  await expect(page.getByRole('button',{name:'Select SETTINGS',exact:true})).toBeVisible();
  await page.keyboard.press('Escape');
  await page.setViewportSize({width:1440,height:1000});
  await mkdir('../output/previews',{recursive:true});
  await page.screenshot({path:'../output/previews/compact-shell.png'});
});

test('widget customizer moves windows aside, saves controls and fits small screens', async ({page}) => {
  await desktop(page);
  await page.getByRole('button',{name:'Enter Home',exact:true}).click();
  await page.getByRole('button',{name:'Show dock',exact:true}).click();
  await page.getByRole('button',{name:'Customize Desktop',exact:true}).click();
  const panel = page.getByRole('complementary',{name:'Customize Desktop',exact:true});
  await expect(panel.getByRole('heading',{name:'Make it yours.'})).toBeVisible();
  await expect(page.locator('.os-window')).toHaveCount(0);
  await panel.getByLabel('Clock & calendar',{exact:true}).uncheck();
  await expect(page.getByRole('region',{name:'Clock & calendar',exact:true})).toHaveCount(0);
  await panel.getByLabel('Clock & calendar',{exact:true}).check();
  await panel.getByRole('textbox',{name:'New shortcut group title'}).fill('Creative tools');
  await panel.getByRole('button',{name:'Add group',exact:true}).click();
  await expect(panel.getByLabel('Creative tools',{exact:true})).toBeChecked();
  await panel.getByRole('combobox',{name:'Pin app to dock'}).selectOption('housing');
  await expect(panel.getByRole('button',{name:'Unpin dock housing',exact:true})).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  await expect(panel.getByRole('button',{name:'Done',exact:true})).toBeInViewport();
  const bounds = await panel.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(391);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(845);
  await page.setViewportSize({width:1440,height:1000});
  await mkdir('../output/previews',{recursive:true});
  await page.screenshot({path:'../output/previews/widget-customizer.png'});
  await panel.getByRole('button',{name:'Done',exact:true}).click();
  await expect(page.locator('.os-window[data-app=housing]')).toBeVisible();
  await expect(page.getByRole('button',{name:'Show dock',exact:true})).toBeVisible();
  await page.reload();
  await page.getByRole('button',{name:'Customize Desktop',exact:true}).click();
  await expect(panel.getByLabel('Creative tools',{exact:true})).toBeChecked();
  await expect(panel.getByRole('button',{name:'Unpin dock housing',exact:true})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
});
