# Script-only homepage — archived 21 November 2026

`index.html` is the owner-approved script wordmark homepage that served https://ex-tangerina.com/ from 18 November 2026 (commit `476b361`, "Remove watch and restore approved script-only homepage") until Website V2 replaced it.

It is preserved unchanged, byte for byte (git blob `83353c591c32ac50644f94457f1cc746877b3a49`). Its history is reachable with `git log --follow archive/script-homepage-2026-11-18/index.html`.

The wordmark image embedded in it is also published, byte-identical, as `website/media/brand/tangerine-script.png` and is Website V2's mark.

`unreferenced/` holds files that were still deployed from `website/` at that commit but were no longer referenced by any page (leftovers of the Living Canvas and smartscreen studies, already preserved on the `archive/smartscreen-production-2026-11-18` branch). They are kept here rather than deleted.

**Rollback:** restore this file to `website/index.html` (or redeploy commit `476b361` in Vercel) to return the homepage to the script-only page.
