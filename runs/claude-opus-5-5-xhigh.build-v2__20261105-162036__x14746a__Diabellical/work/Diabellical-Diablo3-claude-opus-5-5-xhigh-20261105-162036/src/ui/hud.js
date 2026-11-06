// The in-play HUD: a candle for life, a class vessel for resource, an action bar, world labels.
import { CLASSES } from '../data/classes.js';
import { SPEAKERS } from '../data/dialog.js';
import { AFFLICTIONS } from '../data/monsters.js';
import { RARITIES } from '../data/items.js';
import { KNELL_MODS } from '../data/quests.js';
import { SKILLS } from '../data/skills.js';
import { RULES, xpToNext } from '../data/tuning.js';
import { resolveSkill } from '../sim/effects.js';
import { skillCharges } from '../sim/hero.js';
import { objectLabel, usableObjects } from '../sim/objects.js';
import { objectiveOf, currentQuest, currentStep } from '../sim/quests.js';
import { itemCompare } from '../sim/loot.js';
import { SEAT_COLORS } from '../view/actors.js';
import { fmtNum } from '../view/view.js';
import { toWorld } from '../input/router.js';
import { icon, itemIcon } from './icons.js';

const SLOT_ACTIONS = ['s0', 's1', 's2', 's3', 's4', 's5'];
const SEAT_NAMES = ['P1', 'P2', 'P3', 'P4'];

export class HudSys {
  constructor(game, ctx) {
    this.game = game;
    this.ctx = ctx;
    this.toasts = [];
    this.subs = [];
    this.sub = null;
    this.hover = { monster: null, object: null, drop: null };
    this.flashes = {};
    this.requiem = { n: 0, t: 0 };
    this.tutorial = { moved: false, attacked: false, dodged: false, drank: false, assigned: false, teleSeen: false, equip: false, talk: false, gate: false };
    this.mapCache = null;
    this.mapT = 0;
    this.pick = null;
    this.bigToast = null;
    this.eventBar = null;
    this.coffinUntil = 0;
    this.questFlash = 0;
    this.zoneToast = 0;
    this.time = 0;
    this.knell = { v: 0, of: 1, pulse: 0 };
    this.bossInfo = null;
  }

  flashSlot(seat, slot) { this.flashes[`${seat}:${slot}`] = 18; }

  toast(text, color = 'white', o = {}) {
    if (this.toasts.some((t) => t.text === text && t.t < 1)) return;
    this.toasts.push({ text, color, t: 0, life: o.life ?? 3.2, big: !!o.big, prompt: o.prompt ?? null, seat: o.seat ?? -1 });
    if (this.toasts.length > 3) this.toasts.shift();
  }

  say(who, text, name = null) {
    const line = { who, text, name, dur: Math.max(2.4, text.length * 0.065) };
    if (this.sub) { if (this.subs.length > 2) this.subs.shift(); this.subs.push(line); }
    else this.startSub(line);
  }

  startSub(line) {
    this.sub = { ...line, t: 0 };
    this.game.audioSys?.speak(line.who, line.text);
  }

  consume(events) {
    const local = (seat) => seat === undefined || seat === -1 || this.game.isLocalSeat?.(seat);
    for (const e of events) {
      switch (e.t) {
        case 'toast': if (local(e.seat)) this.toast(e.text, e.color, { big: e.big }); break;
        case 'sub': this.say(e.who, e.text, e.name); break;
        case 'quest': this.questFlash = 3; this.toast(`NEW OBJECTIVE: ${e.text}`, 'sand', { life: 4 }); this.game.audioSys?.sfx('quest'); break;
        case 'quest_done': this.toast(`QUEST COMPLETE: ${e.name}`, 'lime', { big: true, life: 4 }); break;
        case 'level':
          if (!local(e.seat) || e.quiet) break;
          this.toast(`LEVEL ${e.level}`, 'sand', { big: true });
          if (e.level <= 6) this.toast('YOU FEEL MORE ALIVE. THIS IS NOT MEDICALLY POSSIBLE.', 'mist');
          for (const u of e.un ?? []) this.toast(u.k === 'skill' ? `NEW SKILL: ${u.name}` : u.k === 'tone' ? `NEW TONE: ${u.name}` : u.k === 'vow' ? 'YOU MAY SWEAR A VOW' : `${u.name} OPEN`, 'sky', { prompt: u.k === 'tone' || u.k === 'skill' || u.k === 'vow' ? 'skills' : null });
          break;
        case 'upgrade': if (local(e.seat)) this.toast(`UPGRADE: ${e.name}`, RARITIES[e.rarity].color, { prompt: 'equip', life: 6 }); break;
        case 'pick':
          if (!local(e.seat)) break;
          if (e.kind === 'item' && (e.rarity === 'legendary' || e.rarity === 'set')) this.toast(e.name, RARITIES[e.rarity].color, { big: true, life: 5 });
          if (e.kind === 'gem') this.toast('A GEM', 'sand');
          break;
        case 'requiem': if (local(e.s)) { this.requiem.n = e.n; this.requiem.t = 1.6; } break;
        case 'lore': if (local(e.seat)) this.toast('A NEW PAGE IN THE CODEX', 'sand', { life: 3 }); break;
        case 'bestiary': break;
        case 'elite_pack':
          // One at a time: a room full of elites should not fill the screen with words.
          if ((this.eliteT ?? 0) <= this.time) { this.eliteT = this.time + 8; this.toast(`${e.name}: ${e.aff.join(', ')}`, e.kind === 'rare' ? 'sand' : 'sky', { life: 3 }); }
          break;
        case 'event': if (e.k === 'novices') { this.eventBar = { text: e.text, hp: 100, left: e.t0 }; } else { this.eventBar = null; this.toast(e.text, e.k === 'novices_done' ? 'lime' : 'red', { big: true }); } break;
        case 'event_tick': if (this.eventBar) { this.eventBar.hp = e.hp; this.eventBar.left = e.left; } break;
        case 'coffin': this.coffinUntil = e.state === 'start' ? this.game.frame + e.left * 60 : 0; if (e.state === 'start') this.toast('SURVIVE', 'red', { big: true, life: 2 }); break;
        case 'boss': this.bossInfo = { id: e.id, name: e.name, phases: e.phases }; if (e.song) this.game.audioSys?.bossMusic(e.song); break;
        case 'boss_dead': this.bossInfo = null; this.game.audioSys?.endBoss(this.game.world?.zone); break;
        case 'zone': this.zoneToast = 3.5; this.eventBar = null; this.bossInfo = null; this.coffinUntil = 0; break;
        case 'knell': this.knell.v = e.v; this.knell.of = e.of; this.knell.pulse = 1; if (e.v / e.of > 0.5) this.game.audioSys?.knellRising(true); break;
        case 'run_start': this.knell.v = 0; this.knell.of = e.total; this.toast(e.grand ? `THE GRAND KNELL, TIER ${e.tier}` : 'A KNELL RUN', 'white', { big: true }); break;
        case 'knell_tolls': this.toast('THE KNELL TOLLS', 'white', { big: true, life: 3 }); break;
        case 'casket': case 'crafted': this.toast(e.name, RARITIES[e.rarity].color, { life: 3 }); break;
        case 'extract': this.toast(`EXTRACTED: ${e.name}`, 'orange'); break;
        case 'equip': this.game.audioSys?.sfx('ui_equip'); break;
        case 'cant': this.game.audioSys?.sfx('ui_error'); break;
        default: break;
      }
    }
  }

