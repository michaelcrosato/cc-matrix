// People on the hero rig: one factory, many palettes. Data only (for check.mjs --sheets).
import { model } from '../../pixel-engine.js';
const limb = (name, len, w, c, kids = [], at = [0, 0, 0]) => ({ group: [{ box: [w, len, w], at: [0, -len / 2, 0], c }, ...kids], at, pivot: true, name });
const foot = (name) => ({ group: [{ box: [0.12, 0.1, 0.26], at: [0, -0.05, 0.05], c: 'boot' }], at: [0, -0.22, 0], pivot: true, name });
const HATS = {
  beret: [{ box: [0.24, 0.07, 0.24], at: [0.01, 0.25, 0], rot: [0, 0, -8], c: 'hat' }],
  cap: [{ box: [0.22, 0.08, 0.22], at: [0, 0.26, 0], c: 'hat' }, { box: [0.2, 0.03, 0.1], at: [0, 0.23, 0.14], c: 'hat' }],
  headcloth: [{ box: [0.24, 0.1, 0.24], at: [0, 0.23, 0], c: 'hat' }, { box: [0.08, 0.2, 0.06], at: [0, 0.1, -0.14], c: 'hat' }],
  wide: [{ box: [0.42, 0.03, 0.42], at: [0, 0.23, 0], c: 'hat' }, { box: [0.22, 0.1, 0.22], at: [0, 0.29, 0], c: 'hat' }],
  peaked: [{ box: [0.24, 0.09, 0.24], at: [0, 0.26, 0], c: 'hat' }, { box: [0.22, 0.03, 0.12], at: [0, 0.22, 0.15], c: 'hat' }, { box: [0.25, 0.03, 0.25], at: [0, 0.23, 0], c: 'trim' }],
  veil: [{ box: [0.27, 0.3, 0.27], at: [0, 0.15, -0.01], c: 'hat' }],
  scarf: [{ box: [0.25, 0.12, 0.25], at: [0, 0.22, 0], c: 'hat' }, { box: [0.2, 0.04, 0.03], at: [0, 0.12, 0.12], c: 'trim' }],
  flight: [{ box: [0.24, 0.1, 0.24], at: [0, 0.23, 0], c: 'hat' }, { box: [0.2, 0.04, 0.03], at: [0, 0.13, 0.11], c: 'trim' }],
  none: [{ box: [0.2, 0.04, 0.2], at: [0, 0.22, 0], c: 'hair' }],
  braids: [{ box: [0.22, 0.08, 0.22], at: [0, 0.23, 0], c: 'hair' }, { box: [0.06, 0.24, 0.06], at: [0.1, 0.06, -0.08], c: 'hair' }, { box: [0.06, 0.24, 0.06], at: [-0.1, 0.06, -0.08], c: 'hair' }],
};
export function person(id, o) {
  const { cloth = 'slate', dark = 'night', skin = 'plum', boot = 'ink', hat = 'beret', hatC = 'navy', strap = 'white', trim = 'orange', hair = 'ink', extra = [], about = 'Person on the hero rig', tags = ['actor', 'person'] } = o;
  return model({ id, about, tags, floats: true, collider: 'none',
    palette: { cloth, dark, skin, boot, hat: hatC, strap, trim, hair },
    parts: [{ group: [
      { box: [0.34, 0.2, 0.2], at: [0, 0.06, 0], c: 'dark' },
      { group: [
        { box: [0.38, 0.5, 0.22], at: [0, 0.25, 0], c: 'cloth' },
        { box: [0.06, 0.56, 0.24], at: [0.1, 0.25, 0], rot: [0, 0, 28], c: 'strap' },
        { group: [{ box: [0.2, 0.22, 0.2], at: [0, 0.11, 0], c: 'skin' }, ...HATS[hat]], at: [0, 0.52, 0], pivot: true, name: 'Head' },
        limb('ArmR', 0.25, 0.11, 'cloth', [limb('ForearmR', 0.16, 0.09, 'cloth', [limb('HandR', 0.08, 0.08, 'skin', [], [0, -0.16, 0])], [0, -0.25, 0])], [-0.25, 0.47, 0]),
        limb('ArmL', 0.25, 0.11, 'cloth', [limb('ForearmL', 0.16, 0.09, 'cloth', [limb('HandL', 0.08, 0.08, 'skin', [], [0, -0.16, 0])], [0, -0.25, 0])], [0.25, 0.47, 0]),
        ...extra,
      ], at: [0, 0.04, 0], pivot: true, name: 'Torso' },
      limb('LegR', 0.3, 0.13, 'dark', [limb('ShinR', 0.22, 0.11, 'dark', [foot('FootR')], [0, -0.3, 0])], [-0.14, 0, 0]),
      limb('LegL', 0.3, 0.13, 'dark', [limb('ShinL', 0.22, 0.11, 'dark', [foot('FootL')], [0, -0.3, 0])], [0.14, 0, 0]),
    ], at: [0, 0.62, 0], pivot: true, name: 'Pelvis' }] });
}
const SK = ['plum', 'orange', 'red', 'sand'];
export const SOLDIER_FACTIONS = {
  concord: { cloth: 'slate', dark: 'night', hatC: 'navy', strap: 'white', hat: 'beret' },
  harvest: { cloth: 'sand', dark: 'orange', hatC: 'red', strap: 'red', hat: 'headcloth' },
};
export const PEOPLE = [];
for (const [fac, f] of Object.entries(SOLDIER_FACTIONS)) for (let s = 0; s < 4; s++) for (const hat of [f.hat, 'cap', 'wide']) {
  PEOPLE.push(person(`soldier-${fac}-${s}-${hat}`, { ...f, hat, hatC: hat === f.hat ? f.hatC : (fac === 'concord' ? 'slate' : 'orange'), skin: SK[s], about: `${fac} soldier skin ${s} hat ${hat}` }));
}
export const NAMED = {
  ines: person('ines', { cloth: 'sand', dark: 'slate', skin: 'orange', hat: 'flight', hatC: 'sand', trim: 'ink', strap: 'ink', about: 'Ines Carvalho, ex-bush pilot' }),
  dov: person('dov', { cloth: 'green', dark: 'night', skin: 'plum', hat: 'none', hair: 'plum', strap: 'orange', extra: [{ box: [0.4, 0.06, 0.24], at: [0, 0.4, 0], rot: [0, 0, 20], c: 'strap' }, { box: [0.4, 0.06, 0.24], at: [0, 0.3, 0], rot: [0, 0, -20], c: 'strap' }], about: 'Dov Halpern, ex-sapper with bandoliers' }),
  mags: person('mags', { cloth: 'green', dark: 'slate', skin: 'red', hat: 'braids', hair: 'ink', strap: 'white', extra: [{ box: [0.2, 0.2, 0.1], at: [0.2, 0.15, 0.16], c: 'strap' }, { box: [0.08, 0.02, 0.02], at: [0.2, 0.16, 0.22], c: 'cloth' }], about: 'Mags Oyelaran, struck-off medic' }),
  odile: person('odile', { cloth: 'white', dark: 'mist', skin: 'orange', hat: 'veil', hatC: 'white', about: 'Sister Odile of the Mercy Mission' }),
  tibor: person('tibor', { cloth: 'orange', dark: 'plum', skin: 'sand', hat: 'cap', hatC: 'plum', extra: [{ box: [0.34, 0.4, 0.04], at: [0, 0.2, 0.13], c: 'strap' }], about: 'Tibor the gun seller, in an apron' }),
  vance: person('vance', { cloth: 'slate', dark: 'night', skin: 'plum', hat: 'peaked', hatC: 'navy', trim: 'orange', strap: 'orange', extra: [{ box: [0.08, 0.08, 0.02], at: [0.1, 0.4, 0.12], c: 'trim' }, { box: [0.08, 0.08, 0.02], at: [-0.1, 0.4, 0.12], c: 'trim' }], about: 'Colonel Aurelio Vance' }),
  ansa: person('ansa', { cloth: 'red', dark: 'plum', skin: 'orange', hat: 'scarf', hatC: 'red', trim: 'white', strap: 'orange', about: 'Mother Ansa, former teacher' }),
  harrow: person('harrow', { cloth: 'plum', dark: 'night', skin: 'sand', hat: 'wide', hatC: 'sand', strap: 'mist', extra: [{ box: [0.44, 0.12, 0.28], at: [0, 0.4, 0], c: 'strap' }], about: 'Emil Harrow the Surveyor in a blanket' }),
  bakr: person('bakr', { cloth: 'blue', dark: 'slate', skin: 'plum', hat: 'cap', hatC: 'ink', strap: 'white', about: 'Old Bakr the train driver' }),
  pell: person('pell', { cloth: 'sand', dark: 'orange', skin: 'orange', hat: 'headcloth', hatC: 'red', about: 'Pell, a Harvest guide' }),
  civ0: person('civ0', { cloth: 'teal', dark: 'plum', skin: 'plum', hat: 'scarf', hatC: 'white', about: 'Civilian' }),
  civ1: person('civ1', { cloth: 'orange', dark: 'slate', skin: 'sand', hat: 'none', about: 'Civilian' }),
  civ2: person('civ2', { cloth: 'lime', dark: 'plum', skin: 'orange', hat: 'wide', hatC: 'sand', about: 'Civilian' }),
  civ3: person('civ3', { cloth: 'white', dark: 'navy', skin: 'red', hat: 'braids', about: 'Civilian' }),
};
export const ALL_PEOPLE = [...PEOPLE, ...Object.values(NAMED)];
