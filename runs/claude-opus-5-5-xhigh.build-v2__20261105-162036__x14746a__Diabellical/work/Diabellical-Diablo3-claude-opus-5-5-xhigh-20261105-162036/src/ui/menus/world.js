// Screens that sit over the world: the map, dialogue, death, the Knell Font, writs, cutscenes.
import { CLASSES } from '../../data/classes.js';
import { BARKS, NPC_LABELS, SPEAKERS, STORY_LINES, SYSTEM_LINES, TALKS } from '../../data/dialog.js';
import { LORE } from '../../data/lore.js';
import { KNELL_MOD_IDS, KNELL_MODS } from '../../data/quests.js';
import { DIFFICULTIES, RULES } from '../../data/tuning.js';
import { ZONES, zoneName } from '../../data/zones.js';
import { THREE, Timeline } from '../../../pixel-engine.js';
import { usableGate, zoneOpen } from '../../sim/commands.js';
import { rollMods } from '../../sim/knell.js';
import { currentQuest, currentStep, objectiveOf } from '../../sim/quests.js';
import { fmtNum } from '../../view/view.js';
import { icon } from '../icons.js';
import { frame, Screen } from './base.js';
import { BrasseScreen, OgiveScreen, PennywhistleScreen, StashScreen } from './vendors.js';

export class MapScreen extends Screen {
  constructor(game) { super(game, { tag: 'map' }); }
  draw(ui) {
    const g = this.game;
    const w = g.world;
    const z = w.zone;
    frame(ui, zoneName(z.id, z.floor).slice(0, 26));
    const h = this.hero;
    // Explored cells, whole floor.
    const mx = 12, my = 30, mw = Math.min(ui.w - 170, 300), mh = ui.h - 58;
    ui.rect(mx - 1, my - 1, mw + 2, mh + 2, 'slate');
    ui.rect(mx, my, mw, mh, 'night');
    const s = Math.max(1, Math.floor(Math.min(mw / z.w, mh / z.h)));
    const ox = mx + Math.floor((mw - z.w * s) / 2), oy = my + Math.floor((mh - z.h * s) / 2);
    for (let row = 0; row < z.h; row++) {
      let run = -1, col = null;
      for (let c = 0; c <= z.w; c++) {
        let k = null;
        if (c < z.w && z.seen[row * z.w + c]) {
          const ch = z.rows[row][c];
          k = ch === '#' || ch === 'P' ? 'mist' : ch === '~' || ch === ' ' ? null : 'slate';
        }
        if (k !== col) { if (col) ui.hud.rect(ox + run * s, oy + row * s, (c - run) * s, s, col); run = c; col = k; }
      }
    }
    const mark = (x, zz, c, size = 3) => ui.hud.rect(Math.floor(ox + x * s - size / 2), Math.floor(oy + zz * s - size / 2), size, size, c);
    for (const o of w.objects) {
      if (o.hidden || !z.seen[Math.floor(o.z) * z.w + Math.floor(o.x)]) continue;
      if (o.kind === 'lychgate') mark(o.x, o.z, 'lime');
      else if (o.kind === 'exit') mark(o.x, o.z, 'sky');
      else if (o.kind === 'npc') mark(o.x, o.z, 'sand');
      else if (o.kind === 'shrine' && o.state === 0) mark(o.x, o.z, 'orange');
    }
    for (const a of w.heroes) if (!a.gone) mark(a.x, a.z, a === h ? 'white' : 'mist', 4);
    const q = w.camp ? objectiveOf(w) : null;
    if (q?.zone === z.id && (q.floor === undefined || q.floor === z.floor)) {
      const o = q.key ? w.objects.find((b) => b.key === q.key && !b.hidden) : null;
      const r = q.boss ? z.rooms.find((b) => b.tpl?.boss === q.boss) : null;
      const qx = o?.x ?? r?.cx ?? q.x, qz = o?.z ?? r?.cz ?? q.z;
      if (qx !== undefined && g.frame % 40 < 28) mark(qx, qz, 'red', 5);
    }
    // Travel.
    const lx = mx + mw + 8, lw = ui.w - lx - 12;
    const canTravel = w.camp && (z.def.safe || (h && usableGate(w, h)));
    const quest = w.camp ? currentStep(w) : null;
    let y = my;
    if (quest) { ui.textBlock(lx, y, quest.text, lw, { color: 'sand', lineH: 9 }); y += ui.wrap(quest.text, lw).length * 9 + 6; }
    if (canTravel) {
      ui.text(lx, y, 'TRAVEL', { color: 'mist' }); y += 11;
      const dest = [];
      if (z.id !== 'town') dest.push({ label: 'TOLLHAVEN', cmd: { c: 'travel', zone: 'town' } });
      for (const zid of ['causeway', 'ossuary', 'cloister', 'belfry']) {
        if (zoneOpen(w, zid) && !(z.id === zid && z.floor === 0)) dest.push({ label: ZONES[zid].name.replace('THE ', ''), cmd: { c: 'travel', zone: zid } });
      }
      for (const [key, gate] of Object.entries(w.camp.gates)) {
        if (gate.zone === 'town' || (gate.zone === z.id && gate.floor === z.floor) || gate.floor === 0) continue;
        dest.push({ label: `${ZONES[gate.zone].name.replace('THE ', '').slice(0, 12)} ${gate.floor + 1}`, cmd: { c: 'travel', key } });
      }
      dest.slice(0, 9).forEach((d, i) => {
        if (ui.button(`map:${i}`, lx, y, lw, 13, d.label.slice(0, Math.floor((lw - 8) / 6)), { left: true })) { g.cmd(d.cmd); g.closeScreen(); }
        y += 14;
      });
    } else ui.textBlock(lx, y, 'STAND AT A LYCHGATE TO TRAVEL.', lw, { color: 'slate', lineH: 9 });
    ui.footer([['back', 'CLOSE']]);
  }
}

