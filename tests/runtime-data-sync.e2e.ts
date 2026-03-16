import { expect, test, type Page } from '@playwright/test';

async function mockMasterDbNetwork(page: Page): Promise<void> {
  await page.route('**/api/ver', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'mocked by e2e test' }),
    });
  });
}

async function selectSpecialWeekForUma1(page: Page): Promise<void> {
  const runnerSelector = page.getByRole('button', { name: /Click me to select a runner/ }).first();
  await expect(runnerSelector).toBeVisible({ timeout: 10_000 });
  await runnerSelector.click();

  const searchInput = page.getByPlaceholder('Search');
  await expect(searchInput).toBeVisible();
  await searchInput.fill('Special Week');

  const specialWeekOption = page.locator('[cmdk-item]').filter({ hasText: 'Special Week' }).first();
  await expect(specialWeekOption).toBeVisible();
  await specialWeekOption.click();
}

test('runner selector renders synced uma entries', async ({ page }) => {
  await mockMasterDbNetwork(page);
  await page.goto('/');
  await page.getByRole('link', { name: 'Skill Planner' }).click();
  await expect(page).toHaveURL(/#\/skill-planner/);
  await selectSpecialWeekForUma1(page);

  await expect(page.getByText('Click me to select a runner')).toBeHidden();
  await expect(page.getByText('[Special Dreamer]').first()).toBeVisible();
  await expect(page.getByText('Special Week').first()).toBeVisible();
});

test('skill planner flow completes after worker hydration', async ({ page }) => {
  test.setTimeout(90_000);

  await page.goto('/');
  await page.getByRole('link', { name: 'Skill Planner' }).click();
  await expect(page).toHaveURL(/#\/skill-planner/);

  const optimizeButton = page.getByRole('button', { name: 'Optimize' });
  await expect(optimizeButton).toBeVisible({ timeout: 10_000 });
  await expect(optimizeButton).toBeDisabled();

  await page.getByRole('button', { name: 'Add Skills' }).click();
  await expect(page.getByRole('heading', { name: 'Add Skill to Runner' })).toBeVisible();

  const searchInput = page.getByPlaceholder('Search skill by name');
  await searchInput.fill('Corner Adept');

  const option = page
    .locator('[data-event="select-skill"]')
    .filter({ hasText: 'Corner Adept' })
    .first();
  await expect(option).toBeVisible();
  await option.click();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Add Skill to Runner' })).toBeHidden();

  const presetSelect = page.getByRole('combobox', { name: 'Preset:' });
  if ((await presetSelect.count()) === 0) {
    const raceSettingsToggle = page.getByRole('button', { name: /·/ }).first();
    await expect(raceSettingsToggle).toBeVisible({ timeout: 10_000 });
    await raceSettingsToggle.click();
  }
  await expect(presetSelect).toBeVisible({ timeout: 10_000 });
  await presetSelect.click();
  await page.getByRole('option', { name: 'Aquarius Cup' }).click();

  await expect(optimizeButton).toBeEnabled();
  await optimizeButton.click();
  await expect(page.getByText('Simulation Complete')).toBeVisible({ timeout: 60_000 });
});
