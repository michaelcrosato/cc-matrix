'use strict';

const CLASS_IDS = ['stork', 'candle', 'step', 'slalom', 'tray'];

function enhanceModes() {
  const main = app.querySelector('main');
  if (!main) return;
  if (state.screen === 'class') {
    const explanation = main.querySelector('.section-head p');
    if (explanation) explanation.textContent = 'Up to four share the screen. Add bots, use I J K L for player 2, or press Start on another controller to join.';
    const first = main.querySelector('[data-action="class-toggle"][data-id="0"]');
    if (first) { first.textContent = 'YOU'; first.disabled = true; }
    const second = main.querySelector('[data-action="class-toggle"][data-id="1"]');
    if (second && state.classPlayers[1]?.source === 'bot') second.textContent = 'USE KEYBOARD 2';
    else if (second && state.classPlayers[1]?.source === 'keyboard') second.textContent = 'REMOVE';
  }
  if (state.screen === 'class-result' && state.classScores) {
    main.innerHTML = `<div class="card dialogue"><div class="eyebrow">✳ &nbsp; EVERYONE SHOWED UP</div><h1>A class act.</h1><p>Each score comes from that player's own practice.</p>${state.classScores.map((entry, index) => `<div class="row"><span>${index === 0 ? '★ &nbsp;' : ''}${escapeHTML(entry.name)}${entry.bot ? ' · BOT' : ''}</span><b>${entry.score} points</b></div>`).join('')}<div class="actions">${button('Back to class', 'class', true)}</div></div>`;
  }
  if (state.screen === 'play' && state.classActors?.length && !state.hub.active) {
    const board = document.createElement('div');
    board.className = 'class-live';
    board.id = 'class-live';
    main.append(board);
    updateClassBoard();
  }
  if (state.screen === 'hub') {
    const hub = state.hub;
    let description = 'A shared class: three exercises, one gentle competition.';
    let controls = `${button('I’m ready', 'hub-ready', true)}${button('Need more time', 'hub-more')}`;
    if (hub.started && !hub.finished) {
      const activity = hub.deck?.[hub.eventIndex];
      description = hub.phase === 'score' ? `${activity?.name || 'Exercise'} complete. Class score: ${Math.round(hub.score)}.` : `Coming up: ${activity?.name || 'a new exercise'}. Get comfortable on your mat.`;
      controls = '';
    }
    if (hub.finished) { description = `Class finished. Your total: ${Math.round(hub.score)} points. Thanks for moving with us!`; controls = ''; }
    main.innerHTML = `<div class="card dialogue"><div class="eyebrow">✳ &nbsp; AI GAME HUB</div><h1>${hub.finished ? 'Lovely work.' : hub.started ? 'A little breather.' : 'Welcome to class.'}</h1><p>${description}</p><div class="actions">${controls}</div></div>`;
  }
}

function prepareClass() {
  state.classActors = state.classPlayers.slice(1).map(player => ({ player, px: 0, py: 0, vx: 0, vy: 0, ux: 0, uy: 0, tray: 0, flame: .6, score: 0, samples: 0, hits: 0, lastBeat: -1 }));
  state.classScores = null;
}

function updateClass(delta) {
  const activity = state.activity;
  for (const [index, actor] of state.classActors.entries()) {
    const pad = actor.player.source === 'gamepad' ? navigator.getGamepads?.()[actor.player.padIndex] : null;
    if (actor.player.source === 'bot') {
      actor.ux = activity.ringX * (.65 + index * .08) + Math.sin(activity.elapsed * (1.1 + index * .13) + index) * (.12 + index * .035);
      actor.uy = activity.ringY * .7 + Math.cos(activity.elapsed * 1.3 + index) * .08;
    } else if (pad) {
      actor.ux = Math.abs(pad.axes[0]) > .12 ? pad.axes[0] : actor.ux * Math.max(0, 1 - delta * .5);
      actor.uy = Math.abs(pad.axes[1]) > .12 ? pad.axes[1] : actor.uy * Math.max(0, 1 - delta * .5);
    } else {
      const horizontal = (keys.has('l') ? 1 : 0) - (keys.has('j') ? 1 : 0);
      const vertical = (keys.has('k') ? 1 : 0) - (keys.has('i') ? 1 : 0);
      actor.ux = clamp(actor.ux + horizontal * 2.2 * delta, -1, 1);
      actor.uy = clamp(actor.uy + vertical * 2.2 * delta, -1, 1);
      if (!horizontal) actor.ux *= Math.max(0, 1 - .5 * delta);
      if (!vertical) actor.uy *= Math.max(0, 1 - .5 * delta);
    }
    actor.vx += (tuning.spring * (actor.ux - actor.px) - tuning.damping * actor.vx + tuning.noise * Math.sin(activity.elapsed * 1.7 + index)) * delta;
    actor.vy += (tuning.spring * (actor.uy - actor.py) - tuning.damping * actor.vy + tuning.noise * Math.cos(activity.elapsed * 1.2 + index)) * delta;
    actor.px = clamp(actor.px + actor.vx * delta, -1, 1);
    actor.py = clamp(actor.py + actor.vy * delta, -1, 1);
    let quality = clamp(1 - Math.hypot(actor.px - activity.ringX, actor.py - activity.ringY) * 1.5, 0, 1);
    if (activity.kind === 'slalom') quality = clamp(1 - Math.abs(actor.px - activity.ringX) * 1.5, 0, 1);
    if (activity.kind === 'tray') { actor.tray += (actor.px - actor.tray) * delta * 1.5; quality = clamp(1 - Math.abs(actor.tray) * 2, 0, 1); }
    if (activity.kind === 'candle') { actor.flame = clamp(actor.flame + (quality > .45 ? .13 : -.3) * delta, 0, 1); quality = actor.flame; }
    if (activity.kind === 'step') quality = actor.player.source === 'bot' ? clamp(.67 + Math.sin(activity.elapsed + index) * .13, 0, 1) : clamp(actor.hits / Math.max(1, activity.elapsed * 100 / 60) * 1.3, 0, 1);
    actor.score += quality;
    actor.samples++;
  }
}

