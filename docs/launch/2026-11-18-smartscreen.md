# Smartscreen Refinement 002

November 18, 2026 · baseline `1557f76d4de117d462f6c21522f34a040aba68b3`

## What changed

- **Homepage.** The smartscreen now lives at `website/index.html` and serves `/`. `website/vercel.json` permanently redirects `/screen` and `/screen/*` to `/`.
- **Studio website archived.** The previous homepage was moved, unchanged, to `archive/studio-website-2026-11-17/` (git blob `945d851…`). It is no longer deployed.
- **Lil KC.** The screen no longer hotlinks the 3.16 MB master PNG from `raw.githubusercontent.com`. It serves `website/media/lil-kc-2026-11-16.webp` (140 KB, 1536 × 1024) from the production domain. The master in `lil-kc/` is unchanged (SHA-256 `9b9687e5…`); the derivative is recorded in `lil-kc/README.md`.
- **Feed.** One same-origin feed, `website/work.json`. The page checks it every 60 seconds while visible, when the tab returns, and when the network comes back. The second feed (`local.json`, empty) and the GitHub raw dependency were removed. Pieces publish by adding an entry to `work.json` and its file to `website/media/`.
- **Work added.** *Open Something*, Study No. 001: the orange drawing already published on the launched studio site, extracted unchanged from its markup. Nothing else in the repository qualified. Unmerged branches (wordmark, grove study, media), Freeman and Barnsley/Haven material, and identity studies were left out as unapproved, client, or study work.
- **Instrument.** One full-bleed stage for the artwork and one readout bar: lamp + TANGERINE (return to latest), "TITLE", project, date, and RETRIEVE ← 01 / 02 →. Helvetica labels and monospace readouts. No cards, gradients, shadows or rules except the search underline.
- **Activity lamp.** The dot beside TANGERINE is the feed's real state: tangerine when the last check succeeded, with one blink per completed check; grey when a check fails or the browser goes offline. With reduced motion preferred, it does not blink.
- **Controls appear only when useful.** Paging and Retrieve are hidden while one piece or none is published. The arrows stop at either end of the chronology instead of wrapping.
- **Input.** ← → step, Home returns to latest, / opens retrieval, ↑ ↓ move through results, Enter opens, Esc closes. Swipe the artwork on touch screens. All targets are at least 44 px tall.

## Verification (local, Chromium 1440×900, iPad Pro 11, iPhone 13)

Served `website/` from a local static server and drove it with Playwright:

- Both images load and decode. No console errors and no failed requests at any size. No page scroll at any size.
- Keyboard: arrows, Home, `/`, search, ↑ ↓, Enter and Esc all behave as listed.
- Touch: swiping steps through the work, and tapping ← and → works on iPad and iPhone.
- Automatic update: with the clock advanced 60 s, a newly published piece appears and becomes current. Paging and Retrieve appear when the second piece arrives.
- Failure: with the feed returning 503, the lamp turns grey and labels itself offline, and the current artwork stays on screen.
- Reduced motion: no lamp animation.

**Not yet verified:** the Vercel deployment, the `/screen/` redirect, and the public domain. The working environment could not reach `ex-tangerina.com` or `*.vercel.app`. Production deploys when `main` is updated.
