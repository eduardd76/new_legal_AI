/**
 * ULTRA-DEBUG: Production Analysis Testing
 * Captures EVERYTHING to diagnose the hanging issue
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://contract-review-ai.vercel.app';
const TEST_EMAIL = 'eduard@gmail.com';
const TEST_PASSWORD = 'Mihaela77';
const CONTRACT_FILE = path.join(__dirname, 'Draft contract mentenanta _ ANONOM.docx');

async function debugProductionAnalysis() {
    console.log('='.repeat(80));
    console.log('ULTRA-DEBUG: PRODUCTION ANALYSIS TESTING');
    console.log('='.repeat(80));
    console.log('Time:', new Date().toISOString());
    console.log('URL:', BASE_URL);
    console.log('File:', path.basename(CONTRACT_FILE));
    console.log('='.repeat(80));
    console.log('');

    const browser = await chromium.launch({
        headless: false,
        slowMo: 500 // Slow down to see what's happening
    });

    const context = await browser.newContext();

    // Enable request/response logging
    const networkLogs = [];
    context.on('request', request => {
        if (request.url().includes('/api/')) {
            networkLogs.push({
                type: 'REQUEST',
                time: new Date().toISOString(),
                method: request.method(),
                url: request.url(),
                headers: request.headers(),
            });
            console.log(`📤 REQUEST: ${request.method()} ${request.url()}`);
        }
    });

    context.on('response', async response => {
        if (response.url().includes('/api/')) {
            const responseData = {
                type: 'RESPONSE',
                time: new Date().toISOString(),
                status: response.status(),
                url: response.url(),
                headers: response.headers(),
            };

            try {
                const body = await response.text();
                responseData.body = body;
                console.log(`📥 RESPONSE: ${response.status()} ${response.url()}`);
                console.log(`   Body (first 500 chars): ${body.substring(0, 500)}`);
            } catch (e) {
                responseData.body = '[Could not read body]';
            }

            networkLogs.push(responseData);
        }
    });

    const page = await context.newPage();

    // Capture console logs
    const consoleLogs = [];
    page.on('console', msg => {
        const log = `[${msg.type()}] ${msg.text()}`;
        consoleLogs.push({ time: new Date().toISOString(), log });
        console.log(`🖥️  CONSOLE: ${log}`);
    });

    // Capture page errors
    const pageErrors = [];
    page.on('pageerror', error => {
        pageErrors.push({ time: new Date().toISOString(), error: error.message });
        console.error(`❌ PAGE ERROR: ${error.message}`);
    });

    try {
        // Step 1: Login
        console.log('\n[STEP 1] Logging in...');
        await page.goto(`${BASE_URL}/login`);
        await page.waitForLoadState('networkidle');

        await page.fill('input[type="email"]', TEST_EMAIL);
        await page.fill('input[type="password"]', TEST_PASSWORD);
        await page.screenshot({ path: 'debug-prod-01-login.png', fullPage: true });

        await page.click('button:has-text("Sign In")');
        await page.waitForURL('**/dashboard', { timeout: 15000 });
        console.log('✅ Login successful');
        await page.screenshot({ path: 'debug-prod-02-dashboard.png', fullPage: true });

        // Step 2: Upload document
        console.log('\n[STEP 2] Uploading document...');
        await page.goto(`${BASE_URL}/dashboard/upload`);
        await page.waitForLoadState('networkidle');

        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.setInputFiles(CONTRACT_FILE);
        console.log('✅ File selected');

        await page.waitForTimeout(2000);

        // Click upload button
        const uploadButton = page.locator('button:has-text("Upload")').first();
        if (await uploadButton.isVisible()) {
            await uploadButton.click();
            console.log('✅ Upload clicked');
        }

        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'debug-prod-03-after-upload.png', fullPage: true });

        // Step 3: Navigate to documents and find our document
        console.log('\n[STEP 3] Finding uploaded document...');
        await page.goto(`${BASE_URL}/dashboard/documents`);
        await page.waitForLoadState('networkidle', { timeout: 45000 });
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'debug-prod-04-documents-list.png', fullPage: true });

        // Get all document links
        const docLinks = await page.locator('a[href*="/dashboard/documents/"]').all();
        console.log(`Found ${docLinks.length} document links`);

        if (docLinks.length === 0) {
            throw new Error('No documents found in list!');
        }

        // Click first document
        const firstDocHref = await docLinks[0].getAttribute('href');
        console.log(`Opening document: ${firstDocHref}`);
        await docLinks[0].click();
        await page.waitForLoadState('networkidle', { timeout: 30000 });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'debug-prod-05-document-viewer.png', fullPage: true });

        const documentId = firstDocHref.split('/').pop();
        console.log(`✅ Document ID: ${documentId}`);

        // Step 4: CRITICAL - Trigger analysis and monitor closely
        console.log('\n[STEP 4] 🔍 TRIGGERING ANALYSIS - MONITORING CLOSELY...');
        console.log('='.repeat(80));

        // Look for analyze button
        const analyzeButton = page.locator('button:has-text("Start Analysis"), button:has-text("Analyze")').first();

        if (await analyzeButton.isVisible({ timeout: 5000 })) {
            console.log('✅ Found Analyze button');

            // Set up network monitoring BEFORE clicking
            const apiPromise = page.waitForResponse(
                response => response.url().includes(`/api/documents/${documentId}/analyze`),
                { timeout: 120000 } // 2 minute timeout
            );

            const analysisStartTime = Date.now();
            console.log(`⏱️  Analysis start time: ${new Date(analysisStartTime).toISOString()}`);

            // Click analyze
            await analyzeButton.click();
            console.log('✅ Clicked Analyze button');
            await page.screenshot({ path: 'debug-prod-06-clicked-analyze.png', fullPage: true });

            // Monitor status every 5 seconds
            const statusCheckInterval = setInterval(async () => {
                const elapsed = Math.floor((Date.now() - analysisStartTime) / 1000);
                console.log(`⏱️  ${elapsed}s elapsed...`);

                // Check page content
                const content = await page.content();
                if (content.includes('Analyzing')) {
                    console.log('   Status: Still showing "Analyzing..."');
                }
                if (content.includes('Processing')) {
                    console.log('   Status: Still showing "Processing..."');
                }

                await page.screenshot({
                    path: `debug-prod-status-${elapsed}s.png`,
                    fullPage: true
                });
            }, 5000);

            try {
                // Wait for API response
                console.log('⏳ Waiting for API response (max 2 minutes)...');
                const response = await apiPromise;

                clearInterval(statusCheckInterval);

                const analysisDuration = Date.now() - analysisStartTime;
                console.log(`\n⏱️  API RESPONDED after ${analysisDuration}ms (${(analysisDuration/1000).toFixed(1)}s)`);
                console.log(`📊 Status: ${response.status()}`);

                const responseBody = await response.text();
                console.log(`📄 Response body:\n${responseBody}`);

                // Save full response
                fs.writeFileSync('debug-prod-api-response.json', JSON.stringify({
                    status: response.status(),
                    headers: response.headers(),
                    body: responseBody,
                    duration_ms: analysisDuration
                }, null, 2));

                if (response.status() === 200) {
                    console.log('✅ API call successful!');

                    // Wait for page to update
                    await page.waitForTimeout(3000);
                    await page.screenshot({ path: 'debug-prod-07-after-analysis.png', fullPage: true });

                    // Check for results
                    const pageContent = await page.content();
                    if (pageContent.includes('issue') || pageContent.includes('risk')) {
                        console.log('✅ Analysis results appear on page!');
                    } else {
                        console.log('⚠️  API succeeded but results not visible on page');
                    }
                } else {
                    console.error(`❌ API returned error status: ${response.status()}`);
                    console.error(`Error body: ${responseBody}`);
                }

            } catch (error) {
                clearInterval(statusCheckInterval);

                console.error('\n❌ API CALL FAILED OR TIMED OUT');
                console.error(`Error: ${error.message}`);

                const finalDuration = Date.now() - analysisStartTime;
                console.log(`⏱️  Time elapsed before timeout: ${finalDuration}ms (${(finalDuration/1000).toFixed(1)}s)`);

                await page.screenshot({ path: 'debug-prod-08-timeout-state.png', fullPage: true });

                // Check what network calls were made
                console.log('\n📊 NETWORK ACTIVITY DURING ANALYSIS:');
                const analysisNetworkLogs = networkLogs.filter(log =>
                    new Date(log.time) >= new Date(analysisStartTime)
                );
                console.log(JSON.stringify(analysisNetworkLogs, null, 2));

                throw error;
            }

        } else {
            console.log('❌ Analyze button not found!');
            const pageContent = await page.content();
            fs.writeFileSync('debug-prod-no-button.html', pageContent);
            console.log('Saved page content to debug-prod-no-button.html');
        }

    } catch (error) {
        console.error('\n' + '='.repeat(80));
        console.error('❌ ERROR OCCURRED:');
        console.error('='.repeat(80));
        console.error(error);
        await page.screenshot({ path: 'debug-prod-error.png', fullPage: true });
    } finally {
        // Save all logs
        fs.writeFileSync('debug-prod-network-logs.json', JSON.stringify(networkLogs, null, 2));
        fs.writeFileSync('debug-prod-console-logs.json', JSON.stringify(consoleLogs, null, 2));
        fs.writeFileSync('debug-prod-page-errors.json', JSON.stringify(pageErrors, null, 2));

        console.log('\n' + '='.repeat(80));
        console.log('📊 FINAL REPORT:');
        console.log('='.repeat(80));
        console.log(`Network Logs: ${networkLogs.length} entries`);
        console.log(`Console Logs: ${consoleLogs.length} entries`);
        console.log(`Page Errors: ${pageErrors.length} entries`);
        console.log('');
        console.log('✅ All logs saved to:');
        console.log('   - debug-prod-network-logs.json');
        console.log('   - debug-prod-console-logs.json');
        console.log('   - debug-prod-page-errors.json');
        console.log('   - debug-prod-*.png (screenshots)');
        console.log('='.repeat(80));

        // Keep browser open for inspection
        console.log('\n⏳ Keeping browser open for 10 seconds for manual inspection...');
        await page.waitForTimeout(10000);

        await browser.close();
    }
}

// Run the debug script
debugProductionAnalysis().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
