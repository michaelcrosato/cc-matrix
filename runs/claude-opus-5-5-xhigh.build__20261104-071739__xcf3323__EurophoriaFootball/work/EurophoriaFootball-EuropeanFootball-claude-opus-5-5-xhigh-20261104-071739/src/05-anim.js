/* ANIMATION (section 8.3): the football kick specs (the engine's attack specs: wind, strike, recover), the clip library
 * (mocap clips through Mocap.drive), and the rig state each footballer's look becomes. Procedural moves (dives,
 * headers, bicycle kicks, launches) are body tilts set by the simulation (engine change 3). */
EF.KICKS = (() => {
  const K = {
    touch: { spec: { rel: true, kick: true, a0: .2, a1: 0, z0: .08, z1: .12, reach: 4 }, wind: .03, active: .04, recover: .08 },
    pass: { spec: { rel: true, kick: true, a0: .6, a1: -.1, z0: .15, z1: .2, reach: 6, twist: .4 }, wind: .08, active: .08, recover: .16 },
    shot: { spec: { rel: true, kick: true, a0: .05, a1: 0, z0: .3, z1: 1.1, reach: 7, lean: -.25, lunge: 2 }, wind: .1, active: .1, recover: .26 },
    shotHard: { spec: { rel: true, kick: true, a0: .05, a1: 0, z0: .3, z1: 1.4, reach: 7.5, lean: -.35, lunge: 2.5, hop: 1 }, wind: .12, active: .1, recover: .32, clip: '10_02' },
    chip: { spec: { rel: true, kick: true, a0: .1, a1: 0, z0: .1, z1: 1.4, reach: 5.5, lean: -.4 }, wind: .08, active: .08, recover: .2 },
    volley: { spec: { rel: true, kick: true, a0: .4, a1: -.2, z0: .9, z1: 1.2, reach: 7, hop: 2, lean: -.4, twist: .6 }, wind: .06, active: .08, recover: .24 },
    header: { spec: { rel: true, kick: false, hand: 'both', a0: 1.2, a1: 1.2, z0: -8, z1: -8, reach: 2, blade: 0, lean: .5 }, wind: .05, active: .08, recover: .2 },
    bicycle: { spec: { rel: true, kick: true, a0: .1, a1: 0, z0: 2.2, z1: 1.5, reach: 6 }, wind: .08, active: .1, recover: .25 },
    poke: { spec: { rel: true, kick: true, a0: .3, a1: 0, z0: .1, z1: .1, reach: 7.5, lunge: 3 }, wind: .05, active: .08, recover: .15 },
    stepover: { spec: { rel: true, kick: true, a0: .9, a1: -.3, z0: .2, z1: .25, reach: 5 }, wind: .05, active: .12, recover: .16 },
    rainbow: { spec: { rel: true, kick: true, a0: 3, a1: 2.6, z0: .1, z1: 1.3, reach: 4 }, wind: .08, active: .12, recover: .2 },
    penalty: { spec: { rel: true, kick: true, a0: .05, a1: 0, z0: .3, z1: 1.2, reach: 7.5, lean: -.3, lunge: 2.5 }, wind: .1, active: .1, recover: .3 },
    throwIn: { spec: { hand: 'both', a0: 0, a1: 0, z0: 18, z1: 10, reach: 4, blade: 0 }, wind: .15, active: .1, recover: .2 }
  };
  for (const k in K) K[k].total = K[k].wind + K[k].active + K[k].recover;
  return K;
})();
/** a kick's attack state at time t into it, for rig.update (or null once it has finished) */
EF.kickState = (name, t) => {
  const K = EF.KICKS[name]; if (!K || t < 0 || t > K.total) return null;
  if (t < K.wind) return { spec: K.spec, phase: 'wind', u: t / K.wind };
  if (t < K.wind + K.active) return { spec: K.spec, phase: 'active', u: (t - K.wind) / K.active };
  return { spec: K.spec, phase: 'recover', u: (t - K.wind - K.active) / K.recover };
};
