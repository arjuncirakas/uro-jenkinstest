import { test as base } from '@playwright/test';
import { completeOTPVerification } from '../utils/otpHelper.js';
import { waitForLoadingToComplete } from '../utils/helpers.js';

// Extended test with authentication fixtures
export const test = base.extend({
  // Authentication fixtures removed - test users have been removed for security
});

export { expect } from '@playwright/test';



