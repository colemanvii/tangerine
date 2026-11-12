# Tangerine — studio site

A one-screen website for Tangerine, the independent creative studio led by Cole Calfee. It is self-contained in `site/` and does not touch the legacy root (`index.html`, `personal/`, etc.).

**Not deployed.** Nothing here changes any Vercel setting, production branch or domain.

## The page

One symbol, one name, one sentence, one way in.

> **Tangerine**
> An independent creative studio led by Cole Calfee.
> Creative direction and business building.
> A few clients at a time, for a long time.
> Begin a conversation ›

## Wordmark

The wordmark is **Newsreader Display** (Production Type, SIL Open Font License), set at opsz 72 / weight 400 and outlined to vector paths. It is hand-spaced:
- tracking −20/2000 em;
- T–a −55, so the *a* tucks under the arm;
- r–i +10 and i–n +5, to open the stems;
- g–e −10, e–r −5 and n–e −5.

Outlining means it looks identical on every device and needs no font download. `tools/wordmark.py` regenerates `assets/wordmark.svg`; the exact parameters are in the script's header.

An editorial serif gives the name a voice (a publisher, an atelier, a person) while everything around it stays quiet in the visitor's system sans (SF Pro on Apple devices).

## Symbol

A hairline ring with one tangerine dot: the sun, at the visitor's local time.
- **Dial:** noon at the top, marked by a small grey index; midnight at the bottom; the dot moves clockwise through the day.
- **Proportions:** tied to the wordmark width *w*: ring diameter 0.24 *w* (about 1.5× the cap height), with 0.15 *w* of air before the name.
- **Motion:** happens once and for a reason. On arrival the dot travels from midnight to now (about 1–2 s, easing to rest), so the ring reads as a day rather than an ornament. After that it keeps real time, about a quarter of a degree per minute. Reduced-motion settings place it directly.
- **Accessibility:** the symbol is labelled, and its tooltip gives the visitor's time.
- **Without JavaScript:** the dot rests at noon, on the index.

## Colour

| Token | Use |
|---|---|
| `#FBFBFB` | paper |
| `#1D1D1F` | wordmark, contact link |
| `#424245` | positioning line |
| `#6E6E73` | supporting text and footer (4.9:1) |
| `#C7C7CC` | ring |
| `#AEAEB2` | noon index |
| `#F25A28` | the sun and the chevron only, never text |

The contact link is now ink (about 16:1 contrast) instead of tangerine text (about 3:1).

## Studies

`studies/index.html` compares the three explored directions, full-screen and stacked:

- **A. Helvetica Neue Medium.** Ring above, plain copy. Neutral and exact, but anonymous.
- **B. SF Pro Display Semibold, lowercase.** The ring becomes a horizontal lockup, with copy about long-term partnerships. Native-feeling, but SF Pro is licensed only for Apple platforms, so it cannot become a logo, and it falls back on Windows and Android.
- **C. Newsreader, outlined.** Implemented.

A and B use installed fonts, so they render as intended only on Apple devices.

## Placeholder email

`hello@tangerine.example` is **not a real address** (`.example` is a reserved domain). It is marked in `index.html` with an HTML comment, a `data-placeholder-email` attribute and a tooltip. Replace the `href` before launch.

## Preview locally

```sh
cd site
python3 -m http.server 8000
# open http://localhost:8000 and http://localhost:8000/studies/
```

## Footprint

- `index.html` is about 7 KB including the inline wordmark.
- CSS is about 3 KB and JavaScript about 1.5 KB.
- No web fonts, framework, build step, cookies, analytics or third-party requests.

## History

Earlier directions are in git history:
- `c5a92b8`: First Light, a scroll-driven day.
- `b092e3a`: First Light, simplified.
- `524ede7`: the instrument panel.
- `fb11caa`: the first Apple-like version.
