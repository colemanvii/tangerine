# Haven — Experiment 001: Fear

*A place to return to your thinking.*

A private reading, collecting and writing environment around one question: **What is fear, and how should a person live in relation to it?**

The audit, consolidation recommendation and honest assessment are in [AUDIT.md](AUDIT.md).

## Run it

```sh
cd experiments/001-fear
python3 -m http.server 4317 --bind 127.0.0.1
```

Then open `http://127.0.0.1:4317`. There is no build step, no dependencies and no network requests. It works on a phone on the same network if you bind to `0.0.0.0`, but that exposes it to the local network; keep it on `127.0.0.1` unless you mean to.

**Private prototype. Do not deploy.** The page carries `noindex`.

## The four actions

| | |
| --- | --- |
| **Read** `#read` | Six movements, 32 passages. Each passage shows whether it is a quotation or a paraphrase, its translator, location and rights, and a link to the full text. Commentary sits in the margin and hides with one control. |
| **Collect** `#collect` | The commonplace book. Collect passages exactly as printed, or add your own writing, notes, questions, quotations and images, with their original dates. |
| **Reflect** `#reflect` | The desk. Optional questions, drafts held in the browser, nothing written for you. |
| **Return** `#return` | Continue reading, leave a bookmark, find earlier thoughts that meet what you have read, export and import. |

`#sources` explains the method, every source and the quotations that were checked and left out.

## Rediscovery demonstration

The prototype ships with four entries labeled **Demonstration**. They are written for this prototype and are not your writing. Nothing of yours has been imported.

To see rediscovery: Return → *Show me*, or open `#read/mt-25-25`. A demonstration note from September 2025 about an unsent letter appears in the margin of Matthew 25:25, with the reason it was matched. *Connect* records your own sentence linking them; *Not related* hides the suggestion. To remove all demonstration entries: Return → *Remove demonstration material*.

## The rule

Haven never changes your material. In code:

- `store.js` is the only writer. Entries are append-only revisions. Editing requires an explicit `USER_EDIT` token, and the earlier version is kept. Deleting requires `USER_DELETE`. Collected passages cannot be revised. Import never overwrites. Everything the app reads is frozen.
- `connect.js` only reads. It returns references and its reasons ("Both concern fear that keeps you from acting. Shared words: caution."). It has no path to write.
- Commentary is stored in `sources.js`, never in your entries, and is always labeled *Haven · commentary*.

## Files

- `index.html` — shell
- `haven.css` — typography and layout (cyber white, from `sandbox/system/specimen.html`)
- `app.js` — views and interactions
- `store.js` — immutable storage (IndexedDB, memory fallback)
- `connect.js` — explainable suggestions
- `sources.js` — the collection: passages, provenance, commentary, prompts, method
- `demo.js` — labeled demonstration entries
- `tests/store.test.js` — immutability tests: `node experiments/001-fear/tests/store.test.js`
- `tests/check-quotes.js` — checks every quotation against downloaded source texts

## Storage

Everything stays in this browser's IndexedDB, on this device. Nothing is sent anywhere. Clearing site data erases it, so use *Export a copy*. This is a prototype boundary, not a design for keeping years of writing.
