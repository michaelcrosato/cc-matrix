// Dev mode: TOOLS, TELEPORT, SPAWN, BALANCE. Same pixel UI, pad, mouse and keyboard.
import { app, goto } from '../core/app.js';
import { TUNING, TUNING_DEFAULTS, TUNING_SPEC, resetTuning } from '../data/tuning.js';
import { ENEMY_IDS, ENEMIES } from '../data/enemies.js';
import { WEAPON_ORDER } from '../data/weapons.js';
import { ITEMS } from '../data/items.js';
import { DEV_TELEPORTS } from '../data/levels/teleports.js';
import { loadDevTuning, saveDevTuning } from '../core/save.js';

const TABS = ['TOOLS', 'TELEPORT', 'SPAWN', 'BALANCE'];
const PER_PAGE = 8;
const fmt = (v, step) => (step >= 1 ? String(Math.round(v)) : step >= 0.05 ? v.toFixed(2) : v.toFixed(4));

export function openDev(area) {
  // Saved separately from settings, and only in play once dev mode has been opened.
  if (!app.devTuningLoaded) {
    app.devTuningLoaded = true;
    const saved = loadDevTuning();
    if (saved) for (const [k] of TUNING_SPEC) if (saved[k] !== undefined) TUNING[k] = saved[k];
  }
  let tab = 0;
  let page = 0;
  let teleportPage = 0;
  const screen = {
    frozen: true,
    name: 'dev',
    setTab: (n) => { tab = n; },
    tab: () => tab,
    update(ctx, ui) {
      const { hud, W, H } = ui;
      ctx.hud.clear();
      hud.rect(0, 0, W, H, 'ink');
      ui.text(12, 7, 'DEV MODE', { scale: 2, color: 'orange' });
      const P = area.player;
      const info = `RANK ${area.run.rank}/5  ALIVE ${area.enemies.filter((e) => !e.dead).length}  TOKENS ${area.director.tokens}/${area.director.limit}`;
      ui.text(W - 12 - ui.width(info), 11, info, { color: 'mist' });
      const next = ui.tabs('dtabs', 24, TABS, tab);
      if (next !== tab) { tab = next; ui.focus = null; }
      if (tab === 0) tools(ctx, ui, P);
      if (tab === 1) teleports(ctx, ui);
      if (tab === 2) spawns(ctx, ui);
      if (tab === 3) balance(ctx, ui);
      ui.promptBar(tab === 3
        ? [['confirm', 'PAGE'], ['tertiary', 'RESET'], ['secondary', 'ALL'], ['tabNext', 'TAB'], ['back', 'BACK']]
        : [['confirm', 'DO IT'], ['tabPrev', ''], ['tabNext', 'TAB'], ['back', 'BACK']]);
      if (ui.nav.back) {
        ctx.audio.play('uiBack');
        saveDevTuning({ ...TUNING });
        app.close(screen);
      }
    },
  };

  function toggleRow(ui, ctx, id, x, y, w, label, get, set) {
    if (ui.item(id, x, y, w, label, { scale: 1, h: 16, right: get() ? 'ON' : 'OFF' })) { set(!get()); ctx.audio.play('uiMove'); }
  }

  function tools(ctx, ui, P) {
    const { W } = ui;
    const colW = (W - 36) >> 1;
    const x0 = 12; const x1 = x0 + colW + 12; const y0 = 44; const rh = 17;
    const dev = app.dev;
    const left = [
      ['GOD MODE', 'god'], ['NO-CLIP', 'noclip'], ['INFINITE AMMO', 'infiniteAmmo'], ['ONE-HIT KILLS', 'oneHit'], ['FREEZE AI', 'freezeAi'],
      ['SHOW HIT ZONES', 'showZones'], ['SHOW NAV AND FLOW', 'showNav'], ['SHOW TRIGGERS', 'showTriggers'],
    ];
    left.forEach(([label, key], i) => toggleRow(ui, ctx, `t${key}`, x0, y0 + i * rh, colW, label, () => dev[key], (v) => { dev[key] = v; }));
    if (ui.item('speed', x0, y0 + 8 * rh, colW, 'GAME SPEED', { scale: 1, h: 16, right: `x${app.devSpeed}` })) {
      const list = [0.25, 0.5, 1, 2];
      app.devSpeed = list[(list.indexOf(app.devSpeed) + 1) % list.length];
      ctx.audio.play('uiMove');
    }
    const actions = [
      ['SKIP CUTSCENE', () => { area.cut?.skip(); }],
      ['HEAL', () => { P.hp = P.maxHp; if (area.dame) area.dame.hp = area.dame.maxHp; }],
      ['GIVE 10,000 DOUBLOONS', () => { area.run.money += 10000; }],
      ['GIVE ALL WEAPONS AND ITEMS', () => giveAll(area)],
      ['FILL CASE', () => fillCase(area)],
      ['KILL ALL', () => killAll(area)],
      ['UNLOCK ALL', () => unlockAll(area)],
      ['ENGINE DEBUG PANEL', () => { ctx.engine.showDebug(!ctx.engine.debugShown); }],
    ];
    actions.forEach(([label, fn], i) => {
      if (ui.item(`a${i}`, x1, y0 + i * rh, colW, label, { scale: 1, h: 16 })) { fn(); ctx.audio.play('uiConfirm'); }
    });
  }

  function teleports(ctx, ui) {
    const y0 = 44; const rh = 15; const perPage = 12;
    const total = DEV_TELEPORTS.length;
    const pages = Math.ceil(total / perPage);
    teleportPage = Math.min(teleportPage, pages - 1);
    if (ui.nav.left && ui.focus?.startsWith('tp')) teleportPage = (teleportPage + pages - 1) % pages;
    if (ui.nav.right && ui.focus?.startsWith('tp')) teleportPage = (teleportPage + 1) % pages;
    if (ui.nav.wheel) teleportPage = (teleportPage + (ui.nav.wheel > 0 ? 1 : pages - 1)) % pages;
    const w = ui.W - 24;
    DEV_TELEPORTS.slice(teleportPage * perPage, teleportPage * perPage + perPage).forEach((t, i) => {
      if (ui.item(`tp${t.id}`, 12, y0 + i * rh, w, `${t.chapter}: ${t.label}`, { scale: 1, h: 14 })) {
        ctx.audio.play('uiConfirm');
        app.closeAll();
        app.devTeleport?.(area, t);
      }
    });
    if (pages > 1) ui.centerText(ui.H - 30, `PAGE ${teleportPage + 1}/${pages}  LEFT RIGHT`, { color: 'mist' });
  }

  function spawns(ctx, ui) {
    const y0 = 46; const rh = 15;
    const w = (ui.W - 36) >> 1;
    ENEMY_IDS.forEach((id, i) => {
      const col = i % 2; const row = i >> 1;
      if (ui.item(`sp${id}`, 12 + col * (w + 12), y0 + row * rh, w, ENEMIES[id].name, { scale: 1, h: 14 })) {
        ctx.audio.play('uiConfirm');
        spawnAtDot(area, id);
      }
    });
    ui.text(12, ui.H - 30, 'SPAWNS AT THE LASER DOT, OR IN FRONT OF YOU.', { color: 'mist' });
  }

  function balance(ctx, ui) {
    const pages = Math.ceil(TUNING_SPEC.length / PER_PAGE);
    if (ui.nav.confirm) { page = (page + 1) % pages; ui.focus = null; ui.nav.confirm = false; ctx.audio.play('uiMove'); }
    if (ui.nav.wheel) { page = (page + (ui.nav.wheel > 0 ? 1 : pages - 1)) % pages; ui.focus = null; }
    const y0 = 44; const rh = 19;
    const w = ui.W - 24;
    TUNING_SPEC.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE).forEach(([key, label, def, min, max, step], i) => {
      const y = y0 + i * rh;
      const v = ui.slider(`b${key}`, 12, y, w, label, TUNING[key], min, max, step, { track: 100, valueW: 110, h: 17, format: (n) => `${fmt(n, step)} (${fmt(def, step)})` });
      if (v !== TUNING[key]) TUNING[key] = v;
      if (ui.focus === `b${key}` && ui.nav.tertiary) { resetTuning(key); ctx.audio.play('uiBack'); }
    });
    ui.centerText(y0 + PER_PAGE * rh + 2, `PAGE ${page + 1}/${pages}`, { color: 'mist' });
    if (ui.nav.secondary) { resetTuning(); ctx.audio.play('uiBack'); }
    if (ui.rightClicked) { resetTuning(); ctx.audio.play('uiBack'); }
  }
  app.open(screen);
  return screen;
}

