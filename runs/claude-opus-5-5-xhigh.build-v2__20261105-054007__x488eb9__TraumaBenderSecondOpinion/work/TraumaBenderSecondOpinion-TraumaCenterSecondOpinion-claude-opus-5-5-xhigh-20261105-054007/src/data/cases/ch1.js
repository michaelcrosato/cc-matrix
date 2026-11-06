// Chapter 1, Cases 2 and 3. Field units: the cavity is an ellipse at (213, 116), radii (171, 91).
(() => {
const G = (window.GAME ||= {}), U = G.U;
G.defCase({ id: 'lowbrass', n: 2, chapter: 1, title: 'Low Brass', doctor: 'vale', site: 'abdomen', clock: 210, vitals: 70, drain: .2, seed: 21, teaches: 'Lightbox, Scalpel, Suction, Cautery',
  patient: { name: 'Desmond "Slide" Achebe', age: 61, face: 'slide', where: 'Abdomen', complaint: 'Trombonist at the Harbor Jazz Hall. A lump under the ribs, and a low note he can no longer reach.', human: 'He asked if we could work around his Thursday set.' },
  lightbox: { film: 'belly', opinion: 'Hernia. Obviously.', by: 'Dr. Whitlock', mark: [.66, .42], fieldAt: [206, 112], lines: ['Okay so don\'t freak out, but your X-ray is humming. Point at what\'s wrong.'], right: 'THERE. That is no hernia. Hernias do not have a silhouette like that.', wrong: ['Close enough for a hernia, I would say. Which it is.', 'You could simply trust the chart. People do.'], reveal: 'It is right there. The round thing. Do not tell him I told you.' },
  closeAt: [206, 112],
  phases: [
    { id: 'open', obj: 'Open along the line', tut: { tool: 'scalpel', text: 'Scalpel: press on the white dot and trace the purple line. Stay on it.' },
      spawn: [{ type: 'guide', pts: U.curve([[150, 92], [190, 96], [232, 94], [272, 98]]) }] },
    { id: 'clear', obj: 'Clear the field', tut: { tool: 'suction', text: 'Suction: hold near the blood. Things under a pool cannot be touched until it is gone.' },
      spawn: [{ type: 'pool', x: 150, y: 120, vol: 90 }, { type: 'pool', x: 270, y: 130, vol: 110 }, { type: 'bleeder', x: 214, y: 150, pdx: 12, pdy: -6 }] },
    { id: 'polyps', obj: 'Burn the polyps', tut: { tool: 'cautery', text: 'Cautery: hold the beam on the orange ring. Not on the patient. Let it cool.' },
      spawn: [[128, 96], [168, 72], [226, 78], [292, 92], [312, 138]].map(p => ({ type: 'polyp', x: p[0], y: p[1] })) },
    { id: 'mass', obj: 'Take the mass', spawn: [
        { type: 'mass', tag: 'mass', x: 206, y: 112, rx: 20, ry: 15, ang: -1.2, depth: 20, leaves: [{ type: 'shard', variant: 'cork', ang: -.5, depth: 14, len: 9 }] },
        { type: 'guide', pts: U.ring(206, 112, 24, 18, 18), then: [['setO', 'mass', 'ringed', true]] }] },
    { id: 'close', obj: 'Close him up', spawn: [{ type: 'wound', x: 210, y: 104, ang: .05, n: 6, len: 62, gap: 8 }, { type: 'patch', x: 150, y: 140, r: 16 }] },
  ],
  barks: {
    enter: [['quill', 'Knife. Stay on the marker, Doctor.'], ['vale', 'Blood! Okay. Blood is fine. Blood is normal.'], ['quill', 'A little smoke never hurt a surgeon.'], ['vale', 'That is not a hernia. Sorry, Percy.'], ['quill', 'Needle. He has a Thursday set.']],
    done: [['quill', 'Adequate. Next.'], ['quill', 'I can see again. Thank you.'], ['vale', 'That smell. Is that me? Is that him?'], ['quill', 'A cork. 1987, by the look. I\'ll label it.'], ['quill', 'Dressing, Doctor.']],
    hint: [['quill', 'The scalpel. Top right of the wheel.'], ['quill', 'Suction. Left of the wheel.'], ['quill', 'Cautery. Bottom left of the wheel.'], ['quill', 'Round it with the blade, then forceps.'], ['quill', 'Needle, Doctor. Then the green salve.']],
    extra: {},
  },
});
G.defCase({ id: 'crane9', n: 3, chapter: 1, title: 'Crane Nine', doctor: 'vale', site: 'abdomen', clock: 150, vitals: 62, drain: .35, seed: 37, teaches: 'Triage, Code Blue, Long Breath', chartStage: 'harbor', music: 'emergency',
  patient: { name: 'Tam Rennie', age: 44, face: 'tam', where: 'Abdomen', complaint: 'Foreman, Berth Nine. The crane came down with him under it. Three arteries, a great deal of shrapnel, and the Chief is across town.', human: 'He keeps asking whether anyone has fed his dog.' },
  closeAt: [213, 118],
  phases: [
    { id: 'bleed', obj: 'Stop the bleeding', spawn: [
        { type: 'arteryTear', x: 130, y: 100, ang: .4, n: 3, len: 20, pdx: 16, pdy: 16 }, { type: 'arteryTear', x: 292, y: 90, ang: -.3, n: 3, len: 20, pdx: -16, pdy: 18 }, { type: 'arteryTear', x: 216, y: 150, ang: 0, n: 3, len: 20, pdx: 20, pdy: -8 },
        { type: 'bleeder', x: 176, y: 70, pdx: 14, pdy: 12 }, { type: 'bleeder', x: 260, y: 140, pdx: 12, pdy: 10 }, { type: 'pool', x: 120, y: 132, vol: 70, req: false }, { type: 'pool', x: 304, y: 128, vol: 70, req: false }] },
    { id: 'shrapnel', obj: 'Get the shrapnel', spawn: [
        { type: 'shard', variant: 'frag', x: 112, y: 92, ang: -2.4, depth: 18 }, { type: 'shard', variant: 'frag', x: 180, y: 118, ang: -1.8, depth: 20 }, { type: 'shard', variant: 'frag', x: 256, y: 72, ang: -.8, depth: 18 },
        { type: 'shard', variant: 'frag', x: 306, y: 140, ang: .4, depth: 16 }, { type: 'shard', variant: 'frag', x: 216, y: 164, ang: 1.8, depth: 16 }, { type: 'pool', x: 306, y: 138, vol: 90, req: false }, { type: 'pool', x: 216, y: 160, vol: 80, req: false }] },
    { id: 'crash', obj: 'He is crashing', clear: { flag: 'revived' }, music: 'emergency',
      enter: [['forceCode', [['flag', 'revived'], ['steady', 100], ['prompt', 'breath'], ['set', 'cutaway', true],
        ...[0, 1, 2, 3, 4, 5].map(i => ['spawn', { type: 'bleeder', x: 213 + Math.cos(i / 6 * 6.283) * 92, y: 112 + Math.sin(i / 6 * 6.283) * 52, timer: 12, need: .22, feed: 2, pdx: 0, pdy: 14 }])]], ['crash', 14], ['say', 'crash']] },
    { id: 'close', obj: 'Close him up', enter: [['set', 'cutaway', false]], spawn: [{ type: 'wound', x: 214, y: 112, ang: -.05, n: 5, len: 54, gap: 8 }] },
  ],
  barks: {
    enter: [['quill', 'Arteries first, Doctor. Then the rest.'], ['vale', 'There is so much metal in him. Sorry!'], ['quill', 'Doctor. He has stopped arguing.'], ['quill', 'There, Doctor. All done. Just the door.']],
    done: [['vale', 'Is it stopping? Okay okay. It\'s stopping.'], ['quill', 'That will set off the airport.'], ['vale', 'Mr. Rennie? Tam? Tam, your dog is fine.'], ['quill', 'Dressing, Doctor.']],
    hint: [['quill', 'Blue dots, Doctor. Right of the wheel.'], ['quill', 'Under the blood, Doctor. Suction first.'], ['quill', 'Hold on, Doctor. The paddles come next.'], ['quill', 'Needle, please.']],
    extra: { crash: [['quill', 'Pulse is falling and it will not stop.']] },
  },
});
})();
