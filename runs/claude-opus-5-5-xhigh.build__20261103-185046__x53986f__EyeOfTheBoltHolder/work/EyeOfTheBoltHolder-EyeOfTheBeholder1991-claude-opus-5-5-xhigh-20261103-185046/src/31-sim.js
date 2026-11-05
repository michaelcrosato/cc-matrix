/* =====================================================================================
 * 31-sim: B.update(dt, commands, realDt): one fixed step of the whole game's rules, and the commands every controller
 * (the player's Controls, the bot, the attract mode, tests, the hub race) drives it with
 * ===================================================================================== */
function command(c) {
  const P = S.party;
  if (S.over && c.c !== 'talk') return;
  switch (c.c) {
    case 'move': {
      if (S.talk || S.transit || S.moment || S.camp || P.busy) return;
      const dir = (P.dir + { f: 0, r: 1, b: 2, l: 3 }[c.d]) % 4;
      if (P.tw) { P.queued = c; return; }
      tryStep(dir); return;
    }
    case 'turn': if (S.talk || S.transit || S.moment || S.camp || P.busy) return; if (P.tw) { P.queued = c; return; } turnBy(c.s); return;
    case 'use': if (S.talk || S.transit || S.moment || S.camp || P.busy) return; useAhead(); return;
    case 'putDown': if (S.transit || S.talk || S.camp || P.busy) return; putDown(); return;
    case 'throw': if (S.transit || S.talk || S.camp || P.busy || S.moment) return; throwHand(); return;
    case 'examine': { const t = examine(); say(t, null, { c: '#d8e0ff' }); ev('examine', { text: t }); return; }
    case 'pick': if (S.transit || S.talk || P.busy) return; pick(c.x, c.y, c.i); return;
    case 'strike': if (S.transit || S.talk || S.camp || S.moment) return; strike(); return;
    case 'hand': { if (S.transit || S.talk || S.camp || S.moment) return; const r = handAct(c.m, c.h || 'main'); if (r === 'cast') ev('castMenu', { m: c.m }); return; }
    case 'cast': if (S.transit || S.talk || S.moment) return; castCmd(c.m, c.spell, c); return;
    case 'inv': invOp(c); return;
    case 'select': if (MEM(c.m)) P.sel = c.m; return;
    case 'camp': {
      const op = c.op;
      if (op === 'open') B.campOpen(); else if (op === 'close') B.campClose(); else if (op === 'rest') B.restStart(); else if (op === 'stop') B.restStop();
      else if (op === 'eat') B.eatAll(); else if (op === 'mem') B.memorize(c.m, c.spell); else if (op === 'forget') B.forget(c.m, c.lvl, c.i);
      else if (op === 'scribe') B.scribe(c.m, c.from, c.slot); else if (op === 'swap') B.swapPlaces(c.a, c.b);
      return;
    }
    case 'swap': B.swapPlaces(c.a, c.b); return;
    case 'talk': if (c.op === 'choose') B.talkChoose(c.i); else B.talkNext(); return;
    case 'dismiss': B.dismiss(c.m); return;
    case 'skipCard': B.skipCard(); return;
    case 'useItem': { const m = MEM(c.m); if (m) { const it = B.getSlot(m, c.slot); if (it) useItem(m, c.slot, it); } return; }
  }
}
B.command = command;
/** one step of the rules: commands first, then the world (dialogue, camp, floor changes and moments hold it still) */
B.update = (dt, cmds = [], realDt = dt) => {
  S.events.length = 0;
  for (const c of cmds) command(c);
  if (S.over) return;
  if (S.talk) return;
  if (S.camp) { campStep(realDt); return; }
  S.time += dt; if (S.mode === 'campaign') S.playTime += dt;
  const P = S.party;
  if (S.transit) { transitStep(dt); return; }
  if (S.moment) { momentStep(dt); doorsStep(dt); bossStep(0); return; }
  if (P.tw) { P.tw.t += dt; if (P.tw.t >= P.tw.dur) finishTween(); }
  if (!P.tw && P.queued && !P.busy && !S.transit) { const q = P.queued; P.queued = null; command(q); }
  P.bump = Math.max(0, P.bump - dt * 6);
  if (P.busy) { P.busy.t += dt; if (P.busy.t >= P.busy.dur) { const b = P.busy; P.busy = null; if (b.k === 'lock') B.lockDone(b.id); } }
  doorsStep(dt); platesStep(); projStep(dt);
  const engaged = monsStep(dt); bossStep(dt);
  bodyStep(dt);
  buttonsStep(); hintsStep(dt);
  const fight = engaged || (S.boss && S.boss.alive && S.boss.awake && S.floor === 'f4');
  if (fight) S.fightT = 4; else S.fightT = Math.max(0, S.fightT - dt);
  const on = S.fightT > 0; if (on !== !!S.combat) { S.combat = on; ev('combat', { on }); }
  if (S.race && !S.race.done) raceStep(dt);
};
/** two buttons, one window: when it runs out with one pressed, a failure */
function buttonsStep() { const fl = FL(); if (fl.btn && S.time - fl.btn.t > B.T.buttonWin) { const b = fl.btn; fl.btn = null; trigger('buttonTimeout', { wire: b.wire }); } }
/** each puzzle's escalating hint, when the party lingers by it */
function hintsStep(dt) {
  if (!B.opt.hints) return;
  const F = B.FLOORS[S.floor], fl = FL(), P = S.party;
  (F.hints || []).forEach((h, i) => {
    if (S.hintsShown[h.text]) return;
    const d = h.done || {}; if ((d.plateDown && fl.plates[d.plateDown]) || (d.open && fl.doors[d.open].open > .5) || (d.flag && S.flags[d.flag])) return;
    if (!h.cells.some(([x, y]) => x === P.cx && y === P.cy)) return;
    fl.hintT[i] = (fl.hintT[i] || 0) + dt;
    if (fl.hintT[i] >= h.after) hint(h.text);
  });
}
/* ---- the Rat Run: checkpoints, score and the clock (the hub ghost race and the solo time trial share it) ---- */
const RACE_CP = { lever: 'Lever pulled', room: 'Rat Room cleared', key: 'Key found', door: 'Door open', plate: 'Plate down' };
B.raceInit = () => { S.race = { t: 0, score: 0, crowns: 0, kills: 0, cp: {}, label: 'The Rat Run', done: false, time: null, wiped: false }; };
B.raceCheckpoint = id => { const R = S.race; if (!R || R.cp[id]) return; R.cp[id] = true; R.score += 100; R.label = RACE_CP[id] || id; ev('checkpoint', { id }); };
B.raceCheck = () => {
  const R = S.race; if (!R) return; const fl = FL();
  if (!R.cp.room && !fl.mons.some(m => m.hp > 0 && m.group === 'ratroom')) B.raceCheckpoint('room');
  if (!R.cp.key && B.findItem(r => r.id === 'ironKey')) B.raceCheckpoint('key');
  if (!R.cp.door && fl.doors.RL && fl.doors.RL.open > .5) B.raceCheckpoint('door');
  if (!R.cp.plate && fl.plates.RP) B.raceCheckpoint('plate');
};
function raceStep(dt) { S.race.t += dt; B.raceCheck(); }
B.raceFinish = () => { const R = S.race; if (!R || R.done) return; R.done = true; R.score += 500; R.time = R.t; R.label = 'Escaped!'; ev('raceDone', { time: R.t }); };
B.raceWipe = () => { const R = S.race; if (!R || R.done) return; R.done = true; R.wiped = true; R.label = 'Fell in the Run'; ev('raceWipe', {}); };
/** the start of a campaign's play (after the intro) */
B.beginCampaign = () => { say('m_sealed', null, { c: '#d8c8a8' }); hint('h_move'); S.quests.main = 'open'; };
