# Tangerine

**A life, in evidence.**

Tangerine is a private, source-grounded place to collect the record of a creative life and return to it with greater continuity. It does not narrate a personality, substitute for judgment, or make claims that exceed the evidence.

## The product

Two loops belong together:

1. **Keep & Return.** Capture quotations, drafts, photographs, songs, conversations, and projects in a personal archive. Return to the original materials and resume unfinished work.
2. **Look Back.** See how attention and work changed across 7, 30, or 365 days. Wrapped is the first expression of this loop: a dated, inspectable report, not a personality quiz.

The measure of success is whether the person can leave the app and make something in the world.

## First real workflow

- Export ChatGPT data.
- Open `experiments/002-wrapped-astra/index.html` in a browser.
- Select the `conversations.json` file; parse locally, in memory.
- Review verifiable message counts, active days, conversation titles, and activity distribution.
- Show estimates only as estimates. Conversation timestamps are not screen-time telemetry.
- Preserve every original text and link every derived insight to its source if possible.
- Export/share a report only after explicit review, with sensitive information excluded by default.

## Design contract

- Helvetica Neue when installed, falling back to Helvetica / Arial / system sans.
- Cyber white `#fafbfb`; deep ink `#181a1b`; cold grey `#868b8d`; hairline `#dfe2e2`; tangerine `#f25a28`.
- Typography, spacing, and alignment must carry the experience.
- Editorial and human, not SaaS or a gamified feed.
- No stock photography, gradients, ornamental dashboards, exaggerated headings, faux analog textures, rounded card grids, or emojis as branding.
- Motion only when interaction meaningfully changes state; respect reduced motion.
- The report should look composed before any data is imported.

## Nonnegotiable data rules

- Private by default. A private GitHub repository is **not** a substitute for private web hosting.
- No personal chat exports, credentials, notes, health information, photos, or real private records committed to Git.
- The prototype imports data locally and does not send it to a server. Do not add analytics, external scripts, fonts, or third-party tracking.
- Keep source content immutable and separate from derived indices, summaries, and AI output.
- Each number must have a provenance, measurement definition, and missing-data caveat.
- Say `unknown` when unknown. A human's life is not a complete dataset.
- Never use a fictional demo, user profile inference, or invented usage count to represent real activity.
- No mental-health diagnoses or automated assessments inferred from private chat content.
- AI interpretation should be explicitly labeled, reversible, and accompanied by original source evidence.
- Data deletion, export, authentication, and access control are release conditions for any hosted version.

## Repository plan

The current `main` includes earlier home-system and personal-dashboard experiments. Preserve those and their existing hosting boundaries. Do not repurpose or redeploy them as an incidental part of this study.

```
docs/
  TANGERINE_PRODUCT.md     # Product thesis and nonnegotiable design/data rules
experiments/
  002-wrapped-astra/
    index.html              # Local browser report shell
    styles.css              # Cyber-white editorial system
    app.js                  # Local parser and analytics
    README.md               # Run, data assumptions, limitations
```

Potential future structure after a deliberate consolidation: `app/` (product UI), `core/` (local source models), `adapters/` (explicit importers), `docs/` (design and provenance), `archive/` (historical studies). Do not reorganize the legacy repository until the Wrapped prototype has been assessed and the older deploy targets verified.

## Development sequence

1. Verify truthful ingestion and private-by-default local report.
2. Verify time-range filtering and provenance with a small, synthetic fixture.
3. Test with a user-selected real ChatGPT export, reviewed only by the user.
4. Add direct opening of source conversations when stable source identifiers permit it.
5. Explore relationships among artifacts, drafts, and conversations.
6. Only then plan secure accounts, sync, additional importers, paid access, and a public website.

## Product test

Can a person open Tangerine, see something truthful and unexpectedly useful about the last year, inspect what supports it, and return to living and making?