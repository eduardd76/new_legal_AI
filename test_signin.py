from playwright.sync_api import sync_playwright
import sys

def test_signin():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)  # Set to False to see what's happening
        page = browser.new_page()

        # Capture console messages
        console_messages = []
        page.on("console", lambda msg: console_messages.append(f"[{msg.type}] {msg.text}"))

        # Capture network errors
        page.on("requestfailed", lambda request: print(f"❌ Request failed: {request.url} - {request.failure}"))

        try:
            print("🔍 Navigating to home page...")
            page.goto('http://localhost:3000', wait_until='networkidle', timeout=30000)

            print("📸 Taking screenshot of home page...")
            page.screenshot(path='home_page.png', full_page=True)

            # Check if we're on the login page or home page
            current_url = page.url
            print(f"📍 Current URL: {current_url}")

            # Look for sign-in button or form
            print("\n🔍 Looking for sign-in elements...")

            # Try to find login link/button on main page
            login_buttons = page.locator('text=/sign.*in/i').all()
            print(f"Found {len(login_buttons)} elements with 'sign in' text")

            # Try to find login/email input
            email_inputs = page.locator('input[type="email"]').all()
            password_inputs = page.locator('input[type="password"]').all()
            print(f"Found {len(email_inputs)} email inputs, {len(password_inputs)} password inputs")

            # If we're not on login page, try to navigate there
            if '/login' not in current_url:
                print("\n🔗 Attempting to navigate to login page...")

                # Try clicking login link
                if len(login_buttons) > 0:
                    print("Clicking sign-in button...")
                    login_buttons[0].click()
                    page.wait_for_load_state('networkidle')
                else:
                    # Navigate directly
                    print("Navigating directly to /login...")
                    page.goto('http://localhost:3000/login', wait_until='networkidle')

                print("📸 Taking screenshot of login page...")
                page.screenshot(path='login_page.png', full_page=True)
                print(f"📍 Current URL: {page.url}")

            # Now try to sign in with test credentials
            print("\n🔐 Attempting to sign in...")

            email_input = page.locator('input[type="email"]').first
            password_input = page.locator('input[type="password"]').first

            if email_input.count() > 0 and password_input.count() > 0:
                print("Filling in credentials...")
                email_input.fill('test@example.com')
                password_input.fill('testpassword123')

                print("📸 Taking screenshot before submit...")
                page.screenshot(path='before_submit.png', full_page=True)

                # Find and click submit button
                submit_buttons = page.locator('button[type="submit"]').all()
                if len(submit_buttons) > 0:
                    print("Clicking submit button...")
                    submit_buttons[0].click()

                    # Wait a bit for the response
                    page.wait_for_timeout(3000)

                    print("📸 Taking screenshot after submit...")
                    page.screenshot(path='after_submit.png', full_page=True)
                    print(f"📍 Current URL after submit: {page.url}")
                else:
                    print("❌ No submit button found!")
            else:
                print("❌ Login form not found!")

            # Print all console messages
            print("\n📋 Console messages:")
            for msg in console_messages:
                print(f"  {msg}")

            # Get page content for debugging
            print("\n📄 Page HTML (first 1000 chars):")
            content = page.content()
            print(content[:1000])

            print("\n✅ Test completed. Check screenshots for details.")

        except Exception as e:
            print(f"\n❌ Error during test: {str(e)}")
            page.screenshot(path='error_screenshot.png', full_page=True)
            raise
        finally:
            browser.close()

if __name__ == '__main__':
    test_signin()
