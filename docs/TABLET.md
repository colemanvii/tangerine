# TABLET — Conversation canvas

Status: **working direction / study**, 9 November 2026. This is a design and engineering brief, not a claim that ingestion is operational.

## Product

**TABLET** is a spatial surface for a person's creative life. It is not a task manager, a category dashboard, or a replacement for original material. It is the place where fragments can coexist: thoughts, images, people, films, work, sources, questions, intentions and relationships.

**Tangerine** is the long-lived source archive and writing environment. TABLET is a way of seeing and working with it.

The first screen should feel like a large, quiet, rearrangeable field. No forced folders. A person should be able to zoom out, find a thread, drag something close to something else, or simply leave it alone. Connections need not imply a task.

## The missing capability: conversation aggregation

Conversations are an input, **not a live feed the app currently has**. ChatGPT memory is neither a complete transcript API nor guaranteed synchronization. We must implement and test an authorized data pathway before claiming automatic aggregation.

Proposed capture pipeline:

1. **Source** — a user-authorized conversation, note, file or connector record arrives through an explicit import or an authenticated integration. Never scrape a logged-in chat or claim access to all prior conversations.
2. **Extract** — propose atomic observations: entity (person, project, place, film, object), thought, decision, question, source, and relationship. Capture exact provenance and a source timestamp if supplied. An inference is not a fact.
3. **Reconcile** — resolve existing IDs/aliases and offer updates rather than duplicate cards. Keep disagreements and uncertainty; do not overwrite the original wording.
4. **Review** — let the user accept, edit, ignore, merge, or undo proposed changes. Sensitive information defaults to private and requires explicit opt-in before indexing.
5. **Place** — add or update a node without disturbing user-chosen positions. Auto-placement applies only to new nodes and is reversible. Let manually drawn connections coexist with suggested ones.
6. **Persist** — save a provenance-backed graph and the original references separately. Sync must report its last successful source and time; failures must be visible, not silently disguised as current.

The conversation is not the archive's canonical original unless the user intentionally imports and keeps it. Derived metadata must remain removable without erasing originals.

## Minimum graph model

- Node: stable ID, type, title, description (optional), aliases, created/updated timestamps, privacy, provenance IDs, confidence / review state, x/y, user-pinned position.
- Edge: stable ID, from/to IDs, relationship label, provenance, review state; distinguish observed, inferred, and manually drawn.
- Source: stable ID, source type, original location/reference, original timestamp (if known), imported timestamp, author, permitted scope, fingerprint where available.
- Change: operation, before/after, origin, timestamp and ability to undo.
- Capture proposal: immutable source pointer, proposed node/edge changes and resolution state.

**No hallucinated provenance.** A chat's date is not a film-watching date or a business meeting date. A prospective relationship is not a confirmed introduction. Conversation about a task does not mean acceptance of that task.

## Essential interaction

- Open on the canvas, not a list of categories.
- Pan, zoom, drag, multi-select and search; accessible keyboard navigation.
- Add text, source, image, person or connection in place.
- Jump from a node to its supporting source.
- See an optional "What changed since last visit" layer, not an obligatory inbox.
- Distinguish user-created, imported, and AI-proposed nodes without visually overwhelming the board.
- Preserve manual layout across imports; reversible automatic arranging is a secondary command.
- Archive / hide without deleting originals.
- Export and restore the graph, source references, and drafts; report what is and is not included.

## Boundaries

- This repository is **public**. Commit no private conversations, original personal writing, unpublished photos, contact details, confidential client matters, access tokens, or real user-derived graph fixtures.
- The current foundation app stores data in the browser. It is **not** a cross-device database or private vault. Keep its export/restore safeguards intact.
- No unreviewed automation of chat imports, hidden background collection, or public deployment of sensitive captures.
- The present prototype contains only fictional demonstration content. Never represent demo material as the user's real record.
- Notion is a ledger for decisions and project state, not the canvas. GitHub is the implementation record. Neither should duplicate the private original archive.

## Implementation sequence

1. **Name / orientation** — use TABLET in the app chrome and study documentation while preserving routes and existing data.
2. **Spatial ergonomics** — assess actual pan/zoom, responsive layouts, and card types; add capabilities without breaking keyboard drag, source pinning, writing, and backups.
3. **Capture contract** — implement validated, source-attributed import of a user-reviewed JSON capture bundle. Use fictional fixtures only. Test deduplication, idempotency, provenance and undo.
4. **Private persistence** — introduce a user-controlled durable store with encrypted transport, authentication and explicit retention/deletion controls. Migrate browser data by reviewed export/import.
5. **Authorized connectors** — only then add per-source opt-in conversation ingestion, incremental updates, failure states and revocation. Never claim universal ChatGPT access.
6. **Acceptance test** — discuss one new fictional thought, create/update the corresponding node, keep its source, connect it to an existing node, preserve manual placement, reload, export, restore and undo.

## Test of success

A person opens TABLET and recognizes their own evolving world, with enough trust in the sources to explore it freely — **without having to maintain a filing system**.

Not: "look at all the tasks I organized."

Not: "the AI knows every conversation" when it does not.
