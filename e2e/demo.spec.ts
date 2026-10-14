import { test, expect } from '@playwright/test';

/**
 * Smoke tests for the offline demo. Demo mode bypasses Microsoft Entra, so
 * these run without any credentials or network access to Graph.
 */

async function enterDemo(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore the live demo' }).click();
  // The walkthrough auto-launches on entry — skip it.
  await page.getByRole('button', { name: 'Skip', exact: true }).click();
}

test('demo lists seeded schema extensions', async ({ page }) => {
  await enterDemo(page);
  await expect(page.getByText('Demo', { exact: true })).toBeVisible();

  await page.getByRole('link', { name: 'Schema extensions' }).click();
  await expect(page.getByText('In development').first()).toBeVisible();
});

test('demo usage monitor populates from the simulated tenant', async ({ page }) => {
  await enterDemo(page);
  await page.getByRole('link', { name: 'Usage monitor' }).click();
  await expect(page.getByText('Resources with a value')).toBeVisible();
});

test('command palette opens with Ctrl+K', async ({ page }) => {
  await enterDemo(page);
  await page.keyboard.press('Control+k');
  await expect(page.getByPlaceholder('Type a command or search')).toBeVisible();
});

test('directory Bulk Update is write-only and updates all objects despite a filter', async ({
  page,
}) => {
  await enterDemo(page);
  const action = page.getByRole('button', { name: /^Actions for .*employeeRegion$/ });
  await action.click();
  await expect(page.getByRole('menuitem', { name: 'Bulk Update', exact: true })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.getByRole('group', { name: 'Access mode' }).getByRole('button').nth(1).click();
  await action.click();
  await page.getByRole('menuitem', { name: 'Bulk Update', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Bulk Update', exact: true });
  await expect(dialog.getByRole('checkbox', { name: /^Select User / }).first()).toBeVisible();
  const count = await dialog.getByRole('checkbox', { name: /^Select User / }).count();
  await dialog.getByRole('radio', { name: 'All available objects' }).check();
  await dialog.getByRole('textbox', { name: 'Filter objects' }).fill('no matching objects');
  await dialog.getByRole('textbox', { name: 'Value', exact: true }).fill('BulkRegion');
  await dialog.getByRole('button', { name: 'Review update' }).click();
  await expect(
    dialog.getByText(`Permanently update ${count} object(s)`, { exact: false }),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Confirm update' }).click();
  await expect(dialog.getByText(`${count} updated · 0 failed`, { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: /^Assign value for .*employeeRegion$/ }).click();
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Assign', exact: true }),
  ).toBeVisible();
});

test('schema Bulk Update writes a selected user and group', async ({ page }) => {
  await enterDemo(page);
  await page.getByRole('group', { name: 'Access mode' }).getByRole('button').nth(1).click();
  await page.getByRole('link', { name: 'Schema extensions' }).click();
  await page.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Available', exact: true }).click();
  await page.getByRole('button', { name: 'Actions for extlearn01_courses' }).click();
  await page.getByRole('menuitem', { name: 'Bulk Update', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Bulk Update', exact: true });
  await dialog
    .getByRole('checkbox', { name: /^Select User / })
    .first()
    .check();
  await dialog
    .getByRole('checkbox', { name: /^Select Group / })
    .first()
    .check();
  await dialog
    .getByRole('textbox', { name: 'Property values (JSON)' })
    .fill('{"courseId":42,"courseName":"Bulk course"}');
  await dialog.getByRole('button', { name: 'Review update' }).click();
  await dialog.getByRole('button', { name: 'Confirm update' }).click();
  await expect(dialog.getByText('2 updated · 0 failed', { exact: true })).toBeVisible();
});

test('adjacent assignment actions and combined property filters narrow a bulk write', async ({
  page,
}) => {
  await enterDemo(page);
  const bulk = page.getByRole('button', { name: /^Bulk Assign\/Update for .*employeeRegion$/ });
  await expect(bulk).toHaveCount(0);
  await page.getByRole('group', { name: 'Access mode' }).getByRole('button').nth(1).click();
  await expect(
    page.getByRole('button', { name: /^Assign value for .*employeeRegion$/ }),
  ).toBeVisible();
  await bulk.click();
  const dialog = page.getByRole('dialog', { name: 'Bulk Update', exact: true });
  await dialog.getByRole('radio', { name: 'All available objects' }).check();
  for (const [index, property, value] of [
    [1, 'department', 'Engineering'],
    [2, 'extensionAttribute1', 'West'],
    [3, 'groupMembership', '11111111-0000-4000-8000-000000000001'],
    [4, 'administrativeUnitMembership', '22222222-0000-4000-8000-000000000001'],
  ] as const) {
    await dialog.getByRole('button', { name: 'Add filter', exact: true }).click();
    await dialog
      .getByRole('combobox', { name: `Property ${index}`, exact: true })
      .selectOption(property);
    await dialog.getByRole('textbox', { name: `Filter value ${index}`, exact: true }).fill(value);
  }
  await expect(dialog.getByRole('button', { name: 'Review update' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await expect(dialog.getByRole('checkbox', { name: /^Select User / })).toHaveCount(1);
  await expect(dialog.getByRole('checkbox', { name: 'Select User Adele Vance' })).toBeVisible();
  await dialog.getByRole('textbox', { name: 'Value', exact: true }).fill('FilteredRegion');
  await dialog.getByRole('button', { name: 'Review update' }).click();
  await expect(dialog.getByText('Applied filters:', { exact: false })).toBeVisible();
  await dialog.getByRole('button', { name: 'Confirm update' }).click();
  await expect(dialog.getByText('1 updated · 0 failed', { exact: true })).toBeVisible();
});

test('assignment walkthrough demonstrates single and bulk scenarios without writing', async ({
  page,
}) => {
  await enterDemo(page);
  await page.getByRole('group', { name: 'Access mode' }).getByRole('button').nth(1).click();
  await page.getByRole('button', { name: /^Bulk Assign\/Update for .*employeeRegion$/ }).click();
  await page.getByRole('button', { name: 'Assignment walkthrough', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Assign a value to a single object', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Bulk assign or update values', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Narrow the target set', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Review before writing', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Finish', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Bulk Update', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review update' })).toBeDisabled();
});

test('schema adjacent single-object action permits exactly one selected object', async ({
  page,
}) => {
  await enterDemo(page);
  await page.getByRole('group', { name: 'Access mode' }).getByRole('button').nth(1).click();
  await page.getByRole('link', { name: 'Schema extensions' }).click();
  await page.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Available', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Bulk Assign/Update for extlearn01_courses', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Assign value for extlearn01_courses', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Assign value', exact: true });
  await expect(dialog.getByRole('radio', { name: 'All available objects' })).toHaveCount(0);
  await dialog.getByRole('checkbox', { name: 'Select User Adele Vance' }).check();
  await dialog.getByRole('checkbox', { name: 'Select User Alex Wilber' }).check();
  await expect(dialog.getByRole('checkbox', { name: 'Select User Adele Vance' })).not.toBeChecked();
  await dialog.getByRole('textbox', { name: 'Property values (JSON)' }).fill('{"courseId":75}');
  await dialog.getByRole('button', { name: 'Review update' }).click();
  await dialog.getByRole('button', { name: 'Confirm update' }).click();
  await expect(dialog.getByText('1 updated · 0 failed', { exact: true })).toBeVisible();
});

for (const viewport of [
  { width: 1440, height: 1000 },
  { width: 390, height: 844 },
]) {
  test(`contextual tour starts with its introduction and flows through all steps at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await enterDemo(page);
    await page.getByRole('button', { name: /^Actions for .*employeeRegion$/ }).waitFor();
    const trigger = page.getByRole('button', { name: 'Take a guided tour', exact: true });
    await trigger.click();
    const expected = [
      'Quick tour',
      'Browse & manage extensions',
      'Read & Edit modes',
      'Directory extensions',
      'Assign a value to a single object',
      'Bulk assign or update values',
      'Switch tenants',
      'Make it yours',
      'Light or dark',
      'Your session',
    ];
    for (const [index, title] of expected.entries()) {
      const tour = page.getByRole('dialog', { name: title, exact: true });
      await expect(tour).toBeVisible();
      await expect(tour.getByText(`Step ${index + 1} of 10`, { exact: true })).toBeVisible();
      const box = await tour.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height + 1);
      if (index === 4) {
        await tour.getByRole('button', { name: 'Back', exact: true }).click();
        await expect(
          page.getByRole('dialog', { name: expected[index - 1], exact: true }),
        ).toBeVisible();
        await page.getByRole('button', { name: 'Next', exact: true }).click();
      }
      await page
        .getByRole('button', { name: index === 9 ? 'Finish' : 'Next', exact: true })
        .click();
    }
    await expect(page.locator('#eem-tour-title')).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
}

for (const variant of ['directory', 'schema'] as const) {
  test(`${variant} assignment tour highlights single and bulk buttons separately`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await enterDemo(page);
    await page.getByRole('group', { name: 'Access mode' }).getByRole('button').nth(1).click();
    if (variant === 'schema') await page.getByRole('link', { name: 'Schema extensions', exact: true }).click();
    await page.locator(`[data-tour="${variant}-assign-single"]`).first().waitFor();
    await page.getByRole('button', { name: 'Take a guided tour', exact: true }).click();
    for (let index = 0; index < (variant === 'directory' ? 4 : 5); index++) {
      await page.getByRole('button', { name: 'Next', exact: true }).click();
    }
    for (const [mode, title] of [
      ['single', 'Assign a value to a single object'],
      ['bulk', 'Bulk assign or update values'],
    ] as const) {
      await expect(page.getByRole('dialog', { name: title, exact: true })).toBeVisible();
      const target = page.locator(`[data-tour="${variant}-assign-${mode}"]`).first();
      await expect(target).toHaveJSProperty('tagName', 'BUTTON');
      await expect.poll(async () => {
        const button = await target.boundingBox();
        const spotlight = await page.getByTestId('tour-spotlight').boundingBox();
        if (!button || !spotlight) return false;
        return Math.abs(spotlight.x - (button.x - 6)) < 1 &&
          Math.abs(spotlight.y - (button.y - 6)) < 1 &&
          Math.abs(spotlight.width - (button.width + 16)) < 1 &&
          Math.abs(spotlight.height - (button.height + 16)) < 1;
      }).toBe(true);
      await page.getByRole('button', { name: 'Next', exact: true }).click();
    }
  });
}

test('property filter controls fit the mobile assignment dialog', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await enterDemo(page);
  await page.getByRole('group', { name: 'Access mode' }).getByRole('button').nth(1).click();
  await page.getByRole('button', { name: /^Bulk Assign\/Update for .*employeeRegion$/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Bulk Update', exact: true });
  await dialog.getByRole('button', { name: 'Add filter', exact: true }).click();
  await dialog
    .getByRole('combobox', { name: 'Property 1', exact: true })
    .selectOption('administrativeUnitMembership');
  const widths = await dialog.evaluate((element) => ({
    content: element.clientWidth,
    scroll: element.scrollWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.content + 1);
  for (const control of await dialog.locator('select, input').all()) {
    const box = await control.boundingBox();
    if (!box) continue;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(391);
  }
});
