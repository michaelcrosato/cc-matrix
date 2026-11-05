// The cast (PLAN §8.2 looks) and the civilians' generator (§12.4).
const SKIN = ['#3a2418', '#4a2e20', '#5a3a28', '#6b4630', '#8a5a3c', '#c8946a', '#e0b89a', '#f0c8a8'];
const CAST = {
  dana: { name: 'Det. Dana Whitlock', short: 'Dana', size: 1.25, build: 'heroic', hair: 'short', outfit: 'coat', weapon: null,
    colors: { skin: '#8a5a3c', hair: '#1e1612', cloth: '#e8dcc0', coat: '#6b4a2e', pants: '#2a3446', boot: '#2a1e16' } },
  lou: { name: 'Det. Louis "Lou" Szabo', short: 'Lou', size: 1.25, build: 'heroic', hair: 'bald', outfit: 'coat', weapon: null, hunch: .15,
    colors: { skin: '#6b4630', cloth: '#b89a6a', coat: '#b89a6a', pants: '#3a3428', boot: '#2a2018' } },
  hal: { name: 'Det. Harold "Hal" Pettiford', short: 'Hal', size: 1.2, build: 'heroic', hair: 'short', outfit: 'shirt', weapon: null, hunch: .2,
    colors: { skin: '#5a3a28', hair: '#9a9a9a', cloth: '#7a5a3a', pants: '#3a3a3a', boot: '#2a2018' } },
  navarre: { name: 'Lt. Gilbert Navarre', short: 'Navarre', size: 1.25, build: 'heroic', hair: 'short', outfit: 'shirt', weapon: null,
    colors: { skin: '#c8946a', hair: '#2a2420', cloth: '#f2f2f2', trim: '#6a1a2a', pants: '#2a2e3a', boot: '#1a1410' } },
  pruitt: { name: 'Maj. Leland Pruitt', short: 'Pruitt', size: 1.3, build: 'bulky', hair: 'bald', outfit: 'coat', hat: 'cap', weapon: null,
    colors: { skin: '#e0b89a', cloth: '#1f2a44', coat: '#1f2a44', trim: '#c8a040', pants: '#1f2a44', boot: '#1a1410' } },
  tee: { name: 'Terrence "Tee" Mabry', short: 'Tee', size: 1.25, build: 'heroic', hair: 'short', hat: { style: 'cap', color: '#141414' }, outfit: 'shirt', weapon: null,
    colors: { skin: '#4a2e20', hair: '#141414', cloth: '#f4f4f0', pants: '#2a3446', boot: '#c9a46a' } },
  rook: { name: 'Ricky "Rook" Batts', short: 'Rook', size: 1.35, build: 'bulky', hair: 'bald', hat: { style: 'band', color: '#111111' }, outfit: 'coat', weapon: null,
    colors: { skin: '#3a2418', hair: '#111111', cloth: '#181818', coat: '#181818', pants: '#202020', boot: '#f0f0f0', trim: '#c01818' } },
  corey: { name: 'Corey "Stash" Lyle', short: 'Corey', size: 1.15, build: 'heroic', hair: 'short', hood: true, outfit: 'coat', weapon: null, hunch: .25,
    colors: { skin: '#5a3a28', hair: '#808080', cloth: '#6a6a6a', coat: '#6a6a6a', pants: '#3a3a40', boot: '#dadada' } },
  pigeon: { name: 'Junior "Pigeon" Hollis', short: 'Pigeon', size: 1.0, build: 'heroic', hair: 'short', hood: true, outfit: 'shirt', weapon: null,
    colors: { skin: '#6b4630', hair: '#b02020', cloth: '#b02020', pants: '#2a2a2a', boot: '#f2f2f2', trim: '#f2f2f2' } },
  pockets: { name: 'Wesley "Pockets" Gaines', short: 'Pockets', size: 1.15, build: 'heroic', hair: 'bald', hat: { style: 'cap', color: '#8a1e1e' }, outfit: 'coat', weapon: null, hunch: .3,
    colors: { skin: '#5a3a28', cloth: '#4a5a3a', coat: '#4a5a3a', pants: '#3a3a30', boot: '#3a2a1a' } },
  odessa: { name: 'Miss Odessa Tillman', short: 'Odessa', size: 1.1, build: 'heroic', hair: 'long', outfit: 'robe', weapon: null, hunch: .2,
    colors: { skin: '#6b4630', hair: '#b8b8b8', cloth: '#6a2a5a', pants: '#6a2a5a', boot: '#2a2020' } },
  dukes: { name: 'Officer Dukes', short: 'Dukes', size: 1.25, build: 'bulky', hair: 'short', hat: { style: 'cap', color: '#1f2a44' }, outfit: 'coat', weapon: null,
    colors: { skin: '#8a5a3c', cloth: '#1f2a44', coat: '#1f2a44', pants: '#2a2e3a', boot: '#1a1410' } },
  dink: { name: 'Darius "Dink" Pratt', short: 'Dink', size: 1.1, build: 'heroic', hair: 'short', outfit: 'shirt', weapon: null,
    colors: { skin: '#3a2418', hair: '#141414', cloth: '#1e3a7a', pants: '#2a2a2a', boot: '#f0f0f0' } },
  tavon: { name: 'Tavon Gibbs', short: 'Tavon', size: 1.15, build: 'heroic', hair: 'short', outfit: 'coat', weapon: null,
    colors: { skin: '#4a2e20', hair: '#141414', cloth: '#141414', coat: '#141414', trim: '#c01818', pants: '#202020', boot: '#101010' } },
  moe: { name: 'Maurice "Lil Moe" Dorsey', short: 'Moe', size: 1.0, build: 'heroic', hair: 'short', hat: { style: 'cap', color: '#2a7a3a' }, outfit: 'shirt', weapon: null,
    colors: { skin: '#5a3a28', hair: '#141414', cloth: '#e8d040', pants: '#2a3446', boot: '#f0f0f0' } },
};

