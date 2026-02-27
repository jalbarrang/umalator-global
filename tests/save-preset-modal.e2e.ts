import { expect, test, type Page } from '@playwright/test';

const navigateToSkillPlanner = async (page: Page) => {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Skill Planner' }).click();
  await expect(page).toHaveURL(/#\/skill-planner/);
  await expect(page.getByRole('button', { name: 'Save' })).toBeVisible({ timeout: 10_000 });
};

const selectPreset = async (page: Page, name: string) => {
  const presetSelect = page.getByRole('combobox', { name: 'Preset:' });
  await presetSelect.click();
  await page.getByRole('option', { name }).click();
};

const openSaveModal = async (page: Page) => {
  await page.getByRole('button', { name: 'Save' }).click();
};

test.describe('Save Preset Modal', () => {
  test.describe('without a preset selected', () => {
    test('shows no tabs and defaults to create-new flow', async ({ page }) => {
      await navigateToSkillPlanner(page);
      await openSaveModal(page);

      await expect(page.getByRole('heading', { name: 'Save Race Preset' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Edit' })).toBeHidden();
      await expect(page.getByRole('tab', { name: 'Create New' })).toBeHidden();

      const nameInput = page.getByLabel('Preset Name *');
      await expect(nameInput).toBeVisible();
      await expect(nameInput).toBeEditable();
      await expect(nameInput).toHaveValue('');

      await expect(page.getByRole('button', { name: 'Save Preset' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Update Preset' })).toBeHidden();
    });

    test('saves a new preset', async ({ page }) => {
      await navigateToSkillPlanner(page);
      await openSaveModal(page);

      await page.getByLabel('Preset Name *').fill('My Test Preset');
      await page.getByRole('button', { name: 'Save Preset' }).click();

      await expect(page.getByText('Preset saved successfully!')).toBeVisible();

      const presetSelect = page.getByRole('combobox', { name: 'Preset:' });
      await expect(presetSelect).toContainText('My Test Preset');
    });

    test('shows validation error when name is empty', async ({ page }) => {
      await navigateToSkillPlanner(page);
      await openSaveModal(page);

      await page.getByRole('button', { name: 'Save Preset' }).click();

      await expect(page.getByText('Please enter a preset name')).toBeVisible();
    });
  });

  test.describe('with a preset selected', () => {
    test('shows Edit and Create New tabs, defaults to Edit with readonly name', async ({
      page,
    }) => {
      await navigateToSkillPlanner(page);
      await selectPreset(page, 'Aquarius Cup');
      await openSaveModal(page);

      await expect(page.getByRole('heading', { name: 'Update Preset' })).toBeVisible();

      await expect(page.getByRole('tab', { name: 'Edit' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Create New' })).toBeVisible();

      const nameInput = page.getByLabel('Preset Name *');
      await expect(nameInput).toHaveValue('Aquarius Cup');
      await expect(nameInput).not.toBeEditable();

      await expect(page.getByRole('button', { name: 'Update Preset' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Save Preset' })).toBeHidden();
    });

    test('switching to Create New tab shows editable empty name and Save Preset button', async ({
      page,
    }) => {
      await navigateToSkillPlanner(page);
      await selectPreset(page, 'Aquarius Cup');
      await openSaveModal(page);

      await page.getByRole('tab', { name: 'Create New' }).click();

      await expect(page.getByRole('heading', { name: 'Save Race Preset' })).toBeVisible();

      const nameInput = page.getByLabel('Preset Name *');
      await expect(nameInput).toHaveValue('');
      await expect(nameInput).toBeEditable();

      await expect(page.getByRole('button', { name: 'Save Preset' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Update Preset' })).toBeHidden();
    });

    test('switching back to Edit tab restores readonly name', async ({ page }) => {
      await navigateToSkillPlanner(page);
      await selectPreset(page, 'Aquarius Cup');
      await openSaveModal(page);

      await page.getByRole('tab', { name: 'Create New' }).click();
      await page.getByRole('tab', { name: 'Edit' }).click();

      const nameInput = page.getByLabel('Preset Name *');
      await expect(nameInput).toHaveValue('Aquarius Cup');
      await expect(nameInput).not.toBeEditable();

      await expect(page.getByRole('button', { name: 'Update Preset' })).toBeVisible();
    });

    test('updates an existing preset', async ({ page }) => {
      await navigateToSkillPlanner(page);
      await selectPreset(page, 'Aquarius Cup');
      await openSaveModal(page);

      await page.getByRole('button', { name: 'Update Preset' }).click();

      await expect(page.getByText('Preset updated successfully!')).toBeVisible();
    });

    test('creates a new preset from the Create New tab', async ({ page }) => {
      await navigateToSkillPlanner(page);
      await selectPreset(page, 'Aquarius Cup');
      await openSaveModal(page);

      await page.getByRole('tab', { name: 'Create New' }).click();
      await page.getByLabel('Preset Name *').fill('New From Existing');
      await page.getByRole('button', { name: 'Save Preset' }).click();

      await expect(page.getByText('Preset saved successfully!')).toBeVisible();

      const presetSelect = page.getByRole('combobox', { name: 'Preset:' });
      await expect(presetSelect).toContainText('New From Existing');
    });
  });

  test('cancel closes the dialog without saving', async ({ page }) => {
    await navigateToSkillPlanner(page);
    await openSaveModal(page);

    await page.getByLabel('Preset Name *').fill('Should Not Save');
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(page.getByRole('heading', { name: 'Save Race Preset' })).toBeHidden();
  });
});
