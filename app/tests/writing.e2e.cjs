// Browser check for the Writing desk, drafts, backup and restore.
//   python3 -m http.server 4321 --bind 127.0.0.1   (from the repository root)
//   node app/tests/writing.e2e.cjs [--shots docs/foundation-001/screens]
const { chromium, devices } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:4321/app/';
const shotsAt = process.argv.includes('--shots') ? process.argv[process.argv.indexOf('--shots') + 1] : null;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'tangerine-e2e-'));

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const open = async (opts, hash = '#writing') => {
    const ctx = await browser.newContext({ acceptDownloads: true, ...opts });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('dialog', (d) => d.accept());
    await page.goto(BASE + hash);
    await page.waitForSelector(hash.startsWith('#writing') ? '.wd' : 'main > *');
    return { ctx, page };
  };
  const shot = async (page, name) => { if (!shotsAt) return; await page.evaluate(() => document.querySelector('.toast')?.remove()); await page.screenshot({ path: `${shotsAt}/${name}.png` }); };
  const noOverflow = async (page, label) => {
    const w = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert.ok(w <= 0, `${label}: page scrolls horizontally by ${w}px`);
  };
  const dlgShows = (page, re) => page.waitForFunction(([src, fl]) => { const d = document.querySelector('#dlg'); return d && d.open && new RegExp(src, fl).test(d.innerText); }, [re.source, re.flags], { timeout: 5000 });
  const status = (page) => page.locator('.wd-status').innerText();
  const savedDraft = (page) => page.waitForFunction(() => /Draft saved/i.test(document.querySelector('.wd-status')?.innerText || ''), null, { timeout: 5000 });
  let n = 0; const ok = (m) => console.log('ok', ++n, m);
  const ESSAY = 'Placeholder text for the test, not an essay.\n\nA second paragraph, so the desk has more than one.';

  const { ctx, page } = await open({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, hasTouch: true });
  assert.equal(await page.locator('.nav a[data-view="writing"][aria-current="page"]').count(), 1); ok('Writing is an environment in the bar');

  // a new piece, autosaved as a draft
  await page.locator('[data-act="desk-new"]').click();
  await page.locator('#desk-title').fill('Test piece');
  await page.locator('#desk-body').fill(ESSAY);
  await savedDraft(page);
  assert.match(await status(page), /not yet kept/i); ok('typing autosaves a draft, labeled not yet kept');
  assert.match(await page.locator('#desk-words').innerText(), /^18 words$/i); ok('word count');
  const col = await page.locator('.wd-body').boundingBox();
  assert.ok(col.width <= 680 && col.width >= 560, 'text column ' + col.width); ok('text column is a comfortable measure (' + Math.round(col.width) + 'px)');
  await noOverflow(page, 'desk tablet');
  await shot(page, '09-writing-desk-tablet');

  // reload: the draft comes back
  await page.reload(); await page.waitForSelector('.wd');
  assert.equal(await page.locator('#desk-body').inputValue(), ESSAY);
  assert.match(await page.locator('.wd').innerText(), /Recovered an unfinished draft/); assert.match(await page.locator('#draft-count').innerText(), /1 draft/i);
  ok('after reload the draft is recovered and announced');

  // a crash before the autosave fires: the safety copy recovers it
  await page.locator('#desk-body').press('Control+End'); await page.keyboard.type(' Last words.');
  await page.evaluate(() => { location.reload(); });
  await page.waitForSelector('.wd');
  assert.match(await page.locator('#desk-body').inputValue(), /Last words\.$/); ok('text typed just before a reload is not lost');

  // leaving mid-sentence and coming back
  await page.locator('#desk-body').press('Control+End'); await page.keyboard.type(' More.');
  await page.locator('.nav a[data-view="whiteboard"]').click(); await page.waitForSelector('.card');
  await page.locator('.nav a[data-view="writing"]').click(); await page.waitForSelector('.wd');
  assert.match(await page.locator('#desk-body').inputValue(), /More\.$/); ok('switching environments keeps the draft');

  // keep: revision 1, fingerprinted; draft cleared
  await page.locator('[data-act="desk-keep"]').click();
  await page.waitForFunction(() => /revision 1 kept/i.test(document.querySelector('.wd-status')?.innerText || ''));
  assert.equal(await page.locator('#draft-count').innerText(), ''); ok('keeping makes an original and clears the draft');
  const kept = await page.evaluate(async () => (await (await TangerineStore.openStore()).sources()).find((s) => s.revisions[0].title === 'Test piece'));
  assert.match(kept.revisions[0].sha256, /^[0-9a-f]{64}$/); assert.equal(kept.provenance, 'Written in Tangerine'); ok('the original is fingerprinted, with provenance');

  // revise at the desk
  await page.locator('#desk-body').press('Control+End'); await page.keyboard.type('\n\nA third paragraph.');
  await savedDraft(page);
  assert.match(await page.locator('[data-act="desk-keep"]').innerText(), /Keep revision 2/);
  await page.locator('[data-act="desk-keep"]').click();
  await page.waitForFunction(() => /revision 2 kept/i.test(document.querySelector('.wd-status')?.innerText || ''));
  await page.goto(BASE + '#archive/' + encodeURIComponent(kept.id)); await page.waitForSelector('.ar-detail .revs');
  const ar = await page.locator('.ar-detail').innerText();
  assert.match(ar, /Revision 2/i); assert.match(ar, /Revision 1 ·.*original/i); ok('a desk revision sits beside the original in the archive');
  await page.locator('.ar-detail [data-verify]').click(); await page.locator('.ar-detail .ok').waitFor();
  assert.match(await page.locator('.ar-detail .prov').innerText(), /verified/i); ok('verifies on a secure connection');

  // an unkept draft that should be in the backup
  await page.goto(BASE + '#writing'); await page.waitForSelector('.wd');
  await page.locator('[data-act="desk-new"]').click();
  await page.locator('#desk-title').fill('Unfinished');
  await page.locator('#desk-body').fill('Half a thought');
  await savedDraft(page);

  // export
  const [dl] = await Promise.all([page.waitForEvent('download'), page.locator('#export').click()]);
  const file = path.join(TMP, await dl.suggestedFilename()); await dl.saveAs(file);
  const dump = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(dump.format, 'tangerine/foundation-001'); assert.equal(dump.drafts.length, 1);
  assert.match(await page.locator('#last-copy').innerText(), /today/i); ok('export includes drafts and records the last copy');
  await ctx.close();

  // restore into a fresh browser
  {
    const { ctx, page } = await open({ viewport: { width: 1180, height: 820 } }, '#archive');
    const before = await page.evaluate(async () => (await (await TangerineStore.openStore()).sources()).length);
    // a tampered copy is refused
    const bad = JSON.parse(JSON.stringify(dump)); bad.sources.find((s) => s.id === kept.id).revisions[0].body = 'changed by someone else';
    fs.writeFileSync(path.join(TMP, 'bad.json'), JSON.stringify(bad));
    await page.setInputFiles('#restore-file', path.join(TMP, 'bad.json'));
    await dlgShows(page, /did not pass validation[\s\S]*fingerprint/i);
    await page.locator('#dlg [data-dlg="close"]').click();
    assert.equal(await page.evaluate(async () => (await (await TangerineStore.openStore()).sources()).length), before); ok('an altered copy is refused and nothing changes');
    fs.writeFileSync(path.join(TMP, 'junk.json'), '{ not json');
    await page.setInputFiles('#restore-file', path.join(TMP, 'junk.json'));
    await dlgShows(page, /not valid JSON/i); await page.locator('#dlg [data-dlg="close"]').click(); ok('a file that is not JSON is refused');

    await page.setInputFiles('#restore-file', file);
    await page.locator('#dlg [data-dlg="apply"]').waitFor();
    const plan = await page.locator('#dlg').innerText();
    assert.match(plan, /Nothing already kept in this browser will be replaced/i); assert.match(plan, /fingerprints checked and matching/i);
    await shot(page, '10-restore-preview');
    await page.locator('#dlg [data-dlg="apply"]').click();
    await page.waitForFunction(() => !document.querySelector('#dlg')?.open);
    const after = await page.evaluate(async () => { const s = await TangerineStore.openStore(); return { src: (await s.sources()).find((x) => x.revisions[0].title === 'Test piece'), drafts: await s.drafts() }; });
    assert.equal(after.src.revisions.length, 2); assert.equal(after.drafts.length, 1); ok('a valid copy restores originals, revisions and drafts');

    await page.setInputFiles('#restore-file', file);
    await dlgShows(page, /Everything here already/i); await page.locator('#dlg [data-dlg="close"]').click(); ok('restoring the same copy again adds nothing');
    await page.goto(BASE + '#writing'); await page.waitForSelector('.wd');
    assert.match(await page.locator('.wd-list').innerText(), /Unfinished[\s\S]*Draft · not yet kept/i); ok('the restored draft is on the desk');
    await ctx.close();
  }

  // a local-network connection, where SHA-256 is unavailable
  {
    const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 } });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(BASE + '#archive/demo-src-1'); await page.waitForSelector('.ar-detail [data-verify]'); // kept with a fingerprint
    await ctx.addInitScript(() => Object.defineProperty(window.crypto, 'subtle', { value: undefined }));
    await page.reload(); await page.waitForSelector('.ar-detail [data-verify]');
    await page.locator('.ar-detail [data-verify]').click();
    await page.waitForFunction(() => /cannot verify/i.test(document.querySelector('.ar-detail .prov')?.innerText || ''));
    const t = await page.locator('.ar-detail .prov').innerText();
    assert.doesNotMatch(t, /verified/i); assert.match(t, /cannot verify on this connection/i); assert.match(t, /127\.0\.0\.1/);
    ok('without SHA-256 the archive says it cannot verify, never “verified”');
    await page.goto(BASE + '#writing'); await page.waitForSelector('.wd');
    await page.locator('[data-act="desk-new"]').click();
    await page.locator('#desk-title').fill('Kept over the network'); await page.locator('#desk-body').fill('Words.');
    await page.locator('[data-act="desk-keep"]').click();
    await page.waitForFunction(() => /revision 1 kept/i.test(document.querySelector('.wd-status')?.innerText || ''));
    await page.locator('.wd-foot a', { hasText: 'Open in archive' }).click();
    await page.locator('.ar-detail [data-verify]').click();
    await page.waitForFunction(() => /not taken when kept/i.test(document.querySelector('.ar-detail .prov')?.innerText || ''));
    assert.doesNotMatch(await page.locator('.ar-detail .prov').innerText(), /verified/i);
    ok('writing kept without a fingerprint is labeled as such, never “verified”');
    await ctx.close();
  }

  // yesterday's database (version 1, no drafts) upgrades without losing anything
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(BASE + 'tests/');
    await page.evaluate(() => new Promise((ok, fail) => {
      const req = indexedDB.open('tangerine-foundation-001', 1);
      req.onupgradeneeded = () => ['sources', 'items', 'links', 'derived', 'meta'].forEach((c) => req.result.createObjectStore(c));
      req.onsuccess = () => {
        const tx = req.result.transaction(['sources', 'meta'], 'readwrite');
        tx.objectStore('sources').put({ id: 'v1-src', kind: 'writing', keptAt: '2026-11-08T20:00:00Z', madeOn: '2026-11-08', revisions: [{ n: 1, at: '2026-11-08T20:00:00Z', by: 'author', title: 'Kept yesterday', body: 'Before the upgrade.', sha256: null }] }, 'v1-src');
        tx.objectStore('meta').put('removed', 'demonstration');
        tx.oncomplete = () => { req.result.close(); ok(); }; tx.onerror = () => fail(tx.error);
      };
    }));
    await page.goto(BASE + '#writing'); await page.waitForSelector('.wd');
    assert.match(await page.locator('.wd-list').innerText(), /Kept yesterday/);
    assert.match(await page.locator('#storage').innerText(), /this browser only/i);
    ok('a version 1 database upgrades with its originals intact');
    await ctx.close();
  }

  // portrait tablet and phone
  for (const [opts, name] of [[{ viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2 }, '11-writing-desk-portrait'], [devices['iPhone 13'], '12-writing-desk-phone']]) {
    const { ctx, page } = await open(opts);
    await noOverflow(page, name); ok(name + ': no horizontal page scroll');
    await shot(page, name);
    await ctx.close();
  }

  await browser.close();
  fs.rmSync(TMP, { recursive: true, force: true });
  assert.deepEqual(errors, [], 'no page errors'); ok('no console or page errors');
})().catch((e) => { console.error(e); process.exit(1); });
