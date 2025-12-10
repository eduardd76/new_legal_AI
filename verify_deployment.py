import requests

print("\n🔍 Verifying deployment fix...\n")

# Test the login API endpoint
url = "https://contract-review-ai.vercel.app/api/auth/login"
payload = {"email": "test@example.com", "password": "test123"}

print(f"Testing: POST {url}")
print(f"Payload: {payload}\n")

response = requests.post(
    url,
    json=payload,
    allow_redirects=False,  # Don't follow redirects automatically
    headers={"Content-Type": "application/json"}
)

print(f"Status Code: {response.status_code}")
print(f"Headers:")
for key, value in response.headers.items():
    if key.lower() in ['location', 'set-cookie', 'content-type']:
        print(f"  {key}: {value}")

print(f"\nResponse Body: {response.text[:200]}")

if response.status_code == 302 or response.status_code == 307:
    print("\n✅ SUCCESS! Server is now returning a REDIRECT response!")
    print(f"   Redirect to: {response.headers.get('location', 'N/A')}")
    print("\n   This means the fix has been deployed! 🎉")
elif response.status_code == 401:
    print("\n✅ Got expected 401 (invalid credentials)")
    if 'application/json' in response.headers.get('content-type', ''):
        print("   ⚠️ Still returning JSON (old code)")
        print("   Deployment might not be complete yet, wait a bit longer")
    else:
        print("   Check response body for details")
elif response.status_code == 200:
    print("\n❌ Got 200 OK with JSON (OLD CODE still deployed)")
    print("   Vercel deployment hasn't completed yet")
else:
    print(f"\n⚠️ Unexpected status code: {response.status_code}")

print("\n" + "="*60)
