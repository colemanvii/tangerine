# TABLET / CYBER WHITE — Study 001

## Purpose
Build a quiet personal instrument that gets its owner **out of AI conversations and into the world**. This is a proposal for the existing Tangerine local prototype, not a new product launch. No deployment or production changes.

## Defining object — the first white iPod

The owner remembers the original object: **white front, silver back, four controls glowing red, and a deliberately tactile wheel**. The first time listening to music through it is the emotional benchmark. Build an instrument someone wants to hold, not another AI dashboard. This is an interface philosophy, **not a literal hardware replica**. Use white/cool ivory space, metallic restraint, one red-orange signal, geometric/orbital selection, and near-total stillness. Light should feel alive by contrast rather than animated chrome. Radial interaction is a study, not a prerequisite for accessibility or basic tasks.

The broader Tangerine product thesis is in [`INSTRUMENT.md`](https://github.com/colemanvii/tangerine/blob/main/INSTRUMENT.md). The **personal website** is a separate expression of this design DNA and should allow intentional, visitor-initiated music playback (only authorized audio); don't fold that functionality into the daily TABLET panel.

## Roles (one direction, no looping)
1. **ChatGPT = intake.** One conversational thread for capture, decisions, and concise handoffs. Do not assume a conversation is synced automatically to this app.
2. **TABLET = orientation.** The small, read-only-by-default surface for what matters **now**, the next real action, and what can wait. It is not a feed, conversation archive, or reflection engine.
3. **Claude = workshop.** Reads this brief and the existing study code, makes bounded, tested changes on a study branch, and reports what changed. The owner need not micromanage implementation here.
4. **Notion = ledger.** Durable project notes, decisions, relationships and references when explicitly saved. It is not the daily homepage and is not automatically synchronized until a real, verified integration exists.
5. **Paper = commitment.** Once per week, transfer selected next actions from TABLET onto one sheet of paper; work from that sheet in real life.

## Working rhythm
- **Any day:** Capture a thought in the one ChatGPT thread; sort it into a project or leave it as a note. Capture should not imply an automatic sync to TABLET.
- **Morning:** Open TABLET briefly, choose one real priority and up to two supporting actions. Close it.
- **During work:** Do the work. Don't get pulled back into organizing the system.
- **Weekly:** Print/write one page: one central priority, three real actions, open loops, and a little space for what was accomplished. Review at a consistent time; carry over only what still matters.
- **Rule:** If the panel creates new upkeep, notifications, or rumination, remove that feature.

## Interface / art direction
**Cyber. White. Orange. Panel. Static. Luminescent. Orbital.**

- White-to-cool-white architectural field; black precise type; one vivid signal orange.
- Extremely restrained circular/orbital geometry, luminous accents by contrast and careful edge treatment, not garish gradients or constant animation.
- Primarily **static**, calm, spare, legible on iPad and desktop.
- One-screen orientation where possible: **NOW / NEXT / OPEN LOOPS / WEEKLY SHEET**.
- Clear whitespace and typographic hierarchy. Prefer simple geometry to cards, dashboards, charts, gamification, status theatre, or decoration.
- Orange means the one thing requiring attention. Keep motion off by default.
- Weekly sheet must be genuinely printer-friendly (black ink, minimal waste) and usable with a pen.

## MVP behavior
- Reuse the existing Whiteboard / Archive / Writing foundations. Do not delete, rebrand, or overwrite original sources.
- Add a distinct **Panel** view or study surface, without replacing Whiteboard.
- Show a manually chosen current focus, up to three concrete next actions, and a short open-loop count/list. No automatically generated tasks or invented statuses.
- An explicit **Weekly Sheet** action produces a print-friendly version of the current selection. Print is user-initiated, never automatic.
- Allow manual review and confirmation before any handoff or synchronization.
- No infinite feed, activity metrics, streaks, motivational scores, or unsolicited prompts.
- A private and durable storage solution is needed before treating the panel as canonical across devices. Current IndexedDB-only data is device/browser-specific; backup/export warnings remain prominent.
- Do not import past conversations, private personal/project facts, images or secrets into a **public GitHub repository**.
- Do not claim Notion or ChatGPT synchronization until implemented and end-to-end verified.

## Claude handoff
Read `AGENTS.md`, `app/README.md`, `docs/foundation-001/PLAN.md`, and the study app first. Work on `study/tablet-cyber-white-001`; preserve the original foundation branch. Begin with a single screen that proves it makes one working day simpler. Run existing tests plus targeted view/print tests. Provide a local run command, screenshots, a clear privacy/storage note, and a short change log. **Do not deploy or merge without explicit approval.**

## Success test
Can the user look at this for 30 seconds, write the useful part on paper, close the screen, and go do the work? If not, simplify it.
