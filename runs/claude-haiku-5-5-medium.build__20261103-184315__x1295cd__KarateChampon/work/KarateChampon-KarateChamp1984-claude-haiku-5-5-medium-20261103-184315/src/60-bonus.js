// ---------------------------------------------------------------- the bonus stages: boards, pots, the bull (7.4). Pure rules first (testable), then the scene.
KC.Bonus = {};
const B = KC.Bonus;

// BREAK THE BOARDS: hold to breathe in (the KI gauge rises, wobbling); release to chop. Power decides how many boards break.
B.boardsNew = (o = {}) => ({ n: o.n || 5, ki: 0, dir: 1, held: false, over: 0, phase: 'ready', result: null, t: 0, wob: 0, mult: o.mult || 1 });
B.boardsStep = (s, dt, held, speed = 1) => {
  s.t += dt;
  if (s.phase === 'ready') { if (held) { s.phase = 'breathe'; s.ki = 0; s.over = 0; } return s; }
  if (s.phase === 'breathe') {
    if (!held) { return B.boardsChop(s); }
    s.wob = Math.sin(s.t * 2.2 * Math.PI * 2) * 0.06;
    s.ki += (55 * KC.TUNE.kiSpeed * speed * dt) * (1 + s.wob);
    if (s.ki > 100) { s.over += dt; if (s.over > 0.3) { s.ki = 60; s.over = 0; s.tooMuch = true; } }
    else s.over = 0;
    return s;
  }
  if (s.phase === 'result') { s.resultT = (s.resultT || 0) + dt; }
  return s;
};
B.boardsChop = (s) => {
  const power = KC.clamp(s.ki, 0, 100);
  s.broken = Math.min(s.n, Math.floor(power / 100 * (s.n + 0.99)));
  s.perfect = power >= 95;
  s.phase = 'result'; s.resultT = 0;
  s.points = s.broken * 200 + (s.perfect ? 2000 : 0);
  return s;
};

// POTS AHOY! (Evade): 16 objects from both sides, the interval 1.4 s down to 0.8 s, the speed 150 up to 230 u/s.
// Clay pots break with a technique of their height; bonsai pots with kicks; boulders are dodged; bowls are caught with a block.
B.potsNew = (visit = 1) => {
  const R = E.rng(visit * 7919);
  const lanes = ['high', 'mid', 'low'];
  const kinds = ['clay', 'clay', 'bonsai', 'boulder', 'bowl'];
  const seq = [];
  let t = 1.2;
  for (let i = 0; i < 16; i++) {
    const k = i === 0 ? 'clay' : kinds[Math.floor(R() * kinds.length)];
    const lane = k === 'bonsai' ? lanes[Math.floor(R() * 3)] : (k === 'boulder' ? lanes[Math.floor(R() * 3)] : lanes[Math.floor(R() * 3)]);
    const side = i % 2 === 0 ? 1 : -1;
    const speed = 150 + (230 - 150) * (i / 15);
    seq.push({ k, lane, side, speed, t, x: side > 0 ? 440 : -40, state: 'flying', id: i });
    t += 1.4 - 0.6 * (i / 15);
  }
  return { seq, now: 0, objs: [], idx: 0, score: 0, missed: false, handled: 0, ended: false, msg: null, msgT: 0 };
};
B.potsStep = (s, dt, f) => {
  s.now += dt; if (s.msgT > 0) s.msgT -= dt;
  while (s.idx < s.seq.length && s.seq[s.idx].t <= s.now) { s.objs.push(Object.assign({}, s.seq[s.idx])); s.idx++; }
  for (const o of s.objs) {
    if (o.state !== 'flying') continue;
    o.x += (o.side > 0 ? -1 : 1) * o.speed * KC.TUNE.potSpeed * dt;
    const dist = Math.abs(o.x - f.x);
    if (dist <= 24) { o.state = 'contact'; B.potsResolve(s, o, f); }
    if ((o.side > 0 && o.x < -40) || (o.side < 0 && o.x > 440)) { if (o.state === 'flying') o.state = 'gone'; }
  }
  if (s.handled >= s.seq.length && !s.ended) { s.ended = true; s.perfectPot = !s.missed; s.score += s.perfectPot ? 3000 : 0; }
  return s;
};
B.potsResolve = (s, o, f) => {
  const T = f.tech && KC.DATA.techniques[f.tech.id];
  const active = f.state === 'tech' && f.tech && f.tech.ph === 1;
  const kick = active && T && /KICK/.test(T.name) ? true : false;
  const block = f.state === 'tech' && f.tech && f.tech.id === 'block' && f.tech.ph === 1;
  let ok = false, msg = null;
  if (o.k === 'clay') { ok = active && T.height === o.lane; if (ok) { s.score += 200; msg = 'BREAK'; } }
  else if (o.k === 'bonsai') { ok = kick; if (ok) { s.score += 200; msg = 'BREAK'; } }
  else if (o.k === 'boulder') {
    ok = (o.lane === 'low' && f.airborne) || (o.lane === 'high' && f.crouch) || (o.lane === 'mid' && f.flipping && f.tech && f.tech.id === 'backFlip');
    msg = ok ? 'DODGE' : null;
  } else if (o.k === 'bowl') {
    if (block) { s.score += 1000; msg = 'NICE CATCH!'; ok = true; }
    else if (active) { s.score -= 500; msg = 'MOTTAINAI!'; ok = true; }
    else { msg = 'SPLASH'; ok = true; }
  }
  if (o.state === 'contact' && ok) { o.state = 'done'; s.handled++; }
  if (!ok) { // a clay, a bonsai or a boulder that gets through: the stage ends on the first hit
    if (o.k !== 'bowl') { s.missed = true; s.hitEnd = true; }
    o.state = 'done'; s.handled++;
  }
  if (msg) { s.msg = msg; s.msgT = 0.9; }
  return s;
};

