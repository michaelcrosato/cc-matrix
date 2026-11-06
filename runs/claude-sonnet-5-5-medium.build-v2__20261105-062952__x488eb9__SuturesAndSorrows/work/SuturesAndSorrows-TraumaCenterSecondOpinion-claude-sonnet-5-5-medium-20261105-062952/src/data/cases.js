// Cases are data. See CONTENT.md. Numbers are Resident defaults.
(() => {
const G = (window.GAME ||= {}), C = G.CASES = {}; G.CASE_ORDER = [];
G.defCase = (id, d) => { C[id] = { id, drain: 0, doc: 'vale', ...d }; G.CASE_ORDER.push(id); return C[id]; };
const P = (obj, spawn, o = {}) => ({ obj, spawn, ...o });
G.defCase('c1', { n: 1, name: 'Glasshouse', patient: 'Agnes Pellow', site: 'forearm', clock: 180, vitals: 80, drain: .1, par: 3200, chapter: 1,
  phases: [
    P('Pull the glass', [{ t: 'shard', n: 4 }], { learn: 'forceps', bark: 'Forceps, Doctor. Grip, pull, release in the dish.' }),
    P('Clean the cuts', [{ t: 'laceration', n: 3 }], { learn: 'salve', bark: 'Salve. Paint it on.' }),
    P('Close the wound', [{ t: 'wound', n: 4, x: 213, y: 116 }], { learn: 'suture', bark: 'Across the wound, Doctor.' }),
    P('Give her a boost', [], { vitalsTo: 40, learn: 'syringe', iv: true, until: S => S.vitals >= 70, bark: 'Pulse forty. I mention it only in passing.' }),
  ] });
})();
(() => {
const G = window.GAME, P = (obj, spawn, o = {}) => ({ obj, spawn, ...o });
G.defCase('c2', { n: 2, name: 'Low Brass', patient: 'Desmond "Slide" Achebe', site: 'abdomen', clock: 210, vitals: 70, drain: .2, par: 4300, chapter: 1, lightbox: { opinion: 'Hernia. Obviously.', truth: [150, 130], film: 'abdomen' },
  phases: [
    P('Open the abdomen', [{ t: 'incision', x: 213, y: 116, len: 60 }], { learn: 'scalpel' }),
    P('Clear the field', [{ t: 'pool', n: 2 }, { t: 'bleeder', n: 1 }], { learn: 'suction' }),
    P('Burn the polyps', [{ t: 'polyp', n: 5 }], { learn: 'cautery' }),
    P('Take the mass', [{ t: 'mass', x: 213, y: 116, r: 22, reveals: 'shard', heal: false }], {}),
    P('Close', [{ t: 'wound', n: 6, x: 213, y: 116 }, { t: 'patch', n: 1 }], {}),
  ] });
G.defCase('c3', { n: 3, name: 'Crane Nine', patient: 'Big Tam Rennie', site: 'abdomen', seed: 23, clock: 150, vitals: 55, drain: .5, par: 4200, chapter: 1,
  tick(S, dt) { if (S.ph === 2 && !S.cbUsed) { const floor = S.diff === 'Attending' ? 12 : 0; S.vitals = Math.max(floor, S.vitals - 7 * dt); } },
  phases: [
    P('Stop the bleeding', [{ t: 'arteryTear', n: 3 }, { t: 'bleeder', n: 3 }, { t: 'pool', n: 2 }], { learn: 'triage' }),
    P('Pull the shrapnel', [{ t: 'shard', n: 3 }, { t: 'shard', n: 2, under: true, sub: true }], {}),
    P('He is crashing', [], { noIV: true, until: S => S.cbUsed || (S.diff === 'Attending' && S.phT > 7), minT: 1, vitalsTo: 40, bark: 'Pulse falling. Doctor, he is crashing.' }),
    P('Seal the ruptures', [], { init(S, Op) { S.steady = Math.max(S.steady, 100); const R = 52; for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + .3; Op.add(S, 'bleeder', { x: 213 + Math.cos(a) * R * 1.6, y: 116 + Math.sin(a) * R, ph: S.ph, rupture: true }); } }, learn: 'longbreath' }),
    P('Close', [{ t: 'wound', n: 5, x: 213, y: 116 }], {}),
  ] });
G.defCase('c4', { n: 4, name: 'The Whistling Man', patient: 'Captain Ned Harrow', site: 'flank', clock: 200, vitals: 75, drain: .25, par: 4400, chapter: 2, lightbox: { opinion: 'Superficial. Sew and send.', truth: [250, 120], film: 'flank' },
  phases: [
    P('Free the gaff', [{ t: 'hook', x: 190, y: 120, ang: 0, reliefs: 2, depth: 90 }], {}),
    P('Find the nests', [{ t: 'nest', n: 2, hid: true, cap: 3 }], { learn: 'sonar' }),
    P('Repair the bites', [{ t: 'laceration', n: 4, r: 10 }, { t: 'wound', n: 5, x: 213, y: 120 }], {}),
  ] });
G.defCase('c5', { n: 5, name: 'Slur', patient: 'Ilse Brandt', site: 'forearm', seed: 51, clock: 220, vitals: 70, drain: .2, par: 4600, chapter: 2,
  phases: [
    P('Find it with Sonar', [{ t: 'legato', ph: 1, which: 0 }, { t: 'nerve', pts: [[70, 70], [140, 98], [230, 92], [320, 70], [360, 62]] }], { until: S => { const l = S.objs.find(o => o.type === 'legato'); return !l || l.mk > S.rt || l.state !== 'under'; }, learn: 'sonar' }),
    P('Pull it free', [], { bark: 'Slow. Slow.' }),
    P('Repair', [{ t: 'patch', n: 1 }, { t: 'wound', n: 5, x: 213, y: 150, len: 70 }], {}),
  ] });
G.defCase('c6', { n: 6, name: 'Bedside Manner', patient: 'Chief Oyelaran', site: 'heart', seed: 61, clock: 240, vitals: 60, drain: .35, par: 5200, chapter: 2,
  phases: [
    P('Open the chest', [{ t: 'incision', x: 213, y: 116, len: 120, wave: 1 }, { t: 'pool', n: 2 }], {}),
    P('Quiet Tremolo', [{ t: 'tremolo', x: 213, y: 116 }], { bark: 'It sings in time with her heart.' }),
    P('Mend the vessel', [{ t: 'wound', n: 5, x: 213, y: 140, len: 80, beatOnly: true }, { t: 'patch', n: 1 }], {}),
  ] });
G.defCase('c7', { n: 7, name: 'Force Nine', patient: 'Yusuf Demir', site: 'abdomen', seed: 71, doc: 'sokolova', clock: 170, vitals: 60, drain: .35, par: 4300, chapter: 3, ship: true,
  tick(S, dt) { S.tilt = [Math.sin(S.t * .5) * 25, Math.cos(S.t * .35) * 8]; if (S.ph === 0 && S.phT > 25 && !S.lurched) { S.lurched = true; ev(S, 'lurch'); for (const p of S.pl) { p.g = null; } S.vitals -= 4; S.chain = 0; S.stats.slips++; } },
  phases: [
    P('Winch damage', [{ t: 'shard', n: 4 }, { t: 'arteryTear', n: 2 }], { learn: 'secondlook' }),
    P('Blackout', [{ t: 'bleeder', n: 3, hid: true }], { init(S) { S.blackout = 1; } }),
    P('Close on the roll', [{ t: 'wound', n: 8, x: 213, y: 116, jit: 6, shift: 6, len: 100 }], { init(S) { S.blackout = 0; } }),
  ] });
function ev(S, ...a) { S.ev.push(a); }
G.defCase('c8', { n: 8, name: 'From the Top', patient: 'Sister Perpetua', site: 'abdomen', seed: 81, doc: 'sokolova', clock: 210, vitals: 65, drain: .3, par: 5400, chapter: 3,
  phases: [
    P('Open and clear', [{ t: 'incision', x: 213, y: 116, len: 70 }, { t: 'pool', n: 2 }], {}),
    P('Da Capo, round one', [{ t: 'dacapo', round: 1 }], { bark: 'Plan the order. Rewind once if you must.' }),
    P('Da Capo, round two', [{ t: 'dacapo', round: 2 }], {}),
    P('Close', [{ t: 'wound', n: 5, x: 213, y: 116 }], {}),
  ] });
G.defCase('c9', { n: 9, name: "Dead Man's Rhythm", patient: 'Dr. Hollis Crane', site: 'implant', seed: 91, doc: 'sokolova', clock: 200, vitals: 70, drain: .25, par: 4800, chapter: 3, ship: true, fail: S => S.vitals < 12 && S.ph >= 1, lightbox: null,
  tick(S, dt) { S.tilt = [Math.sin(S.t * .5) * 12, 0]; },
  phases: [
    P('Expose the can', [{ t: 'incision', x: 213, y: 116, len: 80 }, { t: 'pool', n: 1 }], {}),
    P('Four screws', [{ t: 'screw', x: 140, y: 80 }, { t: 'screw', x: 286, y: 80 }, { t: 'screw', x: 140, y: 152 }, { t: 'screw', x: 286, y: 152 }], {}),
    P('Solder the bypass', [{ t: 'lead', x: 213, y: 116 }], { bark: 'Solder first. Then the wires. In the right order.' }),
    P('Cut the wires', [{ t: 'wire', n: 3, order: true }], {}),
    P('Lift it out', [{ t: 'device', x: 213, y: 116 }], {}),
    P('Close', [{ t: 'wound', n: 4, x: 213, y: 116 }], {}),
  ] });
G.defCase('c10', { n: 10, name: 'Eloquent Cortex', patient: 'Dr. Percival Whitlock', site: 'brain', seed: 101, doc: 'vale', consult: true, clock: 240, vitals: 60, drain: .3, par: 5600, chapter: 4, lightbox: { opinion: 'Migraine. Obviously.', truth: [270, 100], film: 'skull' },
  phases: [
    P('Open the scalp', [{ t: 'incision', x: 213, y: 116, len: 100, wave: 1.5 }, { t: 'pool', n: 1 }], {}),
    P('Fermata', [{ t: 'fermata', x: 213, y: 116 }, { t: 'nerve', pts: [[100, 80], [160, 110], [230, 90], [300, 120]] }, { t: 'nerve', pts: [[110, 160], [190, 150], [260, 170], [330, 150]] }], { learn: 'consult' }),
    P('Close', [{ t: 'wound', n: 6, x: 213, y: 116, len: 84 }, { t: 'patch', n: 1 }], {}),
  ] });
G.defCase('c11', { n: 11, name: 'Last Note', patient: 'Clementine Hale', site: 'mediastinum', seed: 111, doc: 'vale', consult: true, clock: 420, vitals: 70, drain: .3, par: 7200, chapter: 4, finale: true,
  phases: [
    P('Open the chest', [{ t: 'incision', x: 213, y: 116, len: 120, wave: 1 }, { t: 'bleeder', n: 2 }, { t: 'pool', n: 2 }], {}),
    P('Exposition', [{ t: 'cantor', mov: 1 }], {}),
    P('Development', [{ t: 'cantor', mov: 2 }], { init(S) { S.hush = true; } }),
    P('Recapitulation', [{ t: 'cantor', mov: 3 }], {}),
    P('Coda: the Last Note', [{ t: 'cantor', mov: 4 }], {}),
    P('Close', [{ t: 'wound', n: 6, x: 213, y: 116, len: 84 }], { init(S) { S.hush = false; S.quiet = true; } }),
  ] });
// Grand Rounds: one case that scales with the number of surgeons
G.grandRounds = (n = 1) => ({ id: 'gr', n: 0, name: 'Grand Rounds', patient: 'Ferry casualty', site: 'abdomen', seed: 7, clock: n === 1 ? 330 : 200 + 40 * n, vitals: 80, drain: .3, par: 3500 * n, multi: true, doc: 'vale', noRewind: true, noSokolova: true,
  tick(S, dt) { S.quillHold = S.np === 1 ? ((S.t % 4) < 2) : false; },
  phases: [
    P('Triage', [{ t: 'bleeder', n: 3 * n }, { t: 'arteryTear', n: Math.max(1, n - 1) }, { t: 'pool', n: 2 }], {}),
    P('Swarm', [{ t: 'nest', n: n, hid: false, cap: 4 }], {}),
    P('One holds, one cuts', [{ t: 'retractorHandle', x: 120, y: 120, target: 'next' }, { t: 'bleeder', x: 300, y: 120, rupture: false, grOpen: true }], { init(S, Op) { const h = S.objs.find(o => o.type === 'retractorHandle' && o.ph === S.ph), t = S.objs.find(o => o.type === 'bleeder' && o.grOpen && o.ph === S.ph); if (h && t) { h.target = t.id; t.open = false; } } }),
    P('Choir', [{ t: 'dacapo', round: 1 }], {}),
    P('Close', Array.from({ length: n }, (_, i) => ({ t: 'wound', n: 3, x: 130 + i * 70, y: 116, len: 50 })), {}),
  ] });
G.CASES.gr = G.grandRounds(1);
})();
