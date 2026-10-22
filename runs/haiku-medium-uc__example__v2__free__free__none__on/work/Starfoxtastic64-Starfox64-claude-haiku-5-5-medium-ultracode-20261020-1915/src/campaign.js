// Campaign state: a mission runs through the stage chain with a shared lives pool.
// Progress (cleared stages, best medals, best scores) persists in localStorage.
import { nextStage } from './stages.js';

const KEY = 'starfoxtastic64.campaign.v1';
export const MEDAL_RANK = { bronze: 1, silver: 2, gold: 3 };
export const MEDAL_NAME = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold' };

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw && raw.cleared) return raw;
  } catch {
    // Unreadable save: start clean.
  }
  return { cleared: {}, medals: {}, bestScore: {}, missions: 0 };
}

export const save = load();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // Storage disabled: progress lasts for this session only.
  }
}

// A stage unlocks when its predecessor on the route is cleared. Aurelia opens the chain.
export function isUnlocked(id) {
  if (id === 'aurelia') return true;
  if (id === 'kessar' || id === 'solace') return !!save.cleared.aurelia;
  if (id === 'cinder') return !!(save.cleared.kessar || save.cleared.solace);
  if (id === 'vorrack') return !!save.cleared.cinder;
  return false;
}

export function recordResult(result) {
  if (result.status !== 'cleared') return;
  save.cleared[result.stageId] = true;
  const prev = save.medals[result.stageId];
  if (!prev || MEDAL_RANK[result.medal] > MEDAL_RANK[prev]) save.medals[result.stageId] = result.medal;
  if (!save.bestScore[result.stageId] || result.score > save.bestScore[result.stageId]) {
    save.bestScore[result.stageId] = result.score;
  }
  persist();
}

export function recordMissionComplete() {
  save.missions += 1;
  persist();
}

export function resetProgress() {
  save.cleared = {};
  save.medals = {};
  save.bestScore = {};
  save.missions = 0;
  persist();
}

// The active mission. Null stage means no mission is running (stage select or attract).
export const mission = {
  active: false,
  stage: null,
  route: null,
  lives: 3,
  start(lives = 3) {
    this.active = true;
    this.stage = 'aurelia';
    this.route = null;
    this.lives = lives;
  },
  end() {
    this.active = false;
    this.stage = null;
    this.route = null;
  },
  // Advance after a cleared stage. Returns the next stage id, or null when the mission is complete.
  advance(result) {
    if (result.route) this.route = result.route;
    this.stage = nextStage(result.stageId, this.route);
    if (!this.stage) this.end();
    return this.stage;
  },
};
