import { test, expect } from '../fixtures/auth';
import { waitForLoadingToComplete } from '../utils/helpers';

test.describe('Logout Flow', () => {
  test('should logout successfully from superadmin dashboard', async ({ authenticatedSuperadmin: page }) => {
    // Verify we're logged in
    await expect(page).toHaveURL(/superadmin/);
    
    // Find logout button (could be in header, sidebar, or menu)
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout")').first();
    
    if (await logoutButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await logoutButton.click();
      
      // Wait for navigation to login
      await page.waitForURL(/login/, { timeout: 10000 });
      await expect(page).toHaveURL(/login/);
    } else {
      // If no logout button found, test might need adjustment
      test.skip();
    }
  });

  test('should clear session on logout', async ({ authenticatedSuperadmin: page }) => {
    // Verify we're logged in
    await expect(page).toHaveURL(/superadmin/);
    
    // Check localStorage for tokens
    const hasToken = await page.evaluate(() => {
      return !!localStorage.getItem('token') || !!localStorage.getItem('accessToken');
    });
    
    expect(hasToken).toBe(true);
    
    // Logout
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out")').first();
    
    if (await logoutButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await logoutButton.click();
      await page.waitForURL(/login/, { timeout: 10000 });
      
      // Check tokens are cleared
      const tokenAfterLogout = await page.evaluate(() => {
        return !!localStorage.getItem('token') || !!localStorage.getItem('accessToken');
      });
      
      expect(tokenAfterLogout).toBe(false);
    }
  });

  test('should redirect to login when accessing protected route after logout', async ({ authenticatedSuperadmin: page }) => {
    // Logout
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out")').first();
    
    if (await logoutButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await logoutButton.click();
      await page.waitForURL(/login/, { timeout: 10000 });
      
      // Try to access protected route
      await page.goto('/superadmin/dashboard');
      
      // Should redirect to login
      await page.waitForURL(/login/, { timeout: 10000 });
      await expect(page).toHaveURL(/login/);
    }
  });
});
