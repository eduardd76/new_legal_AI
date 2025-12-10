import requests
import json

print("\n" + "="*70)
print("🔍 SIMPLE LOGIN TEST")
print("="*70)

# Get credentials
print("\nEnter the credentials you just created:")
email = input("Email: ").strip()
password = input("Password: ").strip()

# Test login
print(f"\n📤 Testing login for: {email}")
url = "https://contract-review-ai.vercel.app/api/auth/login"

response = requests.post(
    url,
    json={"email": email, "password": password},
    allow_redirects=False,  # Don't follow redirects
    headers={"Content-Type": "application/json"}
)

print(f"\n📥 Response:")
print(f"   Status: {response.status_code}")
print(f"   Headers:")

# Check important headers
if 'location' in response.headers:
    print(f"      Location: {response.headers['location']} ← REDIRECT!")
else:
    print(f"      Location: None")

if 'set-cookie' in response.headers:
    print(f"      Set-Cookie: Present ✓")
else:
    print(f"      Set-Cookie: None ✗")

print(f"      Content-Type: {response.headers.get('content-type', 'None')}")

# Check response body
print(f"\n   Response Body:")
try:
    data = response.json()
    print(f"      {json.dumps(data, indent=2)}")

    if 'error' in data:
        error_msg = data['error'].lower()
        print(f"\n🔍 Error Analysis:")

        if 'email not confirmed' in error_msg or 'confirm' in error_msg:
            print("   ❌ EMAIL NOT CONFIRMED!")
            print("   ")
            print("   Solution:")
            print("   1. Check your email inbox for confirmation link")
            print("   2. OR disable email confirmation in Supabase:")
            print("      - Go to Supabase Dashboard")
            print("      - Settings → Authentication")
            print("      - Turn OFF 'Enable email confirmations'")
            print("      - Click Save")
        elif 'invalid' in error_msg or 'credentials' in error_msg:
            print("   ❌ INVALID CREDENTIALS - Wrong email or password")
        else:
            print(f"   ❌ {data['error']}")

except Exception as e:
    print(f"      {response.text[:200]}")

# Conclusion
print(f"\n" + "="*70)
if response.status_code in [301, 302, 303, 307, 308]:
    print("✅ SUCCESS! Server is redirecting (new code deployed)")
    print(f"   Redirect to: {response.headers.get('location')}")
elif response.status_code == 401:
    print("⚠️ AUTHENTICATION FAILED")
    print("   Check the error analysis above")
elif response.status_code == 200:
    print("⚠️ Got 200 OK - Old code still deployed (should be redirect)")
else:
    print(f"⚠️ Unexpected status: {response.status_code}")

print("="*70 + "\n")
