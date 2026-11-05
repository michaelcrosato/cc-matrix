/* ---- SOUND EFFECTS (plan §12.2): each is a voice in the engine's format, defined once with audio.define. Played through
 * one policy: a sound's volume follows the player's sound settings (the engine's), and nothing fails headless. ---- */
const SFX = {
  dribble_asphalt: { wave: 'sine', freq: 140, to: 60, dur: .07, vol: .3 }, dribble_planks: { wave: 'triangle', freq: 260, to: 120, dur: .09, vol: .3 },
  dribble_concrete: { wave: 'noise', freq: 900, to: 300, dur: .06, vol: .3, filter: 'lowpass' }, dribble_stone: { wave: 'square', freq: 1400, to: 900, dur: .03, vol: .22 },
  dribble_maple: { wave: 'sine', freq: 180, to: 70, dur: .08, vol: .3 },
  bounce: { wave: 'sine', freq: 180, to: 80, dur: .1, vol: .25 }, catch: { wave: 'triangle', freq: 300, to: 160, dur: .06, vol: .2 },
  release: { wave: 'noise', freq: 1200, to: 400, dur: .12, vol: .14 },
  swish: { wave: 'noise', freq: 2000, to: 6000, dur: .25, vol: .22, filter: 'highpass' },
  rim: { wave: 'square', freq: 620, dur: .08, vol: .18, arp: [0, 1] }, backboard: { wave: 'triangle', freq: 160, to: 110, dur: .14, vol: .3 },
  net_snap: { wave: 'noise', freq: 3000, to: 800, dur: .05, vol: .16 },
  slam: { wave: 'sine', freq: 80, to: 40, dur: .3, vol: .45 }, shatter: { wave: 'noise', freq: 2400, to: 900, dur: .5, vol: .3 },
  squeak: { wave: 'sine', freq: 2600, to: 3400, dur: .09, vol: .12, vib: [30, .02] }, step: { wave: 'noise', freq: 500, to: 200, dur: .03, vol: .08 },
  jump: { wave: 'triangle', freq: 220, to: 420, dur: .12, vol: .15 }, land_heavy: { wave: 'sine', freq: 110, to: 50, dur: .12, vol: .3 },
  shove: { wave: 'noise', freq: 400, to: 120, dur: .18, vol: .3 }, fall: { wave: 'square', freq: 120, to: 60, dur: .3, vol: .26 },
  steal: { wave: 'triangle', freq: 900, to: 1800, dur: .1, vol: .2 }, block: { wave: 'noise', freq: 600, to: 200, dur: .14, vol: .3 },
  spin: { wave: 'saw', freq: 300, to: 900, dur: .3, vol: .12 }, dizzy: { wave: 'sine', freq: 1500, to: 2200, dur: .2, vol: .1, vib: [20, .04] },
  whistle: { wave: 'sine', freq: 2400, to: 2300, dur: .35, vol: .12, vib: [25, .05] }, buzzer: { wave: 'square', freq: 220, to: 230, dur: .9, vol: .16 },
  shotclock_beep: { wave: 'square', freq: 880, dur: .08, vol: .14 }, horn: { wave: 'saw', freq: 220, to: 180, dur: .9, vol: .16 },
  crowd_roar: { wave: 'noise', freq: 400, to: 1200, dur: 1.2, vol: .18, filter: 'lowpass' }, crowd_ooh: { wave: 'noise', freq: 300, to: 700, dur: .7, vol: .14 },
  crowd_boo: { wave: 'saw', freq: 180, to: 140, dur: .8, vol: .12 }, camera_flash: { wave: 'noise', freq: 4000, dur: .02, vol: .15 },
  pu_spawn: { wave: 'pulse', freq: 'C5', arp: [0, 4, 7, 12], step: .03, dur: .09, vol: .14 }, pu_pick: { wave: 'triangle', freq: 'C6', arp: [0, 4, 7, 12], step: .04, dur: .08, vol: .18 },
  pu_end: { wave: 'triangle', freq: 660, to: 330, dur: .3, vol: .14 }, jackpot: { wave: 'pulse', freq: 'E5', arp: [0, 4, 7, 12, 16], step: .05, dur: .1, vol: .18 },
  nova_on: { wave: 'saw', freq: 200, to: 1600, dur: .9, vol: .2, vib: [6, .05] }, wind_gust: { wave: 'noise', freq: 300, to: 1100, dur: 1.4, vol: .14, filter: 'bandpass' },
  gull: { wave: 'sine', freq: 1800, to: 2200, dur: .3, vol: .08, vib: [14, .06] }, oil_slip: { wave: 'saw', freq: 500, to: 120, dur: .6, vol: .14 },
  rumble: { wave: 'noise', freq: 120, to: 200, dur: 1.5, vol: .22, filter: 'lowpass' }, bomb_whistle: { wave: 'sine', freq: 1200, to: 400, dur: .6, vol: .14 },
  bomb_hit: { wave: 'noise', freq: 300, to: 60, dur: .5, vol: .35, filter: 'lowpass' }, vent_puff: { wave: 'noise', freq: 800, to: 200, dur: .9, vol: .12, filter: 'highpass' },
  pyro: { wave: 'noise', freq: 2000, to: 300, dur: .4, vol: .3 }, servo: { wave: 'saw', freq: 300, to: 500, dur: .3, vol: .1, vib: [12, .04] },
  reboot: { wave: 'square', freq: 800, to: 200, dur: .6, vol: .16, vib: [40, .03] },
  code_ok: { wave: 'triangle', freq: 'G5', arp: [0, 4, 7], step: .05, dur: .1, vol: .18 }, stamp: { wave: 'noise', freq: 1000, to: 200, dur: .12, vol: .24 },
  // the UI sounds (the engine's own presets stand for select, confirm, cancel and pause) and the match's others
  swipe: { wave: 'noise', freq: 2400, to: 900, dur: .14, vol: .14 }, whoosh: { wave: 'noise', freq: 900, to: 300, dur: .2, vol: .12 },
  nova: { wave: 'saw', freq: 300, to: 900, dur: .5, vol: .16, vib: [8, .05] }, slide: { wave: 'noise', freq: 400, to: 200, dur: .25, vol: .18 },
  thump: { wave: 'sine', freq: 120, to: 70, dur: .08, vol: .3 }, kick: { wave: 'noise', freq: 900, to: 200, dur: .07, vol: .3, filter: 'lowpass' },
  die: { wave: 'triangle', freq: 440, to: 110, dur: .6, vol: .22 }, select: { wave: 'square', freq: 660, dur: .05, vol: .12 }, confirm: { wave: 'square', freq: 880, dur: .08, vol: .14 }, cancel: { wave: 'square', freq: 330, dur: .08, vol: .14 }
};
for (const [name, voice] of Object.entries(SFX)) if (!(name === 'select' || name === 'confirm' || name === 'cancel')) A.define(name, voice);
/** a sound by name: silent until audio is unlocked; the names the code uses are defined above or are the engine's presets */
const sfxPlay = (name, o = {}) => { try { A.sfx(name, o); } catch (e) { /* headless or no audio yet */ } };
