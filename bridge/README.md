# Tangerine bridge — TABLET atop ChatGPT

A ChatGPT app (MCP server) and the live TABLET, on your own machine. You talk in your one ChatGPT conversation; ChatGPT relays decisions, commitments, projects, people, ideas and open questions — with the exact words — and TABLET reflects them within a second. Design and research: [`docs/synthesis-002/INTEGRATION.md`](../docs/synthesis-002/INTEGRATION.md).

**Not deployed. Not connected to ChatGPT until you choose to connect it.** Nothing leaves 127.0.0.1 unless you open a tunnel.

## Run

```sh
node bridge/server.mjs                     # Node 20+; no install step
```
It prints the live TABLET link (with its key) and the MCP endpoint. Data: `private/bridge/tangerine-store.json` (git-ignored).

## Start from your existing conversation (once)

```sh
node bridge/backfill.mjs ~/Downloads/conversations.json                    # list
node bridge/backfill.mjs ~/Downloads/conversations.json --pick 3 --as "Studio"
```
Keep the export outside this repository. Re-running brings in only new turns.

## Connect ChatGPT (your decision)

1. Tunnel to the bridge, e.g. `cloudflared tunnel --url http://127.0.0.1:4330` or `ngrok http 4330`.
2. Restart with `TANGERINE_PUBLIC_URL=https://<tunnel-host> node bridge/server.mjs`.
3. ChatGPT (web) → Settings → Apps / Connectors → Advanced → **Developer mode** → create an app with URL `https://<tunnel-host>/mcp/<key>`, no authentication.
4. In your conversation: talk as usual, or say “update Tangerine”. Confirm the write when ChatGPT asks.

Stop the tunnel to disconnect. The key is a shared secret; regenerate it by deleting `private/bridge/bridge.key`.

## Tools

| Tool | Who calls it | Does |
| --- | --- | --- |
| `tangerine_update` | ChatGPT | Relay new items with verbatim quotes and `said_by`. Yours are placed; ChatGPT’s suggestions wait. |
| `tangerine_view` | ChatGPT | Read-only: NOW, NEXT, open loops, decisions, projects. |
| `tangerine_undo`, `tangerine_keep` | The inline card only | Undo a change; keep a suggestion. |

## Tests

```sh
node --test bridge/tests/*.test.mjs        # protocol + rules (12)
node bridge/tests/bridge.e2e.mjs           # inline card in an MCP Apps host + live TABLET (16)
```
