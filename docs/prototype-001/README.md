# Tangerine — Product Prototype 001

**Conversation → synthesis → TABLET → writing.** A working local prototype in which a ChatGPT conversation becomes reviewable, sourced, navigable objects on a spatial canvas.

Status: **study, for review.** 10 November 2026. Not merged, not deployed. No production system, Vercel setting, `index.html`, legacy runtime or `personal/` file was changed.

---

## 1. Audit — what existed, what was kept

| Where | What it is | Used here |
| --- | --- | --- |
| `study/tangerine-foundation-001` | `core/store.js` (append-only, SHA-256 fingerprinted originals), `core/index.js` (read-only explained index), `system/tangerine.css` (cyber-white tokens, the mark), `app/` Whiteboard + Archive + Return + Writing desk with crash-safe drafts, validated restore. 15 unit + 45 browser checks. | **The base.** Merged with history; every existing test still passes. |
| `study/tablet-conversation-canvas-001` | Foundation renamed to TABLET; `docs/TABLET.md` — the capture pipeline (source → extract → reconcile → review → place → persist), minimum graph model, acceptance sequence. | **Merged. Followed as the spec.** The prototype implements its steps 1–3 and 6. |
| `study/tablet-cyber-white-001` | `BRIEF.md`: NOW / NEXT / OPEN LOOPS, white-iPod interaction philosophy, one orange signal. | **Merged.** The panel follows it. |
| `study/tangerine-wrapped-astra-001` | Local `conversations.json` parser that follows the active branch (`current_node → parent`). | **Adapted** into `core/capture.js` (branch not modified). |
| `main` | `SYNTHESIS.md`, `INSTRUMENT.md` direction; legacy Haven runtime. | Direction followed; runtime untouched. |

Nothing was deleted or rewritten. Foundation screenshots and docs remain in place.

## 2. What was built

```
core/capture.js     paste / conversations.json → turns; turn keys for "only what's new"
core/synthesis.js   turns → proposals with evidence; reconcile; check ChatGPT's own synthesis
core/store.js       + conversation sources (fixed), decision/action/question objects,
                      evidence on objects, link origin, proposals collection (IndexedDB v3)
app/app.js          + Capture view, review, orbital placement, zoom, NOW/NEXT/OPEN LOOPS,
                      evidence in the inspector, writing connected to TABLET
app/demo.js         + a fictional sample conversation
app/tests/          + synthesis.test.cjs (17), prototype.e2e.cjs (49 checks)
```

### 1 · Conversation capture — `02 Capture`
- **Paste** any part of a ChatGPT conversation. “You said: / ChatGPT said:” (the web copy), `You:` / `ChatGPT:`, `User:` / `Assistant:` and Markdown-bold labels are recognised; unlabelled text becomes a *note*.
- **Open `conversations.json`** from ChatGPT’s own data export, then choose the one conversation to bring in. Its message timestamps are kept; pasted text gets no date (none is assumed).
- **One ongoing conversation.** Captures belong to a named thread. Paste the whole conversation again next week and only the turns that are new are kept (“11 turns already captured · left out”).
- The capture is kept as an original: fingerprinted, **never revisable**, removable only by explicit request.
- Tangerine says plainly on the page that it has no connection to ChatGPT.

### 2 · Synthesis
The local extractor (deterministic; no model, no network) proposes **projects, people, ideas, decisions, next actions and open questions**, plus links between them. Every proposal shows:
- the **exact sentence** it came from, and the turn (click → the transcript scrolls to it; every source sentence is marked in the transcript);
- **who said it** — *You said*, *ChatGPT suggested*, *From a note* — and *tentative* where it is conditional or a suggestion. A ChatGPT suggestion is never filed as your commitment; if you later say you’ll do it, your words take over and both remain as evidence;
- **update, not duplicate**: things already on TABLET are recognised by name (“R. Moreau”, “Moreau”, “Desk clock”) and offered as new evidence for the existing card;
- links stated in a sentence vs. **inferred** from the project being discussed (drawn dashed);
- time words kept as words: “by Friday” stays “by Friday”.

“*The one thing this week is…*” is proposed as **NOW**.

**Ask ChatGPT to synthesize…** offers the other route: copy a prompt into the same ChatGPT conversation, paste back its JSON. Tangerine **checks every quote against the capture**; a quote it cannot find becomes an *unverified, tentative* proposal. ChatGPT’s output is never trusted as evidence on its own.

Review: **Accept · Edit · Dismiss · Undo · Restore**, or *Accept N you stated* for the clear statements in your own words. Undo removes a new card, or only the evidence an update added.

