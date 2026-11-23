# Lil KC Studio

A private, local-first animation workspace for hand-drawn Lil KC motion studies:
locked model reference, storyboard with approvals, 12 fps exposure-sheet
timeline, light table with onion-skin and reference overlay, side-by-side
revision comparison, and FFmpeg export (MP4, GIF, PNG sequence, optional WebM).

**This folder holds the tool only.** Projects — client artwork, references,
storyboards, drawings and exports — live in `lil-kc/private/projects/<id>/`,
which is git-ignored because this repository is public. The tool does not
touch the public website and binds to `127.0.0.1` only.

## Run

```bash
python3 lil-kc/studio/studio.py
```

Open <http://127.0.0.1:8612/studio/>. Needs Python 3 with Pillow, and `ffmpeg` on the path for export.

Offline, read-only copy of a project (one HTML file, opens anywhere):

```bash
python3 lil-kc/studio/bundle.py ms001-little-show-off
```

Command-line export, identical to the Export tab:

```bash
python3 lil-kc/studio/kc_export.py lil-kc/private/projects/ms001-little-show-off r00a-animatic mp4 gif png
```

## How timing works

A revision is an exposure sheet: an ordered list of drawings, each held for
`x` frames at the project rate (12 fps). `x2` is "on twos" (1/6 s). Export
writes each drawing once per exposed frame and encodes at 12 fps. Nothing is
interpolated or tweened, so what plays on the light table is exactly what is
exported.

Revisions with status `draft`, `for review` or `needs changes` can be retimed
and saved. `approved` and `archive` revisions are locked; use
**Save as new revision** to branch them. Replacing a drawing means pointing
its `src` at a new PNG (any size; it is fitted to the canvas, transparent
backgrounds recommended).

## Project layout (private)

```text
lil-kc/private/projects/<id>/
  project.json        model lock (sha256 per reference), storyboard, approvals, revisions
  model/              read-only reference images
  storyboard/         beat panels
  revisions/<rid>/    drawings, one PNG per drawing
  exports/            generated files + export-log.jsonl
  tools/              project-specific generators
```

On load the server re-hashes every model reference; the Model tab shows
**LOCK BROKEN** if any file changed.

## Keys (Timeline)

Space play/pause · ←/→ frame · `,`/`.` drawing · `+`/`−` exposure · `O` onion skin · `R` cycle reference overlay
