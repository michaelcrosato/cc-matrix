// ---------------------------------------------------------------------------------------------
// 05 · TALK — the conversations: E.Dialog boxes that type out the lines in gibberish "Animalese"
// voices, with choices that move respect, stress and heat. A conversation is a set of nodes
// (see CONVS in 01). It runs one node at a time; the world waits while a box is open.
// ---------------------------------------------------------------------------------------------
const talk = new E.Dialog(game, { speed: 44, place: 'bottom', bg: '#120e1c', border: '#d8c48a', nameColor: '#ffd36a', color: '#f4eee0' });

let conv = null;       // the conversation running: { id, c, node, need, onEnd }
const PORTRAITS = {};  // rigs for the speakers who aren't on the street (the session room, a boss, Ma)

// A speaker's face in the talk box: a rig on the street, or a standing rig made once for the box.
function portraitFor(who) {
  if (!who || who === 'nobody') return null;
  if (W && W.npcs[who]) return W.npcs[who].rig;
  if (!PORTRAITS[who]) {
    const look = who === 'vashti' ? { build: 'heroic', hair: 'long', outfit: 'robe', size: 1.2, colors: { cloth: '#6a3a6a', skin: '#e8c0a0', hair: '#c8b0a0' } }
      : who === 'gus' ? LOOKS.gus : who === 'fed' ? LOOKS.fed
      : who === 'ma' ? { build: 'heroic', hair: 'long', outfit: 'robe', size: 1.2, colors: { cloth: '#8a3a4a', skin: '#e0b090', hair: '#8a7a6a' } }
      : LOOKS.benny;
    PORTRAITS[who] = new E.Humanoid(Object.assign({}, look, { colors: Object.assign({}, look.colors) }));
  }
  return PORTRAITS[who];
}

// The choices' effects on the run.
function applyFx(fx) {
  if (!fx) return;
  if (fx.respect) S.respect += fx.respect;
  if (fx.stress) S.stress = clamp(S.stress + fx.stress, 0, 100);
  if (fx.heal) S.hp = Math.min(100, S.hp + fx.heal);
  if (fx.flag) S.flags[fx.flag] = true;
}

// Start a conversation. onEnd runs when its last node is done. Only one runs at a time.
function startConv(id, onEnd) {
  const c = CONVS[id];
  if (!c) throw new Error('no conversation called ' + id);
  conv = { id, c, node: c.start, need: 'say', onEnd: onEnd || null };
}
function convBusy() { return !!conv; }

// Called every step before the box is read: opens the next node when the box is free.
function convTick() {
  if (!conv) return;
  const node = conv.c.nodes[conv.node];
  if (conv.need === 'say' && !talk.open) {
    conv.need = 'wait';
    const hasChoices = !!node.choices, me = conv, token = {};
    conv.token = token;
    talk.voice = VOICES[node.who] || VOICES.nobody;
    talk.say(node.text, {
      name: SPEAKER_NAMES[node.who], portrait: portraitFor(node.who), portraitSize: 46, portraitOpts: { zoom: 2.6, turn: .35 },
      choices: hasChoices ? node.choices.map(ch => ch.t) : undefined,
      onChoice: i => { if (conv !== me || me.token !== token || me.need !== 'wait') return; const ch = node.choices[i]; applyFx(ch.fx); advance(ch.next); },
      onDone: () => { if (conv !== me || me.token !== token || me.need !== 'wait') return; if (!hasChoices) advance(node.next); },
    });
  } else if (conv.need === 'wait' && !talk.open) {
    // the box closed without an answer or a last page: a plain node moves on; a choice asks again
    if (!node.choices) advance(node.next); else conv.need = 'say';
  }
}
function advance(next) {
  if (!conv) return;
  if (!next) { const done = conv; conv = null; if (done.onEnd) done.onEnd(); return; }
  conv.node = next; conv.need = 'say';
}

// The attract mode and a test answer for the player: a choice at random, and a box closed when it's read.
function aiTalk(dt, aiT) {
  if (!talk.open) return;
  aiT.talk += dt;
  if (aiT.talk < .7) return;
  aiT.talk = 0;
  // the same steps a player's confirm makes: finish the line, turn the page, then answer or close
  if (talk.typing) { talk.shown = talk.pageLen; return; }
  if (talk.i < talk.pages.length - 1) { talk.i++; talk.shown = 0; talk._held = -1; return; }
  if (talk.choices && talk.choices.length) {
    const i = Math.floor(Math.random() * talk.choices.length), cb = talk.onChoice;
    talk.close();
    if (cb) cb(i);
  } else talk.close();
}
