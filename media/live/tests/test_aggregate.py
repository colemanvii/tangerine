import json
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from sys import path

path.insert(0, str(Path(__file__).resolve().parents[1]))
from aggregate import clean_title, date_from, parse_feed, rank_and_select, safe_url, write_snapshot


class AggregationTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 11, 14, 13, 0, tzinfo=timezone.utc)
        self.source = {"name": "Test News", "category": "World", "hosts": ("example.org",)}

    def test_rss_parsing_and_age_cutoff(self):
        fresh = (self.now - timedelta(hours=1)).strftime("%a, %d %b %Y %H:%M:%S GMT")
        old = (self.now - timedelta(days=6)).strftime("%a, %d %b %Y %H:%M:%S GMT")
        xml = f"""<rss><channel>
        <item><title>New research changes public understanding</title><link>https://example.org/story?utm_source=feed</link><pubDate>{fresh}</pubDate></item>
        <item><title>An older research discovery</title><link>https://example.org/old</link><pubDate>{old}</pubDate></item>
        </channel></rss>""".encode()
        items = parse_feed(xml, self.source, self.now)
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["url"], "https://example.org/story")

    def test_atom_and_refuse_offsite_url(self):
        xml = """<feed xmlns="http://www.w3.org/2005/Atom"><entry>
        <title>New researchers publish a detailed update</title>
        <link href="https://example.org/new" rel="alternate" />
        <published>2026-11-14T12:00:00Z</published></entry></feed>"""
        self.assertEqual(len(parse_feed(xml.encode(), self.source, self.now)), 1)
        self.assertIsNone(safe_url("https://example.org.evil.com/article", ("example.org",)))
        self.assertIsNone(safe_url("javascript:alert(1)", ("example.org",)))

    def test_dedup_and_balancing(self):
        base = {"id": "a", "title": "Large international research update", "url": "https://example.org/a",
                "source": "A", "category": "World", "published_at": "2026-11-14T12:00:00Z",
                "_key": "large international research update", "_age": 1}
        duplicate = dict(base, id="b", url="https://example.org/b", source="B", _age=2)
        culture = dict(base, id="c", title="New exhibition", url="https://example.org/c",
                       category="Culture", _key="new exhibition", _age=3)
        chosen = rank_and_select([base, duplicate, culture])
        self.assertEqual(len(chosen), 2)
        self.assertEqual({x["category"] for x in chosen}, {"World", "Culture"})
        self.assertNotIn("_age", chosen[0])

    def test_stable_snapshot_no_false_update(self):
        with tempfile.TemporaryDirectory() as directory:
            file = Path(directory) / "stories.json"
            stories = [{"title": "Example", "url": "https://example.org/1"}]
            self.assertTrue(write_snapshot(stories, 2, self.now, file))
            old = json.loads(file.read_text())
            self.assertFalse(write_snapshot(stories, 2, self.now + timedelta(minutes=30), file))
            self.assertEqual(json.loads(file.read_text()), old)

    def test_headline_cleanup_and_timestamp(self):
        self.assertEqual(clean_title("  One &amp; two  "), "One & two")
        self.assertEqual(date_from("2026-11-14T12:15:00Z").hour, 12)


if __name__ == "__main__":
    unittest.main()