  update(dt) {
    this.time += dt;
    for (let i = this.toasts.length - 1; i >= 0; i--) { this.toasts[i].t += dt; if (this.toasts[i].t > this.toasts[i].life) this.toasts.splice(i, 1); }
    if (this.sub) {
      this.sub.t += dt;
      if (this.sub.t > this.sub.dur) { const n = this.subs.shift(); this.sub = null; if (n) this.startSub(n); }
    }
    if (this.requiem.t > 0) this.requiem.t -= dt;
    if (this.zoneToast > 0) this.zoneToast -= dt;
    if (this.questFlash > 0) this.questFlash -= dt;
    this.knell.pulse = Math.max(0, this.knell.pulse - dt * 3);
    for (const k of Object.keys(this.flashes)) { this.flashes[k]--; if (this.flashes[k] <= 0) delete this.flashes[k]; }
  }

  /** World labels and picking, from the mouse. */
  updateHover(ui) {
    const g = this.game;
    const w = g.world;
    this.hover.monster = null; this.hover.object = null; this.hover.drop = null;
    if (!w || g.input.lastDevice !== 'kbm') return;
    const m = g.input.menu;
    const view = g.view;
    let best = 14 ** 2;
    for (const o of w.monsters) {
      if (o.dead || o.hidden) continue;
      const [sx, sy] = view.project(o.x, 0.9, o.z);
      const d = (sx - m.px) ** 2 + (sy - m.py) ** 2;
      if (d < best) { best = d; this.hover.monster = o; }
    }
    if (!this.hover.monster) {
      let bo = 16 ** 2;
      for (const o of w.objects) {
        if (o.hidden || o.noUse || o.kind === 'trap') continue;
        const [sx, sy] = view.project(o.x, 1, o.z);
        const d = (sx - m.px) ** 2 + (sy - m.py) ** 2;
        if (d < bo) { bo = d; this.hover.object = o; }
      }
    }
  }

  draw(ui, dt) {
    const g = this.game;
    const w = g.world;
    if (!w?.zone) return;
    ui.screenTag = 'hud';
    this.updateHover(ui);
    this.worldLabels(ui);
    const humans = w.heroes.filter((h) => !h.gone && !h.companion);
    const me = g.localHero();
    const showBig = g.localSeats().length <= 1;
    if (me && showBig) this.singleHud(ui, me);
    else this.couchHud(ui, humans);
    this.topCentre(ui, w);
    if (showBig) this.minimap(ui, w, me);
    else this.minimap(ui, w, me, true);
    const demo = g.mode === 'attract';
    this.toastsDraw(ui, showBig ? 96 : 112, demo);
    this.subtitle(ui);
    // The demo plays itself: nothing in it should tell the watcher to press anything but "any button".
    if (me && !demo) this.interactPrompt(ui, me, w);
    if (me && showBig && !demo) this.tutorialPrompts(ui, me, w);
    this.lowLife(ui, me);
    if (me?.pick) this.pick3(ui, me);
    if (g.overlaysOn) g.drawDevOverlays?.(ui);
  }

