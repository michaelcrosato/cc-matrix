// Main: registers the scenes, the boot steps, the deep links (#match, #drill/passing, #attract, #story/ch3, #dev,
// #about, #records, #setup), the game.debug handle for tests and tools, and starts the game (or the AI Hub round).
(() => {
'use strict';
const E = My3D2dge, FF = window.FF, game = FF.game;
const scenes = FF.scenes;
const hash = (typeof location !== 'undefined' && location.hash || '').slice(1), [link, part] = hash.split('/');
FF.deepLink = { link, part };
// the HTML screens (pause, settings, controls, help, dev) at a 10-foot size, in the sports-broadcast theme
const shell = new E.Shell(game, { theme: { ink: '#f4f0e6', paper: 'rgba(14,16,34,.94)', accent: '#ffb02e', muted: '#a9a6c0', danger: '#ff6a5a', line: 'rgba(255,176,46,.35)', font: 'system-ui, sans-serif', titleFont: '"Arial Black", Impact, system-ui, sans-serif' },
  screens: { help: { title: 'Help', sections: () => FF.helpSections() } } });
void shell;
if (typeof document !== 'undefined' && document.head) {
  const st = document.createElement('style'); st.id = 'ff-tv';
  st.textContent = '.esh{font-size:clamp(17px,1.55vw,30px)!important}.esh .esh-mod{max-width:min(92vw,46em)!important}.esh button{min-height:2.3em!important;font-size:1em!important;padding:.35em .9em!important}.esh h2{font-size:1.7em!important}.esh .esh-row{min-height:2.4em}.esh input[type=range]{min-width:9em;height:1.4em}.esh .esh-k{font-size:.85em!important}';
  document.head.appendChild(st);
}
FF.helpSections = () => {
  const I = game.input, L = a => FF.glyph.text(I, a);
  return [['Offense', `Hike: ${L('b1')}. Throw: ${L('b1')} ${L('b2')} ${L('b3')} to receivers 1-3 (keyboard 1 2 3, or click a receiver), ${L('b4')} throws it away. Hold ${L('turbo')} for a Rocket Pass.`],
    ['Ball carrier', `Turbo ${L('turbo')}. Dive ${L('b1')}, stiff arm ${L('b2')}, spin ${L('b3')}, hurdle ${L('b4')}, lateral ${L('lb')} or ${L('rb')}. A star's special: ${L('lb')} + ${L('rb')}.`],
    ['Defense', `Switch to the man nearest the ball ${L('b2')} (or click him). Tackle ${L('b1')}; ${L('turbo')} + ${L('b1')} is a Big Hit. Strip ${L('b3')}, jump ${L('b4')}. After the whistle ${L('b1')} is a late hit.`],
    ['Kicking', `Aim with the stick or arrows, then ${L('b1')} three times: start, power, accuracy. A click works too.`],
    ['Play calling', `${L('b1')} picks a card, ${L('b3')} flips it, ${L('b4')} opens your Fiasco Cards, ${L('lb')}/${L('rb')} change tabs.`],
    ['Fiasco rules', '7 on 7. 4 downs to gain 20 yards. Late hits allowed. Laterals any time. Every disaster fills your Fiasco Meter; a full meter deals you a Fiasco Card.']];
};
// the debug handle (tests, tools/check.mjs)
game.debug = {
  snapshot() {
    const m = FF.match, s = { scene: game.sceneName, errors: game.errors.length, version: FF.version };
    if (m && (game.sceneName === 'match' || game.sceneName === 'drill' || game.sceneName === 'attract')) Object.assign(s, { mode: m.mode, phase: m.phase, clock: Math.round(m.clock), quarter: m.quarter, score: m.score.slice(), down: m.down, toGo: m.toGo, poss: m.poss, los: Math.round(m.los), ball: { state: m.ball.state, x: Math.round(m.ball.x), y: Math.round(m.ball.y), holder: m.ball.holder && m.ball.holder.name }, onField: m.on.length, events: FF.bus.log.slice(-10).map(e => e.ev) });
    if (FF.attract && game.sceneName === 'attract') s.segment = FF.attract.seg && FF.attract.seg.id;
    if (game.sceneName === 'menu' && FF.menuDebug) s.menu = FF.menuDebug();
    return s;
  },
  scenario(spec) { game.go('match', { spec }, { fade: 0 }); },
  cheat(name, on = true) { if (FF.match) FF.match.cheats[name] = on; },
  finishGame(w) { if (FF.match) FF.match.finishNow(w); },
  setClock(s) { if (FF.match) FF.match.clock = s; },
  setScore(h, a) { if (FF.match) FF.match.score = [h, a]; },
  giveCard(side, id) { if (FF.match && FF.match.cards[side].length < 3) FF.match.cards[side].push(id); },
  fast(on) { FF.fast = !!on; }
};
const start = () => {
  if (FF.inHub) return 'hubcard';
  if (link === 'match') return 'match';
  if (link === 'attract') return 'attract';
  if (['about', 'records', 'setup', 'menu', 'practice'].includes(link)) return link;
  if (link === 'drill' && scenes.drill) return 'drill';
  if (link === 'story' && scenes.story) return 'story';
  return 'title';
};
const first = start();
const data = first === 'match' ? { spec: { mode: 'exhibition', home: part || 'fiascos', away: 'mudhogs', humans: { 0: [0], 1: [] }, start: 'kickoff' } } : first === 'drill' ? { id: part || 'cones' } : first === 'story' ? { chapter: part } : undefined;
game.start({ scenes, scene: first, data,
  boot: { title: 'AMERICAN FOOTBALL FIASCO', version: FF.version, messages: ['Painting the yard lines', 'Inflating the footballs', 'Teaching the mascot to dance', 'Hiding the bulldozer', 'Waking the announcers', 'Pickling the pickles'],
    steps: [['Lacing the cleats', () => { FF.touchOnly.init(); }], ['Building the stadium', () => { if (!FF.headless) FF.stage().st.paint(); }], ['Loading the playbook', () => { FF.anim && FF.anim(); }], ['Saves and records', () => { FF.story && FF.story.wire(); }]] } });
if (link === 'dev' && FF.dev) game.after(.5, () => FF.dev.open());
})();
