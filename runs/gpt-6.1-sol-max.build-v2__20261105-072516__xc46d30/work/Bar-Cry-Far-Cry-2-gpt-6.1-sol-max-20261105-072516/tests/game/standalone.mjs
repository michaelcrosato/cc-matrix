/** @file Real standalone co-op checks: BroadcastChannel rooms and WebRTC invite/reply codes across browser contexts. */
import { chromium } from '@playwright/test';
import { args, executablePath, ready } from './browser.mjs';
let passed = 0,
  failed = 0;
function check(name, ok, why = '') {
  if (ok) passed++;
  else {
    failed++;
    console.log(`FAIL ${name}${why ? ': ' + String(why).slice(0, 200) : ''}`);
  }
}
const browser = await chromium.launch({ executablePath, args });
try {
  const c = await browser.newContext({ viewport: { width: 960, height: 540 } }),
    a = await c.newPage(),
    b = await c.newPage();
  try {
    await ready(a);
    await a.evaluate(() => window.__game.open('lobby'));
    await a.getByRole('button', { name: 'Host · same computer', exact: true }).click();
    const room = await a.evaluate(() => window.__game.context.net.room);
    await ready(b);
    await b.evaluate(() => window.__game.open('lobby'));
    await b.getByRole('button', { name: 'Join · same computer', exact: true }).click();
    await b.getByLabel('Room code').fill(room);
    await b.getByRole('button', { name: 'Join room', exact: true }).click();
    await a.waitForFunction(() => window.__game.context.net.players.length === 2);
    await b.waitForFunction(() => window.__game.context.net.players.length === 2);
    check('tab crew joins', true);
    await a.getByRole('button', { name: 'Start contract', exact: true }).click();
    await b.waitForFunction(() => window.__game.context.c?.mode === 'contract', undefined, { timeout: 60000 });
    await a.waitForFunction(() => window.__game.context.net.digests?.size > 0, undefined, { timeout: 60000 });
    await b.waitForFunction(() => window.__game.context.net.digests?.size > 0, undefined, { timeout: 60000 });
    const ah = await a.evaluate(() => [...window.__game.context.net.digests]),
      bh = await b.evaluate(() => [...window.__game.context.net.digests]);
    const match = ah.find(([tick, h]) => bh.some(([t, k]) => tick === t && h === k));
    check('tab lockstep agreement', !!match);
  } catch (e) {
    check('tab contract', false, e.message);
  } finally {
    await c.close();
  }
  const ca = await browser.newContext({ viewport: { width: 960, height: 540 } }),
    cb = await browser.newContext({ viewport: { width: 960, height: 540 } }),
    p = await ca.newPage(),
    q = await cb.newPage();
  try {
    await ready(p);
    await p.evaluate(() => window.__game.open('lobby'));
    await p.getByRole('button', { name: 'Host · invite code', exact: true }).click();
    await p.getByRole('button', { name: 'Make invitation', exact: true }).click();
    await p.waitForFunction(
      () => document.querySelector('textarea[aria-label="Your invitation"]').value.length > 100,
      undefined,
      { timeout: 20000 },
    );
    const offer = await p.getByLabel('Your invitation').inputValue();
    await ready(q);
    await q.evaluate(() => window.__game.open('lobby'));
    await q.getByRole('button', { name: 'Join · invite code', exact: true }).click();
    await q.getByLabel('Host invitation').fill(offer);
    await q.getByRole('button', { name: 'Make reply', exact: true }).click();
    await q.waitForFunction(
      () => document.querySelector('textarea[aria-label="Your reply"]').value.length > 100,
      undefined,
      { timeout: 20000 },
    );
    const reply = await q.getByLabel('Your reply').inputValue();
    await p.getByLabel('Guest reply').fill(reply);
    await p.getByRole('button', { name: 'Accept guest reply', exact: true }).click();
    await p.waitForFunction(() => window.__game.context.net.players.length === 2, undefined, { timeout: 20000 });
    await q.waitForFunction(() => window.__game.context.net.players.length === 2, undefined, { timeout: 20000 });
    check('RTC connects across contexts', true);
    await p.getByRole('button', { name: 'Start contract', exact: true }).click();
    await q.waitForFunction(() => window.__game.context.c?.mode === 'contract', undefined, { timeout: 60000 });
    await p.waitForFunction(() => window.__game.context.net.digests?.size > 0, undefined, { timeout: 60000 });
    await q.waitForFunction(() => window.__game.context.net.digests?.size > 0, undefined, { timeout: 60000 });
    const ah = await p.evaluate(() => [...window.__game.context.net.digests]),
      bh = await q.evaluate(() => [...window.__game.context.net.digests]);
    check(
      'RTC lockstep agreement',
      ah.some(([t, h]) => bh.some(([tick, k]) => t === tick && h === k)),
    );
  } catch (e) {
    check('RTC contract', false, e.message);
  } finally {
    await ca.close();
    await cb.close();
  }
} finally {
  await browser.close();
}
console.log(`COUNT ${passed} ${failed}`);
