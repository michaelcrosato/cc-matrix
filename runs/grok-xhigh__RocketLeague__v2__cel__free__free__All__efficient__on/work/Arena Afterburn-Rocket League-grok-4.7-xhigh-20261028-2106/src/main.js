import { createAudio } from './audio.js';
import { createAttract, stepAttract } from './attract.js';
import { CREDITS } from './credits.js';
import { mapGamepad, mapKeyboard, mergeMouse } from './input.js';
import { acceptAnswer, applySnapshot, bindChannel, createGuestLink, createHostLink, send, snapshotOf } from './net.js';
import { createPhysics } from './physics.js';
import { aimChase, aimMenu, aimWide, createView } from './render.js';
import { addPeer, createSession, joinHuman, rosterFromSession } from './session.js';
import { CSS } from './style.js';
import { layoutViewports } from './layout.js';
import { createWorld, stepWorld } from './world.js';

const LENGTHS = [
  { sec: 60, label: '1:00' },
  { sec: 150, label: '2:30' },
  { sec: 300, label: '5:00' },
];

const state = {
  screen: 'title',
  index: 0,
  settings: { invertH: false, invertV: false, length: 1, music: true, sfx: true },
  world: null,
  kind: 'menu',
  session: null,
  links: [],
  myId: null,
  peerCount: 0,
  returnTo: 'title',
  offer: '',
  answer: '',
  status: '',
  started: false,
  guest: null,
  clock: 0,
  lastBanner: '',
  snapAcc: 0,
  ballLatch: new Set(),
};

const keys = new Set();
const mouse = { dx: 0, dy: 0, left: false, right: false, middle: false };
const attract = createAttract();
let audio;
let view;
let physics;
let preview;
let ui;
let last = 0;
const edges = { confirm: false, back: false, menu: false, y: 0 };

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function touchOnly() {
  const touch = navigator.maxTouchPoints > 0;
  const fine = window.matchMedia('(pointer: fine)').matches;
  const hover = window.matchMedia('(hover: hover)').matches;
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].some(Boolean) : false;
  return touch && !fine && !hover && !pads;
}

function lengthLabel() {
  return LENGTHS[state.settings.length].label;
}

function menuItems() {
  const gate = touchOnly();
  if (gate && (state.screen === 'title' || state.screen === 'play' || state.screen === 'online')) {
    return [{ id: 'settings', label: 'SETTINGS' }];
  }
  if (state.screen === 'title') {
    return [
      { id: 'play', label: 'PLAY' },
      { id: 'online', label: 'ONLINE' },
      { id: 'settings', label: 'SETTINGS' },
      { id: 'credits', label: 'CREDITS' },
    ];
  }
  if (state.screen === 'play') {
    return [
      { id: 'ai-1', label: 'VS AI  1v1' },
      { id: 'ai-2', label: 'VS AI  2v2' },
      { id: 'local-1', label: 'LOCAL 1v1' },
      { id: 'local-2', label: 'LOCAL 2v2' },
      { id: 'back', label: 'BACK' },
    ];
  }
  if (state.screen === 'online') {
    return [
      { id: 'host-1', label: 'HOST 1v1' },
      { id: 'host-2', label: 'HOST 2v2' },
      { id: 'join', label: 'JOIN WITH AN OFFER' },
      { id: 'back', label: 'BACK' },
    ];
  }
  if (state.screen === 'settings') {
    return [
      { id: 'inv-h', label: `INVERT HORIZONTAL  ${state.settings.invertH ? 'ON' : 'OFF'}` },
      { id: 'inv-v', label: `INVERT VERTICAL  ${state.settings.invertV ? 'ON' : 'OFF'}` },
      { id: 'length', label: `MATCH LENGTH  ${lengthLabel()}` },
      { id: 'music', label: `MUSIC  ${state.settings.music ? 'ON' : 'OFF'}` },
      { id: 'sfx', label: `EFFECTS  ${state.settings.sfx ? 'ON' : 'OFF'}` },
      { id: 'controls', label: 'CONTROLS' },
      { id: 'back', label: 'BACK' },
    ];
  }
  if (state.screen === 'pause') {
    return [
      { id: 'resume', label: 'RESUME' },
      { id: 'settings', label: 'SETTINGS' },
      { id: 'quit', label: 'QUIT TO TITLE' },
    ];
  }
  if (state.screen === 'over') {
    const winner = state.world?.match.winner;
    return [
      { id: 'rematch', label: 'REMATCH' },
      { id: 'quit', label: winner ? 'TITLE' : 'TITLE' },
    ];
  }
  if (state.screen === 'lobby') {
    return [
      { id: 'invite', label: 'CREATE INVITE' },
      { id: 'accept', label: 'ACCEPT ANSWER' },
      { id: 'start', label: 'START MATCH' },
      { id: 'back', label: 'BACK' },
    ];
  }
  if (state.screen === 'join') {
    return [
      { id: 'answer', label: 'CREATE ANSWER' },
      { id: 'back', label: 'BACK' },
    ];
  }
  if (state.screen === 'credits' || state.screen === 'controls') {
    return [{ id: 'back', label: 'BACK' }];
  }
  return [];
}

