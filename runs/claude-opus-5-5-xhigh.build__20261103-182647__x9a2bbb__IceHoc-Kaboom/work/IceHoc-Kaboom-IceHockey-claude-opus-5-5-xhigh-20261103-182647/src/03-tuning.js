/* ---- T: every tunable number (Appendix A). Each row is a live Dev slider: [group, key, default, min, max, step, label].
 * T.key reads the live value; T.reset(key), T.resetAll(); saved in E.store('dev:tuning'). aiSkillHome / aiSkillAway
 * below 0 mean "by difficulty" ---- */
const T = (() => {
  const ROWS = [
    ['Skating', 'skateMax', 132, 80, 200, 1, 'Top speed (u/s, rating 3)'], ['Skating', 'skateAccel', 300, 120, 600, 5, 'Acceleration'],
    ['Skating', 'iceGlide', 28, 0, 120, 1, 'Coasting deceleration'], ['Skating', 'turnSlow', 5, 1, 10, .1, 'Turn rate, slow (rad/s)'],
    ['Skating', 'turnFast', 2.6, 1, 10, .1, 'Turn rate, top speed'], ['Skating', 'edgeGrip', 6, 1, 20, .5, 'Edge grip (sideways decay)'],
    ['Skating', 'stopDecel', 700, 300, 1400, 10, 'Hockey-stop deceleration'], ['Skating', 'turboMul', 1.45, 1, 2, .01, 'Turbo speed factor'],
    ['Skating', 'turboDrain', .45, 0, 2, .01, 'Turbo drain /s'], ['Skating', 'turboRegen', .18, 0, 2, .01, 'Turbo regen /s'],
    ['Puck & Passing', 'puckFriction', 26, 0, 80, 1, 'Puck friction'], ['Puck & Passing', 'puckDrag', .12, 0, .5, .01, 'Puck drag'],
    ['Puck & Passing', 'boardBounce', .62, .2, 1, .01, 'Boards restitution'], ['Puck & Passing', 'pickupRadius', 8, 4, 16, .5, 'Blade pickup radius'],
    ['Puck & Passing', 'passMin', 240, 150, 600, 5, 'Pass speed min'], ['Puck & Passing', 'passMax', 420, 150, 600, 5, 'Pass speed max'],
    ['Puck & Passing', 'saucerApex', 10, 4, 24, .5, 'Saucer apex'],
    ['Shooting', 'wristSpeed', 345, 200, 500, 5, 'Wrist shot speed'], ['Shooting', 'slapBase', 380, 200, 600, 5, 'Slapshot base'],
    ['Shooting', 'slapGain', 160, 0, 400, 5, 'Slapshot charge gain'], ['Shooting', 'slapCharge', .9, .3, 2, .05, 'Seconds to full charge'],
    ['Shooting', 'oneTimerBonus', 1.15, 1, 1.6, .01, 'One-timer factor'], ['Shooting', 'shotError', 1, 0, 3, .05, 'Shot error scale'],
    ['Goalies', 'goalieReact', .16, .05, .4, .005, 'Base reaction (s)'], ['Goalies', 'goalieLateral', 150, 60, 300, 5, 'Lateral speed'],
    ['Goalies', 'goalieReach', 1, .6, 1.6, .01, 'Save-shape scale'], ['Goalies', 'gloveCatch', .55, 0, 1, .01, 'Glove freeze chance'],
    ['Goalies', 'reboundSpeed', .35, 0, .8, .01, 'Rebound factor'], ['Goalies', 'kaboomBlast', .6, 0, 1, .01, 'Kaboom blast carries in'],
    ['Hitting', 'checkPower', 1, .3, 3, .05, 'Check impulse scale'], ['Hitting', 'knockdown', 185, 60, 300, 5, 'Big-hit threshold'],
    ['Hitting', 'glassCrack', 170, 80, 400, 5, 'Glass crack speed'], ['Hitting', 'glassShatter', 240, 80, 400, 5, 'Glass shatter speed'],
    ['Hitting', 'accidentalHit', 180, 80, 400, 5, 'Knockdown with no check'],
    ['AI', 'aiSkillHome', -.05, -.05, 1, .05, 'Home AI skill (<0: by difficulty)'], ['AI', 'aiSkillAway', -.05, -.05, 1, .05, 'Away AI skill (<0: by difficulty)'],
    ['AI', 'aiAggression', .5, 0, 1, .05, 'Check vs poke'], ['AI', 'aiItemGreed', 120, 0, 300, 5, 'Item detour range'],
    ['AI', 'aiShootRange', 200, 80, 400, 5, 'Shooting zone'],
    ['BOOM & Items', 'boomGain', .8, 0, 4, .05, 'All BOOM gains'], ['BOOM & Items', 'kaboomTime', 15, 5, 40, 1, 'KABOOM seconds'],
    ['BOOM & Items', 'itemEvery', 35, 8, 120, 1, 'Mean seconds between throws'],
    ['Fights', 'fightBalance', 100, 40, 200, 5, 'Fighter balance'], ['Fights', 'fightGrudge', 40, 0, 100, 1, 'Prompt threshold'],
    ['Fights', 'fightMax', 3, 0, 10, 1, 'Fights per game'], ['Fights', 'sinBin', 20, 5, 60, 1, 'Sin bin seconds'],
    ['Match', 'periodLen', 120, 30, 300, 5, 'Exhibition period (s)'], ['Match', 'gameSpeed', 1, .25, 2, .05, 'Game speed'],
    ['Match', 'crowdHype', 1, 0, 2, .05, 'Crowd reaction scale']
  ];
  const T = {}, def = {}, meta = ROWS.map(([group, key, value, min, max, step, label]) => ({ group, key, value, min, max, step, label }));
  for (const m of meta) { def[m.key] = m.value; T[m.key] = m.value; }
  const save = () => { const out = {}; for (const k in def) if (T[k] !== def[k]) out[k] = T[k]; E.store.set('dev:tuning', out); };
  Object.defineProperties(T, {
    meta: { value: meta }, def: { value: def },
    set: { value(k, v) { const m = meta.find(x => x.key === k); if (!m) return; T[k] = clamp(+v, m.min, m.max); if (k === 'gameSpeed') game.timeScale = T[k]; save(); } },
    reset: { value(k) { if (k in def) { T[k] = def[k]; if (k === 'gameSpeed') game.timeScale = 1; save(); } } },
    resetAll: { value() { for (const k in def) T[k] = def[k]; game.timeScale = 1; save(); } },
    load: { value() { if (HUB) return; const s = E.store.get('dev:tuning', {}) || {}; for (const k in s) if (k in def && typeof s[k] === 'number') T[k] = s[k]; } },
    changed: { value() { const out = {}; for (const k in def) if (T[k] !== def[k]) out[k] = T[k]; return out; } }
  });
  return T;
})();
