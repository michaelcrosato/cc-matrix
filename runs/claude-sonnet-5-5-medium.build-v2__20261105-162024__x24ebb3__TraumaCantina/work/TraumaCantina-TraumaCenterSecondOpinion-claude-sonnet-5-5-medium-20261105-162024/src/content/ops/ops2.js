import { P, H, LAC, CUT, MASK, GELLINE, DRESS, POLYP, MARK, STRAIN, DRAG, OPEN, CLOSE_STAGES } from './helpers.js';
import { rnd, rr } from '../../core/rng.js';
const ALL = ['scalpel', 'forceps', 'suture', 'drain', 'syringe', 'gel', 'laser', 'scanner'];

export const op6 = { id: 'op6', title: 'COLD HANDS', arena: 'kidney', surgeon: 'sabine', gifts: ['look'], tools: ALL, comm: 'reyes',
  patient: { name: 'ADA OKOYE', age: 48, job: "PEM'S SISTER, FERRY CAPTAIN", hook: 'SHE HAS NEVER ONCE LET ANYONE STEER FOR HER.', followUp: { S: 'SHE STEERED THE FERRY HOME HERSELF. PEM WAS ON BOARD. HE DID NOT PUN.', A: 'BACK AT THE WHEEL. SHE SENT SABINE A TINY BRASS COMPASS.', B: 'BACK AT THE WHEEL, ON LIGHT DUTIES. SHE ALLOWS THE FIRST MATE TO TALK.', C: 'ALIVE. SHE IS COMPLAINING ABOUT THE FOOD. THIS IS A GOOD SIGN.' } },
  scene: 'ep6', time: 360, vitals: { start: 80, drain: 0.20 }, doses: 3, music: 'or-tense', par: 5300,
  stages: [
    { id: 'open', say: 'sabine.openK', hint: 'scalpel', spawn: [OPEN('open', -1.2, -3.4, 3.4)], until: { clear: ['cut'] } },
    { id: 'clamps', say: 'sabine.clamp', hint: 'forceps', spawn: [DRAG('cl1', -4.8, 2.2, [-1.4, -0.7], { tol: 0.55, kind: 'clamp', then: [{ flag: 'clA' }] }), DRAG('cl2', -4.2, 2.5, [1.4, -0.7], { tol: 0.55, kind: 'clamp' })], until: { clear: ['drag'] } },
    { id: 'vessels', say: 'sabine.cutVessels', hint: 'scalpel', spawn: [CUT('v1', [[-1.7, -0.7], [-1.1, -0.7]], { tag: 'vessel' }), CUT('v2', [[1.1, -0.7], [1.7, -0.7]], { tag: 'vessel' })], until: { clear: ['cut'] } },
    { id: 'lift', say: 'sabine.liftK', hint: 'forceps', spawn: [DRAG('oldK', 0, -0.2, null, { dish: true, what: 'KIDNEY', tol: 0.5 })], until: { clear: ['drag'] } },
    { id: 'donor', say: 'sabine.donor', hint: 'forceps', spawn: [DRAG('newK', 4.4, -2.6, [0, -0.2], { tol: 0.8, kind: 'donor', then: [{ cold: 120 }, { flag: 'donorIn' }] })], until: { flag: 'donorIn' } },
    { id: 'anast', say: 'sabine.anast', hint: 'suture', spawn: [LAC('an1', -1.9, 0.4, 0.15, 0.9, { urgent: false }), LAC('an2', 1.0, 0.4, -0.1, 0.9), LAC('an3', -0.6, 1.4, 0.05, 0.9)], until: { clear: ['lac', 'pool', 'nick'] } },
    { id: 'unclamp', say: 'sabine.unclamp', hint: 'forceps', spawn: [DRAG('unvein', -1.4, -0.7, null, { dish: true, what: 'CLAMP', tol: 0.5 }), DRAG('unart', 1.4, -0.7, null, { dish: true, what: 'CLAMP', needs: 'unvein', tol: 0.5, then: [{ clotBurst: true }] })], until: { clear: ['drag'] } },
    { id: 'clot', say: 'sabine.clot', hint: 'suture', until: { clear: ['lac', 'pool', 'nick'] } },
    { id: 'pink', say: 'sabine.pink', cmds: [{ flag: 'pinkUp' }, { cold: 0 }], until: { time: 4 } },
    { id: 'sample', say: 'sabine.sample', hint: 'scanner', spawn: [MARK('smp', -3.4, 1.8, { hid: 'scan' })], until: { clear: ['marker'] } },
    ...CLOSE_STAGES(2.4),
  ], cbThen: [] };

