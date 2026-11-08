# Tangerine Digital — Whiteboard study (foundation 001)

A local, private prototype. **Do not deploy.** The page carries `noindex`.

## Run

From the repository root:

```sh
python3 -m http.server 4321 --bind 127.0.0.1
```

Open <http://127.0.0.1:4321/app/>. No build step, dependencies or network requests.
(Serve over `http://127.0.0.1`, not `file://`: the SHA-256 fingerprint needs a secure context.)

## Use

- **Whiteboard** — drag cards (or select and use arrow keys; Shift moves 48 px). `+ Project`, `+ Person`, `+ Idea`, `+ Pin source`, `Link`. Select a project to read or leave a bookmark and see related originals from the archive.
- **Archive** — originals with provenance, fingerprint and revision history. *Keep new* adds your own writing or note.
- **Return** — what was kept on this day in an earlier year, the thread resting longest, one explained connection.
- `/` searches everything. `Esc` cancels.

Demonstration material is fictional and labeled; remove it from the footer. Everything you add
stays in this browser (IndexedDB). Use **Export a copy** to keep a JSON file.

## Tests

```sh
node --test app/tests/*.test.cjs                                   # store, index, demo (no browser)
node app/tests/whiteboard.e2e.cjs                                  # needs the server above
node app/tests/whiteboard.e2e.cjs --shots docs/foundation-001/screens   # also writes screenshots
```

See [`docs/foundation-001/PLAN.md`](../docs/foundation-001/PLAN.md) for the audit, boundaries and plan.
