// Classes, skills, Tones and Vows are data. src/sim/effects.js implements the ops; skills only compose them.
// op fields: dmg = fraction of weapon damage. r = metres. el = element (sound|flame|grave|phys).
// A Tone changes a skill by `mod` (merged into fx[0]), `add` (extra ops appended), `set` (skill fields) and `flags`.
export const SLOT_LEVELS = [1, 1, 3, 6, 9, 12];
export const TONE_OFFSETS = [2, 6, 11];
export const VOW_LEVELS = [5, 15];

export const CLASSES = {
  bellwarden: {
    id: 'bellwarden', name: 'Bellwarden', fantasy: 'Swings a holy bell on a chain. Hits hard, takes harder.',
    resource: 'Clangor', resKey: 'clangor', resMax: 100, regen: 0, drain: 12, life: 1.25, armour: 1.3, speed: 5.0, color: 'plum', accent: 'orange',
    weapons: ['mace', 'warhammer', 'flail'], offhands: ['kite-shield', 'round-shield'], voice: 'low', startWeapon: 'mace',
    passive: 'Resonance: every hit adds a stack to the monster (max 5, 6 s). Toll skills spend stacks for +25% damage each.',
    sig: ['Clout', 'Great Toll', 'Bellfall'],
    skills: ['clout', 'chain_reap', 'great_toll', 'reverberate', 'bellfall', 'clapper_charge', 'hallowed_ground', 'last_peal'],
    vows: [
      { id: 'iron', name: 'Iron', text: '+20% armour.' },
      { id: 'clamour', name: 'Clamour', text: '+20 Clangor, no drain for 8 s.' },
      { id: 'contrition', name: 'Contrition', text: '+15% damage under half life.' },
      { id: 'silence', name: 'Silence', text: 'Kills give +15% speed for 3 s.' },
    ],
  },
  lamplighter: {
    id: 'lamplighter', name: 'Lamplighter', fantasy: 'Last of the guild that keeps night at bay. Burns what it sees.',
    resource: 'Wick', resKey: 'wick', resMax: 100, regen: 14, drain: 0, life: 1.0, armour: 1.0, speed: 5.6, color: 'navy', accent: 'sand',
    weapons: ['staff', 'crossbow', 'wand'], offhands: ['lantern'], voice: 'mid', startWeapon: 'staff',
    passive: 'Kindle: Flame hits Burn (30%/s for 4 s). Burning enemies take +15% from your skills.',
    sig: ['Spark Bolt', 'Lantern Hurl', 'Beacon'],
    skills: ['spark_bolt', 'flare', 'lantern_hurl', 'lamp_post', 'dusk_step', 'snuff', 'beacon', 'long_nights_end'],
    vows: [
      { id: 'long_wick', name: 'Long Wick', text: '+20 Wick.' },
      { id: 'bright_eyes', name: 'Bright Eyes', text: '+10% crit against burning.' },
      { id: 'keeper', name: 'Keeper of Lamps', text: '+1 Lamp Post.' },
      { id: 'last_light', name: 'Last Light', text: 'Survive a fatal hit, once per 90 s.' },
    ],
  },
  sexton: {
    id: 'sexton', name: 'Sexton', fantasy: 'Tends the graves and rings the passing bell. Raises what they bury.',
    resource: 'Tithe', resKey: 'tithe', resMax: 100, regen: 0, drain: 0, life: 1.1, armour: 1.0, speed: 5.2, color: 'ink', accent: 'lime',
    weapons: ['shovel', 'scythe', 'sceptre'], offhands: ['censer'], voice: 'mid', startWeapon: 'shovel',
    passive: 'Graveyard Shift: corpses remain as Graves for 12 s, and some skills consume them.',
    sig: ['Shovel Swat', 'Raise Pallbearers', 'Exhume'],
    skills: ['shovel_swat', 'bone_toss', 'raise_pallbearers', 'exhume', 'coffin_drop', 'last_rites', 'gravewalk', 'danse_macabre'],
    vows: [
      { id: 'union', name: 'Union Rates', text: '+1 minion.' },
      { id: 'plot', name: 'Plot Holder', text: 'Graves last 20 s, +10% Grave damage.' },
      { id: 'care', name: 'Perpetual Care', text: 'Minions heal you 1% per hit.' },
      { id: 'mourner', name: 'Mourners Due', text: '+2 Tithe per death.' },
    ],
  },
};