function go(screen) {
  state.screen = screen;
  state.index = 0;
  audio?.play('menu');
  renderMenu();
}

function typing() {
  const tag = document.activeElement && document.activeElement.tagName;
  return tag === 'TEXTAREA' || tag === 'INPUT';
}

function showNotice(title, body) {
  const blocker = el('div');
  blocker.id = 'blocker';
  blocker.append(el('div', 'panel', ''));
  const panel = blocker.querySelector('.panel');
  panel.append(el('h1', '', title), el('p', '', body));
  document.body.append(blocker);
}

function mountShell() {
  const style = el('style');
  style.textContent = CSS;
  document.head.append(style);
  ui = el('div');
  ui.id = 'ui';
  document.body.append(ui);
  const hud = el('div');
  hud.id = 'hud';
  hud.hidden = true;
  hud.innerHTML = `
    <div class="board"><span class="blue" id="score-blue">0</span><span class="clock" id="clock">2:30</span><span class="orange" id="score-orange">0</span></div>
    <div id="call"></div>
    <div class="boosts" id="boosts"></div>
    <div class="attract-tag" id="attract-tag" hidden>ATTRACT</div>
  `;
  document.body.append(hud);
}

function titleFor() {
  if (state.screen === 'title') return 'ARENA\nAFTERBURN';
  if (state.screen === 'play') return 'PLAY';
  if (state.screen === 'online' || state.screen === 'lobby' || state.screen === 'join') return 'ONLINE';
  if (state.screen === 'settings') return 'SETTINGS';
  if (state.screen === 'credits') return 'CREDITS';
  if (state.screen === 'controls') return 'CONTROLS';
  if (state.screen === 'pause') return 'PAUSED';
  if (state.screen === 'over') {
    const winner = state.world?.match.winner;
    if (winner === 'blue') return 'BLUE\nWINS';
    if (winner === 'orange') return 'ORANGE\nWINS';
    return 'MATCH';
  }
  return '';
}

function kickerFor() {
  if (state.screen === 'title') return 'BOOST. FLIP. SCORE.';
  if (touchOnly() && (state.screen === 'title' || state.screen === 'play' || state.screen === 'online')) {
    return '';
  }
  if (state.screen === 'lobby') return state.status || 'UP TO 4 PLAYERS';
  if (state.screen === 'join') return state.status || 'PASTE THE HOST OFFER';
  if (state.screen === 'over' && state.world?.match.overtime) return 'SUDDEN DEATH';
  return '';
}

