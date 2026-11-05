/* TARGET 01 · 01B PALAIS DES NEIGES (§11.7): the conference palace. Security, the atrium (the Concierge on Article
 * Nine), the frozen Coastal and Steppe delegations, the Inspector (Edelweiss 1), the dark press room where Mireille's
 * flash develops the blackboard, the safe (2-6-0-1: the Ember Charm), the Hall of Mirrors whose Echo Wall Kasimir sings
 * open, and the ballroom: Die Lustigen Vier. */
S7.area('01B', {
  title: 'PALAIS DES NEIGES', sub: 'THE THAW ACCORD', target: 1, music: 'palais', ambience: 'roomtone', pinNo: 4,
  world: { kind: 'level', w: 56, h: 42, wallH: 6,
    rooms: [[2, 17, 16, 24], [16, 14, 26, 27], [16, 27, 26, 34], [16, 34, 26, 41], [26, 27, 36, 34], [26, 34, 36, 41], [26, 17, 36, 24], [36, 19, 46, 22], [46, 17, 52, 24], [38, 24, 54, 41]],
    walls: [[26, 34, 31, 35, 6]], raised: [[40, 25, 52, 29, 1]],
    ground: 'tiles', colors: { base: '#d8dce4', dark: '#3a4050', light: '#eef0f4' }, side: 'block', wallColor: '#4a5068', wallTop: '#20242e', raisedSide: 'planks', raisedColor: '#5a2a1a',
    sky: '#04050a', fog: { color: '#0a0c14', near: 260, far: 900 }, ambient: ['#5a6078', '#14161e', 1.25], lights: 6, postcard: ['#101830', '#4a5a8a'] },
  nodes: {
    e1: { t: [4.5, 20.5], kind: 'exit', label: 'TO THE VILLAGE', to: ['01A', 'pg'] },
    sc: { t: [10.5, 20.5], kind: 'stop', label: 'SECURITY' },
    at: { t: [21, 20.5], kind: 'junction', label: 'ATRIUM' },
    cf: { t: [21, 30.5], kind: 'junction', label: 'COASTAL HALL' },
    pr: { t: [21, 38], kind: 'stop', label: 'PRESS ROOM' },
    sd: { t: [31, 30.5], kind: 'junction', label: 'STEPPE HALL' },
    ck: { t: [32.5, 38], kind: 'door', label: 'CLOAKROOM · ROOM 7' },
    hm: { t: [31, 20.5], kind: 'junction', label: 'HALL OF MIRRORS' },
    sp: { t: [41.5, 20.5], kind: 'stop', label: 'SERVANTS\' PASSAGE' },
    bb: { t: [49, 20.5], kind: 'stop', label: 'BACKSTAGE' },
    br: { t: [46, 33], kind: 'stop', label: 'BALLROOM' },
    bx: { t: [48.5, 40], kind: 'exit', label: 'BACK EXIT', to: ['01A', 'f1'], open: true }
  },
  edges: [
    { a: 'e1', b: 'sc' }, { a: 'sc', b: 'at' }, { a: 'at', b: 'cf' }, { a: 'cf', b: 'pr' }, { a: 'cf', b: 'sd' }, { a: 'sd', b: 'ck', via: [[32.5, 34.5]] },
    { a: 'at', b: 'hm' }, { a: 'hm', b: 'sp', gate: 'mirrors' }, { a: 'sp', b: 'bb' }, { a: 'bb', b: 'br', via: [[53, 26.5], [50, 31]] }, { a: 'br', b: 'bx', gate: 'band' }
  ],
  gates: {
    mirrors: { kind: 'spot', label: 'A WALL OF MIRRORS', solver: 'kasimir', line: 'Your reflection grins back. Mirrors lie. Echoes don\'t.', block: [36, 19, 37, 22, 0, 6] },
    band: { kind: 'flag', flag: 'bandDead', label: 'THE BAND IS PLAYING', line: 'The doors stay shut while the band plays.' }
  },
  bandAt: [[43, 26.6], [45.5, 26.6], [48, 26.6], [50.5, 26.6]], stageZ: 1,
  spots: [
    { id: 'door7', kind: 'door7', node: 'ck', label: 'Room 7 · behind the coats' },
    { id: 'arch', kind: 'sign', node: 'sc', line: 'A metal-detector arch. It beeps at everyone. It beeped at you twice.' },
    { id: 'phone', kind: 'phone', at: [23.5, 15.4], talk: 'concierge_atrium', label: 'House phone', reach: 3.2 },
    { id: 'amb', kind: 'tableau', at: [18.5, 31.2], who: 'delegate', label: 'The Coastal Ambassador', line: 'We have nothing to hide that we haven\'t already hidden.', reach: 3 },
    { id: 'interp', kind: 'tableau', at: [23.6, 32.6], who: 'delegate', label: 'An interpreter', line: 'He says... he is sorry. He is not saying that.', reach: 3 },
    { id: 'gen', kind: 'tableau', at: [34.4, 31.6], who: 'delegate', label: 'The Steppe General', line: 'Neutrality isn\'t a place. It\'s a direction. Away.', reach: 3 },
    { id: 'sec', kind: 'tableau', at: [28.4, 32.8], who: 'delegate', label: 'A secretary', line: 'Sign here. And here. And under the ice.', reach: 3 },
    { id: 'waiter', kind: 'tableau', at: [28.6, 18.6], who: 'delegate', label: 'A waiter', line: 'The canapés were always frozen. Now they\'re honest.', reach: 3 },
    { id: 'journo', kind: 'tableau', at: [19, 39.4], who: 'delegate', label: 'A journalist', line: 'Off the record? The record is on ice.', reach: 3 },
    { id: 'safe', kind: 'codelock', at: [18.6, 29.2], code: '2601', give: { ember: 1 }, dossier: 'accord', label: 'THE COASTAL SAFE', reach: 3.4, line: 'The safe swings open. Inside: a coal that will not cool, in a silver cage.' },
    { id: 'board', kind: 'exposure', target: true, at: [21, 40.4], atZ: 1.7, r: 1.4, exposure: 'exposure1', flag: 'exposure1', dossier: 'exposure1', label: 'A BLACKBOARD' },
    { id: 'mirror', kind: 'echowall', target: true, at: [36.5, 20.5], atZ: 1.8, r: 1.6, opens: 'mirrors', flag: 'mirrorsOpen', label: 'THE ECHO WALL' },
    { id: 'pin4', kind: 'pin', pin: 4, node: 'sp' },
    { id: 'rime1', kind: 'rime', n: 4, node: 'pr' }, { id: 'rime2', kind: 'rime', n: 4, edge: 'sp-bb', s: .5 }, { id: 'rime3', kind: 'rime', n: 3, edge: 'sd-ck', s: .5 },
    { id: 'red1', kind: 'red', n: 10, edge: 'sc-at', s: .5 }, { id: 'red2', kind: 'red', n: 10, edge: 'at-hm', s: .5 }, { id: 'red3', kind: 'red', n: 14, edge: 'cf-sd', s: .5 },
    { id: 'leave', kind: 'exit', node: 'e1', label: 'To the village' }
  ],
  spawns: { s1: [6, 18.5], s2: [6, 22.5], s3: [14.5, 18], s4: [14.5, 23], cp: [24, 28.5], c1: [17, 33], c2: [24.5, 33], t1: [34.5, 28.5], t2: [27.5, 28.5], insp: [31, 28.6], d1: [17.5, 36], d2: [24.5, 40], d3: [18, 40],
    dance1: [39.5, 39], dance2: [52.5, 39], dance3: [39.5, 31], dance4: [52.5, 31] },
  waves: {
    security: { spawn: [['bellboy', 's1', 0], ['giggler', 's3', .5], ['bellboy', 's2', 1.4], ['giggler', 's4', 2.2]] },
    coast: { spawn: [['plow', 'cp', 0], ['giggler', 'c1', .8], ['giggler', 'c2', 1.6]] },
    steppe: { spawn: [['twins', 't1', 0], ['twins', 't2', 1.2]] },
    dark: { spawn: [['giggler', 'd1', 0], ['giggler', 'd2', 1], ['giggler', 'd3', 2]] }
  },
  triggers: [
    { id: 'security', node: 'sc', wave: 'security', tut: 'scan' },
    { id: 'coast', node: 'cf', wave: 'coast' },
    { id: 'steppe', node: 'sd', wave: 'steppe' },
    { id: 'insp', node: 'sd', beat: 'inspector', once: false, notFlag: 'edelweiss1' },
    { id: 'dark', node: 'pr', wave: 'dark', beat: 'darkroom' },
    { id: 'mirrors', node: 'hm', beat: 'mirrors_tip', notFlag: 'mirrorsOpen' },
    { id: 'band', node: 'br', beat: 'band_arrive', notFlag: 'bandDead' }
  ],
  props: [
    ['shape', 'S7:security-arch', 10.5, 20.5, 0, { facing: 0 }], ['shape', 'S7:velvet-stanchion', 10.5, 18.6, 0, {}], ['shape', 'S7:velvet-stanchion', 10.5, 22.4, 0, {}],
    ['shape', 'S7:conference-table', 21, 32.2, 0, {}], ['shape', 'S7:conference-table', 31, 32.2, 0, {}],
    ['shape', 'S7:flagpole', 28.5, 28.6, 0, { params: { c: 'steppe' } }], ['shape', 'S7:flagpole', 33.5, 28.6, 0, { params: { c: 'steppe' } }], ['shape', 'S7:flagpole', 31, 33.4, 0, { params: { c: 'steppe' } }],
    ['shape', 'S7:flagpole', 17.5, 28.4, 0, { params: { c: 'coastal' } }], ['shape', 'S7:flagpole', 25, 28.4, 0, { params: { c: 'coastal' } }],
    ['shape', 'S7:safe', 18.4, 28.4, 0, { facing: Math.PI / 2 }],
    ['shape', 'S7:blackboard', 21, 40.6, 0, { facing: -Math.PI / 2 }], ['shape', 'S7:pinboard', 25.6, 37, 0, { facing: Math.PI }], ['shape', 'S7:pinboard', 16.4, 37, 0, { facing: 0 }],
    ['shape', 'S7:mirror-panel', 26.4, 18.5, 0, { facing: 0 }], ['shape', 'S7:mirror-panel', 26.4, 22.5, 0, { facing: 0 }], ['shape', 'S7:mirror-panel', 35.6, 18.2, 0, { facing: Math.PI }], ['shape', 'S7:mirror-panel', 35.6, 22.8, 0, { facing: Math.PI }],
    ['shape', 'S7:stage', 46, 26.5, 0, { facing: 0, scale: .9 }], ['shape', 'S7:band-flag', 38.6, 30, 0, { facing: 0 }], ['shape', 'S7:band-flag', 53.4, 30, 0, { facing: Math.PI }],
    ['shape', 'kenney-furniture:lounge-sofa', 18, 16, 0, { scale: 1.3, facing: Math.PI / 2 }], ['shape', 'S7:potted-palm', 25, 15, 0, {}], ['shape', 'S7:potted-palm', 17, 25.6, 0, {}],
    ['shape', 'kaykit-furniture-bits:chair-a', 23, 38.5, 0, { scale: 1.3 }], ['shape', 'kaykit-furniture-bits:table-medium', 19, 36, 0, { scale: 1.3 }],
    ['shape', 'kaykit-furniture-bits:shelf-a-big', 35.5, 39.5, 0, { scale: 1.4, facing: Math.PI }],
    ['thing', 'chandelier', 21, 20.5, 5.4], ['thing', 'chandelier', 46, 34, 5.4], ['thing', 'chandelier', 31, 20.5, 5.4],
    ['thing', 'echowall', 36.5, 20.5, 0], ['thing', 'runner', 9, 20.5, 0, { w: 13, d: 2, color: '#2a4a8a' }],
    ['light', 21, 20.5, 5, { color: '#e8f0ff', reach: 220, power: 3.2 }], ['light', 31, 20.5, 5, { color: '#e0e8ff', reach: 180, power: 2.6, flicker: .04 }],
    ['light', 21, 30.5, 4.5, { color: '#c0d0ff', reach: 160, power: 2.6 }], ['light', 31, 30.5, 4.5, { color: '#ffc0b0', reach: 160, power: 2.6 }],
    ['light', 21, 38, 4, { color: '#c0d0ff', reach: 120, power: 2.2, tag: 'press' }], ['light', 46, 34, 5, { color: '#ffd8a0', reach: 260, power: 4 }], ['light', 46, 26.5, 3.5, { color: '#ff6040', reach: 140, power: 2.6 }]
  ],
  people: [
    { who: 'delegate', at: [18.5, 31.2], pose: 'hips', facing: 0 }, { who: 'delegate', at: [23.6, 32.6], pose: 'wave', facing: Math.PI }, { who: 'delegate', at: [34.4, 31.6], pose: 'guard', facing: Math.PI },
    { who: 'delegate', at: [28.4, 32.8], pose: 'cast', facing: 0 }, { who: 'delegate', at: [28.6, 18.6], pose: 'hips', facing: Math.PI / 2 }, { who: 'delegate', at: [19, 39.4], pose: 'crouch', facing: -Math.PI / 2 }
  ],
  dark: { area: 'pr', node: 'pr', light: 'press' },
  /** the ballroom while the band plays: from the dance floor, the hero in the foreground, the stage beyond */
  camera(sim, h) { if (!sim.boss || sim.boss.id !== 'band' || sim.aim.on || sim.camOverride) return null; return sim.cam.aimSafe(h, [h.x + 1.4 * M, h.y + 5 * M, h.z + 2.4 * M], [46.5 * M, 26.6 * M, 1.6 * M], 58); }
});
