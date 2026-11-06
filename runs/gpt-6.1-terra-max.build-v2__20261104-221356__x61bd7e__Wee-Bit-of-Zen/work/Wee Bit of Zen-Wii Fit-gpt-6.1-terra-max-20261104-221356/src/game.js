'use strict';

const app = document.getElementById('app');
const STORAGE = 'wee-bit-of-zen-v1';
const DEFAULT_SETTINGS = { music: 10, sound: 10, voice: true, gentle: false, breathToggle: false, tips: true, glyphs: 'PlayStation' };
let stored;
try { stored = JSON.parse(localStorage.getItem(STORAGE) || '{}'); } catch (_) { stored = {}; }
const state = {
  screen: 'title', clock: 0, idle: 0, input: 'keyboard', settings: { ...DEFAULT_SETTINGS, ...(stored.settings || {}) },
  slots: Array.isArray(stored.slots) ? stored.slots : [null, null, null], slot: 0, member: null,
  selection: null, activity: null, returnScreen: 'title', check: null, toast: '', classPlayers: [],
  festival: false, festivalIndex: 0, hub: { active: !!window.AIHub?.active, started: false, finished: false, score: 0, lastSend: 0, lastProgress: 0, ghosts: {} }
};
while (state.slots.length < 3) state.slots.push(null);
const keys = new Set();
let mouseLean = null, lastFrame = 0, lastHud = 0, audioContext = null, nextMusic = 0, gamepadPrevious = [];
let toggledBreath = false, pausedFrom = null;

