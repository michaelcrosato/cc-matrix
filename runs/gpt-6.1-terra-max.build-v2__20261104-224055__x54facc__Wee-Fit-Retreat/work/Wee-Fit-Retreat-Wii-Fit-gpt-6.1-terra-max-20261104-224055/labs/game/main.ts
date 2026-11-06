/** @file Runs the retreat's menus, input, and balance sessions. */
import './styles.css';
import './extras.css';
import { DAYS, rankFor, type Activity } from './programme';
import { DEFAULT_BALANCE, action, createSession, stepSession, targetFor, type Session } from './wobble';
import { Soundscape } from './audio';
import { welcomeView, hubView, gameView, resultView, modalView } from './view';
import { aboutView } from './about';

type Screen = 'welcome' | 'hub' | 'playing' | 'result';
type Modal = 'settings' | 'about' | 'pause' | 'touch' | null;
type Preferences = { sound: boolean; motion: boolean; contrast: boolean; assist: boolean };
type Save = { unlocked: number; scores: Record<string, number>; preferences: Preferences };

const root = document.querySelector<HTMLElement>('#app')!;
const storageKey = 'wee-fit-retreat-save-v1';
const defaults: Save = { unlocked: 0, scores: {}, preferences: { sound: true, motion: false, contrast: false, assist: false } };
function load(): Save {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}') as Partial<Save>;
    return { ...defaults, ...saved, scores: saved.scores || {}, preferences: { ...defaults.preferences, ...saved.preferences } };
  } catch { return structuredClone(defaults); }
}
let save = load();
let screen: Screen = 'welcome';
let modal: Modal = null;
let dayIndex = 0;
let activityIndex = 0;
let session: Session | null = null;
let attract = false;
let lastInput = performance.now();
let lastFrame = 0;
let accumulator = 0;
let lastPadButtons: boolean[] = [];
let lastInputType: 'keyboard' | 'controller' = 'keyboard';
const keys = new Set<string>();
const sounds = new Soundscape();
sounds.enabled = save.preferences.sound;

