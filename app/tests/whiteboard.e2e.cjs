// Browser check for the Whiteboard study.
//   python3 -m http.server 4321 --bind 127.0.0.1   (from the repository root)
//   node app/tests/whiteboard.e2e.cjs [--shots docs/foundation-001/screens]
const { chromium, devices } = require('playwright');
const assert = require('node:assert/strict');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4321/app/';
const shotsAt = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const fresh = async (opts) => {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('dialog', (d) => d.accept());
    await page.goto(BASE);
    await page.waitForSelector('.card');
    return { ctx, page };
  };
  const shot = async (page, name) => { if (!shotsAt) return; await page.evaluate(() => document.querySelector('.toast')?.remove()); await page.screenshot({ path: `${shotsAt}/${name}.png` }); };
  const noOverflow = async (page, label) => {
    const w = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(w <= 0, `${label}: page scrolls horizontally by ${w}px`);
  };
  const until = (page, sel, re) => page.waitForFunction(([sel, src, fl]) => new RegExp(src, fl).test(document.querySelector(sel)?.innerText || ''), [sel, re.source, re.flags], { timeout: 5000 });
  let n = 0; const ok = (m) => console.log('ok', ++n, m);

  // ---- tablet landscape: the primary surface ----
  {
    const { ctx, page } = await fresh({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true });
    assert.equal(await page.locator('.card').count(), 9); ok('demonstration board renders 9 items');
    assert.equal(await page.locator('.links line').count(), 7); ok('7 links drawn');
    assert.equal(await page.locator('.card .now-tag').count(), 1); ok('exactly one item is now');
    assert.match(await page.locator('.insp').innerText(), /Desk clock, No\. 1[\s\S]*Next move/i); ok('inspector opens on the cold open of the now project');
    assert.equal(await page.locator('#demo-note').isVisible(), true); ok('demonstration is labeled');
    await noOverflow(page, 'tablet');
    await shot(page, '01-whiteboard-tablet');

    // select a project: bookmark + related sources with reasons
    await page.locator('.card', { hasText: 'Notebook, 80 sheets' }).click();
    const insp = await page.locator('.insp').innerText();
    assert.match(insp, /Related in the archive/i); assert.match(insp, /Shared words:/); assert.match(insp, /Paper/);
    ok('project shows derived, explained suggestions');
    await shot(page, '02-project-selected');

    // pin a suggested source beside the project; the original is untouched
    const before = await page.evaluate(async () => JSON.stringify(await (await TangerineStore.openStore()).getSource('demo-src-5')));
    await page.locator('.insp [data-pin="demo-src-5"]').click();
    await page.waitForSelector('.card.sel.source');
    assert.equal(await page.locator('.card').count(), 10); ok('pinning adds a reference card and links it');
    const after = await page.evaluate(async () => JSON.stringify(await (await TangerineStore.openStore()).getSource('demo-src-5')));
    assert.equal(after, before); ok('pinned source is byte-identical to the original');
    await page.locator('.insp [data-verify]').click();
    await page.locator('.insp .ok').waitFor();
    assert.match(await page.locator('.insp').innerText(), /verified/i); ok('fingerprint verifies');
    await shot(page, '03-source-pinned');

    // drag a card; the position persists
    const pos = () => page.evaluate(async () => (await (await TangerineStore.openStore()).items()).find((i) => i.id === 'demo-itm-6'));
    const p0 = await pos();
    const card = page.locator('.card', { hasText: 'Make nothing that cannot be repaired' });
    await card.scrollIntoViewIfNeeded();
    const box = await card.boundingBox();
    await page.mouse.move(box.x + 20, box.y + 20); await page.mouse.down();
    await page.mouse.move(box.x + 120, box.y + 60, { steps: 6 }); await page.mouse.up();
    await page.waitForTimeout(150);
    await page.reload(); await page.waitForSelector('.card');
    const p1 = await pos();
    assert.ok(Math.abs(p1.x - p0.x - 100) <= 8 && Math.abs(p1.y - p0.y - 40) <= 8 && p1.x % 8 === 0, `card moved and persisted ${JSON.stringify([p0.x, p0.y, p1.x, p1.y])}`);
    assert.equal(await page.locator('.card[data-id="demo-itm-6"]').evaluate((el) => el.style.left), p1.x + 'px');
    ok('drag snaps to the grid and persists across reload');

    // leave a bookmark: append-only
    await page.locator('.card[data-id="demo-itm-1"]').click();
    await page.locator('[data-act="bookmark"]').click();
    await page.fill('[name="next"]', 'Set the first spread in the studio.');
    await page.locator('[data-form="bookmark"] button[type="submit"]').click();
    await until(page, '.insp', /Earlier bookmarks · 1/i);
    const t = await page.locator('.insp').innerText();
    assert.match(t, /Set the first spread/); assert.match(t, /Earlier bookmarks · 1/i); ok('new bookmark kept, earlier one retained');

    // add and link
    await page.locator('[data-add="idea"]').click();
    await page.fill('.insp [name="title"]', 'A clock that keeps a diary');
    await page.locator('[data-form="add"] button[type="submit"]').click();
    await page.locator('.card', { hasText: 'A clock that keeps a diary' }).waitFor();
    await page.locator('[data-link]').click();
    await page.locator('.card', { hasText: 'A clock that keeps a diary' }).click();
    await page.locator('.card[data-id="demo-itm-2"]').click();
    await page.fill('[data-form="link"] [name="note"]', 'Same object');
    await page.locator('[data-form="link"] button[type="submit"]').click();
    await until(page, '.insp', /Same object/);
    assert.match(await page.locator('.insp').innerText(), /Same object/); ok('new idea placed and linked with a note');

    // search
    await page.keyboard.press('Escape');
    await page.keyboard.press('/'); await page.keyboard.type('dial');
    await until(page, '.insp', /dial measurements/);
    assert.match(await page.locator('.insp').innerText(), /Search · “dial”[\s\S]*Desk clock — dial measurements/i); ok('search reaches the archive');
    await page.keyboard.press('Escape');

    // archive: collected material cannot be revised; writing revises append-only
    await page.goto(BASE + '#archive/demo-src-4'); await page.locator('.ar-detail').waitFor();
    assert.equal(await page.locator('[data-act="revise"]').count(), 0); ok('collected passage offers no revision');
    await shot(page, '04-archive-collected');
    await page.goto(BASE + '#archive/demo-src-1'); await page.locator('.ar-detail').waitFor();
    await page.locator('[data-act="revise"]').click();
    await page.fill('[data-form="revise"] [name="body"]', 'A second version, by the author.');
    await page.locator('[data-form="revise"] button[type="submit"]').click();
    await page.locator('.ar-detail .revs').waitFor();
    const a = await page.locator('.ar-detail').innerText();
    assert.match(a, /Revision 2/i); assert.match(a, /Revision 1 ·.*original/i); assert.match(a, /The rooms I remember best/);
    ok('author revision kept beside the untouched original');

    await page.goto(BASE + '#return'); await page.locator('.rt').waitFor();
    const rt = await page.locator('.rt').innerText();
    assert.match(rt, /On this day[\s\S]*years ago/i); assert.match(rt, /The rooms I remember best/); assert.match(rt, /revised 1× since/i);
    ok('return resurfaces the same day, as first kept');
    await shot(page, '05-return');
    await ctx.close();
  }

  // ---- desktop & portrait tablet ----
  for (const [w, h, name] of [[1440, 900, '06-whiteboard-desktop'], [820, 1180, '07-whiteboard-tablet-portrait']]) {
    const { ctx, page } = await fresh({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    await noOverflow(page, name); ok(`${w}×${h} no horizontal page scroll`);
    await shot(page, name);
    await ctx.close();
  }

  // ---- phone: the board becomes a ledger ----
  {
    const { ctx, page } = await fresh({ ...devices['iPhone 13'] });
    await noOverflow(page, 'phone');
    const over = await page.locator('.card').first().evaluate((el) => el.getBoundingClientRect().right - window.innerWidth);
    assert.ok(over <= 0, 'phone card overflows by ' + over); ok('phone has no horizontal overflow');
    const pos = await page.locator('.card').first().evaluate((el) => getComputedStyle(el).position);
    assert.equal(pos, 'relative'); ok('cards flow as a list on phones');
    await shot(page, '08-whiteboard-phone');
    await page.locator('.card[data-id="demo-itm-1"]').tap();
    assert.match(await page.locator('.insp').innerText(), /Small Rooms/); ok('tap opens the item');
    await ctx.close();
  }

  await browser.close();
  assert.deepEqual(errors, [], 'no page errors'); ok('no console or page errors');
})().catch((e) => { console.error(e); process.exit(1); });
