# Tangerine — studio site

A one-screen website for Tangerine, the independent creative studio led by Cole Calfee. This is a **second creative vision**, built to be compared with the first website concept. It is self-contained in `site/` and does not touch the legacy root (`index.html`, `personal/`, etc.).

**Not deployed.** Nothing here changes any Vercel setting, production branch or domain.

## The idea

Apple-style restraint: one object, one name, one sentence, one way in.

The page is a single centred column on a near-white field. The object is a thin ring with one tangerine dot, which is the sun placed by the visitor's own clock (noon at the top, midnight at the bottom). Below it: **Tangerine**, "An independent creative studio led by Cole Calfee.", one quiet line naming the six disciplines and the select-client model, and a single tangerine link, *Begin a conversation ›*.

## History

Earlier directions are in git history:
- `c5a92b8`: First Light, a scroll-driven day.
- `b092e3a`: First Light, simplified.
- `524ede7`: the instrument panel.

## Craft

- **System fonts:** Apple's own SF Pro on Apple devices, falling back to Helvetica Neue and system sans elsewhere.
- **No dependencies:** no framework, build step, cookies, analytics or third-party requests. The JavaScript is a few lines that place the dot.
- **Without JavaScript:** the dot rests at noon.

## Preview locally

```sh
cd site
python3 -m http.server 8000
# open http://localhost:8000
```

## Before launch

1. **Email:** replace the placeholder `hello@tangerine.example` (a domain reserved for examples) in `index.html`, in both the `href` and the link text.
2. **Share image:** set an absolute `og:image` URL once a domain is chosen.
