#!/usr/bin/env python3
"""Ramara Hub corpus ingester — ramara.ca only (robots.txt allows; CivicWeb does not).
Crawls the sitemap, extracts page text + linked ramara.ca PDFs, loads into Supabase documents table.
Run: python3 ingest_ramara_ca.py  (logs to stdout)"""
import re, time, json, html, sys, io
import urllib.request, urllib.parse

SB_URL = "https://pchdckgdrigevxfjwgom.supabase.co/rest/v1/documents"
SB_KEY = "sb_publishable_-4wN6ifFXmn10ZAwqwN_Nw_0TvL_usD"
UA = "RamaraHub-Indexer/1.0 (community archive of public township pages; russellcolevop@gmail.com)"
THROTTLE = 0.6
SKIP = ("/search", "/templates", "/subscribe", "/privacy-policy", "/sitemap", "/news/rss")

def fetch(url, binary=False, timeout=25):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = r.read()
    return data if binary else data.decode("utf-8", "ignore")

def strip_html(s):
    # main content if present
    m = re.search(r"<main[^>]*>(.*?)</main>", s, re.S | re.I)
    if m: s = m.group(1)
    s = re.sub(r"<script.*?</script>", " ", s, flags=re.S | re.I)
    s = re.sub(r"<style.*?</style>", " ", s, flags=re.S | re.I)
    s = re.sub(r"<nav.*?</nav>", " ", s, flags=re.S | re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    s = html.unescape(s)
    return re.sub(r"\s+", " ", s).strip()

def title_of(page):
    m = re.search(r"<title>(.*?)</title>", page, re.S | re.I)
    return html.unescape(m.group(1)).strip()[:300] if m else "Untitled"

def pdf_text(data):
    import pdfplumber
    out = []
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for p in pdf.pages[:120]:
            t = p.extract_text() or ""
            out.append(t)
    return "\n".join(out)

def classify(url, title):
    t = (url + " " + title).lower()
    if "bylaw" in t or "by-law" in t: return "bylaw"
    if "minutes" in t: return "minutes"
    if "agenda" in t: return "agenda"
    if "/news/" in url: return "news"
    if "report" in t or "study" in t or "plan" in t: return "staff-report"
    return "other"

def date_of(page):
    m = re.search(r'"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})', page) or \
        re.search(r"(\d{4}-\d{2}-\d{2})", page)
    return m.group(1) if m else None

def upsert(rows):
    if not rows: return True
    req = urllib.request.Request(
        SB_URL + "?on_conflict=source_url",
        data=json.dumps(rows).encode(),
        headers={"User-Agent": UA, "Content-Type": "application/json",
                 "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY,
                 "Prefer": "resolution=ignore-duplicates,return=minimal"},
        method="POST")
    try:
        urllib.request.urlopen(req, timeout=30)
        return True
    except Exception as e:
        print("UPSERT FAIL:", e, file=sys.stderr); return False

def main():
    # Chunked + resumable: ingest_ramara_ca.py <start> <count>  (pages phase)
    #                      ingest_ramara_ca.py pdfs <start> <count>  (pdf phase, reads /tmp/pdf_urls.txt)
    args = sys.argv[1:]
    sitemap = fetch("https://www.ramara.ca/sitemap-xml/")
    all_urls = [u for u in re.findall(r"<loc>(.*?)</loc>", sitemap)
                if not any(k in u for k in SKIP)]
    if args and args[0] == "pdfs":
        run_pdfs(int(args[1]), int(args[2])); return
    start = int(args[0]) if args else 0
    count = int(args[1]) if len(args) > 1 else 30
    urls = all_urls[start:start + count]
    print(f"pages {start}..{start+len(urls)} of {len(all_urls)}", flush=True)
    pdf_urls, batch, done, fails = set(), [], 0, 0
    for u in urls:
        try:
            page = fetch(u)
            body = strip_html(page)
            if len(body) > 250:
                batch.append({"doc_type": classify(u, title_of(page)), "title": title_of(page),
                              "source_url": u, "doc_date": date_of(page), "body": body[:200000]})
            for link in re.findall(r'href="([^"]+\.pdf)"', page, re.I):
                full = urllib.parse.urljoin(u, link)
                if "ramara.ca" in urllib.parse.urlparse(full).netloc:
                    pdf_urls.add(full.split("?")[0])
            done += 1
        except Exception as e:
            fails += 1; print(f"page fail {u}: {e}", flush=True)
        if len(batch) >= 20:
            upsert(batch); batch = []
            print(f"pages {done}/{len(urls)} | pdfs found {len(pdf_urls)}", flush=True)
        time.sleep(THROTTLE)
    upsert(batch); batch = []
    # append discovered pdfs to the shared queue file
    try:
        existing = set(open("/tmp/pdf_urls.txt").read().split())
    except FileNotFoundError:
        existing = set()
    with open("/tmp/pdf_urls.txt", "w") as f:
        f.write("\n".join(sorted(existing | pdf_urls)))
    print(f"CHUNK DONE: {done} ok, {fails} failed. PDF queue now: {len(existing | pdf_urls)}", flush=True)

def run_pdfs(start, count):
    pdf_all = sorted(set(open("/tmp/pdf_urls.txt").read().split()))
    todo = pdf_all[start:start + count]
    print(f"pdfs {start}..{start+len(todo)} of {len(pdf_all)}", flush=True)
    batch, pdone, pfails = [], 0, 0
    for u in todo:
        try:
            data = fetch(u, binary=True)
            if len(data) > 25_000_000: raise ValueError("too large")
            text = pdf_text(data)
            if len(text.strip()) > 200:
                name = urllib.parse.unquote(u.split("/")[-1]).replace("-", " ").replace(".pdf", "")
                batch.append({"doc_type": classify(u, name), "title": name[:300],
                              "source_url": u, "doc_date": None, "body": text[:200000]})
            pdone += 1
        except Exception as e:
            pfails += 1; print(f"pdf fail {u}: {e}", flush=True)
        if len(batch) >= 5:
            upsert(batch); batch = []
        time.sleep(THROTTLE)
    upsert(batch)
    print(f"PDF CHUNK DONE: ok {pdone}, failed {pfails}", flush=True)

if __name__ == "__main__":
    main()
