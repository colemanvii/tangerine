# Tangerine bridge — TABLET atop ChatGPT

A ChatGPT app (MCP server) and the live TABLET, on your own computer. You talk in your one ChatGPT conversation; ChatGPT relays decisions, commitments, projects, people, ideas and open questions — with the exact words — and TABLET reflects them within a second. Design and research: [`docs/synthesis-002/INTEGRATION.md`](../docs/synthesis-002/INTEGRATION.md).

**Not deployed. Nothing is reachable from outside this computer until you connect it yourself.**

## Security, in one paragraph

No access key or token is ever placed in a URL, a tool result, the inline view or the conversation. On this computer, the bridge is reached with a local key read from `private/bridge/bridge.key` (mode 600) and sent only as a header over loopback. Through any tunnel, that key does nothing: ChatGPT must hold an OAuth 2.1 token (PKCE), which it gets only after you type a six-digit code that appears *only* on this computer. Tokens are stored hashed and expire in an hour (refresh rotates). TABLET, its store and `/connect` never answer through a tunnel; TABLET signs in with a one-time link (two minutes, single use) that sets an HttpOnly, SameSite=Strict cookie.

## 1 · Start

```sh
node bridge/server.mjs        # Node 20+; no install step. Keep this window open: it shows each relay.
node bridge/open.mjs          # opens TABLET (one-time sign-in link)
node bridge/doctor.mjs        # checks everything before you connect
```

## 2 · Connect ChatGPT — choose the path your account allows

First check your account (ChatGPT on the web): **Settings → Security and login** (or **Apps / Connectors → Advanced**, depending on rollout) → **Developer mode** on. Then **Plugins (or Apps) → + → Create / Add custom MCP server**. If the form offers **Connection: Tunnel**, use path A. If it offers only a URL, use path B.

### A · OpenAI Secure MCP Tunnel (preferred; documented for Business, Enterprise and Edu workspaces)
Nothing is exposed publicly; the connection is outbound from your computer.
1. In the OpenAI platform, create a Secure MCP Tunnel and install OpenAI’s `tunnel-client` (follow OpenAI’s current instructions; they change).
2. Configure tunnel-client to run the stdio server: command `node`, args `<path to this repo>/bridge/stdio.mjs`. (The bridge from step 1 must be running.)
3. In ChatGPT’s create form: **Connection → Tunnel**, choose the tunnel. Authentication: **None** — the tunnel is private to your workspace, and the stdio relay authenticates to the bridge with the local key.

### B · A development tunnel with OAuth (fallback, e.g. Plus/Pro)
This opens a public HTTPS address that forwards to the bridge. Only `/mcp` and the OAuth endpoints answer there, and `/mcp` requires a token only you can approve.
1. `cloudflared tunnel --url http://127.0.0.1:4330` (or `ngrok http 4330`). Note the `https://…` address.
2. Restart the bridge with it: `TANGERINE_PUBLIC_URL=https://<tunnel-host> node bridge/server.mjs`
3. `node bridge/doctor.mjs --public https://<tunnel-host>`
4. In ChatGPT’s create form: URL `https://<tunnel-host>/mcp`, authentication **OAuth** (ChatGPT discovers everything itself).
5. ChatGPT opens Tangerine’s consent page. Type the six-digit code shown in the bridge window (or at `http://127.0.0.1:4330/connect`). Deny if you didn’t start it.
6. Disconnect any time: `/connect` → *Disconnect everything*, or stop the tunnel.

## 3 · Live test — one fictional item, before any private history

1. In a new ChatGPT chat with Tangerine enabled, say: **“Tangerine test: I have decided to name the fern Ida. Please update Tangerine.”**
2. Confirm the write if ChatGPT asks. — *Write tools are supported on your account if this succeeds.*
3. The TABLET card appears in the chat; TABLET on your desktop shows the card within a second. The bridge window prints `ChatGPT → Tangerine … added decision “…”`.
4. Press **Undo** on the card in ChatGPT. The card leaves TABLET; the bridge prints `… → Undo`.
5. Say **“What’s on my TABLET?”** — ChatGPT uses the read-only view.

If step 2 fails because ChatGPT says the tool can’t write on your plan, the read-only view still works, and Tangerine needs another write route; tell me what ChatGPT said.

## 4 · Then: your one ongoing conversation

Optional once: `node bridge/backfill.mjs ~/Downloads/conversations.json` (list) → `--pick <n> --as "<name>"`. After that, no imports: keep talking. Optional custom instruction in ChatGPT: *“When I make a decision, commit to something, finish something, or mention a project or person that matters to my work, update Tangerine with the exact quote.”*

## Tools

| Tool | Who calls it | Does |
| --- | --- | --- |
| `tangerine_update` | ChatGPT | Relay new items with verbatim quotes and `said_by`. Yours are placed; ChatGPT’s suggestions wait. |
| `tangerine_view` | ChatGPT | Read-only: NOW, NEXT, open loops, decisions, projects. |
| `tangerine_undo`, `tangerine_keep` | The inline card only | Undo a change; keep a suggestion. |

## Tests

```sh
node --test bridge/tests/*.test.mjs        # 18: protocol, rules, local/tunnel/OAuth security, stdio relay, backfill
node bridge/tests/bridge.e2e.mjs           # 21: inline card in an MCP Apps host, live TABLET, consent + approval code, the live test rehearsed
```
