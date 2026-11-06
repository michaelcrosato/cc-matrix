// Engine model() data: the gloved hand, the eight instruments (+ dressing), the anime busts and the rig-compatible figures.
// Tools: tip at the origin, pointing -Z. Named pivots (jawL/jawR, plunger, beam, disc, mouth, head...) are driven at runtime.
import { model } from '../../../pixel-engine.js';
import { CAST } from '../cast.js';

export const handDef = model({ id: 'glove-hand', about: 'Gloved surgeon hand gripping a shaft, wrist toward +Z', tags: ['character', 'hand'], floats: true,
  palette: { glove: 'sky', fold: 'blue', sleeve: 'teal' }, parts: [
    { name: 'palm', box: [0.72, 0.3, 0.8], at: [0, 0, 0], c: 'glove' }, { name: 'knuck', box: [0.74, 0.16, 0.14], at: [0, 0.12, -0.34], c: 'fold' },
    ...[-0.27, -0.09, 0.09, 0.27].flatMap((x, i) => [{ name: `f${i}a`, box: [0.16, 0.16, 0.34], at: [x, 0.05, -0.56], rot: [18, 0, 0], c: 'glove' }, { name: `f${i}b`, box: [0.15, 0.15, 0.26], at: [x, -0.09, -0.76], rot: [58, 0, 0], c: 'glove' }]),
    { name: 'thumb', box: [0.18, 0.18, 0.5], at: [-0.44, -0.04, -0.26], rot: [10, -28, 0], c: 'glove' },
    { name: 'cuff', cyl: [0.62, 0.62, 0.3], at: [0, 0, 0.54], rot: [90, 0, 0], c: 'fold' }, { name: 'wrist', cyl: [0.56, 1.6, 0.56], at: [0, 0, 1.46], rot: [90, 0, 0], c: 'glove' },
    { name: 'sleeve', cyl: [0.8, 2.6, 0.8], at: [0, 0, 3.4], rot: [90, 0, 0], c: 'sleeve' }] });

