# Tangerine atop ChatGPT — integration study 002

Status: **study, for review.** 10 November 2026. Nothing deployed. No public endpoint opened. Prototype 001 and every earlier branch preserved.

**Correction this answers:** Tangerine is not a separate conversation-management app. You live in one ongoing ChatGPT conversation. Tangerine makes that conversation’s world visible through TABLET, without daily copy-paste, imports or upkeep.

---

## 1. What ChatGPT actually allows (research, November 2026)

| Route | What it gives | Supported? | Verdict |
| --- | --- | --- | --- |
| **ChatGPT app / plugin (MCP server + Apps SDK)** | Tools the model calls *inside your conversation*; an interactive view rendered inline (MCP Apps, `text/html;profile=mcp-app`); the app receives exactly the arguments ChatGPT sends | **Yes.** Custom apps through *developer mode* on paid plans (web). Apps were folded into “plugins” in 2026; the MCP-based mechanism is the same. | **Primary route.** |
| ChatGPT data export (`conversations.json`) | Your full history, as a file, on request (emailed link) | Yes, manual | **One-time backfill**, not a daily loop. |
| Custom GPT actions (OpenAPI) | Model calls your API from a *custom GPT* | Yes | Works, but only inside that GPT — not your ordinary ongoing conversation. Secondary. |
| OpenAI API (Responses / Conversations) | Your own conversations created through the API | Yes | These are *not* your ChatGPT conversations. Using it means Tangerine becomes the chat client — the opposite of the brief. Rejected. |
| An API to read ChatGPT history or memory | — | **No.** No supported endpoint exists for consumer conversation history or memory. | Not assumed. |
| Undocumented backend endpoints / scraping chatgpt.com / browser extension reading the page | Everything, until it breaks | **No** (unsupported; terms risk; violates `docs/TABLET.md`) | Rejected. |
| Shared links | A public snapshot | Yes, public | Publishes private material. Rejected. |
| Enterprise Compliance API | Workspace logs | Enterprise only | Not applicable. |

Facts that shape the design:

- **An app never sees the conversation.** It sees only what the model puts in a tool call. Tangerine therefore asks ChatGPT for the *exact words* behind each item and who said them, and labels everything as “relayed by ChatGPT”.
- **Write tools ask for confirmation by default** in developer mode (the payload is shown before it runs). Read-only tools (`readOnlyHint`) do not. Reports conflict on whether personal Plus/Pro accounts get write tools in every rollout; Business/Enterprise/Edu are documented as supported. **Test on your account.**
- **ChatGPT must reach the app over public HTTPS.** For a personal prototype that means a tunnel from your own machine (ngrok, Cloudflare Tunnel, or OpenAI’s secure MCP tunnel). Opening one is a deployment decision — yours. I have not opened one.
- **Whether ChatGPT calls a tool unprompted** depends on the model; the tool description asks it to update at natural pauses, and a one-line custom instruction reinforces it (§4). Expect to occasionally say “update Tangerine”.

