/**
 * Check if upload actually creates a new document
 */

const { chromium } = require('playwright');
const path = require('path');

const BASE_URL = 'https://contract-review-ai.vercel.app';
const TEST_EMAIL = 'eduard@gmail.com';
const TEST_PASSWORD = 'Mihaela77';
const CONTRACT_FILE = path.join(__dirname, 'Draft contract mentenanta _ ANONOM.docx');

async function testUploadDebug() {
    console.log('🔍 DEBUGGING UPLOAD ENDPOINT');
    console.log('='.repeat(80));

    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();

    // Capture API responses
    const apiResponses = [];
    context.on('response', async response => {
        if (response.url().includes('/api/documents/upload')) {
            console.log(`\n📥 UPLOAD API RESPONSE: ${response.status()}`);
            try {
                const body = await response.text();
                console.log(`Body: ${body}`);
                apiResponses.push({ status: response.status(), body });
            } catch (e) {
                console.log(`Could not read body: ${e.message}`);
            }
        }
    });

    const page = await context.newPage();

    // Capture console logs
    page.on('console', msg => console.log(`🖥️  CONSOLE: ${msg.text()}`));

    try {
        // Login
        console.log('\n[1] Logging in...');
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', TEST_EMAIL);
        await page.fill('input[type="password"]', TEST_PASSWORD);
        await page.click('button:has-text("Sign In")');
        await page.waitForURL('**/dashboard', { timeout: 15000 });
        console.log('✅ Logged in');

        // Get current document count
        console.log('\n[2] Checking existing documents...');
        await page.goto(`${BASE_URL}/dashboard/documents`);
        await page.waitForLoadState('networkidle', { timeout: 45000 });
        await page.waitForTimeout(2000);

        const beforeLinks = await page.locator('a[href*="/dashboard/documents/"]').all();
        const beforeCount = beforeLinks.length;
        const beforeIds = [];
        for (const link of beforeLinks) {
            const href = await link.getAttribute('href');
            const id = href.split('/').pop();
            beforeIds.push(id);
        }
        console.log(`Before upload: ${beforeCount} documents`);
        console.log(`IDs: ${beforeIds.join(', ')}`);

        // Go to upload page
        console.log('\n[3] Uploading document...');
        await page.goto(`${BASE_URL}/dashboard/upload`);
        await page.waitForLoadState('networkidle');

        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.setInputFiles(CONTRACT_FILE);
        await page.waitForTimeout(1000);

        const uploadButton = page.locator('button:has-text("Upload")').first();
        await uploadButton.click();
        console.log('⏱️  Upload clicked, waiting for response...');

        // Wait longer for upload to complete
        await page.waitForTimeout(30000); // Wait 30s for text extraction
        console.log('✅ Waited 30s for processing');

        // Check if we got an API response
        if (apiResponses.length > 0) {
            console.log('\n📊 API Response received:');
            console.log(JSON.stringify(apiResponses[0], null, 2));
        } else {
            console.log('\n⚠️  No API response captured!');
        }

        // Check documents list again
        console.log('\n[4] Checking documents list after upload...');
        await page.goto(`${BASE_URL}/dashboard/documents`);
        await page.waitForLoadState('networkidle', { timeout: 45000 });
        await page.waitForTimeout(3000);

        const afterLinks = await page.locator('a[href*="/dashboard/documents/"]').all();
        const afterCount = afterLinks.length;
        const afterIds = [];
        for (const link of afterLinks) {
            const href = await link.getAttribute('href');
            const id = href.split('/').pop();
            afterIds.push(id);
        }
        console.log(`After upload: ${afterCount} documents`);
        console.log(`IDs: ${afterIds.join(', ')}`);

        // Find new document
        const newIds = afterIds.filter(id => !beforeIds.includes(id));
        if (newIds.length > 0) {
            console.log(`\n✅ NEW DOCUMENT CREATED: ${newIds[0]}`);

            // Open the new document
            console.log('\n[5] Opening new document...');
            await page.goto(`${BASE_URL}/dashboard/documents/${newIds[0]}`);
            await page.waitForLoadState('networkidle', { timeout: 30000 });
            await page.waitForTimeout(3000);

            await page.screenshot({ path: 'test-new-document.png', fullPage: true });

            // Check status
            const pageContent = await page.content();

            if (pageContent.includes('status="ready"') || pageContent.includes('>ready<')) {
                console.log('✅ Document status: READY');
            } else if (pageContent.includes('status="processing"') || pageContent.includes('>processing<')) {
                console.log('❌ Document status: STILL PROCESSING');
            } else if (pageContent.includes('status="error"') || pageContent.includes('>error<')) {
                console.log('❌ Document status: ERROR');
            }

            // Check for document text
            const hasText = pageContent.includes('LICEUL') || pageContent.includes('mentenanta');
            if (hasText) {
                console.log('✅ Document text is visible!');
            } else {
                console.log('❌ Document text not visible (extraction may have failed)');
            }

            // Check for analyze button
            const hasAnalyze = await page.locator('button:has-text("Start Analysis"), button:has-text("Analyze")').first().isVisible({ timeout: 2000 }).catch(() => false);
            if (hasAnalyze) {
                console.log('✅ Analyze button is visible!');
            } else {
                console.log('❌ Analyze button not visible');
            }

        } else {
            console.log('\n❌ NO NEW DOCUMENT CREATED!');
            console.log('   Upload may have failed or redirected incorrectly');
        }

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        await page.screenshot({ path: 'test-upload-error.png', fullPage: true });
    } finally {
        console.log('\n⏳ Keeping browser open for 5s...');
        await page.waitForTimeout(5000);
        await browser.close();
    }
}

testUploadDebug().catch(console.error);
