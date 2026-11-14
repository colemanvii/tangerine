# Tangerine Live / Version 1

A self-aggregating news front page. No paid APIs, manual daily editing, AI-written claims, email sending, or external browser dependencies.

## Included

- 11 configurable RSS/Atom publisher feeds spanning World, Business, Technology, Science, and Culture.
- Collection of article headlines, original source links, publisher name, topic and publication timestamp only.
- 72-hour freshness window, exact headline/URL deduplication, and source/topic caps to keep one publisher from dominating.
- Static JSON output and responsive live page at /media/live/ with accessible topic filters and stale-feed warnings.
- GitHub Actions scheduled to run at minute :07 and :37 of every hour. Runs tests first and only commits changed feed data.
- Failure tolerance: if there are fewer than two successful feeds or five fresh headlines, the last published data is preserved.

This is **recency-plus-diversity aggregation**, not independent verification, AI-powered importance assessment, or original reporting. It does not scrape full articles or publish feed descriptions and images.

## Local run

Run these commands from the repository root:

    python -m unittest discover -s media/live/tests -v
    python media/live/aggregate.py
    python -m http.server 8000

Open http://localhost:8000/media/live/ in a browser. The compiler needs internet access. The checked-in stories.json begins intentionally empty, so the site cannot misrepresent sample material as current news.

## To activate

1. Review publisher terms and syndication permissions prior to public commercial launch. BBC, Guardian, NPR and others have usage restrictions; a public RSS feed is not necessarily a commercial redistribution license. Link-only attribution and not copying bodies reduce—but do not automatically eliminate—rights questions.
2. Merge the parent media PR and this follow-on PR into the repository's default branch main. Scheduled GitHub Actions **do not run on feature branches**.
3. Verify GitHub Actions is enabled and its token has contents:write permission.
4. Manually trigger Tangerine Live — refresh headlines from GitHub Actions and verify the run and stories.json.
5. Deploy /media/ from the chosen static host; no deployment is initiated by this PR.

The workflow can run later than its nominal cron schedule. Call this near-real-time, not instantaneous. If the source feeds stop updating, the page says the edition is stale.

## Next iteration

A compliant opt-in mailing provider could send an email assembled from this same data each morning. An AI importance scorer or summaries could be added later, but require source-grounding, rights review, corrections, and content-quality monitoring.

## Safety and attribution

All source data is untrusted. The backend accepts article URLs only from configured publisher domains over HTTPS. The frontend builds DOM nodes with textContent, rather than injecting remote HTML. No API secrets, subscriber records, third-party article text, or copyrighted photography belong in the public repository.
