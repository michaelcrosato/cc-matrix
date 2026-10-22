// Controller-first menus. One dispatcher owns all input routing: an open menu consumes
// up/down/confirm/back; with no menu open, a pause request goes to the game.
import { input } from './input.js';
import { sfx } from './audio.js';

const host = document.getElementById('ui');
const stack = [];
let pauseHandler = null;

export const menuOpen = () => stack.length > 0;
export const topMenu = () => stack[stack.length - 1] || null;
export function setPauseHandler(fn) { pauseHandler = fn; }

// cfg: { id, title, subtitle, items, stats, panel, html, onBack }
// item: { label, sub, value, kind: 'button'|'toggle'|'slider'|'info', get, set, min, max, step, format, disabled, onSelect }
export function openMenu(cfg) {
  const el = document.createElement('section');
  el.className = 'screen' + (cfg.panel ? ' panel' : ' menu');
  if (cfg.id) el.dataset.id = cfg.id;
  const header = `<header><h1>${cfg.title}</h1>${cfg.subtitle ? `<p class="sub">${cfg.subtitle}</p>` : ''}</header>`;
  let body = '';
  if (cfg.panel) {
    body = `<div class="panel-body">${cfg.html}</div>`;
  } else {
    if (cfg.stats) {
      body += `<dl class="stats">${cfg.stats.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
    }
    body += '<ul class="items" role="menu"></ul>';
  }
  el.innerHTML = `${header}${body}<footer>${cfg.footer || 'Up / Down move   ·   A or Enter select   ·   B or Esc back'}</footer>`;
  const m = { cfg, el, index: 0, rows: [], ul: el.querySelector('.items'), scroller: el.querySelector('.panel-body') };
  if (!cfg.panel) {
    cfg.items.forEach((it, i) => {
      const li = document.createElement('li');
      li.className = 'item' + (it.kind === 'info' ? ' info' : '') + (it.disabled ? ' disabled' : '');
      li.innerHTML = `<span class="text"><span class="label"></span>${it.sub ? '<span class="sub"></span>' : ''}</span><span class="val"></span>`;
      li.querySelector('.label').textContent = it.label;
      if (it.sub) li.querySelector('.sub').textContent = it.sub;
      li.addEventListener('click', () => { m.index = i; paint(m); activate(m); });
      m.ul.appendChild(li);
      m.rows.push(li);
    });
    m.index = Math.max(0, cfg.items.findIndex(selectable));
  }
  stack.push(m);
  host.appendChild(el);
  showTopOnly();
  paint(m);
  return m;
}

// Only the top menu is visible; lower ones stay in the stack for back navigation.
function showTopOnly() {
  stack.forEach((m, i) => { m.el.style.display = i === stack.length - 1 ? '' : 'none'; });
}

const selectable = (it) => !it.disabled && it.kind !== 'info';

export function closeMenu() {
  const m = stack.pop();
  if (m) m.el.remove();
  showTopOnly();
  return m;
}

export function closeAll() {
  while (stack.length) closeMenu();
}

function paint(m) {
  const it0 = m.cfg.items || [];
  m.rows.forEach((li, i) => {
    const it = it0[i];
    li.classList.toggle('focus', i === m.index);
    const val = li.querySelector('.val');
    if (it.kind === 'toggle') val.textContent = it.get() ? 'ON' : 'OFF';
    else if (it.kind === 'slider') val.textContent = it.format ? it.format(it.get()) : String(it.get());
    else if (it.value) val.textContent = typeof it.value === 'function' ? it.value() : it.value;
    else val.textContent = '';
    val.classList.toggle('on', it.kind === 'toggle' && it.get());
  });
  const focused = m.rows[m.index];
  if (focused && focused.scrollIntoView) focused.scrollIntoView({ block: 'nearest' });
}

function step(m, dir) {
  const items = m.cfg.items;
  let i = m.index;
  for (let n = 0; n < items.length; n++) {
    i += dir;
    if (i < 0 || i >= items.length) return;
    if (selectable(items[i])) { m.index = i; break; }
  }
  paint(m);
  sfx('menu');
}

function activate(m) {
  const it = m.cfg.items[m.index];
  if (!it || !selectable(it)) return;
  if (it.kind === 'toggle') { it.set(!it.get()); sfx('menu'); }
  else if (it.kind === 'slider') { adjust(m, 1); return; }
  else { sfx('confirm'); it.onSelect && it.onSelect(); }
  paint(m);
}

function adjust(m, dir) {
  const it = m.cfg.items[m.index];
  if (!it) return;
  if (it.kind === 'slider') {
    const v = Math.min(it.max, Math.max(it.min, Math.round((it.get() + dir * it.step) / it.step) * it.step));
    it.set(Number(v.toFixed(3)));
    sfx('menu');
  } else if (it.kind === 'toggle') {
    it.set(!it.get());
    sfx('menu');
  }
  paint(m);
}

function scrollPanel(m, dir) {
  if (m.scroller) m.scroller.scrollBy({ top: dir * 90, behavior: 'smooth' });
}

function back(m) {
  sfx('back');
  if (m.cfg.onBack) m.cfg.onBack();
  else if (stack.length > 1) closeMenu();
}

input.onPress((action) => {
  const m = topMenu();
  if (!m) {
    if (action === 'pause' && pauseHandler) pauseHandler();
    return;
  }
  if (m.cfg.panel) {
    if (action === 'up') scrollPanel(m, -1);
    else if (action === 'down') scrollPanel(m, 1);
    else if (action === 'confirm' || action === 'back' || action === 'pause') back(m);
    return;
  }
  switch (action) {
    case 'up': step(m, -1); break;
    case 'down': step(m, 1); break;
    case 'left': adjust(m, -1); break;
    case 'right': adjust(m, 1); break;
    case 'confirm': activate(m); break;
    case 'back':
    case 'pause': back(m); break;
    default: break;
  }
});

