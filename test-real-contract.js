/**
 * Real Contract Testing Script
 * Tests actual maintenance contract upload, AI analysis, and performance
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://contract-review-ai.vercel.app';
const TEST_EMAIL = 'eduard@gmail.com';
const TEST_PASSWORD = 'Mihaela77';
const CONTRACT_FILE = path.join(__dirname, 'Draft contract mentenanta _ ANONOM.docx');

// Performance metrics
const metrics = {
    loginTime: 0,
    uploadTime: 0,
    analysisTime: 0,
    totalTime: 0,
    documentId: null,
    analysisResults: null
};

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function testRealContract() {
    console.log('\n' + '='.repeat(70));
    console.log('REAL CONTRACT TESTING - MAINTENANCE CONTRACT');
    console.log('='.repeat(70));
    console.log(`Contract: ${path.basename(CONTRACT_FILE)}`);
    console.log(`Size: ${(fs.statSync(CONTRACT_FILE).size / 1024).toFixed(2)} KB`);
    console.log('='.repeat(70) + '\n');

    const browser = await chromium.launch({ headless: false }); // Show browser for visibility
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        const startTime = Date.now();

        // ===== STEP 1: LOGIN =====
        console.log('[1/6] Logging in...');
        const loginStart = Date.now();

        await page.goto(`${BASE_URL}/login`);
        await page.waitForLoadState('networkidle');

        await page.fill('input[type="email"]', TEST_EMAIL);
        await page.fill('input[type="password"]', TEST_PASSWORD);
        await page.screenshot({ path: 'test-results/real-01-login.png', fullPage: true });

        await page.click('button:has-text("Sign In"), button:has-text("Login")');
        await page.waitForURL('**/dashboard', { timeout: 15000 });

        metrics.loginTime = Date.now() - loginStart;
        console.log(`   ✅ Login successful (${metrics.loginTime}ms)`);
        await page.screenshot({ path: 'test-results/real-02-dashboard.png', fullPage: true });

        // ===== STEP 2: NAVIGATE TO UPLOAD =====
        console.log('\n[2/6] Navigating to upload page...');
        await page.goto(`${BASE_URL}/dashboard/upload`);
        await page.waitForLoadState('networkidle');
        console.log('   ✅ Upload page loaded');
        await page.screenshot({ path: 'test-results/real-03-upload-page.png', fullPage: true });

        // ===== STEP 3: UPLOAD REAL CONTRACT =====
        console.log('\n[3/6] Uploading maintenance contract...');
        const uploadStart = Date.now();

        const fileInput = page.locator('input[type="file"]').first();

        // Set the file
        await fileInput.setInputFiles(CONTRACT_FILE);
        console.log('   ✅ File selected');
        await sleep(2000);
        await page.screenshot({ path: 'test-results/real-04-file-selected.png', fullPage: true });

        // Look for upload button
        const uploadButtons = [
            'button:has-text("Upload")',
            'button:has-text("Submit")',
            'button:has-text("Upload Document")',
            'button[type="submit"]'
        ];

        let uploaded = false;
        for (const selector of uploadButtons) {
            try {
                const button = page.locator(selector).first();
                if (await button.isVisible({ timeout: 2000 })) {
                    await button.click();
                    console.log('   ✅ Upload button clicked');
                    uploaded = true;
                    break;
                }
            } catch (e) {
                // Try next selector
            }
        }

        if (!uploaded) {
            console.log('   ⚠️  No upload button found - may be auto-upload');
        }

        // Wait for upload to complete
        await sleep(5000);

        metrics.uploadTime = Date.now() - uploadStart;
        console.log(`   ✅ Upload completed (${metrics.uploadTime}ms)`);
        await page.screenshot({ path: 'test-results/real-05-after-upload.png', fullPage: true });

        // Check current URL
        const afterUploadUrl = page.url();
        console.log(`   📍 Current URL: ${afterUploadUrl}`);

        // ===== STEP 4: NAVIGATE TO DOCUMENTS =====
        console.log('\n[4/6] Navigating to documents list...');
        await page.goto(`${BASE_URL}/dashboard/documents`);

        // Wait with longer timeout for documents list
        console.log('   ⏳ Waiting for documents to load (max 45s)...');
        await page.waitForLoadState('networkidle', { timeout: 45000 });
        await sleep(3000);

        await page.screenshot({ path: 'test-results/real-06-documents-list.png', fullPage: true });

        const content = await page.content();

        // Look for the uploaded document
        const hasDocument = content.includes('mentenanta') ||
                           content.includes('ANONOM') ||
                           content.includes('.docx');

        if (hasDocument) {
            console.log('   ✅ Document appears in list!');

            // Try to find and click the document
            const docLinks = await page.locator('a[href*="/documents/"], button:has-text("View"), [role="link"]').all();
            console.log(`   📄 Found ${docLinks.length} potential document links`);

            if (docLinks.length > 0) {
                // Click first document
                const firstDoc = docLinks[0];
                if (await firstDoc.isVisible()) {
                    await firstDoc.click();
                    console.log('   ✅ Clicked on document');
                    await sleep(3000);
                    await page.screenshot({ path: 'test-results/real-07-document-viewer.png', fullPage: true });

                    // Store document ID from URL
                    const viewerUrl = page.url();
                    const match = viewerUrl.match(/documents\/([^\/]+)/);
                    if (match) {
                        metrics.documentId = match[1];
                        console.log(`   📋 Document ID: ${metrics.documentId}`);
                    }
                }
            }
        } else {
            console.log('   ⚠️  Document not found in list yet - may still be processing');
        }

        // ===== STEP 5: TRIGGER AI ANALYSIS =====
        console.log('\n[5/6] Triggering AI analysis...');
        const analysisStart = Date.now();

        // Look for analyze button
        const analyzeButtons = [
            'button:has-text("Analyze")',
            'button:has-text("Start Analysis")',
            'button:has-text("Analyze Document")',
            'button:has-text("Run Analysis")'
        ];

        let analysisTriggered = false;
        for (const selector of analyzeButtons) {
            try {
                const button = page.locator(selector).first();
                if (await button.isVisible({ timeout: 2000 })) {
                    console.log(`   🔍 Found analyze button: ${selector}`);
                    await button.click();
                    console.log('   ✅ Analysis started');
                    analysisTriggered = true;
                    await sleep(2000);
                    await page.screenshot({ path: 'test-results/real-08-analysis-started.png', fullPage: true });
                    break;
                }
            } catch (e) {
                // Try next selector
            }
        }

        if (!analysisTriggered) {
            console.log('   ⚠️  Analyze button not found - may need manual trigger');
        } else {
            // Wait for analysis to complete
            console.log('   ⏳ Waiting for analysis to complete (max 60s)...');

            // Poll for results
            let resultsFound = false;
            for (let i = 0; i < 60; i++) {
                await sleep(1000);
                const pageContent = await page.content();

                // Check for analysis results indicators
                if (pageContent.includes('risk') ||
                    pageContent.includes('comment') ||
                    pageContent.includes('issue') ||
                    pageContent.includes('compliance') ||
                    pageContent.includes('clause')) {
                    resultsFound = true;
                    metrics.analysisTime = Date.now() - analysisStart;
                    console.log(`   ✅ Analysis completed (${metrics.analysisTime}ms)`);
                    break;
                }

                if (i % 5 === 0) {
                    console.log(`   ⏳ Still waiting... (${i}s elapsed)`);
                }
            }

            if (!resultsFound) {
                console.log('   ⚠️  Analysis taking longer than expected');
                metrics.analysisTime = Date.now() - analysisStart;
            }
        }

        await page.screenshot({ path: 'test-results/real-09-analysis-results.png', fullPage: true });

        // ===== STEP 6: CAPTURE ANALYSIS RESULTS =====
        console.log('\n[6/6] Capturing analysis results...');

        const finalContent = await page.content();

        // Save full page HTML
        fs.writeFileSync('test-results/real-analysis-page.html', finalContent);
        console.log('   ✅ Saved full page HTML');

        // Try to extract visible text content
        const mainContent = await page.locator('main, [role="main"], .main-content').first().textContent().catch(() => '');
        fs.writeFileSync('test-results/real-analysis-text.txt', mainContent);
        console.log('   ✅ Saved analysis text');

        // Look for specific analysis elements
        const riskElements = await page.locator('[class*="risk"], [class*="score"]').all();
        console.log(`   📊 Found ${riskElements.length} risk-related elements`);

        const commentElements = await page.locator('[class*="comment"], [class*="issue"]').all();
        console.log(`   💬 Found ${commentElements.length} comment/issue elements`);

        // Extract comments if visible
        const comments = [];
        for (let i = 0; i < Math.min(commentElements.length, 10); i++) {
            try {
                const text = await commentElements[i].textContent();
                if (text && text.length > 10) {
                    comments.push(text.trim());
                }
            } catch (e) {
                // Skip if error
            }
        }

        if (comments.length > 0) {
            console.log(`   ✅ Extracted ${comments.length} comments`);
            metrics.analysisResults = comments;
            fs.writeFileSync('test-results/real-analysis-comments.json', JSON.stringify(comments, null, 2));
        }

        metrics.totalTime = Date.now() - startTime;

        // ===== FINAL REPORT =====
        console.log('\n' + '='.repeat(70));
        console.log('PERFORMANCE METRICS');
        console.log('='.repeat(70));
        console.log(`Login Time:        ${metrics.loginTime}ms`);
        console.log(`Upload Time:       ${metrics.uploadTime}ms`);
        console.log(`Analysis Time:     ${metrics.analysisTime}ms`);
        console.log(`Total Time:        ${metrics.totalTime}ms (${(metrics.totalTime/1000).toFixed(1)}s)`);
        if (metrics.documentId) {
            console.log(`Document ID:       ${metrics.documentId}`);
        }
        console.log('='.repeat(70));

        // Save metrics
        fs.writeFileSync('test-results/real-performance-metrics.json', JSON.stringify(metrics, null, 2));
        console.log('\n✅ All results saved to test-results/');

        // Keep browser open for 10 seconds to inspect
        console.log('\n⏳ Keeping browser open for 10 seconds for inspection...');
        await sleep(10000);

    } catch (error) {
        console.error('\n❌ Error during testing:', error.message);
        await page.screenshot({ path: 'test-results/real-error.png', fullPage: true });
        throw error;
    } finally {
        await browser.close();
        console.log('\n✅ Test completed!');
    }
}

// Run the test
testRealContract().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
