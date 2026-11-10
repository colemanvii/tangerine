# Tangerine — The Synthesis Interface

Status: **product direction / design brief, 9 November 2026. Not a claim of an implemented integration or authorization to deploy.**

## Definition

**Tangerine is an interface that sits atop ChatGPT. It's a synthesis interface.**

People think in conversations. Life and work, however, unfold across people, projects, ideas, decisions, and things that need doing. ChatGPT can be the conversational entry point; Tangerine should turn the useful parts of those conversations into a coherent, navigable picture without asking the person to maintain another filing system.

**Talk naturally. See what matters. Get back to living and making.**

## The problem to solve

A desktop full of separate ChatGPT threads, Dia tabs, notes, and project boards makes context feel scattered and stressful. Reorganizing the same thoughts across multiple apps is work, not relief.

The product must remove that organizational burden, not move it to a prettier interface.

## Layers and roles

1. **Conversation — ChatGPT.** A primary place to think, ask, talk, explore, and make decisions. The interface should not demand a new conversation for every topic.
2. **Synthesis — Tangerine.** A calm working view that connects topics across conversations and approved sources, shows continuity, and identifies what needs attention.
3. **Durable records and execution.** Notion can hold explicit decisions and project records; GitHub holds product code and specifications; Claude can be a build-and-test environment. These are roles, not automatic integrations.

Notable may remain a comfortable capture surface; Dia may remain a browser. Neither should require a parallel thread-management ritual. Tangerine is **not** another chatbot, browser, task manager, or Notion clone.

## What synthesis means

The interface should answer, with traceable source context:

- **NOW:** What actually deserves attention?
- **NEXT:** What are the few real, agreed next actions?
- **OPEN LOOPS:** What is unresolved, waiting, or promised?
- **CONTEXT:** Which projects, people, ideas, and works are connected?
- **DECISIONS:** What has been decided, by whom, when, and on what basis?
- **RETURN:** What earlier material is worth revisiting without losing its original form?

These are *views of one underlying context*, not six databases the person has to fill out.

## Interaction rules

- **One place to begin.** On desktop, opening Tangerine should relieve the need to open a cluster of Dia threads.
- **Synthesis before storage.** Detect and suggest connections; do not force the person to choose folders or create boards as a prerequisite for thinking.
- **Progressive disclosure.** Show the most useful orientation first. Let someone inspect the underlying evidence when they want it.
- **Grounded and correctable.** Distinguish verbatim source, user-confirmed decision, derived inference, and an unverified suggestion. Provide a way to fix or dismiss erroneous synthesis.
- **No false continuity.** If an earlier conversation, tool, or app has not been accessed, say so. Never imply that all chat history is visible.
- **Quiet, beautiful, usable.** Preserve the Personal Instrument / TABLET design principles: white field, precision, restraint, minimal notifications, no compulsive engagement loop.
- **Originals are preserved.** Summaries and links do not overwrite source writing, photographs, conversations, or notes.

## First bounded proof

A credible first version can be small:

1. Ingest a **small set of explicitly authorized, user-selected** notes or conversation excerpts, retaining source links and timestamps where available.
2. Extract a reviewable set of people, projects, decisions, commitments, and connections; clearly mark uncertain interpretations.
3. Present **NOW / NEXT / OPEN LOOPS** above a searchable or browsable context map.
4. Let the person confirm, edit, or dismiss suggested records and return to the original source.
5. Test the desktop workflow: open one interface, understand the current picture in 30 seconds, then close it.

The existing TABLET study is a **possible presentation surface** for this synthesis; do not replace or deploy the legacy runtime merely because this direction is recorded.

## Integration reality

There is **no verified automatic synchronization** here among ChatGPT, Tangerine, Notion, Notable, Dia, or Claude. Ordinary GitHub code does not gain access to a person's ChatGPT conversations or memory. A future implementation must first establish which authorized export, connector, API, or user-selected capture method is actually available, and what permissions, freshness, and deletion controls it supports.

Until then, design and test with synthetic examples or deliberately selected material held in an appropriate private environment. Do not add conversation transcripts, personal records, credentials, or client details to this **public** repository.

## Success and failure

**Success:** The person can talk naturally, return to Tangerine, see an accurate and useful synthesis, and know what to do next without managing threads.

**Failure:** Tangerine requires maintaining a second collection of folders, duplicating Notion, visiting more tabs, or trusting unsourced AI assertions.

The organizing should be done by the system, subject to human correction. Not by the person.
