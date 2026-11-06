const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? 'unknown').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const defaults = {music:.1,effects:.7,shake:.65,glyphs:'playstation'};
const tuningSpec = [
  ['speed','Cruise speed',3,14,.25,7],['lift','Rotor lift',4,16,.25,8],
  ['gravity','Gravity',6,28,.5,16],['drain','Power drain',0,3,.05,.7],
  ['enemySpeed','Vermin speed',.25,3,.05,1],['damage','Damage multiplier',0,3,.1,1],
  ['fuse','Dynamite fuse',.4,3,.1,1.5]
];
const feedbackQuestions = {
  testingFeedback:['How many issues did testing catch?','How many were critical or game breaking?','What was the most helpful test?','What was the least helpful test?'],
  engineFeedback:['What did you like most about the engine?','Did you get stuck or guess wrong?','What was the most important thing you built yourself?','What was the hardest part of using the engine?','What did you change in the engine, and why?','What would you change about the engine?'],
  promptFeedback:['What did you like most about the prompt?','What was confusing?','What was the hardest thing to do?','What would you change in the prompt?']
};

export class UI {
  constructor(callback = () => {}) {
    this.callback = callback;
    this._screen = null;
    this.stack = [];
    this.input = 'keyboard';
    this.focusIndex = 0;
    this.credits = null;
    this.creditTab = 'sourceInformation';
    this.attract = false;
    this.context = '';
    this.settings = {...defaults};
    try { this.settings = {...defaults,...JSON.parse(localStorage.getItem('hero-hole-settings') || '{}')}; } catch {}
    $('tuning-sliders').innerHTML = tuningSpec.map(([key,label,min,max,step,value]) => `<label class="setting-row"><span class="setting-head">${label}<output id="tuning-out-${key}">${value}</output></span><input type="range" aria-label="${label}" data-tuning="${key}" min="${min}" max="${max}" step="${step}" value="${value}"></label>`).join('');
    document.querySelectorAll('[data-action]').forEach((el) => el.addEventListener('click', () => {
      let action = el.dataset.action;
      if (action === 'coop') this.callback('start',{coop:true});
      else this.callback(action,action === 'start' ? {coop:false} : {});
    }));
    document.querySelectorAll('[data-show]').forEach((el) => el.addEventListener('click', () => this.show(el.dataset.show)));
    document.querySelectorAll('[data-back]').forEach((el) => el.addEventListener('click', () => this.back()));
    document.querySelectorAll('[data-setting]').forEach((el) => {
      const key = el.dataset.setting;
      el.value = this.settings[key] ?? defaults[key];
      this.settingLabel(key,el.value);
      el.addEventListener('input', () => {
        const value = el.tagName === 'SELECT' ? el.value : Number(el.value);
        this.settings[key] = value;
        this.settingLabel(key,value);
        try { localStorage.setItem('hero-hole-settings',JSON.stringify(this.settings)); } catch {}
        if (key === 'glyphs') this.setInput(this.input);
        this.callback('setting',{key,value});
      });
    });
    document.querySelectorAll('[data-tuning]').forEach((el) => el.addEventListener('input', () => {
      const key = el.dataset.tuning,value = Number(el.value);
      $(`tuning-out-${key}`).textContent = value.toFixed(key === 'drain' || key === 'enemySpeed' ? 2 : 1).replace(/\.0$/,'');
      this.callback('tuning',{key,value});
    }));
    document.querySelectorAll('[data-dev]').forEach((el) => el.addEventListener('click', () => {
      const action = el.dataset.dev;
      if (action === 'reset') {
        this.setTuning(Object.fromEntries(tuningSpec.map(([k,,,,,v]) => [k,v])));
        document.querySelectorAll('[data-dev-toggle]').forEach((e) => { e.checked = false; });
      }
      this.callback('dev',{action});
    }));
    document.querySelectorAll('[data-dev-toggle]').forEach((el) => el.addEventListener('change', () => this.callback('dev',{action:el.dataset.devToggle,value:el.checked})));
    $('dev-mission').addEventListener('input', (e) => this.callback('dev',{action:'mission',value:Number(e.target.value)}));
    document.querySelectorAll('[data-online]').forEach((el) => el.addEventListener('click', () => this.callback('online',{action:el.dataset.online,code:(el.dataset.online === 'copy' ? $('online-link').value : $('online-code').value).trim()})));
    document.querySelectorAll('[data-credit-tab]').forEach((el) => el.addEventListener('click', () => {
      this.creditTab = el.dataset.creditTab;
      this.renderCredits();
    }));
    document.querySelectorAll('button,input,select,textarea').forEach((el) => {
      el.addEventListener('pointerenter', (e) => {
        if (e.pointerType === 'touch') return;
        if (this._screen && el.closest(`[data-screen="${this._screen}"]`)) {
          this.clearFocus();
          el.classList.add('focused');
          this.focusIndex = this.focusables().indexOf(el);
        }
      });
      el.addEventListener('focus', () => { this.clearFocus(); el.classList.add('focused'); this.focusIndex=this.focusables().indexOf(el); });
    });
    $('touch-controls').classList.add('hidden');
    this.setInput('keyboard');
    this.show('title');
  }
  get screen() { return this._screen; }
  settingLabel(key,value) {
    const node = $(`out-${key}`);
    if (node) node.textContent = `${Math.round(Number(value) * 100)}%`;
  }
  show(screen) {
    if (screen === 'none') screen = null;
    if (screen && ['settings','manual','about','dev','online'].includes(screen) && screen !== this._screen) this.stack.push(this._screen || 'pause');
    if (screen === 'title' || screen === null || ['complete','victory','gameover'].includes(screen)) this.stack = [];
    this._screen = screen;
    document.querySelectorAll('[data-screen]').forEach((el) => el.classList.toggle('visible',el.dataset.screen === screen));
    $('hud').classList.toggle('visible',!screen || screen === 'pause');
    $('touch-controls').classList.toggle('hidden',!!screen || this.attract);
    if (screen === 'about') this.renderCredits();
    this.clearFocus();
    this.focusIndex = 0;
    if (screen) requestAnimationFrame(() => this.focusElement(0,false));
  }
  clearFocus() { document.querySelectorAll('.focused').forEach((el) => el.classList.remove('focused')); }
  focusables() {
    if (!this._screen) return [];
    const area = document.querySelector(`[data-screen="${this._screen}"]`);
    return [...area.querySelectorAll('button,input,select,textarea')].filter((el) => !el.disabled && el.getClientRects().length && !el.closest('.hidden'));
  }
  focusElement(index,scroll = true) {
    const choices = this.focusables();
    if (!choices.length) return;
    this.focusIndex = ((index % choices.length) + choices.length) % choices.length;
    this.clearFocus();
    const el = choices[this.focusIndex];
    el.classList.add('focused');
    el.focus({preventScroll:true});
    if (scroll) el.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
  }
  navigate(dx,dy) {
    const choices = this.focusables();
    const selected = choices[this.focusIndex];
    if (!selected) return;
    if (dx && !dy && selected.type === 'range') {
      const step = Number(selected.step) || 1;
      selected.value = Math.max(Number(selected.min),Math.min(Number(selected.max),Number(selected.value) + Math.sign(dx) * step));
      selected.dispatchEvent(new Event('input',{bubbles:true}));
      return;
    }
    if (dx && !dy && selected.tagName === 'SELECT') {
      selected.selectedIndex = (selected.selectedIndex + Math.sign(dx) + selected.options.length) % selected.options.length;
      selected.dispatchEvent(new Event('input',{bubbles:true}));
      return;
    }
    this.focusElement(this.focusIndex + Math.sign(dy || dx));
  }
  confirm() {
    const el = this.focusables()[this.focusIndex];
    if (!el) return;
    if (el.tagName === 'BUTTON' || el.type === 'checkbox') el.click();
    else if (el.tagName === 'SELECT') this.navigate(1,0);
    else el.focus();
  }
  back() {
    if (this._screen === 'title' || !this._screen) return;
    if (this._screen === 'pause') { this.callback('resume',{}); return; }
    if (['gameover','complete','victory'].includes(this._screen)) { this.callback('title',{}); return; }
    const screen = this.stack.pop() || 'title';
    this._screen = null;
    this.show(screen);
  }
  setInput(type) {
    const pad = ['gamepad','controller','pad'].includes(type);
    const touch = type === 'touch';
    this.input = pad ? 'controller' : touch ? 'touch' : 'keyboard';
    document.body.classList.toggle('touch',touch);document.body.classList.toggle('pad',pad);
    const xbox = this.settings.glyphs === 'xbox';
    const cross = xbox ? 'A' : '×',square = xbox ? 'X' : '□',trigger = xbox ? 'RT' : 'R2',menu = xbox ? 'Menu' : 'Options';
    const key = (s) => `<b class="key">${esc(s)}</b>`;
    $('title-input-hint').textContent = pad ? `${cross} TO START  /  D-PAD TO SELECT` : touch ? 'TAP TO CLOCK IN' : 'ENTER TO START  /  ARROWS TO SELECT';
    $('control-hints').innerHTML = pad ? `<span>${key('L')} Move</span><span>${key(cross)} Fly</span><span>${key(trigger)} Laser</span><span>${key(square)} Dynamite</span><span>${key(menu)} Pause</span>` : `<span>${key('A D')} Move</span><span>${key('SPACE')} Fly</span><span>${key('LMB')} Laser</span><span>${key('E')} Dynamite</span><span>${key('ESC')} Pause</span>`;
    $('manual-move').innerHTML = pad ? `Left stick moves; push up or hold ${key(cross)} to fly. Release to descend. Push down to dive.` : touch ? 'Drag your left thumb anywhere on the left half of the screen. Up flies, sideways moves, and down descends. Release to drift down.' : `Move with ${key('A')} ${key('D')}. Hold ${key('SPACE')} or ${key('W')} to fly. Release to descend; ${key('S')} dives.`;
    $('manual-laser').innerHTML = pad ? `Aim with the right stick. Hold ${key(trigger)} to fire the helmet laser. Vermin dislike it. Soft rock eventually gives in.` : touch ? 'Drag your right thumb to aim and fire. Nearby threats can be targeted automatically, so you can focus on flying.' : `Aim with the mouse. Hold ${key('LMB')} or ${key('J')} to fire the helmet laser. Vermin dislike it. Soft rock eventually gives in.`;
    $('manual-bomb').innerHTML = pad ? `Press ${key(square)} to drop dynamite. You get six sticks. Get clear before the fuse runs out.` : touch ? 'Tap the amber blast button to drop dynamite. You get six sticks. Get clear before the fuse runs out.' : `Press ${key('E')} or ${key('K')} to drop dynamite. You get six sticks. Get clear before the fuse runs out.`;
  }
  hud(sim,lastInput) {
    if (!sim) return;
    this.lastSim = sim;
    const normalizedInput = ['gamepad','controller','pad'].includes(lastInput) ? 'controller' : lastInput;
    if (normalizedInput && normalizedInput !== this.input) this.setInput(normalizedInput);
    const p = sim.players?.[sim.localPlayerIndex||0];
    if (!p) return;
    const miners = sim.level?.miners || sim.miners || [];
    const total = miners.length || sim.level?.minerCount || 3;
    const rescued = miners.filter((m) => m.rescued).length;
    const energy = Math.round(Math.max(0,Math.min(100,p.energy ?? 100)));
    const put = (id,text) => { const el = $(id); if (el.textContent !== String(text)) el.textContent = text; };
    put('hud-level',`${sim.assisted?'ASSISTED · ':''}ASSIGNMENT ${String((sim.levelIndex || 0) + 1).padStart(2,'0')} / 05`);
    put('hud-name',sim.level?.name || 'Leone Mine');
    if (document.activeElement !== $('dev-mission')) $('dev-mission').value = sim.levelIndex || 0;
    put('hud-energy-text',`${energy}%`);
    $('hud-energy-fill').style.width = `${energy}%`;
    $('hud-energy-fill').classList.toggle('low',energy < 25);
    put('hud-hearts',Array.from({length:3},(_,i) => i < Math.ceil(p.hp ?? 3) ? '♥' : '♡').join(' '));
    put('hud-bombs',`✹ ${p.bombs ?? 6}`);
    put('hud-rescued',`${rescued} / ${total}`);
    put('hud-score',String(Math.floor(sim.score || 0)).padStart(6,'0'));
    const p2 = sim.players?.[sim.localPlayerIndex?0:1];
    $('hud-p2').classList.toggle('hidden',!p2);
    if (p2) put('hud-p2',`WORKMATE 2  ${'♥'.repeat(Math.max(0,Math.ceil(p2.hp ?? 3)))}  ·  POWER ${Math.round(p2.energy ?? 100)}%  ·  ✹ ${p2.bombs ?? 6}`);
    let hint = this.context || (rescued >= total ? 'All miners safe. Follow the green extraction beacon →' : 'Find the miners. Bring them home.');
    if (!this.context && energy < 22) hint = 'Power running low. Find a cyan battery pack.';
    put('context-hint',hint);
  }
  setContext(text) { this.context = text || ''; if (this.lastSim) this.hud(this.lastSim); }
  setMission(name,index = 0) { $('hud-name').textContent = name; $('hud-level').textContent = `ASSIGNMENT ${String(index + 1).padStart(2,'0')} / 05`; }
  setAttract(active) {
    this.attract = !!active;
    $('attract-strip').style.display = active ? 'block' : 'none';
    $('touch-controls').classList.toggle('hidden',active || !!this._screen);
  }
  updateSummary(sim) {
    if (!sim) return;
    const miners = sim.level?.miners || sim.miners || [];
    const rescued = miners.filter((m) => m.rescued).length;
    const secs = Math.floor(sim.time || 0);
    const time = `${String(Math.floor(secs / 60)).padStart(2,'0')}:${String(secs % 60).padStart(2,'0')}`;
    document.querySelectorAll('.summary-miners').forEach((el) => { el.textContent = `${rescued}/${miners.length || 3}`; });
    document.querySelectorAll('.summary-time').forEach((el) => { el.textContent = time; });
    document.querySelectorAll('.summary-score').forEach((el) => { el.textContent = String(Math.floor(sim.score || 0)).padStart(6,'0'); });
    $('complete-title').textContent = ['Nice work, hero.','A clean extraction.','Cool under pressure.','A light in the dark.','Last call answered.'][sim.levelIndex || 0] || 'Nice work, hero.';
    $('complete-message').textContent = ['First assignment in the bag. Dispatch has three more signals in the bat galleries.','The galleries are clear. Deeper down, the lava is making overtime.','Everyone is off the hot rocks. The next shift is somewhere the lights don’t reach.','Everyone’s safe in the dark. One final call is coming from the heart of the mountain.','The last crew is topside. It’s finally time to follow them into the daylight.'][sim.levelIndex || 0];
  }
  setTuning(tuning = {}) {
    document.querySelectorAll('[data-tuning]').forEach((el) => {
      if (tuning[el.dataset.tuning] === undefined) return;
      el.value = tuning[el.dataset.tuning];
      $(`tuning-out-${el.dataset.tuning}`).textContent = String(Number(el.value));
    });
    document.querySelectorAll('[data-dev-toggle]').forEach((el) => { if (tuning[el.dataset.devToggle] !== undefined) el.checked = !!tuning[el.dataset.devToggle]; });
  }
  toast(text,duration = 3000) {
    clearTimeout(this.toastTimer);
    $('toast').textContent = text;
    $('toast').classList.add('visible');
    this.toastTimer = setTimeout(() => $('toast').classList.remove('visible'),duration);
  }
  setStatus(text) { this.setOnlineStatus(text); }
  setOnlineStatus(text,code) {
    $('online-status').textContent = typeof text === 'object' ? text.text || text.kind || 'Connected' : text;
    if (code !== undefined) { $('online-link').value = code; $('online-share').classList.remove('hidden'); }
  }
  setCredits(data) { this.credits = data; this.renderCredits(); }
  renderCredits() {
    const data = this.credits;
    document.querySelectorAll('[data-credit-tab]').forEach((el) => el.classList.toggle('active',el.dataset.creditTab === this.creditTab));
    if (!data) {
      $('credits-content').innerHTML = '<article><h3>An original rescue adventure</h3><p>Inspired by H.E.R.O., designed by John Van Ryzin and published by Activision in 1984. Created with Three.js r180, WebGPU and Rapier 0.19.3. Original art, animation and procedural audio.</p></article><p>Production and testing details are recorded in the accompanying exit interview.</p>';
      return;
    }
    if (this.creditTab === 'sourceInformation') {
      const labels = {date:'Date',source:'Source',plan:'Plan',genre:'Genre',perspective:'Perspective',tech:'Technology',artDirection:'Art direction',animation:'Animation',audio:'Audio',online:'Online',testing:'Testing',research:'Research',environment:'Environment',model:'Model',usage:'Usage'};
      $('credits-content').innerHTML = `<dl>${Object.entries(labels).map(([key,label]) => `<dt>${label}</dt><dd>${esc(data.sourceInformation?.[key] || 'unknown')}</dd>`).join('')}</dl><p style="margin-top:23px"><a href="https://www.lemon64.com/doc/hero/275" target="_blank" rel="noopener">H.E.R.O. manual</a> · <a href="https://www.atarimania.com/games/atari-2600-games-h-e-r-o-11608/print?print=1" target="_blank" rel="noopener">Original game reference</a> · <a href="https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub" target="_blank" rel="noopener">AI Hub integration</a></p>`;
    } else {
      const questions = feedbackQuestions[this.creditTab] || [];
      const answers = data[this.creditTab] || [];
      $('credits-content').innerHTML = questions.map((question,i) => `<article><h3>${esc(question)}</h3><p>${esc(answers[i] || 'unknown')}</p></article>`).join('');
    }
    $('credits-content').scrollTop = 0;
  }
}
