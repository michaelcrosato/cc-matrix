import { initRenderer, R, THREE, renderFrame, captureToImage, makeTextures, makeParticles } from './render.js';
import { UI, showError } from './ui.js';
import { Game } from './game.js';
import './game2.js';
import { audio } from './audio.js';
import { input } from './input.js';
import { settings } from './settings.js';
import { store } from './util.js';
import * as MODELS from './models.js';

const IDLE_MS = 10000;
const ui = new UI();
let game, state = 'boot', idle = 0, lastT = performance.now(), campaign = false, curStage = 1, carry = null, attractStage = 2, lastAct = performance.now();
const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

function touchOnly() {
  const m = (q) => matchMedia(q).matches;
  return m('(any-pointer: coarse)') && !m('(any-pointer: fine)') && !m('(any-hover: hover)');
}
function startTitle() {
  state = 'title'; idle = 0; lastAct = performance.now(); ui.hud.setDemo(false);
  game.start(1, { title: true }); ui.show('press');
}
function setIdleReset() { idle = 0; }

const actions = {
  toMain() { audio.ensure(); if (audio.pendingMusic) audio.playMusic(audio.pendingMusic); ui.show('main'); audio.sfx('select'); },
  begin(id, camp) { campaign = camp; ui.show('briefing', { id, campaign: camp }, true); },
  async launch(id, camp) {
    audio.ensure(); campaign = camp; curStage = id; if (id === 1 || !camp) carry = null;
    await ui.fadeTo(true, 300); ui.close();
    game.start(id, { carry }); state = 'play'; ui.hud.setDemo(false);
    await ui.fadeTo(false, 500);
  },
  resume() { game.paused = false; ui.close(); state = 'play'; },
  async retry() {
    const cp = game.checkpoint; const deaths = game.stats.deaths;
    await ui.fadeTo(true, 250); ui.close();
    game.start(curStage, { checkpointS: cp.s, carry: { score: Math.floor(cp.score * 0.9), kills: cp.kills, laser: cp.laser, maxHealth: cp.maxHealth, bombs: cp.bombs }, deaths });
    state = 'play'; await ui.fadeTo(false, 400);
  },
  async restart() { await ui.fadeTo(true, 250); ui.close(); game.start(curStage, { carry: curStage === 1 ? null : carry }); state = 'play'; await ui.fadeTo(false, 400); },
  async quit() { await ui.fadeTo(true, 250); ui.close(); startTitle(); await ui.fadeTo(false, 400); },
  next() { actions.launch(2, true); },
};
ui.setActions(actions);

function finishStage() {
  const g = game, P = g.p, st = g.stats;
  const time = (performance.now() - st.start) / 1000;
  const safe = g.allies.filter((a) => a.state !== 'gone' && !(a.helped)).length;
  const lost = st.alliesLost, saved = st.saved || 0;
  const shield = P.health / P.maxHealth * 100;
  const bonus = Math.round(shield * 20 + saved * 500 + Math.max(0, (g.stage.par || 90) * (g.mode === 'rail' ? 1 : 1) - time) * 15 + (st.deaths === 0 ? 1500 : 0) + (g.allies.length - lost) * 300);
  const total = P.score + bonus;
  const target = g.stageId === 1 ? 22000 : 14000;
  const f = total / target; const rank = f >= 1 ? 'S' : f >= 0.75 ? 'A' : f >= 0.5 ? 'B' : f >= 0.3 ? 'C' : 'D';
  const best = store.get('best' + g.stageId, 0); const newBest = total > best;
  if (newBest) { store.set('best' + g.stageId, total); store.set('rank' + g.stageId, rank); }
  carry = { score: total, kills: P.kills, laser: P.laser, maxHealth: P.maxHealth, bombs: P.bombs };
  const res = { name: g.stage.name, kills: P.kills, saved, lost, safe: g.allies.length - lost - saved < 0 ? 0 : g.allies.length - lost - saved, shield, time: fmtTime(time), bonus, total, rank, newBest, next: campaign && g.stageId < 2 };
  state = 'results'; ui.hud.show(false); ui.show('results', res); audio.playMusic('victory');
}

function startAttract() {
  state = 'attract'; ui.close();
  attractStage = attractStage === 1 ? 2 : 1;
  const cps = [0, 1300, 2800, 4650, 6450];
  const cp = attractStage === 1 ? cps[Math.floor(Math.random() * cps.length)] : 0;
  game.start(attractStage, { attract: true, checkpointS: cp || undefined, carry: { laser: attractStage === 1 && cp > 3300 ? 1 : 0 } });
  ui.hud.show(true); ui.hud.setDemo(true); audio.stopMusic();
  if (audio.ctx) audio.playMusic(game.stage.music);
}

function pauseGame() { if (state !== 'play' || !game.p.alive || game.cleared) return; game.paused = true; state = 'paused'; ui.show('pause'); audio.sfx('select'); }

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - lastT) / 1000); lastT = now;
  const inp = input.poll(dt, now);
  if (input.device === 'pad' || inp.any) { /* audio unlock */ if (inp.any || input.activity) audio.ensure(); }
  if (!game) return;
  if (inp.any && audio.ctx === null) audio.ensure();
  // gate: touch-only waits for keyboard/pad
  if (state === 'touchgate') { ui.update(dt, inp); if (inp.any && (input.anyKeySeen || input.padConnected)) { startTitle(); } }
  else if (state === 'attract') {
    if (inp.any || inp.confirm) { game.running = false; ui.hud.setDemo(false); startTitle(); }
    else game.update(dt, inp);
  } else if (state === 'play') {
    if (inp.pause) pauseGame();
    else { for (let k = 0; k < (window.__steps || 1); k++) game.update(Math.min(dt, 1 / 30), inp); if (inp.skip) ui.hud.skipComm(); }
  } else if (state === 'title' || state === 'paused' || state === 'results' || state === 'dead') {
    if (state === 'title') { game.update(dt, inp); if (inp.any || input.mouse.moved > lastAct) lastAct = now; if (now - lastAct > IDLE_MS && !touchOnly()) { startAttract(); } }
    ui.update(dt, inp);
  }
  ui.hud.update(dt, R.camera);
  document.hidden && state === 'play' && pauseGame();
  renderFrame();
}

(async () => {
  try {
    if (!navigator.gpu) throw new Error('navigator.gpu is not available.');
    await initRenderer(document.getElementById('c'));
  } catch (e) { console.error(e); showError(String(e.message || e)); return; }
  makeTextures(); makeParticles();
  game = new Game(ui); await game.init();
  game.on('clear', finishStage);
  game.on('dead', () => { state = 'dead'; ui.show('dead'); audio.playMusic('defeat'); });
  game.on('attractNext', () => startAttract());
  window.__test = { M: MODELS, game, ui, input, audio, actions, R, THREE, setState: (s) => (state = s), getState: () => state, startAttract, finishStage };
  window.__capture = captureToImage;
  if (touchOnly()) { state = 'touchgate'; game.start(1, { title: true }); ui.show('touch'); }
  else startTitle();
  window.__ok = true;
  requestAnimationFrame(frame);
  // state transitions that need 'dead' etc.
  setInterval(() => { if (state === 'play' && ui.open === false) idle = 0; }, 1000);
})().catch((e) => { console.error(e); window.__err = String(e && e.stack || e); });
