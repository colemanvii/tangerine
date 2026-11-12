# Tangerine — "First Light"

A complete, responsive website for Tangerine, the independent creative practice led by Cole Calfee. This is a **second creative vision**, built to be compared with the first website concept. It is self-contained in `site/` and does not touch the legacy root (`index.html`, `personal/`, etc.).

**Not deployed.** Nothing here changes any Vercel setting, production branch or domain.

## The idea

**The site is one day at Tangerine.**

A single tangerine disc is the sun. It rises from a horizon set exactly on the baseline of *keeping.*, crosses the page as you scroll, and sets on the last rule of the footer. The page moves through the hours with it: dawn pearl, morning, cyber-white noon, a full-tangerine golden hour, plum dusk and night. Each section is an hour, and the masthead clock and mark record the time. The mark's hand makes one full turn over the day and comes back to twelve.

The circle appears in three forms, which hold the composition together:

| Hour | Section | The circle becomes |
|---|---|---|
| 06:00 | **First light**: *Work worth keeping.* | the sun, rising |
| 08:00 | **Between**: a statement that fills in as it is read | — |
| 10:00 | **Practice**: one fruit, six segments | the **fruit**: six disciplines as six segments; the sun settles into its heart |
| 12:00 | **Few, by design**: the select-client model | the sun at zenith |
| 15:00 | **Method**: Listen → Find the story → Give it form → Build the system → Grow it → Return | the **dial**: the sun is its pivot, and the hand returns to twelve |
| 17:40 | **Principles** (golden hour, the page turns tangerine) | a pale low sun |
| 19:30 | **Studio**: led by Cole Calfee, and who we work with | the sun setting |
| 21:00 | **Begin a conversation**: an inquiry composer | night |
| — | Colophon: *A place to keep what matters and return to it.* "Return to first light ↑" | the sun's cap on the final rule |

## Craft notes

- **Type:** Fraunces (display; its soft and "wonk" axes are used for italics), Hanken Grotesk (text) and JetBrains Mono (time and metadata). All three are self-hosted under the SIL Open Font License; licences are in `assets/fonts/`. No external requests.
- **Colour:** one hue. Tangerine `#F25A28` is the sun, the active segment and the dial hand. Everything else is warm neutrals that change with the hour. Tone tokens are registered with CSS `@property`, so whole-page transitions are smooth.
- **Interaction:** the practice explorer responds to hover, click, tap and arrow keys. On phones it becomes an accordion. The method dial is driven by scroll. The composer builds an email in the visitor's own mail app, so there is no backend and nothing is stored.
- **Respect:** no cookies, analytics or third-party scripts. `prefers-reduced-motion` removes scroll-linked motion and entrances. Without JavaScript every section paints its own hour and all content is readable. Includes skip link, visible focus, 44px touch targets and print styles.
- **No framework or build step:** `index.html`, one CSS file, one JS file (~20 KB unminified).

## Preview locally

```sh
cd site
python3 -m http.server 8000
# open http://localhost:8000
```

## Before launch: needs your input

1. **Contact email.** `hello@tangerine.example` is a deliberate placeholder (`.example` is a reserved domain). Replace it in `index.html` in two places: `data-email` on the form, and the "Or write directly" link.
2. **Copy review.** All copy is written from the practice description and Tangerine's published point of view (README). There are no client names, case studies, numbers or biography claims, because none were provided and none should be invented. Please check the discipline descriptions and the Studio paragraph in particular.
3. **Selected work.** There is no portfolio section yet. If you want one, it fits between *Practice* and *Few, by design*, and the fruit/segment language extends naturally to project tags.
4. **Portrait (optional).** The Studio section is typographic by design, but it can take a single portrait.
5. **Share URL.** Set an absolute `og:image` URL once a domain is chosen.

## Files

```
site/
  index.html
  assets/css/site.css
  assets/js/site.js
  assets/fonts/        (woff2 + OFL licences)
  assets/favicon.svg
  assets/og.png        (1200×630 share image)
  docs/screens/        (reference captures for comparison)
```

## Verification performed

- Browser checks (Playwright/Chromium):
  - discipline selection by click, segment click and keyboard, with `aria-expanded` kept in sync
  - the dial reaches *Return*
  - composer validation, focus on the first invalid field, and the composed `mailto:` subject and body
  - night tone and clock at the page end
  - phone index menu: open, focus, Escape and link-close
  - phone accordion
  - reduced-motion and no-JS rendering
- No horizontal overflow and no console errors at 320, 390, 820, 1440 and 1920px widths.
