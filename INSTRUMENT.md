# Tangerine — The Personal Instrument

Status: **approved product direction for study; not a deployment authorization**  
Reference: **the first white iPod you could hold — white face, silver back, four red-lit buttons, and a deliberate wheel**.

## What Tangerine is

Tangerine makes beautiful, useful instruments for a creative life.

Not another feed, chatbot destination, productivity game, or dashboard. Tangerine should feel like an object worth owning: simple enough to understand immediately, precise enough to trust, and emotional enough to remember. Its first digital expression is **TABLET**, a personal panel that helps someone return to work and life outside a screen. An archive, writing desk, and personal website can share the same design language without becoming one bloated application.

**Product test: does it help you pay attention, then let you leave?**

## Synthesis as the layer above conversation

The newer [Synthesis Interface brief](SYNTHESIS.md) defines the wider product: ChatGPT is the conversational entry point; Tangerine synthesizes the useful context; TABLET can be its quiet, physical-feeling presentation surface. The ambition is **less thread and tab management, not another app to maintain**. Notion remains an explicit durable ledger, and Claude a separate build environment.

This is product intent, not a claim of automatic conversation access or synchronization. Keep the currently documented explicit handoff flow until a permissioned integration is tested.

## The object

The design reference is not the appearance of a current AI app. It is the sensation of encountering an early white iPod for the first time and discovering music through a beautifully resolved physical thing.

| Memory of the object | Tangerine translation |
| --- | --- |
| White face | A generous, clean, nearly white working field |
| Reflective silver back | Quiet metallic depth, silver edges, carefully considered material contrast |
| Four red illuminated controls | A very small vocabulary of red-to-orange signal marks; used only for active/important states |
| Deliberate wheel | Selection feels tactile, orbital, intentional; a wheel may be studied but should never make basic navigation harder |
| Music held in one object | A humane relationship to listening, photography, words, and memory |
| Very few decisions at once | A small number of clear functions, visible without hunting |

**Do not make an iPod replica.** Borrow the interaction discipline, scale of attention, material intelligence, and emotional clarity, not Apple logos or literal device trade dress.

## Visual direction

**Cyber. White. Orange. Panel. Static. Luminescent. Orbital.**

- Field: crisp white / cool ivory, with subtle metallic-silver depth. No muddy dashboard grey.
- Type: confident black/charcoal, clean and sharply legible. Whitespace does the heavy lifting.
- Signal: one precise vermilion/red-orange light, visually descended from the red-backlit controls. It marks selection or a genuine call to attention; never everywhere.
- Geometry: circles, orbital tracks, hairline rules, and instrument-like alignment, used sparingly.
- Light: *luminescent by contrast* — crisp white, reflective edges and restrained signal light. Avoid noisy glows, gradients and decorative animations.
- Motion: static by default. If movement improves orientation, keep it short, tactile and optional. Respect reduced-motion settings.
- Touch: generous targets, clear keyboard focus and simple controls. All functions must work without a wheel.

## First instrument — TABLET

A personal control panel, not a place to live. Its initial screen should answer:

1. **NOW** — the one thing that matters most.
2. **NEXT** — up to three real actions.
3. **OPEN LOOPS** — a compact list of things awaiting a decision or follow-up.
4. **WEEKLY SHEET** — one button to prepare a printer-friendly, pen-friendly page.

Open, orient, close. The weekly ritual is physical: review, write down commitments on paper, do the work in the world, return next week. Paper is the working contract, not a duplicate stream of alerts.

Keep Whiteboard, Archive, Return and Writing as distinct, quiet spaces behind the panel. Preserve original materials, provenance and reversible revisions. Never substitute synthetic summaries for original writing or photographs.

## Related surface — a personal website with sound

The personal site should feel like another Tangerine object: spare, deliberate, white/silver/red-orange, and alive through **music chosen by the visitor**. Explore a minimal play/pause / one-track listening mode, with visible controls and no surprise autoplay. Use only original, licensed or otherwise authorized audio; do not ship unlicensed recordings.

The website does not need a dashboard or the full TABLET workflow. The shared relationship is **material, interaction and taste**, not identical navigation.

## How the work moves

**ChatGPT (one conversation) → explicit captured decision / handoff → Claude (build and test) → TABLET (use briefly) → paper (act).**

Notion is a separate durable ledger for projects, decisions and references when explicitly recorded. There is currently **no verified automatic synchronization** between ChatGPT, Notion and TABLET; never imply that spoken thoughts just appeared on the panel.

Claude should treat this page as product intent and work from the bounded implementation brief on `study/tablet-cyber-white-001`. Do not expand scope based solely on a moodboard.

## Constraints and acceptance

- Keep private records and conversations **out of this public GitHub repository**.
- Current local prototype uses browser storage, not a cross-device vault. Preserve export/restore and clear limitations until a private durable backend exists.
- Never automatically publish, deploy, collect analytics, send notifications, or start media playback.
- No engagement loops, time-in-app incentives, streaks, gamification or compulsive task management.
- Design and implement one testable surface at a time. Preserve existing branches and legacy runtime.

**Acceptance:** In thirty seconds, a person can tell what matters, commit the useful part to paper, close TABLET, and get back to living.

---
This is a product-direction document, not a claim that the instrument or its synchronization is already built.