const T = (id, about, palette, parts) => model({ id: 'tool-' + id, about, tags: ['tool', 'surgery'], floats: true, palette, parts });
const ST = { steel: 'mist', dark: 'slate' };
export const toolDefs = {
  scalpel: T('scalpel', 'Scalpel with white handle', { steel: 'mist', handle: 'white' }, [{ box: [0.08, 0.04, 0.5], at: [0, 0, -0.1], c: 'steel' }, { cone: [0.12, 0.2, 0.12], at: [0, 0, -0.45], rot: [-90, 0, 0], c: 'steel' }, { box: [0.14, 0.12, 1.4], at: [0, 0, 0.9], c: 'handle' }]),
  forceps: T('forceps', 'Forceps with two moving jaws', { steel: 'mist', tip: 'slate', grip: 'slate' }, [
    { group: [{ box: [0.07, 0.05, 1.3], at: [0, 0, 0.45], c: 'steel' }, { box: [0.07, 0.05, 0.28], at: [0, 0, -0.2], c: 'tip' }], at: [-0.05, 0, 0], pivot: true, name: 'jawL' },
    { group: [{ box: [0.07, 0.05, 1.3], at: [0, 0, 0.45], c: 'steel' }, { box: [0.07, 0.05, 0.28], at: [0, 0, -0.2], c: 'tip' }], at: [0.05, 0, 0], pivot: true, name: 'jawR' }, { box: [0.22, 0.12, 0.5], at: [0, 0, 1.2], c: 'grip' }]),
  suture: T('suture', 'Curved needle with thread', { steel: 'mist', handle: 'orange', thread: 'white' }, [{ torus: [0.5, 0.05, 0.5], at: [0, 0.1, -0.1], c: 'steel' }, { box: [0.1, 0.1, 1.3], at: [0, 0.1, 0.8], c: 'handle' }, { box: [0.02, 0.02, 1.2], at: [0.2, 0, 0.6], c: 'thread' }]),
  drain: T('drain', 'Suction wand', { steel: 'mist', cup: 'blue', tube: 'cyan' }, [{ cyl: [0.2, 0.7, 0.14], at: [0, 0, -0.1], rot: [90, 0, 0], c: 'steel' }, { cyl: [0.4, 0.3, 0.4], at: [0, 0, -0.5], rot: [90, 0, 0], c: 'cup' }, { cyl: [0.18, 2, 0.18], at: [0, 0.05, 1.1], rot: [90, 0, 0], c: 'tube' }]),
  syringe: T('syringe', 'Syringe with plunger', { barrel: 'white', steel: 'mist', rod: 'slate', fluid: 'orange' }, [{ cyl: [0.3, 1.0, 0.3], at: [0, 0, 0.3], rot: [90, 0, 0], c: 'barrel' }, { cyl: [0.31, 0.5, 0.31], at: [0, 0, 0.3], rot: [90, 0, 0], c: 'fluid' }, { cyl: [0.04, 0.4, 0.04], at: [0, 0, -0.4], rot: [90, 0, 0], c: 'steel' },
    { group: [{ cyl: [0.12, 0.8, 0.12], at: [0, 0, 0], rot: [90, 0, 0], c: 'rod' }, { box: [0.4, 0.04, 0.2], at: [0, 0, 0.35], c: 'rod' }], at: [0, 0, 1.2], pivot: true, name: 'plunger' }]),
  gel: T('gel', 'Gel bottle', { bottle: 'cyan', nozzle: 'white' }, [{ cyl: [0.64, 0.8, 0.64], at: [0, 0.3, 0.5], rot: [17, 0, 0], c: 'bottle' }, { cone: [0.24, 0.3, 0.24], at: [0, 0.06, -0.1], rot: [-90, 0, 0], c: 'nozzle' }]),
  laser: T('laser', 'Laser pen', { body: 'navy', tip: 'red', beamC: 'red' }, [{ cyl: [0.2, 1.4, 0.2], at: [0, 0, 0.55], rot: [90, 0, 0], c: 'body' }, { cyl: [0.12, 0.2, 0.2], at: [0, 0, -0.2], rot: [90, 0, 0], c: 'tip' }, { group: [{ cyl: [0.06, 3, 0.06], at: [0, 0, 0], rot: [90, 0, 0], c: 'beamC', glow: true }], at: [0, -0.6, 0], pivot: true, name: 'beam' }]),
  scanner: T('scanner', 'Scanner wand with hologram disc', { body: 'slate', lens: 'cyan', holo: 'cyan' }, [{ cyl: [0.2, 1.2, 0.2], at: [0, 0, 0.6], rot: [90, 0, 0], c: 'body' }, { cyl: [0.64, 0.1, 0.64], at: [0, 0, -0.1], c: 'lens' }, { group: [{ cyl: [2.2, 0.04, 2.2], at: [0, 0, 0], c: 'holo', glow: true }], at: [0, -0.12, 0], pivot: true, name: 'disc' }]),
  dress: T('dress', 'Bandage strip', { cloth: 'white', stripe: 'red' }, [{ box: [0.9, 0.08, 0.4], at: [0, 0, 0], c: 'cloth' }, { box: [0.9, 0.09, 0.1], at: [0, 0, 0], c: 'stripe' }]),
};