  lowLife(ui, h) {
    if (!h || h.dead) return;
    const frac = h.hp / h.stats.maxHp;
    const engine = this.ctx.engine;
    const target = frac < 0.35 ? 0.3 + (0.35 - frac) * 2 : 0.3;
    if (Math.abs(target - (this.vig ?? 0.3)) > 0.02) {
      this.vig = target;
      this.game.applyVignette?.(target);
    }
  }

  worldLabels(ui) {
    const g = this.game, w = g.world, view = g.view;
    // Damage numbers.
    for (let i = view.numbers.length - 1; i >= 0; i--) {
      const n = view.numbers[i];
      n.t += g.lastRealDt;
      if (n.t > n.life) { view.numbers.splice(i, 1); continue; }
      const [sx, sy] = view.project(n.x, n.y + n.t * (1.4 + n.dy), n.z);
      const pop = n.t < 0.08 && n.scale > 1 ? n.scale + 1 : n.scale;
      ui.text(sx, sy, n.text, { color: n.color, scale: pop, align: 'center' });
    }
    // Items and gold labels.
    const showAll = g.labelsHeld;
    for (const r of view.drops.values()) {
      if (r.kind !== 'item' && r.kind !== 'gem' && r.kind !== 'key') continue;
      const rich = r.kind !== 'item' || r.rarity === 'reliquary' || r.rarity === 'legendary' || r.rarity === 'set';
      if (!rich && !showAll) continue;
      const [sx, sy] = view.project(r.g.position.x, 0.5, r.g.position.z);
      const col = g.humanCount() > 1 ? SEAT_COLORS[r.owner] ?? r.color : r.color;
      // Long names lose their "OF THE ..." tail on the floor: the whole name is on the pick-up and in Gear.
      const short = r.name.length > 26 ? r.name.split(' OF ')[0] : r.name;
      const tw = ui.measure(short);
      ui.rect(sx - tw / 2 - 2, sy - 2, tw + 4, 11, 'ink');
      ui.text(sx, sy, short, { color: col, align: 'center', shadow: false });
    }
    // Names.
    const hovered = this.hover.monster;
    const me = g.localHero();
    const focus = hovered ?? (me && g.input.lastDevice === 'pad' ? softLockOf(w, me) : null);
    const named = []; // A pack shares one name: say it once, not once per body.
    for (const m of w.monsters) {
      if (m.dead || m.hidden || m.def.boss) continue;
      const isElite = m.elite === 'champion' || m.elite === 'rare';
      if (!isElite && m !== focus && m.def.ai !== 'plate') continue;
      const [sx, sy] = view.project(m.x, (m.def.big ? 2.6 : 1.9) * (m.scale ?? 1), m.z);
      const color = m.elite === 'rare' ? 'sand' : m.elite === 'champion' ? 'sky' : 'white';
      if (m === focus || isElite) {
        const bw = isElite ? 40 : 28;
        ui.rect(sx - bw / 2 - 1, sy + 8, bw + 2, 4, 'ink');
        ui.rect(sx - bw / 2, sy + 9, bw * Math.max(0, m.hp / m.maxHp), 2, 'red');
      }
      if (m === focus || isElite) {
        const repeat = m !== focus && named.some((n) => n.name === m.name && Math.abs(n.x - sx) < 80 && Math.abs(n.y - sy) < 40);
        if (!repeat) { ui.text(sx, sy - 2, m.name, { color, align: 'center' }); named.push({ name: m.name, x: sx, y: sy }); }
        if (isElite && m === focus && m.aff?.length) ui.text(sx, sy - 12, m.aff.map((a) => AFFLICTIONS[a].name).join(' '), { color: 'orange', align: 'center' });
      }
      if (m.status.res > 0) {
        for (let i = 0; i < m.status.res; i++) ui.rect(sx - 8 + i * 4, sy + 13, 3, 2, 'orange');
      }
    }
    for (const o of w.objects) {
      if (o.kind !== 'npc' || o.hidden) continue;
      const [sx, sy] = view.project(o.x, 2.6, o.z);
      if (sx < -40 || sx > ui.w + 40) continue;
      ui.text(sx, sy, o.label, { color: 'sand', align: 'center' });
    }
    if (g.humanCount() > 1) {
      for (const h of w.heroes) {
        if (h.gone || h.companion) continue;
        const [sx, sy] = view.project(h.x, 2.1, h.z);
        ui.text(sx, sy, g.seatLabel?.(h) ?? SEAT_NAMES[h.seat], { color: SEAT_COLORS[h.seat], align: 'center' });
      }
    }
    if (w.round && w.round.playT < 30) {
      for (const o of w.objects) {
        if (o.kind !== 'class_font') continue;
        const [sx, sy] = view.project(o.x, 1.4, o.z);
        ui.text(sx, sy, o.label, { color: CLASSES[o.cls].color, align: 'center' });
      }
    }
  }

