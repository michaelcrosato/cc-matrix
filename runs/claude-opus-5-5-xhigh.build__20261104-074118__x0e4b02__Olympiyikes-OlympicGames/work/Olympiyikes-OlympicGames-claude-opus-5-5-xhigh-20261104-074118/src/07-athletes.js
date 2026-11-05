// The eight nations of the Games, their star athletes (rigs, voices, bios, skills per event), their teammates, and
// O.makeRig(nation, sport): each athlete dressed for each sport in the nation's colours.
(() => {
'use strict';
const E = My3D2dge, O = OLY;

const N = (id, name, a, b, c, athlete, rig, voice, bio, team, skills, personality) => ({ id, name, colors: { a, b, c }, athlete: { name: athlete, rig, voice, bio, personality }, team, skills });
const EV = ['sprint', 'javelin', 'swim', 'diving', 'archery', 'weights', 'skijump', 'downhill', 'bobsled', 'figure', 'curling', 'hockey'];
const sk = arr => Object.fromEntries(EV.map((e, i) => [e, arr[i]]));
O.NATIONS = [
  N('SUN', 'SUNVALE', '#f2b632', '#2f7fe0', '#ffffff', 'DASH GOLDBERRY', { build: 'heroic', hair: 'short', colors: { hair: '#3a2414', skin: '#8d5a3b' } }, { pitch: 1.0, speed: 1.1 },
    "Dash grew up on a farm in rural Sunvale, chasing the family's prize ostrich to school every morning. The ostrich never once let Dash win. Today, Dash runs for Daisy.",
    ['SUNNY RAY', 'BO MARIGOLD', 'LUX DAYBRIGHT'], sk([.92, .85, .70, .62, .66, .70, .60, .65, .78, .60, .62, .74]), 'sunny optimist'),
  N('FRM', 'FROSTMARK', '#f4f8ff', '#2fa8d8', '#1a3a6a', 'INGRID SNOWCASTLE', { build: 'heroic', hair: 'ponytail', colors: { hair: '#f3e6c0', skin: '#f2d4c4' } }, { pitch: 1.3, speed: .9 },
    "Ingrid's grandmother taught Ingrid to ski jump off the roof of the family sauna. The sauna has since been rebuilt. Twice.",
    ['SVEN DRIFTHOLM', 'LIV HAILSTROM', 'NILS FROSTBY'], sk([.70, .74, .66, .68, .80, .66, .94, .92, .74, .76, .80, .78]), 'deadpan'),
  N('TRB', 'TURBONIA', '#e23b2e', '#1e2026', '#ffd23a', 'MAX OVERDRIVE', { build: 'heroic', hair: 'spiky', hat: { style: 'band', color: '#e23b2e' }, colors: { hair: '#141414', skin: '#c88a5e' } }, { pitch: .9, speed: 1.25 },
    "Defending champion in, quote, 'everything'. Max has never lost a race, a staring contest, or an argument with a mirror. Max's hobbies include winning and describing winning.",
    ['REV THROTTLETON', 'NITRO VEX', 'GIGI TORQUE'], sk([.93, .90, .78, .70, .72, .82, .80, .84, .95, .62, .66, .93]), 'arrogant, loud'),
  N('BON', 'BONBONIA', '#ff7fb8', '#6fe0c0', '#ffffff', 'COCO BONBON', { build: 'heroic', hair: 'long', face: { eyes: 'big' }, colors: { hair: '#ff9ad0', skin: '#f5c9a8' } }, { pitch: 1.45, speed: 1.05 },
    "Coco skates every program to the songs Grandpa whistled. Coco says you can still hear him in the crowd. Usually slightly off-key.",
    ['TAFFY SWIRL', 'PRALINE DUPREE', 'NOUGAT FIZZ'], sk([.66, .62, .80, .92, .74, .58, .70, .68, .62, .95, .70, .64]), 'theatrical'),
  N('VOL', 'VOLCANICA', '#ff6a1a', '#3a2e2e', '#ffd0a0', 'BLAZE CINDERHART', { build: 'bulky', hair: 'bald', colors: { skin: '#6a4028' } }, { pitch: .7, speed: .85 },
    "Every winter morning, Blaze lifts the family car out of a volcanic ash drift. The car is fine. The car is extremely well-defined.",
    ['ASH KINDLETON', 'EMBER STONE', 'OBSIDIA CRAG'], sk([.72, .88, .62, .55, .64, .95, .62, .70, .86, .52, .82, .88]), 'gentle giant'),
  N('WAV', 'WAVELIA', '#1fa8a0', '#0e4a6a', '#e8fbf7', 'MARINA SPLASHWORTH', { build: 'heroic', hair: 'short', colors: { hair: '#24160e', skin: '#5a3420' } }, { pitch: 1.25, speed: .95 },
    "Born on a houseboat, Marina didn't touch dry land until age four. On land Marina still walks like the deck is moving. In the water... poetry.",
    ['CORAL FINLEY', 'TIDE BRENNAN', 'KAI SEABORNE'], sk([.74, .68, .95, .88, .70, .64, .66, .62, .64, .80, .72, .66]), 'calm poet'),
  N('MTP', 'MOUNTOPIA', '#6a3fc8', '#c8ccd8', '#ffffff', 'ROCKY SUMMIT', { build: 'heroic', hair: 'short', hat: { style: 'cap', color: '#6a3fc8' }, colors: { hair: '#8a5a2a', skin: '#e0b090' } }, { pitch: .95, speed: 1.0 },
    "Rocky's village sits so high that the mail arrives by curling stone. Rocky has been sweeping since before walking. Rocky's first word was 'HARD!'",
    ['EDELWEISS VOGT', 'CLIFF HANGAR', 'SCREE HALVORSEN'], sk([.68, .72, .64, .60, .86, .74, .82, .88, .80, .66, .93, .80]), 'folksy'),
  N('NEO', 'NEON REPUBLIC', '#e83ae0', '#14102a', '#3ae8f0', 'PIXEL VANCE', { build: 'heroic', hair: 'spiky', colors: { hair: '#3ae8f0', skin: '#f0c8a8' } }, { pitch: 1.15, speed: 1.2 },
    "Pixel learned archery from an arcade cabinet and has never seen daylight without sunglasses. Pixel's coach is a toaster named Gary. Gary believes in Pixel.",
    ['BYTE ORTEGA', 'GLITCH KOWALSKI', 'VECTOR NAKAMURA'], sk([.78, .70, .72, .74, .93, .60, .74, .76, .70, .82, .76, .84]), 'gamer slang')
];
O.NATION_IDS = O.NATIONS.map(n => n.id);
O.nation = id => O.NATIONS.find(n => n.id === id) || O.NATIONS[0];
O.RIVAL_ID = 'TRB';
/** the rival for a meet: Turbonia, unless a human plays Turbonia (then the CPU nation with the best average skill) */
O.rivalFor = humans => {
  if (!humans.includes('TRB')) return 'TRB';
  let best = null, bs = -1; for (const n of O.NATIONS) { if (humans.includes(n.id)) continue; const avg = Object.values(n.skills).reduce((a, b) => a + b, 0) / 12; if (avg > bs) { bs = avg; best = n.id; } }
  return best;
};

// ---------------------------------------------------------------------------------------------------------------
// rigs, dressed for each sport
// ---------------------------------------------------------------------------------------------------------------
const SPORT = {
  track: n => ({ outfit: 'shirt', sleeves: 'none', colors: { cloth: n.colors.a, pants: n.colors.b, boot: '#f4f4f4', belt: n.colors.b, trim: n.colors.c } }),
  weights: n => ({ outfit: 'shirt', sleeves: 'none', colors: { cloth: n.colors.a, pants: n.colors.a, boot: '#2a2a2a', belt: '#5a3a1a', trim: n.colors.c } }),
  swim: n => ({ outfit: 'shirt', sleeves: 'none', hat: { style: 'helmet', color: n.colors.a }, colors: { cloth: n.colors.a, pants: n.colors.a, boot: null, trim: n.colors.c } }),
  dive: n => ({ outfit: 'shirt', sleeves: 'none', colors: { cloth: n.colors.a, pants: n.colors.a, trim: n.colors.c } }),
  archery: n => ({ outfit: 'shirt', sleeves: 'short', hat: { style: 'cap', color: n.colors.b }, colors: { cloth: n.colors.a, pants: '#e8e4d8', boot: '#5a3a1a', trim: n.colors.b } }),
  snow: n => ({ outfit: 'shirt', sleeves: 'long', hat: { style: 'helmet', color: n.colors.b }, colors: { cloth: n.colors.a, pants: n.colors.a, boot: '#2a2e3a', glove: n.colors.b, trim: n.colors.c } }),
  skate: n => ({ outfit: 'tunic', sleeves: 'long', colors: { cloth: n.colors.a, pants: n.colors.b, boot: '#ffffff', trim: '#ffe066', glove: n.colors.a } }),
  curling: n => ({ outfit: 'coat', sleeves: 'long', colors: { cloth: n.colors.a, coat: n.colors.a, pants: '#2a2a3a', boot: '#1a1a1a', trim: n.colors.c } }),
  hockey: n => ({ outfit: 'shirt', sleeves: 'long', hat: { style: 'helmet', color: n.colors.b }, colors: { cloth: n.colors.a, pants: n.colors.b, boot: '#1a1a1a', glove: n.colors.b, trim: n.colors.c } }),
  ceremony: n => ({ outfit: 'coat', sleeves: 'long', colors: { cloth: n.colors.a, coat: n.colors.a, pants: n.colors.b, boot: '#f4f4f4', trim: n.colors.c } })
};
const SPORT_OF = { sprint: 'track', javelin: 'track', swim: 'swim', diving: 'dive', archery: 'archery', weights: 'weights', skijump: 'snow', downhill: 'snow', bobsled: 'snow', figure: 'skate', curling: 'curling', hockey: 'hockey' };
O.sportOf = ev => SPORT_OF[ev] || ev;
/** a rig for a nation's star (or a teammate: o.mate 0..2) dressed for a sport (or an event id) */
O.makeRig = (nation, sport = 'ceremony', o = {}) => {
  const n = typeof nation === 'string' ? O.nation(nation) : nation, s = SPORT[SPORT_OF[sport] || sport] ? (SPORT_OF[sport] || sport) : 'ceremony';
  const base = o.mate === undefined ? n.athlete.rig : mateRig(n, o.mate);
  const dress = SPORT[s](n), colors = Object.assign({}, base.colors || {}, dress.colors);
  if (colors.boot === null) colors.boot = colors.skin || '#c88a5e';
  if (s === 'swim' || s === 'dive') colors.pants = colors.pants;
  const spec = Object.assign({ size: base.build === 'bulky' ? 1.3 : 1.25, weapon: null }, base, dress, { colors });
  if (base.hat && !dress.hat) spec.hat = base.hat;
  if (s === 'swim' || s === 'snow' || s === 'hockey') spec.hat = dress.hat;
  if (o.size) spec.size = o.size;
  const rig = new E.Humanoid(spec);
  rig.nation = n.id; rig.sport = s;
  return rig;
};
function mateRig(n, i) {
  const h = O.hash(n.id + ':mate:' + i), skins = ['#f2d4c4', '#e0b090', '#c88a5e', '#8d5a3b', '#6a4028', '#f5c9a8'], hairs = ['short', 'spiky', 'ponytail', 'short', 'long', 'bald'], hc = ['#2a1a10', '#8a5a2a', '#f3e6c0', '#141414', '#c04a2a', '#5a3a2a'];
  return { build: h % 5 === 0 ? 'bulky' : 'heroic', hair: hairs[h % hairs.length], colors: { skin: skins[(h >>> 3) % skins.length], hair: hc[(h >>> 6) % hc.length] } };
}
O.mateName = (nation, i) => (typeof nation === 'string' ? O.nation(nation) : nation).team[i % 3];
O.voiceOf = nation => { const n = typeof nation === 'string' ? O.nation(nation) : nation; return { base: 130 * n.athlete.voice.pitch, speed: n.athlete.voice.speed, wave: 'square', formant: n.athlete.voice.pitch > 1.2 ? 1.15 : 1 }; };
O.shortName = nm => { const p = nm.split(' '); return p[p.length - 1]; };
})();
