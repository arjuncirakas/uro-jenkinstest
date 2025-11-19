import { test, expect } from '../fixtures/auth';
import { waitForLoadingToComplete, elementExists } from '../utils/helpers';

test.describe('Nurse Pages', () => {
  test.beforeEach(async ({ authenticatedNurse: page }) => {
    await page.goto('/nurse/opd-management');
    await waitForLoadingToComplete(page);
  });

  test('should display OPD management page', async ({ page }) => {
    await expect(page).toHaveURL(/opd-management/);
    
    const hasContent = await elementExists(page, 'text=/opd|outpatient|management/i');
    expect(hasContent).toBe(true);
  });

  test('should navigate to investigations page', async ({ page }) => {
    const investigationsLink = page.locator('a[href*="investigations"], text=/investigations/i').first();
    
    if (await investigationsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await investigationsLink.click();
      await page.waitForURL(/investigations/, { timeout: 10000 });
      await expect(page).toHaveURL(/investigations/);
    }
  });

  test('should navigate to patient list', async ({ page }) => {
    const patientsLink = page.locator('a[href*="patients"], text=/patients/i').first();
    
    if (await patientsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await patientsLink.click();
      await page.waitForURL(/patients/, { timeout: 10000 });
      await expect(page).toHaveURL(/patients/);
    }
  });

  test('should navigate to appointments', async ({ page }) => {
    const appointmentsLink = page.locator('a[href*="appointments"], text=/appointments/i').first();
    
    if (await appointmentsLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await appointmentsLink.click();
      await page.waitForURL(/appointments/, { timeout: 10000 });
      await expect(page).toHaveURL(/appointments/);
    }
  });

  test('should navigate to surgery page', async ({ page }) => {
    const surgeryLink = page.locator('a[href*="surgery"], text=/surgery/i').first();
    
    if (await surgeryLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await surgeryLink.click();
      await page.waitForURL(/surgery/, { timeout: 10000 });
      await expect(page).toHaveURL(/surgery/);
    }
  });

  test('should navigate to followup page', async ({ page }) => {
    const followupLink = page.locator('a[href*="followup"], text=/followup|follow-up/i').first();
    
    if (await followupLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await followupLink.click();
      await page.waitForURL(/followup/, { timeout: 10000 });
      await expect(page).toHaveURL(/followup/);
    }
  });
});
