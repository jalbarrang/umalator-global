import { expect, test } from '@playwright/test';
import {
  addCandidateSkill,
  goToNextStep,
  openSkillPicker,
  openSkillPlanner,
  selectRacePreset,
  selectRunner,
} from './skill-planner.helpers';

function parseCost(text: string | null): number {
  const raw = text ?? '';
  const match = raw.match(/(\d+)\s*(?:SP|pts)/i);
  if (!match) {
    throw new Error(`Could not parse cost from: "${raw}"`);
  }
  return Number(match[1]);
}

test('skill planner optimization uses hinted net cost', async ({ page }) => {
  await openSkillPlanner(page);
  await selectRunner(page, 'Special Week');
  await selectRacePreset(page, 'Aquarius Cup');
  await goToNextStep(page);

  await openSkillPicker(page);
  await addCandidateSkill(page, 'Corner Adept');

  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Skill Picker' })).toBeHidden();

  const candidateRow = page
    .locator('[data-slot="skill-item"]')
    .filter({ hasText: 'Corner Adept' })
    .first();
  await expect(candidateRow).toBeVisible();

  const currentCostButton = candidateRow.getByRole('button', { name: /\d+\s*SP/ }).first();
  await expect(currentCostButton).toBeVisible();
  const grossCost = parseCost(await currentCostButton.textContent());

  await currentCostButton.click();
  const costDetailsPopover = page
    .locator('[data-slot="popover-content"]')
    .filter({ hasText: 'Cost details' })
    .first();
  await expect(costDetailsPopover).toBeVisible();

  const hintSelect = costDetailsPopover.getByRole('combobox').first();
  await hintSelect.click();
  await page.getByRole('option', { name: /Lvl Max \(40%\)/ }).click();

  await expect
    .poll(async () => parseCost(await currentCostButton.textContent()))
    .toBeLessThan(grossCost);
  const netCost = parseCost(await currentCostButton.textContent());
  expect(netCost).toBeLessThan(grossCost);

  await goToNextStep(page);

  const optimizeButton = page.getByRole('button', { name: 'Optimize', exact: true });
  await expect(optimizeButton).toBeVisible({ timeout: 10_000 });

  await page.locator('#budget').fill(String(netCost));
  await expect(optimizeButton).toBeEnabled();

  await optimizeButton.click();
  await expect(page.getByText('Simulation Complete')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(`${netCost} / ${netCost} pts`)).toBeVisible();
});
