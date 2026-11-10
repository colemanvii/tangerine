/*
 * Tangerine — synthesis.
 *
 * Reads the turns of a captured conversation and proposes objects for TABLET:
 * projects, people, ideas, decisions, next actions and open questions, plus
 * the relationships between them.
 *
 * Rules this module keeps:
 * - It only proposes. Nothing reaches TABLET until the person accepts it.
 * - Every proposal carries its evidence: the exact sentence, the turn it came
 *   from and who said it. A proposal with no evidence is never made.
 * - Who said it matters. "You said" is not the same as "ChatGPT suggested";
 *   a suggestion is not a commitment, and a relationship drawn from nearby
 *   context is marked as inferred.
 * - It reconciles with what is already on TABLET, proposing an update (more
 *   evidence, a new link) instead of a duplicate card.
 * - It never invents dates. "By Friday" stays the words "by Friday".
 *
 * The local extractor is deterministic and explainable: cue phrases, names and
 * titles, no model. A person may instead ask ChatGPT itself to synthesize (see
 * PROMPT and fromBundle); those results are accepted only as proposals, and
 * every quote is checked against the captured text before it can count as
 * evidence.
 *
 * Reads frozen copies; has no write path.
 */
(function (root) {
  'use strict';

  const TYPES = ['project', 'person', 'idea', 'decision', 'action', 'question'];

  /* ---------- text helpers ---------- */

  const norm = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'").replace(/[“”]/g, '"');
  const STOP = new Set(('a an and are as at be been but by for from had has have he her his i if in into is it its me my no not of on or our she so ' +
    'than that the their them then there these they this to too up us was we were what when where which who will with would you your ' +
    'just also some any very can could should do does did i\'ll i\'m i\'ve we\'ll we\'re let\'s it\'s that\'s am about').split(' '));
  const stem = (w) => w.replace(/(?:ing|ed|es|s)$/, '').replace(/e$/, '');
  const bag = (s) => new Set((norm(s).match(/[a-z0-9][a-z0-9'-]*/g) || []).filter((w) => !STOP.has(w) && w.length > 1).map(stem));
  function overlap(a, b) {
    const A = bag(a), B = bag(b);
    if (!A.size || !B.size) return 0;
    let n = 0; A.forEach((w) => { if (B.has(w)) n++; });
    return n / Math.min(A.size, B.size);
  }
  const keyOf = (type, title) => type + ':' + [...bag(title)].sort().join('-').slice(0, 80);
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const trimEnd = (s) => s.replace(/\s+/g, ' ').replace(/^[\s,;:—–-]+/, '').replace(/[\s,;:—–-]+$/, '').trim();
  const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s);
  const words = (s) => (String(s).match(/\S+/g) || []).length;

  /* Sentences, without breaking after an initial ("R. Moreau") or a short abbreviation ("No. 2"). */
  const ABBR = /(?:^|\s)(?:[A-Z]|No|Nr|Mr|Mrs|Ms|Dr|St|Mt|vs|etc|e\.g|i\.e|approx|Fig|Vol|p|pp)\.$/;
  function sentences(text) {
    const out = [];
    let start = 0;
    const re = /[.!?]+["”)]?\s+(?=["“(]?[A-Z0-9])/g;
    let m;
    while ((m = re.exec(text))) {
      const end = m.index + m[0].trimEnd().length;
      if (ABBR.test(text.slice(start, end))) continue;
      out.push(text.slice(start, end).trim()); start = re.lastIndex;
    }
    out.push(text.slice(start).trim());
    return out.filter(Boolean);
  }

  /* Split a turn into sentence-sized units. List items are their own units. */
  function units(text) {
    const out = [];
    let heading = null;
    for (const raw of String(text).split('\n')) {
      const line = raw.trim();
      if (!line) continue;
      const list = /^(?:[-*•]|\d+[.)])\s+/.test(line);
      const body = line.replace(/^(?:[-*•]|\d+[.)])\s+/, '').replace(/^#+\s*/, '').replace(/\*\*/g, '');
      if (!list && /:$/.test(body) && words(body) <= 6) { heading = body.slice(0, -1); continue; }
      for (const p of sentences(body)) out.push({ text: p, list, heading: list ? heading : null });
      if (!list) heading = null;
    }
    return out;
  }

  /* ---------- cues ---------- */

  const DECISION = [
    /\b(?:I|we)(?:'ve| have)? (?:decided|agreed|chosen|settled)\b/i,
    /\b(?:I'm|I am|we're|we are|I'll|we'll) go(?:ing)? (?:to go )?with\b/i,
    /\blet's go with\b/i,
    /\bdecided (?:to|that|on|against)\b/i,
    /^(?:decision|decided)\s*[:—–-]/i,
    /\b(?:we|I) agreed\b/i,
    /\b(?:is|are) (?:settled|final|locked)\b/i,
  ];
  const ACTION_SELF = /^(?:so\s+|ok(?:ay)?[,\s]+|then\s+|and\s+|also[,\s]+|yes[,.\s]+)*(?:I|we)(?:\s+(?:really\s+|still\s+)?(?:need to|have to|must|should|will|am going to|are going to)|'ll|'m going to|'re going to)\s+(.+)$/i;
  const ACTION_CONTRACT = /^(?:so\s+|ok(?:ay)?[,\s]+|then\s+|and\s+|also[,\s]+|yes[,.\s]+)*(?:I|we)(?:'ll|'m going to|'re going to)\s+(.+)$/i;
  const ACTION_REMIND = /^(?:remember to|don't forget to|need to|to ?do\s*:|next(?: step)?s?\s*:|action\s*:)\s*(.+)$/i;
  const VERBS = 'send|email|call|text|book|draft|write|ask|finish|schedule|order|print|follow up|share|review|buy|pick|confirm|reply|submit|update|sketch|photograph|test|ship|make|set|choose|check|post|invite|get|plan|prepare|list|find|reach out|request|start|visit|measure|pack|label|fix|edit|read|record|file|pay|return|tell|bring';
  const IMPERATIVE = new RegExp('^(?:' + VERBS + ')\\b', 'i');
  const SUGGEST = /^(?:you could|you might|you may want to|consider|maybe|it may help to|I'd suggest|I would suggest|I suggest|I'd recommend|try to|try)\s+(.+)$/i;
  const QUESTION_CUES = /\b(?:should I|should we|whether|not sure|unsure|undecided|still deciding|open question|haven't decided|can't decide|waiting (?:on|for)|still waiting|haven't heard|still haven't|need to decide|which (?:one|option)|is it worth|do I need|don't know (?:if|whether|how))\b/i;
  const REQUEST_TO_AI = /^(?:can you|could you|would you|will you|please|help me|what do you think|how do I|how would you|what's the best way|do you|tell me|give me|any (?:ideas|thoughts))\b/i;
  const IDEA = /^(?:what if|maybe (?:I|we) could|imagine|an idea\s*:|idea\s*:|I've been thinking|I keep thinking|it might be (?:nice|interesting|good) (?:to|if)|it would be (?:nice|interesting|good) (?:to|if)|one idea)\b/i;
  const FOCUS = /\bthe (?:one|only|main) thing (?:this week|today|right now|now|for this week)? ?(?:is|will be)\s+(.+)$/i;
  const WHEN = /\b(?:by|before|on|this|next|until|after) (?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|tomorrow|tonight|the weekend|weekend|week|month|end of (?:the )?(?:day|week|month)|\d{1,2}(?:st|nd|rd|th)?(?: of)? \w+)\b|\b(?:tomorrow|tonight|today|this week|next week|this weekend)\b/i;

  /* ---------- entities: projects and people ---------- */

  const NOT_NAMES = new Set(('I Monday Tuesday Wednesday Thursday Friday Saturday Sunday January February March April May June July August September ' +
    'October November December ChatGPT GPT OpenAI Claude Notion GitHub Google Apple Dia TABLET Tangerine Yes No Ok Okay The This That These Those ' +
    'Then So And But Or Also Next Now Maybe Good Great Thanks Thank Hi Hello Morning Evening Today Tomorrow Everything Nothing Something ' +
    'Spring Summer Autumn Fall Winter Christmas Easter It We You He She They Let What When Where Which Who Why How Is Are Do Does Did Can ' +
    'Could Should Would Will Not One Two Three First Second Last My Our Your Their His Her A An In On At For With From To Of By NOW NEXT').split(' '));
  const RELATIONS = 'friend|partner|wife|husband|editor|sister|brother|mother|father|mum|mom|dad|son|daughter|agent|printer|collaborator|client|designer|publisher|curator|teacher|mentor|colleague|producer|manager|boss|co-founder|cofounder|photographer|landlord|accountant|lawyer|neighbou?r|machinist|assistant|founder|director|architect|engineer|coach|therapist|doctor|cousin|aunt|uncle';
  const NAME = "([A-Z][a-z'’-]+(?:\\s[A-Z][a-z'’-]+)?|[A-Z]\\.\\s?[A-Z][a-z'’-]+)";
  const REL_BEFORE = new RegExp('\\b(?:[Mm]y|[Oo]ur) (' + RELATIONS + '),?\\s+' + NAME, 'g');
  const REL_AFTER = new RegExp(NAME + ',\\s+(?:[Mm]y|[Oo]ur) (' + RELATIONS + ')\\b', 'g');
  const PV = 'ask|asked|email|emailed|call|called|text|texted|tell|told|meet|met|meeting|message|messaged|thank|introduce|introduced|invite|invited|cc|ping|pinged|talk to|talked to|spoke (?:to|with)|speak to|hear from|heard from|send|sent|waiting on|waiting for'
    .split('|').map((w) => '[' + w[0].toUpperCase() + w[0] + ']' + w.slice(1)).join('|');
  const PERSON_VERB = new RegExp('\\b(?:' + PV + ')\\s+' + NAME + '\\b', 'g');
  const PERSON_SUBJ = new RegExp('(?:^|[.;,]\\s+|\\band\\s+)' + NAME + '\\s+(?:said|says|thinks|thought|suggested|wants|wanted|offered|replied|asked|sent|came back|agreed|mentioned|is (?:helping|handling|doing))\\b', 'g');
  const PROJECT_NOUNS = 'project|book|exhibition|show|album|zine|site|website|series|studio|catalogue|catalog|residency|grant|app|film|launch|weekend|festival|collection|record|ep|podcast|newsletter|course|workshop|tour|campaign|brand|shop|store|business|company|piece|essay|novel|paper|talk|game|product|kit|edition|issue';
  const CAP_PHRASE = "[A-Z][\\w'’-]*(?:\\s+(?:of|the|and|for|&|on|in|a|[A-Z0-9][\\w'’-]*))*?(?:\\s+[A-Z0-9][\\w'’-]*)?";
  const PROJECT_CUE = new RegExp('\\b(?:project|working on|work on|start(?:ing)?|launch(?:ing)?|plan(?:ning)?|build(?:ing)?|make|making|do|doing|run(?:ning)?|organi[sz]e|organi[sz]ing)\\s*:?\\s+(?:a |an |the |my |our |this )?(' + CAP_PHRASE + ')(?:\\s+(' + PROJECT_NOUNS + '))?\\b', 'g');
  const PROJECT_TAIL = new RegExp('\\b(?:the|my|our|a|an)\\s+(' + CAP_PHRASE + ')\\s+(' + PROJECT_NOUNS + ')\\b', 'g');
  const QUOTED = /[“"]([A-Z][^"”]{1,48})[”"]/g;

  const cleanName = (n) => n.replace(/['’]s$/, '').trim();
  const nameOK = (n) => { const first = n.split(/\s+/)[0]; return n.length > 1 && !NOT_NAMES.has(first) && !NOT_NAMES.has(n); };

  /* Names an existing TABLET item answers to. */
  function aliases(item) {
    const t = String(item.title || '').trim();
    if (!t) return [];
    const out = new Set([t]);
    const head = t.split(/\s+[—–-]\s+|,\s+|:\s+|\s+\(/)[0].trim();
    if (head) out.add(head);
    if (item.kind === 'person') {
      const parts = head.replace(/^[A-Z]\.\s*/, '').split(/\s+/);
      const last = parts[parts.length - 1];
      if (last && last.length >= 4) out.add(last);
      if (parts.length > 1 && parts[0].length >= 3) out.add(parts[0]);
    }
    (item.aliases || []).forEach((a) => out.add(a));
    return [...out].filter((a) => a.length >= 3);
  }
  function mentions(text, alias) {
    const multi = /\s/.test(alias);
    const esc = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Several words: match regardless of case. One word: it must be written
    // with its capital, so "notebook" in passing is not the Notebook project.
    const re = new RegExp('(?:^|[^\\w])' + esc + '(?![\\w])', multi ? 'i' : '');
    return re.test(text);
  }

  /* ---------- the extractor ---------- */

  /*
   * turns:    [{ role, text, t }] — the kept transcript, re-parsed.
   * existing: TABLET items, used to reconcile.
   * Returns { proposals, stats }.
   */
  function extract(turns, existing, opts) {
    const o = Object.assign({ sourceId: null }, opts);
    const items = (existing || []).filter((i) => i.kind !== 'source');
    const props = new Map();
    const stats = { turns: turns.length, units: 0, byRole: { user: 0, assistant: 0, note: 0 } };

    const known = items.filter((i) => i.kind === 'project' || i.kind === 'person')
      .map((i) => ({ item: i, aliases: aliases(i) }));

    function add(p, ev) {
      if (!p.title || words(p.title) < 1) return null;
      p.title = clip(trimEnd(p.title), 110);
      if (!p.title) return null;
      // Reconcile: same type, same words (or an existing project/person of that name).
      const match = p.match || items.find((i) => i.kind === p.type && (keyOf(i.kind, i.title) === keyOf(p.type, p.title) || (['project', 'person'].includes(p.type) && aliases(i).some((a) => norm(a) === norm(p.title)))));
      let found = null;
      for (const q of props.values()) {
        if (q.type !== p.type) continue;
        if (q.key === keyOf(p.type, p.title) || (match && q.match === match.id) ||
            (['action', 'decision', 'question', 'idea'].includes(p.type) && overlap(q.title, p.title) >= 0.6)) { found = q; break; }
      }
      if (found) {
        if (!found.evidence.some((e) => e.turn === ev.turn && e.quote === ev.quote)) found.evidence.push(ev);
        // Your own words outrank a suggestion; keep the clearer statement.
        if (ev.role === 'user' && found.basis !== 'you') { found.basis = 'you'; found.title = p.title; found.confidence = p.confidence || 'clear'; }
        (p.rel || []).forEach((r) => relate(found, r.ref, r.label, r.inferred));
        if (p.when && !found.when) found.when = p.when;
        if (p.focus) found.focus = true;
        if (p.role && !found.role) found.role = p.role;
        return found;
      }
      const q = {
        key: keyOf(p.type, p.title), type: p.type, title: p.title,
        role: p.role || null, when: p.when || null, focus: Boolean(p.focus),
        basis: p.basis || (ev.role === 'user' ? 'you' : ev.role === 'assistant' ? 'chatgpt' : 'note'),
        confidence: p.confidence || 'clear',
        match: match ? match.id : null,
        evidence: [ev], rel: [],
      };
      (p.rel || []).forEach((r) => relate(q, r.ref, r.label, r.inferred));
      props.set(q.key, q);
      return q;
    }
    function relate(p, ref, label, inferred) {
      if (!ref || ref === 'key:' + p.key || (p.match && ref === 'item:' + p.match)) return;
      const have = p.rel.find((r) => r.ref === ref);
      if (have) { if (!inferred) have.inferred = false; return; }
      p.rel.push({ ref, label: label || '', inferred: Boolean(inferred) });
    }
    const refOf = (p) => (p.match ? 'item:' + p.match : 'key:' + p.key);

    // Context: the project most recently mentioned, carried across nearby turns.
    let context = null, contextAge = 0;

    turns.forEach((turn, ti) => {
      const role = turn.role;
      stats.byRole[role] = (stats.byRole[role] || 0) + 1;
      const us = units(turn.text);
      us.forEach((u) => {
        stats.units++;
        const s = u.text;
        const ev = { sourceId: o.sourceId, turn: ti, role, quote: s };
        const base = role === 'user' ? 'you' : role === 'assistant' ? 'chatgpt' : 'note';

        /* --- who and what is named here --- */
        const here = []; // [{ proposal, kind }]
        for (const k of known) if (k.aliases.some((a) => mentions(s, a))) {
          here.push({ p: add({ type: k.item.kind, title: k.item.title, match: k.item, basis: base }, ev), kind: k.item.kind });
        }
        const namedProjects = new Set();
        const takeProject = (title, cueStrength) => {
          title = trimEnd(title.replace(/^(?:the|a|an|my|our)\s+/i, ''));
          if (!title || words(title) > 7 || !/[A-Z]/.test(title[0]) || NOT_NAMES.has(title)) return;
          if (namedProjects.has(norm(title))) return;
          if (here.some((h) => h.kind === 'person' && norm(h.p.title).includes(norm(title)))) return;
          namedProjects.add(norm(title));
          here.push({ p: add({ type: 'project', title, basis: base, confidence: cueStrength }, ev), kind: 'project' });
        };
        if (role !== 'assistant') {
          for (const m of s.matchAll(PROJECT_TAIL)) if (!here.some((h) => h.kind === 'project' && norm(m[1]).includes(norm(h.p.title).split(' ')[0]))) takeProject(m[1] + ' ' + m[2], 'clear');
          for (const m of s.matchAll(PROJECT_CUE)) {
            const t = m[1] + (m[2] ? ' ' + m[2] : '');
            if (nameOK(m[1]) && !here.some((h) => h.kind === 'project' && mentions(t, h.p.title.split(/\s+[—–-]\s+|,/)[0]))) takeProject(t, m[2] ? 'clear' : 'tentative');
          }
          for (const m of s.matchAll(QUOTED)) if (words(m[1]) <= 6 && !/[.?!]$/.test(m[1])) takeProject(m[1], 'tentative');
        }
        const takePerson = (name, relation, strong) => {
          name = cleanName(name);
          if (!nameOK(name)) return;
          if (here.some((h) => h.kind === 'project' && norm(h.p.title).includes(norm(name)))) return;
          const hit = known.find((k) => k.item.kind === 'person' && k.aliases.some((a) => norm(a) === norm(name) || norm(name).includes(norm(a))));
          if (hit) return; // already found by alias above
          const prior = [...props.values()].find((q) => q.type === 'person' && (norm(q.title) === norm(name) || norm(q.title).split(' ')[0] === norm(name).split(' ')[0]));
          const title = prior && words(prior.title) >= words(name) ? prior.title : name;
          if (prior && prior.title !== title) prior.title = title;
          const p = add({ type: 'person', title, role: relation ? 'Your ' + relation + ' (as you put it)' : null, basis: base, confidence: strong ? 'clear' : 'tentative' }, ev);
          if (p && !here.some((h) => h.p === p)) here.push({ p, kind: 'person' });
        };
        for (const m of s.matchAll(REL_BEFORE)) takePerson(m[2], m[1], true);
        for (const m of s.matchAll(REL_AFTER)) takePerson(m[1], m[2], true);
        for (const m of s.matchAll(PERSON_VERB)) takePerson(m[1], null, false);
        for (const m of s.matchAll(PERSON_SUBJ)) takePerson(m[1], null, false);

        const projectsHere = here.filter((h) => h.kind === 'project' && h.p);
        const peopleHere = here.filter((h) => h.kind === 'person' && h.p);
        if (projectsHere.length) { context = projectsHere[projectsHere.length - 1].p; contextAge = 0; }

        // People named with a project in the same sentence are related.
        for (const pe of peopleHere) for (const pr of projectsHere) relate(pe.p, refOf(pr.p), 'mentioned together', false);
        if (!projectsHere.length && context && contextAge <= 1) for (const pe of peopleHere) if (pe.p.op !== 'update' && !pe.p.match) relate(pe.p, refOf(context), 'in context', true);
        for (let i = 1; i < projectsHere.length; i++) relate(projectsHere[i].p, refOf(projectsHere[0].p), 'mentioned together', false);

        /* --- what kind of statement is it --- */
        const rels = () => {
          const r = projectsHere.map((h) => ({ ref: refOf(h.p), label: '', inferred: false }))
            .concat(peopleHere.map((h) => ({ ref: refOf(h.p), label: '', inferred: false })));
          if (!projectsHere.length && context && contextAge <= 3) r.push({ ref: refOf(context), label: 'in context', inferred: true });
          return r;
        };
        const when = (WHEN.exec(s) || [])[0] || null;
        const isQ = /\?\s*$/.test(s);
        let m;

        if (role !== 'assistant' && (m = FOCUS.exec(s))) {
          const t = trimEnd(m[1].replace(/[.!]$/, ''));
          if (words(t) >= 2) add({ type: 'action', title: cap(t.replace(/^the\s+/i, '')), focus: true, basis: base, rel: rels() }, ev);
        } else if (role !== 'assistant' && IDEA.test(s)) {
          add({ type: 'idea', title: s.replace(/[.]$/, ''), basis: base, rel: rels() }, ev);
        } else if (DECISION.some((re) => re.test(s)) && !isQ) {
          const conditional = /\b(?:if|unless|probably|maybe|might|for now)\b/i.test(s);
          add({ type: 'decision', title: s.replace(/[.!]$/, ''), basis: role === 'assistant' ? 'chatgpt' : base,
            confidence: role === 'assistant' || conditional ? 'tentative' : 'clear', rel: rels() }, ev);
        } else if (role !== 'assistant' && isQ && !REQUEST_TO_AI.test(s) && words(s) >= 5) {
          add({ type: 'question', title: s, basis: base, rel: rels() }, ev);
        } else if (role !== 'assistant' && !isQ && QUESTION_CUES.test(s) && words(s) >= 6) {
          add({ type: 'question', title: s.replace(/[.]$/, ''), basis: base, rel: rels() }, ev);
        } else if (role !== 'assistant' && !isQ && (m = ACTION_SELF.exec(s) || ACTION_REMIND.exec(s))) {
          const t = trimEnd(m[1].replace(/[.!]$/, ''));
          // "I'll" and "I'm going to" with a doing-verb read as a commitment; "I should" stays tentative.
          const firm = ACTION_CONTRACT.test(s) || /need to|have to|must|remember|don't forget|to ?do|next|action/i.test(s.slice(0, 40));
          if (words(t) >= 2 && (IMPERATIVE.test(t) || firm)) add({ type: 'action', title: cap(t), when, basis: base, confidence: firm ? 'clear' : 'tentative', rel: rels() }, ev);
        } else if (role === 'assistant' && !isQ) {
          const sug = SUGGEST.exec(s);
          const t = sug ? trimEnd(sug[1].replace(/[.!]$/, '')) : u.list && IMPERATIVE.test(s) ? trimEnd(s.replace(/[.!]$/, '')) : null;
          if (t && IMPERATIVE.test(t) && words(t) >= 3) add({ type: 'action', title: cap(t), when, basis: 'chatgpt', confidence: 'tentative', rel: rels() }, ev);
        } else if (role !== 'assistant' && u.list && IMPERATIVE.test(s) && !isQ) {
          add({ type: 'action', title: trimEnd(s.replace(/[.!]$/, '')), when, basis: base, rel: rels() }, ev);
        }
      });
      if (role === 'user') contextAge++;
    });

    // An existing person or project that was only mentioned becomes an
    // "update" proposal: new evidence for something already on TABLET.
    const proposals = [...props.values()].map((p) => Object.assign(p, { op: p.match ? 'update' : 'add' }));
    // A newly named project or person with a single weak mention stays out.
    const kept = proposals.filter((p) => !(p.op === 'add' && (p.type === 'project' || p.type === 'person') && p.confidence === 'tentative' && p.evidence.length < 2 && !proposals.some((q) => q.rel.some((r) => r.ref === 'key:' + p.key))));
    const keys = new Set(kept.map((p) => 'key:' + p.key));
    kept.forEach((p) => { p.rel = p.rel.filter((r) => !r.ref.startsWith('key:') || keys.has(r.ref)); });
    const order = { project: 0, person: 1, decision: 2, action: 3, question: 4, idea: 5 };
    kept.sort((a, b) => order[a.type] - order[b.type] || a.evidence[0].turn - b.evidence[0].turn);
    return { proposals: kept, stats };
  }

  /* ---------- asking ChatGPT to synthesize ---------- */

  const PROMPT = [
    'Please synthesize our conversation for my Tangerine workspace.',
    'Return only JSON, no commentary, in exactly this shape:',
    '{"tangerine":"synthesis/1","items":[{"type":"project|person|idea|decision|action|question","title":"short title","quote":"the exact words from this conversation that support it","said_by":"me|you","related":["title of another item"]}]}',
    'Rules: copy each quote verbatim from the conversation (do not paraphrase). Only include a decision or action if I stated or agreed to it; mark suggestions you made with "said_by":"you". Do not invent dates, people or facts. Keep titles under 12 words.',
  ].join('\n');

  /* Check a ChatGPT-made bundle against the captured turns. A quote that is
     not found verbatim is kept only as an unverified, tentative proposal. */
  function fromBundle(bundle, turns, existing, opts) {
    const o = Object.assign({ sourceId: null }, opts);
    if (!bundle || typeof bundle !== 'object' || !Array.isArray(bundle.items)) throw new Error('Expected {"items": [...]} — paste the JSON ChatGPT returned.');
    const flat = turns.map((t) => norm(t.text).replace(/\s+/g, ' '));
    const items = (existing || []).filter((i) => i.kind !== 'source');
    const out = [], byTitle = new Map();
    let unverified = 0, skipped = 0;
    for (const x of bundle.items) {
      if (!x || !TYPES.includes(x.type) || typeof x.title !== 'string' || !x.title.trim()) { skipped++; continue; }
      const quote = typeof x.quote === 'string' ? x.quote.trim() : '';
      const q = norm(quote).replace(/\s+/g, ' ').replace(/^["']|["']$/g, '');
      const turn = q.length >= 8 ? flat.findIndex((t) => t.includes(q)) : -1;
      const verified = turn >= 0;
      if (!verified) unverified++;
      const role = verified ? turns[turn].role : null;
      const said = x.said_by === 'you' ? 'chatgpt' : 'you';
      const match = items.find((i) => i.kind === x.type && (keyOf(i.kind, i.title) === keyOf(x.type, x.title) || aliases(i).some((a) => norm(a) === norm(x.title))));
      const p = {
        key: keyOf(x.type, x.title), type: x.type, title: clip(trimEnd(x.title), 110), role: null, when: null, focus: false,
        basis: verified ? (role === 'assistant' ? 'chatgpt' : said) : 'unverified',
        confidence: verified && !(role === 'assistant' && ['decision', 'action'].includes(x.type)) ? 'clear' : 'tentative',
        match: match ? match.id : null, op: match ? 'update' : 'add', via: 'chatgpt-synthesis',
        evidence: [{ sourceId: o.sourceId, turn: verified ? turn : null, role, quote: quote || '(no quote given)', verified }],
        rel: [], relatedTitles: Array.isArray(x.related) ? x.related.filter((r) => typeof r === 'string') : [],
      };
      if (byTitle.has(p.key)) continue;
      byTitle.set(p.key, p); out.push(p);
    }
    for (const p of out) for (const t of p.relatedTitles) {
      const other = out.find((q) => norm(q.title) === norm(t));
      const item = !other && items.find((i) => aliases(i).some((a) => norm(a) === norm(t)));
      if (other && other !== p) p.rel.push({ ref: other.match ? 'item:' + other.match : 'key:' + other.key, label: '', inferred: false });
      else if (item) p.rel.push({ ref: 'item:' + item.id, label: '', inferred: false });
    }
    out.forEach((p) => delete p.relatedTitles);
    return { proposals: out, stats: { items: bundle.items.length, unverified, skipped } };
  }

  /* Pull the first JSON object out of whatever was pasted (ChatGPT often wraps it in ```json fences). */
  function readBundle(text) {
    const s = String(text || '');
    const fence = /```(?:json)?\s*([\s\S]*?)```/.exec(s);
    const body = fence ? fence[1] : s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1);
    if (!body.trim()) throw new Error('No JSON found in what was pasted.');
    return JSON.parse(body);
  }

  const exported = { extract, fromBundle, readBundle, units, aliases, mentions, overlap, keyOf, PROMPT, TYPES };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  else root.TangerineSynthesis = exported;
})(typeof globalThis !== 'undefined' ? globalThis : this);
