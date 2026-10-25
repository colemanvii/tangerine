# Haven — historical inventory (25 October 2026)

This branch is a **preservation snapshot** of `main` before the proposed Haven commonplace-book / working-memory experiment. It is not the active product branch and should not be deployed.

## Prior directions worth preserving

- **Home instrument** (the `main` snapshot): a quiet home operating system, systems/maintenance, security, household, and provenance-rich home records. Source: root `README.md`, `DESIGN.md`, `index.html`, `app.js`, `home-data.js`.
- **Personal dashboard**: canonical personal dashboard under `personal/`, including an explicit source/deployment map and privacy rules. Refer to `personal/README.md` before touching it.
- **Earlier design records**: root `archive/pre-home-os/` and `astra/` (historical material, not the canonical app).
- **Builder knowledge transfer**: `field-notes/freeman/`.
- **Branch experiments** (not included in this branch snapshot; Git branches preserve them separately): `morning-system`, `haven-home-system`, `haven-001-return-loop`, `field-note-freeman`, and `codex/personal-context-demo`.

## Lessons to carry forward

1. Preserve source integrity and provenance; keep original authored material separate from machine-generated indexing/interpretation.
2. Quiet interaction and restrained visual hierarchy are valuable, but the home-OS metaphor and device dashboards should not dictate the new commonplace-book product.
3. Verify the authoritative deployment source before publishing anything. The personal dashboard's documentation explicitly warns against assuming commits update a live site.
4. Historical branches may contain unique work. Compare and review them before deleting, squashing or merging.
5. Treat private writing and personal records as private; do not publish them as a byproduct of cleanup.

## Safety / next steps

This archival branch changes nothing in production or `main`. Do **not** delete old branches or directories until the new experiment has been validated and the active source/hosting have been independently confirmed. Claude Code may be working on the new direction concurrently; coordinate through a separate feature branch rather than rewriting `main`.
