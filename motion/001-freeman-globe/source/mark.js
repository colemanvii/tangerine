/* Freeman Globe 001 — loads the original mark code, untouched, and exposes it.
   The artwork lives in ../assets/freeman-globe-mark.original.js (verbatim from Freeman
   Edition 001). Nothing in this file redraws it; it only reads it. */
(function (root) {
  "use strict";
  function load(src) {
    return new Function(src + "\n;return { RUNS, SW, SH, script, halo, TILT, MER, PAR, globeMask };")();
  }
  root.FreemanMark = { load };
  if (typeof module !== "undefined") module.exports = root.FreemanMark;
})(typeof globalThis !== "undefined" ? globalThis : this);
