/**
 * @file The HTML screens. One idea on each, big type, and a click or a pad both move the same highlight.
 */
import { caseById, storyCases } from '../op/cases';
import { boardIds, currentBox, handbookPage, items, type Campaign } from '../app/campaign';
import { aboutCards } from '../data/interview';
import { TUNE } from '../scenes/tune';

/** Extra lines the shell cannot know on its own. */
export interface ShellExtra {
  prompt: string;
  hash: string;
  cursor: string;
  sliders: { setting: string; label: string; value: number }[];
  touch: boolean;
  card: { names: string[]; ready: number[]; left: string; asked: boolean } | null;
}

/** Escape text that came from the game's own writing. Names still go through text nodes where a hub player is shown. */
function esc(value: string): string {
  return value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] ?? char);
}

/** A menu row. The highlighted one carries the focus marker scripts look for. */
function rows(c: Campaign): string {
  return items(c)
    .map((item, index) => {
      const on = index === c.focus ? ' is-on' : '';
      return `<button type="button" class="row${on}" data-act="${esc(item.id)}" data-game="row">${esc(item.label)}</button>`;
    })
    .join('');
}

/** The case card on the board. */
function boardCard(c: Campaign): string {
  const ids = boardIds(c.progress);
  const id = ids[c.board] ?? ids[0];
  if (!id) return '';
  if (id === 'case:gala-shift') {
    return `<article class="card" data-game="card"><h2>The Gala Shift</h2><p>Two patients, one couch. Scores are not kept.</p></article>`;
  }
  const def = caseById(id);
  const index = storyCases().findIndex((item) => item.id === id);
  const rank = c.progress.ranks[index] ?? '—';
  const locked = !c.progress.free && index > c.progress.cleared;
  return `<article class="card" data-game="card"><p class="eyebrow">${esc(def.patients[0]?.name ?? '')}, ${def.patients[0]?.age ?? ''}</p><h2>${esc(def.title)}</h2><p>${esc(def.patients[0]?.line ?? '')}</p><p>${locked ? 'Sealed' : esc(def.rule)}</p><p data-game="rank">Rank ${esc(rank)}</p></article>`;
}

/** Story or attract dialogue. */
function storyBlock(c: Campaign): string {
  const box = currentBox(c);
  if (!box) return '';
  const drama = box.drama ? `<p class="drama" data-game="drama">${esc(box.drama)}</p>` : '';
  return `<section class="story" data-game="story"><p class="where">${esc(box.where)}</p>${drama}<p class="who" data-game="who">${esc(box.who)}</p><p class="line" data-game="line">${esc(box.text)}</p></section>`;
}

/** Briefing card. */
function brief(c: Campaign): string {
  const def = caseById(c.caseId);
  const patient = def.patients[0];
  return `<article class="card" data-game="brief"><p class="eyebrow">${esc(patient?.name ?? '')}</p><h2>${esc(def.title)}</h2><p>${esc(patient?.line ?? '')}</p><p>${esc(def.rule)}</p><p>Difficulty ${esc(c.progress.difficulty)}</p></article>`;
}

/** Debrief. */
function debrief(c: Campaign): string {
  const head = c.won ? `Rank ${c.lastRank}` : c.fail || 'Called off.';
  const card = c.won && c.postcard ? `<p data-game="postcard">${esc(c.postcard)}</p>` : '';
  return `<article class="card" data-game="debrief"><h2>${esc(head)}</h2><p data-game="score">${c.lastScore}</p>${card}</article>`;
}

/** About and credits, one card at a time. */
function about(c: Campaign): string {
  const cards = aboutCards();
  const index = c.screen === 'credits' ? cards.length - 1 : Math.min(Math.max(0, c.page), cards.length - 1);
  const card = cards[index];
  const body = card.usage ? `<p data-about="usage">${esc(card.body)}</p>` : `<p>${esc(card.body)}</p>`;
  return `<article class="card" data-game="about"><p class="eyebrow">${esc(card.kicker)}</p><h2>${esc(card.title)}</h2>${body}<p>${index + 1} / ${cards.length}</p></article>`;
}

/** Handbook page. */
function handbook(c: Campaign): string {
  const page = handbookPage(c);
  return `<article class="card" data-game="handbook"><h2>${esc(page.title)}</h2><p>${esc(page.body)}</p><p>${page.index + 1} / ${page.count}</p></article>`;
}

/** Scrub seats. */
function scrub(c: Campaign): string {
  const seats = c.claimed
    .map(
      (on, index) =>
        `<p class="seat${on ? ' is-on' : ''}" data-game="seat">${on ? `Seat ${index + 1} claimed` : `Seat ${index + 1}`}</p>`,
    )
    .join('');
  return `<div class="seats" data-game="scrub">${seats}</div>`;
}