function renderMenu() {
  const inMatch = state.kind === 'local' || state.kind === 'online-host' || state.kind === 'online-guest';
  const showPanel = state.kind === 'menu' || state.kind === 'online-lobby' || state.screen === 'pause' || state.screen === 'over';
  ui.replaceChildren();
  if (!showPanel) return;
  const panel = el('div', 'panel');
  const heading = el('h1');
  heading.style.whiteSpace = 'pre-line';
  heading.textContent = titleFor();
  panel.append(heading);
  const kicker = kickerFor();
  if (touchOnly() && (state.screen === 'title' || state.screen === 'play' || state.screen === 'online')) {
    panel.append(el('p', 'gate-copy', 'Controller or keyboard required'));
  } else if (kicker) {
    panel.append(el('p', 'kicker', kicker));
  }
  if (state.screen === 'credits') {
    const credits = el('div', 'credits');
    credits.id = 'credits-body';
    credits.textContent = CREDITS;
    panel.append(credits);
  }
  if (state.screen === 'controls') {
    panel.append(el('div', 'help', CONTROLS));
  }
  if (state.screen === 'lobby' || state.screen === 'join') {
    const peers = state.session ? state.session.peers.length : state.peerCount;
    panel.append(el('p', 'kicker', `${peers} / 4 IN THE LOBBY`));
    if (state.screen === 'lobby') {
      const offer = el('textarea');
      offer.id = 'offer-box';
      offer.readOnly = true;
      offer.setAttribute('aria-label', 'Offer for a guest');
      offer.value = state.offer;
      const answer = el('textarea');
      answer.id = 'answer-box';
      answer.setAttribute('aria-label', 'Answer from a guest');
      answer.value = state.answer;
      answer.addEventListener('input', () => {
        state.answer = answer.value;
      });
      panel.append(el('label', 'field', 'YOUR OFFER'), offer, el('label', 'field', 'GUEST ANSWER'), answer);
    } else {
      const offer = el('textarea');
      offer.id = 'offer-box';
      offer.setAttribute('aria-label', 'Offer from the host');
      offer.value = state.offer;
      offer.addEventListener('input', () => {
        state.offer = offer.value;
      });
      const answer = el('textarea');
      answer.id = 'answer-box';
      answer.readOnly = true;
      answer.setAttribute('aria-label', 'Your answer');
      answer.value = state.answer;
      panel.append(el('label', 'field', 'HOST OFFER'), offer, el('label', 'field', 'YOUR ANSWER'), answer);
    }
    if (state.status) panel.append(el('p', 'status', state.status));
  }
  const items = menuItems();
  if (state.index >= items.length) state.index = 0;
  items.forEach((item, i) => {
    const button = el('button', `item${i === state.index ? ' selected' : ''}`, item.label);
    button.type = 'button';
    button.addEventListener('click', () => {
      state.index = i;
      activate(item.id);
    });
    button.addEventListener('pointerenter', () => {
      state.index = i;
    });
    panel.append(button);
  });
  ui.append(panel);
  const hud = document.getElementById('hud');
  const playing = inMatch && state.screen !== 'pause' && state.world;
  hud.hidden = !playing && state.kind !== 'attract';
  document.getElementById('attract-tag').hidden = state.kind !== 'attract';
}

const CONTROLS = `PLAYER 1  WASD drive   mouse aim   Space jump   Shift boost   Ctrl slide   Q/E roll
PLAYER 2  Arrows drive   Right Shift jump   Right Ctrl boost
PLAYER 3  IJKL drive   U jump   O boost
PLAYER 4  Numpad 8456 drive   Numpad 0 jump   Numpad + boost

GAMEPAD  left stick drive   right stick air   Cross jump   Circle boost   Square slide   L1/R1 roll   Options pause
Invert horizontal and invert vertical live in Settings. They flip only that gamepad axis.`;

function activate(id) {
  audio?.resume();
  audio?.startMusic();
  if (id === 'play') {
    state.returnTo = 'title';
    return go('play');
  }
  if (id === 'online') {
    state.returnTo = 'title';
    return go('online');
  }
  if (id === 'settings') {
    state.returnTo = state.screen === 'pause' ? 'pause' : 'title';
    return go('settings');
  }
  if (id === 'credits') {
    state.returnTo = 'title';
    return go('credits');
  }
  if (id === 'controls') {
    state.returnTo = 'settings';
    return go('controls');
  }
  if (id === 'back') {
    if (state.screen === 'lobby' || state.screen === 'join') {
      closeLinks();
      state.session = null;
      state.kind = 'menu';
      state.returnTo = 'title';
      return go('title');
    }
    return go(state.returnTo || 'title');
  }
  if (id === 'inv-h') {
    state.settings.invertH = !state.settings.invertH;
    return renderMenu();
  }
  if (id === 'inv-v') {
    state.settings.invertV = !state.settings.invertV;
    return renderMenu();
  }
  if (id === 'length') {
    state.settings.length = (state.settings.length + 1) % LENGTHS.length;
    return renderMenu();
  }
  if (id === 'music') {
    state.settings.music = !state.settings.music;
    audio?.setMix(state.settings);
    return renderMenu();
  }
  if (id === 'sfx') {
    state.settings.sfx = !state.settings.sfx;
    audio?.setMix(state.settings);
    return renderMenu();
  }
  if (id === 'ai-1') return startLocal('1v1', 1);
  if (id === 'ai-2') return startLocal('2v2', 1);
  if (id === 'local-1') return startLocal('1v1', 2);
  if (id === 'local-2') return startLocal('2v2', 4);
  if (id === 'host-1') return hostLobby('1v1');
  if (id === 'host-2') return hostLobby('2v2');
  if (id === 'join') {
    state.offer = '';
    state.answer = '';
    state.status = '';
    state.kind = 'online-lobby';
    return go('join');
  }
  if (id === 'invite') return makeInvite();
  if (id === 'accept') return takeAnswer();
  if (id === 'start') return startOnline();
  if (id === 'answer') return makeAnswer();
  if (id === 'resume') {
    state.screen = 'match';
    renderMenu();
    return;
  }
  if (id === 'quit') return quitMatch();
  if (id === 'rematch') return rematch();
}

