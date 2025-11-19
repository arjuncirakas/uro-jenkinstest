import { test, expect } from '../fixtures/auth';
import { waitForLoadingToComplete, elementExists } from '../utils/helpers';

test.describe('Urologist Appointments Page', () => {
  test.beforeEach(async ({ authenticatedUrologist: page }) => {
    await page.goto('/urologist/appointments');
    await waitForLoadingToComplete(page);
  });

  test('should display appointments page', async ({ page }) => {
    await expect(page).toHaveURL(/appointments/);
    
    const hasAppointmentsContent = await elementExists(page, 'text=/appointments|schedule|calendar/i');
    expect(hasAppointmentsContent).toBe(true);
  });

  test('should display calendar or appointment list', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const hasCalendar = await elementExists(page, '[class*="calendar"], [class*="appointment"], table, [role="grid"]');
    expect(hasCalendar).toBe(true);
  });

  test('should have date navigation', async ({ page }) => {
    const hasDateNav = await elementExists(page, 'button:has-text("Previous"), button:has-text("Next"), [class*="date-picker"]');
    expect(hasDateNav).toBe(true);
  });
});


