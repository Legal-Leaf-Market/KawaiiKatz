"""Mirror pages of a running site into a static dist folder (no JS).
usage: mirror.py <origin> <dist> <paths-file> [--crawl]
Scripts are stripped (the snapshot has no server behind it). /_next/image URLs
are replaced by the original image. Assets referenced by pages and CSS are saved."""
import hashlib, os, re, sys, urllib.request
from urllib.parse import urlparse, parse_qs, unquote
origin, dist, pf = sys.argv[1].rstrip('/'), sys.argv[2], sys.argv[3]
crawl = '--crawl' in sys.argv
MAXP = int(sys.argv[sys.argv.index('--max-p') + 1]) if '--max-p' in sys.argv else 0
np = 0
paths = [l.strip() for l in open(pf) if l.strip()]
SKIP = ('/admin', '/api', '/hub', '/app', '/expense', '/sign', '/live', '/schedule', '/w/', '/login', '/_next/data')
import time
def get(u, tries=3):
    for i in range(tries):
        try:
            with urllib.request.urlopen(origin + u, timeout=60) as r:
                return r.read(), r.headers.get('content-type', '')
        except Exception:
            if i == tries - 1: raise
            time.sleep(1 + 2 * i)
def get_direct(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read(), r.headers.get('content-type', '')
def img(m):
    q = parse_qs(urlparse(m.replace('&amp;', '&')).query).get('url', [''])[0]
    return q
saved = {}
EXT = {'image/webp': '.webp', 'image/png': '.png', 'image/jpeg': '.jpg', 'image/svg+xml': '.svg', 'image/avif': '.avif', 'image/gif': '.gif'}
def save(u):
    u = u.split('#')[0].replace('&amp;', '&')
    if not u.startswith('/api/img'): u = u.split('?')[0]
    if u in saved: return saved[u]
    if not u.startswith('/') or u.startswith('//'): return None
    saved[u] = None
    q = parse_qs(urlparse(u).query).get('u', [''])[0] if u.startswith('/api/img') else ''
    data = None
    if q.startswith('http'):
        # The image itself, straight from its CDN: fast and proven, where the
        # local proxy under `next start` dropped whole stores.
        if 'cdn.shopify' in q: q += ('&' if '?' in q else '?') + 'width=600'
        try: data, ct = get_direct(q)
        except Exception: data = None
    if data is None:
        try: data, ct = get(u, tries=1 if q else 3)
        except Exception: return None
    rel = unquote(u).lstrip('/')
    if '?' in u: rel = 'x/' + hashlib.sha1(u.encode()).hexdigest()[:16] + EXT.get(ct.split(';')[0], '.bin')
    saved[u] = '/' + rel
    dst = os.path.join(dist, rel); os.makedirs(os.path.dirname(dst), exist_ok=True)
    if u.endswith('.css'):
        s = data.decode('utf-8', 'replace')
        for v in re.findall(r'url\(["\']?([^)"\']+)', s):
            if v.startswith(('data:', 'http', '#')): continue
            if not v.startswith('/'): v = os.path.normpath(os.path.join(os.path.dirname(u), v))
            save(v)
    open(dst, 'wb').write(data)
    return saved[u]
def resolve_stream(s):
    for _ in range(50):
        m = re.search(r'<div hidden id="S:(\d+)">', s)
        if not m: break
        n = m[1]; start = m.start(); i = m.end(); depth = 1
        for t in re.finditer(r'<div\b|</div>', s[i:]):
            depth += 1 if t[0] == '<div' else -1
            if depth == 0: end = i + t.start(); close = i + t.end(); break
        else: break
        content = s[i:end]
        s = s[:start] + s[close:]
        b = s.find(f'<template id="B:{n}"></template>')
        if b < 0: continue
        e = s.find('<!--/$-->', b)
        if e < 0: continue
        s = s[:b] + content + s[e:]
    return s
seen = set(); queue = list(paths)
while queue:
    if len(seen) % 50 == 0: print('...', len(seen), 'pages', flush=True)
    p = queue.pop(0)
    if p in seen: continue
    seen.add(p)
    try: data, ct = get(p)
    except Exception as e: print('skip', p, e); continue
    if 'html' not in ct: continue
    s = data.decode('utf-8')
    s = resolve_stream(s)
    s = re.sub(r'<script\b(?![^>]*application/ld\+json)[^>]*>.*?</script>', '', s, flags=re.S)
    s = re.sub(r'<link[^>]*as="script"[^>]*>', '', s)
    s = re.sub(r'/_next/image\?url=[^"\s,]+', lambda m: img(m[0]), s)
    s = re.sub(r'\s(srcset|imagesrcset)="([^"]*)"', '', s, flags=re.I)
    def apiimg(m):
        r = save(m[2])
        return f' {m[1]}="{r}"' if r else m[0]
    s = re.sub(r'\s(src|poster)="(/api/img\?[^"]*)"', apiimg, s)
    for u in re.findall(r'\s(?:src|href|poster)="(/[^"]*)"', s):
        base = u.split('#')[0].split('?')[0]
        if os.path.splitext(base)[1]: save(base)
        elif crawl and not base.startswith(SKIP) and base not in seen and base.rstrip('/') not in queue:
            if base.startswith('/p/'):
                if np >= MAXP: continue
                np += 1
            queue.append(base if base == '/' else base.rstrip('/'))
    for u in re.findall(r'url\((?:&quot;|["\'])?(/[^)"\'&]+)', s): save(u)
    out = os.path.join(dist, p.strip('/'), 'index.html') if p != '/' else os.path.join(dist, 'index.html')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'w', encoding='utf-8').write(s)
print('pages', len(seen), 'assets', len(saved))