export const op7 = { id: 'op7', title: 'LACRIMOSA', arena: 'lung', surgeon: 'ilya', gifts: ['quiet'], tools: ALL, boss: 'lacrimosa',
  patient: { name: 'OTTILIE MARR', age: 58, job: 'HOSPICE NURSE', hook: "SHE HAS BEEN REYES'S FRIEND FOR THIRTY YEARS.", followUp: { S: 'SHE CAN FEEL THE RAIN ON HER FACE. REYES HELD HER HAND FOR AN HOUR.', A: 'SHE FEELS HER OWN HEARTBEAT AGAIN. SHE SAYS IT IS LOUD. IT IS.', B: 'SHE FEELS THINGS AGAIN. SOME OF THEM HURT. SHE THANKS US FOR ALL OF IT.', C: 'SHE LIVES. SHE FEELS HER OLD KNEE. SHE IS DELIGHTED AND SWEARING.' } },
  scene: 'ep7', time: 390, vitals: { start: 80, drain: 0.30 }, doses: 4, music: 'boss-lacrimosa', par: 5400,
  stages: [
    { id: 'open', say: 'reyes.openLung', hint: 'scalpel', spawn: [OPEN('open', -0.4, -3.4, 3.4)], until: { clear: ['cut'] } },
    { id: 'weeper', say: 'reyes.weeper', hint: 'laser', spawn: [STRAIN('lacrimosa', 'lc1', { eyes: 5 })], until: { clear: ['strain'] } },
    ...CLOSE_STAGES(2.4),
  ] };

export const op8 = { id: 'op8', title: 'DIES IRAE', arena: 'heart', surgeon: 'ilya', gifts: ['quiet'], tools: ALL, boss: 'wrath',
  patient: { name: 'CHIEF CORNELIUS BRAM', age: 68, job: 'CHIEF OF SURGERY', hook: 'HE HAS BEEN SHOWING UP AGAIN TOMORROW FOR FORTY YEARS.', followUp: { S: 'HIS HANDS ARE STEADY NOW. HE TEACHES. HE TELLS EVERYONE ABOUT THE SCALPEL.', A: 'HIS HANDS STILL SHAKE. HE SAYS IT IS FROM THE COFFEE. HE IS LYING WELL.', B: 'HE IS RECOVERING. HE KEEPS THE SCALPEL ON HIS DESK AND NEVER USES IT.', C: 'HE LIVES. HE SAYS "SHOWING UP IS THE JOB." HE SAYS IT A LOT.' } },
  scene: 'ep8', time: 420, vitals: { start: 75, drain: 0.35 }, doses: 5, music: 'boss-wrath', par: 7500,
  stages: [
    { id: 'open', say: 'reyes.openHeart', hint: 'scalpel', spawn: [OPEN('open', -2.6, -3.4, 3.4)], until: { clear: ['cut'] } },
    { id: 'wrath', say: 'reyes.wrath', hint: 'scalpel', spawn: [STRAIN('wrath', 'w1', {})], until: { clear: ['strain'] } },
    ...CLOSE_STAGES(2.4),
  ] };

