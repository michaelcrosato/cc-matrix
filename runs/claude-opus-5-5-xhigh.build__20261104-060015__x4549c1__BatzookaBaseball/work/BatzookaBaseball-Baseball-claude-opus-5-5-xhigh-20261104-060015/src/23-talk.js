/* =============================================================================
 * 23-talk: the commentary director (it listens to the bus and picks a line by
 * tag: priorities, a rate limit, no repeats within 20, variables; Hap calls it,
 * Lou reacts), the radio box with live portraits, the PA (Gloria Vox), the
 * umpire's calls (stamps and her voice), and the cutscene runner (BZ.cut) with
 * its talk boxes, ✕ to advance and a hold of ○ to skip. All speech is babble;
 * the text is always on screen.
 * ========================================================================== */
BZ.talk = {
  box: null, queue: [], lastT: -9, recent: [], cutscene: null, typing: 0,
  reset() { this.box = null; this.queue = []; this.lastT = -9; this.cutscene = null; },
  setting() { return (BZ.game && BZ.game.settings && BZ.game.settings.commentary) || 'on'; },
  /** say a line from a tag's pool (prio 1 routine, 2 outs/hits/steals, 3 big plays) */
  say(tag, vars = {}, prio = 1) {
    const pool = BZ.LINES[tag]; if (!pool || !BZ.M) return;
    const set = this.setting(); if (set === 'off' || (set === 'big' && prio < 3)) return;
    const now = BZ.game.real;
    if (this.box && this.box.prio > prio && now - this.box.t0 < 2.4) return;
    if (now - this.lastT < 2.5 && (!this.box || prio <= this.box.prio)) return;
    let pick = null;
    for (let tries = 0; tries < 8; tries++) { const c = BZ.pickF(pool); const key = tag + ':' + pool.indexOf(c); if (!this.recent.includes(key) || tries === 7) { pick = c; this.recent.push(key); if (this.recent.length > 20) this.recent.shift(); break; } }
    const who = Array.isArray(pick) ? pick[0] : 'hap', text = this.fill(Array.isArray(pick) ? pick[1] : pick, vars);
    this.show(who, text, prio);
    // on the biggest plays Hap calls it and Lou reacts
    if (prio >= 3 && who === 'hap') { const lou = pool.filter(l => Array.isArray(l) && l[0] === 'lou'); if (lou.length) this.queue.push([BZ.pickF(lou)[1], vars]); }
  },
  fill(t, v) {
    const M = BZ.M, O = M ? BZ.offense(M) : null;
    const base = { batter: M && M.batter ? M.batter.name.replace(/".*?" /, '') : '', pitcher: M && M.pitcher ? M.pitcher.name.replace(/".*?" /, '') : '', team: O ? O.def.nick.charAt(0) + O.def.nick.slice(1).toLowerCase() : '', park: M ? M.park.name : '', score: M ? M.teams[0].def.abbr + ' ' + M.teams[0].runs + ', ' + M.teams[1].def.abbr + ' ' + M.teams[1].runs : '' };
    return t.replace(/\{(\w+)\}/g, (m, k) => v[k] !== undefined ? v[k] : base[k] !== undefined ? base[k] : m);
  },
  show(who, text, prio = 1, o = {}) {
    this.box = { who, text, prio, t0: BZ.game.real, t: 0, dur: Math.max(2.4, text.length * .055), name: BZ.nameOf(who) };
    this.lastT = BZ.game.real;
    BZ.babble.say(text, BZ.voiceOf(who), { max: 90 });
    void o;
  },
  step(dt) {
    if (this.box) { this.box.t += dt; if (this.box.t > this.box.dur) { this.box = null; if (this.queue.length) { const [t, v] = this.queue.shift(); this.show('lou', this.fill(t, v), 2); } } }
    if (this.cutscene) this.cutStep(dt);
  },
  /** the radio box: non-modal, bottom left above the player card */
  drawRadio(g, r) {
    const b = this.box; if (!b || this.cutscene) return;
    const w = Math.min(r.W - 150, 230), x = 12, y = r.H - 106, a = Math.min(1, b.t * 6, (b.dur - b.t) * 4);
    if (a <= 0) return;
    px.blend(g, .86 * a, 'normal', () => E.ui.box(g, x, y, w, 36, { bg: ['#202a48', '#0c1020'], border: '#7a8ac8' }));
    const rig = BZ.portraitRig(b.who); if (rig && BZ.cosmetic) { rig._talk = b.t < b.text.length / 20; rig.drawPortrait(g, x + 4, y + 4, 32, { zoom: 2.4, frame: false }); rig._talk = false; }
    E.font.text(g, b.name, x + 40, y + 4, '#ffd040', { shadow: '#000' });
    const shown = b.text.slice(0, Math.floor(b.t * 40)), lines = E.font.wrap(shown, w - 46);
    const ls = lines.length > 2 ? lines.slice(lines.length - 2) : lines; ls.forEach((l, i) => E.font.text(g, l, x + 40, y + 14 + i * 10, '#ffffff', { shadow: '#000' }));
  },
  /** the PA: "Now batting... number seven... DOT... DYNAMITE... DELGADO!" */
  pa(batter) {
    if (!BZ.cosmetic || this.setting() === 'off') return;
    const parts = batter.name.toUpperCase().replace(/"/g, '').split(' ');
    const text = 'Now batting... number ' + batter.num + '... ' + parts.join('... ') + '!';
    BZ.babble.say(text, 'gloria', { max: 90, vol: .8 });
    BZ.hud.info = { text: '#' + batter.num + '  ' + batter.name.toUpperCase(), t: 0, color: '#ffd040' };
  },
  ump(kind) {
    const text = BZ.UMP[kind] || kind;
    if (BZ.cosmetic) BZ.babble.say(text, 'barb', { vol: 1 });
    const M = BZ.M; if (M) M.umpCall = { spec: kind === 'strike' || kind === 'three' || kind === 'out' ? BZ.MOTION.punchOut : kind === 'safe' ? BZ.MOTION.safe : 'jab', t: 0 };
  },
  /* ---- the cutscene runner: BZ.cut(steps, done) ---- */
  cut(steps, done, o = {}) {
    this.cutscene = { steps: steps.slice(), i: -1, t: 0, wait: 0, line: null, done, skipT: 0, actors: o.actors || {}, cam: o.cam || null, bg: o.bg || null };
    this.box = null;
    this.next();
  },
  next() {
    const C = this.cutscene; if (!C) return;
    C.i++; C.line = null; C.wait = 0;
    while (C.i < C.steps.length) {
      const s = C.steps[C.i], k = s[0];
      if (k === 'say') { C.line = { who: s[1], text: s[2], t: 0 }; BZ.babble.say(s[2], BZ.voiceOf(s[1]), { max: 120 }); return; }
      if (k === 'wait') { C.wait = s[1]; return; }
      if (k === 'sfx') BZ.sfx(s[1]);
      else if (k === 'music') BZ.music(s[1]);
      else if (k === 'pose') { const a = C.actors[s[1]]; if (a) { a.pose = s[2]; a.expr = s[3] || null; } }
      else if (k === 'walk') { const a = C.actors[s[1]]; if (a) { a.tx = s[2]; a.ty = s[3]; } }
      else if (k === 'face') { const a = C.actors[s[1]]; if (a) a.facing = s[2]; }
      else if (k === 'cam') { C.cam = { x: s[1], y: s[2], zoom: s[3] }; }
      else if (k === 'fx') { if (BZ.cosmetic) { const P = BZ.game.particles; if (s[1] === 'boom') P.explosion(s[2], s[3], 20, 1.2, { shake: 0 }); else if (s[1] === 'confetti') BZ.crowd && BZ.crowd.confetti(s[2], s[3]); else if (s[1] === 'sparks') P.sparks(s[2], s[3], 40, 20); else P.smoke(s[2], s[3], 10, 6); } }
      else if (k === 'call') { try { s[1](); } catch (e) { BZ.game.fail('cut call', e); } }
      C.i++;
    }
    this.endCut();
  },
  endCut() { const C = this.cutscene; if (!C) return; this.cutscene = null; if (C.done) C.done(); },
  cutStep(dt) {
    const C = this.cutscene, I = BZ.game.input, P = BZ.game.players || [I];
    C.t += dt;
    // hold ○ (or Escape-free cancel) for a second to skip the scene
    if (P.some(q => q.down('east'))) { C.skipT += dt; if (C.skipT > 1) { C.steps = []; this.endCut(); return; } } else C.skipT = 0;
    for (const a of Object.values(C.actors)) if (a.tx !== undefined) { if (BZ.moveTo(a, a.tx, a.ty, 70, dt)) { a.tx = undefined; a.vx = a.vy = 0; } }
    if (C.line) {
      C.line.t += dt;
      const full = C.line.t * 40 >= C.line.text.length;
      if (P.some(q => q.pressed('south') || q.pressed('confirm')) || (BZ.M && BZ.M.attract && C.line.t > 1.4) || (BZ.autoCut && C.line.t > .05)) { if (full || BZ.autoCut) this.next(); else C.line.t = 99; }
    } else if (C.wait > 0) { C.wait -= dt; if (C.wait <= 0) this.next(); }
  },
  drawCut(g, r) {
    const C = this.cutscene; if (!C) return;
    if (C.line) {
      const L = C.line, w = Math.min(r.W - 24, 420), x = Math.round(r.W / 2 - w / 2), y = r.H - 74;
      E.ui.box(g, x, y, w, 58, { bg: ['#202a48', '#0c1020'], border: '#ffd040' });
      const rig = BZ.portraitRig(L.who); if (rig && BZ.cosmetic) { rig._talk = L.t * 40 < L.text.length; rig.drawPortrait(g, x + 6, y + 6, 46, { zoom: 3, frame: true, bg: '#1a2050' }); rig._talk = false; }
      E.font.text(g, BZ.nameOf(L.who), x + 60, y + 6, '#ffd040', { shadow: '#000' });
      const lines = E.font.wrap(L.text.slice(0, Math.floor(L.t * 40)), w - 70);
      lines.slice(0, 3).forEach((l, i) => E.font.text(g, l, x + 60, y + 18 + i * 11, '#ffffff', { shadow: '#000' }));
      const I = BZ.game.input;
      BZ.drawPrompts(g, I, [['south', 'NEXT'], ['east', C.skipT > 0 ? 'SKIP ' + Math.round(C.skipT * 100) + '%' : 'HOLD TO SKIP']], x + w - 4, y + 60, { align: 'right', size: 9, panel: false });
      if (C.skipT > 0) BZ.hud.ring(g, x + w - 30, y + 64, 7, '#ffd040');
    }
  },
  /* ---- the director: bus events -> lines, stamps, the umpire, the PA ---- */
  install(M) {
    const on = (e, f) => M.unsub.push(BZ.bus.on(e, f));
    const H = BZ.hud;
    on('batterUp', d => { if (!M.fast && !M.attract) this.pa(d.batter); else if (M.attract) BZ.hud.info = { text: '#' + d.batter.num + '  ' + d.batter.name.toUpperCase(), t: 0, color: '#ffd040' }; });
    on('playBall', () => { this.say('play_ball', {}, 2); this.ump('play'); H.stamp('PLAY BALL!', { prio: 2 }); });
    on('call', d => {
      if (d.kind === 'strike') { if (d.three) { this.ump('three'); H.stamp(d.how === 'looking' ? 'STEE-RIKE THREE!' : 'STRUCK OUT!', { prio: 2, colors: ['#ffffff', '#ff8a8a', '#c81a1a'] }); } else { this.ump('strike'); H.stamp('STEE-RIKE!', { colors: ['#ffffff', '#ff8a8a', '#c81a1a'] }); this.say(d.how === 'swinging' ? 'strike_swinging' : 'strike_called'); } }
      else if (d.kind === 'ball') { this.ump('ball'); H.stamp('BALL', { scale: 2, colors: ['#ffffff', '#8affb0', '#1a8a4a'] }); this.say('ball'); }
      else if (d.kind === 'foul') { this.ump('foul'); H.stamp('FOUL BALL', { scale: 2, colors: ['#ffffff', '#ffe08a', '#c8901a'] }); this.say('foul'); }
    });
    on('release', d => { H.feedback = null; H.info = { text: (BZ.PITCHES[M.ab.type] || {}).short + '  ' + d.speed + ' MPH' + (d.slot === 'r1' ? '!!' : ''), t: 0, color: d.slot === 'r1' ? '#ff7a1a' : '#ffffff' }; if (d.perfect && BZ.ctl.who(M, BZ.defense(M).side, 'pitch')) H.feedback = { text: 'PERFECT RELEASE!', color: '#5affd0', t: 0 }; });
    on('swing', d => { const fb = (BZ.game.settings && BZ.game.settings.timing !== false) || M.difficulty === 'rookie' || M.mode === 'training'; if (fb && BZ.ctl.who(M, BZ.offense(M).side, 'bat')) H.feedback = { text: d.kind === 'miss' ? (Math.abs(d.ms) > 300 ? 'NO CONTACT' : (d.ms < 0 ? 'EARLY ' : 'LATE ') + Math.abs(d.ms) + ' MS') : d.feedback, sub: d.feedback2, color: d.grade === 'PERFECT' ? '#5affd0' : d.grade === 'GOOD' ? '#ffd040' : '#ffffff', t: 0 }; });
    on('strikeout', () => this.say('strikeout', {}, 2));
    on('walk', () => { this.ump('four'); H.stamp('BALL FOUR', { prio: 2, colors: ['#ffffff', '#8affb0', '#1a8a4a'] }); this.say('walk', {}, 2); });
    on('hbp', () => { H.stamp('HIT BY PITCH!', { prio: 2 }); this.say('hbp', {}, 2); });
    on('hit', d => {
      if (d.dead) return;
      const tag = d.bases === 1 ? 'single' : d.bases === 2 ? 'double' : d.bases === 3 ? 'triple' : 'inside';
      H.stamp(['', 'BASE HIT!', 'DOUBLE!', 'TRIPLE!', 'INSIDE THE PARK!'][d.bases], { prio: 2, colors: ['#ffffff', '#9ae0ff', '#2a7ad8'] });
      this.say(tag, {}, d.bases >= 3 ? 3 : 2);
    });
    on('homer', d => {
      const slam = d.runs >= 4;
      H.stamp(d.batzooka ? 'BATZOOKA!!!' : slam ? 'GRAND SLAM!' : 'HOME RUN!', { prio: 3, scale: 4, dur: 2.4, sub: d.dist + ' FEET' + (d.pole ? '  OFF THE POLE!' : '') });
      this.say(d.batzooka ? 'batzooka_hit' : slam ? 'grandslam' : 'homer', { dist: d.dist }, 3);
    });
    on('groundRuleDouble', () => { H.stamp('GROUND-RULE DOUBLE', { prio: 2, scale: 2 }); this.say('double', {}, 2); });
    on('batzookaArmed', () => { H.stamp('BATZOOKA ARMED!', { prio: 2, colors: ['#fff6c0', '#ff9a2a', '#c8301a'] }); });
    on('meterFull', d => { if (M.mode !== 'derby') { this.say('batzooka_ready', {}, 2); H.toast(M.teams[d.side].def.nick + ': BATZOOKA READY!'); } });
    on('batzookaFizzle', () => { H.stamp('FIZZLE!', { prio: 3, colors: ['#e0e0e0', '#8a8a8a', '#4a4a4a'] }); this.say('batzooka_fizzle', {}, 3); BZ.sfx('fizzle'); });
    on('super', d => { if (d.kind === 'pitch') { H.stamp(BZ.PITCHES[d.type].short + '!', { prio: 3, colors: ['#fff6c0', '#ff6aff', '#7a1ad8'] }); this.say('super_pitch', {}, 3); } else if (d.kind === 'laser') { H.stamp('LASER ARM!', { prio: 3, colors: ['#ffffff', '#ff5a5a', '#c81a1a'] }); this.say('laser', {}, 3); } else if (d.kind === 'afterburners') { H.stamp('AFTERBURNERS!', { prio: 3 }); this.say('afterburners', {}, 3); } });
    on('catch', d => { if (d.fly && d.wall) { H.stamp('ROBBED!', { prio: 3, scale: 4, colors: ['#ffffff', '#ffd040', '#c8501a'] }); this.say('robbery', {}, 3); } else if (d.dive && d.fly) { H.stamp('WHAT A GRAB!', { prio: 3 }); this.say('catch_dive', {}, 3); } else if (d.fly) { this.say('fly_out', {}, 1); } });
    on('out', d => { if (d.how === 'fly' || d.how === 'force' || d.how === 'tag' || d.how === 'doubled') { this.ump('out'); if (d.how !== 'fly' || true) H.stamp('YER OUT!', { prio: 2, colors: ['#ffffff', '#ff8a8a', '#c81a1a'] }); } });
    on('runnerOut', d => { if (d.how === 'force' && d.base === 1) this.say('ground_out', {}, 1); if (M.play && M.play.kind === 'steal') this.say('caught_stealing', {}, 2); if (M.play && M.play.kind === 'pickoff') this.say('pickoff', {}, 2); });
    on('safeFirst', () => { if (M.play && M.play.outs.length === 0) { /* the hit stamp comes at the end of the play */ } });
    on('doublePlay', d => { H.stamp(d.triple ? 'TRIPLE PLAY!' : 'DOUBLE PLAY!', { prio: 3 }); this.say(d.triple ? 'triple_play' : 'double_play', {}, 3); });
    on('error', () => { H.stamp('ERROR!', { prio: 2, scale: 2, colors: ['#ffffff', '#ffb0b0', '#a81a1a'] }); this.say('error', {}, 2); });
    on('steal', d => { if (d.ok) { H.stamp('STOLEN BASE!', { prio: 2 }); this.say('steal_safe', {}, 2); } });
    on('bowlOver', d => { H.stamp('COLLISION!', { prio: 3, scale: 4 }); this.say('bowl_over', {}, 3); });
    on('tagUp', () => this.say('tag_up', {}, 2));
    on('wildPitch', () => { H.stamp('WILD PITCH!', { prio: 2, scale: 2 }); this.say('wild_pitch', {}, 2); });
    on('walkoff', () => { H.stamp('WALK-OFF!', { prio: 3, scale: 4, dur: 3 }); this.say('walkoff', {}, 3); });
    on('leadChange', () => this.say('lead_change', {}, 2));
    on('halfEnd', () => this.say('side_retired', {}, 1));
    on('rallyCap', () => { H.stamp('RALLY CAP!', { prio: 3, scale: 4 }); this.say('rally_cap', {}, 3); });
    on('foulTip', () => { this.ump('foul'); H.stamp('FOUL TIP', { scale: 2, colors: ['#ffffff', '#ffe08a', '#c8901a'] }); });
    on('gameEnd', d => { if (d.winner >= 0) this.say('game_win', { team: M.teams[d.winner].def.nick.charAt(0) + M.teams[d.winner].def.nick.slice(1).toLowerCase() }, 3); });
    on('suddenBoom', () => { H.stamp('SUDDEN BOOM!', { prio: 3, scale: 4, dur: 2.5, sub: 'A HOME RUN DUEL DECIDES IT' }); });
    on('hazard', d => { if (!M.hazardFirst[d.kind]) { M.hazardFirst[d.kind] = true; } this.say('hazard_' + d.kind, {}, 3); if (d.stamp) H.stamp(d.stamp, { prio: 3 }); });
  }
};
