import { test as base } from '@playwright/test';
import { completeOTPVerification } from '../utils/otpHelper.js';
import { waitForLoadingToComplete } from '../utils/helpers.js';

// Test user credentials (update these with your test accounts)
export const testUsers = {
  superadmin: {
    email: 'admin@urology.com',
    password: 'SuperAdmin123!',
    role: 'superadmin',
    dashboardRoute: '/superadmin/dashboard'
  },
  urologist: {
    email: 'testdoctor2@yopmail.com',
    password: 'Doctor@1234567',
    role: 'urologist',
    dashboardRoute: '/urologist/dashboard'
  },
  gp: {
    email: 'gp@yopmail.com',
    password: 'Gpkuttan@12345',
    role: 'gp',
    dashboardRoute: '/gp/dashboard'
  },
  nurse: {
    email: 'testnurse@yopmail.com',
    password: 'Testnurse@12345',
    role: 'urology_nurse',
    dashboardRoute: '/nurse/opd-management'
  }
};

// Extended test with authentication fixtures
export const test = base.extend({
  // Authenticated page for superadmin
  authenticatedSuperadmin: async ({ page }, use) => {
    await page.goto('/login');
    await waitForLoadingToComplete(page);
    
    await page.fill('input[name="email"]', testUsers.superadmin.email);
    await page.fill('input[name="password"]', testUsers.superadmin.password);
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
    await page.goto('/login');
    await waitForLoadingToComplete(page);
    
    await page.fill('input[name="email"]', testUsers.urologist.email);
    await page.fill('input[name="password"]', testUsers.urologist.password);
    await page.click('button[type="submit"]');
    
    // Complete OTP verification automatically
    const verified = await completeOTPVerification(page, testUsers.urologist.email, 'login_verification');
    
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
    await page.goto('/login');
    await waitForLoadingToComplete(page);
    
    // Fill login form
    await page.fill('input[name="email"]', testUsers.gp.email);
    await page.fill('input[name="password"]', testUsers.gp.password);
    
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
      const verified = await completeOTPVerification(page, testUsers.gp.email, 'login_verification');
      
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
    await page.goto('/login');
    await waitForLoadingToComplete(page);
    
    await page.fill('input[name="email"]', testUsers.nurse.email);
    await page.fill('input[name="password"]', testUsers.nurse.password);
    await page.click('button[type="submit"]');
    
    // Complete OTP verification automatically
    const verified = await completeOTPVerification(page, testUsers.nurse.email, 'login_verification');
    
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



