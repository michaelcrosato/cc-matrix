// Overlays drawn over a running RaceScene: pause menu, results table, test results. Plan section 7 (Results, Flow).
import { App, S, fmtTime, saveProfile, money } from '../app.js';
import { Nav, SCREENS } from '../ui/nav.js';
import { CAR_INFO } from '../data/cars.js';
import { MEDALS } from '../data/medals.js';
import { nextMedalGap } from '../sim/career.js';
import { finalizeRace, finalizeTest } from './flow.js';
import { POS_POINTS } from '../sim/race.js';
const MC = { gold: 'sand', silver: 'mist', bronze: 'orange' };
export function openPause(sc) { if (sc.ov) return; sc.paused = !App.hubActive; sc.nav = new Nav(() => { sc.ov = null; sc.paused = false; }); sc.ov = { kind: 'pause' }; sc.nav.push(App.hubActive ? 'hubmenu' : 'pause'); App.mix?.sfx?.('confirm'); }
export function openResults(sc) { sc.nav = new Nav(() => { sc.ov = null; }); sc.ov = { kind: 'results', t: 0 }; sc.outcome = finalizeRace(sc); sc.nav.push('results'); }
export function openTestResult(sc) { sc.nav = new Nav(() => { sc.ov = null; }); sc.ov = { kind: 'test', t: 0 }; sc.outcome = finalizeTest(sc); sc.nav.push('testresult'); }
export function drawOverlay(sc, ctx, ui, dt) { sc.nav?.draw(ctx, ui, sc); }
function dim(ui) { ui.hud.rect(0, 0, ui.W, ui.H, 'ink'); }
function menuList(ui, sc, items, x, y, w) { items.forEach(([id, label, fn, o], i) => { if (!o?.hidden) { const r = ui.button(id, x, y, w, 20, label, { disabled: o?.disabled }); y += 24; if (r.pressed) fn(); } }); }
SCREENS.pause = (nav, t, ctx, ui, sc) => {
  ui.hud.rect(0, 0, ui.W, ui.H, 'ink'); ui.title('PAUSED', sc.cfg.title ?? ''); const x = ui.W / 2 - 80;
  menuList(ui, sc, [['resume', 'RESUME', () => nav.pop()], ['restart', 'RESTART', () => { App.restartRace?.(sc); }, { hidden: sc.mode === 'attract' }], ['retire', 'RETIRE', () => App.exitRace(sc)], ['assists', 'ASSISTS', () => nav.push('assists')], ['settings', 'SETTINGS', () => nav.push('settings')], ['handbook', 'HANDBOOK', () => nav.push('handbook')], ['dev', 'DEV MODE', () => nav.push('dev'), { hidden: App.hubActive }]], x, 36, 160);
  ui.prompts([['move', 'CHOOSE'], ['confirm', 'SELECT'], ['pause', 'RESUME']]); if ((ui.A.back || ui.A.pause) && (t.s.age = (t.s.age ?? -1) + 1) > 0) nav.pop();
};
SCREENS.hubmenu = (nav, t, ctx, ui, sc) => { ui.hud.rect(0, 0, ui.W, ui.H, 'ink'); ui.title('MENU', 'THE ROUND CONTINUES'); const x = ui.W / 2 - 80; menuList(ui, sc, [['resume', 'RESUME', () => nav.pop()], ['settings', 'SETTINGS', () => nav.push('settings')], ['handbook', 'HANDBOOK', () => nav.push('handbook')]], x, 50, 160); ui.prompts([['move', 'CHOOSE'], ['confirm', 'SELECT'], ['back', 'BACK']]); if ((ui.A.back || ui.A.pause) && (t.s.age = (t.s.age ?? -1) + 1) > 0) nav.pop(); };
SCREENS.results = (nav, t, ctx, ui, sc) => {
  const o = sc.outcome, W = ui.W, H = ui.H, st = t.s; st.t = (st.t ?? 0) + ui.dt; ui.hud.rect(0, 0, W, H, 'ink'); ui.title(o.title ?? 'RESULTS', o.sub ?? '');
  const rows = o.rows.slice(0, 8); const x0 = 16; ui.text(x0, 31, 'POS', { color: 'mist' }); ui.text(x0 + 30, 31, 'DRIVER', { color: 'mist' }); ui.text(x0 + 110, 31, 'CAR', { color: 'mist' }); ui.text(W - 90, 31, 'TIME', { color: 'mist' });
  rows.forEach((r, i) => { const y = 42 + i * 14, me = r.player; if (me) ui.hud.rect(x0 - 4, y - 3, W - 2 * x0 + 8, 13, 'navy'); ui.text(x0, y, r.pos, { color: me ? 'sand' : 'white' }); ui.text(x0 + 30, y, r.name, { color: me ? 'sand' : 'white' }); ui.text(x0 + 110, y, CAR_INFO[r.carId].short, { color: 'mist' }); ui.text(W - 90, y, r.pos === 1 ? fmtTime(r.time) : r.finished ? '+' + (r.time - rows[0].time).toFixed(1) : 'LAP DOWN', { color: me ? 'sand' : 'white' }); });
  const money_ = Math.round(Math.min(o.money, o.money * Math.min(1, st.t / 1.5))); if (st.last !== money_ && money_ > 0 && Math.floor(st.t * 14) !== st.tick) { st.tick = Math.floor(st.t * 14); App.mix?.sfx?.('cash'); } st.last = money_;
  if (o.money != null && o.career) { ui.text(16, 162, 'PRIZE ' + money(money_), { color: 'sand', scale: 1 }); if (o.pts != null) ui.text(150, 162, 'POINTS +' + o.pts, { color: 'lime' }); if (o.series) ui.text(16, 174, o.series, { color: 'mist' }); }
  if (o.line) ui.prose(16, 186, o.line, { n: 58, max: 2, color: 'cyan' });
  let bx = 16; const by = H - 42; const btn = (id, label, fn, w = 90) => { const r = ui.button(id, bx, by, w, 18, label); bx += w + 6; if (r.pressed) fn(); };
  btn('cont', 'CONTINUE', () => { App.mix?.sfx?.('confirm'); App.exitRace(sc, 'continue'); }); if (!App.hubActive) { btn('retry', 'RETRY', () => App.restartRace(sc), 70); btn('wr', 'WATCH REPLAY', () => App.watchReplay(sc), 100); btn('sr', sc.saved ? 'SAVED' : 'SAVE REPLAY', () => { sc.saved = App.saveReplay?.(sc) ?? true; }, 100); }
  ui.prompts([['move', 'CHOOSE'], ['confirm', 'SELECT']]);
};
SCREENS.testresult = (nav, t, ctx, ui, sc) => {
  const o = sc.outcome, W = ui.W, H = ui.H; ui.hud.rect(0, 0, W, H, 'ink'); ui.title(sc.test.id + '  ' + sc.test.title, o.runLabel ?? '');
  const cx = W / 2; ui.panel(cx - 150, 34, 300, 110, 'night', 'slate');
  if (o.passed) { ui.center(42, o.medal ? o.medal.toUpperCase() + ' MEDAL' : 'PASSED', { scale: 3, color: MC[o.medal] ?? 'white' }); ui.center(72, fmtTime(o.time), { scale: 2, color: 'white' }); if (o.gap) ui.center(94, `${o.gap.medal.toUpperCase()} NEEDS ${fmtTime(o.gap.gap)} LESS`, { color: 'mist' }); else if (o.medal === 'gold') ui.center(94, 'THAT WAS CORRECT.', { color: 'sand' }); if (!o.medal) ui.center(94, 'THE TIME IS OUTSIDE BRONZE. THE ATTEMPT IS NOT.', { color: 'orange' }); }
  else { ui.center(46, 'FAILED', { scale: 3, color: 'red' }); ui.center(76, o.reason || 'THE ATTEMPT ENDED', { color: 'white' }); ui.center(94, 'THE BOX HAS NOT MOVED. PLEASE TRY AGAIN.', { color: 'mist' }); }
  if (o.msg) ui.prose(cx - 140, 110, o.msg, { n: 52, max: 3, color: 'cyan' });
  if (o.offerLine) ui.prose(cx - 140, 128, 'THE EXAMINER OFFERS THE DRIVING LINE FOR THIS TEST. IT IS NOW SWITCHED ON.', { n: 52, max: 2, color: 'lime' });
  let by = 152; const bw = 150, bx = cx - bw / 2; const btn = (id, label, fn) => { const r = ui.button(id, bx, by, bw, 18, label); by += 22; if (r.pressed) fn(); };
  if (o.next) btn('next', 'NEXT CAR', () => App.testNext(sc)); else btn('retry', 'RETRY', () => App.restartRace(sc)); btn('wr', 'WATCH YOUR REPLAY', () => App.watchReplay(sc)); btn('demo', 'DEMONSTRATION', () => App.testDemo(sc)); btn('bk', 'BACK', () => App.exitRace(sc, 'continue'));
  ui.prompts([['move', 'CHOOSE'], ['confirm', 'SELECT']]);
};
