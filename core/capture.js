/*
 * Tangerine — conversation capture.
 *
 * Turns material the person explicitly brings in (pasted ChatGPT text, or the
 * conversations.json file from ChatGPT's own data export) into a list of
 * turns: { role: 'user' | 'assistant' | 'note', text, t }.
 *
 * Tangerine has no access to ChatGPT. Nothing here fetches, scrapes or syncs.
 * A capture is exactly what was pasted or chosen, nothing more.
 *
 * One ongoing conversation: each turn gets a content key, so the same
 * conversation can be captured again next week and only the turns that are new
 * since the last capture are kept.
 *
 * The export reader follows the active branch (current_node → parent) the way
 * study/tangerine-wrapped-astra-001 established, so edited-and-regenerated
 * branches are not double counted.
 */
(function (root) {
  'use strict';

  const ROLE_LABEL = { user: 'You', assistant: 'ChatGPT', note: 'Note' };

  /* Speaker labels as they appear when a ChatGPT conversation is copied or
     written down. A label must end in a colon, or stand alone on its line
     ("You said:" in the web copy), so "You should…" is never a label. */
  const LABELS = [
    [/^(?:you said|you|user|me|i said)$/i, 'user'],
    [/^(?:chatgpt said|chatgpt|assistant|gpt|gpt-\d[\w.-]*|ai)$/i, 'assistant'],
  ];
  const roleOf = (label) => { for (const [re, r] of LABELS) if (re.test(label.trim())) return r; return null; };
  const LINE = /^\s*(?:#{1,6}\s*|>\s*)?(?:\*\*|__)?([A-Za-z][\w .-]{0,18}?)(?:\*\*|__)?\s*:\s*(?:\*\*|__)?\s*(.*)$/;
  const BARE = /^\s*(?:#{1,6}\s*)?(?:\*\*|__)?(you said|chatgpt said|chatgpt|you)(?:\*\*|__)?\s*$/i;

  const tidy = (s) => String(s).replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  /* Pasted text → turns. Unlabelled text becomes a single note. */
  function parseText(text) {
    const lines = tidy(text).split('\n');
    const turns = [];
    let curr = null;
    for (const line of lines) {
      let role = null, rest = '';
      const bare = BARE.exec(line);
      if (bare) { role = roleOf(bare[1]); rest = ''; }
      else {
        const m = LINE.exec(line);
        if (m && roleOf(m[1])) { role = roleOf(m[1]); rest = m[2]; }
      }
      if (role) { curr = { role, text: rest }; turns.push(curr); continue; }
      if (!curr) { curr = { role: 'note', text: '' }; turns.push(curr); }
      curr.text += (curr.text ? '\n' : '') + line;
    }
    return turns.map((t) => ({ role: t.role, text: tidy(t.text), t: null })).filter((t) => t.text);
  }

  /* ---- ChatGPT data export (conversations.json) ---- */

  function toTime(v) {
    if (typeof v === 'number' && isFinite(v)) return new Date(v > 1e11 ? v : v * 1000).toISOString();
    if (typeof v === 'string' && isFinite(Date.parse(v))) return new Date(v).toISOString();
    return null;
  }
  function plain(content) {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (typeof content.text === 'string') return content.text;
    if (Array.isArray(content.parts)) return content.parts.map((p) => (typeof p === 'string' ? p : p && typeof p.text === 'string' ? p.text : '')).join('\n');
    return '';
  }
  function activePath(c) {
    if (c.mapping && typeof c.mapping === 'object') {
      if (c.current_node && c.mapping[c.current_node]) {
        const chain = [], seen = new Set();
        let id = c.current_node;
        while (id && c.mapping[id] && !seen.has(id)) { seen.add(id); const n = c.mapping[id]; if (n.message) chain.push(n.message); id = n.parent || null; }
        return { messages: chain.reverse(), branchExact: true };
      }
      return { messages: Object.values(c.mapping).map((n) => n && n.message).filter(Boolean), branchExact: false };
    }
    return { messages: Array.isArray(c.messages) ? c.messages : [], branchExact: true };
  }

  /* Returns every conversation in the file, so the person chooses which one to bring in. */
  function parseExport(raw) {
    const list = Array.isArray(raw) ? raw : raw && Array.isArray(raw.conversations) ? raw.conversations : null;
    if (!list) throw new Error('This does not look like ChatGPT’s conversations.json: expected a list of conversations.');
    const out = [];
    list.forEach((c, i) => {
      if (!c || typeof c !== 'object') return;
      const { messages, branchExact } = activePath(c);
      const turns = messages.map((m) => {
        const role = (m.author && m.author.role) || m.role;
        if (role !== 'user' && role !== 'assistant') return null;
        const text = tidy(plain(m.content));
        return text ? { role, text, t: toTime(m.create_time ?? m.timestamp ?? m.created_at) } : null;
      }).filter(Boolean);
      if (!turns.length) return;
      out.push({
        id: String(c.id || c.conversation_id || i),
        title: typeof c.title === 'string' && c.title.trim() ? c.title.trim() : 'Untitled conversation',
        created: toTime(c.create_time), updated: toTime(c.update_time),
        branchExact, turns,
      });
    });
    if (!out.length) throw new Error('No readable messages were found in this file.');
    return out.sort((a, b) => String(b.updated || '').localeCompare(String(a.updated || '')));
  }

  /* ---- canonical transcript: what is kept as the original ---- */

  /* The kept body. Each turn starts with its label on its own line, so the
     body parses back to exactly the same turns. */
  function transcript(turns) {
    return turns.map((t) => ROLE_LABEL[t.role] + ':\n' + t.text).join('\n\n');
  }
  function turnsOf(body) {
    return parseText(body);
  }

  /* A content key for a turn (FNV-1a, 32-bit, over role + normalized text).
     Used only to recognise a turn already captured; not a security fingerprint. */
  function turnKey(t) {
    const s = t.role + '|' + String(t.text).replace(/\s+/g, ' ').trim().toLowerCase();
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(36) + '.' + s.length.toString(36);
  }

  /* Split incoming turns into those already captured and those that are new. */
  function compare(turns, knownKeys) {
    const known = new Set(knownKeys || []);
    const fresh = [], seen = [];
    for (const t of turns) (known.has(turnKey(t)) ? seen : fresh).push(t);
    return { fresh, seen };
  }

  const exported = { parseText, parseExport, transcript, turnsOf, turnKey, compare, ROLE_LABEL };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  else root.TangerineCapture = exported;
})(typeof globalThis !== 'undefined' ? globalThis : this);
