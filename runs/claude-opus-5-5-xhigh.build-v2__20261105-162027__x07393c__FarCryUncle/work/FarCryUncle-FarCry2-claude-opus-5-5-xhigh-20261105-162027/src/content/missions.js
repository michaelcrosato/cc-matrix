// Contracts as data. Step types are in missions/steps.js. Scripts are named coroutines in missions/scripts.js.
// `ops` are applied in order when a mission completes, and quietly when dev mode jumps past it.
export const MISSION_ORDER = ['m0', 'm1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'end'];
export const MISSIONS = {
  m0: { id: 'm0', title: 'THE GOODS LINE', giver: null, requires: [], auto: true, act: 1, steps: [{ do: 'script', name: 'm0', text: 'RIDE IN. LOOK AT THE MAP.' }], next: 'm1', ops: [{ flag: 'arrived' }] },
  m1: { id: 'm1', title: 'MERCY RUN', giver: 'odile', requires: ['m0'], auto: true, act: 1, pay: 5, steps: [
    { do: 'script', name: 'm1Wake', text: 'TAKE THE TABLET' },
    { do: 'talk', who: 'odile', lines: 'm1.brief', text: 'HEAR HER OUT' },
    { do: 'script', name: 'm1Gear', text: 'THE TRUCK IS OUTSIDE' },
    { do: 'enter', tag: 'm1-truck', text: 'GET IN THE TRUCK' },
    { do: 'goto', site: 'three-wells', r: 34, text: 'DRIVE THE MEDICINE TO THREE WELLS' },
    { do: 'use', id: 'wells-drop', site: 'three-wells', dx: 10, dz: -3, y: 1, verb: 'LEAVE THE MEDICINE', text: 'LEAVE THE CRATE BY THE WELL' },
    { do: 'goto', at: [-200, 30], r: 62, text: 'BACK TO MILE FORTY. THE ROAD GOES BY P2.' },
    { do: 'script', name: 'm1Ambush', text: 'THEY HAVE MANNED P2' },
    { do: 'goto', site: 'mile-forty', r: 50, text: 'BACK TO THE CLINIC' },
    { do: 'report', to: 'odile', lines: 'm1.done', text: 'REPORT TO ODILE' },
  ], ops: [{ tablets: 3 }, { safehouse: 'pump-shed' }, { meet: 'mags' }, { patrols: true }, { mapSee: 'pump-shed' }, { mapSee: 'ranger-post' }, { mapSee: 'three-wells' }], next: null },
  m2: { id: 'm2', title: 'A CAGE AT THE POST', giver: 'tibor', requires: ['m1'], act: 1, pay: 8, brief: 'm2.brief', steps: [
    { do: 'goto', site: 'ranger-post', r: 130, text: 'SCOUT THE RANGER POST. BEST AT NIGHT.', hint: 'mono' },
    { do: 'use', id: 'cage', site: 'ranger-post', dx: 12, dz: 9.6, y: 1, hold: 3, verb: 'OPEN THE CAGE', text: 'OPEN THE CAGE' },
    { do: 'script', name: 'm2Free', text: 'SHE IS OUT' },
    { do: 'kill', squad: 'ranger-post', text: 'CLEAR THE POST' },
    { do: 'report', to: 'tibor', lines: 'm2.done', text: 'BACK TO TIBOR' },
  ], ops: [{ meet: 'ines' }, { meet: 'dov' }, { safehouse: 'ranger-post' }, { act: 2 }, { mapSee: 'fort-clement' }, { mapSee: 'granary' }, { unlock: 'tractor' }, { notice: 'THE COLONEL AND THE MOTHER BOTH WANT A WORD. BOTH OF THEM PAY.' }] },
  m3: { id: 'm3', title: 'FUEL FOR THE PEACE', giver: 'vance', requires: ['m2'], act: 2, pay: 15, pass: 'concord', wind: { dir: [-0.8, -0.6], speed: 5 }, brief: 'm3.brief', give: { guns: ['flare'] },
    alt: { buddy: 'ines', call: 'm3.alt', bonus: 5, at: 0, steps: [{ do: 'script', name: 'm3TankerAt', text: 'TAKE THE TANKER AT P3' }, { do: 'steal', tag: 'tanker', text: 'TAKE THE TANKER AT P3' }, { do: 'script', name: 'm3TankerIn', text: 'DRIVE IT INTO THE SIDING. THEY WILL WAVE AT FUEL.' }] },
    steps: [
      { do: 'goto', site: 'east-siding', r: 140, text: 'REACH THE SIDING. THE WIND WILL CARRY IT.' },
      { do: 'destroy', tag: 'fuel-tank', n: 3, text: 'BURN THE TANKS' },
      { do: 'leave', site: 'east-siding', r: 200, text: 'GET OUT' },
      { do: 'report', to: 'vance', lines: 'm3.done', text: 'REPORT TO VANCE' },
    ], ops: [{ burnStrip: 'A' }, { flag: 'scarA' }, { smoke: [430, -60] }, { mapSee: 'east-siding' }] },
  m4: { id: 'm4', title: 'SEED MONEY', giver: 'ansa', requires: ['m2'], act: 2, pay: 20, pass: 'harvest', brief: 'm4.brief',
    alt: { buddy: 'dov', call: 'm4.alt', bonus: 5, at: 0, steps: [{ do: 'script', name: 'm4Dov', text: 'PLANT DOV\'S CHARGES ON THE BRIDGE' }] },
    steps: [
      { do: 'script', name: 'm4Convoy', text: 'THE PAYROLL CROSSES THE SALT PAN' },
      { do: 'destroy', tag: 'payroll', n: 1, text: 'STOP THE CONVOY. BLOW THE TRUCK.' },
      { do: 'script', name: 'm4Case', text: 'FIND THE CASE WITH THE TRACKER' },
      { do: 'collect', id: 'payroll-case', text: 'THE CASE IS IN THE SALT. HOLD THE TRACKER UP.' },
      { do: 'report', to: 'ansa', lines: 'm4.done', text: 'REPORT TO ANSA' },
    ], ops: [{ flag: 'tracker' }, { mapSee: 'salt-pan' }] },
  m5: { id: 'm5', title: 'THE WATER QUESTION', giver: 'vance', requires: ['m3'], act: 2, pay: 20, pass: 'concord', brief: 'm5.brief', give: { charges: 2 },
    alt: { buddy: 'mags', call: 'm5.alt', bonus: 0, payOverride: 10, at: 1, steps: [
      { do: 'use', id: 'bypass', site: 'pump-station', dx: 1.6, dz: 0, y: 1.2, hold: 2, verb: 'OPEN THE BYPASS', text: 'OPEN THE BYPASS VALVE' },
      { do: 'script', name: 'm5Hold', text: 'HOLD THE PUMP HOUSE' },
    ] },
    steps: [
      { do: 'goto', site: 'pump-station', r: 60, text: 'REACH THE PUMP ON THE MERCY' },
      { do: 'blast', site: 'pump-station', r: 12, text: 'PLANT A CHARGE ON THE PUMP. HOLD THROW.' },
      { do: 'leave', site: 'pump-station', r: 120, text: 'LEAVE IT' },
      { do: 'report', to: 'vance', lines: null, text: 'REPORT TO VANCE' },
    ], onDoneScript: 'm5After', ops: [{ mapSee: 'pump-station' }] },
  m6: { id: 'm6', title: 'THE LONG FIELD', giver: 'ansa', requires: ['m4'], act: 2, pay: 25, pass: 'harvest', hour: 21.5, wind: { dir: [0.9, 0.2], speed: 4 }, brief: 'm6.brief', steps: [
    { do: 'script', name: 'm6Buddy', text: 'TAKE SOMEONE' },
    { do: 'goto', site: 'long-field', r: 120, text: 'REACH THE LONG FIELD' },
    { do: 'script', name: 'm6Burn', text: 'BURN THE CROP' },
    { do: 'destroy', tag: 'ammo-bunker', n: 1, text: 'BLOW THE BUNKER' },
    { do: 'leave', site: 'long-field', r: 190, text: 'GET OUT' },
    { do: 'report', to: 'ansa', lines: 'm6.done', text: 'REPORT TO ANSA' },
  ], ops: [{ burnStrip: 'B' }, { flag: 'scarB' }, { mapSee: 'long-field' }] },
  m7: { id: 'm7', title: 'THE CUT', giver: 'note', requires: ['m3', 'm4', 'm5', 'm6'], act: 3, pay: 15, brief: 'm7.note',
    alt: { buddy: 'any', call: 'm7.alt', bonus: 0, at: 0, steps: [{ do: 'script', name: 'm7Road', text: 'THEY HOLD THE EAST ROAD. GO IN BY THE PIT.' }] },
    steps: [
      { do: 'script', name: 'm7War', text: 'THE TRUCE IS OVER' },
      { do: 'goto', site: 'the-cut', r: 90, text: 'REACH THE CUT' },
      { do: 'use', id: 'ledger-book', site: 'the-cut', dx: 60, dz: -39.4, y: 1, verb: 'TAKE HIS LEDGER', text: 'THE SLUICE HOUSE. TAKE HIS LEDGER.' },
      { do: 'script', name: 'm7Read', text: 'READ IT' },
      { do: 'leave', site: 'the-cut', r: 230, text: 'GET OUT OF THE MINE' },
    ], ops: [{ burnStrip: 'C' }, { flag: 'scarC' }, { truce: false }, { stock: true }, { act: 3 }, { mapSee: 'the-cut' }, { mapSee: 'observatory' }, { script: 'm7After' }] },
  m8: { id: 'm8', title: 'LAST TRAIN', giver: 'odile', requires: ['m7'], act: 3, pay: 10, brief: 'm8.brief', steps: [
    { do: 'script', name: 'm8Hold', text: 'HOLD THE PLATFORM WHILE THEY BOARD' },
    { do: 'script', name: 'm8Ride', text: 'THE FLATCAR GUN. KEEP THEM OFF THE TRAIN.' },
  ], ops: [{ flag: 'column' }, { moved: 600 }, { mapSee: 'the-pass' }, { script: 'm8After' }] },
  m9: { id: 'm9', title: 'THE SURVEYOR', giver: 'note', requires: ['m8'], act: 3, pay: 0, hour: 23, weather: 'storm', steps: [
    { do: 'goto', site: 'observatory', r: 46, text: 'CLIMB TO THE OBSERVATORY' },
    { do: 'use', id: 'harrow-table', site: 'observatory', dx: 0, dz: 3.6, y: 1.2, verb: 'SIT DOWN', text: 'HE IS AT THE TABLE' },
    { do: 'script', name: 'm9Scene', text: 'THE SURVEYOR' },
  ], next: 'end', ops: [] },
  end: { id: 'end', title: 'THE PASS', giver: null, requires: ['m9'], auto: true, act: 3, pay: 0, hour: 4.6, steps: [{ do: 'script', name: 'endPass', text: 'THE PASS' }], ops: [] },
  mr1: { id: 'mr1', side: true, title: 'A CRATE FOR THE WEST CUTTING', giver: 'odile', requires: ['m1'], pay: 0, brief: 'odile.run', timer: 300, carry: true, steps: [{ do: 'goto', at: [-296, 96], r: 14, text: 'CARRY THE CRATE TO THE WEST CUTTING' }, { do: 'use', id: 'drop-mr1', at: [-296, 96], y: 1, verb: 'LEAVE THE CRATE', text: 'LEAVE THE CRATE' }], ops: [{ mercy: true }] },
  mr2: { id: 'mr2', side: true, title: 'A CRATE FOR THE BACK ROAD', giver: 'odile', requires: ['m1'], pay: 0, brief: 'odile.run', timer: 300, carry: true, steps: [{ do: 'goto', at: [120, 110], r: 14, text: 'CARRY THE CRATE TO THE BOTTLE TREE' }, { do: 'use', id: 'drop-mr2', at: [120, 110], y: 1, verb: 'LEAVE THE CRATE', text: 'LEAVE THE CRATE' }], ops: [{ mercy: true }] },
  mr3: { id: 'mr3', side: true, title: 'A CRATE FOR THE FORD', giver: 'odile', requires: ['m1'], pay: 0, brief: 'odile.run', timer: 300, carry: true, steps: [{ do: 'goto', at: [-68, 340], r: 14, text: 'CARRY THE CRATE OVER THE FORD' }, { do: 'use', id: 'drop-mr3', at: [-68, 340], y: 1, verb: 'LEAVE THE CRATE', text: 'LEAVE THE CRATE' }], ops: [{ mercy: true }] },
};
export const GIVER_LINES = { odile: 'odile.idle', tibor: 'tibor.idle', vance: 'vance.idle', ansa: 'ansa.idle', bakr: 'bakr.idle', ines: 'ines.idle', dov: 'dov.idle', mags: 'mags.idle' };
