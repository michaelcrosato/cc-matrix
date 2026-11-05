/* 19-wire: the wire room (§6.6, App. D). A shift is a list of calls on a session clock (a game hour in about 45 s; hold
   R2 / Shift to fast-forward the silence). The law: you may listen for the first few seconds of a call (8 on Detective)
   to judge it; a call that isn't pertinent must be minimized (□) or Legal climbs 4 a second. Minimized, you may
   spot-check for 3 s every 10 s. ✕ logs a key line while it's spoken (or 2 s after). △ matches the voice to a print. */
const VOICEPRINT = id => { const p = voiceOf(id), wi = ['sine', 'triangle', 'square', 'sawtooth'].indexOf(p.wave); return Array.from({ length: 16 }, (_, i) => Math.round(8 * (.5 + .5 * Math.sin(p.base / 37 * (i + 1) + p.formant * 3 + wi)))); };
const vpHtml = id => `<span class="vp">${VOICEPRINT(id).map(h => `<i style="height:${2 + h * 2.4}px"></i>`).join('')}</span>`;
const Wire = {
  s: null, sess: null,
  start(sid, done) {
    const S = WIRE_SESSIONS[sid]; this.sid = sid; this.S = S; this.done = done;
    const extra = F().ops1 === 'ot' && sid !== 's3' ? 1 : 0;
    this.clock = parseClock(S.from); this.end = parseClock(S.to) + extra + (parseClock(S.to) < parseClock(S.from) ? 24 : 0);
    this.calls = all('calls').filter(c => c.session === sid && (!c.if || c.if())).map(c => Object.assign({}, c, { at: parseClock(c.t) + (parseClock(c.t) < parseClock(S.from) ? 24 : 0) })).sort((a, b) => a.at - b.at);
    this.calls = this.calls.map(c => this.route(c)).filter(Boolean);
    this.cur = null; this.panel = 0; this.legal0 = STATE.meters.legal; this.logged = []; this.minRec = { ok: 0, bad: 0 }; this.pages = []; this.unlocked = []; this.over = false; this.pulled = false;
    this.legalAcc = 0; this.tipShown = {};
    Snd.music('wire'); Amb.set('wire');
    this.s = UI.open({ id: 'wire', cls: 'siderun wireside', allowPause: true, onBack: null, noNav: true, noConfirm: true,
      html: () => this.html(), legend: () => this.over ? [['confirm', 'Continue']] : [['uiAlt', this.cur && this.cur.min ? 'Spot-check' : 'Minimize'], ['confirm', this.panel === 2 && this.pages.some(p => !Cipher.solved(p)) ? 'Decode the page' : 'Log line'], ['uiInfo', 'Voice ID'], ['tabPrev', 'Panel'], ['tabNext', 'Panel'], ['uiFast', 'Hold: fast-forward']],
      // ✕ logs the line; on the PAGER panel it decodes the page under the pointer or the first one waiting (the room has no d-pad focus)
      keys: { confirm: id => this.over ? this.finish() : this.panel === 2 && this.pageFor(id) ? this.decode(this.pageFor(id)) : this.log(), uiAlt: () => this.minimize(), uiInfo: () => this.voiceId(), tabPrev: () => this.tab(-1), tabNext: () => this.tab(1) },
      onSelect: id => { if (id === 'min') this.minimize(); else if (id === 'log') this.log(); else if (id === 'vid') this.voiceId(); else if (id === 'end') this.finish(); else if (id.startsWith('tab:')) { this.panel = +id.slice(4); this.render(); } else if (id.startsWith('pg:')) this.decode(id.slice(3)); },
      tick: dt => this.tick(dt) });
    if (S.intro) Talk.play(S.intro);
  },
  /** a call on a dead or untapped line moves to the nearest live one, or drops */
  route(c) {
    if (c.type === 'page') return STATE.numbers.PG && STATE.numbers.PG.tapped ? c : null;
    const opts = Array.isArray(c.line) ? c.line : [c.line], heat = STATE.meters.heat;
    const live = q => { const n = STATE.numbers[q]; if (!n || !n.tapped || n.dead) return false; if (heat >= 50 && this.sid === 's2' && q === 'P3') return false; return true; };   // payphone rotation: a tapped line goes dead early
    const k = opts.find(live) || ['P1', 'P2', 'P3', 'B1', 'B2', 'B3', 'B4', 'B5'].filter(x => opts[0][0] === x[0]).find(live);
    if (!k) return null; return Object.assign(c, { lineNow: k });
  },
  tab(d) { this.panel = (this.panel + d + 3) % 3; this.render(); },
  render() { if (this.s) UI.render(this.s); },
  tick(dt) {
    if (this.over || Talk.open) return;
    const I = game.input, ff = I.down('uiFast') && !this.cur;
    this.clock += dt / 45 * (ff ? 4 : 1);
    if (!this.cur) {
      const nx = this.calls.find(c => !c.done);
      if (!nx) { if (this.clock >= this.end) this.wrap(); else if (this.clock < this.end) this.clock = Math.min(this.end, this.clock + dt / 45 * 3); this.paintLive(); return; }
      if (this.clock >= nx.at) this.begin(nx);
      this.paintLive(); return;
    }
    const c = this.cur; c.t += dt;
    // the law: past the window on a call that isn't pertinent, Legal climbs
    const pertinent = this.pertinent(c);
    if (!c.min && !pertinent && c.t > this.win()) {
      this.legalAcc += 4 * dt; if (this.legalAcc >= 1) { const n = Math.floor(this.legalAcc); this.legalAcc -= n; Meters.add('legal', n, 'Listening past the window', true); if (!c.violated) { c.violated = true; STATE.stats.violations++; this.minRec.bad++; Snd.play('bump'); if (c.over) Talk.radio('hal', c.over, 3.5); else Talk.radio('hal', 'That\'s not ours, Detective. Minimize.', 3); } }
      if (c.id === 'S3-4') F().heardS34 = true;
      if (STATE.meters.legal >= 100) { this.pull(); return; }
    }
    if (c.spot > 0) { c.spot -= dt; if (c.spot <= 0) { if (this.pertinent(c)) { c.min = false; Toast('It turned pertinent', 'You\'re clear to listen.'); } else c.min = true; this.render(); } }
    if (c.minCd > 0) c.minCd -= dt;
    // play the lines
    if (c.type === 'page') { if (c.t > 1.2) this.endCall(); return; }
    if (!c.typer && c.li < c.lines.length) {
      const [who, text] = c.lines[c.li]; c.lineStart = c.t;
      c.typer = new Typer(text, who, { filter: 'phone', mute: c.min && !(c.spot > 0), onChar: () => this.paintLive() });
      c.speaker = who; if (VOICES[who] && PEOPLE[who] && !STATE.wire.heard[who]) STATE.wire.heard[who] = true;
    }
    if (c.typer) {
      c.typer.o.mute = c.min && !(c.spot > 0); c.typer.update(dt);
      if (c.typer.done) { c.gap = (c.gap || 0) + dt; if (c.gap > .7) { c.lastKey = c.keys && c.keys.includes(c.li) ? { li: c.li, until: c.t + 2 } : c.lastKey; c.typer = null; c.gap = 0; c.li++; if (c.li >= c.lines.length) this.endCall(); } }
    }
    this.paintLive();
  },
  win() { return DIFF.window; },
  pertinent(c) { return c.type === 'P' || c.type === 'page' || (c.type === 'T' && c.li >= c.turnAt); },
  begin(c) {
    c.t = 0; c.li = 0; c.min = false; c.spot = 0; c.minCd = 0; c.typer = null; this.cur = c; c.started = true;
    if (c.type === 'page') { Snd.pager(); this.pages.push(c.page); Toast('Page on the clone', PAGES[c.page].enc + ' ' + PAGES[c.page].code + ' ' + PAGES[c.page].from); Snd.layer('pulse', 1); }
    else { Snd.play('phonering', { vol: .5 }); Voice.phone(true); Snd.play('reel'); if (c.type !== 'N') Snd.layer('pulse', 1); }
    if (!this.tipShown.first && c.type !== 'page') { this.tipShown.first = true; if (tip('wire1')) Tut.say('The wire', 'You have ' + this.win() + ' seconds to decide if a call is pertinent. Not ours? ' + Prompts.label('uiAlt') + ' minimizes. Key line? ' + Prompts.label('confirm') + ' logs it.'); }
    this.render();
  },
  endCall() {
    const c = this.cur; if (!c) return; c.done = true; this.cur = null; Voice.phone(false); Snd.play('hangup'); Snd.layer('pulse', 0, 2);
    if (c.type === 'N') { if (c.min) this.minRec.ok++; }
    if (c.type !== 'page' && c.unlock && (c.keysLogged || 0) > 0) try { c.unlock(this); } catch (e) { game.fail('call unlock', e); }
    if (c.after) try { c.after(this); } catch (e) { game.fail('call after', e); }
    this.render();
  },
  minimize() {
    const c = this.cur; if (!c || c.type === 'page' || this.over) return;
    if (!c.min) { c.min = true; c.minFrom = c.li; c.minCd = 0; STATE.stats.minimized++; Snd.play('reel'); if (!this.pertinent(c) && c.t <= this.win()) { /* clean */ } this.render(); return; }
    if (c.minCd > 0) { Toast('Spot-check', 'Once every 10 seconds.'); return; }
    c.spot = 3; c.minCd = 10; Snd.play('reel'); this.render();
  },
  log() {
    const c = this.cur; if (!c || c.type === 'page') { Snd.play('bump', { vol: .3 }); return; }
    const now = c.typer ? c.li : null, key = c.keys || [];
    const hit = (now !== null && key.includes(now) && !(c.min && !(c.spot > 0))) ? now : (c.lastKey && c.t <= c.lastKey.until && !c.minAt) ? c.lastKey.li : null;
    if (hit === null || (c.logged || []).includes(hit)) { Talk.radio('hal', 'Write that down if you want, it ain\'t evidence.', 2.5); return; }
    if (c.min && !(c.spot > 0)) { Toast('Minimized', 'You can\'t log what you didn\'t hear.'); return; }
    (c.logged = c.logged || []).push(hit); c.keysLogged = (c.keysLogged || 0) + 1;
    const [who, text] = c.lines[hit], id = 'int:' + c.id + ':' + hit;
    addEvidence({ id, kind: 'int', ref: who, line: c.lineNow, pts: 1, text: c.id + ' ' + (c.lineNow || '') + ' ' + clockStr(this.clock) + ' — ' + (this.known(who, c) ? nameOf(who) : 'UNKNOWN') + ': "' + text + '"' });
    STATE.wire.logs.push({ call: c.id, line: hit, t: clockStr(this.clock) }); STATE.stats.logged++; this.logged.push({ c, hit }); addFact('int:' + c.id);
    casePoint('int', 'Logged: ' + c.id); Snd.play('typekey'); this.render();
  },
  known(who, c) { return Object.values(STATE.wire.ids).includes(who) && Object.keys(STATE.wire.ids).some(k => STATE.wire.ids[k] === who); },
  label(who, c) { if (this.known(who, c)) return nameOf(who); const sp = [...new Set(c.lines.map(l => l[0]))]; const i = sp.indexOf(who); const fem = ['odessa', 'keisha', 'gloria', 'ren', 'vance'].includes(who) || /woman|girl|arnetta|pauline/.test(who); return 'UNKNOWN ' + (fem ? 'FEMALE' : /kid/.test(who) || ['pigeon', 'moe'].includes(who) ? 'JUVENILE' : 'MALE') + ' ' + (i + 1); },
  voiceId() {
    const c = this.cur; if (!c || c.type === 'page' || !c.speaker) { Toast('Voice ID', 'Wait for someone to talk.'); return; }
    const prints = [...new Set(STATE.wire.voiceprints.concat(Object.keys(STATE.wire.heard)).filter(id => VOICES[id] && PEOPLE[id] && PEOPLE[id].rig))].slice(0, 8);
    const who = c.speaker;
    UI.choose({ kicker: 'Voice ID · ' + this.label(who, c), title: 'Whose voice?', text: 'Voices you have heard in person. Match the vowels.', allowPause: true, back: () => UI.close(),
      cards: prints.map(id => ({ id, label: nameOf(id), sub: '' })) }, id => {
      if (id === who) { STATE.wire.ids[c.lineNow + ':' + who] = who; addFact('num:' + c.lineNow + ':' + who); addFact('voice:' + who); addEvidence({ id: 'voice:' + c.lineNow + ':' + who, kind: 'int', ref: who, line: c.lineNow, pts: 1, text: 'Voice ID: ' + nameOf(who) + ' on ' + c.lineNow }); casePoint('voice', 'Voice ID: ' + nameOf(who) + ' on ' + c.lineNow); Snd.play('secret'); }
      else { Talk.radio('hal', 'Listen to the vowels. That\'s not him.', 3); }
      this.render();
    });
    // the strip shows prints: paint them into the cards
    if (!HEADLESS) requestAnimationFrame(() => { const t = UI.top(); if (!t || !t.el) return; for (const b of t.el.querySelectorAll('.card')) { const id = b.dataset.f; b.insertAdjacentHTML('beforeend', vpHtml(id)); } });
  },
  pageFor(id) { const f = id && id.startsWith('pg:') ? id.slice(3) : null; return f && !Cipher.solved(f) ? f : this.pages.find(p => !Cipher.solved(p)) || null; },
  decode(pid) { Cipher.open([pid], { onClose: () => this.render() }); },
  pull() { this.pulled = true; Meters.add('brass', -20, 'Judge Halloway pulled the wire'); Voice.phone(false); Talk.play([['halloway', 'I warned you, Detective. A grandmother\'s phone call, in your transcripts. The wire is down.'], ['hal', 'We\'ll get what we need the hard way. We always used to.']], () => { for (const c of this.calls) if (!c.done && c.unlock && c.type !== 'N') try { c.unlock(this); } catch (e) { /* keep going */ } this.wrap(); }); },
  wrap() {
    if (this.over) return; this.over = true; Voice.phone(false); if (this.cur) { this.cur.done = true; this.cur = null; }
    const dL = STATE.meters.legal - this.legal0; this.result = { logged: this.logged.length, pert: this.calls.filter(c => c.type !== 'N').length, dL, min: this.minRec };
    if (this.S.wrap) try { this.S.wrap(this); } catch (e) { game.fail('wire wrap', e); }
    this.render();
  },
  finish() { UI.close(this.s, true); this.s = null; const d = this.done; this.done = null; if (d) d(this.result); },
  paintLive() { if (this.panel !== 0 || !this.s || !this.s.el) return; const el = this.s.el.querySelector('.live'); if (el) el.innerHTML = this.liveHtml(); const ck = this.s.el.querySelector('.clock'); if (ck) ck.textContent = clockStr(this.clock); },
  liveHtml() {
    const c = this.cur;
    if (!c) return `<p class="min">Line quiet. ${this.calls.filter(x => !x.done).length} more calls expected before ${clockStr(this.end)}.</p><p class="muted">Hold <span data-g="uiFast"></span> to fast-forward the silence.</p>`;
    if (c.type === 'page') return `<p class="amb">PAGE ON THE CLONE</p><p class="digits">${esc(PAGES[c.page].enc + ' ' + PAGES[c.page].code + ' ' + PAGES[c.page].from)}</p>`;
    const left = Math.max(0, this.win() - c.t), ring = `<span class="ring" style="background:conic-gradient(${left > 0 ? '#ffb347' : '#3a5a3a'} ${left / this.win() * 360}deg,#1a2a1e 0)"></span>`;
    const hide = c.min && !(c.spot > 0), rook = game.settings.difficulty === 'rookie' && game.settings.hints;
    const lines = c.lines.slice(0, c.li + (c.typer ? 1 : 0)).map((l, i) => { const live = i === c.li && c.typer; const txt = live ? c.typer.shown : l[1]; const key = rook && c.keys && c.keys.includes(i);
      return `<p>${key ? '<span class="amb">★ </span>' : ''}<span class="sp">${esc(this.label(l[0], c))}:</span>${hide && (live || i >= (c.minFrom || 0)) ? '<span class="min">— minimized —</span>' : esc(txt)}</p>`; }).slice(-5).join('');
    const energy = `<div class="energy">${Array.from({ length: 24 }, (_, i) => `<i style="height:${hide || !c.typer ? 2 : 3 + Math.abs(Math.sin(game.real * 9 + i * 1.7)) * 18}px"></i>`).join('')}</div>`;
    return `<div>${ring}<b>${esc(c.lineNow)} · ${esc((STATE.numbers[c.lineNow] || {}).n || '')}</b> <span class="muted">${esc(PHONE_LABEL[c.lineNow] || '')}</span></div>
      <p class="muted">${left > 0 ? Math.ceil(left) + ' s to judge it' : c.min ? (c.spot > 0 ? 'SPOT-CHECK ' + Math.ceil(c.spot) + ' s' : 'Minimized' + (c.minCd > 0 ? ' · spot-check in ' + Math.ceil(c.minCd) + ' s' : ' · spot-check ready')) : 'Listening'}</p>
      ${c.speaker ? `<p>${vpHtml(c.speaker)} <span class="muted">${esc(this.label(c.speaker, c))}</span></p>` : ''}${energy}<div class="tx">${lines}</div>`;
  },
  html() {
    if (this.over) {
      const r = this.result || {};
      return `<div class="side"><div class="panel wire"><div class="kicker">Shift over · ${esc(clockStr(this.clock))}</div><h1>${this.pulled ? 'The wire is down' : 'Session log'}</h1>
        <p>Key lines logged: <b>${r.logged}</b></p><p>Calls minimized clean: <b>${r.min ? r.min.ok : 0}</b> · minimization violations: <b>${r.min ? r.min.bad : 0}</b></p><p>Legal ${r.dL >= 0 ? '+' : ''}${r.dL} (now ${STATE.meters.legal})</p>
        ${(this.unlocked || []).map(u => `<p class="amb">▸ ${esc(u)}</p>`).join('')}<button class="btn primary" data-f="end">Continue</button></div></div>`;
    }
    const tabs = ['LIVE', 'LOG', 'PAGER'].map((t, i) => `<span class="tab${i === this.panel ? ' on' : ''}" data-f="tab:${i}">${t}${i === 2 && this.pages.some(p => !Cipher.solved(p)) ? ' •' : ''}</span>`).join('');
    let body = '';
    if (this.panel === 0) body = `<div class="live">${this.liveHtml()}</div><div style="margin-top:.4em"><button class="btn" data-f="min"><span data-g="uiAlt"></span> ${this.cur && this.cur.min ? 'SPOT-CHECK' : 'MINIMIZE'}</button><button class="btn" data-f="log"><span data-g="confirm"></span> LOG</button><button class="btn" data-f="vid"><span data-g="uiInfo"></span> ID</button></div>`;
    else if (this.panel === 1) body = `<div class="tx">${STATE.wire.logs.slice(-8).map(l => { const ev = evidence('int:' + l.call + ':' + l.line); return `<p><span class="sp">${esc(l.call)} ${esc(l.t)}</span>${esc(ev ? ev.text.split('— ')[1] || ev.text : '')}</p>`; }).join('') || '<p class="min">Nothing logged yet.</p>'}</div>`;
    else body = `<div class="choices">${this.pages.map(p => `<button class="btn" data-f="pg:${p}">${Cipher.solved(p) ? '✓ ' + esc(STATE.cipher.decoded[p]) : '▸ DECODE ' + esc(PAGES[p].enc + ' ' + PAGES[p].code + ' ' + PAGES[p].from)}</button>`).join('') || '<p class="min">No pages yet.</p>'}</div>`;
    return `<div class="side"><div class="panel wire" style="flex:1"><div class="kicker">Wire room · <span class="clock">${esc(clockStr(this.clock))}</span> · until ${esc(clockStr(this.end))} · Legal ${STATE.meters.legal}</div><div class="tabs">${tabs}</div>${body}</div></div>`;
  }
};
