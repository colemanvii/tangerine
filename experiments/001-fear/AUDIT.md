# Haven — Experiment 001: audit, recommendation, assessment

October 25, 2026. Branch `experiment/001-fear`. Private; not deployed.

## 1. Repository audit

### What exists

Everything Haven-related lives in one private repository, `colemanvii/haven`, with six branches:

| Where | What it is | Relevance to the commonplace-book Haven |
| --- | --- | --- |
| `main` root (`index.html`, `app.js`, `styles.css`, `home-data.js`) | **Home instrument** — Cedar House demo: Home, Systems, Security, Household, Record | Different product (home orientation). Its *Record* model — inspectable entries with author, date and provenance, related records, an append-only service history — is the closest existing precedent for an immutable personal archive. |
| `main` `personal/index.html` | Maintained personal dashboard: Now / Next / Direction, outreach, prayer list | Different job (daily orientation). Must not be disturbed; AGENTS.md governs it. |
| `main` `studies/haven-001-resumption-instrument.md` | Thesis: Haven is where you **return**; the unit is a *thread*; the primitive is a person-authored **bookmark** and **Cold Open**; AI must not fabricate intent | **Directly relevant.** It is the "Return" half of this brief. |
| branch `haven-001-return-loop` | `experiments/haven-001/index.html`: a working bookmark and Cold Open prototype (localStorage, two threads) | **Directly relevant.** Proved that "where I stopped / open question / next move" is the right shape. Reused here. |
| `main` `sandbox/system/specimen.html` | "Air 02": cyber white `#fcfcfb`, ink `#202124`, grays `#8d9298`/`#cfd3d7`, Helvetica small caps | **The visual direction the brief describes.** Palette reused. |
| `main` `archive/` (Haven Keep, Institute, TOM) | Retired concepts: long horizon, low noise, custody, restraint | Values carried forward ("custody", "if this ever becomes loud, it has failed"). No code. |
| `main` `haven-year-32.html`, `haven-personal-*.html`, `full.html`, `onboard.html`, `astra/` | Earlier personal dashboard variants and checkpoints | Historical. Not reused. |
| branches `morning-system`, `codex/personal-context-demo`, `field-note-freeman`, `haven-home-system` | Morning dashboard, older personal app, Freeman field note, home-system archive | Not relevant to this product. Left untouched. |

### Longhand

**No Longhand code or document was found.** I searched every branch of `haven` and every branch of the other repositories this account can reach (`personal`, `colemanvii`, `kc`, `freeman`) for "longhand", and found nothing. `emberwing` could not be read from this session, and `freeman-maintenance` was not checked; neither seems likely. If Longhand exists, it is somewhere else: another account, a ChatGPT Site, a local folder, a note. Please point me to it and I will fold it in. Until then this experiment treats "Longhand" as the concept the brief describes: preserving original handwritten-quality writing, never altered.

### Technical conventions already established

- Static HTML/CSS/JS, no framework, no build step, no external requests (README: "No build step, package installation, external fonts, or network service is required").
- Session- or device-local storage. AGENTS.md: "No automatic ChatGPT synchronization or durable browser checkbox storage has been established."
- Explicit provenance and honesty about demo data (Cedar House labels its fictional data; personal README forbids fabricated progress or links).
- `main` may be connected to a Vercel deployment (`havensystems.vercel.app`, production branch unverified). Anything on `main` should therefore be treated as potentially public.

## 2. Recommendation: one repository, one product line

**Canonical repository: `colemanvii/haven` (private).** Do not create a Longhand repository or a second Haven app.

**Consolidated product: Haven is where you return to your thinking.** Its parts:

1. **Collections** — curated reading around a question, sources quoted exactly and linked (Experiment 001: Fear).
2. **Commonplace book** — your archive: writing, quotations, notes, questions, images. Immutable, with provenance and revisions. This is the "Longhand" principle.
3. **The desk** — where you write. No AI completion.
4. **Return** — bookmark and Cold Open (from `haven-001-return-loop`), plus rediscovery of earlier thoughts.
5. **Haven's voice** — commentary and suggested connections: separate, labeled, optional, read-only over your material.

**Architecture, now:** keep the repository's static, no-build pattern. Experiments live in `experiments/<number>-<name>/` on their own branches until a deployment target is settled. The data layer is already shaped for later growth:

- `store.js` — the only module that writes. Entries are append-only revisions. Edits need an explicit `USER_EDIT` authority and deletes need `USER_DELETE`. Collected passages cannot be revised. Import never overwrites.
- `connect.js` — read-only suggestion engine. It returns references and reasons, never text to put into an entry.
- `sources.js` — collection content as data, with a `kind`, translation, rights, read link and checked-against record for every passage.

**Architecture, later (only if Experiment 001 earns it):**

- A durable, private home for the archive: a file-based vault (a folder of Markdown or JSON you own, synced however you like) is preferable to a hosted database. It matches custody and the "no lock-in" instinct.
- An LLM may then write *commentary* and propose *connections* through the same read-only interface `connect.js` has. It must never be given a write path to entries.
- A real import of your existing writing, with original dates preserved (`writtenOn` already exists for this).

Keep the home-instrument prototype and the personal dashboard where they are. They are separate products under the same name. If that becomes confusing, rename the home prototype ("Haven Home") rather than move code.