export function giveAll(area) {
  const { run } = area;
  for (const w of WEAPON_ORDER) run.addWeapon(w);
  while (run.caseLevel < 2) run.upgradeCase();
  for (const w of WEAPON_ORDER) if (!run.case.find(w)) run.giveItem(w);
  for (const id of ['ammoPistol', 'ammoShells', 'ammoRifle', 'ammoBolts']) run.case.addStack(id, ITEMS[id].max);
  for (const id of ['flare', 'depth', 'oil', 'tin', 'mixSD']) run.giveItem(id);
  run.case.arrange();
}
export function fillCase(area) {
  const { run } = area;
  for (let i = 0; i < 200; i++) if (!run.case.add({ uid: 90000 + i, id: 'samphire', qty: 1, x: -1, y: -1, rot: false })) break;
}
export function killAll(area) {
  for (const e of [...area.enemies]) {
    if (e.dead) continue;
    if (e.isBoss) e.devKill?.();
    else { e.hp = 0; e.die({ weapon: { id: 'dev' }, dir: { x: 0, y: 0, z: 1 }, zone: 'torso', point: e.pos3() }); }
  }
}
export function unlockAll(area) {
  const { level, run } = area;
  for (const d of level.doors) { d.locked = false; }
  for (const g of level.gates) area.openGateAt(g.c0, g.r0);
  for (const s of level.shutters) level.setShutter(s, 1);
  run.giveKey('coldKey');
}
export function spawnAtDot(area, id) {
  const P = area.player;
  const lv = area.level;
  let x = P.x + Math.sin(area.cam.yaw) * 4; let z = P.z + Math.cos(area.cam.yaw) * 4;
  if (P.laserOn) { x = P.laserHit.x; z = P.laserHit.z; }
  if (!lv.nav.walkable(x, z)) { x = P.x + Math.sin(area.cam.yaw) * 1.5; z = P.z + Math.cos(area.cam.yaw) * 1.5; }
  return area.spawnEnemy(id, { x, z, floor: P.floor, y: P.y });
}
export { TUNING_DEFAULTS, goto };
