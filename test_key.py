import urllib.request, urllib.error, json, time

key = 'AIzaSyA1hDuyTnK3cfr_VmHf7UJHXcwqpfuzL4I'

for model in ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-2.5-flash']:
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}'
    payload = {'contents': [{'role': 'user', 'parts': [{'text': 'Say: working'}]}]}
    body = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=body, headers={'Content-Type': 'application/json'}, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            result = json.loads(r.read().decode())
            text = result['candidates'][0]['content']['parts'][0]['text']
            print(f'OK  {model}: {text.strip()[:40]}')
    except urllib.error.HTTPError as e:
        err = json.loads(e.read().decode())
        msg = err.get('error', {}).get('message', '')[:80]
        print(f'ERR {model}: HTTP {e.code} - {msg}')
    time.sleep(1)
