// Dev mode: tools and live sliders, pad-navigable like everything else. All changes are live.
import { CLASSES } from '../../data/classes.js';
import { LEGENDARIES, RARITY_ORDER, SETS, SLOT_NAMES, SLOTS } from '../../data/items.js';
import { AFFLICTION_IDS, AFFLICTIONS, BOSS_IDS, MONSTERS } from '../../data/monsters.js';
import { QUESTS } from '../../data/quests.js';
import { DIFFICULTIES, TUNING, defaultTuning } from '../../data/tuning.js';
import { ZONES, zoneName } from '../../data/zones.js';
import { frame, Screen, tabs } from './base.js';

const TABS = ['CHEATS', 'GIVE', 'SPAWN', 'TRAVEL', 'WORLD', 'PARTY', 'SHOW', 'SLIDERS'];

export class DevScreen extends Screen {
  constructor(game) {
    super(game, { tag: 'dev' });
    this.tab = 0;
    this.slot = 0; this.rarity = 2; this.leg = 0; this.mon = 0; this.boss = 0; this.affs = []; this.scroll = 0; this.zone = 0; this.floor = 0; this.q = 0; this.qs = 0; this.page = 0;
  }
  draw(ui) {
    frame(ui, '');
    const before = this.tab;
    this.tab = tabs(ui, 'dev', TABS, this.tab, { first: ['dev:0:GOD MODE', 'dev:1:LEVEL UP', 'devc:mon', 'devc:zone', 'devc:time', 'dev:5:ADD BOT SEAT', 'dev:6:NAV GRID', 'slider:monsterHp'] });
    if (before !== this.tab) { this.page = 0; }
    ui.text(ui.w - 14, 14, 'DEV', { color: 'red', align: 'right' });
    this[`t${this.tab}`](ui);
    ui.footer([['tabL', 'TAB'], ['tabR', 'TAB'], ['confirm', 'USE'], ['back', 'BACK']]);
  }
  grid(ui, items, o = {}) {
    const cols = o.cols ?? 3;
    const cw = Math.floor((ui.w - 28 - (cols - 1) * 2) / cols);
    const y0 = o.y ?? 30;
    items.forEach(([label, act, opt], i) => {
      const x = 14 + (i % cols) * (cw + 2), y = y0 + Math.floor(i / cols) * 15;
      if (ui.button(`dev:${this.tab}:${label}`, x, y, cw, 14, label.slice(0, Math.floor((cw - 6) / 6)), { color: opt?.on ? 'lime' : 'mist', ...opt })) act();
    });
    return y0 + Math.ceil(items.length / cols) * 15;
  }
  cycler(ui, id, x, y, w, label, step) {
    const r = ui.widget(`devc:${id}`, x, y, w, 14);
    ui.rect(x, y, w, 14, r.focused ? 'plum' : 'night');
    ui.text(x + 4, y + 3, `< ${label.slice(0, Math.floor((w - 28) / 6))} >`, { color: 'sand' });
    const input = this.game.input.menu;
    if (r.focused && input.left) step(-1);
    if (r.focused && input.right) step(1);
    if (r.activated) step(1);
    if (r.alt) step(-1);
  }
  // Cheats.
  t0(ui) {
    const g = this.game, c = g.world.cheats;
    const cheat = (k, label) => [`${label}${c[k] ? ': ON' : ''}`, () => g.cmd({ c: 'dev_cheat', k, v: !c[k] }), { on: c[k] }];
    this.grid(ui, [cheat('god', 'GOD MODE'), cheat('oneHit', 'ONE-HIT KILLS'), cheat('noCd', 'NO COOLDOWNS'), cheat('infRes', 'INFINITE RESOURCE'), cheat('noClip', 'NO COLLISION'), cheat('invisible', 'INVISIBLE')], { cols: 2 });
  }
  // Give.
  t1(ui) {
    const g = this.game, h = this.hero;
    let y = this.grid(ui, [['LEVEL UP', () => g.cmd({ c: 'dev_level', n: 1 })], ['LEVEL TO 30', () => g.cmd({ c: 'dev_level_max' })], ['GOLD', () => g.cmd({ c: 'dev_gold', n: 10000 })], ['MATERIALS', () => g.cmd({ c: 'dev_mats' })], ['ALL GEMS', () => g.cmd({ c: 'dev_gems' })], ['REVIVE ALL', () => g.cmd({ c: 'dev_revive' })]]);
    y += 4;
    const third = Math.floor((ui.w - 28) / 3);
    this.cycler(ui, 'slot', 14, y, third - 2, SLOT_NAMES[SLOTS[this.slot]], (d) => { this.slot = (this.slot + d + SLOTS.length) % SLOTS.length; });
    this.cycler(ui, 'rar', 14 + third, y, third - 2, RARITY_ORDER[this.rarity], (d) => { this.rarity = (this.rarity + d + RARITY_ORDER.length) % RARITY_ORDER.length; });
    if (ui.button('dev:giveitem', 14 + third * 2, y, third, 14, 'GIVE ITEM')) g.cmd({ c: 'dev_item', slot: SLOTS[this.slot], rarity: RARITY_ORDER[this.rarity] });
    y += 16;
    const legs = Object.keys(LEGENDARIES);
    this.cycler(ui, 'leg', 14, y, third * 2 - 2, LEGENDARIES[legs[this.leg]].name, (d) => { this.leg = (this.leg + d + legs.length) % legs.length; });
    if (ui.button('dev:giveleg', 14 + third * 2, y, third, 14, 'GIVE LEGENDARY')) g.cmd({ c: 'dev_legendary', id: legs[this.leg] });
    y += 16;
    const sets = Object.keys(SETS);
    this.setI = this.setI ?? 0;
    this.cycler(ui, 'set', 14, y, third * 2 - 2, SETS[sets[this.setI]].name, (d) => { this.setI = (this.setI + d + sets.length) % sets.length; });
    if (ui.button('dev:giveset', 14 + third * 2, y, third, 14, 'GIVE ALL 4')) for (const slot of ['head', 'chest', 'hands', 'feet']) g.cmd({ c: 'dev_set', set: sets[this.setI], slot });
    void h;
  }
  // Spawn.
  t2(ui) {
    const g = this.game;
    const mons = Object.keys(MONSTERS).filter((k) => !BOSS_IDS.includes(k) && !['pallbearer', 'coffin_bearer', 'lamp_post', 'iron_bell', 'decoy'].includes(k));
    const half = Math.floor((ui.w - 28) / 2);
    let y = 30;
    this.cycler(ui, 'mon', 14, y, half - 2, MONSTERS[mons[this.mon]].name, (d) => { this.mon = (this.mon + d + mons.length) % mons.length; });
    if (ui.button('dev:spawn1', 14 + half, y, half / 2 - 1, 14, 'SPAWN 1')) g.cmd({ c: 'dev_spawn', type: mons[this.mon], n: 1 });
    if (ui.button('dev:spawn10', 14 + half + half / 2, y, half / 2, 14, 'SPAWN 40')) g.cmd({ c: 'dev_spawn', type: mons[this.mon], n: 40 });
    y += 16;
    this.grid(ui, AFFLICTION_IDS.map((a) => [AFFLICTIONS[a].name, () => { const i = this.affs.indexOf(a); if (i >= 0) this.affs.splice(i, 1); else this.affs.push(a); }, { on: this.affs.includes(a) }]), { y, cols: 4 });
    y += 32;
    if (ui.button('dev:champ', 14, y, half - 2, 14, 'ELITE: CHAMPION PACK')) g.cmd({ c: 'dev_spawn', type: mons[this.mon], elite: 'champion', aff: this.affs });
    if (ui.button('dev:rare', 14 + half, y, half, 14, 'ELITE: RARE PACK')) g.cmd({ c: 'dev_spawn', type: mons[this.mon], elite: 'rare', aff: this.affs });
    y += 16;
    this.cycler(ui, 'boss', 14, y, half - 2, MONSTERS[BOSS_IDS[this.boss]].name, (d) => { this.boss = (this.boss + d + BOSS_IDS.length) % BOSS_IDS.length; });
    if (ui.button('dev:boss', 14 + half, y, half, 14, 'SPAWN BOSS')) g.cmd({ c: 'dev_boss', type: BOSS_IDS[this.boss] });
    y += 16;
    this.grid(ui, [['COLLECTION PLATE', () => g.cmd({ c: 'dev_plate' })], ['UNQUIET COFFIN', () => g.cmd({ c: 'dev_coffin' })], ['KILL ALL', () => g.cmd({ c: 'dev_kill_all' })]], { y });
  }
  // Travel.
  t3(ui) {
    const g = this.game;
    const zones = ['yard', 'town', 'causeway', 'pantry', 'ossuary', 'cloister', 'belfry'];
    const half = Math.floor((ui.w - 28) / 2);
    let y = 30;
    const z = ZONES[zones[this.zone]];
    this.floor = Math.min(this.floor, z.floors - 1);
    this.cycler(ui, 'zone', 14, y, half - 2, zoneName(zones[this.zone], this.floor), (d) => { this.zone = (this.zone + d + zones.length) % zones.length; this.floor = 0; });
    this.cycler(ui, 'floor', 14 + half, y, half / 2 - 2, `FLOOR ${this.floor + 1}`, (d) => { this.floor = (this.floor + d + z.floors) % z.floors; });
    if (ui.button('dev:go', 14 + half + half / 2, y, half / 2, 14, 'GO')) { g.closeAll(); g.cmd({ c: 'dev_goto', zone: zones[this.zone], floor: this.floor }); return; }
    y += 18;
    const q = QUESTS[this.q] ?? QUESTS[0];
    this.qs = Math.min(this.qs, q.steps.length - 1);
    this.cycler(ui, 'quest', 14, y, half - 2, q.name, (d) => { this.q = (this.q + d + QUESTS.length) % QUESTS.length; this.qs = 0; });
    this.cycler(ui, 'qstep', 14 + half, y, half / 2 - 2, q.steps[this.qs].id, (d) => { this.qs = (this.qs + d + q.steps.length) % q.steps.length; });
    if (ui.button('dev:setq', 14 + half + half / 2, y, half / 2, 14, 'SET')) g.cmd({ c: 'dev_quest', i: this.q, s: this.qs });
    y += 18;
    this.grid(ui, [
      ['BURSAR ARENA', () => { g.closeAll(); g.cmd({ c: 'dev_quest', i: 2, s: 4 }); g.cmd({ c: 'dev_goto', zone: 'ossuary', floor: 2 }); }],
      ['BISHOP ARENA', () => { g.closeAll(); g.cmd({ c: 'dev_quest', i: 3, s: 3 }); g.cmd({ c: 'dev_goto', zone: 'cloister', floor: 0 }); }],
      ['MALISON ARENA', () => { g.closeAll(); g.cmd({ c: 'dev_quest', i: 4, s: 2 }); g.cmd({ c: 'dev_goto', zone: 'belfry', floor: 3 }); }],
      ['START KNELL RUN', () => { g.closeAll(); g.cmd({ c: 'dev_knell_start' }); }],
      ['FILL THE KNELL', () => g.cmd({ c: 'dev_knell_fill' })],
    ], { y });
  }
  // World.
  t4(ui) {
    const g = this.game, w = g.world;
    const half = Math.floor((ui.w - 28) / 2);
    let y = 30;
    const scales = [0.25, 0.5, 1, 2];
    this.timeI = this.timeI ?? 2;
    this.cycler(ui, 'time', 14, y, half - 2, `TIME SCALE ${scales[this.timeI]}`, (d) => { this.timeI = (this.timeI + d + scales.length) % scales.length; g.devTimeScale = scales[this.timeI]; });
    this.cycler(ui, 'diff', 14 + half, y, half, DIFFICULTIES[w.difficulty].name, (d) => { const n = (w.difficulty + d + DIFFICULTIES.length) % DIFFICULTIES.length; w.account.unlocks.penance = true; g.cmd({ c: 'difficulty', index: n }); });
    y += 18;
    this.grid(ui, [['REROLL MAP SEED', () => { g.closeAll(); g.rerollMap(); }], ['REVEAL MAP', () => g.cmd({ c: 'dev_reveal' })], ['NEXT BOSS PHASE', () => g.cmd({ c: 'dev_next_phase' })]], { y });
  }
  // Party.
  t5(ui) {
    const g = this.game;
    const humans = g.world.heroes.filter((h) => !h.gone && !h.companion);
    this.grid(ui, [
      ['ADD BOT SEAT', () => g.addBotSeat()], ['REMOVE BOT SEAT', () => g.removeBotSeat()],
      [`BOT PLAYS THIS HERO: ${g.botSeats.has(0) ? 'ON' : 'OFF'}`, () => g.toggleBot(0), { on: g.botSeats.has(0) }],
      ['PLAY THE ATTRACT TOUR', () => { g.closeAll(); g.startAttract(true); }],
    ], { cols: 2 });
    ui.text(14, 70, `SEATS ${humans.length}`, { color: 'mist' });
    void CLASSES;
  }
  // Overlays.
  t6(ui) {
    const g = this.game;
    const o = g.overlays;
    const t = (k, label) => [`${label}${o[k] ? ': ON' : ''}`, () => { o[k] = !o[k]; g.overlaysOn = Object.values(o).some(Boolean); }, { on: o[k] }];
    this.grid(ui, [t('nav', 'NAV GRID'), t('hit', 'HIT CIRCLES'), t('ai', 'AI STATE'), t('spawn', 'SPAWN MARKERS'), t('flow', 'FLOW FIELD'), t('state', 'FPS AND STATE')], { cols: 2 });
  }
  // Sliders.
  t7(ui) {
    const g = this.game, w = g.world;
    const input = g.input.menu;
    const per = Math.floor((ui.h - 62) / 12);
    const pages = Math.ceil(TUNING.length / per);
    const page = Math.min(this.page, pages - 1);
    TUNING.slice(page * per, page * per + per).forEach((t, i) => {
      const y = 30 + i * 12;
      const r = ui.widget(`slider:${t.id}`, 14, y, ui.w - 28, 11);
      ui.rect(14, y, ui.w - 28, 11, r.focused ? 'plum' : 'night');
      ui.text(18, y + 2, t.label, { color: r.focused ? 'white' : 'mist' });
      const bx = 152, bw = ui.w - bx - 84;
      ui.rect(bx, y + 3, bw, 5, 'ink');
      const f = (w.tuning[t.id] - t.min) / (t.max - t.min);
      ui.rect(bx, y + 3, bw * f, 5, w.tuning[t.id] === t.def ? 'slate' : 'sand');
      ui.rect(bx + bw * ((t.def - t.min) / (t.max - t.min)), y + 2, 1, 7, 'white');
      ui.text(ui.w - 20, y + 2, `${round(w.tuning[t.id])} (${t.def})`, { color: 'sand', align: 'right' });
      const set = (v) => g.cmd({ c: 'dev_scale', k: t.id, v: Math.max(t.min, Math.min(t.max, round(v))) });
      if (r.focused && input.left) set(w.tuning[t.id] - t.step);
      if (r.focused && input.right) set(w.tuning[t.id] + t.step);
      if (r.activated && input.click) {
        const nf = Math.max(0, Math.min(1, (input.clickX - bx) / bw));
        set(t.min + nf * (t.max - t.min));
      }
    });
    const fy = 30 + Math.min(per, TUNING.length) * 12 + 2;
    if (ui.button('slider:reset', 14, fy, 150, 13, 'RESET TO DEFAULTS')) { const d = defaultTuning(); for (const k of Object.keys(d)) g.cmd({ c: 'dev_scale', k, v: d[k] }); }
    if (pages > 1) {
      if (ui.button('slider:page', 170, fy, 80, 13, `PAGE ${page + 1}/${pages}`)) this.page = (page + 1) % pages;
    }
  }
}

const round = (v) => Math.round(v * 100) / 100;
