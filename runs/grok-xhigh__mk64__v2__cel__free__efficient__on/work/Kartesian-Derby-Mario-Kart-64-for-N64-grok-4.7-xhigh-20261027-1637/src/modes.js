import { ATTRACT_IDLE_SEC } from "./input.js";
import { CUP_IDS } from "./courses.js";

export { ATTRACT_IDLE_SEC };

export const PLACE_POINTS = [10, 8, 6, 5, 4, 3, 2, 1];
export const CONTINUE_PLACE = 4;

const MENU_SCREENS = new Set(["title", "help", "settings", "about", "players", "course", "characters"]);

export function createCup() {
  return {
    courseIds: CUP_IDS.slice(),
    index: 0,
    points: 0,
    races: [],
  };
}

export function recordCupResult(cup, place) {
  const safePlace = Math.max(1, place | 0);
  const gain = PLACE_POINTS[safePlace - 1] || 0;
  if (safePlace > CONTINUE_PLACE) {
    return { action: "retry", place: safePlace, gain: 0, total: cup.points };
  }
  cup.points += gain;
  cup.races.push({ courseId: cup.courseIds[cup.index], place: safePlace, gain });
  cup.index += 1;
  if (cup.index >= cup.courseIds.length) {
    return { action: "finished", place: safePlace, gain, total: cup.points };
  }
  return { action: "continue", place: safePlace, gain, total: cup.points };
}

export function createSession() {
  return {
    screen: "title",
    idle: 0,
    attract: false,
    settings: { invertX: false, invertY: false },
    trialBest: {},
    focus: 0,
  };
}

export function isMenuScreen(screen) {
  return MENU_SCREENS.has(screen);
}

export function stepSession(session, dt, inputAny) {
  if (session.attract) {
    if (inputAny) {
      session.attract = false;
      session.idle = 0;
      session.screen = "title";
      session.focus = 0;
    }
    return session;
  }
  if (!isMenuScreen(session.screen)) {
    session.idle = 0;
    return session;
  }
  if (inputAny) {
    session.idle = 0;
    return session;
  }
  session.idle += dt;
  if (session.idle >= ATTRACT_IDLE_SEC) {
    session.attract = true;
    session.screen = "attract";
  }
  return session;
}

export function noteTrial(bests, courseId, time) {
  const prev = bests[courseId];
  const improved = prev == null || time < prev;
  if (improved) bests[courseId] = time;
  return { best: bests[courseId], improved };
}

export function playerPlace(race, playerIndex = 0) {
  const kart = race.karts.find((entry) => entry.isPlayer && entry.playerIndex === playerIndex);
  return kart ? kart.rank : race.karts.length;
}
