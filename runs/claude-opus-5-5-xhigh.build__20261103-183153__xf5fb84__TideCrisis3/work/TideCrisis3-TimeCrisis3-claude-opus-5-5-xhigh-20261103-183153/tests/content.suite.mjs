// content suites: the validators over every stage (ids, exposed peeks visible from the slots), the cutscenes
export default {
  content(t) {
    const { TC } = t.load(), V3 = TC.V3;
    const errs = TC.validateContent(); t.check('validators: every id resolves', errs.length === 0, errs.slice(0, 4).join('; '));
    // every cover point's exposed head (an 'up' peek) can be seen from slot 1's stand pose (or slot 2's)
    for (const st of Object.values(TC.REG.stage)) {
      const sim = new TC.Sim({ mode: 'stage', stage: st.id, seed: 1, skipIntro: true });
      for (let k = 0; k < st.scenes.length; k++) {
        const sc = TC.REG.scene[st.scenes[k]]; if (sc.carrier || sc.boss) continue;
        sim.startScene(k, true);
        for (const cv of sc.coverList) {
          if (cv.noCheck) continue;
          const side = m => { const k = m === 'left' ? -12 : m === 'right' ? 12 : 0; return [cv.at[0] - Math.sin(cv.face) * k, cv.at[1] + Math.cos(cv.face) * k, cv.at[2] + 27]; };
          const seen = cv.peek.some(m => { const head = side(m); return [0, 1].some(i => { const c = sim.slotPose(i, 0), o = [c.x, c.y, c.z], d = V3.sub(head, o), L = V3.len(d), w = sim.rayWorld({ o, d: V3.mul(d, 1 / L) }, L, false); const a = TC.worldToAim(c, head); return (!w || w.t > L - 4) && a && Math.abs(a[0]) < 1.7 && Math.abs(a[1]) < .95; }); });
          let why = ''; if (!seen) { const c = sim.slotPose(0, 0), o = [c.x, c.y, c.z], head = side(cv.peek[0]), d = V3.sub(head, o), L = V3.len(d), w = sim.rayWorld({ o, d: V3.mul(d, 1 / L) }, L, false), a = TC.worldToAim(c, head); why = 'aim ' + (a ? a[0].toFixed(2) + ',' + a[1].toFixed(2) : '-') + ' block ' + (w ? w.t.toFixed(0) + '/' + L.toFixed(0) + ' ' + (w.col.box ? w.col.box.map(v => v.toFixed(0)).join(',') : w.col.impact) : '-'); }
          t.check(sc.id + ' cover ' + cv.id + ': the exposed head is visible', seen, why);
        }
      }
    }
    // the hub's slots 3 and 4 exist and differ
    for (const sc of Object.values(TC.REG.scene)) t.check(sc.id + ': 4 slots', sc.slots && sc.slots.length === 4);
  },
  // the lighthouse (2-4, 2-B) and the tower roof (3-B), measured from bot runs: the plan's spiral-stair climb with
  // deckhands above, the helipad behind the parapet, the control room behind the consoles
  lighthouse(t) {
    const { TC } = t.load(), V3 = TC.V3, S = TC.LHS, LH = TC.LH, TAU = Math.PI * 2, R = p => Math.hypot(p[0] - LH[0], p[1] - LH[1]);
    t.check('the outside stair rises from the courtyard (z 400) to the gallery (z 544) in more than 1.5 turns', Math.abs(TC.stairAt(0)[2] - 400) < .01 && Math.abs(TC.stairAt(S.sEnd)[2] - 544) < .01 && S.sEnd / TAU > 1.5);
    const sim = new TC.Sim({ mode: 'stage', stage: 2, scene: '2-4', seed: 5, skipIntro: true, cheats: { god: true } }), bot = new TC.Autopilot('expert');
    const climb = [], ride = [], foes = new Map(); let tA = null, tB = null, landingCue = false;
    for (let i = 0; i < 120 * 240; i++) {
      sim.step(1 / 120, [bot.command(sim, 0, 1 / 120)]);
      for (const e of sim.drain()) if (e.type === 'cue' && e.name === 'landing') landingCue = true;
      const c = sim.cameraFor(0);
      if (sim.scene.id === '2-4' && sim.climbing()) { if (tA === null) tA = sim.timer; if (i % 12 === 0) climb.push([c.x, c.y, c.z]); tB = sim.timer; }
      if (sim.scene.id === '2-B' && sim.phase === 'travel' && i % 12 === 0) ride.push([c.x, c.y, c.z]);
      if (sim.scene.id === '2-4') for (const e of sim.enemies) if (e.cover && e.cover.stair && e.alive && e.state !== 'enter' && e.state !== 'relocate' && !foes.has(e.id)) {
        const h = e.vols && e.vols.head ? e.vols.head.c : [e.x, e.y, e.z + 27], o = [c.x, c.y, c.z], d = V3.sub(h, o), L = V3.len(d), w = sim.rayWorld({ o, d: V3.mul(d, 1 / L) }, L, false);
        foes.set(e.id, { e, pos: [e.x, e.y, e.z, h[2], c.x, c.y, c.z].map(v => v.toFixed(0)).join(','), up: h[2] - c.z, pitch: Math.atan2(h[2] - c.z, Math.hypot(h[0] - c.x, h[1] - c.y)) / (Math.PI / 180), clear: !w || w.t > L - 4, why: w ? w.t.toFixed(0) + '/' + L.toFixed(0) + ' ' + (w.col.box ? w.col.box.map(v => v.toFixed(0)).join(',') : '') : '', onStair: Math.abs(R([e.x, e.y]) - S.r) < 8 });
      }
      if (sim.scene.id === '2-B' && sim.phase === 'action') break;
    }
    const onBand = climb.filter(p => Math.abs(R(p) - S.r) < 9);
    t.check('2-4: the players climb the stair mid-fight', climb.length > 10 && onBand.length > climb.length * .6 && climb[climb.length - 1][2] - climb[0][2] > 40, climb.length + ' samples, ' + onBand.length + ' on the stair, rise ' + (climb.length ? (climb[climb.length - 1][2] - climb[0][2]).toFixed(0) : '-'));
    t.check('2-4: the clock stops while they climb', tA !== null && tA === tB, tA + ' -> ' + tB);
    t.check('2-4: reaching the landing starts the stair wave', landingCue);
    const F = [...foes.values()];
    t.check('2-4: two deckhands on the stair above the landing', F.length === 2 && F.every(f => f.onStair && f.up > 30), F.map(f => 'up ' + f.up.toFixed(0) + (f.onStair ? ' on stair' : ' off')).join(', '));
    t.check('2-4: the players shoot upward at them (pitch over 20 degrees), in plain sight', F.length === 2 && F.every(f => f.pitch > 20 && f.clear), F.map(f => f.pos + ' ' + f.pitch.toFixed(0) + ' deg ' + (f.clear ? 'clear' : 'blocked ' + f.why)).join(', '));
    t.check('2-4: the bot shoots both off the stair', F.length === 2 && F.every(f => !f.e.alive));
    let swept = 0; for (let k = 1; k < ride.length; k++) { const a0 = Math.atan2(ride[k - 1][1] - LH[1], ride[k - 1][0] - LH[0]), a1 = Math.atan2(ride[k][1] - LH[1], ride[k][0] - LH[0]); swept += Math.abs(((a1 - a0) % TAU + TAU + Math.PI) % TAU - Math.PI) * (R(ride[k]) > 40 ? 1 : 0); }
    t.check('2-B: the ride climbs the rest of the stair, round the tower, to the gallery', ride.length > 10 && swept > 300 * (Math.PI / 180) && ride[0][2] < 500 && ride[ride.length - 1][2] > 560, ride.length + ' samples, swept ' + (swept / (Math.PI / 180)).toFixed(0) + ' deg, z ' + (ride[0] ? ride[0][2].toFixed(0) : '-') + ' -> ' + (ride.length ? ride[ride.length - 1][2].toFixed(0) : '-'));
    t.check('2-B: the ride never passes through the tower or the gallery floor', ride.every(p => R(p) > 36 && !(R(p) < 73 && p[2] > 530 && p[2] < 550)), ride.filter(p => R(p) <= 36 || (R(p) < 73 && p[2] > 530 && p[2] < 550)).slice(0, 2).map(p => p.map(v => v.toFixed(0)).join(',')).join(' | '));
    // 3-B: Scylla on the helipad, the players behind the roof parapet; then Krake among the consoles, the players behind them
    const s3 = new TC.Sim({ mode: 'stage', stage: 3, scene: '3-B', seed: 5, skipIntro: true, cheats: { god: true } }), b3 = new TC.Autopilot('expert');
    let ph1 = [], ph2 = [], cam1 = null, cam2 = null, finalShot = false, won = false;
    for (let i = 0; i < 120 * 200; i++) {
      s3.step(1 / 120, [b3.command(s3, 0, 1 / 120)]);
      for (const e of s3.drain()) { if (e.type === 'final') finalShot = true; }
      const B = s3.boss; if (B && !B.dead && i % 60 === 0) { if (B.phase === 1) { ph1.push(B.pos.slice()); cam1 = cam1 || [s3.slotPose(0, 0), s3.slotPose(0, 1)]; } else if (B.kstate !== 'enter' && !s3.slotBlend) { ph2.push([B.kx, B.ky]); cam2 = cam2 || [0, 1, 2, 3].map(k => [s3.slotPose(k, 0), s3.slotPose(k, 1)]); } }
      if (s3.phase === 'done' || s3.scene.id !== '3-B' || (B && B.dead && s3.dir.clear())) { won = !!(B && B.dead); break; }
    }
    const roof = 300, pad = [1550, 60];
    t.check('3-B phase 1: Scylla fights on the helipad', ph1.length > 5 && ph1.every(p => Math.hypot(p[0] - pad[0], p[1] - pad[1]) < 70), ph1.map(p => Math.hypot(p[0] - pad[0], p[1] - pad[1]).toFixed(0)).slice(0, 8).join(','));
    t.check('3-B phase 1: the players stand behind the roof parapet, and duck below it', cam1 && cam1[0].x > 1404 && cam1[0].x < 1420 && cam1[1].z < roof + 16 && cam1[0].z > roof + 16, cam1 && cam1.map(c => c.x.toFixed(0) + ',' + c.z.toFixed(0)).join(' '));
    const consoles = TC.CONSOLES;
    t.check('3-B phase 2: Krake fights in the control room, among the consoles', ph2.length > 3 && ph2.every(p => p[0] > 1440 && p[0] < 1600 && p[1] > -120 && p[1] < -40), ph2.slice(0, 6).map(p => p.map(v => v.toFixed(0)).join(',')).join(' | '));
    t.check('3-B phase 2: the players are in the control room, ducking behind consoles', cam2 && cam2.every(([st, cv]) => st.x > 1440 && st.x < 1600 && st.y > -120 && st.y < -40 && cv.z < roof + 16 && consoles.some(c => Math.abs(c[1] - cv.y) < 8 && c[0] - cv.x > 0 && c[0] - cv.x < 16)), cam2 && cam2.map(([st, cv]) => [cv.x, cv.y, cv.z].map(v => v.toFixed(0)).join(',')).join(' | '));
    t.check('3-B: the FINAL SHOT comes, and lands', finalShot && won, 'final ' + finalShot + ' won ' + won);
  },
  story(t) {
    const { TC } = t.load();
    for (const id of Object.keys(TC.REG.cutscene)) {
      const s = new TC.Sim({ mode: 'stage', stage: 1, seed: 1, skipIntro: true }); let done = false;
      TC.startCut(s, id, () => { done = true; }); for (let i = 0; i < 120 * 90 && !done; i++) s.step(1 / 120, []);
      t.check('cutscene ' + id + ' runs to its end headless', done);
      const s2 = new TC.Sim({ mode: 'stage', stage: 1, seed: 1, skipIntro: true }); let d2 = false; TC.startCut(s2, id, () => { d2 = true; }); for (let i = 0; i < 120 && !d2; i++) s2.step(1 / 120, [{ aim: [0, 0], fireDown: true, firePressed: i === 0 }]);
      t.check('cutscene ' + id + ': holding skips it', d2);
      for (const st of TC.REG.cutscene[id].steps) if (st.say) t.check(id + ': speaker ' + st.say[0], !!TC.REG.speaker[st.say[0]]);
    }
    for (const st of [1, 2, 3]) { const S = TC.REG.stage[st]; t.check('stage ' + st + ' briefing', S.briefing && S.briefing.length >= 2 && S.briefing.every(b => TC.REG.speaker[b[0]])); }
    t.check('voice durations positive', Object.keys(TC.REG.speaker).every(id => TC.lineDur('Test line for ' + id + '!', id) > 0));
    const s = new TC.Sim({ mode: 'arcade', stage: 1, seed: 1 }); t.check('an arcade run opens on the stage intro', !!s.cut && s.cut.id === 'c1-intro');
  }
};
