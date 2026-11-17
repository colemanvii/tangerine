# Tangerine Media — Static Site / Edition 001

**A more beautiful way to pay attention.**

A self-contained, responsive, multi-page static website and companion email study for a proposed independent media operation. Inspired by the *operating energy and personality* of daily broadcasting, not by anyone else's logo or brand assets.

## Open it

Open `index.html` in any browser, or host this directory on any static file host. All website links are relative. There are no packages, frameworks, JavaScript, web font dependencies, build services, analytics, network images, or backend services. No endless motion or auto-play.

## Contents

- `index.html` — media company homepage and front page
- `briefing/index.html` — **The Briefing**, fixed November 13, 2026 pilot edition
- `briefing/nvidia.html` — full sourced editorial analysis of Nvidia CEO succession
- `briefing/why-attention.html` — original editor's letter
- `programming/index.html` — The Briefing, Conversations, Originals, Field Notes
- `about/index.html` — manifesto, editorial standards, open publishing ambition
- `brand/index.html` — identity study and working design system
- `email/edition-001.html` — email-client-safe visual study, with inline styles and source links
- `assets/style.css` — all site styling
- `assets/fruit.svg` / `assets/favicon.svg` — newly drawn original graphics

The website is **static**. The wordmark is a type treatment, not a cleared trademark or finalized vector logo. All programming beyond the pilot issue is described as *in development*, not invented as already existing. The subscription form is intentionally absent until the mailing system is real.

## Editorial standards

1. Every current or factual claim has a reliable source; link it close to the claim.
2. Distinguish verified fact, reporting by others, analysis, opinion, and unknowns.
3. Do not publish an AI-generated news story without verification against contemporary sources. Do not invent quotes, interviews, imagery, data, or eyewitness reporting.
4. Preserve the edition date. Meaningful corrections should be visible, not stealth-edited.
5. Avoid copied article passages; original text summarizes and contextualizes with attribution.
6. No third-party photography, brand logo, or other unlicensed creative assets included.

The pilot edition contains contemporary links to Nvidia's November 12 announcement, Reuters, The Washington Post, and U2's November 13 announcement. Its analysis and editorial voice are original. Time-sensitive claims are frozen to the pilot date; **this is not a live news feed**.

## Proposed publishing pipeline (not implemented)

- Research: collect trusted publisher feeds and primary announcements.
- Verify: cross-check major claims, dates, names, and uncertainty before drafting.
- Curate: select 3–5 important stories and one cultural discovery; distinguish analysis from reporting.
- Render: produce both HTML pages and email-safe HTML from the same verified edition record.
- Review: keep a human editorial approval gate and correction log.
- Publish: push a dated directory to static hosting, then send an email using a permitted provider with valid subscriber opt-in/unsubscribe handling.

For a later automation, a GitHub Actions schedule could handle generation, but credentials and subscriber addresses must live in secrets/a proper provider, never this public repository. No automatic publishing or daily emails have been configured as part of this project.

## Brand foundations

- **Positioning**: independent media devoted to the endlessly curious.
- **Promise**: a more beautiful way to pay attention.
- **Ethos**: in cyberspace as it is in heaven—beauty, order, proportion, human delight.
- **Visual**: paper, graphite, decisive fruit orange, forest green; bold sans signal / measured Georgia story typography; sharp rules; generous white space.
- **Formats**: The Briefing (read), Conversations (listen), Originals (watch), Field Notes (notice).
- **Design constraints**: fully static pages, no motion, no frameworks, no gradient/card UI.

## Scope and repository safety

This entire directory can be added under `/media/` in `colemanvii/tangerine` without changing that repository's current root site or earlier experiments. Put it in a separate branch for review before any deployment. Contents here are intentionally public-facing and contain no client-confidential work or private user data.

Code templates and CSS are offered under the adjacent `LICENSE-CODE.md`. Tangerine's original brand identity, trademark, illustration and editorial writing remain owned by Tangerine; no third-party rights are implied.
