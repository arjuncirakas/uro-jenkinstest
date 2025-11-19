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
    email: 'testgp@yopmail.com',
    password: 'GP@1234567',
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
    await page.fill('input[name="email"]', testUsers.superadmin.email);
    await page.fill('input[name="password"]', testUsers.superadmin.password);
    await page.click('button[type="submit"]');
    
    // Wait for navigation (superadmin doesn't need OTP)
    await page.waitForURL(/superadmin/, { timeout: 15000 });
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
    
    await page.fill('input[name="email"]', testUsers.gp.email);
    await page.fill('input[name="password"]', testUsers.gp.password);
    await page.click('button[type="submit"]');
    
    // Complete OTP verification automatically
    const verified = await completeOTPVerification(page, testUsers.gp.email, 'login_verification');
    
    if (verified) {
      // Wait for navigation to dashboard
      await page.waitForURL(/gp/, { timeout: 30000 });
      await waitForLoadingToComplete(page);
    } else {
      console.warn('OTP verification failed, but continuing with test');
    }
    
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



