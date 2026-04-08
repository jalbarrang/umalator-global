import { expect, type Page } from '@playwright/test';

export async function openSkillPlanner(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('link', { name: 'Skill Planner' }).click();
  await expect(page).toHaveURL(/#\/skill-planner/);

  const startFreshButton = page.getByRole('button', { name: 'Start fresh' });
  if ((await startFreshButton.count()) > 0) {
    await startFreshButton.click();
  }
}

export async function selectRunner(page: Page, runnerName: string): Promise<void> {
  const runnerSelector = page.getByRole('button', { name: /Click me to select a runner/ }).first();
  await expect(runnerSelector).toBeVisible({ timeout: 10_000 });
  await runnerSelector.click();

  const searchInput = page.getByPlaceholder('Search');
  await expect(searchInput).toBeVisible();
  await searchInput.fill(runnerName);

  const runnerOption = page.locator('[cmdk-item]').filter({ hasText: runnerName }).first();
  await expect(runnerOption).toBeVisible();
  await runnerOption.click();
}

export async function selectRacePreset(page: Page, presetName: string): Promise<void> {
  const presetSelect = page.getByRole('combobox', { name: 'Preset:' });
  if ((await presetSelect.count()) === 0) {
    const raceSettingsToggle = page.getByRole('button', { name: /·/ }).first();
    await expect(raceSettingsToggle).toBeVisible({ timeout: 10_000 });
    await raceSettingsToggle.click();
  }

  await expect(presetSelect).toBeVisible({ timeout: 10_000 });
  await presetSelect.click();
  await page.getByRole('option', { name: presetName }).click();
}

export async function goToNextStep(page: Page): Promise<void> {
  const nextButton = page.getByRole('button', { name: 'Next' });
  await expect(nextButton).toBeEnabled();
  await nextButton.click();
}

export async function goToShopStep(page: Page): Promise<void> {
  await goToNextStep(page);
}

export async function goToReviewStep(page: Page): Promise<void> {
  await goToShopStep(page);
  await goToNextStep(page);
}

export async function openSkillPicker(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Add skills manually' }).click();
  await expect(page.getByRole('heading', { name: 'Skill Picker' })).toBeVisible();
}

export async function addCandidateSkill(page: Page, skillName: string): Promise<void> {
  const searchInput = page.getByPlaceholder('Search skill by name');
  await expect(searchInput).toBeVisible();
  await searchInput.fill(skillName);

  const skillOption = page.locator('[data-event="select-skill"]').filter({ hasText: skillName }).first();
  await expect(skillOption).toBeVisible();
  await skillOption.click();
}