function updateClassBoard() {
  const board = document.getElementById('class-live');
  if (!board || !state.activity) return;
  const primary = Math.round(state.activity.score / Math.max(1, state.activity.samples) * 100);
  board.innerHTML = `<span>${escapeHTML(state.classPlayers[0].name)} ${primary}</span>` + state.classActors.map(actor => `<span>${escapeHTML(actor.player.name)} ${Math.round(actor.score / Math.max(1, actor.samples) * 100)}${actor.player.source === 'bot' ? ' · BOT' : ''}</span>`).join('');
}

function finishClass(primary) {
  state.classScores = [{ name: state.classPlayers[0].name, score: primary, bot: false }, ...state.classActors.map(actor => ({ name: actor.player.name, score: Math.round(actor.score / Math.max(1, actor.samples) * 100), bot: actor.player.source === 'bot' }))].sort((left, right) => right.score - left.score);
}

function classInput(key) {
  const actor = state.classActors?.find(item => item.player.source === 'keyboard');
  if (!actor || state.activity?.kind !== 'step') return;
  const directions = ['j', 'i', 'l', 'k'];
  const beat = Math.round(state.activity.elapsed * 100 / 60);
  if (key === directions[(beat + 4) % 4] && Math.abs(state.activity.elapsed * 100 / 60 - beat) < .34 && beat !== actor.lastBeat) { actor.hits++; actor.lastBeat = beat; }
}

function classPadInput(actor, index) {
  if (state.activity?.kind !== 'step') return;
  const directions = [14, 12, 15, 13];
  const beat = Math.round(state.activity.elapsed * 100 / 60);
  if (index === directions[(beat + 4) % 4] && Math.abs(state.activity.elapsed * 100 / 60 - beat) < .34 && beat !== actor.lastBeat) { actor.hits++; actor.lastBeat = beat; }
}

function joinClassPad(index) {
  if (state.classPlayers.some(player => player?.padIndex === index)) return;
  const free = [1, 2, 3].find(slot => !state.classPlayers[slot] || state.classPlayers[slot].source === 'bot');
  if (free === undefined) return;
  state.classPlayers[free] = { name: `Player ${free + 1}`, type: `Controller ${index + 1}`, source: 'gamepad', padIndex: index };
  render();
}

function startHub() {
  const hub = state.hub;
  const random = window.AIHub.rng('deal');
  const deck = ACTIVITIES.filter(activity => CLASS_IDS.includes(activity.id)).slice();
  for (let index = deck.length - 1; index > 0; index--) { const other = Math.floor(random() * (index + 1)); [deck[index], deck[other]] = [deck[other], deck[index]]; }
  Object.assign(hub, { started: true, finished: false, score: 0, deck: deck.slice(0, 3), eventIndex: -1, phase: '', records: {}, lastSend: -100, lastProgress: -1000 });
  syncHub();
}

function finishHubEvent() {
  const hub = state.hub, activity = state.activity;
  if (!activity || hub.records[hub.eventIndex] !== undefined) return;
  hub.records[hub.eventIndex] = Math.round(activity.score / Math.max(1, activity.samples) * 1000);
  hub.score = Object.values(hub.records).reduce((total, value) => total + value, 0);
}

function syncHub() {
  const hub = state.hub;
  if (!hub.active || !hub.started || hub.finished) return;
  const time = window.AIHub.time();
  if (!Number.isFinite(time) || time < 0 || time >= 150000) return;
  const eventIndex = Math.floor(time / 50000), within = time % 50000;
  const phase = within < 5000 ? 'intro' : within < 45000 ? 'play' : 'score';
  if (hub.eventIndex !== eventIndex || hub.phase !== phase) {
    if (hub.phase === 'play') finishHubEvent();
    hub.eventIndex = eventIndex;
    hub.phase = phase;
    if (phase === 'play') startActivity(hub.deck[eventIndex], { seconds: 40 });
    else screen('hub');
  }
  if (phase === 'play' && state.activity) state.activity.elapsed = Math.max(0, (within - 5000) / 1000);
}

function finishHub() {
  const hub = state.hub;
  if (hub.finished) return;
  if (hub.phase === 'play') finishHubEvent();
  hub.finished = true;
  window.AIHub.result({ score: Math.round(hub.score) });
  screen('hub');
}
