import { test, expect } from '../fixtures/auth';
import { waitForLoadingToComplete, isModalVisible } from '../utils/helpers';
import { getTestUser, areTestCredentialsConfigured } from '../config/testUsers';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await waitForLoadingToComplete(page);
  });

  test('should display login page correctly', async ({ page }) => {
    // Check page elements
    await expect(page.locator('text=Welcome Back')).toBeVisible();
    await expect(page.locator('text=Sign in to your Urology Care System')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('text=Forgot Password?')).toBeVisible();
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    // Try to submit without filling fields
    await page.click('button[type="submit"]');

    // Wait for validation errors
    await page.waitForTimeout(500);

    // Check for validation messages (browser native or custom)
    const emailField = page.locator('input[name="email"]');
    const passwordField = page.locator('input[name="password"]');

    // Check HTML5 validation
    const emailValid = await emailField.evaluate(el => el.validity.valid);
    const passwordValid = await passwordField.evaluate(el => el.validity.valid);

    expect(emailValid).toBe(false);
    expect(passwordValid).toBe(false);
  });

  test('should show error for invalid email format', async ({ page }) => {
    const emailField = page.locator('input[name="email"]');
    const passwordField = page.locator('input[name="password"]');

    await emailField.fill('invalid-email');
    await passwordField.fill('dummypassword');
    await emailField.blur();

    // Wait for validation
    await page.waitForTimeout(1000);

    // Check for email validation error (HTML5 or custom)
    const isValid = await emailField.evaluate(el => el.validity.valid);

    // Should be invalid - either HTML5 validation or custom validation should catch it
    expect(isValid).toBe(false);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[name="email"]', 'invalid@email.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Wait for error modal or message
    await page.waitForTimeout(2000);

    // Check for error modal or error message
    const hasError = await isModalVisible(page, 'Login Failed') ||
      await page.locator('text=/invalid|error|failed/i').isVisible().catch(() => false);

    expect(hasError).toBe(true);
  });

  test('should toggle password visibility', async ({ page }) => {
    await page.fill('input[name="password"]', 'testpassword');

    // Check password is hidden by default
    const passwordInput = page.locator('input[name="password"]');
    expect(await passwordInput.getAttribute('type')).toBe('password');

    // Click toggle button
    const toggleButton = page.locator('button').filter({ hasText: /eye/i }).or(
      page.locator('svg').filter({ has: page.locator('text=Eye') })
    ).first();

    if (await toggleButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await toggleButton.click();
      await page.waitForTimeout(300);
      expect(await passwordInput.getAttribute('type')).toBe('text');
    }
  });

  test('should navigate to forgot password modal', async ({ page }) => {
    await page.click('text=Forgot Password?');

    // Wait for forgot password modal
    await page.waitForSelector('text=/forgot|reset/i', { timeout: 5000 });

    const modalVisible = await isModalVisible(page, 'Forgot Password') ||
      await page.locator('text=/forgot|reset/i').isVisible();

    expect(modalVisible).toBe(true);
  });

  test('should login successfully with superadmin (no OTP)', async ({ page }) => {
    const superadmin = getTestUser('superadmin');

    // Skip test if credentials not configured
    test.skip(!superadmin, 'Superadmin test credentials not configured. Set E2E_SUPERADMIN_EMAIL and E2E_SUPERADMIN_PASSWORD env vars.');

    await page.fill('input[name="email"]', superadmin.email);
    await page.fill('input[name="password"]', superadmin.password);
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL(/superadmin\/dashboard/, { timeout: 15000 });

    // Verify we're on the dashboard
    await expect(page).toHaveURL(/superadmin\/dashboard/);
  });

  test('should show OTP modal for roles requiring OTP', async ({ page }) => {
    const doctor = getTestUser('urologist');

    // Skip test if credentials not configured
    test.skip(!doctor, 'Doctor test credentials not configured. Set E2E_DOCTOR_EMAIL and E2E_DOCTOR_PASSWORD env vars.');

    await page.fill('input[name="email"]', doctor.email);
    await page.fill('input[name="password"]', doctor.password);
    await page.click('button[type="submit"]');

    // Wait for OTP modal
    await page.waitForSelector('text=Verify Your Identity', { timeout: 10000 });

    // Verify OTP modal is visible
    await expect(page.locator('text=Verify Your Identity')).toBeVisible();
    await expect(page.locator('text=Enter the 6-digit code')).toBeVisible();
    await expect(page.locator('input[id="otp"]')).toBeVisible();
  });
});
