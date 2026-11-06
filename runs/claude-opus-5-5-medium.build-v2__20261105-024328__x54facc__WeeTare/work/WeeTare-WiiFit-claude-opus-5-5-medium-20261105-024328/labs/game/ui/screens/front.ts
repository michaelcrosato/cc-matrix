/**
 * @file The front end: the title (with its touch-only form), the pier where you pick a look, the attract banner, and About.
 */
import { lineText } from '../lines';
import { promptBar, prompt } from '../glyphs';
import { closer, panel, type Ctx, type Screen } from '../ctx';
import { createRows, type Row } from '../menu';
import { TAGLINE, TITLE } from '../titles';
import { TRACKSUITS } from '../../bodies';
import {
  CREDITS,
  ENGINE_FEEDBACK,
  ENGINE_QUESTIONS,
  PROMPT_FEEDBACK,
  PROMPT_QUESTIONS,
  SOURCE_INFORMATION,
  SOURCE_LABELS,
  TESTING_FEEDBACK,
  TESTING_QUESTIONS,
} from '../about-data';
import { settingsScreen } from './settings';
import { boardScreen } from './programme';
import { joinScreen } from './group';

export interface TitleOptions {
  touch: () => boolean;
  onBegin: (fresh: boolean) => void;
  hasSave: () => boolean;
}

/** The title screen. */
export function titleScreen(ctx: Ctx, options: TitleOptions): Screen {
  const layer = document.createElement('div');
  layer.className = 'wt-layer';
  layer.dataset.ui = 'title';
  layer.innerHTML = `<div class="wt-title">${TITLE}</div><div class="wt-tag">${TAGLINE}</div>`;
  const box = document.createElement('div');
  box.className = 'wt-panel';
  layer.append(box);
  const wake = document.createElement('div');
  wake.className = 'wt-prompts';
  wake.style.marginTop = '2vh';
  wake.innerHTML = prompt('any', 'Press any button');
  layer.append(wake);
  addEventListener('keydown', () => wake.remove(), { once: true });
  ctx.root.append(layer);
  const touchNote = document.createElement('div');
  touchNote.className = 'wt-note-touch';
  touchNote.textContent = 'Controller or keyboard required';
  const rows = (): Row[] => {
    if (options.touch()) return [{ id: 'settings', label: 'Settings' }];
    const save = options.hasSave();
    return [
      { id: 'begin', label: save ? 'Continue' : 'Begin' },
      ...(save ? [{ id: 'new', label: 'Begin Again' }] : []),
      { id: 'free', label: 'Free Play', off: !save },
      { id: 'group', label: 'Group Class' },
      { id: 'settings', label: 'Settings' },
      { id: 'about', label: 'About / Credits' },
    ];
  };
  const menu = createRows(
    box,
    rows(),
    ctx.nav,
    (id) => {
      if (id === 'begin') options.onBegin(false);
      else if (id === 'new')
        ctx.push(confirmScreen(ctx, 'Begin again? Your cairn will be taken apart.', () => options.onBegin(true)));
      else if (id === 'free') ctx.push(boardScreen(ctx, true));
      else if (id === 'group') ctx.push(joinScreen(ctx));
      else if (id === 'settings') ctx.push(settingsScreen(ctx));
      else if (id === 'about') ctx.push(aboutScreen(ctx));
    },
    () => {},
    () => ctx.sound.audio.play('sfx:select'),
  );
  let touchShown: boolean | null = null;
  return {
    el: layer,
    update(dt) {
      if ((navigator.getGamepads?.() ?? []).some((pad) => pad)) wake.remove();
      const touch = options.touch();
      if (touch !== touchShown) {
        touchShown = touch;
        touchNote.remove();
        if (touch) box.prepend(touchNote);
        menu.setRows(rows());
      }
      menu.update(dt);
    },
    close: closer(layer),
  };
}

/** Are you sure, in-game. */
export function confirmScreen(ctx: Ctx, text: string, yes: () => void): Screen {
  const { layer, box } = panel(ctx);
  const body = document.createElement('div');
  body.className = 'wt-body';
  body.style.marginBottom = '2vh';
  body.textContent = text;
  box.append(body);
  const menu = createRows(
    box,
    [
      { id: 'no', label: 'No' },
      { id: 'yes', label: 'Yes' },
    ],
    ctx.nav,
    (id) => {
      ctx.pop();
      if (id === 'yes') yes();
    },
    () => ctx.pop(),
  );
  return { el: layer, update: (dt) => menu.update(dt), close: closer(layer) };
}