function startLocal(mode, humans) {
  state.world = createWorld({
    mode,
    humans,
    duration: LENGTHS[state.settings.length].sec,
  });
  state.kind = 'local';
  state.screen = 'match';
  state.myId = state.world.cars.find((car) => car.human)?.id ?? null;
  view.bind(state.world);
  physics.ensureCars(state.world.cars.length);
  physics.follow(state.world.cars, state.world.ball, view.quats());
  physics.step(1 / 60);
  audio.startMusic();
  renderMenu();
}

function quitMatch() {
  closeLinks();
  state.world = null;
  state.kind = 'menu';
  state.session = null;
  state.started = false;
  state.myId = null;
  go('title');
  view.bind(preview);
  renderMenu();
}

function rematch() {
  if (!state.world) return quitMatch();
  const mode = state.world.mode;
  const humans = state.world.cars.filter((car) => car.human).length;
  if (state.kind === 'online-guest') return;
  if (state.kind === 'online-host' && state.session) {
    startOnline();
    return;
  }
  startLocal(mode, humans);
}

function hostLobby(mode) {
  closeLinks();
  state.session = createSession(mode);
  const joined = addPeer(state.session, { id: 'host', name: 'HOST' });
  state.session = joined.session;
  state.myId = 'host';
  state.offer = '';
  state.answer = '';
  state.status = 'Create an invite. A fifth player is refused.';
  state.kind = 'online-lobby';
  state.started = false;
  go('lobby');
}

async function makeInvite() {
  if (!state.session || state.session.peers.length >= 4) {
    state.status = 'Lobby is full. Four players is the cap.';
    renderMenu();
    return;
  }
  try {
    const link = await createHostLink();
    link.id = null;
    state.links.push(link);
    state.offer = link.sdp;
    state.status = 'Send the offer. Paste the answer, then accept it.';
    bindChannel(link.dc, (message) => onHostMessage(link, message));
    link.dc.addEventListener('open', () => {
      link.status = 'open';
    });
    link.pc.addEventListener('connectionstatechange', () => {
      if (link.pc.connectionState === 'failed' || link.pc.connectionState === 'disconnected') {
        dropLink(link);
      }
    });
  } catch (error) {
    state.status = `Invite failed. ${error.message || error}`;
  }
  renderMenu();
}

function onHostMessage(link, message) {
  if (message.t === 'hello') {
    if (state.started) {
      send(link.dc, { t: 'reject', reason: 'started' });
      return;
    }
    const guestId = `guest-${state.session.peers.length}`;
    const result = joinHuman(state.session, { id: guestId, name: message.name || 'GUEST' });
    if (!result.ok) {
      send(link.dc, { t: 'reject', reason: result.reason });
      state.status = result.reason === 'full' ? 'Refused a fifth player.' : 'That roster is full.';
      renderMenu();
      return;
    }
    state.session = result.session;
    link.id = guestId;
    send(link.dc, { t: 'welcome', id: link.id, mode: state.session.mode, count: state.session.peers.length });
    state.status = `${link.id} linked. ${state.session.peers.length} / 4.`;
    renderMenu();
  } else if (message.t === 'input' && link.id) {
    link.input = message.actions;
    link.inputAt = performance.now();
  }
}

async function takeAnswer() {
  const waiting = state.links.filter((link) => !link.pc.remoteDescription);
  const link = waiting[waiting.length - 1];
  if (!link) {
    state.status = 'Create an invite first.';
    renderMenu();
    return;
  }
  try {
    await acceptAnswer(link.pc, state.answer);
    state.status = 'Answer set. Waiting for the guest link.';
    state.answer = '';
  } catch (error) {
    state.status = `Could not read that answer. ${error.message || error}`;
  }
  renderMenu();
}

function startOnline() {
  if (!state.session) return;
  const roster = rosterFromSession(state.session);
  state.world = createWorld({
    mode: state.session.mode,
    duration: LENGTHS[state.settings.length].sec,
    roster,
  });
  state.kind = 'online-host';
  state.started = true;
  state.screen = 'match';
  view.bind(state.world);
  physics.ensureCars(state.world.cars.length);
  physics.follow(state.world.cars, state.world.ball, view.quats());
  physics.step(1 / 60);
  broadcast({ t: 'start', mode: state.session.mode, roster, duration: LENGTHS[state.settings.length].sec });
  audio.startMusic();
  renderMenu();
}

