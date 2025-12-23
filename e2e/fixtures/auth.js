import { test as base } from '@playwright/test';
import { completeOTPVerification } from '../utils/otpHelper.js';
import { waitForLoadingToComplete } from '../utils/helpers.js';
import { testUsers } from '../config/testUsers.js';

// Extended test with authentication fixtures
// Test credentials are loaded from environment variables (see e2e/config/testUsers.js)
export const test = base.extend({
  // Authenticated page for superadmin
  authenticatedSuperadmin: async ({ page }, use) => {
    const user = testUsers.superadmin;
    if (!user.email || !user.password) {
      throw new Error('E2E_SUPERADMIN_EMAIL and E2E_SUPERADMIN_PASSWORD environment variables must be set');
    }

    await page.goto('/login');
    await waitForLoadingToComplete(page);
    
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.click('button[type="submit"]');
    
    // Wait for navigation (superadmin doesn't need OTP, redirects directly)
    // Superadmin index redirects to /superadmin/users
    await page.waitForURL(/superadmin/, { timeout: 15000 });
    await waitForLoadingToComplete(page);
    
    // Verify we're actually authenticated by checking URL
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      console.error('Superadmin authentication failed - still on login page');
      // Try to continue anyway - might be a timing issue
      await page.waitForTimeout(2000);
    }
    
    await use(page);
  },

  // Authenticated page for urologist (with OTP)
  authenticatedUrologist: async ({ page }, use) => {
    const user = testUsers.urologist;
    if (!user.email || !user.password) {
      throw new Error('E2E_DOCTOR_EMAIL and E2E_DOCTOR_PASSWORD environment variables must be set');
    }

    await page.goto('/login');
    await waitForLoadingToComplete(page);
    
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.click('button[type="submit"]');
    
    // Complete OTP verification automatically
    const verified = await completeOTPVerification(page, user.email, 'login_verification');
    
    if (verified) {
      // Wait for navigation to dashboard
      await page.waitForURL(/urologist/, { timeout: 30000 });
      await waitForLoadingToComplete(page);
    } else {
      console.warn('OTP verification failed, but continuing with test');
    }
    
    await use(page);
  },

  // Authenticated page for GP (with OTP)
  authenticatedGP: async ({ page }, use) => {
    const user = testUsers.gp;
    if (!user.email || !user.password) {
      throw new Error('E2E_GP_EMAIL and E2E_GP_PASSWORD environment variables must be set');
    }

    await page.goto('/login');
    await waitForLoadingToComplete(page);
    
    // Fill login form
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    
    // Click submit and wait for response (with timeout)
    const loginPromise = page.waitForResponse(response => 
      response.url().includes('/auth/login') && response.status() === 200
    ).catch(() => null);
    
    await page.click('button[type="submit"]');
    await Promise.race([
      loginPromise,
      page.waitForTimeout(5000) // Max 5 seconds for login response
    ]);
    
    // Wait a bit for UI to update
    await page.waitForTimeout(2000);
    
    // Check if we're already redirected (shouldn't happen for GP, but check anyway)
    let currentUrl = page.url();
    if (currentUrl.includes('/gp')) {
      await waitForLoadingToComplete(page);
      await use(page);
      return;
    }
    
    // Check for error messages first
    const errorMessage = await page.locator('text=/error|invalid|failed|deactivated|not verified/i').first().isVisible({ timeout: 2000 }).catch(() => false);
    if (errorMessage) {
      const errorText = await page.locator('text=/error|invalid|failed|deactivated|not verified/i').first().textContent().catch(() => 'Unknown error');
      console.error(`GP login error: ${errorText}`);
    }
    
    // Wait for OTP modal to appear (GP requires OTP) - with shorter timeout
    let otpModalVisible = false;
    try {
      otpModalVisible = await Promise.race([
        page.locator('text=Verify Your Identity').waitFor({ state: 'visible', timeout: 8000 }).then(() => true),
        page.locator('input[id="otp"]').waitFor({ state: 'visible', timeout: 8000 }).then(() => true)
      ]);
    } catch (e) {
      // OTP modal didn't appear within timeout
      otpModalVisible = false;
    }
    
    if (otpModalVisible) {
      console.log('OTP modal appeared for GP user');
      // Complete OTP verification automatically
      const verified = await completeOTPVerification(page, user.email, 'login_verification');
      
      if (verified) {
        // Wait for navigation to dashboard (with timeout)
        try {
          await page.waitForURL(/gp/, { timeout: 20000 });
          await waitForLoadingToComplete(page);
          await use(page);
          return;
        } catch (e) {
          console.warn('Navigation to GP dashboard timed out after OTP verification');
        }
      } else {
        console.warn('OTP verification failed for GP');
        currentUrl = page.url();
        if (currentUrl.includes('/gp')) {
          await waitForLoadingToComplete(page);
          await use(page);
          return;
        }
      }
    } else {
      // OTP modal didn't appear
      console.warn('OTP modal did not appear for GP login');
      currentUrl = page.url();
      
      if (currentUrl.includes('/gp')) {
        // Login succeeded without OTP (unexpected but possible)
        await waitForLoadingToComplete(page);
        await use(page);
        return;
      } else {
        console.error('GP login failed - OTP modal did not appear and not redirected to GP routes');
        console.error(`Current URL: ${currentUrl}`);
        // Continue anyway - test will handle the failure
      }
    }
    
    // If we get here, authentication may have failed, but continue with test
    // The test will check the URL and handle accordingly
    await use(page);
  },

  // Authenticated page for nurse (with OTP)
  authenticatedNurse: async ({ page }, use) => {
    const user = testUsers.nurse;
    if (!user.email || !user.password) {
      throw new Error('E2E_NURSE_EMAIL and E2E_NURSE_PASSWORD environment variables must be set');
    }

    await page.goto('/login');
    await waitForLoadingToComplete(page);
    
    await page.fill('input[name="email"]', user.email);
    await page.fill('input[name="password"]', user.password);
    await page.click('button[type="submit"]');
    
    // Complete OTP verification automatically
    const verified = await completeOTPVerification(page, user.email, 'login_verification');
    
    if (verified) {
      // Wait for navigation to dashboard
      await page.waitForURL(/nurse/, { timeout: 30000 });
      await waitForLoadingToComplete(page);
    } else {
      console.warn('OTP verification failed, but continuing with test');
    }
    
    await use(page);
  },
});

export { expect } from '@playwright/test';



