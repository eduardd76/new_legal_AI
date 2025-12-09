import requests
import json

print("\n" + "="*70)
print("🔍 CHECKING LOGIN ISSUE")
print("="*70)

# Test 1: Check if the API is deployed with new code
print("\n1️⃣ Testing API with WRONG credentials (should get 401 JSON)...")
response1 = requests.post(
    "https://contract-review-ai.vercel.app/api/auth/login",
    json={"email": "test@test.com", "password": "wrongpassword"},
    allow_redirects=False
)

print(f"   Status: {response1.status_code}")
print(f"   Content-Type: {response1.headers.get('content-type', 'N/A')}")
print(f"   Location header: {response1.headers.get('location', 'None')}")

if response1.status_code == 401:
    print("   ✅ API returns 401 for wrong credentials (expected)")
    try:
        data = response1.json()
        print(f"   Error message: {data.get('error', 'N/A')}")
    except:
        pass
else:
    print(f"   ⚠️ Unexpected status: {response1.status_code}")

# Test 2: Ask for real credentials to test
print("\n2️⃣ Now let's test with YOUR credentials...")
print("\n   Enter the credentials you created during signup:")
email = input("   Email: ").strip()
password = input("   Password: ").strip()

print(f"\n   Testing login for: {email}")

response2 = requests.post(
    "https://contract-review-ai.vercel.app/api/auth/login",
    json={"email": email, "password": password},
    allow_redirects=False,
    headers={"Content-Type": "application/json"}
)

print(f"\n   Response:")
print(f"   Status: {response2.status_code}")
print(f"   Content-Type: {response2.headers.get('content-type', 'N/A')}")

# Check for redirect
location = response2.headers.get('location', None)
if location:
    print(f"   Location: {location} ✅ REDIRECT!")
else:
    print(f"   Location: None")

# Check for cookies
set_cookie = response2.headers.get('set-cookie', None)
if set_cookie:
    print(f"   Set-Cookie: Present ✅")
    # Count cookies
    cookie_count = len([h for h in response2.headers if h.lower() == 'set-cookie'])
    print(f"   Cookie count: {cookie_count}")
else:
    print(f"   Set-Cookie: None ❌")

print(f"\n   Response Body:")
try:
    data = response2.json()
    print(f"   {json.dumps(data, indent=6)}")
except:
    print(f"   {response2.text[:200]}")

# Analysis
print(f"\n" + "="*70)
print("📊 ANALYSIS:")
print("="*70)

if response2.status_code == 302 or response2.status_code == 307:
    print("✅ SUCCESS! Server is returning a REDIRECT")
    print("   - New code is deployed")
    print("   - Login should work")
    print("   - Cookies are being set")
    if '/dashboard' in location:
        print("   - Redirecting to dashboard ✅")

elif response2.status_code == 401:
    print("❌ AUTHENTICATION FAILED (401)")
    try:
        error_data = response2.json()
        error_msg = error_data.get('error', '').lower()
        print(f"   Error: {error_data.get('error', 'Unknown')}")

        if 'invalid' in error_msg or 'credentials' in error_msg:
            print("\n   Possible reasons:")
            print("   1. Wrong password - double check your password")
            print("   2. User record wasn't created properly during signup")
            print("   3. Password wasn't hashed correctly in database")

            print("\n   🔍 Let's check if user exists in database...")
            print("   Go to Supabase Dashboard → Authentication → Users")
            print(f"   Search for: {email}")
            print("   Check if the user exists there")

        elif 'confirm' in error_msg or 'email' in error_msg:
            print("\n   Email confirmation issue detected!")
            print("   Even though it's disabled, this user might need manual confirmation")
    except:
        pass

elif response2.status_code == 200:
    print("⚠️ GOT 200 OK - OLD CODE STILL DEPLOYED")
    print("   - Vercel deployment hasn't completed yet")
    print("   - Wait a few more minutes and try again")
    print("   - Or check Vercel dashboard for deployment status")

else:
    print(f"⚠️ UNEXPECTED STATUS: {response2.status_code}")
    print(f"   Body: {response2.text[:500]}")

print("="*70)