// ---- Dialogue ---------------------------------------------------------------------------------
const SERVICES = {
  pennywhistle: [['TRADE', (g) => g.openScreen(new PennywhistleScreen(g))]],
  brasse: [['FORGE', (g) => g.openScreen(new BrasseScreen(g))]],
  ogive: [['RELIQUARY', (g) => g.openScreen(new OgiveScreen(g))]],
};

export function dialogueFor(w, npc, rng) {
  const st = w.camp ? `${npc}:${currentQuest(w)?.id}.${currentStep(w)?.id}` : '';
  if (TALKS[st]) return TALKS[st];
  if (npc === 'crier' && w.camp?.flags.overdue_found && !w.camp.flags.overdue_done) return TALKS['crier:overdue'];
  const barks = BARKS[npc] ?? ['...'];
  return [[npc, barks[Math.floor(rng.next() * barks.length)]]];
}

export class DialogueScreen extends Screen {
  constructor(game, npc, id) {
    super(game, { tag: 'dialogue', freeze: false, holdSim: true });
    this.npc = npc;
    this.objId = id;
    this.lines = dialogueFor(game.world, npc, game.uiRng);
    this.i = 0;
    this.holdT = 0;
    this.spokenI = -1;
  }
  get services() {
    const w = this.game.world;
    if (this.npc === 'brasse' && !w.camp?.flags.forge) return [];
    if (this.npc === 'ogive' && !w.camp?.flags.reliquary) return [];
    if (this.npc === 'pennywhistle' && !w.camp?.flags.crier_met) return [];
    return SERVICES[this.npc] ?? [];
  }
  onOpen() {
    const o = this.game.world.objects.find((q) => q.id === this.objId);
    if (o) this.game.view.camOverride = { x: o.x, z: o.z, zoom: 1.45 };
  }
  onClose() { this.game.view.camOverride = null; }
  finish() {
    if (this.done) return;
    this.done = true;
    this.game.cmd({ c: 'talk_done', npc: this.npc });
  }
  back() { this.finish(); this.game.closeScreen(); }
  draw(ui) {
    const W = ui.w, H = ui.h;
    const barH = 22;
    ui.rect(0, 0, W, barH, 'ink');
    ui.rect(0, H - 62, W, 62, 'ink');
    ui.rect(0, H - 63, W, 1, 'slate');
    const input = this.game.input.menu;
    const line = this.lines[this.i];
    if (line) {
      const [who, text] = line;
      if (this.spokenI !== this.i) { this.spokenI = this.i; this.game.audioSys?.speak(who, text); }
      const sp = SPEAKERS[who] ?? { name: '', color: 'mist' };
      if (sp.name) ui.text(20, H - 58, sp.name, { color: sp.color });
      ui.textBlock(20, H - 47, text, W - 40, { color: 'white', lineH: 9 });
      if (input.skipHeld) this.holdT += 1 / 60; else this.holdT = 0;
      if (this.holdT > 0.5) { this.i = this.lines.length; }
      if (input.confirm || input.click || input.back) {
        this.i++;
        this.game.audioSys?.sfx('ui_move');
      }
      ui.prompt('confirm', 'NEXT', W - 70, H - 14);
      return;
    }
    // Lines done: choices, or leave.
    const opts = this.services;
    this.finish();
    if (!opts.length) { this.game.closeScreen(); return; }
    ui.text(20, H - 58, NPC_LABELS[this.npc], { color: SPEAKERS[this.npc]?.color ?? 'sand' });
    let x = 20;
    const y = H - 44;
    for (const [label, act] of opts) {
      if (ui.button(`talk:${label}`, x, y, 80, 18, label)) { this.game.closeScreen(); act(this.game); return; }
      x += 84;
    }
    if (ui.button('talk:leave', x, y, 80, 18, 'LEAVE')) this.game.closeScreen();
    ui.footer([['confirm', 'CHOOSE'], ['back', 'LEAVE']]);
  }
}