function broadcast(message) {
  for (const link of state.links) send(link.dc, message);
}

function dropLink(link) {
  try {
    link.pc.close();
  } catch {
    /* already closed */
  }
  if (link.id && state.world) {
    const car = state.world.cars.find((item) => item.id === link.id);
    if (car) car.human = false;
  }
}

function closeLinks() {
  for (const link of state.links) dropLink(link);
  state.links = [];
  if (state.guest) {
    try {
      state.guest.pc.close();
    } catch {
      /* already closed */
    }
    state.guest = null;
  }
}

async function makeAnswer() {
  try {
    const guest = await createGuestLink(state.offer);
    state.guest = guest;
    state.answer = guest.sdp;
    state.status = 'Send this answer to the host.';
    guest.channelPromise.then((channel) => {
      guest.dc = channel;
      bindChannel(channel, onGuestMessage);
      channel.addEventListener('open', () => {
        send(channel, { t: 'hello', name: 'GUEST' });
        state.status = 'Linked. Waiting for the match to start.';
        renderMenu();
      });
    });
  } catch (error) {
    state.status = `Could not read that offer. ${error.message || error}`;
  }
  renderMenu();
}

function onGuestMessage(message) {
  if (message.t === 'reject') {
    state.status = message.reason === 'full' ? 'Refused. The match already has 4 players.' : `Refused (${message.reason}).`;
    renderMenu();
    return;
  }
  if (message.t === 'welcome') {
    state.myId = message.id;
    state.peerCount = message.count || 0;
    state.status = `You are ${message.id}. ${message.count} / 4 linked.`;
    renderMenu();
    return;
  }
  if (message.t === 'start') {
    state.world = createWorld({
      mode: message.mode,
      duration: message.duration,
      roster: message.roster,
    });
    state.kind = 'online-guest';
    state.screen = 'match';
    view.bind(state.world);
    audio.startMusic();
    renderMenu();
    return;
  }
  if (message.t === 'snap' && state.world) {
    const before = state.world.match.banner;
    const phase = state.world.match.phase;
    applySnapshot(state.world, message);
    if (state.world.match.banner !== before) punchBanner(state.world.match.banner);
    if (state.world.match.phase === 'ended' && phase !== 'ended' && state.screen === 'match') {
      state.screen = 'over';
      renderMenu();
    }
  }
}

function punchBanner(banner) {
  if (banner === '3' || banner === '2' || banner === '1') audio.play('beep');
  if (banner === 'KICKOFF') audio.play('kickoff');
  if (banner === 'GOAL') audio.play('goal');
  if (banner === 'OVERTIME') audio.play('overtime');
}

function pollPads() {
  const pads = navigator.getGamepads ? [...navigator.getGamepads()] : [];
  return pads.filter(Boolean).map((pad) => mapGamepad(pad, state.settings));
}

function padActive(actions) {
  return (
    Math.abs(actions.throttle) > 0.2 ||
    Math.abs(actions.steer) > 0.2 ||
    Math.abs(actions.pitch) > 0.2 ||
    Math.abs(actions.yaw) > 0.2 ||
    actions.jump ||
    actions.boost ||
    actions.menu ||
    actions.confirm
  );
}

function localCars() {
  if (!state.world) return [];
  if (state.kind === 'online-host') return state.world.cars.filter((car) => car.id === 'host');
  if (state.kind === 'online-guest') return state.world.cars.filter((car) => car.id === state.myId);
  return state.world.cars.filter((car) => car.human);
}

function gatherInputs(pads) {
  const inputs = {};
  const locals = localCars();
  let slot = 0;
  let usedMouse = false;
  locals.forEach((car, i) => {
    let actions = pads[i] ? { ...pads[i] } : mapKeyboard(keys, slot);
    if (!pads[i]) {
      if (!usedMouse) {
        actions = mergeMouse(actions, mouse.dx, mouse.dy, mouse);
        usedMouse = true;
      }
      slot += 1;
    }
    if (actions.ballCam && !state.ballLatch.has(car.id)) car.ballCam = !car.ballCam;
    if (actions.ballCam) state.ballLatch.add(car.id);
    else state.ballLatch.delete(car.id);
    inputs[car.id] = actions;
  });
  const now = performance.now();
  for (const link of state.links) {
    if (!link.id || !link.input) continue;
    if (now - (link.inputAt || 0) > 400) continue;
    inputs[link.id] = link.input;
  }
  return inputs;
}

