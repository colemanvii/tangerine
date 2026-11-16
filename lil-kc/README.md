# Lil KC

A character archive within Tangerine. This is the approved, canonical **master character reference**, not a disposable concept study.

## Master artwork

**File:** `lil-kc-master-2026-11-16.png`  
**Date archived:** November 16, 2026  
**Format:** PNG, 1536 × 1024  
**SHA-256:** `9b9687e5ad8cff0267dc6625883b60dda8ff215c5eb40bb5d778128d35306690`

The artwork is preserved **unchanged, byte for byte** from the image supplied for archiving. Later variants should never overwrite this file.

## Character essentials

Lil KC is a courageous, vulnerable, and unmistakably adorable little Black boy. His enormous soft-edged afro, oversized red bandanna, wide eyes, tiny mouth, expressive body proportions, warm palette, and irregular ink lines give him his personality.

In this master composition, he charges **toward danger** with his dagger extended while holding a little red heart **close and protected** behind him. That emotional contrast is the character's center: brave enough to confront the world, gentle enough to protect his heart.

**Protect:** his innocence, little swagger, warmth, hand-made imperfection, and silhouette. Avoid overly exact facial rendering, glossy vector polish, and generic cartoon expressions.

## Future work

Put boxer versions, other poses, bitmap exports, animation tests, and other experiments in `studies/` or `exports/`; do not replace the master.

**Source / credit:** archived from the user-supplied image on November 16, 2026. Do not infer or invent creator credits or public licensing.

## Animation library

Open `index.html` in a browser. It shows the master, plays each animation take, compares any two side by side (or a take against the master), and shows which takes are approved.

- **The record** is `takes.js`: one entry per take with its files, who or what made it, date, provenance and status.
- **Status** is `under review`, `approved` or `not approved`, and is decided by the creator only. Choices clicked in the page are kept in that browser; they become the record when written into `takes.js` (with `decision: { date, note }`).
- **Study 001** is `animation/001-the-heart/`, preserved. Do not overwrite it.

### Adding a take (for example an image-to-video test)

1. Make a new folder `takes/<number>-<short-name>/` and put the **original file exactly as received** in it. Never re-encode or rename over it; put any converted copy beside it.
2. Add a `README.md` there with the tool and version, date, the input image used, the full prompt and settings, and who ran it.
3. Append an entry to `takes.js` with `kind: "video"` (mp4/webm), `"image"` (animated webp/gif) or `"frames"`, a `path`, an optional `poster` image, and `status: "under review"`.

This repository is public. Do not add a take here unless it is cleared to be public.
