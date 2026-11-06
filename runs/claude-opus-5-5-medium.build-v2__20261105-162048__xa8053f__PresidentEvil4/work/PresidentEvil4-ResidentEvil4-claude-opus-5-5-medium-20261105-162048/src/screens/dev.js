// Dev mode: tools, teleport, spawn, live balance sliders. Same pixel UI.
import { TUNING, TUNING_DEFS, TUNING_DEFAULT, resetTuning } from '../data/tuning.js';
import { SPAWNABLE, ENEMIES } from '../data/enemies.js';
import { TELEPORTS } from '../data/levels/areas.js';
import { ITEMS } from '../data/items.js';
import { save } from '../core/save.js';
import { addItem } from '../core/run.js';
export class DevScreen {
  constructor(A) { this.A = A; this.s = { tab: 0, focus: 0 }; this.page = 0; this.done = false; if (!A.app.devUsed) { A.app.devUsed = true; Object.assign(TUNING, save.get('tuning', {})); } }
  update(ui) {
    ui.rect(0, 0, ui.W, ui.H, 'ink'); const tab = ui.tabs(this.s, ['TOOLS', 'TELEPORT', 'SPAWN', 'BALANCE'], 10); [this.tools, this.teleport, this.spawn, this.balance][tab].call(this, ui); if (ui.back) { ui.sound('uiback'); this.done = true; }
  }
  tools(ui) {
    const A = this.A, P = A.player, e = A.ctx.engine; const on = (b) => (b ? 'ON' : 'OFF');
    const rows = [
      { label: 'GOD MODE', value: on(P.god), f: () => { P.god = !P.god; } }, { label: 'NO-CLIP', value: on(P.noclip), f: () => { P.noclip = !P.noclip; } }, { label: 'INFINITE AMMO', value: on(A.infiniteAmmo), f: () => { A.infiniteAmmo = !A.infiniteAmmo; } }, { label: 'ONE-HIT KILLS', value: on(A.oneHit), f: () => { A.oneHit = !A.oneHit; } }, { label: 'FREEZE AI', value: on(A.frozenAI), f: () => { A.frozenAI = !A.frozenAI; } },
      { label: 'SHOW HIT ZONES', value: on(A.showZones), f: () => { A.app.dev.toggleZones(A); } }, { label: 'SHOW NAV AND FLOW', value: on(A.showNav), f: () => { A.app.dev.toggleNav(A); } }, { label: 'SHOW TRIGGERS', value: on(A.showTriggers), f: () => { A.app.dev.toggleTriggers(A); } },
      { label: 'GAME SPEED', value: `${A.savedScale ?? 1}`, f: () => { const L = [0.25, 0.5, 1, 2], k = L.indexOf(A.savedScale ?? 1); A.savedScale = L[(k + 1) % 4]; } },
      { label: 'SKIP CUTSCENE', f: () => { A.cutscene?.skip(); if (A.dialog.active) A.dialog.skip(); } }, { label: 'HEAL', f: () => { A.run.health = A.run.maxHealth; if (A.dame) A.dame.hp = A.dame.maxHp; } }, { label: 'GIVE 10,000 DOUBLOONS', f: () => { A.run.money += 10000; } },
      { label: 'GIVE ALL WEAPONS AND ITEMS', f: () => { A.run.grid = { w: 14, h: 8 }; for (const id of Object.keys(ITEMS)) { const d = ITEMS[id]; if (d.kind === 'weapon' && !A.run.items.some((i) => i.id === id)) addItem(A.run, id); else if (d.kind === 'treasure' || d.kind === 'key') addItem(A.run, id); else if (d.kind === 'ammo') addItem(A.run, id, d.max); } } },
      { label: 'FILL CASE', f: () => { let g = 0; while (g++ < 200 && addItem(A.run, 'samphire') === 0); } }, { label: 'KILL ALL', f: () => { for (const x of [...A.enemies]) if (!x.dead) x.die({}); } }, { label: 'UNLOCK ALL', f: () => { for (const d of A.level.doors) A.level.openDoor(d, null, true); for (const k in A.level.gates) { const g = A.level.gates[k]; if (g.q) A.level.openGate(g); } } },
      { label: 'ENGINE DEBUG PANEL', value: on(e.debugShown), f: () => { e.showDebug?.(!e.debugShown); } },
    ];
    const i = ui.list(this.s, rows, { x: 40, y: 34, w: 300, rowH: 15, max: 12 }); if (i >= 0) rows[i].f();
    ui.text(350, 40, `RANK ${A.rank()}`, { color: 'sand' }); ui.text(350, 52, `ALIVE ${A.enemies.filter((x) => !x.dead).length}`, { color: 'sand' }); ui.text(350, 64, `TOKENS ${A.tokensHeld}/${A.maxTokens()}`, { color: 'sand' }); ui.prompts([['confirm', 'TOGGLE'], ['back', 'BACK']]);
  }
  teleport(ui) {
    const rows = TELEPORTS.map((t) => ({ label: t.label })); const i = ui.list(this.s, rows, { x: 60, y: 34, w: 300, rowH: 15, max: 13 }); ui.prompts([['confirm', 'GO'], ['back', 'BACK']]); if (i >= 0) { const A = this.A, t = TELEPORTS[i]; A.menu = null; A.ctx.engine.timeScale = 1; A.app.teleport(t); }
  }
  spawn(ui) {
    const rows = SPAWNABLE.map((t) => ({ label: ENEMIES[t].name })); const i = ui.list(this.s, rows, { x: 60, y: 34, w: 300, rowH: 15, max: 13 }); ui.prompts([['confirm', 'SPAWN AT THE LASER DOT'], ['back', 'BACK']]);
    if (i >= 0) { const A = this.A, P = A.player; const at = P.dotOn ? P.dot : { x: P.pos.x + Math.sin(P.camYaw) * 5, z: P.pos.z + Math.cos(P.camYaw) * 5 }; A.spawnEnemy(SPAWNABLE[i], at.x, at.z, { floor: P.floor }); }
  }
  balance(ui) {
    const keys = Object.keys(TUNING_DEFS), perPage = 8, pages = Math.ceil(keys.length / perPage); const start = this.page * perPage, list = keys.slice(start, start + perPage); const rows = list.map((k) => ({ label: k.replace(/([A-Z])/g, ' $1').toUpperCase() })); rows.push({ label: 'RESET ALL' });
    const x = Math.round(ui.W / 2 - 200), y = 34; const i = ui.list(this.s, rows, { x, y, w: 400, rowH: 21, noConfirm: true });
    list.forEach((k, n) => { const [def, min, max] = TUNING_DEFS[k], ry = y + n * 21 + 4; const nv = ui.slider(x + 180, ry, 100, TUNING[k], min, max, { def }); if (nv !== TUNING[k]) { TUNING[k] = nv; this.persist(); } ui.text(x + 290, ry, TUNING[k].toFixed(2), { color: 'white' }); ui.text(x + 330, ry, `DEF ${def}`, { color: 'slate' }); if (this.s.focus === n) { const st = (max - min) / 40; if (ui.nav.left) { TUNING[k] = Math.max(min, TUNING[k] - st); this.persist(); ui.sound('uimove'); } if (ui.nav.right) { TUNING[k] = Math.min(max, TUNING[k] + st); this.persist(); ui.sound('uimove'); } if (ui.tertiary) { TUNING[k] = TUNING_DEFAULT[k]; this.persist(); ui.sound('uiback'); } } });
    if (ui.confirm && this.s.focus === list.length) { resetTuning(); this.persist(); ui.sound('uiconfirm'); }
    if (ui.click && ui.within(x, y + list.length * 21 - 2, 200, 18, ui.cx, ui.cy)) { resetTuning(); this.persist(); }
    if (ui.secondary) { this.page = (this.page + 1) % pages; this.s.focus = 0; ui.sound('uimove'); }
    ui.text(x, ui.H - 32, `PAGE ${this.page + 1}/${pages}`, { color: 'slate' }); ui.prompts([['left', 'ADJUST'], ['tertiary', 'RESET ONE'], ['secondary', 'NEXT PAGE'], ['back', 'BACK']]);
  }
  persist() { save.set('tuning', { ...TUNING }); }
}