function menuIntent(pads) {
  let y = 0;
  let x = 0;
  let confirm = false;
  let back = false;
  const keyboard = !typing();
  if (keyboard && (keys.has('ArrowDown') || keys.has('KeyS'))) y += 1;
  if (keyboard && (keys.has('ArrowUp') || keys.has('KeyW'))) y -= 1;
  if (keyboard && (keys.has('ArrowRight') || keys.has('KeyD'))) x += 1;
  if (keyboard && (keys.has('ArrowLeft') || keys.has('KeyA'))) x -= 1;
  if (keyboard && (keys.has('Enter') || keys.has('Space'))) confirm = true;
  if (keyboard && (keys.has('Escape') || keys.has('Backspace'))) back = true;
  if (pads[0]) {
    if (pads[0].menuY) y = pads[0].menuY;
    if (pads[0].menuX) x = pads[0].menuX;
    if (pads[0].confirm) confirm = true;
    if (pads[0].back) back = true;
  }
  return { y, x, confirm, back };
}

function applyMenu(intent) {
  const items = menuItems();
  if (!items.length) return;
  if (state.screen === 'credits' && intent.y && document.getElementById('credits-body')) {
    document.getElementById('credits-body').scrollTop += intent.y * 48;
  }
  if (intent.y && !edges.y) {
    state.index = (state.index + (intent.y > 0 ? 1 : items.length - 1)) % items.length;
    audio?.play('menu');
    renderMenu();
  }
  if (intent.confirm && !edges.confirm) activate(items[state.index].id);
  else if (intent.back && !edges.back && state.screen !== 'title') activate('back');
  edges.y = intent.y;
  edges.confirm = intent.confirm;
  edges.back = intent.back;
}

function updateHud() {
  const world = state.world;
  if (!world) return;
  document.getElementById('score-blue').textContent = String(world.match.score.blue);
  document.getElementById('score-orange').textContent = String(world.match.score.orange);
  const clock = document.getElementById('clock');
  if (world.match.overtime) clock.textContent = 'OT';
  else {
    const total = Math.max(0, Math.ceil(world.match.clock - 1e-6));
    const m = Math.floor(total / 60);
    const s = total % 60;
    clock.textContent = `${m}:${String(s).padStart(2, '0')}`;
  }
  const call = document.getElementById('call');
  const banner = world.match.banner;
  call.textContent = banner || '';
  call.style.color = banner === 'GOAL' ? (world.match.lastScorer === 'blue' ? '#3d7cff' : '#ff7424') : '#f6f1e6';
  const boosts = document.getElementById('boosts');
  boosts.replaceChildren();
  const humans = state.kind === 'attract' ? [] : localCars();
  const shown = humans.length ? humans : [];
  if (!shown.length) return;
  const rects = layoutOf(shown.length);
  shown.forEach((car, i) => {
    const rect = rects[i];
    const meter = el('div', 'meter');
    const fill = el('span');
    fill.style.width = `${Math.round(car.boost)}%`;
    const name = el('b', '', `${car.name}  ${Math.round(car.boost)}`);
    meter.append(name, fill);
    meter.style.left = `${rect.x + 28}px`;
    meter.style.top = `${rect.y + rect.h - 56}px`;
    boosts.append(meter);
  });
}

function layoutOf(count) {
  return layoutViewports(count, window.innerWidth, window.innerHeight);
}

function paintWorld(world, showcase) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (!world || showcase || state.kind === 'menu' || state.kind === 'online-lobby') {
    aimMenu(view.menuCam, state.clock);
    view.menuCam.aspect = w / h;
    view.paint([view.menuCam]);
    return;
  }
  if (state.kind === 'attract') {
    aimWide(view.menuCam, world, state.clock);
    view.paint([view.menuCam]);
    return;
  }
  const humans = localCars();
  const cars = humans.length ? humans : world.cars.slice(0, 1);
  cars.forEach((car, i) => {
    const camera = view.cameras[i];
    aimChase(camera, car, world.ball, car.ballCam !== false);
  });
  view.paint(cars.map((_, i) => view.cameras[i]));
}

function frame(now) {
  try {
    frameInner(now);
  } catch (error) {
    if (window.__AA) window.__AA.errors.push(String(error && error.message || error));
  }
  requestAnimationFrame(frame);
}

