# Tangerine

**A synthesis interface for ChatGPT.**

*Talk naturally. See what matters. Get back to making and living.*

Tangerine is a product concept for a visual layer atop ChatGPT. ChatGPT is where conversation happens; **Tangerine** is where permitted conversation context becomes a clear, source-grounded picture of the people, projects, ideas, decisions, relationships, and next actions that matter.

Its first interface is **TABLET**: a spatial, rearrangeable canvas for seeing connections without manually building a filing system.

> **The product promise:** One ongoing conversation. A living picture of your world. No extra organizational work.

## The intended experience

**CHATGPT → SYNTHESIS → TABLET → ACTION**

- **Talk.** Have a natural conversation in ChatGPT. Don't start a new thread, create a folder, or maintain a board just to think.
- **Synthesize.** With appropriate permission and source access, Tangerine proposes important people, projects, decisions, questions, commitments, and connections. It separates facts from suggestions and provides evidence.
- **See.** TABLET makes that context navigable: relationships on a spatial field, plus a quiet orientation to NOW, NEXT, and OPEN LOOPS.
- **Act and return.** Make, write, reconnect, decide, or leave the screen. The point isn't to spend more time managing software.

Tangerine is **not** a replacement chatbot, another task manager, or a prettier version of manually sorting ChatGPT exports.

## What exists today

**Prototype 001 is a working local study, not a live ChatGPT-connected product.**

On branch [`claude/upbeat-newton-p6gfp5`](https://github.com/colemanvii/tangerine/tree/claude/upbeat-newton-p6gfp5), the prototype includes:

- Manual capture of pasted ChatGPT conversations or a user-selected `conversations.json` export.
- Source-attributed proposals for projects, people, ideas, decisions, actions, and open questions.
- Review, correction, deduplication, and undo before anything appears on TABLET.
- A draggable, zoomable canvas with source evidence and links between objects.
- A writing desk connected to the objects and their original words.
- Local browser storage and export/restore, using fictional demonstration material in the public repository.

The prototype's documentation reports passing unit and browser acceptance suites; it has **not** been merged into `main` or deployed as the new product.

[Read the prototype documentation](https://github.com/colemanvii/tangerine/blob/claude/upbeat-newton-p6gfp5/docs/prototype-001/README.md)

**What does not exist yet:** automatic access to your ChatGPT conversations, continuous synchronization, a private cross-device vault, or a seamless embedded layer over the ChatGPT interface. A manual import workflow is an engineering bridge, **not** the intended final user experience.

## The immediate work

1. **Verify a supported, permissioned ChatGPT handoff or integration.** Investigate genuine capabilities before promising automatic conversation access. If a seamless overlay or real-time API isn't supported, describe the limitation clearly and design the lowest-friction authorized alternative.
2. **Protect real data.** Design a private durable store, user consent, retention/deletion controls, and transparent synchronization status before relying on real personal or client material.
3. **Prove one useful loop.** Authorized conversation → sourced synthesis → corrected TABLET context → a useful decision, connection, or piece of writing. Measure whether it reduces organizational effort.
4. **Refine the instrument.** Keep motion purposeful and subordinate to comprehension, following the approved Material studies and Tangerine visual language.

## Design language

**Cyber. White. Orange. Panel. Static. Luminescent. Orbital.**

Architectural white, sharp typography, careful proportions, quiet silver, minimal orange signals, and precise, restrained motion. The reference is the clarity of an exquisitely designed physical instrument, not a decorative imitation of another interface.

The Freeman, personal-site, and Material projects may share this sensibility without sharing the same screen layout or product purpose.

## Source of truth and safeguards

- [`SYNTHESIS.md`](SYNTHESIS.md) — product thesis, interaction requirements, and limits.
- [`INSTRUMENT.md`](INSTRUMENT.md) — visual and interaction principles.
- [`AGENTS.md`](AGENTS.md) — implementation boundaries for coding agents.
- [TABLET conversation-canvas specification](https://github.com/colemanvii/tangerine/blob/study/tablet-conversation-canvas-001/docs/TABLET.md) — evidence, review, placement, and source fidelity.

This repository is **public**. Never commit personal conversation exports, confidential source material, credentials, unpublished writing, or real private records. The current `main` branch retains older Haven/Tangerine work and deployments; do not equate this README or the prototype branch with a production cutover.

---

*Tangerine · A place to keep what matters and return to it.*
