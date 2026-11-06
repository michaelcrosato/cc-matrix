/**
 * @file The shift, with no DOM. Title, story, briefing, operation, debrief, and the menus around them.
 * The page draws whatever this says and starts the run it names.
 */
import { caseById, storyCases } from '../op/cases';
import { rankFor } from '../op/ratings';
import { sceneById } from '../op/story';
import { handbookCards } from '../op/table';
import type { Difficulty, Rank } from '../op/types';

import { items } from './campaignMenus';

export { items };

export type Screen =
  | 'title'
  | 'board'
  | 'story'
  | 'brief'
  | 'op'
  | 'debrief'
  | 'pause'
  | 'settings'
  | 'handbook'
  | 'about'
  | 'scrub'
  | 'credits'
  | 'attract'
  | 'dev';

export interface Progress {
  cleared: number;
  ranks: string[];
  scores: number[];
  postcards: string[];
  free: boolean;
  attending: boolean;
  difficulty: Difficulty;
  simple: boolean;
  glyphs: 'playstation' | 'xbox';
  blood: 'red' | 'teal' | 'off';
  master: number;
  music: number;
  effects: number;
  voice: number;
  autoText: boolean;
  seats: number;
}

export interface Clip {
  kind: 'logo' | 'op' | 'story' | 'cards';
  id: string;
  ms: number;
}

export const ATTRACT: readonly Clip[] = [
  { kind: 'logo', id: '', ms: 6000 },
  { kind: 'op', id: 'case:first-cut', ms: 24000 },
  { kind: 'op', id: 'case:crosstalk', ms: 24000 },
  { kind: 'story', id: 'after-2', ms: 18000 },
  { kind: 'op', id: 'case:struck-off', ms: 24000 },
  { kind: 'op', id: 'case:reverie', ms: 24000 },
  { kind: 'op', id: 'case:gala-night', ms: 24000 },
  { kind: 'op', id: 'case:mercy', ms: 26000 },
  { kind: 'cards', id: '', ms: 16000 },
];

export interface Item {
  id: string;
  label: string;
}

export interface Campaign {
  screen: Screen;
  back: Screen;
  progress: Progress;
  focus: number;
  caseId: string;
  caseIndex: number;
  storyId: string;
  leg: 'before' | 'after';
  box: number;
  board: number;
  tab: number;
  page: number;
  clip: number;
  clipMs: number;
  idle: number;
  lineMs: number;
  record: boolean;
  won: boolean;
  fail: string;
  lastRank: string;
  lastScore: number;
  postcard: string;
  devTab: number;
  hideHud: boolean;
  claimed: boolean[];
  boot: number;
  keepPhase: boolean;
}

const MENUS: readonly Screen[] = ['title', 'board', 'settings', 'handbook', 'about', 'scrub'];

export function blankProgress(): Progress {
  return {
    cleared: 0,
    ranks: [],
    scores: [],
    postcards: [],
    free: false,
    attending: false,
    difficulty: 'resident',
    simple: false,
    glyphs: 'playstation',
    blood: 'red',
    master: 70,
    music: 10,
    effects: 100,
    voice: 100,
    autoText: false,
    seats: 1,
  };
}

export function createCampaign(progress: Progress = blankProgress()): Campaign {
  return {
    screen: 'title',
    back: 'title',
    progress,
    focus: 0,
    caseId: 'case:first-cut',
    caseIndex: 0,
    storyId: 'before-1',
    leg: 'before',
    box: 0,
    board: 0,
    tab: 0,
    page: 0,
    clip: 0,
    clipMs: ATTRACT[0].ms,
    idle: 0,
    lineMs: 0,
    record: true,
    won: false,
    fail: '',
    lastRank: '',
    lastScore: 0,
    postcard: '',
    devTab: 0,
    hideHud: false,
    claimed: [true, false, false, false],
    boot: 0,
    keepPhase: false,
  };
}

