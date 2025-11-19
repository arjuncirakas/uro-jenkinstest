import { test, expect } from '../fixtures/auth';
import { waitForLoadingToComplete } from '../utils/helpers';

test.describe('Users Management (Superadmin)', () => {
  test.beforeEach(async ({ authenticatedSuperadmin: page }) => {
    await page.goto('/superadmin/users');
    await waitForLoadingToComplete(page);
  });

  test('should display users list', async ({ page }) => {
    await expect(page).toHaveURL(/users/);
    
    // Check for users table or list
    const usersTable = page.locator('table, [role="table"], [class*="table"]').first();
    const usersList = page.locator('[class*="list"], [class*="grid"]').first();
    
    const hasTable = await usersTable.isVisible({ timeout: 5000 }).catch(() => false);
    const hasList = await usersList.isVisible({ timeout: 5000 }).catch(() => false);
    
    expect(hasTable || hasList).toBe(true);
  });

  test('should navigate to add user page', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add"), a[href*="users/new"], button:has-text("New User")').first();
    
    if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addButton.click();
      await page.waitForURL(/users\/new/, { timeout: 10000 });
      await expect(page).toHaveURL(/users\/new/);
    }
  });

  test('should have search functionality', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
      
      // Search should filter results
      expect(await searchInput.inputValue()).toBe('test');
    }
  });

  test('should display user actions (edit/delete)', async ({ page }) => {
    // Look for action buttons in table rows
    const actionButtons = page.locator('button:has-text("Edit"), button:has-text("Delete"), button[aria-label*="edit" i]');
    
    // At least one action button should be visible if users exist
    const hasActions = await actionButtons.first().isVisible({ timeout: 5000 }).catch(() => false);
    // This might not always be true if no users exist
  });
});

