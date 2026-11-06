// Single slot, versioned JSON. Written on sleep and on mission complete; read through input.send so replays stay exact.
import { storyToJson, storyFromJson } from '../missions/story.js';
const KEY = 'far-cry-uncle.save.v1';
export const SETTINGS_KEY = 'far-cry-uncle.settings.v1';
const store = () => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; } };
export class Save {
  disabled = false; lastWritten = null; pendingLoad = null;
  constructor(game) { this.game = game; }
  exists() { const s = store(); try { return !!(s && s.getItem(KEY)); } catch { return false; } }
  read() { const s = store(); try { const raw = s?.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch { return null; } }
  snapshot(reason) {
    const g = this.game;
    return {
      version: 1, reason, story: storyToJson(g.story), weapons: g.weapons.snapshot(),
      body: { hp: Math.max(40, Math.round(g.body.hp)), syrettes: g.body.syrettes, maxSyrettes: g.body.maxSyrettes, tablets: g.body.tablets, feverIn: g.body.feverIn, feverAct: g.body.feverAct },
      pos: g.lastSafe ?? [g.player.feet.x, g.player.feet.z], yaw: g.player.yaw, hour: g.clock.hour, abs: g.clock.abs, day: g.clock.day,
      fire: g.fire.encode(), done: [...g.missions.done], ledger: g.ledger.toJson(),
      buddies: g.actors.buddies.map((b) => ({ id: b.id, met: b.met, dead: b.dead, trust: b.trust, spentUntil: b.spentUntil, woundedUntil: b.woundedUntil })),
      squads: [...g.actors.squads.entries()].filter(([k, s]) => POST_LIKE(k)).map(([k, s]) => [k, s.alive, s.clearedAt]),
      seen: [...g.map.seen], notes: g.map.notes, wind: [g.wind.dir, g.wind.speed], hasKit: g.vehicles.hasKit,
    };
  }
  write(reason = 'manual') {
    const g = this.game;
    if (this.disabled || g.round) return false;
    const data = this.snapshot(reason);
    this.lastWritten = data;
    const s = store();
    try { s?.setItem(KEY, JSON.stringify(data)); } catch { return false; }
    return true;
  }
  /** A round trip through the input so a replay reproduces it. */
  requestLoad() {
    const data = this.read() ?? this.lastWritten;
    if (!data) return false;
    this.game.ctx.input.send({ loadSave: data });
    return true;
  }
  apply(data) {
    const g = this.game;
    g.resetCampaign();
    g.story = storyFromJson(data.story);
    g.weapons.restoreData(data.weapons);
    Object.assign(g.body, data.body);
    g.clock.hour = data.hour; g.clock.abs = data.abs; g.clock.day = data.day;
    g.fire.hours = data.abs;
    g.missions.done = new Set(data.done);
    g.ledger.fromJson(data.ledger);
    for (const b of data.buddies) Object.assign(g.actors.buddy(b.id), b);
    for (const [k, alive, clearedAt] of data.squads ?? []) { const s = g.actors.squads.get(k); if (s) { s.alive = alive; s.clearedAt = clearedAt; } }
    g.map.seen = new Set(data.seen); g.map.notes = data.notes;
    g.wind.dir = data.wind[0]; g.wind.speed = data.wind[1];
    g.vehicles.hasKit = data.hasKit;
    // The land remembers: repaint scars.
    g.fire.decode(data.fire);
    for (let id = 0; id < 65536; id++) {
      const st = g.fire.state[id];
      if (st === 2) { g.world.paintFireCell(id, 'burnt'); g.world.burnTreesIn(id); for (const ex of g.world.explosives) if (ex.alive && g.fire.idOf(ex.x, ex.z) === id) { ex.alive = false; ex.object.visible = false; for (const c of ex.colliders) c.setEnabled?.(false); } }
      else if (st === 3) g.world.paintFireCell(id, 'green');
    }
    g.lastSafe = data.pos;
    g.player.teleport(data.pos[0], data.pos[1]);
    g.player.setYaw(data.yaw, 0);
    g.sky.apply(g.ctx, g.clock.hour);
    g.applyStoryToWorld();
    g.vm.showGun(g.weapons.gun?.id ?? 'cane', false);
    g.events.emit('loaded');
    g.missions.resumeAuto();
  }
  clear() { const s = store(); try { s?.removeItem(KEY); } catch { /* storage may be blocked */ } }
}
const POST_LIKE = () => true;
export const DEFAULT_SETTINGS = { music: 0.1, sfx: 1, voices: 1, sensPad: 1, sensMouse: 1, invertY: false, aimAssist: true, rumble: true, glyphs: 'ps', pixelSize: 'fine', quality: 'auto', fov: 62, subtitleSize: 1, reduceFlashes: false, feverReduced: false };
export function loadSettings() {
  const s = store();
  try { const raw = s?.getItem(SETTINGS_KEY); return { ...DEFAULT_SETTINGS, ...(raw ? JSON.parse(raw) : {}) }; } catch { return { ...DEFAULT_SETTINGS }; }
}
export function storeSettings(v) { const s = store(); try { s?.setItem(SETTINGS_KEY, JSON.stringify(v)); } catch { /* storage may be blocked */ } }
