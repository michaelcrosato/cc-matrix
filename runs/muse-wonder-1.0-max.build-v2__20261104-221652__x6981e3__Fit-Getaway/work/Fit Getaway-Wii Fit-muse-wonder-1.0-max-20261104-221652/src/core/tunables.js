// Live tunables registry (PLAN section 10). Read every step by game code.
export const TUNABLE_DEFAULTS = {
  dotInstability: 0.6, dotAuthority: 3.0, dotDamping: 3.4, dotNoise: 0.8, dotLag: 0.08,
  ringScale: 1, gustForce: 1.6, mouseLeanRadius: 70,
  breathBonus: 0.55, repLag: 0.10, repFatigue: 0.10, repTempoScale: 1,
  stepWindow: 1, stepOffsetMs: 0, hoopLow: 0.9, hoopHigh: 2.4, hoopLiftRate: 0.35,
  headerInterval: 1.0, slackWalkInst: 2.6, trayGravity: 9.8, trayMaxTilt: 14, jogTargetCadence: 3, pierBoost: 2.14,
  dripRate: 1, starThresholdScale: 1, ageTrainingWeight: 0.5,
};
export const TUNABLE_TABS = [
  { name: 'Balance', keys: ['dotInstability','dotAuthority','dotDamping','dotNoise','dotLag','ringScale','gustForce','mouseLeanRadius'] },
  { name: 'Breath and reps', keys: ['breathBonus','repLag','repFatigue','repTempoScale'] },
  { name: 'Rhythm', keys: ['stepWindow','stepOffsetMs','hoopLow','hoopHigh','hoopLiftRate'] },
  { name: 'Games', keys: ['headerInterval','slackWalkInst','trayGravity','trayMaxTilt','jogTargetCadence','pierBoost'] },
  { name: 'Economy', keys: ['dripRate','starThresholdScale','ageTrainingWeight'] },
];
export function makeTunables() {
  const t = { ...TUNABLE_DEFAULTS };
  t.resetTab = (tab) => { for (const k of TUNABLE_TABS[tab].keys) t[k] = TUNABLE_DEFAULTS[k]; };
  t.resetAll = () => { Object.assign(t, TUNABLE_DEFAULTS); };
  t.changed = () => { const o = {}; for (const k of Object.keys(TUNABLE_DEFAULTS)) if (t[k] !== TUNABLE_DEFAULTS[k]) o[k] = t[k]; return o; };
  return t;
}
