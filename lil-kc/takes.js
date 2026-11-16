// Lil KC animation library — the record of takes and decisions.
// Add a take by appending an entry. Never edit or replace a take's original files.
//
// kind: "frames" (numbered PNGs; path uses %04d), "video" (mp4/webm), or "image" (animated webp/gif)
// status: "under review" | "approved" | "not approved"   (decided by the creator only)
window.KC_LIBRARY = {
  master: {
    file: "lil-kc-master-2026-11-16.png",
    archived: "2026-11-16",
    size: [1536, 1024],
    sha256: "9b9687e5ad8cff0267dc6625883b60dda8ff215c5eb40bb5d778128d35306690"
  },
  takes: [
    {
      id: "study-001",
      title: "Study 001",
      subtitle: "The Heart, rough motion test",
      kind: "frames",
      path: "animation/001-the-heart/frames/frame-%04d.png",
      frames: 36,
      fps: 12,
      poster: 21,
      made_with: "Claude, drawn in code from a tracing of the master",
      date: "2026-11-16",
      status: "under review",
      decision: null,
      provenance: [
        "Source folder: animation/001-the-heart/ (preserved, do not overwrite)",
        "Drawing 1 is a measured tracing of the master; no master pixels are reused",
        "New drawings: squeezed heart and fist, closed and half-closed lids, eyes on the heart",
        "Body, head, limbs, afro and bandanna are adjusted tracing",
        "Exports: exports/lil-kc-the-heart-rough-v01.webp and .mp4"
      ]
    }
  ]
};
