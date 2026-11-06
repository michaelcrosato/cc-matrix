// The Hero screen: Gear, Skills, Stats, Devotion, Codex. One job per tab.
import { CLASSES, VOWS } from '../../data/classes.js';
import { BOSS_IDS, MONSTERS } from '../../data/monsters.js';
import { DEVOTION_TRACKS, RARITIES, SLOTS } from '../../data/items.js';
import { HOW_TO_PLAY, LORE, LORE_IDS } from '../../data/lore.js';
import { QUESTS } from '../../data/quests.js';
import { SKILLS } from '../../data/skills.js';
import { RULES } from '../../data/tuning.js';
import { toneUnlocked } from '../../sim/effects.js';
import { skillUnlocked, slotOpen } from '../../sim/hero.js';
import { isUpgrade } from '../../sim/loot.js';
import { currentQuest, currentStep } from '../../sim/quests.js';
import { dpsScore, recovery, toughness } from '../../sim/stats.js';
import { fmtNum } from '../../view/view.js';
import { SEAT_COLORS } from '../../view/actors.js';
import { icon } from '../icons.js';
import { cell, frame, invGrid, itemCard, matLine, Screen, tabs } from './base.js';

const TABS = ['GEAR', 'SKILLS', 'STATS', 'DEVOTION', 'CODEX'];

export class HeroScreen extends Screen {
  constructor(game, tab = 0) {
    super(game, { tag: 'hero' });
    this.tab = tab;
    this.compare = false;
    this.skills = { mode: 'slots', slot: 0, skill: null };
    this.codex = { tab: 0, page: 0 };
    this.statPage = 0;
  }

  back() {
    if (this.tab === 1 && this.skills.mode !== 'slots') { this.skills.mode = this.skills.mode === 'tones' ? 'skills' : 'slots'; this.game.audioSys?.sfx('ui_back'); return; }
    if (this.tab === 4 && this.codex.detail) { this.codex.detail = null; return; }
    this.game.closeScreen();
  }

  draw(ui) {
    const h = this.hero;
    if (!h) return;
    const color = this.game.humanCount() > 1 ? SEAT_COLORS[h.seat] : 'slate';
    frame(ui, '', { seatColor: color });
    this.tab = tabs(ui, 'herotab', TABS, this.tab, { first: ['inv:0', 'slot:0', null, 'dev:core:0', 'codex:0'] });
    [this.gear, this.skillsTab, this.stats, this.devotion, this.codexTab][this.tab].call(this, ui, h);
  }

  // GEAR ----------------------------------------------------------------------------------------
  gear(ui, h) {
    const size = 24;
    const px = 14, py = 30;
    let focusItem = null, equipped = false, focusSlot = null;
    const world = this.game.world;
    SLOTS.forEach((slot, i) => {
      const x = px + (i % 2) * size, y = py + Math.floor(i / 2) * size;
      const it = h.gear[slot] ?? null;
      const r = cell(ui, `gear:${slot}`, x, y, size, it, { ghost: slot });
      if (r.focused) { focusItem = it; equipped = true; focusSlot = slot; }
      if (r.activated && it) this.game.cmd({ c: 'unequip', slot });
    });
    const gx = px + 2 * size + 6;
    const res = invGrid(ui, 'inv', gx, py, 8, 5, size, h.inv, { badge: (it) => (it && it.uid === h.newest ? 'lime' : it && isUpgrade(h, it, world.account, world.tuning) ? 'lime' : null) });
    if (res.hover >= 0) { focusItem = h.inv[res.hover]; equipped = false; }
    if (res.act >= 0 && h.inv[res.act]) { this.game.cmd({ c: 'equip', uid: h.inv[res.act].uid }); ui.game.audioSys?.sfx('ui_equip'); }
    const input = this.game.input.menu;
    const hoverInv = res.hover >= 0 ? h.inv[res.hover] : null;
    const salvage = () => { if (this.game.world.camp?.flags?.forge || this.game.isSession) this.game.cmd({ c: 'salvage', uid: hoverInv.uid }); else this.game.cmd({ c: 'drop', uid: hoverInv.uid }); };
    if ((input.ctxA || res.alt >= 0) && hoverInv) salvage();
    if (input.ctxB) this.compare = !this.compare;
    const cx = gx + 8 * size + 6, cw = ui.w - cx - 12;
    const show = this.compare && hoverInv ? h.gear[hoverInv.slot] : focusItem;
    if (this.compare && hoverInv) ui.text(cx, py - 10, 'WORN NOW', { color: 'mist' });
    itemCard(ui, cx, py, cw, show, h, world, { equipped: equipped || (this.compare && !!hoverInv), empty: focusSlot ? `NOTHING WORN` : 'NOTHING HERE' });
    const fy = py + 5 * size + 6;
    ui.text(px, fy, `GOLD ${fmtNum(h.gold)}  ${matLine(h)}`, { color: 'sand' });
    const forge = this.game.world.camp?.flags?.forge || this.game.isSession;
    ui.footer([['confirm', equipped ? 'TAKE OFF' : 'EQUIP'], ['ctxA', forge ? 'SALVAGE' : 'DROP'], ['ctxB', 'COMPARE'], ['back', 'CLOSE']]);
  }

