// Dev mode: from the pause menu. Tabs, world visible behind, playing or frozen by a toggle.
import { CASES, POSTS, siteById, SITES } from '../content/sites.js';
import { MISSIONS } from '../content/missions.js';
import { SHOP_ORDER } from '../content/weapons.js';
import { clamp } from '../world/geom.js';
import { balanceItems } from './sliders.js';
import { mixin } from '../core/mixin.js';
import { OverlaysPart } from './overlays.js';
const toggle = (label, get, set) => ({ label, small: true, value: () => (get() ? 'ON' : 'OFF'), adjust: () => set(!get()), action: () => set(!get()) });
const act = (label, action) => ({ label, small: true, action });
export function devTabs(g) {
  const c = g.cheats, dev = g.dev, w = g.world, p = g.player;
  const sitesList = [...SITES.map((s) => act(s.name, () => dev.teleport(s.at[0] + 6, s.at[1] + 6))), ...CASES.map((k) => act(`CASE ${k.id.toUpperCase()}`, () => dev.teleport(k.at[0] + 1.5, k.at[1] + 1.5))), act('THE CROSSHAIR POINT', () => dev.teleportCrosshair())];
  return {
    CHEATS: [toggle('GOD MODE', () => c.god, (v) => { c.god = v; }), toggle('INFINITE AMMO', () => c.infiniteAmmo, (v) => { c.infiniteAmmo = v; }), toggle('NO JAMS', () => c.noJams, (v) => { c.noJams = v; }), toggle('NO FEVER', () => c.noFever, (v) => { c.noFever = v; }), toggle('INVISIBLE TO AI', () => c.invisible, (v) => { c.invisible = v; }), toggle('NOCLIP FLY', () => c.noclip, (v) => { c.noclip = v; }), toggle('WORLD PLAYS BEHIND', () => dev.playing, (v) => { dev.playing = v; g.ctx.engine.timeScale = v ? 1 : 0; })],
    TELEPORT: sitesList,
    SPAWN: [act('SQUAD: CONCORD', () => dev.squad('concord')), act('SQUAD: HARVEST', () => dev.squad('harvest')), act('PICKUP', () => dev.vehicle('pickup')), act('TECHNICAL', () => dev.vehicle('technical')), act('TRUCK', () => dev.vehicle('cargo-truck')), act('STONE CASE', () => g.spawnStonePickup(p.x + 3, p.z, 'dev-case', 5)), act('A BUDDY', () => dev.buddy())],
    WORLD: [
      { label: 'HOUR', small: true, value: () => w.hour / 24, valueText: () => w.hour.toFixed(1), adjust: (d) => w.setHour((w.hour + d * 0.5 + 24) % 24), set: (v) => w.setHour(v * 23.9) },
      { label: 'WIND DIRECTION', small: true, value: () => (Math.atan2(w.wind.z, w.wind.x) + Math.PI) / 6.283, valueText: () => `${Math.round((Math.atan2(w.wind.z, w.wind.x) * 180) / Math.PI)}`, adjust: (d) => { const a = Math.atan2(w.wind.z, w.wind.x) + d * 0.2; w.wind.x = Math.cos(a); w.wind.z = Math.sin(a); }, set: (v) => { const a = v * 6.283 - Math.PI; w.wind.x = Math.cos(a); w.wind.z = Math.sin(a); } },
      { label: 'WIND SPEED', small: true, value: () => w.wind.speed / 8, valueText: () => w.wind.speed.toFixed(1), adjust: (d) => { w.wind.speed = clamp(w.wind.speed + d * 0.5, 0, 8); }, set: (v) => { w.wind.speed = v * 8; } },
      { label: 'WEATHER', small: true, value: () => w.weather.toUpperCase(), adjust: (d) => { const l = ['clear', 'dust', 'storm'], i = (l.indexOf(w.weather) + Math.sign(d) + 3) % 3; w.setWeather(l[i]); }, action() { this.adjust(1); } },
      act('IGNITE AT THE CROSSHAIR', () => dev.igniteCrosshair()), act('EXTINGUISH ALL', () => w.fire.extinguish()), act('REGROW ALL', () => { w.fire.regrowAll(); w.land.paintAll(); w.burnDirty = true; }), act('SLEEP 6 HOURS', () => w.advanceHours(6)),
    ],
    MISSION: [
      ...MISSIONS.map((m) => act(`START ${m.id.toUpperCase()}: ${m.title}`, () => dev.startMission(m.id))),
      act('COMPLETE CURRENT STEP', () => dev.completeStep()), act('SET STORY FLAGS: ALL FRIENDS MET', () => { for (const k of Object.keys(g.buddies.state)) g.buddies.state[k].met = true; g.people.showFriends(); }),
      act('GIVE 50 STONES', () => { p.stones += 50; }), act('GIVE 3 TABLETS', () => { p.tablets += 3; }), act('GIVE 3 SYRETTES', () => { p.syrettes += 3; }), act('ALL GUNS', () => dev.allGuns()), act('BREAK GUN', () => dev.breakGun()), act('FORCE JAM', () => dev.forceJam()), act('FORCE FEVER', () => g.body.onset()), act('DOWN A BUDDY', () => dev.downBuddy()),
    ],
    BALANCE: balanceItems(g),
    DEBUG: [toggle('FIRE-GRID OVERLAY', () => dev.fireOverlay, (v) => { dev.fireOverlay = v; }), toggle('NAV OVERLAY', () => dev.navOverlay, (v) => { dev.navOverlay = v; }), toggle('AI STATE OVER HEADS', () => dev.aiText, (v) => { dev.aiText = v; }), toggle('COUNTS', () => dev.counts, (v) => { dev.counts = v; }), toggle('CROSSHAIR COORDS', () => dev.coords, (v) => { dev.coords = v; }), toggle('ENGINE DEBUG PANEL', () => g.ctx.engine.debugShown, (v) => g.ctx.engine.showDebug(v)), toggle('FREE CAMERA', () => dev.freeCam, (v) => dev.setFreeCam(v)), act('QUICK SAVE', () => dev.quickSave()), act('QUICK LOAD', () => dev.quickLoad()), toggle('SHOW STATUS LINE', () => dev.statusLine, (v) => { dev.statusLine = v; })],
  };
}
export function devScreen(g) {
  const tabs = devTabs(g), names = Object.keys(tabs);
  return { id: 'dev', cover: false, dim: false, top: 30, tabs: names, tab: 0, items: (s) => tabs[names[s.tab]], footer: [['tabL', 'TAB'], ['resetOne', 'RESET ONE'], ['back', 'BACK']], onShow() { g.dev.open = true; }, onClose() { g.dev.open = false; g.ctx.engine.timeScale = 0; g.dev.playing = false; }, draw() { g.dev.drawOverlays(); } };
}
export class Dev {
  playing = false; open = false; fireOverlay = false; navOverlay = false; aiText = false; counts = false; coords = false; freeCam = false; statusLine = false;
  constructor(game) { this.game = game; }
  teleport(x, z) { const g = this.game; g.player.teleport(x, z); g.world.focusX = x; g.world.focusZ = z; g.world.updateBubble?.(); }
  crosshair() { const g = this.game, e = g.combat.eye(), v = g.ctx.camera.camera.position.clone(), dir = v.clone().set(...e.dir); const hit = g.ctx.physics.castRay(v.set(e.x, e.y, e.z), dir, 800, undefined, g.player.ctrl?.body); return hit ? [hit.point.x, hit.point.y, hit.point.z] : [e.x + e.dir[0] * 30, e.y, e.z + e.dir[2] * 30]; }
  teleportCrosshair() { const c = this.crosshair(); this.teleport(c[0], c[2]); }
  igniteCrosshair() { const c = this.crosshair(); this.game.world.fire.ignite(c[0], c[2], 5); }
  squad(f) { const p = this.game.player; this.game.spawnSquad(f, p.x + 26, p.z + 10, 4, 'dev'); }
  vehicle(t) { const p = this.game.player; this.game.vehicles.spawn(t, p.x + 7, p.z, 0, 'dev'); }
  buddy() { const g = this.game, id = g.buddies.alive()[0] ?? 'ines'; g.buddies.state[id].met = true; g.buddies.spawnFollower(id, g.player.x + 3, g.player.z + 3); }
  allGuns() { const g = this.game; for (const id of SHOP_ORDER) { g.player.unlocked[id] = true; } g.combat.give('tractor', 100, false); g.combat.give('tube', 100, false); g.story.hasFlare = true; g.story.hasTracker = true; g.player.molotovs = 3; g.player.charges = 2; }
  breakGun() { const g = this.game.combat.current(); if (g) { g.cond = 1; this.game.vm.setCondition(g.id, 1); } }
  forceJam() { const c = this.game.combat, g = c.current(); if (g && g.id !== 'mg' && g.id !== 'cane') c.jam(g); }
  downBuddy() { const g = this.game; let a = g.buddies.followers.find((f) => f.alive && !f.down); if (!a) { this.buddy(); a = g.buddies.followers.at(-1); } g.actors.goDown(a, {}); }
  completeStep() { const m = this.game.missions; if (m.active) m.next(); }
  startMission(id) { this.game.dev_startMission(id); }
  quickSave() { const s = this.game.save; this.quick = JSON.stringify(s.serialize()); this.game.notice('QUICK SAVED'); }
  quickLoad() { if (this.quick) this.game.ctx.input.send({ load: this.quick }); }
  setFreeCam(v) { const e = this.game.ctx.engine; this.freeCam = v; e.setCamera(v ? { preset: 'free' } : { preset: 'first', fov: 62 }, { syncUrl: false }); }
}
export { POSTS, siteById };
mixin(Dev, OverlaysPart);
