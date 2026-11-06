// Attract mode: a looping, cheating, AI-played tour of the whole demo. It never touches saves.
import { CLASSES, PLAYABLE } from '../data/classes.js';
import { TITLE } from '../data/meta.js';
import { botIntent, newBotMemory } from '../sim/bot.js';
import { spawnElitePack } from '../sim/monsters.js';
import { startBoss } from '../sim/bosses.js';
import { addHero, newHeroData } from '../sim/hero.js';
import { makeItem } from '../sim/loot.js';
import { spawnPlate, newCampaign } from '../sim/quests.js';
import { startRun } from '../sim/knell.js';
import { loadZone } from '../sim/travel.js';
import { createWorld, newAccount, stepWorld } from '../sim/world.js';
import { runOps } from '../sim/effects.js';
import { dropItem, makeRolledItem } from '../sim/loot.js';
import { SKILLS } from '../data/skills.js';
import { BARKS, SPEAKERS } from '../data/dialog.js';

const STOPS = [
  { id: 'town', dur: 18 },
  { id: 'causeway', dur: 20 },
  { id: 'ossuary', dur: 24 },
  { id: 'cloister', dur: 18 },
  { id: 'knell', dur: 18 },
  { id: 'malison', dur: 24 },
];

function cheatHero(d, cls) {
  d.level = 25;
  const skills = CLASSES[cls].skills.slice(2, 8);
  d.skills = skills.map((id) => ({ id, tone: Object.keys(SKILLS[id].tones)[1] }));
  d.skills[0] = { id: CLASSES[cls].skills[0], tone: null };
  return d;
}

export class AttractTour {
  constructor(game) {
    this.game = game;
    this.i = -1;
    this.t = 0;
    this.loops = 0;
    this.mems = new Map();
    this.visited = new Set();
    this.seed = 777;
  }

  start() { this.next(); }

  makeWorld(seats) {
    const g = this.game;
    const account = newAccount();
    account.unlocks.knell = true;
    account.unlocks.penance = true;
    const camp = newCampaign();
    camp.q.i = 5;
    camp.credits = true;
    camp.flags.forge = 1; camp.flags.reliquary = 1; camp.flags.brasse_met = 1; camp.flags.brasse_home = 1; camp.flags.malison_dead = 1; camp.plateFirst = true;
    const w = createWorld({ seed: this.seed + this.i + this.loops * 10, account, camp, mode: 'attract' });
    w.noPyx = true;
    w.attractHp = 0.35;
    for (const [seat, cls] of seats.entries()) {
      const d = cheatHero(newHeroData(cls, CLASSES[cls].name, `attract${seat}`), cls);
      d.gear.main = makeItem(w.lootRng, { slot: 'main', rarity: 'legendary', ilvl: 25, cls, legendary: { bellwarden: 'widows_clapper', lamplighter: 'last_wick', sexton: 'second_best_crook' }[cls] });
      for (const slot of ['head', 'shoulders', 'chest']) d.gear[slot] = makeItem(w.lootRng, { slot, rarity: 'reliquary', ilvl: 25, cls });
      const h = addHero(w, d, seat, { navIndex: seat });
      h.god = true;
      h.attract = true;
      h.isBot = true;
    }
    g.world = w;
    g.input.seats = seats.map(() => ({ kind: 'bot', pad: null }));
    return w;
  }

  next() {
    const g = this.game;
    this.i = (this.i + 1) % STOPS.length;
    if (this.i === 0 && this.t > 0) this.loops++;
    this.t = 0;
    this.mems.clear();
    const stop = STOPS[this.i];
    this.visited.add(stop.id);
    g.view.setWorld(null);
    const go = (w) => { g.view.setWorld(w); this.flush(w); };
    switch (stop.id) {
      case 'town': {
        const w = this.makeWorld(['lamplighter']);
        loadZone(w, 'town', 0, 'start');
        w.heroes[0].hidden = true;
        go(w);
        this.pan = w.objects.filter((o) => o.kind === 'npc').map((o) => ({ x: o.x, z: o.z, npc: o.npc }));
        this.panI = 0;
        this.panT = 0;
        g.view.camOverride = this.pan.length ? { x: this.pan[0].x, z: this.pan[0].z, zoom: 1.2 } : null;
        break;
      }
      case 'causeway': {
        const w = this.makeWorld(['bellwarden']);
        loadZone(w, 'causeway', 0, 'start');
        go(w);
        break;
      }
      case 'ossuary': {
        const w = this.makeWorld(['sexton']);
        loadZone(w, 'ossuary', 0, 'start');
        go(w);
        const h = w.heroes[0];
        spawnElitePack(w, { x: h.x + 6, z: h.z }, w.zone.def.monsters, { kind: 'champion', type: 'rattlebones', aff: ['tolling'] });
        this.bossSoon = true;
        break;
      }
      case 'cloister': {
        const w = this.makeWorld(['lamplighter']);
        loadZone(w, 'cloister', 0, 'start');
        go(w);
        break;
      }
      case 'knell': {
        const w = this.makeWorld(['bellwarden', 'lamplighter', 'sexton']);
        loadZone(w, 'knell', 0, 'start');
        startRun(w, { mods: ['crowded'] });
        w.pendingZone = null;
        loadZone(w, 'knell', 0, 'start');
        w.run.total = 80;
        go(w);
        break;
      }
      case 'malison': {
        const w = this.makeWorld(['bellwarden', 'sexton']);
        loadZone(w, 'belfry', 3, 'start');
        const z = w.zone;
        const m = startBoss(w, 'malison', z.w / 2, z.h / 2, { noIntro: true });
        m.hp = m.maxHp * 0.58;
        go(w);
        this.flush(w);
        break;
      }
      default: break;
    }
    g.ctx.engine.screen.reveal('iris', {}).catch?.(() => {});
    g.applyLook();
  }

