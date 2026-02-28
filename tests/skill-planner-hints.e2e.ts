import { expect, test } from '@playwright/test';

function parseCost(text: string | null): number {
  const raw = text ?? '';
  const match = raw.match(/(\d+)\s*pts/);
  if (!match) {
    throw new Error(`Could not parse cost from: "${raw}"`);
  }
  return Number(match[1]);
}

test('skill planner optimization uses hinted net cost', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('tab', { name: 'Skill Planner' }).click();
  await expect(page).toHaveURL(/#\/skill-planner/);

  const optimizeButton = page.getByRole('button', { name: 'Optimize' });
  await expect(optimizeButton).toBeVisible({ timeout: 10_000 });
  await expect(optimizeButton).toBeDisabled();

  // Add one candidate skill to isolate cost behavior.
  await page.getByRole('button', { name: 'Add Skills' }).click();
  await expect(page.getByRole('heading', { name: 'Add Skill to Runner' })).toBeVisible();

  const searchInput = page.getByPlaceholder('Search skill by name');
  await searchInput.fill('Corner Adept');

  // Prefer direct click on the rendered row over keyboard navigation; this is more deterministic.
  const cornerAdeptOption = page
    .locator('[data-event="select-skill"]')
    .filter({ hasText: 'Corner Adept' })
    .first();
  await expect(cornerAdeptOption).toBeVisible();
  await cornerAdeptOption.click();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Add Skill to Runner' })).toBeHidden();

  // Wait for candidate controls to render.
  const hintSelect = page.locator('[id^="hint-"]').first();
  await expect(hintSelect).toBeVisible();
  await expect(page.getByText('Corner Adept', { exact: false }).first()).toBeVisible();

  const currentCostValue = page.getByText('Cost:').locator('xpath=following-sibling::span').first();
  await expect(currentCostValue).toBeVisible();
  const grossCost = parseCost(await currentCostValue.textContent());

  // Set max hint and verify displayed candidate cost is reduced.
  await hintSelect.click();
  await page.getByRole('option', { name: 'Lvl Max (40% off)' }).click();

  await expect(currentCostValue).toHaveText(/\d+\s*pts/);
  const netCost = parseCost(await currentCostValue.textContent());
  expect(netCost).toBeLessThan(grossCost);

  // Budget exactly at net cost: valid only if optimizer uses net cost.
  await page.locator('#budget').fill(String(netCost));
  await expect(optimizeButton).toBeEnabled();

  await optimizeButton.click();
  await expect(page.getByText('Simulation Complete')).toBeVisible({ timeout: 60_000 });

  // If gross cost is incorrectly used, only baseline would appear and this cost line won't exist.
  await expect(page.getByText(`${netCost} / ${netCost} pts`)).toBeVisible();
});
