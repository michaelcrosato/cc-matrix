// Attract mode: a looping tour played by cheating bots (invulnerable, no limits). Any input exits. Never touches saves.
import { CLASSES } from '../data/classes.js';
import { NPCS } from '../data/quests.js';
import { createHero } from '../sim/progress.js';
import { botIntent } from '../sim/bot.js';
import { loadZone, spawnElitePack } from '../sim/world.js';
import { onZoneLoaded, newCampaign } from '../sim/campaign.js';
import { startBoss } from '../sim/bosses.js';
import { startKnell } from '../sim/knell.js';
import { livingHeroes, spawnMonster, ev, dropItem } from '../sim/core.js';
import { makeItem } from '../sim/items.js';
import { LEGENDARIES } from '../data/items.js';
import { ZONES } from '../data/zones.js';
import { drawHud } from '../ui/hud.js';

const STOPS = [
  { id: 'town', label: 'TOLLHAVEN: THE LAST PARISH WITH ITS LAMPS LIT', zone: 'town', classes: ['bellwarden'], time: 12, hud: false, song: 'town', pan: true },
  { id: 'causeway', label: 'THE WEEPING CAUSEWAY: SMASH HORDES, CHASE LOOT', zone: 'causeway', classes: ['bellwarden'], time: 16, hud: true, crowd: 3 },
  { id: 'ossuary', label: 'THE OSSUARY: GRAVES RISE AT UNION RATES', zone: 'ossuary2', classes: ['sexton'], time: 16, hud: true, elite: true },
  { id: 'bursar', label: 'THE BURSAR: YOUR SOUL IS OVERDUE', zone: 'counting', classes: ['sexton'], time: 14, hud: true, boss: true },
  { id: 'cloister', label: 'THE CINDER CLOISTER: COMETS AND BEACONS', zone: 'cloister', classes: ['lamplighter'], time: 16, hud: true, crowd: 2 },
  { id: 'knell', label: 'A KNELL RUN: FILL THE BELL WITH FRIENDS', zone: 'knell', classes: ['bellwarden', 'lamplighter', 'sexton'], time: 18, hud: true, knell: true },
  { id: 'malison', label: 'MALISON, THE UNRUNG SAINT', zone: 'summit', classes: ['bellwarden', 'lamplighter'], time: 18, hud: true, boss: true, malison: true },
];