// Palette families for civilians (§12.4): warm, cool, earth, sport, church, work.
const FAMILIES = [
  { cloth: ['#b8462e', '#d48a3a', '#8a3a2a'], pants: ['#2a3446', '#3a2e24'] },
  { cloth: ['#2e5a7a', '#4a7a9a', '#3a4a6a'], pants: ['#24262e', '#3a3a40'] },
  { cloth: ['#6a5a3a', '#7a6a4a', '#5a4a30'], pants: ['#3a3024', '#4a4030'] },
  { cloth: ['#c03a2a', '#e8e8e0', '#1a1a1a'], pants: ['#2a2a30', '#e8e8e0'] },
  { cloth: ['#f0f0f0', '#e8d8b0', '#b8c8e0'], pants: ['#1a1a1a', '#3a3a50'] },
  { cloth: ['#3a3a3a', '#5a5a52', '#444a3a'], pants: ['#2a2e34', '#303030'] },
];
const HAIRS = ['short', 'spiky', 'long', 'ponytail', 'bald', 'short', 'short'];
const OUTFITS = ['shirt', 'tunic', 'coat', 'shirt', 'coat'];

// A civilian from a seed: stable per person (the same rig every run).
function makeCivilian(stream, i) {
  const fam = FAMILIES[Math.floor(stream() * FAMILIES.length)];
  const pick = a => a[Math.floor(stream() * a.length)];
  const o = {
    size: 1.1 + stream() * .15, build: stream() < .2 ? 'bulky' : 'heroic',
    hair: pick(HAIRS), outfit: pick(OUTFITS), weapon: null, hunch: stream() < .15 ? .3 : stream() * .15,
    colors: { skin: pick(SKIN), hair: pick(['#141414', '#2a1e16', '#4a3020']), cloth: pick(fam.cloth), coat: pick(fam.cloth), pants: pick(fam.pants), boot: pick(['#1a1410', '#f0f0f0', '#6a4a2a']) },
  };
  if (stream() < .2) o.hat = { style: 'cap', color: pick(fam.cloth) };
  if (stream() < .15) o.hood = true;
  return o;
}

// Each character's rig: a Humanoid made from the cast's options, once.
function makeRig(opts) {
  const { name, short, ...o } = opts;   // (name and short are for people, not the rig)
  return new E.Humanoid(o);
}
