// Single-slot, versioned JSON save in localStorage. Written on sleep and on mission complete.
import { SETTINGS_KEY } from './settings.js';
export const SAVE_KEY = 'farpry2.save.v1';
const store = () => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; } };
export function snapshotGame(g) {
  const w = g.weapons, p = g.player.feet, st = g.story;
  return {
    v: 1, at: Date.now(),
    story: JSON.parse(JSON.stringify(st)),
    player: { x: +p.x.toFixed(1), z: +p.z.toFixed(1), yaw: g.ctx.camera.yaw, hp: Math.round(g.body.hp) },
    world: { hour: g.world.hour, day: g.world.day, fire: g.fireSys.grid.save(), wind: g.world.wind },
    weapons: { slotGun: w.slotGun, guns: w.guns, throwables: w.throwables, upgrades: w.upgrades, syrettes: w.syrettes, tablets: w.tablets, slot: w.slot },
    fever: { count: g.body.fever.count },
    sites: g.sitesSys.sites.map((s) => [s.id, s.cleared ? 1 : 0, s.safe ? 1 : 0, s.lastDeath]),
    cases: g.sitesSys.cases.map((c) => (c.taken ? 1 : 0)),
  };
}
export function writeSave(g) { if (g.save_disabled) return false; const st = store(); if (!st) return false; try { st.setItem(SAVE_KEY, JSON.stringify(snapshotGame(g))); g.events.emit('saved'); return true; } catch { return false; } }
export function readSave() { const st = store(); if (!st) return null; try { const raw = st.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } }
export function hasSave() { const s = readSave(); return !!(s && s.v === 1); }
export function clearSave() { const st = store(); try { st && st.removeItem(SAVE_KEY); } catch { /* ignore */ } }
/** Apply a save to a running game. Called from the update loop with data that arrived through input.send. */
export function applySave(g, d) {
  if (!d || d.v !== 1) return false;
  g.story = d.story;
  const w = g.weapons;
  Object.assign(w.slotGun, d.weapons.slotGun); w.guns = d.weapons.guns; w.throwables = d.weapons.throwables; Object.assign(w.upgrades, d.weapons.upgrades); w.syrettes = d.weapons.syrettes; w.tablets = d.weapons.tablets;
  g.world.hour = d.world.hour; g.world.day = d.world.day; g.fireSys.grid.hours = g.gameHours(); g.fireSys.grid.load(d.world.fire); g.fireSys.repaintAll();
  g.sitesSys.resetGarrisons();
  for (const [id, cleared, safe, ld] of d.sites) { const s = g.sitesSys.find(id); if (s) { s.safe = !!safe; s.cleared = !!cleared; s.lastDeath = ld; if (cleared) for (const sl of s.slots) sl.alive = false; } }
  d.cases.forEach((t, i) => { const c = g.sitesSys.cases[i]; if (c) { c.taken = !!t; if (c.obj) c.obj.object.visible = !t; } });
  g.body.hp = d.player.hp; g.body.fever.count = d.fever.count; g.body.fever.t = 0; g.body.fever.active = false; g.body.fever.next = g.body.nextInterval();
  g.player.teleport(d.player.x, d.player.z, d.player.yaw);
  w.equipSlot(w.slotGun[d.weapons.slot] ? d.weapons.slot : 'side', true);
  g.grassSys.reset();
  g.events.emit('loaded');
  return true;
}
