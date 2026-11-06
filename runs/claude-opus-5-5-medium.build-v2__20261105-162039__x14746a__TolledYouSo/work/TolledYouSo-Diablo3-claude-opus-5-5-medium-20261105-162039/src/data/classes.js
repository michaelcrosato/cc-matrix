// Classes, skills and Tones are data; src/sim/effects.js only knows the ops they compose.
// dmg is a multiple of weapon damage. set patches the first op; add appends ops.
const S = (o) => o;

const BELLWARDEN = [
  S({ id: 'clout', name: 'Clout', level: 1, gen: 10, clip: ['Slash1', 'Slash2', 'Slash3'], wind: 0.16, rec: 0.2, element: 'sound', icon: 'i_bell', desc: 'Swing the bell in an arc. Builds Clangor.', sfx: 'swing_heavy', vfx: 'swing',
    fx: [{ op: 'arc', range: 2.8, angle: 120, dmg: 1.5, sfx: 'hit_bell' }],
    tones: {
      ringing: { name: 'Ringing', desc: 'The note jumps to 2 more foes at 60%.', set: { chain: { count: 2, range: 6, mult: 0.6 } } },
      heavy: { name: 'Heavy', desc: 'Slower, 230%, stuns 0.4 s.', set: { dmg: 2.3, stun: 0.4 }, wind: 0.28 },
      pious: { name: 'Pious', desc: 'Heal 2% of life per foe struck.', set: { heal: 0.02 } },
    } }),
  S({ id: 'chain_reap', name: 'Chain Reap', level: 2, genPerTarget: 6, clip: 'Spin', wind: 0.12, rec: 0.3, element: 'phys', icon: 'whirlwind-icon', desc: 'Whirl the chain in a full circle.', sfx: 'chain_whirl', vfx: 'ring_chain',
    fx: [{ op: 'circle', radius: 4, dmg: 1.1, vfx: 'ring_chain' }],
    tones: {
      drag: { name: 'Drag', desc: 'Pulls foes 1.5 m toward you.', set: { pull: 1.5 } },
      long_chain: { name: 'Long Chain', desc: 'Reaches 5.5 m.', set: { radius: 5.5 } },
      rust: { name: 'Rust', desc: 'Bleeds 40% a second for 3 s.', set: { bleed: 0.4 } },
    } }),
  S({ id: 'great_toll', name: 'Great Toll', level: 4, cost: 30, clip: 'BellOverhead', wind: 0.22, rec: 0.3, tags: ['toll'], element: 'sound', icon: 'i_toll', desc: 'A huge ring of sound. Consumes Resonance.', sfx: 'bell_big',
    fx: [{ op: 'ring', radius: 6, dmg: 3, knock: 3, consume: 'resonance', vfx: 'ring_bronze', shake: 0.4 }],
    tones: {
      twin_peal: { name: 'Twin Peal', desc: 'A second ring after 0.5 s at 70%.', add: [{ op: 'delay', t: 0.5, then: [{ op: 'ring', radius: 6, dmg: 2.1, vfx: 'ring_bronze', sfx: 'bell_big', shake: 0.2 }] }] },
      cracked: { name: 'Cracked', desc: 'Leaves shock patches for 4 s.', add: [{ op: 'zone', radius: 5, dur: 4, tick: 0.5, dmg: 0.25, element: 'sound', look: 'shock' }] },
      deaf: { name: 'Deaf', desc: '200% and stuns for 1 s.', set: { dmg: 2, stun: 1 } },
    } }),
  S({ id: 'reverberate', name: 'Reverberate', level: 6, cost: 20, clip: 'Shout', wind: 0.2, rec: 0.25, tags: ['toll'], element: 'sound', icon: 'lightning-bolt-icon', desc: 'A wave of sound that passes through foes.', sfx: 'shout_wave',
    fx: [{ op: 'projectile', speed: 16, range: 9, width: 1.8, pierce: true, dmg: 2.6, consume: 'resonance', look: 'wave' }],
    tones: {
      echo: { name: 'Echo', desc: 'Bounces off walls once.', set: { bounce: 1, range: 14 } },
      narrow: { name: 'Narrow', desc: 'Much narrower, 420%.', set: { width: 0.75, dmg: 4.2 } },
      hymn: { name: 'Hymn', desc: 'Gives 3 Clangor per foe struck.', set: { resPerTarget: 3 } },
    } }),
  S({ id: 'bellfall', name: 'Bellfall', level: 9, cd: 10, clip: 'LeapSlam', wind: 0.1, rec: 0.3, element: 'sound', icon: 'leap-icon', desc: 'Leap to the spot; a bell falls with you.', sfx: 'whoosh_big', target: true, range: 12,
    fx: [{ op: 'leap', range: 12, time: 0.45, then: [{ op: 'circle', radius: 2.4, dmg: 4, vfx: 'ring_bronze', sfx: 'bell_fall', shake: 0.45, decal: 'crack' }] }],
    tones: {
      iron_bell: { name: 'Iron Bell', desc: 'Leaves a taunting bell for 5 s, 100% a second.', add: [{ op: 'delay', t: 0.45, then: [{ op: 'turret', kind: 'iron_bell', dur: 5, rate: 1, dmg: 1, radius: 3, taunt: true }] }] },
      swift: { name: 'Swift', desc: '6 s cooldown, 250%.', cd: 6, patch: [{ path: 'then.0.dmg', v: 2.5 }] },
      comet: { name: 'Comet', desc: 'Leaves a burning trail.', add: [{ op: 'trail', dur: 3, dmg: 0.6, element: 'flame', radius: 1.2, steps: 6 }] },
    } }),
  S({ id: 'clapper_charge', name: 'Clapper Charge', level: 12, cd: 8, clip: 'Charge', wind: 0.08, rec: 0.2, element: 'phys', icon: 'dash-icon', desc: 'Dash 10 m, shoving everything aside.', sfx: 'charge',
    fx: [{ op: 'dash', dist: 10, time: 0.42, dmg: 2, width: 1.5, shove: 2 }],
    tones: {
      battering: { name: 'Battering', desc: 'Stuns foes at the end.', add: [{ op: 'delay', t: 0.42, then: [{ op: 'circle', radius: 3, dmg: 0.5, stun: 1.2, sfx: 'hit_stone', vfx: 'ring_chain' }] }] },
      relentless: { name: 'Relentless', desc: 'Kills refund half the cooldown.', set: { refundKill: 0.5 } },
      wake: { name: 'Wake', desc: 'Leaves a trail of sound, 80% a second.', add: [{ op: 'trail', dur: 3, dmg: 0.8, element: 'sound', radius: 1.3, steps: 6, look: 'shock' }] },
    } }),
  S({ id: 'hallowed_ground', name: 'Hallowed Ground', level: 16, cd: 20, clip: 'CastBigWeapon', wind: 0.3, rec: 0.3, element: 'sound', icon: 'aura-icon', desc: '8 s ring: allies take 30% less and heal.', sfx: 'hymn',
    fx: [{ op: 'zone', radius: 7, dur: 8, tick: 0.5, ally: { dr: 0.3, heal: 0.03 }, look: 'hallowed' }],
    tones: {
      vigil: { name: 'Vigil', desc: 'Allies inside cannot be stunned.', patch: [{ path: 'ally.stunImmune', v: true }] },
      ire: { name: 'Ire', desc: 'Allies inside deal +25% damage.', patch: [{ path: 'ally.dmg', v: 0.25 }] },
      procession: { name: 'Procession', desc: 'The ring follows you.', set: { follow: true } },
    } }),
  S({ id: 'last_peal', name: 'Last Peal', level: 20, cd: 45, clip: 'Spin', loopClip: true, wind: 0.1, rec: 0.2, element: 'sound', icon: 'frost-nova-icon', desc: '8 s of spinning ruin. You cannot be stopped.', sfx: 'chain_whirl',
    fx: [{ op: 'buff', id: 'last_peal', dur: 8, unstoppable: true, slow: 0.2, spin: { every: 0.25, radius: 4.5, dmg: 1.8 } }],
    tones: {
      cyclone: { name: 'Cyclone', desc: 'Pulls foes in as you spin.', patch: [{ path: 'spin.pull', v: 1 }] },
      thunder: { name: 'Thunder', desc: 'Ends with an 800% blast.', add: [{ op: 'delay', t: 8, then: [{ op: 'ring', radius: 7, dmg: 8, vfx: 'ring_bronze', sfx: 'bell_big', shake: 0.6 }] }] },
      eternal: { name: 'Eternal', desc: 'Each kill adds 0.3 s.', patch: [{ path: 'spin.killExtend', v: 0.3 }] },
    } }),
];

