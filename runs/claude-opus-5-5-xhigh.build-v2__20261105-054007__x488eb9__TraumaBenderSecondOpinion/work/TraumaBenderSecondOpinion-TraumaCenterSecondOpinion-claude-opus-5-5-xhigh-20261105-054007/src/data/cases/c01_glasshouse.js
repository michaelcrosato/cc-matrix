// Case 1: first solo. Teaches the cursor, the wheel, the trigger, four tools and grades. Tutorial freezes on.
(() => {
const G = (window.GAME ||= {});
G.defCase({ id: 'glasshouse', n: 1, chapter: 1, title: 'Glasshouse', doctor: 'vale', site: 'forearm', clock: 180, vitals: 80, drain: .1, par: 2400,
  patient: { name: 'Agnes Pellow', age: 74, face: 'agnes', where: 'Left forearm', complaint: 'Fell through her greenhouse roof while repotting. Six feet, one begonia, a great deal of glass.', human: 'She wants the glass kept for the grandchildren.' },
  closeAt: [213, 118], tools: ['forceps', 'salve', 'suture', 'syringe'],
  phases: [
    { id: 'glass', obj: 'Pull the glass', tut: { tool: 'forceps', text: 'Forceps: press on the glass, pull along the arrow, let go.' },
      spawn: [
        { type: 'shard', variant: 'glass', x: 138, y: 92, ang: -2.2, depth: 18 }, { type: 'shard', variant: 'glass', x: 202, y: 76, ang: -1.3, depth: 16 },
        { type: 'shard', variant: 'glass', x: 268, y: 118, ang: -.5, depth: 20 }, { type: 'shard', variant: 'glass', x: 176, y: 142, ang: 2.3, depth: 16 } ] },
    { id: 'clean', obj: 'Clean the cuts', tut: { tool: 'salve', text: 'Salve: hold and paint the green patch until it heals.' },
      spawn: [ { type: 'laceration', x: 140, y: 100, r: 10, dry: true, ang: .6 }, { type: 'laceration', x: 262, y: 110, r: 11, dry: true, ang: -.4 }, { type: 'laceration', x: 186, y: 150, r: 10, dry: true, ang: 1.1 } ] },
    { id: 'close', obj: 'Close the wound', tut: { tool: 'suture', text: 'Suture: press on a blue dot, cross the wound, release on its partner.' },
      spawn: [ { type: 'wound', x: 213, y: 116, ang: .15, n: 4, len: 42, gap: 9 } ] },
    { id: 'boost', obj: 'Syringe to the IV', tut: { tool: 'syringe', text: 'Syringe: hold to draw, then release anywhere for the IV. Her pulse is dipping.' },
      enter: [['dip', 40], ['say', 'dip']], clear: { vitals: 55, only: true } },
  ],
  barks: {
    enter: [ ['quill', 'Glass first, Doctor. She wants it kept.'], ['quill', 'Now the cuts. Paint, do not scrub.'], ['quill', 'Needle. In one side, out the other.'], ['quill', 'Pulse dropping. A little in the IV, Doctor.'] ],
    done: [ ['quill', 'That is all of it. I have a jar.'], ['vale', 'Okay. Okay okay. That was... okay.'], ['quill', '...Hm.'], ['quill', 'Dressing, Doctor.'] ],
    hint: [ ['quill', 'White brackets, Doctor. Top of the wheel.'], ['quill', 'Green patches. Bottom right of the wheel.'], ['quill', 'Blue dots. The right of the wheel.'], ['quill', 'Bottom of the wheel. Then anywhere at all.'] ],
    extra: { dip: [['vale', 'Her numbers! Sorry, Mrs. Pellow! Sorry!']] },
  },
});
})();