/** Balance sliders. The value is the live setting. */
function sliders(extra: ShellExtra): string {
  return extra.sliders
    .map((row) => {
      const tune = TUNE.find((item) => item.setting === row.setting);
      if (!tune) return '';
      return `<label class="slider">${esc(row.label)} ${row.value}<input type="range" data-set="${esc(row.setting)}" min="${tune.min}" max="${tune.max}" step="${tune.step}" value="${row.value}" /></label>`;
    })
    .join('');
}

/** Dev panels that are not plain rows. */
function devExtra(c: Campaign, extra: ShellExtra): string {
  if (c.devTab === 1) return sliders(extra);
  if (c.devTab === 3) return `<p data-game="cursor">${esc(extra.cursor)}</p>`;
  if (c.devTab === 4) return `<p data-game="hash">${esc(extra.hash)}</p>`;
  return '';
}

/** The body of the open screen. */
function cardBlock(extra: ShellExtra): string {
  const card = extra.card;
  if (!card) return '';
  const names = card.names
    .map((name, index) => `<li data-game="player">${card.ready.includes(index) ? 'Ready · ' : ''}${esc(name)}</li>`)
    .join('');
  return `<article class="card" data-game="card"><h2>Trauma Compass</h2><p>Keep the patient alive and finish the op together.</p><ul>${names}</ul><p>${esc(card.left)}</p><p>Stick or mouse aims. R2 or click uses the tool.</p><button type="button" class="row" data-act="hub-ready">Ready</button><button type="button" class="row" data-act="hub-more">${card.asked ? 'Resume the clock' : 'More time'}</button></article>`;
}

function body(c: Campaign, extra: ShellExtra): string {
  if (extra.card) return cardBlock(extra);
  if (c.screen === 'attract' && currentBox(c)) {
    return `${storyBlock(c)}<p class="demo" data-game="demo">DEMO</p>`;
  }
  if (c.screen === 'title' || c.screen === 'attract') {
    const demo = c.screen === 'attract' ? `<p class="demo" data-game="demo">DEMO</p>` : '';
    return `<h1 data-game="title">Trauma Compass</h1><p class="tag">Harbor Light. Keep the line, then close.</p>${demo}`;
  }
  if (c.screen === 'board')
    return c.tab === 1
      ? `<h2>Postcards</h2><p>${esc(c.progress.postcards.filter(Boolean).join(' ') || 'None yet.')}</p>`
      : boardCard(c);
  if (c.screen === 'story') return storyBlock(c);
  if (c.screen === 'brief') return brief(c);
  if (c.screen === 'debrief') return debrief(c);
  if (c.screen === 'handbook') return handbook(c);
  if (c.screen === 'about' || c.screen === 'credits') return about(c);
  if (c.screen === 'scrub') return scrub(c);
  if (c.screen === 'settings') return `<h2>Settings</h2>`;
  if (c.screen === 'pause') return `<h2>Paused</h2>`;
  if (c.screen === 'dev') return `<h2>Dev Mode</h2>${devExtra(c, extra)}`;
  return '';
}

/** A stamp so the shell is not rebuilt while nothing on it changed. */
export function shellStamp(c: Campaign, extra: ShellExtra): string {
  const card = extra.card
    ? `${extra.card.left}|${extra.card.ready.join()}|${extra.card.asked}|${extra.card.names.join()}`
    : '';
  const p = c.progress;
  return [
    c.screen,
    c.focus,
    c.page,
    c.board,
    c.box,
    c.clip,
    c.devTab,
    c.tab,
    c.caseId,
    c.won,
    c.lastRank,
    c.fail,
    c.postcard,
    c.hideHud,
    c.claimed.join(''),
    p.glyphs,
    p.difficulty,
    p.blood,
    p.master,
    p.music,
    p.effects,
    p.voice,
    p.simple,
    p.autoText,
    p.seats,
    extra.touch,
    extra.prompt,
    card,
  ].join('|');
}

/** Draw the screens into `root`. Returns the stamp it drew. */
export function renderShell(root: HTMLElement, c: Campaign, extra: ShellExtra): void {
  const touch = extra.touch
    ? `<div class="touch" data-game="touch"><p>Controller or keyboard required</p><button type="button" class="row" data-act="settings">Settings</button></div>`
    : '';
  const menu = items(c).length ? `<div class="menu" data-game="menu">${rows(c)}</div>` : '';
  const prompt = c.screen === 'op' || c.screen === 'pause' ? '' : `<p class="prompt">${extra.prompt}</p>`;
  const scroll = c.screen === 'dev' ? ' can-scroll' : '';
  const block = c.screen === 'dev' ? `${menu}${body(c, extra)}` : `${body(c, extra)}${menu}`;
  root.innerHTML = `<div class="screen${scroll}" data-game="screen" data-screen="${esc(c.screen)}">${block}${prompt}</div>${touch}<p data-about="usage" class="usage">added on import</p>`;
}
