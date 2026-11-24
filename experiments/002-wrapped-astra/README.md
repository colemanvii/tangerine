# Tangerine / Wrapped 001 (Astra study)

A read-only, local-first ChatGPT conversation report. Cyber white, grey, and tangerine.

## Run

Open `index.html` in a modern browser. Optionally serve this directory with `python3 -m http.server 4173 --bind 127.0.0.1` and visit `http://127.0.0.1:4173`.

Use **Open conversations.json** to select the `conversations.json` file from your ChatGPT data export. No upload occurs: the browser reads this file locally, in memory. Reloading clears the report. Demo data is invented, labeled, and never mixed with imported content.

Run the offline logic tests with `node --test tests/*.test.mjs` (Node 20+). The importer and report do not require a build step or network connection.

## Definitions

- **Messages:** human messages on each conversation's current path (when available), or unique nodes if branch history is unavailable.
- **Conversations:** conversations with at least one human message in the selected date window.
- **Active days:** distinct dates containing a human message.
- **Estimated active window:** computed from exported message timestamps, NOT app foreground time, reading time, or verified screen time. Group messages into sessions at gaps over 30 minutes; approximate active minutes with one minute per session plus the shorter of each message-to-message interval and five minutes. This can undercount or overcount actual attention.
- **Months:** counts of human messages (not total time spent).
- **Top conversations:** ranked by human message count within the selected period.
- **Recurring words:** exact normalized word frequencies from human-authored text, with a small stopword list; this is not semantic topic modeling.

Time zones, branch history, missing timestamps, deleted conversations, and export differences can affect totals. Some imported conversations may be skipped if unsupported. A report never proves how much time someone was actually looking at the screen.

## Privacy

No external requests, persistence, telemetry, or browser storage. The source text is not modified. Do not push ChatGPT exports or personal report contents to this or any other repository. Do not publish the page with personal data preloaded. A production service needs separate threat modeling, explicit consent, and security review.

## Scope

A functional experimental importer/report, not the complete Tangerine product. The other Haven/Tangerine branches and previous deployments are preserved untouched.