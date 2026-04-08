import { expect, test } from '@playwright/test';
import {
  goToNextStep,
  goToReviewStep,
  openSkillPicker,
  openSkillPlanner,
  selectRacePreset,
  selectRunner,
} from './skill-planner.helpers';

test('skill planner optimizes a candidate skill combination', async ({ page }) => {
  await openSkillPlanner(page);
  await selectRunner(page, 'Special Week');
  await selectRacePreset(page, 'Aquarius Cup');
  await goToReviewStep(page);

  const optimizeButton = page.getByRole('button', { name: 'Optimize', exact: true });
  await expect(optimizeButton).toBeVisible({ timeout: 10_000 });
  await expect(optimizeButton).toBeDisabled();

  await page.getByRole('button', { name: 'Go to Shop' }).click();
  await openSkillPicker(page);

  const searchInput = page.getByPlaceholder('Search skill by name');
  await expect(searchInput).toBeFocused();
  await searchInput.fill('Corner Adept');

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Skill Picker' })).toBeHidden();

  await openSkillPicker(page);
  const secondSearchInput = page.getByPlaceholder('Search skill by name');
  await expect(secondSearchInput).toBeFocused();
  await secondSearchInput.fill('Swinging Maestro');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Skill Picker' })).toBeHidden();

  await expect(page.getByText('Corner Adept', { exact: false }).first()).toBeVisible();

  await goToNextStep(page);
  await expect(optimizeButton).toBeEnabled();

  await optimizeButton.click();
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();

  await expect(page.getByText('Simulation Complete')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/Combinations Tested:/)).toBeVisible();
  await expect(page.getByText(/Results:/)).toBeVisible();
  await expect(page.getByText('Lengths').first()).toBeVisible();
  await expect(page.getByText('No additional skills (baseline)')).toBeVisible();
});
