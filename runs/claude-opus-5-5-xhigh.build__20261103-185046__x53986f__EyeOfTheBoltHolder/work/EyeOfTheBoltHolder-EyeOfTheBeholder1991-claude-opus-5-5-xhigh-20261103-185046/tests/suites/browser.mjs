// browser (Playwright, Chromium on SwiftShader, the bundle from file://): it boots to the title with no errors and no
// request but jsDelivr; the 3D view is not blank; Enter -> Quick Start -> skip the intro -> play at the start; a scripted
// walk and fight; 10.5 s idle starts the attract mode and a key ends it; a phone shows the touch notice and no touch
// controls; the engine's own checker finds no errors
import { open, bootWait, ARGS } from '../shot.mjs';
import { decode, colors } from '../png.mjs';
import { execFileSync } from 'node:child_process';
export async function run(t) {
  process.env.TMPDIR = new URL('../../.tmp/', import.meta.url).pathname;
  const { browser, page, errors } = await open({ w: 1280, h: 720 });
  const reqs = new Set(); page.on('request', r => { const u = r.url(); if (/^https?:/.test(u)) reqs.add(new URL(u).host); });
  try {
    await bootWait(page); await page.waitForTimeout(800);
    t.check('it boots to the title', await page.evaluate(() => window.__game.sceneName) === 'title');
    t.check('no request but jsDelivr', [...reqs].every(h => h === 'cdn.jsdelivr.net'), [...reqs].join(','));
    const shot1 = decode(await page.screenshot()); t.check('the title\'s 3D stage is not blank', colors(shot1, [0, 0, 1280, 400]) > 40, colors(shot1));
    await page.keyboard.press('Enter'); await page.waitForTimeout(700);
    t.check('Enter opens creation', await page.evaluate(() => window.__game.sceneName) === 'create');
    await page.evaluate(() => { window.__game.scenes.create.focus = 'quick'; }); await page.keyboard.press('Enter'); await page.waitForTimeout(800);
    t.check('Quick Start plays the intro', await page.evaluate(() => window.__game.sceneName) === 'cutscene');
    await page.keyboard.down('Escape'); await page.waitForTimeout(1600); await page.keyboard.up('Escape'); await page.waitForTimeout(1000);
    const s = await page.evaluate(() => window.__game.debug.snapshot());
    t.check('holding Esc skips into play at the Drains\' start', s.scene === 'play' && s.floor === 'f1' && s.cell[0] === 2 && s.cell[1] === 14, JSON.stringify(s).slice(0, 200));
    const shot2 = decode(await page.screenshot()); t.check('the dungeon view is drawn (many colours)', colors(shot2, [0, 60, 1280, 500]) > 60, colors(shot2, [0, 60, 1280, 500]));
    // a scripted walk and fight: the lever, the gate, the rats
    // a scripted walk and fight (waiting on the game's state: software rendering runs the 3D slowly)
    const idle = () => page.waitForFunction(() => { const P = window.__game.debug.S.party; return !P.tw && !P.queued && !P.busy; }, null, { timeout: 30000, polling: 50 });
    const key = async k => { await page.keyboard.press(k); await page.waitForTimeout(80); await idle(); };
    for (const k of ['KeyW', 'KeyW', 'KeyW', 'KeyE', 'KeyF']) await key(k);
    await page.waitForFunction(() => window.__game.debug.S.floors.f1.doors.G1.open > .9, null, { timeout: 30000 });
    for (const k of ['KeyQ', 'KeyW', 'KeyW']) await key(k);
    const s2 = await page.evaluate(() => window.__game.debug.snapshot());
    t.check('the walk pulled the lever and went through the gate', s2.cell[0] === 2 && s2.cell[1] === 9, JSON.stringify(s2.cell));
    let fought = false;
    for (let i = 0; i < 60 && !fought; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(500); fought = await page.evaluate(() => { const S = window.__game.debug.S; return S.stats.kills > 0 || S.party.members.some(m => m.hp < m.max); }); }
    t.check('a fight happened (something took harm or died)', fought);
    t.check('no errors in play', !errors.length && !(await page.evaluate(() => window.__game.errors.length)), errors.concat(await page.evaluate(() => window.__game.errors.map(e => e.message))).join(' | '));
    // the attract mode from the title
    await page.evaluate(() => window.__game.go('title')); await page.mouse.move(5, 5); await page.waitForFunction(() => window.__game.sceneName === 'title', null, { timeout: 15000 }); await page.waitForTimeout(9000);
    t.check('9 s on the title: not yet', await page.evaluate(() => window.__game.sceneName) === 'title');
    let att = false; try { await page.waitForFunction(() => window.__game.sceneName === 'attract', null, { timeout: 12000 }); att = true; } catch (e) { }
    t.check('10 s idle on the title starts the attract mode', att && await page.evaluate(() => window.__game.debug.B.Idle.t) >= 0);
    await page.waitForTimeout(2500); await page.keyboard.press('KeyZ'); let back = false; try { await page.waitForFunction(() => window.__game.sceneName === 'title', null, { timeout: 20000 }); back = true; } catch (e) { }
    t.check('any key (even an unbound one) returns to the title', back);
  } finally { await browser.close(); }
  // a phone held upright: the notice, no touch controls
  const ph = await open({ ctx: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true } });
  try {
    await bootWait(ph.page); await ph.page.waitForTimeout(800);
    t.check('touch-only: the notice', await ph.page.evaluate(() => window.__game.debug.B.touchOnly()));
    t.check('touch-only: no touch stick or buttons', await ph.page.evaluate(() => window.__game.input.touchEnabled === false && !document.querySelector('[data-act]')));
    const menuBtn = await ph.page.evaluate(() => { const b = document.querySelector('#e3-corner button[aria-label="Menu"]'); return !!b && getComputedStyle(b).display !== 'none' && getComputedStyle(b.parentElement).display !== 'none'; });
    t.check('touch-only: the settings (menu) button stays on screen', menuBtn);
    await ph.page.tap('#e3-corner button[aria-label="Menu"]'); await ph.page.waitForTimeout(800);
    t.check('touch-only: the button opens Settings', await ph.page.evaluate(() => /Settings/.test(document.body.innerText)));
    await ph.page.keyboard.press('Escape'); await ph.page.waitForTimeout(400);
    let att = false; try { await ph.page.waitForFunction(() => window.__game.sceneName === 'attract', null, { timeout: 25000 }); att = true; } catch (e) { }
    t.check('touch-only: the attract mode runs', att);
    t.check('touch-only: no errors', !ph.errors.length, ph.errors.join(' | '));
  } finally { await ph.browser.close(); }
  // the engine's checker
  let out = ''; try { out = execFileSync('node', [new URL('../../tools/engine-tools/check.mjs', import.meta.url).pathname, new URL('../../../EyeOfTheBoltHolder-EyeOfTheBeholder1991-claude-opus-5-5-xhigh-20261103-185046.html', import.meta.url).pathname, '--seconds', '25', '--out', new URL('../out/check', import.meta.url).pathname], { encoding: 'utf8', timeout: 240000 }); } catch (e) { out = String(e.stdout || '') + ' EXIT ' + e.status; }
  t.check('tools/check.mjs: no errors', /no errors/.test(out) && !/EXIT/.test(out), out.split('\n').filter(l => /error|EXIT/i.test(l)).join(' | '));
}
