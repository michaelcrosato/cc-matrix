/* 43-stage: small interiors in the brawler view, framed on the left of the screen, with a system's DOM panel on the
   right: the box (Corey, Rook), the kitchen (Pigeon), the wire room, chambers (the judge), and scenes of pure talk
   (Mama B's back room, Central Booking). */
const STAGE_CAST = {
  box: { corey: [['corey', 3.5, 1.9, Math.PI / 2, 'sit'], ['dana', 2.6, 3.3, -Math.PI / 2], ['lou', 4.9, 3.2, -Math.PI / 2 - .4, 'hips']], rook: [['rook', 3.5, 1.9, Math.PI / 2, 'sit'], ['dana', 2.6, 3.3, -Math.PI / 2], ['lou', 4.9, 3.2, -Math.PI / 2, 'hips']] },
  kitchen: { pigeon: [['pigeon', 3.5, 1.8, Math.PI / 2, 'sit'], ['dana', 3.5, 3.1, -Math.PI / 2, 'sit'], ['odessa', 5.4, 2.2, -Math.PI / 2 - .5, 'sweep']] },
  wire: { _: [['hal', 2.6, 2.6, -Math.PI / 2, 'sit'], ['dana', 4.6, 2.7, -Math.PI / 2, 'sit']] },
  chambers: { _: [['halloway', 4, 1.1, Math.PI / 2, 'sit'], ['vance', 3, 3, -Math.PI / 2], ['dana', 5, 3, -Math.PI / 2]] },
  backroom: { easy: [['easy', 4, 1.6, Math.PI / 2, 'sit'], ['lonnie', 6.2, 1.9, Math.PI, 'hips'], ['tee', 4, 3.1, -Math.PI / 2]] },
  booking: { i5: [['tee', 3.5, 1.9, Math.PI / 2, 'sit'], ['harstad', 3.5, 3.2, -Math.PI / 2, 'sit']] }
};
const STAGE_SCENES = {
  easy: [['easy', 'Sit down, Terrence.'], ['tee', 'I\'d rather stand.'], ['easy', 'I didn\'t ask what you\'d rather.'], () => { const t = Stage.byId('tee'); if (t) { t.place(4 * T, 2.9 * T); t.pose = 'sit'; } },
    ['easy', 'You lost my package to a man who drives a hearse.'], ['tee', 'Sunday hit the boy right after the drop. Nobody could\'ve—'], ['easy', 'Somebody knew where the drop was. Somebody always knows. That\'s the cost of doing business outside.'],
    ['easy', 'You know why they call me Easy? Because I never make anything hard that doesn\'t have to be. Make it back, Terrence. By the count.'], ['lonnie', 'And the phones.'],
    ['easy', 'The phones. Lonnie says you like the payphones.'], ['tee', 'Payphones don\'t have names on \'em.'], ['easy', 'Everything has a name on it. Stop using them.'],
    () => { const t = Stage.byId('tee'); if (t) { t.pose = null; t.goTo(4 * T, 4.6 * T, 30); } }, { wait: 1.2 }, ['easy', 'He\'s smart. Smart gets you so far.']],
  i5: [() => F().path === 'A' ? [['harstad', 'I\'m not your lawyer, Terrence. I\'m the man your lawyer works for, this morning.'], ['harstad', 'Easy says your mother\'s rent is paid through spring.'], ['tee', '...And after spring?'], ['harstad', 'That depends on what you remember, doesn\'t it.'],
    { who: 'tee', text: 'Take the weight, or talk?', choices: [{ label: 'Take the weight', do: () => { F().i5 = 'weight'; return [['tee', 'I don\'t remember nothing. Tell him that.']]; } }, { label: 'Talk', do: () => { F().i5 = 'talk'; return [['tee', 'Get me the State\'s Attorney. Not you. Her.']]; } }] }] : []]
};
const Stage = {
  agents: [], byId(id) { return this.agents.find(a => a.person === id); }
};
scenes.stage = withGlobals({
  view: 'brawler', views: ['brawler'], pausable: true, camera: false,
  enter(d) {
    const b = this.b = d.beat, room = this.room = b.room; World.cur = roomMap(room); Stage.agents = [];
    World.setTOD(room === 'wire' || room === 'backroom' || STATE.ep >= 3 && room !== 'chambers' ? 'interiorNight' : 'interior'); game.weather = null;
    const cast = (STAGE_CAST[room] || {})[b.ref] || (STAGE_CAST[room] || {})._ || [];
    for (const [id, x, y, f, pose] of cast) { const a = new Agent({ person: id, x: x * T, y: y * T }); a.facing = f; a.pose = pose || null; a.ghost = true; Stage.agents.push(a); Talk.cast[id] = a.rig; }
    if (room === 'booking') { const h = Stage.byId('harstad'); if (h) h.rig.C.coat = '#2a2a30'; }
    const side = ['box', 'kitchen', 'wire'].includes(room) || b.system === 'box' || b.system === 'kitchen';
    game.cam.bounds = null; game.cam.offset = side ? [-Math.round(game.W * .31), 0] : [0, 0]; game.setZoom(side ? 1.9 : 1.7);
    const R = ROOMS[room]; this.cx = (R.rows[0].length / 2) * T; this.cy = (R.rows.length / 2) * T; game.focus(this.cx, this.cy, 12); game.cam.snap = true;
    Amb.set({ box: 'box', kitchen: 'kitchen', wire: 'wire', chambers: 'chambers', backroom: 'chambers', booking: 'box' }[room] || 'annex');
    Snd.music({ box: 'wire', kitchen: 'gospel', wire: 'wire', chambers: 'theme', backroom: 'corner', booking: 'montage' }[room] || 'theme');
    const done = res => Director.done(res);
    game.after(.5, () => {
      const sys = b.system;
      if (sys === 'box') Box.start(b.ref, st => { if (!F().coreyCI && st.beats && st.beats.B3) Toast('Corey goes to Central', 'Possession with intent. No deal.'); done(st); });
      else if (sys === 'kitchen') Box.start('pigeon', st => done(st));
      else if (sys === 'rookbox') RookBox.start(() => done());
      else if (sys === 'wire') Wire.start(b.ref, r => done(r));
      else if (sys === 'chambers') Chambers.start(r => done(r));
      else if (sys === 'scene') Talk.play(STAGE_SCENES[b.ref] || [], () => { if (b.ref === 'easy') addFact('easy:met', true); done(); });
    });
  },
  exit() { game.cam.offset = null; Talk.cast = {}; World.cur = World.map; game.setZoom(1); },
  update(dt) {
    Talk.update(dt);
    for (const a of Stage.agents) { a.update(dt); const talking = (Talk.open && Talk.who === a.person) || (Box.speaker === a.person && Box.typer) || (Wire.cur && Wire.cur.speaker === a.person && this.room === 'wire' && false); a.expr = talking ? 'shout' : null; }
    const h = Stage.byId('hal'); if (h && Wire.cur) h.pose = Wire.cur.min ? 'sit' : 'sit';
    game.focus(this.cx, this.cy, 12);
  },
  draw(r) {
    drawRoom(r, this.room, (r2, m) => {
      if (this.room === 'wire') { const turning = Wire.cur && !Wire.cur.min; r.queue(2.6 * T, 1.75 * T, 16, g => { for (const dx of [-3.5, 3.5]) { const [sx, sy] = r.w(2.6 * T + dx, 1.6 * T + 4.3, 15); const a = turning ? game.real * 6 : 0; for (let k = 0; k < 4; k++) { const an = a + k * Math.PI / 2; px.dot(g, Math.round(sx + Math.cos(an) * 2), Math.round(sy + Math.sin(an) * 2), '#2a2a2a'); } } }, { bias: 3 }); game.lights.add(5 * T, 1.6 * T, 10, 44, .9, { color: '#5aff8a' }); }
      if (this.room === 'kitchen') game.lights.add(2 * T, .8 * T, 24, 60, .6, { color: '#c8d8ff' });
      if (this.room === 'chambers') game.lights.add(3 * T, 1.6 * T, 20, 50, .8, { color: '#ffc880' });
    });
    for (const a of Stage.agents) drawAgent(r, a);
    Talk.draw(r);
  }
});
