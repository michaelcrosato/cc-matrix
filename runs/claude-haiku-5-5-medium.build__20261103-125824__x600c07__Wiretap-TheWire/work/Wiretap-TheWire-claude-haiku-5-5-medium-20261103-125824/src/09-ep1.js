// Episode 1: EYES ON (PLAN §8.3, slice): the cold open, the faces, the roles, Pockets, the payphone, then the Board.
const EP1_EPIGRAPH = '"Everybody on that corner is working. Question is, who\'s signing the checks."';
const SPEAK = (key, lines, o = {}) => {
  TALK.voice = VOICE_OF[key] || 'text';
  TALK.say(lines, Object.assign({ name: o.name || '', portrait: o.portrait, onDone: o.onDone }, o.extra || {}));
};
const RIGS = {};
const rigOf = key => RIGS[key] || (RIGS[key] = makeRig(CAST[key]));

const FACE_IDS = ['tee', 'rook', 'corey', 'pigeon'];
const MISSION = {
  get beat() { return STATE.beat; },          // the beat lives in the save state
  set beat(v) { STATE.beat = v; },
  interacts() {
    const list = [
      { id: 'lou', at: cellWorld(SPOTS_EP1.lou), verb: 'Talk', hint: 'Lou', when: () => this.beat === 'cold',
        act: () => coldOpenLou() },
      { id: 'odessa', at: cellWorld(POI.odessa.c), verb: 'Talk', hint: 'Miss Odessa', when: () => this.beat !== 'board',
        act: () => odessaTalk() },
      { id: 'felton', at: cellWorld(POI.felton.c), verb: 'Read the cards', hint: 'Mr. Felton', when: () => this.beat !== 'board',
        act: () => memorial() },
      { id: 'payphone', at: cellWorld(POI.P1.c), verb: 'Read number', hint: 'Payphone', when: () => this.beat === 'eyes',
        act: () => payphone() },
      { id: 'pockets', at: cellWorld(POI.pockets.c), verb: 'Talk', hint: 'Pockets', when: () => this.beat === 'eyes' && !STATE.pockets,
        act: () => pocketsTalk() },
      { id: 'car', at: cellWorld(POI.chevy.c), verb: 'Drive to the Board', hint: 'your Chevy', when: () => this.beat === 'eyes' && this.readyForBoard(),
        act: () => toBoard() },
    ];
    return list;
  },
  readyForBoard() { return FACE_IDS.every(id => STATE.faces[id]) && Object.keys(STATE.roles).length >= 2 && STATE.pockets; },
  objective() {
    if (this.beat === 'cold') return { step: 'EP1 · COLD OPEN', title: "Felton's stoop", text: 'Talk to Lou by the tape.', at: cellWorld(POI.felton.c) };
    if (this.beat === 'board') return null;
    const faces = FACE_IDS.filter(id => STATE.faces[id]).length;
    const roles = Object.keys(STATE.roles).length;
    if (faces < 4) return { step: 'EP1 · EYES ON', title: 'Faces', text: 'Hold ' + glyph(game, 'watch') + ' and take ' + glyph(game, 'photo') + ' on Tee, Rook, Corey and Pigeon. ' + faces + '/4', at: cellWorld(POI.post.c) };
    if (roles < 2) return { step: 'EP1 · EYES ON', title: 'Roles', text: 'Hold the reticle on a crew member for 3 s to read their job. ' + roles + '/2', at: cellWorld(POI.post.c) };
    if (!STATE.pockets) return { step: 'EP1 · EYES ON', title: 'Pockets', text: 'Find Pockets in the alley behind Gaither Market.', at: cellWorld(POI.pockets.c) };
    return { step: 'EP1 · EYES ON', title: 'Your car', text: 'Back to the Chevy, then the Board.', at: cellWorld(POI.chevy.c) };
  },
  step(dt) {
    if (this.beat === 'eyes' && this.readyForBoard() && !this._told) {
      this._told = true;
      bus.emit('toast', { title: 'Enough for the Board', text: 'Drive back to the Chevy.' });
    }
  },
};

