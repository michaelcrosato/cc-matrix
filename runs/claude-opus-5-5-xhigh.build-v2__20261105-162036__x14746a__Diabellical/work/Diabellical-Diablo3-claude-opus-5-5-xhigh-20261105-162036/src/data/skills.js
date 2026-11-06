// Skills are data. src/sim/effects.js implements the ops and nothing else; skills and Tones only
// compose them. Percentages are of weapon damage (1 = 100%).
// tones: { id: { name, desc, patch: {wind, rec, cd, ...}, fx: { index: {...overrides} }, add: [ops] } }
const ring = (radius, dmg, extra = {}) => ({ op: 'ring', radius, dmg, el: 'sound', ...extra });

export const SKILLS = {
  // THE BELLWARDEN -------------------------------------------------------------------------
  clout: {
    name: 'CLOUT', cls: 'bellwarden', level: 1, gain: 10, icon: 'sk_clout', clips: ['Slash1', 'Slash2', 'Slash3'], wind: 0.16, rec: 0.2, melee: true, range: 2.8,
    desc: 'A HEAVY SWING IN AN ARC. BUILDS CLANGOR.',
    fx: [{ op: 'arc', range: 2.8, angle: 120, dmg: 1.5, el: 'sound', vfx: 'swing', sfx: 'swing_heavy' }],
    tones: {
      ringing: { name: 'RINGING', desc: 'HITS CHAIN 60% TO 2 MORE.', fx: { 0: { chainTo: { n: 2, dmg: 0.6, range: 6 } } } },
      heavy: { name: 'HEAVY', desc: 'SLOWER. 230%. STUNS 0.4 S.', patch: { wind: 0.3, rec: 0.3 }, fx: { 0: { dmg: 2.3, stun: 0.4 } } },
      pious: { name: 'PIOUS', desc: 'HEAL 2% PER TARGET.', fx: { 0: { healPerTarget: 0.02 } } },
    },
  },
  chain_reap: {
    name: 'CHAIN REAP', cls: 'bellwarden', level: 2, gainPerTarget: 6, icon: 'whirlwind-icon', clips: ['Spin'], wind: 0.12, rec: 0.22, melee: true, range: 4,
    desc: 'THE BELL ON ITS CHAIN, ALL THE WAY ROUND.',
    fx: [{ op: 'circle', radius: 4, dmg: 1.1, el: 'sound', gainPerTarget: 6, vfx: 'sweep', sfx: 'chain' }],
    tones: {
      drag: { name: 'DRAG', desc: 'PULLS FOES 1.5 M.', fx: { 0: { pull: 1.5 } } },
      long_chain: { name: 'LONG CHAIN', desc: 'REACHES 5.5 M.', patch: { range: 5.5 }, fx: { 0: { radius: 5.5 } } },
      rust: { name: 'RUST', desc: 'BLEEDS 40% A SECOND FOR 3 S.', fx: { 0: { status: [{ k: 'bleed', dps: 0.4, t: 3 }] } } },
    },
  },
  great_toll: {
    name: 'GREAT TOLL', cls: 'bellwarden', level: 4, cost: 30, tags: ['toll', 'sound'], icon: 'sk_toll', clips: ['BellOverhead'], wind: 0.22, rec: 0.3, range: 6,
    desc: 'RING THE WORLD FLAT. SPENDS RESONANCE FOR 25% EACH.',
    fx: [ring(6, 3.0, { knock: 3, consume: 'resonance', vfx: 'ring_bronze', sfx: 'bell_big', shake: 0.4, wave: true })],
    tones: {
      twin_peal: { name: 'TWIN PEAL', desc: 'A SECOND RING AFTER 0.5 S AT 70%.', add: [{ op: 'delay', t: 0.5, then: ring(6, 2.1, { vfx: 'ring_bronze', sfx: 'bell_mid', shake: 0.2 }) }] },
      cracked: { name: 'CRACKED', desc: 'LEAVES SHOCK PATCHES FOR 4 S.', add: [{ op: 'zone', kind: 'shock', radius: 5, life: 4, tick: 0.5, dmg: 0.25, el: 'sound' }] },
      deaf: { name: 'DEAF', desc: '200%. STUNS 1 S.', fx: { 0: { dmg: 2.0, stun: 1 } } },
    },
  },
  reverberate: {
    name: 'REVERBERATE', cls: 'bellwarden', level: 6, cost: 20, tags: ['toll', 'sound'], icon: 'sk_wave', clips: ['Shout'], wind: 0.18, rec: 0.28, range: 9,
    desc: 'A WAVE OF SOUND THAT PASSES THROUGH EVERYTHING.',
    fx: [{ op: 'cone', range: 9, angle: 60, dmg: 2.6, el: 'sound', consume: 'resonance', vfx: 'wave', sfx: 'bell_mid', shake: 0.25 }],
    tones: {
      echo: { name: 'ECHO', desc: 'BOUNCES OFF WALLS ONCE.', fx: { 0: { bounce: true } } },
      narrow: { name: 'NARROW', desc: '60% NARROWER. 420%.', fx: { 0: { angle: 24, dmg: 4.2 } } },
      hymn: { name: 'HYMN', desc: '+3 CLANGOR PER TARGET.', fx: { 0: { gainPerTarget: 3 } } },
    },
  },
  bellfall: {
    name: 'BELLFALL', cls: 'bellwarden', level: 9, cd: 10, icon: 'leap-icon', clips: ['LeapSlam'], wind: 0.08, rec: 0.25, range: 12, ground: true,
    desc: 'LEAP 12 M. A BELL FALLS WITH YOU.',
    fx: [{ op: 'leap', range: 12, time: 0.55, then: [ring(2.6, 4.0, { knock: 2, vfx: 'ring_bronze', sfx: 'bell_big', shake: 0.5, wave: true, falling: 'bell' })] }],
    tones: {
      iron_bell: { name: 'IRON BELL', desc: 'LEAVES A TAUNTING BELL FOR 5 S. 100% A SECOND.', fx: { 0: { thenAdd: [{ op: 'turret', kind: 'iron_bell', life: 5, max: 2, tick: 1, dmg: 1, radius: 4, taunt: true, el: 'sound' }] } } },
      swift: { name: 'SWIFT', desc: 'COOLDOWN 6 S. 250%.', patch: { cd: 6 }, fx: { 0: { thenPatch: { dmg: 2.5 } } } },
      comet: { name: 'COMET', desc: 'LEAVES A BURNING TRAIL.', fx: { 0: { trail: { kind: 'fire', life: 3, tick: 0.5, dmg: 0.25, el: 'flame', radius: 1.4, every: 1.2 } } } },
    },
  },
  clapper_charge: {
    name: 'CLAPPER CHARGE', cls: 'bellwarden', level: 12, cd: 8, icon: 'dash-icon', clips: ['Charge'], wind: 0.06, rec: 0.18, range: 10, ground: true,
    desc: 'DASH 10 M AND SHOVE EVERYTHING ASIDE.',
    fx: [{ op: 'dash', dist: 10, speed: 18, dmg: 2.0, el: 'sound', width: 1.6, shove: 2.4, sfx: 'charge', shake: 0.2 }],
    tones: {
      battering: { name: 'BATTERING', desc: 'STUNS ALL NEARBY AT THE END.', fx: { 0: { endStun: { radius: 3.5, t: 1.2 } } } },
      relentless: { name: 'RELENTLESS', desc: 'KILLS REFUND 50% OF THE COOLDOWN.', patch: { killRefund: 0.5 } },
      wake: { name: 'WAKE', desc: 'LEAVES A TRAIL OF SOUND. 80% A SECOND.', fx: { 0: { trail: { kind: 'shock', life: 3, tick: 0.25, dmg: 0.2, el: 'sound', radius: 1.4, every: 1.2 } } } },
    },
  },
  hallowed_ground: {
    name: 'HALLOWED GROUND', cls: 'bellwarden', level: 16, cd: 20, icon: 'aura-icon', clips: ['CastBigWeapon'], wind: 0.3, rec: 0.25, range: 7,
    desc: 'FOR 8 S ALLIES IN THE RING TAKE 30% LESS AND HEAL 3% A SECOND.',
    fx: [{ op: 'zone', kind: 'hallowed', radius: 7, life: 8, tick: 1, allyDr: 0.3, allyHeal: 0.03, sfx: 'hymn' }],
    tones: {
      vigil: { name: 'VIGIL', desc: 'ALLIES INSIDE CANNOT BE STUNNED.', fx: { 0: { allyStunImmune: true } } },
      ire: { name: 'IRE', desc: 'ALLIES INSIDE DEAL +25% DAMAGE.', fx: { 0: { allyDmg: 0.25 } } },
      procession: { name: 'PROCESSION', desc: 'THE RING FOLLOWS YOU.', fx: { 0: { follow: true } } },
    },
  },
  last_peal: {
    name: 'LAST PEAL', cls: 'bellwarden', level: 20, cd: 45, icon: 'sk_peal', clips: ['Spin'], loopClip: 8, wind: 0.1, rec: 0.2, range: 4.5, channelMove: true,
    desc: '8 S OF SPINNING. 180% EVERY QUARTER SECOND. UNSTOPPABLE.',
    fx: [
      { op: 'buff', id: 'last_peal', t: 8, speedMul: 0.8, unstoppable: true, spin: true },
      { op: 'repeat', n: 32, every: 0.25, atCaster: true, then: { op: 'circle', radius: 4.5, dmg: 1.8, el: 'sound', vfx: 'sweep', sfx: 'chain' } },
    ],
    tones: {
      cyclone: { name: 'CYCLONE', desc: 'PULLS FOES IN.', fx: { 1: { thenPatch: { pull: 0.6 } } } },
      thunder: { name: 'THUNDER', desc: 'ENDS WITH 800%.', add: [{ op: 'delay', t: 8, atCaster: true, then: ring(6, 8, { knock: 3, vfx: 'ring_bronze', sfx: 'bell_big', shake: 0.6, wave: true }) }] },
      eternal: { name: 'ETERNAL', desc: 'KILLS ADD 0.3 S.', fx: { 1: { extendOnKill: 0.3 } } },
    },
  },

  // THE LAMPLIGHTER ------------------------------------------------------------------------
  spark_bolt: {
    name: 'SPARK BOLT', cls: 'lamplighter', level: 1, gain: 4, icon: 'sk_spark', clips: ['CastWeapon'], upper: true, moveCast: true, wind: 0.12, rec: 0.16, range: 18,
    desc: 'A QUICK BOLT OF LAMP-FIRE. BURNS. BUILDS WICK.',
    fx: [{ op: 'projectile', kind: 'spark', speed: 20, range: 18, dmg: 1.2, el: 'flame', sfx: 'spark' }],
    tones: {
      split: { name: 'SPLIT', desc: 'PIERCES ONE. FORKS ON A KILL.', fx: { 0: { pierce: 1, forkOnKill: 2 } } },
      swift: { name: 'SWIFT', desc: '1.4 TIMES THE SPEED. 90%.', patch: { wind: 0.09 }, fx: { 0: { speed: 28, dmg: 0.9 } } },
      star: { name: 'STAR', desc: 'ARCS TO 2 MORE.', fx: { 0: { chainTo: { n: 2, dmg: 0.6, range: 6 } } } },
    },
  },
  flare: {
    name: 'FLARE', cls: 'lamplighter', level: 2, cost: 20, icon: 'sk_flare', clips: ['Cast'], wind: 0.14, rec: 0.22, range: 8,
    desc: 'A BURST OF LIGHT IN A CONE. THE BLIND SWING WIDE.',
    fx: [{ op: 'cone', range: 8, angle: 70, dmg: 1.7, el: 'flame', blind: 1.5, vfx: 'flare', sfx: 'flare', shake: 0.15 }],
    tones: {
      phosphor: { name: 'PHOSPHOR', desc: '50% WIDER.', fx: { 0: { angle: 105 } } },
      magnesium: { name: 'MAGNESIUM', desc: '260%. NO BLIND.', fx: { 0: { dmg: 2.6, blind: 0 } } },
      signal: { name: 'SIGNAL', desc: 'MARKS FOES. ALLIES DEAL +20% FOR 5 S.', fx: { 0: { mark: { p: 0.2, t: 5 } } } },
    },
  },
  lantern_hurl: {
    name: 'LANTERN HURL', cls: 'lamplighter', level: 4, cost: 30, icon: 'fireball-icon', clips: ['LanternLob'], wind: 0.2, rec: 0.25, range: 14, ground: true,
    desc: 'LOB A LANTERN. IT BURSTS AND LEAVES A BURNING POOL.',
    fx: [{ op: 'lob', kind: 'lantern', range: 14, flight: 0.5, sfx: 'lob', then: [
      { op: 'ring', radius: 3, dmg: 2.4, el: 'flame', vfx: 'fire_burst', sfx: 'blast', shake: 0.2 },
      { op: 'zone', kind: 'fire', radius: 3, life: 4, tick: 0.25, dmg: 0.15, el: 'flame' },
    ] }],
    tones: {
      cluster: { name: 'CLUSTER', desc: 'THREE SMALL LANTERNS.', fx: { 0: { count: 3, spread: 2.6, then: [
        { op: 'ring', radius: 1.9, dmg: 1.2, el: 'flame', vfx: 'fire_burst', sfx: 'blast' },
        { op: 'zone', kind: 'fire', radius: 1.9, life: 4, tick: 0.25, dmg: 0.08, el: 'flame' },
      ] } } },
      oil: { name: 'OIL', desc: 'THE POOL LASTS 8 S.', fx: { 0: { thenPatchAt: { 1: { life: 8 } } } } },
      blue_flame: { name: 'BLUE FLAME', desc: 'THE POOL SLOWS BY 40%.', fx: { 0: { thenPatchAt: { 1: { kind: 'blue_fire', enemySlow: 0.4 } } } } },
    },
  },
  lamp_post: {
    name: 'LAMP POST', cls: 'lamplighter', level: 6, cd: 12, icon: 'totem-icon', clips: ['Dig'], wind: 0.25, rec: 0.25, range: 8, ground: true,
    desc: 'PLANT A LAMP. FOR 15 S IT FIRES ON ANYTHING NEARBY.',
    fx: [{ op: 'turret', kind: 'lamp_post', life: 15, max: 3, rate: 2, dmg: 0.7, el: 'flame', range: 12, sfx: 'dig' }],
    tones: {
      arc_lamp: { name: 'ARC LAMP', desc: 'BEAMS RUN BETWEEN YOUR LAMPS.', fx: { 0: { beams: 0.5 } } },
      bright: { name: 'BRIGHT', desc: 'HEALS ALLIES IN 4 M.', fx: { 0: { allyHealRadius: 4, allyHeal: 0.02 } } },
      bomb: { name: 'BOMB', desc: 'EXPLODES FOR 500% AT THE END.', fx: { 0: { endBlast: { radius: 4, dmg: 5, el: 'flame' } } } },
    },
  },
  dusk_step: {
    name: 'DUSK STEP', cls: 'lamplighter', level: 9, cd: 6, icon: 'sk_dusk', clips: ['Roll'], wind: 0.03, rec: 0.1, range: 8, ground: true,
    desc: 'BLINK 8 M. AN EMBER DECOY STAYS BEHIND FOR 2 S.',
    fx: [{ op: 'spawn_decoy', t: 2 }, { op: 'blink', dist: 8, sfx: 'blink' }],
    tones: {
      double: { name: 'DOUBLE', desc: 'TWO CHARGES.', patch: { charges: 2 } },
      scorch: { name: 'SCORCH', desc: 'A 180% BLAST WHERE YOU STOOD.', add: [{ op: 'ring', radius: 3, dmg: 1.8, el: 'flame', atOrigin: true, vfx: 'fire_burst', sfx: 'blast' }] },
      veil: { name: 'VEIL', desc: '2 S UNSEEN. THE NEXT HIT +100%.', add: [{ op: 'buff', id: 'veil', t: 2, unseen: true, nextHit: 1 }] },
    },
  },
  snuff: {
    name: 'SNUFF', cls: 'lamplighter', level: 12, cost: 40, icon: 'sk_snuff', clips: ['CastBig'], wind: 0.24, rec: 0.25, range: 14,
    desc: 'ALL BURN WITHIN 14 M PAYS OUT AT ONCE, TRIPLED.',
    fx: [{ op: 'consume_status', k: 'burn', radius: 14, mult: 3, el: 'flame', vfx: 'snuff', sfx: 'snuff', shake: 0.25 }],
    tones: {
      smother: { name: 'SMOTHER', desc: 'STUNS THEM 1 S.', fx: { 0: { stun: 1 } } },
      relight: { name: 'RELIGHT', desc: 'THEY BURN AGAIN AFTER 2 S.', fx: { 0: { relight: 2 } } },
      harvest: { name: 'HARVEST', desc: '+8 WICK PER TARGET.', fx: { 0: { gainPerTarget: 8 } } },
    },
  },
  beacon: {
    name: 'BEACON', cls: 'lamplighter', level: 16, cd: 25, icon: 'sk_beacon', clips: ['CastBigWeapon'], wind: 0.3, rec: 0.25, range: 7,
    desc: 'A 10 S PILLAR OF FIRE. ALLIES +20% DAMAGE. FOES BURN.',
    fx: [{ op: 'zone', kind: 'beacon', radius: 7, life: 10, tick: 0.5, dmg: 0.2, el: 'flame', allyDmg: 0.2, allyRegen: 0.5, sfx: 'beacon' }],
    tones: {
      walking: { name: 'WALKING', desc: 'THE PILLAR FOLLOWS YOU.', fx: { 0: { follow: true } } },
      warding: { name: 'WARDING', desc: 'STOPS PROJECTILES.', fx: { 0: { stopsShots: true } } },
      pyre: { name: 'PYRE', desc: 'ENDS WITH A 600% BLAST.', fx: { 0: { endBlast: { radius: 7, dmg: 6, el: 'flame' } } } },
    },
  },
  long_nights_end: {
    name: "LONG NIGHT'S END", cls: 'lamplighter', level: 20, cd: 50, icon: 'sk_comet', clips: ['CastBig', 'Triumph'], wind: 0.35, rec: 0.3, range: 14,
    desc: '7 S OF FALLING COMETS. 220% EACH.',
    fx: [{ op: 'comet_rain', rate: 3, t: 7, dmg: 2.2, radius: 2.5, el: 'flame', spread: 12, sfx: 'comet' }],
    tones: {
      meteor: { name: 'METEOR', desc: 'ONE COMET. 1800%.', fx: { 0: { rate: 1, t: 1, dmg: 18, radius: 6, big: true } } },
      drizzle: { name: 'DRIZZLE', desc: '5 A SECOND. WEAKER.', fx: { 0: { rate: 5, dmg: 1.3 } } },
      dawn: { name: 'DAWN', desc: 'THE PARTY HEALS 5% A SECOND.', add: [{ op: 'zone', kind: 'dawn', radius: 40, life: 7, tick: 1, allyHeal: 0.05, follow: true }] },
    },
  },

  // THE SEXTON -----------------------------------------------------------------------------
  shovel_swat: {
    name: 'SHOVEL SWAT', cls: 'sexton', level: 1, gain: 8, icon: 'sk_shovel', clips: ['ShovelSwat'], wind: 0.15, rec: 0.2, melee: true, range: 2.6,
    desc: 'THE OLDEST ARGUMENT THERE IS. BUILDS TITHE.',
    fx: [{ op: 'arc', range: 2.6, angle: 120, dmg: 1.4, el: 'grave', vfx: 'swing', sfx: 'swing_heavy' }],
    tones: {
      spade_edge: { name: 'SPADE EDGE', desc: 'STUNS 0.3 S.', fx: { 0: { stun: 0.3 } } },
      flat_side: { name: 'FLAT SIDE', desc: 'SLOWER. 180%. KNOCKS BACK.', patch: { wind: 0.24, rec: 0.26 }, fx: { 0: { dmg: 1.8, knock: 2.2 } } },
      long_handle: { name: 'LONG HANDLE', desc: 'REACHES 3.6 M.', patch: { range: 3.6 }, fx: { 0: { range: 3.6 } } },
    },
  },
  bone_toss: {
    name: 'BONE TOSS', cls: 'sexton', level: 2, gain: 5, icon: 'sk_bone', clips: ['Cast'], upper: true, moveCast: true, wind: 0.13, rec: 0.17, range: 14, ground: true,
    desc: 'A LOBBED FEMUR. BURSTS WHERE IT LANDS. BUILDS TITHE.',
    fx: [{ op: 'lob', kind: 'bone', range: 14, flight: 0.34, sfx: 'lob', then: [{ op: 'ring', radius: 1.2, dmg: 1.3, el: 'grave', vfx: 'bone_burst', sfx: 'bone_hit' }] }],
    tones: {
      ribcage: { name: 'RIBCAGE', desc: 'THREE SHARDS.', fx: { 0: { count: 3, spread: 2.2, then: [{ op: 'ring', radius: 1, dmg: 0.6, el: 'grave', vfx: 'bone_burst', sfx: 'bone_hit' }] } } },
      marrow: { name: 'MARROW', desc: 'POISONS FOR 3 S.', fx: { 0: { thenPatch: { status: [{ k: 'poison', dps: 0.35, t: 3 }] } } } },
      skull: { name: 'SKULL', desc: 'HOMES IN.', fx: { 0: { homing: true } } },
    },
  },
  raise_pallbearers: {
    name: 'RAISE PALLBEARERS', cls: 'sexton', level: 4, cost: 30, cd: 3, icon: 'summon-icon', clips: ['RaiseHands'], wind: 0.25, rec: 0.25, range: 6,
    desc: 'UP TO 4 SKELETONS, 90% EACH, UNTIL THEY ARE KILLED.',
    fx: [{ op: 'summon', kind: 'pallbearer', count: 4, max: 4, dmg: 0.9, sfx: 'raise' }],
    tones: {
      coffin_crew: { name: 'COFFIN CREW', desc: 'TWO BIG ONES THAT SLAM.', fx: { 0: { kind: 'coffin_bearer', count: 2, max: 2, dmg: 1.6 } } },
      quick_step: { name: 'QUICK STEP', desc: 'THEY MOVE AND SWING FASTER.', fx: { 0: { quick: true } } },
      volatile: { name: 'VOLATILE', desc: 'THEY EXPLODE WHEN THEY DIE.', fx: { 0: { explodes: 1.5 } } },
    },
  },
  exhume: {
    name: 'EXHUME', cls: 'sexton', level: 6, cost: 20, tags: ['exhume'], icon: 'sk_exhume', clips: ['CastBig'], wind: 0.2, rec: 0.25, range: 12,
    desc: 'UP TO 5 GRAVES WITHIN 12 M BURST. 300% EACH.',
    fx: [{ op: 'consume_graves', max: 5, radius: 12, dmg: 3, blast: 3, el: 'grave', vfx: 'grave_burst', sfx: 'exhume', shake: 0.3 }],
    tones: {
      chain: { name: 'CHAIN', desc: 'BLASTS SET OFF NEARBY GRAVES.', fx: { 0: { chain: true } } },
      feast: { name: 'FEAST', desc: 'HEAL 2% PER GRAVE.', fx: { 0: { healEach: 0.02 } } },
      rise: { name: 'RISE', desc: 'EACH LEAVES A SKELETON FOR 6 S.', fx: { 0: { rise: 6 } } },
    },
  },
  coffin_drop: {
    name: 'COFFIN DROP', cls: 'sexton', level: 9, cd: 9, icon: 'sk_coffin', clips: ['CastWeapon'], wind: 0.18, rec: 0.25, range: 14, ground: true,
    desc: 'A COFFIN FALLS ON THEM. 380%. STAYS 4 S AS A WALL.',
    fx: [{ op: 'lob', kind: 'coffin', range: 14, flight: 0.45, sfx: 'whoosh', then: [
      { op: 'ring', radius: 3, dmg: 3.8, stun: 1, el: 'grave', vfx: 'dust_ring', sfx: 'coffin_slam', shake: 0.35, wave: true },
      { op: 'obstacle', kind: 'coffin', life: 4 },
    ] }],
    tones: {
      family_plot: { name: 'FAMILY PLOT', desc: 'THREE COFFINS.', fx: { 0: { count: 3, spread: 3.4 } } },
      occupied: { name: 'OCCUPIED', desc: 'RELEASES A SKELETON.', fx: { 0: { thenAdd: [{ op: 'summon', kind: 'pallbearer', count: 1, max: 8, dmg: 0.6, life: 12 }] } } },
      lead_lined: { name: 'LEAD-LINED', desc: '700%. COOLDOWN 16 S.', patch: { cd: 16 }, fx: { 0: { thenPatch: { dmg: 7 } } } },
    },
  },
  last_rites: {
    name: 'LAST RITES', cls: 'sexton', level: 12, cost: 30, icon: 'curse-icon', clips: ['Cast'], wind: 0.2, rec: 0.25, range: 12, ground: true,
    desc: 'AN 8 S CURSE. FOES TAKE +25%. DEATHS INSIDE PAY +6 TITHE.',
    fx: [{ op: 'zone', kind: 'curse', radius: 6, life: 8, tick: 0.5, enemyVuln: 0.25, deathTithe: 6, atPoint: true, sfx: 'curse' }],
    tones: {
      slow_march: { name: 'SLOW MARCH', desc: 'SLOWS BY 30%.', fx: { 0: { enemySlow: 0.3 } } },
      wasting: { name: 'WASTING', desc: '60% A SECOND.', fx: { 0: { dmg: 0.3, el: 'grave' } } },
      following: { name: 'FOLLOWING', desc: 'FOLLOWS THE TARGET.', fx: { 0: { followTarget: true } } },
    },
  },
  gravewalk: {
    name: 'GRAVEWALK', cls: 'sexton', level: 16, cd: 7, icon: 'sk_grave', clips: ['SinkGround'], wind: 0.1, rec: 0.1, range: 9, ground: true,
    desc: 'SINK AND RISE 9 M AWAY. 150% BURST.',
    fx: [{ op: 'blink', dist: 9, invuln: 0.4, sfx: 'dig' }, { op: 'ring', radius: 3, dmg: 1.5, el: 'grave', vfx: 'dust_ring', sfx: 'bone_hit' }],
    tones: {
      deep: { name: 'DEEP', desc: 'TWO CHARGES.', patch: { charges: 2 } },
      hands: { name: 'HANDS', desc: 'ROOTS FOES 1.5 S AT THE EXIT.', fx: { 1: { root: 1.5 } } },
      whole_family: { name: 'WHOLE FAMILY', desc: 'YOUR MINIONS COME ALONG.', fx: { 0: { bringMinions: true } } },
    },
  },
  danse_macabre: {
    name: 'DANSE MACABRE', cls: 'sexton', level: 20, cd: 60, icon: 'sk_danse', clips: ['Triumph'], wind: 0.35, rec: 0.3, range: 14,
    desc: '10 S: MINIONS +50%. EVERY GRAVE NEAR YOU RISES.',
    fx: [
      { op: 'buff', id: 'danse', t: 10, minionDmg: 0.5 },
      { op: 'consume_graves', max: 12, radius: 14, rise: 10, noBlast: true, sfx: 'raise' },
    ],
    tones: {
      tarantella: { name: 'TARANTELLA', desc: 'YOU AND YOURS MOVE FASTER.', fx: { 0: { speedMul: 1.3, minionSpeed: 1.4 } } },
      finale: { name: 'FINALE', desc: 'THEY ALL EXPLODE AT THE END.', fx: { 0: { finale: 2 } } },
      encore: { name: 'ENCORE', desc: 'COOLDOWN 40 S. LASTS 6 S.', patch: { cd: 40 }, fx: { 0: { t: 6 }, 1: { rise: 6 } } },
    },
  },

  // SISTER PYX -----------------------------------------------------------------------------
  pyx_bolt: {
    name: 'QUARREL', cls: 'pyx', level: 1, icon: 'arrow-volley-icon', clips: ['BowRelease'], upper: true, moveCast: true, wind: 0.2, rec: 0.3, range: 16, gain: 0,
    desc: 'A BLESSED QUARREL.', fx: [{ op: 'projectile', kind: 'quarrel', speed: 26, range: 16, dmg: 1.0, el: 'sound', sfx: 'crossbow' }], tones: {},
  },
  pyx_volley: {
    name: 'VOLLEY', cls: 'pyx', level: 1, cd: 7, icon: 'arrow-volley-icon', clips: ['CastWeapon'], wind: 0.25, rec: 0.3, range: 14,
    desc: 'THREE AT ONCE.', fx: [{ op: 'projectile', kind: 'quarrel', speed: 26, range: 14, dmg: 0.9, el: 'sound', count: 5, fan: 40, sfx: 'crossbow' }], tones: {},
  },
  pyx_hymn: {
    name: 'FLAT HYMN', cls: 'pyx', level: 1, cd: 16, icon: 'aura-icon', clips: ['Shout'], wind: 0.3, rec: 0.3, range: 8,
    desc: 'SHE SINGS BADLY. IT STILL WORKS.', fx: [{ op: 'zone', kind: 'hallowed', radius: 6, life: 5, tick: 1, allyHeal: 0.03, follow: true, sfx: 'hymn' }], tones: {},
  },
};

// Skill data cannot reference itself by id before this runs: stamp ids on.
for (const [id, s] of Object.entries(SKILLS)) {
  s.id = id;
  for (const [tid, t] of Object.entries(s.tones)) t.id = tid;
}
export const toneIds = (id) => Object.keys(SKILLS[id].tones);