export class LoreScreen extends Screen {
  constructor(game, id) {
    super(game, { tag: 'lore', freeze: false, holdSim: true });
    this.id = id;
    this.page = 0;
  }
  draw(ui) {
    const l = LORE[this.id];
    const W = ui.w, H = ui.h;
    ui.panel(30, 26, W - 60, H - 60, { border: 'sand' });
    ui.text(W / 2, 34, l.title, { color: 'sand', align: 'center', scale: 2 });
    const text = l.pages[this.page];
    if (this.spoken !== this.page) { this.spoken = this.page; this.game.audioSys?.speak('narrator', text); }
    ui.textBlock(42, 58, text, W - 84, { color: 'white' });
    ui.text(W / 2, H - 46, `${this.page + 1}/${l.pages.length}`, { color: 'slate', align: 'center' });
    const input = this.game.input.menu;
    if (input.confirm || input.click) {
      if (this.page + 1 < l.pages.length) this.page++;
      else this.game.closeScreen();
    }
    ui.footer([['confirm', 'TURN THE PAGE'], ['back', 'CLOSE']]);
  }
}

// ---- Death ------------------------------------------------------------------------------------
export class DeathScreen extends Screen {
  constructor(game, seat) { super(game, { tag: 'death', freeze: false }); this.seat = seat; }
  draw(ui) {
    const g = this.game;
    const h = g.world.heroes.find((o) => o.seat === this.seat);
    if (!h || !h.dead) { g.closeScreen(); return; }
    const W = ui.w, H = ui.h;
    ui.rect(0, H / 2 - 56, W, 112, 'ink');
    ui.text(W / 2, H / 2 - 48, SYSTEM_LINES.death, { color: 'red', align: 'center' });
    const wait = Math.max(0, (h.deathWait ?? 5) - h.deadT);
    const bw = 170, x = W / 2 - bw / 2;
    if (ui.button('rise:here', x, H / 2 - 30, bw, 18, wait > 0 ? `RISE HERE ${Math.ceil(wait)}` : 'RISE HERE', { disabled: wait > 0 })) g.cmd({ c: 'rise', how: 'here' });
    if (!g.isSession) {
      const hasGate = g.world.camp?.lastGate;
      if (ui.button('rise:gate', x, H / 2 - 10, bw, 18, 'THE LAST LYCHGATE', { disabled: !hasGate })) g.cmd({ c: 'rise', how: 'gate' });
      if (ui.button('rise:town', x, H / 2 + 10, bw, 18, 'TOLLHAVEN')) g.cmd({ c: 'rise', how: 'town' });
    }
    if (g.humanCount() > 1) ui.text(W / 2, H / 2 + 34, 'AN ALLY MAY HOLD INTERACT OVER YOU', { color: 'mist', align: 'center' });
  }
  back() {}
}

