#!/usr/bin/env python3
"""Tangerine Live V1: source-linked RSS aggregation. No generative assertions."""
from __future__ import annotations

import hashlib
import html
import json
import re
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "stories.json"
HOURS = 72
MAX_STORIES = 28

# RSS headlines/link-only publication; confirm syndication rights before commercial launch.
# No article bodies, imagery, descriptions, or AI training data are ingested.
SOURCES = [
    {"name": "BBC News", "category": "World", "url": "https://feeds.bbci.co.uk/news/world/rss.xml", "hosts": ("bbc.com", "bbc.co.uk")},
    {"name": "Al Jazeera", "category": "World", "url": "https://www.aljazeera.com/xml/rss/all.xml", "hosts": ("aljazeera.com",)},
    {"name": "The Guardian", "category": "World", "url": "https://www.theguardian.com/world/rss", "hosts": ("theguardian.com",)},
    {"name": "BBC News", "category": "Business", "url": "https://feeds.bbci.co.uk/news/business/rss.xml", "hosts": ("bbc.com", "bbc.co.uk")},
    {"name": "BBC News", "category": "Technology", "url": "https://feeds.bbci.co.uk/news/technology/rss.xml", "hosts": ("bbc.com", "bbc.co.uk")},
    {"name": "Ars Technica", "category": "Technology", "url": "https://feeds.arstechnica.com/arstechnica/index", "hosts": ("arstechnica.com",)},
    {"name": "BBC News", "category": "Science", "url": "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml", "hosts": ("bbc.com", "bbc.co.uk")},
    {"name": "NASA", "category": "Science", "url": "https://www.nasa.gov/news-release/feed/", "hosts": ("nasa.gov",)},
    {"name": "MIT News", "category": "Science", "url": "https://news.mit.edu/rss/feed", "hosts": ("mit.edu",)},
    {"name": "BBC News", "category": "Culture", "url": "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml", "hosts": ("bbc.com", "bbc.co.uk")},
    {"name": "The Guardian", "category": "Culture", "url": "https://www.theguardian.com/culture/rss", "hosts": ("theguardian.com",)},
]
CATEGORIES = ("World", "Business", "Technology", "Science", "Culture")
ATOM = "{http://www.w3.org/2005/Atom}"


def clean_title(value: str) -> str:
    return " ".join(html.unescape(re.sub(r"<[^>]*>", " ", value or "")).split())[:240]


def safe_url(raw: str, hosts: tuple[str, ...]) -> str | None:
    try:
        parsed = urlsplit(html.unescape(raw.strip()))
        host = (parsed.hostname or "").lower()
        if parsed.scheme != "https" or parsed.username or parsed.password:
            return None
        if not any(host == allowed or host.endswith("." + allowed) for allowed in hosts):
            return None
        query = urlencode(
            [(k, v) for k, v in parse_qsl(parsed.query, keep_blank_values=True)
             if not (k.lower().startswith("utm_") or k.lower() in {"fbclid", "gclid"})]
        )
        return urlunsplit(("https", parsed.netloc.lower(), parsed.path or "/", query, ""))
    except ValueError:
        return None


def date_from(raw: str) -> datetime | None:
    if not raw:
        return None
    try:
        parsed = parsedate_to_datetime(raw)
    except (TypeError, ValueError, IndexError):
        try:
            parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except ValueError:
            return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def element_text(node: ET.Element | None) -> str:
    return "".join(node.itertext()) if node is not None else ""


