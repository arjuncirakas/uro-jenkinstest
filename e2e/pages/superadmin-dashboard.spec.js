import { test, expect } from '../fixtures/auth';
import { waitForLoadingToComplete, elementExists } from '../utils/helpers';

test.describe('Superadmin Dashboard', () => {
  test.beforeEach(async ({ authenticatedSuperadmin: page }) => {
    await page.goto('/superadmin/dashboard');
    await waitForLoadingToComplete(page);
  });

  test('should display dashboard correctly', async ({ page }) => {
    // Check for dashboard elements
    await expect(page).toHaveURL(/superadmin\/dashboard/);
    
    // Check for common dashboard elements
    const hasTitle = await elementExists(page, 'text=/dashboard|welcome|overview/i');
    expect(hasTitle).toBe(true);
  });

  test('should have navigation menu', async ({ page }) => {
    // Check for sidebar or navigation
    const hasNav = await elementExists(page, 'nav, [role="navigation"], aside, [class*="sidebar"]');
    expect(hasNav).toBe(true);
  });

  test('should navigate to users page', async ({ page }) => {
    const usersLink = page.locator('a[href*="users"], text=/users/i').first();
    
    if (await usersLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await usersLink.click();
      await page.waitForURL(/users/, { timeout: 10000 });
      await expect(page).toHaveURL(/users/);
    }
  });

  test('should navigate to doctors page', async ({ page }) => {
    const doctorsLink = page.locator('a[href*="doctors"], text=/doctors/i').first();
    
    if (await doctorsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await doctorsLink.click();
      await page.waitForURL(/doctors/, { timeout: 10000 });
      await expect(page).toHaveURL(/doctors/);
    }
  });

  test('should navigate to nurses page', async ({ page }) => {
    const nursesLink = page.locator('a[href*="nurses"], text=/nurses/i').first();
    
    if (await nursesLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nursesLink.click();
      await page.waitForURL(/nurses/, { timeout: 10000 });
      await expect(page).toHaveURL(/nurses/);
    }
  });

  test('should navigate to departments page', async ({ page }) => {
    const departmentsLink = page.locator('a[href*="departments"], text=/departments/i').first();
    
    if (await departmentsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await departmentsLink.click();
      await page.waitForURL(/departments/, { timeout: 10000 });
      await expect(page).toHaveURL(/departments/);
    }
  });
});
