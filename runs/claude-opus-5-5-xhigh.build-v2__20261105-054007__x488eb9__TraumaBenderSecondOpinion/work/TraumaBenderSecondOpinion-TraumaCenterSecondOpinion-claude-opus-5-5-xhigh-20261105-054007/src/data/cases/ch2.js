// Chapter 2, Cases 4 to 6: the first strains.
(() => {
const G = (window.GAME ||= {}), U = G.U;
G.defCase({ id: 'whistling', n: 4, chapter: 2, title: 'The Whistling Man', doctor: 'vale', site: 'flank', clock: 200, vitals: 75, drain: .25, seed: 41, boss: false, teaches: 'Sonar, barbed extraction, a strain', look: false,
  patient: { name: 'Captain Ned Harrow', age: 66, face: 'harrow', where: 'Left flank', complaint: 'Walked into the ER whistling, with a gaff through his side. Says it does not hurt. Wants to catch the tide.', human: 'He has named the gaff.' },
  lightbox: { film: 'flank', opinion: 'Superficial. Remove gaff, discharge.', by: 'Dr. Whitlock', mark: [.34, .58], fieldAt: [122, 92], lines: ['The chart says superficial. So why is there a dot on my film that wasn\'t there at lunch? Point at it.'], right: 'That! It moved! I am not imagining it. I have had four coffees and I am not imagining it.', wrong: ['That would be a rib, Doctor. They are supposed to be there.', 'The gaff is the long one. Superficial. As I wrote.'], reveal: 'There. And it is not where it was a minute ago. Doctor, I am scared and I am so excited.', anomaly: '#5ff0e0' },
  closeAt: [214, 118],
  phases: [
    { id: 'gaff', obj: 'Free the gaff', spawn: [
        { type: 'hook', tag: 'gaff', x: 188, y: 112, ang: -.55, depth: 42, max: 90, par: 2, barbs: 2 },
        { type: 'guide', short: true, label: 'barb', pts: [[176, 102], [196, 94]], then: [['add', 'gaff', 'barbs', -1]] }, { type: 'guide', short: true, label: 'barb', pts: [[188, 134], [208, 124]], then: [['add', 'gaff', 'barbs', -1]] }] },
    { id: 'moved', obj: 'Something moved', tut: { tool: 'sonar', text: 'Sonar: hold to sweep the lens. Listen: the ping quickens as you near it. Find both.' }, clear: { found: 2, only: true },
      spawn: [{ type: 'nest', x: 122, y: 92, ang: -2.2 }, { type: 'nest', x: 296, y: 138, ang: .6 }] },
    { id: 'staccato', obj: 'Slash and pull the nests', music: 'boss', spawn: [{ type: 'staccato', x: 213, y: 116, beads: 3 }] },
    { id: 'repair', obj: 'Repair him', spawn: [[146, 86], [190, 72], [268, 84], [308, 106], [150, 146], [254, 158]].map(p => ({ type: 'laceration', x: p[0], y: p[1], r: 9, dry: true, ang: p[0] * .1 })).concat([{ type: 'wound', x: 214, y: 112, ang: -.5, n: 5, len: 52, gap: 8 }]) },
  ],
  barks: {
    enter: [['quill', 'He wants it back, Doctor. Barbs first.'], ['vale', 'Did you hear that? Who is singing?'], ['vale', 'It hops. Why does it hop?'], ['quill', 'Now then. As if none of that happened.']],
    done: [['quill', 'One gaff. He has named it Doris.'], ['quill', '...'], ['vale', 'It stopped. The singing stopped. Quill?'], ['quill', 'Dressing, Doctor.']],
    hint: [['quill', 'Cut at the barbs, Doctor, then pull.'], ['quill', 'Sonar. Top left of the wheel.'], ['quill', 'Slash the shell, then forceps.'], ['quill', 'Salve, then needle.']],
    extra: {},
  },
});
const WRIST = U.curve([[70, 118], [120, 88], [180, 100], [240, 82], [310, 96], [356, 118], [300, 146], [230, 134], [160, 150], [100, 142], [70, 118]], 6);
G.defCase({ id: 'slur', n: 5, chapter: 2, title: 'Slur', doctor: 'vale', site: 'forearm', clock: 220, vitals: 70, drain: .2, seed: 53, teaches: 'Legato, fine mode, no-touch anatomy, the clamp',
  patient: { name: 'Ilse Brandt', age: 19, face: 'ilse', where: 'Left wrist', complaint: 'Conservatory violinist. Numb left hand, no pain at all, and says she has never been happier.', human: 'She did not want to come. Her mother drove.' },
  closeAt: [213, 118],
  phases: [
    { id: 'find', carry: true, obj: 'Find it with Sonar', clear: { flag: 'legatoFound', only: true },
      spawn: [{ type: 'nerve', pts: U.curve([[60, 110], [130, 122], [214, 112], [300, 126], [372, 112]], 6), w: 2 }, { type: 'legato', tag: 'worm', route: WRIST, segs: 16, speed: 30, limit: 62 }] },
    { id: 'intercept', obj: 'Cut as it nears', clear: { flag: 'legatoUp', only: true } },
    { id: 'pull', obj: 'Pull slowly, clamp, burn', prompt: null },
    { id: 'split', obj: 'It split. Again.', spawn: [{ type: 'legato', tag: 'worm2', route: WRIST.slice().reverse(), segs: 8, speed: 48, limit: 74, hidden: false, s0: 40, surfaceT: 5 }] },
    { id: 'repair', obj: 'Repair the track', spawn: [{ type: 'patch', x: 148, y: 96, r: 15 }, { type: 'patch', x: 262, y: 96, r: 15 }, { type: 'wound', x: 214, y: 148, ang: .02, n: 5, len: 44, gap: 6 }] },
  ],
  barks: {
    enter: [['quill', 'The gold line is her fingers. Do not.'], ['vale', 'There. Under the skin. Cut when it\'s close.'], ['quill', 'Slowly, Doctor. It will notice.'], ['vale', 'No no no. There\'s more of it.'], ['quill', 'She will want those hands. Fine stitches.']],
    done: [['vale', 'It knows the tune. It\'s playing her scales.'], ['quill', 'Hold it there. Gently.'], ['vale', 'Half! That was half. Where is the rest?'], ['quill', 'And that is all of it. I hope.'], ['quill', 'Dressing, Doctor.']],
    hint: [['quill', 'Sonar. Sweep along the ridge.'], ['quill', 'The short purple marks. As it nears.'], ['quill', 'Forceps on the head. Watch the tension.'], ['quill', 'The ridge, Doctor. It moves faster.'], ['quill', 'Salve the track. Then the needle.']],
    extra: { surfaced: [['quill', 'There she blows. Forceps. Slowly.']], barb: [['quill', 'Barb. Let go in the ring, I will clamp.']] },
  },
});
const CORONARY = U.curve([[150, 46], [176, 76], [196, 108], [208, 144], [224, 178]], 6);
G.defCase({ id: 'bedside', n: 6, chapter: 2, title: 'Bedside Manner', doctor: 'vale', site: 'heart', clock: 240, vitals: 60, drain: .35, seed: 61, beat: 1, boss: true, teaches: 'The beating heart, timing, tremor, a boss', chartStage: 'gala',
  patient: { name: 'Chief Oyelaran', age: 61, face: 'oyelaran', where: 'Heart', complaint: 'Collapsed at the Foundation gala, mid-toast, with the whole city watching. She has been hiding this for a year.', human: 'She taught you to hold a scalpel. Do not think about that.' },
  closeAt: [213, 118],
  phases: [
    { id: 'open', obj: 'Open the chest', spawn: [{ type: 'guide', pts: U.curve([[213, 34], [216, 70], [212, 110], [216, 150], [213, 192]]) }, { type: 'pool', x: 180, y: 120, vol: 80 }, { type: 'pool', x: 250, y: 104, vol: 80 }] },
    { id: 'tremolo', obj: 'Sedate on the flare', music: 'boss', spawn: [{ type: 'tremolo', x: 208, y: 116, vessel: CORONARY, pullAng: -1.3 }] },
    { id: 'graft', obj: 'Graft between beats', spawn: [{ type: 'wound', x: 204, y: 118, ang: 1.2, n: 6, len: 64, gap: 8, beatOnly: true }, { type: 'patch', x: 284, y: 132, r: 16 }] },
  ],
  barks: {
    enter: [['quill', 'Long and straight, Doctor. She taught you.'], ['vale', 'My hands. Why are my hands shaking?'], ['quill', 'Between beats, Doctor. Wait for the heart.']],
    done: [['vale', 'Chief. Chief, I am so sorry. I\'m going in.'], ['quill', 'That is the last of it.'], ['quill', 'Dressing. And breathe, Doctor. One of you.']],
    hint: [['quill', 'The scalpel, top of the chest.'], ['quill', 'Draw, wait for the flare, then let go.'], ['quill', 'Press and release when the beat is out.']],
    extra: { crack: [['quill', 'It cracked. Burn the middle, Doctor.']], crawl: [['quill', 'It is running. Forceps will pin it.']], lastpull: [['quill', 'Last of it. Slowly. Forty, no more.']] },
  },
});
})();
