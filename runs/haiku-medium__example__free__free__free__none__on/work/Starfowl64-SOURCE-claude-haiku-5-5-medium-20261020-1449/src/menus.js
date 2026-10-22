import { sfx } from './audio.js';

// Controller-first menus rendered into #overlay. Up/down moves, confirm activates,
// left/right adjusts sliders and toggles, back goes up one level. Mouse hover and click also work.

const overlay = () => document.getElementById('overlay');

let current = null;

// items: [{ label, action?, adjust?(dir), value?() }]
export function openMenu({ title, subtitle = '', items, html = '', footer = '', onBack = null, initial = 0 }) {
  const el = overlay();
  el.classList.remove('hidden');
  el.innerHTML = '';
  const panel = document.createElement('div');
  panel.className = 'panel';
  panel.innerHTML = `<h1></h1>${subtitle ? '<p class="sub"></p>' : ''}${html}<div class="items"></div>${footer ? '<p class="hint"></p>' : ''}`;
  panel.querySelector('h1').textContent = title;
  if (subtitle) panel.querySelector('p.sub').textContent = subtitle;
  if (footer) panel.querySelector('p.hint').textContent = footer;
  el.appendChild(panel);

  const list = panel.querySelector('.items');
  const buttons = items.map((item, i) => {
    const b = document.createElement('button');
    b.className = 'btn';
    b.type = 'button';
    b.dataset.index = String(i);
    b.addEventListener('mouseenter', () => focus(i));
    b.addEventListener('click', () => { focus(i); activate(i); });
    list.appendChild(b);
    return b;
  });

  current = { items, buttons, index: Math.max(0, Math.min(initial, items.length - 1)), onBack };
  render();
  return current;
}

export function closeMenu() {
  const el = overlay();
  el.classList.add('hidden');
  el.innerHTML = '';
  current = null;
}

export function isMenuOpen() {
  return current !== null;
}

function labelOf(item) {
  const v = item.value ? item.value() : '';
  return v ? `${item.label}<span class="toggle-value">  ${v}</span>` : item.label;
}

function render() {
  if (!current) return;
  current.buttons.forEach((b, i) => {
    const item = current.items[i];
    b.innerHTML = labelOf(item);
    b.classList.toggle('focused', i === current.index);
    b.disabled = !!item.disabled;
  });
  const focused = current.buttons[current.index];
  if (focused && focused.scrollIntoView) focused.scrollIntoView({ block: 'nearest' });
}

function focus(i) {
  if (!current) return;
  if (current.index !== i) sfx('menu');
  current.index = i;
  render();
}

function activate(i) {
  if (!current) return;
  const item = current.items[i];
  if (item.disabled) return;
  if (item.action) {
    sfx('select');
    item.action();
  }
}

// Called once per frame by game.js with the input snapshot.
export function updateMenu(input) {
  if (!current) return;
  const n = current.items.length;
  if (input.upPressed) focus((current.index - 1 + n) % n);
  if (input.downPressed) focus((current.index + 1) % n);
  const item = current.items[current.index];
  if (input.leftPressed && item && item.adjust) { item.adjust(-1); sfx('menu'); render(); }
  if (input.rightPressed && item && item.adjust) { item.adjust(1); sfx('menu'); render(); }
  if (input.confirmPressed) activate(current.index);
  if (input.backPressed && current.onBack) {
    sfx('back');
    current.onBack();
  }
  if (current) render();
}

// Refresh values after a setting changes without losing focus.
export function refreshMenu() {
  render();
}