const T = (name, o = {}) => ({ name, ...o });

export const SKILLS = {
  // ---------------- Bellwarden ----------------
  clout: { name: 'Clout', cls: 'bellwarden', lvl: 1, gen: 10, cd: 0, icon: 'whirlwind-icon', clip: 'Slash1', wind: 0.16, rec: 0.22, melee: true, tags: ['sound'],
    desc: 'Three-hit chain with the bell. Builds Clangor.',
    fx: [{ op: 'arc', r: 2.8, ang: 120, dmg: 1.5, el: 'sound', knock: 0.6, res: true, sfx: 'swing', shake: 0.08 }],
    tones: {
      ringing: T('Ringing', { desc: 'Chains 60% to 2 more.', add: [{ op: 'chain', n: 2, r: 5, dmg: 0.9, el: 'sound' }] }),
      heavy: T('Heavy', { desc: 'Slower. 230%, stuns 0.4 s.', mod: { dmg: 2.3, stun: 0.4 }, set: { wind: 0.3, rec: 0.34 } }),
      pious: T('Pious', { desc: 'Heals 2% per target.', mod: { heal: 0.02 } }),
    } },
  chain_reap: { name: 'Chain Reap', cls: 'bellwarden', lvl: 2, gen: 6, cd: 0, icon: 'whirlwind-icon', clip: 'Spin', wind: 0.18, rec: 0.3, tags: ['sound'],
    desc: 'Whirl the chain around you.',
    fx: [{ op: 'circle', r: 4, dmg: 1.1, el: 'sound', res: true, genPer: 6, sfx: 'swing', shake: 0.1 }],
    tones: {
      drag: T('Drag', { desc: 'Pulls enemies 1.5 m.', mod: { pull: 1.5 } }),
      long_chain: T('Long Chain', { desc: 'Reach 5.5 m.', mod: { r: 5.5 } }),
      rust: T('Rust', { desc: 'Bleed 40% per second for 3 s.', mod: { status: { id: 'bleed', t: 3, dps: 0.4 } } }),
    } },
  great_toll: { name: 'Great Toll', cls: 'bellwarden', lvl: 4, cost: 30, cd: 0.5, icon: 'aura-icon', clip: 'CastBigWeapon', wind: 0.22, rec: 0.3, tags: ['toll', 'sound'],
    desc: 'The bell rings. Everything near staggers. Spends Resonance.',
    fx: [{ op: 'ring', r: 6, dmg: 3.0, el: 'sound', knock: 3, consume: 'resonance', vfx: 'ring_bronze', sfx: 'bell_big', shake: 0.4, shock: true }],
    tones: {
      twin_peal: T('Twin Peal', { desc: 'A second ring after 0.5 s at 70%.', add: [{ op: 'delay', t: 0.5, then: { op: 'ring', r: 6, dmg: 2.1, el: 'sound', knock: 2, vfx: 'ring_bronze', sfx: 'bell_big', shake: 0.3 } }] }),
      cracked: T('Cracked', { desc: 'Leaves shock patches for 4 s.', add: [{ op: 'zone', r: 3.5, t: 4, dps: 0.8, el: 'sound', vfx: 'patch_shock' }] }),
      deaf: T('Deaf', { desc: '200%, stuns 1 s.', mod: { dmg: 2.0, stun: 1.0 } }),
    } },
  reverberate: { name: 'Reverberate', cls: 'bellwarden', lvl: 6, cost: 20, cd: 1, icon: 'arrow-volley-icon', clip: 'Shout', wind: 0.2, rec: 0.3, tags: ['toll', 'sound'],
    desc: 'A wave of sound that passes through everything.',
    fx: [{ op: 'cone', r: 9, ang: 50, dmg: 2.6, el: 'sound', pierce: true, consume: 'resonance', sfx: 'bell_mid', shake: 0.25 }],
    tones: {
      echo: T('Echo', { desc: 'Bounces off walls once.', mod: { bounce: true } }),
      narrow: T('Narrow', { desc: '60% narrower, 420%.', mod: { ang: 20, dmg: 4.2 } }),
      hymn: T('Hymn', { desc: '+3 Clangor per target.', mod: { genPer: 3 } }),
    } },
  bellfall: { name: 'Bellfall', cls: 'bellwarden', lvl: 9, cd: 10, icon: 'leap-icon', clip: 'LeapSlam', wind: 0.2, rec: 0.4, tags: ['sound'],
    desc: 'Leap and bring a bell down with you.',
    fx: [{ op: 'leap', dist: 12, r: 2.5, dmg: 4.0, el: 'sound', knock: 2, sfx: 'bell_big', shake: 0.5, shock: true }],
    tones: {
      iron_bell: T('Iron Bell', { desc: 'Leaves a taunting bell for 5 s.', add: [{ op: 'zone', r: 3, t: 5, dps: 1.0, el: 'sound', taunt: true, vfx: 'patch_shock' }] }),
      swift: T('Swift', { desc: '6 s cooldown, 250%.', mod: { dmg: 2.5 }, set: { cd: 6 } }),
      comet: T('Comet', { desc: 'Burning trail.', mod: { trail: true }, add: [{ op: 'zone', r: 2.5, t: 3, dps: 0.7, el: 'flame', vfx: 'patch_fire' }] }),
    } },
  clapper_charge: { name: 'Clapper Charge', cls: 'bellwarden', lvl: 12, cd: 8, icon: 'dash-icon', clip: 'Charge', wind: 0.1, rec: 0.25, tags: ['sound'],
    desc: 'Charge ahead and shove everything aside.',
    fx: [{ op: 'dash', dist: 10, r: 1.4, dmg: 2.0, el: 'sound', knock: 2.5, sfx: 'whoosh', shake: 0.3 }],
    tones: {
      battering: T('Battering', { desc: 'Stuns at the end.', mod: { stun: 1.2 } }),
      relentless: T('Relentless', { desc: 'Kills refund 50% cooldown.', flags: ['refund_kill'] }),
      wake: T('Wake', { desc: 'Leaves a sound trail.', add: [{ op: 'zone', r: 2.5, t: 3, dps: 0.8, el: 'sound', vfx: 'patch_shock' }] }),
    } },
  hallowed_ground: { name: 'Hallowed Ground', cls: 'bellwarden', lvl: 16, cd: 20, icon: 'shield-bubble-icon', clip: 'CastBigWeapon', wind: 0.25, rec: 0.35, tags: ['sound'],
    desc: 'Consecrate the ground. Allies take less and heal.',
    fx: [{ op: 'zone', r: 7, t: 8, heal: 0.03, reduce: 0.3, vfx: 'patch_holy', sfx: 'bell_mid', ally: true, shake: 0.15 }],
    tones: {
      vigil: T('Vigil', { desc: 'Immune to stuns.', mod: { stunImmune: true } }),
      ire: T('Ire', { desc: '+25% damage.', mod: { dmgBuff: 0.25 } }),
      procession: T('Procession', { desc: 'Follows you.', mod: { follow: true } }),
    } },
  last_peal: { name: 'Last Peal', cls: 'bellwarden', lvl: 20, cd: 45, icon: 'whirlwind-icon', clip: 'Spin', wind: 0.2, rec: 0.3, tags: ['sound', 'ultimate'],
    desc: 'Eight seconds of unstoppable spinning.',
    fx: [{ op: 'repeat', n: 32, every: 0.25, slow: 0.2, unstoppable: true, then: { op: 'circle', r: 4.5, dmg: 1.8, el: 'sound', sfx: 'swing', shake: 0.12 } }],
    tones: {
      cyclone: T('Cyclone', { desc: 'Pulls enemies in.', mod: { thenMod: { pull: 1.2 } } }),
      thunder: T('Thunder', { desc: 'Ends with 800%.', add: [{ op: 'delay', t: 8, then: { op: 'ring', r: 6, dmg: 8, el: 'sound', knock: 3, sfx: 'bell_big', shake: 0.6, shock: true } }] }),
      eternal: T('Eternal', { desc: 'Kills add 0.3 s.', flags: ['extend_kill'] }),
    } },

  // ---------------- Lamplighter ----------------
  spark_bolt: { name: 'Spark Bolt', cls: 'lamplighter', lvl: 1, gen: 4, cd: 0, icon: 'fireball-icon', clip: 'CastWeapon', upper: true, wind: 0.12, rec: 0.16, tags: ['flame'],
    desc: 'A fast bolt of fire. Move while you cast.',
    fx: [{ op: 'projectile', speed: 22, range: 18, dmg: 1.2, el: 'flame', r: 0.5, burn: true, vfx: 'bolt_fire', sfx: 'zap' }],
    tones: {
      split: T('Split', { desc: 'Pierces 1, forks on kill.', mod: { pierce: 1, forkKill: true } }),
      swift: T('Swift', { desc: '1.4x speed, 90%.', mod: { speed: 31, dmg: 0.9 } }),
      star: T('Star', { desc: 'Arcs to 2 more.', add: [{ op: 'chain', n: 2, r: 5, dmg: 0.6, el: 'flame', burn: true }] }),
    } },
  flare: { name: 'Flare', cls: 'lamplighter', lvl: 2, cost: 20, cd: 0.5, icon: 'aura-icon', clip: 'Cast', wind: 0.18, rec: 0.25, tags: ['flame'],
    desc: 'A blinding cone. Monsters miss for a moment.',
    fx: [{ op: 'cone', r: 8, ang: 60, dmg: 2.2, el: 'flame', burn: true, blind: 1.5, sfx: 'flare', shake: 0.15 }],
    tones: {
      phosphor: T('Phosphor', { desc: '50% wider.', mod: { ang: 90 } }),
      magnesium: T('Magnesium', { desc: '340%, no blind.', mod: { dmg: 3.4, blind: 0 } }),
      signal: T('Signal', { desc: 'Marks: allies deal +20% for 5 s.', mod: { mark: 0.2 } }),
    } },
  lantern_hurl: { name: 'Lantern Hurl', cls: 'lamplighter', lvl: 4, cost: 30, cd: 0.5, icon: 'fireball-icon', clip: 'LanternLob', wind: 0.2, rec: 0.3, tags: ['flame'],
    desc: 'Lob a lantern. Leaves a burning pool.',
    fx: [{ op: 'lob', range: 14, r: 3, dmg: 2.4, el: 'flame', burn: true, pool: { t: 4, dps: 0.6 }, vfx: 'lantern', sfx: 'smash', shake: 0.2 }],
    tones: {
      cluster: T('Cluster', { desc: 'Three small lanterns.', mod: { cluster: 3, r: 2, dmg: 1.2 } }),
      oil: T('Oil', { desc: 'Pool lasts 8 s.', mod: { pool: { t: 8, dps: 0.6 } } }),
      blue_flame: T('Blue Flame', { desc: '40% slow.', mod: { slow: 0.4 } }),
    } },
  lamp_post: { name: 'Lamp Post', cls: 'lamplighter', lvl: 6, cd: 12, icon: 'totem-icon', clip: 'Dig', wind: 0.25, rec: 0.3, tags: ['flame'],
    desc: 'Plant a lamp that shoots (max 3).',
    fx: [{ op: 'turret', t: 15, rate: 0.5, dmg: 0.7, el: 'flame', range: 14, max: 3, burn: true, sfx: 'smash' }],
    tones: {
      arc_lamp: T('Arc Lamp', { desc: 'Beams between lamps.', mod: { beams: true } }),
      bright: T('Bright', { desc: 'Heals allies within 4 m.', mod: { healAlly: 0.01 } }),
      bomb: T('Bomb', { desc: 'Explodes for 500% at the end.', mod: { endBlast: 5.0 } }),
    } },
  dusk_step: { name: 'Dusk Step', cls: 'lamplighter', lvl: 9, cd: 6, icon: 'dash-icon', clip: 'Roll', wind: 0.04, rec: 0.1, tags: ['flame'],
    desc: 'Blink 8 m. An ember decoy stays behind.',
    fx: [{ op: 'blink', dist: 8, decoy: 2, sfx: 'blink' }],
    tones: {
      double: T('Double', { desc: 'Two charges.', set: { charges: 2 } }),
      scorch: T('Scorch', { desc: '180% blast at the origin.', add: [{ op: 'originBlast', r: 3, dmg: 1.8, el: 'flame', burn: true }] }),
      veil: T('Veil', { desc: 'Unseen 2 s, next hit +100%.', flags: ['veil'] }),
    } },
  snuff: { name: 'Snuff', cls: 'lamplighter', lvl: 12, cost: 40, cd: 1, icon: 'curse-icon', clip: 'CastBig', wind: 0.25, rec: 0.3, tags: ['flame'],
    desc: 'All Burn within 14 m pays out at once.',
    fx: [{ op: 'consume_status', status: 'burn', r: 14, mult: 3, el: 'flame', sfx: 'bell_mid', shake: 0.3 }],
    tones: {
      smother: T('Smother', { desc: 'Stuns 1 s.', mod: { stun: 1 } }),
      relight: T('Relight', { desc: 'Re-Burns after 2 s.', mod: { relight: 2 } }),
      harvest: T('Harvest', { desc: '+8 Wick per target.', mod: { genPer: 8 } }),
    } },
  beacon: { name: 'Beacon', cls: 'lamplighter', lvl: 16, cd: 25, icon: 'aura-icon', clip: 'CastBigWeapon', wind: 0.25, rec: 0.35, tags: ['flame'],
    desc: 'A pillar of light. Allies hit harder; enemies burn.',
    fx: [{ op: 'zone', r: 7, t: 10, dps: 0.4, el: 'flame', burn: true, dmgBuff: 0.2, ally: true, vfx: 'patch_fire', sfx: 'bell_mid', shake: 0.15 }],
    tones: {
      walking: T('Walking', { desc: 'Follows you.', mod: { follow: true } }),
      warding: T('Warding', { desc: 'Stops projectiles.', mod: { ward: true } }),
      pyre: T('Pyre', { desc: 'Ends with 600%.', add: [{ op: 'delay', t: 10, then: { op: 'ring', r: 7, dmg: 6, el: 'flame', burn: true, shake: 0.5, shock: true } }] }),
    } },
  long_nights_end: { name: 'Long Nights End', cls: 'lamplighter', lvl: 20, cd: 50, icon: 'fireball-icon', clip: 'CastBig', wind: 0.3, rec: 0.3, tags: ['flame', 'ultimate'],
    desc: 'Seven seconds of falling comets.',
    fx: [{ op: 'comet_rain', t: 7, rate: 3, r: 2.5, dmg: 2.2, el: 'flame', range: 12, burn: true }],
    tones: {
      meteor: T('Meteor', { desc: 'One comet, 1800%.', mod: { rate: 0.15, r: 5, dmg: 18 } }),
      drizzle: T('Drizzle', { desc: 'Five a second, weaker.', mod: { rate: 5, dmg: 1.2, r: 2 } }),
      dawn: T('Dawn', { desc: 'The party heals 5% per second.', mod: { healParty: 0.05 } }),
    } },

  // ---------------- Sexton ----------------
  shovel_swat: { name: 'Shovel Swat', cls: 'sexton', lvl: 1, gen: 8, cd: 0, icon: 'whirlwind-icon', clip: 'Slash1', wind: 0.16, rec: 0.22, melee: true, tags: ['grave'],
    desc: 'A swat with the spade. Builds Tithe.',
    fx: [{ op: 'arc', r: 2.6, ang: 110, dmg: 1.4, el: 'grave', sfx: 'swing', shake: 0.07 }],
    tones: {
      spade_edge: T('Spade Edge', { desc: 'Stuns 0.3 s.', mod: { stun: 0.3 } }),
      flat_side: T('Flat Side', { desc: 'Slower. 180%, knockback.', mod: { dmg: 1.8, knock: 2 }, set: { wind: 0.26, rec: 0.3 } }),
      long_handle: T('Long Handle', { desc: 'Reach 3.6 m.', mod: { r: 3.6 } }),
    } },
  bone_toss: { name: 'Bone Toss', cls: 'sexton', lvl: 2, gen: 5, cd: 0, icon: 'skull', clip: 'Cast', upper: true, wind: 0.14, rec: 0.2, tags: ['grave'],
    desc: 'Lob a bone. It bursts. Move while you throw.',
    fx: [{ op: 'lob', range: 14, r: 1.2, dmg: 1.1, el: 'grave', vfx: 'bone', sfx: 'bone' }],
    tones: {
      ribcage: T('Ribcage', { desc: 'Three shards.', mod: { cluster: 3, dmg: 0.8 } }),
      marrow: T('Marrow', { desc: 'Poison for 3 s.', mod: { status: { id: 'poison', t: 3, dps: 0.4 } } }),
      skull: T('Skull', { desc: 'Homing.', mod: { homing: true } }),
    } },
  raise_pallbearers: { name: 'Raise Pallbearers', cls: 'sexton', lvl: 4, cost: 30, cd: 3, icon: 'summon-icon', clip: 'RaiseHands', wind: 0.25, rec: 0.3, tags: ['grave'],
    desc: 'Raise up to four skeletons.',
    fx: [{ op: 'summon', n: 4, kind: 'skeleton', hp: 3, dmg: 0.6, sfx: 'raise' }],
    tones: {
      coffin_crew: T('Coffin Crew', { desc: 'Two big ones that slam.', mod: { n: 2, kind: 'brute', hp: 8, dmg: 1.4 } }),
      quick_step: T('Quick Step', { desc: 'Faster.', mod: { fast: true } }),
      volatile: T('Volatile', { desc: 'Explode on death.', mod: { explode: 2.0 } }),
    } },
  exhume: { name: 'Exhume', cls: 'sexton', lvl: 6, cost: 20, cd: 1, icon: 'curse-icon', clip: 'CastBig', wind: 0.25, rec: 0.3, tags: ['grave'],
    desc: 'Blow up to five Graves nearby.',
    fx: [{ op: 'consume_graves', n: 5, range: 12, r: 3, dmg: 3.0, el: 'grave', sfx: 'bone_burst', shake: 0.3 }],
    tones: {
      chain: T('Chain', { desc: 'Blasts make Graves burst.', mod: { chain: true } }),
      feast: T('Feast', { desc: 'Heal 2% each.', mod: { heal: 0.02 } }),
      rise: T('Rise', { desc: 'Each leaves a 6 s skeleton.', mod: { rise: 6 } }),
    } },
  coffin_drop: { name: 'Coffin Drop', cls: 'sexton', lvl: 9, cd: 9, icon: 'trap-icon', clip: 'CastWeapon', wind: 0.3, rec: 0.3, tags: ['grave'],
    desc: 'A coffin crashes down and stays as an obstacle.',
    fx: [{ op: 'obstacle', range: 12, r: 3, dmg: 3.8, el: 'grave', stun: 1, t: 4, sfx: 'coffin', shake: 0.4 }],
    tones: {
      family_plot: T('Family Plot', { desc: 'Three coffins.', mod: { n: 3 } }),
      occupied: T('Occupied', { desc: 'Releases a skeleton.', mod: { skeleton: true } }),
      lead_lined: T('Lead-Lined', { desc: '700%, stays 16 s.', mod: { dmg: 7, t: 16 } }),
    } },
  last_rites: { name: 'Last Rites', cls: 'sexton', lvl: 12, cost: 30, cd: 1, icon: 'curse-icon', clip: 'Cast', wind: 0.25, rec: 0.3, tags: ['grave'],
    desc: 'Curse the ground: enemies take +25%.',
    fx: [{ op: 'zone', r: 6, t: 8, curse: 0.25, tithePerDeath: 6, vfx: 'patch_curse', range: 12, sfx: 'curse' }],
    tones: {
      slow_march: T('Slow March', { desc: '30% slow.', mod: { slow: 0.3 } }),
      wasting: T('Wasting', { desc: '60% per second.', mod: { dps: 0.6, el: 'grave' } }),
      following: T('Following', { desc: 'Follows the target.', mod: { followTarget: true } }),
    } },
  gravewalk: { name: 'Gravewalk', cls: 'sexton', lvl: 16, cd: 7, icon: 'dash-icon', clip: 'Roll', wind: 0.05, rec: 0.1, tags: ['grave'],
    desc: 'Sink and rise 9 m away. Invulnerable meanwhile.',
    fx: [{ op: 'blink', dist: 9, r: 3, dmg: 1.5, el: 'grave', inv: 0.4, sfx: 'sink' }],
    tones: {
      deep: T('Deep', { desc: 'Two charges.', set: { charges: 2 } }),
      hands: T('Hands', { desc: 'Roots enemies 1.5 s.', mod: { root: 1.5 } }),
      whole_family: T('Whole Family', { desc: 'Minions come along.', mod: { minions: true } }),
    } },
  danse_macabre: { name: 'Danse Macabre', cls: 'sexton', lvl: 20, cd: 60, icon: 'summon-icon', clip: 'Triumph', wind: 0.3, rec: 0.3, tags: ['grave', 'ultimate'],
    desc: 'Ten seconds: minions surge and every Grave rises.',
    fx: [{ op: 'buff', t: 10, minionDmg: 0.5, raiseGraves: 12, range: 14, sfx: 'raise', shake: 0.3 }],
    tones: {
      tarantella: T('Tarantella', { desc: 'Minions move faster.', mod: { minionSpeed: 0.5 } }),
      finale: T('Finale', { desc: 'All explode at the end.', mod: { finale: 2.5 } }),
      encore: T('Encore', { desc: '40 s cooldown, lasts 6 s.', mod: { t: 6 }, set: { cd: 40 } }),
    } },
};

export const skillTones = (id) => Object.keys(SKILLS[id].tones);
export const toneUnlockLevel = (skillId, idx) => Math.min(30, SKILLS[skillId].lvl + TONE_OFFSETS[idx]);
export const classSkills = (cls) => CLASSES[cls].skills;

/** Resolve a skill with a chosen tone into a flat spec the sim runs. */
export function resolveSkill(skillId, toneId) {
  const s = SKILLS[skillId];
  const spec = { id: skillId, name: s.name, cls: s.cls, gen: s.gen || 0, cost: s.cost || 0, cd: s.cd || 0, clip: s.clip, wind: s.wind, rec: s.rec, upper: !!s.upper, melee: !!s.melee, tags: s.tags, charges: 1, flags: [], icon: s.icon };
  spec.fx = s.fx.map((o) => ({ ...o }));
  const t = toneId && s.tones[toneId];
  if (t) {
    if (t.mod) Object.assign(spec.fx[0], t.mod);
    if (t.add) for (const o of t.add) spec.fx.push({ ...o });
    if (t.set) Object.assign(spec, t.set);
    if (t.flags) spec.flags = [...t.flags];
  }
  return spec;
}
