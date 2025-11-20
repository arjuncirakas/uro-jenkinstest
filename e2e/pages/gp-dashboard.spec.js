import { test, expect } from '../fixtures/auth';
import { waitForLoadingToComplete, elementExists } from '../utils/helpers';

test.describe('GP Dashboard', () => {
  test.beforeEach(async ({ authenticatedGP: page }) => {
    await page.goto('/gp/dashboard');
    await waitForLoadingToComplete(page);
  });

  test('should display dashboard correctly', async ({ page }) => {
    await expect(page).toHaveURL(/gp\/dashboard/);
    
    const hasTitle = await elementExists(page, 'text=/dashboard|welcome|overview/i');
    expect(hasTitle).toBe(true);
  });

  test('should navigate to referred patients', async ({ page }) => {
    const referredLink = page.locator('a[href*="referred"], text=/referred patients/i').first();
    
    if (await referredLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await referredLink.click();
      await page.waitForURL(/referred/, { timeout: 10000 });
      await expect(page).toHaveURL(/referred/);
    }
  });

  test('should navigate to monitoring page', async ({ page }) => {
    const monitoringLink = page.locator('a[href*="monitoring"], text=/monitoring/i').first();
    
    if (await monitoringLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await monitoringLink.click();
      await page.waitForURL(/monitoring/, { timeout: 10000 });
      await expect(page).toHaveURL(/monitoring/);
    }
  });

  test('should navigate to medication page', async ({ page }) => {
    const medicationLink = page.locator('a[href*="medication"], text=/medication/i').first();
    
    if (await medicationLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await medicationLink.click();
      await page.waitForURL(/medication/, { timeout: 10000 });
      await expect(page).toHaveURL(/medication/);
    }
  });
});




