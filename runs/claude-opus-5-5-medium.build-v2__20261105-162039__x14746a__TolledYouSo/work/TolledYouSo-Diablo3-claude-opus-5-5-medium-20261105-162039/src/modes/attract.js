// The attract tour: real worlds, real bots, cheating freely. It never touches saves.
import { CLASS_IDS, CLASSES } from '../data/classes.js';
import { TITLE } from '../data/meta.js';
import { addHero, newWorld } from '../sim/step.js';
import { enterZone, findOpenNear } from '../sim/world.js';
import { levelUp, refresh } from '../sim/hero.js';
import { makeItem } from '../sim/loot.js';
import { dropItem } from '../sim/rules.js';
import { spawnElitePack, spawnMonster, killMonster } from '../sim/monsters.js';
import { startKnell } from '../sim/knell.js';
import { LEGENDARIES } from '../data/items.js';
import { makeTuning } from '../data/tuning.js';

export const STOPS = ['town', 'causeway', 'ossuary', 'bursar', 'cloister', 'knell', 'malison2', 'malison3'];
const STOP_T = { town: 16, causeway: 16, ossuary: 16, bursar: 14, cloister: 16, knell: 16, malison2: 16, malison3: 14 };
export class Attract {
  constructor(ctx, game, play) { this.ctx = ctx; this.game = game; this.play = play; this.i = -1; this.t = 0; this.age = 0; this.visited = {}; this.loops = 0; this.phase = 'run'; this.showHud = true; this.zoom = 1; this.pan = 0; }
  start() { this.next(); }
  stop() { this.ctx.engine.screen.clear(); this.play.attract = null; this.play.voice.stop(); }
  makeHeroes(w, list) {
    list.forEach((cls, seat) => {
      const h = addHero(w, { seat, cls, name: CLASSES[cls].name, isBot: true });
      while (h.level < 25) levelUp(w, h);
      h.attractGod = true; const legs = LEGENDARIES.filter((l) => l.cls === cls);
      for (const l of legs.slice(0, 2)) { const it = makeItem(w.rngs.loot, { legendary: l.id, ilvl: 25, cls }); h.gear[it.slot] = it; }
      for (const slot of ['head', 'shoulders', 'chest', 'feet']) if (!h.gear[slot]) h.gear[slot] = makeItem(w.rngs.loot, { slot, rarity: 'reliquary', ilvl: 25, cls });
      if (!h.gear.main) h.gear.main = makeItem(w.rngs.loot, { slot: 'main', rarity: 'legendary', ilvl: 25, cls, legendary: legs[0].id });
      const sk = CLASSES[cls].skills; h.slots = [sk[0], sk[1], sk[2], sk[3], sk[4], sk[6]].map((s, i) => ({ skill: s.id, tone: Object.keys(s.tones)[i % 3] }));
      refresh(w, h); h.hp = h.stats.maxHp; h.res = h.stats.maxResource;
    });
  }
  world(classes) {
    const tuning = makeTuning(); tuning.monsterHp = 0.35;
    const w = newWorld({ seed: 77 + this.i * 13 + this.loops * 101, tuning }); w.mode = 'attract'; w.cheats.infRes = true; w.cheats.noCd = false; w.tuning.cooldown = 0.25; w.story.flags.writsOpen = true; w.story.flags.brasseOpen = true; w.story.q = 2; this.makeHeroes(w, classes); w.unlocks.knell = true;
    return w;
  }
  setup(stop) {
    this.visited[stop] = (this.visited[stop] ?? 0) + 1; let w; const bots = {};
    this.camera = null; this.zoom = 1; this.showHud = true;
    switch (stop) {
      case 'town': { w = this.world(['lamplighter']); enterZone(w, 'town'); this.camTour = w.props.filter((p) => p.kind === 'npc'); this.showHud = false; this.camera = (wd) => this.tourCamera(wd); this.zoom = 1.15; this.lines = [['crier', 'Hear ye, hear ye! The dead are up, the roads are closed, and the fish is off.'], ['pennywhistle', 'Everything is half price, dear friend. The other half is your soul.'], ['ogive', 'Bring me the holy bones, child. I will know them by the taste.']]; break; }
      case 'causeway': { w = this.world(['bellwarden']); enterZone(w, 'causeway'); w.story.flags.firstPlate = true; w.story.flags.firstChampion = true; const h = w.heroes[0]; const r = w.zone.roomRects[2]; const p = findOpenNear(w, r.x + r.w / 2, r.y + r.h / 2); h.x = p.x; h.z = p.z; for (let i = 0; i < 26; i++) { const q = findOpenNear(w, p.x + w.rngs.ai.range(-7, 7), p.z + w.rngs.ai.range(-5, 5)); spawnMonster(w, i % 7 === 0 ? 'bloat_deacon' : i % 3 ? 'peatwalker' : 'gibbet_drop', q.x, q.z, { dormant: false, aggro: true }); } this.legT = 6; break; }
      case 'ossuary': { w = this.world(['sexton']); enterZone(w, 'ossuary2'); const h = w.heroes[0]; const r = w.zone.roomRects[1]; const p = findOpenNear(w, r.x + r.w / 2, r.y + r.h / 2); h.x = p.x; h.z = p.z; spawnElitePack(w, p.x + 4, p.z, 'rare', null, ['rattlebones', 'pallid_bearer'], { dormant: false, aggro: true }); for (let i = 0; i < 16; i++) { const q = findOpenNear(w, p.x + w.rngs.ai.range(-6, 6), p.z + w.rngs.ai.range(-5, 5)); spawnMonster(w, 'rattlebones', q.x, q.z, { dormant: false, aggro: true }); } break; }
      case 'bursar': { w = this.world(['sexton']); enterZone(w, 'countinghouse'); break; }
      case 'cloister': { w = this.world(['lamplighter']); enterZone(w, 'cloister'); const h = w.heroes[0]; const r = w.zone.roomRects[3]; const p = findOpenNear(w, r.x + r.w / 2, r.y + r.h / 2); h.x = p.x; h.z = p.z; for (let i = 0; i < 26; i++) { const q = findOpenNear(w, p.x + w.rngs.ai.range(-8, 8), p.z + w.rngs.ai.range(-5, 5)); spawnMonster(w, i % 3 ? 'cinderling' : i % 2 ? 'penitent' : 'tithe_collector', q.x, q.z, { dormant: false, aggro: true }); } h.slots = [CLASSES.lamplighter.skills[0], CLASSES.lamplighter.skills[6], CLASSES.lamplighter.skills[7], CLASSES.lamplighter.skills[2], CLASSES.lamplighter.skills[3], CLASSES.lamplighter.skills[1]].map((s) => ({ skill: s.id, tone: null })); break; }
      case 'knell': { w = this.world(CLASS_IDS.slice()); enterZone(w, 'town'); startKnell(w); w.knell.total = 70; break; }
      case 'malison2': case 'malison3': { w = this.world(['bellwarden', 'sexton']); w.story.q = 4; w.story.step = 3; enterZone(w, 'belfry_top'); const m = w.boss?.m; if (m) { m.intro = 0; m.hp = stop === 'malison2' ? m.maxHp * 0.59 : m.maxHp * 0.24; } break; }
      default: break;
    }
    w.events.length = 0;
    CLASS_IDS.forEach((c, i) => { if (w.heroes.some((h) => h.seat === i)) bots[i] = true; });
    this.play.begin(w, { local: w.heroes.map((h) => h.seat), bots, attract: this });
    this.play.world.mode = stop === 'malison2' || stop === 'malison3' ? 'campaign' : w.mode;
    this.play.music.play(w.zone.spec.song);
    this.tourI = 0; this.tourT = 0;
    this.play.hud.banner = { text: TITLE, t: 2.5, big: true };
    if (this.lines) { this.play.say(this.lines[0][0], this.lines[0][1]); }
  }
  tourCamera(w) {
    const list = this.camTour; if (!list?.length) return null;
    this.tourT += 1 / 60; if (this.tourT > 16 / list.length) { this.tourT = 0; this.tourI = (this.tourI + 1) % list.length; if (this.lines?.[this.tourI]) this.play.say(this.lines[this.tourI][0], this.lines[this.tourI][1]); }
    const p = list[this.tourI]; this.cam = this.cam ?? { x: p.x, z: p.z }; this.cam.x += (p.x - this.cam.x) * 0.015; this.cam.z += (p.z - this.cam.z) * 0.015; return this.cam;
  }
  next() {
    this.i++; if (this.i >= STOPS.length) { this.i = 0; this.loops++; }
    this.lines = null; this.cam = null;
    this.setup(STOPS[this.i]);
    this.t = 0; this.phase = 'run';
    this.ctx.engine.screen.reveal('iris').catch?.(() => {});
  }
  fixed(w) {
    // A legendary beam on the Causeway, and keep monsters coming so there's always a fight to show.
    if (this.legT !== undefined && STOPS[this.i] === 'causeway') { this.legT -= 1 / 60; if (this.legT <= 0) { this.legT = undefined; const h = w.heroes[0]; dropItem(w, h.x + 2, h.z + 1, makeItem(w.rngs.loot, { legendary: LEGENDARIES[0].id, ilvl: 25, cls: h.cls }), h.seat); } }
    if (w.tick % 240 === 0 && STOPS[this.i] !== 'town' && w.active.filter((m) => !m.dead).length < 8 && !w.boss) {
      const h = w.heroes[0]; const list = w.zone.spec.monsters.length ? w.zone.spec.monsters : ['rattlebones'];
      for (let i = 0; i < 10; i++) { const p = findOpenNear(w, h.x + w.rngs.ai.range(-7, 7), h.z + w.rngs.ai.range(-6, 6)); spawnMonster(w, w.rngs.ai.pick(list), p.x, p.z, { dormant: false, aggro: true }); }
    }
    // Malison's third act: the bots ring the ropes. It may cheat.
    const stop = STOPS[this.i];
    if (stop === 'malison3' && w.boss?.m?.bossState?.phase === 2 && w.boss.m.hp > w.boss.m.maxHp * 0.24) w.boss.m.hp = w.boss.m.maxHp * 0.24;
    if (stop === 'bursar' && w.boss?.m && w.boss.m.hp < w.boss.m.maxHp * 0.4) w.boss.m.hp = w.boss.m.maxHp * 0.8;
    if (stop === 'malison2' && w.boss?.m && w.boss.m.hp < w.boss.m.maxHp * 0.3) w.boss.m.hp = w.boss.m.maxHp * 0.55;
    void killMonster;
  }
  update(dt) {
    const real = 1 / 60; this.age += real; this.t += real;
    if (this.phase === 'run' && this.t > STOP_T[STOPS[this.i]]) { this.phase = 'cover'; this.t = 0; this.ctx.engine.screen.cover('iris').catch?.(() => {}); }
    if (this.phase === 'cover' && this.t > 0.7) { this.next(); }
  }
  draw(ui, touchOnly) {
    const dw = ui.measure('DEMO') + 6; const dx = ui.W - 12 - dw; ui.rect(dx, 70, dw, 11, 'red'); ui.text(dx + 3, 72, 'DEMO', { color: 'white', shadow: false });
    if (Math.floor(this.age * 1.5) % 2 === 0) ui.textC(ui.W / 2, ui.H - 24, touchOnly ? 'CONTROLLER OR KEYBOARD REQUIRED' : 'PRESS ANY BUTTON', { color: 'sand' });
  }
}