  // SKILLS --------------------------------------------------------------------------------------
  skillsTab(ui, h) {
    const st = this.skills;
    const y = 30, size = 30;
    const x0 = 14;
    // Six slots across the top.
    for (let i = 0; i < 6; i++) {
      const x = x0 + i * (size + 4);
      const open = slotOpen(h, i);
      const s = h.skills[i];
      const r = ui.widget(`slot:${i}`, x, y, size, size, { disabled: !open });
      const on = st.mode !== 'slots' && st.slot === i;
      ui.rect(x, y, size, size, on ? 'sand' : r.focused ? 'white' : 'slate');
      ui.rect(x + 1, y + 1, size - 2, size - 2, r.focused ? 'plum' : 'ink');
      if (s) { const ic = icon(SKILLS[s.id].icon); ui.sprite(x + 3, y + 3, ic.rows, ic.colors, { scale: 2 }); }
      else if (!open) { const l = icon('lock'); ui.sprite(x + 9, y + 9, l.rows, l.colors); ui.text(x + 15, y + size - 9, RULES.slotLevels[i], { color: 'slate', align: 'center' }); }
      ui.glyph(['s0', 's1', 's2', 's3', 's4', 's5'][i], x + size - 12, y + size - 12);
      if (r.focused && st.mode === 'slots') this.focusSlot = i;
      if (r.activated && open) { st.slot = i; st.mode = 'skills'; ui.preferFocus = `skill:${s?.id ?? CLASSES[h.cls].skills[0]}`; }
    }
    // The two vows.
    const vx = x0 + 6 * (size + 4) + 8;
    ui.text(vx, y - 2, 'VOWS', { color: 'mist' });
    for (let i = 0; i < 2; i++) {
      const lv = RULES.vowLevels[i];
      const open = h.level >= lv;
      const v = VOWS[h.cls].find((q) => q.id === h.vows[i]);
      if (ui.button(`vow:${i}`, vx, y + 8 + i * 13, ui.w - vx - 14, 12, v ? v.name : open ? 'SWEAR A VOW' : `LEVEL ${lv}`, { disabled: !open, left: true })) { st.mode = 'vows'; st.vow = i; ui.preferFocus = `vowpick:${VOWS[h.cls][0].id}`; }
    }
    const ly = y + size + 8;
    if (st.mode === 'slots') {
      const i = this.focusSlot ?? 0;
      const s = h.skills[i];
      if (s) {
        const sk = SKILLS[s.id];
        ui.text(x0, ly, sk.name, { color: 'sand', scale: 2 });
        ui.textBlock(x0, ly + 18, sk.desc, ui.w - 28, { color: 'white' });
        const tone = s.tone ? sk.tones[s.tone] : null;
        if (tone) { ui.text(x0, ly + 42, `TONE: ${tone.name}`, { color: 'lime' }); ui.textBlock(x0, ly + 52, tone.desc, ui.w - 28, { color: 'mist' }); }
        else ui.text(x0, ly + 42, 'NO TONE CHOSEN', { color: 'slate' });
        if (sk.cost) ui.text(ui.w - 14, ly, `COST ${sk.cost}`, { color: 'mist', align: 'right' });
        if (sk.cd) ui.text(ui.w - 14, ly + 10, `COOLDOWN ${sk.cd} S`, { color: 'mist', align: 'right' });
      } else ui.text(x0, ly, slotOpen(h, i) ? 'CHOOSE A SKILL FOR THIS SLOT' : `THIS SLOT OPENS AT LEVEL ${RULES.slotLevels[i]}`, { color: 'mist' });
      ui.footer([['confirm', 'CHANGE'], ['back', 'CLOSE']]);
    } else if (st.mode === 'skills') {
      ui.text(x0, ly, `CHOOSE A SKILL FOR SLOT ${st.slot + 1}`, { color: 'mist' });
      const list = CLASSES[h.cls].skills;
      const cw = Math.floor((ui.w - 28 - 6) / 4), ch = 42;
      let fdesc = null;
      list.forEach((id, i) => {
        const x = x0 + (i % 4) * (cw + 2), yy = ly + 12 + Math.floor(i / 4) * (ch + 2);
        const sk = SKILLS[id];
        const open = skillUnlocked(h, id);
        const r = ui.widget(`skill:${id}`, x, yy, cw, ch, { disabled: !open });
        ui.rect(x, yy, cw, ch, r.focused ? 'white' : open ? 'slate' : 'night');
        ui.rect(x + 1, yy + 1, cw - 2, ch - 2, r.focused ? 'plum' : 'ink');
        const ic = icon(sk.icon);
        ui.sprite(x + 3, yy + 3, ic.rows, ic.colors);
        const nameLines = ui.wrap(sk.name, cw - 6).slice(0, 2);
        nameLines.forEach((l, n) => ui.text(x + 3, yy + 18 + n * 9, l, { color: open ? 'white' : 'slate' }));
        if (!open) ui.text(x + cw - 3, yy + 4, `LV ${sk.level}`, { color: 'slate', align: 'right' });
        if (h.skills.some((q) => q?.id === id)) ui.rect(x + cw - 6, yy + ch - 6, 3, 3, 'lime');
        if (r.focused) fdesc = sk;
        if (r.activated) {
          this.game.cmd({ c: 'skill', slot: st.slot, id });
          ui.game.audioSys?.sfx('ui_equip');
          st.skill = id;
          st.mode = 'tones';
          ui.preferFocus = `tone:${Object.keys(sk.tones)[0]}`;
        }
      });
      if (fdesc) ui.textBlock(x0, ly + 12 + 2 * (ch + 2) + 2, fdesc.desc, ui.w - 28, { color: 'mist' });
      ui.footer([['confirm', 'ASSIGN'], ['back', 'BACK']]);
    } else if (st.mode === 'tones') {
      const sk = SKILLS[st.skill];
      ui.text(x0, ly, `${sk.name}: CHOOSE A TONE`, { color: 'sand' });
      const ids = Object.keys(sk.tones);
      const cw = Math.floor((ui.w - 28 - 4) / 3), ch = 74;
      const cur = h.skills.find((q) => q?.id === st.skill)?.tone;
      ids.forEach((tid, i) => {
        const x = x0 + i * (cw + 2), yy = ly + 12;
        const t = sk.tones[tid];
        const open = toneUnlocked(h, st.skill, tid);
        const r = ui.widget(`tone:${tid}`, x, yy, cw, ch, { disabled: !open });
        ui.rect(x, yy, cw, ch, r.focused ? 'white' : cur === tid ? 'lime' : open ? 'slate' : 'night');
        ui.rect(x + 1, yy + 1, cw - 2, ch - 2, r.focused ? 'plum' : 'ink');
        ui.text(x + 4, yy + 4, t.name, { color: open ? 'sand' : 'slate' });
        ui.textBlock(x + 4, yy + 15, t.desc, cw - 8, { color: open ? 'white' : 'slate', lineH: 9 });
        if (!open) ui.text(x + 4, yy + ch - 10, `LEVEL ${Math.min(30, sk.level + RULES.toneLevels[i])}`, { color: 'slate' });
        if (r.activated) { this.game.cmd({ c: 'tone', id: st.skill, tone: cur === tid ? null : tid }); ui.game.audioSys?.sfx('ui_equip'); st.mode = 'slots'; ui.preferFocus = `slot:${st.slot}`; }
      });
      ui.footer([['confirm', 'CHOOSE'], ['back', 'BACK']]);
    } else if (st.mode === 'vows') {
      ui.text(x0, ly, 'SWEAR A VOW. YOU MAY UNSWEAR IT. NOBODY IS WATCHING.', { color: 'mist' });
      const list = VOWS[h.cls];
      list.forEach((v, i) => {
        const yy = ly + 12 + i * 22;
        const r = ui.widget(`vowpick:${v.id}`, x0, yy, ui.w - 28, 20);
        const taken = h.vows.includes(v.id);
        ui.rect(x0, yy, ui.w - 28, 20, r.focused ? 'white' : taken ? 'lime' : 'slate');
        ui.rect(x0 + 1, yy + 1, ui.w - 30, 18, r.focused ? 'plum' : 'ink');
        ui.text(x0 + 5, yy + 2, v.name, { color: 'sand' });
        ui.text(x0 + 5, yy + 11, v.desc, { color: 'white' });
        if (r.activated) { this.game.cmd({ c: 'vow', index: st.vow, id: taken ? null : v.id }); ui.game.audioSys?.sfx('ui_equip'); st.mode = 'slots'; }
      });
      ui.footer([['confirm', 'SWEAR'], ['back', 'BACK']]);
    }
  }