// ---- Knell Font ------------------------------------------------------------------------------
export class KnellScreen extends Screen {
  constructor(game) {
    super(game, { tag: 'knell' });
    this.tab = 0;
    this.tier = 1;
    const w = game.world;
    this.mods = rollMods(game.uiRng, game.uiRng.next() < 0.5 ? 1 : 2);
  }
  draw(ui) {
    const g = this.game;
    const w = g.world;
    const h = this.hero;
    frame(ui, 'THE KNELL FONT');
    const unlocked = w.account.unlocks.knell;
    // Difficulty.
    let y = 32;
    ui.text(14, y, 'THE PARISH RECOMMENDS AGAINST IT', { color: 'mist' });
    y += 12;
    const diffs = DIFFICULTIES.filter((d) => !d.penance || w.account.unlocks.penance);
    const cw = Math.floor((ui.w - 28 - (diffs.length - 1) * 2) / Math.max(4, Math.min(8, diffs.length)));
    diffs.forEach((d, i) => {
      const x = 14 + (i % 4) * (cw + 2);
      const label = d.name.replace('PENANCE ', 'P.');
      const on = w.difficulty === DIFFICULTIES.indexOf(d);
      if (ui.button(`diff:${i}`, x, y + Math.floor(i / 8) * 15, cw, 14, label, { color: on ? 'sand' : 'mist', focusColor: on ? 'white' : 'sand' })) g.cmd({ c: 'difficulty', index: DIFFICULTIES.indexOf(d) });
    });
    y += 22;
    const cur = w.diffDef;
    ui.text(14, y, `MONSTER LIFE X${cur.hp}   DAMAGE X${cur.dmg}   REWARD X${cur.reward}`, { color: 'white' });
    y += 14;
    if (!unlocked) {
      ui.textBlock(14, y, 'THE FONT IS STILL. RING THE GREAT BELL FIRST, AND THE KNELL WILL ANSWER.', ui.w - 28, { color: 'slate' });
      ui.footer([['confirm', 'CHOOSE'], ['back', 'LEAVE']]);
      return;
    }
    // Modifiers as big cards.
    const mw = Math.floor((ui.w - 28 - 6) / 2);
    this.mods.forEach((m, i) => {
      const def = KNELL_MODS[m];
      const x = 14 + i * (mw + 6);
      ui.panel(x, y, mw, 34, { border: 'plum' });
      const ic = icon(def.icon);
      ui.sprite(x + 4, y + 11, ic.rows, ic.colors);
      ui.text(x + 20, y + 6, def.name, { color: 'sand' });
      ui.text(x + 20, y + 18, def.desc.slice(0, Math.floor((mw - 26) / 6)), { color: 'white' });
    });
    y += 40;
    if (ui.button('knell:go', 14, y, mw, 22, 'BEGIN A KNELL RUN', { color: 'white' })) {
      g.closeScreen();
      g.cmd({ c: 'knell_start', mods: this.mods });
      return;
    }
    const keys = h.grandKeys ?? 0;
    if (ui.button('knell:grand', 14 + mw + 6, y, mw - 40, 22, `GRAND KNELL (${keys} KEYS)`, { disabled: keys <= 0 })) {
      g.closeScreen();
      g.cmd({ c: 'knell_start', mods: this.mods, grand: true, tier: this.tier });
      return;
    }
    if (ui.button('knell:tier', ui.w - 14 - 38, y, 38, 22, `T${this.tier}`, { color: 'sand' })) this.tier = this.tier >= 20 ? 1 : this.tier + 1;
    y += 28;
    const best = w.account.bests[h.cls];
    ui.text(14, y, best ? `YOUR BEST AS ${CLASSES[h.cls].name}: TIER ${best.tier} IN ${Math.floor(best.time / 60)}:${String(best.time % 60).padStart(2, '0')}` : `NO GRAND KNELL YET AS ${CLASSES[h.cls].name}`, { color: 'mist' });
    y += 10;
    if (best !== undefined || keys) ui.text(14, y, `TIER ${this.tier}: LIFE X${(1.17 ** this.tier).toFixed(1)} DAMAGE X${(1.08 ** this.tier).toFixed(1)}. TEN MINUTES.`, { color: 'slate' });
    ui.footer([['confirm', 'CHOOSE'], ['back', 'LEAVE']]);
  }
}

