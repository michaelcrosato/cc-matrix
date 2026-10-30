import { MATCH } from './constants.js';

export function createMatch(duration = MATCH.defaultDuration) {
  return {
    phase: 'kickoff',
    countdown: MATCH.countdown,
    clock: duration,
    overtime: false,
    score: { blue: 0, orange: 0 },
    goalPause: 0,
    winner: null,
    lastScorer: null,
    banner: 'KICKOFF',
    sincePhase: 0,
    callTimer: 0,
  };
}

export function beginKickoff(match) {
  match.phase = 'kickoff';
  match.countdown = MATCH.countdown;
  match.sincePhase = 0;
  match.callTimer = 0;
  match.banner = match.overtime ? 'OVERTIME' : 'KICKOFF';
  return match;
}

/** A goal for `team` ('blue' | 'orange'). Overtime ends on the next goal. */
export function onGoal(match, team) {
  if (team !== 'blue' && team !== 'orange') return match;
  if (match.phase !== 'playing' && match.phase !== 'overtime') return match;
  if (match.phase === 'overtime' && match.countdown > 0) return match;
  match.score[team] += 1;
  match.lastScorer = team;
  match.banner = 'GOAL';
  if (match.phase === 'overtime') {
    match.phase = 'ended';
    match.winner = team;
    match.sincePhase = 0;
    return match;
  }
  match.phase = 'goal';
  match.goalPause = MATCH.goalPause;
  match.sincePhase = 0;
  return match;
}

export function stepMatch(match, dt) {
  if (match.phase === 'ended') return match;

  if (match.phase === 'kickoff') {
    match.countdown -= dt;
    match.sincePhase += dt;
    const n = Math.ceil(match.countdown - 1e-8);
    if (match.overtime && match.countdown > 2.15) match.banner = 'OVERTIME';
    else match.banner = n > 0 ? String(Math.min(3, n)) : 'KICKOFF';
    if (match.countdown <= 0) {
      match.countdown = 0;
      match.phase = match.overtime ? 'overtime' : 'playing';
      match.sincePhase = 0;
      match.callTimer = 1.25;
      match.banner = match.overtime ? 'OVERTIME' : 'KICKOFF';
    }
    return match;
  }

  if (match.phase === 'goal') {
    match.goalPause -= dt;
    match.banner = 'GOAL';
    if (match.goalPause <= 0) beginKickoff(match);
    return match;
  }

  if (match.phase === 'playing') {
    match.clock -= dt;
    match.sincePhase += dt;
    if (match.callTimer > 0) {
      match.callTimer -= dt;
      if (match.callTimer <= 0) match.banner = '';
    }
    if (match.clock <= 0) {
      match.clock = 0;
      if (match.score.blue !== match.score.orange) {
        match.phase = 'ended';
        match.winner = match.score.blue > match.score.orange ? 'blue' : 'orange';
        match.banner = 'TIME';
        match.sincePhase = 0;
      } else {
        match.overtime = true;
        match.phase = 'overtime';
        match.countdown = MATCH.countdown;
        match.sincePhase = 0;
        match.callTimer = 0;
        match.banner = 'OVERTIME';
      }
    }
    return match;
  }

  if (match.phase === 'overtime') {
    match.sincePhase += dt;
    if (match.countdown > 0) {
      match.countdown -= dt;
      const n = Math.ceil(match.countdown - 1e-8);
      match.banner = n > 0 ? String(Math.min(3, n)) : 'KICKOFF';
      if (match.sincePhase < 1.1) match.banner = 'OVERTIME';
      if (match.countdown <= 0) {
        match.countdown = 0;
        match.banner = 'KICKOFF';
        match.callTimer = 1.25;
      }
    } else if (match.callTimer > 0) {
      match.callTimer -= dt;
      if (match.callTimer <= 0) match.banner = '';
    }
  }
  return match;
}

export function formatClock(match) {
  if (match.overtime) return 'OT';
  const total = Math.max(0, Math.ceil(match.clock - 1e-6));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function isFrozen(match) {
  if (match.phase === 'kickoff' || match.phase === 'goal' || match.phase === 'ended') return true;
  if (match.phase === 'overtime' && match.countdown > 0) return true;
  return false;
}