function frameInner(now) {
  const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60);
  last = now;
  state.clock += dt;
  const pads = pollPads();
  const intent = menuIntent(pads);
  const inputActive =
    keys.size > 0 ||
    mouse.left ||
    mouse.right ||
    Math.abs(mouse.dx) + Math.abs(mouse.dy) > 2 ||
    pads.some(padActive);
  const onMenu = state.kind === 'menu' && ['title', 'play', 'settings', 'credits', 'controls'].includes(state.screen);
  stepAttract(attract, dt, inputActive, onMenu);
  if (attract.active && state.kind === 'menu') {
    state.world = createWorld({ mode: '2v2', humans: 0, attract: true, duration: 150 });
    state.world.match.phase = 'playing';
    state.world.match.countdown = 0;
    state.world.match.banner = '';
    state.kind = 'attract';
    view.bind(state.world);
    physics.ensureCars(state.world.cars.length);
    physics.follow(state.world.cars, state.world.ball, view.quats());
    physics.step(1 / 60);
    renderMenu();
  }
  if (inputActive && state.kind === 'attract') {
    state.world = null;
    state.kind = 'menu';
    attract.active = false;
    attract.idle = 0;
    view.bind(preview);
    renderMenu();
  }

  const simulating = state.world && (state.kind === 'local' || state.kind === 'online-host' || state.kind === 'attract');
  const paused = state.screen === 'pause';
  if (simulating && !paused && state.kind === 'attract' && state.world.match.phase === 'ended') {
    state.world = createWorld({ mode: '2v2', humans: 0, attract: true, duration: 150 });
    state.world.match.phase = 'playing';
    state.world.match.countdown = 0;
    state.world.match.banner = '';
    view.bind(state.world);
    physics.ensureCars(state.world.cars.length);
    physics.follow(state.world.cars, state.world.ball, view.quats());
    physics.step(1 / 60);
  }
  if (simulating && !paused) {
    const inputs = state.kind === 'attract' ? {} : gatherInputs(pads);
    let surfaces = null;
    try {
      surfaces = physics.sampleWorld(state.world.cars);
    } catch (error) {
      window.__AA.errors.push(`physics sample: ${error.message || error}`);
    }
    const bannerBefore = state.world.match.banner;
    stepWorld(state.world, inputs, dt, surfaces);
    audio.setMix(state.settings);
    audio.playEvents(state.world.events);
    if (state.world.match.banner !== bannerBefore) punchBanner(state.world.match.banner);
    for (const event of state.world.events) {
      if (event.type === 'goal') {
        const z = event.team === 'blue' ? 48 : -48;
        view.burst(0, 3, z, event.team === 'blue' ? 0x3d7cff : 0xff7424);
      }
      if (event.type === 'demo') {
        const car = state.world.cars.find((item) => item.id === event.id);
        if (car) view.burst(car.pos.x, car.pos.y + 1, car.pos.z, 0xffe08a);
      }
    }
    view.update(state.world, dt);
    try {
      physics.follow(state.world.cars, state.world.ball, view.quats());
      physics.step(dt);
    } catch (error) {
      window.__AA.errors.push(`physics step: ${error.message || error}`);
    }
    if (state.kind === 'online-host') {
      state.snapAcc += dt;
      if (state.snapAcc >= 0.05) {
        state.snapAcc = 0;
        broadcast(snapshotOf(state.world));
      }
    }
    if (state.world.match.phase === 'ended' && state.screen === 'match') {
      state.screen = 'over';
      renderMenu();
    }
  } else if (state.kind === 'online-guest' && state.world && state.screen === 'match') {
    const actions = gatherInputs(pads)[state.myId];
    if (actions && state.guest?.dc) {
      send(state.guest.dc, {
        t: 'input',
        id: state.myId,
        actions: {
          throttle: actions.throttle,
          steer: actions.steer,
          pitch: actions.pitch,
          yaw: actions.yaw,
          roll: actions.roll,
          jump: actions.jump,
          boost: actions.boost,
          powerslide: actions.powerslide,
          ballCam: false,
          menu: actions.menu,
          confirm: false,
          back: false,
          menuX: 0,
          menuY: 0,
        },
      });
    }
    view.update(state.world, dt);
  } else if (state.kind === 'menu' || state.kind === 'online-lobby') {
    view.update(preview, dt, { showcase: true });
  }

  const menuOpen = state.kind === 'menu' || state.kind === 'online-lobby' || state.screen === 'pause' || state.screen === 'over';
  if (menuOpen) applyMenu(intent);
  else if (state.screen === 'match') {
    const menuDown = keys.has('Escape') || pads.some((pad) => pad.menu);
    if (menuDown && !edges.menu) {
      state.screen = 'pause';
      renderMenu();
    }
    edges.menu = menuDown;
  }

  const showcase = !state.world || state.kind === 'menu' || state.kind === 'online-lobby';
  paintWorld(showcase ? preview : state.world, showcase);
  if (state.world && (state.kind === 'local' || state.kind === 'online-host' || state.kind === 'online-guest' || state.kind === 'attract')) {
    updateHud();
  }
  mouse.dx = 0;
  mouse.dy = 0;
  window.__AA.kind = state.kind;
  window.__AA.screen = state.screen;
}