  singleHud(ui, h) {
    const W = ui.w, H = ui.h;
    // Name, level, XP, gold.
    ui.text(12, 12, `LV ${h.level} ${h.name}`, { color: 'white' });
    const xpW = 90;
    ui.rect(12, 21, xpW + 2, 5, 'slate');
    ui.rect(13, 22, xpW, 3, 'ink');
    const frac = h.level >= RULES.levelCap ? this.devotionFrac() : h.xp / xpToNext(h.level);
    ui.rect(13, 22, xpW * Math.min(1, frac), 3, h.level >= RULES.levelCap ? 'sky' : 'sand');
    const gi = icon('gold-icon');
    ui.sprite(12, 28, gi.rows, gi.colors);
    ui.text(28, 31, fmtNum(h.gold), { color: 'sand' });
    this.candle(ui, h, 14, H - 12 - 70, 16, 70);
    this.vessel(ui, h, W - 14 - 30, H - 14 - 58);
    this.actionBar(ui, h);
    if (h.channel > 0 && h.state === 'channel') {
      const hold = h.ropeT ? 2 : RULES.bellChannel;
      const cw = 90;
      ui.rect(W / 2 - cw / 2 - 1, H - 58, cw + 2, 6, 'slate');
      ui.rect(W / 2 - cw / 2, H - 57, cw * Math.min(1, h.channel / hold), 4, 'sand');
    }
    if (this.requiem.t > 0 && this.requiem.n >= RULES.requiemMin) {
      const pop = this.requiem.t > 1.45 ? 3 : 2;
      ui.text(W - 14, H / 2 - 20, `${this.requiem.n} KILL`, { color: 'sand', scale: pop, align: 'right' });
      ui.text(W - 14, H / 2 - 2, 'REQUIEM', { color: 'orange', align: 'right' });
    }
    // Buffs, as words: there is room and they read at ten feet.
    let by = 40;
    for (const b of h.buffs) {
      const label = BUFF_NAMES[b.id];
      if (!label) continue;
      ui.text(12, by, `${label} ${Math.ceil(b.t)}`, { color: 'lime' });
      by += 9;
    }
  }

  devotionFrac() {
    const d = this.game.world.account.devotion;
    return d.xp / (RULES.devotionLevelBase + RULES.devotionLevelStep * d.level);
  }

  candle(ui, h, x, y, w, ht) {
    const frac = Math.max(0, h.hp / h.stats.maxHp);
    const melt = Math.round((ht - 12) * frac);
    const top = y + 10 + (ht - 12 - melt);
    // Dish, wax, wick, flame.
    ui.rect(x - 3, y + ht - 4, w + 6, 4, 'orange');
    ui.rect(x - 3, y + ht - 2, w + 6, 2, 'plum');
    ui.rect(x, y + 10, w, ht - 14, 'night');
    if (melt > 0) {
      ui.rect(x, top, w, melt, 'white');
      ui.rect(x + w - 4, top, 4, melt, 'mist');
      ui.rect(x + 1, top, 3, 2, 'sand');
    }
    if (frac < 0.3 && this.game.frame % 20 < 10) ui.rect(x, top, w, melt, 'sand');
    ui.rect(x + w / 2 - 1, top - 3, 2, 3, 'ink');
    const gutter = frac < 0.3 ? this.game.frame % 8 < 4 : this.game.frame % 16 < 8;
    const f = gutter ? FLAME_A : FLAME_B;
    if (!h.dead) ui.sprite(x + w / 2 - 4, top - 13, f, { o: 'orange', y: 'sand', r: 'red' });
    if (h.shield > 0) { ui.rect(x - 2, y + 10, 2, ht - 14, 'sky'); ui.rect(x + w, y + 10, 2, ht - 14, 'sky'); }
    ui.text(x + w + 5, y + ht - 8, fmtNum(Math.ceil(h.hp)), { color: frac < 0.3 ? 'red' : 'white' });
  }

  vessel(ui, h, x, y) {
    const frac = Math.min(1, h.res / h.stats.maxResTotal);
    const cls = h.cls;
    const W = 30, H = 46;
    if (cls === 'bellwarden') {
      // A bronze bell, filling from the bottom.
      for (let i = 0; i < H; i++) {
        const rowW = Math.round(8 + (i / H) ** 2 * 22);
        const filled = i >= H * (1 - frac);
        ui.rect(x + (W - rowW) / 2, y + i, rowW, 1, filled ? 'orange' : 'night');
      }
      ui.rect(x + W / 2 - 3, y - 4, 6, 4, 'plum');
      ui.rect(x, y + H - 1, W, 2, 'sand');
      ui.rect(x + W / 2 - 3, y + H + 1, 6, 3, 'sand');
    } else if (cls === 'lamplighter') {
      // A lantern's glass.
      ui.rect(x + 3, y + 2, W - 6, H - 2, 'slate');
      ui.rect(x + 5, y + 4, W - 10, H - 6, 'night');
      const fh = Math.round((H - 6) * frac);
      ui.rect(x + 5, y + 4 + (H - 6 - fh), W - 10, fh, 'orange');
      if (fh > 3) ui.rect(x + 9, y + 4 + (H - 6 - fh) + 2, W - 18, fh - 2, 'sand');
      ui.rect(x, y - 3, W, 5, 'plum');
      ui.rect(x + 2, y + H, W - 4, 3, 'plum');
    } else {
      // A jar of coins.
      ui.rect(x + 3, y + 4, W - 6, H - 4, 'slate');
      ui.rect(x + 5, y + 6, W - 10, H - 8, 'night');
      const rows = Math.round((H - 8) * frac / 3);
      for (let r = 0; r < rows; r++) ui.rect(x + 5 + (r % 2), y + H - 5 - r * 3, W - 11, 2, r % 3 === 0 ? 'orange' : 'sand');
      ui.rect(x + 1, y, W - 2, 5, 'plum');
    }
    ui.text(x + W / 2, y + H + 6, CLASSES[cls].res, { color: 'mist', align: 'center' });
    ui.text(x + W / 2, y - 14, `${Math.floor(h.res)}`, { color: 'white', align: 'center' });
  }

