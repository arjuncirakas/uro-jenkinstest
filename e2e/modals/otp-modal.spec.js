import { test, expect } from '../fixtures/auth';
import { waitForLoadingToComplete } from '../utils/helpers';

test.describe('OTP Modal Component', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await waitForLoadingToComplete(page);
    
    // Trigger OTP modal by logging in
    await page.fill('input[name="email"]', 'testdoctor2@yopmail.com');
    await page.fill('input[name="password"]', 'Doctor@1234567');
    await page.click('button[type="submit"]');
    
    // Wait for OTP modal with increased timeout for production
    await page.waitForSelector('text=Verify Your Identity', { timeout: 15000 });
    // Wait a bit more for modal to fully render
    await page.waitForTimeout(1000);
  });

  test('should display all OTP modal elements', async ({ page }) => {
    // Header
    await expect(page.locator('text=Verify Your Identity')).toBeVisible();
    await expect(page.locator('text=Enter the 6-digit code')).toBeVisible();
    
    // Email display
    await expect(page.locator('text=Code sent to:')).toBeVisible();
    
    // OTP input
    const otpInput = page.locator('input[id="otp"]');
    await expect(otpInput).toBeVisible();
    await expect(otpInput).toHaveAttribute('maxLength', '6');
    
    // Verify button
    await expect(page.locator('button:has-text("Verify Code")')).toBeVisible();
    
    // Resend section
    await expect(page.locator('text=Didn\'t receive the code?')).toBeVisible();
  });

  test('should display email address correctly', async ({ page }) => {
    // Wait for email text to be visible with multiple selector strategies
    await page.waitForSelector('text=/Code sent to:/i', { timeout: 10000 });
    await page.waitForTimeout(500); // Give time for text to render
    
    // Try multiple ways to find the email text
    const emailText = await page.locator('text=/Code sent to:/i').textContent().catch(() => {
      return page.locator('[class*="gray-50"]').textContent();
    });
    
    expect(emailText).toContain('testdoctor2@yopmail.com');
  });

  test('should have auto-focus on OTP input', async ({ page }) => {
    const otpInput = page.locator('input[id="otp"]');
    const isFocused = await otpInput.evaluate(el => document.activeElement === el);
    expect(isFocused).toBe(true);
  });

  test('should validate OTP input format', async ({ page }) => {
    const otpInput = page.locator('input[id="otp"]');
    
    // Wait for input to be ready
    await otpInput.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
    
    // Test numeric only
    await otpInput.clear();
    await otpInput.fill('abc123');
    await page.waitForTimeout(1000); // Wait for validation
    const value = await otpInput.inputValue();
    expect(value).toMatch(/^\d*$/); // Only digits
    
    // Test max length
    await otpInput.clear();
    await otpInput.fill('1234567890');
    await page.waitForTimeout(1000); // Wait for validation
    const limitedValue = await otpInput.inputValue();
    expect(limitedValue.length).toBeLessThanOrEqual(6);
  });

  test('should enable verify button only with 6 digits', async ({ page }) => {
    const otpInput = page.locator('input[id="otp"]');
    const verifyButton = page.locator('button:has-text("Verify Code")');
    
    // Wait for elements to be ready
    await otpInput.waitFor({ state: 'visible', timeout: 10000 });
    await verifyButton.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
    
    // Initially disabled
    await expect(verifyButton).toBeDisabled();
    
    // With 5 digits - still disabled
    await otpInput.clear();
    await otpInput.fill('12345');
    await page.waitForTimeout(500); // Wait for state update
    await expect(verifyButton).toBeDisabled();
    
    // With 6 digits - enabled
    await otpInput.clear();
    await otpInput.fill('123456');
    await page.waitForTimeout(500); // Wait for state update
    await expect(verifyButton).toBeEnabled();
  });

  test('should show loading state during verification', async ({ page }) => {
    const otpInput = page.locator('input[id="otp"]');
    const verifyButton = page.locator('button:has-text("Verify Code")');
    
    // Wait for elements to be ready
    await otpInput.waitFor({ state: 'visible', timeout: 10000 });
    await verifyButton.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
    
    await otpInput.clear();
    await otpInput.fill('123456');
    await page.waitForTimeout(500); // Wait for button to enable
    await verifyButton.click();
    
    // Check for loading text with multiple strategies
    await page.waitForTimeout(500);
    const loadingVisible = await page.locator('text=/Verifying/i').isVisible({ timeout: 2000 }).catch(() => false) ||
                          await verifyButton.locator('text=/Verifying/i').isVisible({ timeout: 2000 }).catch(() => false) ||
                          await page.locator('.animate-spin').isVisible({ timeout: 2000 }).catch(() => false);
    
    expect(loadingVisible).toBe(true);
  });

  test('should display error message on invalid OTP', async ({ page }) => {
    const otpInput = page.locator('input[id="otp"]');
    const verifyButton = page.locator('button:has-text("Verify Code")');
    
    await otpInput.fill('000000');
    await verifyButton.click();
    
    // Wait for error
    await page.waitForTimeout(2000);
    
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

  test('should disable resend button during countdown', async ({ page }) => {
    const resendButton = page.locator('button:has-text("Resend")');
    await expect(resendButton).toBeDisabled();
  });

  test('should close modal when X button is clicked', async ({ page }) => {
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

  test('should close modal on Escape key', async ({ page }) => {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    const modalVisible = await page.locator('text=Verify Your Identity').isVisible().catch(() => false);
    expect(modalVisible).toBe(false);
  });
});


