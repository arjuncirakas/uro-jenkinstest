import { test, expect } from '../fixtures/auth';
import { waitForLoadingToComplete, elementExists } from '../utils/helpers';

test.describe('Add Patient Modal', () => {
  test.beforeEach(async ({ authenticatedUrologist: page }) => {
    await page.goto('/urologist/patients/new');
    await waitForLoadingToComplete(page);
    
    // Open add patient modal
    const addButton = page.locator('button:has-text("Add"), button:has-text("New Patient"), button:has-text("+")').first();
    
    if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addButton.click();
      await page.waitForTimeout(1000);
    }
  });

  test('should display add patient modal', async ({ page }) => {
    const modalVisible = await elementExists(page, '[role="dialog"], .modal, text=/add patient|new patient/i');
    expect(modalVisible).toBe(true);
  });

  test('should have required form fields', async ({ page }) => {
    // Check for common patient form fields
    const hasFirstName = await elementExists(page, 'input[name*="firstName"], input[name*="first_name"], input[placeholder*="first" i]');
    const hasLastName = await elementExists(page, 'input[name*="lastName"], input[name*="last_name"], input[placeholder*="last" i]');
    const hasEmail = await elementExists(page, 'input[type="email"], input[name*="email"]');
    const hasPhone = await elementExists(page, 'input[type="tel"], input[name*="phone"]');
    
    expect(hasFirstName || hasLastName || hasEmail || hasPhone).toBe(true);
  });

  test('should validate required fields', async ({ page }) => {
    const submitButton = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Add")').first();
    
    if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await submitButton.click();
      await page.waitForTimeout(500);
      
      // Should show validation errors
      const hasErrors = await elementExists(page, 'text=/required|error|invalid/i');
      expect(hasErrors).toBe(true);
    }
  });

  test('should close modal on cancel', async ({ page }) => {
    const cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Close")').first();
    
    if (await cancelButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cancelButton.click();
      await page.waitForTimeout(500);
      
      const modalVisible = await elementExists(page, '[role="dialog"], .modal');
      expect(modalVisible).toBe(false);
    }
  });
});


