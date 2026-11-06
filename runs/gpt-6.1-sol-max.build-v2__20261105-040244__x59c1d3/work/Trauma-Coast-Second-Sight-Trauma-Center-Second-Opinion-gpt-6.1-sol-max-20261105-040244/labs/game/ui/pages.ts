/** @file Large, single-purpose front-end screens for story, case selection, briefings and results. */
import { CASES, SESSION } from '../data/cases';
import { CAST, storyFor } from '../data/story';
import { TOOLS } from '../data/tools';
import { rank, scoreTotal } from '../scenes/op/state';
import type { UIContext } from './context';
import { button, esc, lighthouse, toolIcon } from './icons';
export const page = (title: string, kicker: string, body: string, footer: string, extra = ''): string =>
  `<section class="page ${extra}"><header class="page-head"><div><div class="eyebrow">${kicker}</div><h2>${title}</h2></div><div class="brandmark">${lighthouse}<span>HARBOR LIGHT<br>GENERAL</span></div></header><div class="page-body">${body}</div><footer class="page-footer">${footer}</footer></section>`;
export function title(c: UIContext): string {
  const continueButton =
    c.d.progress.checkpoint || c.d.progress.unlocked > 1 ? button('continue', 'Continue shift') : '';
  return `<section class="title-screen"><div class="title-content"><div class="brandmark">${lighthouse}<span>HARBOR LIGHT GENERAL<br>PORT VERITY · NIGHT DIVISION</span></div><h1 class="title-logo">TRAUMA<br><span>COAST</span></h1><div class="subtitle">Second Sight</div><nav class="title-menu" aria-label="Main menu">${continueButton}${button('new', 'New shift')}${button('board', 'The Board')}${button('scrub', 'Scrub in <span class="tag">1–4 surgeons</span>')}${button('settings', 'Settings')}${button('about', 'About & credits')}</nav></div><div class="storm-lines"><span>PV / 03:17</span><span>STORM WARNING 04</span></div><div class="title-copy"><div class="eyebrow"><span class="live-dot"></span>THE NIGHT SHIFT HAS A PULSE</div><p>A miracle graft.<br>A city that trusted it.<br>Your hands on the evidence.</p></div><footer class="title-foot"><span class="small">${c.hands.lastDevice === 'gamepad' ? '<span class="glyph">✕</span> Select · <span class="glyph">○</span> Back' : '<kbd>↑ ↓</kbd> Navigate <kbd>Enter</kbd> Select · or click'}</span><span class="eyebrow">AN ORIGINAL SURGICAL THRILLER</span></footer></section>`;
}
export function board(c: UIContext): string {
  const index = c.d.caseIndex,
    cs = index === 8 ? SESSION : CASES[index],
    unlocked = index < c.d.progress.unlocked || (index === 8 && c.d.progress.ended);
  return page(
    'The Board',
    'CASE FILES / FREE SURGERY',
    `<div class="case-number">${String(index + 1).padStart(2, '0')}</div><article class="case-card"><div class="eyebrow">${index === 8 ? 'TEAM PROCEDURE' : unlocked ? 'AVAILABLE FOR SURGERY' : 'SEALED CASE FILE'}</div><h2>${esc(cs.title)}</h2><h3>${esc(cs.patient)}${cs.age ? `, ${cs.age}` : ''}</h3><p>${esc(cs.detail)}</p><div class="case-meta"><span class="tag">${cs.sites.join(' / ')}</span><span class="gold">${Math.floor(cs.seconds / 60)}:${String(cs.seconds % 60).padStart(2, '0')}</span><span class="muted">Best <b class="gold">${c.d.progress.ranks[cs.id] ?? '—'}</b></span></div><div class="tools-small">${TOOLS.map((_, i) => toolIcon(i)).join('')}</div></article><div class="case-nav">${button('case-prev', '←', 'aria-label="Previous case"')}${button('case-next', '→', 'aria-label="Next case"')}</div>`,
    `${button('back', 'Back')}${button('postcards', 'Postcards')}${button('handbook', 'Handbook')}${button('case-play', unlocked ? 'Scrub in →' : 'Complete the previous case', `${unlocked ? 'class="primary"' : 'disabled'}`)}`,
  );
}
export function story(c: UIContext): string {
  const s = storyFor(c.d.caseIndex, c.d.part),
    b = s.beats[c.d.beat] ?? s.beats[0],
    who = CAST[b.who];
  return `<section class="story-screen"><div class="scene-top"><div class="eyebrow">PORT VERITY / ${s.set.toUpperCase()}</div><div class="small">${esc(CASES[c.d.caseIndex].title)} · ${c.d.part === 'before' ? 'Before the operation' : 'After the operation'}</div></div><article class="story-dialog"><div class="speaker" style="color:${who.color}" data-game="speaker">${who.name}</div><p class="story-text" data-game="dialogue">${esc(b.text)}</p><div class="dialog-footer"><button data-focus data-action="skip" title="Hold Circle or Escape to skip the scene">Hold ${c.hands.lastDevice === 'gamepad' ? '○' : 'Esc'} to skip scene</button><span class="small">${String(c.d.beat + 1).padStart(2, '0')} / ${s.beats.length}</span><button class="dialog-next" data-focus data-action="advance">${c.hands.lastDevice === 'gamepad' ? '<span class="glyph">✕</span>' : '<kbd>Enter</kbd>'} Continue →</button></div></article></section>`;
}
export function briefing(c: UIContext): string {
  const cs = c.d.caseIndex === 8 ? SESSION : CASES[c.d.caseIndex];
  return page(
    'Pre-op briefing',
    `CASE ${String(c.d.caseIndex + 1).padStart(2, '0')} / ${esc(cs.title).toUpperCase()}`,
    `<div class="briefing-content"><div class="eyebrow">YOUR PATIENT</div><h2>${esc(cs.patient)}</h2><p>${esc(cs.detail)}</p><div class="rule"></div><p>${esc(cs.phases[0].hint)}</p><div class="difficulty">${(['Intern', 'Resident', 'Attending'] as const).map((d) => button(`difficulty:${d}`, d, `class="${c.prefs.difficulty === d ? 'selected' : ''}" ${d === 'Attending' && !c.d.progress.ended ? 'disabled' : ''}`)).join('')}${c.d.free ? `<div class="difficulty" aria-label="Free Surgery Gift">${button('free-gift:still', 'Stillpoint', `class="${c.prefs.freeGift === 'still' ? 'selected' : ''}"`)}${button('free-gift:pulse', 'Second Pulse', `class="${c.prefs.freeGift === 'pulse' ? 'selected' : ''}"`)}</div>` : ''}</div></div><aside class="side-note"><span class="eyebrow">FIELD TIME</span><span class="big">${Math.floor(cs.seconds / 60)}:${String(cs.seconds % 60).padStart(2, '0')}</span><span class="small">${cs.sites.join(' · ')}<br>${cs.lead === 'wren' ? 'Dr. Wren Tolliver' : 'Dr. Sabine Oyelaran'}${cs.ai ? ' + colleague' : ''}</span><div class="tools-small">${toolIcon(3)}${toolIcon(1)}${toolIcon(2)}${toolIcon(5)}</div></aside>`,
    `${button('back', 'Back to Board')}<span class="small">${c.hands.lastDevice === 'gamepad' ? 'Stick aims · R2 operates · Right stick selects tools' : 'Mouse aims · Hold click to operate · 1–8 select tools'}</span>${button('operate', 'Begin operation →', 'class="primary"')}`,
  );
}
export function result(c: UIContext): string {
  const s = c.d.last!;
  if (c.d.screen === 'failed')
    return page(
      'Operation failed',
      'THE ROOM GOES QUIET',
      `<div class="briefing-content"><h3>${esc(s.reason)}</h3><p class="muted">Odie switches off the monitor.</p><div class="rule"></div><p>We can begin again, Doctor. This time, ask sooner.</p></div>`,
      `${button('board', 'The Board')}${button('retry-phase', 'Retry this phase', c.prefs.difficulty === 'Attending' ? 'disabled' : '')}${button('retry', 'Retry case', 'class="primary"')}`,
    );
  const r = rank(s);
  return page(
    'Operation complete',
    'THE TEAM EXHALES',
    `<div class="rank" data-game="rank">${r}</div><div class="stat-lines"><div><span>Time remaining</span><b>${Math.floor(s.left / 360000)}:${String(Math.ceil(s.left / 6000) % 60).padStart(2, '0')}</b></div><div><span>Final vitals</span><b>${Math.round(Math.min(...s.patients))}</b></div><div><span>Slips</span><b>${s.slips}</b></div><div><span>Best chain</span><b>×${s.best.toFixed(1)}</b></div><div><span>Score</span><b>${scoreTotal(s).toLocaleString('en')}</b></div>${s.seats.length > 1 ? `<p class="small">${s.seats.map((p) => `Seat ${p.id + 1}: ${p.score}`).join(' · ')}</p>` : ''}</div>`,
    `${button('board', 'The Board')}<span class="small">${s.retry ? 'Checkpoint retry · rank capped at B' : s.dev ? 'Developer run · no record saved' : 'A person gets another morning.'}</span>${button('next-result', 'Patient postcard →', 'class="primary"')}`,
  );
}
export function postcard(c: UIContext): string {
  const id = c.d.last?.caseId ?? CASES[c.d.caseIndex].id,
    cs = id === 'gala-shift' ? SESSION : (CASES.find((c) => c.id === id) ?? CASES[0]),
    text = c.d.progress.postcards[id] ?? cs.postcard[2];
  return page(
    'From Port Verity',
    'A LIFE AFTER THE CASE',
    `<article class="postcard"><div class="eyebrow" style="color:#54776a">HARBOR LIGHT / POST RECEIVED</div><h3>Dear Doctor,</h3><p>${esc(text)}</p><div class="signature">With gratitude,<br>${esc(cs.patient)}</div></article>`,
    `${button('board', 'The Board')}${button('next-result', 'Continue the shift →', 'class="primary"')}`,
  );
}
export function pause(c: UIContext): string {
  return page(
    'A moment, Doctor.',
    'PAUSED',
    `<nav class="menu-list">${button('resume', 'Resume operation')}${button('retry-phase', 'Retry this phase', c.prefs.difficulty === 'Attending' ? 'disabled' : '')}${button('retry', 'Retry case')}${button('handbook', 'Handbook')}${button('settings', 'Settings & controls')}${button('dev', 'Dev Mode')}${button('board', 'Quit to Board')}</nav><aside class="side-note"><span class="eyebrow">CHARGE NURSE’S ORDERS</span><p>“The patient can wait one minute.<br>You cannot wait forever.”</p></aside>`,
    `${button('resume', '← Resume')}<span class="small">Your instruments will be exactly where you left them.</span>`,
  );
}
export function scrub(c: UIContext): string {
  const colors = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
  return page(
    'Scrub in',
    'ONE PATIENT / UP TO FOUR SURGEONS',
    `<div class="seat-grid">${colors.map((color, i) => `<article class="seat-slot" style="border-top:3px solid ${color}"><span class="number" style="color:${color}">${i + 1}</span><h3>${i < c.hands.devices.length ? 'Scrubbed in' : 'Open seat'}</h3><span class="small">${i < c.hands.devices.length ? (c.hands.devices[i] === 'keyboard' ? 'Keyboard + mouse' : `Controller ${Number(c.hands.devices[i]) + 1}`) : 'Press ✕ on a controller'}</span></article>`).join('')}</div>`,
    `${button('back', 'Back')}<span class="small">One keyboard + mouse, or a controller in each seat.<br>Online procedures run through AI Hub.</span>${button('scrub-start', 'To the Board →', 'class="primary"')}`,
  );
}
export function credits(): string {
  return page(
    'Case file remains open.',
    'THE MORNING AFTER',
    `<div class="credits-body">Tomás walks the seawall.<br>Gwen plays the loud notes.<br>Route 9 is running again.<br><br>Out beyond the lighthouse,<br>a crate is already at sea.</div><aside class="side-note"><span class="eyebrow">FREE SURGERY UNLOCKED</span><p>All eight cases.<br>Attending difficulty.<br>One more shift.</p></aside>`,
    `${button('about', 'Credits')}${button('board', 'Free Surgery →', 'class="primary"')}`,
  );
}
