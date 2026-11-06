// Original chiptune compositions as engine Song data, generated from small chord/phrase tables.
const NN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const note = (m) => NN[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
const MIN = [0, 2, 3, 5, 7, 8, 10], MAJ = [0, 2, 4, 5, 7, 9, 11];
let seed = 7;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
// o: root midi, scale, prog [[degreeOffsetSemis, chordSemis[]]], bars per chord 1
function build(o) {
  seed = o.seed || 7;
  const patterns = {}, order = [];
  o.prog.forEach(([rootOff, chord], ci) => {
    const base = o.root + rootOff, sc = o.scale;
    const lead = [], bass = [], pad = [], pad2 = [], drum = [], hat = [];
    let cur = 0;
    for (let s = 0; s < 16; s++) {
      const hit = o.leadDensity > rnd() && (s % (o.leadGrid || 2) === 0);
      if (hit) { cur = Math.max(0, Math.min(10, cur + Math.floor(rnd() * 5) - 2)); const m = o.root + 12 * (o.leadOct ?? 1) + sc[cur % 7] + 12 * Math.floor(cur / 7) + (o.leadShift || 0); lead.push(note(m)); }
      else lead.push(o.leadHold && lead.length && lead[lead.length - 1] !== '.' && s % 4 !== 0 && rnd() < 0.5 ? '-' : '.');
      bass.push(o.bassPat[s % o.bassPat.length] ? note(base - 12 + (o.bassPat[s % o.bassPat.length] === 2 ? 7 : 0)) : '.');
      pad.push(s === 0 ? note(base + chord[2] + 12) : '-'); pad2.push(s === 0 ? note(base + chord[1]) : '-');
      drum.push(o.drum && o.drum[s % o.drum.length] ? 'C6' : '.'); hat.push(o.hat && o.hat[s % o.hat.length] ? 'C8' : '.');
    }
    const p = { lead: lead.join(' '), bass: bass.join(' '), pad: pad.join(' '), pad2: pad2.join(' ') };
    if (o.drum) p.drum = drum.join(' '); if (o.hat) p.hat = hat.join(' ');
    patterns['c' + ci] = p; order.push('c' + ci);
  });
  const tr = { lead: o.lead, bass: o.bass, pad: o.pad, pad2: o.pad };
  if (o.drum) tr.drum = { wave: 'noise', decay: 0.1, volume: o.drumVol ?? 0.07 }; if (o.hat) tr.hat = { wave: 'noise', decay: 0.03, volume: 0.03 };
  return { bpm: o.bpm, tracks: tr, patterns, order: [...order, ...(o.reverse ? [...order].reverse() : [])] };
}
const L = (wave, volume, decay = 0.25, extra = {}) => ({ wave, volume, decay, ...extra });
const CH_MIN = [0, 3, 7], CH_MAJ = [0, 4, 7], CH_M7 = [0, 3, 10], CH_D7 = [0, 4, 10], CH_MAJ7 = [0, 4, 11];
const A = 57, D = 50, E = 52, G = 55, BB = 58, C = 60;

export const SONGS = {
  title: build({ bpm: 66, root: A, scale: MIN, seed: 3, prog: [[0, CH_MIN], [-4, CH_MAJ], [-2, CH_MAJ], [-5, CH_MIN]], leadDensity: 0.45, leadGrid: 4, leadOct: 1, leadHold: true, lead: L('triangle', 0.14, 0.7), bass: L('triangle', 0.1, 0.5), pad: L('sine', 0.045, 1.2), bassPat: [1, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0] }),
  ward: build({ bpm: 92, root: D, scale: MAJ, seed: 11, prog: [[0, CH_M7], [5, CH_D7], [-2, CH_MAJ7], [-5, CH_D7]], leadDensity: 0.55, leadGrid: 2, leadOct: 1, lead: L('triangle', 0.1, 0.3), bass: L('triangle', 0.1, 0.3), pad: L('sine', 0.035, 0.9), bassPat: [1, 0, 0, 2, 1, 0, 0, 0, 2, 0, 1, 0, 1, 0, 0, 2], hat: [1, 0, 1, 0] , drum: [0, 0, 0, 0, 1, 0, 0, 0] }),
  'or-calm': build({ bpm: 84, root: E, scale: MIN, seed: 21, prog: [[0, CH_MIN], [-4, CH_MAJ], [-7, CH_MAJ], [-2, CH_MAJ]], leadDensity: 0.4, leadGrid: 2, lead: L('triangle', 0.1, 0.3), bass: L('square', 0.045, 0.3, { duty: 0.125 }), pad: L('sine', 0.035, 0.9), bassPat: [1, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 0] }),
  'or-tense': build({ bpm: 84, root: E, scale: MIN, seed: 22, prog: [[0, CH_MIN], [-4, CH_MAJ], [-7, CH_MAJ], [-2, CH_MIN]], leadDensity: 0.65, leadGrid: 2, lead: L('square', 0.06, 0.2, { duty: 0.25 }), bass: L('square', 0.06, 0.25, { duty: 0.125 }), pad: L('saw', 0.025, 0.9), bassPat: [1, 0, 1, 0, 1, 0, 1, 0, 2, 0, 1, 0, 1, 0, 2, 0], hat: [0, 0, 1, 0], drum: [1, 0, 0, 0, 0, 0, 0, 0] }),
  'or-critical': build({ bpm: 84, root: E, scale: MIN, seed: 23, prog: [[0, CH_MIN], [-4, CH_MAJ], [-7, CH_MAJ], [-2, CH_MIN]], leadDensity: 0.9, leadGrid: 1, lead: L('square', 0.06, 0.12, { duty: 0.125 }), bass: L('square', 0.07, 0.2, { duty: 0.25 }), pad: L('saw', 0.03, 0.6), bassPat: [1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 2, 2], hat: [1, 0, 1, 1], drum: [1, 0, 0, 1, 0, 0, 1, 0] }),
  'boss-introit': build({ bpm: 96, root: D, scale: MIN, seed: 31, prog: [[0, CH_MIN], [0, CH_MIN], [-2, CH_MAJ], [-4, CH_MAJ]], leadDensity: 0.6, leadGrid: 2, lead: L('square', 0.06, 0.25, { duty: 0.25 }), bass: L('saw', 0.07, 0.3), pad: L('saw', 0.04, 1.0, { vibrato: { depth: 0.2, rate: 5 } }), bassPat: [1, 0, 0, 1, 0, 0, 1, 0, 2, 0, 0, 1, 0, 0, 1, 0], drum: [1, 0, 0, 0, 0, 0, 1, 0], hat: [0, 1] }),
  'boss-lacrimosa': build({ bpm: 72, root: G, scale: MIN, seed: 41, prog: [[0, CH_MIN], [-2, CH_MAJ], [-4, CH_MAJ], [-5, CH_MIN]], leadDensity: 0.5, leadGrid: 2, leadOct: 2, lead: L('sine', 0.12, 0.5), bass: L('triangle', 0.1, 0.5), pad: L('saw', 0.045, 1.4, { vibrato: { depth: 0.3, rate: 4 } }), bassPat: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0], hat: [1, 0, 0, 0, 0, 0, 0, 0] }),
  'boss-wrath': build({ bpm: 72, root: BB - 12, scale: MIN, seed: 51, prog: [[0, CH_MIN], [-2, CH_MAJ], [-4, CH_MAJ], [-5, CH_MIN]], leadDensity: 0.7, leadGrid: 1, lead: L('square', 0.06, 0.18, { duty: 0.125 }), bass: L('saw', 0.08, 0.2), pad: L('saw', 0.04, 0.8), bassPat: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], drum: [1, 0, 0, 0, 1, 0, 0, 0], drumVol: 0.1, hat: [1, 1] }),
  'boss-miserere': build({ bpm: 60, root: C, scale: MIN, seed: 61, prog: [[0, CH_MIN], [-4, CH_MAJ], [-2, CH_MAJ], [-7, CH_MAJ]], leadDensity: 0.4, leadGrid: 4, leadOct: 2, lead: L('sine', 0.13, 0.9), bass: L('sine', 0.12, 0.8), pad: L('saw', 0.04, 1.6, { vibrato: { depth: 0.3, rate: 3 } }), bassPat: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0] }),
  op10: build({ bpm: 60, root: C, scale: MAJ, seed: 71, prog: [[0, CH_MAJ], [-3, CH_MIN], [-7, CH_MAJ], [-5, CH_MAJ]], leadDensity: 0.25, leadGrid: 4, leadOct: 2, lead: L('triangle', 0.1, 0.9), bass: L('sine', 0.09, 0.9), pad: L('sine', 0.04, 1.6), bassPat: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }),
  results: build({ bpm: 120, root: C, scale: MAJ, seed: 81, prog: [[0, CH_MAJ], [5, CH_MAJ], [7, CH_MAJ], [0, CH_MAJ]], leadDensity: 0.8, leadGrid: 1, lead: L('square', 0.07, 0.2, { duty: 0.25 }), bass: L('triangle', 0.1, 0.25), pad: L('triangle', 0.04, 0.5), bassPat: [1, 0, 1, 0, 2, 0, 1, 0], drum: [1, 0, 0, 0, 1, 0, 0, 0], hat: [1, 0] }),
  'results-sad': build({ bpm: 54, root: A - 12, scale: MIN, seed: 91, prog: [[0, CH_MIN], [-2, CH_MAJ], [-4, CH_MAJ], [-5, CH_MIN]], leadDensity: 0.3, leadGrid: 4, leadOct: 2, lead: L('triangle', 0.1, 1.0), bass: L('sine', 0.09, 0.9), pad: L('sine', 0.04, 1.5), bassPat: [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] }),
  credits: build({ bpm: 76, root: G, scale: MAJ, seed: 101, prog: [[0, CH_MAJ], [-3, CH_MIN], [-5, CH_MAJ], [-7, CH_MAJ]], leadDensity: 0.5, leadGrid: 2, leadOct: 1, lead: L('triangle', 0.1, 0.4), bass: L('triangle', 0.09, 0.4), pad: L('sine', 0.04, 1.2), bassPat: [1, 0, 0, 2, 0, 0, 1, 0], hat: [1, 0, 0, 0] }),
};
export const songById = (id) => (id && id !== 'silence' ? SONGS[id] || null : null);
