/** @file Notebook pages: debts, field notes, credits and controller bindings. The bundled interview is About's source of truth. */
import { button, shell, escape, type Context, type About } from './context';
import { FIELD_NOTES, TAPES } from '../scenes/content';
import { CONTROL_PAGES } from './controls';
let ledgerPage = 0,
  aboutPage = 0,
  controlPage = 0,
  notePage = 0;
function turns(root: HTMLElement, index: number, names: string[], fn: (n: number) => void): void {
  const nav = document.createElement('div');
  nav.className = 'pager';
  const left = button(nav, '‹', () => fn((index - 1 + names.length) % names.length));
  left.dataset.prev = '';
  const p = document.createElement('span');
  p.textContent = `${names[index]} · ${index + 1} / ${names.length}`;
  nav.append(p);
  const right = button(nav, '›', () => fn((index + 1) % names.length));
  right.dataset.next = '';
  root.append(nav);
}
export function ledger(ctx: Context): void {
  const root = shell(ctx, 'The ledger', 'ACCOUNTS STILL OPEN'),
    names = ['Debts', 'Factions', 'Cassettes', 'Stones', 'Field notes'];
  turns(root, ledgerPage, names, (n) => {
    ledgerPage = n;
    ledger(ctx);
  });
  const c = ctx.c,
    p = ctx.p;
  if (ledgerPage === 0) {
    const b = c?.buddies[notePage % (c.buddies.length || 1)];
    if (b) {
      const page = document.createElement('article');
      page.innerHTML = `<p class="eyebrow">${b.alive ? 'ACCOUNT ACTIVE' : 'ACCOUNT CLOSED'}</p><h2>${escape(b.key.toUpperCase())}</h2><p>${!b.alive ? 'Dead. No balance carried forward.' : b.debt > 0 ? `You owe ${b.debt}. ${b.debt >= 3 ? 'Overdrawn. No more rescues.' : ''}` : b.debt < 0 ? `They owe you ${-b.debt}.` : 'Neither debtor nor creditor. For now.'}</p>`;
      root.append(page);
      button(root, 'Next account', () => {
        notePage++;
        ledger(ctx);
      });
    }
  } else if (ledgerPage === 1)
    root.insertAdjacentHTML(
      'beforeend',
      `<article><h2>Two employers.<br>One country.</h2><p>Basin Front &nbsp; ${c?.front ?? 0}</p><p>Provisional Authority &nbsp; ${c?.authority ?? 0}</p><p class="muted">A positive standing buys six seconds at a checkpoint. Holster and walk.</p></article>`,
    );
  else if (ledgerPage === 2) {
    const found = c?.tapes ?? [],
      tape = TAPES.filter((t) => found.includes(t[0]))[notePage % Math.max(1, found.length)];
    root.insertAdjacentHTML(
      'beforeend',
      `<article><p class="eyebrow">${found.length} / 6 LOTS RECORDED</p><p>${escape(tape?.[3] ?? 'A cassette player. Nothing worth keeping on it yet.')}</p></article>`,
    );
    button(root, 'Next recording', () => {
      notePage++;
      ledger(ctx);
    });
  } else if (ledgerPage === 3)
    root.insertAdjacentHTML(
      'beforeend',
      `<article><div class="large-number">${p?.seat?.data.stones ?? 0}</div><h2>Rough stones</h2><p>${c?.caches.length ?? 0} of eight prospectors’ tins found.</p><p class="muted">Ferreira sells certainty by the magazine. Find her at the airstrip.</p></article>`,
    );
  else {
    const [name, text] = FIELD_NOTES[notePage % FIELD_NOTES.length];
    root.insertAdjacentHTML(
      'beforeend',
      `<article><p class="eyebrow">FIELD NOTE ${(notePage % FIELD_NOTES.length) + 1} / ${FIELD_NOTES.length}</p><h2>${escape(name)}</h2><p>${escape(text)}</p></article>`,
    );
    button(root, 'Next field note', () => {
      notePage++;
      ledger(ctx);
    });
  }
}
export function about(ctx: Context): void {
  const data = (window as unknown as { __about?: About }).__about;
  const root = shell(ctx, 'About / Credits', 'ORIGINAL WORK · FIELD RECORD'),
    names = ['Source Information', 'Testing Feedback', 'Engine Feedback', 'Prompt Feedback', 'Credits'];
  turns(root, aboutPage, names, (n) => {
    aboutPage = n;
    about(ctx);
  });
  const pages = [
    Object.entries(data?.sourceInformation ?? { build: 'Development workspace', usage: 'added on import' })
      .map(([k, v]) => `<p><strong>${escape(k)}</strong><br>${escape(v)}</p>`)
      .join(''),
    (data?.testingFeedback ?? ['unknown']).map((v) => `<p>${escape(v)}</p>`).join(''),
    (data?.engineFeedback ?? ['unknown']).map((v) => `<p>${escape(v)}</p>`).join(''),
    (data?.promptFeedback ?? ['unknown']).map((v) => `<p>${escape(v)}</p>`).join(''),
    '<p>Inspired by Far Cry 2. An original game; not affiliated with Ubisoft.</p><p>my-3dge · Michael Crosato<br>three.js r182 · Rapier 0.21<br>@stdlib portable mathematics</p><p>All world art, character bodies, action animations, writing, music, effects and gibberish voices are generated from code.</p><p>No external audio or image assets. Engine and dependency licenses are included in the source workspace.</p>',
  ];
  pages.forEach((html, i) => {
    const page = document.createElement('article');
    page.className = 'about-copy';
    page.hidden = i !== aboutPage;
    page.innerHTML = html;
    root.append(page);
  });
}
export function controls(ctx: Context): void {
  const root = shell(ctx, 'Controls', 'SAME GAME · EITHER DEVICE');
  turns(root, controlPage, ['Movement', 'Field kit', 'Vehicles'], (n) => {
    controlPage = n;
    controls(ctx);
  });
  for (const [name, keys] of CONTROL_PAGES[controlPage]) {
    const p = document.createElement('p');
    p.className = 'control-line';
    p.innerHTML = `<strong>${escape(name)}</strong><span>${escape(keys)}</span>`;
    root.append(p);
  }
  button(root, 'Rebind an action', () => {
    const keys = ['interact', 'reload', 'heal', 'pill', 'map', 'locator', 'melee', 'throw'],
      p = document.createElement('select');
    for (const k of keys) {
      const o = document.createElement('option');
      o.textContent = k;
      p.append(o);
    }
    root.append(p);
    const b = button(root, 'Choose new key or button', () => {
      b.textContent = 'Press a key or controller button…';
      void ctx.engine?.input?.listen(ctx.device === 'gamepad' ? 'gamepad' : 'keyboard').then((code) => {
        if (code) {
          const result = ctx.engine?.input?.bindings.rebind(p.value, code);
          b.textContent = result?.ok ? `Bound ${p.value} to ${code}` : (result?.message ?? 'Binding unchanged');
        }
      });
    });
  });
}
