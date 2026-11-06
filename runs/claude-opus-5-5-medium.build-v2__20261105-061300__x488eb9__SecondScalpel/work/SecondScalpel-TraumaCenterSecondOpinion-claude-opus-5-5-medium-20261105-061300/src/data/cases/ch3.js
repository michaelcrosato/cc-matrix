// Chapter 3: Second Look. The player is Dr. Sokolova, on the hospital ship.
(() => {
const G = (window.GAME ||= {}), { defCase, defScript } = G;
defScript('shipRoll', (S) => { S.tilt = [Math.sin(S.t * .55), Math.cos(S.t * .37) * .55]; });
defScript('shipFirst', (S, ph, w) => { G.Scripts.shipRoll(S); if (!G.Op.openReq(S) && S.out.lurched) S.ph.d.done = true; });
defScript('lurch', (S) => { G.ev(S, 'lurch'); for (const p of S.players) { const first = !S.out.lurched; if (first || p.trigPrev >= .3) { G.releaseHold(S, p); G.slip(S, p, p.x, p.y, 8, 'lurch'); G.addLac(S, p.x, p.y); S.out.look = 1; } } S.out.lurched = true; });
defScript('blackoutOn', S => { S.dim = .88; G.ev(S, 'blackout'); });
defScript('blackoutOff', S => { S.dim = 0; G.ev(S, 'lights'); });
defCase({ id: 'c7', number: 7, title: 'Force Nine', chapter: 3, doc: 'soko', site: 'abdomen', siteOpt: { lamp: true }, seed: 83, clock: 170, vitals: 60, drain: .35,
  patient: 'Yusuf Demir, 22', complaint: 'Deckhand. A winch came off its mount in a Force Nine.', opinion: 'Dr. Sokolova: "In the navy we did this with a spoon."', story: { before: 'c7_before', after: 'c7_after' }, teach: 'Second Look, the ship\'s roll, blackout', lamp: true,
  phases: [
    { obj: 'Winch damage', bark: 'Everything slides, Doctor. Wait for the roll.', step: 'shipFirst', when: 'done', script: [{ t: 18, do: 'lurch' }], spawn: [{ t: 'shard', x: 135, y: 96, a: -1.9, depth: 14, kind: 'steel', loose: true }, { t: 'shard', x: 206, y: 150, a: 1.3, depth: 14, kind: 'steel', loose: true }, { t: 'shard', x: 262, y: 84, a: -.9, depth: 14, kind: 'steel', loose: true }, { t: 'shard', x: 318, y: 138, a: .4, depth: 14, kind: 'steel', loose: true }, { t: 'arteryTear', x: 170, y: 118, a: .9 }, { t: 'arteryTear', x: 270, y: 124, a: -.5 }] },
    { obj: 'Blackout: seal bleeders', bark: 'Generator. Naturally. Sonar is all the light you have.', enter: 'blackoutOn', leave: 'blackoutOff', step: 'shipRoll', spawn: [{ t: 'bleeder', x: 130, y: 112, hidden: true, stayMarked: true }, { t: 'bleeder', x: 226, y: 72, hidden: true, stayMarked: true }, { t: 'bleeder', x: 306, y: 146, hidden: true, stayMarked: true }] },
    { obj: 'Close on the roll', bark: 'The points drift, Doctor. So does the Atlantic.', step: 'shipRoll', spawn: [{ t: 'wound', x: 213, y: 118, a: .1, len: 110, n: 8, w: 11, shift: 6, bleeds: false }] },
  ] });
defCase({ id: 'c8', number: 8, title: 'From the Top', chapter: 3, doc: 'soko', site: 'abdomen', seed: 97, clock: 210, vitals: 65, drain: .3,
  patient: 'Sister Perpetua, 71', complaint: 'Runs the seamen\'s hospice. Radiant, serene, and in organ failure.', opinion: 'She has asked us to pray for the other patients.', story: { before: 'c8_before', after: 'c8_after' }, teach: 'Da Capo, planning with ghosts', music: 'boss',
  phases: [
    { obj: 'Open and clear', bark: 'A clean line, dear. She will inspect it.', spawn: [{ t: 'guide', pts: [[160, 62], [190, 92], [228, 108], [266, 134]] }, { t: 'pool', x: 130, y: 128, vol: 90, req: true }, { t: 'pool', x: 300, y: 104, vol: 90, req: true }] },
    { obj: 'Kill all three lobes', bark: 'A burn. B slash, pull. C dose, salve. All inside ten seconds.', when: 'flag:dacapo_r1', spawn: [{ t: 'dacapo', x: 213, y: 112 }], tip: { k: 'gift', text: 'Rewind: ghosts show when lobes open' } },
    { obj: 'From the top. Faster', bark: 'It has repeated itself, Doctor. So have I.', when: 'flag:dacapo_r2', enter: 'dacapoBeads', spawn: [{ t: 'dacapo', x: 213, y: 112, round: 2, window: 12 }] },
    { obj: 'Close', bark: 'Close. She will want the good thread.', spawn: [{ t: 'wound', x: 213, y: 104, a: -.1, len: 84, n: 6, w: 11, bleeds: false }, { t: 'wound', x: 213, y: 148, a: .1, len: 70, n: 4, w: 11, bleeds: false }] },
  ] });
defScript('boardEnter', S => { [[188, 106, 0], [213, 124, 1], [240, 106, 2]].forEach(([x, y, o]) => G.spawn(S, { t: 'boardmark', x, y, order: o, sym: ['dot', 'tri', 'sq'][o] })); });
defScript('boardStep', S => { if ((S.flags.board || 0) >= 3) S.ph.d.done = true; });
G.OBJ.wire.slashable = (o, S) => !S.objs.some(q => q.type === 'lead' && !q.dead);
const prevWant = G.OBJ.wire.want; G.OBJ.wire.want = (o, S) => S.objs.some(q => q.type === 'lead' && !q.dead) ? null : prevWant(o, S);
defCase({ id: 'c9', number: 9, title: "Dead Man's Rhythm", chapter: 3, doc: 'soko', site: 'implant', seed: 113, clock: 200, vitals: 70, drain: .25, bomb: true,
  patient: 'Dr. Hollis Crane, 44', complaint: 'Foundation researcher. His pacemaker detonates if his heart stops, or if the can is forced.', opinion: 'Dr. Sokolova: "We are doctors." Quill: "I\'ll fetch the other forceps."', story: { before: 'c9_before', after: 'c9_after' }, teach: 'A device instead of a disease',
  phases: [
    { obj: 'Expose the can', bark: 'Vitals under twenty-five and the ship goes. I mention it.', spawn: [{ t: 'guide', pts: [[150, 62], [210, 58], [276, 64]] }, { t: 'pool', x: 124, y: 118, vol: 80, req: true }, { t: 'pool', x: 306, y: 122, vol: 80, req: true }, { t: 'bleeder', x: 124, y: 118 }, { t: 'bleeder', x: 306, y: 122 }] },
    { obj: 'Four screws', bark: 'Forceps. Grip and circle. Three full turns each.', spawn: [{ t: 'screw', x: 160, y: 76 }, { t: 'screw', x: 268, y: 76 }, { t: 'screw', x: 160, y: 156 }, { t: 'screw', x: 268, y: 156 }, { t: 'patch', x: 112, y: 112, r: 12 }, { t: 'patch', x: 316, y: 112, r: 12 }], tip: { k: 'text', text: 'Circle your aim, three turns' } },
    { obj: 'Sonar the board', bark: 'He says ▲ ● ■. Trust him? Read the board yourself.', enter: 'boardEnter', step: 'boardStep', when: 'done' },
    { obj: 'Bypass, then cut', bark: 'Solder the bypass, then cut in the order the board gave.', spawn: [{ t: 'lead', x: 168, y: 90 }, { t: 'lead', x: 260, y: 90 }, { t: 'wire', x: 170, y: 122, order: 1, sym: 'tri' }, { t: 'wire', x: 214, y: 134, order: 0, sym: 'dot' }, { t: 'wire', x: 258, y: 122, order: 2, sym: 'sq' }] },
    { obj: 'Lift it, gently', bark: 'Now lift. Very gently. We are rolling.', step: 'shipRoll', spawn: [{ t: 'can', x: 213, y: 116 }], enter: 'canEnter' },
    { obj: 'Close', bark: 'I shall fetch the other forceps back.', spawn: [{ t: 'wound', x: 213, y: 96, a: 0, len: 76, n: 5, w: 11, bleeds: false }, { t: 'wound', x: 213, y: 142, a: 0, len: 76, n: 5, w: 11, bleeds: false }] },
  ] });
defScript('canEnter', S => { S.tilt = [0, 0]; });
})();
