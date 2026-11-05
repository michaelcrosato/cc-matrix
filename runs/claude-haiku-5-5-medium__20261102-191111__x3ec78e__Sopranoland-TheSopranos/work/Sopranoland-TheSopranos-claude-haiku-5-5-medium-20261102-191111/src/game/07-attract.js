// ---------------------------------------------------------------------------------------------
// 07 · ATTRACT — the title's idle demo. After 10 s with no input the game plays itself: an AI
// hero that cheats (no damage, full shells) walks the chapters' goals, fights what's near, picks
// its own answers in the talk and runs the whole demo round after round. Any input ends it.
// It only shows the game; it isn't meant to balance it.
// ---------------------------------------------------------------------------------------------
let ATTRACT = false;
const AI = {
  press: {}, down: {}, walk: { move: [0, 0], sprint: true, jumpPressed: false },
  talk: 0, flowT: 0, flow: null, atkT: 0, useT: 0, interactT: 0, stuck: 0, endT: 0,
};
// The buttons the AI presses, read by the world the same way as game.input's.
const AIPAD = {
  pressed: a => !!AI.press[a], down: a => !!AI.down[a], buffered: a => !!AI.press[a], consume() {}, label: () => '',
};

// Where the AI walks: the chapter's goal (a person, a door, the yard, Ma's door).
function aiGoal() {
  if (S.done) return null;
  if (S.chapter === 1) {
    for (const k of ['ricci', 'dorothy', 'tina']) if (!S.got[k]) return centerOf(NPC_DEFS[k].cell);
  }
  if (S.chapter === 2) return centerOf(NPC_DEFS.lou.cell);
  if (S.chapter === 3) return centerOf([27, 23]);
  if (S.chapter === 4) return W.boss && !W.boss.dead ? { x: W.boss.x, y: W.boss.y } : centerOf([37, 30]);
  if (S.chapter === 5) return centerOf([8, 13]);
  return null;
}

function aiStep(dt) {
  AI.press = {};
  const hero = W.hero;
  S.hp = 100; S.ammo = Math.max(S.ammo, 20); S.stress = Math.min(S.stress, 50);   // the cheats
  AI.atkT -= dt; AI.useT -= dt; AI.interactT -= dt;
  // the nearest foe still standing (civilians are left alone)
  let foe = null, fd = Infinity;
  for (const f of W.foes) { if (f.dead || f.kind === 'civ') continue; const d = E.dist(hero, f); if (d < fd) { fd = d; foe = f; } }
  let dir = [0, 0];
  const engaged = !!foe && fd < 170;
  if (engaged) {
    hero.facing = Math.atan2(foe.y - hero.y, foe.x - hero.x);
    if (fd < 30) {
      if (AI.atkT <= 0 && !W.combo.busy) { AI.press.attack = true; AI.atkT = .6; }
    } else dir = [Math.cos(hero.facing), Math.sin(hero.facing)];
    if (fd >= 40 && AI.useT <= 0 && S.ammo > 0) { AI.press.use = true; AI.useT = .42; }
  } else {
    const goal = aiGoal();
    if (goal && E.dist(hero, goal) > 18) {
      if (!AI.flow) AI.flow = new E.FlowField(W.map);
      AI.flowT -= dt;
      if (AI.flowT <= 0) { AI.flow.update(goal.x, goal.y); AI.flowT = .4; }
      dir = AI.flow.dir(hero.x, hero.y, goal.x, goal.y);
    }
  }
  // the buttons for the goal: talk to a person, open a door (not in a fight)
  if (nearestInteractable() && AI.interactT <= 0 && !(engaged && fd < 60)) { AI.press.interact = true; AI.interactT = .9; }
  // stuck at a corner for a while: hop
  AI.stuck = Math.hypot(hero.vx || 0, hero.vy || 0) < 4 ? AI.stuck + dt : 0;
  AI.walk.jumpPressed = AI.stuck > 1.2;
  if (AI.stuck > 1.2) AI.stuck = 0;
  AI.walk.move = dir;
  AI.walk.sprint = true;
}

const attractScene = {
  enter(d = {}) {
    ATTRACT = true;
    if (!(d.resume && W)) {   // a fresh demo; resume: back from the session room, with the demo as it was
      S = newState();
      buildWorld();
      W.god = true;
      setChapter(1, { quiet: true });
      AI.flow = null; AI.endT = 0; AI.talk = 0; AI.stuck = 0;
    }
    playSong(songForPlay());
  },
  exit() {},
  update(dt) {
    if (game.input.anyPressed()) { game.go('title'); return; }
    if (S.done) { AI.endT += dt; if (AI.endT > 5) { game.go('title'); return; } }
    if (talk.open) aiTalk(dt, AI);
    aiStep(dt);
    playUpdate(dt, AIPAD, AI.walk);
  },
  draw(r) { drawPlayFrame(r); },
};
