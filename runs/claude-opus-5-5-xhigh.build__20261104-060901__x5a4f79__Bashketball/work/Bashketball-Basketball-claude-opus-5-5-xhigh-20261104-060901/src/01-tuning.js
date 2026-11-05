/* 01-tuning: the single home of the important numbers. Every one is a live dev slider (PLAN Appendix A); systems read
 * tune(key) every time, so a change shows at once. resetTuning() restores the defaults. */
const TUNING = {};
const TUNE_GROUPS = ['Movement', 'Shooting', 'Dunks & Blocks', 'Defense', 'Supernova', 'CPU', 'Match', 'Physics', 'Courts'];
[
  ['Movement', 'runSpeed', 'Run speed', 108, 60, 160, 1, 'Units a second before ZOOM'],
  ['Movement', 'accel', 'Acceleration', 900, 300, 2000, 10, 'How fast a player reaches full speed'],
  ['Movement', 'turboMult', 'Turbo speed', 1.5, 1, 2.2, .05, 'Speed times this while turbo is held'],
  ['Movement', 'turboDrain', 'Turbo drain', .3, .05, .8, .01, 'Turbo used a second, held and moving'],
  ['Movement', 'turboRefill', 'Turbo refill', .2, .05, .8, .01, 'Turbo back a second, not held'],
  ['Movement', 'turboRefillDelay', 'Refill delay', .35, 0, 1.5, .05, 'Seconds before turbo refills'],
  ['Movement', 'playerGravity', 'Player gravity', 900, 500, 1500, 10, 'How fast jumps come down'],
  ['Movement', 'jumpShotVz', 'Jump speed', 250, 150, 400, 5, 'Takeoff speed before SWAT'],
  ['Shooting', 'shotSkill', 'Shot skill', 1, .4, 1.6, .02, 'Times every make chance'],
  ['Shooting', 'threeSkill', 'Three skill', 1, .4, 1.6, .02, 'Times three-point chances'],
  ['Shooting', 'perfectWindow', 'Perfect window', .1, .03, .3, .01, 'Seconds, centred on the top of the jump'],
  ['Shooting', 'perfectBonus', 'Perfect bonus', .15, 0, .4, .01, 'Extra chance for a PERFECT release'],
  ['Shooting', 'badReleasePenalty', 'Bad release', .3, 0, .6, .01, 'Chance lost early or late'],
  ['Shooting', 'contestPenalty', 'Contest penalty', .4, 0, .8, .01, 'Chance lost to a hand in the face'],
  ['Shooting', 'shotArc', 'Shot arc', 1, .6, 1.6, .05, 'Times the height of a jumper'],
  ['Dunks & Blocks', 'dunkRange', 'Dunk range', 150, 60, 300, 5, 'From the rim, before SLAM'],
  ['Dunks & Blocks', 'dunkGravity', 'Dunk gravity', 520, 300, 900, 10, 'Lower floats longer'],
  ['Dunks & Blocks', 'dunkApex', 'Dunk height', 1, .5, 2, .05, 'Times the leap above the slam'],
  ['Dunks & Blocks', 'dunkHang', 'Dunk hang time', 1, .5, 2, .05, 'Times the flight time'],
  ['Dunks & Blocks', 'dunkSlowMo', 'Dunk slow motion', .45, .1, 1, .05, 'Time scale at the apex (1 = off)'],
  ['Dunks & Blocks', 'blockReach', 'Block reach', 14, 6, 30, 1, 'Before SWAT'],
  ['Dunks & Blocks', 'blockChance', 'Block chance', 1, 0, 2, .05, 'Times every block chance'],
  ['Dunks & Blocks', 'shatterChance', 'Shatter chance', 1, 0, 5, .1, 'Times every shatter chance'],
  ['Defense', 'stealChance', 'Steal chance', .3, 0, .9, .01, 'Base chance per swipe'],
  ['Defense', 'stealReach', 'Steal reach', 18, 8, 36, 1, 'Units'],
  ['Defense', 'stealCooldown', 'Steal cooldown', .6, .1, 2, .05, 'Seconds between swipes'],
  ['Defense', 'shoveForce', 'Shove force', 220, 60, 500, 5, 'How far a shove sends them'],
  ['Defense', 'shoveCost', 'Shove cost', .25, 0, .8, .01, 'Turbo a shove uses'],
  ['Defense', 'shoveCooldown', 'Shove cooldown', 1, .2, 3, .05, 'Seconds between shoves'],
  ['Defense', 'shoveFumble', 'Shove fumble', .6, 0, 1, .01, 'Chance a shoved handler drops it'],
  ['Defense', 'knockdownTime', 'Knockdown time', .8, .2, 2, .05, 'Seconds on the floor'],
  ['Defense', 'spinCost', 'Spin cost', .2, 0, .6, .01, 'Turbo a spin move uses'],
  ['Defense', 'spinCooldown', 'Spin cooldown', 1.5, .3, 4, .05, 'Seconds between spins'],
  ['Supernova', 'novaBaskets', 'Baskets to ignite', 3, 2, 6, 1, 'In a row, unanswered'],
  ['Supernova', 'novaMaxBaskets', 'Nova baskets', 4, 1, 10, 1, 'More baskets before it ends'],
  ['Supernova', 'novaTime', 'Nova time', 40, 10, 120, 1, 'Seconds of game clock'],
  ['Supernova', 'novaShotBonus', 'Nova shot bonus', .25, 0, .6, .01, 'Added to every shot'],
  ['CPU', 'cpuSkill', 'CPU skill', 0, -.5, .5, .05, 'Offset on decision quality'],
  ['CPU', 'cpuReaction', 'CPU reaction', 1, .25, 3, .05, 'Times reaction delays'],
  ['CPU', 'cpuAggression', 'CPU aggression', 1, 0, 2, .05, 'Times steal and shove rates'],
  ['CPU', 'comeback', 'Comeback assist', .35, 0, 1, .05, 'Help for the team behind'],
  ['Match', 'quarterLength', 'Quarter length', 120, 20, 300, 5, 'Seconds (this match)'],
  ['Match', 'shotClock', 'Shot clock', 20, 8, 30, 1, 'Seconds'],
  ['Match', 'gameSpeed', 'Game speed', 1, .5, 1.5, .05, 'Time scale outside effects'],
  ['Match', 'fatigue', 'Fatigue', 1, 0, 3, .1, 'Times juice loss'],
  ['Physics', 'ballGravity', 'Ball gravity', 760, 400, 1200, 10, ''],
  ['Physics', 'ballBounce', 'Floor bounce', .62, .3, .9, .01, ''],
  ['Physics', 'rimBounce', 'Rim bounce', .45, .2, .8, .01, ''],
  ['Physics', 'boardBounce', 'Board bounce', .55, .2, .9, .01, ''],
  ['Courts', 'powerupInterval', 'Power-up every', 22, 6, 60, 1, 'Seconds'],
  ['Courts', 'hazardInterval', 'Twist timers', 1, .25, 4, .05, 'Times every twist timer'],
  ['Courts', 'windStrength', 'Wind strength', 140, 0, 300, 5, 'At full gust'],
  ['Courts', 'jackpotBonus', 'Jackpot bonus', 2, 0, 5, 1, 'Points']
].forEach(([group, key, label, d, min, max, step, help]) => { TUNING[key] = { key, group, label, v: d, def: d, min, max, step, help }; });
function tune(key) { const t = TUNING[key]; return t ? t.v : 0; }
function setTune(key, v) { const t = TUNING[key]; if (!t) return; t.v = clamp(Math.round(v / t.step) * t.step, t.min, t.max); t.v = +t.v.toFixed(4); }
function resetTuning(key) { for (const t of Object.values(TUNING)) if (!key || t.key === key) t.v = t.def; }
function loadTuning() { const saved = store.get('bb:tuning', null); if (saved) for (const k in saved) if (TUNING[k]) { TUNING[k].def = saved[k]; TUNING[k].v = saved[k]; } }
function saveTuningDefaults() { const o = {}; for (const t of Object.values(TUNING)) { o[t.key] = t.v; t.def = t.v; } store.set('bb:tuning', o); }
function tuningJSON() { const o = {}; for (const t of Object.values(TUNING)) o[t.key] = t.v; return JSON.stringify(o); }
const FACTORY = {}; for (const t of Object.values(TUNING)) FACTORY[t.key] = t.def;
