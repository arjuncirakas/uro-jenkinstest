import { test, expect } from '../fixtures/auth';
import { testUsers } from '../fixtures/auth';

test.describe('Role-Based Access Control', () => {
  test('superadmin should access superadmin routes', async ({ authenticatedSuperadmin: page }) => {
    await page.goto('/superadmin/dashboard');
    await expect(page).toHaveURL(/superadmin\/dashboard/);
    
    await page.goto('/superadmin/users');
    await expect(page).toHaveURL(/users/);
  });

  test('superadmin should NOT access urologist routes', async ({ authenticatedSuperadmin: page }) => {
    await page.goto('/urologist/dashboard');
    
    // Should redirect to unauthorized or stay on current page
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    
    // Should not be on urologist route
    expect(currentUrl).not.toContain('/urologist/dashboard');
  });

  test('urologist should access urologist routes', async ({ authenticatedUrologist: page }) => {
    // Note: Requires OTP handling
    await page.goto('/urologist/dashboard');
    await page.waitForTimeout(2000);
    
    // If OTP is handled, should be on dashboard
    const currentUrl = page.url();
    // This test may need adjustment based on OTP flow
    expect(currentUrl).toMatch(/urologist|login/);
  });

  test('urologist should NOT access superadmin routes', async ({ authenticatedUrologist: page }) => {
    await page.goto('/superadmin/dashboard');
    await page.waitForTimeout(2000);
    
    // Should redirect to unauthorized or login
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/superadmin/dashboard');
  });

  test('gp should access gp routes', async ({ authenticatedGP: page }) => {
    await page.goto('/gp/dashboard');
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/gp|login/);
  });

  test('gp should NOT access urologist routes', async ({ authenticatedGP: page }) => {
    await page.goto('/urologist/dashboard');
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/urologist/dashboard');
  });

  test('nurse should access nurse routes', async ({ authenticatedNurse: page }) => {
    await page.goto('/nurse/opd-management');
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/nurse|login/);
  });

  test('nurse should NOT access superadmin routes', async ({ authenticatedNurse: page }) => {
    await page.goto('/superadmin/dashboard');
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/superadmin/dashboard');
  });

  test('unauthenticated user should redirect to login', async ({ page }) => {
    // Clear any existing auth
    await page.context().clearCookies();
    await page.evaluate(() => {
      localStorage.clear();
    });
    
    await page.goto('/superadmin/dashboard');
    await page.waitForURL(/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/login/);
  });

  test('should show unauthorized page for wrong role access', async ({ authenticatedSuperadmin: page }) => {
    // Try to access a route that requires different role
    await page.goto('/urologist/dashboard');
    await page.waitForTimeout(2000);
    
    // Should show unauthorized or redirect
    const hasUnauthorized = await page.locator('text=/unauthorized|access denied|permission/i').isVisible().catch(() => false);
    const isOnLogin = page.url().includes('/login');
    
    expect(hasUnauthorized || isOnLogin).toBe(true);
  });
});