  actionBar(ui, h) {
    const size = 26, gap = 2;
    const total = (size + gap) * 8 + 6;
    let x = Math.floor(ui.w / 2 - total / 2);
    const y = ui.h - 12 - size;
    const seat = h.seat;
    // Potion and dodge.
    this.barSlot(ui, x, y, size, { icon: 'potion-red', cd: h.potionCd, cdMax: this.game.world.tuning.potionCooldown, glyph: 'potion' });
    x += size + gap;
    this.barSlot(ui, x, y, size, { icon: 'dash-icon', cd: h.dodgeCd, cdMax: this.game.world.tuning.dodgeCooldown, glyph: 'dodge' });
    x += size + gap + 6;
    for (let i = 0; i < 6; i++) {
      const s = h.skills[i];
      if (!s) { ui.rect(x, y, size, size, 'night'); ui.rect(x + 1, y + 1, size - 2, size - 2, 'ink'); if (h.level < RULES.slotLevels[i]) { const l = icon('lock'); ui.sprite(x + 7, y + 7, l.rows, l.colors); } x += size + gap; continue; }
      const sk = resolveSkill(h, s.id, s.tone);
      const can = !sk.cost || h.res >= sk.cost * (1 - h.stats.costred);
      const charges = sk.cd ? skillCharges(h, sk) : 1;
      this.barSlot(ui, x, y, size, {
        icon: sk.icon, cd: sk.cd && charges <= 0 ? h.cds[s.id] : 0, cdMax: sk.cd ?? 1, glyph: SLOT_ACTIONS[i], dim: !can, flash: this.flashes[`${seat}:${i}`], charges: (sk.charges ?? 1) > 1 ? charges : 0,
      });
      x += size + gap;
    }
  }

  barSlot(ui, x, y, size, o) {
    ui.rect(x, y, size, size, o.flash ? 'red' : 'slate');
    ui.rect(x + 1, y + 1, size - 2, size - 2, 'night');
    const ic = icon(o.icon);
    ui.sprite(x + 1, y + 1, ic.rows, ic.colors, { scale: 2 });
    if (o.dim) { ui.rect(x + 1, y + size - 5, size - 2, 4, 'red'); }
    if (o.cd > 0) {
      const f = Math.min(1, o.cd / o.cdMax);
      ui.rect(x + 1, y + 1, size - 2, (size - 2) * f, 'ink');
      ui.text(x + size / 2, y + size / 2 - 4, Math.ceil(o.cd), { color: 'white', align: 'center' });
    }
    if (o.charges) ui.text(x + 3, y + 3, o.charges, { color: 'sand' });
    ui.glyph(o.glyph, x + size - 12, y + size - 12);
  }

  couchHud(ui, humans) {
    const W = ui.w, H = ui.h;
    const corners = [[12, 12], [W - 12 - 92, 12], [12, H - 12 - 36], [W - 12 - 92, H - 12 - 36]];
    humans.forEach((h) => {
      const [x, y] = corners[h.seat] ?? corners[0];
      const c = SEAT_COLORS[h.seat];
      ui.rect(x, y, 92, 36, c);
      ui.rect(x + 1, y + 1, 90, 34, 'ink');
      ui.text(x + 4, y + 3, `${h.name.slice(0, 11)} ${h.level}`, { color: c });
      // Mini candle and vessel.
      ui.rect(x + 3, y + 12, 6, 21, 'night');
      const hf = Math.max(0, h.hp / h.stats.maxHp);
      ui.rect(x + 3, y + 12 + 21 * (1 - hf), 6, 21 * hf, 'white');
      ui.rect(x + 10, y + 12, 4, 21, 'night');
      const rf = Math.min(1, h.res / h.stats.maxResTotal);
      ui.rect(x + 10, y + 12 + 21 * (1 - rf), 4, 21 * rf, CLASSES[h.cls].color);
      for (let i = 0; i < 6; i++) {
        const s = h.skills[i];
        const ix = x + 17 + (i % 3) * 25, iy = y + 12 + Math.floor(i / 3) * 11;
        ui.rect(ix, iy, 24, 10, 'night');
        if (!s) continue;
        const sk = resolveSkill(h, s.id, s.tone);
        const ic = icon(sk.icon);
        ui.sprite(ix + 1, iy - 1, ic.rows.slice(0, 11), ic.colors);
        const cd = sk.cd && skillCharges(h, sk) <= 0 ? h.cds[s.id] : 0;
        if (cd > 0) ui.text(ix + 14, iy + 2, Math.ceil(cd), { color: 'white' });
      }
      if (h.dead) ui.text(x + 46, y + 18, 'DOWN', { color: 'red', align: 'center' });
    });
  }

