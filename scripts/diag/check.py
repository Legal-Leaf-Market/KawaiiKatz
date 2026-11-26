# Fetches each image URL directly and through Shopify's resize param, printing status.
import time, urllib.request, sys
for url in open('scripts/diag/urls.txt').read().split():
    for variant in (url, url + ('&' if '?' in url else '?') + 'width=400'):
        t = time.time()
        try:
            req = urllib.request.Request(variant, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept': 'image/avif,image/webp,image/*,*/*;q=0.8'})
            with urllib.request.urlopen(req, timeout=20) as r:
                b = r.read()
                print('OK', r.status, r.headers.get('content-type'), len(b), f'{time.time()-t:.1f}s', r.geturl()[:110] if r.geturl() != variant else '', variant[:120])
        except Exception as e:
            print('ERR', type(e).__name__, str(e)[:80], f'{time.time()-t:.1f}s', variant[:120])
# run 2
