# Tangerine — studio site

A one-screen website for Tangerine, the independent creative studio led by Cole Calfee. This is a **second creative vision**, built to be compared with the first website concept. It is self-contained in `site/` and does not touch the legacy root (`index.html`, `personal/`, etc.).

**Not deployed.** Nothing here changes any Vercel setting, production branch or domain.

## The idea

The site is built like Tangerine's own instruments (the TABLET and foundation studies):
- cyber-white field, black type and monospace labels;
- hairline rules;
- one tangerine signal marking the single action (■ Begin);
- a work field beside a side panel;
- no motion.

The panel says only what is needed: who leads the studio, that it works with a select few clients, the six disciplines, and how to begin.

The field holds one diagram, an **orbit**. The tangerine dot is the sun, placed by the visitor's own clock: 06 at the horizon on the left, 12 at the top, 18 on the right. By day it is solid and above the line; at night it is hollow and below. It is computed on the device, and nothing is sent or stored.

## History

The earlier, fuller "First Light" versions (a scroll-driven day) are in git history at `c5a92b8` and `b092e3a`.

## Craft

- **Shared design system:** uses the same tokens as `system/tangerine.css` on the foundation study: `#FAFBFB` paper, `#181A1B` ink, `#DFE2E2` hairline, `#F25A28` tangerine.
- **System fonts only:** Helvetica Neue / system sans and system mono.
- **No dependencies:** no framework, build step, cookies, analytics or third-party requests. About 1 KB of JavaScript.
- **Without JavaScript:** the page renders fully; the orbit shows the sun at noon.

## Preview locally

```sh
cd site
python3 -m http.server 8000
# open http://localhost:8000
```

## Before launch

1. **Email:** replace the placeholder `hello@tangerine.example` (a domain reserved for examples) in `index.html`, in both the `href` and the link text.
2. **Share image:** set an absolute `og:image` URL once a domain is chosen.
