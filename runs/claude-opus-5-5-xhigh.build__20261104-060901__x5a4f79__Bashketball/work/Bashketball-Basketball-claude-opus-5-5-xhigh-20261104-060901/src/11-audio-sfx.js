/* 11-audio-sfx: every sound effect, written as the engine's chip voices (no files): the ball on five floors, the hoop
 * (swish, rim, glass, slam, shatter), sneakers and bodies, the match (whistle, buzzer, shot clock, horn), the crowd's
 * swells, power-ups and twists, the robots, the menus. sfx() plays one through a policy: quieter the farther from the
 * camera's centre it happens. */
const SFX = {
  dribble_asphalt: [{ wave: 'sine', freq: 150, to: 60, dur: .07, vol: .35 }, { wave: 'noise', freq: 3200, dur: .03, vol: .12, filter: 'highpass' }],
  dribble_planks: [{ wave: 'sine', freq: 120, to: 70, dur: .09, vol: .35 }, { wave: 'noise', freq: 600, dur: .06, vol: .14, filter: 'bandpass', q: 3 }],
  dribble_concrete: [{ wave: 'sine', freq: 130, to: 55, dur: .07, vol: .38 }, { wave: 'noise', freq: 1200, dur: .03, vol: .08 }],
  dribble_stone: [{ wave: 'sine', freq: 160, to: 70, dur: .06, vol: .3 }, { wave: 'triangle', freq: 1400, to: 1100, dur: .03, vol: .08 }],
  dribble_maple: [{ wave: 'sine', freq: 140, to: 60, dur: .08, vol: .36 }, { wave: 'noise', freq: 2400, dur: .02, vol: .07, filter: 'highpass' }],
  bounce: { wave: 'sine', freq: 130, to: 60, dur: .08, vol: .3 },
  catch: [{ wave: 'noise', freq: 900, dur: .05, vol: .2, filter: 'lowpass' }, { wave: 'sine', freq: 200, to: 120, dur: .04, vol: .15 }],
  release: { wave: 'noise', freq: 1800, to: 3200, dur: .08, vol: .1, filter: 'bandpass' },
  swish: { wave: 'noise', freq: 2000, to: 6000, dur: .25, vol: .28, filter: 'bandpass', q: .8 },
  rim: [{ wave: 'square', freq: 620, to: 560, dur: .12, vol: .14 }, { wave: 'triangle', freq: 1240, to: 1180, dur: .18, vol: .12 }, { wave: 'noise', freq: 4000, dur: .015, vol: .1, filter: 'highpass' }],
  backboard: [{ wave: 'triangle', freq: 160, to: 110, dur: .14, vol: .3 }, { wave: 'noise', freq: 500, dur: .08, vol: .16, filter: 'lowpass' }],
  net_snap: { wave: 'noise', freq: 3000, to: 1500, dur: .1, vol: .14, filter: 'bandpass' },
  slam: [{ wave: 'sine', freq: 80, to: 38, dur: .4, vol: .6 }, { wave: 'square', freq: 520, to: 400, dur: .14, vol: .14 }, { wave: 'noise', freq: 700, to: 200, dur: .35, vol: .25, filter: 'lowpass' }],
  shatter: [{ wave: 'noise', freq: 5000, to: 1800, dur: .55, vol: .4, filter: 'highpass' }, { wave: 'sine', freq: 4200, to: 2600, dur: .3, vol: .07, delay: .05 }, { wave: 'sine', freq: 5600, to: 3800, dur: .25, vol: .06, delay: .12 },
    { wave: 'sine', freq: 3100, to: 2200, dur: .3, vol: .06, delay: .2 }, { wave: 'sine', freq: 4800, to: 3000, dur: .2, vol: .05, delay: .3 }, { wave: 'sine', freq: 2600, dur: .25, vol: .05, delay: .42 }],
  squeak: { wave: 'sine', freq: 2600, to: 3400, dur: .09, vol: .12, vib: [40, .03] },
  step: { wave: 'noise', freq: 400, dur: .03, vol: .05, filter: 'lowpass' },
  jump: { wave: 'noise', freq: 600, to: 1400, dur: .1, vol: .12, filter: 'bandpass' },
  land: { wave: 'sine', freq: 90, to: 50, dur: .08, vol: .25 },
  land_heavy: [{ wave: 'sine', freq: 70, to: 35, dur: .2, vol: .5 }, { wave: 'noise', freq: 300, dur: .15, vol: .2, filter: 'lowpass' }],
  turbo: { wave: 'noise', freq: 400, to: 700, dur: .25, vol: .08, filter: 'lowpass' },
  shove: [{ wave: 'noise', freq: 800, to: 300, dur: .12, vol: .3, filter: 'lowpass' }, { wave: 'sine', freq: 140, to: 60, dur: .12, vol: .4 }],
  fall: [{ wave: 'sine', freq: 100, to: 45, dur: .22, vol: .45 }, { wave: 'noise', freq: 600, dur: .18, vol: .15, filter: 'lowpass' }, { wave: 'square', freq: 300, to: 200, dur: .05, vol: .06, delay: .1 }],
  steal: [{ wave: 'noise', freq: 2400, to: 900, dur: .1, vol: .2 }, { wave: 'square', freq: 880, to: 1320, dur: .08, vol: .1, delay: .05 }],
  block: [{ wave: 'noise', freq: 1500, dur: .06, vol: .3, filter: 'bandpass' }, { wave: 'sine', freq: 110, to: 50, dur: .25, vol: .5 }],
  spin: { wave: 'noise', freq: 600, to: 2200, dur: .3, vol: .16, filter: 'bandpass', q: 2 },
  dizzy: { wave: 'square', freq: 1800, arp: [0, 4, 7, 4, 0, 4], step: .05, dur: .3, vol: .05 },
  whoosh: { wave: 'noise', freq: 900, to: 2600, dur: .12, vol: .12, filter: 'bandpass' },
  whistle: [{ wave: 'square', freq: 2300, dur: .32, vol: .1, vib: [32, .05] }, { wave: 'sine', freq: 2300, dur: .32, vol: .1, vib: [32, .05] }],
  buzzer: [{ wave: 'square', freq: 220, dur: .9, vol: .16, hold: true }, { wave: 'square', freq: 230, dur: .9, vol: .16, hold: true }],
  shotclock_beep: { wave: 'square', freq: 1600, dur: .07, vol: .09, hold: true },
  horn: [{ wave: 'saw', freq: 196, dur: .7, vol: .14, hold: true }, { wave: 'saw', freq: 247, dur: .7, vol: .1, hold: true }, { wave: 'saw', freq: 294, dur: .7, vol: .1, hold: true }],
  crowd_roar: { wave: 'noise', freq: 700, to: 1100, dur: 1.6, vol: .3, filter: 'bandpass', q: .6, attack: .15 },
  crowd_ooh: [{ wave: 'noise', freq: 500, to: 900, dur: .7, vol: .2, filter: 'bandpass', q: 3, attack: .15 }, { wave: 'noise', freq: 900, to: 600, dur: .7, vol: .12, filter: 'bandpass', q: 4, attack: .2 }],
  crowd_boo: { wave: 'noise', freq: 300, to: 220, dur: 1, vol: .22, filter: 'bandpass', q: 2.5, attack: .2 },
  camera_flash: [{ wave: 'noise', freq: 6000, dur: .02, vol: .05, filter: 'highpass' }, { wave: 'noise', freq: 6000, dur: .02, vol: .04, filter: 'highpass', delay: .07 }],
  pu_spawn: { wave: 'pulse', freq: 'C5', arp: [0, 4, 7, 12], step: .06, dur: .3, vol: .12 },
  pu_pick: [{ wave: 'square', freq: 'G5', arp: [0, 4, 7, 12, 16], step: .045, dur: .3, vol: .12 }, { wave: 'triangle', freq: 'G4', arp: [0, 7, 12], step: .06, dur: .3, vol: .12 }],
  pu_end: { wave: 'square', freq: 'C5', arp: [7, 4, 0], step: .07, dur: .22, vol: .08 },
  jackpot: [{ wave: 'square', freq: 'C6', arp: [0, 4, 7, 12, 7, 12, 16], step: .05, dur: .4, vol: .1 }, { wave: 'noise', freq: 7000, dur: .4, vol: .05, filter: 'highpass' }],
  nova_on: [{ wave: 'saw', freq: 200, to: 1600, dur: .6, vol: .14 }, { wave: 'noise', freq: 3000, to: 8000, dur: .6, vol: .1, filter: 'highpass' }],
  wind_gust: { wave: 'noise', freq: 400, to: 1300, dur: 2.2, vol: .2, filter: 'bandpass', q: 1.4, attack: .5 },
  gull: [{ wave: 'saw', freq: 1400, to: 900, dur: .14, vol: .07 }, { wave: 'saw', freq: 1500, to: 1000, dur: .12, vol: .06, delay: .18 }],
  bark: [{ wave: 'saw', freq: 420, to: 260, dur: .09, vol: .14 }, { wave: 'noise', freq: 800, dur: .08, vol: .1 }, { wave: 'saw', freq: 440, to: 280, dur: .09, vol: .12, delay: .16 }],
  oil_slip: [{ wave: 'sine', freq: 600, to: 200, dur: .3, vol: .2 }, { wave: 'noise', freq: 1200, to: 300, dur: .3, vol: .1 }],
  rumble: { wave: 'noise', freq: 120, to: 80, dur: 1.5, vol: .45, filter: 'lowpass', attack: .2 },
  bomb_hit: [{ wave: 'noise', freq: 900, to: 120, dur: .6, vol: .5, filter: 'lowpass' }, { wave: 'sine', freq: 90, to: 30, dur: .5, vol: .55 }, { wave: 'noise', freq: 3000, to: 600, dur: .25, vol: .15 }],
  bomb_whistle: { wave: 'sine', freq: 1200, to: 400, dur: .9, vol: .1 },
  vent_puff: { wave: 'noise', freq: 2500, to: 900, dur: .6, vol: .18, filter: 'bandpass', attack: .05 },
  pyro: [{ wave: 'noise', freq: 400, to: 120, dur: .5, vol: .3, filter: 'lowpass' }, { wave: 'noise', freq: 3000, dur: .3, vol: .08, filter: 'highpass' }],
  servo: { wave: 'saw', freq: 300, to: 500, dur: .3, vol: .1, vib: [18, .04] },
  reboot: { wave: 'square', freq: 900, arp: [0, -3, -7, -12, -15, -19], step: .07, dur: .45, vol: .1 },
  select: { wave: 'square', freq: 880, dur: .04, vol: .08 },
  confirm: [{ wave: 'square', freq: 'C6', arp: [0, 7], step: .05, dur: .12, vol: .1 }],
  cancel: { wave: 'square', freq: 440, to: 300, dur: .08, vol: .08 },
  code_ok: [{ wave: 'triangle', freq: 'E6', arp: [0, 4, 7, 12], step: .06, dur: .35, vol: .14 }, { wave: 'pulse', freq: 'E5', dur: .35, vol: .06 }],
  stamp: [{ wave: 'sine', freq: 90, to: 45, dur: .2, vol: .5 }, { wave: 'noise', freq: 900, dur: .1, vol: .2 }],
  taunt: { wave: 'square', freq: 660, arp: [0, 5, 0, 7], step: .07, dur: .28, vol: .06 },
  tick: { wave: 'square', freq: 1200, dur: .02, vol: .05 }
};
for (const k in SFX) A.define(k, SFX[k]);
/** play a sound: o { vol, pitch, at: a world point (quieter far from the camera) } */
function sfx(name, o = {}) {
  if (S.net && S.net.role === 'server') return;
  let vol = o.vol === undefined ? 1 : o.vol;
  if (o.at && game.cam) { const d = Math.abs((o.at.x || 0) - (game.cam.x || CMX)); vol *= clamp(1.2 - d / 500, .25, 1); }
  try { A.sfx(name, { vol, pitch: o.pitch }); } catch (e) { game.fail('sfx ' + name, e); }
}
