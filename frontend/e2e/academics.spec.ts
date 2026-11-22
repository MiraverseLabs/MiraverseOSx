import { test, expect, type Page } from '@playwright/test';
test.use({ trace: 'off' });

async function setup(page: Page) {
  await page.route('**/api/**', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Offline test"}' }));
  await page.route(/^https:\/\//, route => route.abort());
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign In / Login Boot', exact: true }).click();
  await page.getByPlaceholder('e.g. CY-9021-PLAYER or admin').fill('admin');
  await page.getByRole('button', { name: 'START LOGIN BOOT', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open Orbit', exact: true })).toBeVisible();
  await page.evaluate(async () => {
    const { useOSStore } = await import('/src/store/useOSStore.ts' as string);
    const { MaidIdentityService } = await import('/src/services/maidIdentityService.ts' as string);
    const people = await MaidIdentityService.getAllPersons();
    useOSStore.setState((s: any) => ({ gameplay: { ...s.gameplay, identity: { ...s.gameplay.identity, canonicalPersonId: people[0].id } } }));
    useOSStore.getState().navigateBrowserTab('https://dawn.edu');
    useOSStore.getState().openAppWorkspace('browser');
  });
  const browser = page.locator('.os-window[data-app=browser]');
  await browser.getByRole('button', { name: 'Maximize', exact: true }).click();
  return browser;
}

test('themed .edu sites, AureLearn LMS, CAMPUS Registrar, and Document Studio share playable records', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const browser = await setup(page);
  const site = browser.locator('.edu-shell');

  // 1. Dawn University bespoke .edu site -> Admissions -> Register -> AureLearn LMS
  await expect(site.getByRole('heading', { name: 'Dawn University', exact: true })).toBeVisible();
  await site.getByRole('button', { name: 'Admissions', exact: true }).click();
  await site.getByRole('button', { name: 'Submit Application to Dawn University', exact: true }).click();
  await expect(site.getByText('Admitted Scholar · Active Standing')).toBeVisible();

  await site.getByRole('button', { name: 'Course Catalog', exact: true }).click();
  await expect(site.getByRole('heading', { name: 'Natural Sciences', exact: true })).toBeVisible();
  await site.getByRole('heading', { name: 'Natural Sciences', exact: true }).locator('..').getByRole('button', { name: /Syllabus & Details/ }).click();
  await site.getByRole('button', { name: 'Register for Course', exact: true }).click();
  await site.getByRole('button', { name: /Study in AureLearn LMS/ }).click();

  // 2. Study in AureLearn LMS
  const lms = page.locator('.os-window[data-app=study]');
  await expect(lms.getByRole('heading', { name: 'Natural Sciences', exact: true })).toBeVisible();
  for (let i = 0; i < 3; i++) {
    await lms.getByRole('button', { name: 'Mark lesson complete', exact: true }).first().click();
  }
  await lms.getByRole('button', { name: /Assessment/ }).click();
  const correct = await page.evaluate(async () => (await import('/src/gameplay/Academics.ts' as string)).COURSES.find((c: any) => c.id === 'natural-sciences-1').quiz.map((q: any) => q.correct));
  for (let i = 0; i < correct.length; i++) {
    await lms.locator('fieldset').nth(i).getByRole('radio').nth(correct[i]).check();
  }
  await lms.getByRole('button', { name: 'Submit assessment', exact: true }).click();
  await expect(lms.getByRole('status')).toHaveText('Best score: 100%. Pass mark: 80%.');

  // 3. Complete practical project in Royal Archives
  await lms.getByRole('button', { name: /Practical Lab/ }).click();
  await lms.getByRole('button', { name: /Open project workspace/ }).click();
  const desk = page.locator('.os-window[data-app=lore] .academic-project-desk');
  await desk.getByRole('button', { name: 'Open assigned source', exact: true }).click();
  const projectAnswer = await page.evaluate(async () => (await import('/src/gameplay/Academics.ts' as string)).COURSES.find((c: any) => c.id === 'natural-sciences-1').project.question.correct);
  await desk.getByRole('radio').nth(projectAnswer).check();
  await desk.getByRole('button', { name: 'Submit evidence review' }).click();
  await expect(desk.getByText('Verified ✓', { exact: true })).toBeVisible();

  // 4. Verify GPA, credits, and Registrar Desk in CAMPUS
  await desk.getByRole('button', { name: 'Return to CAMPUS →' }).click();
  const campus = page.locator('.os-window[data-app=campus]');
  await expect(campus.getByText(/3 earned credits/)).toBeVisible();

  // 5. Verify Document Studio packet includes Dawn University & GPA
  const html = await page.evaluate(async () => {
    const { useOSStore } = await import('/src/store/useOSStore.ts' as string);
    const { MaidIdentityService } = await import('/src/services/maidIdentityService.ts' as string);
    const { renderEducationEmploymentHtml } = await import('/src/services/documentPacketGenerator.ts' as string);
    const person = (await MaidIdentityService.getAllPersons()).find((p: any) => p.id === useOSStore.getState().gameplay.identity.canonicalPersonId);
    return renderEducationEmploymentHtml({ ...person, record: person.maid });
  });
  expect(html).toContain('Dawn University');
  expect(html).toContain('Natural Sciences');
  expect(html).toContain('100%');
  expect(html).toContain('4.00');

  // 6. Registrar Desk audited correction
  await campus.getByRole('button', { name: 'Registrar Desk', exact: true }).click();
  await campus.getByRole('combobox', { name: 'Citizen', exact: true }).selectOption({ index: 2 });
  await campus.getByRole('combobox', { name: 'Course', exact: true }).selectOption('signals-1');
  await campus.getByLabel('Reason', { exact: true }).fill('Verified transfer assessment');
  await campus.getByRole('button', { name: 'Enroll citizen', exact: true }).click();
  await campus.getByLabel('Assessment score', { exact: true }).fill('90');
  await campus.getByLabel('Confirm all course requirements were met').check();
  await campus.getByRole('button', { name: 'Save audited correction', exact: true }).click();
  await expect(campus.locator('details')).toHaveCount(2);
  await expect(campus.getByRole('cell', { name: 'A (90%)', exact: true })).toBeVisible();

  // 7. Navigate across all 3 themed .edu sites (Dawn, Cyberium, Regent Hall)
  await page.evaluate(async () => {
    const { useOSStore } = await import('/src/store/useOSStore.ts' as string);
    useOSStore.getState().openAppWorkspace('browser');
  });
  await site.getByRole('link', { name: /Regent Hall/ }).click();
  await expect(site.getByRole('heading', { name: 'Regent Hall', exact: true })).toBeVisible();
  await site.getByRole('link', { name: /Cyberium/ }).click();
  await expect(site.getByRole('heading', { name: 'Cyberium Academy', exact: true })).toBeVisible();

  expect(errors).toEqual([]);
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await page.close();
});

test('Cyberium Academy verifies Spell Engineering project in standalone SpellForge Lab', async ({ page }) => {
  const browser = await setup(page);
  const site = browser.locator('.edu-shell');
  await site.getByRole('link', { name: /Cyberium/ }).click();
  await site.getByRole('button', { name: 'Admissions', exact: true }).click();
  await site.getByRole('button', { name: 'Submit Application to Cyberium Academy', exact: true }).click();
  await site.getByRole('button', { name: 'Course Catalog', exact: true }).click();
  await site.getByRole('heading', { name: 'Spell Engineering', exact: true }).locator('..').getByRole('button', { name: /Syllabus & Details/ }).click();
  await site.getByRole('button', { name: 'Register for Course', exact: true }).click();
  await site.getByRole('button', { name: /Study in AureLearn LMS/ }).click();

  const lms = page.locator('.os-window[data-app=study]');
  for (let i = 0; i < 3; i++) await lms.getByRole('button', { name: 'Mark lesson complete', exact: true }).first().click();
  await lms.getByRole('button', { name: /Assessment/ }).click();
  const correct = await page.evaluate(async () => (await import('/src/gameplay/Academics.ts' as string)).COURSES.find((c: any) => c.id === 'spell-engineering-1').quiz.map((q: any) => q.correct));
  for (let i = 0; i < correct.length; i++) await lms.locator('fieldset').nth(i).getByRole('radio').nth(correct[i]).check();
  await lms.getByRole('button', { name: 'Submit assessment', exact: true }).click();

  await lms.getByRole('button', { name: /Practical Lab/ }).click();
  await lms.getByRole('button', { name: /Open project workspace/ }).click();
  const lab = page.locator('.os-window[data-app=spellforge]');
  await lab.locator('.academic-project-desk').getByRole('button', { name: 'Open assigned source', exact: true }).click();
  await lab.getByText('Firewall.mod', { exact: true }).first().click();
  await lab.getByText('Routing.mod', { exact: true }).first().click();
  await page.evaluate(async () => {
    const { useOSStore } = await import('/src/store/useOSStore.ts' as string);
    useOSStore.setState((s: any) => ({ gameplay: { ...s.gameplay, player: { ...s.gameplay.player, stamina: 85 } } }));
  });
  await lab.getByRole('button', { name: 'Compile Protocol Spell (-15 Stamina)', exact: true }).click();
  await expect(lab.locator('.academic-project-desk').getByText('Verified ✓', { exact: true })).toBeVisible();
  await page.unrouteAll({ behavior: 'ignoreErrors' });
  await page.close();
});
