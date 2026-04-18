"""
Comprehensive test for the Arogyam medical document scanner
Tests: chat endpoint, scan endpoint, scheme endpoint
"""
import json
import urllib.request
import sys

def test_chat():
    """Test the chat/symptom analysis endpoint"""
    print("\n" + "="*60)
    print("TEST 1: Chat Endpoint (Symptom Analysis)")
    print("="*60)
    
    payload = {
        'messages': [{'role': 'user', 'content': 'I have a high fever and body aches for 2 days'}],
        'language': 'English',
        'api_key': '',
        'profile': {'name': 'Test User', 'age': '35', 'gender': 'Male'}
    }
    
    body = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        'http://localhost:8000/api/chat',
        data=body,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode('utf-8'))
            if result['success']:
                print("✓ Chat endpoint working!")
                print(f"  Severity: {result['result'].get('severity', 'N/A')}")
                print(f"  Message preview: {result['result'].get('message', '')[:80]}...")
                return True
            else:
                print("✗ Chat endpoint failed:", result.get('detail'))
                return False
    except Exception as e:
        print(f"✗ Chat test error: {e}")
        return False

def test_scan():
    """Test the medical document scanner endpoint"""
    print("\n" + "="*60)
    print("TEST 2: Scan Document Endpoint (Medical Report Reader)")
    print("="*60)
    
    # 1x1 pixel test image
    png_base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    
    payload = {
        'image_data': png_base64,
        'mime_type': 'image/png',
        'language': 'English',
        'api_key': ''
    }
    
    body = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        'http://localhost:8000/api/scan_document',
        data=body,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    
    try:
        print("Calling Gemini Vision API...")
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read().decode('utf-8'))
            if result['success']:
                print("✓ Scan endpoint working!")
                print(f"  Document type: {result['result'].get('document_type', 'N/A')}")
                return True
            else:
                print("✗ Scan endpoint failed:", result.get('detail'))
                return False
    except Exception as e:
        print(f"✗ Scan test error: {e}")
        return False

def test_scheme():
    """Test the government scheme matcher endpoint"""
    print("\n" + "="*60)
    print("TEST 3: Scheme Matcher Endpoint (Government Benefits)")
    print("="*60)
    
    payload = {
        'query': 'diabetes with Below Poverty Line status',
        'demographics': {'age': '45', 'gender': 'Female', 'financial_status': 'BPL'},
        'language': 'English',
        'api_key': ''
    }
    
    body = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(
        'http://localhost:8000/api/match_scheme',
        data=body,
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    
    try:
        print("Matching schemes with RAG database...")
        with urllib.request.urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode('utf-8'))
            if result['success']:
                print("✓ Scheme matcher working!")
                print(f"  Matched scheme: {result['result'].get('matched_scheme', 'N/A')}")
                return True
            else:
                print("✗ Scheme matcher failed:", result.get('detail'))
                return False
    except Exception as e:
        print(f"✗ Scheme test error: {e}")
        return False

def main():
    print("\n🏥 AROGYAM - AI VILLAGE HEALTH ASSISTANT")
    print("Testing all critical endpoints...")
    
    results = []
    results.append(("Chat (Symptom Analysis)", test_chat()))
    results.append(("Scan (Medical Report Reader)", test_scan()))
    results.append(("Scheme (Government Benefits)", test_scheme()))
    
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    passed = sum(1 for _, result in results if result)
    total = len(results)
    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    sys.exit(0 if passed == total else 1)

if __name__ == '__main__':
    main()
