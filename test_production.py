from playwright.sync_api import sync_playwright

def test_production_signin():
    """Test the production sign-in flow"""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()

        console_messages = []
        page.on("console", lambda msg: console_messages.append(f"[{msg.type}] {msg.text}"))

        errors = []
        page.on("pageerror", lambda err: errors.append(str(err)))

        try:
            print("\n🔍 TESTING PRODUCTION APP")
            print("=" * 60)
            print("\nURL: https://contract-review-ai.vercel.app")

            print("\n1. Loading home page...")
            response = page.goto('https://contract-review-ai.vercel.app', wait_until='networkidle', timeout=30000)

            print(f"   Status: {response.status if response else 'N/A'}")
            print(f"   Final URL: {page.url}")

            page.screenshot(path='prod_1_homepage.png', full_page=True)

            # Check for sign-in links
            signin_links = page.locator('a[href="/login"], button:has-text("Sign In")').all()
            print(f"   Sign-in elements found: {len(signin_links)}")

            if '/dashboard' in page.url:
                print("\n   ❌ ISSUE: Redirected to dashboard without login!")
                print("   Home page should show sign-in links, not redirect.")
            elif '/login' in page.url:
                print("\n   ⚠️ Redirected to /login (might be expected)")
            else:
                print("\n   ✓ On home page")

            # Try to navigate to login directly
            print("\n2. Navigating to /login directly...")
            page.goto('https://contract-review-ai.vercel.app/login', wait_until='networkidle')
            print(f"   Final URL: {page.url}")
            page.screenshot(path='prod_2_login_page.png', full_page=True)

            if '/dashboard' in page.url:
                print("   ❌ ISSUE: Can't access login page, redirects to dashboard!")
            else:
                print("   ✓ Can access login page")

                # Check for login form
                email_input = page.locator('input[type="email"]')
                password_input = page.locator('input[type="password"]')
                submit_button = page.locator('button[type="submit"]')

                print(f"\n3. Login form check:")
                print(f"   Email input: {'✓' if email_input.count() > 0 else '✗'}")
                print(f"   Password input: {'✓' if password_input.count() > 0 else '✗'}")
                print(f"   Submit button: {'✓' if submit_button.count() > 0 else '✗'}")

                if email_input.count() > 0:
                    print("\n4. Testing form interaction...")
                    email_input.fill('test@example.com')
                    password_input.fill('testpassword')
                    page.screenshot(path='prod_3_filled_form.png')

                    submit_button.click()
                    page.wait_for_timeout(3000)

                    print(f"   URL after submit: {page.url}")
                    page.screenshot(path='prod_4_after_submit.png', full_page=True)

            # Print any JavaScript errors
            if errors:
                print("\n📛 JavaScript Errors:")
                for err in errors:
                    print(f"   {err}")

            # Print relevant console logs
            print("\n📋 Console logs:")
            for msg in console_messages[:20]:  # First 20
                print(f"   {msg}")

            print("\n" + "=" * 60)
            print("✅ Production test completed")
            print("=" * 60)

        except Exception as e:
            print(f"\n❌ Error: {str(e)}")
            page.screenshot(path='prod_error.png', full_page=True)
            import traceback
            traceback.print_exc()
        finally:
            browser.close()

if __name__ == '__main__':
    test_production_signin()
