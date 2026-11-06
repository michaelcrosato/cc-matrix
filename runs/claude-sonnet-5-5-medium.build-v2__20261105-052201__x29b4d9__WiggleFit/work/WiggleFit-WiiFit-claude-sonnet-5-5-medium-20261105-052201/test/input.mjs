import { launch } from '../tools/lib.mjs';
import { S, adv, press, newGame } from '../tools/drive.mjs';
const PAD = `(() => { window.__pads = [null]; const mk = () => ({ index: 0, id: 'Stub', connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), vibrationActuator: { playEffect() { window.__rumbled = (window.__rumbled || 0) + 1; return Promise.resolve(); } } }); window.__pads[0] = mk(); navigator.getGamepads = () => window.__pads; window.__btn = (i, v) => { window.__pads[0].buttons[i] = { pressed: v > 0.5, value: v }; }; window.__axis = (i, v) => { window.__pads[0].axes[i] = v; }; })();`;
export default async function (t) {
  const b = await launch({});
  try {
    const p = await b.newPage({ viewport: { width: 1920, height: 1080 } }); await p.addInitScript(PAD); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    const { url } = await import('../tools/lib.mjs'); await p.goto(url('test=1&render=0&manual=1')); await p.waitForFunction(() => window.__done);
    // pad navigates the menus alone
    await adv(p, 2); await p.evaluate(() => window.__btn(0, 1)); await adv(p, 0.1); await p.evaluate(() => window.__btn(0, 0)); await adv(p, 0.3); let s = await S(p); t.eq(s.screen, 'menu', 'pad Cross leaves the title'); t.eq(s.input.lastDevice, 'pad', 'last device is pad');
    const g0 = await p.evaluate(() => document.querySelector('#prompts [data-glyph]') && document.querySelector('#prompts [data-glyph]').dataset.glyph); t.ok(/^ps:/.test(g0 || ''), 'prompts show PlayStation glyphs for the pad: ' + g0);
    await p.evaluate(() => { window.__btn(13, 1); }); await adv(p, 0.1); await p.evaluate(() => window.__btn(13, 0)); await adv(p, 0.1); const f1 = await p.evaluate(() => document.querySelector('.tag.focus') && document.querySelector('.tag.focus').dataset.menuItem); t.ok(f1 === 'group', 'pad d-pad moves focus: ' + f1);
    await p.keyboard.press('ArrowDown'); await adv(p, 0.1); s = await S(p); t.eq(s.input.lastDevice, 'kbm', 'key press switches to kbm'); const g1 = await p.evaluate(() => document.querySelector('#prompts [data-glyph]').dataset.glyph); t.ok(/^kbm:/.test(g1), 'prompts follow keyboard: ' + g1);
    await p.evaluate(() => { window.__TEST__.settings.glyphs = 'xbox'; window.__btn(4, 1); }); await adv(p, 0.1); await p.evaluate(() => window.__btn(4, 0)); await adv(p, 0.2); const g2 = await p.evaluate(() => document.querySelector('#prompts [data-glyph]').dataset.glyph); t.ok(/^xbox:/.test(g2), 'Xbox glyph option: ' + g2);
    // hover moves focus, click activates; a parked mouse does not
    await p.evaluate(() => { window.__TEST__.settings.glyphs = 'ps'; window.__TEST__.goto('menu'); }); await adv(p, 0.2); const box = await p.evaluate(() => { const e = document.querySelector('[data-menu-item="settings"]').getBoundingClientRect(); return [e.x + e.width / 2, e.y + e.height / 2]; });
    await p.mouse.move(box[0] - 30, box[1]); await p.mouse.move(box[0], box[1]); await adv(p, 0.1); const f2 = await p.evaluate(() => document.querySelector('.tag.focus').dataset.menuItem); t.eq(f2, 'settings', 'hover moves the focus');
    await p.mouse.click(box[0], box[1]); await adv(p, 0.3); s = await S(p); t.eq(s.screen, 'settings', 'click activates');
    // Options is ignored while Create is held
    await p.evaluate(() => { window.__TEST__.goto('menu'); }); await adv(p, 0.3); await p.evaluate(() => { window.__btn(8, 1); window.__btn(9, 1); }); await adv(p, 0.1); await p.evaluate(() => { window.__btn(8, 0); window.__btn(9, 0); }); await adv(p, 0.2); s = await S(p); t.eq(s.screen, 'menu', 'Options ignored while Create held');
    // an event: verbs from pad, keys, mouse give the same effect
    await p.evaluate(() => { const g = window.__TEST__.game; g.selectProfile ? 0 : 0; });
    const lean = async (setup, teardown) => { await p.evaluate(() => { const g = window.__TEST__.game; g.saveData.profiles[0] = g.saveData.profiles[0] || null; }); return 0; };
    await p.evaluate(() => { const g = window.__TEST__.game; g.go('menu'); });
    await newProfileIn(p); await p.evaluate(() => { const g = window.__TEST__.game; g.killScripts(); g.busy = false; g.endSpeech(); g.startEvent('fruitHat', { tier: 0, free: true }); }); await adv(p, 1.5); await press(p, 'ok'); await adv(p, 4.5);
    s = await S(p); t.eq(s.event && s.event.phase, 'play', 'event running for input checks');
    // pad stick right
    await p.evaluate(() => { window.__axis(0, 1); }); await adv(p, 1.6); s = await S(p); const padLean = s.event.lanes[0].cob[0]; await p.evaluate(() => window.__axis(0, 0)); await adv(p, 1.5);
    t.ok(padLean > 0.5, 'pad stick leans right: ' + padLean);
    await p.evaluate(() => { const g = window.__TEST__.game; g.disposeEvent(); g.showHud(false); }); await p.keyboard.press('Shift'); await adv(p, 0.1); await p.evaluate(() => { const g = window.__TEST__.game; g.killScripts(); g.busy = false; g.endSpeech(); g.startEvent('fruitHat', { tier: 0, free: true }); }); await adv(p, 1.5); await press(p, 'ok'); await adv(p, 4.5);
    await p.keyboard.down('KeyD'); await adv(p, 1.6); await p.keyboard.up('KeyD'); s = await S(p); const keyLean = s.event.lanes[0].cob[0]; t.ok(keyLean > 0.4, 'key D leans right (ring): ' + keyLean);
    await p.keyboard.down('KeyC'); await adv(p, 0.2); await p.keyboard.up('KeyC'); await adv(p, 1.5);
    await p.mouse.move(1600, 540); await p.mouse.move(1700, 540); await adv(p, 1.6); s = await S(p); const mouseLean = s.event.lanes[0].cob[0]; t.ok(mouseLean > 0.4, 'mouse offset leans right: ' + mouseLean);
    // flail from pad / key
    await p.evaluate(() => window.__TEST__.game.ev.lanes[0].bal.flailCd = 0); await p.keyboard.press('KeyF'); await adv(p, 0.1); const fl = await p.evaluate(() => window.__TEST__.game.ev.lanes[0].flails); t.ok(fl >= 1, 'F flails');
    // quick key tap between polls still counts (latch)
    await p.evaluate(() => { const g = window.__TEST__.game; g.input.latched.add('KeyF'); }); await adv(p, 0.05);
    t.ok(errs.length === 0, 'no page errors in input group: ' + errs.slice(0, 2).join(' | '));
    // four pads join Group Class
    await p.evaluate(() => { window.__TEST__.game.disposeEvent(); window.__TEST__.game.showHud(false); window.__TEST__.game.go('group'); }); await adv(p, 0.3);
    await p.evaluate(() => { const g = window.__TEST__.game; g.screens.group.nav('ok', { dev: 'pad', pad: 0 }); g.screens.group.nav('ok', { dev: 'pad', pad: 1 }); g.screens.group.nav('ok', { dev: 'pad', pad: 2 }); g.screens.group.nav('ok', { dev: 'pad', pad: 3 }); }); const n = await p.evaluate(() => window.__TEST__.game.screens.group.players.length); t.eq(n, 4, 'four pads join Group Class');
    await p.evaluate(() => window.__TEST__.game.screens.group.start(false)); await adv(p, 2); await press(p, 'ok'); await adv(p, 4.5); s = await S(p); t.eq(s.event && s.event.lanes.length, 4, 'group event has four lanes'); t.ok(s.event && s.event.lanes.every((l) => l.kind === 'local'), 'all four lanes are local players');
  } finally { await b.close(); }
}
async function newProfileIn(p) { await p.evaluate(() => { const g = window.__TEST__.game; const { } = g; g.saveData.profiles[0] = { name: 'Tester', paint: 0, hat: 0, day: 1, step: 0, doneToday: [], ages: [], medals: {}, bestTier: {}, met: [], marbles: 0, floor: 0, minutes: 0, levelled: false, calendar: [], asked: [], checkedIn: true }; g.selectProfile(0); }); }
