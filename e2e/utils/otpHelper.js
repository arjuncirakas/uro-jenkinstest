/**
 * OTP Helper functions for Playwright tests
 * These helpers retrieve OTP codes from the backend API for automated testing
 */

/**
 * Get OTP from backend test endpoint
 * @param {Page} page - Playwright page object
 * @param {string} email - User email address
 * @param {string} type - OTP type (default: 'login_verification')
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} retryDelay - Delay between retries in ms
 * @returns {Promise<string|null>} OTP code or null if not found
 */
export async function getOTPFromAPI(page, email, type = 'login_verification', maxRetries = 5, retryDelay = 2000) {
  // Get base URL from environment or page context
  let baseURL = process.env.PLAYWRIGHT_BASE_URL;
  if (!baseURL && page.url()) {
    try {
      const url = new URL(page.url());
      baseURL = `${url.protocol}//${url.host}`;
    } catch (e) {
      // If URL parsing fails, use default
    }
  }
  if (!baseURL) {
    baseURL = 'https://uroprep.ahimsa.global';
  }
  
  const apiURL = `${baseURL}/api/auth/test/get-otp/${encodeURIComponent(email)}?type=${type}`;
  
  console.log(`[OTP Helper] Attempting to fetch OTP from: ${apiURL}`);
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await page.request.get(apiURL, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      const status = response.status();
      const data = await response.json();
      
      console.log(`[OTP Helper] Attempt ${attempt + 1}: Status ${status}, Success: ${data.success}`);
      
      if (status === 403) {
        console.error('[OTP Helper] Endpoint returned 403 - test endpoint may be disabled in production');
        console.error('[OTP Helper] Set ALLOW_TEST_OTP=true or run tests against development environment');
        return null;
      }
      
      if (data.success && data.otp) {
        console.log(`[OTP Helper] Successfully retrieved OTP: ${data.otp.substring(0, 2)}****`);
        return data.otp;
      }
      
      // If OTP not found yet, wait and retry
      if (attempt < maxRetries - 1) {
        console.log(`[OTP Helper] OTP not found yet, retrying in ${retryDelay}ms...`);
        await page.waitForTimeout(retryDelay);
      }
    } catch (error) {
      console.error(`[OTP Helper] Error fetching OTP (attempt ${attempt + 1}/${maxRetries}):`, error.message);
      if (attempt < maxRetries - 1) {
        await page.waitForTimeout(retryDelay);
      }
    }
  }
  
  console.error('[OTP Helper] Failed to retrieve OTP after all retries');
  return null;
}

/**
 * Wait for OTP modal and automatically fill in the OTP
 * @param {Page} page - Playwright page object
 * @param {string} email - User email address
 * @param {string} type - OTP type (default: 'login_verification')
 * @returns {Promise<boolean>} True if OTP was successfully entered
 */
export async function fillOTPFromAPI(page, email, type = 'login_verification') {
  try {
    // Wait for OTP modal to appear
    await page.waitForSelector('text=Verify Your Identity', { timeout: 15000 });
    await page.waitForSelector('input[id="otp"]', { timeout: 10000 });
    
    // Wait a bit for OTP to be generated and stored
    await page.waitForTimeout(2000);
    
    // Get OTP from API
    const otp = await getOTPFromAPI(page, email, type);
    
    if (!otp) {
      console.error('Failed to retrieve OTP from API');
      return false;
    }
    
    // Fill in the OTP
    const otpInput = page.locator('input[id="otp"]');
    await otpInput.waitFor({ state: 'visible', timeout: 5000 });
    await otpInput.clear();
    await otpInput.fill(otp);
    
    // Wait a moment for the input to register
    await page.waitForTimeout(500);
    
    return true;
  } catch (error) {
    console.error('Error filling OTP:', error);
    return false;
  }
}

/**
 * Complete OTP verification flow
 * @param {Page} page - Playwright page object
 * @param {string} email - User email address
 * @param {string} type - OTP type (default: 'login_verification')
 * @returns {Promise<boolean>} True if verification was successful
 */
export async function completeOTPVerification(page, email, type = 'login_verification') {
  try {
    // Fill OTP
    const filled = await fillOTPFromAPI(page, email, type);
    if (!filled) {
      return false;
    }
    
    // Click verify button
    const verifyButton = page.locator('button:has-text("Verify Code")');
    await verifyButton.waitFor({ state: 'visible', timeout: 5000 });
    await verifyButton.click();
    
    // Wait for navigation or success message
    await page.waitForTimeout(2000);
    
    // Check if we navigated away from login or OTP modal disappeared
    const modalVisible = await page.locator('text=Verify Your Identity').isVisible().catch(() => false);
    return !modalVisible;
  } catch (error) {
    console.error('Error completing OTP verification:', error);
    return false;
  }
}

