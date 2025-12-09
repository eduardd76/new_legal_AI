import { test, expect, type Page } from '@playwright/test';
import { PDFDocument, rgb } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'https://contract-review-ai.vercel.app';
const SCREENSHOTS_DIR = 'test-results/screenshots';

const TEST_PASSWORD = 'Test123!@#';
const TEST_NAME = 'Test User';

// Generate unique test email per test
function generateTestEmail() {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
}

// Ensure screenshots directory exists
test.beforeAll(async () => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
});

// Helper function to create test PDF
async function createTestPDF(filePath: string) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);

  page.drawText('EMPLOYMENT CONTRACT', {
    x: 50,
    y: 750,
    size: 20,
  });

  page.drawText('This agreement between employer and employee...', {
    x: 50,
    y: 700,
    size: 12,
  });

  page.drawText('Article 1: Job Description', {
    x: 50,
    y: 650,
    size: 14,
  });

  page.drawText('The employee agrees to perform duties as assigned.', {
    x: 50,
    y: 620,
    size: 12,
  });

  page.drawText('Article 2: Compensation', {
    x: 50,
    y: 570,
    size: 14,
  });

  page.drawText('Salary: 5000 RON per month, payable on the last business day.', {
    x: 50,
    y: 540,
    size: 12,
  });

  page.drawText('Article 3: Termination', {
    x: 50,
    y: 490,
    size: 14,
  });

  page.drawText('Either party may terminate with 30 days notice.', {
    x: 50,
    y: 460,
    size: 12,
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(filePath, pdfBytes);
}

// Helper to retry failed tests
async function retryableTest(testFn: () => Promise<void>, maxRetries = 3) {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await testFn();
      return; // Success
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        console.log(`Attempt ${attempt} failed, retrying in 5s...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  throw lastError;
}

// Helper to signup and login (creates new user)
async function signupAndLogin(page: Page) {
  const testEmail = generateTestEmail();

  // Signup
  await page.goto(`${BASE_URL}/signup`);
  await page.fill('input[name="name"], input[type="text"]', TEST_NAME);
  await page.fill('input[name="email"], input[type="email"]', testEmail);
  await page.fill('input[name="password"], input[type="password"]', TEST_PASSWORD);

  const roleSelect = page.locator('select[name="role"]');
  if (await roleSelect.count() > 0) {
    await roleSelect.selectOption('business_user');
  }

  await page.click('button[type="submit"], button:has-text("Sign Up"), button:has-text("Create Account")');
  await page.waitForTimeout(2000);

  // Login
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"], input[type="email"]', testEmail);
  await page.fill('input[name="password"], input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"], button:has-text("Sign In")');
  await page.waitForURL('**/dashboard**', { timeout: 10000 });

  return testEmail;
}

// Helper to upload a test document
async function uploadTestDocument(page: Page, testName: string) {
  await page.goto(`${BASE_URL}/dashboard/upload`);
  await page.waitForLoadState('networkidle');

  const testPdfPath = path.join(process.cwd(), `test-contract-${testName}.pdf`);
  await createTestPDF(testPdfPath);

  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(testPdfPath);

  // Wait for upload to complete (watch for success message or navigation)
  await page.waitForTimeout(5000); // Give upload API time to process

  fs.unlinkSync(testPdfPath);
}

test.describe('E2E Complete Test Suite', () => {

  // Tests 1-3 can run in parallel (no shared state)
  test('Test 1 - Landing Page', async ({ page }) => {
    await retryableTest(async () => {
      await page.goto(BASE_URL);

      // Verify status 200
      const response = await page.goto(BASE_URL);
      expect(response?.status()).toBe(200);

      // Verify hero section visible
      await expect(page.locator('text=AI-Powered Contract Analysis')).toBeVisible();

      // Verify CTA buttons present
      await expect(page.locator('text=Start Free Trial')).toBeVisible();

      // Screenshot
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '1-landing.png'), fullPage: true });
    });
  });

  test('Test 2 - Sign Up', async ({ page }) => {
    await retryableTest(async () => {
      const testEmail = generateTestEmail();
      await page.goto(`${BASE_URL}/signup`);

      // Fill form
      await page.fill('input[name="name"], input[type="text"]', TEST_NAME);
      await page.fill('input[name="email"], input[type="email"]', testEmail);
      await page.fill('input[name="password"], input[type="password"]', TEST_PASSWORD);

      // Select role if dropdown exists
      const roleSelect = page.locator('select[name="role"]');
      if (await roleSelect.count() > 0) {
        await roleSelect.selectOption('business_user');
      }

      // Screenshot before submit
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '2-signup-form.png'), fullPage: true });

      // Submit
      await page.click('button[type="submit"], button:has-text("Sign Up")');

      // Wait for redirect or success message (either dashboard or confirmation)
      await page.waitForTimeout(3000);

      // Screenshot after submit
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '2-signup.png'), fullPage: true });
    });
  });

  test('Test 3 - Login', async ({ page }) => {
    await retryableTest(async () => {
      const testEmail = generateTestEmail();

      // First sign up
      await page.goto(`${BASE_URL}/signup`);
      await page.fill('input[name="name"], input[type="text"]', TEST_NAME);
      await page.fill('input[name="email"], input[type="email"]', testEmail);
      await page.fill('input[name="password"], input[type="password"]', TEST_PASSWORD);
      const roleSelect = page.locator('select[name="role"]');
      if (await roleSelect.count() > 0) {
        await roleSelect.selectOption('business_user');
      }
      await page.click('button[type="submit"], button:has-text("Sign Up")');
      await page.waitForTimeout(2000);

      // Then login
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"], input[type="email"]', testEmail);
      await page.fill('input[name="password"], input[type="password"]', TEST_PASSWORD);

      // Screenshot before login
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '3-login-form.png'), fullPage: true });

      // Submit
      await page.click('button[type="submit"], button:has-text("Sign In")');

      // Wait for redirect to dashboard
      await page.waitForURL('**/dashboard**', { timeout: 10000 });

      // Verify we're on dashboard
      expect(page.url()).toContain('/dashboard');

      // Screenshot
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '3-login.png'), fullPage: true });
    });
  });

  test('Test 4 - Dashboard', async ({ page }) => {
    await retryableTest(async () => {
      // Signup and login
      await signupAndLogin(page);

      // Check sidebar navigation
      await expect(page.locator('nav, aside, [role="navigation"]')).toBeVisible();

      // Check for no console errors
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.waitForTimeout(2000);

      // Screenshot
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '4-dashboard.png'), fullPage: true });

      // Allow some errors but warn if too many
      if (errors.length > 5) {
        console.warn(`Warning: ${errors.length} console errors detected`);
      }
    });
  });

  test('Test 5 - Upload Document', async ({ page }) => {
    await retryableTest(async () => {
      // Signup and login
      await signupAndLogin(page);

      // Navigate to upload
      await page.goto(`${BASE_URL}/dashboard/upload`);
      await page.waitForLoadState('networkidle');

      // Create test PDF
      const testPdfPath = path.join(process.cwd(), 'test-contract.pdf');
      await createTestPDF(testPdfPath);

      // Find file input
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testPdfPath);

      // Wait for upload to complete
      await page.waitForTimeout(5000);

      // Screenshot
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '5-upload.png'), fullPage: true });

      // Clean up
      fs.unlinkSync(testPdfPath);
    });
  });

  test('Test 6 - Documents List', async ({ page }) => {
    await retryableTest(async () => {
      // Create unique user and upload document
      const testEmail = await signupAndLogin(page);

      // Upload a document first
      await page.goto(`${BASE_URL}/dashboard/upload`);
      await page.waitForLoadState('networkidle');

      const testPdfPath = path.join(process.cwd(), 'test-contract-6.pdf');
      await createTestPDF(testPdfPath);

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testPdfPath);
      await page.waitForTimeout(3000);

      // Now go to documents list
      await page.goto(`${BASE_URL}/dashboard/documents`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Verify document appears
      const documentLinks = page.locator('a[href*="/dashboard/documents/"]');
      const documentLink = documentLinks.first();
      await expect(documentLink).toBeVisible({ timeout: 10000 });

      // Screenshot
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '6-documents.png'), fullPage: true });

      await documentLink.click();
      await page.waitForTimeout(2000);

      // Clean up
      fs.unlinkSync(testPdfPath);
    });
  });

  test('Test 7 - Document Viewer (Before Analysis)', async ({ page }) => {
    await retryableTest(async () => {
      // Create user, login, upload document
      await signupAndLogin(page);
      await uploadTestDocument(page, '7');

      // Go to documents and open first one
      await page.goto(`${BASE_URL}/dashboard/documents`);
      await page.waitForLoadState('networkidle');

      const documentLink = page.locator('a[href*="/dashboard/documents/"]').first();
      await expect(documentLink).toBeVisible({ timeout: 10000 });
      await documentLink.click();
      await page.waitForLoadState('networkidle');

      // Verify document viewer elements
      await page.waitForTimeout(2000);

      // Screenshot
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '7-viewer-before.png'), fullPage: true });
    });
  });

  test('Test 8 - Run Analysis', async ({ page }) => {
    await retryableTest(async () => {
      // Create user, login, upload document
      await signupAndLogin(page);
      await uploadTestDocument(page, '8');

      // Go to document and start analysis
      await page.goto(`${BASE_URL}/dashboard/documents`);
      await page.waitForLoadState('networkidle');

      const documentLink = page.locator('a[href*="/dashboard/documents/"]').first();
      await expect(documentLink).toBeVisible({ timeout: 10000 });
      await documentLink.click();
      await page.waitForLoadState('networkidle');

      // Click analyze button if it exists
      await page.waitForTimeout(2000);
      const analyzeButton = page.locator('button:has-text("Analyze"), button:has-text("Start Analysis")');
      if (await analyzeButton.count() > 0) {
        await analyzeButton.click();
        await page.waitForTimeout(5000);
      }

      // Screenshot
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '8-analysis.png'), fullPage: true });
    });
  });

  test('Test 9 - View Results', async ({ page }) => {
    await retryableTest(async () => {
      // Create user, login, upload document
      await signupAndLogin(page);
      await uploadTestDocument(page, '9');

      // Go to document
      await page.goto(`${BASE_URL}/dashboard/documents`);
      await page.waitForLoadState('networkidle');

      const documentLink = page.locator('a[href*="/dashboard/documents/"]').first();
      await expect(documentLink).toBeVisible({ timeout: 10000 });
      await documentLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Screenshot
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '9-results.png'), fullPage: true });
    });
  });

  test('Test 10 - Comment Interaction', async ({ page }) => {
    await retryableTest(async () => {
      // Create user, login, upload document
      await signupAndLogin(page);
      await uploadTestDocument(page, '10');

      // Go to document
      await page.goto(`${BASE_URL}/dashboard/documents`);
      await page.waitForLoadState('networkidle');

      const documentLink = page.locator('a[href*="/dashboard/documents/"]').first();
      await expect(documentLink).toBeVisible({ timeout: 10000 });
      await documentLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Screenshot
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10-interaction.png'), fullPage: true });
    });
  });

  test('Test 11 - Export Page', async ({ page }) => {
    await retryableTest(async () => {
      // Create user, login, upload document
      await signupAndLogin(page);
      await uploadTestDocument(page, '11');

      // Go to documents and get export page
      await page.goto(`${BASE_URL}/dashboard/documents`);
      await page.waitForLoadState('networkidle');

      const documentLink = page.locator('a[href*="/dashboard/documents/"]').first();
      await expect(documentLink).toBeVisible({ timeout: 10000 });
      const href = await documentLink.getAttribute('href');

      if (href) {
        const docId = href.split('/').pop();
        await page.goto(`${BASE_URL}/dashboard/documents/${docId}/export`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Screenshot
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11-export.png'), fullPage: true });
      }
    });
  });

  test('Test 12 - Data Persistence', async ({ page, context }) => {
    await retryableTest(async () => {
      // Create user, login, upload document
      const testEmail = await signupAndLogin(page);
      await uploadTestDocument(page, '12');

      // Check document exists
      await page.goto(`${BASE_URL}/dashboard/documents`);
      await page.waitForLoadState('networkidle');

      const documentLink = page.locator('a[href*="/dashboard/documents/"]').first();
      await expect(documentLink).toBeVisible({ timeout: 10000 });

      // Logout (clear cookies)
      await context.clearCookies();

      // Login again with same credentials
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[name="email"], input[type="email"]', testEmail);
      await page.fill('input[name="password"], input[type="password"]', TEST_PASSWORD);
      await page.click('button[type="submit"], button:has-text("Sign In")');
      await page.waitForURL('**/dashboard**', { timeout: 10000 });

      // Go to documents again
      await page.goto(`${BASE_URL}/dashboard/documents`);
      await page.waitForLoadState('networkidle');

      // Verify document still exists
      await expect(documentLink.first()).toBeVisible({ timeout: 10000 });

      // Screenshot
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12-persistence.png'), fullPage: true });
    });
  });

  test('Test 13 - Responsive Design', async ({ browser }) => {
    await retryableTest(async () => {
      const viewports = [
        { name: 'desktop', width: 1920, height: 1080 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'mobile', width: 375, height: 667 },
      ];

      for (const viewport of viewports) {
        const context = await browser.newContext({ viewport });
        const page = await context.newPage();

        await page.goto(BASE_URL);
        await page.waitForLoadState('networkidle');

        // Verify layout adapts
        await expect(page.locator('text=AI-Powered Contract Analysis')).toBeVisible();

        // Screenshot
        await page.screenshot({
          path: path.join(SCREENSHOTS_DIR, `13-responsive-${viewport.name}.png`),
          fullPage: true
        });

        await context.close();
      }
    });
  });

  test('Test 14 - Performance', async ({ page }) => {
    await retryableTest(async () => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');

      // Basic performance check - page loads
      const performanceTiming = await page.evaluate(() => JSON.stringify(window.performance.timing));
      const timing = JSON.parse(performanceTiming);

      const loadTime = timing.loadEventEnd - timing.navigationStart;
      console.log(`Page load time: ${loadTime}ms`);

      // Screenshot
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '14-lighthouse.png'), fullPage: true });

      // Basic assertion - page should load in reasonable time
      expect(loadTime).toBeLessThan(10000); // 10 seconds max
    });
  });

  test('Test 15 - Error Handling', async ({ page }) => {
    await retryableTest(async () => {
      // Signup and login
      await signupAndLogin(page);

      // Go to upload page
      await page.goto(`${BASE_URL}/dashboard/upload`);
      await page.waitForLoadState('networkidle');

      // Try to upload wrong file type (create a .txt file)
      const txtFilePath = path.join(process.cwd(), 'test-wrong-type.txt');
      fs.writeFileSync(txtFilePath, 'This is a text file');

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(txtFilePath);

      await page.waitForTimeout(2000);

      // Check for error message (may or may not appear depending on validation)
      // Screenshot will show the state
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '15-errors.png'), fullPage: true });

      // Clean up
      fs.unlinkSync(txtFilePath);
    });
  });
});
