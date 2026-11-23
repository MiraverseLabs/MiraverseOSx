import { test, expect, type Page } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

async function start(page: Page) {
  await page.route('**/api/**', route => route.fulfill({status:503,contentType:'application/json',body:'{}'}));
  await page.route(/^https:\/\//, route => route.abort());
  await page.goto('/');
  await page.getByRole('button',{name:'Sign In / Login Boot',exact:true}).click();
  await page.getByPlaceholder('e.g. CY-9021-PLAYER or admin').fill('admin');
  await page.getByRole('button',{name:'START LOGIN BOOT',exact:true}).click();
  await expect(page.locator('.desktop-wordmark strong')).toHaveText('MiraverseOSx');
}

async function open(page: Page, id: string) {
  await page.evaluate(async app => {const {useOSStore}=await import('/src/store/useOSStore.ts' as string);useOSStore.getState().openAppWorkspace(app);},id);
  const window = page.locator(`.os-window[data-app="${id}"]`);
  await expect(window).toBeVisible();
  await expect(window.locator('.os-window__body')).not.toContainText('Initializing module memory space',{timeout:15000});
  return window;
}

test('VerseNet has one title and tab row with working navigation and window controls', async ({page}) => {
  await start(page);
  const browser = await open(page,'browser');
  await expect(browser).toHaveAttribute('aria-label','VerseNet');
  await expect(browser).toHaveAttribute('data-integrated-chrome','true');
  await expect(browser.locator('.os-window__titlebar').getByRole('tablist',{name:'Browser tabs'})).toHaveCount(1);
  await expect(browser.locator('.os-window__body').getByRole('tablist',{name:'Browser tabs'})).toHaveCount(0);
  await browser.getByRole('button',{name:'New tab',exact:true}).click();
  await expect(browser.getByRole('tab')).toHaveCount(2);
  await browser.getByRole('tab').last().dblclick();
  await expect(browser).toHaveAttribute('data-maximized','false');
  await browser.getByRole('button',{name:'Maximize',exact:true}).click();
  await expect(browser).toHaveAttribute('data-maximized','true');
  await mkdir('../output/previews',{recursive:true});
  await page.screenshot({path:'../output/previews/versenet-single-frame.png'});
  await page.setViewportSize({width:390,height:844});
  await expect(browser.getByRole('button',{name:'Close',exact:true})).toBeInViewport();
  await expect(browser.getByRole('button',{name:'New tab',exact:true})).toBeInViewport();
});

test('AureMail uses its product name and a functional toolbar without a second title', async ({page}) => {
  await start(page);
  const mail = await open(page,'mail');
  await expect(mail).toHaveAttribute('aria-label','AureMail');
  await expect(mail.locator('.os-window__name')).toHaveText('AureMail');
  await expect(mail.locator('.app-toolbar__title')).toHaveCount(0);
  await expect(mail.getByRole('combobox',{name:'Filter by verified email account'})).toBeVisible();
  await expect(mail.getByRole('combobox',{name:'Sort messages'})).toBeVisible();
  await expect(mail.locator('.mail-reading-surface')).toHaveCSS('border-top-width','0px');
  await mail.getByRole('button',{name:'Maximize',exact:true}).click();
  await mkdir('../output/previews',{recursive:true});
  await page.screenshot({path:'../output/previews/auremail-single-frame.png'});
});

test('every installed app has one shared frame and an unboxed top-level surface', async ({page}) => {
  test.setTimeout(180000);
  await start(page);
  const apps = ['browser','files','mail','post','comms','maispace','passport','housing','finance','pulse','vitals','campus','study','spellforge','lore','jobs','fieldOperations','meridionRegistry','documentStudio','dgaos','process','terminal','settings'];
  for (const app of apps) {
    const window = await open(page,app);
    await expect(window.getByRole('heading',{name:'This app could not display its workspace.'})).toHaveCount(0);
    await expect(window.locator('.os-window')).toHaveCount(0);
    await expect(window.locator('.os-window__controls')).toHaveCount(1);
    await expect(window.locator('.os-window__body > :is(div,section,main)').first()).toHaveCSS('border-top-width','0px');
    await expect(window.locator('.os-window__body > :is(div,section,main)').first()).toHaveCSS('border-top-left-radius','0px');
    await window.getByRole('button',{name:'Close',exact:true}).click();
    await expect(window).toHaveCount(0);
  }
});
