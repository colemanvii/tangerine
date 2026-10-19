# Haven 001 — Resumption Instrument

**Design study / October 19, 2026**  
**Status: thesis preserved, build deferred.**

## Product thesis

Haven is not where work happens. It is where you **return**.

Its core unit is a **thread**: a body of work with an intention behind it. Its core primitive is the **bookmark**: where the person left off, why it matters, and the next move. Its success metric is **time-to-resume**: elapsed time between returning to a thread and doing the actual work, without reconstructing context.

Haven carries intention across tools and across time. It is not intended to duplicate GitHub, ChatGPT, email, calendars, or project-management software.

## The hard problem

Documents and commits preserve what happened, but often not why, what was unresolved, or what the person was about to do. Software cannot reliably reconstruct that intent from artifacts alone. An honest bookmark must therefore be deliberately authored or explicitly confirmed by a person rather than fabricated by AI.

## First use case

**Thread:** Built for Generations (Freeman General Contracting)

A first bookmark would carry just enough to re-enter the project:

- **Intent:** Develop Built for Generations as an ongoing editorial initiative exploring craft, responsibility, resilience, success, and legacy, beginning with thoughtful conversations.
- **Where it stands:** The executive vision brief exists; the project still needs a realistic pilot scope and an initial conversation.
- **Open question:** What is the smallest credible first episode or conversation, and who should participate?
- **Next move:** Shape a one-page pilot with Gabe before adding more systems.
- **Source links:** Attach the real brief, decisions, and working materials rather than copying them into Haven.

These are a conceptual example, not a claim that a working bookmark system already exists.

## Bookmark / Cold Open loop

1. **Close:** At the end of a work session, record the intention, current state, one unresolved question, one concrete next action, and relevant links. Keep it short.
2. **Return:** Open the thread and read the bookmark first: the **Cold Open**.
3. **Resume:** Follow the next action into the existing tool where the actual work happens.
4. **Refresh:** Update the bookmark when the state of the work changes, not simply because time passed.

## Limits and test

This remains an unvalidated product hypothesis. Do not build a dashboard, accounts, integrations, agents, or a new deployment just to test it.

Start with one real thread and a manually authored bookmark. Test whether it materially reduces friction on several separate returns. Ask: **Did I resume useful work faster?** If not, simplify or stop.

## Relationship to this repository

This note preserves the October 2026 personal Haven 001 direction alongside the repository's older home-system experiments. It does **not** replace the existing prototype, modify the production app, or change any deployment configuration.
