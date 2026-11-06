/** @file Sparse TV-readable front-end screens, from the auction-styled title to the last account. */
import { TITLE } from '../title';
import { MERCS } from '../art/bodies';
import { GUNS } from '../weapons/guns';
import { CONTRACTS, STOCK, ALTS } from '../scenes/content';
import { shell, button, escape, type Context } from './context';
import { settings, dev } from './settings';
import { ledger, about, controls } from './pages';
import { lobby } from './lobby';
let merc = 0,
  item = 0;
function title(ctx: Context): void {
  ctx.root.setAttribute('aria-label', TITLE);
  ctx.root.innerHTML = `<div class="title-screen"><div class="title-top"><span>BASIN AUCTION HOUSE</span><span>EST. 1968 &nbsp; / &nbsp; LOT No. 001</span></div><div class="title-copy"><p class="eyebrow">A WARRANT. A RIFLE. A DEBT.</p><h1>BAR<br><span>CRY</span></h1><p class="title-tag">Everything here has a price.<br>Even getting out.</p><nav class="title-menu"></nav></div><div class="auction-slip"><span class="lot-number">01</span><p class="eyebrow">CONDITION OF SALE</p><h2>ONE<br>MERCENARY.</h2><p>Imported.<br>Sound in limb.<br>Uncertain in conscience.</p><div class="stamp">RESERVE<br>NOT MET</div><small>THE FEVER IS INCLUDED.</small></div><div class="title-bottom"><span>THE DRY SEASON &nbsp; / &nbsp; AN OPEN-WORLD MERCENARY STORY</span><span data-glyph="select">Enter</span></div></div>`;
  const nav = ctx.root.querySelector('nav') as HTMLElement;
  if (ctx.store.get('save', null)) button(nav, 'Continue', () => ctx.start('story', ctx.store.get('merc', 0), true));
  button(nav, 'New game', () => ctx.open('merc'), 'new-game');
  button(nav, 'Co-op', () => ctx.open('lobby'));
  button(nav, 'Settings', () => ctx.open('settings'));
  button(nav, 'Controls', () => ctx.open('controls'));
  button(nav, 'About / Credits', () => ctx.open('about'));
}
function mercPick(ctx: Context): void {
  const m = MERCS[merc],
    root = shell(ctx, 'Choose your mercenary', 'FOUR ARRIVALS · THREE UNPAID ACCOUNTS');
  root.insertAdjacentHTML(
    'beforeend',
    `<article class="merc-card"><div class="merc-monogram" style="--coat:${m.jacket}"><svg viewBox="0 0 140 170" aria-hidden="true"><path d="M35 165L29 83Q30 65 48 60L48 35Q42 12 70 11Q98 12 92 35L92 60Q110 65 111 83L105 165Z" fill="${m.jacket}"/><path d="M50 35Q48 14 70 15Q93 15 90 35L86 59Q70 71 54 59Z" fill="${m.skin}"/><path d="M48 34Q46 12 70 9Q96 12 92 35L83 24L58 26Z" fill="${m.hair}"/><path d="M48 82L69 102L92 82M40 132H100" stroke="#d4c99d" stroke-width="3" fill="none"/><path d="M32 95L14 153M108 95L124 153" stroke="${m.jacket}" stroke-width="20"/></svg></div><div><p class="eyebrow">${merc + 1} / 4 &nbsp; ${escape(m.origin)}</p><h2>${m.name}</h2><p>“${escape(m.line)}”</p><p class="muted">The other three become your buddies.<br>Every rescue is written down.</p></div></article>`,
  );
  const nav = document.createElement('div');
  nav.className = 'pager';
  const a = button(nav, '‹ Previous', () => {
    merc = (merc + 3) % 4;
    mercPick(ctx);
  });
  a.dataset.prev = '';
  const b = button(nav, 'Next ›', () => {
    merc = (merc + 1) % 4;
    mercPick(ctx);
  });
  b.dataset.next = '';
  root.append(nav);
  button(
    root,
    'Take the warrant',
    () => {
      ctx.store.set('merc', merc);
      ctx.start('story', merc);
    },
    'begin-story',
  );
}
function pause(ctx: Context): void {
  const root = shell(ctx, 'An interval', ctx.inHub ? 'THE CREW KEEPS MOVING' : 'THE WORLD CAN WAIT A MOMENT');
  for (const [label, screen] of [
    ['Resume', 'play'],
    ['Map', 'map'],
    ['Ledger', 'ledger'],
    ['Settings', 'settings'],
    ['Controls', 'controls'],
    ['Dev Mode', 'dev'],
    ['About / Credits', 'about'],
  ])
    if (screen !== 'dev' || !ctx.inHub) button(root, label, () => ctx.open(screen));
  button(root, 'Quit to title', () => ctx.quit());
}
function shop(ctx: Context): void {
  const stock = STOCK[item],
    root = shell(ctx, 'Ferreira & Daughter', 'GENERAL MERCHANTS · ALL SALES FINAL');
  const key = GUNS.find((g) => g.key === stock.key);
  root.insertAdjacentHTML(
    'beforeend',
    `<article class="dealer-card"><p class="eyebrow">CATALOGUE ${String(item + 1).padStart(2, '0')} / ${STOCK.length}</p><h2>${escape(stock.name)}</h2><p>${key ? `${key.mag} rounds · ${key.slot === 0 ? 'Sidearm' : key.slot === 1 ? 'Primary' : 'Special'} slot · Issued new` : 'Reliability is the only honest investment.'}</p><p class="price">${Math.ceil(stock.price * Number(ctx.frame?.setting('game.economy.prices') ?? 1))} <small>rough stones</small></p><p class="muted">You have ${ctx.p?.seat?.data.stones ?? 0}.</p></article>`,
  );
  const nav = document.createElement('div');
  nav.className = 'pager';
  const left = button(nav, '‹', () => {
    item = (item + STOCK.length - 1) % STOCK.length;
    shop(ctx);
  });
  left.dataset.prev = '';
  const right = button(nav, '›', () => {
    item = (item + 1) % STOCK.length;
    shop(ctx);
  });
  right.dataset.next = '';
  root.append(nav);
  button(root, 'Purchase', () => {
    ctx.send({ kind: 'buy', index: item });
    setTimeout(() => shop(ctx), 100);
  });
  button(root, 'Leave the counter', () => ctx.open('play'));
}
function dialogue(ctx: Context): void {
  const c = ctx.c,
    root = shell(ctx, c?.speaker ?? 'A familiar voice', 'WORDS ARE CHEAPER THAN AMMUNITION');
  root.insertAdjacentHTML('beforeend', `<article><p>${escape(c?.message ?? '')}</p></article>`);
  const b = c?.buddies.find((b) => b.key === c.speaker && b.alive);
  if (b?.fallen) {
    button(root, 'Use a syrette', () => {
      ctx.send({ kind: 'saveBuddy', key: b.key });
      ctx.open('play');
    });
    button(root, 'Mercy', () => {
      ctx.send({ kind: 'mercy', key: b.key });
      ctx.open('play');
    });
    button(root, 'Leave', () => ctx.open('play'));
  } else if (c?.speaker === 'Auctioneer' && c.contract === 6 && c.step >= 3) {
    for (const [label, key] of [
      ['Serve the warrant', 'serve'],
      ['Buy him out · 60 stones', 'buy'],
      ['Burn the catalogue', 'burn'],
    ])
      button(root, label, () => {
        ctx.send({ kind: 'ending', key });
        ctx.open('play');
      });
  } else {
    const alt = CONTRACTS[c?.contract ?? 0]?.alt;
    if (b && alt && ALTS[c?.contract ?? 0]?.buddy === b.key) {
      button(root, 'Hear the alternate plan', () => {
        ctx.send({ kind: 'alt', key: b.key });
        ctx.open('play');
      });
    }
    button(root, 'Back to work', () => ctx.open('play'));
  }
}
export function renderScreen(ctx: Context): void {
  ctx.root.dataset.screen = ctx.screen;
  ctx.root.hidden = ['play', 'attract'].includes(ctx.screen);
  if (ctx.root.hidden) return;
  const screens: Record<string, () => void> = {
    title: () => title(ctx),
    merc: () => mercPick(ctx),
    pause: () => pause(ctx),
    settings: () => settings(ctx),
    dev: () => dev(ctx),
    ledger: () => ledger(ctx),
    about: () => about(ctx),
    controls: () => controls(ctx),
    lobby: () => lobby(ctx),
    shop: () => shop(ctx),
    dialogue: () => dialogue(ctx),
    sleep: () => {
      const root = shell(ctx, 'A little time', 'SAFEHOUSE');
      for (const [label, hour] of [
        ['Dawn', 6],
        ['Noon', 12],
        ['Dusk', 17],
      ] as const)
        button(root, label, () => {
          ctx.send({ kind: 'sleep', hour });
          ctx.open('play');
        });
    },
    gameover: () => {
      const root = shell(ctx, 'Reserve not met', 'NO ONE CAME');
      button(root, 'Load last account', () => ctx.start('story', ctx.store.get('merc', 0), true));
      if (!ctx.hubSession) button(root, 'Return to title', () => ctx.quit());
    },
    ending: () => {
      const root = shell(ctx, ctx.c?.ending ?? 'Account closed', 'LOT ONE');
      root.insertAdjacentHTML(
        'beforeend',
        `<article><p>${escape(ctx.c?.message ?? 'The wind keeps moving.')}</p></article>`,
      );
      if (ctx.c?.mode === 'story') button(root, 'Continue in the basin', () => ctx.open('play'));
      button(root, 'Credits', () => ctx.open('about'));
      if (!ctx.hubSession) button(root, 'Return to title', () => ctx.quit());
    },
  };
  (screens[ctx.screen] ?? screens.title)();
  ctx.root.querySelector<HTMLElement>('button,input,select')?.focus({ preventScroll: true });
}
