import { test, expect } from '../fixtures/auth';
import { waitForLoadingToComplete, closeModal } from '../utils/helpers';
import { getOTPFromAPI, fillOTPFromAPI } from '../utils/otpHelper.js';

// Run OTP tests sequentially to avoid account lockout issues
test.describe('OTP Verification Flow', () => {
  // Run tests sequentially since they all use the same test account
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await waitForLoadingToComplete(page);
    
    // Login to trigger OTP modal
    await page.fill('input[name="email"]', 'testdoctor2@yopmail.com');
    await page.fill('input[name="password"]', 'Doctor@1234567');
    
    // Wait for login response - handle both success and error responses
    const loginResponsePromise = page.waitForResponse(
      response => {
        const url = response.url();
        return url.includes('/api/auth/login');
      },
      { timeout: 30000 }
    ).catch(() => null);
    
    await page.click('button[type="submit"]');
    
    // Wait for any login response (success or error)
    const loginResponse = await loginResponsePromise;
    
    if (loginResponse) {
      const status = loginResponse.status();
      const responseData = await loginResponse.json();
      
      // Check for account lockout
      if (status === 423) {
        throw new Error(`Account is locked: ${responseData.message}`);
      }
      
      // Check for login failure
      if (status === 401) {
        throw new Error(`Login failed: ${responseData.message}`);
      }
      
      // Verify OTP is required for successful login
      if (status === 200 && !responseData.data?.requiresOTPVerification) {
        throw new Error(`OTP verification not required. Response: ${JSON.stringify(responseData)}`);
      }
    }
    
    // Wait for OTP modal to appear (React state update)
    // The modal should appear after successful login with requiresOTPVerification: true
    await page.waitForSelector('text=Verify Your Identity', { timeout: 35000 });
    
    // Wait for modal to fully render and OTP to be generated
    await page.waitForTimeout(2000);
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
    
    // Wait for elements to be ready
    await otpInput.waitFor({ state: 'visible', timeout: 10000 });
    await verifyButton.waitFor({ state: 'visible', timeout: 10000 });
    
    // Enter OTP
    await otpInput.click();
    await otpInput.press('Control+A');
    await otpInput.type('123456', { delay: 100 });
    await page.waitForTimeout(500); // Wait for button to enable
    
    // Verify button is enabled before clicking
    const isEnabledBefore = await verifyButton.isEnabled();
    expect(isEnabledBefore).toBe(true);
    
    // Click verify button and immediately wait for loading indicators
    await verifyButton.click();
    
    // Wait for loading state to appear - check multiple indicators
    // The loading state should appear very quickly after clicking
    try {
      // Wait for any loading indicator to appear
      await Promise.race([
        page.waitForSelector('text=/Verifying/i', { timeout: 2000 }).catch(() => null),
        verifyButton.locator('.animate-spin').waitFor({ state: 'visible', timeout: 2000 }).catch(() => null),
        page.waitForFunction(
          () => {
            const button = document.querySelector('button:has-text("Verify Code"), button:has-text("Verifying")');
            return button && button.disabled;
          },
          { timeout: 2000 }
        ).catch(() => null)
      ]);
      
      // Check which loading indicators are present
      const loadingIndicators = await Promise.all([
        page.locator('text=/Verifying/i').isVisible().catch(() => false),
        verifyButton.locator('.animate-spin').isVisible().catch(() => false),
        verifyButton.isDisabled().catch(() => false)
      ]);
      
      // At least one loading indicator should be present
      const hasLoadingState = loadingIndicators.some(indicator => indicator === true);
      expect(hasLoadingState).toBe(true);
    } catch (error) {
      // If loading state check fails, verify that button was clicked and state changed
      // This handles cases where loading is very fast
      const buttonText = await verifyButton.textContent().catch(() => '');
      const isDisabled = await verifyButton.isDisabled().catch(() => false);
      
      // If button text changed or button is disabled, loading state occurred
      const stateChanged = buttonText.includes('Verifying') || isDisabled;
      expect(stateChanged).toBe(true);
    }
  });
});