// STOP THE BULL: three charges at 150, 190 and 240 u/s. A valid technique in the strike window stops it for 3,000 (+1,000 PERFECT).
B.bullNew = () => ({ charge: 0, state: 'paw', x: 440, t: 0, speed: 0, dizzy: 0, score: 0, done: false, end: null, msg: null, msgT: 0, tramples: 0, wins: 0 });
B.bullSpeeds = [150, 190, 240];
B.VALID_BULL = ['upperPunch', 'upLunge', 'squatPunch', 'frontKick', 'backKick'];
B.bullStep = (s, dt, f) => {
  s.t += dt; if (s.msgT > 0) s.msgT -= dt;
  if (s.done) return s;
  if (s.state === 'paw') { if (s.t > 1.2) { s.state = 'charge'; s.speed = B.bullSpeeds[s.charge] * KC.TUNE.bullSpeed; s.t = 0; } return s; }
  if (s.state === 'charge') {
    s.x -= s.speed * dt;
    const head = s.x - 22, front = f.x + 9, dist = head - front;
    const T = f.tech && KC.DATA.techniques[f.tech.id];
    const strike = f.state === 'tech' && f.tech && f.tech.ph === 1 && B.VALID_BULL.includes(f.tech.id);
    if (strike && dist >= 8 && dist <= 40) { s.state = 'stopped'; s.dizzy = 1.5; s.t = 0; s.wins++; const perf = Math.abs(dist - 24) <= 6; s.score += 3000 + (perf ? 1000 : 0); s.msg = perf ? 'PERFECT!' : 'THUD!'; s.msgT = 1.2; return s; }
    if (dist < 8) { s.state = 'trampled'; s.t = 0; s.tramples++; s.end = 'trampled'; s.msg = 'TRAMPLED!'; s.msgT = 2; s.done = true; return s; }
    return s;
  }
  if (s.state === 'stopped') { s.dizzy -= dt; if (s.dizzy <= 0) { s.charge++; if (s.charge >= 3) { s.done = true; s.end = 'clear'; return s; } s.state = 'walkBack'; s.t = 0; } return s; }
  if (s.state === 'walkBack') { s.x += 90 * dt; if (s.x >= 440) { s.x = 440; s.state = 'paw'; s.t = 0; } return s; }
  return s;
};