export function boardIds(progress: Progress): string[] {
  const ids = storyCases().map((item) => item.id);
  if (progress.free) ids.push('case:gala-shift');
  return ids;
}

export function move(c: Campaign, dir: number): void {
  const rows = items(c);
  if (!rows.length) return;
  c.focus = (c.focus + dir + rows.length) % rows.length;
  c.idle = 0;
}

export function browse(c: Campaign, dir: number): void {
  c.idle = 0;
  if (c.screen === 'board') {
    const ids = boardIds(c.progress);
    c.board = (c.board + dir + ids.length) % ids.length;
    return;
  }
  if (c.screen === 'settings') {
    c.page = (c.page + dir + 4) % 4;
    c.focus = 0;
    return;
  }
  if (c.screen === 'handbook') {
    const n = handbookCards().length;
    c.page = (c.page + dir + n) % n;
    return;
  }
  if (c.screen === 'about' || c.screen === 'credits') {
    c.page = Math.max(0, c.page + dir);
    return;
  }
  if (c.screen === 'dev') {
    c.devTab = (c.devTab + dir + 5) % 5;
    c.focus = 0;
    return;
  }
  if (c.screen === 'story') c.box = Math.max(0, c.box + dir);
}

export function accept(c: Campaign): void {
  c.idle = 0;
  if (c.screen === 'story') return advanceStory(c);
  if (c.screen === 'attract') return leaveAttract(c);
  const row = items(c)[c.focus];
  if (!row) return;
  act(c, row.id);
}

export function act(c: Campaign, id: string): void {
  c.idle = 0;
  if (id === 'back') return cancel(c);
  if (id === 'new') return startShift(c);
  if (id === 'continue') return continueShift(c);
  if (id === 'board') return go(c, 'board');
  if (id === 'scrub') return go(c, 'scrub');
  if (id === 'settings') return go(c, 'settings');
  if (id === 'about') return go(c, 'about');
  if (id === 'handbook') return go(c, 'handbook');
  if (id === 'controls') {
    go(c, 'settings');
    c.page = 1;
    return;
  }
  if (id === 'dev') return go(c, 'dev');
  if (id === 'play' && c.screen === 'board') return openBoard(c);
  if (id === 'postcards') {
    c.tab = c.tab === 0 ? 1 : 0;
    return;
  }
  if (id === 'start' && c.screen === 'brief') {
    c.boot += 1;
    c.keepPhase = false;
    c.screen = 'op';
    c.record = c.caseIndex >= 0 && c.caseIndex === c.progress.cleared;
    return;
  }
  if (id === 'start' && c.screen === 'scrub') {
    c.progress.seats = Math.max(1, c.claimed.filter(Boolean).length);
    c.screen = 'title';
    return;
  }
  if (id === 'next' && c.won) return afterWin(c);
  if (id === 'retry') return retryCase(c);
  if (id === 'phase') {
    c.boot += 1;
    c.keepPhase = true;
    c.screen = 'op';
    return;
  }
  if (id === 'resume') {
    c.screen = 'op';
    return;
  }
  if (id === 'unlock') {
    c.progress.free = true;
    c.progress.attending = true;
    c.progress.cleared = storyCases().length;
    return;
  }
  cycleSetting(c, id);
}

export function cancel(c: Campaign): void {
  c.idle = 0;
  if (c.screen === 'story') {
    finishScene(c);
    return;
  }
  if (c.screen === 'op') {
    c.back = 'op';
    c.screen = 'pause';
    c.focus = 0;
    return;
  }
  if (c.screen === 'pause') {
    c.screen = 'op';
    return;
  }
  if (c.screen === 'attract') return leaveAttract(c);
  if (c.screen === 'credits') {
    c.screen = 'title';
    c.focus = 0;
    return;
  }
  c.screen = c.back === c.screen ? 'title' : c.back;
  if (c.screen === 'pause' || c.screen === 'title') c.focus = 0;
}

