"""Live source-linked headlines, cached at the edge for the Tangerine preview.

No invented summary, no user-supplied fetch URL, no third-party article text.
Feeds are downloaded concurrently and subject to a hard five-second timeout.
"""
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler
from pathlib import Path
import json
import sys
import urllib.request

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from media.live.aggregate import SOURCES, parse_feed, rank_and_select  # noqa: E402


def collect():
    now = datetime.now(timezone.utc)
    candidates = []
    successes = 0

    def read(source):
        request = urllib.request.Request(source["url"], headers={
            "User-Agent": "Mozilla/5.0 (compatible; TangerineLive/1.0; +https://github.com/colemanvii/tangerine)",
            "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
        })
        with urllib.request.urlopen(request, timeout=5) as response:
            body = response.read(1_500_001)
        if len(body) > 1_500_000:
            raise ValueError("oversized feed")
        return parse_feed(body, source, now)

    # Each source is bounded; a slow provider does not block the entire edition.
    with ThreadPoolExecutor(max_workers=len(SOURCES)) as executor:
        futures = {executor.submit(read, src): src for src in SOURCES}
        for future in as_completed(futures):
            try:
                candidates.extend(future.result())
                successes += 1
            except Exception:
                # Unavailable sources are ignored; lack of coverage is reported.
                continue

    stories = rank_and_select(candidates)
    if successes < 2 or len(stories) < 5:
        return None
    return {
        "generated_at": now.isoformat(timespec="seconds").replace("+00:00", "Z"),
        "window_hours": 72,
        "source_count": successes,
        "story_count": len(stories),
        "mode": "automated_source_index",
        "stories": stories,
    }


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.split("?", 1)[0] != "/api/headlines":
            self.send_error(404)
            return
        try:
            result = collect()
        except Exception:
            result = None
        ok = result is not None
        payload = json.dumps(result if ok else {
            "error": "insufficient_sources",
            "message": "Not enough current publisher feeds are available",
            "stories": []
        }, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self.send_response(200 if ok else 503)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", (
            "public, max-age=0, s-maxage=600, stale-while-revalidate=1800"
            if ok else "public, max-age=0, s-maxage=30"
        ))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(payload)
