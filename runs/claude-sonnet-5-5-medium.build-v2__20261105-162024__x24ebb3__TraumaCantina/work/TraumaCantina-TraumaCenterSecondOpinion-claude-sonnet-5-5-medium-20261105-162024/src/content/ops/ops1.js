import { P, H, LAC, CUT, MASK, GELLINE, DRESS, POLYP, MARK, STRAIN, DRAG, PROP, OPEN, CLOSE_STAGES } from './helpers.js';

export const op1 = { id: 'op1', title: 'ELEVEN HOOKS', arena: 'forearm', surgeon: 'ilya', gifts: [], tools: ['drain', 'forceps', 'suture', 'gel'],
  patient: { name: 'TOMASZ DOLAN', age: 52, job: 'TRAWLER DECKHAND', hook: "HIS DAUGHTER'S WEDDING IS SATURDAY.", followUp: { S: 'HE WALKED HER DOWN THE AISLE. DRY EYES. THE ARM HELD.', A: 'HE DANCED WELL. HE CALLED ME "DOC". I LET HIM.', B: 'HE DANCED BADLY. SHE CRIED ANYWAY. IT WAS LOVELY.', C: "HE'LL KEEP THE ARM. HE DANCED BADLY. HIS DAUGHTER FORGAVE US." } },
  scene: 'ep1', time: 240, vitals: { start: 85, drain: 0.10 }, doses: 3, music: 'or-calm', par: 4900,
  stages: [
    { id: 'marker', say: 'reyes.welcome', hint: 'move', spawn: [MARK('m1', 0, 0.2)], until: { clear: ['marker'] } },
    { id: 'pools', say: 'reyes.drainFirst', hint: 'drain',
      spawn: [P('p1', -3.2, 0.2, 1.5), P('p2', 2.8, -0.6, 1.4),
        H('h1', -3.4, 0.0, 0.2, { hiddenBy: 'p1' }), H('h2', -3.0, 0.8, -0.3, { hiddenBy: 'p1' }), H('h3', -2.6, -0.4, 0.5, { hiddenBy: 'p1' }),
        H('h4', 2.6, -0.8, 3.0, { hiddenBy: 'p2' }), H('h5', 3.1, -0.2, 2.6, { hiddenBy: 'p2' }), H('h6', 2.4, 0.2, -2.9, { hiddenBy: 'p2' })],
      until: { clear: ['pool'] }, on: { vitalsBelow: { 50: { say: 'reyes.stabilize', unlock: 'syringe' } } } },
    { id: 'hooks', say: 'reyes.hooks', hint: 'forceps',
      spawn: [H('h7', -0.8, -1.8, 0.6), H('h8', 0.2, 1.0, 1.2), H('h9', -1.2, 1.9, -0.5), H('h10', 0.9, -0.2, 0.2), H('h11', 4.0, 1.4, 3.1)],
      until: { clear: ['hook'] }, on: { vitalsBelow: { 50: { say: 'reyes.stabilize', unlock: 'syringe' } } } },
    { id: 'sutures', say: 'reyes.suture', hint: 'suture', spawn: [LAC('s1', -2.8, -1.4, 0.05, 1.4), LAC('s2', 1.6, 1.4, -0.1, 1.4)], until: { clear: ['lac', 'pool', 'nick'] } },
    { id: 'gel', say: 'reyes.gel', hint: 'gel', cmds: [{ unlock: 'syringe' }], spawn: [MASK('rust', -0.6, 0.4, 2.6, 1.2)], until: { clear: ['mask'] } },
    { id: 'dress', say: 'reyes.dress', hint: 'dress', spawn: [DRESS('dr', [[-4, 2.2], [4, 2.2]], { then: [{ say: 'reyes.twelve' }, { spawn: [H('h12', 0.6, -1.4, 0.4, { at: [0.6, -1.4] })] }] })], until: { all: [{ clear: ['dress'] }, { clear: ['hook', 'nick', 'pool'] }] } },
  ] };

