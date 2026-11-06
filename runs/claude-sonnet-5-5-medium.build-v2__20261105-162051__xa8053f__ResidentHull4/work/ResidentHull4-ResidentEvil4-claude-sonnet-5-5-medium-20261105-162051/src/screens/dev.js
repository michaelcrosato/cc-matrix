// Dev mode, reachable from the pause menu: tools, teleport, spawn, and live balance sliders with reset.
import { app } from '../core/app.js';
import { ui } from '../core/ui.js';
import { TUNING, DEFAULTS, SLIDERS, resetTuning } from '../data/tuning.js';
import { ENEMIES } from '../data/enemies.js';
import { WEAPON_ORDER } from '../data/weapons.js';
import { ITEMS } from '../data/items.js';
import { saveKey } from '../core/store.js';
import { LEVELS, BEATS } from '../data/levels/index.js';

const TABS = ['TOOLS', 'TELEPORT', 'SPAWN', 'BALANCE'];
export class DevScreen {
  constructor() { this.tab = 0; this.st = [{ i: 0 }, { i: 0 }, { i: 0 }, { i: 0 }]; this.msg = ''; }
  enter() { app.devMode = true; }
  tools(host) {
    const d = app.dev, run = app.run, a = host;
    const speeds = [0.25, 0.5, 1, 2];
    return [
      { label: 'GOD MODE', value: d.god ? 'ON' : 'OFF', run: () => (d.god = !d.god) },
      { label: 'NO-CLIP', value: d.noclip ? 'ON' : 'OFF', run: () => (d.noclip = !d.noclip) },
      { label: 'INFINITE AMMO', value: d.ammo ? 'ON' : 'OFF', run: () => (d.ammo = !d.ammo) },
      { label: 'ONE-HIT KILLS', value: d.oneHit ? 'ON' : 'OFF', run: () => { d.oneHit = !d.oneHit; a.oneHit = d.oneHit; } },
      { label: 'FREEZE AI', value: d.freeze ? 'ON' : 'OFF', run: () => (d.freeze = !d.freeze) },
      { label: 'SHOW HIT ZONES', value: d.zones ? 'ON' : 'OFF', run: () => (d.zones = !d.zones) },
      { label: 'SHOW NAV', value: d.nav ? 'ON' : 'OFF', run: () => (d.nav = !d.nav) },
      { label: 'SHOW MARKERS', value: d.triggers ? 'ON' : 'OFF', run: () => (d.triggers = !d.triggers) },
      { label: 'GAME SPEED', value: d.speed + 'X', run: () => { d.speed = speeds[(speeds.indexOf(d.speed) + 1) % 4]; } },
      { label: 'SKIP CUTSCENE', value: '', run: () => a.scripts?.cut?.tl.skip() },
      { label: 'HEAL', value: '', run: () => { run.hp = run.maxHp; if (a.dame) a.dame.hp = a.dame.maxHp; } },
      { label: 'GIVE 10000 DOUBLOONS', value: '', run: () => (run.doubloons += 10000) },
      { label: 'GIVE ALL WEAPONS AND ITEMS', value: '', run: () => { for (const w of WEAPON_ORDER) run.addWeapon(w); for (const id of Object.keys(ITEMS)) if (!ITEMS[id].noShop) run.addItem(id, ITEMS[id].stack ? ITEMS[id].stack : 2); } },
      { label: 'FILL CASE WITH AMMO', value: '', run: () => { for (const w of run.weapons()) { run.addItem(({ pistol: 'ammo_pistol', scatter: 'ammo_shells', rifle: 'ammo_rifle', harpoon: 'ammo_bolts' })[w], 99); run.reload(w); } } },
      { label: 'KILL ALL', value: '', run: () => { for (const e of a.enemies) if (!e.dead) e.die({ source: 'dev' }); } },
      { label: 'UNLOCK ALL DOORS', value: '', run: () => { for (const dr of a.level?.doors || []) a.openDoor(dr); } },
      { label: 'ENGINE DEBUG PANEL', value: '', run: () => app.engine.showDebug(!app.engine.debugShown) },
      { label: 'RANK', value: a.rank?.toFixed(1) ?? '-', run: () => {} },
      { label: 'ENEMIES ALIVE', value: String(a.aliveEnemies?.().length ?? 0), run: () => {} },
    ];
  }
  teleports(host) {
    const rows = [];
    for (const lv of LEVELS) rows.push({ label: lv.name, value: 'AREA', run: () => this.go(lv, null) });
    for (const b of BEATS) rows.push({ label: b.label, value: 'BEAT', run: () => this.go(b.level, b) });
    return rows;
  }
  go(level, beat) { app.pop(); app.devGo?.(level, beat); }
  spawns(host) { return Object.values(ENEMIES).map((e) => ({ label: e.name, value: e.hp + ' HP', run: () => this.spawn(host, e.id) })); }
  spawn(host, type) {
    const a = host; if (!a.player) return;
    const hit = a.aimHit?.point; const p = a.player;
    const x = hit && Math.hypot(hit.x - p.x, hit.z - p.z) < 40 ? hit.x : p.x + Math.sin(p.yaw) * 6, z = hit && Math.hypot(hit.x - p.x, hit.z - p.z) < 40 ? hit.z : p.z + Math.cos(p.yaw) * 6;
    const [c, r] = a.level.cellOf(x, z);
    const ok = a.level.nav.isOpen(c, r);
    a.spawn(type, ok ? x : p.x + Math.sin(p.yaw) * 3, ok ? z : p.z + Math.cos(p.yaw) * 3, { state: 'APPROACH' });
    this.msg = type.toUpperCase() + ' SPAWNED';
  }
  frame(host) {
    const nav = ui.nav, W = ui.W, H = ui.H, ctx = host.ctx || app.engine.context;
    ui.rect(0, 0, W, H, 'ink');
    ui.text(10, 6, 'DEV MODE', { scale: 2, color: 'orange' });
    const c = ui.tabs(10, 26, TABS, this.tab); if (c >= 0) this.tab = c;
    if (nav.prev) this.tab = (this.tab + 3) % 4; if (nav.next) this.tab = (this.tab + 1) % 4;
    const st = this.st[this.tab];
    if (this.tab === 3) this.balance(st, ctx);
    else {
      const rows = this.tab === 0 ? this.tools(host) : this.tab === 1 ? this.teleports(host) : this.spawns(host);
      const per = 11; st.i = Math.max(0, Math.min(rows.length - 1, st.i)); const top = Math.max(0, Math.min(rows.length - per, st.i - 5));
      const lst = { i: st.i - top };
      const r = ui.list(10, 44, W - 20, rows.slice(top, top + per).map((x) => ({ label: x.label, value: x.value })), lst, { rowH: 15 });
      st.i = lst.i + top;
      if (r.ok >= 0) { const row = rows[top + r.ok]; row.run(); ctx.audio.play('uiOk'); if (this.tab === 0) { this.save(); } }
      ui.text(W - 10, 8, rows.length > per ? `${st.i + 1}/${rows.length}` : '', { align: 'right', color: 'slate' });
    }
    if (this.msg) ui.text(W / 2, H - 24, this.msg, { align: 'center', color: 'sand' });
    if (nav.back) { this.save(); app.pop(); }
    ui.prompts([['confirm', 'DO IT'], ['prev', 'TAB'], ['third', 'RESET ONE'], ['back', 'BACK']]);
  }
  balance(st, ctx) {
    const nav = ui.nav, W = ui.W;
    const rows = SLIDERS.map(([k, label]) => ({ label, k }));
    rows.push({ label: 'RESET ALL', k: null });
    const per = 8, page = Math.floor(st.i / per), start = page * per;
    const shown = rows.slice(start, start + per);
    const lst = { i: st.i - start };
    const r = ui.list(10, 44, W - 20, shown.map((x) => ({ label: x.label, value: '' })), lst, { rowH: 20 });
    st.i = lst.i + start;
    shown.forEach((row, i) => {
      if (!row.k) return;
      const [k, , min, max, step] = SLIDERS.find((s) => s[0] === row.k);
      const y = 44 + i * 20 + 6, x = W - 10 - 100;
      const s = ui.slider(x, y, 100, TUNING[k], min, max, step, st.i === start + i, DEFAULTS[k]);
      ui.text(x - 8, y, fmt(TUNING[k]) + '  (' + fmt(DEFAULTS[k]) + ')', { align: 'right', color: TUNING[k] === DEFAULTS[k] ? 'mist' : 'orange' });
      if (s.out !== null && s.out !== TUNING[k]) { st.i = start + i; TUNING[k] = clampRound(s.out, min, max, step); }
    });
    const sel = rows[st.i];
    if (sel?.k) {
      const [k, , min, max, step] = SLIDERS.find((s) => s[0] === sel.k);
      if (nav.left) TUNING[k] = clampRound(TUNING[k] - step, min, max, step); if (nav.right) TUNING[k] = clampRound(TUNING[k] + step, min, max, step);
      if (nav.third) { resetTuning(k); ctx.audio.play('uiBack'); }
    } else if (sel && r.ok >= 0) { resetTuning(); ctx.audio.play('uiOk'); this.msg = 'ALL VALUES RESET'; }
    ui.text(W - 10, 8, `PAGE ${page + 1}/${Math.ceil(rows.length / per)}`, { align: 'right', color: 'slate' });
  }
  save() { saveKey('dev', { ...TUNING }); }
}
const fmt = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(2));
const clampRound = (v, min, max, step) => Math.max(min, Math.min(max, Math.round(v / step) * step));