const FACE = [[-0.46, 0.5], [0.46, 0.5], [0.5, 0.05], [0.42, -0.28], [0.2, -0.56], [0, -0.68], [-0.2, -0.56], [-0.42, -0.28], [-0.5, 0.05]];
const FRINGE = [[-0.56, 0.42], [-0.6, 0], [-0.44, 0.16], [-0.4, -0.08], [-0.22, 0.24], [-0.06, 0.02], [0.06, 0.26], [0.24, 0.04], [0.34, 0.26], [0.46, -0.1], [0.6, 0.02], [0.56, 0.42], [0.34, 0.66], [0, 0.74], [-0.34, 0.66]];
const SWEPT = [[-0.56, 0.3], [-0.6, -0.1], [-0.4, 0.1], [-0.1, 0.35], [0.2, 0.3], [0.56, 0.1], [0.6, 0.4], [0.34, 0.68], [0, 0.78], [-0.34, 0.68]];
/** The colours a character binds onto the bust / figure slots (hex numbers, like game theme tints). */
export function castBinding(id) {
  const c = CAST[id] || CAST.ilya;
  return { skin: c.skin || 0xe8b890, hair: c.hair || 0x2a1c18, scrub: c.scrub || 0x2a9a98, cap: c.cap || c.hair || 0x2a1c18, glass: c.glasses || 0x303038, must: c.moustache || c.hair || 0x303030, brow: c.brows === 'fierce' ? 0x101010 : (c.hair || 0x4a3a2a), pin: c.pin || 0xf5b700, coat: id === 'bram' || id === 'hesper' ? 0xf4f4f4 : (c.scrub || 0x2a9a98) };
}
const BUST_PAL = { skin: 'sand', hair: 'ink', scrub: 'teal', cap: 'sky', glass: 'slate', must: 'white', brow: 'ink', pin: 'sand', coat: 'teal', eyeW: 'white', pupil: 'ink', lipC: 'red', inner: 'ink', sweatC: 'cyan', blushC: 'red', tie: 'blue', scarC: 'red', coffee: 'orange', ink: 'ink' };
export function bustDef(id) {
  const c = CAST[id] || CAST.narrator, parts = [];
  parts.push({ box: [1.5, 0.9, 0.8], at: [0, 0.62, 0], c: 'coat' }, { box: [0.3, 0.3, 0.3], at: [0, 1.1, 0], c: 'skin' });
  if (id === 'bram') parts.push({ box: [0.3, 0.5, 0.1], at: [0, 0.8, 0.42], c: 'tie' });
  if (id === 'hesper') parts.push({ ball: [0.12, 0.12, 0.12], at: [0.4, 0.9, 0.42], c: 'pin' });
  if (id === 'ilya') parts.push({ cyl: [0.12, 0.06, 0.12], at: [-0.4, 0.55, 0.45], c: 'coffee' });
  const head = [{ box: [0.9, 0.92, 0.72], at: [0, 0.1, -0.12], c: 'skin' }, { slab: FACE, depth: 0.26, at: [0, 0, 0.14], c: 'skin' }];
  if (c.hairStyle !== 'bald' && c.hairStyle !== 'none') {
    head.push({ slab: c.hairStyle === 'swept' ? SWEPT : FRINGE, depth: 0.16, at: [0, 0.22, 0.26], c: 'hair' }, { box: [0.98, 0.86, 0.5], at: [0, 0.2, -0.34], c: 'hair' });
    if (c.hairStyle === 'bob') head.push({ box: [0.2, 0.8, 0.5], at: [-0.52, -0.1, 0], c: 'hair' }, { box: [0.2, 0.8, 0.5], at: [0.52, -0.1, 0], c: 'hair' });
    if (c.hairStyle === 'bun') head.push({ ball: [0.44, 0.44, 0.44], at: [0, 0.78, -0.2], c: 'hair' });
    if (c.hairStyle === 'messy') head.push({ cone: [0.24, 0.3, 0.24], at: [-0.2, 0.84, 0.1], c: 'hair' }, { cone: [0.24, 0.3, 0.24], at: [0.2, 0.86, 0.05], c: 'hair' }, { cone: [0.2, 0.25, 0.2], at: [0.38, 0.72, 0.1], c: 'hair' });
  } else if (id === 'bram') head.push({ box: [0.2, 0.4, 0.5], at: [-0.52, 0, -0.1], c: 'hair' }, { box: [0.2, 0.4, 0.5], at: [0.52, 0, -0.1], c: 'hair' });
  if (c.cap) { head.push({ box: [1.04, 0.36, 0.86], at: [0, 0.62, -0.1], c: 'cap' }, { box: [1.0, 0.2, 0.3], at: [0, 0.5, 0.32], c: 'cap' }); if (c.fish) head.push({ box: [0.3, 0.16, 0.04], at: [0.2, 0.62, 0.34], c: 'eyeW' }); }
  for (const [s, n] of [[-1, 'L'], [1, 'R']]) {
    head.push({ group: [{ box: [0.22, 0.16, 0.02], at: [0, 0, 0], c: 'eyeW' }, { box: [0.12, 0.16, 0.02], at: [s * 0.02, 0, 0.02], c: 'pupil' }, { box: [0.04, 0.04, 0.02], at: [s * 0.02 + 0.02, 0.04, 0.035], c: 'eyeW' },
      ...(c.glasses ? [{ box: [0.3, 0.2, 0.01], at: [0, 0, 0.05], c: 'glass' }] : []),
      { group: [{ box: [0.26, 0.1, 0.03], at: [0, 0, 0], c: 'skin' }], at: [0, 0.1, 0.03], pivot: true, name: 'lid' + n }], at: [s * 0.2, 0.06, 0.29] });
    head.push({ group: [{ box: [0.28, 0.05, 0.03], at: [0, 0, 0], c: 'brow' }], at: [s * 0.2, 0.26, 0.3], pivot: true, name: 'brow' + n });
  }
  if (c.glasses) head.push({ box: [0.1, 0.03, 0.02], at: [0, 0.1, 0.33], c: 'glass' });
  head.push({ box: [0.08, 0.14, 0.06], at: [0, -0.08, 0.34], c: 'skin' });
  if (c.moustache) head.push({ box: [0.4, 0.09, 0.06], at: [0, -0.22, 0.34], c: 'must' });
  if (c.scar) head.push({ box: [0.03, 0.28, 0.02], at: [-0.22, 0.26, 0.31], rot: [0, 0, -17], c: 'scarC' });
  head.push({ group: [{ box: [0.2, 0.06, 0.03], at: [0, 0, 0], c: 'lipC' }, { group: [{ box: [0.16, 0.05, 0.02], at: [0, 0, 0.005], c: 'inner' }], at: [0, 0, 0], pivot: true, name: 'inner' }], at: [0, -0.34, 0.33], pivot: true, name: 'mouth' });
  head.push({ group: [{ ball: [0.1, 0.1, 0.1], at: [0, 0, 0], c: 'sweatC' }], at: [0.52, 0.3, 0.3], pivot: true, name: 'sweat' }, { group: [{ box: [0.14, 0.05, 0.02], at: [0, 0, 0], c: 'blushC' }], at: [-0.3, -0.12, 0.34], pivot: true, name: 'blush' });
  parts.push({ group: head, at: [0, 1.62, 0], pivot: true, name: 'head' });
  return model({ id: 'bust-' + id, about: `Anime talking-head bust of ${id}`, tags: ['character', 'bust'], floats: true, palette: BUST_PAL, parts });
}
const FIG_PAL = { scrub: 'teal', skin: 'sand', glove: 'sky', shoe: 'ink', cap: 'sky', coat: 'teal', mask: 'white' };
export function figureDef(id) {
  const c = CAST[id] || CAST.ilya;
  const arm = (s, x) => ({ group: [{ name: `upper${s}`, box: [0.11, 0.25, 0.11], at: [0, -0.12, 0], c: 'scrub' }, { group: [{ name: `fore${s}`, box: [0.1, 0.23, 0.1], at: [0, -0.11, 0], c: 'skin' }, { group: [{ name: `glove${s}`, box: [0.12, 0.13, 0.12], at: [0, -0.06, 0], c: 'glove' }], at: [0, -0.23, 0], name: `Hand${s}`, pivot: true }], at: [0, -0.25, 0], name: `Forearm${s}`, pivot: true }], at: [x, 0.36, 0], name: `Arm${s}`, pivot: true });
  const leg = (s, x) => ({ group: [{ name: `thigh${s}`, box: [0.15, 0.3, 0.15], at: [0, -0.15, 0], c: 'scrub' }, { group: [{ name: `shin${s}`, box: [0.13, 0.22, 0.13], at: [0, -0.11, 0], c: 'scrub' }, { group: [{ name: `shoe${s}`, box: [0.15, 0.1, 0.28], at: [0, -0.05, 0.06], c: 'shoe' }], at: [0, -0.22, 0], name: `Foot${s}`, pivot: true }], at: [0, -0.3, 0], name: `Shin${s}`, pivot: true }], at: [x, 0, 0], name: `Leg${s}`, pivot: true });
  const head = [{ name: 'skull', box: [0.26, 0.28, 0.24], at: [0, 0.12, 0], c: 'skin' }, { name: 'cap', box: [0.28, 0.1, 0.26], at: [0, 0.27, 0], c: 'cap' }, { name: 'maskP', box: [0.2, 0.1, 0.02], at: [0, 0.06, 0.13], c: 'mask' }];
  if (c.hairStyle === 'bun') head.push({ name: 'bun', box: [0.1, 0.1, 0.1], at: [0, 0.32, -0.12], c: 'cap' });
  return model({ id: 'fig-' + id, about: `Masked full-body figure of ${id} on the hero rig joint names`, tags: ['character', 'figure'], floats: true, palette: FIG_PAL,
    parts: [{ group: [{ name: 'hips', box: [0.36, 0.18, 0.22], at: [0, 0.02, 0], c: 'scrub' }, { group: [{ name: 'chest', box: [0.38, 0.42, 0.24], at: [0, 0.22, 0], c: 'coat' }, { group: head, at: [0, 0.44, 0], name: 'Head', pivot: true }, arm('R', -0.25), arm('L', 0.25)], at: [0, 0.1, 0], name: 'Torso', pivot: true }, leg('R', -0.14), leg('L', 0.14)], at: [0, 0.62, 0], name: 'Pelvis', pivot: true }] });
}
export const MODELS = [handDef, ...Object.values(toolDefs), ...Object.keys(CAST).filter((k) => k !== 'narrator' && k !== 'system').flatMap((k) => [bustDef(k), figureDef(k)])];

