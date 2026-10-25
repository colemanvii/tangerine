# Tangerine repository instructions

## Product authority

Tangerine — **A life, in evidence** — is the active product direction. Read the root README and the product specification on `study/tangerine-wrapped-astra-001` before changing app code.

The old Haven **home-system** and **personal dashboard** prototypes are legacy, not Tangerine's current canonical app. Their complete 2026-10-25 source snapshot is preserved on `archive/haven-before-tangerine-2026-10-25`; see `archive/README.md` for the archive map.

## Work in progress

- `study/tangerine-wrapped-astra-001`: active Wrapped/Astra report study. Do not overwrite or merge another agent's changes without checking branch HEAD and comparing changes.
- `experiment/001-fear`: private commonplace/reading experiment. Preserve immutable-source rules and do not publish.
- `main`: repo entrypoint, archive index and *temporarily retained legacy runtime*. Keep `index.html`, old runtime dependencies and `personal/` unchanged until a reviewed Tangerine app and secure deployment target exist.

## Privacy and continuity

- A private GitHub repository does not imply a private hosted website. Never deploy personal records, conversation exports, real reports or secrets publicly.
- Original writings, collected passages and records stay untouched. AI analysis, metadata and derived counts remain separate, sourced and reversible.
- ChatGPT timestamps are not screen-time telemetry; never fabricate hours, usage metrics, original dates or source evidence.
- Prior tasks (including Seth McWhorter and Mark Perotta's photo badge) exist in legacy `personal/index.html` and must be migrated into the real Tangerine task system **when that system exists**. Do not falsely claim they are synced.
- Do not change existing Vercel project's root directory, branch, production deployment, visibility or audience as a side effect of archiving.
- Do not delete historic files or branches to achieve cleanliness. Preserve and catalog before migrating; remove old runtime entrypoints only in a deliberate, verified cutover.

A GitHub source update does not by itself prove a live deployment. Verify before claiming it.