  topCentre(ui, w) {
    const W = ui.w;
    const cx = Math.floor(W / 2);
    let y = 12;
    const boss = w.boss;
    if (boss && !boss.dead && !boss.hidden || (boss && boss.def?.boss === 'ambrose')) {
      const bw = Math.min(190, W - 210);
      ui.rect(cx - bw / 2 - 1, y + 9, bw + 2, 8, 'plum');
      ui.rect(cx - bw / 2, y + 10, bw, 6, 'ink');
      ui.rect(cx - bw / 2, y + 10, bw * Math.max(0, boss.hp / boss.maxHp), 6, 'red');
      for (const p of this.bossInfo?.phases ?? []) ui.rect(cx - bw / 2 + bw * p, y + 9, 1, 8, 'sand');
      const rounds = boss.bossState?.round && boss.def.boss === 'ambrose' ? ` ${boss.bossState.round} OF 3` : '';
      ui.text(cx, y, `${boss.def.title}${rounds}`, { color: 'red', align: 'center' });
      y += 22;
    } else if (this.zoneToast > 0 && !w.run) {
      ui.text(cx, y + 2, w.zone.def.name + (w.zone.def.floors > 1 ? ` ${w.zone.floor + 1}` : ''), { color: 'sand', align: 'center', scale: 1 });
      y += 14;
    }
    if (w.run && w.run.state === 'fill') {
      y = this.knellGauge(ui, w, cx, y);
    }
    if (this.coffinUntil > this.game.frame) {
      const left = Math.ceil((this.coffinUntil - this.game.frame) / 60);
      ui.text(cx, y, `SURVIVE ${left}`, { color: 'red', align: 'center', scale: 2 });
      y += 18;
    }
    if (this.eventBar) {
      const bw = 110;
      ui.text(cx, y, `${this.eventBar.text} ${this.eventBar.left}`, { color: 'sand', align: 'center' });
      ui.rect(cx - bw / 2 - 1, y + 9, bw + 2, 6, 'slate');
      ui.rect(cx - bw / 2, y + 10, bw * Math.max(0, this.eventBar.hp / 100), 4, 'lime');
      y += 18;
    }
    if (w.round) {
      const t = this.game.net?.timeLeft?.();
      if (t !== null && t !== undefined && t >= 0) { ui.text(cx, y, `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`, { color: 'mist', align: 'center' }); y += 11; }
    }
    this.topBottom = y;
  }

  knellGauge(ui, w, cx, y) {
    const r = w.run ?? {};
    const v = (this.game.isClient ? this.knell.v : r.meter) ?? 0;
    const of = (this.game.isClient ? this.knell.of : r.total) || 1;
    const f = Math.min(1, v / of);
    const H = 24, B = 34;
    // A bell-shaped gauge, filling.
    for (let i = 0; i < H; i++) {
      const rowW = Math.round(8 + (i / H) ** 2 * B);
      const filled = i >= H * (1 - f);
      ui.rect(cx - rowW / 2, y + i, rowW, 1, filled ? (this.knell.pulse > 0.5 ? 'white' : 'sand') : 'night');
    }
    ui.rect(cx - 3, y - 3, 6, 3, 'plum');
    ui.rect(cx - B / 2 - 3, y + H, B + 6, 2, 'orange');
    ui.text(cx, y + H + 4, `${Math.floor(f * 100)}%`, { color: 'white', align: 'center' });
    const mods = r.mods ?? [];
    let mx = cx + B / 2 + 8;
    for (const m of mods) { const name = KNELL_MODS[m]?.name ?? m; ui.text(mx, y + 2, name, { color: 'mist' }); y += 0; mx += 0; y += 9; }
    if (mods.length) y -= mods.length * 9;
    if (r.grand) { const t = Math.max(0, r.timer ?? 0); ui.text(cx - B / 2 - 8, y + 8, `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`, { color: t < 60 ? 'red' : 'white', align: 'right' }); }
    return y + H + 14;
  }