// the scene
KC.makeBonus = (game, S) => {
  S.bonusMenu = {
    pausable: false,
    enter() { this.menu = new E.Menu(game, ['BREAK THE BOARDS', 'POTS AHOY!', 'STOP THE BULL', 'BACK'], { x: 'center', y: 80, onPick: (i) => { if (i === 3) return game.go('title'); return game.go('bonus', { kind: ['boards', 'pots', 'bull'][i], stage: ['courtyard', 'fishmarket', 'pasture'][i] }); }, onCancel: () => game.go('title') }); KC.A.music(game, 'bonus'); },
    update(d) { this.menu.update(d); },
    draw(r) { r.sky(['#4a8ab0', '#8ac0d8', '#d8ecf0']); r.overlay(g => E.font.title(g, 'BONUS GAMES', r.W / 2, 22, { scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' })); this.menu.draw(r); }
  };
  S.bonus = {
    pausable: false,
    enter(data) {
      this.kind = data.kind; this.node = data.node; this.story = data.node !== undefined; this.t = 0; this.end = null;
      this.st = data.kind === 'boards' ? B.boardsNew({ n: 5 }) : data.kind === 'pots' ? B.potsNew(1 + (KC.save.load() || {}).node || 1) : B.bullNew();
      this.f = new KC.Karateka({ id: 'taro', side: 'w' }); this.f.x = 150; this.f.facing = 1;
      this.dummy = { x: 400, facing: -1, state: 'idle', z: 0, airborne: false, tech: null, crouch: false, flipping: false, guardOn: false, dir: -1, poseState: () => ({}) };
      this.rig = KC.View.rigFor('taro', 'w'); this.prevIn = {};
      this.stage = KC.DATA.bonusStages[data.stage] || KC.DATA.bonusStages.courtyard;
      this.title = KC.TEXT.bonusTitles[data.kind];
      KC.A.music(game, 'bonus');
    },
    update(d) {
      game.focus(200, 0, 30);
      this.t += d;
      const st = this.st, held = game.input.down('tDown') || game.input.down('confirm');
      const intent = KC.readControl(game.input, 1, this.prevIn);
      if (this.kind !== 'boards') { this.f.control(intent, this.dummy); this.f.tick(d, this.dummy, true); }
      if (this.kind === 'boards') {
        B.boardsStep(st, d, held);
        if (st.phase === 'result' && st.resultT > 0.02 && !this.judged) { this.judged = true; KC.A.sfx(game, st.perfect ? 'perfect' : 'boardCrack'); }
        if (st.phase === 'result' && st.resultT > 3) return this.finish(st.points, st.perfect ? 'PERFECT!' : 'WEAK!');
        if (st.phase === 'breathe' && !held) B.boardsChop(st);
      } else if (this.kind === 'pots') {
        B.potsStep(st, d, this.f);
        if (st.hitEnd && !this.endT) { this.endT = this.t; }
        if (this.endT && this.t - this.endT > 1.2) return this.finish(st.score + (st.perfectPot ? 3000 : 0), st.perfectPot ? 'PERFECT!' : 'OVER!');
        if (st.ended && !this.endT) { this.endT = this.t; }
      } else {
        B.bullStep(st, d, this.f);
        if (st.done && !this.endT) this.endT = this.t;
        if (this.endT && this.t - this.endT > 1.8) return this.finish(st.score, st.end === 'clear' ? 'CHAMP!' : 'TRAMPLED!');
      }
      KC.View.applyPose(this.rig, this.f.poseState(), d);
    },
    finish(score, word) {
      this.resultWord = word;
      const table = this.kind === 'boards' ? 'boards' : this.kind === 'pots' ? 'pots' : 'bull';
      KC.records.add(table, 'TARO', score, '');
      if (this.story) {
        KC.advanceNode();
        const s = KC.save.load() || { score: 0 }; s.score = (s.score || 0) + score; KC.save.write(s);
        return game.go('road', { resume: true });
      }
      return game.go('bonusMenu');
    },
    draw(r) {
      const sg = this.stage;
      r.sky(sg.sky);
      const floor = Math.round(r.w(0, 0, 0)[1]);
      r.overlay(g => { for (let y = floor; y < r.H; y++) E.px.rect(g, 0, y, r.W, 1, sg.floor); });
      if (this.kind === 'boards') this.drawBoards(r);
      else if (this.kind === 'pots') this.drawPots(r);
      else this.drawBull(r);
      KC.View.drawFighters(r, [this.f], { w: this.rig });
      r.overlay(g => {
        E.font.title(g, this.title, r.W / 2, 10, { scale: 2, colors: ['#fffbe8', '#ffe08a'], depth: 2, depthColor: '#5a2a10', align: 'center', outline: '#0b0814' });
        if (this.kind === 'pots' && this.st.msgT > 0) E.font.title(g, this.st.msg, r.W / 2, r.H * 0.4, { scale: 2, colors: ['#fffbe8', '#ffe08a'], align: 'center', outline: '#0b0814' });
        if (this.kind === 'bull' && this.st.msgT > 0) E.font.title(g, this.st.msg, r.W / 2, r.H * 0.4, { scale: 2, colors: ['#fffbe8', '#ffe08a'], align: 'center', outline: '#0b0814' });
        E.font.text(g, 'SCORE ' + String(this.score()).padStart(6, '0'), r.W - 10, 30, '#ffe08a', { align: 'right', outline: '#0b0814' });
        if (this.resultWord) E.font.title(g, this.resultWord, r.W / 2, r.H * 0.6, { scale: 3, colors: ['#fffbe8', '#ffe08a'], align: 'center', outline: '#0b0814' });
      });
    },
    score() { return this.kind === 'boards' ? (this.st.points || 0) : this.kind === 'pots' ? this.st.score : this.st.score; },
    drawBoards(r) {
      const g0 = null;
      r.overlay(g => {
        const x0 = r.W / 2 - 40, y0 = r.H * 0.5;
        for (let k = 0; k < this.st.n; k++) {
          const broken = this.st.phase === 'result' && k < this.st.broken;
          E.px.rect(g, x0 + k * 10, y0 - 40, 8, 40, broken ? '#8a6038' : '#d8b080');
        }
        E.ui.bar(g, 40, r.H - 40, 200, 8, this.st.ki / 100, this.st.ki > 100 ? '#ff5a4a' : '#ffd060');
        E.font.text(g, 'KI', 26, r.H - 42, '#fff6d0', { outline: '#0b0814' });
      });
    },
    drawPots(r) {
      r.overlay(g => {
        const floor = r.H * 0.7;
        E.px.rect(g, 0, floor, r.W, 2, '#8a6038');
        for (const o of this.st.objs) {
          if (o.state === 'done' || o.state === 'gone') continue;
          const sx = (r.W / 2) + (o.x - 150) * 1.0;
          const y = floor - (o.lane === 'high' ? 52 : o.lane === 'mid' ? 36 : 10);
          const c = o.k === 'clay' ? '#a06a40' : o.k === 'bonsai' ? '#3a7a3a' : o.k === 'boulder' ? '#7a7a7a' : '#e8e0c8';
          E.px.disc(g, sx, y, 7, c);
        }
      });
    },
    drawBull(r) {
      const bx = this.st.x;
      r.overlay(g => {
        const floor = r.H * 0.7, sx = (r.W / 2) + (bx - 150);
        E.px.rect(g, sx - 22, floor - 36, 44, 30, '#4a2e22');
        E.px.rect(g, sx + 14, floor - 52, 16, 18, '#4a2e22');
        E.px.rect(g, sx + 26, floor - 50, 4, 4, '#e8dcc0');
        if (this.st.state === 'stopped') E.font.text(g, '*  *  *', sx + 10, floor - 60, '#ffe08a', { outline: '#0b0814' });
      });
    }
  };
  return S;
};