def parse_feed(data: bytes, source: dict, now: datetime) -> list[dict]:
    root = ET.fromstring(data)
    atom = root.tag == ATOM + "feed"
    entries = root.findall(ATOM + "entry") if atom else root.findall("./channel/item")
    result = []
    for node in entries[:60]:
        title_node = node.find(ATOM + "title" if atom else "title")
        title = clean_title(element_text(title_node))
        if atom:
            links = node.findall(ATOM + "link")
            link = next((x.get("href", "") for x in links if x.get("rel", "alternate") == "alternate"), "")
            raw_date = element_text(node.find(ATOM + "published")) or element_text(node.find(ATOM + "updated"))
        else:
            link = element_text(node.find("link"))
            raw_date = element_text(node.find("pubDate")) or element_text(node.find("{http://purl.org/dc/elements/1.1/}date"))
        url = safe_url(link, source["hosts"])
        published = date_from(raw_date)
        if not title or len(title) < 16 or not url or not published:
            continue
        age = (now - published).total_seconds() / 3600
        if age < -0.25 or age > HOURS:
            continue
        key = re.sub(r"[^a-z0-9]+", " ", title.lower()).strip()
        if not key:
            continue
        result.append({
            "id": hashlib.sha256((source["name"] + "|" + url).encode()).hexdigest()[:16],
            "title": title,
            "url": url,
            "source": source["name"],
            "category": source["category"],
            "published_at": published.isoformat(timespec="seconds").replace("+00:00", "Z"),
            "_key": key,
            "_age": age,
        })
    return result


def rank_and_select(items: list[dict]) -> list[dict]:
    """Freshness ranking with source/category caps; never imply factual verification."""
    # Use the best (newest) instance of identical headlines and linked URLs.
    unique = {}
    for item in items:
        token = item["_key"]
        for key in (token, item["url"]):
            old = unique.get(key)
            if old is None or item["_age"] < old["_age"]:
                unique[key] = item
    ordered = sorted({x["id"]: x for x in unique.values()}.values(),
                     key=lambda s: (s["_age"], s["title"].lower()))
    chosen, publisher_counts, category_counts, keys, urls = [], {}, {}, set(), set()

    def accept(item):
        if item["_key"] in keys or item["url"] in urls:
            return False
        if publisher_counts.get(item["source"], 0) >= 7:
            return False
        if category_counts.get(item["category"], 0) >= 10:
            return False
        chosen.append(item)
        keys.add(item["_key"])
        urls.add(item["url"])
        publisher_counts[item["source"]] = publisher_counts.get(item["source"], 0) + 1
        category_counts[item["category"]] = category_counts.get(item["category"], 0) + 1
        return True

    # First pass ensures each topic has a voice even when world/technology move faster.
    for category in CATEGORIES:
        next_item = next((s for s in ordered if s["category"] == category), None)
        if next_item:
            accept(next_item)
    for story in ordered:
        if len(chosen) >= MAX_STORIES:
            break
        accept(story)
    # Keep overall order stable and chronological, not based on pass order.
    chosen.sort(key=lambda s: (s["_age"], s["title"].lower()))
    return [{key: value for key, value in story.items() if not key.startswith("_")}
            for story in chosen]


def download(source: dict) -> bytes:
    request = urllib.request.Request(
        source["url"], headers={"User-Agent": "TangerineLive/1.0 (+https://github.com/colemanvii/tangerine)", "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml"})
    with urllib.request.urlopen(request, timeout=14) as response:
        data = response.read(2_000_001)
    if len(data) > 2_000_000:
        raise ValueError("feed exceeded 2 MB")
    return data


def write_snapshot(stories: list[dict], count: int, now: datetime, path: Path = OUTPUT) -> bool:
    prior = {}
    if path.exists():
        try:
            prior = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            prior = {}
    if stories == prior.get("stories") and count == prior.get("source_count"):
        print("No feed changes; skipping write.")
        return False
    payload = {
        "generated_at": now.isoformat(timespec="seconds").replace("+00:00", "Z"),
        "window_hours": HOURS,
        "source_count": count,
        "story_count": len(stories),
        "stories": stories,
    }
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return True


def main() -> int:
    now = datetime.now(timezone.utc)
    all_items, succeeded = [], 0
    for source in SOURCES:
        try:
            found = parse_feed(download(source), source, now)
            all_items.extend(found)
            succeeded += 1
            print(f"{source['name']} / {source['category']}: {len(found)} recent headlines")
        except (urllib.error.URLError, TimeoutError, ET.ParseError, ValueError, OSError) as exc:
            print(f"Feed unavailable: {source['name']} / {source['category']}: {exc}", file=sys.stderr)
    stories = rank_and_select(all_items)
    if succeeded < 2 or len(stories) < 5:
        print("Insufficient fresh sources; preserving previous published data.", file=sys.stderr)
        return 1
    write_snapshot(stories, succeeded, now)
    print(f"Ready: {len(stories)} headlines from {succeeded} feeds.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