  // STATS ---------------------------------------------------------------------------------------
  stats(ui, h) {
    const st = h.stats;
    const x = 14, y = 34;
    const col = Math.floor((ui.w - 28) / 3);
    const big = [['DAMAGE', fmtNum(Math.round(dpsScore(st))), 'orange'], ['TOUGHNESS', fmtNum(Math.round(toughness(st, h.level))), 'sky'], ['RECOVERY', fmtNum(Math.round(recovery(st))), 'lime']];
    big.forEach(([label, value, c], i) => {
      ui.text(x + i * col, y, label, { color: 'mist' });
      ui.text(x + i * col, y + 11, value, { color: c, scale: 3 });
    });
    const rows = [
      ['POWER', Math.round(st.power)], ['VITALITY', Math.round(st.vit)], ['LIFE', st.maxHp], ['ARMOUR', st.armorTotal], ['WEAPON DAMAGE', st.weaponDps],
      ['CRIT CHANCE', `${Math.round(st.crit * 100)}%`], ['CRIT DAMAGE', `+${Math.round((0.5 + st.critdmg) * 100)}%`], ['ATTACK SPEED', `+${Math.round(st.atkspd * 100)}%`],
      ['COOLDOWN REDUCTION', `${Math.round(st.cdr * 100)}%`], ['COST REDUCTION', `${Math.round(st.costred * 100)}%`], ['LIFE PER HIT', Math.round(st.lifehit)], ['LIFE REGEN', Math.round(st.regen)],
      ['MOVE SPEED', `${st.moveSpeed.toFixed(1)} M/S`], ['AREA DAMAGE', `${Math.round(st.area * 100)}%`], ['SOUND DAMAGE', `${Math.round(st.sound * 100)}%`], ['FLAME DAMAGE', `${Math.round(st.flame * 100)}%`], ['GRAVE DAMAGE', `${Math.round(st.grave * 100)}%`],
      ['MAX RESOURCE', st.maxResTotal], ['GOLD FIND', `${Math.round(st.gold * 100)}%`], ['MAGIC FIND', `${Math.round(st.magic * 100)}%`], ['PICK-UP RADIUS', `${st.pickupR.toFixed(1)} M`], ['THORNS', Math.round(st.thorns)],
      ['KILLS', h.kills ?? 0], ['DEATHS', h.deaths ?? 0],
    ];
    const per = 6;
    const pages = Math.ceil(rows.length / per);
    const input = this.game.input.menu;
    if (input.down || input.ctxB || input.wheel > 0) this.statPage = (this.statPage + 1) % pages;
    if (input.up || input.wheel < 0) this.statPage = (this.statPage - 1 + pages) % pages;
    const ly = y + 42;
    rows.slice(this.statPage * per, this.statPage * per + per).forEach(([k, v], i) => {
      ui.text(x, ly + i * 11, k, { color: 'mist' });
      ui.text(x + 170, ly + i * 11, v, { color: 'white' });
    });
    ui.text(ui.w - 14, ly + per * 11 + 2, `${this.statPage + 1}/${pages}`, { color: 'slate', align: 'right' });
    ui.footer([['ctxB', 'NEXT PAGE'], ['back', 'CLOSE']]);
  }

