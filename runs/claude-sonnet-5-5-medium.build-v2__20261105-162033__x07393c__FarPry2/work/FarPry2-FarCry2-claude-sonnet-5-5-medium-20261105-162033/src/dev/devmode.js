// Dev mode: reached from the pause menu. Tabs of tools, live Balance sliders with Reset to Defaults. Never in a hub session.
import { THREE } from '../../pixel-engine.js';
import { SITES, POSTS, CASES } from '../content/sites.js';
import { SLIDERS, TUNING_DEFAULTS } from '../content/tuning-defaults.js';
import { TUNING, resetTuning } from '../core/tuning.js';
import { MISSIONS } from '../content/missions.js';
import { WEAPONS } from '../content/weapons.js';
import { writeSave, readSave } from '../core/save.js';

const V3 = THREE.Vector3;
export class DevSystem {
  name = 'dev';
  flags = { god: false, ammo: false, nojam: false, nofever: false, invisible: false, noclip: false, firegrid: false, ai: false, counts: false };
  setup(g) { this.g = g; g.dev = this; g.freeze = false; }
  get(k) { return this.flags[k]; }
  set(k, v) {
    const g = this.g; this.flags[k] = v;
    if (k === 'god') g.godMode = v; if (k === 'nofever') g.noFever = v; if (k === 'invisible') g.invisibleToAI = v;
    if (k === 'noclip') { g.noclip = v; g.player.ctrl.body.setEnabled(!v); if (!v) g.player.teleport(g.player.feet.x, g.player.feet.z); }
    if (k === 'nojam') g.noJams = v; if (k === 'ammo') g.infiniteAmmo = v;
  }
  tp(x, z) { this.g.player.teleport(x, z); this.g.ui.closeAll(); }
  crosshair() { const g = this.g, c = g.ctx.camera.camera, o = new V3(), d = new V3(); c.getWorldPosition(o); c.getWorldDirection(d); const h = g.ctx.physics.castRay(o, d, 600, [], g.player.ctrl.body); return h ? h.point : o.clone().addScaledVector(d, 60); }
  spawnAt(fn) { const p = this.crosshair(); fn(p.x, p.z); this.g.ui.closeAll(); }
  startMission(id) { const g = this.g; g.ui.closeAll(); g.missions.abort(); g.story.current = null; g.mission = {}; g.missions.begin(id); }
  completeStep() { const g = this.g; if (g.missions.cur) { g.missions.advance(); g.ui.closeAll(); } }
  tabs() { return ['Cheats', 'Teleport', 'Teleport 2', 'Spawn', 'World', 'Mission', 'Balance 1', 'Balance 2', 'Balance 3', 'Balance 4', 'Debug']; }
  items(tab) {
    const g = this.g, f = this.flags, d = this;
    const tog = (label, k) => ({ label, value: () => (f[k] ? 'ON' : 'OFF'), run: () => d.set(k, !f[k]), choice: { get: () => f[k], set: (v) => d.set(k, v), options: [false, true] } });
    const btn = (label, fn, value) => ({ label, run: fn, value });
    switch (tab) {
      case 'Cheats': return [tog('God mode', 'god'), tog('Infinite ammo', 'ammo'), tog('No jams', 'nojam'), tog('No fever', 'nofever'), tog('Invisible to AI', 'invisible'), tog('Noclip fly', 'noclip')];
      case 'Teleport': return SITES.slice(0, 7).map((s) => btn(s.name, () => d.tp(s.at[0] + 4, s.at[1] + 6)));
      case 'Teleport 2': return [...SITES.slice(7).map((s) => btn(s.name, () => d.tp(s.at[0] + 4, s.at[1] + 6))), btn('Crosshair point', () => { const p = d.crosshair(); d.tp(p.x, p.z); })].slice(0, 8);
      case 'Spawn': return [btn('Concord squad', () => d.spawnAt((x, z) => d.squad('concord', x, z))), btn('Harvest squad', () => d.spawnAt((x, z) => d.squad('harvest', x, z))), btn('Pickup', () => d.spawnAt((x, z) => g.spawnVehicle('pickup', [x, z], 0))), btn('Technical', () => d.spawnAt((x, z) => g.spawnVehicle('technical', [x, z], 0))), btn('Truck', () => d.spawnAt((x, z) => g.spawnVehicle('cargo', [x, z], 0))), btn('Gun pickup', () => d.spawnAt((x, z) => g.drops.add({ kind: 'gun', id: 'empire', cond: 40, at: [x, z] }))), btn('Buddy: Ines', () => { g.story.met.ines = true; g.buddies.join('ines'); g.ui.closeAll(); })];
      case 'World': return [{ label: 'Hour', slider: { get: () => g.world.hour, set: (v) => { g.world.hour = v; g.world.sky.update(v, g.ctx.camera.camera.position, true); }, min: 0, max: 23.9, step: 0.5, fmt: (v) => v.toFixed(1) } },
        { label: 'Wind speed', slider: { get: () => g.world.wind.speed, set: (v) => { g.world.wind.pin = true; g.world.wind.speed = v; }, min: 0, max: 8, step: 0.5, fmt: (v) => v.toFixed(1) } },
        { label: 'Wind direction', slider: { get: () => Math.atan2(g.world.wind.dir[1], g.world.wind.dir[0]), set: (v) => { g.world.wind.pin = true; g.world.wind.dir = [Math.cos(v), Math.sin(v)]; }, min: -3.14, max: 3.14, step: 0.2, fmt: (v) => (v * 57.3).toFixed(0) } },
        { label: 'Weather', choice: { get: () => g.weather, set: (v) => g.setWeather(v), options: ['clear', 'dust', 'storm'] }, value: () => g.weather.toUpperCase() },
        btn('Ignite at crosshair', () => { const p = d.crosshair(); g.fire.ignite(p.x, p.z, 6); g.ui.closeAll(); }), btn('Extinguish all / regrow all', () => { g.fireSys.reset(); g.ui.back(); }), btn('Sleep +6 hours', () => { g.world.hour = (g.world.hour + 6) % 24; })];
      case 'Mission': return [{ label: 'Start mission', choice: { get: () => d.pick || 'm1', set: (v) => { d.pick = v; }, options: Object.keys(MISSIONS) }, value: () => (d.pick || 'm1').toUpperCase(), run: () => d.startMission(d.pick || 'm1') }, btn('Complete current step', () => d.completeStep()), btn('Give 20 stones', () => { g.story.stones += 20; }), btn('Give tablets and syrettes', () => { g.weapons.tablets += 3; g.weapons.syrettes = 5; }), btn('All guns', () => { for (const w of Object.values(WEAPONS)) if (w.price !== undefined && w.slot !== 'mounted') { g.story.unlocked.push(w.id); g.weapons.give(w.id, 100); } g.weapons.throwables = { molotov: 3, charge: 2 }; }), btn('Force jam / break gun / fever', () => { const s = g.weapons.gunState(); if (s) { s.jammed = true; s.presses = 3; s.cond = 12; } g.body.startFever('THE FEVER.'); })];
      case 'Balance 1': case 'Balance 2': case 'Balance 3': case 'Balance 4': {
        const n = +tab.slice(-1) - 1; const part = SLIDERS.slice(n * 5, n * 5 + 5).map(([k, label, min, max, step]) => ({ label, slider: { get: () => TUNING[k], set: (v) => { TUNING[k] = v; }, min, max, step, fmt: (v) => (Math.abs(v) >= 10 ? Math.round(v) : +v.toFixed(2)).toString() }, key: k, left: undefined }));
        return [...part, btn('Reset to Defaults', () => resetTuning(), 'ALL')];
      }
      default: return [tog('Fire grid overlay', 'firegrid'), tog('AI state text', 'ai'), tog('Counts', 'counts'), btn('Free camera', () => d.freeCam()), btn('Quick save', () => writeSave(g)), btn('Quick load', () => { const raw = readSave(); if (raw) { g.ui.closeAll(); g.ctx.input.send({ load: raw }); } })];
    }
  }
  squad(faction, x, z) { for (let i = 0; i < 4; i++) this.g.spawnSoldier({ faction, role: i === 1 ? 'mg' : 'rifle', at: [x + i * 2, z], yaw: 0 }); }
  freeCam() { const g = this.g; g.ui.closeAll(); g.freeCam = !g.freeCam; g.say(g.freeCam ? 'FREE CAMERA: ESC TO PAUSE, DEV MODE TO LEAVE.' : 'BACK IN YOUR BODY.', 'player', 3); g.camState.override = null; }
  overlays(hud) {
    const g = this.g, f = this.flags;
    if (f.counts) { const st = g.ctx.engine.state(); hud.text(8, 20, `ACTORS ${g.combat.actors.length} BURNING ${g.fireSys.grid.burning.length} FPS ${st.fps}`, { color: 'lime' }); hud.text(8, 30, g.status().toUpperCase(), { color: 'lime' }); const c = this.crosshair(); hud.text(8, 40, `XHAIR ${c.x.toFixed(0)} ${c.z.toFixed(0)}`, { color: 'lime' }); }
    if (f.ai) for (const s of g.soldierSys.list) { if (!s.alive) continue; const p = g.hudSys.project(g, s.pos.x, s.pos.y + 2.6, s.pos.z, hud); if (p) hud.text(p.x - 10, p.y - 10, `${s.state} ${s.suspicion.toFixed(1)}`, { color: 'cyan' }); }
    if (f.firegrid) { const cam = g.ctx.camera.camera.position; const gr = g.fireSys.grid; for (let i = 0; i < gr.burning.length && i < 200; i++) { const [x, z] = gr.cellCenter(gr.burning[i]); const p = g.hudSys.project(g, x, g.world.heightAt(x, z) + 1, z, hud); if (p) hud.rect(p.x - 1, p.y - 1, 3, 3, 'red'); } }
  }
  fixed(g, dt) {
    if (g.noclip && g.canMove()) {
      const i = g.ctx.input, a = i.moveAxis(), yaw = g.ctx.camera.yaw, pitch = g.ctx.camera.pitch; const sp = (i.isDown('ShiftLeft') ? 60 : 20) * dt;
      const f = g.player.ctrl.feet; const dx = (-Math.sin(yaw) * a.y + Math.cos(yaw) * a.x) * sp, dz = (-Math.cos(yaw) * a.y - Math.sin(yaw) * a.x) * sp, dy = (i.isDown('Space') ? 1 : 0) * sp - (i.isDown('KeyC') ? 1 : 0) * sp;
      g.player.ctrl.body.setTranslation({ x: f.x + dx, y: f.y + 0.9 + dy, z: f.z + dz }, true);
      try { g.player.ctrl.teleport([f.x + dx, f.y + dy, f.z + dz]); } catch { /* disabled body */ }
    }
  }
}
export function devScreen(g) {
  const dev = g.dev; const tabs = dev.tabs();
  const sc = { id: 'dev', pause: false, dim: false, top: 56, rowH: 17, panelW: 300, tab: 0, frozen: false,
    items: () => dev.items(tabs[sc.tab]).slice(0, 8),
    tabs: (g, d) => { sc.tab = (sc.tab + d + tabs.length) % tabs.length; g.ui.focus = 0; g.sfx('ui_move'); },
    draw: (g, hud, ui, { W, H }) => {
      hud.rect(0, 0, W, 52, 0x0d1020); hud.rect(0, 52, W, H, 0x0d1020);
      hud.text(10, 6, 'DEV MODE', { color: 'orange', scale: 2 });
      let tx = 10; tabs.forEach((t, i) => { const label = t.replace('Balance ', 'BAL').replace('Teleport ', 'TP').toUpperCase(); const w = hud.measure(label).width; if (i === sc.tab) hud.rect(tx - 3, 26, w + 6, 9, 'orange'); hud.text(tx, 28, label, { color: i === sc.tab ? 'ink' : 'sand', shadow: false }); tx += w + 10; });
      hud.text(10, 40, `${tabs[sc.tab].toUpperCase()}   FREEZE: ${g.freeze ? 'ON' : 'OFF'}`, { color: 'mist' });
    },
    hints: [['tabPrev', 'TAB'], ['tabNext', 'TAB'], ['confirm', 'DO'], ['reset', 'RESET'], ['back', 'BACK']],
    customInput: (g, ui) => { const i = g.ctx.input; if (i.wasPressed('KeyR') || i.wasPressed('PadSquare')) { const it = ui.itemsOf(sc)[ui.focus]; if (it && it.key) resetTuning(it.key); } if (i.wasPressed('KeyF')) { g.freeze = !g.freeze; g.ctx.engine.timeScale = g.freeze ? 0 : 1; } return false; },
  };
  return sc;
}