const LAMPLIGHTER = [
  S({ id: 'spark_bolt', name: 'Spark Bolt', level: 1, gen: 4, clip: 'CastWeapon', upper: true, moving: true, wind: 0.1, rec: 0.14, element: 'flame', icon: 'fireball-icon', desc: 'A fast bolt that sets foes Burning.', sfx: 'spark',
    fx: [{ op: 'projectile', speed: 20, range: 18, width: 0.5, dmg: 1.2, look: 'spark' }],
    tones: {
      split: { name: 'Split', desc: 'Pierces once and forks on a kill.', set: { pierceN: 1, forkOnKill: 2 } },
      swift: { name: 'Swift', desc: '1.4 times faster, 90%.', set: { speed: 28, dmg: 0.9 }, wind: 0.07 },
      star: { name: 'Star', desc: 'Arcs to 2 more foes.', set: { chain: { count: 2, range: 7, mult: 0.5 } } },
    } }),
  S({ id: 'flare', name: 'Flare', level: 2, cost: 20, clip: 'Cast', wind: 0.14, rec: 0.2, element: 'flame', icon: 'star', desc: 'A blinding cone of fire. Foes miss for 1.5 s.', sfx: 'flare',
    fx: [{ op: 'cone', range: 8, angle: 55, dmg: 2.2, blind: 1.5, vfx: 'cone_fire', shake: 0.1 }],
    tones: {
      phosphor: { name: 'Phosphor', desc: 'A cone half again as wide.', set: { angle: 85 } },
      magnesium: { name: 'Magnesium', desc: '340%, but no blinding.', set: { dmg: 3.4, blind: 0 } },
      signal: { name: 'Signal', desc: 'Marks foes: allies deal +20% for 5 s.', set: { mark: 5 } },
    } }),
  S({ id: 'lantern_hurl', name: 'Lantern Hurl', level: 4, cost: 30, clip: 'LanternLob', wind: 0.2, rec: 0.25, element: 'flame', icon: 'torch-icon', desc: 'Lob a lantern: a blast and a burning pool.', sfx: 'whoosh', target: true, range: 14,
    fx: [{ op: 'lob', range: 14, time: 0.5, look: 'lantern', then: [{ op: 'circle', radius: 3, dmg: 2.4, vfx: 'ring_fire', sfx: 'explode_fire', shake: 0.2, decal: 'scorch' }, { op: 'zone', radius: 3, dur: 4, tick: 0.5, dmg: 0.3, element: 'flame', look: 'fire' }] }],
    tones: {
      cluster: { name: 'Cluster', desc: 'Three smaller lanterns.', fxAll: [
        { op: 'lob', range: 14, time: 0.45, look: 'lantern', spread: 2.5, count: 3, then: [{ op: 'circle', radius: 2, dmg: 1.4, vfx: 'ring_fire', sfx: 'explode_fire', decal: 'scorch' }, { op: 'zone', radius: 2, dur: 3, tick: 0.5, dmg: 0.2, element: 'flame', look: 'fire' }] }] },
      oil: { name: 'Oil', desc: 'The pool burns for 8 s.', patch: [{ path: 'then.1.dur', v: 8 }] },
      blue_flame: { name: 'Blue Flame', desc: 'The pool slows foes 40%.', patch: [{ path: 'then.1.slow', v: 0.4 }, { path: 'then.1.look', v: 'blue' }] },
    } }),
  S({ id: 'lamp_post', name: 'Lamp Post', level: 6, cd: 12, clip: 'Dig', wind: 0.25, rec: 0.2, element: 'flame', icon: 'totem-icon', desc: 'Plants a lamp for 15 s that fires bolts. Max 3.', sfx: 'plant', target: true, range: 8,
    fx: [{ op: 'turret', kind: 'lamp', dur: 15, rate: 0.5, dmg: 0.7, range: 12, max: 3 }],
    tones: {
      arc_lamp: { name: 'Arc Lamp', desc: 'Beams burn foes between lamps.', set: { arc: 1 } },
      bright: { name: 'Bright', desc: 'Heals allies within 4 m.', set: { healAura: 0.03 } },
      bomb: { name: 'Bomb', desc: 'Explodes for 500% when it ends.', set: { endBlast: 5 } },
    } }),
  S({ id: 'dusk_step', name: 'Dusk Step', level: 9, cd: 6, clip: 'Roll', wind: 0.02, rec: 0.1, element: 'flame', icon: 'cloak-icon', desc: 'Blink 8 m, leaving an ember decoy for 2 s.', sfx: 'blink',
    fx: [{ op: 'spawn_decoy', dur: 2 }, { op: 'blink', dist: 8 }],
    tones: {
      double: { name: 'Double', desc: 'Holds 2 charges.', charges: 2 },
      scorch: { name: 'Scorch', desc: 'A 180% blast where you stood.', add: [{ op: 'circle', radius: 3.2, at: 'origin', dmg: 1.8, vfx: 'ring_fire', sfx: 'explode_fire' }] },
      veil: { name: 'Veil', desc: 'Unseen 2 s; your next hit deals +100%.', add: [{ op: 'buff', id: 'veil', dur: 2, unseen: true, nextHit: 1 }] },
    } }),
  S({ id: 'snuff', name: 'Snuff', level: 12, cost: 40, clip: 'CastBig', wind: 0.22, rec: 0.25, element: 'flame', icon: 'poison-cloud-icon', desc: 'All Burn within 14 m pays out at once, times 3.', sfx: 'snuff',
    fx: [{ op: 'consume_status', status: 'burn', radius: 14, mult: 3, vfx: 'ring_fire', shake: 0.3 }],
    tones: {
      smother: { name: 'Smother', desc: 'Stuns those foes for 1 s.', set: { stun: 1 } },
      relight: { name: 'Relight', desc: 'They Burn again after 2 s.', set: { relight: 2 } },
      harvest: { name: 'Harvest', desc: 'Gives 8 Wick per foe.', set: { resPerTarget: 8 } },
    } }),
  S({ id: 'beacon', name: 'Beacon', level: 16, cd: 25, clip: 'CastBigWeapon', wind: 0.3, rec: 0.25, element: 'flame', icon: 'aura-icon', desc: '10 s pillar: allies +20% damage, +50% Wick.', sfx: 'beacon', target: true, range: 8,
    fx: [{ op: 'zone', radius: 7, dur: 10, tick: 0.5, dmg: 0.2, element: 'flame', ally: { dmg: 0.2, wick: 0.5 }, look: 'beacon' }],
    tones: {
      walking: { name: 'Walking', desc: 'The pillar follows you.', set: { follow: true } },
      warding: { name: 'Warding', desc: 'Stops enemy shots inside it.', set: { ward: true } },
      pyre: { name: 'Pyre', desc: 'Ends with a 600% blast.', add: [{ op: 'delay', t: 10, then: [{ op: 'circle', at: 'zoneTarget', radius: 7, dmg: 6, vfx: 'ring_fire', sfx: 'explode_fire', shake: 0.5 }] }] },
    } }),
  S({ id: 'long_nights_end', name: "Long Night's End", level: 20, cd: 50, clip: 'CastBig', wind: 0.3, rec: 0.3, element: 'flame', icon: 'arrow-volley-icon', desc: '7 s of falling comets around you.', sfx: 'comet_call',
    fx: [{ op: 'comet_rain', dur: 7, rate: 3, dmg: 2.2, radius: 2.5, area: 11 }],
    tones: {
      meteor: { name: 'Meteor', desc: 'One great comet for 1800%.', fxAll: [{ op: 'lob', range: 16, time: 1, look: 'comet', then: [{ op: 'circle', radius: 6, dmg: 18, vfx: 'ring_fire', sfx: 'explode_big', shake: 0.8, decal: 'scorch' }] }] },
      drizzle: { name: 'Drizzle', desc: '5 a second, weaker.', set: { rate: 5, dmg: 1.4 } },
      dawn: { name: 'Dawn', desc: 'The party heals 5% a second.', set: { partyHeal: 0.05 } },
    } }),
];

