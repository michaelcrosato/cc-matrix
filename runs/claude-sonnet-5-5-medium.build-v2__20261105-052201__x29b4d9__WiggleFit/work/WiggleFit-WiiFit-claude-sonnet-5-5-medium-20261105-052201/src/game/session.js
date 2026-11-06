import * as THREE from 'three/webgpu';
import { esc, el } from '../ui/dom.js';
import { byId, REGISTRY } from '../data/events.js';
import { TITLE, SEAT_COLORS } from '../data/config.js';
import { createDoll } from '../art/doll.js';
import { Rig } from '../anim/rig.js';
import { medalOf, MEDALS } from '../events/base.js';

const SESSION_SET = ['poses', 'cairn', 'logReps', 'stepClass', 'plates', 'fruitHat', 'springboard'];
const SLOT = 62, INTRO = 6, PLAY = 50;
export function install(game) {
  const ui = game.ui, S = game.screens, A = () => window.AIHub;
  game.runSession = (info) => {
    const hub = A(); game.session = info; document.body.dataset.session = '1'; game.settings.music = Math.min(game.settings.music, 100); game.timeScale = 1;
    const r = hub.rng('deal'); const pool = SESSION_SET.filter((id) => byId(id)); const picks = []; while (picks.length < 3 && pool.length) picks.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
    const st = game.sess = { info, picks, slot: -1, ev: null, ready: false, total: 0, scores: [], sent: false, ended: false, lastProg: -1, lastSend: 0, ghosts: new Map(), card: { left: null }, fallsTotal: 0, bestMedal: 0, resultSent: false, stage: 'card', phase: '' };
    game.setScene('stage', { palette: 'noon', music: 'balance', instant: true }); game.go('sessionCard');
    hub.on('card', (c) => { st.card = c; drawCard(); }); hub.on('start', () => { st.started = true; }); hub.on('message', (d, from) => { if (d && d.t === 'g') st.ghosts.set(from, d); });
    hub.on('leave', (l) => { st.ghosts.delete(l.id); }); hub.on('time-up', () => sendResult()); hub.on('end', () => { st.ended = true; game.audio.stopAll(); ui.set('<div class="center" style="height:100%"></div>'); });
    window.addEventListener('keydown', (e) => { if (st.stage !== 'card') return; if (e.key === 'Enter' || e.code === 'Enter') hub.answer('ready'); if (e.key === 'm' || e.key === 'M' || e.code === 'KeyM') hub.answer('more'); });
    ui.root.addEventListener('click', (e) => { const t = e.target.closest('[data-answer]'); if (t) hub.answer(t.dataset.answer); });
    // build a stage so the card has a world behind it, then ready()
    st.cardEv = game.buildSessionStage(0, true); hub.ready();
    st.timer = setInterval(() => { if (st.ended) return clearInterval(st.timer); const T = hub.time() / 1000; if (!isFinite(T) || T < 0) return; if (performance.now() - (st.lastWall || 0) < 90) return; st.lastWall = performance.now(); const ev = game.ev; const me = ev && ev.lanes.find((l) => l.kind === 'local'); try { hub.send({ t: 'g', a: Math.max(0, st.slot), x: me && me.bal ? +me.bal.fx.toFixed(2) : 0, z: 0, lx: me && me.bal ? +me.bal.cobX.toFixed(2) : 0, lz: me && me.bal ? +me.bal.cobZ.toFixed(2) : 0, c: 0, f: me && me.bal && me.bal.fallen ? 1 : 0, s: Math.round(st.total) }, { reliable: false }); } catch (e) { /* ignore */ } }, 100);
  };
  game.buildSessionStage = (slot, cardOnly) => {
    const st = game.sess, info = st.info; const id = st.picks[Math.min(slot, st.picks.length - 1)];
    const lanes = info.players.map((p, i) => ({ kind: p.id === info.me ? 'local' : 'ghost', dev: game.input.lastDevice === 'pad' ? 'pad' + game.input.lastPad : 'kbm', name: p.name, colorIdx: i, paint: i, hat: 0, pid: p.id }));
    // local player first so lane 0 is "me"
    lanes.sort((a, b) => (a.kind === 'local' ? -1 : 0) - (b.kind === 'local' ? -1 : 0)); lanes.forEach((l, i) => { l.colorIdx = info.players.findIndex((p) => p.id === l.pid); l.paint = l.colorIdx; });
    game.eventOpts = { id, session: true, lanes, tier: 0, duration: PLAY, seed: 7 }; game.disposeEvent(); const ev = game.buildEvent(game.eventOpts); ev.camSnap = true; ev.updateCamera(0.1); return ev;
  };
  const sendResult = () => {
    const st = game.sess; if (!st || st.resultSent) return; st.resultSent = true; const hub = A();
    try { hub.result({ score: st.total, stats: { 'Floor Exercises': st.fallsTotal, 'Best medal': MEDALS[st.bestMedal], 'Classes': st.scores.length }, awards: st.fallsTotal === 0 && st.scores.length ? [{ title: 'Suspiciously Still', detail: 'No floor exercises at all' }] : [] }); } catch (e) { game.errors.push('result ' + e.message); }
    ui.set(`<div class="center" style="height:100%"><div class="paper big">Waiting for the others...</div><div class="mid" style="margin-top:20px">Trudy is filling in a clipboard.</div></div>`); st.stage = 'wait';
  };
  const drawCard = () => {
    const st = game.sess; if (!st || st.stage !== 'card') return; const info = st.info, c = st.card || {}; const ready = c.ready || [];
    const left = c.starting ? 'Starting...' : c.paused ? 'Paused' : c.left == null ? '' : Math.ceil(c.left / 1000) + 's';
    ui.set(`<div class="center" style="height:100%;justify-content:space-between"><div class="sign big">${esc(TITLE)}</div><div class="paper" style="text-align:center"><div class="row mid">${info.players.map((p) => `<span style="color:${p.color}">${ready.includes(p.id) ? '✔ ' : ''}${esc(p.name)}</span>`).join(' · ')}</div><div class="mid" style="margin:8px 0">Three classes. Stay balanced. Highest score wins.</div><div style="font-size:calc(var(--u)*30)">${ui.g('move')} Lean &nbsp; ${ui.g('feet')} Feet &nbsp; ${ui.g('flail')} Flail &nbsp; ${ui.g('hop')} Hop</div><div class="mid" style="margin-top:8px"><button class="tag" data-answer="ready" style="display:inline-block;min-width:0">Ready ${ui.g('ok')}</button> <button class="tag" data-answer="more" style="display:inline-block;min-width:0">More time ${ui.g('ask')}</button> &nbsp; ${left}</div></div></div>`);
  };
  S.sessionCard = { enter() { game.sess.stage = 'card'; drawCard(); }, nav(a) { const hub = A(); if (a === 'ok') hub.answer('ready'); else if (a === 'tri') hub.answer('more'); }, refresh() { drawCard(); }, frame(dt) { if (game.ev) game.ev.frame(dt); } };
  game.openSessionOverlay = () => { const o = el('div', 'paper', ''); o.id = 'sessov'; o.style.cssText = 'position:absolute;left:30vw;top:25vh;pointer-events:auto;min-width:40vw'; const s = game.settings; const mk = (k, l) => `<div class="slider"><span style="min-width:calc(var(--u)*220)">${l}</span><span class="bar"><i style="width:${s[k]}%"></i></span><span>${s[k]}</span></div>`; o.innerHTML = `<div class="mid"><b>Volumes</b></div>${mk('music', 'Music')}${mk('sound', 'Sound')}${mk('voice', 'Voice')}<div class="hint">Left / Right changes the focused volume · Options closes</div>`; ui.extra.appendChild(o); game.sessMenu = { k: 0, o }; };
  game.closeSessionOverlay = () => { const o = document.getElementById('sessov'); if (o) o.remove(); game.sessMenu = null; };
  // per-tick driver
  const base = game.fixed.bind(game);
  game.fixed = (dt) => {
    base(dt); const st = game.sess; if (!st || st.ended) return; const hub = A(); const T = hub.time() / 1000; if (!isFinite(T)) return;
    if (game.sessMenu) { for (const n of game.input.nav) { /* navs already drained by base */ } }
    if (T < 0) { st.stage = 'count'; const left = Math.ceil(-T); if (st.cdShown !== left) { st.cdShown = left; ui.set(`<div class="center" style="height:100%"><div class="huge" style="color:#fff;-webkit-text-stroke:calc(var(--u)*10) var(--ink);paint-order:stroke fill">${left}</div></div>`); game.audio.sfx('count'); } return; }
    // ghost + progress traffic from time 0
    if (T - st.lastSend > 0.1) { st.lastSend = T; const ev = game.ev; const me = ev && ev.lanes.find((l) => l.kind === 'local'); const msg = { t: 'g', a: Math.max(0, st.slot), x: me && me.bal ? +me.bal.fx.toFixed(2) : 0, z: 0, lx: me && me.bal ? +me.bal.cobX.toFixed(2) : 0, lz: me && me.bal ? +me.bal.cobZ.toFixed(2) : 0, c: 0, f: me && me.bal && me.bal.fallen ? 1 : 0, s: Math.round(st.total + (me ? me.form * 10 : 0)) }; try { hub.send(msg, { reliable: false }); } catch (e) { /* ignore */ } }
    const sec = Math.floor(T); if (sec !== st.lastProg) { st.lastProg = sec; try { hub.progress({ score: Math.round(st.total + (game.ev && st.phase === 'play' && game.ev.lanes[0] ? game.ev.lanes[0].form * 10 : 0)), label: (st.picks[Math.max(0, st.slot)] || '') + ' ' + Math.round(st.total) }); } catch (e) { /* ignore */ } }
    const slot = Math.min(st.picks.length, Math.floor(T / SLOT)); const within = T - slot * SLOT;
    if (slot >= st.picks.length) { if (!st.resultSent) { sendResult(); } return; }
    if (slot !== st.slot) { // finish the previous slot's score if skipped
      if (st.slot >= 0 && st.ev && !st.scoredSlots?.[st.slot]) scoreSlot(st.slot); st.slot = slot; st.ev = game.buildSessionStage(slot); st.phase = 'intro'; st.begun = false; ui.set(introCard(st.ev)); game.audio.play(st.ev.cls.music || 'balance', 0); st.scoredSlots = st.scoredSlots || {}; }
    const ev = game.ev; if (!ev) return;
    if (within >= INTRO - 3 && !st.begun) { st.begun = true; ui.clear(); ev.begin(); game.buildHud(); game.showHud(true); st.phase = 'play'; }
    if (within >= INTRO + PLAY && ev.phase !== 'done') { ev.finish(); }
    if (within >= INTRO + PLAY && !st.scoredSlots[slot]) { scoreSlot(slot); game.showHud(false); ui.set(`<div class="center" style="height:100%;justify-content:flex-start"><div class="paper big" style="margin-top:6vh">${esc(ev.cls.title)}: ${Math.round(ev.lanes[0].form * 10)}</div></div>`); }
    // ghosts
    for (const lane of ev.lanes) { if (lane.kind !== 'ghost') continue; const d = st.ghosts.get(lane.pid); if (!d || d.a !== slot) { lane.doll.root.visible = false; continue; } lane.doll.root.visible = true; lane.gx = (lane.gx ?? d.lx) + (d.lx - (lane.gx ?? d.lx)) * 0.2; lane.gz = (lane.gz ?? d.lz) + (d.lz - (lane.gz ?? d.lz)) * 0.2; const ml = 0.314; if (d.f) { lane.rig.play('flop', 0.1); lane.doll.root.rotation.set(0, 0, 0); } else { lane.rig.play('idle', 0.2); lane.doll.root.rotation.set(lane.gz * ml, 0, -lane.gx * ml); } lane.doll.root.position.x = lane.x; lane.rig.update(dt); }
  };
  const introCard = (ev) => `<div class="center" style="height:100%;justify-content:flex-start"><div class="paper" style="margin-top:3vh;max-width:60vw"><div class="big">${esc(ev.cls.title)}</div><div class="mid">${esc(ev.cls.intro.line)}</div></div></div>`;
  const scoreSlot = (slot) => { const st = game.sess; if (st.scoredSlots[slot]) return; st.scoredSlots[slot] = true; const ev = game.ev; const me = ev && ev.lanes.find((l) => l.kind === 'local'); if (!me) return; const s = Math.round(Math.max(0, Math.min(100, me.form)) * 10); st.total += s; st.scores.push(s); st.fallsTotal += me.falls; st.bestMedal = Math.max(st.bestMedal, medalOf(me.form, 1)); };
}
