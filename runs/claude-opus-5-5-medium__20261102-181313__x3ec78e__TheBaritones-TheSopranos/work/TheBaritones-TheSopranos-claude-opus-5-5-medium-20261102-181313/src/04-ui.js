/* ---- UI: the dialog box and its voices, the HUD, hints, and the two minigames (the stare-down and the breath) ---- */
const ui = new E.Shell(game, { theme: { accent: '#e8b84a', ink: '#f4ecd8', paper: 'rgba(16,12,10,.88)', font: '600 18px/1.35 "Trebuchet MS", system-ui, sans-serif', titleFont: '700 22px/1.2 Georgia, serif' } });
const talk = new E.Dialog(game, { voice: null, lines: 3, speed: 46, bg: ['#2a1a14', '#120a08'], border: '#e8b84a', nameColor: '#ffd36a' });

/* a conversation: a list of lines, each [who, text] or { who, text, choices, on(i) }; on(i) may return more lines */
const convoQ = [];
let convoDone = null, speaking = null, lastShown = 0;
function convo(lines, done) { convoQ.push(...lines.filter(Boolean)); if (done) convoDone = (convoDone ? [].concat(convoDone, done) : done); }
function convoBusy() { return talk.open || convoQ.length > 0; }
function nextLine() {
  const L0 = convoQ.shift(); if (!L0) return;
  const l = Array.isArray(L0) ? { who: L0[0], text: L0[1] } : L0;
  if (l.run) { l.run(); return; }
  speaking = l.who; lastShown = 0;
  const C = CAST[l.who], who = l.name || (C ? C.name : l.who.toUpperCase());
  talk.say(typeof l.text === 'function' ? l.text() : l.text, { name: who, auto: W.demo ? 1.4 : undefined, modal: !W.demo, portrait: C ? portraitOf(l.who) : null, portraitOpts: { zoom: 3 },
    choices: l.choices ? l.choices.map(c => typeof c === 'function' ? c() : c) : undefined,
    onChoice: l.choices ? i => { S.choices.push([l.id || '', i]); const more = l.on && l.on(i); if (more && more.length) convoQ.unshift(...more.filter(Boolean)); } : undefined });
}
function updateTalk(dt) {
  if (!talk.open && convoQ.length) nextLine();
  if (talk.open) {
    // the voices: a syllable every other letter, pitched by the letter and the speaker
    if (talk.shown > lastShown) { const page = (talk.pages[talk.i] || []).join(' '); for (let k = lastShown; k < talk.shown; k++) if (k % 2 === 0) { const ch = page[k] || 'a'; if (/[a-z]/i.test(ch)) babble(ch, speaking); } lastShown = talk.shown; }
    else if (talk.shown < lastShown) lastShown = talk.shown;
    const busy = talk.update(dt);
    if (!talk.open && !convoQ.length && convoDone) { const d = convoDone; convoDone = null; [].concat(d).forEach(f => f()); }
    return busy;
  }
  if (!convoQ.length && convoDone) { const d = convoDone; convoDone = null; [].concat(d).forEach(f => f()); }
  return false;
}

/* ---- toasts and hints (each hint once, while Settings → Tutorial hints is on) ---- */
function toast(title, text, s = 3.5) { if (!game.headless) ui.toast(title, text, s); W.lastToast = [title, text]; }
function hint(key, title, text) { if (S.seen[key] || !game.settings.hints || W.demo || HUB) return; S.seen[key] = 1; if (!game.headless) ui.tutorial(title, text, 9); W.lastHint = [title, text]; }

/* ---- the HUD: the objective, Sal's health and nerves, the money, the crew and the family ---- */
let hudNotes = [];
hudNote = (k, v) => { if (Math.abs(v) >= 1) hudNotes.push({ t: 2.2, text: (v > 0 ? '+' : '') + Math.round(v) + ' ' + (k === 'respect' ? 'RESPECT' : 'FAMILY'), color: v > 0 ? '#8af07a' : '#ff8a6a' }); };
function updateHud(dt, extra = {}) {
  hudNotes.forEach(n => n.t -= dt); hudNotes = hudNotes.filter(n => n.t > 0);
  if (game.headless) return;
  const h = hero(), use = h && !h.car && !talk.open && !W.mini ? nearestUse(h) : null;
  const o = W.objective;
  const st = {
    place: W.def ? W.def.name : '',
    objective: o ? { step: o.step || '', title: o.title, text: o.text || '', at: o.at ? { x: o.at.x, y: o.at.y, z: 0 } : undefined, from: o.at ? h : undefined } : undefined,
    bars: [], counts: [], prompt: use ? { act: 'interact', label: use.label } : h && h.car ? { act: 'interact', label: 'Get out' } : undefined
  };
  if (h) st.bars.push({ label: h.who === 'sal' ? 'Sal' : 'Nicky', value: Math.max(0, h.hp), max: h.max, color: h.hp < 30 ? '#ff5040' : '#e8b84a' });
  if (W.mode === 'story' && W.place !== 'office' && W.place !== 'diner') {
    st.bars.push({ label: 'Stress', value: S.stress, max: 100, color: S.stress > 75 ? '#ff4060' : S.stress > 50 ? '#f0a040' : '#80b0e0' });
    if (W.place === 'barrens') st.bars.push({ label: 'Warmth', value: W.cold, max: 100, color: W.cold < 30 ? '#80d0ff' : '#f0c890' });
    st.counts = [['Cash', money(S.cash)], ['Respect', Math.round(S.respect)], ['Family', Math.round(S.family)]];
    if (S.flags.gun) st.counts.push(['Rounds', S.ammo]);
  }
  for (const p of W.heroes.slice(1)) st.bars.push({ label: p.who === 'nicky' ? 'Nicky' : 'P2', value: Math.max(0, p.hp), max: p.max, color: '#ff6a5a' });
  Object.assign(st, extra);
  ui.hud(st);
}
function hideHud() { if (!game.headless) ui.hud({}); }

