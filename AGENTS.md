# Tangerine — repository instructions for coding agents

## Product definition (current direction)

**Tangerine is a synthesis interface designed to sit atop ChatGPT. TABLET is its spatial presentation surface.**

The user should be able to think naturally in one ongoing ChatGPT conversation and see the important context — projects, people, ideas, decisions, relationships, next actions, and open loops — represented accurately, without manually maintaining folders, exports, boards, or a second chat application.

**Product test: does this eliminate organizational effort and make thinking clearer?** Do not confuse a beautiful capture UI with the finished product. Manual conversation paste/import is a bounded prototype technique, not the intended ongoing interaction.

Read these before product changes:

1. [`SYNTHESIS.md`](SYNTHESIS.md) — product definition and the continuity/integration problem.
2. [`INSTRUMENT.md`](INSTRUMENT.md) — interaction and visual principles.
3. [Prototype 001 documentation](https://github.com/colemanvii/tangerine/blob/claude/upbeat-newton-p6gfp5/docs/prototype-001/README.md) — current working local study and its real limits.
4. [`docs/TABLET.md` in the canvas study](https://github.com/colemanvii/tangerine/blob/study/tablet-conversation-canvas-001/docs/TABLET.md) — capture, provenance, reconciliation, placement, and privacy contract.

## Current work and source branches

- `claude/upbeat-newton-p6gfp5`: **Prototype 001**, a local conversation-capture → review → TABLET → writing loop. Preserve the branch and tests. It has *manual* ChatGPT import, *not* automatic ChatGPT synchronization.
- `study/tangerine-foundation-001`: original immutable-source store, canvas, writing desk, backup/restore.
- `study/tablet-conversation-canvas-001`: TABLET identity and aggregation specification.
- `study/tablet-cyber-white-001`: instrument design study.
- `study/tangerine-wrapped-astra-001`: experimental ChatGPT export reader / Wrapped exploration.
- `experiment/001-fear`: commonplace and reading experiment; preserve source attribution.
- `main`: public entrypoint and retained legacy Haven runtime. Do not assume README changes correspond to a deployed app.
- `archive/haven-before-tangerine-2026-10-25`: preserved legacy history.

## Engineering priorities

1. **Integration feasibility first.** Identify an actually supported, permissioned path from ChatGPT to Tangerine. Document what can and cannot be accessed; do not claim background syncing, full transcript access, or a browser overlay without verifying support.
2. **Private persistence before reliance.** Browser IndexedDB is only device-/origin-local. Establish a user-controlled vault with access controls, deletion/retention, recovery, and explicit sync states before handling real conversations as a reliable long-lived system.
3. **Grounded synthesis.** Preserve originals; distinguish user statements from assistant suggestions and inferred relationships; retain exact evidence, review and undo. Incorrect records must be correctable and removable.
4. **Real use over demos.** Demonstrate a consented, private conversation becoming useful context, with less work for the user. Fictional fixtures are for automated tests only.
5. **Design with restraint.** Architectural white, precision, quiet silver, one orange signal, minimal and accessible motion. Prioritize understanding over ornament.

Do not silently expand the app into a task manager, Notion clone, an extra chatbot, or a daily copy/paste ritual. Notion may be a durable project ledger when explicitly directed; GitHub is the implementation record; neither is the private original source archive.

## Non-negotiable safeguards

- This repository is **public**. Commit no private conversations, user data, confidential client information, unpublished artwork or writing, original photographs, export files, tokens, or secrets.
- No unauthorized scraping of ChatGPT UI/session data and no false claims of access to memory, prior chats, or other apps.
- Preserve immutable originals, source attribution, reversible changes, and existing backup/restore behavior.
- Do not change production deployments, Vercel settings, repository visibility, `index.html`, `personal/`, or legacy runtimes incidentally. A study branch or README update is not authorization to deploy, migrate, or delete.
- Check the latest branch HEAD and other agents' work before modifying shared code. Prefer a separate reviewed branch for new capabilities.
- Respect reduced motion; no autoplay, compulsive notifications, engagement loops, or fabricated dates, analytics, and provenance.

**Acceptance:** The person can open TABLET, recognize a trustworthy picture of their world, make or discover one useful connection, and return to real life without maintaining the system.
