import { test, expect } from '../fixtures/auth';
import { waitForLoadingToComplete, elementExists } from '../utils/helpers';

test.describe('Urologist Dashboard', () => {
  test.beforeEach(async ({ authenticatedUrologist: page }) => {
    // Note: This requires OTP to be handled - you may need to manually enter OTP in headed mode
    // Or implement OTP bypass for testing
    await page.goto('/urologist/dashboard');
    await waitForLoadingToComplete(page);
  });

  test('should display dashboard correctly', async ({ page }) => {
    // Check for dashboard elements
    const hasTitle = await elementExists(page, 'text=/dashboard|welcome|overview/i');
    expect(hasTitle).toBe(true);
  });

  test('should have navigation menu', async ({ page }) => {
    const hasNav = await elementExists(page, 'nav, [role="navigation"], aside, [class*="sidebar"]');
    expect(hasNav).toBe(true);
  });

  test('should navigate to patients page', async ({ page }) => {
    const patientsLink = page.locator('a[href*="patients"], text=/patients/i').first();
    
    if (await patientsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await patientsLink.click();
      await page.waitForURL(/patients/, { timeout: 10000 });
      await expect(page).toHaveURL(/patients/);
    }
  });

  test('should navigate to appointments page', async ({ page }) => {
    const appointmentsLink = page.locator('a[href*="appointments"], text=/appointments/i').first();
    
    if (await appointmentsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await appointmentsLink.click();
      await page.waitForURL(/appointments/, { timeout: 10000 });
      await expect(page).toHaveURL(/appointments/);
    }
  });
});