  // DEVOTION ------------------------------------------------------------------------------------
  devotion(ui, h) {
    const d = this.game.world.account.devotion;
    const x = 14;
    ui.text(x, 32, h.level >= RULES.levelCap ? `DEVOTION ${d.level}` : `DEVOTION OPENS AT LEVEL ${RULES.levelCap}`, { color: 'sand', scale: 2 });
    ui.text(ui.w - 14, 36, `POINTS ${d.points}`, { color: d.points ? 'lime' : 'mist', align: 'right' });
    const need = RULES.devotionLevelBase + RULES.devotionLevelStep * d.level;
    ui.rect(x, 50, ui.w - 28, 4, 'night');
    ui.rect(x, 50, (ui.w - 28) * Math.min(1, d.xp / need), 4, 'sky');
    const tracks = Object.keys(DEVOTION_TRACKS);
    const barH = 32;
    tracks.forEach((tid, i) => {
      const t = DEVOTION_TRACKS[tid];
      const yy = 60 + i * (barH + 2);
      const spent = d.spent[tid] ?? [0, 0, 0, 0];
      const total = spent.reduce((a, b) => a + b, 0);
      ui.text(x, yy, `${t.name} ${total}`, { color: t.color });
      const cw = Math.floor((ui.w - 28 - 6) / 4);
      t.stats.forEach(([, label], s) => {
        const sx = x + s * (cw + 2);
        const can = d.points > 0;
        const r = ui.widget(`dev:${tid}:${s}`, sx, yy + 9, cw, 22, { disabled: !can });
        ui.rect(sx, yy + 9, cw, 22, r.focused ? 'white' : 'slate');
        ui.rect(sx + 1, yy + 10, cw - 2, 20, r.focused ? 'plum' : 'ink');
        ui.rect(sx + 1, yy + 26, Math.min(cw - 2, spent[s] * 3), 4, t.color);
        ui.text(sx + 3, yy + 11, label.slice(0, Math.floor((cw - 6) / 6)), { color: 'white' });
        ui.text(sx + cw - 3, yy + 19, spent[s], { color: t.color, align: 'right' });
        if (r.activated) { this.game.cmd({ c: 'devotion', track: tid, stat: s }); ui.game.audioSys?.sfx('ui_equip'); }
      });
    });
    if (this.game.input.menu.ctxA) this.game.cmd({ c: 'devotion_reset' });
    ui.footer([['confirm', 'SPEND'], ['ctxA', 'RESET ALL'], ['back', 'CLOSE']]);
  }