const cystPos = [[-4.4, -2.4], [-2.4, -1.2], [-0.4, -2.6], [1.8, -1.4], [3.8, -2.4], [-3.8, 0.4], [-1.4, 1.0], [0.6, 0.4], [3.0, 0.2], [4.6, 1.2], [-4.2, 2.2], [1.6, 2.2], [-2.0, 2.4]];
const realIdx = new Set([0, 2, 3, 5, 6, 8, 10, 11]);
export const op9 = { id: 'op9', title: 'LIBERA ME', arena: 'chest', surgeon: 'ilya', gifts: ['quiet', 'look'], tools: ALL, boss: 'miserere', noHint: true, noVoice: true, partner: true, comm: 'none',
  patient: { name: 'NURSE ODALYS REYES', age: 45, job: 'SCRUB NURSE', hook: 'SHE TOLD US TO START WITHOUT HER.', followUp: { S: 'SHE WOKE UP AND SAID "YOUR SUTURES ARE CROOKED, DOCTOR." SHE MEANT IT KINDLY.', A: 'SHE WOKE UP AND CORRECTED OUR GRAMMAR. SHE IS GOING TO BE FINE.', B: 'SHE WOKE UP. SHE LOOKED AT THE SUTURES AND SIGHED. THIS IS LOVE.', C: 'SHE WOKE UP. SHE SAID "ADEQUATE." THIS IS THE HIGHEST PRAISE SHE HAS.' } },
  scene: 'ep9', time: 540, vitals: { start: 70, drain: 0.35 }, doses: 6, music: 'boss-miserere', par: 7000,
  stages: [
    { id: 'sanctus', say: 'sanctus.intro', hint: 'scanner', cmds: [{ flag: 'fakeVitals' }, { setVitals: 41 }, { setDrain: 0.12 }],
      spawn: cystPos.map((p, i) => ({ k: 'cyst', id: 'cy' + i, at: p, r: 0.42, real: realIdx.has(i), scanOnly: true })),
      until: { clearIds: [...realIdx].map((i) => 'cy' + i) }, after: [{ setDrain: 0.35 }] },
    { id: 'truth', say: 'sanctus.truth', cmds: [{ flag: 'trueVitals' }, { remove: cystPos.map((_, i) => 'cy' + i).filter((_, i) => !realIdx.has(i)) }], until: { time: 3 } },
    { id: 'reprise', say: 'reprise.intro', hint: 'scalpel', cmds: [{ tagOK: true }],
      spawn: [STRAIN('introit', 'ri', { hp: 1, timer: 9, path: [[-4.8, -1.8], [-3.2, -2.6], [-1.6, -1.0], [-3.4, 0.4], [-4.8, 1.2], [-4.8, -1.8]] }), STRAIN('lacrimosa', 'rl', { eyes: 2, hpEach: 2, noSob: true, x0: 3.4 }), STRAIN('wrath', 'rw', { rounds: [3], noArrest: true, cx: 0, cz: -0.3 })],
      until: { clear: ['strain'] } },
    { id: 'miserere', say: 'miserere.intro', hint: 'laser', cmds: [{ flag: 'tagOK' }, { music: 'boss-miserere' }, { remove: [] }], spawn: [STRAIN('miserere', 'ms', {})], until: { clear: ['strain', 'hook2'] }, on: {} },
    { id: 'codeblue', say: 'miserere.cb', cmds: [], until: { flag: 'cbDone' } },
    { id: 'silence', say: 'reyes.crooked', cmds: [{ music: 'silence' }], until: { time: 4 } },
  ], cbThen: [{ flag: 'cbDone' }] };
op9.stages[3].until = { clear: ['strain', 'hook2'] };
op9.stages[3].after = [{ codeBlue: true }];

const sprigs = [[-3.6, -2.0, 0.6], [-1.6, 1.6, -0.4], [0.4, -1.8, 0.8], [2.2, 1.4, 2.6], [4.0, -1.0, 2.2]];
export const op10 = { id: 'op10', title: 'DO NO HARM', arena: 'spine', surgeon: 'ilya', gifts: ['quiet'], tools: ALL, calm: true, comm: 'lindqvist',
  patient: { name: 'DR. HESPER LINDQVIST', age: 66, job: 'FOUNDER, THE MERCY FOUNDATION', hook: 'SHE HAS NOT FELT PAIN FOR ELEVEN YEARS.', followUp: { S: 'SHE FELT THE MORNING SUN ON HER FACE. SHE SAID IT HURT. SHE SAID IT WAS BEAUTIFUL.', A: 'SHE FEELS EVERYTHING. SHE ASKED FOR A PEN. SHE IS WRITING A LETTER.', B: 'SHE FEELS HER LEGS. THE FIRST THING SHE SAID WAS "THANK YOU." THE SECOND WAS "OW."', C: 'SHE LIVES. SHE FEELS IT ALL. SHE IS NOT YET SURE WHAT TO DO WITH THAT.' } },
  scene: 'ep10', time: 240, vitals: { start: 60, drain: 0.05 }, doses: 2, music: 'op10', par: 3500,
  stages: [
    { id: 'open', say: 'lindqvist.open', hint: 'scalpel', spawn: [OPEN('open', -0.6, -3.2, 3.2).k && CUT('open', [[-3.2, -0.6], [-1.6, -0.8], [1.6, -0.4], [3.2, -0.6]])], until: { clear: ['cut'] } },
    { id: 'sprigs', say: 'lindqvist.sprigs', hint: 'forceps', spawn: sprigs.map(([x, z, a], i) => H('sp' + i, x, z, a, { what: 'SPRIG', arc: 0.3, pull: 1.3, then: [{ vitals: 5 }, { say: 'lindqvist.pain' + (i + 1) }] })), until: { clear: ['hook'] } },
    { id: 'spine', say: 'lindqvist.spine', hint: 'forceps', spawn: [H('core', 0, -0.4, -1.5708, { what: 'THE STRAIN', arc: 0, pull: 2.2, then: [{ vitals: 8 }, { say: 'lindqvist.why' }] })], until: { clear: ['hook'] } },
    ...CLOSE_STAGES(2.4),
  ] };

