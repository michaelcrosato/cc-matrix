// The attract mode's segments: a loop of about 100 seconds that shows as much of the game as it can. Each gameplay
// segment is a scenario with forced play calls and the cheats it needs (the attract AI may cheat freely); `expect` is the
// event each one must show (the attract test checks it).
(() => {
'use strict';
const FF = window.FF;
FF.data.attract = [
  { id: 'logo', kind: 'logo', dur: 3, caption: 'AMERICAN FOOTBALL FIASCO' },
  { id: 'kickoff', kind: 'match', dur: 9, caption: 'THE KICKOFF RETURN', expect: 'fielded',
    spec: { home: 'fiascos', away: 'mudhogs', stadium: 'tumbleweed', start: { possession: 'away', los: 30, kickoff: true } }, calls: { 1: 'ko_deep', 0: 'ret_mid' }, cheats: { godMode: true }, cheatSide: 0 },
  { id: 'playcall', kind: 'playcall', dur: 4, caption: 'CALL THE PLAY', spec: { home: 'fiascos', away: 'mudhogs', stadium: 'tumbleweed', start: { possession: 'home', los: 55 }, cards: { 0: ['HOT_SAUCE'], 1: ['MEGA_HIT'] } }, expect: 'called' },
  { id: 'blazing', kind: 'match', dur: 11, caption: 'BLAZING!', expect: 'td',
    spec: { home: 'fiascos', away: 'mudhogs', stadium: 'tumbleweed', start: { possession: 'home', los: 60 } }, calls: { 0: 'deep_post', 1: 'cover2' }, cheats: { forceCatch: true, godMode: true, perfectPass: true }, cheatSide: 0, hot: ['QB', 'WR1'], replay: true },
  { id: 'mud', kind: 'match', dur: 8, caption: 'THE MUD BOWL', expect: 'fumble',
    spec: { home: 'mudhogs', away: 'fiascos', stadium: 'hogwallow', start: { possession: 'home', los: 45 } }, calls: { 0: 'hb_dive', 1: 'lb_blitz' }, cheats: { forceFumble: true, both: true } },
  { id: 'kickcam', kind: 'match', dur: 7, caption: 'THE KICK CAM', expect: 'doink',
    spec: { home: 'mudhogs', away: 'fiascos', stadium: 'hogwallow', start: { possession: 'away', los: 65, down: 4 } }, calls: { 1: 'field_goal', 0: 'fg_block' }, forceKick: { power: 1, acc: .36 }, doinkIn: true },
  { id: 'picksix', kind: 'match', dur: 9, caption: 'PICK SIX', expect: 'int',
    spec: { home: 'owls', away: 'fiascos', stadium: 'afterglow', night: true, start: { possession: 'home', los: 40 } }, calls: { 0: 'slants', 1: 'man' }, cheats: { forceINT: true, godMode: true }, cheatSide: 1, lateHit: true, refDown: true },
  { id: 'mascot', kind: 'match', dur: 7, caption: 'MASCOT MAYHEM', expect: 'mascotOn',
    spec: { home: 'owls', away: 'fiascos', stadium: 'afterglow', night: true, start: { possession: 'away', los: 40 } }, calls: { 1: 'deep_post', 0: 'cover2' }, mascot: 0, slowQB: true },
  { id: 'lights', kind: 'match', dur: 6, caption: 'LIGHTS OUT', expect: 'lightsOut',
    spec: { home: 'owls', away: 'fiascos', stadium: 'afterglow', night: true, start: { possession: 'away', los: 45 } }, calls: { 1: 'hb_sweep', 0: 'cover2' }, lightsOut: true },
  { id: 'snowplow', kind: 'match', dur: 7, caption: 'SNOWPLOW', expect: 'special',
    spec: { home: 'yetis', away: 'fiascos', stadium: 'frostbite', start: { possession: 'away', los: 40 } }, calls: { 1: 'deep_post', 0: 'lb_blitz' }, special: ['DE1', 0], slowQB: true },
  { id: 'story', kind: 'snippet', dur: 7, caption: 'THE FIASCO CUP', expect: 'story', who: 'brock', lines: ['I\'ve got a golden arm, a golden helmet, and a golden future.', 'You\'ve got... pickles.'] },
  { id: 'halftime', kind: 'show', dur: 6, caption: 'THE HALFTIME SHOW', expect: 'halftime', spec: { home: 'dynasty', away: 'fiascos', stadium: 'megadome', start: { possession: 'home', los: 30 } } },
  { id: 'seismic', kind: 'match', dur: 7, caption: 'SEISMIC SACK', expect: 'seismic',
    spec: { home: 'dynasty', away: 'fiascos', stadium: 'megadome', start: { possession: 'away', los: 40 } }, calls: { 1: 'deep_post', 0: 'lb_blitz' }, special: ['LB1', 0], slowQB: true },
  { id: 'champions', kind: 'champions', dur: 6, caption: 'CHAMPIONS!', expect: 'champions' },
  { id: 'records', kind: 'records', dur: 5, caption: 'HALL OF FIASCO', expect: 'records' },
  { id: 'title', kind: 'title', dur: 5, caption: '', expect: 'title' }
];
})();
