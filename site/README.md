# Tangerine — "First Light"

A responsive one-page site for Tangerine, the independent creative studio led by Cole Calfee. This is a **second creative vision**, built to be compared with the first website concept. It is self-contained in `site/` and does not touch the legacy root (`index.html`, `personal/`, etc.).

**Not deployed.** Nothing here changes any Vercel setting, production branch or domain.

## The idea

The site is one day, and it doesn't explain itself.

A single tangerine disc is the sun. It rises from a horizon set on the baseline of *keeping.*, crosses the page, and sets on the footer's last rule. The background moves through the hours with it.

| Hour | Section |
|---|---|
| 06:00 dawn | *Work worth keeping.* An independent creative studio led by Cole Calfee, working with a select few clients. |
| 10:00 day | Practice: six disciplines, shown as the six segments of a cut tangerine. The fruit turns slowly through them, and the sun sits at its heart. |
| 12:00 noon | *Few, by design.* One line. |
| 17:40 golden hour | The page turns tangerine: *Begin a conversation*, and an email address. |
| 21:00 night | *A place to keep what matters and return to it.* The sun sets. |

## Simplified from v1

The first version (commit `c5a92b8`) also had a long "between" statement, a six-step method dial, five principles, a studio/clients section, a mobile index menu and an email composer. These were removed to keep the site small and confident. They are in git history if any piece is wanted back.

## Craft notes

- **Fonts:** Fraunces, Hanken Grotesk and JetBrains Mono, self-hosted under the SIL Open Font License (licences in `assets/fonts/`).
- **Colour:** one hue, tangerine `#F25A28`, against warm neutrals that change with the hour. Tones are CSS `@property` tokens, so the colour transitions are smooth.
- **No tracking or dependencies:** no cookies, analytics, third-party requests, framework or build step.
- **Fallbacks:** reduced motion is respected, and without JavaScript every section still paints its own hour.

## Preview locally

```sh
cd site
python3 -m http.server 8000
# open http://localhost:8000
```

## Before launch

1. **Email:** replace the placeholder `hello@tangerine.example` (a domain reserved for examples) in `index.html`, in both the `href` and the link text.
2. **Share image:** set an absolute `og:image` URL once a domain is chosen.