// Consult: Pile-Up (a wave-based chest wound). Waves are generated once from a fixed seed (content is data).
function pileUp() {
  const g = { rs: 4242 }, tl = [];
  const spot = (zlo = -3.2, zhi = 2.4) => [rr(g, -5, 5), rr(g, zlo, zhi)];
  for (let w = 0; w < 8; w++) {
    const sp = [];
    const at = w * 24;
    for (let i = 0; i < 2; i++) { const [x, z] = spot(-3, 1.8); const a = rr(g, -0.5, 0.5) + (x > 0 ? Math.PI : 0); sp.push(H(`pu${w}h${i}`, x, z, a, { pull: 1.0 })); }
    { const [x, z] = spot(); sp.push(P(`pu${w}p`, x, z, rr(g, 0.8, 1.2))); }
    { const [x, z] = spot(-2.8, 1.6); sp.push(LAC(`pu${w}l`, Math.max(-4.8, Math.min(3.4, x)), z, 0, 1.2)); }
    { for (let i = 0; i < 2; i++) { const [x, z] = spot(-3, 2.0); sp.push(POLYP(`pu${w}o${i}`, x, z)); } }
    if (w % 3 === 2) sp.push({ k: 'lac', id: `pu${w}s`, at: [-1, 0.6], a: 0.1, len: 1.0, urgent: true });
    tl.push({ at, cmds: [{ spawn: sp }] });
  }
  tl.push({ at: 200, cmds: [{ spawn: [STRAIN('introit', 'pin', { hp: 2, timer: 5 })] }, { say: 'reyes.knockPile' }] });
  return tl;
}
export const pileup = { id: 'pileup', title: 'PILE-UP', arena: 'chest', surgeon: 'ilya', gifts: ['quiet', 'look'], tools: ALL, session: true, consult: true,
  patient: { name: 'DOCKSIDE PILE-UP', age: 0, job: 'MANY PATIENTS, ONE WOUND', hook: 'EVERYONE SCRUBS IN. NOBODY GOES HOME UNTIL IT IS CLOSED.', followUp: { S: 'THE WHOLE DOCK APPLAUDED. THE NURSES PRETENDED NOT TO SMILE.', A: 'THE WOUND CLOSED. THE COFFEE WAS SHARED.', B: 'THE WOUND CLOSED. NOBODY MENTIONED THE SUTURES.', C: 'THE WOUND CLOSED, BARELY. REYES SAID "ADEQUATE." EVERYONE PRETENDED NOT TO HEAR.' } },
  scene: 'ep1', time: 250, vitals: { start: 80, drain: 0.22 }, doses: 5, music: 'or-tense', par: 9000,
  stages: [{ id: 'pile', say: 'reyes.pile', hint: 'forceps', until: { all: [{ time: 205 }, { clear: ['pool', 'hook', 'lac', 'polyp', 'nick', 'strain'] }] } }],
  timeline: pileUp() };
const session = (id, title, stage, boss, music) => ({ id, title, arena: stage.arena, surgeon: 'ilya', gifts: ['quiet', 'look'], tools: ALL, session: true, consult: true, boss, patient: { name: title, age: 0, job: 'A BAD NIGHT AT THE DOCKS', hook: 'ALL HANDS AT THE TABLE.', followUp: { S: 'THE TABLE CLAPPED.', A: 'THE TABLE NODDED.', B: 'THE TABLE SHRUGGED.', C: 'THE TABLE WILL TALK ABOUT THIS.' } }, scene: 'ep1', time: 240, vitals: { start: 80, drain: 0.22 }, doses: 4, music, par: 4400, stages: [{ id: 'f', say: stage.say, hint: stage.hint, spawn: [stage.s], until: { clear: ['strain'] } }] });
export const sIntroit = session('s-introit', 'FIGHT: INTROIT', { arena: 'liver', say: 'reyes.knock', hint: 'scanner', s: STRAIN('introit', 'in1', { hp: 3, timer: 6 }) }, 'introit', 'boss-introit');
export const sLacrimosa = session('s-lacrimosa', 'FIGHT: LACRIMOSA', { arena: 'lung', say: 'reyes.weeper', hint: 'laser', s: STRAIN('lacrimosa', 'lc1', { eyes: 4, hpEach: 2 }) }, 'lacrimosa', 'boss-lacrimosa');
export const sWrath = session('s-wrath', 'FIGHT: DIES IRAE', { arena: 'heart', say: 'reyes.wrath', hint: 'scalpel', s: STRAIN('wrath', 'w1', { rounds: [2, 2] }) }, 'wrath', 'boss-wrath');
