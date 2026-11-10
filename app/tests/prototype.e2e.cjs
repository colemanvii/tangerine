// Browser acceptance test for Prototype 001: a conversation becomes navigable objects on TABLET.
//   python3 -m http.server 4321 --bind 127.0.0.1   (from the repository root)
//   node app/tests/prototype.e2e.cjs [--shots docs/prototype-001/screens]
//
// Follows the acceptance sequence in docs/TABLET.md: bring in a conversation,
// create and update the corresponding objects, keep the source, connect them,
// preserve manual placement, reload, capture again, write, export, restore, undo.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4321/app/';
const shotsAt = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const fresh = async (opts, hash) => {
    const ctx = await browser.newContext(Object.assign({ acceptDownloads: true }, opts));
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('dialog', (d) => d.accept());
    await page.goto(BASE + (hash || ''));
    await page.waitForSelector(hash ? 'main > *' : '.card');
    return { ctx, page };
  };
  const shot = async (page, name) => {
    if (!shotsAt) return;
    await page.evaluate(() => document.querySelector('.toast')?.remove());
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${shotsAt}/${name}.png` });
  };
  const noOverflow = async (page, label) => {
    const w = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(w <= 0, `${label}: page scrolls horizontally by ${w}px`);
  };
  const db = (page, fn, arg) => page.evaluate(async ([src, a]) => { const s = await TangerineStore.openStore(); return (0, eval)(src)(s, a); }, [fn.toString(), arg]);
  const card = (page, text) => page.locator('.card', { hasText: text });
  let n = 0; const ok = (m) => console.log('ok', ++n, m);

  const { ctx, page } = await fresh({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 2 });
  const boardBefore = await page.locator('.card').count();

  // ---- 1. capture ----
  await page.locator('.nav a[data-view="capture"]').click();
  await page.waitForSelector('.cp-new');
  assert.match(await page.locator('.cp-list').innerText(), /no connection to ChatGPT/i); ok('capture says plainly that ChatGPT is not connected');
  await page.locator('[data-act="cap-sample"]').click();
  await shot(page, '01-capture-paste');
  await page.locator('[data-form="capture"] button[type="submit"]').click();
  await page.waitForSelector('.cp-preview');
  const preview = await page.locator('.cp-preview').innerText();
  assert.match(preview, /11 turns · 7 from you · 4 from ChatGPT/i); ok('preview reads 11 turns by speaker');
  assert.match(preview, /Not in pasted text · none assumed/i); ok('no date is assumed for pasted text');
  await page.locator('[data-act="cap-keep"]').click();
  await page.waitForSelector('.cp-review .prop');
  const srcId = await page.evaluate(() => decodeURIComponent(location.hash.split('/')[1]));
  const kept = await db(page, async (s, id) => ({ src: await s.getSource(id), v: await s.verifySource(id) }), srcId);
  assert.equal(kept.src.kind, 'conversation'); assert.equal(kept.v.status, 'intact'); ok('conversation kept as a fingerprinted original');
  assert.equal(await page.locator('.turn').count(), 11); ok('transcript shows every turn');
  const nProps = await page.locator('.prop').count();
  assert.ok(nProps >= 20, 'proposals: ' + nProps); ok(nProps + ' proposals, none yet on TABLET');
  assert.ok(await page.locator('mark.ev').count() >= 15); ok('the words behind each proposal are marked in the transcript');
  assert.equal(await page.locator('.card').count(), 0);
  await shot(page, '02-capture-review');

  // ---- 2. review: accept what you stated, one suggestion, dismiss one, edit one ----
  const sug = page.locator('.prop', { hasText: 'Ask for a lead time on a run of five cases' });
  assert.match(await sug.innerText(), /ChatGPT suggested · tentative/i); ok('a ChatGPT suggestion is labelled as such');
  await sug.locator('[data-pact="dismiss"]').click();
  await page.waitForSelector('.prop.dismissed');
  const idea = page.locator('.prop', { hasText: 'invitation is printed' });
  await idea.locator('[data-pact="edit"]').click();
  await page.locator('[data-form="prop-edit"] input').fill('Print the invitation on the notebook paper');
  await page.locator('[data-form="prop-edit"] button[type="submit"]').click();
  await page.waitForSelector('.prop h4:has-text("Print the invitation on the notebook paper")'); ok('a proposal can be edited before it is accepted');
  await page.locator('[data-act="cap-accept-yours"]').click();
  await page.waitForSelector('.prop.accepted');
  await page.locator('.prop', { hasText: 'Pick two possible weekends' }).locator('[data-pact="accept"]').click();
  await page.waitForFunction(() => [...document.querySelectorAll('.prop.accepted')].some((x) => /Pick two possible weekends/.test(x.innerText)));
  await shot(page, '03-capture-accepted');

  // ---- 3. TABLET ----
  await page.locator('.nav a[data-view="whiteboard"]').click();
  await page.waitForSelector('.card');
  await page.waitForTimeout(1400); // the orbital arrival finishes
  const items = await db(page, (s) => s.items());
  const fromConv = items.filter((i) => i.origin === 'conversation');
  assert.ok(fromConv.length >= 12, 'new objects: ' + fromConv.length); ok(fromConv.length + ' new objects on TABLET, each from an accepted proposal');
  assert.ok(fromConv.every((i) => i.evidence.length && i.evidence.every((e) => e.sourceId === srcId))); ok('every new object carries its evidence');
  assert.equal(items.filter((i) => /^Desk clock/.test(i.title)).length, 1); ok('existing projects were updated, not duplicated');
  assert.ok(items.find((i) => i.id === 'demo-itm-2').evidence.length >= 1); ok('the existing Desk clock project gained conversation evidence');
  assert.ok(!items.some((i) => /lead time/.test(i.title || ''))); ok('a dismissed proposal stays off TABLET');
  assert.ok(items.some((i) => i.title === 'Print the invitation on the notebook paper')); ok('the edited title is what reached TABLET');
  const now = items.find((i) => i.now);
  assert.equal(now.title, 'North window photograph'); ok('“the one thing this week” became NOW');
  const panel = await page.locator('.insp').innerText();
  assert.match(panel, /Now[\s\S]*North window photograph[\s\S]*Next[\s\S]*Open loops/i); ok('panel answers NOW / NEXT / OPEN LOOPS');
  assert.match(panel, /Send the dial file to Moreau by Friday/); ok('NEXT shows the actions you stated, “by Friday” in your words');
  const links = await db(page, (s) => s.links());
  assert.ok(links.some((l) => l.origin === 'inferred') && links.some((l) => l.origin === 'conversation')); ok('connections drawn: stated and inferred, kept apart');
  assert.ok(await page.locator('.links line.inferred').count() >= 1); ok('inferred connections are drawn dashed');
  const zoom = await page.locator('[data-zoom="fit"]').innerText();
  assert.notEqual(zoom, '100%'); ok('TABLET fits the board to show what arrived (' + zoom + ')');
  await shot(page, '04-tablet-after-capture');
  await page.locator('[data-zoom="1"]').click(); await page.locator('[data-zoom="1"]').click();

  // inspect an object: its words, who said them, a way back
  await card(page, 'Send the dial file').click();
  const insp = await page.locator('.insp').innerText();
  assert.match(insp, /From the conversation · 1[\s\S]*You said/i);
  assert.match(insp, /“I need to send the dial file to Moreau by Friday\.”/); ok('inspector shows the exact words and who said them');
  assert.match(insp, /R\. Moreau[\s\S]*Desk clock, No\. 1/i); ok('connected to the person and the project');
  await shot(page, '05-tablet-evidence');
  await page.locator('.insp a', { hasText: 'Open in conversation' }).click();
  await page.waitForSelector('.turn.focus#turn-2'); ok('“Open in conversation” returns to the exact turn');
  await shot(page, '06-back-to-source');

  // ---- 4. rearrange, mark done, link by hand; reload keeps it all ----
  await page.locator('.nav a[data-view="whiteboard"]').click(); await page.waitForSelector('.card');
  const moved = card(page, 'Text Ines tonight');
  await moved.scrollIntoViewIfNeeded();
  const box = await moved.boundingBox();
  await page.mouse.move(box.x + 30, box.y + 20); await page.mouse.down();
  await page.mouse.move(box.x + 30 + 96, box.y + 20 + 48, { steps: 6 }); await page.mouse.up();
  await page.waitForTimeout(200);
  const pos = await db(page, (s) => s.items().then((xs) => xs.find((i) => i.title === 'Text Ines tonight')));
  await card(page, 'Text Ines tonight').click();
  await page.locator('[data-act="done"]').click();
  await page.waitForSelector('.card.action.done'); ok('an action can be marked done');
  await page.reload(); await page.waitForSelector('.card');
  const pos2 = await db(page, (s) => s.items().then((xs) => xs.find((i) => i.title === 'Text Ines tonight')));
  assert.deepEqual([pos2.x, pos2.y], [pos.x, pos.y]); assert.equal(pos2.status, 'done'); ok('manual placement and status survive a reload');

  // ---- 5. the same conversation, a week later: only the new turns ----
  await page.goto(BASE + '#capture'); await page.waitForSelector('.cp-new');
  await page.locator('[data-act="cap-sample"]').click();
  const more = '\n\nYou said:\nInes confirmed the space for the last weekend of April. I need to ask Ines Okafor for the guest list by Sunday.';
  await page.locator('[data-form="capture"] textarea').evaluate((t, add) => { t.value += add; }, more);
  await page.locator('[data-form="capture"] button[type="submit"]').click();
  await page.waitForSelector('.cp-preview');
  assert.match(await page.locator('.cp-preview').innerText(), /New\s+1 turns[\s\S]*11 turns already captured/i); ok('a second capture keeps only the 1 new turn');
  await page.locator('[data-act="cap-keep"]').click();
  await page.waitForSelector('.cp-review .prop');
  const second = await page.locator('.cp-review').innerText();
  assert.match(second, /Update · R—\d+[\s\S]*Ines Okafor/i); ok('Ines Okafor, accepted last time, is offered as an update');
  await page.locator('[data-act="cap-accept-yours"]').click();
  await page.waitForSelector('.prop.accepted');
  const items2 = await db(page, (s) => s.items());
  const ines = items2.filter((i) => i.title === 'Ines Okafor');
  assert.equal(ines.length, 1); assert.equal(new Set(ines[0].evidence.map((e) => e.sourceId)).size, 2); ok('one Ines Okafor card, with evidence from both captures');
  assert.deepEqual([items2.find((i) => i.title === 'Text Ines tonight').x, items2.find((i) => i.title === 'Text Ines tonight').y], [pos.x, pos.y]); ok('a new capture does not move what you arranged');
  const guest = items2.find((i) => /guest list/.test(i.title || ''));
  assert.equal(guest.when, 'by Sunday'); ok('the new commitment arrives, “by Sunday” in your words');

  // ---- 6. undo ----
  const undoTarget = page.locator('.prop.accepted', { hasText: 'guest list' });
  await undoTarget.locator('[data-pact="undo"]').click();
  await page.waitForFunction(() => [...document.querySelectorAll('.prop.pending')].some((x) => /guest list/.test(x.innerText)));
  assert.ok(!(await db(page, (s) => s.items())).some((i) => /guest list/.test(i.title || ''))); ok('undo takes a new object off TABLET and returns it to review');
  await page.locator('.prop.accepted', { hasText: 'Ines Okafor' }).locator('[data-pact="undo"]').click();
  await page.waitForFunction(() => [...document.querySelectorAll('.prop.pending h4')].some((h) => h.textContent.trim() === 'Ines Okafor'));
  const inesAfter = (await db(page, (s) => s.items())).find((i) => i.title === 'Ines Okafor');
  assert.equal(new Set(inesAfter.evidence.map((e) => e.sourceId)).size, 1); ok('undoing an update removes only the evidence it added');

  // ---- 7. ask ChatGPT to synthesize: quotes are checked ----
  await page.locator('[data-act="cap-ask"]').click();
  await page.waitForSelector('#dlg[open] #ask-prompt');
  assert.match(await page.locator('#ask-prompt').inputValue(), /copy each quote verbatim/); ok('the prompt asks ChatGPT for verbatim quotes');
  await page.locator('#ask-reply').fill(JSON.stringify({ items: [
    { type: 'decision', title: 'Space confirmed for late April', quote: 'Ines confirmed the space for the last weekend of April.', said_by: 'me' },
    { type: 'action', title: 'Book a caterer', quote: 'I will book a caterer', said_by: 'me' },
  ] }));
  await page.locator('[data-ask="check"]').click();
  await page.waitForSelector('.prop:has-text("Book a caterer")');
  assert.match(await page.locator('.prop', { hasText: 'Book a caterer' }).innerText(), /Quote not found in capture · tentative[\s\S]*not found in the capture/i); ok('a quote ChatGPT cannot back up is marked unverified');
  assert.match(await page.locator('.prop', { hasText: 'Space confirmed' }).innerText(), /You said/i); ok('a verified quote is attributed to who said it');
  await shot(page, '07-second-capture');

  // ---- 8. writing, connected ----
  await page.goto(BASE + '#whiteboard'); await page.waitForSelector('.card');
  await card(page, 'Open Studio weekend').click();
  await page.locator('[data-act="write"]').click();
  await page.waitForSelector('.wd-context');
  assert.equal(await page.locator('.wd .notice').count(), 0, 'a new piece is not announced as recovered');
  assert.match(await page.locator('.wd-context').innerText(), /Open Studio weekend[\s\S]*Its words in conversation[\s\S]*Around it[\s\S]*Ines Okafor/i); ok('the desk shows the object, its words, and what surrounds it');
  await page.locator('#desk-body').fill('Notes toward a spring open studio.\n');
  await page.locator('[data-insert="0"]').click();
  const body = await page.locator('#desk-body').inputValue();
  assert.match(body, /“Something new: I want to do an Open Studio weekend[^”]*” — me, in conversation/); ok('a quotation is inserted with who said it');
  await page.waitForFunction(() => /Draft saved/i.test(document.querySelector('.wd-status')?.innerText || ''));
  await page.reload(); await page.waitForSelector('.wd-context');
  assert.equal(await page.locator('#desk-body').inputValue(), body); ok('the connected draft survives a reload');
  await shot(page, '08-writing-connected');
  await page.locator('[data-act="desk-keep"]').click();
  await page.waitForFunction(() => /Revision 1 kept|revision 1 kept/i.test(document.querySelector('.wd-status')?.innerText || ''));
  const pinned = await db(page, async (s) => {
    const items = await s.items(), links = await s.links(), srcs = await s.sources();
    const w = srcs.find((x) => x.kind === 'writing' && x.revisions[0].title === 'Open Studio weekend');
    const c = items.find((i) => i.kind === 'source' && i.sourceId === w.id);
    const proj = items.find((i) => i.title === 'Open Studio weekend');
    return { c: Boolean(c), linked: links.some((l) => (l.a === proj.id && l.b === c.id) || (l.b === proj.id && l.a === c.id)) };
  });
  assert.ok(pinned.c && pinned.linked); ok('kept writing is pinned beside its object on TABLET');

  // ---- 9. search reaches conversation objects ----
  await page.goto(BASE + '#whiteboard'); await page.waitForSelector('.card');
  await page.locator('#q').fill('invitation');
  assert.match(await page.locator('.insp').innerText(), /Search · “invitation”[\s\S]*Print the invitation/i); ok('search finds objects that came from conversation');
  await page.locator('#q').fill('');

  // ---- 10. export → restore elsewhere ----
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#export').click()]);
  const file = path.join(os.tmpdir(), 'tangerine-prototype-e2e.json');
  await dl.saveAs(file);
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(data.version, 3); assert.equal(data.sources.filter((s) => s.kind === 'conversation').length, 2);
  assert.ok(data.proposals.length >= nProps); ok('export includes both captures and every proposal');
  const other = await fresh({ viewport: { width: 1180, height: 820 } }, '#capture');
  await other.page.locator('#restore-file').setInputFiles(file);
  await other.page.waitForSelector('#dlg[open] [data-dlg="apply"]');
  await other.page.locator('#dlg [data-dlg="apply"]').click();
  await other.page.waitForFunction(() => document.querySelectorAll('.cp-list [data-capture]').length === 2);
  const restored = await db(other.page, async (s) => ({ items: (await s.items()).filter((i) => i.origin === 'conversation').length, props: (await s.proposals()).length }));
  assert.equal(restored.props, data.proposals.length); assert.ok(restored.items >= 12); ok('a restored copy has the captures, proposals and objects');
  fs.unlinkSync(file);
  await other.ctx.close();

  // ---- 11. remove the demonstration ----
  await page.goto(BASE + '#whiteboard'); await page.waitForSelector('.card');
  await page.locator('#remove-demo').click();
  await page.waitForFunction(() => document.getElementById('demo-note').hidden);
  const left = await db(page, async (s) => ({ srcs: await s.sources(), items: await s.items(), props: await s.proposals() }));
  assert.ok(!left.srcs.some((x) => x.demonstration) && !left.items.some((x) => x.demonstration) && !left.props.some((x) => x.demonstration)); ok('removing the demonstration clears the sample capture, its proposals and objects');
  assert.ok(left.srcs.some((x) => x.kind === 'writing' && x.revisions[0].title === 'Open Studio weekend') && left.srcs.some((x) => x.kind === 'conversation')); ok('what you wrote and captured yourself stays');
  await ctx.close();

  // ---- 12. other surfaces ----
  for (const [w, h, label] of [[1180, 820, 'tablet'], [820, 1180, 'tablet-portrait'], [390, 844, 'phone']]) {
    const f = await fresh({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: w < 900 }, '#capture');
    await f.page.locator('[data-act="cap-sample"]').click();
    await f.page.locator('[data-form="capture"] button[type="submit"]').click();
    await f.page.locator('[data-act="cap-keep"]').click();
    await f.page.waitForSelector('.cp-review .prop');
    await noOverflow(f.page, label + ' capture');
    if (label === 'tablet-portrait') await shot(f.page, '09-capture-portrait');
    await f.page.locator('[data-act="cap-accept-yours"]').click();
    await f.page.waitForSelector('.prop.accepted');
    await f.page.locator('.nav a[data-view="whiteboard"]').click(); await f.page.waitForSelector('.card');
    await f.page.waitForTimeout(1300);
    await noOverflow(f.page, label + ' TABLET');
    if (label === 'tablet') await shot(f.page, '10-tablet-landscape');
    if (label === 'phone') await shot(f.page, '11-tablet-phone');
    ok(label + ': capture and TABLET without horizontal scroll');
    await f.ctx.close();
  }

  assert.deepEqual(errors, []); ok('no console or page errors');
  console.log(`\n${n} checks passed (board before capture: ${boardBefore} demonstration cards)`);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
