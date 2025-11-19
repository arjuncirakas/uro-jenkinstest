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
    
    // Wait for login response
    const loginPromise = page.waitForResponse(
      response => response.url().includes('/api/auth/login') && response.status() === 200,
      { timeout: 15000 }
    ).catch(() => null);
    
    await page.click('button[type="submit"]');
    await loginPromise;
    
    // Wait for OTP modal with increased timeout for production
    await page.waitForSelector('text=Verify Your Identity', { timeout: 20000 });
    // Wait a bit more for modal to fully render and OTP to be generated
    await page.waitForTimeout(3000); // Increased wait for OTP generation
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
    try {
      await page.waitForSelector('text=/Code sent to:/i', { timeout: 15000 });
    } catch {
      // Try alternative selector
      await page.waitForSelector('[class*="gray-50"]', { timeout: 15000 });
    }
    
    await page.waitForTimeout(1000); // Give time for text to render
    
    // Try multiple ways to find the email text
    let emailText = null;
    try {
      emailText = await page.locator('text=/Code sent to:/i').textContent({ timeout: 5000 });
    } catch {
      try {
        emailText = await page.locator('[class*="gray-50"]').textContent({ timeout: 5000 });
      } catch {
        // Try getting all text in modal
        emailText = await page.locator('text=Verify Your Identity').locator('..').textContent({ timeout: 5000 });
      }
    }
    
    expect(emailText).toBeTruthy();
    expect(emailText.toLowerCase()).toContain('testdoctor2@yopmail.com');
  });

  test('should only accept 6 digits in OTP input', async ({ page }) => {
    const otpInput = page.locator('input[id="otp"]');
    
    // Wait for input to be ready
    await otpInput.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(500);
    
    // Try to enter more than 6 digits
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
    await otpInput.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(500);
    
    // Try to enter letters
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
    await otpInput.waitFor({ state: 'visible', timeout: 15000 });
    await verifyButton.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(500);
    
    // Button should be disabled with incomplete OTP
    await expect(verifyButton).toBeDisabled();
    
    // Enter partial OTP
    await otpInput.fill('123');
    await page.waitForTimeout(500); // Wait for state update
    await expect(verifyButton).toBeDisabled();
    
    // Enter complete OTP
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
    
    // Check for countdown text
    const resendText = await page.locator('text=/Resend in/i').textContent();
    expect(resendText).toMatch(/Resend in \d+s/);
  });

  test('should disable resend button initially', async ({ page }) => {
    const resendButton = page.locator('button:has-text("Resend")');
    
    // Should be disabled during countdown
    await expect(resendButton).toBeDisabled();
  });

  test('should close OTP modal when X is clicked', async ({ page }) => {
    // Find and click close button using aria-label
    const closeButton = page.locator('button[aria-label="Close modal"]');
    
    if (await closeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await closeButton.click();
      await page.waitForTimeout(500);
      
      // Modal should be closed
      const modalVisible = await page.locator('text=Verify Your Identity').isVisible().catch(() => false);
      expect(modalVisible).toBe(false);
    } else {
      // Fallback: try Escape key
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      const modalVisible = await page.locator('text=Verify Your Identity').isVisible().catch(() => false);
      expect(modalVisible).toBe(false);
    }
  });

  test('should show loading state when verifying OTP', async ({ page }) => {
    const otpInput = page.locator('input[id="otp"]');
    const verifyButton = page.locator('button:has-text("Verify Code")');
    
    // Enter OTP and click verify
    await otpInput.fill('123456');
    await verifyButton.click();
    
    // Check for loading state
    await page.waitForTimeout(500);
    const loadingText = await page.locator('text=/Verifying/i').isVisible().catch(() => false);
    expect(loadingText).toBe(true);
  });
});



