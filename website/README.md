# Tangerine — Index 002

The source of https://ex-tangerina.com: an instrument for exploring the work. The homepage is four tracks, one per relationship, holding every artifact; each relationship also has a dossier page.

Vercel project `ex-tangerina` serves this directory as-is. There is no build step on Vercel: the HTML is generated here and committed, so what is in Git is exactly what is served.

```
website/
  content/site.json            homepage copy, relationship order, studio text, archive log
  content/<relationship>.json  one file per relationship: intro, chapters, artifacts
  content/media.json           image manifest (written by tools/media.py)
  media/<relationship>/        web derivatives (WebP 640 / 1280 / 2200) and og.jpg
  media/brand/                 the approved script wordmark (PNG byte-identical to the approved homepage) and derivatives
  assets/site.css              one stylesheet
  assets/site.js               shared behaviour: Studio panel, viewer, dossier filters (pages work without it)
  assets/index.js              the homepage tracks: cursor, keyboard, deep links
  data/archive.json            generated: every artifact, flat and ordered (also embedded in the homepage)
  studies/index-002/           the three design studies that led to Index 002 (not deployed)
  fonts/                       Archivo (variable width + weight) and Instrument Serif, both SIL OFL
  tools/                       build.mjs, media.py, og.mjs (not deployed, see .vercelignore)
  index.html, <slug>/index.html, 404.html, data/, sitemap.xml, robots.txt   generated — do not edit by hand
```

## Add new work

1. **Make web images** from the original (the original is never modified or copied into the site):

   ```sh
   python3 website/tools/media.py freeman-general-contracting site-visit-2027 ~/originals/IMG_0042.jpg \
     --source "Freeman photo library, IMG_0042.jpg"
   ```

   This writes `media/freeman-general-contracting/site-visit-2027-{640,1280,2200}.webp` and records size and provenance in `content/media.json`. Needs Pillow (and ffmpeg for WebP sources).

2. **Add an artifact** to a chapter in `content/<relationship>.json`:

   ```json
   {
     "id": "site-visit-2027",
     "title": "Site visit, *Barnsley*",
     "media": "freeman-general-contracting/site-visit-2027",
     "alt": "What the image shows, for someone who cannot see it",
     "discipline": ["Photography"],
     "date": "2027",
     "status": "Published",
     "layout": "wide",
     "note": "One or two sentences. Links use [label](https://…)."
   }
   ```

   - `title` and `note` accept `*italic*` (use it for titles of works) and `[label](url)`.
   - `discipline` drives the filter on the archive page. Every artifact needs at least one.
   - `date` and `status` are optional. Only fill them when known. Typical status values: *Live*, *Released*, *Published*, *Study*, *In development*, *Independent study*.
   - `layout`: `full`, `wide`, `left`, `right`, `center`, `narrow`, `side` / `side-flip` (image with the caption beside it), `half-a` + `half-b` (a pair), `third-a/b/c`, `offset-a` + `offset-b` (staggered pair).
   - `frame`: omit for full-bleed images; `plate` sets the image on a paper mat (good for square record covers, logos and white-ground artwork); `ruled` adds a hairline (good for screenshots).
   - Video: `"kind": "video", "src": "<relationship>/<file>.mp4", "poster": "<media key>", "w": …, "h": …`. Keep loops short and silent (H.264, `-movflags +faststart`).
   - Words as the artifact (a published line, a tagline): `"kind": "quote", "text": "…", "style": "serif" | "sans", "source": "where it ran"`.

3. The homepage picks it up automatically: every artifact appears on its relationship's track, in the order of the JSON. Add a line to `log` in `content/site.json` and bump `updated` there.

4. **Build and check:**

   ```sh
   node website/tools/build.mjs
   python3 -m http.server 4175 --bind 127.0.0.1 --directory website   # open http://127.0.0.1:4175
   ```

5. If a relationship's cover changed, regenerate social cards: `node website/tools/og.mjs http://127.0.0.1:4175` (needs Playwright).

A new relationship is a new `content/<slug>.json` plus its slug in `site.json → relationships`.

## Rules for what goes in

- This repository is public. Only add work that is already public or cleared for publication. No client documents, private messages, personal data, credentials, financial details or unreleased work without permission.
- Never present a study as a commission. Use `status` and the relationship's `notice` to say exactly what something is.
- Record where every image came from (`--source`). Keep originals in their own repositories or libraries.

## Deploy and roll back

Production deploys from `main` through Vercel's Git integration; pushes to other branches normally produce Vercel preview deployments. To roll back, promote the previous production deployment in Vercel (Deployments → … → Promote / Instant Rollback) or revert the commit. The homepage this site replaced is preserved, unchanged, in `archive/script-homepage-2026-11-18/`.
