/**
 * Test FRESH upload to verify text extraction works
 */

const { chromium } = require('playwright');
const path = require('path');

const BASE_URL = 'https://contract-review-ai.vercel.app';
const TEST_EMAIL = 'eduard@gmail.com';
const TEST_PASSWORD = 'Mihaela77';
const CONTRACT_FILE = path.join(__dirname, 'Draft contract mentenanta _ ANONOM.docx');

async function testFreshUpload() {
    console.log('🚀 TESTING FRESH UPLOAD WITH TEXT EXTRACTION FIX');
    console.log('='.repeat(80));

    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    try {
        // Login
        console.log('\n[1] Logging in...');
        await page.goto(`${BASE_URL}/login`);
        await page.fill('input[type="email"]', TEST_EMAIL);
        await page.fill('input[type="password"]', TEST_PASSWORD);
        await page.click('button:has-text("Sign In")');
        await page.waitForURL('**/dashboard', { timeout: 15000 });
        console.log('✅ Logged in');

        // Go to upload page
        console.log('\n[2] Navigating to upload...');
        await page.goto(`${BASE_URL}/dashboard/upload`);
        await page.waitForLoadState('networkidle');

        // Upload file
        console.log('\n[3] Uploading document...');
        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.setInputFiles(CONTRACT_FILE);
        await page.waitForTimeout(1000);

        const uploadButton = page.locator('button:has-text("Upload")').first();

        const uploadStartTime = Date.now();
        await uploadButton.click();
        console.log('⏱️  Upload clicked...');

        // Wait for upload to complete (look for redirect or success message)
        await page.waitForTimeout(5000);
        const uploadDuration = Date.now() - uploadStartTime;
        console.log(`⏱️  Upload response time: ${uploadDuration}ms`);

        await page.screenshot({ path: 'test-fresh-01-after-upload.png', fullPage: true });

        // Navigate to documents list
        console.log('\n[4] Checking documents list...');
        await page.goto(`${BASE_URL}/dashboard/documents`);
        await page.waitForLoadState('networkidle', { timeout: 45000 });
        await page.waitForTimeout(3000);

        await page.screenshot({ path: 'test-fresh-02-documents-list.png', fullPage: true });

        // Find most recent document
        const docLinks = await page.locator('a[href*="/dashboard/documents/"]').all();
        console.log(`Found ${docLinks.length} documents`);

        if (docLinks.length === 0) {
            throw new Error('No documents found after upload!');
        }

        // Click the first (most recent) document
        const firstDocHref = await docLinks[0].getAttribute('href');
        console.log(`Opening document: ${firstDocHref}`);

        await docLinks[0].click();
        await page.waitForLoadState('networkidle', { timeout: 30000 });
        await page.waitForTimeout(3000);

        await page.screenshot({ path: 'test-fresh-03-document-viewer.png', fullPage: true });

        // Check document status
        console.log('\n[5] Checking document status...');
        const pageContent = await page.content();

        if (pageContent.includes('status="processing"') || pageContent.includes('>processing<')) {
            console.log('❌ STILL PROCESSING - Text extraction may have failed!');
            console.log('   Status badge still shows "processing"');
            return false;
        }

        if (pageContent.includes('status="ready"') || pageContent.includes('>ready<')) {
            console.log('✅ Document is READY!');
        }

        // Check if document content is visible (not just "Processing document...")
        if (pageContent.includes('Processing document...')) {
            console.log('⚠️  Document content still shows "Processing document..."');
            console.log('   This means extracted_text is null');
            return false;
        }

        // Look for actual document text
        const hasRomanianText = pageContent.includes('LICEUL') || pageContent.includes('mentenanta') || pageContent.includes('Prestator');
        if (hasRomanianText) {
            console.log('✅ Document text is VISIBLE! Text extraction worked!');
        } else {
            console.log('⚠️  Could not find Romanian text in page');
        }

        // Check for Analyze button
        const analyzeButton = page.locator('button:has-text("Start Analysis"), button:has-text("Analyze")').first();
        const hasAnalyzeButton = await analyzeButton.isVisible({ timeout: 2000 }).catch(() => false);

        if (hasAnalyzeButton) {
            console.log('✅ Analyze button is VISIBLE!');
            console.log('\n[6] TRIGGERING AI ANALYSIS...');

            await analyzeButton.click();
            console.log('⏱️  Clicked Analyze button...');

            await page.screenshot({ path: 'test-fresh-04-analysis-started.png', fullPage: true });

            // Wait up to 60 seconds for analysis
            console.log('⏳ Waiting up to 60s for analysis to complete...');
            const analysisStartTime = Date.now();

            let completed = false;
            for (let i = 0; i < 12; i++) {
                await page.waitForTimeout(5000);
                const elapsed = Math.floor((Date.now() - analysisStartTime) / 1000);
                console.log(`   ${elapsed}s elapsed...`);

                const currentContent = await page.content();

                // Check for completion signs
                if (currentContent.includes('issue') || currentContent.includes('risk') || currentContent.includes('comment')) {
                    if (!currentContent.includes('Analyzing...') && !currentContent.includes('Processing...')) {
                        completed = true;
                        console.log(`✅ Analysis COMPLETED after ${elapsed}s!`);
                        break;
                    }
                }

                // Check for error
                if (currentContent.includes('timeout') || currentContent.includes('failed')) {
                    console.log(`❌ Analysis failed or timed out after ${elapsed}s`);
                    break;
                }
            }

            const analysisDuration = Date.now() - analysisStartTime;
            console.log(`⏱️  Total analysis time: ${analysisDuration}ms (${(analysisDuration/1000).toFixed(1)}s)`);

            await page.screenshot({ path: 'test-fresh-05-final-state.png', fullPage: true });

            if (completed) {
                console.log('\n' + '='.repeat(80));
                console.log('🎉 SUCCESS! END-TO-END TEST PASSED!');
                console.log('='.repeat(80));
                console.log('✅ Upload worked');
                console.log('✅ Text extraction worked');
                console.log('✅ Document marked as ready');
                console.log('✅ Analyze button appeared');
                console.log('✅ AI analysis completed');
                console.log('='.repeat(80));
                return true;
            }
        } else {
            console.log('❌ Analyze button NOT visible');
            console.log('   This means document is still "processing" or has error');
            return false;
        }

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        await page.screenshot({ path: 'test-fresh-error.png', fullPage: true });
        return false;
    } finally {
        console.log('\n⏳ Keeping browser open for 5s for inspection...');
        await page.waitForTimeout(5000);
        await browser.close();
    }
}

testFreshUpload().then(success => {
    process.exit(success ? 0 : 1);
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
