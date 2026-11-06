// Shell: screen openers, About, Dev Mode, quit to title.
import { PocketsScreen, MapScreen, AlmanacScreen, EmoteWheel, PauseScreen } from '../ui/screens.js';
import { W, H } from '../ui/controls.js';
import { textWidth, wrapText } from '../ui/draw.js';
import { ABOUT } from '../data/about.js';
import { TUNING, tuning, setTuning, resetTuning } from '../data/tuning.js';
import { SettingsScreen } from '../ui/title.js';
import { saveWorld, hasSave } from '../core/world.js';
export const pause = { open(g) { if (g.ui.has('pause')) return; g.ui.push(new PauseScreen()); } };
export const pockets = { open(g) { g.ui.push(new PocketsScreen()); } };
export const map = { open(g) { g.ui.push(new MapScreen()); } };
export const almanac = { open(g) { g.ui.push(new AlmanacScreen()); } };
export const emote = { open(g) { g.ui.push(new EmoteWheel()); } };
class AboutScreen {
  constructor(credits) { this.id = 'about'; this.page = 0; this.freeze = true; this.credits = credits; this.pages = null; }
  build(g) {
    const P = []; const src = ABOUT.source; const per = 4; for (let i = 0; i < src.length; i += per) P.push({ title: 'Source Information', rows: src.slice(i, i + per) });
    for (const [k, t] of [['testing', 'Testing Feedback'], ['engine', 'Engine Feedback'], ['prompt', 'Prompt Feedback']]) { const qs = ABOUT.feedback[k]; for (let i = 0; i < qs.length; i += 2) P.push({ title: t, qa: qs.slice(i, i + 2) }); }
    P.push({ title: 'Cast', text: ['Mrs. Gander, Clementine, Mayor Trundle, Dr. Quill, Madame Mothwick, Hester, Vesper, Old Rind, Monsieur Fleece, Flavia Rose, Magda, Sir Reginald Bellows, Pemberton, Agent Brisket, Languid Lou, Madame Nibbles, Inspector Pimm.', 'And the neighbours: Dorrit, Tavi, Bartleby, Lady Ottoline, Rocco, Nib, Ozzie, Yolanda, Fitch.', 'Inspired by Animal Crossing: City Folk.'] });
    P.push({ title: 'Licences', text: ['Pixel Engine by Riftlight; three.js (MIT) and Rapier (Apache-2.0) ship inside it.', 'Furniture models from the Kenney Furniture Kit 2.0 (CC0), credited anyway: thank you, Kenney.', 'AI Hub session client 1.4.0 (AI Hub). Engine CREDITS.md ships in this page.'] });
    const lic = typeof document !== 'undefined' ? document.getElementById('credits-src')?.textContent ?? '' : ''; for (let i = 0; i < Math.min(lic.length, 3600); i += 900) P.push({ title: 'Licences (engine CREDITS.md)', text: [lic.slice(i, i + 900)] });
    return P;
  }
  tick(ui, dt, active) {
    const g = ui.game, d = ui.d; this.pages ??= this.build(g); const pg = this.pages[this.page]; d.rect(0, 0, W, H, 'night'); d.panel(20, 10, 440, 250, { fill: 'white', trim: 'sand' });
    d.text(240, 18, `${pg.title}   ${this.page + 1}/${this.pages.length}`, 'navy', { align: 'center' }); let y = 36;
    if (pg.rows) for (const [k, v] of pg.rows) { d.text(34, y, k, 'red'); y += 11; y += d.para(34, y, v, 410, 'ink'); y += 4; }
    if (pg.qa) for (const [q, a] of pg.qa.map(x => [x.q, x.a])) { y += d.para(34, y, q, 410, 'red'); y += d.para(34, y, a, 410, 'ink') + 6; }
    if (pg.text) for (const t of pg.text) y += d.para(34, y, t, 410, 'ink') + 6;
    if (active) { const n = ui.c.nav; if (n.x > 0 || ui.c.pressed('nextTool') || ui.c.input.wasPressed('KeyE')) this.page = Math.min(this.pages.length - 1, this.page + 1); if (n.x < 0 || ui.c.pressed('prevTool') || ui.c.input.wasPressed('KeyQ')) this.page = Math.max(0, this.page - 1); if (ui.c.backPressed()) ui.pop(this); }
    ui.prompt('back', 'Close'); ui.prompt('nav', 'Page');
  }
}
export const about = { open(g) { g.ui.push(new AboutScreen()); }, pages(g) { return new AboutScreen().build(g); } };
export function installShell(Game) {
  const P = Game.prototype;
  P.openSettings = function () { this.ui.push(new SettingsScreen(this)); };
  P.quitToTitle = function () { if (this.visit) { const v = this.visit; this.visit = null; v.leave(this); return; } if (this.mode === 'play' && !this.world.noSave) { this.world.cleanExit = true; this.world.realStamp = Date.now(); saveWorld(this.world); } this.ui.clear(); this.place = 'town'; this.sys.places.showOnly(this, 'town'); this.mode = 'boot'; this.showTitle(); };
}
class DevScreen {
  constructor() { this.id = 'dev'; this.page = 0; this.st = { i: 0 }; this.freeze = true; this.pages = ['Time', 'World', 'Player', 'Neighbours', 'Events', 'Collections', 'Debug', 'Save', 'Balance']; }
  rows(g) {
    const w = g.world, T = (id) => g.sys.time; const pg = this.pages[this.page];
    const R = (label, fn, value = '') => ({ label, value, fn });
    switch (pg) {
      case 'Time': return [R('Hour +1', () => { w.min = (w.min + 60) % 1440; g.sys.time.visual(g, 0, true); g.npcs.schedule(true); g.updateMusic(true); }), R('Hour -1', () => { w.min = (w.min + 1380) % 1440; g.sys.time.visual(g, 0, true); }), R('Next day', () => g.sys.time.newDay(g, 'dev')), R('Day +4 (next season)', () => { w.day = (Math.floor((w.day - 1) / 4) * 4 + 4) % 16; g.sys.time.newDay(g, 'dev', { force: true }); }), R('Set day 1', () => { w.day = 16; g.sys.time.newDay(g, 'dev', { force: true }); }), R('Freeze time', () => { g.flags.freeze = !g.flags.freeze; tuning.minPerSec = g.flags.freeze ? 0 : 1.25; }, tuning.minPerSec === 0 ? 'on' : 'off'), R('Clock mode', () => { w.clockMode = w.clockMode === 'real' ? 'village' : 'real'; }, w.clockMode)];
      case 'World': return [R('Weather: rain', () => { g.forceWeather = 'rain'; }), R('Weather: clear', () => { g.forceWeather = 'sun'; }), R('Weather: snow', () => { g.forceWeather = 'snow'; }), R('Noclip', () => { g.noclip = !g.noclip; }, g.noclip ? 'on' : 'off'), R('Teleport: plaza', () => g.sys.dev.tp(g, 21, 23)), R('Teleport: beach', () => g.sys.dev.tp(g, 34, 38)), R('Teleport: store', () => g.sys.places.go(g, 'store')), R('Teleport: City', () => g.sys.bus.arriveCity(g)), R('Overview camera', () => { g.zoomOverride = g.zoomOverride ? null : 1.2; }), R('Camera zoom out', () => { g.zoomOverride = 1.2; })];
      case 'Player': return [R('Beans +1000', () => g.addBeans(1000)), R('Beans -1000', () => g.addBeans(-1000)), R('Clear debt', () => { w.debt = 0; }), R('Home tier +1', () => { w.homeTier = Math.min(4, w.homeTier + 1); }), R('All tools', () => ['net', 'rod', 'shovel', 'axe', 'can', 'sling'].forEach(t => g.give(t))), R('All emotes', () => { w.emotes.all = true; }), R('Fill pockets: sample goods', () => ['pear', 'beanbag', 'seedpack', 'sapling', 'paper', 'cheese', 'mosscouch', 'hat_top'].forEach(i => g.give(i)))];
      case 'Neighbours': return [...['dorrit', 'tavi', 'bartleby', 'ottoline', 'rocco', 'nib', 'ozzie', 'yolanda'].map(id => R('Friendship +20: ' + id, () => { w.friend[id] = Math.min(100, (w.friend[id] ?? 0) + 20); }, String(w.friend[id] ?? 0))), R('Rocco moves out now', () => g.sys.story2?.moveRocco?.(g))];
      case 'Events': return (g.sys.festivals?.list ?? []).map(f => R('Start ' + f.name, () => g.sys.festivals.start(g, f.id))).concat([R('Start Fishing Derby', () => g.sys.contests.start(g, 'derby')), R('Start Bug-Off', () => g.sys.contests.start(g, 'bugoff')), R('Start Snowman Contest', () => g.sys.contests.start(g, 'snow')), R('Inspector Pimm', () => g.sys.pimm.visit(g)), R('Wasps', () => g.sys.trees.wasps(g)), R('Shooting star wish', () => g.sys.stars.sit(g, { at: [54, 6] })), R('Balloon', () => g.sys.nature.sendBalloon(g))]);
      case 'Collections': return [R('Fill museum', () => { for (const c of ['fish', 'bug', 'fossil', 'art']) { g.sys.dev.allOf(c).forEach(x => { w.donated[x.id] = true; w.coll[c][x.id] = (w.coll[c][x.id] ?? 0) + 1; }); } }), R('Empty museum', () => { w.donated = {}; w.coll = { fish: {}, bug: {}, fossil: {}, art: {} }; }), R('Give a fish', () => g.give('sturgeon')), R('Give a fossil', () => g.give('moa_skull'))];
      case 'Debug': return [R('Collision overlay', () => { g.debug.coll = !g.debug.coll; }, g.debug.coll ? 'on' : 'off'), R('NPC states', () => { g.debug.npc = !g.debug.npc; }, g.debug.npc ? 'on' : 'off'), R('Engine line', () => { g.debug.engine = !g.debug.engine; }, g.debug.engine ? 'on' : 'off'), R('Look: default', () => g.engine.setLook(g.engine.lookPresets.none)), R('Look: pixel_world', () => g.engine.setLook(g.engine.lookPresets.pixel_world)), R('Look: storybook', () => g.engine.setLook(g.engine.lookPresets.storybook))];
      case 'Save': return [R('Save now', () => { saveWorld(w); g.ui.toast('Saved'); }), R('Load save', () => g.sys.dev.load(g)), R('Reset world', () => g.sys.dev.reset(g)), R('Export save to console', () => console.log(JSON.stringify(w)).slice?.(0, 0)), R('Export recording', () => { g.dev_recording = g.engine.recording(); g.ui.toast('Recording stored'); }), R('Replay recording', () => { if (g.dev_recording) g.engine.replay(g.dev_recording, () => {}); })];
      case 'Balance': return TUNING.map(t => ({ label: t.label, value: String(tuning[t.id]), t, slider: true }));
    }
    return [];
  }
  tick(ui, dt, active) {
    const g = ui.game, d = ui.d; d.rect(0, 0, W, H, 'night'); d.panel(16, 8, 448, 254, { fill: 'white', trim: 'sand' });
    this.pages.forEach((p, i) => { const x = 22 + i * 49; d.rect(x, 14, 47, 13, i === this.page ? 'red' : 'mist'); d.text(x + 23, 17, p.slice(0, 7), i === this.page ? 'white' : 'ink', { align: 'center' }); });
    const rows = this.rows(g); const r = ui.menu(this.st, rows.map(x => ({ label: x.label, value: x.slider ? '' : x.value })), { x: 24, y: 34, w: 432, rh: 16, active, scroll: true, rows: 12 });
    const row = rows[this.st.i]; if (row?.slider) { const t = row.t; const sel = this.st.i; rows.forEach((rw, i) => { }); const top = Math.max(0, Math.min(this.st.i - 6, rows.length - 12)); for (let k = 0; k < Math.min(12, rows.length); k++) { const rr = rows[top + k]; if (!rr.slider) continue; const x = 300, y = 34 + k * 16 + 6, w2 = 110; d.rect(x, y, w2, 3, 'slate'); const f = (tuning[rr.t.id] - rr.t.min) / (rr.t.max - rr.t.min); d.rect(x, y, w2 * f, 3, 'red'); d.rect(x + w2 * f - 2, y - 2, 5, 7, 'white'); d.text(x + w2 + 8, y - 4, String(tuning[rr.t.id]), 'navy'); if (tuning[rr.t.id] !== rr.t.default) d.text(x - 6, y - 4, '*', 'red', { align: 'right' }); } }
    if (r.adj && row?.slider) { setTuning(row.t.id, tuning[row.t.id] + r.adj * row.t.step); }
    if (r.pick >= 0) { if (row.slider) resetTuning(row.t.id); else Promise.resolve(row.fn?.()).catch(e => ui.toast('Error: ' + e.message)); }
    if (active) { if (ui.c.input.wasPressed('KeyQ') || ui.c.input.wasPressed('PadL1')) { this.page = (this.page + 8) % 9; this.st.i = 0; } if (ui.c.input.wasPressed('KeyE') || ui.c.input.wasPressed('PadR1')) { this.page = (this.page + 1) % 9; this.st.i = 0; } if (this.pages[this.page] === 'Balance' && (ui.c.input.wasPressed('KeyR') || ui.c.input.wasPressed('PadTriangle'))) { resetTuning(); ui.toast('All sliders reset'); } if (r.back) ui.pop(this); }
    ui.prompt('page', 'Pages'); ui.prompt('confirm', row?.slider ? 'Reset one' : 'Run'); if (this.pages[this.page] === 'Balance') ui.prompt('alt', 'Reset all');
  }
}
export const dev = {
  open(g) { if (g.sys.hubActive) return; g.ui.push(new DevScreen()); },
  tp(g, x, z) { g.player.pos.x = x; g.player.pos.z = z; g.ui.clear(); },
  allOf(c) { return require_collect()[c]; },
  async load(g) { const { loadWorld } = await import('../core/world.js'); const w = loadWorld(); if (w) g.startGame(w, false); },
  async reset(g) { const { newWorld } = await import('../core/world.js'); g.startGame(newWorld(1), true); g.world.errands.active = false; },
};
import { FISH, BUGS, FOSSILS, ART } from '../data/collect.js';
function require_collect() { return { fish: FISH.filter(f => !f.junk), bug: BUGS, fossil: FOSSILS, art: ART }; }