export const op2 = { id: 'op2', title: 'THE VANISHING ACT', arena: 'stomach', surgeon: 'ilya', gifts: [], tools: ['scalpel', 'forceps', 'suture', 'drain', 'syringe', 'gel', 'laser', 'scanner'],
  patient: { name: 'THE GREAT ZAMBONI', age: 44, job: 'STAGE MAGICIAN', hook: 'HE SWALLOWED SOMETHING DURING HIS ACT AND WON\'T SAY WHAT.', followUp: { S: 'HE SENT A POSTCARD. IT HAD A COIN IN IT. NO NOTE.', A: 'HE PERFORMS AGAIN. HE NEVER SWALLOWS ANYTHING ON STAGE NOW.', B: 'HE DID A TRICK FOR THE NURSES. WE PRETENDED NOT TO KNOW HOW.', C: 'HE LEFT A DOVE IN RECOVERY. IT IS STILL HERE.' } },
  scene: 'ep2', time: 300, vitals: { start: 80, drain: 0.15 }, doses: 3, music: 'or-calm', par: 6400,
  stages: [
    { id: 'midline', say: 'reyes.scalpel', hint: 'scalpel', cmds: [{ unlock: 'scalpel' }], spawn: [CUT('mid', [[-3.5, -0.4], [-1.2, -0.9], [1.2, 0.0], [3.5, -0.5]], { then: [{ spawn: [P('b1', -2.3, -0.7, 0.8), P('b2', -0.2, -0.5, 0.8), P('b3', 1.6, -0.2, 0.8), P('b4', 3.0, -0.6, 0.7)] }] })], until: { all: [{ done: 'mid' }, { clear: ['pool'] }] } },
    { id: 'props', say: 'reyes.scanProps', hint: 'scanner', cmds: [{ unlock: 'scanner' }],
      spawn: [...PROP('key', -3.6, 1.0, 0.3, 'KEY'), ...PROP('coin', 3.6, 1.4, 2.8, 'COIN'), ...PROP('card', -1.4, 2.0, -0.4, 'CARD'), ...PROP('mag', 1.6, 1.8, 0.4, 'MAGNET', { vmax: 2.2 })],
      until: { clear: ['hook', 'cut'] } },
    { id: 'tumor', say: 'zamboni.notProp', hint: 'scanner', cmds: [{ music: 'or-tense' }],
      spawn: [CUT('ring', [[-1.2, -0.8], [0, -1.6], [1.2, -0.8], [1.2, 0.6], [0, 1.2], [-1.2, 0.6], [-1.2, -0.7]], { hid: 'scan', x: 0, z: -0.2 }),
        H('tum', 0, -0.2, -1.5708, { hid: 'scan', needs: 'ring', what: 'TUMOUR', pull: 1.4, arc: 0, size: 1.0 }),
        POLYP('pl1', -3.6, -2.2), POLYP('pl2', 3.4, -2.0), POLYP('pl3', -3.8, 1.8), POLYP('pl4', 3.8, 1.6), POLYP('pl5', 0.2, 2.2)],
      until: { clear: ['hook', 'cut', 'polyp'] } },
    ...CLOSE_STAGES(2.2),
  ] };