/* the pixel overlay: a boss bar, the meter notes, the hover focus, the minigames */
function drawOverlay(r) {
  const boss = W.foes.find(f => f.kind === 'boss' && !f.dead);
  if (boss) r.overlay(g => { const w = Math.min(220, r.W - 40), x = Math.round((r.W - w) / 2), y = r.H - 26; txt(g, 'CARMINE "THE TENOR" FALSETTI', r.W / 2, y - 11, '#ffd0c0', { align: 'center' }); E.ui.bar(g, x, y, w, 6, boss.hp / boss.max, '#d83a3a'); });
  if (hudNotes.length) r.overlay(g => hudNotes.forEach((n, i) => txt(g, n.text, r.W / 2, 40 + i * 10 - (2.2 - n.t) * 6, n.color, { align: 'center' })));
  if (W.hover && !W.mini && !talk.open) r.overlay(g => { const p = I.pointer(); if (p) txt(g, (I.lastDevice === 'mouse' ? 'Click: ' : '') + W.hover.label, p[0] + 8, p[1] + 6, '#ffe070'); });
  if (W.banner) r.overlay(g => { const b = W.banner; const a = Math.min(1, b.t * 2, (b.dur - b.t) * 2); if (a <= 0) return; const y = Math.round(r.H * .2); E.font.title(g, b.title, r.W / 2, y, { scale: 2, align: 'center', colors: ['#fff4d8', '#e8b84a', '#a86a2a'] }); if (b.sub) txt(g, b.sub, r.W / 2, y + 30, '#f4ecd8', { align: 'center' }); });
  if (W.mini) W.mini.draw(r);
  if (S.stress > 80 && W.mode === 'story' && !W.mini) r.overlay(g => { const k = (S.stress - 80) / 20 * (.5 + .5 * Math.sin(game.time * 8)); if (k > .05) px.blend(g, k * .35, 'normal', () => { px.rect(g, 0, 0, r.W, 6, '#600010'); px.rect(g, 0, r.H - 6, r.W, 6, '#600010'); px.rect(g, 0, 0, 6, r.H, '#600010'); px.rect(g, r.W - 6, 0, 6, r.H, '#600010'); }); });
}
function updateBanner(dt) { if (W.banner) { W.banner.t += dt; if (W.banner.t > W.banner.dur) W.banner = null; } }
function banner(title, sub, dur = 3) { W.banner = { title, sub, t: 0, dur }; }

/* the mouse: hover moves the focus over people and things; a click on one walks Sal over and uses it */
function updateHover() {
  W.hover = null;
  const h = hero(); if (!h || h.car || game.headless || W.demo) return;
  if (I.lastDevice !== 'mouse') return;
  const p = I.pointer(); if (!p || !game.r) return;
  const picked = game.r.pick ? game.r.pick(p[0], p[1]) : null;
  const target = picked && (Array.isArray(picked) ? picked[0] : picked);
  const list = interactables();
  let u = target ? list.find(u => u.who === target) : null;
  if (!u) { const g = game.mouseGround(); if (g) { let bd = 18; for (const v of list) { const d = Math.hypot(v.x - g[0], v.y - g[1]); if (d < bd) { bd = d; u = v; } } } }
  W.hover = u || null;
  const c = I.clicked();
  if (u && c) { I.suppressCode && I.suppressCode('Mouse0'); I.consume('attack');
    if (Math.hypot(u.x - h.x, u.y - h.y) < u.r) u.act(h);
    else h.goTo = { x: u.x, y: u.y, use: u };
  }
}

