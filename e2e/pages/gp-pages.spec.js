import { test, expect } from '../fixtures/auth';
import { waitForLoadingToComplete } from '../utils/helpers';
import { getTestUser } from '../config/testUsers';

test.describe('GP Pages', () => {
  test('should access GP dashboard', async ({ page }) => {
    const gp = getTestUser('gp');

    // Skip test if credentials not configured
    test.skip(!gp, 'GP test credentials not configured. Set E2E_GP_EMAIL and E2E_GP_PASSWORD env vars.');

    await page.goto('/login');
    await page.fill('input[name="email"]', gp.email);
    await page.fill('input[name="password"]', gp.password);
    await page.click('button[type="submit"]');

    // Wait for OTP or dashboard
    await page.waitForTimeout(3000);

    const otpModal = await page.locator('text=Verify Your Identity').isVisible().catch(() => false);

    if (otpModal) {
      test.skip();
    } else {
      await page.waitForURL(/gp\/dashboard/, { timeout: 15000 });
      await expect(page).toHaveURL(/gp\/dashboard/);
    }
  });

  test('should navigate to referred patients page', async ({ page }) => {
    await page.goto('/gp/referred-patients');
    await waitForLoadingToComplete(page);

    await expect(page).toHaveURL(/referred-patients/);

    const pageTitle = await page.locator('text=/referred|patients/i').first().isVisible().catch(() => false);
    expect(pageTitle).toBe(true);
  });

  test('should navigate to active monitoring page', async ({ page }) => {
    await page.goto('/gp/monitoring');
    await waitForLoadingToComplete(page);

    await expect(page).toHaveURL(/monitoring/);
  });

  test('should navigate to medication page', async ({ page }) => {
    await page.goto('/gp/medication');
    await waitForLoadingToComplete(page);

    await expect(page).toHaveURL(/medication/);
  });
});
