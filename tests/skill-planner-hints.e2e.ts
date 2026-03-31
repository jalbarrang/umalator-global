import { expect, test } from '@playwright/test';

function parseCost(text: string | null): number {
  const raw = text ?? '';
  const match = raw.match(/(\d+)\s*(?:SP|pts)/i);
  if (!match) {
    throw new Error(`Could not parse cost from: "${raw}"`);
  }
  return Number(match[1]);
}

test('skill planner optimization uses hinted net cost', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('link', { name: 'Skill Planner' }).click();
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

  // Wait for candidate row to render and read its displayed net cost.
  const candidateRow = page
    .locator('[data-event="select-skill"]')
    .filter({ hasText: 'Corner Adept' })
    .first();
  await expect(candidateRow).toBeVisible();

  const currentCostButton = candidateRow.getByRole('button', { name: /\d+\s*SP/ }).first();
  await expect(currentCostButton).toBeVisible();
  const grossCost = parseCost(await currentCostButton.textContent());

  // Open cost details, set max hint, and verify candidate cost is reduced.
  await currentCostButton.click();
  const costDetailsPopover = page
    .locator('[data-slot="popover-content"]')
    .filter({ hasText: 'Cost details' })
    .first();
  await expect(costDetailsPopover).toBeVisible();

  const hintSelect = costDetailsPopover.getByRole('combobox').first();
  await hintSelect.click();
  await page.getByRole('option', { name: /Lvl Max \(40%\)/ }).click();

  await expect.poll(async () => parseCost(await currentCostButton.textContent())).toBeLessThan(grossCost);
  const netCost = parseCost(await currentCostButton.textContent());
  expect(netCost).toBeLessThan(grossCost);

  // Budget exactly at net cost: valid only if optimizer uses net cost.
  await page.locator('#budget').fill(String(netCost));
  await expect(optimizeButton).toBeEnabled();

  await optimizeButton.click();
  await expect(page.getByText('Simulation Complete')).toBeVisible({ timeout: 60_000 });

  // If gross cost is incorrectly used, only baseline would appear and this cost line won't exist.
  await expect(page.getByText(`${netCost} / ${netCost} pts`)).toBeVisible();
});
