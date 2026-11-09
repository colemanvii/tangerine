# Tangerine Digital — Whiteboard and Writing study (foundation 001)

A local, private prototype. **Do not deploy.** The page carries `noindex`.

## Run

From the repository root:

```sh
python3 -m http.server 4321 --bind 127.0.0.1
```

Open <http://127.0.0.1:4321/app/>. No build step, dependencies or network requests.
(Serve over `http://127.0.0.1`, not `file://`: the SHA-256 fingerprint needs a secure context.)

**Always use the same address.** Browser storage belongs to one origin: `127.0.0.1:4321`,
`localhost:4321` and `127.0.0.1:8000` are three different, separate Tangerines.

## Use

- **Whiteboard** — drag cards (or select and use arrow keys; Shift moves 48 px). `+ Project`, `+ Person`, `+ Idea`, `+ Pin source`, `Link`. Select a project to read or leave a bookmark and see related originals from the archive.
- **Archive** — originals with provenance, fingerprint and revision history. *Keep new* adds your own writing or note.
- **Writing** — a quiet desk for long-form work. *New piece* starts one. Drafts save as you type
  and come back after a reload, a crash or a closed tab. *Keep* makes an original (revision 1,
  fingerprinted); later *Keep revision* adds a revision beside the earlier ones. *Discard draft*
  drops unkept changes only.
- **Return** — what was kept on this day in an earlier year, the thread resting longest, one explained connection.
- `/` searches everything. `Esc` cancels.

Demonstration material is fictional and labeled; remove it from the footer.

## Where your writing lives — read this

**This browser is not a vault.** Everything you write is kept in this browser's IndexedDB on
this device, and nowhere else. It is lost if you clear site data, use private browsing, switch
browser or device, change the address or port, or if the browser evicts the site's storage
(Safari can do this to sites you have not visited for a while). Tangerine asks the browser for
persistent storage and tells you on the desk whether it was granted.

- **Export a copy** (footer) writes a JSON file with every original, revision and unkept draft.
  Do it at the end of every writing session, and keep the file outside this repository
  (`tangerine-*.json` is git-ignored as a safeguard). The footer shows when you last did it.
- **Restore a copy** checks the file before touching anything: format, structure, unique ids,
  sequential revisions and every SHA-256 fingerprint. If any check fails, nothing is written.
  A valid copy is previewed first, then merged without overwriting: missing originals are
  added, later revisions are appended, and anything that differs from what is kept here is
  added *beside* it as a separate copy.
- On a local-network address (an iPad opening `http://<your-mac>:4321`) the browser does not
  provide SHA-256. Writing still saves, but new originals carry no fingerprint, and the
  archive says it cannot verify rather than claiming "verified".

Durable, private, recoverable storage outside the browser (milestone 005, the private vault)
is the long-term answer. Until it exists, the exported copy is your backup.

## Tests

```sh
node --test app/tests/*.test.cjs                                   # store, drafts, restore, index (no browser)
node app/tests/whiteboard.e2e.cjs                                  # needs the server above
node app/tests/writing.e2e.cjs                                     # desk, drafts, backup, restore
node app/tests/whiteboard.e2e.cjs --shots docs/foundation-001/screens   # also writes screenshots
```

See [`docs/foundation-001/PLAN.md`](../docs/foundation-001/PLAN.md) for the audit, boundaries and plan.