### 3 · TABLET
- New object kinds on the canvas — **Decision** (D), **Next action** (A, with done/open), **Open question** (Q) — beside Project, Person, Idea, Source. A small ring marks anything that came from conversation.
- Accepted objects are **placed in orbit** around the card they relate to. Existing positions are never moved; manual placement survives later captures and reloads.
- Drag, arrow keys, link by hand, search, **zoom (−, fit, +)**. Selecting a card outlines its neighbours.
- The inspector shows **From the conversation**: the quotes, speaker, capture, turn, and *Open in conversation*.
- With nothing selected, the panel answers **NOW / NEXT (3) / OPEN LOOPS / DECISIONS / last capture**.

### 4 · Writing
- **Write about this** on any object opens a draft connected to it. Beside the page: the object, *its words in conversation* (with **Insert as quotation**, attributed “— me / ChatGPT, in conversation”), and what surrounds it on TABLET.
- Drafts autosave and survive reloads and crashes (foundation behaviour). **Keep** makes an original and pins it beside its object on TABLET.

### 5 · Material and motion
Cyber-white field, hairlines, mono metadata, one tangerine signal: the NOW mark, the focused turn when returning to source, and a brief ring on each newly arrived card. Motion is three short, purposeful moments: the mark’s hand sweeps once while a capture is read; new cards **swing into place about the card they orbit** (≈0.6 s, staggered); the arrival ring fades. Otherwise everything is still. `prefers-reduced-motion` removes all of it.

## 3. Run it

```sh
python3 -m http.server 4321 --bind 127.0.0.1     # from the repository root
```
Open <http://127.0.0.1:4321/app/#capture> → **Use the sample conversation** → **Read it** → **Keep and synthesize** → **Accept 18 you stated** → **See on TABLET**.

To try your own conversation: paste it, or open your `conversations.json`. It stays in this browser (see privacy below).

### Tests
```sh
node --test app/tests/*.test.cjs          # 32: store, drafts, restore, capture, synthesis
node app/tests/whiteboard.e2e.cjs         # 22 (foundation, unchanged)
node app/tests/writing.e2e.cjs            # 23 (foundation, unchanged)
node app/tests/prototype.e2e.cjs [--shots docs/prototype-001/screens]   # 49
```
`prototype.e2e.cjs` runs the acceptance sequence from `docs/TABLET.md`: capture → review (dismiss, edit, accept) → objects on TABLET with evidence and stated/inferred links, NOW from the conversation → inspect → back to the exact turn → drag, mark done, reload → second capture of the same conversation keeps only the new turn and updates (not duplicates) → undo of a new object and of an update → ChatGPT synthesis with one fabricated quote flagged → connected writing, quotation, reload, keep, pinned beside its object → search → export → restore into a fresh browser → remove demonstration → tablet / portrait / phone without horizontal scroll → no console errors.

## 4. Screens
`docs/prototype-001/screens/`: 01 paste · 02 review · 03 accepted · 04 TABLET after capture · 05 evidence · 06 back to the source turn · 07 second capture + ChatGPT synthesis · 08 connected writing · 09 portrait · 10 landscape · 11 phone.

## 5. Honest limits

- **No ChatGPT access.** Nothing is synced, scraped or fetched. Capture is paste or a file you choose. This is the “explicit handoff” `INSTRUMENT.md` asks for until a permissioned integration is tested.
- **The extractor is rule-based.** It is good on plain first-person statements (“I need to…”, “I’ve decided…”, “Should I…?”, “my friend Ines…”) and transparent about every proposal, but it will miss things phrased indirectly and occasionally propose noise. Review is the safeguard; *Ask ChatGPT to synthesize* is the stronger route, with quote checking as its safeguard. A model behind the same read-only, evidence-required boundary is the obvious next step — deliberately not done here (no keys, no network, public repository).
- **Browser storage only.** IndexedDB on one device and address. Export/restore now carries captures, proposals and evidence. A private, durable vault (foundation milestone 005) is still required before real material is relied upon.
- The **weekly paper sheet** from the cyber-white brief is not built in this prototype.

## 6. Privacy

The repository is public. The sample conversation and every demonstration record are **fictional** and labelled; *Remove* in the footer clears them (and their capture and proposals) without touching anything you made. No real conversation, person or project is committed. Exports (`tangerine-*.json`) are git-ignored. Do not commit a `conversations.json`.

## 7. Suggested next steps
1. Use it for a week on real, self-selected excerpts (locally) and note what the extractor misses.
2. Decide on the private vault (005) so real captures have a durable home.
3. Put a language model behind `core/synthesis.js`’s boundary: proposals only, verbatim evidence required, quotes verified exactly as `fromBundle` does today.
4. Weekly sheet: NOW / NEXT / OPEN LOOPS to paper.