const SEXTON = [
  S({ id: 'shovel_swat', name: 'Shovel Swat', level: 1, gen: 8, clip: 'ShovelSwat', wind: 0.14, rec: 0.18, element: 'grave', icon: 'i_shovel', desc: 'Swat what is in front of you. Builds Tithe.', sfx: 'swing_shovel', vfx: 'swing',
    fx: [{ op: 'arc', range: 2.6, angle: 110, dmg: 1.4, sfx: 'hit_flesh' }],
    tones: {
      spade_edge: { name: 'Spade Edge', desc: 'Stuns for 0.3 s.', set: { stun: 0.3 } },
      flat_side: { name: 'Flat Side', desc: 'Slower, 180%, with knockback.', set: { dmg: 1.8, knock: 2 }, wind: 0.22 },
      long_handle: { name: 'Long Handle', desc: 'Reaches 3.6 m.', set: { range: 3.6 } },
    } }),
  S({ id: 'bone_toss', name: 'Bone Toss', level: 2, gen: 5, clip: 'Cast', upper: true, moving: true, wind: 0.14, rec: 0.16, element: 'grave', icon: 'i_bone', desc: 'A lobbed bone that bursts on impact.', sfx: 'toss',
    fx: [{ op: 'projectile', speed: 15, range: 14, width: 0.6, dmg: 1.1, burst: 1.2, look: 'bone' }],
    tones: {
      ribcage: { name: 'Ribcage', desc: 'Three shards in a fan.', set: { count: 3, spread: 20, dmg: 0.7 } },
      marrow: { name: 'Marrow', desc: 'Poisons for 3 s.', set: { poison: 0.5 } },
      skull: { name: 'Skull', desc: 'Homes in on foes.', set: { homing: 4, look: 'skull' } },
    } }),
  S({ id: 'raise_pallbearers', name: 'Raise Pallbearers', level: 4, cost: 30, cd: 3, clip: 'RaiseHands', wind: 0.25, rec: 0.2, element: 'grave', icon: 'summon-icon', desc: 'Up to 4 skeletons at union rates.', sfx: 'raise',
    fx: [{ op: 'summon', kind: 'pallbearer', count: 2, max: 4, dmg: 0.6 }],
    tones: {
      coffin_crew: { name: 'Coffin Crew', desc: '2 big ones that slam.', set: { kind: 'coffin_crew', max: 2, count: 1, dmg: 1.4, slam: true, hpMul: 2.5 } },
      quick_step: { name: 'Quick Step', desc: 'They move and hit faster.', set: { speedMul: 1.6 } },
      volatile: { name: 'Volatile', desc: 'They explode on death.', set: { explode: 1 } },
    } }),
  S({ id: 'exhume', name: 'Exhume', level: 6, cost: 20, clip: 'CastBig', wind: 0.18, rec: 0.25, element: 'grave', icon: 'skull', desc: 'Explodes up to 5 Graves within 12 m.', sfx: 'exhume',
    fx: [{ op: 'consume_graves', radius: 12, max: 5, dmg: 3, blast: 3, shake: 0.25 }],
    tones: {
      chain: { name: 'Chain', desc: 'Blasts make more Graves burst.', set: { chainGraves: true } },
      feast: { name: 'Feast', desc: 'Heals 2% for each Grave.', set: { heal: 0.02 } },
      rise: { name: 'Rise', desc: 'Each Grave leaves a 6 s skeleton.', set: { rise: 6 } },
    } }),
  S({ id: 'coffin_drop', name: 'Coffin Drop', level: 9, cd: 9, clip: 'CastWeapon', wind: 0.18, rec: 0.25, element: 'grave', icon: 'i_coffin', desc: 'A coffin crashes down and stays 4 s.', sfx: 'whoosh', target: true, range: 12,
    fx: [{ op: 'lob', range: 12, time: 0.4, look: 'coffin', then: [{ op: 'circle', radius: 3, dmg: 3.8, stun: 1, vfx: 'ring_chain', sfx: 'coffin_crash', shake: 0.35, decal: 'crack' }, { op: 'obstacle', radius: 1, dur: 4, look: 'coffin' }] }],
    tones: {
      family_plot: { name: 'Family Plot', desc: 'Three coffins.', fxAll: [{ op: 'lob', range: 12, time: 0.4, look: 'coffin', spread: 3, count: 3, then: [{ op: 'circle', radius: 2.5, dmg: 2.4, stun: 1, vfx: 'ring_chain', sfx: 'coffin_crash', shake: 0.2 }, { op: 'obstacle', radius: 1, dur: 4, look: 'coffin' }] }] },
      occupied: { name: 'Occupied', desc: 'Releases a skeleton.', addThen: [{ op: 'summon', kind: 'pallbearer', count: 1, max: 12, dmg: 0.6, ttl: 12 }] },
      lead_lined: { name: 'Lead-Lined', desc: '700%, 16 s cooldown.', cd: 16, patch: [{ path: 'then.0.dmg', v: 7 }] },
    } }),
  S({ id: 'last_rites', name: 'Last Rites', level: 12, cost: 30, clip: 'Cast', wind: 0.2, rec: 0.2, element: 'grave', icon: 'curse-icon', desc: '8 s curse: foes take +25%. Deaths give Tithe.', sfx: 'curse', target: true, range: 14,
    fx: [{ op: 'debuff', radius: 6, dur: 8, curse: 0.25, tithe: 6, look: 'curse' }],
    tones: {
      slow_march: { name: 'Slow March', desc: 'Slows foes 30%.', set: { slow: 0.3 } },
      wasting: { name: 'Wasting', desc: '60% a second.', set: { dmg: 0.3, tick: 0.5 } },
      following: { name: 'Following', desc: 'Follows you about.', set: { follow: true } },
    } }),
  S({ id: 'gravewalk', name: 'Gravewalk', level: 16, cd: 7, clip: 'SinkGround', wind: 0.08, rec: 0.1, element: 'grave', icon: 'trap-icon', desc: 'Sink and rise 9 m away with a burst.', sfx: 'sink',
    fx: [{ op: 'blink', dist: 9, inv: 0.4, then: [{ op: 'circle', radius: 3.5, dmg: 1.5, vfx: 'ring_grave', sfx: 'grave_burst', decal: 'crack' }] }],
    tones: {
      deep: { name: 'Deep', desc: 'Holds 2 charges.', charges: 2 },
      hands: { name: 'Hands', desc: 'Roots foes 1.5 s at the exit.', patch: [{ path: 'then.0.root', v: 1.5 }] },
      whole_family: { name: 'Whole Family', desc: 'Your minions come along.', set: { bringMinions: true } },
    } }),
  S({ id: 'danse_macabre', name: 'Danse Macabre', level: 20, cd: 60, clip: 'Triumph', wind: 0.3, rec: 0.3, element: 'grave', icon: 'heal-icon', desc: '10 s: minions +50%, every Grave rises.', sfx: 'danse',
    fx: [{ op: 'buff', id: 'danse', dur: 10, minionDmg: 0.5 }, { op: 'raise_graves', radius: 14, max: 12, dmg: 0.6, ttl: 10 }],
    tones: {
      tarantella: { name: 'Tarantella', desc: 'You and your minions move faster.', patch: [{ path: 'speed', v: 0.3 }] },
      finale: { name: 'Finale', desc: 'All minions explode at the end.', add: [{ op: 'delay', t: 10, then: [{ op: 'detonate_minions', dmg: 3, radius: 3 }] }] },
      encore: { name: 'Encore', desc: '40 s cooldown; lasts 6 s.', cd: 40, patch: [{ path: 'dur', v: 6 }] },
    } }),
];

