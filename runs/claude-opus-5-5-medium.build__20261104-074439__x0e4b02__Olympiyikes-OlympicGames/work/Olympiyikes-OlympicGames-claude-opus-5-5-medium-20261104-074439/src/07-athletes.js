/* OLYMPIYIKES! — the eight nations, their star athletes, teammates and outfits per sport (§7.1). */
(() => {
'use strict';
const E = My3D2dge, O = OLY;
const EV = ['sprint', 'javelin', 'swim', 'diving', 'archery', 'weights', 'skijump', 'downhill', 'bobsled', 'figure', 'curling', 'hockey'];
const sk = arr => { const o = {}; EV.forEach((e, i) => { o[e] = arr[i]; }); return o; };
O.NATIONS = [
  { id: 'SUN', name: 'SUNVALE', colors: { a: '#f2b632', b: '#2f7fe0', c: '#ffffff' }, flag: 'sun', athlete: 'DASH GOLDBERRY', build: 'heroic', hair: 'short', hairC: '#3a2414', skin: '#8d5a3b', voice: { pitch: 1.0, speed: 1.1 }, personality: 'sunny optimist',
    skills: sk([.92, .85, .70, .62, .66, .70, .60, .65, .78, .60, .62, .74]), team: ['SUNNY RAY', 'BO MARIGOLD', 'LUX DAYBRIGHT'],
    bio: 'Dash grew up on a farm in rural Sunvale, chasing the family\'s prize ostrich to school every morning. The ostrich never once let Dash win. Today, Dash runs for Daisy.',
    parade: 'where the sun never sets and the sunscreen budget is classified.' },
  { id: 'FRM', name: 'FROSTMARK', colors: { a: '#f4f8ff', b: '#2fa8d8', c: '#1a3a6a' }, flag: 'snow', athlete: 'INGRID SNOWCASTLE', build: 'heroic', hair: 'ponytail', hairC: '#f3e6c0', skin: '#f2d4c4', voice: { pitch: 1.3, speed: .9 }, personality: 'deadpan',
    skills: sk([.70, .74, .66, .68, .80, .66, .94, .92, .74, .76, .80, .78]), team: ['SVEN DRIFTHOLM', 'LIV HAILSTROM', 'NILS FROSTBY'],
    bio: 'Ingrid\'s grandmother taught her to ski jump off the roof of the family sauna. The sauna has since been rebuilt. Twice.',
    parade: 'their flag bearer is carrying the flag AND a small sauna.' },
  { id: 'TRB', name: 'TURBONIA', colors: { a: '#e23b2e', b: '#1e2026', c: '#ffd23a' }, flag: 'bolt', athlete: 'MAX OVERDRIVE', build: 'heroic', hair: 'spiky', hairC: '#141414', skin: '#c88a5e', hat: 'band', voice: { pitch: .9, speed: 1.25 }, personality: 'arrogant, loud',
    skills: sk([.93, .90, .78, .70, .72, .82, .80, .84, .95, .62, .66, .93]), team: ['REV THROTTLETON', 'NITRO VEX', 'GIGI TORQUE'],
    bio: 'Defending champion in, quote, "everything". Max has never lost a race, a staring contest, or an argument with a mirror. Hobbies: winning, and describing winning.',
    parade: 'led by defending champion Max Overdrive, who asked us to call him "The Defending Champion", even while asleep.' },
  { id: 'BON', name: 'BONBONIA', colors: { a: '#ff7fb8', b: '#6fe0c0', c: '#ffffff' }, flag: 'stripes', athlete: 'COCO BONBON', build: 'heroic', hair: 'long', hairC: '#ff9ad0', skin: '#f5c9a8', bigEyes: true, voice: { pitch: 1.45, speed: 1.05 }, personality: 'theatrical',
    skills: sk([.66, .62, .80, .92, .74, .58, .70, .68, .62, .95, .70, .64]), team: ['TAFFY SWIRL', 'PRALINE DUPREE', 'NOUGAT FIZZ'],
    bio: 'Coco skates every program to the songs a grandfather used to whistle. Coco says the whistling can still be heard in the crowd. Usually slightly off-key.',
    parade: 'their uniforms are, legally, dessert.' },
  { id: 'VOL', name: 'VOLCANICA', colors: { a: '#ff6a1a', b: '#3a2e2e', c: '#ffd0a0' }, flag: 'volcano', athlete: 'BLAZE CINDERHART', build: 'bulky', hair: 'bald', hairC: '#2a1a10', skin: '#6a4028', voice: { pitch: .7, speed: .85 }, personality: 'gentle giant',
    skills: sk([.72, .88, .62, .55, .64, .95, .62, .70, .86, .52, .82, .88]), team: ['ASH KINDLETON', 'EMBER STONE', 'OBSIDIA CRAG'],
    bio: 'Every winter morning, Blaze lifts the family car out of a volcanic ash drift. The car is fine. The car is extremely well-defined.',
    parade: 'please don\'t stand too close. They\'re very warm people.' },
  { id: 'WAV', name: 'WAVELIA', colors: { a: '#1fa8a0', b: '#0e4a6a', c: '#e8fbf7' }, flag: 'waves', athlete: 'MARINA SPLASHWORTH', build: 'heroic', hair: 'short', hairC: '#24160e', skin: '#5a3420', voice: { pitch: 1.25, speed: .95 }, personality: 'calm poet',
    skills: sk([.74, .68, .95, .88, .70, .64, .66, .62, .64, .80, .72, .66]), team: ['CORAL FINLEY', 'TIDE BRENNAN', 'KAI SEABORNE'],
    bio: 'Born on a houseboat, Marina didn\'t touch dry land until age four. On land Marina still walks like the deck is moving. In the water... poetry.',
    parade: 'they arrived by boat. They prefer it.' },
  { id: 'MTP', name: 'MOUNTOPIA', colors: { a: '#6a3fc8', b: '#c8ccd8', c: '#ffffff' }, flag: 'peak', athlete: 'ROCKY SUMMIT', build: 'heroic', hair: 'short', hairC: '#8a5a2a', skin: '#e0b090', hat: 'cap', voice: { pitch: .95, speed: 1.0 }, personality: 'folksy',
    skills: sk([.68, .72, .64, .60, .86, .74, .82, .88, .80, .66, .93, .80]), team: ['EDELWEISS VOGT', 'CLIFF HANGAR', 'SCREE HALVORSEN'],
    bio: 'Rocky\'s village sits so high that the mail arrives by curling stone. Rocky has been sweeping since before walking. First word: "HARD!"',
    parade: 'they train at altitude, with less oxygen and more yodeling.' },
  { id: 'NEO', name: 'NEON REPUBLIC', colors: { a: '#e83ae0', b: '#14102a', c: '#3ae8f0' }, flag: 'neon', athlete: 'PIXEL VANCE', build: 'heroic', hair: 'spiky', hairC: '#3ae8f0', skin: '#f0c8a8', voice: { pitch: 1.15, speed: 1.2 }, personality: 'gamer slang',
    skills: sk([.78, .70, .72, .74, .93, .60, .74, .76, .70, .82, .76, .84]), team: ['BYTE ORTEGA', 'GLITCH KOWALSKI', 'VECTOR NAKAMURA'],
    bio: 'Pixel learned archery from an arcade cabinet and has never seen daylight without sunglasses. Pixel\'s coach is a toaster named Gary. Gary believes in Pixel.',
    parade: 'their uniforms come with a firmware update.' }
];
O.NAT = {}; for (const n of O.NATIONS) O.NAT[n.id] = n;
O.EVENT_IDS = EV;

/** the voice an athlete speaks with */
O.voiceOf = nat => ({ base: 130 * nat.voice.pitch, speed: nat.voice.speed, wave: nat.id === 'TRB' ? 'pulse' : 'triangle', formant: nat.voice.pitch > 1.2 ? 1.15 : 1 });

/** a rig for a nation's athlete dressed for a sport (§7.1 outfits); opts: { mate: index (teammate), size } */
O.makeRig = (nat, sport, opts = {}) => {
  const c = nat.colors, mate = opts.mate;
  const tm = mate !== undefined;
  const hairStyles = ['short', 'spiky', 'ponytail', 'long', 'bald'];
  const skins = ['#f2d4c4', '#c88a5e', '#8d5a3b', '#e0b090', '#5a3420'];
  const hair = tm ? hairStyles[(mate + nat.id.charCodeAt(0)) % 5] : nat.hair;
  const skin = tm ? skins[(mate * 3 + nat.id.charCodeAt(1)) % 5] : nat.skin;
  const hairC = tm ? ['#2a1a10', '#8a5a2a', '#e8c070', '#141414'][(mate + nat.id.charCodeAt(2)) % 4] : nat.hairC;
  const dark = c.b === '#1e2026' || c.b === '#3a2e2e' || c.b === '#14102a';
  let colors = { skin, hair: hairC, cloth: c.a, pants: c.b, boot: '#1a1a22', belt: c.b, trim: c.c, glove: skin, metal: '#c8ccd8', eye: '#1a1d2e' };
  let o = { size: opts.size || (nat.build === 'bulky' ? 1.3 : 1.25), build: tm ? 'heroic' : nat.build, weapon: null, hair, outfit: 'shirt', sleeves: 'none' };
  if (!tm && nat.hat) o.hat = { style: nat.hat, color: nat.id === 'TRB' ? '#e23b2e' : c.b };
  if (!tm && nat.bigEyes) o.face = { eyes: 'big' };
  switch (sport) {
    case 'swim': case 'diving': o.sleeves = 'none'; colors.cloth = skin; colors.pants = c.a; colors.boot = skin; o.hat = { style: 'helmet', color: c.a }; o.hair = 'bald'; break;
    case 'downhill': case 'bobsled': case 'skijump': o.sleeves = 'long'; colors.cloth = c.a; colors.pants = c.a; colors.trim = c.c; colors.glove = c.b; o.hat = { style: 'helmet', color: dark ? c.c : c.b }; colors.boot = '#2a2a34'; break;
    case 'figure': o.sleeves = 'long'; colors.cloth = c.a; colors.pants = c.a; colors.trim = '#ffffff'; colors.boot = '#f4f4f8'; break;
    case 'curling': o.sleeves = 'long'; o.outfit = 'coat'; colors.cloth = c.a; colors.coat = c.a; colors.pants = '#2a2a34'; break;
    case 'hockey': o.sleeves = 'long'; colors.cloth = c.a; colors.pants = c.b; colors.trim = c.c; colors.glove = c.b; o.hat = { style: 'helmet', color: c.b }; colors.boot = '#1a1a22'; break;
    case 'weights': o.sleeves = 'none'; colors.cloth = c.a; colors.pants = c.a; colors.belt = '#3a2410'; break;
    case 'archery': o.sleeves = 'short'; colors.cloth = c.a; colors.pants = '#e8e8f0'; break;
    case 'ceremony': o.sleeves = 'long'; colors.cloth = c.a; colors.pants = c.b; colors.trim = c.c; o.outfit = 'coat'; colors.coat = c.a; break;
    default: o.sleeves = 'none'; colors.cloth = c.a; colors.pants = c.b; colors.trim = c.c;
  }
  if (sport === 'archery' || sport === 'hockey' || sport === 'downhill' || sport === 'skijump') colors.metal = '#c8ccd8';
  o.colors = colors;
  const rig = new E.Humanoid(o);
  rig._sport = sport; rig._nat = nat.id;
  return rig;
};
/** a portrait-only face for the commentators and the PA */
O.COMMENTATORS = {
  chip: { name: 'CHIP BELLOWS', voice: 'chip', rig: () => new E.Humanoid({ size: 1.2, build: 'heroic', weapon: null, hair: 'short', outfit: 'coat', colors: { skin: '#e8b890', hair: '#c8a060', cloth: '#ffffff', coat: '#1c2a6a', pants: '#1c2a6a', trim: '#f2b632' } }) },
  vera: { name: 'DAME VERA VELOCITY', voice: 'vera', rig: () => new E.Humanoid({ size: 1.2, build: 'heroic', weapon: null, hair: 'ponytail', outfit: 'coat', colors: { skin: '#c88a5e', hair: '#d8d8e0', cloth: '#ffffff', coat: '#7a1a3a', pants: '#2a1a2a', trim: '#f2b632' }, face: { eyes: 'big' } }) },
  pa: { name: 'STADIUM PA', voice: 'pa', rig: null },
  max: { name: 'MAX OVERDRIVE', voice: 'max', rig: () => O.makeRig(O.NAT.TRB, 'ceremony') },
  yikesy: { name: 'YIKESY', voice: 'yikesy', rig: null },
  coach: { name: 'COACH', voice: 'coach', rig: () => new E.Humanoid({ size: 1.2, build: 'bulky', weapon: null, hair: 'bald', outfit: 'coat', colors: { skin: '#e0b090', hair: '#555', cloth: '#ddd', coat: '#2a5a3a', pants: '#2a2a34' } }) }
};
})();