export function noteInput(c: Campaign): void {
  c.idle = 0;
  if (c.screen === 'attract') leaveAttract(c);
}

export function tickFront(c: Campaign, dtMs: number, inSession: boolean): void {
  if (inSession) return;
  if (c.screen === 'attract') {
    c.clipMs -= dtMs;
    if (c.clipMs <= 0) {
      c.clip = (c.clip + 1) % ATTRACT.length;
      c.clipMs = ATTRACT[c.clip].ms;
      if (ATTRACT[c.clip].kind === 'story') c.box = 0;
    }
    return;
  }
  if (c.screen === 'story' && c.progress.autoText) {
    c.lineMs += dtMs;
    if (c.lineMs > 2500) {
      c.lineMs = 0;
      advanceStory(c);
    }
  }
  if (!MENUS.includes(c.screen)) return;
  c.idle += dtMs;
  if (c.idle >= 10000) enterAttract(c);
}

export function finishOp(c: Campaign, won: boolean, score: number, slips: number, fail: string): void {
  if (c.screen !== 'op') return;
  const def = caseById(c.caseId);
  c.won = won;
  c.fail = won ? '' : fail || 'Called off.';
  c.lastScore = score;
  if (won) {
    const rank = rankFor(score, def.par, slips, c.progress.difficulty);
    c.lastRank = rank;
    const letter = rank === '★' ? 'S' : (rank as Exclude<Rank, '★'>);
    c.postcard = def.patients[0]?.postcards[letter] ?? '';
    const prev = c.progress.scores[c.caseIndex];
    const better = prev === undefined || score > prev;
    if (c.caseIndex >= 0 && (c.record || better)) {
      c.progress.ranks[c.caseIndex] = rank;
      c.progress.scores[c.caseIndex] = score;
      c.progress.postcards[c.caseIndex] = c.postcard;
    }
  }
  c.screen = 'debrief';
  c.focus = 0;
}

export function desiredRun(c: Campaign): string {
  if (c.screen === 'op') return `op:${c.caseId}`;
  if (c.screen === 'attract') {
    const clip = ATTRACT[c.clip];
    if (clip.kind === 'op') return `op:${clip.id}`;
  }
  return 'title';
}

export function desiredAttract(c: Campaign): boolean {
  return c.screen === 'attract' && ATTRACT[c.clip].kind === 'op';
}

export function currentBox(c: Campaign): { who: string; text: string; drama: string; where: string } | null {
  const id =
    c.screen === 'attract' && ATTRACT[c.clip].kind === 'story'
      ? ATTRACT[c.clip].id
      : c.screen === 'story'
        ? c.storyId
        : '';
  if (!id) return null;
  const scene = sceneById(id);
  if (!scene) return null;
  const box = scene.boxes[Math.min(c.box, scene.boxes.length - 1)];
  return { who: box.who, text: box.text, drama: box.drama ?? '', where: scene.where };
}

export function handbookPage(c: Campaign): { title: string; body: string; index: number; count: number } {
  const cards = handbookCards();
  const index = ((c.page % cards.length) + cards.length) % cards.length;
  return { ...cards[index], index, count: cards.length };
}

function go(c: Campaign, screen: Screen): void {
  c.back = c.screen === screen ? c.back : c.screen;
  c.screen = screen;
  c.focus = 0;
  c.page = 0;
}

function startShift(c: Campaign): void {
  c.progress.cleared = 0;
  c.progress.ranks = [];
  c.progress.scores = [];
  c.progress.postcards = [];
  c.record = true;
  openCase(c, 0, 'before');
}

function continueShift(c: Campaign): void {
  const index = Math.min(c.progress.cleared, storyCases().length - 1);
  const leg = c.progress.ranks[index] ? 'after' : 'before';
  c.record = true;
  openCase(c, index, leg);
}

