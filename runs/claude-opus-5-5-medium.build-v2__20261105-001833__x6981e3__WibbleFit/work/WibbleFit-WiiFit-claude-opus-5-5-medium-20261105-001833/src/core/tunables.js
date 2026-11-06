// The live sliders. Code reads T.<key> every step, so a moved slider changes behaviour at once.
export const TUNABLE_TABS = ['Balance', 'Breath and reps', 'Rhythm', 'Games', 'Economy'];
const row = (key, tab, def, min, max, step, label) => ({ key, tab, def, min, max, step, label });
export const TUNABLES = [
  row('dotInstability', 'Balance', 0.6, 0, 3, 0.05, 'Instability'),
  row('dotAuthority', 'Balance', 3, 0.5, 8, 0.1, 'Authority'),
  row('dotDamping', 'Balance', 3.4, 0.5, 8, 0.1, 'Damping'),
  row('dotNoise', 'Balance', 0.8, 0, 3, 0.05, 'Sway noise'),
  row('dotLag', 'Balance', 0.08, 0.01, 0.5, 0.01, 'Input lag'),
  row('ringScale', 'Balance', 1, 0.4, 2, 0.05, 'Ring scale'),
  row('gustForce', 'Balance', 1.6, 0, 4, 0.1, 'Gust force'),
  row('mouseLeanRadius', 'Balance', 70, 20, 140, 5, 'Mouse radius'),
  row('breathBonus', 'Breath and reps', 0.55, 0, 1, 0.05, 'Breath calm'),
  row('repLag', 'Breath and reps', 0.1, 0.01, 0.5, 0.01, 'Rep lag'),
  row('repFatigue', 'Breath and reps', 0.1, 0, 0.5, 0.01, 'Rep fatigue'),
  row('repTempoScale', 'Breath and reps', 1, 0.5, 2, 0.05, 'Tempo scale'),
  row('stepWindow', 'Rhythm', 1, 0.5, 2, 0.05, 'Step window'),
  row('stepOffsetMs', 'Rhythm', 0, -200, 200, 5, 'Step offset ms'),
  row('hoopLow', 'Rhythm', 0.9, 0.2, 2, 0.05, 'Hoop low'),
  row('hoopHigh', 'Rhythm', 2.4, 1, 5, 0.1, 'Hoop high'),
  row('hoopLiftRate', 'Rhythm', 0.35, 0.05, 1, 0.05, 'Hoop lift'),
  row('headerInterval', 'Games', 1, 0.4, 2, 0.05, 'Header interval'),
  row('slackWalkInst', 'Games', 2.6, 0.6, 5, 0.1, 'Slack instability'),
  row('trayGravity', 'Games', 9.8, 2, 24, 0.2, 'Tray gravity'),
  row('trayMaxTilt', 'Games', 14, 4, 30, 1, 'Tray max tilt'),
  row('jogTargetCadence', 'Games', 3, 2, 4, 0.1, 'Jog cadence'),
  row('pierBoost', 'Games', 2.14, 1, 4, 0.02, 'Pier boost'),
  row('dripRate', 'Economy', 1, 0, 4, 0.1, 'Drip rate'),
  row('starThresholdScale', 'Economy', 1, 0.5, 1.5, 0.05, 'Star thresholds'),
  row('ageTrainingWeight', 'Economy', 0.5, 0, 2, 0.05, 'Age training'),
];
export const T = Object.fromEntries(TUNABLES.map((r) => [r.key, r.def]));
export const resetTunables = (tab = null) => { for (const r of TUNABLES) if (!tab || r.tab === tab) T[r.key] = r.def; };
export const changedTunables = () => Object.fromEntries(TUNABLES.filter((r) => T[r.key] !== r.def).map((r) => [r.key, T[r.key]]));
export const setTunable = (r, v) => { T[r.key] = Math.min(r.max, Math.max(r.min, Math.round(v / r.step) * r.step)); T[r.key] = +T[r.key].toFixed(4); };
