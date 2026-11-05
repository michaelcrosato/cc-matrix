/* TUNING: the gameplay variables the dev mode exposes as live sliders (Pause → Dev Mode → Tuning), with their defaults,
 * ranges and a reset. Values persist in localStorage 's7:dev' (never in an AI Hub session). The sim reads T.key. */
const TUNING = S7.TUNING = {
  walkSpeed:     { def: 85,   min: 40,  max: 200, step: 5,    label: 'Walk speed',            fmt: v => v + ' u/s' },
  skiTop:        { def: 190,  min: 100, max: 400, step: 10,   label: 'Ski top speed',         fmt: v => v + ' u/s' },
  padSensK:      { def: 1,    min: .5,  max: 2,   step: .05,  label: 'Aim sensitivity (pad)', fmt: v => v.toFixed(2) + '×' },
  assistK:       { def: 1,    min: 0,   max: 1,   step: .05,  label: 'Aim assist strength',   fmt: v => Math.round(v * 100) + '%' },
  enemySpeed:    { def: 1,    min: .3,  max: 2,   step: .05,  label: 'Enemy speed ×',         fmt: v => v.toFixed(2) },
  enemyHP:       { def: 1,    min: .2,  max: 3,   step: .05,  label: 'Enemy HP ×',            fmt: v => v.toFixed(2) },
  playerDamage:  { def: 1,    min: .2,  max: 3,   step: .05,  label: 'Player damage ×',       fmt: v => v.toFixed(2) },
  warmRadius:    { def: 1,    min: .5,  max: 2.5, step: .05,  label: 'Warm spot radius ×',    fmt: v => v.toFixed(2) },
  scanRadius:    { def: 40,   min: 10,  max: 80,  step: 1,    label: 'Scan radius',           fmt: v => v + ' m' },
  revealTime:    { def: 6,    min: 1,   max: 15,  step: .5,   label: 'Reveal time',           fmt: v => v.toFixed(1) + ' s' },
  spawnRate:     { def: 1,    min: .3,  max: 2,   step: .05,  label: 'Spawn rate ×',          fmt: v => v.toFixed(2) },
  explodeDamage: { def: 1,    min: 0,   max: 3,   step: .05,  label: 'Explosion damage ×',    fmt: v => v.toFixed(2) },
  redDrop:       { def: 1,    min: 0,   max: 3,   step: .05,  label: 'Red drop ×',            fmt: v => v.toFixed(2) },
  rimeDrop:      { def: 1,    min: 0,   max: 3,   step: .05,  label: 'Rime drop ×',           fmt: v => v.toFixed(2) },
  healRate:      { def: 40,   min: 10,  max: 200, step: 5,    label: 'Heal rate',             fmt: v => v + ' HP/s' },
  timeScale:     { def: 1,    min: .1,  max: 2,   step: .05,  label: 'Time scale',            fmt: v => v.toFixed(2) + '×' },
  celBands:      { def: 3,    min: 2,   max: 8,   step: 1,    label: 'Cel bands',             fmt: v => String(v) },
  inkStrength:   { def: 1,    min: 0,   max: 1.5, step: .05,  label: 'Ink strength',          fmt: v => v.toFixed(2) },
  fogFar:        { def: 1,    min: .3,  max: 3,   step: .05,  label: 'Fog far ×',             fmt: v => v.toFixed(2) }
};
const T = S7.T = {};
const CHEATS = S7.CHEATS = {
  god:      { label: 'God mode' },
  infRed:   { label: 'Infinite Red' },
  oneHit:   { label: 'One-hit kills' },
  revealAll:{ label: 'Reveal all' },
  ghost:    { label: 'Ghost through gates' },
  allPersonas: { label: 'All personas' },
  showRails: { label: 'Show rails and nodes' },
  showHits: { label: 'Show hit volumes and warm spots' },
  showShots: { label: 'Show camera shots' },
  freeCam:  { label: 'Free camera' },
  hideHud:  { label: 'Hide HUD' },
  slowCrit: { label: 'Slow motion on crits' },
  showFps:  { label: 'Show FPS and sim hash' }
};
const CHEAT = S7.CHEAT = {};
S7.tuningReset = (keys) => { for (const k of keys || Object.keys(TUNING)) T[k] = TUNING[k].def; S7.tuningSave(); };
S7.cheatsReset = () => { for (const k in CHEATS) CHEAT[k] = false; S7.tuningSave(); };
S7.tuningSave = () => { if (S7.noPersist) return; S7.storeSet('s7:dev', { T, CHEAT }); };
S7.tuningLoad = () => {
  S7.tuningReset(); S7.cheatsReset();
  if (S7.noPersist) return;
  const d = S7.storeGet('s7:dev', null);
  if (d && d.T) for (const k in d.T) if (TUNING[k] && typeof d.T[k] === 'number') T[k] = clamp(d.T[k], TUNING[k].min, TUNING[k].max);
  if (d && d.CHEAT) for (const k in d.CHEAT) if (CHEATS[k]) CHEAT[k] = !!d.CHEAT[k];
};
S7.tuningReset(); S7.cheatsReset();

/* ---- difficulty (§7.25): the player's setting, changeable mid-game ---- */
const DIFF = S7.DIFF = {
  bunny:   { label: 'BUNNY HILL', line: 'Slower Whiteouts, softer blows, longer reveals.', dmg: .5, speed: .85, reveal: 1.5, red: 1.3, assist: 'high', avalanche: .85 },
  piste:   { label: 'PISTE', line: 'The mountain as it was meant to be skied.', dmg: 1, speed: 1, reveal: 1, red: 1, assist: 'low', avalanche: 1 },
  offpiste:{ label: 'OFF-PISTE', line: 'Faster, harder, darker. No assist.', dmg: 1.5, speed: 1.15, reveal: .7, red: .8, assist: 'off', avalanche: 1.1 }
};