export class ResultsScreen extends Screen {
  constructor(game, r) { super(game, { tag: 'results', freeze: false }); this.r = r; }
  draw(ui) {
    const r = this.r;
    const W = ui.w, H = ui.h;
    ui.panel(W / 2 - 150, 36, 300, H - 90, { border: 'sand' });
    ui.text(W / 2, 44, r.grand ? (r.beat ? 'THE GRAND KNELL, ANSWERED' : 'THE GRAND KNELL, TOO LATE') : 'THE KNELL IS SILENCED', { color: 'sand', align: 'center' });
    const t = Math.round(r.time);
    ui.text(W / 2, 60, `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, { color: 'white', scale: 3, align: 'center' });
    let y = 92;
    if (r.grand) { ui.text(W / 2, y, `TIER ${r.tier}${r.best ? '  A NEW BEST' : ''}`, { color: r.best ? 'lime' : 'white', scale: 2, align: 'center' }); y += 22; }
    ui.text(W / 2, y, `+${fmtNum(r.xp)} XP   +${r.shards} BELL SHARDS`, { color: 'white', align: 'center' });
    y += 12;
    if (r.keys) ui.text(W / 2, y, 'A GRAND KEY FELL', { color: 'orange', align: 'center' });
    if (ui.button('results:ok', W / 2 - 50, H - 78, 100, 18, 'VERY WELL')) this.game.closeScreen();
  }
}

export class WritsScreen extends Screen {
  constructor(game) { super(game, { tag: 'writs' }); }
  draw(ui) {
    const g = this.game;
    const w = g.world;
    frame(ui, 'THE WRIT BOARD');
    const camp = w.camp;
    if (!camp.writs.length || camp.writCache) {
      ui.textBlock(14, 36, camp.writCache ? 'ALL THREE PAID. THE VESTRY HAS MORE, IF YOU HAVE THE STOMACH.' : 'THREE JOBS, ON MAPS YOU KNOW. FINISH ALL THREE FOR A CACHE.', ui.w - 28, { color: 'white' });
      if (ui.button('writs:new', 14, 70, 170, 20, 'TAKE NEW WRITS')) { g.cmd({ c: 'writs' }); }
    } else {
      camp.writs.forEach((wr, i) => {
        const y = 36 + i * 30;
        ui.panel(14, y, ui.w - 28, 26, { border: wr.done ? 'lime' : 'slate' });
        ui.text(20, y + 4, wr.text.slice(0, Math.floor((ui.w - 40) / 6)), { color: wr.done ? 'lime' : 'white' });
        ui.text(20, y + 14, wr.done ? 'DONE' : wr.k === 'kill' ? `${wr.have}/${wr.n}` : 'NOT YET', { color: 'mist' });
      });
      ui.text(14, 130, `WRITS DONE ${camp.writsDone}  CACHES ${camp.writCaches}`, { color: 'sand' });
    }
    ui.footer([['confirm', 'CHOOSE'], ['back', 'LEAVE']]);
  }
}

// ---- Cutscenes --------------------------------------------------------------------------------
/** Lines over the world or over black, on a Timeline. Hold to skip. */
export class Cutscene extends Screen {
  constructor(game, o) {
    super(game, { tag: 'cutscene', freeze: false, holdSim: true });
    this.o = o;
    let at = 0.6;
    const lines = [];
    for (const [who, text] of o.lines) {
      const dur = Math.max(2.8, text.length * 0.075);
      lines.push({ at, until: at + dur, text, who });
      at += dur + 0.5;
    }
    this.tl = new Timeline({ lines, duration: at + (o.extra ?? 0.5), bars: 0.5, cues: o.cues ?? [], onEnd: () => { this.ended = true; } });
    this.tl.play();
    this.holdT = 0;
    this.curLine = null;
  }
  onOpen() {
    if (this.o.music) this.game.audioSys?.music(this.o.music);
    if (this.o.toll) this.game.audioSys?.sfx(this.o.toll);
    if (this.o.cam) this.game.view.camOverride = this.o.cam;
  }
  onClose() {
    this.game.view.camOverride = null;
    this.o.onEnd?.(this.game);
  }
  back() {}
  draw(ui, dt) {
    const g = this.game;
    this.tl.update(g.lastRealDt);
    const W = ui.w, H = ui.h;
    if (this.o.black) ui.rect(0, 0, W, H, 'ink');
    const bars = Math.round(this.tl.bars() * 24);
    if (bars > 0 && !this.o.black) { ui.rect(0, 0, W, bars, 'ink'); ui.rect(0, H - bars, W, bars, 'ink'); }
    const l = this.tl.line();
    if (l && l !== this.curLine) { this.curLine = l; g.audioSys?.speak(l.who, l.text); }
    if (l) {
      const sp = SPEAKERS[l.who] ?? { name: '', color: 'mist' };
      const lines = ui.wrap(l.text, W - 80);
      let y = this.o.black ? H / 2 - lines.length * 6 : H - 22 - lines.length * 9;
      if (sp.name) { ui.text(W / 2, y - 10, sp.name, { color: sp.color, align: 'center' }); }
      for (const t of lines) { ui.text(W / 2, y, t, { color: 'white', align: 'center' }); y += 10; }
    }
    if (this.o.title) ui.text(W / 2, 40, this.o.title, { color: 'sand', align: 'center', scale: 2 });
    const input = g.input.menu;
    if (input.skipHeld) { this.holdT += g.lastRealDt; } else this.holdT = 0;
    if (this.holdT > 0.6 || g.skipCutscenes) this.tl.skip();
    ui.prompt('confirm', this.holdT > 0 ? 'HOLDING' : 'HOLD TO SKIP', 14, H - 14);
    if (this.ended) g.closeScreen();
  }
}

export const STORY = {
  opening: (o = {}) => ({ lines: STORY_LINES.opening, black: true, toll: 'bell_cracked', music: 'vespers', ...o }),
  bursar_intro: { lines: STORY_LINES.bursar_intro },
  ambrose_intro: { lines: STORY_LINES.ambrose_intro },
  malison_intro: { lines: STORY_LINES.malison_intro },
  cellarer_intro: { lines: STORY_LINES.cellarer_intro },
};

export { THREE, RULES, StashScreen };