// Field entities and strain bodies as model() data (placed on the tissue surface by view/field.js).
const E = (id, about, palette, parts) => model({ id: 'ent-' + id, about, tags: ['prop', 'surgery'], floats: true, palette, parts });
export const entDefs = {
  hook: E('hook', 'Barbed fishhook with a line eye', { steel: 'mist', barb: 'slate', eye: 'sky' }, [{ cyl: [0.1, 0.9, 0.1], at: [0, 0.2, 0], rot: [0, 0, 17], c: 'steel' }, { cone: [0.28, 0.3, 0.28], at: [0.12, -0.2, 0], rot: [0, 0, 183], c: 'barb' }, { box: [0.34, 0.06, 0.06], at: [0, 0.7, 0], c: 'eye' }]),
  KEY: E('key', 'Swallowed key', { gold: 'sand' }, [{ box: [0.7, 0.1, 0.16], at: [0, 0, 0], c: 'gold' }, { cyl: [0.44, 0.1, 0.44], at: [-0.45, 0, 0], c: 'gold' }]),
  COIN: E('coin', 'Swallowed coin', { gold: 'sand' }, [{ cyl: [0.6, 0.07, 0.6], at: [0, 0, 0], c: 'gold' }]),
  CARD: E('card', 'Swallowed playing card', { paper: 'white' }, [{ box: [0.55, 0.05, 0.8], at: [0, 0, 0], c: 'paper' }]),
  MAGNET: E('magnet', 'Swallowed magnet pair', { n: 'red', s: 'blue', bar: 'slate' }, [{ box: [0.2, 0.2, 0.6], at: [-0.2, 0, 0], c: 'n' }, { box: [0.2, 0.2, 0.6], at: [0.2, 0, 0], c: 's' }, { box: [0.6, 0.2, 0.2], at: [0, 0, 0.3], c: 'bar' }]),
  TUMOUR: E('tumour', 'Tumour', { flesh: 'plum', hot: 'red' }, [{ ball: [1.6, 1.6, 1.6], at: [0, 0.3, 0], c: 'flesh' }, { ball: [0.6, 0.6, 0.6], at: [0.3, 0.7, 0.2], c: 'hot' }]),
  SPRIG: E('sprig', 'Pale strain sprig', { pale: 'mist', bulb: 'white' }, [{ cone: [0.5, 0.9, 0.5], at: [0, 0.4, 0], c: 'pale' }, { ball: [0.4, 0.4, 0.4], at: [0, 0.9, 0], c: 'bulb' }]),
  'THE STRAIN': E('strain', 'The strain along the spine', { pale: 'mist', bulb: 'white' }, [{ cone: [0.8, 1.4, 0.8], at: [0, 0.4, 0], c: 'pale' }, { ball: [0.5, 0.5, 0.5], at: [0, 1.0, 0], c: 'bulb' }]),
  core: E('core', 'Strain core on a tether', { flesh: 'plum', eye: 'red' }, [{ ball: [1.1, 1.1, 1.1], at: [0, 0.3, 0], c: 'flesh' }, { ball: [0.5, 0.5, 0.5], at: [0, 0.7, 0], c: 'eye' }]),
  clamp: E('clamp', 'Steel clamp', { steel: 'slate', jaw: 'mist' }, [{ box: [0.9, 0.2, 0.22], at: [0, 0, 0], c: 'steel' }, { box: [0.2, 0.35, 0.5], at: [0.4, 0.1, 0], c: 'jaw' }]),
  fragment: E('fragment', 'Bone fragment', { bone: 'white', marrow: 'sand' }, [{ box: [1.4, 0.35, 0.8], at: [0, 0, 0], c: 'bone' }, { box: [0.4, 0.25, 0.5], at: [0.4, 0.1, 0.1], c: 'marrow' }]),
  kidney: E('kidney', 'Kidney bean', { flesh: 'plum' }, [{ ball: [2.6, 1.1, 1.7], at: [0, 0, 0], c: 'flesh' }]),
  plate: E('plate', 'Wrath plate', { shell: 'red', rim: 'orange' }, [{ box: [1.5, 0.28, 0.9], at: [0, 0.1, 0], c: 'shell' }, { box: [1.2, 0.12, 0.6], at: [0, 0.3, 0], c: 'rim' }]),
  eyeW: E('eye-wrath', 'Wrath eye', { white: 'white', iris: 'red' }, [{ ball: [0.8, 0.8, 0.8], at: [0, 0.4, 0], c: 'white' }, { ball: [0.44, 0.44, 0.44], at: [0, 0.5, 0.18], c: 'iris' }]),
  core2: E('miserere', 'Miserere core with gold halo', { pale: 'mist', gold: 'sand' }, [{ ball: [1.7, 1.7, 1.7], at: [0, 0.9, 0], c: 'pale' }, { torus: [2.8, 0.14, 2.8], at: [0, 1.9, 0], c: 'gold' }, { ball: [0.6, 0.6, 0.6], at: [0, 1.0, 0.7], c: 'gold' }]),
  marker: E('marker', 'Hint marker', { gem: 'sand' }, [{ cone: [0.5, 0.5, 0.5], at: [0, 1.0, 0], c: 'gem' }, { cone: [0.5, 0.5, 0.5], at: [0, 0.75, 0], rot: [180, 0, 0], c: 'gem' }]),
  hook2: E('hook2', 'Two-handed tether anchor', { pale: 'mist', gold: 'sand' }, [{ ball: [1.2, 1.2, 1.2], at: [0, 0.5, 0], c: 'pale' }, { ball: [0.6, 0.6, 0.6], at: [0, 1.1, 0], c: 'gold' }]),
};
MODELS.push(...Object.values(entDefs));

