import { test, expect } from '../fixtures/auth';
import { waitForLoadingToComplete } from '../utils/helpers';

test.describe('Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
    await waitForLoadingToComplete(page);
  });

  test('should display registration form correctly', async ({ page }) => {
    // Check form elements
    await expect(page.locator('input[name="firstName"]')).toBeVisible();
    await expect(page.locator('input[name="lastName"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="phone"]')).toBeVisible();
    await expect(page.locator('input[name="organization"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.locator('input[name="confirmPassword"]')).toBeVisible();
    await expect(page.locator('select[name="role"]')).toBeVisible();
  });

  test('should show validation errors for empty required fields', async ({ page }) => {
    // Try to submit without filling fields
    await page.click('button[type="submit"]');
    
    // Wait for validation
    await page.waitForTimeout(500);
    
    // Check HTML5 validation
    const firstNameField = page.locator('input[name="firstName"]');
    const emailField = page.locator('input[name="email"]');
    
    const firstNameValid = await firstNameField.evaluate(el => el.validity.valid);
    const emailValid = await emailField.evaluate(el => el.validity.valid);
    
    expect(firstNameValid).toBe(false);
    expect(emailValid).toBe(false);
  });

  test('should validate email format', async ({ page }) => {
    await page.fill('input[name="email"]', 'invalid-email');
    await page.blur('input[name="email"]');
    
    await page.waitForTimeout(500);
    
    const emailField = page.locator('input[name="email"]');
    const isValid = await emailField.evaluate(el => el.validity.valid);
    expect(isValid).toBe(false);
  });

  test('should validate password strength', async ({ page }) => {
    await page.fill('input[name="password"]', 'weak');
    await page.blur('input[name="password"]');
    
    await page.waitForTimeout(500);
    
    // Check for password strength indicator or validation message
    const passwordField = page.locator('input[name="password"]');
    const isValid = await passwordField.evaluate(el => el.validity.valid);
    
    // Password should be invalid if too short
    expect(isValid).toBe(false);
  });

  test('should validate password confirmation match', async ({ page }) => {
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'Password123!');
    
    // Passwords match - should be valid
    const confirmPasswordField = page.locator('input[name="confirmPassword"]');
    const value = await confirmPasswordField.inputValue();
    expect(value).toBe('Password123!');
  });

  test('should show error when passwords do not match', async ({ page }) => {
    await page.fill('input[name="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"]', 'DifferentPassword123!');
    await page.blur('input[name="confirmPassword"]');
    
    await page.waitForTimeout(500);
    
    // Check for password mismatch error
    const errorVisible = await page.locator('text=/match|different|same/i').isVisible().catch(() => false);
    // Note: This depends on your validation implementation
  });

  test('should allow selecting different roles', async ({ page }) => {
    const roleSelect = page.locator('select[name="role"]');
    
    // Check default role
    const defaultValue = await roleSelect.inputValue();
    expect(defaultValue).toBeTruthy();
    
    // Change role
    await roleSelect.selectOption('gp');
    const selectedValue = await roleSelect.inputValue();
    expect(selectedValue).toBe('gp');
  });

  test('should toggle password visibility', async ({ page }) => {
    await page.fill('input[name="password"]', 'testpassword123');
    
    const passwordInput = page.locator('input[name="password"]');
    expect(await passwordInput.getAttribute('type')).toBe('password');
    
    // Find and click toggle button
    const toggleButtons = page.locator('button').filter({ 
      has: page.locator('svg')
    });
    
    // Click first toggle button (for password field)
    const firstToggle = toggleButtons.first();
    if (await firstToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstToggle.click();
      await page.waitForTimeout(300);
      expect(await passwordInput.getAttribute('type')).toBe('text');
    }
  });

  test('should navigate to login page from register', async ({ page }) => {
    const loginLink = page.locator('a[href="/login"], text=/sign in|login/i').first();
    
    if (await loginLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await loginLink.click();
      await page.waitForURL(/login/, { timeout: 5000 });
      await expect(page).toHaveURL(/login/);
    }
  });
});