/** The pier: one of three looks, a tracksuit colour. */
export function pierScreen(ctx: Ctx, done: () => void): Screen {
  const { layer, box } = panel(ctx, 'Welcome to Little Fulcrum');
  layer.dataset.ui = 'pier';
  const s = ctx.settings;
  const looks = ['One', 'Two', 'Three'];
  const colours = ['Coral', 'Blue'];
  const rows: Row[] = [
    { id: 'look', label: 'Look', value: () => looks[s.look], change: (dir) => void (s.look = (s.look + dir + 3) % 3) },
    {
      id: 'colour',
      label: 'Tracksuit',
      value: () => colours[s.colour % 2],
      change: (dir) => void (s.colour = (s.colour + dir + 2) % 2),
    },
    { id: 'go', label: 'Step ashore' },
  ];
  const menu = createRows(
    box,
    rows,
    ctx.nav,
    () => {
      ctx.saveSettings();
      ctx.pop();
      done();
    },
    () => {},
  );
  return { el: layer, update: (dt) => menu.update(dt), close: closer(layer) };
}
void TRACKSUITS;

/** The attract banner. */
export function attractBanner(ctx: Ctx): HTMLElement {
  const el = document.createElement('div');
  el.className = 'wt-banner';
  el.dataset.ui = 'attract';
  el.innerHTML = `<div class="wt-title" style="font-size:8vh">${TITLE}</div><div class="wt-demo">DEMO</div><div style="margin-top:1.5vh;display:flex;justify-content:center">${prompt('any', 'Press any button')}</div>`;
  ctx.root.append(el);
  return el;
}

/** About and credits: paged, from the one data file. */
export function aboutScreen(ctx: Ctx): Screen {
  const { layer, box } = panel(ctx, 'About / Credits');
  layer.dataset.ui = 'about';
  const body = document.createElement('div');
  body.className = 'wt-about';
  box.append(body);
  const qa = (questions: readonly string[], answers: readonly string[]) =>
    questions.map((q, i) => [q, answers[i]] as const);
  const source = Object.entries(SOURCE_INFORMATION).map(([k, v]) => [SOURCE_LABELS[k], v] as const);
  const pages: { title: string; rows: readonly (readonly [string, string])[] }[] = [
    { title: 'Source Information', rows: source.slice(0, 7) },
    { title: 'Source Information', rows: source.slice(7) },
    { title: 'Testing Feedback', rows: qa(TESTING_QUESTIONS, TESTING_FEEDBACK) },
    { title: 'Engine Feedback', rows: qa(ENGINE_QUESTIONS.slice(0, 3), ENGINE_FEEDBACK.slice(0, 3)) },
    { title: 'Engine Feedback', rows: qa(ENGINE_QUESTIONS.slice(3), ENGINE_FEEDBACK.slice(3)) },
    { title: 'Prompt Feedback', rows: qa(PROMPT_QUESTIONS, PROMPT_FEEDBACK) },
    { title: 'Credits', rows: CREDITS.map((c) => ['', c] as const) },
  ];
  let at = 0;
  const heading = box.querySelector('.wt-h') as HTMLElement;
  const draw = () => {
    heading.textContent = `${pages[at].title} (${at + 1} of ${pages.length})`;
    body.innerHTML = '';
    for (const [k, v] of pages[at].rows) {
      const p = document.createElement('p');
      if (k) {
        const b = document.createElement('b');
        b.textContent = `${k}: `;
        p.append(b);
      }
      p.append(document.createTextNode(v));
      body.append(p);
    }
  };
  draw();
  const nav = document.createElement('div');
  nav.innerHTML = promptBar([
    ['page', 'Page'],
    ['back', 'Back'],
  ]).replace('wt-bar', 'wt-prompts');
  nav.style.marginTop = '1.5vh';
  box.append(nav);
  const turn = (dir: number) => {
    at = (at + dir + pages.length) % pages.length;
    draw();
  };
  box.addEventListener('click', () => turn(1));
  return {
    el: layer,
    update() {
      if (ctx.nav.pressed('uiRight') || ctx.nav.pressed('uiDown') || ctx.nav.pressed('uiAccept')) turn(1);
      if (ctx.nav.pressed('uiLeft') || ctx.nav.pressed('uiUp')) turn(-1);
      if (ctx.nav.pressed('uiCancel')) ctx.pop();
    },
    close: closer(layer),
  };
}
void lineText;
