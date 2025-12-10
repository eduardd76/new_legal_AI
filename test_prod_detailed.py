from playwright.sync_api import sync_playwright
import time

def test_production_detailed():
    """Detailed test of production login flow"""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=500)
        context = browser.new_context()
        page = context.new_page()

        # Track all network activity
        requests = []
        responses = []

        def handle_request(request):
            requests.append({
                'url': request.url,
                'method': request.method,
                'headers': dict(request.headers),
            })

        def handle_response(response):
            responses.append({
                'url': response.url,
                'status': response.status,
                'headers': dict(response.headers),
            })

        page.on("request", handle_request)
        page.on("response", handle_response)

        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

        try:
            print("\n" + "="*70)
            print("🔍 DETAILED PRODUCTION LOGIN ANALYSIS")
            print("="*70)

            # Step 1: Load home page
            print("\n1️⃣ Loading home page...")
            page.goto('https://contract-review-ai.vercel.app', wait_until='networkidle')
            print(f"   URL: {page.url}")

            # Check cookies after home page load
            cookies = context.cookies()
            print(f"\n   Cookies after home page: {len(cookies)}")
            for cookie in cookies:
                print(f"      - {cookie['name']}: {cookie['value'][:30]}...")

            # Step 2: Navigate to login
            print("\n2️⃣ Clicking Sign In...")
            page.click('text=Sign In', timeout=5000)
            page.wait_for_load_state('networkidle')
            print(f"   URL: {page.url}")
            page.screenshot(path='prod_detail_login.png', full_page=True)

            # Step 3: Check if we need to create an account first
            print("\n3️⃣ Checking signup option...")
            signup_link = page.locator('a[href="/signup"]')
            if signup_link.count() > 0:
                print("   Found signup link - user needs to create account first")

            # Step 4: Fill login form with test credentials
            print("\n4️⃣ Filling login form...")
            email_input = page.locator('input[type="email"]')
            password_input = page.locator('input[type="password"]')

            if email_input.count() > 0:
                email_input.fill('test@example.com')
                password_input.fill('TestPassword123!')
                print("   ✓ Form filled")

                # Get form details
                print("\n5️⃣ Analyzing form...")
                form = page.locator('form')
                if form.count() > 0:
                    action = form.get_attribute('action')
                    method = form.get_attribute('method')
                    print(f"   Form action: {action}")
                    print(f"   Form method: {method}")

                # Clear previous requests
                requests.clear()
                responses.clear()
                console_logs.clear()

                # Submit form
                print("\n6️⃣ Submitting form...")
                page.click('button[type="submit"]')

                # Wait and watch what happens
                time.sleep(3)

                print(f"\n   Final URL: {page.url}")
                page.screenshot(path='prod_detail_after_submit.png', full_page=True)

                # Analyze the API call
                print("\n7️⃣ API Request Analysis:")
                login_requests = [r for r in requests if '/api/auth/login' in r['url']]
                if login_requests:
                    req = login_requests[0]
                    print(f"   Method: {req['method']}")
                    print(f"   URL: {req['url']}")
                    print(f"   Content-Type: {req['headers'].get('content-type', 'N/A')}")
                else:
                    print("   ❌ No login API request found!")

                print("\n8️⃣ API Response Analysis:")
                login_responses = [r for r in responses if '/api/auth/login' in r['url']]
                if login_responses:
                    resp = login_responses[0]
                    print(f"   Status: {resp['status']}")
                    print(f"   Set-Cookie headers: {resp['headers'].get('set-cookie', 'None')}")

                    # Check for redirect
                    location = resp['headers'].get('location', 'None')
                    print(f"   Location header: {location}")
                else:
                    print("   ❌ No login API response found!")

                # Check cookies after submit
                cookies = context.cookies()
                print(f"\n9️⃣ Cookies after login attempt: {len(cookies)}")
                supabase_cookies = [c for c in cookies if 'supabase' in c['name'].lower() or 'sb-' in c['name']]
                print(f"   Supabase cookies: {len(supabase_cookies)}")
                for cookie in supabase_cookies:
                    print(f"      - {cookie['name']}: {cookie['value'][:30]}...")

                # Console logs
                print("\n🔟 Console Logs:")
                for log in console_logs:
                    if any(kw in log.lower() for kw in ['login', 'error', 'api', 'cookie']):
                        print(f"   {log}")

            print("\n" + "="*70)
            print("✅ Analysis complete")
            print("="*70)

        except Exception as e:
            print(f"\n❌ Error: {str(e)}")
            import traceback
            traceback.print_exc()
            page.screenshot(path='prod_detail_error.png', full_page=True)
        finally:
            input("\nPress Enter to close browser...")
            browser.close()

if __name__ == '__main__':
    test_production_detailed()
