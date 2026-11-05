/* ---- START: wiring, the boot steps, deep links (tests and tools), game.debug and window.__game ---- */
T.load();
Boom.wire(); Fx.wire(); Talk.wire(); Hud.wire(); Objectives.wire(); Records.wire(); Drills.wire(); Items.wire();
const BOOT_STEPS = [
  ["Flooding the Ol' Icebox", () => { Rink.build('icebox', 'muskrats'); }],
  ['Tuning the organ', () => { Synth.SONGS; }],
  ['Lacing the skates', () => { for (const id of TEAM_ORDER) for (const k of [16, 24]) Logo.canvasOf(id, k); }],
  ['Checking the rule book', () => { Story.validate(); }],
  ['Reading the scoresheet', () => { Save.load(); }]
];
/** deep links (5.1): #attract, #story/<1-5>, #cutscene/<id>, #match/<home>/<away>/<arena>, #fight, #kaboom, #shootout,
 *  #flood, #practice/<1-7>, #results, #about, #records, #credits, #lab, #dev, #title */
function deepLink() {
  if (HUB || typeof location === 'undefined') return null;
  const h = (location.hash || '').slice(1).split('/'), k = h[0];
  if (!k) return null;
  if (k === 'attract') return ['attract', null];
  if (k === 'story') return ['storymap', { chapter: +h[1] || 1 }];
  if (k === 'cutscene') return ['cutscene', { id: h[1] || 'ch1-pre', then: 'title' }];
  if (k === 'match') return ['match', { cfg: Setup.quickCfg({ home: h[1], away: h[2], arena: h[3] }) }];
  if (k === 'fight' || k === 'kaboom' || k === 'shootout') return ['match', { cfg: Setup.quickCfg({ warp: k }) }];
  if (k === 'flood') return ['flood', { from: 'title', ask: false, auto: false }];
  if (k === 'practice') return ['practice', { drill: +h[1] || 1 }];
  if (k === 'results') return ['results', { demo: true }];
  if (k === 'dev') return ['match', { cfg: Setup.quickCfg({ dev: true }) }];
  if (scenes[k]) return [k, null];
  return null;
}
const link = deepLink();
const touchOnly = () => !NODE && typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches && !Title.sawPad && !Title.sawKey;
game.start({ scenes, scene: HUB ? 'session' : link ? link[0] : 'title', data: link ? link[1] : undefined, boot: { title: 'ICE HOC-KABOOM', version: VERSION, steps: BOOT_STEPS, messages: ['Sharpening the skates', 'Taping the sticks', 'Warming up the organ', 'Hiding the octopus', 'Gassing up the Flood Wagon'] } });
game.debug = {
  snapshot() {
    const m = Match.m;
    return {
      scene: game.sceneName, mode: m ? m.cfg.mode : null, phase: m ? m.phase : null, period: m ? m.period : 0, clock: m ? +m.clock.toFixed(2) : 0,
      score: m ? [m.teams[0].score, m.teams[1].score] : null, shots: m ? [m.teams[0].shots, m.teams[1].shots] : null,
      puck: m ? { x: Math.round(m.puck.x), y: Math.round(m.puck.y), z: Math.round(m.puck.z), owner: m.puck.owner ? m.puck.owner.id : -1 } : null,
      skaters: m ? m.skaters.map(s => ({ id: s.id, team: s.team, x: Math.round(s.x), y: Math.round(s.y), state: s.state, ctrl: s.ctrl.kind })) : [],
      goalies: m ? m.goalies.map(g => ({ x: Math.round(g.x), y: Math.round(g.y), state: g.state })) : [],
      boom: m ? m.boom.map(Math.round) : null, kaboom: m ? m.kaboom.map(v => +v.toFixed(1)) : null, fight: m && m.fight ? { a: m.fight.a, b: m.fight.b } : null,
      items: m ? m.items.map(i => i.kind) : [], sinBin: m ? m.skaters.filter(s => s.state === 'bin').map(s => ({ id: s.id, t: +s.binT.toFixed(1) })) : [],
      story: { chapter: Story.chapter, stars: Save.totalStars(), step: Story.step }, attract: Attract.state(), dev: { open: Dev.isOpen() }, net: Net.state(), errors: game.errors.length
    };
  },
  warp: (target, o) => Dev.warp(target, o), set: (k, v) => T.set(k, v), cheat: (name, on) => Dev.cheat(name, on), event: (type, data) => Bus.emit(type, data), seed: n => RNG.seed(n)
};
game.stateHash = () => { const m = Match.m; if (!m) return [game.sceneName]; return [m.phase, m.period, Math.round(m.clock * 10), m.teams[0].score, m.teams[1].score, Math.round(m.puck.x), Math.round(m.puck.y), ...m.skaters.map(s => Math.round(s.x) * 1000 + Math.round(s.y))]; };
if (typeof window !== 'undefined') window.__game = { game, scenes, Match, T, Dev, Net, STORY, Story, Save, Records, Rink, TEAMS, ARENAS, Attract, Setup, Drills, Bus, UI, Glyphs, Synth, Replay, Cam, Hud, Talk, Fight, Items, Boom, Skater, Puck, Goalie, AI, Shots, RNG, Logo, Flood, Title, touchOnly, TEXT, ABOUT, FEEDBACK, Objectives, Items2, ITEM_DEFS, Lab, Crowd, World, INTERVIEW, CAST, SPEAKERS, Cutscene };
