/**
 * Additional test helpers for better test reliability
 */

/**
 * Wait for element with multiple selector strategies
 */
export async function waitForElementWithFallback(page, selectors, options = {}) {
  const timeout = options.timeout || 10000;
  const selectorsArray = Array.isArray(selectors) ? selectors : [selectors];
  
  for (const selector of selectorsArray) {
    try {
      await page.waitForSelector(selector, { timeout: 2000, state: 'visible' });
      return page.locator(selector).first();
    } catch (e) {
      // Try next selector
      continue;
    }
  }
  
  // If all selectors fail, throw with the last one
  throw new Error(`None of the selectors matched: ${selectorsArray.join(', ')}`);
}

/**
 * Safely get text content with retries
 */
export async function getTextContentSafe(page, selector, options = {}) {
  const maxRetries = options.maxRetries || 3;
  const timeout = options.timeout || 5000;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const element = page.locator(selector);
      await element.waitFor({ state: 'visible', timeout });
      const text = await element.textContent();
      if (text && text.trim()) {
        return text.trim();
      }
    } catch (e) {
      if (i < maxRetries - 1) {
        await page.waitForTimeout(500);
        continue;
      }
    }
  }
  
  return null;
}

/**
 * Check if element is visible with timeout
 */
export async function isElementVisible(page, selector, timeout = 5000) {
  try {
    const element = page.locator(selector);
    await element.waitFor({ state: 'visible', timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for network to be idle
 */
export async function waitForNetworkIdle(page, timeout = 5000) {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch {
    // Ignore timeout - network might not be idle
  }
}

