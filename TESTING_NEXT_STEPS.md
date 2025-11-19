# Testing Next Steps Guide

You've successfully implemented comprehensive Playwright E2E tests! Here's what to do next:

## ⚠️ IMPORTANT: Run Commands from Root Directory

**All test commands must be run from the project root directory** (`D:\Work Files\latesturology`), NOT from the `frontend` or `backend` directories.

The test scripts are in the root `package.json`, not in the frontend/backend package.json files.

## 🌐 Production Testing Configuration

**Tests are configured to run against production:** `https://uroprep.ahimsa.global/`

- ✅ No need to start local servers
- ✅ Tests run directly against production
- ✅ Increased timeouts for production network latency

**To test locally instead**, set the environment variable:
```bash
$env:PLAYWRIGHT_BASE_URL="http://localhost:5173"
npm run test:e2e
```

---

## ✅ Step 1: Install Playwright Browsers

**First, navigate to the root directory:**
```bash
cd "D:\Work Files\latesturology"
```

Then install browser binaries:

```bash
npx playwright install chromium
```

Or install all browsers (Chromium, Firefox, WebKit):
```bash
npx playwright install
```

**Note:** This downloads browser binaries (~300MB for Chromium). You only need to do this once.

---

## ✅ Step 2: Verify Test User Credentials

Your tests use specific test accounts. Verify these users exist in your database with the correct credentials:

**Test Users (from `e2e/fixtures/auth.js`):**
- **Superadmin**: `admin@urology.com` / `SuperAdmin123!`
- **Urologist**: `testdoctor2@yopmail.com` / `Doctor@1234567`
- **GP**: `testgp@yopmail.com` / `GP@1234567`
- **Nurse**: `testnurse@yopmail.com` / `Testnurse@12345`

**Action Required:**
1. Check if these users exist in your database
2. If not, create them or update `e2e/fixtures/auth.js` with your actual test user credentials
3. Ensure OTP is working for roles that require it (urologist, GP, nurse)

---

## ✅ Step 3: Install Root Dependencies (If Needed)

Make sure you've installed dependencies in the root directory:

```bash
cd "D:\Work Files\latesturology"
npm install
```

This installs Playwright and sets up the test environment.

---

## ✅ Step 4: Production Testing Setup

**Tests are configured to run against production** (`https://uroprep.ahimsa.global/`), so you don't need to start local servers!

### Testing Against Production (Default)
Just run the tests - they'll automatically use the production URL:
```bash
cd "D:\Work Files\latesturology"
npm run test:e2e
```

### Testing Against Localhost (Optional)
If you want to test against local development servers instead:

**Option A: Set Environment Variable**
```powershell
# PowerShell
$env:PLAYWRIGHT_BASE_URL="http://localhost:5173"
npm run test:e2e
```

```bash
# Bash/Linux/Mac
export PLAYWRIGHT_BASE_URL=http://localhost:5173
npm run test:e2e
```

**Option B: Start Servers Manually**
If testing locally, start your servers:

**Terminal 1 - Backend:**
```bash
cd "D:\Work Files\latesturology\backend"
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd "D:\Work Files\latesturology\frontend"
npm run dev
```

**Terminal 3 - Run Tests (from root):**
```bash
cd "D:\Work Files\latesturology"
$env:PLAYWRIGHT_BASE_URL="http://localhost:5173"
npm run test:e2e
```

---

## ✅ Step 5: Run Your First Test

**Make sure you're in the root directory:**
```bash
cd "D:\Work Files\latesturology"
```

Then start with a simple test to verify everything works:

### Run All Tests
```bash
npm run test:e2e
```

### Run Tests in UI Mode (Recommended for First Run)
This opens an interactive UI where you can see tests running:
```bash
npm run test:e2e:ui
```

### Run a Specific Test File
```bash
npx playwright test e2e/auth/login.spec.js
```

### Run Tests in Headed Mode (See Browser)
Useful for debugging and OTP tests:
```bash
npm run test:e2e:headed
```

---

## ✅ Step 6: Review Test Results

After running tests, you'll see:
- **Passed tests** ✅
- **Failed tests** ❌
- **Screenshots** of failures (in `test-results/`)
- **Videos** of failed tests (if configured)

### View HTML Report
```bash
npm run test:e2e:report
```

This opens a detailed HTML report with:
- Test execution timeline
- Screenshots and videos
- Error messages and stack traces
- Network requests

---

## ✅ Step 7: Fix Any Test Failures

Common issues and solutions:

### Issue: "Element not found"
**Solution:** 
- Check if selectors match your actual UI
- Use `npm run test:e2e:debug` to step through tests
- Verify the element exists with browser DevTools

### Issue: "Timeout waiting for element"
**Solution:**
- Increase timeout in test file
- Check if page is loading correctly
- Verify server is running

### Issue: "OTP tests failing"
**Solution:**
- Run in headed mode: `npm run test:e2e:headed`
- Manually enter OTP when prompted
- Or implement a test OTP bypass in backend for test environment

### Issue: "Authentication failing"
**Solution:**
- Verify test user credentials in `e2e/fixtures/auth.js`
- Check if users exist in database
- Verify password hashing matches

---

## ✅ Step 8: Customize Tests

### Update Test Users
Edit `e2e/fixtures/auth.js` to use your actual test accounts.

### Add New Tests
Create new `.spec.js` files in appropriate directories:
- `e2e/auth/` - Authentication tests
- `e2e/pages/` - Page-specific tests
- `e2e/modals/` - Modal component tests
- `e2e/components/` - Component tests

### Adjust Timeouts
If tests are too slow/fast, adjust timeouts in:
- `playwright.config.js` - Global timeouts
- Individual test files - Test-specific timeouts

---

## ✅ Step 9: Set Up CI/CD (Optional)

### GitHub Actions Example
Create `.github/workflows/e2e-tests.yml`:

```yaml
name: E2E Tests

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          npm install
          cd backend && npm install
          cd ../frontend && npm install
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Run tests
        run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 📋 Quick Reference Commands

| Command | Description |
|---------|-------------|
| `npm run test:e2e` | Run all tests headless |
| `npm run test:e2e:ui` | Run tests with interactive UI |
| `npm run test:e2e:headed` | Run tests with visible browser |
| `npm run test:e2e:debug` | Debug tests step-by-step |
| `npm run test:e2e:report` | View HTML test report |
| `npx playwright test e2e/auth/login.spec.js` | Run specific test file |
| `npx playwright test --grep "login"` | Run tests matching pattern |

---

## 🎯 Recommended First Steps

1. **Navigate to root directory**: `cd "D:\Work Files\latesturology"`
2. **Install root dependencies**: `npm install` (if not already done)
3. **Install browsers**: `npx playwright install chromium`
4. **Verify test users** exist in your database
5. **Run UI mode**: `npm run test:e2e:ui` (easiest to see what's happening)
6. **Review results** and fix any failures
7. **Run full suite**: `npm run test:e2e`

---

## 📚 Additional Resources

- **Playwright Docs**: https://playwright.dev/
- **Test Documentation**: See `e2e/README.md`
- **Setup Guide**: See `PLAYWRIGHT_SETUP.md`

---

## 🆘 Need Help?

If tests fail:
1. Check the error message in the test output
2. View screenshots in `test-results/`
3. Run in debug mode: `npm run test:e2e:debug`
4. Check browser console in headed mode
5. Verify servers are running and accessible

---

**You're all set! Start with Step 1 and work through the steps above.** 🚀

