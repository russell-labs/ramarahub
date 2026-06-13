#!/usr/bin/env python3
"""Incremental news refresher for Ramara Hub.
Fetches the ramara.ca sitemap, finds /news/posts/ URLs not already in the documents
table, ingests only the new ones. Fast (touches only new posts). Safe to run on a
schedule. Run: python3 refresh_news.py
"""
import re, time, json, html, sys
import urllib.request, urllib.parse

SB_REST = "https://pchdckgdrigevxfjwgom.supabase.co/rest/v1/documents"
SB_KEY = "sb_publishable_-4wN6ifFXmn10ZAwqwN_Nw_0TvL_usD"
UA = "RamaraHub-Indexer/1.0 (community archive of public township pages; russellcolevop@gmail.com)"

def fetch(url, timeout=25):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "ignore")

def strip_html(s):
    m = re.search(r"<main[^>]*>(.*?)</main>", s, re.S | re.I)
    if m: s = m.group(1)
    s = re.sub(r"<script.*?</script>", " ", s, flags=re.S | re.I)
    s = re.sub(r"<style.*?</style>", " ", s, flags=re.S | re.I)
    s = re.sub(r"<nav.*?</nav>", " ", s, flags=re.S | re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", html.unescape(s)).strip()

def title_of(page):
    m = re.search(r"<title>(.*?)</title>", page, re.S | re.I)
    return html.unescape(m.group(1)).strip()[:300] if m else "Untitled"

def date_of(page):
    m = re.search(r'"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})', page) or re.search(r"(\d{4}-\d{2}-\d{2})", page)
    return m.group(1) if m else None

def existing_urls():
    req = urllib.request.Request(SB_REST + "?select=source_url&limit=5000",
        headers={"User-Agent": UA, "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY})
    with urllib.request.urlopen(req, timeout=30) as r:
        return {row["source_url"] for row in json.loads(r.read())}

def main():
    # Read-only: finds new /news/posts/ not yet in the documents table, fetches them,
    # and prints them as a JSON array on stdout. The caller (a scheduled Claude task with
    # the Supabase admin connector) inserts them via execute_sql — the public key cannot write.
    sitemap = fetch("https://www.ramara.ca/sitemap-xml/")
    news = [u for u in re.findall(r"<loc>(.*?)</loc>", sitemap) if "/news/posts/" in u]
    have = existing_urls()
    new = [u for u in news if u not in have]
    print(f"# {len(news)} news posts in sitemap, {len(new)} new", file=sys.stderr)
    out = []
    for u in new:
        try:
            page = fetch(u)
            body = strip_html(page)
            if len(body) > 120:
                out.append({"doc_type": "news", "title": title_of(page),
                            "source_url": u, "doc_date": date_of(page), "body": body[:200000]})
        except Exception as e:
            print(f"# fail {u}: {e}", file=sys.stderr)
        time.sleep(0.4)
    print(json.dumps(out))

if __name__ == "__main__":
    main()