// OR-7 set props as model() data.
const SP = (id, about, palette, parts) => model({ id: 'set-' + id, about, tags: ['prop', 'set'], floats: true, palette, parts });
export const setDefs = {
  table: SP('or7-table', 'Operating table with a draped patient', { steel: 'slate', drape: 'teal', skin: 'sand' }, [
    { box: [3.4, 0.2, 1.6], at: [0, 1.1, 0], c: 'steel' }, { box: [0.2, 1.0, 1.2], at: [-1.4, 0.5, 0], c: 'steel' }, { box: [0.2, 1.0, 1.2], at: [1.4, 0.5, 0], c: 'steel' },
    { box: [2.8, 0.3, 1.2], at: [0.2, 1.35, 0], c: 'drape' }, { ball: [0.8, 0.8, 0.8], at: [-1.5, 1.5, 0], c: 'skin' }]),
  lamp: SP('or7-lamp', 'Surgical lamp on an arm', { arm: 'slate', shade: 'mist' }, [
    { box: [0.1, 2.4, 0.1], at: [0, -1.2, 0], c: 'arm' }, { cyl: [1.8, 0.5, 1.8], at: [0, -2.5, 0], c: 'shade' }]),
  tray: SP('or7-tray', 'Instrument tray', { steel: 'slate', tool: 'mist' }, [
    { box: [1.4, 0.1, 0.8], at: [0, 1.4, 0], c: 'steel' }, ...[0, 1, 2, 3].map((i) => ({ box: [0.08, 0.06, 0.5], at: [-0.4 + i * 0.25, 1.5, 0], c: 'tool' })), { box: [0.1, 1.4, 0.1], at: [-0.6, 0.7, 0], c: 'steel' }, { box: [0.1, 1.4, 0.1], at: [0.6, 0.7, 0], c: 'steel' }]),
  monitorStand: SP('or7-monitor', 'Monitor stand and housing', { case: 'ink', pole: 'slate' }, [{ box: [1.2, 0.9, 0.2], at: [0, 2.6, 0], c: 'case' }, { box: [0.1, 2.0, 0.1], at: [0, 1.0, 0], c: 'pole' }]),
};
MODELS.push(...Object.values(setDefs));

