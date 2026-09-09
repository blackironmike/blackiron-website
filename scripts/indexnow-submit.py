#!/usr/bin/env python3
"""Submit blackironathletics.com URLs to IndexNow (Bing, plus every
engine on the IndexNow network) for instant index notification.

Usage:
  python scripts/indexnow-submit.py                # new/changed sitemap URLs
  python scripts/indexnow-submit.py --all          # force full sitemap submit
  python scripts/indexnow-submit.py URL [URL ...]  # submit specific URLs

Run after any deploy that adds or meaningfully changes pages (a new
blog post, mostly). The IndexNow FAQ asks that you submit on publish
or change, not on a schedule, and warns against resubmitting
unchanged URLs, so the no-argument form is diff-aware.

The key lives in the <key>.txt file at the repo root, which Vercel
serves at the site root. Same setup as the Every Dad Carry repo.
"""

import glob
import io
import json
import os
import re
import sys
import urllib.request

HOST = "www.blackironathletics.com"
ENDPOINT = "https://api.indexnow.org/indexnow"
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATE_PATH = os.path.join(REPO, "scripts", ".indexnow-submitted.json")


def find_key():
    for path in glob.glob(os.path.join(REPO, "*.txt")):
        name = os.path.splitext(os.path.basename(path))[0]
        if re.fullmatch(r"[0-9a-f]{32,128}", name):
            return io.open(path, encoding="utf-8").read().strip()
    raise SystemExit("no IndexNow key file (<hex key>.txt) found at repo root")


def sitemap_entries():
    """URL -> lastmod from the live sitemap."""
    with urllib.request.urlopen(f"https://{HOST}/sitemap.xml", timeout=30) as r:
        xml = r.read().decode("utf-8")
    entries = {}
    for block in re.findall(r"<url>(.*?)</url>", xml, re.S):
        loc = re.search(r"<loc>([^<]+)</loc>", block)
        mod = re.search(r"<lastmod>([^<]+)</lastmod>", block)
        if loc:
            entries[loc.group(1)] = mod.group(1) if mod else ""
    return entries


def main():
    key = find_key()
    force_all = "--all" in sys.argv[1:]
    args = [a for a in sys.argv[1:] if a != "--all"]
    if args:
        urls = [u for u in args if "blackironathletics.com" in u]
    elif force_all:
        urls = list(sitemap_entries())
    else:
        entries = sitemap_entries()
        try:
            prev = json.load(io.open(STATE_PATH, encoding="utf-8"))
        except Exception:
            prev = {}
        urls = [u for u, mod in entries.items() if prev.get(u) != mod]
        if urls:
            json.dump(entries, io.open(STATE_PATH, "w", encoding="utf-8"), indent=1)
    if not urls:
        print("nothing new or changed since last submission")
        return 0

    payload = {
        "host": HOST,
        "key": key,
        "keyLocation": f"https://{HOST}/{key}.txt",
        "urlList": urls,
    }
    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        print(f"IndexNow: HTTP {r.status} for {len(urls)} URL(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
