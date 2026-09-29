# Gemini Build Brief — Haven Morning System

You are implementing the next pass of **Haven Morning**, a private orientation surface.

Do not redesign the premise. Refine and strengthen the existing files in this folder.

## Core thesis

Haven is a private Human OS: a beautiful, structured transcription of one person's working mind.

Chat is where thinking happens out loud. Haven is where useful thinking resolves into form.

For the morning experience, the governing product law is:

> **Haven knows a lot. It shows very little.**

The screen should feel like someone quietly laid out the few things a person needed to remember before entering the world.

## Emotional target

Not:
- SaaS
- dashboard
- second-brain app
- terminal cosplay
- cyberpunk console
- quantified-self tracker
- productivity game

Closer to:
- early Macintosh restraint
- Scandinavian architecture publication
- private instrument
- typed field sheet
- morning newspaper
- warm paper artifact

The interface should feel underdesigned on purpose, but highly judged.

## Frozen visual rules

1. One continuous surface.
2. No cards or tiled containers.
3. No rounded UI elements.
4. No shadows, blur, glow, or gradients.
5. No pills or decorative status badges.
6. No decorative SVG icons.
7. No motion theater. State changes snap.
8. Use alignment, whitespace, type, and hairline rules for structure.
9. Keep metadata sparse.
10. Avoid excessive terminal punctuation such as //, ::, [], ASCII framing, or hacker styling.
11. Warm mushroom paper: `#ECE8E1`.
12. Primary ink: `#1E1A17`.
13. Quiet text: `#7A7168`.
14. Rules: quiet ink around 35% opacity.
15. Preserve the annual compass as a subtle spatial anchor.

## Annual compass

The circular year is not a completion meter.

It should:
- show the twelve months quietly
- show one small dot for the current date
- contain no percentage
- contain no day-of-year number
- contain no progress arc
- contain no gamification
- work as an almost pre-verbal reminder: you are somewhere in time

## Morning hierarchy

The visible surface should contain roughly:

HAVEN
DATE

ORIENTATION
A short paragraph restoring context without trying to solve the user's life.

WORK
The primary meaningful work.

MAKE
A small act of creative participation.

PEOPLE
One relational thread worth tending.

READ
One brief passage or idea.

REMEMBER
One sentence worth carrying into the day.

ANNUAL COMPASS
Quietly present, visually subordinate.

Do not add sections merely because data exists.

## Product principle

A complex system may eventually exist underneath:
- Projects
- Decisions
- Threads
- People
- Notes
- Open Questions
- Commitments
- Last touched
- Confidence
- Next step
- What changed
- Record/history

But the morning interface should expose almost none of that ontology.

The surface is an act of editorial judgment.

## Interaction principle

Version 0 should be mostly read-only.

Do not add checkboxes, streaks, completion states, notifications, counters, or productivity controls.

If interaction is introduced later, it should feel closer to turning a page, opening a record, or acknowledging something than operating a task manager.

## Current implementation

The folder contains a deliberately dependency-free prototype:
- `index.html`
- `styles.css`
- `content.js`
- `app.js`

Refine these directly.

## Next task

Improve the prototype without increasing conceptual complexity.

Focus on:
1. typography and proportion
2. annual compass precision
3. responsive behavior
4. whitespace and reading rhythm
5. making the surface feel quieter, more elegant, and less obviously "designed"

Return:
- changed files
- a concise explanation of the decisions
- any visual rule you believe should be frozen after this pass

Do not add a framework unless there is a strong technical reason.
Do not add dependencies for visual polish.
Do not invent private user data.