  minimap(ui, w, me, small = false) {
    const W = ui.w;
    const mw = small ? 56 : 72, mh = small ? 42 : 54;
    const x0 = small ? Math.floor(W / 2 - mw / 2) : W - 12 - mw, y0 = small ? ui.h - 12 - mh : 12;
    const z = w.zone;
    const cx = me?.x ?? z.w / 2, cz = me?.z ?? z.h / 2;
    ui.rect(x0 - 1, y0 - 1, mw + 2, mh + 2, 'slate');
    ui.rect(x0, y0, mw, mh, 'ink');
    this.mapT -= 1;
    if (this.mapT <= 0 || !this.mapCache) {
      this.mapT = 6;
      const runs = [];
      const scale = 1;
      for (let py = 0; py < mh; py++) {
        let start = -1, col = null;
        for (let px = 0; px <= mw; px++) {
          let c = null;
          if (px < mw) {
            const sx = (px - mw / 2) * scale * 0.71, sy = (mh / 2 - py) * scale * 0.71;
            const wx = cx + (sx - sy) * 1.0, wz = cz + (-sx - sy) * 1.0;
            const col_ = Math.floor(wx), row = Math.floor(wz);
            if (col_ >= 0 && row >= 0 && col_ < z.w && row < z.h && z.seen[row * z.w + col_]) {
              const ch = z.rows[row][col_];
              c = ch === '#' || ch === 'P' ? 'mist' : ch === '~' || ch === ' ' ? null : 'night';
            }
          }
          if (c !== col) {
            if (col && start >= 0) runs.push(px - start, py, start, col);
            start = px; col = c;
          }
        }
      }
      this.mapCache = runs;
    }
    const r = this.mapCache;
    for (let i = 0; i < r.length; i += 4) ui.hud.rect(x0 + r[i + 2], y0 + r[i + 1], r[i], 1, r[i + 3]);
    const toMap = (x, zz) => {
      const dx = x - cx, dz = zz - cz;
      const sx = (dx - dz) * 0.71, sy = (-dx - dz) * 0.71;
      return [x0 + mw / 2 + sx / 0.71 * 0.5 * 1.41, y0 + mh / 2 - sy / 0.71 * 0.5 * 1.41];
    };
    const mark = (x, zz, c, s = 2) => {
      const [px, py] = toMap(x, zz);
      if (px < x0 || py < y0 || px >= x0 + mw - s + 1 || py >= y0 + mh - s + 1) return;
      ui.hud.rect(Math.floor(px), Math.floor(py), s, s, c);
    };
    for (const o of w.objects) {
      if (o.hidden) continue;
      if (o.kind === 'lychgate') mark(o.x, o.z, 'lime');
      else if (o.kind === 'exit') mark(o.x, o.z, 'sky');
      else if (o.kind === 'npc') mark(o.x, o.z, 'sand');
    }
    for (const m of w.monsters) if (!m.dead && (m.elite === 'rare' || m.elite === 'champion' || m.def.boss)) mark(m.x, m.z, 'orange');
    for (const h of w.heroes) if (!h.gone) mark(h.x, h.z, h === me ? 'white' : SEAT_COLORS[h.seat] ?? 'mist', 3);
    const q = objectiveOf(w);
    if (w.camp && q && q.zone === z.id && (q.floor === undefined || q.floor === z.floor)) {
      const o = q.key ? w.objects.find((b) => b.key === q.key && !b.hidden) : null;
      const room = q.boss ? z.rooms.find((b) => b.tpl?.boss === q.boss) : null;
      const qx = o?.x ?? room?.cx ?? q.x, qz = o?.z ?? room?.cz ?? q.z;
      if (qx !== undefined) {
        const [px, py] = toMap(qx, qz);
        const ix = Math.min(x0 + mw - 3, Math.max(x0 + 1, px)), iy = Math.min(y0 + mh - 3, Math.max(y0 + 1, py));
        if (this.game.frame % 40 < 28) { ui.hud.rect(Math.floor(ix), Math.floor(iy), 3, 3, 'red'); }
      }
    }
    if (!small) {
      const st = w.camp ? currentStep(w) : null;
      let qy = y0 + mh + 4;
      const txt = w.run ? (w.run.state === 'fill' ? 'FILL THE KNELL' : w.run.state === 'warden' ? 'SLAY THE WARDEN' : 'THE WAY HOME IS OPEN') : st?.text;
      if (txt) {
        const lines = ui.wrap(txt, Math.min(130, W - 200));
        for (const l of lines) { ui.text(W - 12, qy, l, { color: this.questFlash > 0 ? 'sand' : 'mist', align: 'right' }); qy += 9; }
      }
    }
  }

  toastsDraw(ui, margin, demo = false) {
    let y = Math.max(40, (this.topBottom ?? 30) + 4) + (demo ? 34 : 0);
    const cx = Math.floor(ui.w / 2);
    // The middle of the screen only: the corners belong to the bars and the map.
    const column = ui.w - 2 * margin;
    for (const t of this.toasts) {
      if (demo && !t.big) continue;
      const sc = t.big ? 2 : 1;
      let tw = 0;
      if (t.prompt) {
        const label = t.prompt === 'equip' ? 'EQUIP' : 'SKILLS';
        const action = t.prompt === 'equip' ? 'equip' : 'skills';
        tw = ui.measure(label) + 16;
        const lines = ui.wrap(t.text, column - tw - 6, sc);
        for (let i = 0; i < lines.length - 1; i++) { ui.text(cx, y, lines[i], { color: t.color, scale: sc, align: 'center' }); y += 10 * sc; }
        const last = lines[lines.length - 1];
        const full = ui.measure(last, sc) + tw + 6;
        ui.text(cx - full / 2, y, last, { color: t.color, scale: sc });
        ui.prompt(action, label, cx - full / 2 + ui.measure(last, sc) + 6, y);
      } else {
        const lines = ui.wrap(t.text, column, sc);
        for (const l of lines) { ui.text(cx, y, l, { color: t.color, scale: sc, align: 'center' }); y += 10 * sc; }
        y -= 10 * sc;
      }
      y += t.big ? 20 : 12;
    }
  }

  subtitle(ui) {
    const s = this.sub;
    if (!s) return;
    const sp = SPEAKERS[s.who] ?? { name: s.name ?? '', color: 'mist' };
    const maxW = Math.min(ui.w - 40, 370);
    const lines = ui.wrap(s.text, maxW);
    const y0 = ui.h - 50 - lines.length * 9 - (sp.name || s.name ? 9 : 0);
    const cx = Math.floor(ui.w / 2);
    const width = Math.max(...lines.map((l) => ui.measure(l))) + 10;
    ui.rect(cx - width / 2, y0 - 2, width, lines.length * 9 + (sp.name || s.name ? 12 : 4), 'ink');
    let y = y0;
    if (sp.name || s.name) { ui.text(cx, y, sp.name || s.name, { color: sp.color, align: 'center' }); y += 10; }
    for (const l of lines) { ui.text(cx, y, l, { color: 'white', align: 'center', shadow: false }); y += 9; }
  }

