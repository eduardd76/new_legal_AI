from playwright.sync_api import sync_playwright
import json

def diagnose_login():
    """Comprehensive login diagnosis"""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False, slow_mo=1000)
        context = browser.new_context()
        page = context.new_page()

        # Track network
        api_calls = []
        def track_request(request):
            if '/api/auth/login' in request.url:
                api_calls.append({
                    'type': 'request',
                    'url': request.url,
                    'method': request.method,
                    'headers': dict(request.headers),
                    'post_data': request.post_data
                })

        def track_response(response):
            if '/api/auth/login' in response.url:
                api_calls.append({
                    'type': 'response',
                    'url': response.url,
                    'status': response.status,
                    'headers': dict(response.headers),
                    'redirected': response.request.redirected_from is not None
                })

        page.on('request', track_request)
        page.on('response', track_response)

        console_logs = []
        page.on('console', lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

        try:
            print("\n" + "="*70)
            print("🔍 COMPREHENSIVE LOGIN DIAGNOSIS")
            print("="*70)

            # Get user credentials from user
            print("\n📋 Enter the credentials you just created:")
            email = input("Email: ").strip()
            password = input("Password: ").strip()

            print(f"\n✓ Will test with: {email}")

            # Step 1: Navigate to login
            print("\n1️⃣ Navigating to login page...")
            page.goto('https://contract-review-ai.vercel.app/login', wait_until='networkidle')
            print(f"   Current URL: {page.url}")

            if '/login' not in page.url:
                print(f"   ❌ ERROR: Not on login page! Redirected to: {page.url}")
                return

            # Step 2: Fill form
            print("\n2️⃣ Filling login form...")
            page.fill('input[type="email"]', email)
            page.fill('input[type="password"]', password)
            print("   ✓ Form filled")

            # Step 3: Submit and track everything
            print("\n3️⃣ Submitting login form...")

            # Clear tracking
            api_calls.clear()
            console_logs.clear()

            # Get initial cookies
            cookies_before = context.cookies()
            print(f"   Cookies before submit: {len(cookies_before)}")

            # Submit
            page.click('button[type="submit"]')

            # Wait for API call to complete
            page.wait_for_timeout(4000)

            final_url = page.url
            print(f"\n4️⃣ After submit:")
            print(f"   Final URL: {final_url}")

            # Check cookies after
            cookies_after = context.cookies()
            print(f"   Cookies after submit: {len(cookies_after)}")

            new_cookies = [c for c in cookies_after if c not in cookies_before]
            if new_cookies:
                print(f"   New cookies: {len(new_cookies)}")
                for cookie in new_cookies:
                    print(f"      - {cookie['name']}")
            else:
                print("   ⚠️ No new cookies set!")

            # Analyze API calls
            print("\n5️⃣ API Call Analysis:")
            if api_calls:
                for call in api_calls:
                    if call['type'] == 'request':
                        print(f"\n   REQUEST:")
                        print(f"   Method: {call['method']}")
                        print(f"   URL: {call['url']}")
                        if call.get('post_data'):
                            try:
                                data = json.loads(call['post_data'])
                                print(f"   Body: email={data.get('email')}")
                            except:
                                pass

                    elif call['type'] == 'response':
                        print(f"\n   RESPONSE:")
                        print(f"   Status: {call['status']}")
                        print(f"   Location header: {call['headers'].get('location', 'None')}")
                        print(f"   Set-Cookie header: {'Present' if 'set-cookie' in call['headers'] else 'None'}")

                        # Check if this is the redirect response
                        if call['status'] in [301, 302, 303, 307, 308]:
                            print(f"   🎯 SERVER REDIRECT DETECTED!")
                            print(f"   → Redirecting to: {call['headers'].get('location', 'unknown')}")
                        elif call['status'] == 200:
                            print(f"   ⚠️ Got 200 OK (old code - not redirecting)")
                        elif call['status'] == 401:
                            print(f"   ❌ Authentication failed - invalid credentials")
            else:
                print("   ❌ No API calls detected!")

            # Console logs
            print("\n6️⃣ Important Console Logs:")
            important_logs = [log for log in console_logs if any(kw in log.lower()
                for kw in ['login', 'error', 'redirect', 'cookie', 'success'])]
            for log in important_logs:
                print(f"   {log}")

            # Check final state
            print("\n7️⃣ Final State:")
            if '/dashboard' in final_url:
                print("   ✅ SUCCESS! Redirected to dashboard")

                # Check if actually logged in
                page.wait_for_timeout(2000)
                if page.locator('text=/welcome/i').count() > 0:
                    print("   ✅ Dashboard loaded successfully")
                else:
                    print("   ⚠️ On dashboard but content might not be loading")

            elif '/login' in final_url:
                print("   ❌ FAILED: Still on login page")

                # Check for error messages
                error_elem = page.locator('[role="alert"], .text-red-600, .text-destructive')
                if error_elem.count() > 0:
                    error_text = error_elem.first.text_content()
                    print(f"   Error message: {error_text}")
            else:
                print(f"   ⚠️ Unexpected URL: {final_url}")

            print("\n" + "="*70)

            # Keep browser open for inspection
            print("\n🔍 Browser left open for inspection. Press Enter to close...")
            input()

        except Exception as e:
            print(f"\n❌ Error: {str(e)}")
            import traceback
            traceback.print_exc()
            input("\nPress Enter to close...")
        finally:
            browser.close()

if __name__ == '__main__':
    diagnose_login()
