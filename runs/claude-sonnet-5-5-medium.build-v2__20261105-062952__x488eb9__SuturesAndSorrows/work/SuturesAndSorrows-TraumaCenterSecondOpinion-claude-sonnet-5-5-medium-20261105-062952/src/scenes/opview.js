// OpView: runs and draws one operation. Used by the op scene, the attract reel, couch co-op and the Hub round.
(() => {
const E = My3D2dge, G = (window.GAME ||= {}), px = E.px, font = E.font, U = G.UI, Op = G.Op, Dr = G.Draw, T = G.T;
const clamp = E.clamp, hyp = Math.hypot;
const TOOLS = G.TOOLS, SECT = [0, 1, 2, 3, 4, 5, 6, 7];
const beatShape = hb => Math.max(0, 1 - hb * 7) + Math.max(0, 1 - Math.abs(hb - .22) * 9) * .55;
G.OpView = class OpView {
  constructor(game, S, o = {}) {
    this.game = game; this.S = S; this.o = o; this.ctl = []; this.pops = U; this.ecg = []; this.bark = null; this.barkT = 0; this.objective = ''; this.t = 0; this.F = null; this.sz = ''; this.cdBark = 0; this.learnT = 0; this.prompt = null; this.flashT = 0; this.rewindT = 0; this.last = {}; this.idle = 0; this.hint = null; this.acc = 0; this.stamp = null;
    for (let i = 0; i < S.np; i++) if (!o.local || o.local.includes(i)) this.ctl.push({ i, kind: (o.bots && o.bots[i]) ? 'bot' : 'human', bot: o.bots && o.bots[i] ? new G.Bot({ cheat: !!o.cheat, ...(o.botOpts || {}) }) : null, cur: G.Cursor.make(180 + i * 30, 116), wheelT: 0, sec: -1, secT: 0, tool: 'forceps', input: (i === 0 || o.local) ? game.input : (game.players && game.players[i]) || null, trigV: 0 });
    this.def = Op.def(S);
  }
  // ---- input -> device
  dev(c) {
    const inp = c.input, g = this.game; const d = { ax: 0, ay: 0, fine: 0, mouse: null };
    if (!inp) return { dev: d, trig: 0, tool: c.tool, gift: 0 };
    const sw = g.settings.swap ? 1 : 0, aim = sw ? inp.padMove : inp.padAim, mv = sw ? inp.padAim : inp.padMove;
    const last = inp.lastDevice;
    if (aim && hyp(aim[0], aim[1]) > 0) { d.ax = aim[0]; d.ay = aim[1]; }
    let kx = (inp.down('curR') ? 1 : 0) - (inp.down('curL') ? 1 : 0), ky = (inp.down('curD') ? 1 : 0) - (inp.down('curU') ? 1 : 0);
    if (this.dev_ && G.dev && G.dev.open) { /* arrows belong to the panel */ }
    if (G.dev && G.dev.open) { kx = 0; ky = 0; } d.kx = kx; d.ky = ky; d.nx = (inp.down('nudgeR') ? 1 : 0) - (inp.down('nudgeL') ? 1 : 0); d.ny = (inp.down('nudgeD') ? 1 : 0) - (inp.down('nudgeU') ? 1 : 0);
    d.fine = inp.down('fine') ? 1 : 0; d.speedMul = (g.settings.cursorSpeed || 1);
    const ptr = c.i === 0 ? inp.pointer() : null;
    if (c.i === 0 && last === 'mouse' && ptr) d.mouse = [clamp(ptr[0] - this.OX, 0, 426), clamp(ptr[1] - this.OY, 0, 240)];
    let trig = inp.value('useTool'); if (!trig && inp.down('useTool')) trig = 1;
    // tool wheel: stick flick, number keys, step keys, wheel hold
    let pick = null; const m = mv && hyp(mv[0], mv[1]) > .6 ? mv : null;
    if (m) { const a = Math.atan2(m[1], m[0]) + Math.PI / 2, sec = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8; if (sec === c.sec) { c.secT += 1 / 60; if (c.secT >= .08) pick = TOOLS[sec]; } else { c.sec = sec; c.secT = 0; } c.wheelT = .45; } else { c.sec = -1; c.secT = 0; }
    for (let k = 0; k < 8; k++) if (inp.pressed('tool' + (k + 1))) pick = TOOLS[k];
    if (inp.pressed('toolNext')) pick = TOOLS[(TOOLS.indexOf(c.tool) + 1) % 8]; if (inp.pressed('toolPrev')) pick = TOOLS[(TOOLS.indexOf(c.tool) + 7) % 8];
    if (inp.down('wheelHold') && ptr) { if (!c.wh) c.wh = [ptr[0], ptr[1]]; const dx = ptr[0] - c.wh[0], dy = ptr[1] - c.wh[1]; if (hyp(dx, dy) > 16) { const a = Math.atan2(dy, dx) + Math.PI / 2, sec = ((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8; pick = TOOLS[sec]; c.wheelT = .45; } } else c.wh = null;
    if (pick && pick !== c.tool) { c.tool = pick; this.swapFx(c); }
    if (c.wheelT > 0) c.wheelT -= 1 / 60;
    return { dev: d, trig: trig, tool: c.tool, gift: inp.pressed('gift') ? 1 : 0, consult: inp.pressed('consult') ? 1 : 0, cancel: inp.pressed('cancel') ? 1 : 0, fine: d.fine, mouse: d.mouse };
  }
  swapFx(c) { G.Audio.sfx('clack'); G.Audio.sfx('slap', { vol: .5 }); G.game.input.rumble(.15, .03); this.last.swap = this.t; if (c.i === 0 && G.BARKS.tool[c.tool] && !this.o.quiet) G.Audio.speak('quill', G.BARKS.tool[c.tool], {}); }
  // ---- one fixed step
  step(dt) {
    const S = this.S, g = this.game; this.t += dt; if (this.sizeOnly) return;
    const inputs = [];
    for (const c of this.ctl) {
      const p = S.pl[c.i]; let r;
      if (c.kind === 'bot') { r = c.bot.read(S, p, c.cur, dt); G.Cursor.update(c.cur, r.dev, S, p, dt); r = { x: c.cur.ex, y: c.cur.ey, trig: r.trig, tool: r.tool, fine: r.fine, gift: r.gift }; c.tool = r.tool; }
      else { const d = this.dev(c); G.Cursor.update(c.cur, d.dev, S, p, dt); r = { x: c.cur.ex, y: c.cur.ey, trig: d.trig, tool: d.tool, fine: d.fine, gift: d.gift, consult: d.consult, cancel: d.cancel }; c.trigV = d.trig; }
      inputs[c.i] = r;
    }
    if (this.o.local && !inputs.length) inputs.length = 0;
    if (this.o.net && this.o.net.remoteHands) this.o.net.remoteHands(S, inputs);
    if (this.o.hostSim !== false) Op.step(S, inputs, dt);
    this.events(dt);
    // ecg trace
    this.acc += dt; if (this.acc > 1 / 60) { this.acc = 0; this.ecg.push(S.cb ? 0 : U.ecgY(S.hb) * (S.vitals < 1 ? 0 : 1)); if (this.ecg.length > 148) this.ecg.shift(); }
    // loops
    const p0 = S.pl[this.o.seat || 0] || S.pl[0], A = G.Audio; if (this.o.net && this.o.net.beforeDrain) this.o.net.beforeDrain(S);
    if (p0 && !this.o.mute) { A.hold('suction', p0.suck, { vol: .22, freq: 400 + (p0.suck ? 300 : 0) }); A.hold('cautery', p0.fire && p0.tool === 'cautery', { vol: .16 }); A.hold('scalpel', p0.g && p0.g.k === 'cut', { vol: .12, freq: 2200 + hyp(p0.vx, p0.vy) * 6 }); if (p0.son) A.ping(clamp(1 - (p0.son.near || 999) / 160, 0, 1)); A.choirUpdate(S); }
    if (S.pl.some(p => p.trig > .3) && p0 && g.input.lastDevice === 'gamepad') {}
  }
  events(dt) {
    const S = this.S, g = this.game, A = G.Audio, P = g.particles, OX = this.OX || 0, OY = this.OY || 0; const rumble = (a, b) => { if (!this.o.noRumble) g.input.rumble(a, b); };
    for (const e of S.ev) {
      const k = e[0], X = (e[1] || 0) + OX, Y = (e[2] || 0) + OY;
      switch (k) {
        case 'grade': { const gr = e[3]; U.pop(X, Y, gr, gr === 'Textbook' ? '#ffd35a' : gr === 'Clean' ? '#e8fbf6' : '#ff9a8a', gr === 'Textbook'); if (gr === 'Textbook') { A.sfx('chime'); P.glints(X, Y, 0, 8, '#ffd35a'); rumble(.2, .05); if (!this.cdBark) this.say(pick(G.BARKS.good)); } else if (gr === 'Clean') A.sfx('chime2', { vol: .5 }); else A.sfx('thud', { vol: .3, pitch: 1.6 }); if (e[4]) {} break; }
        case 'slip': A.sfx('thud'); g.shake(2); g.flash('#ff2020', .1, .25); rumble(.6, .12); if (e[3] !== 0) this.say(pick(G.BARKS.slip)); break;
        case 'tear': A.sfx('rip'); g.shake(2); g.freeze(.04); P.bits(X, Y, 0, 8, ['#c82020', '#6a0a10']); rumble(.5, .1); break;
        case 'grip': A.sfx('tick'); rumble(.15, .04); break;
        case 'caught': A.sfx('clink'); P.glints(X, Y, 0, 6, '#ffffff'); rumble(.3, .05); break;
        case 'stpick': A.sfx('tick'); break;
        case 'stitch': A.sfx('twang'); P.glints(X, Y, 0, 4, '#58c0ff'); rumble(.25, .05); break;
        case 'loose': A.sfx('thud', { vol: .3 }); break;
        case 'woundclosed': A.sfx('pop'); P.glints(X, Y, 0, 10, '#9ad8ff'); break;
        case 'cutstart': A.sfx('tick'); break; case 'cutdone': A.sfx('pop'); P.bits(X, Y, 0, 6, ['#a02030']); break; case 'cutslip': A.sfx('thud', { vol: .4 }); break;
        case 'slash': A.sfx('whoosh'); break;
        case 'healed': A.sfx('chime2'); P.glints(X, Y, 0, 10, '#7cf0a0'); break;
        case 'burned': A.sfx('burn'); P.smoke(X, Y, 0, 4, { size: 4 }); P.sparks(X, Y, 0, 6); break;
        case 'overheat': A.sfx('hurt', { vol: .3 }); break; case 'char': A.sfx('thud', { vol: .3 }); P.smoke(X, Y, 0, 3, { size: 3 }); break;
        case 'iv': A.sfx('plunger'); rumble(.1, .1); this.ivFlash = .4; U.pop(X, Y, '+' + e[3], '#7ae0ff'); break;
        case 'dose': A.sfx('dose'); break; case 'sedated': A.sfx('sed'); P.glints(X, Y, 0, 8, '#a8f0ff'); break;
        case 'found': if (!this.last.found || this.t - this.last.found > .4) { A.sfx('found'); this.last.found = this.t; } break;
        case 'beat': { if (!this.o.mute) { const v = e[1]; A.sfx('beat', { pitch: .8 + (1 - v / 99) * .8, vol: S.hush && S.static ? 0 : .6 }); if (v < 30) { rumble(.35, .06); setTimeout(() => rumble(.25, .05), 130); } } break; }
        case 'phase': this.objective = e[2]; if (e[1] > 0) { A.sfx('chime', { vol: .5 }); g.audio.layer && this.layers(e[1]); } this.say(this.def.phases[e[1]] && this.def.phases[e[1]].bark || pick(G.BARKS.phase), true); break;
        case 'learn': this.learnT = 1; break; case 'learned': A.sfx('chime'); break;
        case 'codeblue': A.sfx('alarm'); g.flash('#ffffff', .2, .3); this.say('Code Blue. Paddles!'); break;
        case 'shockhit': A.sfx('whine'); A.sfx('bang'); g.flash('#ffffff', .2, .6); rumble(1, .35); g.shake(4); break; case 'shockmiss': A.sfx('thud'); break;
        case 'revive': A.sfx('bang'); g.flash('#ffffff', .4, .9); rumble(1, .4); g.shake(6); this.say('Pulse. Thirty. We are back.'); break;
        case 'lb': A.sfx(e[1] ? 'lb' : 'lbOff'); if (e[1]) g.audio.duck && g.audio.duck(true); else g.audio.duck && g.audio.duck(false); break;
        case 'rewind': A.sfx('rewind'); this.rewindT = 1.2; g.flash('#a8d8ff', .3, .4); this.say('No. Again.'); break;
        case 'nogift': A.sfx('cancel'); break; case 'consult': A.sfx('select'); g.flash('#ffffff', .1, .3); break;
        case 'lost': A.silence(); break;
        case 'close': this.say('Dressing.'); break;
        case 'stamp': A.sfx('stamp'); g.shake(4); this.stamp = 0; rumble(.8, .2); A.silence(); break;
        case 'bite': A.sfx('rip', { vol: .3, pitch: 1.5 }); break; case 'tele': break;
        case 'surface': case 'split': case 'snap': case 'crack': case 'stage3': A.sfx('choirSwell'); g.shake(3); rumble(.7, .4); break;
        case 'clamp': A.sfx('clack'); break; case 'barb': A.sfx('tick'); break;
        case 'reedsed': A.sfx('sed'); break; case 'spit': A.sfx('rip', { vol: .4 }); break;
        case 'dome': A.sfx('lb', { vol: .3, pitch: 1.5 }); break; case 'eyeopen': A.sfx('whine', { vol: .3 }); g.flash('#ffffff', .1, .3); break;
        case 'lobedead': A.sfx('chime'); break; case 'repeat': A.sfx('rewind', { vol: .4 }); g.shake(3); break; case 'windup': A.sfx('choirSwell'); this.say('The repeat sign. Cut it!'); break;
        case 'cantorrewind': A.sfx('rewind'); g.flash('#c8aaf4', .4, .6); break; case 'noteheld': A.silence(); break;
        case 'wirewrong': A.sfx('bang'); g.shake(5); break; case 'wireok': A.sfx('chime'); break; case 'lurch': g.shake(5); A.sfx('thud'); break;
      }
      if (S.cb && k === 'codeblue') { /* handled */ }
    }
    S.ev.length = 0;
    // low vitals and idle barks
    if (this.cdBark > 0) this.cdBark -= dt; if (this.barkT > 0) this.barkT -= dt; else this.bark = null;
    if (S.vitals < 30 && !S.cb && S.vitals > 0 && this.t - (this.last.low || -9) > 14) { this.last.low = this.t; this.say(pick(G.BARKS.low)); }
    this.idle += dt; if (S.pl.some(p => p.trig > .3 || p.g)) this.idle = 0;
    const D = G.DIFF[S.diff]; const hintsOn = G.game.settings.hints !== false; if (hintsOn && !this.o.quiet && this.idle > Math.max(D.hints, 3) && !S.cb && !S.close) { this.idle = 0; this.hint = true; this.nextHint(); }
  }
  nextHint() { const S = this.S, t = Op.targets(S, 'x'); const need = this.hintTool(); if (need) { this.hintT = 3; this.hintTool_ = need; this.say(G.BARKS.tool[need] + ' ' + pick(G.BARKS.idle)); } }
  hintTool() { const S = this.S; for (const tool of G.TOOLS) if (Op.targets(S, tool).length) return tool; return null; }
  layers(ph) { const au = G.game.audio; try { au.layer('drums', ph >= 1 ? 1 : 0); au.layer('lead', ph >= 2 ? 1 : 0); au.layer('arp', ph >= 3 ? 1 : 0); } catch (e) {} }
  say(text, quiet) { if (this.o.quiet) return; this.bark = { who: 'quill', text }; this.barkT = 2.5 + text.length * .05; this.cdBark = 3; if (!quiet) G.Audio.speak('Nurse Quill', text.slice(0, 18)); }
  // ---- drawing
  draw(r) {
    const S = this.S, g = this.game, W = r.W, H = r.H, OX = this.OX = (W - 426) >> 1, OY = this.OY = (H - 240) >> 1;
    if (this.sz !== W + 'x' + H || !this.F) { this.sz = W + 'x' + H; this.F = G.bakeSite(this.def.site, W, H, this.def.seed || 11); }
    const F = this.F, ctx = r.ctx, o = r.w(0, 0, 0);
    px.rect(ctx, 0, 0, W, H, '#0e3a36');
    Dr.stamp(F, S, OX, OY);
    const p0 = S.pl[this.o.seat || 0] || S.pl[0], son = S.pl.find(p => p.son), c0 = (this.ctl.find(q => q.i === (this.o.seat || 0)) || this.ctl[0] || {}).cur || { x: 213, y: 116 };
    const dimmed = S.blackout ? .86 : (S.hush && S.static ? .0 : 0);
    F.shade({ beat: beatShape(S.hb) * (S.vitals < 1 ? 0 : 1) * .5, breath: Math.sin(S.rt * 1.6) * 1.3, slow: S.lb, lens: son ? { x: son.x + OX, y: son.y + OY, r: son.son.r } : null, light: S.tilt && (S.tilt[0] || S.tilt[1]) ? [Math.sin(S.rt * .8) * .5 - .2, -.5] : undefined, dim: dimmed, spot: S.blackout ? { x: c0.ex + OX, y: c0.ey + OY, r: 34 } : null });
    ctx.imageSmoothingEnabled = false; ctx.drawImage(F.cv, Math.round(o[0]), Math.round(o[1]));
    this.drawOverlay = g2 => this.overlay(g2, r, W, H, OX, OY); r.overlay(this.drawOverlay);
  }
  overlay(g, r, W, H, OX, OY) {
    const S = this.S, game = this.game, dt = 1 / 60, t = S.rt, T_ = this.t;
    Dr.over(g, S, OX, OY, { tool: S.pl[0].tool, mine: 0, showHidden: this.o.reveal });
    // Fermata-style: players' cuts, beams
    for (const p of S.pl) {
      const c = this.ctl.find(q => q.i === p.i) || { i: p.i, cur: { x: p.rx != null ? p.rx : p.x, y: p.ry != null ? p.ry : p.y, loupe: false }, wheelT: 0, tool: p.tool, kind: 'remote' }; if (p.gone) continue; const x = Math.round(c.cur.x + OX), y = Math.round(c.cur.y + OY);
      if (p.tool === 'cautery' && p.fire) { px.blend(g, .6, 'add', () => px.disc(g, x, y, 4, '#ff9a30')); }
      if (p.son) { Dr.ring(g, x, y, p.son.r, '#7ae0ff', 40, S.rt * 2); }
      const col = p.color; if (c.cur.loupe && c.i === 0) { Dr.ring(g, x, y, 34, '#ffffff', 40); }
      Dr.instrument(g, p.tool, x, y, { color: col, down: p.trig > .3, fill: p.fill, heat: p.heat, lock: p.lock > 0, t: T_ });
      // tension / prompt near the cursor for the first local seat
      if (c.i === (this.o.seat || 0) && !this.o.noPrompt) this.cursorPrompt(g, c, p, x, y, W, H);
      if (c.wheelT > 0 || (c.kind === 'human' && c.input && c.input.down('wheelHold'))) this.wheel(g, c, p, x, y);
    }
    if (S.pl.length > 1) for (const p of S.pl) { }
    this.hud(g, r, W, H, OX, OY);
    U.drawPops(g, dt);
    if (this.ivFlash > 0) { this.ivFlash -= dt; }
    if (S.sl > 0 || this.rewindT > 0) { this.rewindT -= dt; for (let i = 0; i < 14; i++) px.rect(g, 0, Math.floor(((T_ * 300 + i * 41) % H)), W, 1, '#ffffff22'); px.rect(g, 0, Math.floor((T_ * 200) % H), W, 6, '#a8d8ff33'); }
    if (S.ghosts && S.ghosts.t < S.ghosts.len) { S.ghosts.t += 1 / 60; const gh = S.ghosts; const smp = gh.s.find(q => q.t >= gh.t); if (smp) { for (const [x, y] of smp.c) { px.blend(g, .4, 'normal', () => px.disc(g, x + OX, y + OY, 5, '#cfe8ff')); } for (const [x, y] of smp.o) px.blend(g, .35, 'normal', () => Dr.ring(g, x + OX, y + OY, 6, '#cfe8ff', 10)); } }
    if (S.cb) this.codeBlue(g, W, H); if (S.close) this.closing(g, W, H);
    if (this.flashT > 0) this.flashT -= dt;
    if (S.vitals < 30 && !S.cb) { const a = .12 + .1 * Math.sin(T_ * 8); px.blend(g, a, 'normal', () => { px.rect(g, 0, 0, W, 6, '#ff2020'); px.rect(g, 0, H - 6, W, 6, '#ff2020'); px.rect(g, 0, 0, 6, H, '#ff2020'); px.rect(g, W - 6, 0, 6, H, '#ff2020'); }); }
    if (this.stamp != null) { this.stamp += dt; const k = Math.min(1, this.stamp * 4); U.center(g, 'CASE CLOSED', W / 2, H / 2 - 12 + (1 - k) * -20, '#ff6a5a', { scale: 4 }); if (this.stamp > .5) U.center(g, 'TIME OF COMPLETION ' + fmt(S.clock0 - S.clock), W / 2, H / 2 + 20, '#ffffff', { scale: 1 }); }
    if (S.learn && this.learnT >= 0 && !S.cb && !S.close && !(G.dev && G.dev.open)) { const lr = this.def.phases[S.ph].learn; const txt = LEARN[lr]; if (txt) { U.panel(g, W / 2 - 160, 42, 320, 26); U.center(g, txt[0], W / 2, 46, '#ffd35a'); U.center(g, txt[1].slice(0, 62), W / 2, 57, '#e8fbf6'); } }
    if (S.hush && S.static) { for (let i = 0; i < 90; i++) px.rect(g, Math.floor(Math.random() * 148) + 6, 6 + Math.floor(Math.random() * 30), 2, 1, '#aaa'); }
  }
  cursorPrompt(g, c, p, x, y, W, H) {
    const S = this.S, game = this.game; const tgt = Op.near(S, c.cur.x, c.cur.y, 14, o => G.OBJ[o.type].tools && G.OBJ[o.type].tools(S, o, p.tool)); if (!tgt || p.trig > .3 || !c.input) return;
    const verb = { forceps: 'Pull', scalpel: 'Cut', suture: 'Stitch', salve: 'Paint', syringe: 'Dose', cautery: 'Burn', suction: 'Drain', sonar: 'Scan' }[p.tool]; const w = 40 + font.width(verb); let px_ = x + 12, py_ = y - 22; if (px_ + w > W - 4) px_ = x - w - 4; if (py_ < 4) py_ = y + 14;
    U.capText(g, game, 'useTool', verb, px_, py_);
  }
  wheel(g, c, p, x, y) {
    for (let k = 0; k < 8; k++) { const a = Dr.WHEEL_ANGLE(TOOLS[k]), tx = Math.round(x + Math.cos(a) * 36 - 11), ty = Math.round(y + Math.sin(a) * 36 - 11), sel = TOOLS[k] === c.tool, hint = this.hintT > 0 && this.hintTool_ === TOOLS[k];
      px.rect(g, tx, ty, 22, 22, sel ? '#5ff0e0' : hint ? '#ffd35a' : '#10181cdd'); px.rect(g, tx + 1, ty + 1, 20, 20, sel ? '#0b3a40' : '#16282e'); Dr.icon(g, TOOLS[k], tx + 1, ty + 1, sel ? '#ffffff' : '#9ab8b0');
      if (c.input && c.input.lastDevice !== 'gamepad') font.text(g, String(k + 1), tx + 15, ty + 14, '#ffffff', { outline: false }); }
    U.center(g, G.TOOL_NAMES[c.tool], x, y + 50, '#ffffff', { outline: false });
  }
  hud(g, r, W, H, OX, OY) {
    const S = this.S, game = this.game, T_ = this.t; const hide = S.hush && S.static;
    // monitor
    U.panel(g, 6, 6, 148, 30); U.ecg(g, hide ? [] : this.ecg, 6, 8, 100, 26, S.vitals < 30 ? '#ff6a5a' : '#6affb0');
    if (!hide) { const v = Math.round(S.vitals); const flash = S.vitals < 30 && Math.floor(T_ * 4) % 2 === 0; U.text(g, String(v), 112, 12, flash ? '#ff6a5a' : '#6affb0', { scale: 2 }); if (S.vitals < 30) U.text(g, 'CRITICAL', 108, 28, '#ff6a5a'); } else U.text(g, '---', 112, 12, '#888', { scale: 2 });
    // clock
    U.panel(g, W - 76, 6, 70, 22); U.text(g, fmt(Math.max(0, S.clock)), W - 70, 10, S.clock < 30 ? '#ff6a5a' : '#e8fbf6', { scale: 2 });
    // objective
    if (this.objective) U.center(g, this.objective.slice(0, 26), W / 2, 12, '#ffd35a', { scale: 1 });
    if (S.np > 1 || this.o.seats) { S.pl.forEach((p, i) => { U.text(g, String(p.score | 0), W / 2 - 60 + i * 40, 24, p.color); }); }
    // steady gauge
    const gx = W - 96, gy = H - 22; U.panel(g, gx, gy, 90, 16); px.rect(g, gx + 2, gy + 2, Math.floor(86 * S.steady / 100), 12, S.lb ? '#a8d8ff' : S.doc === 'sokolova' ? '#ff9ad8' : '#5ff0e0');
    const need = S.doc === 'vale' || this.def.noSokolova ? 35 : 45; px.rect(g, gx + 2 + Math.floor(86 * need / 100), gy + 1, 1, 14, '#ffffff'); const ready = S.steady >= need;
    if (this.def.noSokolova || S.doc === 'vale') U.text(g, S.lb ? 'LONG BREATH' : ready ? 'READY' : 'STEADY', gx + 4, gy + 4, ready || S.lb ? '#001018' : '#e8fbf6'); else U.text(g, ready ? 'READY' : 'LOOK', gx + 4, gy + 4, ready ? '#001018' : '#e8fbf6');
    if (!this.o.noPrompt) { U.cap(g, game, 'gift', gx - 16, gy + 2); if (this.def.consult) U.cap(g, game, 'consult', gx - 32, gy + 2); }
    if (S.chain >= 3) U.text(g, 'FLOW x' + Math.min(2, 1 + S.chain * .05).toFixed(1), gx + 4, gy - 10, '#ffd35a');
    if (this.o.hudExtra) this.o.hudExtra(g, W, H);
    // speaker + bark
    if (this.bark && !this.o.quiet) { const b = this.bark; const sp = G.bust(b.who === 'quill' ? 'quill' : b.who, 'neutral', { maskUp: true, talk: Math.floor(T_ * 8) % 2 }); g.drawImage(sp, 28, 16, 56, 64, 4, H - 62, 56, 64); U.panel(g, 62, H - 42, 250, 36); U.text(g, G.WHO(b.who) || 'NURSE QUILL', 66, H - 39, '#5ff0e0'); const shown = b.text.slice(0, Math.floor((2.5 + b.text.length * .05 - this.barkT) * 20) + 3); U.wrap(shown, 240).slice(0, 2).forEach((ln, i) => U.text(g, ln, 66, H - 28 + i * 9, '#e8fbf6')); }
    if (this.def.ship && S.tilt) U.text(g, 'ROLL', W - 60, 32, '#8ab');
  }
  codeBlue(g, W, H) {
    const c = this.S.cb; px.rect(g, 0, 0, W, H, '#000a'); U.center(g, 'CODE BLUE', W / 2, 40, '#ff6a5a', { scale: 3 }); const y = H / 2, w = W - 80; px.line(g, 40, y, 40 + w, y, '#6affb0', 1);
    const peakX = 40 + w * .5; px.line(g, peakX, y - 30, peakX, y + 30, '#ffd35a', 1); for (let i = 0; i < 4; i++) px.disc(g, W / 2 - 30 + i * 20, y + 52, 5, i < c.pass ? '#444' : '#ffd35a');
    const mx = 40 + w * c.ph; px.disc(g, mx, y - 20 * Math.sin(c.ph * Math.PI * 2), 4, '#fff'); for (let i = 0; i < c.hits; i++) U.text(g, '✓', W / 2 - 20 + i * 14, y - 50, '#6affb0', { scale: 2 });
    U.capText(g, this.game, 'useTool', G.game.input.lastDevice === 'gamepad' ? 'L2 + R2 on the peak' : 'Press on the peak', W / 2 - 60, y + 70);
  }
  closing(g, W, H) { const c = this.S.close; if (c.hit == null) { const k = Math.max(0, 1 - c.t / c.len), r = 6 + 40 * k; Dr.ring(g, W / 2, H / 2, r, '#ffffff', 40); Dr.ring(g, W / 2, H / 2, 6, '#ffd35a', 18); U.capText(g, this.game, 'useTool', 'Dress the wound', W / 2 - 50, H / 2 + 56); } }
};
const LEARN = { forceps: ['FORCEPS', 'Grip the glass, pull along its line, drop it in the dish.'], salve: ['SALVE', 'Hold, then paint over the cut until it is covered.'], suture: ['SUTURE', 'Press one blue dot, cross the wound, release on the other.'], syringe: ['SYRINGE', 'Hold to fill, release away from targets to boost the pulse.'], scalpel: ['SCALPEL', 'Press the start dot and trace the purple line.'], suction: ['SUCTION', 'Hold over the pool to drain it.'], cautery: ['CAUTERY', 'Hold the beam on the orange ring. Never on bare tissue.'], sonar: ['SONAR', 'Hold to sweep. Hidden things light up inside the lens.'], triage: ['TRIAGE', 'Bleeders first, then arteries, then the rest.'], longbreath: ['LONG BREATH', 'Press the gift button: the world slows, your hands do not.'], secondlook: ['SECOND LOOK', 'Press the gift button after a mistake to take six seconds back.'], consult: ['CONSULT', 'Swap doctors: each has her own gift.'] };
const pick = a => a[Math.floor(Math.random() * a.length)];
const fmt = s => { s = Math.max(0, Math.floor(s)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
G.fmtTime = fmt;
})();