/** Room shell (floor + back wall, optionally side walls) as parametric model() data. */
export const roomDef = model({ id: 'set-room', about: 'Room shell: floor, back wall and optional side walls', tags: ['set', 'room'], floats: true,
  palette: { floor: 'slate', wall: 'mist' },
  params: { w: [18, 4, 40], d: [14, 4, 30], h: [6, 0.5, 10], sides: [1, 0, 1] },
  parts: (p) => [{ box: [p.w, 0.3, p.d], at: [0, -0.15, 0], c: 'floor' }, { box: [p.w, p.h, 0.3], at: [0, p.h / 2, -p.d / 2], c: 'wall' },
    ...(p.sides ? [{ box: [0.3, p.h, p.d], at: [-p.w / 2, p.h / 2, 0], c: 'wall' }, { box: [0.3, p.h, p.d], at: [p.w / 2, p.h / 2, 0], c: 'wall' }] : [])] });
MODELS.push(roomDef);

export const fieldFrameDef = model({ id: 'field-frame', about: 'Drapes and clamps framing an operating field', tags: ['set', 'surgery'], floats: true, palette: { drape: 'teal', steel: 'slate' }, parts: [
  { box: [2.4, 0.8, 12], at: [-9.2, 0.2, 0], c: 'drape' }, { box: [2.4, 0.8, 12], at: [9.2, 0.2, 0], c: 'drape' }, { box: [20, 0.8, 1.6], at: [0, 0.2, -5.4], c: 'drape' }, { box: [20, 0.8, 1.6], at: [0, 0.2, 5.6], c: 'drape' },
  { box: [0.5, 0.5, 0.9], at: [-7.8, 0.75, -4.0], c: 'steel' }, { box: [0.5, 0.5, 0.9], at: [7.8, 0.75, -4.0], c: 'steel' }, { box: [0.5, 0.5, 0.9], at: [-7.8, 0.75, 4.0], c: 'steel' }] });
MODELS.push(fieldFrameDef);