  // CODEX ---------------------------------------------------------------------------------------
  codexTab(ui, h) {
    const st = this.codex;
    const sub = ['QUEST', 'HOW TO PLAY', 'LORE', 'BESTIARY'];
    let x = 14;
    sub.forEach((label, i) => {
      const w = ui.measure(label) + 8;
      if (ui.button(`codex:${i}`, x, 28, w, 13, label, { color: st.tab === i ? 'sand' : 'mist' })) { st.tab = i; st.page = 0; st.detail = null; }
      x += w + 2;
    });
    const y = 46;
    const camp = this.game.world.camp;
    if (st.tab === 0) {
      const q = camp ? currentQuest(this.game.world) : null;
      if (q) {
        ui.text(14, y, q.name, { color: 'sand', scale: 2 });
        const step = currentStep(this.game.world);
        ui.textBlock(14, y + 20, step.text, ui.w - 28, { color: 'white' });
        q.steps.forEach((s, i) => {
          if (i >= camp.q.s) return;
          ui.text(14, y + 44 + i * 10, s.text.slice(0, Math.floor((ui.w - 28) / 6)), { color: 'slate' });
        });
      } else {
        ui.text(14, y, this.game.isSession ? 'FILL THE KNELL. SLAY ITS WARDEN.' : 'THE STORY IS DONE. THE KNELL FONT IS NOT.', { color: 'sand' });
      }
      const wr = camp?.writs ?? [];
      if (wr.length) wr.forEach((w, i) => ui.text(14, ui.h - 52 + i * 10, `${w.done ? 'DONE: ' : ''}${w.text}${w.k === 'kill' && !w.done ? ` ${w.have}/${w.n}` : ''}`.slice(0, Math.floor((ui.w - 28) / 6)), { color: w.done ? 'lime' : 'mist' }));
    } else if (st.tab === 1) {
      const p = HOW_TO_PLAY[st.page];
      ui.text(14, y, p.title, { color: 'sand', scale: 2 });
      let ly = y + 20;
      for (const line of p.lines) ly += ui.textBlock(14, ly, line, ui.w - 28, { color: 'white' }) + 3;
      ui.text(ui.w - 14, ui.h - 28, `${st.page + 1}/${HOW_TO_PLAY.length}`, { color: 'slate', align: 'right' });
      const input = this.game.input.menu;
      if (input.down || input.ctxB || input.wheel > 0) st.page = (st.page + 1) % HOW_TO_PLAY.length;
      if (input.up || input.wheel < 0) st.page = (st.page - 1 + HOW_TO_PLAY.length) % HOW_TO_PLAY.length;
    } else if (st.tab === 2) {
      if (st.detail) {
        const l = LORE[st.detail];
        ui.text(14, y, l.title, { color: 'sand', scale: 2 });
        let ly = y + 20;
        for (const pg of l.pages) ly += ui.textBlock(14, ly, pg, ui.w - 28, { color: 'white' }) + 6;
      } else {
        const lore = camp?.lore ?? {};
        LORE_IDS.forEach((id, i) => {
          const have = lore[id];
          const cw = Math.floor((ui.w - 30) / 2);
          const xx = 14 + (i % 2) * (cw + 2), yy = y + Math.floor(i / 2) * 14;
          if (ui.button(`lore:${id}`, xx, yy, cw, 13, have ? LORE[id].title : '?', { disabled: !have, left: true, color: have ? 'white' : 'slate' })) { st.detail = id; }
        });
      }
    } else {
      const best = camp?.bestiary ?? {};
      const ids = Object.keys(MONSTERS).filter((k) => !['pallbearer', 'coffin_bearer', 'lamp_post', 'iron_bell', 'decoy'].includes(k));
      const per = 16, pages = Math.ceil(ids.length / per);
      const input = this.game.input.menu;
      if (input.ctxB || input.wheel > 0) st.page = (st.page + 1) % pages;
      if (input.wheel < 0) st.page = (st.page - 1 + pages) % pages;
      ids.slice(st.page * per, st.page * per + per).forEach((id, i) => {
        const have = best[id];
        const cw = Math.floor((ui.w - 30) / 2);
        const xx = 14 + (i % 2) * (cw + 2), yy = y + Math.floor(i / 2) * 11;
        ui.text(xx, yy, have ? MONSTERS[id].name : '?', { color: have ? (BOSS_IDS.includes(id) ? 'red' : 'white') : 'slate' });
      });
      ui.text(ui.w - 14, ui.h - 28, `${st.page + 1}/${pages}`, { color: 'slate', align: 'right' });
    }
    ui.footer(st.tab === 1 || st.tab === 3 ? [['ctxB', 'NEXT PAGE'], ['back', 'CLOSE']] : [['back', st.detail ? 'BACK' : 'CLOSE']]);
  }
}

export { QUESTS, RARITIES };
