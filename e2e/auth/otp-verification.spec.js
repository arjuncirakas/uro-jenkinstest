import { test, expect } from '../fixtures/auth';
import { waitForLoadingToComplete, closeModal } from '../utils/helpers';
import { getOTPFromAPI, fillOTPFromAPI } from '../utils/otpHelper.js';

test.describe('OTP Verification Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await waitForLoadingToComplete(page);
    
    // Login to trigger OTP modal
    await page.fill('input[name="email"]', 'testdoctor2@yopmail.com');
    await page.fill('input[name="password"]', 'Doctor@1234567');
    await page.click('button[type="submit"]');
    
    // Wait for OTP modal with increased timeout for production
    await page.waitForSelector('text=Verify Your Identity', { timeout: 15000 });
    // Wait a bit more for modal to fully render
    await page.waitForTimeout(1000);
  });

  test('should display OTP modal correctly', async ({ page }) => {
    // Check modal elements
    await expect(page.locator('text=Verify Your Identity')).toBeVisible();
    await expect(page.locator('text=Enter the 6-digit code')).toBeVisible();
    await expect(page.locator('text=Code sent to:')).toBeVisible();
    await expect(page.locator('input[id="otp"]')).toBeVisible();
    await expect(page.locator('button:has-text("Verify Code")')).toBeVisible();
    await expect(page.locator('text=Didn\'t receive the code?')).toBeVisible();
  });

  test('should display email in OTP modal', async ({ page }) => {
    // Wait for email text to be visible with multiple selector strategies
    await page.waitForSelector('text=/Code sent to:/i', { timeout: 10000 });
    await page.waitForTimeout(500); // Give time for text to render
    
    // Try multiple ways to find the email text
    const emailText = await page.locator('text=/Code sent to:/i').textContent().catch(() => {
      return page.locator('[class*="gray-50"]').textContent();
    });
    
    expect(emailText).toContain('testdoctor2@yopmail.com');
  });

  test('should only accept 6 digits in OTP input', async ({ page }) => {
    const otpInput = page.locator('input[id="otp"]');
    
    // Wait for input to be ready
    await otpInput.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
    
    // Clear and fill with more than 6 digits
    await otpInput.clear();
    await otpInput.fill('1234567890');
    
    // Wait for validation to apply
    await page.waitForTimeout(1000);
    
    // Should only accept 6 digits
    const value = await otpInput.inputValue();
    expect(value.length).toBeLessThanOrEqual(6);
  });

  test('should only accept numeric input in OTP field', async ({ page }) => {
    const otpInput = page.locator('input[id="otp"]');
    
    // Wait for input to be ready
    await otpInput.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
    
    // Clear and try to enter letters
    await otpInput.clear();
    await otpInput.fill('abcdef');
    
    // Wait for validation to apply
    await page.waitForTimeout(1000);
    
    // Should filter out non-numeric
    const value = await otpInput.inputValue();
    expect(value).toMatch(/^\d*$/); // Only digits
  });

  test('should disable verify button when OTP is incomplete', async ({ page }) => {
    const verifyButton = page.locator('button:has-text("Verify Code")');
    const otpInput = page.locator('input[id="otp"]');
    
    // Wait for elements to be ready
    await otpInput.waitFor({ state: 'visible', timeout: 10000 });
    await verifyButton.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
    
    // Button should be disabled with incomplete OTP
    await expect(verifyButton).toBeDisabled();
    
    // Enter partial OTP
    await otpInput.clear();
    await otpInput.fill('123');
    await page.waitForTimeout(500); // Wait for state update
    await expect(verifyButton).toBeDisabled();
    
    // Enter complete OTP
    await otpInput.clear();
    await otpInput.fill('123456');
    await page.waitForTimeout(500); // Wait for state update
    await expect(verifyButton).toBeEnabled();
  });

  test('should show error on invalid OTP', async ({ page }) => {
    const otpInput = page.locator('input[id="otp"]');
    const verifyButton = page.locator('button:has-text("Verify Code")');
    
    // Enter invalid OTP
    await otpInput.fill('000000');
    await verifyButton.click();
    
    // Wait for error message
    await page.waitForTimeout(2000);
    
    // Check for error message
    const errorVisible = await page.locator('text=/invalid|incorrect|error/i').isVisible().catch(() => false);
    expect(errorVisible).toBe(true);
  });

  test('should show resend countdown timer', async ({ page }) => {
    // Wait for resend section to be visible
    await page.waitForSelector('text=/Didn\'t receive/i', { timeout: 10000 });
    await page.waitForTimeout(1000); // Give time for countdown to render
    
    // Check for countdown text with multiple selector strategies
    const resendText = await page.locator('text=/Resend in/i').textContent().catch(() => {
      return page.locator('button:has-text("Resend")').textContent();
    });
    
    // Should match either "Resend in Xs" or "Resend Code" (when enabled)
    expect(resendText).toMatch(/Resend in \d+s|Resend Code/i);
  });

  test('should disable resend button initially', async ({ page }) => {
    const resendButton = page.locator('button:has-text("Resend")');
    
    // Should be disabled during countdown
    await expect(resendButton).toBeDisabled();
  });

  test('should close OTP modal when X is clicked', async ({ page }) => {
    // Wait for modal to be fully loaded
    await page.waitForSelector('text=Verify Your Identity', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    // Try multiple ways to find the close button
    const closeButton = page.locator('button').filter({ 
      has: page.locator('svg').or(page.locator('text=×'))
    }).first();
    
    // Alternative: look for X button near the header
    const altCloseButton = page.locator('button[aria-label*="close" i], button[aria-label*="Close" i]').first();
    
    const buttonToClick = await closeButton.isVisible({ timeout: 2000 }).catch(() => false) 
      ? closeButton 
      : altCloseButton;
    
    if (await buttonToClick.isVisible({ timeout: 3000 }).catch(() => false)) {
      await buttonToClick.click();
      await page.waitForTimeout(1000);
      
      // Modal should be closed
      const modalVisible = await page.locator('text=Verify Your Identity').isVisible({ timeout: 2000 }).catch(() => false);
      expect(modalVisible).toBe(false);
    } else {
      // If close button not found, try Escape key
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1000);
      const modalVisible = await page.locator('text=Verify Your Identity').isVisible({ timeout: 2000 }).catch(() => false);
      expect(modalVisible).toBe(false);
    }
  });

  test('should show loading state when verifying OTP', async ({ page }) => {
    const otpInput = page.locator('input[id="otp"]');
    const verifyButton = page.locator('button:has-text("Verify Code")');
    
    // Wait for elements to be ready
    await otpInput.waitFor({ state: 'visible', timeout: 10000 });
    await verifyButton.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
    
    // Enter OTP and click verify
    await otpInput.clear();
    await otpInput.fill('123456');
    await page.waitForTimeout(500); // Wait for button to enable
    
    // Click and immediately check for loading state
    await verifyButton.click();
    
    // Check for loading state (button text changes or spinner appears)
    await page.waitForTimeout(500);
    const loadingVisible = await page.locator('text=/Verifying/i').isVisible({ timeout: 2000 }).catch(() => false) ||
                          await verifyButton.locator('text=/Verifying/i').isVisible({ timeout: 2000 }).catch(() => false) ||
                          await page.locator('.animate-spin').isVisible({ timeout: 2000 }).catch(() => false);
    
    // At least one loading indicator should be visible
    expect(loadingVisible).toBe(true);
  });
});