Sources: [OpenAI — Introducing apps in ChatGPT and the Apps SDK](https://openai.com/index/introducing-apps-in-chatgpt/) · [OpenAI Help — Building with the Apps SDK](https://help.openai.com/en/articles/12515353-building-with-the-apps-sdk) · [OpenAI — Developer mode guide](https://developers.openai.com/api/docs/guides/developer-mode) · [OpenAI — Apps SDK quickstart](https://developers.openai.com/apps-sdk/quickstart) · [OpenAI — Deploy your app](https://developers.openai.com/apps-sdk/deploy) · [MCP Apps specification (SEP-1865), modelcontextprotocol/ext-apps](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx) (read in full) · secondary: [coworker.ai — ChatGPT MCP plans and limits](https://coworker.ai/blog/chatgpt-mcp), [usecarly — ChatGPT MCP servers 2026](https://www.usecarly.com/blog/chatgpt-mcp-servers/), [VentureBeat on developer mode](https://venturebeat.com/dev/openai-adds-powerful-but-dangerous-support-for-mcp-in-chatgpt-dev-mode). `developers.openai.com` was blocked from this build environment, so OpenAI’s docs were checked through search excerpts; the MCP Apps spec was read directly. **Re-check the developer-mode menu names on your account.**

## 2. The experience

```
 You, in your one ChatGPT conversation           Your desktop
 ─────────────────────────────────────           ────────────
 talk as usual ──► ChatGPT notices a decision,   TABLET (live) redraws within a second:
                   a commitment, a person …      new cards swing into orbit around
                   calls tangerine_update ─────► what they belong to; NOW / NEXT /
                   (quotes + who said it)        OPEN LOOPS stay current.
                ◄── an inline TABLET card:
                    what changed · NOW · NEXT
                    Undo / Keep, one tap
 “what’s on my plate?” ──► tangerine_view (read-only) ──► the card, and ChatGPT answers from it
```

**No new habit.** You don’t open Tangerine to put anything in. ChatGPT does the organizing; TABLET shows it; you correct with one tap (Undo, Keep) in the conversation or on TABLET.

**Rules carried over from Prototype 001.** Every card keeps the exact words and who said them. *You said* → placed. *ChatGPT suggested* → held as a suggestion until you Keep it. Existing projects and people gain evidence instead of duplicates. “By Friday” stays words, never a date. Your arrangement on TABLET is never moved. Undo is exact: a new card comes off; an update gives back only what it added (and reopens an action it marked done).

**Starting state.** A one-time backfill from your ChatGPT export brings the history of your ongoing conversation in, under the same rules, so TABLET starts where you are.

## 3. What was built (`bridge/`)

| File | Role |
| --- | --- |
| `bridge/server.mjs` | MCP server over Streamable HTTP (JSON responses), no dependencies. Tools: `tangerine_update` (write), `tangerine_view` (read-only), `tangerine_undo` / `tangerine_keep` (callable only by the inline view). Serves the inline view as an MCP Apps resource, the live TABLET, and its store API + change stream. Binds 127.0.0.1; key required; foreign web origins refused. |
| `bridge/tangerine.mjs` | Relay → TABLET: keeps each relay as a fixed original, reconciles and places via `core/synthesis.js` and `core/layout.js`, undo/keep, the current picture, backfill. |
| `bridge/widget.html` | The inline TABLET card: NOW, what changed (Undo / Keep), NEXT, an orbit of projects and new items, “Open TABLET ↗”. MCP Apps handshake; `window.openai` fallback; light/dark; no external resources. |
| `bridge/backfill.mjs` | One-time import of the ongoing conversation from `conversations.json`, on your machine. Refuses files inside the repository. |
| `bridge/file-store.mjs` | The store as one JSON file in `private/bridge/` (git-ignored). |
| `core/layout.js` | Orbital placement, shared. |
| `core/store.js` | + `httpBackend` / `openLiveStore` (additive). |
| `app/app.js` | + `?live` boot: TABLET reads the bridge’s store and redraws when a relay arrives (never under your cursor or sentence). Without `?live`, unchanged. |

Tests: `node --test bridge/tests/*.test.mjs` (12: auth, origin, initialize, tool metadata, resource, update rules, later update without duplicates, done/now, undo, keep, malformed input refused, view, live change stream, backfill) and `node bridge/tests/bridge.e2e.mjs` (16: live TABLET redraws on relay, inline card handshake in a simulated MCP Apps host, Undo/Keep from the card reflected on TABLET, evidence, your placement preserved). All earlier suites still pass (32 unit, 22 + 23 foundation, 49 Prototype 001).

Screens (`docs/synthesis-002/screens/`, fictional): 01 the card in a conversation (simulated host) · 02 TABLET live · 03 evidence · 04 TABLET after the conversation.

## 4. Connecting a real ChatGPT account (security revision, v0.3)

Step-by-step instructions, the two connection paths and the one-item live test are in [`bridge/README.md`](../../bridge/README.md). In short:

- **No secret in any URL, tool result or the conversation.** The earlier `/mcp/<key>` address and `?key=` TABLET link are gone (a key in a path now gets a plain 404).
- **Path A — OpenAI Secure MCP Tunnel** (preferred; OpenAI documents custom tunnel connections for Business, Enterprise and Edu workspaces): `tunnel-client` runs `node bridge/stdio.mjs`, which relays to the bridge over loopback with the local key read from disk. Nothing listens publicly.
- **Path B — development tunnel + OAuth 2.1** (fallback): discovery (`/.well-known/oauth-protected-resource`, authorization-server metadata), Client ID Metadata Documents or dynamic registration, authorization code + PKCE S256, an approval code shown only on your computer, hashed tokens, one-hour access, rotating refresh, one-click revoke at `/connect`. Through the tunnel only `/mcp` and OAuth answer; TABLET, its store and `/connect` do not exist there.
- **TABLET** signs in with a one-time, two-minute link (`node bridge/open.mjs`) that sets an HttpOnly, SameSite=Strict cookie.
- **`node bridge/doctor.mjs [--public https://…]`** checks all of it before you connect.

Verified here (fictional data): 18 protocol/security tests, 21 browser checks including Tangerine’s consent page with the approval code, ChatGPT’s token exchange, and the live test rehearsed over both paths: *one fictional decision → TABLET → Undo from the inline card → gone from TABLET*.

**Not verifiable from this environment:** your plan, the exact menu names on your account, whether Secure MCP Tunnel is offered to you, and whether your plan permits write tools. The live test in `bridge/README.md` §3 answers all four in five minutes.

## 5. Honest limits

- **Not zero-touch.** ChatGPT decides when to call the tool, and developer mode asks you to confirm each write. That is one click, inside the conversation — far less than copy-paste, but not nothing.
- **ChatGPT chooses what to relay and which words to quote.** Tangerine cannot verify a quote against a conversation it cannot see; the relay is kept and labelled as such. The backfill path *is* verifiable against the export.
- **Single user.** OAuth here authorizes one person’s bridge; there are no accounts or scopes beyond “use Tangerine’s tools”.
- **Not yet run against a live ChatGPT account.** The protocol is tested against the MCP / MCP Apps specifications with a simulated host. Plan availability of write tools and exact menu names must be confirmed on your account.
- **Private vault still pending:** the store is a JSON file on one machine, with export/restore.

## 6. Next

Run the live test (`bridge/README.md` §3) on your account. Only after it passes: the one-time backfill of your ongoing conversation, then no more imports.
