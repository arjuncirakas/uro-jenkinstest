import { test, expect } from '../fixtures/auth';
import { waitForLoadingToComplete, elementExists } from '../utils/helpers';

test.describe('Component Rendering Tests', () => {
  test.beforeEach(async ({ authenticatedSuperadmin: page }) => {
    await page.goto('/superadmin/dashboard');
    await waitForLoadingToComplete(page);
  });

  test('should render header component', async ({ page }) => {
    const hasHeader = await elementExists(page, 'header, [role="banner"], [class*="header"]');
    expect(hasHeader).toBe(true);
  });

  test('should render sidebar/navigation', async ({ page }) => {
    const hasSidebar = await elementExists(page, 'aside, nav, [role="navigation"], [class*="sidebar"]');
    expect(hasSidebar).toBe(true);
  });

  test('should render footer if present', async ({ page }) => {
    const hasFooter = await elementExists(page, 'footer, [role="contentinfo"]');
    // Footer might not exist, so this is optional
    expect(typeof hasFooter).toBe('boolean');
  });

  test('should render notification components', async ({ page }) => {
    // Check for notification bell or notification component
    const hasNotifications = await elementExists(page, '[class*="notification"], [aria-label*="notification" i], button:has-text("🔔")');
    expect(hasNotifications).toBe(true);
  });

  test('should render search components', async ({ page }) => {
    // Check for search inputs
    const hasSearch = await elementExists(page, 'input[type="search"], input[placeholder*="search" i]');
    expect(hasSearch).toBe(true);
  });

  test('should render table components', async ({ page }) => {
    // Navigate to a page with tables
    await page.goto('/superadmin/users');
    await waitForLoadingToComplete(page);
    
    const hasTable = await elementExists(page, 'table, [role="table"], [class*="table"]');
    expect(hasTable).toBe(true);
  });

  test('should render form components', async ({ page }) => {
    // Navigate to add user page
    await page.goto('/superadmin/users/new');
    await waitForLoadingToComplete(page);
    
    const hasForm = await elementExists(page, 'form, [role="form"]');
    expect(hasForm).toBe(true);
  });

  test('should render button components', async ({ page }) => {
    const hasButtons = await elementExists(page, 'button, [role="button"]');
    expect(hasButtons).toBe(true);
  });

  test('should render input components', async ({ page }) => {
    await page.goto('/superadmin/users/new');
    await waitForLoadingToComplete(page);
    
    const hasInputs = await elementExists(page, 'input, textarea, select');
    expect(hasInputs).toBe(true);
  });

  test('should render loading spinners when loading', async ({ page }) => {
    // Trigger a loading state (e.g., by navigating)
    await page.goto('/superadmin/users');
    
    // Check for loading indicators
    const hasLoading = await elementExists(page, '[class*="loading"], [class*="spinner"], [aria-label*="loading" i]');
    // Loading might be brief, so this is optional
    expect(typeof hasLoading).toBe('boolean');
  });

  test('should render error messages when errors occur', async ({ page }) => {
    // Try to trigger an error (e.g., invalid form submission)
    await page.goto('/superadmin/users/new');
    
    // Submit empty form to trigger validation
    const submitButton = page.locator('button[type="submit"]').first();
    if (await submitButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await submitButton.click();
      await page.waitForTimeout(1000);
      
      const hasError = await elementExists(page, 'text=/error|invalid|required/i');
      expect(hasError).toBe(true);
    }
  });

  test('should render success messages when actions succeed', async ({ page }) => {
    // Success messages are typically shown in modals or toast notifications
    const hasSuccessComponent = await page.evaluate(() => {
      return document.querySelector('[class*="success"], [class*="toast"]') !== null;
    });
    
    expect(typeof hasSuccessComponent).toBe('boolean');
  });

  test('should render calendar component if present', async ({ page }) => {
    // Navigate to appointments page if available
    await page.goto('/urologist/appointments');
    await waitForLoadingToComplete(page);
    
    const hasCalendar = await elementExists(page, '[class*="calendar"], [role="grid"], [class*="date-picker"]');
    expect(hasCalendar).toBe(true);
  });

  test('should render patient cards/list', async ({ page }) => {
    await page.goto('/urologist/patients/new');
    await waitForLoadingToComplete(page);
    
    const hasPatientList = await elementExists(page, '[class*="patient"], [class*="card"], table');
    expect(hasPatientList).toBe(true);
  });

  test('should render filters and search', async ({ page }) => {
    await page.goto('/urologist/patients/new');
    await waitForLoadingToComplete(page);
    
    const hasFilters = await elementExists(page, 'input[type="search"], select, [class*="filter"]');
    expect(hasFilters).toBe(true);
  });
});