const tableA = [{ k: 'lac', id: 'a1', at: [-2.5, 0], a: 0.1, len: 1.4, urgent: true, tb: 0 }, { k: 'pool', id: 'ap1', at: [2.2, -0.8], r: 1.2, tb: 0 }];
export const op3 = { id: 'op3', title: 'NIGHT FERRY', arena: 'three', surgeon: 'ilya', gifts: [], tools: ['scalpel', 'forceps', 'suture', 'drain', 'syringe', 'gel', 'laser', 'scanner'],
  patient: { name: 'THREE FERRY PASSENGERS', age: 0, job: 'PORT VERITY COMMUTERS', hook: 'THREE TABLES. ONE DOCTOR. ALL OF THEM ARE SOMEBODY\'S.', followUp: { S: 'ALL THREE WALKED OUT. ONE OF THEM BROUGHT DOUGHNUTS.', A: 'ALL THREE LIVED. ONE COMPLAINED ABOUT THE COFFEE.', B: 'ALL THREE LIVED. THE COFFEE WAS NOT DISCUSSED.', C: 'ALL THREE LIVED. IT WAS CLOSE. DO NOT DISCUSS HOW CLOSE.' } },
  scene: 'ep3', time: 360, tables: [{ vitals: 70, drain: 0.25 }, { vitals: 60, drain: 0.25 }, { vitals: 55, drain: 0.25 }], doses: 5, music: 'or-tense', par: 5700,
  stages: [
    { id: 'triage', say: 'reyes.triage', hint: 'tables',
      spawn: [
        { k: 'lac', id: 'a1', at: [-2.5, 0.2], a: 0.1, len: 1.4, tb: 0 }, { k: 'pool', id: 'ap1', at: [2.2, -0.8], r: 1.0, tb: 0 },
        H('b1', -3.2, -0.6, 0.3, { tb: 1 }), H('b2', 0.8, 1.2, -0.4, { tb: 1 }), MASK('bm1', 2.6, -0.4, 1.4, 0.9, { tb: 1 }),
        CUT('c1', [[-3, -0.6], [-1, -1.0], [1, -0.2], [3, -0.5]], { tb: 2, then: [{ spawn: [P('cp1', -1.0, -0.8, 1.0, { tb: 2 }), P('cp2', 1.4, -0.3, 0.9, { tb: 2 })] }] })],
      until: { all: [{ time: 150 }, { clear: ['pool', 'hook', 'lac', 'cut', 'mask', 'polyp', 'nick'] }] } },
    { id: 'wrap', say: 'reyes.wrapTriage', hint: 'suture', spawn: [{ k: 'lac', id: 'cs', at: [-1.6, 1.4], a: 0.05, len: 1.6, tb: 2 }], until: { all: [{ clear: ['lac', 'pool', 'nick', 'polyp', 'mask'] }] } },
  ],
  timeline: [
    { at: 28, cmds: [{ spawn: [P('ap2', -0.8, 1.4, 1.0, { tb: 0 }), H('b3', 3.4, 1.0, 3.0, { tb: 1 }), { k: 'lac', id: 'c2', at: [-3.4, 1.6], a: 0, len: 1.4, tb: 1 }] }, { say: 'reyes.batch' }] },
    { at: 58, cmds: [{ spawn: [{ k: 'lac', id: 'a2', at: [1.6, 1.8], a: -0.1, len: 1.3, urgent: true, tb: 0 }, POLYP('cpo1', -3.6, -2.0, { tb: 2 }), POLYP('cpo2', 3.2, 1.8, { tb: 2 })] }] },
    { at: 88, cmds: [{ spawn: [MASK('bm2', -2.2, 1.6, 1.4, 0.8, { tb: 1 }), P('cp3', 3.0, -1.2, 0.9, { tb: 2 }), H('b4', -0.4, -2.0, 0.6, { tb: 1 })] }, { say: 'reyes.batch' }] },
    { at: 110, cmds: [{ composure: 70 }, { vitals: -22, tb: 2 }, { awaken: true }, { say: 'reyes.quiet' }, { cut: 'quiet' }] },
  ] };

