// The operation scene: reads the devices, steps the sim, turns its events into sound, particles and rumble, and paints the field.
(() => {
const E = My3D2dge, G = (window.GAME ||= {}), { px } = E, Pix = G.Pix, U = G.U, T = G.TUNING;
const POP = { Textbook: { color: '#ffe27a', scale: 2, life: 1.1 }, Clean: { color: '#d8fff0', scale: 1, life: .9 }, Sloppy: { color: '#ffa890', scale: 1, life: .9 } };

/** what one local player's device says this step */
function readDevice(game, I, L, S, h, OX, OY, first) {
  const has = a => I.map && I.map[a], DN = a => has(a) && I.down(a), PR = a => has(a) && I.pressed(a);
  const set = game.settings, swap = !!set.swapSticks;
  const zero = [0, 0], aim = swap ? (I.padMove || zero) : (I.padAim || zero), wheelStick = swap ? (I.padAim || zero) : (I.padMove || zero);
  // which device aims: the mouse once it moves or clicks, until a stick or a move key is used
  if (first) { if (I.mouse.t !== L.mouseT) { L.mouseT = I.mouse.t; L.mouseMode = true; } }
  const keys = [(DN('curR') ? 1 : 0) - (DN('curL') ? 1 : 0), (DN('curD') ? 1 : 0) - (DN('curU') ? 1 : 0)];
  if (Math.hypot(aim[0], aim[1]) > .05 || keys[0] || keys[1]) L.mouseMode = false;
  const p = first && L.mouseMode ? I.pointer() : null;
  const fine = (has('fine') && I.value('fine') > .25) || DN('fine');
  let trig = I.value('useTool'); if (I.down('useTool')) trig = Math.max(trig, I.lastDevice === 'gamepad' ? Math.max(trig, (I.padValues[7] || 0) > 0 ? trig : 1) : 1);
  // sustained tools can toggle
  const tool = L.c.tool, sustained = tool === 'salve' || tool === 'cautery' || tool === 'suction' || tool === 'sonar';
  if (set.sustain === 'toggle' && sustained) { if (trig >= .3 && !L.trigWas) L.toggle = !L.toggle; L.trigWas = trig >= .3; trig = L.toggle ? 1 : 0; } else { L.toggle = false; L.trigWas = trig >= .3; }
  let step = 0; if (PR('toolPrev')) step--; if (PR('toolNext')) step++;
  let digit = -1; for (let i = 0; i < 8; i++) if (PR('tool' + (i + 1))) digit = i;
  const shock = I.lastDevice === 'gamepad' ? (DN('fine') && DN('useTool')) : DN('useTool');
  return { stick: aim, fine, keys, nudge: [(DN('nudgeR') ? 1 : 0) - (DN('nudgeL') ? 1 : 0), (DN('nudgeD') ? 1 : 0) - (DN('nudgeU') ? 1 : 0)], mouse: p ? [p[0] - OX, p[1] - OY] : null, assist: set.assist, speed: set.cursor,
    wheelStick, step, digit, mouseHold: first && DN('wheelHold'), mousePos: first && I.pointer() ? [I.pointer()[0] - OX, I.pointer()[1] - OY] : [L.c.x, L.c.y], trig, shock, gift: DN('gift'), consult: DN('consult'), cancel: PR('dropIt') };
}

const Scene = G.OpScene = {
  readDevice,
  /** a run's view state, kept outside S */
  makeView(game) { const n = 110; return { t: 0, trace: new Array(n).fill(0), traceI: 0, traceAcc: 0, popups: [], bark: null, barkQ: [], barkCool: 0, slipFlash: 0, vignette: 0, input: game.input, hintT: 0, hintTool: null, flash: 0, sparkT: 0, ghosts: null, input2: null, lastPhase: -1, ribbon: false, devTag: false, loops: {}, recent: {}, lowT: 0, stampT: 0 }; },
  drainEvents(game, S, V, o = {}) {
    const ev = S.ev; if (!ev || !ev.length) return; const OX = V.OX, OY = V.OY, P = game.particles, I = game.input, Sfx = G.Sfx, rum = (a, b) => { if (!o.mute) I.rumble(a, b); };
    for (const e of ev) {
      const k = e[0];
      switch (k) {
        case 'grade': { const c = POP[e[3]]; V.popups.push({ x: e[1], y: e[2] - 6, text: e[3], color: c.color, scale: c.scale, life: c.life, t: c.life }); if (e[3] === 'Textbook') { Sfx.chime(); P.glints(e[1] + OX, e[2] + OY, 0, 8, '#ffe27a'); rum(.2, .05); } else if (e[3] === 'Clean') Sfx.cleanTick(); else Sfx.sloppy(); break; }
        case 'slip': { V.slipFlash = .25; Sfx.thud(); Sfx.sigh(); rum(.6, .12); game.shake(1.5); V.popups.push({ x: e[1], y: e[2] - 10, text: 'SLIP', color: '#ff6a5a', scale: 1, life: .8, t: .8 }); break; }
        case 'tear': Sfx.tear(); P.bits(e[1] + OX, e[2] + OY, 0, 14, ['#c81e1e', '#8e1414', '#ff4a3a']); game.freeze(.04); game.shake(2); rum(.5, .1); Scene.say(V, S, 'tear'); break;
        case 'swap': Sfx.clack(); Sfx.palm(); rum(.15, .03); Scene.barkTool(V, S, e[1]); break;
        case 'grip': Sfx.tick(); rum(.15, .04); P.glints(e[1] + OX, e[2] + OY, 0, 2, '#ffffff'); break;
        case 'snip': Sfx.tick(); break;
        case 'free': P.bits(e[1] + OX, e[2] + OY, 0, 6, ['#c81e1e', '#ff4a3a']); Sfx.tick(); rum(.2, .04); break;
        case 'dish': Sfx.clink(); rum(.3, .05); break;
        case 'drop': Sfx.tick(); break;
        case 'cutStart': Sfx.needle(); break;
        case 'blade': { const L = Sfx.loop('blade'); if (L) { L.set(.05 + e[3] * .12, e[3]); V.loops.blade = .05; } rum(.1, .03); if (e[3] > .3 && Math.random() < .3) P.bits(e[1] + OX, e[2] + OY, 0, 1, ['#c81e1e']); break; }
        case 'cutDone': Sfx.tone(1200, 1500, .1, 'sine', .1); break;
        case 'slash': Sfx.noise(.1, 5200, 1200, 1, .4); P.sparks(e[1] + OX, e[2] + OY, 0, 8, Math.random() * 6.28); rum(.3, .05); break;
        case 'needle': Sfx.needle(); break;
        case 'stitch': { V.stitchN = (V.stitchN || 0) + 1; Sfx.twang(V.stitchN % 6); rum(.25, .05); P.glints(e[1] + OX, e[2] + OY, 0, 2, '#5ad0ff'); break; }
        case 'loose': Sfx.loose(); V.popups.push({ x: e[1], y: e[2] - 8, text: e[4] === 'beat' ? 'ON THE BEAT' : 'LOOSE', color: '#ffa890', scale: 1, life: .8, t: .8 }); break;
        case 'salve': { const L = Sfx.loop('salve'); if (L) { L.set(.1); V.loops.salve = .05; } if (Math.random() < .15) P.glints(e[1] + OX, e[2] + OY, 0, 1, '#a8ffd8'); break; }
        case 'healed': P.glints(e[1] + OX, e[2] + OY, 0, 10, '#a8ffd8'); Sfx.tone(780, 1560, .22, 'sine', .14); rum(.1, .05); break;
        case 'plunge': Sfx.plunger(); break;
        case 'inject': Sfx.inject(); rum(.1, .1); break;
        case 'iv': Sfx.inject(); V.flash = .2; rum(.1, .1); break;
        case 'bubble': Sfx.bubble(); V.popups.push({ x: e[1], y: e[2] - 10, text: 'AIR!', color: '#ffa890', scale: 1, life: .8, t: .8 }); break;
        case 'burnOn': { const L = Sfx.loop('burn'); if (L) { L.set(.1); V.loops.burn = .05; } rum(.2, .03); break; }
        case 'burn': { const L = Sfx.loop('burn'); if (L) { L.set(.26); V.loops.burn = .05; } if (Math.random() < .35) { P.sparks(e[1] + OX, e[2] + OY, 0, 1, Math.random() * 6.28); P.smoke(e[1] + OX, e[2] + OY, 2, 1, { size: .6, color: '#a0989c' }); } break; }
        case 'lock': Sfx.tone(300, 120, .3, 'square', .12, { lp: 900 }); V.popups.push({ x: e[1], y: e[2] - 12, text: 'TOO HOT', color: '#ffa23c', scale: 1, life: 1, t: 1 }); break;
        case 'suck': { const L = Sfx.loop('suck'); if (L) { const near = Scene.nearPool(S, e[1], e[2]); L.set(near ? .24 : .1, near ? 1 - Math.min(1, near.vol / 120) : .1); V.loops.suck = .05; } rum(.1, .03); break; }
        case 'drained': Sfx.tone(600, 900, .12, 'sine', .1); break;
        case 'sonar': { V.sonarNear = e[4]; V.sonarPan = (e[5] - 213) / 213; V.sonarOn = .05; break; }
        case 'found': Sfx.found(); rum(.2, .06); break;
        case 'grant': break;
        case 'beat': Scene.onBeat(game, S, V); break;
        case 'codeBlue': Sfx.flatline(); G.Music.play('emergency'); rum(.6, .3); game.flash('#ffffff', .08, .5); break;
        case 'shock': Sfx.whine(); Sfx.bang(); game.flash('#ffffff', .2); game.shake(5); rum(1, .35); V.popups.push({ x: 213, y: 120, text: e[1] === 'Textbook' ? 'TEXTBOOK!' : 'CLEAR!', color: '#ffe27a', scale: 3, life: .9, t: .9 }); G.Babble.say('quill', 'Clear!'); break;
        case 'shockMiss': Sfx.miss(); rum(.3, .08); break;
        case 'revive': game.flash('#ffffff', .25); game.shake(4); rum(1, .4); G.Music.play(G.Op.def(S).music || 'op'); break;
        case 'phase': Scene.onPhase(game, S, V, e[1]); break;
        case 'phaseDone': Sfx.tutDone(); V.popups.push({ x: 213, y: 100, text: 'CLEAR', color: '#9fffc0', scale: 2, life: 1, t: 1 }); break;
        case 'tutDone': Sfx.tutDone(); V.popups.push({ x: 213, y: 70, text: 'That is the way of it.', color: '#ffe27a', scale: 1, life: 1.4, t: 1.4 }); break;
        case 'closing': G.Music.stop(); Sfx.stopLoops(); for (const f of [110, 165, 220, 277]) Sfx.tone(f, f, 2.8, 'triangle', .07, { a: .2, hold: .8 }); break;
        case 'stamp': V.stampT = 0; Sfx.stamp(); game.shake(4); rum(.7, .2); if (!o.mute) G.Music.sting('closed'); break;
        case 'closed': break;
        case 'lost': Sfx.stopLoops(); G.Music.stop(); Sfx.flatline(); game.flash('#ff2020', .3, .6); rum(.8, .5); if (e[1] === 'bomb') { P.explosion(213 + OX, 116 + OY, 0, 3, { freeze: false }); game.flash('#ffffff', .6); } break;
        case 'dip': V.slipFlash = .15; Sfx.alarm(); rum(.5, .2); break;
        case 'crash': Sfx.alarm(); G.Music.play('emergency'); rum(.7, .3); game.shake(2); break;
        case 'breath': Sfx.breath(true); G.Music.breath(true); Sfx.tone(180, 90, .6, 'sine', .3); game.flash('#a8e0ff', .15, .4); rum(.3, .2); break;
        case 'breathEnd': Sfx.breath(false); G.Music.breath(false); Sfx.tone(90, 180, .3, 'sine', .25); break;
        case 'giftNo': Sfx.tone(160, 150, .1, 'square', .1, { lp: 700 }); Scene.say(V, S, 'giftNo'); break;
        case 'rewind': { Sfx.breath(false); Sfx.silence(S.silent > 0); V.quiet = S.silent > 0; G.Music.breath(false); Sfx.tape(false); rum(.5, .4); V.rewindKind = e[1]; game.flash('#e0f0ff', .1, .4); if (V.bark) G.Babble.reversed(V.bark.who, V.bark.text); if (e[1] === 1) { Sfx.swell(); V.popups.push({ x: 213, y: 90, text: 'FROM THE TOP', color: '#5ff0e0', scale: 2, life: 1.4, t: 1.4 }); } V.popups = V.popups.filter(p => p.life > 1.2); break; }
        case 'consult': Sfx.clack(); Scene.barkConsult(V, S, e[1]); break;
        case 'music': G.Music.play(e[1]); break;
        case 'clockAdd': V.popups.push({ x: 370, y: 36, text: (e[1] > 0 ? '+' : '') + e[1] + 's', color: e[1] > 0 ? '#9fffc0' : '#ff6a5a', scale: 1, life: 1.2, t: 1.2 }); break;
        case 'shake': game.shake(e[1]); rum(.7, .4); break;
        case 'dim': if (e[1] > 0) { Sfx.tone(120, 40, .5, 'sawtooth', .2, { lp: 500 }); Sfx.noise(.3, 800, 200, 1, .2); } break;
        case 'nerve': Sfx.tone(1800, 200, .2, 'square', .12, { lp: 3000 }); game.flash('#f4d860', .08, .4); break;
        case 'domeNo': Sfx.domeNo(); Scene.say(V, S, 'dome'); break;
        case 'retry': { Sfx.tutDone(); const on = S.silent > 0; Sfx.breath(false); Sfx.silence(on); G.Choir.mute(false); V.quiet = on; V.bark = null; G.Music.play(on ? null : (G.Op.phaseDef(S).music || G.Op.def(S).music || 'op')); break; }
        case 'rupture': Sfx.rip(); game.shake(3); V.slipFlash = .2; break;
        case 'wireCut': Sfx.noise(.05, 6000, 3000, 1, .3); Sfx.clink(); rum(.3, .05); break;
        case 'wireWrong': Sfx.alarm(); Sfx.bang(); game.flash('#ff2020', .2, .6); game.shake(5); rum(1, .3); break;
        case 'screw': { V.screwAcc = (V.screwAcc || 0) + 1; if (V.screwAcc % 12 === 0) Sfx.tick(); break; }
        case 'retract': Sfx.clink(); break;
        case 'say': Scene.say(V, S, e[1]); break;
        case 'sayp': Scene.sayPhase(V, S, e[1]); break;
        default: if (G.FeelExtra && G.FeelExtra[k]) G.FeelExtra[k](game, S, V, e, o); break;
      }
    }
  },
  nearPool(S, x, y) { let best = null, bd = 40; for (const o of S.objs) if (o.type === 'pool' && !o.done) { const d = U.dist(o.x, o.y, x, y) - G.Op.poolR(o); if (d < bd) { bd = d; best = o; } } return best; },
  onBeat(game, S, V) {
    const Sfx = G.Sfx, silent = S.silent > 0;
    if (!silent) { Sfx.beep(S.vitals); }
    const low = S.vitals < 30;
    if (S.breath || low || silent) Sfx.heart(S.breath ? 1 : silent ? .55 : .7);
    if (low && !silent) { game.input.rumble(.5, .06); game.after(.16, () => game.input.rumble(.5, .06)); V.lowT = (V.lowT || 0) + 1; if (V.lowT % 3 === 0) Sfx.alarm(); }
  },
  onPhase(game, S, V, i) { V.lastPhase = i; const ph = G.Op.phaseDef(S); if (ph.title) { V.popups.push({ x: 213, y: 70, text: ph.title, color: '#5ff0e0', scale: 2, life: 2.6, t: 2.6 }); G.Sfx.swell(); } if (ph.music) G.Music.play(ph.music); const def = G.Op.def(S); if (i >= 1) G.Music.setLayer('drive', true); if (i >= 2) G.Music.setLayer('lead', true); if (ph.music === 'boss') { V.bossT = 1.4; G.Sfx.swell(); game.shake(3); game.input.rumble(.7, .4); G.Music.setLayer('drums', true); } },
  // ---------------------------------------------------------------- barks
  pushBark(V, S, who, text, prio = 1) {
    if (!text) return; if (V.bark && V.bark.prio > prio && V.bark.t > 0) return; if (V.quiet) return;
    const masked = who === 'quill' || who === 'vale' || who === 'sokolova';
    V.bark = { who, text, t: 2.5 + text.length * .05, prio, masked, talk: true, expr: null, blink: false }; const len = G.Babble.say(who, text); V.bark.talkT = len;
  },
  say(V, S, key) {
    if (key === 'textbook' && (V.tbN = (V.tbN || 0) + 1) % 4 !== 1) return;   // not after every action
    if (key !== 'slip' && V.barkCool > 0) return; const line = G.pickBark(key); if (!line) return; V.barkCool = 3;
    const who = S.barkWho || 'quill'; Scene.pushBark(V, S, who, line, key === 'code' || key === 'look' ? 3 : 1);
  },
  /** the case's own lines: enter/done per phase, or a named extra */
  sayPhase(V, S, key) {
    const b = G.Op.def(S).barks; if (!b) return; let e = null;
    if (key === 'enter' || key === 'done' || key === 'hint') { const list = b[key]; if (list) e = list[S.ph]; }
    else if (b.extra && b.extra[key]) { const l = b.extra[key]; e = l[(V.exI = (V.exI || 0) + 1) % l.length]; }
    if (e) Scene.pushBark(V, S, e[0], e[1], 2);
  },
  barkTool(V, S, tool) { if (V.barkCool > 1) return; if (V.bark && V.bark.t > .8) return; const c = G.CAST.quill; G.Babble.say('quill', G.TOOL_NAMES[tool]); },
  barkConsult(V, S, doc) { Scene.pushBark(V, S, doc, doc === 'vale' ? 'Mine! Okay. Sorry. Mine.' : 'Give it here, dear.', 3); },
  // ---------------------------------------------------------------- the step shared by every way of playing
  updateView(game, S, V, dt, I) {
    V.t += dt; V.barkCool = Math.max(0, V.barkCool - dt); V.slipFlash = Math.max(0, V.slipFlash - dt); V.flash = Math.max(0, V.flash - dt); V.stampT += dt;
    if (V.bark) { V.bark.t -= dt; V.bark.talkT -= dt; V.bark.talk = V.bark.talkT > 0 && (V.t * 12 | 0) % 2 === 0; V.bark.blink = (V.t % 3.1) < .12; if (V.bark.t <= 0) V.bark = null; }
    for (const p of V.popups) p.t -= dt; if (V.popups.length && V.popups[0].t <= 0) V.popups = V.popups.filter(p => p.t > 0);
    V.traceAcc += dt; while (V.traceAcc > 1 / 50) { V.traceAcc -= 1 / 50; V.trace[V.traceI] = S.beatV + (S.silent > 0 ? 0 : (Math.sin(V.t * 40) * .01)); V.traceI = (V.traceI + 1) % V.trace.length; }
    for (const k in V.loops) { V.loops[k] -= dt; if (V.loops[k] <= 0) { const L = G.Sfx.loops[k]; if (L) L.stop(); delete V.loops[k]; } }
    // Sonar: a ping rising in rate with proximity, and the hum of what sings
    if (V.sonarOn > 0) { V.sonarOn -= dt; const near = Math.min(200, V.sonarNear ?? 200), rate = .12 + near / 200 * .9; V.pingT = (V.pingT || 0) - dt; if (V.pingT <= 0) { V.pingT = rate; G.Sfx.ping(1 - near / 200); } const hum = G.Choir.hum(); if (hum) hum.set(Math.max(0, 1 - near / 140) * .1, V.sonarPan || 0); }
    else { const hum = G.Sfx.ctx && G.Choir.ctx && G.Choir.pad; if (hum) hum.set(0, 0); }
    // vitals' fifth channel: Quill's calm readouts
    if (S.status === 'play') { const bandNow = S.vitals < 25 ? 2 : S.vitals < 45 ? 1 : 0; if (bandNow > (V.band || 0) && !S.tut) Scene.say(V, S, 'low'); V.band = bandNow; }
    G.Music.tempoFor(S.vitals);
    if (S.status === 'play' && !(S.silent > 0)) { const L = G.Sfx.loop('vent'); if (L) L.set(.006 + Math.max(0, Math.sin(V.t * 1.1)) * .014); } else { const L = G.Sfx.loops.vent; if (L) L.stop(); }
  },
};

// ------------------------------------------------------------------ painting the field: every way of playing draws through here
Scene.paint = (r, S, V, game, locals) => {
  const W = r.W, H = r.H, OX = (W - G.FIELD_W) >> 1, OY = (H - G.FIELD_H) >> 1; V.OX = OX; V.OY = OY; const o = r.w(0, 0, 0), ctx = r.ctx;
  const def = G.Op.def(S), DS = (G.aux(S).reverse && S.status === 'rewind') ? G.aux(S).reverse[Math.min(G.aux(S).reverse.length - 1, Math.floor((1 - Math.max(0, S.rewindT) / 1.2) * G.aux(S).reverse.length))] : S;
  const F = G.siteField(def.site, W, H, def.seed || 11), C = { t: V.t, tool: locals[0] ? locals[0].c.tool : null, OX, OY };
  // stamps
  G.drawMarks(F, DS, OX, OY);
  for (const q of DS.objs) { if (q.done) continue; const a = G.ART[q.type]; if (a && a.stamp) { if (q.hidden && !(q.marked > 0) && !(S.dev && S.dev.reveal)) { if (!a.alwaysStamp) continue; } a.stamp(F, q, DS, q.x + OX, q.y + OY, C); } }
  for (const h of DS.hands) if (h.tool === 'scalpel' && h.down && !h.gone) F.stampDisc(h.x + OX, h.y + OY, 5, -1.4);
  // Sonar's lens
  let lens = null; for (const h of DS.hands) if (h.lens > 0 && !h.gone) { lens = { x: h.x + OX, y: h.y + OY, r: h.lens }; break; }
  const tiltLight = def.lamp ? [-.42 + Math.sin(S.t * .9) * .38, -.52 + Math.cos(S.t * .7) * .24] : undefined;
  F.shade({ beat: Math.min(1, DS.beatV * (def.beat ?? .45)), breath: Math.sin(V.t * 1.1) * .9, slow: DS.breath, lens, light: tiltLight, dim: DS.dim || 0, spot: DS.dim ? { x: DS.hands[0].x + OX, y: DS.hands[0].y + OY, r: 34 } : undefined });
  r.sky(['#0e3c38', '#0e3c38']);
  ctx.imageSmoothingEnabled = false; ctx.drawImage(F.cv, o[0], o[1]); px.reset(ctx);
  // overlays go on top of particles
  r.overlay(g => {
    const OXs = OX + o[0], OYs = OY + o[1]; const CC = Object.assign({}, C, { OX: OXs, OY: OYs });
    // long-breath outlines and strains
    for (const q of DS.objs) { if (q.done) continue; const a = G.ART[q.type]; if (!a || !a.over) continue; if (q.hidden && !(q.marked > 0) && !(S.dev && S.dev.reveal)) continue; if (G.Op.covered(DS, q) && !(S.dev && S.dev.reveal)) continue; a.over(g, q, DS, q.x + OXs, q.y + OYs, CC); if (S.dev && S.dev.radii) Pix.ring(g, q.x + OXs, q.y + OYs, Math.max(4, q.r || 6), '#ff00ff'); }
    if (DS.flags.lightbox && def.lightbox && def.lightbox.fieldAt) { const a = def.lightbox.fieldAt, X = Math.round(a[0] + OXs), Y = Math.round(a[1] + OYs), k = 3 + Math.round(Math.sin(V.t * 4) * 1); px.line(g, X - k - 8, Y, X, Y - k - 8, '#5ff0e0'); px.line(g, X, Y - k - 8, X + k + 8, Y, '#5ff0e0'); px.line(g, X + k + 8, Y, X, Y + k + 8, '#5ff0e0'); px.line(g, X, Y + k + 8, X - k - 8, Y, '#5ff0e0'); if (V.t < 8) Pix.text(g, 'SECOND OPINION', X, Y - k - 18, '#5ff0e0', { align: 'center' }); }
    if (DS.breath) for (const q of DS.objs) { if (q.done || (q.hidden && !(q.marked > 0)) || G.Op.covered(DS, q)) continue; const sp = G.OBJ[q.type]; if (!(sp.hazard || sp.strain) || q.type === 'dome') continue; const R2 = Math.max(6, (q.r || 6) + 3) + Math.sin(V.t * 5 + q.id) * 1.5; Pix.ring(g, q.x + OXs, q.y + OYs, R2, sp.strain ? '#5ff0e0' : '#ffffff', 2); }
    // ghosts of a Second Look
    Scene.ghosts(g, S, V, OXs, OYs);
    // sonar lens ring
    for (const h of DS.hands) if (h.lens > 0 && !h.gone) { Pix.ring(g, h.x + OXs, h.y + OYs, h.lens, '#5ff0e0', 2); const ph = (V.t * 3) % 1; Pix.ring(g, h.x + OXs, h.y + OYs, h.lens * ph, '#2a8a88', 3); }
    // hold zones and held thread
    for (const h of DS.hands) if (h.stitch) { const q = G.Op.byId(DS, h.stitch.id); if (q) { const st = G.Op.nextStitch(DS, q); if (st) { const a = h.stitch.from === 'a' ? st.a : st.b, b = h.stitch.from === 'a' ? st.b : st.a; px.line(g, Math.round(a[0] + OXs), Math.round(a[1] + OYs), Math.round(h.x + OXs), Math.round(h.y + OYs), '#5ad0ff'); Pix.ring(g, b[0] + OXs, b[1] + OYs, 5, '#ffffff', 2); } } }
    // salve brush
    if (locals[0] && locals[0].c.tool === 'salve') Pix.ring(g, locals[0].c.x + OXs, locals[0].c.y + OYs, T.salveBrush, '#6cf0a0', 2);
    // instruments, others first
    S.hands.forEach((h, i) => { if (h.gone) return; const isLocal = locals.find(L => L.i === i); const x = isLocal ? isLocal.c.x + (h.x - (isLocal.ax ?? h.x)) : (V.mirror ? V.mirror[i].x : h.x), y = isLocal ? isLocal.c.y + (h.y - (isLocal.ay ?? h.y)) : (V.mirror ? V.mirror[i].y : h.y); const col = S.hands.length > 1 ? h.color : '#bfe6dc'; G.drawInstrument(g, h.tool, x + OXs, y + OYs, { trig: h.trig || 0, color: col, fill: h.fill, over: h.over, heat: h.heat, lock: h.lock, t: V.t }); if (S.hands.length > 1) Pix.text(g, h.name.slice(0, 10), x + OXs + 10, y + OYs - 12, h.color); });
    for (const h of S.hands) if (h.tool === 'cautery' && h.down && !(h.lock > 0) && !h.gone) { const L = locals.find(q => q.i === S.hands.indexOf(h)); const x = (L ? L.c.x : h.x) + OXs, y = (L ? L.c.y : h.y) + OYs; px.ddisc(g, Math.round(x), Math.round(y), 9, '#ffa23c', .55); px.dot(g, Math.round(x), Math.round(y), '#ffffff'); }
    // the wheels
    for (const L of locals) { if (L.bot && !V.showBotWheel) continue; if (L.c.wheelT > 0) { const cx = L.c.wheelHold ? L.c.ringX : L.c.x, cy = L.c.wheelHold ? L.c.ringY : L.c.y; G.drawWheel(g, L.c, U.clamp(cx + OXs, 48, W - 48), U.clamp(cy + OYs, 48, H - 48), { t: V.t, hint: V.hintTool, keys: game.input.lastDevice !== 'gamepad' }); } else if (V.hintTool && V.hintTool !== L.c.tool && !L.bot) G.drawHintChip(g, V.hintTool, Math.round(U.clamp(L.c.x + OXs - 30, 2, W - 26)), Math.round(U.clamp(L.c.y + OYs - 30, 2, H - 26)), V.t); }
    // cursor prompt
    for (const L of locals) { if (L.bot || S.status !== 'play') continue; const h = S.hands[L.i]; if (h && !h.gone) HudPrompt(g, r, S, L, h, OXs, OYs, game); }
    // Sonar readout over a marked thing; popups
    G.HUD.popups(g, V.popups, OXs, OYs);
    // the slip's red flash and critical vignette
    if (V.slipFlash > 0) px.blend(g, Math.min(.35, V.slipFlash * 1.4), 'normal', () => px.rect(g, 0, 0, W, H, '#c81e1e'));
    if (V.bossT > 0) { V.bossT -= 1 / 60; px.blend(g, Math.min(.5, V.bossT), 'normal', () => px.rect(g, 0, 0, W, H, '#040c18')); }
    const vign = S.vitals < 30 && S.status === 'play' && !(S.silent > 0) ? .5 + Math.sin(V.t * 6) * .2 : 0;
    if (vign > 0) Scene.vignette(g, W, H, vign, '#6a0a0a');
    if (S.status === 'rewind') Scene.vcr(g, W, H, V, S);
    if (S.breath) Scene.vignette(g, W, H, .35, '#0a1a34');
    // hud
    G.HUD.draw(g, r, S, V);
    if (S.status === 'code') Scene.codeBlue(g, r, S, V);
    if (S.status === 'closing' || S.status === 'closed') Scene.closing(g, r, S, V, OXs, OYs);
    if (V.flash > 0) { px.rect(g, 6, 6, 148, 2, '#ffffff'); }
    if (V.loupeOn) Scene.loupe(r, g, locals[0], OXs, OYs);
    if (S.flags.wireOrder) G.drawWireOrder(g, S, r.W - 120, 32);
    if (S.flags.cutaway && S.breath) { const wx = (r.W >> 1) - 46, wy = 28; px.rect(g, wx - 2, wy - 2, 96, 52, '#1e2c30'); px.rect(g, wx, wy, 92, 48, '#0a1224'); G.rainPane(g, wx, wy, 92, 48, 0, 9); Pix.text(g, 'The rain has stopped falling.', W >> 1, wy + 54, '#a8e0ff', { align: 'center' }); }
    if (V.extraDraw) V.extraDraw(g, r, S, V, OXs, OYs);
  });
};
function HudPrompt(g, r, S, L, h, OX, OY, game) { const verb = G.Op.promptAt(S, h); if (verb) G.HUD.cursorPrompt(g, r, L.c, verb, game.input, OX, OY); }
Scene.vignette = (g, W, H, a, c) => { px.blend(g, a * .7, 'normal', () => { const b = 14; px.rect(g, 0, 0, W, b, c); px.rect(g, 0, H - b, W, b, c); px.rect(g, 0, b, b, H - 2 * b, c); px.rect(g, W - b, b, b, H - 2 * b, c); }); px.blend(g, a * .4, 'normal', () => { const b = 28; px.rect(g, 14, 14, W - 28, b - 14, c); px.rect(g, 14, H - b, W - 28, b - 14, c); px.rect(g, 14, b, b - 14, H - 2 * b, c); px.rect(g, W - b, b, b - 14, H - 2 * b, c); }); };
Scene.vcr = (g, W, H, V, S) => { const u = 1 - Math.max(0, S.rewindT) / 1.2; for (let i = 0; i < 5; i++) { const y = ((V.t * 240 + i * 53) % (H + 20)) - 10; px.blend(g, .4, 'normal', () => px.rect(g, 0, Math.round(y), W, 3, '#e0f0ff')); } for (let y = 0; y < H; y += 3) { if ((y * 7 + (V.t * 90 | 0)) % 11 === 0) px.rect(g, (V.t * 300 + y * 9) % W, y, 18, 1, '#ffffff'); } const sweepY = Math.round(u * H); px.rect(g, 0, sweepY, W, 2, '#ffffff'); Pix.text(g, '◄◄ REW', 14, 44, Math.sin(V.t * 18) > 0 ? '#ffffff' : '#a0c0d0', { scale: 2 }); };
Scene.ghosts = (g, S, V, OX, OY) => {
  const A = G.aux(S).ghosts; if (!A || !A.frames.length || S.status === 'rewind') return; if (S.t > A.until + .05) { G.aux(S).ghosts = null; return; }
  let f = A.frames[0]; for (const q of A.frames) { if (q.t <= S.t) f = q; else break; }
  const pale = '#cfe8ff';
  for (const q of f.hands) { Pix.ring(g, q[0] + OX, q[1] + OY, 5, pale, 1); px.line(g, Math.round(q[0] + OX), Math.round(q[1] + OY), Math.round(q[0] + OX + 12), Math.round(q[1] + OY + 14), pale); }
  for (const q of f.strains) { const a = G.ghostArt && G.ghostArt[q.k]; if (a) a(g, q, OX, OY, V.t); else Pix.ring(g, q.x + OX, q.y + OY, q.r || 6, pale, 2); }
  Pix.text(g, 'SECOND LOOK', 160, 30, pale);
};
Scene.codeBlue = (g, r, S, V) => {
  const W = r.W, H = r.H, c = S.code; px.blend(g, .78, 'normal', () => px.rect(g, 0, 0, W, H, '#020a10'));
  const y0 = H / 2 + 22, every = T.codeEvery, span = W, secs = span / 170;   // the ECG scrolls full-width
  let last = null; for (let x = 0; x <= W; x += 2) { const tt = c.t + (x - W * .5) / 170; const nearest = Math.round(tt / every), d = tt - nearest * every; let v = 0; if (nearest >= 1 && nearest <= 4) { const a = Math.abs(d); v = a < .03 ? 1 - a / .03 * .2 : a < .09 ? (.09 - a) / .06 * .8 : 0; if (d > .08 && d < .2) v = Math.max(v, -.1 + (d - .08) * .6); } const Y = y0 - v * 68; if (last) px.line(g, x - 2, Math.round(last), x, Math.round(Y), '#6cf0a0'); last = Y; }
  // the marker, at the centre: press as the peak crosses it
  const mx = Math.round(W / 2), nearest = c.k * every, d = c.t - nearest, near = Math.abs(d) < T.codeOk; px.rect(g, mx - 1, y0 - 84, 3, 100, near ? '#ffffff' : '#3a8a88'); const okW = Math.round(T.codeOk * 170); px.blend(g, .25, 'normal', () => px.rect(g, mx - okW, y0 - 84, okW * 2, 100, '#ffffff'));
  Pix.text(g, 'CODE BLUE', W / 2, 18, Math.sin(V.t * 8) > 0 ? '#6ac8ff' : '#ffffff', { scale: 3, align: 'center' });
  // charge pips: hits, attempts left
  for (let i = 0; i < 4; i++) { const px0 = W / 2 - 34 + i * 18, used = i < c.k - 1; px.rect(g, px0, H - 44, 14, 8, used ? (i < c.hits + (c.k - 1 - c.hits) && i < c.hits ? '#6cf0a0' : '#7a2020') : '#2a4a50'); }
  Pix.text(g, 'Two hits to bring them back', W / 2, H - 30, '#c8e0dc', { align: 'center' });
  const I = V.input; if (I.lastDevice === 'gamepad') { let x = W / 2 - 34; x += G.Glyph.cap(g, 'L2', x, H - 18) + 2; Pix.text(g, '+', x, H - 17, '#fff'); x += 8; x += G.Glyph.cap(g, 'R2', x, H - 18) + 3; Pix.text(g, 'on the peak', x, H - 17, '#fff'); } else { const lw = G.Glyph.action(g, I, 'useTool', W / 2 - 42, H - 18); Pix.text(g, 'on the peak', W / 2 - 42 + lw + 4, H - 17, '#fff'); }
  if (c.flash > 0) px.blend(g, Math.min(.8, c.flash * 5), 'normal', () => px.rect(g, 0, 0, W, H, '#ffffff'));
};
Scene.closing = (g, r, S, V, OX, OY) => {
  const c = S.close, W = r.W, H = r.H; if (!c) return; const x = c.x + OX, y = c.y + OY;
  if (!c.done) {
    px.rect(g, Math.round(x) - 22, Math.round(y) - 14, 44, 28, '#efece2'); px.rect(g, Math.round(x) - 22, Math.round(y) - 14, 44, 2, '#ffffff'); px.rect(g, Math.round(x) - 22, Math.round(y) + 12, 44, 2, '#c8c4b4'); for (let i = 0; i < 4; i++) px.rect(g, Math.round(x) - 18 + i * 12, Math.round(y) - 8, 8, 16, '#e0dccc');
    Pix.ring(g, x, y, 12, '#ffffff'); Pix.ring(g, x, y, 13, '#ffd36a'); if (c.r > 0) Pix.ring(g, x, y, c.r, '#6cf0a0'); Pix.ring(g, x, y, c.r + 1, '#2a8a68', 2);
    const I = V.input, lw = G.Glyph.width(I, 'useTool'); G.Glyph.action(g, I, 'useTool', Math.round(x - lw / 2 - 18), Math.round(y + 26)); Pix.text(g, 'Dress', x - lw / 2 + 2 + lw - 16, y + 27, '#ffffff');
  } else {
    px.rect(g, Math.round(x) - 22, Math.round(y) - 14, 44, 28, '#efece2');
    const u = Math.min(1, c.t * 5), sc = u < 1 ? 5 - 2 * u : 3, wob = Math.round((1 - u) * 6);
    px.blend(g, .55, 'normal', () => px.rect(g, 0, H / 2 - 34, W, 60, '#061a1e'));
    E.font.text(g, 'CASE CLOSED', W / 2 + wob, H / 2 - 28, '#ffe27a', { scale: Math.max(3, Math.round(sc)), align: 'center', outline: false, shadow: '#3a1a08' });
    const mm = String(Math.max(0, S.clockMax - S.clock) / 60 | 0).padStart(2, '0'), ss = String(Math.max(0, S.clockMax - S.clock) % 60 | 0).padStart(2, '0');
    Pix.text(g, 'TIME OF COMPLETION ' + mm + ':' + ss, W / 2, H / 2 + 2, '#ffffff', { align: 'center' });
    if (c.hit) Pix.text(g, c.hit + ' dressing' + (c.bonus ? '  +' + c.bonus : ''), W / 2, H / 2 + 13, '#bfe6dc', { align: 'center' });
  }
};
Scene.loupe = (r, g, L, OX, OY) => {
  if (!L || L.c.loupeT < .15) return; const R = 34, cx = Math.round(L.c.x + OX), cy = Math.round(L.c.y + OY), src = r.ctx && r.ctx.canvas; if (!src || !g.drawImage) return;
  const sm = g.imageSmoothingEnabled; g.imageSmoothingEnabled = false;
  for (let y = -R; y <= R; y++) { const w = Math.round(Math.sqrt(R * R - y * y)); try { g.drawImage(src, cx - w / 2 + 1, cy + y / 2 + 1, w, 1, cx - w, cy + y, w * 2, 1); } catch (e) { break; } }
  g.imageSmoothingEnabled = sm; px.reset(g); Pix.ring(g, cx, cy, R, '#e8fbf6'); Pix.ring(g, cx, cy, R + 1, '#2a6a68');
};

// ------------------------------------------------------------------ the scene: story cases, Skills Lab
G.scenes = G.scenes || {};
G.scenes.op = {
  pausable: true, view: 'overhead', camera: { zoom: false, wheel: false },
  enter(data) {
    const game = G.game, d = data || {}; this.data = d; G.Sfx.init(game);
    const difficulty = d.difficulty || game.settings.difficulty || 'resident';
    const seatN = typeof d.seats === 'number' ? d.seats : d.seats ? d.seats.length : 1, seatPlayers = seatN > 1 || d.seats ? Array.from({ length: seatN }, (_, i) => ({ id: i, seat: i, name: (d.seats && d.seats[i] && d.seats[i].name) || ['Dr. Vale', 'Quill', 'Odalys', 'Percy'][i], color: G.SEATS[i] })) : undefined;
    this.S = d.resume || G.Op.create(d.caseId, { difficulty, seed: d.seed ?? ((Math.random() * 1e9) | 0),  lightboxBonus: d.lightbox, phase: d.phase || 0, mode: d.mode || 'story', dev: d.dev || (G.Dev ? G.Dev.simFlags() : null), steady: G.Flow && G.Flow.prog.morale ? 10 : 0, players: seatPlayers });
    if (d.clockAdj) this.S.clock = Math.max(20, this.S.clock + d.clockAdj);
    if (d.capB) this.S.capB = true;
    if (d.labOnly) this.S.flags.labOnly = d.labOnly;
    if (d.lightbox) this.S.flags.lightbox = true;
    this.V = Scene.makeView(game); this.V.attract = !!d.attract; this.V.showBotWheel = !!d.attract;
    const seats = typeof d.seats === 'number' ? Array.from({ length: d.seats }, () => ({ kind: 'bot' })) : d.seats || [{ kind: 'p', input: game.input }];
    this.locals = seats.map((s, i) => ({ i, input: s.input || game.input, c: G.Cursor.make(213 - 30 + i * 20, 116, d.tool || 'forceps'), mouseMode: false, mouseT: game.input.mouse.t, trigWas: false, toggle: false, bot: null, ax: 213, ay: 116, first: i === 0 }));
    seats.forEach((s, i) => { if (s.kind === 'bot' || d.attract || (i === 0 && G.Dev && G.Dev.auto)) this.locals[i].bot = G.Bot.create(this.S, i, Object.assign({ cheat: !!d.attract, seed: 7 + i, speed: 280, react: .15 }, d.botSkill)); });
    const def = G.Op.def(this.S); G.Music.layersOn = {}; G.Music.play(def.music || 'op', { restart: true });
    game.input.consumeAll(); this.done = false; this.endT = 0;
    this.V.OX = (game.W - G.FIELD_W) >> 1; this.V.OY = (game.H - G.FIELD_H) >> 1; Scene.drainEvents(game, this.S, this.V, {});
    if (game.saves) game.saves.canSave = false;
    game.setCursorHidden && game.setCursorHidden(true);
    if (G.Screen) G.Screen.cursor(game, false);
    G.current = this;
  },
  exit() { G.Sfx.stopLoops(); G.Sfx.breath(false); G.Sfx.silence(false); G.Choir.mute(false); if (G.Screen) G.Screen.cursor(G.game, true); if (G.Choir.pad) G.Choir.pad.set(0, 0); },
  update(dt) {
    const game = G.game, S = this.S, V = this.V, I = game.input; game.focus(game.W / 2, game.H / 2, 0);
    V.OX = (game.W - G.FIELD_W) >> 1; V.OY = (game.H - G.FIELD_H) >> 1;
    if (!this.data.dev && G.Dev) { const fl = G.Dev.simFlags(); if (S.dev !== fl) S.dev = fl; if (G.Dev.changed()) V.devTag = true; }
    const inputs = [];
    for (const L of this.locals) {
      const h = S.hands[L.i];
      if (L.bot) { const inp = G.Bot.step(L.bot, S, dt); L.c.x = L.bot.c.x; L.c.y = L.bot.c.y; L.c.tool = L.bot.c.tool; L.c.wheelT = L.bot.c.wheelT; L.c.wheelSector = L.bot.c.wheelSector; inputs[L.i] = inp; continue; }
      const dev = readDevice(game, L.input, L, S, h, V.OX, V.OY, L.first);
      if (G.Dev && G.Dev.panelOpen) { dev.step = 0; dev.digit = -1; dev.wheelStick = [0, 0]; dev.keys = [0, 0]; }
      G.Wheel.update(L.c, dev, dt);
      G.Cursor.update(L.c, dev, S, h, dt);
      L.ax = L.c.x; L.ay = L.c.y;
      inputs[L.i] = { x: L.c.x, y: L.c.y, tool: L.c.tool, trig: dev.trig, fine: dev.fine, gift: dev.gift, consult: dev.consult, cancel: dev.cancel, shock: dev.shock };
      V.localTool = L.c.tool; V.loupeOn = dev.fine && !dev.mouse ? true : dev.fine;
    }
    if (this.endT > 0) { this.endT -= dt; if (this.endT <= 0) this.leave(); }
    else {
      G.Op.step(S, inputs, dt);
      Scene.drainEvents(game, S, V, {});
      Scene.updateView(game, S, V, dt, I);
      Scene.hints(S, V, this.locals[0], dt);
      if (S.status === 'closed' && !this.done) { this.done = true; this.endT = .1; }
      if (S.status === 'lost' && !this.done) { this.done = true; this.endT = 1.6; }
    }
    if (this.data.tick) this.data.tick(this, dt);
  },
  leave() {
    const S = this.S, d = this.data, game = G.game;
    if (d.onEnd) { d.onEnd(this); return; }
    if (G.Attract && G.Attract.active) return;
    if (S.mode === 'rounds') { game.go('roundsend', { S }); return; }
    if (S.mode === 'lab') { G.Flow.quitToFiles(); return; }
    if (S.status === 'closed') G.Flow.caseClosed(S, this); else G.Flow.caseLost(S, this);
  },
  draw(r) { Scene.paint(r, this.S, this.V, G.game, this.locals); },
};
/** hints: on Intern, or after 6 s of idling or a repeated slip */
Scene.hints = (S, V, L, dt) => {
  if (!L || L.bot) { V.hintTool = null; return; } const h = S.hands[L.i]; if (!h || S.status !== 'play') { V.hintTool = null; return; }
  const set = G.game.settings; const diffHints = S.k.hints; if (set.hints === false && S.diff !== 'intern') { V.hintTool = null; return; }
  const ph0 = G.Op.phaseDef(S), job = G.Op.nextJob(S, h) || (ph0.clear && ph0.clear.vitals ? { tool: 'syringe' } : null); if (!job) { V.hintTool = null; return; }
  if (h.down || h.held || h.stroke || h.stitch) V.idleT = 0; else V.idleT = (V.idleT || 0) + dt;
  const slipping = S.rt - h.slipT < 4 && S.stats.slips >= 2;
  V.hintTool = (S.diff === 'intern' || S.tut || V.idleT >= (diffHints || 6) || slipping) ? job.tool : null;
  if (V.hintTool && V.hintTool !== V.lastHint) { V.lastHint = V.hintTool; if (S.tut == null && V.idleT >= (diffHints || 6)) { G.Babble.say('quill', G.TOOL_NAMES[V.hintTool]); Scene.pushBark(V, S, 'quill', G.TOOL_NAMES[V.hintTool] + ', Doctor.', 0); } }
  if (V.idleT > 14) { V.idleT = 7; Scene.say(V, S, 'idle'); }
  if (S.tut == null && !V.hintTool) V.lastHint = null;
};
})();
