/**
 * Helper functions for Playwright tests
 */

/**
 * Wait for API response
 */
export async function waitForAPIResponse(page, urlPattern, timeout = 10000) {
  return page.waitForResponse(
    response => response.url().includes(urlPattern) && response.status() === 200,
    { timeout }
  );
}

/**
 * Wait for element to be visible and stable
 */
export async function waitForStableElement(page, selector, timeout = 10000) {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout });
  await page.waitForTimeout(500); // Wait for any animations
  return element;
}

/**
 * Fill form field with validation
 */
export async function fillField(page, selector, value, options = {}) {
  const field = page.locator(selector);
  await field.waitFor({ state: 'visible', timeout: options.timeout || 5000 });
  await field.clear();
  await field.fill(value);
  
  if (options.blur !== false) {
    await field.blur();
  }
  
  return field;
}

/**
 * Click button and wait for navigation or modal
 */
export async function clickAndWait(page, selector, options = {}) {
  const button = page.locator(selector);
  await button.waitFor({ state: 'visible', timeout: options.timeout || 5000 });
  
  if (options.waitForNavigation) {
    await Promise.all([
      page.waitForURL(options.waitForNavigation, { timeout: 15000 }),
      button.click()
    ]);
  } else if (options.waitForSelector) {
    await Promise.all([
      page.waitForSelector(options.waitForSelector, { timeout: 15000 }),
      button.click()
    ]);
  } else {
    await button.click();
  }
  
  return button;
}

/**
 * Check if modal is visible
 */
export async function isModalVisible(page, modalText) {
  try {
    const modal = page.locator(`text=${modalText}`).first();
    await modal.waitFor({ state: 'visible', timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Close modal by clicking close button or backdrop
 */
export async function closeModal(page) {
  // Try to find and click close button (X)
  const closeButton = page.locator('button:has-text("×"), button[aria-label*="close" i], button[aria-label*="Close" i]').first();
  if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeButton.click();
    return;
  }
  
  // Try clicking outside modal (backdrop)
  const modal = page.locator('[role="dialog"], .modal, [class*="modal"]').first();
  if (await modal.isVisible({ timeout: 1000 }).catch(() => false)) {
    await page.keyboard.press('Escape');
  }
}

/**
 * Wait for loading spinner to disappear
 */
export async function waitForLoadingToComplete(page, timeout = 10000) {
  try {
    // Wait for any loading spinners to disappear
    await page.waitForSelector('.animate-spin, [class*="loading"], [class*="spinner"]', {
      state: 'hidden',
      timeout
    }).catch(() => {
      // If no spinner found, that's fine
    });
    
    // Additional wait for any async operations
    await page.waitForTimeout(500);
  } catch {
    // Ignore timeout errors
  }
}

/**
 * Get text content safely
 */
export async function getTextContent(page, selector) {
  try {
    const element = page.locator(selector);
    await element.waitFor({ state: 'visible', timeout: 5000 });
    return await element.textContent();
  } catch {
    return null;
  }
}

/**
 * Check if element exists
 */
export async function elementExists(page, selector) {
  try {
    const element = page.locator(selector);
    await element.waitFor({ state: 'visible', timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Scroll to element
 */
export async function scrollToElement(page, selector) {
  const element = page.locator(selector);
  await element.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
}

/**
 * Take screenshot with timestamp
 */
export async function takeScreenshot(page, name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({ path: `test-results/screenshots/${name}-${timestamp}.png`, fullPage: true });
}