export class Attract {
  constructor(game) { this.game = game; this.i = -1; this.t = 0; this.age = 0; this.loops = 0; this.covers = 0; this.visited = []; this.stopT = 0; this.label = ''; this.busy = false; }
  start() { const g = this.game; g.slot = null; g.localSeat = 0; g.seats = []; g.actors.clear(); g.save.disabled = true; this.nextStop(); }
  stop() { const g = this.game; g.save.disabled = !!g.opts.noSave || !!g.opts.session; g.actors.clear(); g.vfx.clear(); g.audio.stopAll(); g.clearView(); g.world = null; g.seats = [{ seat: 0, kind: 'kbm' }]; g.couch = false; g.ctx.engine.timeScale = 1; g.darkMode = false; g.ctx.engine.ambient.intensity = 1; }
  async nextStop() {
    this.busy = true; const g = this.game;
    this.i = (this.i + 1) % STOPS.length; if (this.i === 0 && this.visited.length) this.loops++;
    const s = STOPS[this.i]; this.visited.push(s.id); this.stopT = 0; this.label = s.label;
    if (!g.noTransitions) { try { await g.ctx.engine.screen.cover('iris', { duration: 0.4 }); } catch {} }
    if (g.mode !== 'attract') return;
    g.actors.clear(); g.vfx.clear(); g.clearView(); g.darkMode = false; g.ctx.engine.ambient.intensity = 1;
    const w = g.newWorld({ seed: 900 + this.i }); w.camp = newCampaign(); w.camp.visited = { town: true }; w.tuning.monsterHp = 0.35; w.tuning.density = s.crowd ? 1.2 : 0.8; w.attract = true; w.levelFloor = 22;
    w.camp.q = 5; w.camp.done = true;
    const classes = s.classes; g.seats = classes.map((c, i) => ({ seat: i, kind: 'bot' })); g.couch = classes.length > 1; g.localSeat = 0;
    classes.forEach((cls, i) => { const h = createHero(w, { seat: i, cls, name: ['Ash', 'Briar', 'Cobb'][i], level: 30, bot: true, lastBell: true }); h.devFlags = { god: true, infRes: true, noCd: false }; h.bot = true; });
    if (s.knell) { startKnell(w, { tier: 0, mods: ['crowded'], grand: false, session: true }); w.knell.total = 120; }
    else { loadZone(w, s.zone, { levelFloor: 20, instant: true }); onZoneLoaded(w, s.zone); }
    if (s.boss && !s.malison) { /* boss started by onZoneLoaded */ }
    if (s.malison) { const b = w.monsters.find((m) => m.boss); if (b) { b.hp = b.maxHp * 0.55; b.extra.started = false; b.state = 'aggro'; } }
    if (s.elite) { const h = livingHeroes(w)[0]; const def = ZONES[s.zone]; spawnElitePack(w, def, h.x + 8, h.z, 777, 22); for (const m of w.monsters) if (m.pack === 777) m.state = 'aggro'; }
    if (s.crowd) { const h = livingHeroes(w)[0]; for (let k = 0; k < 14 * s.crowd; k++) { const a = k * 0.7; const m = spawnMonster(w, ZONES[s.zone].mon[k % ZONES[s.zone].mon.length], h.x + Math.cos(a) * (7 + k % 5), h.z + Math.sin(a) * (7 + k % 4), { dormant: false, level: 22 }); } const it = makeItem(w.lootRng, { legendary: 'widows_clapper', ilvl: 25, cls: 'bellwarden' }); dropItem(w, it, h.x + 3, h.z + 2, 0); }
    g.mode = 'attract'; g.buildView();
    g.audio.music(s.song || (s.zone.startsWith('ossuary') ? 'ossuary' : s.zone === 'summit' ? 'summit' : s.zone === 'knell' ? 'knell' : s.zone));
    if (s.pan) { w.heroes[0].x += 0; this.panT = 0; }
    this.busy = false;
    if (!g.noTransitions) { try { await g.ctx.engine.screen.reveal('iris'); } catch {} }
    this.covers++;
  }
  intents(w) {
    const out = {}; this.age += 1 / 60; this.stopT += 1 / 60;
    const s = STOPS[this.i]; if (!s || this.busy) return out;
    for (const h of w.heroes) {
      let goal = null;
      if (s.pan) { goal = { x: h.x + Math.sin(this.stopT * 0.5) * 8, z: h.z + Math.cos(this.stopT * 0.4) * 5 }; }
      else { const foe = w.monsters.filter((m) => !m.dead && !m.prop && m.team !== 'hero').sort((a, b) => Math.hypot(a.x - h.x, a.z - h.z) - Math.hypot(b.x - h.x, b.z - h.z))[0]; goal = foe ? { x: foe.x, z: foe.z } : w.zone.exit; }
      if (h.hp < h.maxHp * 0.5) h.hp = h.maxHp;
      out[h.seat] = s.pan ? { mx: Math.sin(this.stopT * 0.5) * 0.5, mz: Math.cos(this.stopT * 0.4) * 0.5, held: [false, false, false, false, false, false], pressed: [false, false, false, false, false, false] } : botIntent(w, h, { goal });
    }
    if (this.stopT > s.time && !this.busy) this.nextStop();
    // ensure monsters wake up and fight: nearest dormant within 20 wakes
    for (const m of w.monsters) if (m.state === 'dormant' && !m.prop) { const h = w.heroes[0]; if (h && Math.hypot(m.x - h.x, m.z - h.z) < 22) m.state = 'aggro'; }
    return out;
  }
  draw(ui) {
    const g = this.game; const s = STOPS[this.i]; if (!s) return;
    if (s.hud && g.world && g.world.zone && !this.busy) { try { drawHud(g); } catch { /* HUD needs a local hero */ } }
    const hud = ui.hud; const blink = Math.floor(g.frame / 30) % 2 === 0;
    const ls = ui.wrap(this.label, ui.hudW - 40); const bh = 12 + ls.length * 9; hud.rect(0, 0, ui.hudW, bh, 'ink'); ui.text(4, 2, 'DEMO', { color: 'red' }); ls.forEach((l, i) => ui.text(36 + 2, 2 + i * 9, l, { color: 'sand' }));
    hud.rect(0, ui.hudH - 22, ui.hudW, 22, 'ink');
    ui.center(ui.hudH - 18, 'TOLL BOOTH OF DOOM', { color: 'white' }); if (blink) ui.center(ui.hudH - 9, 'PRESS ANY BUTTON', { color: 'sand' });
  }
}
