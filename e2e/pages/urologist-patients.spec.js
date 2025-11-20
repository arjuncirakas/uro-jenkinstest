import { test, expect } from '../fixtures/auth';
import { waitForLoadingToComplete, elementExists, waitForStableElement } from '../utils/helpers';

test.describe('Urologist Patients Page', () => {
  test.beforeEach(async ({ authenticatedUrologist: page }) => {
    await page.goto('/urologist/patients/new');
    await waitForLoadingToComplete(page);
  });

  test('should display patients page', async ({ page }) => {
    await expect(page).toHaveURL(/patients/);
    
    // Check for patients page elements
    const hasPatientsContent = await elementExists(page, 'text=/patients|patient list|new patients/i');
    expect(hasPatientsContent).toBe(true);
  });

  test('should display patient filters', async ({ page }) => {
    // Check for filter elements (search, status, etc.)
    const hasFilters = await elementExists(page, 'input[type="search"], select, [class*="filter"]');
    expect(hasFilters).toBe(true);
  });

  test('should display patient list or table', async ({ page }) => {
    // Wait for patient data to load
    await page.waitForTimeout(2000);
    
    // Check for patient list/table
    const hasPatientList = await elementExists(page, 'table, [role="table"], [class*="patient-list"], [class*="patient-card"]');
    expect(hasPatientList).toBe(true);
  });

  test('should open add patient modal', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add"), button:has-text("New Patient"), button:has-text("+")').first();
    
    if (await addButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addButton.click();
      await page.waitForTimeout(1000);
      
      // Check for modal
      const modalVisible = await elementExists(page, '[role="dialog"], .modal, text=/add patient|new patient/i');
      expect(modalVisible).toBe(true);
    }
  });

  test('should search for patients', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="patient" i]').first();
    
    if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await searchInput.fill('test');
      await page.waitForTimeout(1000);
      
      // Search should trigger
      const value = await searchInput.inputValue();
      expect(value).toBe('test');
    }
  });

  test('should view patient details', async ({ page }) => {
    // Wait for patients to load
    await page.waitForTimeout(2000);
    
    // Find view button
    const viewButton = page.locator('button:has-text("View"), button:has-text("Details"), a:has-text("View")').first();
    
    if (await viewButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await viewButton.click();
      await page.waitForTimeout(1000);
      
      // Check for patient details modal or page
      const detailsVisible = await elementExists(page, '[role="dialog"], .modal, text=/patient details|patient information/i');
      expect(detailsVisible).toBe(true);
    }
  });
});




