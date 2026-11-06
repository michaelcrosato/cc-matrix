// Chapter 3, Cases 7 to 9: the ship. Second Look, the roll, a blackout, Da Capo, a device.
(() => {
const G = (window.GAME ||= {}), U = G.U;
G.defAction('lurch', S => { const first = !S.keep.lurched; const h = S.hands[0]; const mid = h.held || h.stroke || h.stitch; S.ev.push(['shake', 5]); S.ev.push(['lurch']); if (first || mid) { G.Score.slip(S, h, h.x, h.y, first ? 14 : 8, 'lurch'); for (const q of S.objs) if (q.type === 'pool') q.vol = Math.min(400, q.vol + 30); if (first) { S.keep.lurched = 1; S.steady = Math.max(S.steady, 60); S.prompt = 'look'; S.ev.push(['sayp', 'noagain']); } } });
G.defAction('lurchWarn', S => { if (S.keep.lurched) S.ev.push(['lurchWarn']); });
G.defCase({ id: 'forcenine', n: 7, chapter: 3, title: 'Force Nine', doctor: 'sokolova', site: 'abdomen', clock: 170, vitals: 60, drain: .35, seed: 71, lamp: true, look: true, teaches: 'Second Look, the ship\'s roll, a blackout', chartStage: 'shipward',
  patient: { name: 'Yusuf Demir', age: 28, face: 'yusuf', where: 'Abdomen', complaint: 'Deckhand on the Samaritan\'s Wake. The winch took him at the change of watch. The sea is not helping.', human: 'He is engaged. He would like that known.' },
  closeAt: [213, 118],
  phases: [
    { id: 'winch', obj: 'Winch damage', enter: [['tilt', 1], ['steady', 30]], clear: { t: 29 },
      spawn: [{ type: 'arteryTear', x: 136, y: 104, ang: .3, n: 3, len: 20, pdx: 14, pdy: 16 }, { type: 'arteryTear', x: 288, y: 94, ang: -.2, n: 3, len: 20, pdx: -14, pdy: 16 },
        { type: 'shard', variant: 'frag', loose: true, x: 182, y: 78, ang: -1.8, depth: 16 }, { type: 'shard', variant: 'frag', loose: true, x: 244, y: 142, ang: 1.1, depth: 16 }, { type: 'shard', variant: 'frag', loose: true, x: 120, y: 140, ang: 2.5, depth: 16 }, { type: 'shard', variant: 'frag', loose: true, x: 314, y: 136, ang: .5, depth: 16 }],
      script: [{ t: 14, do: [['spawn', { type: 'bleeder', x: 214, y: 112, pdx: 12, pdy: 10, feed: 7 }]] }, { t: 23.6, do: [['lurchWarn']] }, { t: 25, do: [['lurch']] }] },
    { id: 'blackout', obj: 'Find them in the dark', enter: [['dim', .86]], clear: {},
      spawn: [{ type: 'bleeder', hidden: true, x: 130, y: 86, feed: 3, pdx: 12, pdy: 10 }, { type: 'bleeder', hidden: true, x: 296, y: 100, feed: 3, pdx: 10, pdy: 12 }, { type: 'bleeder', hidden: true, x: 212, y: 158, feed: 3, pdx: 12, pdy: -8 }] },
    { id: 'close', obj: 'Close on the roll', enter: [['dim', 0]], spawn: [{ type: 'wound', x: 213, y: 112, ang: .03, n: 8, len: 76, gap: 8, sway: 6 }] },
  ],
  barks: {
    enter: [['sokolova', 'Hold the rail with your teeth, dear.'], ['quill', 'That will be the generator, Doctor.'], ['sokolova', 'Stitch with the ship, not against her.']],
    done: [['sokolova', 'Good. Now the lights will go. They do.'], ['sokolova', 'In the navy we did this with a spoon.'], ['quill', 'Dressing, Doctor. When she allows it.']],
    hint: [['quill', 'Needle for the arteries, Doctor.'], ['quill', 'Sonar. Your lamp is out and that is not.'], ['quill', 'Follow the dots. They will move.']],
    extra: { noagain: [['sokolova', 'No. Again.']] },
  },
});
G.defCase({ id: 'fromthetop', n: 8, chapter: 3, title: 'From the Top', doctor: 'sokolova', site: 'abdomen', clock: 210, vitals: 65, drain: .3, seed: 83, look: true, boss: true, teaches: 'Da Capo, planning with ghosts', chartStage: 'chapel',
  patient: { name: 'Sister Perpetua', age: 58, face: 'perpetua', where: 'Abdomen', complaint: 'Runs the seamen\'s hospice. She brings us patients who have never been happier. Now she has never been happier.', human: 'She has already forgiven you, whatever it is.' },
  closeAt: [213, 118],
  phases: [
    { id: 'open', obj: 'Open, then clear', spawn: [{ type: 'guide', pts: U.curve([[140, 112], [186, 106], [240, 108], [288, 114]]) }, { type: 'pool', x: 170, y: 136, vol: 80 }, { type: 'pool', x: 262, y: 86, vol: 80 }] },
    { id: 'round1', obj: 'Kill all three in time', music: 'boss', enter: [['steady', 45]], spawn: [{ type: 'dacapo', x: 213, y: 104, speed: 1, limit: 10 }] },
    { id: 'round2', obj: 'From the top. Faster.', enter: [['say', 'round2'], ['steady', 45]], spawn: [{ type: 'dacapo', x: 213, y: 112, speed: 2, limit: 9 }] },
    { id: 'close', obj: 'Close her up', spawn: [{ type: 'wound', x: 213, y: 108, ang: 0, n: 6, len: 60, gap: 8 }, { type: 'patch', x: 300, y: 130, r: 16 }, { type: 'clot', x: 136, y: 124, ang: -2.4, depth: 16 }] },
  ],
  barks: {
    enter: [['sokolova', 'Forgive me, Sister. No? Then hold still.'], ['sokolova', 'Watch them open. Then take it back. Plan.'], ['quill', 'It has restarted, Doctor. Twice the tempo.'], ['sokolova', 'Good. Sew. She has rosaries to count.']],
    done: [['quill', 'And the bowel is where she left it.'], ['sokolova', 'It remembers. So do I.'], ['sokolova', 'Ha! There. It has forgotten its own tune.'], ['quill', 'Dressing, Doctor.']],
    hint: [['quill', 'Scalpel, then suction.'], ['quill', 'Each armor has its own clock, Doctor.'], ['quill', 'A burn, a cut and pull, a dose and coat.'], ['quill', 'Needle. Dissolve the clot, then pull it.']],
    extra: { countdown: [['sokolova', 'Ten seconds, dear. Or it starts again.']], fromtop: [['quill', 'From the top, I am afraid.']], round2: [['sokolova', 'I told you it sings.']] },
  },
});
G.defAction('boardRead', S => { S.flags.boardRead = true; });
G.defAction('wireDefaults', S => { if (!S.flags.boardRead) { S.flags.boardRead = true; S.flags.wireOrder = ['dot', 'box', 'tri']; } });
G.defObject('board', { r: 8, optional: false, accept: () => null, init(o) { o.hidden = true; o.req = true; }, reach: 0, step(o, S) { if (o.marked > 0 && !o.read) { o.read = true; S.flags.boardRead = true; S.flags.wireOrder = ['dot', 'box', 'tri']; S.ev.push(['found', o.x, o.y, 0]); S.ev.push(['sayp', 'board']); o.req = false; o.done = true; } }, job: (o, S) => ({ tool: 'sonar', o }) });
G.defCase({ id: 'deadman', n: 9, chapter: 3, title: 'Dead Man\'s Rhythm', doctor: 'sokolova', site: 'implant', clock: 200, vitals: 70, drain: .25, seed: 97, look: true, teaches: 'A device instead of a disease', chartStage: 'shipward',
  patient: { name: 'Dr. Hollis Crane', age: 47, face: 'crane', where: 'Chest wall', complaint: 'Foundation researcher. Came aboard to confess. His pacemaker has been rigged: if his heart stops or the can is forced, it takes the ship with it.', human: 'He keeps apologizing to the can.' },
  closeAt: [205, 110],
  phases: [
    { id: 'expose', carry: true, obj: 'Expose the can', enter: [['bomb', 25]], spawn: [{ type: 'guide', pts: U.curve([[132, 72], [176, 66], [240, 66], [286, 74]]) }, { type: 'pool', x: 160, y: 140, vol: 70 }, { type: 'pool', x: 268, y: 138, vol: 70 }, { type: 'can', tag: 'can', x: 205, y: 110, req: false, ang: -1.5, depth: 44, max: 34 }] },
    { id: 'screws', obj: 'Four screws: circle them', tut: null, spawn: [[172, 88], [238, 88], [172, 132], [238, 132]].map(p => ({ type: 'screw', x: p[0], y: p[1] })) },
    { id: 'board', obj: 'Read the board for yourself', enter: [['set', 'wireOrder', ['tri', 'dot', 'box']], ['say', 'crane']], spawn: [{ type: 'board', x: 205, y: 110 }] },
    { id: 'wires', obj: 'Solder, then cut in order', enter: [['wireDefaults']], spawn: [{ type: 'lead', x: 148, y: 110, then: [['flag', 'bypassed']] }, { type: 'wire', sym: 'tri', x: 280, y: 80, bend: 6 }, { type: 'wire', sym: 'dot', x: 290, y: 112, bend: -4 }, { type: 'wire', sym: 'box', x: 280, y: 144, bend: 4 }] },
    { id: 'lift', obj: 'Lift it. Gently.', enter: [['setO', 'can', 'liftable', true], ['setO', 'can', 'req', true], ['tilt', .7]] },
    { id: 'close', obj: 'Close him up', enter: [['bomb', 0], ['tilt', 0]], spawn: [{ type: 'wound', x: 205, y: 108, ang: 0, n: 5, len: 50, gap: 8 }] },
  ],
  barks: {
    enter: [['sokolova', 'We are doctors.'], ['quill', 'I\'ll fetch the other forceps.'], ['crane', 'Triangle. Circle. Square. I think.'], ['sokolova', 'Bypass first. Then the wires, in order.'], ['sokolova', 'Slowly, dear. It is listening to him.'], ['quill', 'Well. We appear to have a ship.']],
    done: [['quill', 'There it is. Blinking at us.'], ['quill', 'Three turns each. Do not strip them.'], ['sokolova', 'He has told us what he remembers.'], ['sokolova', 'That is all the wires. I am still here.'], ['quill', 'I will put it over the side. Quickly.'], ['quill', 'Dressing, Doctor.']],
    hint: [['quill', 'The marker, then the blood.'], ['quill', 'Forceps on the screw, then circle it.'], ['quill', 'Sonar over the can.'], ['quill', 'Cautery on the lead. Then the blade.'], ['quill', 'Forceps, along the arrow. No haste.'], ['quill', 'Needle.']],
    extra: { crane: [['crane', 'Triangle, circle, square. I am almost sure.']], board: [['sokolova', 'Ha! Circle, square, triangle. As I thought.']], wrongWire: [['quill', 'That was not that one, Doctor.']] },
  },
});
})();