  interactPrompt(ui, h, w) {
    if (h.dead) {
      return;
    }
    const list = usableObjects(w, h);
    const hostile = w.monsters.some((m) => !m.dead && (m.x - h.x) ** 2 + (m.z - h.z) ** 2 < RULES.hostileNear ** 2);
    const dead = w.heroes.find((o) => o.dead && !o.gone && o !== h && (o.x - h.x) ** 2 + (o.z - h.z) ** 2 < RULES.interactRange ** 2);
    if (dead) {
      const [sx, sy] = this.game.view.project(dead.x, 1.4, dead.z);
      ui.prompt('interact', `HOLD TO REVIVE ${dead.name}`, sx - 50, sy);
      return;
    }
    if (!list.length) return;
    const o = list[(h.useSel ?? 0) % list.length];
    const [sx, sy] = this.game.view.project(o.x, o.kind === 'rope' ? 1.4 : 1.8, o.z);
    const label = o.kind === 'rope' ? 'HOLD: RING THE BELL' : objectLabel(o);
    if (hostile && this.game.input.lastDevice === 'pad') ui.text(sx, sy - 10, 'HOLD', { color: 'mist', align: 'center' });
    const w2 = ui.measure(label) + 16;
    ui.prompt('interact', label, sx - w2 / 2, sy);
    if (list.length > 1 && this.game.input.lastDevice === 'pad') ui.prompt('cycle', 'NEXT', sx - 20, sy + 12);
  }

  tutorialPrompts(ui, h, w) {
    const t = this.tutorial;
    if (w.round) return;
    if ((h.moved ?? 0) > 2) t.moved = true;
    if (h.clipN > 0) t.attacked = true;
    if ((h.dodges ?? 0) > 0) t.dodged = true;
    if ((h.potions ?? 0) > 0) t.drank = true;
    if (w.areas.some((a) => a.kind === 'tele_ring' || a.kind === 'tele_line')) t.teleSeen = true;
    const cx = Math.floor(ui.w / 2);
    let y = Math.floor(ui.h * 0.62);
    const show = (action, label) => {
      const wd = ui.measure(label) + 16;
      ui.prompt(action, label, cx - wd / 2, y);
      y += 13;
    };
    const skillReady = h.skills.some((s, i) => !s && h.level >= RULES.slotLevels[i]) && CLASSES[h.cls].skills.some((id) => h.level >= SKILLS[id].level && !h.skills.some((s) => s?.id === id));
    if (!t.moved) show('move', 'MOVE');
    else if (!t.attacked && w.monsters.some((m) => !m.dead)) show('s0', 'ATTACK');
    else if (t.teleSeen && !t.dodged) show('dodge', 'ROLL THROUGH THE RED');
    else if (h.hp < h.stats.maxHp * 0.6 && !t.drank) show('potion', 'DRINK');
    if (skillReady) show('skills', 'ASSIGN YOUR NEW SKILL');
  }

  pick3(ui, h) {
    const W = ui.w;
    const opts = h.pick.opts;
    const x0 = Math.floor(W / 2 - 150), y = 54;
    ui.text(W / 2, y - 10, `PICK ONE  ${Math.ceil(h.pick.t)}`, { color: 'sand', align: 'center' });
    opts.forEach((o, i) => {
      const x = x0 + i * 102;
      ui.panel(x, y, 96, 40, { border: 'sand' });
      ui.textBlock(x + 4, y + 4, o.name, 88, { color: 'white' });
      const key = ['KEY Z', 'KEY X', 'KEY C'][i];
      ui.text(x + 4, y + 30, this.game.input.lastDevice === 'pad' ? ['LEFT', 'UP', 'RIGHT'][i] : key.slice(4), { color: 'mist' });
    });
  }
}

export const softLockOf = (w, h) => {
  let best = null, bs = -Infinity;
  for (const m of w.monsters) {
    if (m.dead || m.hidden) continue;
    const dx = m.x - h.x, dz = m.z - h.z, d = Math.hypot(dx, dz);
    if (d > 12) continue;
    const dot = (dx * h.dirX + dz * h.dirZ) / (d || 1);
    if (dot < 0.5 && d > 1.2) continue;
    const s = dot * 2 - d * 0.25;
    if (s > bs) { bs = s; best = m; }
  }
  return best;
};

const FLAME_A = ['...oo...', '..oyyo..', '.oyyyyo.', '.oyyyyo.', '.rooyoo.', '..oooo..', '...rr...', '...rr...', '........', '........'];
const FLAME_B = ['....o...', '...oo...', '..oyyo..', '.oyyyyo.', '.oyyyyo.', '.rooyoo.', '..oooo..', '...rr...', '........', '........'];
const BUFF_NAMES = { ardour: 'ARDOUR', haste: 'HASTE', ward: 'WARD', plenty: 'PLENTY', silence: 'SILENCE', danse: 'DANSE', last_peal: 'LAST PEAL', veil: 'UNSEEN' };

export { toWorld, itemCompare, itemIcon, currentQuest };