/* ---- MINIGAME: THE STARE-DOWN. A needle sweeps; stop it in the gold three times (the zone narrows) ---- */
function stareDown(who, done) {
  const m = W.mini = { kind: 'stare', t: 0, u: 0, dir: 1, hits: 0, tries: 0, need: 3, max: 5, zone: .26, center: rnd(.35, .65), flash: 0, msg: '', who,
    update(dt) {
      m.t += dt; m.flash = Math.max(0, m.flash - dt);
      const sp = .9 + m.tries * .18; m.u += m.dir * sp * dt; if (m.u > 1) { m.u = 1; m.dir = -1; } if (m.u < 0) { m.u = 0; m.dir = 1; }
      if (m.over) { m.over -= dt; if (m.over <= 0) { W.mini = null; done(m.hits >= m.need); } return; }
      if (game.players.some(p => p.pressed('attack') || p.pressed('confirm') || p.pressed('interact')) || m.auto && Math.abs(m.u - m.center) < m.zone / 3) {
        m.tries++; const ok = Math.abs(m.u - m.center) < m.zone / 2;
        if (ok) { m.hits++; A.sfx('punch'); game.shake(2); m.msg = pick(['He blinks.', 'He sweats.', 'He looks at his shoes.']); m.zone *= .78; m.center = rnd(.25, .75); }
        else { A.sfx('cancel'); m.msg = pick(['He holds your look.', 'He smirks.', 'Too soon.']); }
        m.flash = .3;
        if (m.hits >= m.need || m.tries - m.hits > m.max - m.need) m.over = 1.2;
      }
    },
    draw(r) {
      r.overlay(g => {
        const w = Math.min(260, r.W - 40), x = Math.round((r.W - w) / 2), y = Math.round(r.H * .3);
        E.ui.box(g, x - 10, y - 34, w + 20, 82, { bg: ['#2a1a14', '#120a08'], border: '#e8b84a' });
        txt(g, 'THE STARE-DOWN', r.W / 2, y - 26, '#ffd36a', { align: 'center' });
        txt(g, 'Stop the needle in the gold: ' + label('attack') + ' (' + m.hits + ' of ' + m.need + ')', r.W / 2, y - 14, '#f4ecd8', { align: 'center' });
        px.rect(g, x, y, w, 14, '#3a2a24'); const zx = x + (m.center - m.zone / 2) * w; px.rect(g, Math.round(zx), y, Math.round(m.zone * w), 14, '#c89a3a'); px.rect(g, Math.round(zx + m.zone * w * .3), y, Math.round(m.zone * w * .4), 14, '#f0c860');
        const nx = Math.round(x + m.u * w); px.rect(g, nx - 1, y - 4, 3, 22, '#ffffff');
        for (let i = 0; i < m.need; i++) px.disc(g, r.W / 2 - (m.need - 1) * 8 + i * 16, y + 26, 4, i < m.hits ? '#8af07a' : '#4a3a34');
        if (m.msg) txt(g, m.msg, r.W / 2, y + 36, m.flash > 0 ? '#ffffff' : '#c8b8a8', { align: 'center' });
      });
    } };
  return m;
}

/* ---- MINIGAME: THE PANIC ATTACK. Breathe with the ring: hold while it grows, let go while it shrinks ---- */
function panicAttack(done, o = {}) {
  A.sfx('heart'); music(null);
  const m = W.mini = { kind: 'breathe', t: 0, score: 0, need: 6, limit: 16, beat: 0, over: 0, auto: o.auto, held: false,
    update(dt) {
      m.t += dt; m.beat -= dt; if (m.beat <= 0) { m.beat = .55 - Math.min(.25, m.score * .04); A.sfx('heart', { vol: .8 }); }
      if (m.over) { m.over -= dt; if (m.over <= 0) { W.mini = null; done(m.score >= m.need); } return; }
      const cyc = (m.t % 4) / 4, inhale = cyc < .5, ring = inhale ? cyc * 2 : 2 - cyc * 2;
      m.ring = ring; m.inhale = inhale;
      const hold = m.auto ? inhale : game.players.some(p => p.down('interact') || p.down('confirm') || p.down('attack'));
      if (hold && !m.held && inhale) A.sfx('breath');
      m.held = hold;
      m.score += (hold === inhale ? 1 : -.6) * dt * .75; m.score = Math.max(0, m.score);
      if (m.score >= m.need || m.t > m.limit) m.over = 1;
    },
    draw(r) {
      r.overlay(g => {
        const k = clamp(1 - m.score / m.need, 0, 1);
        px.blend(g, .55 + k * .3, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0410'));
        const cx = Math.round(r.W / 2), cy = Math.round(r.H / 2) - 6, R = 14 + m.ring * 40;
        px.disc(g, cx, cy, Math.round(R) + 2, m.held === m.inhale ? '#e8b84a' : '#a83a4a'); px.disc(g, cx, cy, Math.round(R), '#1a1024');
        px.disc(g, cx, cy, 10, m.inhale ? '#80b0e0' : '#e8b0c0');
        E.font.title(g, m.inhale ? 'BREATHE IN' : 'BREATHE OUT', cx, cy - 72, { scale: 2, align: 'center', colors: ['#ffffff', '#c8d8f0', '#8090b0'] });
        txt(g, (m.inhale ? 'Hold ' : 'Let go of ') + label('interact') + (m.inhale ? ' while the ring grows' : ' while it shrinks'), cx, cy + 56, '#f4ecd8', { align: 'center' });
        E.ui.bar(g, cx - 60, cy + 70, 120, 5, m.score / m.need, '#8af07a');
        txt(g, 'PANIC ATTACK  ' + Math.max(0, Math.ceil(m.limit - m.t)), cx, 14, '#ff8090', { align: 'center' });
      });
    } };
  return m;
}
