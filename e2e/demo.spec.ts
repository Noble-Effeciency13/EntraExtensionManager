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

test('demo usage monitor populates from the simulated tenant', async ({
  page,
}) => {
  await enterDemo(page);
  await page.getByRole('link', { name: 'Usage monitor' }).click();
  await expect(page.getByText('Resources with a value')).toBeVisible();
});

test('command palette opens with Ctrl+K', async ({ page }) => {
  await enterDemo(page);
  await page.keyboard.press('Control+k');
  await expect(
    page.getByPlaceholder('Type a command or search'),
  ).toBeVisible();
});
