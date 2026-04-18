import json
import urllib.request
import time

# More realistic test image (a simple prescription/medical document simulation)
# Using a larger, real test image would be better, but for now use a valid PNG

png_base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='

payload = {
    'image_data': png_base64,
    'mime_type': 'image/png',
    'language': 'English',
    'api_key': ''
}

print("Sending request to scan_document endpoint...")
print(f"Image size: {len(png_base64)} bytes")

body = json.dumps(payload).encode('utf-8')
req = urllib.request.Request(
    'http://localhost:8000/api/scan_document',
    data=body,
    headers={'Content-Type': 'application/json'},
    method='POST'
)

start = time.time()
try:
    print("Waiting for response (this may take 10-30 seconds for Gemini API)...")
    with urllib.request.urlopen(req, timeout=60) as resp:
        elapsed = time.time() - start
        result = json.loads(resp.read().decode('utf-8'))
        print(f"\nSUCCESS (took {elapsed:.1f}s):")
        print(json.dumps(result, indent=2)[:500])
except Exception as e:
    elapsed = time.time() - start
    print(f"\nERROR (after {elapsed:.1f}s): {type(e).__name__}")
    print(str(e)[:300])
    if hasattr(e, 'read'):
        try:
            err = e.read().decode('utf-8', errors='replace')
            print("Response:", err[:500])
        except:
            pass
