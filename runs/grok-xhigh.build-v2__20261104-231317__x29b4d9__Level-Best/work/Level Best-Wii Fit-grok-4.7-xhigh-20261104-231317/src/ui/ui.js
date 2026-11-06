import { CSS } from './styles.js';
import { glyphSvg } from '../input/glyphs.js';

export function mountUi(doc, handlers) {
  if (!doc.getElementById('level-best-css')) {
    const style = doc.createElement('style');
    style.id = 'level-best-css';
    style.textContent = CSS;
    doc.head.appendChild(style);
  }
  let root = doc.getElementById('ui');
  if (!root) {
    root = doc.createElement('div');
    root.id = 'ui';
    doc.body.appendChild(root);
  }
  const paint = (model) => {
    doc.body.dataset.screen = model.screen || '';
    doc.body.dataset.attract = model.attract ? 'true' : 'false';
    root.replaceChildren();
    const top = doc.createElement('div');
    top.className = 'hud';
    const title = doc.createElement('div');
    if (model.screen === 'title' || model.screen === 'touch' || model.attract) {
      const h = doc.createElement('h1');
      h.textContent = model.gameTitle || 'Level Best';
      title.appendChild(h);
    } else if (model.heading) {
      const h = doc.createElement('h2');
      h.textContent = model.heading;
      title.appendChild(h);
    }
    for (const line of model.lines || []) {
      const p = doc.createElement('p');
      p.textContent = line;
      title.appendChild(p);
    }
    top.appendChild(title);
    if (model.hud) {
      const side = doc.createElement('div');
      const time = doc.createElement('div');
      time.className = 'time';
      time.textContent = model.hud.time;
      const score = doc.createElement('div');
      score.className = 'score';
      score.textContent = model.hud.score;
      side.append(time, score);
      top.appendChild(side);
    }
    root.appendChild(top);

    if (model.speech) {
      const bubble = doc.createElement('div');
      bubble.className = 'speech';
      const who = doc.createElement('p');
      who.textContent = model.speech.who;
      const said = doc.createElement('p');
      said.textContent = model.speech.text;
      bubble.append(who, said);
      root.appendChild(bubble);
    }

    const mid = doc.createElement('div');
    for (const choice of model.choices || []) {
      if (choice.kind === 'slider') {
        const label = doc.createElement('label');
        label.className = 'choice';
        label.textContent = `${choice.label}: ${choice.value}`;
        const input = doc.createElement('input');
        input.type = 'range';
        input.min = String(choice.min);
        input.max = String(choice.max);
        input.step = String(choice.step);
        input.value = String(choice.value);
        input.dataset.choice = choice.id;
        input.tabIndex = 0;
        if (choice.focus) input.classList.add('is-focus');
        input.addEventListener('input', () => handlers.slide(choice.id, Number(input.value)));
        input.addEventListener('pointerdown', () => handlers.hover(choice.index));
        label.appendChild(input);
        mid.appendChild(label);
      } else {
        const button = doc.createElement('button');
        button.type = 'button';
        button.dataset.choice = choice.id;
        button.textContent = choice.label;
        button.tabIndex = 0;
        if (choice.focus) {
          button.classList.add('is-focus');
          button.autofocus = true;
        }
        button.addEventListener('click', () => handlers.activate(choice.index));
        button.addEventListener('pointermove', () => handlers.hover(choice.index));
        mid.appendChild(button);
      }
    }
    if (model.page) {
      const pager = doc.createElement('p');
      pager.className = 'pages';
      pager.dataset.pager = 'page';
      pager.textContent = model.page;
      mid.appendChild(pager);
    }
    root.appendChild(mid);

    const bottom = doc.createElement('div');
    bottom.className = 'row';
    if (model.disc) {
      const disc = doc.createElement('div');
      disc.className = 'disc';
      disc.dataset.disc = '1';
      const dot = doc.createElement('div');
      dot.className = 'dot';
      const x = 50 + model.disc.x * 40;
      const y = 50 - model.disc.y * 40;
      dot.style.left = `${x}%`;
      dot.style.top = `${y}%`;
      disc.appendChild(dot);
      bottom.appendChild(disc);
    }
    const prompts = doc.createElement('div');
    prompts.className = 'prompts';
    for (const prompt of model.prompts || []) {
      const wrap = doc.createElement('span');
      wrap.className = 'tag';
      wrap.innerHTML = glyphSvg(prompt.glyph);
      const name = doc.createElement('span');
      name.textContent = ` ${prompt.verb}`;
      wrap.appendChild(name);
      prompts.appendChild(wrap);
    }
    bottom.appendChild(prompts);
    root.appendChild(bottom);
    const focused = root.querySelector('.is-focus');
    if (focused && focused.focus) focused.focus({ preventScroll: true });
  };
  return { paint };
}
