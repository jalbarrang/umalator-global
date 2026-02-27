import { expect, test } from '@playwright/test';

test('skill planner optimizes a candidate skill combination', async ({ page }) => {
  await page.goto('/');

  // Navigate to Skill Planner tab
  await page.getByRole('tab', { name: 'Skill Planner' }).click();
  await expect(page).toHaveURL(/#\/skill-planner/);

  // Wait for Skill Planner to fully render
  const optimizeButton = page.getByRole('button', { name: 'Optimize' });
  await expect(optimizeButton).toBeVisible({ timeout: 10_000 });
  await expect(optimizeButton).toBeDisabled();

  // Open the skill picker drawer
  await page.getByRole('button', { name: 'Add Skills' }).click();
  await expect(page.getByRole('heading', { name: 'Add Skill to Runner' })).toBeVisible();

  // Search for skills and add candidates via keyboard navigation
  const searchInput = page.getByPlaceholder('Search skill by name');
  await expect(searchInput).toBeFocused();
  await searchInput.fill('Corner Adept');
  await expect(page.getByText('Skills available')).toBeVisible();

  // Select first skill: ArrowDown focuses it, Enter selects it
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  await searchInput.focus();
  await searchInput.fill('Swinging Maestro');

  // Select second skill (index resets after each selection)
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  // Close the skill picker
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Add Skill to Runner' })).toBeHidden();

  // Verify candidates were added and Optimize is now enabled
  await expect(page.getByText('Corner Adept', { exact: false }).first()).toBeVisible();
  await expect(optimizeButton).toBeEnabled();

  // Change preset to "Aquarius Cup"
  const presetSelect = page.getByRole('combobox', { name: 'Preset:' });
  await presetSelect.click();
  await page.getByRole('option', { name: 'Aquarius Cup' }).click();

  // Run optimization
  await optimizeButton.click();
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();

  // Wait for results
  await expect(page.getByText('Simulation Complete')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/Combinations Tested:/)).toBeVisible();
  await expect(page.getByText(/Top Results Shown:/)).toBeVisible();
  await expect(page.getByText('Lengths').first()).toBeVisible();

  // Verify baseline result is present
  await expect(page.getByText('No additional skills (baseline)')).toBeVisible();
});