export const op4 = { id: 'op4', title: 'STICKS AND STONES', arena: 'bone', surgeon: 'ilya', gifts: ['quiet'], tools: ['scalpel', 'forceps', 'suture', 'drain', 'syringe', 'gel', 'laser', 'scanner'], comm: 'sabine',
  patient: { name: 'OLLIE BRANDT', age: 16, job: 'STUDENT, FERRY SURVIVOR', hook: 'HE JUST WANTS TO PLAY GOALKEEPER AGAIN.', followUp: { S: 'HE SAVED A PENALTY IN WEEK THREE. HE CRIED. SO DID HIS COACH.', A: 'BACK IN GOAL. HE TELLS EVERYONE ABOUT THE NURSE WHO SCOLDED HIM.', B: 'BACK IN GOAL, MOSTLY. HE STILL FLINCHES AT FERRY HORNS.', C: 'HE WILL PLAY AGAIN. HE WILL ALSO LIMP DRAMATICALLY. HE LIKES THE ATTENTION.' } },
  scene: 'ep4', time: 330, vitals: { start: 75, drain: 0.20 }, doses: 3, music: 'or-tense', par: 4300,
  stages: [
    { id: 'open', say: 'sabine.open', hint: 'scalpel', spawn: [OPEN('open', -0.2, -4, 4)], until: { clear: ['cut'] } },
    { id: 'drain', say: 'sabine.drain', hint: 'drain', spawn: [P('p1', -2.6, 1.2, 1.2), P('p2', 2.6, -1.2, 1.2), DRAG('f5', -3.2, 1.5, [-2.16, 0], { hiddenBy: 'p1', rot: 1.2, rotT: 0.1, tol: 0.6 }), DRAG('f6', 3.0, -1.0, [2.16, 0], { hiddenBy: 'p2', rot: -1.0, rotT: -0.1, tol: 0.6 })], until: { clear: ['pool'] } },
    { id: 'mend', say: 'sabine.mend', hint: 'forceps',
      spawn: [DRAG('f1', -4.6, -2.4, [-3.6, 0], { rot: 1.1, rotT: 0.15, tol: 0.6 }), DRAG('f2', -1.0, -2.6, [-1.44, 0], { rot: -0.9, rotT: -0.1, tol: 0.6 }), DRAG('f3', 1.2, 2.2, [0, 0], { rot: 1.4, rotT: 0.0, tol: 0.6 }), DRAG('f4', 4.4, 2.0, [3.6, 0], { rot: -1.2, rotT: 0.12, tol: 0.6 })].map((d) => ({ ...d, tol: 0.6 })),
      until: { clear: ['drag'] } },
    { id: 'cement', say: 'sabine.cement', hint: 'gel', spawn: [{ k: 'mask', id: 'seam', shape: { line: [[-3.6, 0], [-1.44, 0], [0, 0], [2.16, 0], [3.6, 0]] }, need: 0.92 }], until: { clear: ['mask'] } },
    { id: 'artery', say: 'sabine.artery', hint: 'suture', cmds: [{ vitals: -8 }], spawn: [LAC('art', -0.4, 1.4, 0.1, 1.2, { urgent: true })], until: { clear: ['lac'] }, after: [{ codeBlue: true }] },
    { id: 'paddles', say: 'sabine.paddles', hint: 'paddles', until: { flag: 'cbDone' } },
    ...CLOSE_STAGES(2.4).map((s) => s),
  ], cbThen: [{ flag: 'cbDone' }] };

export const op5 = { id: 'op5', title: 'INTROIT', arena: 'liver', surgeon: 'ilya', gifts: ['quiet'], tools: ['scalpel', 'forceps', 'suture', 'drain', 'syringe', 'gel', 'laser', 'scanner'], boss: 'introit',
  patient: { name: 'MR. ANSELM', age: 61, job: 'HARBOUR PILOT', hook: 'HE FEELS NOTHING. HE SAYS IT IS WONDERFUL.', followUp: { S: 'HE FELT HIS FIRST HEADACHE IN YEARS. HE CRIED WITH JOY AT HIS ASPIRIN.', A: 'HE WINCED AT A STUBBED TOE AND THEN WEPT. WE ALL UNDERSTOOD.', B: 'HE FEELS A LITTLE. HE IS NOT SURE HE LIKES IT. HE IS KEEPING IT.', C: 'HE SURVIVED. HE ASKED IF THE KNOCKING WAS "NORMAL." IT WAS NOT.' } },
  scene: 'ep5', time: 360, vitals: { start: 80, drain: 0.30 }, doses: 4, music: 'boss-introit', par: 6000,
  stages: [
    { id: 'scan', say: 'reyes.scanLiver', hint: 'scanner', spawn: [STRAIN('introit', 'in1', { hp: 3, timer: 14 })], until: { flag: 'scanned' } },
    { id: 'fight', say: 'reyes.knock', hint: 'scalpel', until: { clear: ['strain'] } },
    { id: 'eggs', say: 'reyes.eggs', hint: 'laser', spawn: [{ k: 'egg', id: 'e1', at: [-3.6, -1.6] }, { k: 'egg', id: 'e2', at: [-1.4, -2.4] }, { k: 'egg', id: 'e3', at: [2.2, -2.2] }, { k: 'egg', id: 'e4', at: [3.8, -0.4] }, { k: 'egg', id: 'e5', at: [-3.2, 1.6] }, { k: 'egg', id: 'e6', at: [2.8, 1.8] }].map((e) => ({ ...e, r: 0.4 })), until: { clear: ['egg'] } },
    ...CLOSE_STAGES(2.4),
  ] };
