# Tangerine Studio — Design No. 03

**Status:** Design study, 17 November 2026. Not approved for production, not on the main Tangerine domain (`noindex`).
Design No. 02 is untouched: it lives on Vercel (deployment `dpl_7NyzPTzftaqWpBkuhySkFmW5FQW4`) and on the
`design/tangerine-studio-v2` branch.

Open [index.html](index.html) in a browser. One self-contained file: HTML, CSS, JavaScript and SVG drawing.
Fonts load from Google Fonts.

## Direction: 90% restraint, 10% mischief

**Tangerine. We build brands.** The page is one long sheet of bright paper. The typography is from an old book:
the Fell Types, with their bumpy 17th-century edges, set at full width for the wordmark. Small labels use a wide
industrial grotesk, a nod to Industrial Study 004. Graphite, white and one tangerine orange.

The mischief is in exactly three places.

1. **The full stop is a tangerine.** It's a small hand-drawn character, the descendant of V2's blinking bitmap fruit.
   It blinks, watches your pointer, and its line wobbles slightly ("line boil"), like an old cartoon. It shows up
   three times: as the hero's full stop, sitting on a fruit crate, and peeking over the footer.
2. **The branding iron.** A branding iron hangs on a nail beside "We build brands." Its tag says *Please do not
   touch.* Pick it up and every click or tap burns Tangerine's maker's mark into the page, with a scorch, an ember
   and a little smoke. No two burns look alike. The tag changes its mind as you go ("Oh well." → "You're a
   natural." → "That's plenty." → "We should talk."). The footer counts the brands you've built and offers to
   *erase the evidence*. Esc or the button at the bottom hangs the iron back up. Links don't fire while you're
   holding it.
   - Try to brand the tangerine and it **jumps out of the way. It has legs. Nobody knew.**
   - Bring the iron close and it starts to sweat.
3. **Bedtime.** Between 10 pm and 6 am Georgia time the tangerine is asleep (closed eyes, drifting z's), and the
   clock line says so. Pick up the iron and it wakes up.

## What changed from V2

| V2 | V3 |
| --- | --- |
| Every section composed as a magazine spread, with a label system everywhere | Fewer devices. The wordmark, the statement and four plates do most of the work |
| Explanations: principle plate, forms band, creed, journal notes | Cut. One paragraph about the studio, one table of particular affections, one way to say hello |
| Work shown only as conceptual drawings | **Plate I is real studio work.** Freeman Globe motion study 001, rendered live from the study's own code |
| The fruit as a 24-pixel bitmap, blinking | The fruit as a character with eyes, legs and opinions |
| Motion: draw-on lines and a bitmap lens | One interaction people won't expect, and a breathing line |

Kept from V2: orange and graphite on paper, the honest labelling, the time in Georgia written out in words, and
Joseph Martin's hat drawing.

## The work, and what is and isn't real

- **Plate I: Freeman General Contracting.** This is the *Freeman Globe* motion study (Motion 001,
  `claude/freeman-globe-reel-1oquxd`, 14 Nov 2026). The original mark code
  (`motion/001-freeman-globe/assets/freeman-globe-mark.original.js`, SHA-256 `a6e063f9…`) is embedded verbatim
  and drawn frame by frame: one turn per 16 s, in Freeman ivory and red. That study is marked "not approved client
  work". **Get Freeman's sign-off before this goes public.**
- **Plate II: Kashus Culpepper.** A show-card *type study* drawn for this page (wood-type condensed caps with a
  letterpress filter). Not a released poster, and labelled that way. Real work goes here.
- **Plate III: Joseph Martin.** V2's original hat drawing, labelled. Real photography goes here.
- **Plate IV: In the crate.** Space held, honestly, for work that can't be shown yet.

Facts on the plates come only from earlier studies in this repo (fields and forms). No dates, clients or
outcomes were invented. Contact is Instagram (`@ex.tangerina`), carried over from V2.

## Accessibility and behaviour

- `prefers-reduced-motion`: no line boil, smoke, ember, hop animation or underline draw. The globe starts paused
  (Play button). The iron still works.
- The iron is a real `<button aria-pressed>`. The brand counter is an `aria-live` region. With the keyboard, Enter
  on the button picks the iron up, Enter brands whatever has focus, and Esc hangs it up.
- Without JavaScript the page is complete: the wordmark keeps an ordinary full stop.
- Tested in Chromium at 1440 × 900 and 390 × 844 (touch): no horizontal overflow, no console errors. The iron was
  exercised with both mouse and touch.

## Before publication

- Freeman approval for the Globe study; real Kashus Culpepper and Joseph Martin work in Plates II–III.
- Font licensing: IM Fell English and Archivo are both OFL on Google Fonts. Consider self-hosting.
- The maker's mark (a tangerine with a T) is a study, not an approved logo (see `IDENTITY.md`).
- Deploy as its own Vercel project or preview. Never alias it to the main Tangerine domain:

      npx vercel deploy studies/tangerine-studio-v3      # preview URL only; no --prod
