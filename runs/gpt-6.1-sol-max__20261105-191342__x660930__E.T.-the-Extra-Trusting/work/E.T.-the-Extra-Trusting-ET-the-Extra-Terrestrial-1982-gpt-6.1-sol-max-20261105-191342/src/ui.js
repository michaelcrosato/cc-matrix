import {
  DEFAULTS,
  PARTS,
  BRIDGE,
  TRANSMITTER,
  FLOWERS,
  RINGS,
  SHIP,
} from './core.js';
const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ],
  );
const feedbackQuestions = {
  testing: [
    'How many issues did testing catch?',
    'How many were critical or game breaking?',
    'Most helpful test?',
    'Least helpful test?',
  ],
  engine: [
    'What did you like most about the engine?',
    'Did you get stuck or guess wrong?',
    'What did you have to build yourself?',
    'Hardest part of using the engine?',
    'What did you change in the engine?',
    'What would you change in the engine?',
  ],
  prompt: [
    'What did you like most about the prompt?',
    'What was confusing?',
    'What was hardest?',
    'What would you change?',
  ],
};
export class Interface {
  constructor(settings, onAction, onSetting, onDev) {
    this.settings = settings;
    this.onAction = onAction;
    this.view = 'loading';
    this.returnView = 'title';
    this.aboutTab = 'source';
    this.dialogueUntil = 0;
    this.toastUntil = 0;
    this.context = null;
    this.lastHud = '';
    this.lastParts = '';
    this.network = null;
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action]');
      if (el && !el.disabled) {
        this.onAction(el.dataset.action, el);
      }
    });
    document.addEventListener('input', (e) => {
      const el = e.target;
      if (el.dataset.setting) {
        const value = Number(el.value);
        onSetting(el.dataset.setting, value);
        const out = el.parentElement.querySelector('output');
        if (out)
          out.textContent =
            el.dataset.setting === 'sensitivity'
              ? value.toFixed(1)
              : Math.round(value * 100) + '%';
      }
      if (el.dataset.dev) {
        const value = Number(el.value);
        onDev(el.dataset.dev, value);
        const out = el.parentElement.querySelector('output');
        if (out) out.textContent = value.toFixed(el.step === '1' ? 0 : 1);
      }
    });
    this.applySettings();
  }
  applySettings() {
    document.body.classList.toggle('large-text', this.settings.largeText);
    document.body.classList.toggle('reduced-motion', this.settings.reduced);
  }
  title(hasSave = false) {
    this.view = 'title';
    $('loader').classList.add('hidden');
    $('overlay').classList.add('hidden');
    $('ending').classList.add('hidden');
    $('title-screen').classList.remove('hidden');
    $('hud').classList.add('hidden');
    $('attract-banner').classList.add('hidden');
    $('continue-button').classList.toggle('hidden', !hasSave);
  }
  play() {
    this.view = 'play';
    $('title-screen').classList.add('hidden');
    $('overlay').classList.add('hidden');
    $('ending').classList.add('hidden');
    $('hud').classList.remove('hidden');
    $('attract-banner').classList.add('hidden');
  }
  attract() {
    this.play();
    this.view = 'attract';
    $('hud').classList.add('hidden');
    $('attract-banner').classList.remove('hidden');
  }
  pause(net) {
    this.returnView = 'play';
    this.view = 'pause';
    this.network = net;
    this.showPanel(
      `<div class="eyebrow">TAKE A BREATH, STARGAZER.</div><h1>The night can wait.</h1><p>${net.mode === 'solo' ? 'Your friend is right here. So is the road home.' : 'The other riders keep pedaling while you catch your breath.'}</p><div class="menu-stack"><button class="primary" data-action="resume">Back to the bicycle <span>↗</span></button><button data-action="map">The neighborhood map</button><button data-action="help">A few things to know</button><button data-action="settings">Settings</button>${net.mode !== 'hub' ? '<button data-action="coop">Invite a friend</button>' : ''}<button data-action="dev">Developer’s workbench</button><button data-action="about">About & credits</button>${net.mode !== 'hub' ? '<button data-action="return-title">Keep the memory · title screen</button>' : ''}</div><div class="panel-footer"><span>${net.mode === 'hub' ? 'AI HUB · SHARED-WORLD CO-OP' : net.mode === 'room' ? 'ROOM ' + esc(net.room) + ' · ' + net.players.length + ' RIDERS' : 'CHECKPOINTS SAVE AUTOMATICALLY'}</span><span>✦</span></div>`,
    );
  }
  showPanel(html) {
    $('overlay').classList.remove('hidden');
    $('panel').innerHTML = html;
    $('panel').scrollTop = 0;
  }
  settingsPanel() {
    this.view = 'settings';
    const row = (key, label, desc = '') =>
      `<div class="setting-row"><label for="s-${key}">${label}${desc ? '<small>' + desc + '</small>' : ''}</label><div class="range-wrap"><input id="s-${key}" data-setting="${key}" type="range" min="0" max="1" step=".05" value="${this.settings[key]}" aria-label="${label}"><output>${Math.round(this.settings[key] * 100)}%</output></div></div>`;
    this.showPanel(
      `<div class="eyebrow">MAKE YOURSELF AT HOME.</div><h1>A night your way.</h1>${row('master', 'All sound')}${row('music', 'Music', 'An original, code-played lullaby.')}${row('sfx', 'The little noises')}${row('voice', 'Gibberish voices')}<div class="setting-row"><label>Controller letters</label><button data-action="glyphs" data-toggle>${this.settings.glyphs === 'ps' ? 'PlayStation · × ○ □ △' : 'Xbox · A B X Y'}</button></div><div class="setting-row"><label>Camera speed</label><div class="range-wrap"><input aria-label="Camera speed" data-setting="sensitivity" type="range" min=".4" max="2" step=".1" value="${this.settings.sensitivity}"><output>${this.settings.sensitivity.toFixed(1)}</output></div></div><div class="setting-row"><label>Larger words</label><button data-action="largeText" data-toggle>${this.settings.largeText ? 'On' : 'Off'}</button></div><div class="setting-row"><label>Gentler motion</label><button data-action="reduced" data-toggle>${this.settings.reduced ? 'On' : 'Off'}</button></div><div class="panel-footer"><button class="back-button" data-action="back">Back</button><button data-action="fullscreen">Fill the screen ↗</button><button data-action="reset-settings">Reset</button></div>`,
    );
  }
  about(tab = this.aboutTab) {
    this.view = 'about';
    this.aboutTab = tab;
    const credits = window.GAME_CREDITS;
    let content = '';
    if (tab === 'source') {
      const info = credits.sourceInformation;
      const labels = {
        date: 'Date',
        source: 'Source',
        plan: 'Plan',
        genre: 'Genre',
        perspective: 'Camera',
        tech: 'Tech',
        artDirection: 'Art',
        animation: 'Animation',
        audio: 'Audio',
        online: 'Online',
        testing: 'Testing',
        research: 'Research',
        environment: 'Environment',
        model: 'Model',
        usage: 'Usage',
      };
      content =
        '<dl class="credits-list">' +
        Object.entries(labels)
          .map(
            ([key, label]) =>
              `<dt>${label}</dt><dd>${esc(info[key] || 'unknown')}</dd>`,
          )
          .join('') +
        '</dl><p class="dev-note">An original fan-made tribute. E.T. the Extra-Terrestrial belongs to its respective rights holders. Art, melodies, dialogue and game code were created for this demo. Three.js · MIT. Rapier · Apache-2.0. PeerJS · MIT. AI Hub client 1.4.0 included unmodified.</p>';
    } else {
      content =
        '<div class="feedback-list">' +
        feedbackQuestions[tab]
          .map(
            (q, i) =>
              `<p><b>${esc(q)}</b>${esc(credits[tab + 'Feedback']?.[i] || 'unknown')}</p>`,
          )
          .join('') +
        '</div>';
    }
    this.showPanel(
      `<div class="eyebrow">EVERY LIGHT HAS A STORY.</div><h1>About this little world.</h1><div class="credits-tabs">${['source', 'testing', 'engine', 'prompt'].map((t) => `<button data-action="tab-${t}" class="${t === tab ? 'active' : ''}">${{ source: 'Source information', testing: 'Testing feedback', engine: 'Engine feedback', prompt: 'Prompt feedback' }[t]}</button>`).join('')}</div>${content}<button class="back-button" data-action="back">Back to the night</button>`,
    );
  }
  help() {
    this.view = 'help';
    this.showPanel(
      `<div class="eyebrow">A LITTLE COURAGE GOES A LONG WAY.</div><h1>Stay together. Look up.</h1><h2>Borrow a few things.</h2><p>Find a toy keyboard, a dish, and some wire. The glowing diamonds point the way. Ride close and lend a hand. Take them to the clearing beyond the creek.</p><h2>Be smaller than the searchlights.</h2><p>Hold ${this.glyph('hush')} to ride quietly through ferns. Toss ${this.glyph('candy')} candy to draw a searcher away. If you’re spotted, Mara brings you back to the porch. Your parts stay safe.</p><h2>A small hand makes a big difference.</h2><p>${this.glyph('glow')} sends a friendly glow into nearby roots and flowers, and dazzles searchers for a moment. Quiet riding and the porch light refill your bond. Flowers give a little back.</p><h2>When the road runs out…</h2><p>Match three notes on the transmitter, then steer through six rings of starlight. Height takes care of itself. ${this.glyph('boost')} pedals harder. Friends share parts, notes and rings.</p><div class="panel-footer"><span>Mouse: click to ride or interact · right-drag to orbit · wheel to zoom.<br>Touch: slide a thumb on the left · tap the right to help · double-tap to glow.</span></div><button class="back-button" data-action="back">Back to the bicycle</button>`,
    );
  }
  coop(net) {
    this.view = 'coop';
    this.network = net;
    if (net.mode === 'room') {
      this.showPanel(
        `<div class="eyebrow">THERE’S ROOM FOR ONE MORE FRIEND.</div><h1>Meet under the moon.</h1><p>Share this six-letter room code. Open the same game on another device and choose “Join a friend.”</p><div class="room-code">${esc(net.room)}</div><div class="room-players">${net.players.map((p) => `<span class="room-player" style="border-color:${esc(p.color)}">${esc(p.name)} ${p.id === net.me ? '· you' : ''}</span>`).join('')}</div><p class="network-status">${esc(net.status)}</p><div class="room-actions">${net.isHost ? `<button class="primary" data-action="room-start">${net.started ? 'Back to the ride' : 'Start the night'} ↗</button>` : '<button data-action="room-wait" disabled>June starts the night</button>'}<button data-action="copy-room">Copy code</button><button data-action="leave-room">Leave room</button></div><button class="back-button" data-action="back">Back</button>`,
      );
    } else
      this.showPanel(
        `<div class="eyebrow">NO ONE GETS HOME ALONE.</div><h1>Ride together.</h1><p>Up to four bicycles. One little visitor, one shared adventure. Borrow parts, share your light, and find the stars together.</p><div class="room-actions"><button data-action="host-room" class="primary">Make a room ↗</button><button data-action="show-join">Join a friend</button></div><h2>Same night, different screens.</h2><p>Rooms use WebRTC for remote friends and a direct browser channel for tabs on the same website. Internet rooms need the public PeerJS signaling service. Local tabs also work offline.</p><p class="dev-note">In AI Hub, the lobby and connection are handled automatically.</p><button class="back-button" data-action="back">Back</button>`,
      );
  }
  joinPanel() {
    this.view = 'join';
    this.showPanel(
      `<div class="eyebrow">FIND YOUR BICYCLE GANG.</div><h1>What’s the secret code?</h1><p>Ask your friend for the six letters on their room screen.</p><input id="room-input" type="text" maxlength="6" autocomplete="off" spellcheck="false" aria-label="Six-letter room code" placeholder="ABCDEF"><div class="room-actions"><button class="primary" data-action="join-room">Find my friends ↗</button></div><p id="join-error" class="network-status"></p><button class="back-button" data-action="back">Back</button>`,
    );
  }
  dev(core, host = true, debug = false) {
    this.view = 'dev';
    const sliders = [
      ['speed', 'Pedal speed', 3, 18, 0.5],
      ['boost', 'Hard-pedal multiplier', 1, 3, 0.1],
      ['search', 'Searchlight sensitivity', 0.1, 2, 0.1],
      ['agentSpeed', 'Searcher pace', 0, 6, 0.1],
      ['glowRange', 'Glow reach', 3, 20, 0.5],
      ['bondDrain', 'Bond drain / second', 0, 2, 0.1],
      ['gravity', 'Ground gravity', 4, 30, 1],
    ];
    this.showPanel(
      `<div class="eyebrow">DEVELOPER’S WORKBENCH · LIVE BALANCE</div><h1>A little practical magic.</h1><p class="dev-note">${host ? 'Changes apply immediately. Checkpoints retain your collected parts.' : 'The host controls world balance. These tools are read-only on this device.'}</p>${sliders.map(([key, label, min, max, step]) => `<div class="setting-row"><label for="d-${key}">${label}</label><div class="range-wrap"><input ${host ? '' : 'disabled'} id="d-${key}" data-dev="${key}" aria-label="${label}" type="range" min="${min}" max="${max}" step="${step}" value="${core.settings[key]}"><output>${core.settings[key].toFixed(step === 1 ? 0 : 1)}</output></div></div>`).join('')}<div class="dev-grid">${[
        ['dev-refill', 'Refill bond & candy'],
        ['dev-next', 'Visit next objective'],
        ['dev-tune', 'Assemble transmitter'],
        ['dev-flight', 'Start the sky ride'],
        ['dev-invincible', 'Invincible: ' + (core.cheat ? 'on' : 'off')],
        ['dev-colliders', 'Collision lines: ' + (debug ? 'on' : 'off')],
        ['dev-reset', 'Reset balance defaults'],
        ['dev-restart', 'Restart journey'],
      ]
        .map(
          ([action, label]) =>
            `<button data-action="${action}" ${host ? '' : 'disabled'}>${label}</button>`,
        )
        .join(
          '',
        )}</div><button class="back-button" data-action="back">Back to pause</button>`,
    );
  }
  map(state, me) {
    this.view = 'map';
    const player = state.players.find((p) => p.id === me) || state.players[0];
    const point = (p) => ({ x: 300 + p.x * 4.5, y: 380 + (p.z - 26) * 3 });
    let symbols = '';
    for (const part of PARTS) {
      const p = point(part);
      symbols += `<g transform="translate(${p.x} ${p.y})"><circle r="11" fill="${state.parts[part.id] ? '#a9e5b7' : '#d8bc7e'}"/><text y="-18" text-anchor="middle" fill="#e9dfba" font-size="14">${part.name}</text><text y="5" text-anchor="middle" fill="#17363a" font-size="14">${state.parts[part.id] ? '✓' : part.id + 1}</text></g>`;
    }
    for (const p of state.players) {
      const q = point(p);
      symbols += `<g transform="translate(${q.x} ${q.y})"><circle r="7" fill="${esc(p.color)}"/><circle r="13" fill="none" stroke="#c8f5d8" stroke-width="1"/><text y="25" text-anchor="middle" fill="#c8f5d8" font-size="13">${esc(p.name)}${p.id === me ? ' · you' : ''}</text></g>`;
    }
    const tx = point(TRANSMITTER),
      br = point(BRIDGE);
    this.showPanel(
      `<div class="eyebrow">SOMEWHERE BETWEEN HERE AND HOME.</div><h1>The neighborhood.</h1><div class="map-wrap"><svg viewBox="0 0 600 460" role="img" aria-label="A map of parts, creek, clearing, and riders"><defs><pattern id="trees" width="29" height="33" patternUnits="userSpaceOnUse"><path d="M8 4l6 13H2z" fill="#356153"/><path d="M21 20l5 10H16z" fill="#2b574e"/></pattern></defs><rect width="600" height="460" fill="url(#trees)"/><path d="M0 380H600" stroke="#4f6965" stroke-width="32"/><path d="M0 380H600" stroke="#c7c290" stroke-width="1" stroke-dasharray="13 14"/><path d="M0 ${br.y}H600" stroke="#61918a" stroke-width="23"/><path d="M${br.x} ${br.y + 18}V${br.y - 18}" stroke="${state.bridge ? '#b4d596' : '#a98d65'}" stroke-width="13"/><path d="M${br.x} ${br.y - 25}Q${br.x + 15} ${br.y - 55} ${tx.x} ${tx.y}" fill="none" stroke="#9ca379" stroke-width="4" stroke-dasharray="4 6"/>${[-30, -6, 18].map((x) => `<rect x="${300 + x * 4.5 - 28}" y="304" width="56" height="43" rx="2" fill="#708673" stroke="#c0c49c"/>`).join('')}<g transform="translate(${tx.x} ${tx.y})"><path d="M0-14L12 8H-12Z" fill="#cae8ba"/><text x="0" y="-23" fill="#e8dbab" text-anchor="middle" font-size="14">The clearing</text></g>${symbols}<text x="565" y="35" fill="#d3d3a6" font-size="17">N ↑</text><text x="30" y="${br.y - 18}" fill="#a2c7bf" font-family="Georgia" font-style="italic" font-size="15">Willow creek</text></svg></div><div class="map-key"><span>● your bicycle</span><span>● something to borrow</span><span>△ the homemade transmitter</span></div><button class="back-button" data-action="back">Fold it up</button>`,
    );
  }
  tune(state) {
    this.view = 'tune';
    this.showPanel(
      `<div class="eyebrow">A HOMEMADE HELLO.</div><h1 style="text-align:center">Listen for the little light.</h1><p class="tune-help">Catch the needle in the golden arc.<br>Three notes. Somebody, somewhere, is listening.</p><div class="tune-bowl"><div class="tune-orbit"><div class="tune-sweet"></div><div class="tune-needle" id="tune-needle"></div></div></div><div class="note-dots" id="note-dots"><i></i><i></i><i></i></div><p class="tune-help" id="tune-feedback">${this.glyph('action')} Send a note</p><div class="center-actions"><button class="primary" data-action="tune-note">Send a note</button><button data-action="pause-tune">Take a breath</button></div>`,
    );
  }
  updateTune(state) {
    const needle = $('tune-needle');
    if (needle)
      needle.style.transform = `rotate(${((state.tuneClock * 0.26) % 1) * 360 - 180}deg)`;
    if ($('note-dots'))
      [...$('note-dots').children].forEach((e, i) =>
        e.classList.toggle('done', i < state.tune),
      );
  }
  ending(state) {
    this.view = 'ending';
    $('overlay').classList.add('hidden');
    $('hud').classList.add('hidden');
    $('ending').classList.remove('hidden');
    $('attract-banner').classList.add('hidden');
    $('ending-stats').innerHTML =
      `<div><b>${state.flowers.filter(Boolean).length}/3</b><span>FLOWERS REMEMBERED</span></div><div><b>${Math.floor(state.clock / 60)}:${String(Math.floor(state.clock % 60)).padStart(2, '0')}</b><span>A NIGHT TO KEEP</span></div><div><b>${state.players.length}</b><span>${state.players.length === 1 ? 'VERY GOOD FRIEND' : 'VERY GOOD FRIENDS'}</span></div>`;
  }
  glyph(action, mode = document.body.dataset.input) {
    const ps = {
      action: '×',
      glow: '□',
      candy: '○',
      map: '△',
      boost: 'R2',
      hush: 'L2',
      pause: '☰',
      move: 'L',
    };
    const xbox = {
      action: 'A',
      glow: 'X',
      candy: 'B',
      map: 'Y',
      boost: 'RT',
      hush: 'LT',
      pause: '☰',
      move: 'L',
    };
    const key = {
      action: 'E',
      glow: 'Q',
      candy: 'F',
      map: 'Tab',
      boost: 'Space',
      hush: 'Shift',
      pause: 'Esc',
      move: 'WASD',
    };
    const s =
      mode === 'pad' ? (this.settings.glyphs === 'ps' ? ps : xbox) : key;
    return `<kbd class="${mode === 'pad' && ['action', 'glow', 'candy', 'map'].includes(action) ? 'pad-glyph' : ''}">${s[action]}</kbd>`;
  }
  say(speaker, text) {
    this.dialogueUntil = performance.now() + 7000;
    $('speaker').textContent = speaker;
    $('dialogue-text').textContent = text;
    $('dialogue').classList.remove('hidden');
  }
  toast(text) {
    this.toastUntil = performance.now() + 3700;
    $('toast').textContent = text;
    $('toast').classList.remove('hidden');
  }
  caption(text) {
    const el = $('phase-caption');
    el.classList.add('hidden');
    el.textContent = text;
    requestAnimationFrame(() => el.classList.remove('hidden'));
    setTimeout(() => el.classList.add('hidden'), 5000);
  }
  hud(state, p, context, world, net) {
    if (!p) return;
    const now = performance.now();
    if (now > this.dialogueUntil) $('dialogue').classList.add('hidden');
    if (now > this.toastUntil) $('toast').classList.add('hidden');
    const phase = state.phase;
    const count = state.parts.filter(Boolean).length;
    const chapter =
      phase === 'freeride'
        ? 'AFTER THE STARS / FREE RIDE'
        : phase === 'gather'
          ? count < 3
            ? '01 / SMALL THINGS, BIG SIGNAL'
            : '02 / A HOMEMADE HELLO'
          : phase === 'flight'
            ? '03 / PEDAL PAST IMPOSSIBLE'
            : '04 / THE WAY HOME';
    const title =
      phase === 'freeride'
        ? 'One more lap around the block.'
        : phase === 'gather'
          ? count < 3
            ? 'A way to call the stars.'
            : 'The whole sky is listening.'
          : phase === 'flight'
            ? state.ring < 6
              ? 'Follow the thread of starlight.'
              : 'One last little goodbye.'
            : 'You brought him home.';
    const detail =
      phase === 'freeride'
        ? 'No hurry. The porch light stays on.'
        : phase === 'gather'
          ? count < 3
            ? 'Borrow three pieces. Stay out of the lights.'
            : 'Take the pieces to the clearing beyond the creek.'
          : phase === 'flight'
            ? 'Steer toward the next ring. Your friend handles the height.'
            : 'The blanket stays. The friendship, too.';
    const hudkey = chapter + title + detail;
    if (this.lastHud !== hudkey) {
      $('chapter-label').textContent = chapter;
      $('quest-title').textContent = title;
      $('quest-detail').textContent = detail;
      this.lastHud = hudkey;
    }
    const pk = state.parts.join(',') + phase;
    if (pk !== this.lastParts) {
      $('part-tokens').innerHTML =
        phase === 'gather'
          ? PARTS.map(
              (q, i) =>
                `<span class="part-token ${state.parts[i] ? 'found' : ''}"><i>${state.parts[i] ? '✓' : q.icon}</i>${q.short}</span>`,
            ).join('')
          : '';
      this.lastParts = pk;
    }
    $('bond-value').textContent = Math.round(state.bond);
    $('bond-fill').style.width = state.bond + '%';
    $('alert-row').classList.toggle('hidden', p.alert < 2);
    $('alert-fill').style.width = p.alert + '%';
    $('alert-label').textContent = p.hush
      ? 'Small and quiet. Keep going.'
      : 'A searcher is looking…';
    $('flight-counter').classList.toggle('hidden', phase !== 'flight');
    $('flight-counter').textContent =
      state.ring < 6 ? `${state.ring} / 6 ✧` : '✧ HOME';
    const party =
      net.players.length > 1
        ? net.players
            .map(
              (a) =>
                `<span style="color:${esc(a.color)}">${esc(a.name)}${a.id === net.me ? ' · you' : ''}</span>`,
            )
            .join('')
        : '';
    if ($('party-list').innerHTML !== party) $('party-list').innerHTML = party;
    this.context = context;
    if (context) {
      $('context-prompt').classList.remove('hidden');
      $('context-prompt').innerHTML =
        this.glyph(
          context.kind === 'grow' || context.kind === 'flower'
            ? 'glow'
            : 'action',
        ) + esc(context.label);
      $('touch-action').classList.toggle(
        'hidden',
        document.body.dataset.input !== 'touch',
      );
      $('touch-action').firstElementChild.textContent = context.label;
    } else {
      $('context-prompt').classList.add('hidden');
      $('touch-action').classList.add('hidden');
    }
    const mode = document.body.dataset.input;
    const controlsKey = mode + this.settings.glyphs + p.candy;
    if (this.controlsKey !== controlsKey) {
      $('controls-bar').innerHTML = [
        ['move', 'Ride'],
        ['boost', 'Pedal harder'],
        ['hush', 'Hush'],
        ['glow', 'Glow'],
        ['candy', 'Candy · ' + p.candy],
        ['map', 'Map'],
        ['pause', 'Pause'],
      ]
        .map(([a, l]) => '<span>' + this.glyph(a) + l + '</span>')
        .join('');
      $('title-input-note').textContent =
        mode === 'pad'
          ? this.settings.glyphs === 'ps'
            ? 'L to ride · × to lend a hand'
            : 'L to ride · A to lend a hand'
          : 'WASD to ride · E to lend a hand';
      this.controlsKey = controlsKey;
    }
  }
  marker(target, world, p) {
    const el = $('objective-marker');
    if (!target) {
      el.classList.add('hidden');
      return;
    }
    const proj = world.project({
      x: target.x,
      y: (target.y || 0) + 3,
      z: target.z,
    });
    if (proj.z > 1) {
      el.classList.add('hidden');
      return;
    }
    el.classList.remove('hidden');
    const x = Math.max(
      innerWidth * 0.08,
      Math.min(innerWidth * 0.92, (proj.x * 0.5 + 0.5) * innerWidth),
    );
    const y = Math.max(
      innerHeight * 0.23,
      Math.min(innerHeight * 0.75, (-proj.y * 0.5 + 0.5) * innerHeight),
    );
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.querySelector('span').textContent =
      target.name +
      ' · ' +
      Math.round(Math.hypot(target.x - p.x, target.z - p.z)) +
      'm';
  }
  fatal(error) {
    $('loader').classList.add('hidden');
    $('fatal').classList.remove('hidden');
    $('fatal-detail').textContent = String(error?.message || error);
  }
}
export function contextFor(s, p) {
  const d = (q) => Math.hypot(q.x - p.x, q.z - p.z);
  if (s.phase === 'gather') {
    const part = PARTS.find((q) => !s.parts[q.id] && d(q) < 3.6);
    if (part)
      return {
        kind: 'part',
        target: part,
        label: 'Borrow the ' + part.name.toLowerCase(),
      };
    if (!s.bridge && d(BRIDGE) < 11)
      return { kind: 'grow', target: BRIDGE, label: 'Wake the sleeping roots' };
    if (s.parts.every(Boolean) && d(TRANSMITTER) < 5)
      return {
        kind: 'transmitter',
        target: TRANSMITTER,
        label: 'Call the stars',
      };
    const f = FLOWERS.find((q, i) => !s.flowers[i] && d(q) < 6);
    if (f)
      return {
        kind: 'flower',
        target: f,
        label: 'Give the flowers a little light',
      };
    if (d({ x: -23, z: 23 }) < 4)
      return { kind: 'rest', label: 'Share a quiet moment' };
  }
  if (s.phase === 'flight' && s.ring >= RINGS.length && d(SHIP) < 6)
    return {
      kind: 'farewell',
      target: SHIP,
      label: 'It’s time to say see you',
    };
  return null;
}
