import { expect, test, type Page } from '@playwright/test';
import {
  addCandidateSkill,
  goToNextStep,
  goToReviewStep,
  openSkillPicker,
  openSkillPlanner,
  selectRacePreset,
  selectRunner,
} from './skill-planner.helpers';

async function mockMasterDbNetwork(page: Page): Promise<void> {
  await page.route('**/api/ver', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'mocked by e2e test' }),
    });
  });
}

test('runner selector renders synced uma entries', async ({ page }) => {
  await mockMasterDbNetwork(page);
  await openSkillPlanner(page);
  await selectRunner(page, 'Special Week');

  await expect(page.getByText('Click me to select a runner')).toBeHidden();
  await expect(page.getByText('[Special Dreamer]').first()).toBeVisible();
  await expect(page.getByText('Special Week').first()).toBeVisible();
});

test('skill planner flow completes after worker hydration', async ({ page }) => {
  test.setTimeout(90_000);

  await openSkillPlanner(page);
  await selectRunner(page, 'Special Week');
  await selectRacePreset(page, 'Aquarius Cup');
  await goToReviewStep(page);

  const optimizeButton = page.getByRole('button', { name: 'Optimize', exact: true });
  await expect(optimizeButton).toBeVisible({ timeout: 10_000 });
  await expect(optimizeButton).toBeDisabled();

  await page.getByRole('button', { name: 'Go to Shop' }).click();
  await openSkillPicker(page);
  await addCandidateSkill(page, 'Corner Adept');

  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Skill Picker' })).toBeHidden();

  await goToNextStep(page);
  await expect(optimizeButton).toBeEnabled();
  await optimizeButton.click();
  await expect(page.getByText('Simulation Complete')).toBeVisible({ timeout: 60_000 });
});