function persist(): void {
  try { localStorage.setItem(storageKey, JSON.stringify(save)); } catch { /* storage can be unavailable */ }
}
function flatIndex(day: number, activity: number): number {
  return DAYS.slice(0, day).reduce((total, item) => total + item.activities.length, 0) + activity;
}
function selected(): Activity { return DAYS[dayIndex].activities[activityIndex]; }
function selectFlat(index: number): void {
  let remaining = index;
  for (let day = 0; day < DAYS.length; day++) {
    if (remaining < DAYS[day].activities.length) { dayIndex = day; activityIndex = remaining; return; }
    remaining -= DAYS[day].activities.length;
  }
}
function totalActivities(): number { return DAYS.reduce((total, day) => total + day.activities.length, 0); }
function playSound(name: 'click' | 'hit' | 'finish' | 'miss'): void { try { sounds.play(name); } catch { /* audio is optional */ } }
function isTouchOnly(): boolean {
  return matchMedia('(hover: none) and (pointer: coarse)').matches && !Array.from(navigator.getGamepads?.() || []).some(Boolean);
}
function render(): void {
  document.documentElement.classList.toggle('reduced-motion', save.preferences.motion);
  document.documentElement.classList.toggle('high-contrast', save.preferences.contrast);
  const content = screen === 'welcome' ? welcomeView(isTouchOnly()) : screen === 'hub' ? hubView(dayIndex, activityIndex, save.unlocked, save.scores) : screen === 'playing' && session ? gameView(session, attract, lastInputType) : session ? resultView(session) : '';
  root.innerHTML = content + (modal ? (modal === 'about' ? aboutView() : modalView(modal, save.preferences)) : '');
  if (screen === 'playing') updateGame();
  if (modal) root.querySelector<HTMLElement>('.modal button, .modal input')?.focus();
}
function openGame(preview = false): void {
  if (!preview && isTouchOnly()) { modal = 'touch'; render(); return; }
  session = createSession(selected(), 13 + flatIndex(dayIndex, activityIndex));
  attract = preview; screen = 'playing'; modal = null; lastFrame = 0; accumulator = 0;
  keys.clear(); render();
}
function finish(): void {
  if (!session) return;
  if (attract) { screen = 'welcome'; attract = false; session = null; lastInput = performance.now(); render(); return; }
  const index = flatIndex(dayIndex, activityIndex);
  save.scores[session.activity.id] = Math.max(save.scores[session.activity.id] || 0, session.score);
  save.unlocked = Math.min(totalActivities() - 1, Math.max(save.unlocked, index + 1));
  persist(); playSound('finish'); screen = 'result'; render();
}
function updateGame(): void {
  if (!session) return;
  const balance = session.balance;
  const target = targetFor(session);
  const ball = root.querySelector<HTMLElement>('#balance-ball');
  const marker = root.querySelector<HTMLElement>('#balance-target');
  if (ball) { ball.style.left = `${50 + balance.x * 40}%`; ball.style.top = `${50 + balance.y * 40}%`; }
  if (marker) { marker.style.left = `${50 + target.x * 40}%`; marker.style.top = `${50 + target.y * 40}%`; }
  const timer = root.querySelector<HTMLElement>('#session-time');
  if (timer) { const remaining = Math.max(0, Math.ceil(session.activity.duration - session.time)); timer.textContent = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`; }
  const cue = root.querySelector<HTMLElement>('#session-cue');
  if (cue) cue.textContent = balance.recovering > 0 ? 'Take a breath. Find your footing.' : target.label || session.cue || 'Find your centre';
  const score = root.querySelector<HTMLElement>('#session-score');
  if (score) score.textContent = `${Math.round(session.samples ? session.scoreSum / session.samples : 0)}`;
  const falls = root.querySelector<HTMLElement>('#session-falls');
  if (falls) falls.textContent = String(balance.falls);
  const progress = root.querySelector<HTMLElement>('#session-progress');
  if (progress) progress.style.width = `${Math.min(100, session.time / session.activity.duration * 100)}%`;
  const person = root.querySelector<HTMLElement>('.guest-art');
  if (person) person.style.setProperty('--lean', `${Math.max(-1, Math.min(1, balance.x)) * 11}deg`);
}
function moveFocus(direction: number): void {
  const scope = modal ? root.querySelector('.modal') : root;
  const focusables = Array.from(scope?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)') || []);
  if (!focusables.length) return;
  const current = focusables.indexOf(document.activeElement as HTMLElement);
  focusables[(current + direction + focusables.length) % focusables.length].focus();
}
function doFoot(foot: 'left' | 'right' | 'both'): void {
  if (!session || screen !== 'playing' || modal || attract) return;
  playSound(action(session, foot) ? 'hit' : 'miss');
}
function wake(): void {
  lastInput = performance.now();
  if (attract) { attract = false; session = null; screen = 'welcome'; render(); }
}
root.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!button) return;
  if (attract) { wake(); return; }
  wake(); const command = button.dataset.action; playSound('click');
  if (command === 'begin') { screen = 'hub'; selectFlat(save.unlocked); }
  else if (command === 'home') { screen = 'welcome'; session = null; }
  else if (command === 'settings' || command === 'about') modal = command;
  else if (command === 'close') modal = null;
  else if (command === 'pause') modal = 'pause';
  else if (command === 'resume') { modal = null; lastFrame = 0; }
  else if (command === 'quit') { modal = null; session = null; screen = 'hub'; }
  else if (command === 'reset') {
    if (window.confirm('Reset all retreat progress and scores?')) { save = structuredClone(defaults); sounds.enabled = save.preferences.sound; persist(); dayIndex = 0; activityIndex = 0; }
  } else if (command === 'day') { dayIndex = Number(button.dataset.day); activityIndex = 0; }
  else if (command === 'activity') activityIndex = Number(button.dataset.index);
  else if (command === 'start' || command === 'retry') { openGame(); return; }
  else if (command === 'continue') { screen = 'hub'; session = null; selectFlat(save.unlocked); }
  render();
});
root.addEventListener('change', (event) => {
  const input = event.target as HTMLInputElement;
  const key = input.dataset.preference as keyof Preferences | undefined;
  if (!key) return;
  save.preferences[key] = input.checked; sounds.enabled = save.preferences.sound; persist(); render();
});
window.addEventListener('keydown', (event) => {
  const key = event.key.toLowerCase();
  if (attract) { event.preventDefault(); wake(); return; }
  lastInput = performance.now(); lastInputType = 'keyboard';
  if (key === 'escape') { event.preventDefault(); if (modal) modal = null; else if (screen === 'playing') modal = 'pause'; render(); return; }
  if (screen === 'playing' && !modal) {
    if (['arrowup','arrowdown','arrowleft','arrowright',' ','q','e'].includes(key)) event.preventDefault();
    keys.add(key);
    if (!event.repeat && key === 'q') doFoot('left');
    if (!event.repeat && key === 'e') doFoot('right');
    if (!event.repeat && key === ' ') doFoot('both');
  } else if (['arrowup','arrowdown','arrowleft','arrowright'].includes(key)) {
    event.preventDefault(); moveFocus(key === 'arrowup' || key === 'arrowleft' ? -1 : 1);
  }
});
window.addEventListener('keyup', (event) => keys.delete(event.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());
document.addEventListener('visibilitychange', () => { lastFrame = 0; });
window.addEventListener('pointerdown', () => { if (attract) wake(); else lastInput = performance.now(); });

function frame(now: number): void {
  const pad = Array.from(navigator.getGamepads?.() || []).find(Boolean);
  let stickX = 0; let stickY = 0; let gentle = false;
  if (pad) {
    stickX = Math.abs(pad.axes[0] || 0) > .13 ? pad.axes[0] : 0;
    stickY = Math.abs(pad.axes[1] || 0) > .13 ? pad.axes[1] : 0;
    gentle = !!pad.buttons[7]?.pressed;
    const buttons = pad.buttons.map((button) => button.pressed);
    const pressed = (index: number) => buttons[index] && !lastPadButtons[index];
    if (buttons.some((button, index) => button && !lastPadButtons[index]) || stickX || stickY) {
      if (attract) wake();
      lastInput = now; lastInputType = 'controller';
    }
    if (pressed(9) || pressed(3)) { if (screen === 'playing') { modal = modal ? null : 'pause'; render(); } }
    if (screen === 'playing' && !modal) {
      if (pressed(4)) doFoot('left'); if (pressed(5)) doFoot('right'); if (pressed(0)) doFoot('both');
    } else {
      if (pressed(12) || pressed(14)) moveFocus(-1);
      if (pressed(13) || pressed(15)) moveFocus(1);
      if (pressed(0)) (document.activeElement as HTMLElement | null)?.click();
      if (pressed(1) && modal) { modal = null; render(); }
    }
    lastPadButtons = buttons;
  } else lastPadButtons = [];
  if (screen === 'welcome' && !modal && now - lastInput > 60000) { dayIndex = 0; activityIndex = 0; openGame(true); }
  if (screen === 'playing' && session && !modal && !document.hidden) {
    const elapsed = lastFrame ? Math.min((now - lastFrame) / 1000, .1) : 0;
    accumulator += elapsed;
    const input = attract ? { x: Math.sin(now / 1800) * .25, y: Math.cos(now / 2400) * .2, gentle: true } : {
      x: Math.max(-1, Math.min(1, stickX + Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft')))),
      y: Math.max(-1, Math.min(1, stickY + Number(keys.has('s') || keys.has('arrowdown')) - Number(keys.has('w') || keys.has('arrowup')))),
      gentle: gentle || keys.has('shift'),
    };
    const settings = save.preferences.assist ? { ...DEFAULT_BALANCE, gain: DEFAULT_BALANCE.gain * .7, instability: DEFAULT_BALANCE.instability * .7, damping: DEFAULT_BALANCE.damping * 1.3 } : DEFAULT_BALANCE;
    while (accumulator >= 1 / 60 && !session.finished) { stepSession(session, input, settings, 1 / 60); accumulator -= 1 / 60; }
    updateGame();
    if (session.finished) finish();
  }
  lastFrame = now; requestAnimationFrame(frame);
}
render(); requestAnimationFrame(frame);