  flush(w) {
    const g = this.game;
    g.drainEvents(w);
    g.dispatchEvents();
  }

  fixed() {
    const g = this.game;
    const w = g.world;
    if (!w) return;
    const intents = [];
    for (const h of w.heroes) {
      let mem = this.mems.get(h.id);
      if (!mem) { mem = newBotMemory(); this.mems.set(h.id, mem); }
      h.res = h.stats.maxResTotal;
      h.hp = h.stats.maxHp;
      h.dead = false;
      const stop = STOPS[this.i];
      if (stop.id === 'town') { intents[h.seat] = { mx: 0, mz: 0, ax: 0, az: 0, aimed: 0, tgt: 0, held: 0, pressed: 0, goal: null }; continue; }
      intents[h.seat] = botIntent(w, h, mem);
    }
    stepWorld(w, intents);
    this.stepStop(w);
    g.drainEvents(w);
  }

  stepStop(w) {
    const stop = STOPS[this.i];
    this.t += 1 / 60;
    if (stop.id === 'causeway' && !this.dropped && this.t > 7) {
      this.dropped = true;
      const h = w.heroes[0];
      dropItem(w, h, makeRolledItem(w.lootRng, h, 'legendary', 25), h.x + 3, h.z, 1);
      spawnPlate(w, h.x + 7, h.z + 3);
    }
    if (stop.id === 'ossuary' && this.bossSoon && this.t > 10) {
      this.bossSoon = false;
      const h = w.heroes[0];
      const p = { x: h.x + 5, z: h.z + 2 };
      startBoss(w, 'bursar', w.zone.nav.walkable(p.x, p.z) ? p.x : h.x, w.zone.nav.walkable(p.x, p.z) ? p.z : h.z, { noIntro: true });
      if (w.boss) w.boss.hp = w.boss.maxHp * 0.5;
    }
    if (stop.id === 'cloister' && !this.comets && this.t > 3) {
      this.comets = true;
      const h = w.heroes[0];
      runOps(w, h, SKILLS.beacon.fx, { x: h.x, z: h.z, dx: 0, dz: 1, px: h.x, pz: h.z, sk: SKILLS.beacon });
      runOps(w, h, SKILLS.long_nights_end.fx, { x: h.x, z: h.z, dx: 0, dz: 1, px: h.x, pz: h.z, sk: SKILLS.long_nights_end });
    }
    if (stop.id === 'knell' && w.run) {
      if (this.t > 9 && w.run.state === 'fill') { w.run.meter = w.run.total - 1; }
    }
    if (stop.id === 'malison' && w.boss) {
      const m = w.boss;
      if (this.t > 11 && m.bossState.phase < 3 && m.hp > m.maxHp * 0.24) m.hp = m.maxHp * 0.24;
      if (this.t > 16 && m.bossState.phase === 3 && !this.rang) {
        this.rang = true;
        const rope = w.objects.find((o) => o.kind === 'rope' && o.state === 0);
        if (rope) { const h = w.heroes[0]; h.x = rope.x + 0.8; h.z = rope.z; }
      }
    }
    if (this.t >= stop.dur) {
      this.dropped = false; this.comets = false; this.bossSoon = false; this.rang = false;
      this.next();
    }
  }

  frame() {
    const g = this.game;
    const stop = STOPS[this.i];
    if (stop?.id === 'town' && this.pan?.length) {
      this.panT += g.lastRealDt;
      const cur = this.pan[this.panI % this.pan.length];
      const nxt = this.pan[(this.panI + 1) % this.pan.length];
      const f = Math.min(1, this.panT / 5);
      const s = f * f * (3 - 2 * f);
      g.view.camOverride = { x: cur.x + (nxt.x - cur.x) * s, z: cur.z + (nxt.z - cur.z) * s, zoom: 1.2 };
      if (!this.panSaid) {
        this.panSaid = true;
        const lines = BARKS[cur.npc] ?? [];
        if (lines.length) g.hudSys.say(cur.npc, lines[0]);
      }
      if (this.panT >= 5) { this.panT = 0; this.panI++; this.panSaid = false; }
    } else if (g.view.camOverride) g.view.camOverride = null;
    if (g.input.anyInput && !g.touchOnly) {
      if (g.input.idleFrames === 0) g.stopAttract();
    }
  }

  drawOverlay(ui) {
    const W = ui.w;
    const y = Math.max(14, (this.game.hudSys.topBottom ?? 0) + 2);
    ui.text(W / 2, y, 'DEMO', { color: 'sand', align: 'center', scale: 2 });
    if (this.game.frame % 60 < 42) ui.text(W / 2, y + 20, 'PRESS ANY BUTTON', { color: 'white', align: 'center' });
    if (this.t < 2.5) ui.text(W / 2, ui.h / 2 - 40, TITLE, { color: 'sand', align: 'center', scale: W < 300 ? 2 : 3 });
  }

  stop() {
    const g = this.game;
    g.view.camOverride = null;
    g.input.seats = [{ kind: 'kbm', pad: null }];
  }
}

export { PLAYABLE, SPEAKERS };
