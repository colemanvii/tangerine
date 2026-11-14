# TANGERINE / SHARED WORKING BRIEF
**Updated:** 13 November 2026
**For:** Claude + ChatGPT + founder
**Repository:** https://github.com/colemanvii/tangerine
**Current review:** https://github.com/colemanvii/tangerine/pull/9
**Working branch:** `feature/tangerine-media-001`
**Code scope:** `/media/` — do not replace the repository root or historical Haven material.

## What happened tonight
Tangerine moved from a creative practice to a proposed **independent media company**. The first flagship property is **The Briefing**: a beautifully composed, sourced daily newspaper delivered by email, designed to be something its own founder looks forward to receiving every morning.

**North star:** *A more beautiful way to pay attention.*
**Philosophy:** *In cyberspace as it is in heaven.*
**Influence:** TBPN's daily ritual, personality, cultural immediacy, relationships, and media-network ambition — **not** its visual identity or a replica broadcast.

The company may later publish conversations, original films, and field notes. Do not invent programs or interview episodes that have not been made.

## The experience we're building
- A **static**, typography-led media site that feels more like a sophisticated independent publication than a SaaS interface.
- A genuinely excellent email edition, ideally delivered at **7:00 a.m. Eastern** once a real distribution system has been configured.
- One consequential lead story with context; a concise radar; a meaningful conversation or idea; a surprising cultural discovery; and a thoughtful closing note.
- Disciplined hierarchy, assured voice, warm character, and enough visual distinctiveness to be unmistakably Tangerine.
- No gratuitous motion, external JS dependency, rounded cards, gradients, fake live tickers, decorative filler, generic stock art, or interface clutter.
- Respect desktop **and** phone reading, accessibility, fast loading, permanent issue URLs and search indexing.

## Non-negotiable editorial integrity
The prototype contains news-like claims from an earlier AI-generated briefing. **Do not assume these are true** merely because they appear in an existing page or are attributed to a source. Verify each substantive claim directly against credible, dated reporting and primary sources; clearly distinguish reporting, attributed allegations, interpretation, and original commentary. Remove or replace anything that cannot be verified. Do not invent quotes, interviews, reports, timestamps, bylines, photographs, or sources. Where a story is a demonstration, label it **editorial design specimen**, not actual news. Preserve visible correction history for factual editions.

## The current code
An initial static media-site implementation exists under `media/` in PR #9: homepage, Briefing, sample article pages, programming, about, identity study, an email specimen, stylesheet, fruit drawing, and a generator script.

**Treat this as a first edition to improve, not as something to throw away.** Read the repository's `AGENTS.md`, `README.md`, `IDENTITY.md`, `media/README.md`, and inspect the rendered pages before making visual changes. The existing `/media/` work is isolated deliberately to protect the old root homepage.

The recent Gemini proposal contains useful technical recommendations (zero radius, static pages, readable type) but its replacement homepage is generic, its placeholder links are not publication-ready, and its fabricated quote and unsourced news-like claims are **not publishable**. Do not commit that draft verbatim.

## Division of labor / collaboration protocol
**Claude:** Work directly in the repo on visual design, HTML/CSS templates, issue/page architecture, build tooling, responsive polish, and the email layout. Inspect actual renders and test links. Commit all implemented code to the working PR branch or a clearly identified follow-on branch and report commit SHAs.

**ChatGPT:** Develop editorial direction and original programming, research/verify stories and claims, evaluate design in context, and review Claude's changes in GitHub. Contribute focused code/docs changes when useful. Distinguish what has shipped from what is merely planned.

**Founder:** Choose the subjective creative direction, approve public-facing editorial/brand choices, and authorize deployment/email send.

**Working agreement:** GitHub is the shared source of truth. Every work session starts by pulling the current branch and inspecting changed files; every finished change ends with a commit. Avoid overwriting each other's changes. Prefer small reviewable units over parallel uncoordinated redesigns. No one should claim the other assistant is working asynchronously unless explicitly launched in its own environment.

## Claude's immediate task
1. Inspect `media/` as it exists in the PR, including desktop + phone captures.
2. Identify three things to **preserve**, three to **improve**, and any factual content requiring correction.
3. Make the **homepage and Briefing reading layout** extraordinary without rebuilding from scratch. Prioritize proportion, typography, storytelling, hierarchy, visual pace, and elegant mobile composition.
4. Remove placeholder/fabricated editorial claims or visibly mark the affected material as a specimen pending independent verification.
5. Test navigation, 320px–1440px widths, keyboard navigation, semantics and accessible contrast.
6. Commit the first focused improvement and provide its SHA and changed-files summary.
7. Do **not** deploy automatically or enable subscription/email sending; those are separate decisions and require real infrastructure.

## Next milestone
A single **Edition 002 design-quality milestone**: one beautiful homepage + one completely sourced, pleasurable complete daily briefing + one compatible HTML email generated from the same approved article/issue content.

**Success test:** Would you genuinely enjoy receiving and reading this tomorrow morning? Does it feel unmistakably Tangerine rather than a lightly customized template?