export const CLASSES = {
  bellwarden: { id: 'bellwarden', name: 'Bellwarden', resource: 'Clangor', lifeMul: 1.25, armorMul: 1.3, speed: 5.0, color: 'orange', fantasy: 'Swings a consecrated bell the size of an anvil.', signature: ['clout', 'great_toll', 'bellfall'], skills: BELLWARDEN,
    vows: [
      { id: 'iron', name: 'Iron', desc: '+20% armour.' },
      { id: 'clamour', name: 'Clamour', desc: '+20 Clangor; no drain for 8 s after a kill.' },
      { id: 'contrition', name: 'Contrition', desc: '+15% damage under half life.' },
      { id: 'silence', name: 'Silence', desc: 'Kills give +15% speed for 3 s.' },
    ], starterWeapon: 'mace', voice: { register: 'low', pitch: -2, rate: 0.085 } },
  lamplighter: { id: 'lamplighter', name: 'Lamplighter', resource: 'Wick', lifeMul: 1.0, armorMul: 1.0, speed: 5.6, color: 'sand', fantasy: 'Last of the guild that keeps the night at bay.', signature: ['spark_bolt', 'lantern_hurl', 'long_nights_end'], skills: LAMPLIGHTER,
    vows: [
      { id: 'long_wick', name: 'Long Wick', desc: '+20 Wick.' },
      { id: 'bright_eyes', name: 'Bright Eyes', desc: '+10% crit against burning foes.' },
      { id: 'keeper_of_lamps', name: 'Keeper of Lamps', desc: '+1 Lamp Post.' },
      { id: 'last_light', name: 'Last Light', desc: 'Survive a fatal hit, once in 90 s.' },
    ], starterWeapon: 'staff', voice: { register: 'mid', pitch: 2, rate: 0.075 } },
  sexton: { id: 'sexton', name: 'Sexton', resource: 'Tithe', lifeMul: 1.12, armorMul: 1.1, speed: 5.2, color: 'lime', fantasy: 'Raises what they bury, at union rates.', signature: ['raise_pallbearers', 'exhume', 'danse_macabre'], skills: SEXTON,
    vows: [
      { id: 'union_rates', name: 'Union Rates', desc: '+1 minion.' },
      { id: 'plot_holder', name: 'Plot Holder', desc: 'Graves last 20 s, +10% Grave damage.' },
      { id: 'perpetual_care', name: 'Perpetual Care', desc: 'Minions heal you 1% a hit.' },
      { id: 'mourners_due', name: "Mourner's Due", desc: '+2 Tithe per death.' },
    ], starterWeapon: 'shovel', voice: { register: 'low', pitch: 1, rate: 0.1 } },
};
export const CLASS_IDS = ['bellwarden', 'lamplighter', 'sexton'];
export const SKILLS = {};
for (const c of CLASS_IDS) for (const s of CLASSES[c].skills) { s.cls = c; SKILLS[s.id] = s; }
export const toneUnlockLevel = (skill, i) => Math.min(30, skill.level + [2, 6, 11][i]);