## 3. What was built (Experiment 001)

`experiments/001-fear/` — open `index.html` via a local server (see README).

- **Read:** the question; six movements; 32 passages across Scripture, philosophy, literature and contemplative writing. 29 are exact quotations from public-domain editions and 3 are labeled paraphrases. Every passage carries translator, locator, rights and a link to the full text. All 35 quoted segments were checked mechanically against the source files (`tests/check-quotes.js`).
- **Four voices, kept visibly apart:** Source (exact quotation), Paraphrase, Yours, and Haven (commentary). Commentary hides with one control.
- **Collect:** one tap collects a passage exactly as printed. The commonplace book adds writing, notes, questions, quotations (with a "checked against source" flag) and images, and holds an "originally written" date for older material.
- **Reflect:** a quiet desk with optional Haven-written questions, drafts held in the browser, and no AI writing assistance. After you keep something, Haven may suggest passages it meets.
- **Return:** continue reading; a person-authored bookmark (where I stopped / open question / next time) with history; earlier thoughts that meet what you have read; your thread on fear; export and import.
- **Rediscovery demonstration:** a dated demonstration note (Sep 2025) about an unsent letter surfaces in the margin of Matthew 25:25, with its reasons shown. You can connect them in your own words, open the note, or dismiss it.
- **Immutability is tested** (`tests/store.test.js`). Entries are frozen when read, edits need an explicit user-authority token and keep prior revisions, and the suggestion engine provably leaves the store unchanged.

### Sources: what was verified, what was not

Verified word for word, against Project Gutenberg texts (via a GitHub mirror) and Standard Ebooks source repositories:

- 16 KJV verses
- Seneca (Gummere; Letters V, XIII, XXIV)
- Marcus Aurelius (Long; II.11, VIII.47, XII.1)
- Epictetus (Higginson; §5)
- Montaigne (Cotton/Hazlitt; I.17)
- Aristotle (Peters; III.7)
- Dostoevsky (Garnett, *Crime and Punishment*; Martin, *The Idiot*)
- Crane
- Shakespeare
- Hemingway (*A Farewell to Arms*, US public domain since 2025)
- Julian of Norwich (Warrack)

Paraphrased rather than quoted:

- **Kierkegaard and Merton:** the translations and texts are under copyright.
- **Tolstoy:** the Maude text could not be reached for checking from this session. The direct quotations are worth adding once checked against the CCEL or University of Minnesota text.

Checked and deliberately excluded (listed in the app's Sources page):

- The popular Marcus Aurelius misquotation ("It is not death that a man should fear…")
- "Courage is grace under pressure"
- The wording of Dostoevsky's 1849 letter, because translations vary and it was not verified
- The Ross translation of Aristotle, because it could not be reached

Limits of verification: the hosting sites (gutenberg.org, Wikisource, MIT Classics, CCEL) were blocked from this session. Text was checked against mirrors of the same files, and the reader-facing links point to the canonical hosts. Loeb section numbers for Seneca follow convention and are not printed in the checked text.

## 4. Honest assessment

### What works

- **The reading itself.** Placing scripture, the Stoics, novels and contemplatives in one sequence on one question is the strongest part. The movements argue with each other: Seneca's "cease to hope" against Psalm 27; Aristotle's well-ordered fear against Proverbs 9:10. A notebook, browser or ChatGPT does not give you this.
- **The provenance discipline.** Exact text, translator, rights and link on every passage, with misquotations named, makes this trustworthy in a way most quote sites and chat answers are not.
- **The margin.** Responding beside a passage, and finding an old thought surface there, is the right interaction. In the demonstration it feels like a commonplace book that answers back without speaking for you.
- **The immutability rule.** It is enforced in code and tested, not merely promised.

### What is missing or weak

- **Your material.** None of your actual writing is here, so the rediscovery loop is only demonstrated, not proven. Its value depends entirely on a real archive. This is the single biggest gap.
- **Durability.** Storage is one browser on one device, with JSON export. That is acceptable for a test and unacceptable as a home for years of writing.
- **The connection engine is simple.** Word and theme matching is explainable and honest. It will miss deeper connections and occasionally offer shallow ones. A language model could do better, but only behind the same read-only boundary.
- **Images:** they can be added and kept, but they are not yet placed beside passages, and they have no connections.
- **One collection.** Haven's promise is to follow questions across disciplines *over time*. A second question (for example, attention, or work) is needed to test whether threads cross collections.
- **Typography relies on system fonts** (Iowan Old Style on Apple devices; Palatino or Georgia elsewhere). It reads very well on a Mac or iPhone and is merely good on Windows and Android. Self-hosting one serif would fix this without a network dependency.
- **No real-world test yet** of the brief's own test: twenty minutes, by choice, instead of a notebook.

### Does it deserve further development?

**Yes, conditionally.** The reading and collecting half is already better than the alternatives for this purpose. The returning half is the real bet, and it cannot be judged until it holds your own words.

The next step is small and decisive: import ten to twenty genuine pieces of your existing writing on fear, with their original dates, and use the collection three times over two weeks. If an earlier thought of yours surfaces somewhere you did not expect, and you write something you would not otherwise have written, build the durable vault and a second collection. If not, keep the collection format and drop the rest.