function wireInput() {
  window.addEventListener('keydown', (event) => {
    keys.add(event.code);
    if (!typing() && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('mousemove', (event) => {
    mouse.dx += event.movementX;
    mouse.dy += event.movementY;
  });
  window.addEventListener('mousedown', (event) => {
    if (event.button === 0) mouse.left = true;
    if (event.button === 1) mouse.middle = true;
    if (event.button === 2) mouse.right = true;
    audio?.resume();
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) mouse.left = false;
    if (event.button === 1) mouse.middle = false;
    if (event.button === 2) mouse.right = false;
  });
  window.addEventListener('contextmenu', (event) => event.preventDefault());
  window.addEventListener('gamepadconnected', () => renderMenu());
  window.addEventListener('resize', () => view?.resize());
}

async function boot() {
  window.__AA = { errors: [], ready: false, webgpu: false, reason: '', kind: 'boot', screen: 'boot' };
  window.addEventListener('error', (event) => {
    window.__AA.errors.push(String(event.message || event.error || 'error'));
  });
  window.addEventListener('unhandledrejection', (event) => {
    window.__AA.errors.push(String(event.reason || 'rejection'));
  });
  mountShell();
  wireInput();
  if (location.protocol === 'file:') {
    showNotice(
      'SERVE THIS PAGE',
      'WebGPU and the module graph need a local server. From the folder that contains this file, run: python3 -m http.server 8080 then open the http://localhost:8080/ address of this page.',
    );
    window.__AA.ready = true;
    window.__AA.reason = 'file-protocol';
    return;
  }
  let THREE;
  let RAPIER;
  try {
    THREE = await import('three/webgpu');
    const rapierMod = await import('@dimforge/rapier3d-compat');
    RAPIER = rapierMod.default ?? rapierMod;
  } catch (error) {
    showNotice('MODULES DID NOT LOAD', String(error.message || error));
    window.__AA.ready = true;
    window.__AA.reason = 'module-load';
    window.__AA.errors.push(String(error.message || error));
    return;
  }
  if (!navigator.gpu) {
    showNotice('WEBGPU REQUIRED', 'This browser has no WebGPU. Arena Afterburn does not switch to another graphics API.');
    window.__AA.ready = true;
    window.__AA.reason = 'no-webgpu';
    return;
  }
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    showNotice('WEBGPU REQUIRED', 'No WebGPU adapter is available. Arena Afterburn does not switch to another graphics API.');
    window.__AA.ready = true;
    window.__AA.reason = 'no-adapter';
    return;
  }
  try {
    audio = createAudio();
    view = createView(THREE);
    document.body.prepend(view.renderer.domElement);
    await view.renderer.init();
    physics = await createPhysics(RAPIER);
    preview = createWorld({ mode: '2v2', humans: 0 });
    view.bind(preview);
    physics.ensureCars(preview.cars.length);
    view.update(preview, 0, { showcase: true });
    physics.follow(preview.cars, preview.ball, view.quats());
    physics.step(1 / 60);
    aimMenu(view.menuCam, 0);
    view.paint([view.menuCam]);
    renderMenu();
    window.__AA.webgpu = true;
    window.__AA.ready = true;
    window.__AA.reason = 'running';
    window.__AA.sample = () => view.sample();
    window.__AA.size = () => ({
      w: view.renderer.domElement.width,
      h: view.renderer.domElement.height,
    });
    requestAnimationFrame(frame);
  } catch (error) {
    showNotice('WEBGPU FAILED', String(error.message || error));
    window.__AA.ready = true;
    window.__AA.reason = 'webgpu-init';
    window.__AA.errors.push(String(error.message || error));
  }
}

if (typeof window !== 'undefined') boot();
