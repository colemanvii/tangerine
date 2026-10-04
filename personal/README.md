# Personal Haven update workflow

Cole speaks; Codex maintains the page.

## Source structure

- `personal/index.html`: canonical self-contained personal dashboard, including CSS and JavaScript. Edit its visible content for add/change/complete/delete requests.
- `personal/README.md`: this workflow and deployment map.
- `personal/CHANGELOG.md`: concise record of meaningful content changes.
- `astra/`: historical collaboration checkpoints; do not use as the current dashboard source.
- Root `index.html`, `app.js`, `styles.css`: existing home-system concept, preserved.
- Other branches: older personal experiments. Do not edit multiple versions to simulate synchronization.

## Update procedure

1. Read the latest canonical HTML and this workflow. Resolve which URL Cole is using before deploying.
2. Apply explicit instructions. Use stable checkbox IDs. Mark complete rather than delete unless deletion is requested. Do not invent deadlines, payment status, progress, or conversation URLs.
3. Preserve the established visual design on content-only edits. Keep the snapshot concise; avoid new sections unless needed.
4. Update the actual content timestamp, never label the current clock as a content refresh.
5. Check HTML, duplicate IDs, changed text, and any JavaScript changes. Check layout when content density changes.
6. Commit the source and short changelog. Publish that exact source through the selected host.
7. Verify the deployment and changed content. Report “saved” if only committed; say “live” only after verification.

## Content rules

Current state + next concrete action + real source link when available. Unknown fields stay unknown. Ideas are not commitments. Waiting items should say what they wait on. Do not assume all ChatGPT conversations are automatically synchronized. Browser checkbox state is currently session-only; it is not a durable GitHub update. Cole's chat instructions establish durable completion.

## Deployment map (04 Oct 2026)

| Surface | Source / connection | State |
| --- | --- | --- |
| Canonical personal source | main: personal/index.html | Maintained here; deployment migration pending |
| Vercel: https://havensystems.vercel.app/ | Production branch/root not verified in this session | Do not claim a GitHub commit updates this URL |
| ChatGPT Site: https://haven-personal-1994.colecalfee.chatgpt.site | Site ID appgprj_6ac123c73f70819189e5031f59efcb4e; separate Sites source repository | Private Site; publication must use Sites workflow |
| codex/personal-context-demo | Older Morning implementation; last observed commit 6bf90898dd92e002501346e1055fa7a3ba82fa6a | Preserve until hosting connection is verified |
| morning-system | Older generic Morning prototype | Historical experiment |

Next deployment work must connect the chosen existing host to the canonical source, preserving its audience and current approved design. Never create another Haven deployment to avoid resolving this mapping. Do not silently overwrite a more recent live design with an older checkpoint.

## Privacy

Repository visibility was verified private on 04 Oct 2026. Preserve privacy. Never deploy personal contents publicly based merely on a source update request.