function save() {
  if (state.hub.active) return;
  if (state.member) state.slots[state.slot] = state.member;
  try { localStorage.setItem(STORAGE, JSON.stringify({ settings: state.settings, slots: state.slots })); } catch (_) { notify('Saving is unavailable in this browser.'); }
}
function notify(text) {
  state.toast = text;
  const node = document.getElementById('toast');
  if (node) { node.textContent = text; node.hidden = false; }
  setTimeout(() => { if (state.toast === text) { state.toast = ''; const toast = document.getElementById('toast'); if (toast) toast.hidden = true; } }, 3000);
}
function tone(frequency, duration = .14, volume = .5, type = 'sine') {
  if (!audioContext || audioContext.state !== 'running' || !state.settings.sound) return;
  const oscillator = audioContext.createOscillator(), gain = audioContext.createGain(), now = audioContext.currentTime;
  oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, now);
  gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(Math.max(.00011, state.settings.sound / 100 * volume * .18), now + .015); gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
  oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(now); oscillator.stop(now + duration + .01);
}
function unlockAudio() {
  try { if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)(); if (audioContext.state === 'suspended') audioContext.resume(); } catch (_) {}
}
function music() {
  if (!audioContext || audioContext.state !== 'running' || !state.settings.music || state.clock < nextMusic) return;
  nextMusic = state.clock + 1.25;
  const notes = [261.63, 329.63, 392, 493.88, 392, 329.63, 293.66, 349.23];
  const oscillator = audioContext.createOscillator(), gain = audioContext.createGain(), now = audioContext.currentTime;
  oscillator.type = 'sine'; oscillator.frequency.value = notes[Math.floor(state.clock / 1.25) % notes.length];
  gain.gain.setValueAtTime(.0001, now); gain.gain.exponentialRampToValueAtTime(Math.max(.00011, state.settings.music / 100 * .035), now + .08); gain.gain.exponentialRampToValueAtTime(.0001, now + 1.1);
  oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(now); oscillator.stop(now + 1.15);
}
function hint() { return state.input === 'gamepad' ? (state.settings.glyphs === 'Xbox' ? 'A SELECT  ·  B BACK' : '✕ SELECT  ·  ○ BACK') : '↑ ↓ CHOOSE  ·  ENTER SELECT  ·  ESC BACK'; }
function button(label, action, primary = false, id = '', detail = '') {
  return `<button class="action${primary ? ' primary' : ''}" data-action="${action}" data-id="${escapeHTML(id)}"><span>${label}${detail ? `<small>${detail}</small>` : ''}</span><span class="arrow">↗</span></button>`;
}
function shell(content, label = '', footer = true) {
  return `<div class="page page--${state.screen}"><header class="topbar"><button class="brand" data-action="home" aria-label="Return to title"><span class="brand-mark">✳</span><span>WEE BIT <b>OF ZEN</b></span></button><span class="top-label">${label}</span><button class="settings-link" data-action="settings" aria-label="Settings">⚙ <span>SETTINGS</span></button></header>${content}${footer ? `<footer class="footer"><span>${hint()}</span><span>THE INSTITUTE FOR GENTLE IMPROVEMENT&nbsp; ✳ &nbsp; LUMBAR ISLAND</span></footer>` : ''}</div><div class="toast" id="toast" hidden></div>`;
}
function screen(name) { if (state.screen !== name) app.scrollTop = 0; state.screen = name; state.idle = 0; render(); }
function person() { return state.member || { name: 'Guest', day: 1, sessions: 0, minutes: 0, stars: {}, instructor: 'Birch', color: 1, outfit: 1, finished: false }; }
function labelDay() { const member = person(); return member.finished ? 'FREE PRACTICE' : `DAY ${member.day} OF 5`; }
function tile(activity, locked = false) {
  const group = GROUPS[activity.group], stars = person().stars?.[activity.id] || 0;
  return `<button class="activity ${locked ? 'locked' : ''}" data-action="${locked ? 'locked' : 'select-activity'}" data-id="${activity.id}" style="--group:${group.color};--group-light:${group.light}"><span class="activity-icon">${activity.icon}</span><span class="activity-copy"><span class="activity-group">${group.name}</span><strong>${activity.name}</strong><small>${locked ? `Opens day ${activity.day}` : activity.tagline}</small></span><span class="activity-end">${locked ? '⌁' : (stars ? '★'.repeat(stars) : '↗')}</span></button>`;
}
function settingRow(label, value, action, id = '') { return `<div class="row"><span>${label}</span><button class="chip setting-button" data-action="${action}" data-id="${id}">${value}</button></div>`; }
function aboutContent() {
  const info = window.BUILD_INFO || {}, sections = [ ['Source Information', info.sourceInformation], ['Testing Feedback', info.testingFeedback], ['Engine Feedback', info.engineFeedback], ['Prompt Feedback', info.promptFeedback] ];
  const questions = {
    'Testing Feedback': ['How many issues did testing catch?', 'How many were critical or game breaking?', 'What was the most helpful test?', 'What was the least helpful test?'],
    'Engine Feedback': ['What did you like most about the engine?', 'Did you get stuck or guess wrong?', 'What was the most important thing you built yourself?', 'What was the hardest part about using the engine?', 'What did you change in the engine, and why?', 'What one thing would you change about the engine?'],
    'Prompt Feedback': ['What did you like most about this prompt?', 'What was confusing?', 'What was the hardest thing to do?', 'What would you change in this prompt?']
  };
  return sections.map(([title, value]) => `<div class="about-group"><h3>${title}</h3>${Array.isArray(value) ? value.map((item, index) => `<p><b>${escapeHTML(questions[title]?.[index] || `${index + 1}.`)}</b> ${escapeHTML(item)}</p>`).join('') : Object.entries(value || {}).map(([key, item]) => `<p><b>${escapeHTML(key)}:</b> ${escapeHTML(item)}</p>`).join('')}</div>`).join('');
}
function render() {
  const member = person();
  let content = '', heading = '';
  if (state.screen === 'title' || state.screen === 'attract') {
    content = `<main class="hero"><section class="hero-copy"><div class="eyebrow"><span class="sun-dot">✳</span> A LITTLE ISLAND FOR YOURSELF</div><h1 class="logo">wee bit<br><em>of zen</em><span class="logo-dot">.</span></h1><p class="lede">A pleasantly imperfect retreat for<br>your body, mind, and general wobble.</p><div class="menu-stack">${button('Begin your stay', 'slots', true, '', 'A little time just for you')}${button('Local Class', 'class', false, '', 'Practice together, up to four')}${button('About & credits', 'about')}</div></section><div class="island-message"><span>✦ &nbsp; TAKE IT AT YOUR OWN PACE</span><strong>Good things happen<br>one wobble at a time.</strong></div></main>`;
    if (state.screen === 'attract') content += '<div class="center-copy">DEMONSTRATION &nbsp; · &nbsp; PRESS ANY KEY</div>';
  } else if (state.screen === 'slots') {
    heading = 'YOUR STAY';
    content = `<main class="main-wrap"><div class="section-head"><div><div class="eyebrow">✳ &nbsp; THE GUEST BOOK</div><h1>Make yourself at home.</h1><p>Choose a room for your island stay.</p></div></div><div class="card-grid">${state.slots.map((slot, index) => `<button class="card slot-card" data-action="slot" data-id="${index}"><span class="slot-num">0${index + 1}</span><span class="slot-avatar">${slot ? '☺' : '+'}</span><strong>${slot ? escapeHTML(slot.name) : 'New member'}</strong><small>${slot ? `${slot.finished ? 'Free practice' : `Day ${slot.day}`} · ${Math.floor(slot.minutes || 0)} fit minutes` : 'A fresh start awaits'}</small><span class="arrow">↗</span></button>`).join('')}</div><div class="actions">${button('Back', 'home')}</div></main>`;
  } else if (state.screen === 'setup') {
    heading = 'NEW MEMBER';
    content = `<main class="main-wrap narrow"><div class="section-head"><div><div class="eyebrow">✳ &nbsp; NICE TO MEET YOU</div><h1>A little about you.</h1><p>There is no wrong way to arrive.</p></div></div><div class="card setup-card"><label class="field">WHAT SHOULD WE CALL YOU?<input id="nickname" maxlength="16" value="${escapeHTML(member.name === 'Guest' ? '' : member.name)}" placeholder="Your name" autocomplete="off"></label><p class="field-label">CHOOSE YOUR COLOUR</p><div class="options">${OUTFITS.map((color, index) => `<button class="option swatch ${member.outfit === index ? 'selected' : ''}" data-action="outfit" data-id="${index}" style="--swatch:${color}" aria-label="Outfit ${index + 1}">${member.outfit === index ? '✓' : ''}</button>`).join('')}</div><p class="field-label">YOUR INSTRUCTOR</p><div class="options">${['Birch', 'Alder'].map(name => `<button class="option ${member.instructor === name ? 'selected' : ''}" data-action="instructor" data-id="${name}">${name === 'Birch' ? '✳' : '✦'} &nbsp; ${name}</button>`).join('')}</div><div class="actions">${button('Back', 'slots')}${button('Arrive on the island', 'create-member', true)}</div></div></main>`;
  } else if (state.screen === 'intro') {
    heading = labelDay();
    content = `<main class="main-wrap narrow"><div class="dialogue card"><div class="eyebrow">✳ &nbsp; A NOTE FROM TARE</div><div class="speaker">☺</div><h1>Welcome${member.day === 1 ? ', ' + escapeHTML(member.name) : ' back'}.</h1><p>“${DAY_INTROS[Math.min(4, member.day - 1)]}”</p><p class="note">Your stay starts with a gentle body check. No weights, no judgement, and absolutely no pop quizzes. Well, one tiny quiz.</p><div class="actions">${button('Begin body check', 'check', true)}</div></div></main>`;
  } else if (state.screen === 'check') {
    heading = 'BODY CHECK';
    content = `<main class="play-hud"><div class="hud-top"><div class="hud-box"><div class="eyebrow">✳ &nbsp; BODY CHECK</div><h2>Just checking in.</h2><p id="check-text">Find a comfortable center.</p></div><div class="hud-box timer" id="check-timer">05</div></div><div class="hud-bottom"><div class="play-instruction">${state.check?.phase === 'lean' ? 'Lean in each direction: ← ↑ → ↓' : 'Stay steady. Small wobbles are welcome.'}</div><div class="meter"><span id="check-progress"></span></div></div></main>`;
  } else if (state.screen === 'question') {
    heading = 'BODY CHECK';
    content = `<main class="main-wrap narrow"><div class="card dialogue"><div class="eyebrow">✳ &nbsp; ONE VERY SCIENTIFIC QUESTION</div><h1>How are you arriving today?</h1><p>Your answer helps us calibrate the island's extremely sophisticated vibes.</p><div class="menu-stack">${button('Bright-eyed and bushy-tailed', 'question-answer', true, 'bright')}${button('A little wobbly, honestly', 'question-answer', false, 'wobbly')}${button('Mostly thinking about snacks', 'question-answer', false, 'snacks')}</div></div></main>`;
  } else if (state.screen === 'check-result') {
    heading = 'BODY CHECK COMPLETE';
    content = `<main class="main-wrap narrow"><div class="card dialogue"><div class="eyebrow">✳ &nbsp; ACCORDING TO TARE</div><div class="score-big">${state.check.spine}</div><h1>Your Spine Age</h1><p>“A completely imaginary number. Your actual spine remains splendid.”</p><p class="note">Today is a fine day to practice being here.</p><div class="actions">${button('Explore the island', 'island', true)}</div></div></main>`;
  } else if (state.screen === 'island') {
    heading = labelDay();
    const dialogue = CAST[(member.day + member.sessions) % CAST.length];
    content = `<main class="main-wrap island-main"><div class="section-head"><div><div class="eyebrow">✳ &nbsp; ${labelDay()} &nbsp; / &nbsp; ${Math.floor(member.minutes || 0)} FIT MINUTES</div><h1>Find your kind of movement.</h1><p>${member.finished ? 'The island is yours. Stay as long as you like.' : `Hello, ${escapeHTML(member.name)}. Choose a mat and settle in.`}</p></div><div class="day-badge"><strong>${member.sessions || 0}<small>/ 3</small></strong><span>TODAY'S<br>SESSIONS</span></div></div><div class="activity-grid">${ACTIVITIES.map(activity => tile(activity, !member.finished && activity.day > member.day)).join('')}</div><div class="island-bar"><p><b>${dialogue[0]} says:</b> “${dialogue[1]}”</p><div class="map-actions">${button('Local Class', 'class')}${button(member.finished ? 'Your story' : member.day === 5 ? 'Gentle Games' : 'End the day', member.finished ? 'ending' : 'sleep', true)}</div></div></main>`;
  } else if (state.screen === 'activity') {
    const activity = state.selection, group = GROUPS[activity.group]; heading = group.name.toUpperCase();
    content = `<main class="main-wrap narrow"><div class="card activity-detail" style="--group:${group.color};--group-light:${group.light}"><div class="activity-large-icon">${activity.icon}</div><div class="eyebrow">${group.icon} &nbsp; ${group.name.toUpperCase()} &nbsp; / &nbsp; ${activity.seconds} SECONDS</div><h1>${activity.name}</h1><p>${activity.tagline}</p><div class="divider"></div><h3>How to play</h3><p>${activity.instruction}</p><p class="note">Lean with WASD, arrow keys, left stick or mouse. ${state.settings.gentle ? 'Gentle mode is on.' : 'Make small, comfortable movements.'}</p><div class="actions">${button('Back to island', state.classMode ? 'class' : 'island')}${button('Begin practice', 'start-activity', true)}</div></div></main>`;
  } else if (state.screen === 'play') {
    const activity = state.activity, group = GROUPS[activity.group]; heading = group.name.toUpperCase();
    content = `<main class="play-hud"><div class="hud-top"><div class="hud-box"><div class="eyebrow">${group.icon} &nbsp; ${group.name.toUpperCase()}</div><h2>${activity.name}</h2><p id="play-status">Find your center.</p></div><div class="hud-box timer"><span id="play-timer">${Math.ceil(activity.seconds)}</span><small>SEC</small></div></div><div class="balance-plate" aria-label="Balance indicator"><span class="plate-ring" id="plate-ring"></span><span class="plate-dot" id="plate-dot"></span></div><div class="hud-bottom"><div class="play-instruction" id="play-instruction">${activity.instruction}</div><div class="meter"><span id="play-progress"></span></div><div class="hud-caption"><span id="play-score">A GENTLE START</span><span>ESC / OPTIONS &nbsp; PAUSE</span></div></div></main>`;
  } else if (state.screen === 'result') {
    const result = state.result;
    heading = 'SESSION COMPLETE';
    content = `<main class="main-wrap narrow"><div class="card dialogue result-card"><div class="eyebrow">✳ &nbsp; PRACTICE COMPLETE</div><div class="stars-big">${'★'.repeat(result.stars)}<span>${'☆'.repeat(3 - result.stars)}</span></div><h1>Lovely work${state.classMode ? ', everyone' : ''}.</h1><p>“${result.message}”</p><div class="result-stats"><div><strong>${result.percent}%</strong><small>STEADINESS</small></div><div><strong>+${result.minutes}</strong><small>FIT MINUTES</small></div><div><strong>${result.stumbles}</strong><small>WOBBLES</small></div></div><div class="actions">${button('Practice again', 'retry')}${button(state.festival ? 'Continue the Games' : state.classMode ? 'Class results' : 'Back to island', 'result-continue', true)}</div></div></main>`;
  } else if (state.screen === 'recap') {
    heading = 'DAY COMPLETE';
    content = `<main class="main-wrap narrow"><div class="card dialogue"><div class="eyebrow">✳ &nbsp; ANOTHER DAY WELL SPENT</div><h1>Rest is part of it.</h1><p>“${member.sessions} sessions today. Gerald the ceramic hippo has made a careful note.”</p><div class="result-stats"><div><strong>${Math.floor(member.minutes)}</strong><small>FIT MINUTES</small></div><div><strong>${Object.keys(member.stars || {}).length}</strong><small>MATS VISITED</small></div></div><div class="actions">${button('Wake up to day ' + (member.day + 1), 'next-day', true)}</div></div></main>`;
  } else if (state.screen === 'festival') {
    heading = 'DAY 5 &nbsp; / &nbsp; GENTLE GAMES';
    content = `<main class="main-wrap narrow"><div class="card dialogue"><div class="eyebrow">✳ &nbsp; THE GENTLE GAMES</div><h1>Ready, steady,<br><em>be yourself.</em></h1><p>Three friendly challenges, ending in the Grand Stillness with Gertrude. The prize is a very nice feeling.</p><p class="note">Challenge ${state.festivalIndex + 1} of 3 &nbsp; · &nbsp; ${['Stork Stand', 'Slalom', 'Quiet Candle'][state.festivalIndex]}</p><div class="actions">${button('Begin challenge', 'festival-start', true)}</div></div></main>`;
  } else if (state.screen === 'ending') {
    heading = 'THANK YOU FOR STAYING';
    content = `<main class="main-wrap narrow"><div class="card dialogue"><div class="eyebrow">✳ &nbsp; YOUR ISLAND IS ALWAYS HERE</div><div class="stars-big">✳</div><h1>A little steadier.<br><em>A lot more you.</em></h1><p>Gertrude awards you the Golden Composure. Dennis is emotional. Tare insists the award is calibrated.</p><p class="note">Thank you for five days of moving, breathing, and making room. The mats are yours whenever you wish.</p><div class="actions">${button('Explore freely', 'free-play', true)}${button('About & credits', 'about')}</div></div></main>`;
  } else if (state.screen === 'class') {
    heading = 'LOCAL CLASS';
    const players = state.classPlayers;
    content = `<main class="main-wrap"><div class="section-head"><div><div class="eyebrow">✳ &nbsp; BETTER TOGETHER</div><h1>Make room for friends.</h1><p>Up to four share the same screen. One keyboard player; connect controllers for more.</p></div></div><div class="class-players">${[0, 1, 2, 3].map((index) => `<div class="card player-tile"><span class="slot-avatar">${players[index] ? '☺' : '+'}</span><strong>${players[index] ? escapeHTML(players[index].name) : 'Open spot'}</strong><small>${players[index] ? escapeHTML(players[index].type) : 'Join or add a bot'}</small><button class="chip" data-action="class-toggle" data-id="${index}">${players[index] ? 'REMOVE' : 'ADD BOT'}</button></div>`).join('')}</div><div class="card class-select"><p>CHOOSE A CLASS</p><div class="options">${['stork','candle','step','slalom','tray'].map(id => `<button class="option ${state.selection?.id === id ? 'selected' : ''}" data-action="class-activity" data-id="${id}">${ACTIVITIES.find(a => a.id === id).name}</button>`).join('')}</div></div><div class="actions">${button('Back', member.name === 'Guest' ? 'home' : 'island')}${button('Start class', 'start-class', true)}</div></main>`;
  } else if (state.screen === 'class-result') {
    heading = 'LOCAL CLASS';
    content = `<main class="main-wrap narrow"><div class="card dialogue"><div class="eyebrow">✳ &nbsp; EVERYONE SHOWED UP</div><h1>A class act.</h1><p>Everyone gets their own kind of gold star.</p>${state.classScores.map(player => `<div class="row"><span>${escapeHTML(player.name)} ${player.bot ? '· BOT' : ''}</span><b>${player.score} points &nbsp; ★</b></div>`).join('')}<div class="actions">${button('Back to class', 'class', true)}</div></div></main>`;
  } else if (state.screen === 'settings') {
    heading = 'SETTINGS';
    content = `<main class="main-wrap narrow"><div class="section-head"><div><div class="eyebrow">✳ &nbsp; MAKE YOURSELF COMFORTABLE</div><h1>Your settings.</h1></div></div><div class="card settings-card">${settingRow('Music', state.settings.music + '%', 'volume', 'music')}${settingRow('Sound effects', state.settings.sound + '%', 'volume', 'sound')}${settingRow('Voice sounds', state.settings.voice ? 'ON' : 'OFF', 'toggle', 'voice')}${settingRow('Gentle mode', state.settings.gentle ? 'ON' : 'OFF', 'toggle', 'gentle')}${settingRow('Breathing', state.settings.breathToggle ? 'TOGGLE' : 'HOLD', 'toggle', 'breathToggle')}${settingRow('Tips', state.settings.tips ? 'ON' : 'OFF', 'toggle', 'tips')}${settingRow('Controller symbols', state.settings.glyphs.toUpperCase(), 'glyphs')}<p class="note">Select a volume to cycle from 0% to 100%. Gentle mode makes balancing more forgiving.</p><div class="actions">${button('Done', 'settings-back', true)}</div></div></main>`;
  } else if (state.screen === 'pause') {
    heading = 'PAUSED';
    content = `<main class="main-wrap narrow"><div class="card dialogue"><div class="eyebrow">✳ &nbsp; TAKE YOUR TIME</div><h1>Pause is a practice, too.</h1><div class="menu-stack">${button('Resume', 'resume', true)}${button('Restart session', 'restart')}${button('Settings', 'settings')}${state.hub.active ? '' : button('Developer mode', 'dev')}${state.hub.active ? '' : button('Leave session', 'leave-play')}</div></div></main>`;
  } else if (state.screen === 'dev') {
    heading = 'DEVELOPER MODE';
    content = `<main class="main-wrap narrow"><div class="card settings-card"><div class="eyebrow">✳ &nbsp; LIVE TUNING</div><h1>Behind the wobble.</h1>${[['spring','Spring',4,20,.5],['damping','Damping',1,12,.5],['instability','Instability',0,4,.1],['noise','Disturbance',0,.8,.05]].map(([key, name, min, max, step]) => `<label class="slider">${name} <output id="out-${key}">${tuning[key]}</output><input type="range" data-tuning="${key}" min="${min}" max="${max}" step="${step}" value="${tuning[key]}"></label>`).join('')}<div class="actions">${button('Reset tuning', 'reset-tuning')}${button('Back to pause', 'pause', true)}</div></div></main>`;
  } else if (state.screen === 'about') {
    heading = 'ABOUT & CREDITS';
    content = `<main class="main-wrap narrow"><div class="card scroll"><div class="eyebrow">✳ &nbsp; A LITTLE NOTE FROM THE MAKERS</div><h1>About & credits.</h1><p>Made with care for everyone who has ever wobbled.</p>${aboutContent()}<div class="actions">${button('Back', 'about-back', true)}</div></div></main>`;
  } else if (state.screen === 'hub') {
    heading = 'AI HUB &nbsp; / &nbsp; GHOST CLASS';
    content = `<main class="main-wrap narrow"><div class="card dialogue"><div class="eyebrow">✳ &nbsp; THREE MINUTES TOGETHER</div><h1>${state.hub.finished ? 'Class complete.' : 'A little steadiness, shared.'}</h1><p>${state.hub.finished ? 'Your result has been sent to the Hub.' : 'Stork Stand, Step Class, and Quiet Candle. The steadiest practice wins; everyone gets a moment to breathe.'}</p><div class="result-stats"><div><strong>${Math.round(state.hub.score)}</strong><small>POINTS</small></div></div><p class="note">${state.hub.started ? 'The class is underway.' : 'Waiting for the other guests…'}</p></div></main>`;
  }
  app.innerHTML = shell(content, heading, state.screen !== 'play' && state.screen !== 'check');
  enhanceModes();
  if (state.screen === 'play') updateHUD();
  if (state.screen === 'check') updateCheckHUD();
  const touchOnly = matchMedia('(pointer: coarse)').matches && !Array.from(navigator.getGamepads?.() || []).some(Boolean);
  if (touchOnly && !['settings','about'].includes(state.screen)) {
    const notice = document.createElement('div'); notice.className = 'touch-notice'; notice.innerHTML = '<div><span>✳</span><h2>Controller or keyboard required</h2><p>Connect a controller or keyboard to enjoy the island.</p><button class="action primary" data-action="settings">Settings <span class="arrow">↗</span></button></div>'; app.appendChild(notice);
  }
}
function currentButtons() { return [...app.querySelectorAll('button:not([disabled])')].filter(node => node.offsetParent !== null && !node.closest('.touch-notice')); }
function focusMove(direction) {
  const buttons = currentButtons(); if (!buttons.length) return;
  const index = buttons.indexOf(document.activeElement); buttons[(index + direction + buttons.length) % buttons.length].focus();
}
function memberDefault() { return { name: 'Guest', day: 1, sessions: 0, minutes: 0, stars: {}, instructor: 'Birch', color: 1, outfit: 1, finished: false }; }
function beginCheck() { state.check = { phase: 'still', elapsed: 0, directions: new Set(), spine: 25 + Math.floor(Math.random() * 25) }; state.activity = null; screen('check'); }
function startActivity(activity, options = {}) {
  const selected = { ...activity }, duration = options.seconds || selected.seconds;
  state.selection = selected;
  state.activity = { ...selected, seconds: duration, elapsed: 0, px: 0, py: 0, vx: 0, vy: 0, ux: 0, uy: 0, ringX: 0, ringY: 0, flame: .6, score: 0, samples: 0, stumbles: 0, stun: 0, effort: 0, reps: 0, beatHits: 0, lastBeat: -1, lastJog: '', jogHits: 0, hoopHits: 0, good: 0, tray: 0, lastDirection: 0, motions: 0, rng: seeded(841 + selected.name.length) };
  if (state.classMode && !state.hub.active) prepareClass();
  mouseLean = null; keys.clear(); toggledBreath = false; screen('play');
}
function completeActivity() {
  const activity = state.activity;
  if (!activity) return;
  const percent = Math.round(clamp(activity.score / Math.max(1, activity.samples) * 100, 0, 100));
  const stars = percent >= 90 ? 3 : percent >= 65 ? 2 : percent >= 35 ? 1 : 0;
  const minutes = Math.max(1, Math.round(activity.seconds / 60 * (1 + stars * .25)));
  state.result = { percent, stars, minutes, stumbles: activity.stumbles, message: stars >= 2 ? 'You made the wobble look rather elegant.' : 'A little practice is still a lovely thing.' };
  if (!state.hub.active && !state.classMode) { const member = state.member; member.sessions = (member.sessions || 0) + 1; member.minutes = (member.minutes || 0) + minutes; member.stars[activity.id] = Math.max(member.stars[activity.id] || 0, stars); save(); }
  tone(523, .3); if (state.hub.active) { finishHubEvent(); screen('hub'); } else if (state.classMode) { finishClass(percent); screen('class-result'); } else screen('result');
}
function attemptInput(key) {
  const activity = state.activity;
  if (!activity || state.screen !== 'play') return;
  if (activity.kind === 'step') {
    const directions = ['arrowleft','arrowup','arrowright','arrowdown'];
    const aliases = { a:'arrowleft', w:'arrowup', d:'arrowright', s:'arrowdown' };
    const direction = aliases[key] || key, beat = Math.round(activity.elapsed * 100 / 60), phase = Math.abs(activity.elapsed * 100 / 60 - beat);
    if (direction === directions[(beat + 4) % 4] && phase < .34 && beat !== activity.lastBeat) { activity.beatHits++; activity.lastBeat = beat; tone(520, .08, .35); }
  }
  if (activity.kind === 'jog' && (key === 'j' || key === 'k') && key !== activity.lastJog) { activity.lastJog = key; activity.jogHits++; }
  if (activity.kind === 'hoop' && (key === 'q' || key === 'e')) { activity.hoopHits++; tone(660, .1, .3); }
  if ((key === ' ' || key === 'enter') && state.settings.breathToggle) toggledBreath = !toggledBreath;
}
const tuningDefaults = { spring: 11, damping: 6, instability: 1.3, noise: .19 };
const tuning = { ...tuningDefaults };
function updateActivity(dt) {
  const activity = state.activity; if (!activity) return;
  activity.elapsed += dt;
  const pad = Array.from(navigator.getGamepads?.() || []).find(candidate => candidate && !(state.classMode && state.classActors?.some(actor => actor.player.padIndex === candidate.index))), axisX = pad && Math.abs(pad.axes[0]) > .12 ? pad.axes[0] : 0, axisY = pad && Math.abs(pad.axes[1]) > .12 ? pad.axes[1] : 0;
  const dx = (keys.has('arrowright') || keys.has('d') ? 1 : 0) - (keys.has('arrowleft') || keys.has('a') ? 1 : 0);
  const dy = (keys.has('arrowdown') || keys.has('s') ? 1 : 0) - (keys.has('arrowup') || keys.has('w') ? 1 : 0);
  if (activity.stun <= 0) {
    if (mouseLean) { activity.ux = mouseLean.x; activity.uy = mouseLean.y; }
    else if (axisX || axisY) { activity.ux = axisX; activity.uy = axisY; }
    else { activity.ux = clamp(activity.ux + dx * 2.2 * dt, -1, 1); activity.uy = clamp(activity.uy + dy * 2.2 * dt, -1, 1); if (!dx) activity.ux *= Math.max(0, 1 - .5 * dt); if (!dy) activity.uy *= Math.max(0, 1 - .5 * dt); }
  } else activity.stun -= dt;
  const gentle = state.settings.gentle ? .7 : 1, time = activity.elapsed, disturbance = tuning.noise * gentle;
  const ax = tuning.spring * (activity.ux - activity.px) - tuning.damping * activity.vx + tuning.instability * gentle * activity.px + disturbance * (Math.sin(time * 1.7) + .5 * Math.sin(time * 3.23));
  const ay = tuning.spring * (activity.uy - activity.py) - tuning.damping * activity.vy + tuning.instability * gentle * activity.py + disturbance * (Math.sin(time * 1.19 + 1) + .5 * Math.sin(time * 2.71));
  activity.vx += ax * dt; activity.vy += ay * dt; activity.px += activity.vx * dt; activity.py += activity.vy * dt;
  if (Math.hypot(activity.px, activity.py) >= 1 && activity.stun <= 0) { activity.stumbles++; activity.stun = 1; activity.px *= .5; activity.py *= .5; activity.vx *= -.2; activity.vy *= -.2; tone(196, .18); }
  const phase = Math.floor(time / 12), rng = seeded(phase * 667 + 43);
  activity.ringX = activity.id === 'stork' ? (rng() - .5) * .65 : activity.kind === 'slalom' ? Math.sin(time * .55) * .46 : 0;
  activity.ringY = activity.id === 'stork' ? (rng() - .5) * .35 : 0;
  const distance = Math.hypot(activity.px - activity.ringX, activity.py - activity.ringY), ringSize = state.settings.gentle ? .48 : .38;
  const steadiness = clamp(1 - distance * 1.4, 0, 1);
  let quality = steadiness;
  const held = state.settings.breathToggle ? toggledBreath : keys.has(' ') || !!pad?.buttons[7]?.pressed;
  activity.effort = clamp(activity.effort + (held ? 1 : -1) * dt / 4, 0, 1);
  if (activity.kind === 'rep') { const goal = (Math.sin(time * Math.PI / 2 - Math.PI / 2) + 1) / 2; quality = clamp(1 - Math.abs(activity.effort - goal), 0, 1) * steadiness; activity.reps = Math.floor(time / 4); }
  if (activity.kind === 'breath') { const inhale = Math.sin(time * Math.PI / 4) > 0; quality = steadiness * (held === inhale ? 1 : .5); }
  if (activity.kind === 'step') quality = clamp(activity.beatHits / Math.max(1, time * 100 / 60) * 1.5, 0, 1);
  if (activity.kind === 'hoop') { activity.motions += (Math.abs(activity.vx) + Math.abs(activity.vy)) * dt; quality = clamp(activity.motions / Math.max(1, time) * 3 + activity.hoopHits / Math.max(1, time / 10), 0, 1); }
  if (activity.kind === 'jog') quality = clamp(activity.jogHits / Math.max(1, time * 2) * 1.5, 0, 1) * steadiness;
  if (activity.kind === 'slalom') quality = clamp(1 - Math.abs(activity.px - activity.ringX) * 1.5, 0, 1);
  if (activity.kind === 'tray') { activity.tray += (activity.px - activity.tray) * dt * 1.5; quality = clamp(1 - Math.abs(activity.tray) * 2, 0, 1); }
  if (activity.kind === 'rope') quality = clamp(1 - Math.abs(activity.px) * 2, 0, 1) * (activity.uy < -.1 ? 1 : .65);
  if (activity.kind === 'candle') { activity.flame = clamp(activity.flame + (distance < ringSize ? .13 : -.3) * dt, 0, 1); quality = activity.flame; }
  activity.score += quality; activity.samples++;
  if (state.classMode && !state.hub.active) updateClass(dt);
  if (state.hub.active) {
    const now = window.AIHub.time();
    if (now - state.hub.lastSend >= 100) { state.hub.lastSend = now; window.AIHub.send({ x: activity.px, y: activity.py, exercise: activity.id }); }
    if (now - state.hub.lastProgress >= 1000) { state.hub.lastProgress = now; window.AIHub.progress({ score: Math.round(state.hub.score + activity.score / Math.max(1, activity.samples) * 1000), label: activity.name }); }
  }
  if (!state.hub.active && activity.elapsed >= activity.seconds) completeActivity();
}
function updateHUD() {
  const activity = state.activity; if (!activity) return;
  const timer = document.getElementById('play-timer'), status = document.getElementById('play-status'), instruction = document.getElementById('play-instruction'), progress = document.getElementById('play-progress'), dot = document.getElementById('plate-dot'), ring = document.getElementById('plate-ring'), score = document.getElementById('play-score');
  if (!timer) return;
  timer.textContent = Math.max(0, Math.ceil(activity.seconds - activity.elapsed));
  if (activity.kind === 'step') { const arrows = ['←','↑','→','↓']; const beat = Math.round(activity.elapsed * 100 / 60); status.textContent = `NEXT STEP  ${arrows[(beat + 4) % 4]}   ·   ${activity.beatHits} on beat`; instruction.textContent = `Press ${arrows[(beat + 4) % 4]} on the beat · ${activity.instruction}`; }
  else if (activity.kind === 'rep') status.textContent = `Rep ${activity.reps + 1} · ${Math.sin(activity.elapsed * Math.PI / 2 - Math.PI / 2) > 0 ? 'Rise gently' : 'Lower gently'}`;
  else if (activity.kind === 'breath') status.textContent = Math.sin(activity.elapsed * Math.PI / 4) > 0 ? 'Breathe in · hold' : 'Breathe out · release';
  else if (activity.kind === 'candle') status.textContent = `Flame ${Math.round(activity.flame * 100)}% · ${activity.flame < .15 ? 'settle to relight' : 'let it glow'}`;
  else if (activity.kind === 'jog') status.textContent = `${activity.jogHits} steps · alternate J and K`;
  else if (activity.kind === 'hoop') status.textContent = `${activity.hoopHits} catches · circle your lean`;
  else status.textContent = activity.stun > 0 ? 'A wobble! Take a moment.' : 'Find the ring. Breathe naturally.';
  progress.style.width = `${clamp(activity.elapsed / activity.seconds * 100, 0, 100)}%`;
  dot.style.transform = `translate(${activity.px * 70}px, ${activity.py * 70}px)`;
  ring.style.transform = `translate(${activity.ringX * 70}px, ${activity.ringY * 70}px)`;
  score.textContent = `${Math.round(activity.score / Math.max(1, activity.samples) * 100)}% STEADY`;
}
function updateCheckHUD() {
  if (!state.check) return;
  const timer = document.getElementById('check-timer'), text = document.getElementById('check-text'), progress = document.getElementById('check-progress');
  if (!timer) return;
  timer.textContent = state.check.phase === 'still' ? String(Math.max(0, Math.ceil(5 - state.check.elapsed))).padStart(2, '0') : `${state.check.directions.size}/4`;
  text.textContent = state.check.phase === 'still' ? 'Find a comfortable center.' : 'Lean left, up, right and down.';
  progress.style.width = `${state.check.phase === 'still' ? clamp(state.check.elapsed / 5 * 50, 0, 50) : 50 + state.check.directions.size * 12.5}%`;
}
function update(dt) {
  state.clock += dt;
  if (state.screen === 'title') { state.idle += dt; if (state.idle >= 10 && !state.hub.active) screen('attract'); }
  if (state.screen === 'check') { state.check.elapsed += dt; if (state.check.phase === 'still' && state.check.elapsed >= 5) { state.check.phase = 'lean'; state.check.elapsed = 0; } if (state.check.phase === 'lean' && (state.check.directions.size === 4 || state.check.elapsed >= 14)) screen('question'); }
  if (state.screen === 'play') updateActivity(dt);
}
function action(name, id) {
  unlockAudio(); state.idle = 0; tone(440, .07, .2);
  switch (name) {
    case 'home': if (!state.hub.active) { state.classMode = false; screen('title'); } break;
    case 'slots': screen('slots'); break;
    case 'slot': state.slot = Number(id); state.member = state.slots[state.slot] || memberDefault(); state.classMode = false; screen(state.slots[state.slot] ? 'island' : 'setup'); break;
    case 'outfit': state.member.name = document.getElementById('nickname')?.value || state.member.name; state.member.outfit = Number(id); render(); break;
    case 'instructor': state.member.name = document.getElementById('nickname')?.value || state.member.name; state.member.instructor = id; render(); break;
    case 'create-member': { const value = document.getElementById('nickname')?.value.trim(); state.member.name = (value || 'Guest').slice(0, 16); save(); screen('intro'); break; }
    case 'check': beginCheck(); break;
    case 'question-answer': state.check.answer = id; screen('check-result'); break;
    case 'island': state.classMode = false; screen('island'); break;
    case 'select-activity': state.selection = ACTIVITIES.find(activity => activity.id === id); state.classMode = false; screen('activity'); break;
    case 'locked': notify('A new mat opens on a later day.'); break;
    case 'start-activity': startActivity(state.selection); break;
    case 'retry': startActivity(state.selection, { seconds: state.classMode ? 35 : state.festival ? 30 : undefined }); break;
    case 'result-continue': if (state.festival) { state.festivalIndex++; if (state.festivalIndex >= 3) { state.festival = false; state.member.finished = true; save(); screen('ending'); } else screen('festival'); } else if (state.classMode) screen('class-result'); else screen('island'); break;
    case 'sleep': if (memberDefault && state.member.sessions < 3) notify('Try three sessions before calling it a day.'); else if (state.member.day === 5) { state.festival = true; state.festivalIndex = 0; screen('festival'); } else screen('recap'); break;
    case 'next-day': state.member.day = Math.min(5, state.member.day + 1); state.member.sessions = 0; save(); screen('intro'); break;
    case 'festival-start': startActivity(ACTIVITIES.find(activity => activity.id === ['stork','slalom','candle'][state.festivalIndex]), { seconds: 30 }); break;
    case 'ending': screen('ending'); break;
    case 'free-play': state.member.finished = true; save(); screen('island'); break;
    case 'class': state.classMode = true; if (!state.classPlayers.length) state.classPlayers = [{ name: state.member?.name || 'Player 1', type: 'Keyboard / pad', source: 'primary' }, { name: 'Gertrude', type: 'Bot', source: 'bot' }]; if (!CLASS_IDS.includes(state.selection?.id)) state.selection = ACTIVITIES[0]; screen('class'); break;
    case 'class-toggle': { const index = Number(id); if (index === 0) break; const current = state.classPlayers[index]; state.classPlayers[index] = !current ? { name: ['Player 1','Gertrude','Dennis','Marisol'][index], type: 'Bot', source: 'bot' } : index === 1 && current.source === 'bot' ? { name: 'Player 2', type: 'Keyboard 2', source: 'keyboard' } : null; render(); break; }
    case 'class-activity': state.selection = ACTIVITIES.find(activity => activity.id === id); render(); break;
    case 'start-class': state.classPlayers = state.classPlayers.filter(Boolean); if (state.classPlayers.length < 2) { notify('Add at least one friend or bot.'); break; } startActivity(state.selection, { seconds: 35 }); break;
    case 'hub-ready': window.AIHub.answer('ready'); notify('Ready to go!'); break;
    case 'hub-more': window.AIHub.answer('more'); notify('Waiting for more players.'); break;
    case 'settings': state.returnScreen = state.screen; screen('settings'); break;
    case 'settings-back': save(); screen(state.returnScreen || 'title'); break;
    case 'toggle': state.settings[id] = !state.settings[id]; save(); render(); break;
    case 'volume': state.settings[id] = state.settings[id] >= 100 ? 0 : state.settings[id] + 10; save(); render(); break;
    case 'glyphs': state.settings.glyphs = state.settings.glyphs === 'Xbox' ? 'PlayStation' : 'Xbox'; save(); render(); break;
    case 'pause': if (!state.hub.active) { pausedFrom = state.screen === 'play' ? 'play' : pausedFrom; screen('pause'); } break;
    case 'resume': screen(pausedFrom || 'play'); break;
    case 'restart': startActivity(state.selection, { seconds: state.classMode ? 35 : state.festival ? 30 : undefined }); break;
    case 'leave-play': state.festival = false; state.classMode ? screen('class') : screen('island'); break;
    case 'dev': screen('dev'); break;
    case 'reset-tuning': Object.assign(tuning, tuningDefaults); render(); break;
    case 'about': state.aboutReturn = state.screen; screen('about'); break;
    case 'about-back': screen(state.aboutReturn || 'title'); break;
  }
}
app.addEventListener('click', event => { const target = event.target.closest('[data-action]'); if (target) action(target.dataset.action, target.dataset.id); });
app.addEventListener('mouseover', event => { const target = event.target.closest('button'); if (target && state.input !== 'gamepad') target.focus({ preventScroll: true }); });
app.addEventListener('input', event => { const key = event.target.dataset.tuning; if (key) { tuning[key] = Number(event.target.value); document.getElementById(`out-${key}`).value = tuning[key]; } });
window.addEventListener('keydown', event => {
  if (event.repeat && event.key !== ' ') return;
  state.input = 'keyboard'; state.idle = 0; const key = event.key.toLowerCase();
  if (state.screen === 'attract') { event.preventDefault(); screen('title'); return; }
  if (event.target instanceof HTMLInputElement && event.target.type === 'text') { if (key === 'enter') { event.preventDefault(); action('create-member'); } return; }
  if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key)) event.preventDefault();
  keys.add(key); unlockAudio();
  if (state.screen === 'check' && state.check.phase === 'lean') { const mapping = { a:'left', arrowleft:'left', w:'up', arrowup:'up', d:'right', arrowright:'right', s:'down', arrowdown:'down' }; if (mapping[key]) state.check.directions.add(mapping[key]); return; }
  if (state.screen === 'play') { if (key === 'escape') action('pause'); else { attemptInput(key); if (state.classMode) classInput(key); } return; }
  if (state.screen === 'hub' && !state.hub.started && !state.hub.finished && key === 'enter') { event.preventDefault(); action(document.activeElement?.dataset.action === 'hub-more' ? 'hub-more' : 'hub-ready'); return; }
  if (key === 'escape' || key === 'backspace') { if (state.screen === 'settings') action('settings-back'); else if (state.screen === 'pause') action('resume'); else if (state.screen === 'about') action('about-back'); else if (state.screen === 'dev') screen('pause'); else if (state.screen === 'activity') action('island'); else if (state.screen === 'slots' || state.screen === 'class') action('home'); return; }
  if (key === 'arrowdown' || key === 's') focusMove(1); else if (key === 'arrowup' || key === 'w') focusMove(-1); else if ((key === 'enter' || key === ' ') && document.activeElement?.tagName !== 'BUTTON') { const buttons = currentButtons(); if (buttons.length) buttons[0].focus(); }
});
window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => { keys.clear(); if (state.screen === 'play' && !state.hub.active) action('pause'); });
window.addEventListener('mousemove', event => { if (state.screen !== 'play' || event.buttons === 0) return; state.input = 'mouse'; mouseLean = { x: clamp((event.clientX - innerWidth / 2) / (innerHeight * .33), -1, 1), y: clamp((event.clientY - innerHeight / 2) / (innerHeight * .33), -1, 1) }; });
window.addEventListener('mousedown', event => { if (state.screen === 'play' && event.button === 0) keys.add(' '); });
window.addEventListener('mouseup', () => keys.delete(' '));
function pollGamepad() {
  const pads = Array.from(navigator.getGamepads?.() || []);
  for (const pad of pads) {
    if (!pad) continue;
    const previous = gamepadPrevious[pad.index] || [];
    pad.buttons.forEach((item, index) => {
      if (item.pressed && !previous[index]) {
        state.input = 'gamepad'; state.idle = 0; unlockAudio();
        if (state.screen === 'attract') screen('title');
        else if (state.screen === 'class' && index === 9 && pad.index > 0) joinClassPad(pad.index);
        else if (state.screen === 'play') {
          const actor = state.classMode && state.classActors?.find(item => item.player.source === 'gamepad' && item.player.padIndex === pad.index);
          if (actor) classPadInput(actor, index);
          else if (index === 9) action('pause');
          else if (index === 4 || index === 5) attemptInput(index === 4 ? 'q' : 'e');
          else if (index === 6 || index === 7) attemptInput(index === 6 ? 'j' : 'k');
          else if (index >= 12 && index <= 15) attemptInput({ 12: 'arrowup', 13: 'arrowdown', 14: 'arrowleft', 15: 'arrowright' }[index]);
        }
        else if (state.screen === 'check' && state.check.phase === 'lean') { if (index === 12) state.check.directions.add('up'); if (index === 13) state.check.directions.add('down'); if (index === 14) state.check.directions.add('left'); if (index === 15) state.check.directions.add('right'); }
        else if (index === 0) { const selected = document.activeElement; if (selected?.tagName === 'BUTTON') selected.click(); else currentButtons()[0]?.focus(); }
        else if (index === 1) { if (state.screen === 'settings') action('settings-back'); else if (state.screen === 'pause') action('resume'); else if (state.screen === 'about') action('about-back'); else if (!state.hub.active) action('home'); }
        else if (index === 12) focusMove(-1); else if (index === 13) focusMove(1);
      }
    });
    if (state.screen === 'check' && state.check.phase === 'lean') { if (pad.axes[0] < -.45) state.check.directions.add('left'); if (pad.axes[0] > .45) state.check.directions.add('right'); if (pad.axes[1] < -.45) state.check.directions.add('up'); if (pad.axes[1] > .45) state.check.directions.add('down'); }
    gamepadPrevious[pad.index] = pad.buttons.map(item => item.pressed);
  }
}
const simulation = new My3D2dge.Game({ headless: true, step: 1 / 120 });
simulation.start({ update, draw() {} });
function frame(now) {
  const dt = lastFrame ? Math.min(.1, (now - lastFrame) / 1000) : 0; lastFrame = now;
  pollGamepad(); syncHub(); simulation.advance(dt); music(); drawWorld({ ...state, shirt: OUTFITS[person().outfit || 0] });
  if (now - lastHud > 100) { if (state.screen === 'play') { updateHUD(); if (state.classMode) updateClassBoard(); } if (state.screen === 'check') updateCheckHUD(); lastHud = now; }
  requestAnimationFrame(frame);
}
window.__ZEN = {
  state, action, startActivity, tuning,
  advance(seconds) { simulation.advance(seconds); render(); },
  step(seconds) { for (let time = 0; time < seconds; time += 1 / 30) update(1 / 30); render(); },
  snapshot() { return JSON.parse(JSON.stringify({ screen: state.screen, member: state.member, activity: state.activity && { id: state.activity.id, elapsed: state.activity.elapsed, px: state.activity.px, py: state.activity.py, score: state.activity.score, stumbles: state.activity.stumbles }, result: state.result, hub: state.hub, settings: state.settings })); }
};
render(); requestAnimationFrame(frame);

if (state.hub.active) {
  screen('hub');
  window.AIHub.on('start', startHub);
  window.AIHub.on('message', (data, from) => { state.hub.ghosts[from] = data; });
  window.AIHub.on('time-up', finishHub);
  window.AIHub.on('end', () => { state.hub.finished = true; screen('hub'); });
  window.AIHub.probe(() => ({ screen: state.screen, phase: state.hub.phase, eventIndex: state.hub.eventIndex, score: state.hub.score }));
  window.AIHub.connect({ mode: 'ghost', seats: [1, 4], card: true }).then(() => window.AIHub.ready()).catch(() => notify('Unable to connect to the Hub.'));
}
