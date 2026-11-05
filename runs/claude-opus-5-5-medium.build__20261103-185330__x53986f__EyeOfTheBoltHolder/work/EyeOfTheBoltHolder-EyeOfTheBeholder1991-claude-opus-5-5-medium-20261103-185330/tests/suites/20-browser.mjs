// browser (Playwright, headless Chromium, SwiftShader WebGL 2): the bundled root file from file://
import { chromium } from 'playwright';
import { NAME } from '../../tools/build.mjs';
const root = new URL('../../..', import.meta.url).pathname;
export const ARGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-webgpu-adapter=swiftshader', '--disable-vulkan-surface', '--autoplay-policy=no-user-gesture-required'];
const NOISE = /GPU stall|deprecated parameters|GL Driver|WebGPU is experimental|powerPreference/;
export default async check => {
  const browser = await chromium.launch({ args: ARGS });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errs = [], reqs = [];
    page.on('pageerror', e => errs.push('pageerror ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !NOISE.test(m.text())) errs.push(m.text().slice(0, 200)); });
    page.on('request', r => { const u = r.url(); if (!u.startsWith('file:') && !u.startsWith('data:') && !u.startsWith('blob:') && !u.includes('cdn.jsdelivr.net')) reqs.push(u); });
    await page.goto('file://' + root + NAME + '.html?backend=webgl');
    await page.waitForFunction(() => window.B && B.game && B.game.sceneName === 'title', null, { timeout: 120000 });
    await page.waitForTimeout(1200);
    check('boots to the title with no errors', !errs.length, errs.join(' | '));
    check('no request but the CDN', !reqs.length, reqs.join(' '));
    const png = (await page.screenshot({ clip: { x: 0, y: 0, width: 400, height: 260 } })).toString('base64');
    const spread = await page.evaluate(async b64 => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const g = document.createElement('canvas'); g.width = 80; g.height = 52; const x = g.getContext('2d'); x.drawImage(im, 0, 0, 80, 52); const d = x.getImageData(0, 0, 80, 52).data, set = new Set(); for (let i = 0; i < d.length; i += 4) set.add((d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4)); return set.size; }, png);
    check('the 3D view is not blank', spread > 12, spread);
    await page.keyboard.press('Enter'); await page.waitForTimeout(700);
    await page.evaluate(() => { B.Create.focus = 'quick'; }); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
    await page.evaluate(() => { B.Create.focus = 'begin'; }); await page.keyboard.press('Enter'); await page.waitForTimeout(800);
    await page.keyboard.down('Escape'); await page.waitForTimeout(1400); await page.keyboard.up('Escape'); await page.waitForTimeout(900);
    const s1 = await page.evaluate(() => B.game.debug.snapshot());
    check('Quick Start and skipping the intro reach floor 1 at (2,14)', s1.scene === 'play' && s1.floor === 'f1' && s1.cell.join() === '2,14', JSON.stringify(s1).slice(0, 200));
    // twenty seconds of the walkthrough bot in the real page: walking, a lever, a fight
    await page.evaluate(() => { B.Bot.start({ plan: B.WALK.f1.slice(0, 8) }); B._botTick = setInterval(() => { if (B.Bot.active) B.Play.extraCmds = (B.Play.extraCmds || []).concat(B.Bot.step(1 / 60)); }, 16); });
    await page.waitForTimeout(20000);
    const s2 = await page.evaluate(() => { clearInterval(B._botTick); B.Bot.stop(); return { snap: B.game.debug.snapshot(), errors: B.game.errors.map(e => e.message), kills: B.S.stats.kills }; });
    check('a scripted walk and fight with no errors', !s2.errors.length && !errs.length, s2.errors.concat(errs).join(' | '));
    check('the walk moved the party and fought', s2.kills > 0 || s2.snap.cell.join() !== '2,14', JSON.stringify(s2.snap.cell) + ' kills ' + s2.kills);
    // glyphs in the real page: PlayStation shapes by default, the Xbox setting turns ✕ into A
    const gl = await page.evaluate(() => { const G = B.game; G.input.lastDevice = 'gamepad'; const ps = [B.fillGlyphs(G, '{use}'), B.fillGlyphs(G, '{strike}'), G.input.label('use')]; G.settings.set('glyphs', 'xbox'); const xb = [B.fillGlyphs(G, '{use}'), B.fillGlyphs(G, '{strike}'), G.input.label('use')]; return { ps, xb }; });
    await page.waitForTimeout(400); await page.screenshot({ path: new URL('../../shots/', import.meta.url).pathname + 'xbox-prompts.png' });
    check('the real page shows PlayStation shapes by default', gl.ps[0] === '✕' && gl.ps[1] === '□', JSON.stringify(gl));
    check('the real page\'s Xbox setting turns ✕ into A', gl.xb[0] === 'A' && gl.xb[1] === 'X' && gl.xb[2] === 'A', JSON.stringify(gl));
    await page.evaluate(() => { B.game.settings.set('glyphs', 'playstation'); B.game.input.lastDevice = 'keyboard'; });
    // drag and drop with the real mouse in the Party screen: the sword from the hand to the pack and back
    await page.evaluate(() => B.Play.openScreen('party', { m: 0 })); await page.waitForTimeout(400);
    const pos = await page.evaluate(() => { const ws = B.SCREENS.party.layout(B.UI.W, B.UI.H, B.Play.screen), c = document.getElementById('screen').getBoundingClientRect(), k = c.width / B.UI.W, at = id => { const w = ws.find(q => q.id === id); return [c.left + (w.x + w.w / 2) * k, c.top + (w.y + w.h / 2) * k]; }; return { main: at('s_main'), p9: at('p9') }; });
    await page.mouse.move(...pos.main, { steps: 4 }); await page.waitForTimeout(150); await page.mouse.down(); await page.waitForTimeout(250);
    await page.mouse.move(...pos.p9, { steps: 8 }); await page.waitForTimeout(150); await page.mouse.up(); await page.waitForTimeout(400);
    const dd = await page.evaluate(() => { const m = B.S.party.members[0]; return { pack: m.pack[9] && m.pack[9].id, main: m.slots.main && m.slots.main.id, hand: B.S.party.hand && B.S.party.hand.id }; });
    check('real mouse drag and drop moves an item between slots', dd.pack === 'longSword' && !dd.main && !dd.hand, JSON.stringify(dd));
    // real-mouse drags for one item of every kind, each into its slot and back to the pack
    const kinds = await page.evaluate(all => { const seen = {}, out = []; for (const d of Object.values(B.ITEMS)) if (all || !seen[d.kind]) { seen[d.kind] = 1; out.push(d.id); } return out; }, !!process.env.ALL_ITEMS);   // ALL_ITEMS=1: every item, not one per kind
    await page.evaluate(() => { B.CHEATS.god = true; B.CHEATS.freeze = true; B.S.over = false; for (const m of B.S.party.members) { m.state = 'ok'; m.hp = m.max; } });   // (a long pass: nothing may interrupt it)
    const slotFor = d => ({ body: 'body', shield: 'off', head: 'head', neck: 'neck', arms: 'arms', ring: 'ring1', feet: 'feet', ammo: 'quiver' }[d.kind] || 'main');
    const realBad = []; let realOk = 0;
    for (const id of kinds) {
      const prep = await page.evaluate(([id, slotFor]) => { const sf = new Function('d', 'return (' + slotFor + ')(d)'), d = B.ITEMS[id], P = B.S.party, slot = sf(d); P.hand = null; const mi = P.members.findIndex(m => { const o = m.slots.off; delete m.slots.off; const why = B.canEquip(m, B.item(id), slot); if (o) m.slots.off = o; return !why; }); if (mi < 0) return null; const m = P.members[mi]; if (m.slots[slot]) m.pack[10] = m.slots[slot], delete m.slots[slot]; if (d.two && m.slots.off) { m.pack[11] = m.slots.off; delete m.slots.off; } m.pack[6] = B.item(id, d.stack ? 5 : undefined); B.Play.closeScreen(); B.Play.openScreen('party', { m: mi }); const ws = B.SCREENS.party.layout(B.UI.W, B.UI.H, B.Play.screen), c = document.getElementById('screen').getBoundingClientRect(), k = c.width / B.UI.W, at = wid => { const w = ws.find(q => q.id === wid); return [c.left + (w.x + w.w / 2) * k, c.top + (w.y + w.h / 2) * k]; }; return { mi, slot, from: at('p6'), to: at('s_' + slot) }; }, [id, slotFor.toString()]);
      if (!prep) continue;
      const drag = async (a, z) => { await page.mouse.move(...a, { steps: 3 }); await page.waitForTimeout(120); await page.mouse.down(); await page.waitForTimeout(200); await page.mouse.move(...z, { steps: 6 }); await page.waitForTimeout(120); await page.mouse.up(); await page.waitForTimeout(300); };
      await drag(prep.from, prep.to);
      const inn = await page.evaluate(([mi, slot, id]) => { const m = B.S.party.members[mi]; return !!(m.slots[slot] && m.slots[slot].id === id && !m.pack[6]); }, [prep.mi, prep.slot, id]);
      await drag(prep.to, prep.from);
      const back = await page.evaluate(([mi, slot, id]) => { const m = B.S.party.members[mi]; return !!(m.pack[6] && m.pack[6].id === id && !m.slots[slot]); }, [prep.mi, prep.slot, id]);
      if (inn && back) realOk++; else realBad.push(id + (inn ? ' back' : ' in'));
    }
    check('real mouse drags ' + (process.env.ALL_ITEMS ? 'every item' : 'every kind of item') + ' into its slot and back (' + realOk + ')', !realBad.length && realOk >= 15, realBad.join(', ')); if (process.env.ALL_ITEMS) console.log('real-mouse drags passed: ' + realOk + ' items');
    await page.evaluate(() => { B.Play.closeScreen(); B.CHEATS.god = false; B.CHEATS.freeze = false; });
    // the attract mode after 10 s on the title; a key returns
    await page.evaluate(() => B.game.go('title')); await page.waitForFunction(() => B.game.sceneName === 'title' && B.Title.idle < 1, null, { timeout: 10000 }); await page.waitForTimeout(11000);
    const sc = await page.evaluate(() => [B.game.sceneName, B.Title.idle, [...B.game.input.held].join(), B.game.paused, B.game.errors.map(e => e.message).join()]);
    check('10 s idle on the title starts the attract mode', sc[0] === 'attract', JSON.stringify(sc));
    await page.waitForTimeout(3000);
    await page.keyboard.press('KeyK'); await page.waitForTimeout(700);
    check('a key returns to the title', await page.evaluate(() => B.game.sceneName) === 'title');
    check('still no errors', !errs.length && !(await page.evaluate(() => B.game.errors.length)), errs.join(' | '));
    await page.close();
    // a phone: the touch-only notice, no touch buttons
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    const ph = await ctx.newPage(); await ph.goto('file://' + root + NAME + '.html?backend=webgl');
    await ph.waitForFunction(() => window.B && B.game && B.game.sceneName === 'title', null, { timeout: 120000 }); await ph.waitForTimeout(800);
    const t = await ph.evaluate(() => ({ only: B.touchOnly(), touch: B.game.input.touchEnabled, buttons: document.querySelectorAll('[data-act]').length }));
    check('a touch-only device gets the notice and no touch controls', t.only && t.touch === false, JSON.stringify(t));
    await ctx.close();
  } finally { await browser.close(); }
};