// Lou stands at the tape by Felton's stoop in the cold open.
const SPOTS_EP1 = { lou: [24, 30] };

function coldOpenLou() {
  SPEAK('lou', [
    'Felton drove a bus here for thirty-one years. Somebody sat him on his own stoop and did what they did.',
    'This ain\'t a whodunit, Dana. It\'s a who-cares. Nobody on this block has seen a thing since the Orioles were good.',
    'The call came from a pay phone on Gaither. The corner\'s been sold since before you could drive. Go look at it.',
    'Navarre wants six weeks, one corner, and a face for every name. Bring me faces.',
  ], { onDone: () => { STATE.tips.cold_lou = 1; MISSION.beat = 'eyes'; saveState(); bus.emit('toast', { title: 'Eyes on', text: 'Take photos from the watch. Stay unseen.' }); } });
}

function odessaTalk() {
  TALK.voice = 'text';
  TALK.say(['"I got a grandbaby to raise, Dana Lynn. Ask me something I can answer."',
    'Her grandson is on the roof across the street with his birds. He is not studying the birds.'], { name: 'Miss Odessa', portrait: rigOf('odessa') });
}

function memorial() {
  TALK.voice = 'text';
  TALK.say(['A stoop memorial. Candles gone to wax. Cards from the church, a bus-company pin, a photo of a man in a blue uniform laughing at something out of frame.', 'The Sun ran the photo. The card under it says: WE WILL NOT FORGET YOU, MR. FELTON.'], { name: '' });
}

function payphone() {
  STATE.phones = STATE.phones || [];
  if (!STATE.phones.includes('555-0187')) STATE.phones.push('555-0187');
  bus.emit('toast', { title: 'Number logged', text: '555-0187 · Gaither Market payphone' });
  saveState();
}

function pocketsTalk() {
  const price = 20;
  SPEAK('pockets', [
    'Ain\'t seen nothing. Ain\'t looked, neither. You want a battery? Batteries is twenty.',
    'I don\'t look at faces, Officer. I look at feet. Tee walk in wheat Timberlands, like a farmer went to school. Rook got the red-swoosh Air Forces. Corey got them Nikes he duct-taped, like that fools anybody.',
    'Pigeon, he got the light-up sneakers. You can see him coming three blocks off. That\'s the whole secret. Now that\'s a battery.',
  ], {
    name: 'Pockets', portrait: rigOf('pockets'),
    onDone: () => {
      STATE.fund -= price; STATE.pockets = true; STATE.case += 3;
      bus.emit('toast', { title: 'Paid $20', text: 'Shoes matched to names.' });
      saveState();
    },
  });
}

// The Board: faces, roles, the case. Its finish ends the episode.
function toBoard() {
  MISSION.beat = 'board';
  saveState();
  showBoard();
}

// The Board is the results screen's layout: one card per crew face, the case figures below.
function showBoard() {
  const stats = FACE_IDS.map(id => {
    const p = PEOPLE.find(q => q.id === id);
    return [(STATE.faces[id] ? '★ ' : '· ') + (p ? p.short : id), STATE.roles[id] || (STATE.faces[id] ? 'face on file' : 'no face yet')];
  });
  ui.show('results', {
    kicker: 'Special Detail 9 · the Board',
    title: 'Faces and jobs',
    stats: stats.concat([[String(STATE.case), 'case strength']]),
    actions: [['Close the case for Episode 1', () => finishEpisode1()]],
  });
}

function finishEpisode1() {
  STATE.done = true; STATE.beat = 'done';
  saveState();
  const shots = STATE.photos.length, best = STATE.photos.reduce((m, p) => Math.max(m, p.stars), 0);
  ui.show('results', {
    kicker: 'Episode 1 · EYES ON', title: 'The corner has a face now',
    stats: [[String(shots), 'photos taken'], [String(FACE_IDS.filter(id => STATE.faces[id]).length) + '/4', 'faces on file'],
      [String(Object.keys(STATE.roles).length), 'roles read'], [stars(best), 'best shot']],
    actions: [['Back to the title', () => game.go('title')]],
  });
}