function openBoard(c: Campaign): void {
  const ids = boardIds(c.progress);
  const id = ids[c.board] ?? ids[0];
  if (id === 'case:gala-shift') {
    c.caseId = id;
    c.caseIndex = -1;
    c.record = false;
    c.screen = 'brief';
    c.focus = 0;
    return;
  }
  const index = storyCases().findIndex((item) => item.id === id);
  const unlocked = c.progress.free || index <= c.progress.cleared;
  if (!unlocked || index < 0) return;
  c.record = index === c.progress.cleared;
  c.caseIndex = index;
  c.caseId = storyCases()[index].id;
  c.screen = 'brief';
  c.focus = 0;
}

function openCase(c: Campaign, index: number, leg: 'before' | 'after'): void {
  const def = storyCases()[index];
  if (!def) {
    c.screen = 'credits';
    return;
  }
  c.caseIndex = index;
  c.caseId = def.id;
  c.leg = leg;
  c.storyId = leg === 'before' ? def.storyBefore : def.storyAfter;
  c.box = 0;
  c.lineMs = 0;
  c.screen = 'story';
}

function advanceStory(c: Campaign): void {
  const scene = sceneById(c.storyId);
  if (!scene) return;
  if (c.box < scene.boxes.length - 1) {
    c.box += 1;
    return;
  }
  finishScene(c);
}

function finishScene(c: Campaign): void {
  if (c.leg === 'before') {
    c.screen = 'brief';
    c.focus = 0;
    return;
  }
  c.progress.cleared = Math.max(c.progress.cleared, c.caseIndex + 1);
  if (c.progress.cleared >= storyCases().length) {
    c.progress.free = true;
    c.progress.attending = true;
    c.screen = 'credits';
    c.page = 0;
    return;
  }
  openCase(c, c.progress.cleared, 'before');
}

function afterWin(c: Campaign): void {
  if (c.caseIndex < 0) {
    c.screen = 'board';
    c.focus = 0;
    return;
  }
  c.leg = 'after';
  const def = storyCases()[c.caseIndex];
  c.storyId = def?.storyAfter ?? 'after-1';
  c.box = 0;
  c.screen = 'story';
}

function retryCase(c: Campaign): void {
  c.boot += 1;
  c.keepPhase = false;
  c.screen = 'op';
  c.won = false;
}

function enterAttract(c: Campaign): void {
  c.screen = 'attract';
  c.clip = 0;
  c.clipMs = ATTRACT[0].ms;
  c.box = 0;
  c.record = false;
}

function leaveAttract(c: Campaign): void {
  c.screen = 'title';
  c.focus = 0;
  c.idle = 0;
  c.record = true;
}

function cycleSetting(c: Campaign, id: string): void {
  const p = c.progress;
  const volume = (n: number) => [0, 10, 40, 70, 100][([0, 10, 40, 70, 100].indexOf(n) + 1) % 5] ?? 70;
  if (id === 'master') p.master = volume(p.master);
  if (id === 'music') p.music = volume(p.music);
  if (id === 'effects') p.effects = volume(p.effects);
  if (id === 'voice') p.voice = volume(p.voice);
  if (id === 'glyphs') p.glyphs = p.glyphs === 'playstation' ? 'xbox' : 'playstation';
  if (id === 'difficulty') {
    const order: Difficulty[] = ['intern', 'resident', 'attending'];
    const next = order[(order.indexOf(p.difficulty) + 1) % 3];
    if (next === 'attending' && !p.attending && !p.free) return;
    p.difficulty = next;
  }
  if (id === 'simple') p.simple = !p.simple;
  if (id === 'autoText') p.autoText = !p.autoText;
  if (id === 'blood') p.blood = p.blood === 'red' ? 'teal' : p.blood === 'teal' ? 'off' : 'red';
  if (id === 'hud') c.hideHud = !c.hideHud;
}

export function claimSeat(c: Campaign, index: number): void {
  if (index < 0 || index > 3) return;
  c.claimed[index] = true;
  c.idle = 0;
}
