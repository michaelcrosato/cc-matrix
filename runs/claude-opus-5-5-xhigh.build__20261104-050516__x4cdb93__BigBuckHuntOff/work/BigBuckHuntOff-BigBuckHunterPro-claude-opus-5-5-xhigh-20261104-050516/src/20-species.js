// 20-species: the three huntable species: speeds, toughness, temper, their call, and what a rack is worth.
def('species', 'whitetail', { label: 'Whitetail', rig: 'whitetail', speeds: [1.3, 3.4, 8.5], hp: 1, temper: .35, call: 'grunt', callName: 'grunt tube',
  names: { m: 'BUCK', f: 'DOE', y: 'FAWN' }, rack: p => p + ' POINTS', base: p => 100 + 15 * p, antlers: p => ({ points: p }), jumpy: true });
def('species', 'elk', { label: 'Elk', rig: 'elk', speeds: [1.4, 4.0, 9.0], hp: 1.5, temper: .45, herd: true, call: 'bugle', callName: 'bugle',
  names: { m: 'BULL', f: 'COW', y: 'CALF' }, rack: p => Math.ceil(p / 2) + 'x' + Math.floor(p / 2), base: p => 150 + 20 * p, antlers: p => ({ points: p }) });
def('species', 'moose', { label: 'Moose', rig: 'moose', speeds: [1.5, 4.5, 8.0], hp: 2, temper: .7, stubborn: true, call: 'moosecall', callName: 'moose call',
  names: { m: 'BULL', f: 'COW', y: 'CALF' }, rack: p => p + '-INCH SPREAD', base: p => 200 + 6 * p, antlers: p => ({ points: Math.round(p / 4), spread: p }) });
/** the kind words a site script uses -> sex and age */
const KIND = { buck: ['m', false], bull: ['m', false], doe: ['f', false], cow: ['f', false], fawn: ['f', true], calf: ['f', true] };
const isTargetKind = k => k === 'buck' || k === 'bull';
