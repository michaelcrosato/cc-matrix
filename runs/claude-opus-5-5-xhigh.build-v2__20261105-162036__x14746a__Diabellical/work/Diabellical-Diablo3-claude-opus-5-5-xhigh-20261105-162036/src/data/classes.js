// The three trades, and the companion's own small kit.
export const CLASSES = {
  bellwarden: {
    id: 'bellwarden', name: 'BELLWARDEN', res: 'CLANGOR', color: 'orange',
    blurb: 'A guardian of the ringers. Swings a holy hand-bell the size of an anvil.',
    style: 'MELEE. HITS BUILD CLANGOR AND RESONANCE. TOLLS CASH THEM IN.',
    signature: ['clout', 'great_toll', 'bellfall'],
    speed: 5.0, lifeMul: 1.15, armorMul: 1.3, baseRes: 100,
    skills: ['clout', 'chain_reap', 'great_toll', 'reverberate', 'bellfall', 'clapper_charge', 'hallowed_ground', 'last_peal'],
    startGear: { main: 'hand_bell' },
    weapons: ['hand_bell', 'war_bell', 'chain_flail'],
    offhands: ['kite_shield', 'round_shield', 'censer'],
    preset: [['clout', 0], ['chain_reap', 0], ['great_toll', 0], ['reverberate', 0], ['bellfall', 0], ['clapper_charge', 0]],
    voice: 'bark_low', bark: 'NOT ENOUGH CLANGOR',
  },
  lamplighter: {
    id: 'lamplighter', name: 'LAMPLIGHTER', res: 'WICK', color: 'sand',
    blurb: 'Last of the guild that kept the night at bay. Long coat, wide hat, bad temper.',
    style: 'RANGED. FLAME BURNS. BURNING THINGS TAKE MORE. WICK REFILLS ITSELF.',
    signature: ['spark_bolt', 'lantern_hurl', 'lamp_post'],
    speed: 5.6, lifeMul: 1.0, armorMul: 1.0, baseRes: 100,
    skills: ['spark_bolt', 'flare', 'lantern_hurl', 'lamp_post', 'dusk_step', 'snuff', 'beacon', 'long_nights_end'],
    startGear: { main: 'torch_wand' },
    weapons: ['lamp_staff', 'hand_crossbow', 'torch_wand'],
    offhands: ['lantern', 'censer', 'round_shield'],
    preset: [['spark_bolt', 0], ['flare', 0], ['lantern_hurl', 0], ['lamp_post', 0], ['dusk_step', 0], ['snuff', 0]],
    voice: 'bark_mid', bark: 'NOT ENOUGH WICK',
  },
  sexton: {
    id: 'sexton', name: 'SEXTON', res: 'TITHE', color: 'lime',
    blurb: 'Tends the graves and rings the passing bell. Raises what they bury, at union rates.',
    style: 'SUMMONER. THE DEAD STAY AS GRAVES. EXPLODE THEM OR PUT THEM TO WORK.',
    signature: ['shovel_swat', 'raise_pallbearers', 'exhume'],
    speed: 5.2, lifeMul: 1.08, armorMul: 1.1, baseRes: 100,
    skills: ['shovel_swat', 'bone_toss', 'raise_pallbearers', 'exhume', 'coffin_drop', 'last_rites', 'gravewalk', 'danse_macabre'],
    startGear: { main: 'spade' },
    weapons: ['spade', 'scythe', 'grave_sceptre'],
    offhands: ['lantern', 'censer', 'kite_shield'],
    preset: [['shovel_swat', 0], ['bone_toss', 0], ['raise_pallbearers', 0], ['exhume', 0], ['coffin_drop', 0], ['last_rites', 0]],
    voice: 'bark_mid', bark: 'NOT ENOUGH TITHE',
  },
  pyx: {
    id: 'pyx', name: 'SISTER PYX', res: 'FAITH', color: 'white', companion: true,
    blurb: 'An armoured nun with a crossbow.', style: '',
    signature: [],
    speed: 5.2, lifeMul: 1.0, armorMul: 1.2, baseRes: 100,
    skills: ['pyx_bolt', 'pyx_volley', 'pyx_hymn'],
    startGear: { main: 'hand_crossbow' },
    weapons: ['hand_crossbow'], offhands: [],
    preset: [['pyx_bolt', 0], ['pyx_volley', 0], ['pyx_hymn', 0]],
    voice: 'pyx', bark: '',
  },
};
export const PLAYABLE = ['bellwarden', 'lamplighter', 'sexton'];

export const VOWS = {
  bellwarden: [
    { id: 'iron', name: 'IRON', desc: '+20% ARMOUR.' },
    { id: 'clamour', name: 'CLAMOUR', desc: '+20 CLANGOR. NO DRAIN FOR 8 S AFTER A FIGHT.' },
    { id: 'contrition', name: 'CONTRITION', desc: '+15% DAMAGE UNDER HALF LIFE.' },
    { id: 'silence', name: 'SILENCE', desc: 'KILLS GIVE +15% SPEED FOR 3 S.' },
  ],
  lamplighter: [
    { id: 'long_wick', name: 'LONG WICK', desc: '+20 WICK.' },
    { id: 'bright_eyes', name: 'BRIGHT EYES', desc: '+10% CRIT AGAINST BURNING FOES.' },
    { id: 'keeper', name: 'KEEPER OF LAMPS', desc: '+1 LAMP POST.' },
    { id: 'last_light', name: 'LAST LIGHT', desc: 'SURVIVE A FATAL HIT, ONCE PER 90 S.' },
  ],
  sexton: [
    { id: 'union', name: 'UNION RATES', desc: '+1 MINION.' },
    { id: 'plot', name: 'PLOT HOLDER', desc: 'GRAVES LAST 20 S. +10% GRAVE DAMAGE.' },
    { id: 'care', name: 'PERPETUAL CARE', desc: 'MINIONS HEAL YOU 1% PER HIT.' },
    { id: 'due', name: "MOURNER'S DUE", desc: '+2 TITHE PER DEATH.' },
  ],
  pyx: [],
};

// Names drawn for new heroes (shuffle button, no text entry).
export const HERO_NAMES = ['ALDOUS', 'BRAM', 'CORDELIA', 'DUNSTAN', 'EDITH', 'FENWICK', 'GRISELDA', 'HOB', 'ISOLDE', 'JOSS', 'KESTREL', 'LORCAN', 'MERCY', 'NELL', 'ODO', 'PRUDENCE', 'QUILL', 'ROWAN', 'SILAS', 'TAMSIN', 'URSULA', 'VESPER', 'WREN', 'YORICK'];
