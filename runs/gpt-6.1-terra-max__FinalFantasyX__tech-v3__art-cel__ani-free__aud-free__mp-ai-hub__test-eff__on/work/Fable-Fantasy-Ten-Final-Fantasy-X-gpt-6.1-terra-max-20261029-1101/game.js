const $ = id => document.getElementById(id);
const screens = { title: $('title'), game: $('game'), dialog: $('dialog'), overlay: $('overlay') };
const state = {
  mode: 'title', overlay: '', selected: 0, battleSelected: 0, pathSelected: 0,
  attract: false, lastInput: performance.now(), autoAt: 0, held: new Set(),
  engine: 'loading', world: null, run: null, battle: null, dialogue: [], dialogueDone: null,
  settings: { sound: true, invertX: false, invertY: false }, scoreSent: false,
  padButtons: [], padDirection: '', padRepeat: 0, toastTimer: 0
};
try { Object.assign(state.settings, JSON.parse(localStorage.getItem('fable-tide-settings') || '{}')); } catch (_) {}

const titleOptions = ['Begin journey', 'How to play', 'Settings', 'About & credits', 'Play together'];
const heroes = [
  { id: 'lio', name: 'Lio', role: 'THE WAYFARER', color: '#f2c881', maxHp: 120, maxMp: 18, power: 21, speed: 10, art: 'Current Cut', artText: 'A swift strike that delays a fiend.', artCost: 5 },
  { id: 'nami', name: 'Nami', role: 'THE KEEPER', color: '#94dfe1', maxHp: 86, maxMp: 34, power: 15, speed: 9, art: 'Spark', artText: 'Lightning magic. Especially strong against wisps.', artCost: 6 },
  { id: 'sera', name: 'Sera', role: 'THE WARDEN', color: '#eeb7a9', maxHp: 100, maxMp: 30, power: 16, speed: 8, art: 'Mend', artText: 'Restore an ally’s HP.', artCost: 6 },
  { id: 'toren', name: 'Toren', role: 'THE ANCHOR', color: '#c1c6f0', maxHp: 155, maxMp: 16, power: 25, speed: 7, art: 'Breakwater', artText: 'Break an enemy’s armor.', artCost: 5 }
];
const descriptions = {
  Strike: 'A dependable attack. Shells resist it until their armor is broken.',
  Art: 'Use this traveler’s unique skill. Costs MP.',
  Guard: 'Brace for the next enemy hit and gain resonance.',
  Items: 'Use a potion or a phoenix feather from the shared bag.',
  Swap: 'Trade this turn with the traveler waiting in reserve.',
  Summon: 'Call the sea spirit. Requires a full resonance gauge.'
};
const battleCommands = Object.keys(descriptions);
let THREE, RAPIER, renderer, scene, camera, world, controller, playerBody, playerCollider, playerModel, sea, clock;
let sceneryAnimated = [], enemiesVisual = [], audioContext, musicTimer, musicStep = 0;

function escapeHtml(value) { return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
function saveSettings() { try { localStorage.setItem('fable-tide-settings', JSON.stringify(state.settings)); } catch (_) {} }
function show(element, visible) { element.classList.toggle('hidden', !visible); }
function toast(message) {
  $('toast').textContent = message; show($('toast'), true);
  clearTimeout(state.toastTimer); state.toastTimer = setTimeout(() => show($('toast'), false), 2700);
}
function renderTitle() {
  $('title-menu').innerHTML = titleOptions.map((item, index) => `<button class="menu-item ${index === state.selected ? 'active' : ''}" data-title="${index}"><span class="pointer">✦</span><span>${item}</span><span class="menu-arrow">↗</span></button>`).join('');
  document.querySelectorAll('[data-title]').forEach(button => button.addEventListener('click', () => { state.selected = Number(button.dataset.title); titleConfirm(); }));
}
function showTitle() {
  state.attract = false; state.mode = 'title'; state.overlay = ''; state.lastInput = performance.now(); state.held.clear();
  show(screens.title, true); show(screens.game, false); show(screens.dialog, false); show(screens.overlay, false); show($('attract-banner'), false);
  state.selected = 0; renderTitle();
}
function titleConfirm() {
  sound('select');
  if (state.selected === 0) begin(false);
  else if (state.selected === 1) openOverlay('how');
  else if (state.selected === 2) openOverlay('settings');
  else if (state.selected === 3) openOverlay('about');
  else openOverlay('online');
}
function setModal(eyebrow, title, content, bottom = '◯ / ESC  BACK') {
  $('modal-eyebrow').textContent = eyebrow; $('modal-title').textContent = title;
  $('modal-content').innerHTML = content; $('modal-bottom').textContent = bottom; show(screens.overlay, true);
}
function openOverlay(kind) {
  if (state.attract) return;
  state.overlay = kind; state.modeBeforeOverlay = state.mode; state.mode = 'overlay'; state.selected = 0;
  renderOverlay();
}
function closeOverlay() {
  if (state.overlay === 'ending') { showTitle(); return; }
  if (state.overlay === 'defeat') { retryBattle(); return; }
  state.overlay = ''; state.mode = state.modeBeforeOverlay || 'title'; show(screens.overlay, false);
  if (state.mode === 'title') { state.selected = 0; renderTitle(); }
}
function renderOverlay() {
  if (state.overlay === 'settings') {
    const rows = [ ['Sound', state.settings.sound ? 'On' : 'Off'], ['Invert horizontal', state.settings.invertX ? 'On' : 'Off'], ['Invert vertical', state.settings.invertY ? 'On' : 'Off'] ];
    setModal('MAKE THE JOURNEY YOURS', 'Settings', `<p class="modal-intro">A little room to make the journey feel right.</p><div class="setting-list">${rows.map((row,index) => `<button class="setting-row ${state.selected === index ? 'active' : ''}" data-setting="${index}"><span>${row[0]}</span><b>${row[1]}</b></button>`).join('')}</div>`, '↑ ↓ SELECT     ✕ / ENTER TOGGLE     ◯ / ESC BACK');
    document.querySelectorAll('[data-setting]').forEach(button => button.onclick = () => { state.selected = Number(button.dataset.setting); toggleSetting(); });
  } else if (state.overlay === 'how') {
    setModal('A SMALL GUIDE', 'How to play', `<div class="guide-grid"><div><span class="guide-icon">✥</span><h3>Walk the causeway</h3><p>Move with the left stick or WASD / arrow keys. Approach a light and press ✕ or Enter to interact.</p></div><div><span class="guide-icon">✧</span><h3>Read the tide</h3><p>Turns appear in the upper right. Pick an action, then a target. Guard before a warning and swap travelers freely.</p></div><div><span class="guide-icon">◈</span><h3>Grow together</h3><p>Earn sphere points in battle. Press △ or Q while walking to open the Sphere Path and spend them.</p></div><div><span class="guide-icon">✺</span><h3>Call the deep</h3><p>Guard and take turns to build resonance. At 100%, summon a spirit for a powerful rescue.</p></div></div><p class="modal-note">Controller: ✕ confirm · ◯ back · △ path · Options pause<br>Keyboard: Enter / Space confirm · Esc back · Q path · P pause</p>`);
  } else if (state.overlay === 'about') {
    const report = window.FFT_ABOUT || {};
    const section = (name, value) => `<h3>${escapeHtml(name)}</h3><p>${escapeHtml(value || 'unknown').replace(/\n/g, '<br>')}</p>`;
    setModal('THE PEOPLE & THE MAKING', 'About & credits', `<div class="about-copy">${section('Source information', report.source)}${section('Testing feedback', report.testing)}${section('Engine feedback', report.engine)}${section('Prompt feedback', report.prompt)}</div>`);
  } else if (state.overlay === 'online') {
    setModal('TRAVEL IN PARALLEL', 'Play together', `<p class="modal-intro">Your stories can travel side by side.</p><p class="body-copy">When launched inside AI Hub, two to four players play their own journeys in parallel and compare Journey Points. This is a shared timed challenge, not live co-op. Launch the game through AI Hub to join a room.</p><p class="modal-note">Scores reward victories, exploration, and finishing the journey.</p>${window.AIHub?.active ? '<button class="solid-button" id="hub-start">JOIN THE ROOM</button>' : ''}`);
    if ($('hub-start')) $('hub-start').onclick = connectHub;
  } else if (state.overlay === 'pause') {
    const rows = ['Resume', 'Sphere Path', 'Settings', 'How to play', 'Return to title'];
    setModal('TAKE A BREATH', 'Paused', `<div class="setting-list">${rows.map((row,index) => `<button class="setting-row ${state.selected === index ? 'active' : ''}" data-pause="${index}">${row}<span>›</span></button>`).join('')}</div>`, '↑ ↓ SELECT     ✕ / ENTER CHOOSE     ◯ / ESC RESUME');
    document.querySelectorAll('[data-pause]').forEach(button => button.onclick = () => { state.selected = Number(button.dataset.pause); overlayConfirm(); });
  } else if (state.overlay === 'path') {
    const list = state.run.party;
    setModal('EVERY STEP LEAVES A MARK', 'Sphere Path', `<p class="modal-intro">Spend sphere points to strengthen a traveler. Each node may be awakened once.</p><div class="sphere-summary"><span>SPHERE POINTS</span><b>${state.run.sp}</b></div><div class="sphere-list">${list.map((hero, index) => `<button class="sphere-row ${state.pathSelected === index ? 'active' : ''}" data-sphere="${index}"><span><b>${hero.name}</b><small>${hero.role}</small></span><span>${hero.upgrade ? 'AWAKENED ✓' : '✦ 1 SP · ' + (hero.id === 'nami' ? '+8 POWER / +8 MP' : hero.id === 'sera' ? '+30 HP / +8 MP' : '+30 HP / +6 POWER')}</span></button>`).join('')}</div>`, '↑ ↓ SELECT     ✕ / ENTER AWAKEN     ◯ / ESC BACK');
    document.querySelectorAll('[data-sphere]').forEach(button => button.onclick = () => { state.pathSelected = Number(button.dataset.sphere); awaken(); });
  } else if (state.overlay === 'defeat') {
    setModal('THE TIDE WILL TURN', 'Not the end', `<p class="modal-intro">The sea does not ask you to be fearless. Only to rise again.</p><p class="body-copy">Your party and resources will be restored to the start of this encounter.</p><button class="solid-button" id="retry">TRY AGAIN</button>`, '✕ / ENTER RETRY');
    $('retry').onclick = retryBattle;
  } else if (state.overlay === 'ending') {
    setModal('CHAPTER COMPLETE', 'The sea remembers', `<p class="ending-quote">“If we cannot keep a person, perhaps we can keep the promise.”</p><p class="body-copy">You carried the last light across the Isle of Echoes. For now, the people of the shore can remember without fear.</p><div class="ending-score"><span>JOURNEY POINTS</span><strong>${String(state.run.score).padStart(4,'0')}</strong></div><button class="solid-button" id="end-title">RETURN TO TITLE</button>`, '✕ / ENTER RETURN TO TITLE');
    $('end-title').onclick = showTitle;
  }
}
function toggleSetting() {
  const key = ['sound','invertX','invertY'][state.selected]; state.settings[key] = !state.settings[key];
  saveSettings(); if (!state.settings.sound) stopMusic(); else startMusic(); renderOverlay(); sound('select');
}
function overlayConfirm() {
  if (state.overlay === 'settings') return toggleSetting();
  if (state.overlay === 'path') return awaken();
  if (state.overlay === 'pause') {
    const choice = state.selected;
    if (choice === 0) closeOverlay();
    else if (choice === 1) { state.overlay = 'path'; state.pathSelected = 0; renderOverlay(); }
    else if (choice === 2) { state.overlay = 'settings'; state.selected = 0; renderOverlay(); }
    else if (choice === 3) { state.overlay = 'how'; renderOverlay(); }
    else showTitle();
  } else if (state.overlay === 'defeat') retryBattle();
  else if (state.overlay === 'ending') showTitle();
  else if (state.overlay === 'online' && window.AIHub?.active) connectHub();
  else closeOverlay();
}
function awaken() {
  const hero = state.run.party[state.pathSelected];
  if (hero.upgrade) return toast(`${hero.name} has already awakened this node.`);
  if (state.run.sp < 1) return toast('Win a battle to earn sphere points.');
  state.run.sp--; hero.upgrade = true;
  if (hero.id === 'nami') { hero.power += 8; hero.maxMp += 8; hero.mp += 8; }
  else if (hero.id === 'sera') { hero.maxHp += 30; hero.hp += 30; hero.maxMp += 8; hero.mp += 8; }
  else { hero.maxHp += 30; hero.hp += 30; hero.power += 6; }
  addScore(50); sound('heal'); renderOverlay();
}
function openDialogue(lines, done) {
  state.dialogue = lines.slice(); state.dialogueDone = done; state.mode = 'dialog'; show(screens.dialog, true); advanceDialogue();
}
function advanceDialogue() {
  if (!state.dialogue.length) { show(screens.dialog, false); const done = state.dialogueDone; state.dialogueDone = null; if (done) done(); return; }
  const [name, text] = state.dialogue.shift(); $('dialog-name').textContent = name; $('dialog-text').textContent = text;
  state.autoAt = performance.now() + 1900;
}
function addScore(points) {
  if (!state.run) return; state.run.score += points; $('score').textContent = String(state.run.score).padStart(4,'0');
  if (window.AIHub?.active) AIHub.progress({ score: state.run.score, label: `Isle of Echoes · ${state.run.stage}/3 battles` });
}
function begin(attract) {
  if (state.engine !== 'ready') { toast(state.engine === 'loading' ? 'The tide is still waking. Please wait.' : 'WebGPU is required. Open in a WebGPU-enabled browser.'); return; }
  state.attract = attract; state.scoreSent = false;
  state.run = { party: heroes.map(hero => ({...hero, hp: hero.maxHp, mp: hero.maxMp, upgrade: false, guard: false, tick: 0})), active: [0,1,2], reserve: 3, potions: 4, feathers: 2, sp: 0, score: 0, stage: 0, shrine: false, resonance: 30, triggered: false };
  state.battle = null; state.mode = 'field'; state.held.clear(); $('score').textContent = '0000';
  playerBody.setTranslation({x:0,y:1,z:19}, true); playerBody.setNextKinematicTranslation({x:0,y:1,z:19}); playerModel.position.set(0,0,19);
  show(screens.title, false); show(screens.game, true); show(screens.overlay, false); show($('battle-hud'), false); show($('explore-hud'), true); show($('attract-banner'), attract);
  $('location').textContent = 'Pilgrim’s Causeway'; $('objective').textContent = 'Follow the lights to the far shrine.';
  updateEnemyVisuals([]); startMusic();
  openDialogue([
    ['Lio', 'The sea was quiet that morning. I remember thinking that was a kind thing.'],
    ['Nami', 'The last light is waiting at the far shrine. If it goes out, our island forgets.'],
    ['Sera', 'Then we carry it there together. One step, one promise at a time.'],
    ['Toren', 'And if the old fiends wake?'],
    ['Lio', 'Then we remind them we’re still here.']
  ], () => { state.mode = 'field'; toast('Follow the lights. The first fiends are ahead.'); });
}
const encounters = [
  { name: 'THE FIRST ECHO', enemies: [{name:'Echo Wisp',hp:78,power:14,speed:8,kind:'wisp'},{name:'Echo Wisp',hp:78,power:14,speed:7,kind:'wisp'}] },
  { name: 'THE SUNKEN GUARD', enemies: [{name:'Tide Shell',hp:145,power:18,speed:7,kind:'shell'},{name:'Echo Wisp',hp:82,power:15,speed:9,kind:'wisp'}] },
  { name: 'THE HOLLOW LANTERN', enemies: [{name:'Hollow Lantern',hp:300,power:24,speed:8,kind:'boss'}] }
];
function startBattle(index, restored = false) {
  state.run.triggered = true;
  if (restored) { state.run.party.forEach(hero => { hero.hp = hero.maxHp; hero.mp = hero.maxMp; hero.guard = false; }); state.run.potions = Math.max(2, state.run.potions); state.run.feathers = Math.max(1, state.run.feathers); }
  const data = encounters[index];
  const enemies = data.enemies.map((enemy, number) => ({...enemy, maxHp:enemy.hp, id:`enemy${number}`, tick: 4 + number * 4, broken:false, intent:false, team:'enemy'}));
  state.run.party.forEach((hero,index2) => { hero.tick = index2 * 3; hero.guard = false; hero.team = 'party'; });
  state.battle = { index, enemies, turn: null, phase:'choosing', targetType:'', targetIndex:0, action:'', locked:false, autoCounter:0 };
  $('battle-title').textContent = data.name; show($('explore-hud'), false); show($('battle-hud'), true); state.mode = 'battle';
  updateEnemyVisuals(enemies); sound('battle'); nextTurn();
}
function livingParty() { return state.run.active.map(index => state.run.party[index]).filter(hero => hero.hp > 0); }
function livingEnemies() { return state.battle.enemies.filter(enemy => enemy.hp > 0); }
function nextTurn() {
  if (!livingEnemies().length) return battleWon();
  if (!livingParty().length) {
    const reserve = state.run.party[state.run.reserve];
    if (reserve.hp > 0) { state.run.active[0] = state.run.reserve; state.run.reserve = state.run.party.findIndex(hero => !state.run.active.includes(state.run.party.indexOf(hero))); }
    else return battleLost();
  }
  const all = [...livingParty(), ...livingEnemies()].sort((first,second) => first.tick - second.tick);
  const actor = all[0]; state.battle.turn = actor; state.battle.phase = 'choosing'; state.battle.locked = false; state.battleSelected = 0;
  actor.tick += Math.round(100 / actor.speed);
  if (actor.team === 'enemy') { state.battle.locked = true; renderBattle(); state.autoAt = performance.now() + 850; setTimeout(() => { if (state.mode === 'battle' && state.battle?.turn === actor) enemyTurn(actor); }, state.attract ? 430 : 850); }
  else { state.run.resonance = Math.min(100, state.run.resonance + 9); renderBattle(); state.autoAt = performance.now() + (state.attract ? 650 : 10000); }
}
function announce(message) { $('battle-message').textContent = message; show($('battle-message'), true); clearTimeout(announce.timer); announce.timer = setTimeout(() => show($('battle-message'), false), 2000); }
function afterAction() { renderBattle(); setTimeout(() => { if (state.mode === 'battle') nextTurn(); }, state.attract ? 400 : 750); }
function enemyTurn(enemy) {
  if (enemy.hp <= 0) return nextTurn();
  if (enemy.kind === 'boss' && !enemy.intent) { enemy.intent = true; announce(`${enemy.name} gathers the deep. Guard now!`); sound('warn'); return afterAction(); }
  const target = livingParty().sort((first,second) => first.hp - second.hp)[0];
  if (!target) return nextTurn();
  let damage = enemy.power + Math.floor(Math.random() * 6);
  if (enemy.intent) { damage = Math.round(damage * 1.8); enemy.intent = false; }
  if (target.guard) { damage = Math.ceil(damage * .4); target.guard = false; }
  target.hp = Math.max(0, target.hp - damage); if (state.attract) target.hp = Math.max(1,target.hp);
  announce(`${enemy.name} hits ${target.name} for ${damage}.`); sound('hit'); afterAction();
}
function renderBattle() {
  if (!state.battle) return;
  const battle = state.battle, actor = battle.turn;
  const roster = state.run.active.map(index => state.run.party[index]);
  $('actor-name').textContent = actor?.team === 'party' ? actor.name : 'The tide moves';
  $('command-kicker').textContent = battle.phase === 'target' ? 'CHOOSE A TARGET' : actor?.team === 'party' ? actor.role : 'ENEMY TURN';
  $('command-description').textContent = battle.phase === 'target' ? 'Choose who receives this action.' : actor?.team === 'party' ? descriptions[battleCommands[state.battleSelected]] : 'Watch the turn order and prepare your next move.';
  let options = [];
  if (battle.phase === 'target') options = targetCandidates().map(target => target.name + (target.hp <= 0 ? ' · fallen' : ''));
  else if (battle.phase === 'item') options = [`Potion ×${state.run.potions}`, `Phoenix feather ×${state.run.feathers}`];
  else options = battleCommands.map(command => command === 'Summon' ? `Summon ${state.run.resonance}%` : command);
  const selected = battle.phase === 'target' ? battle.targetIndex : state.battleSelected;
  $('battle-menu').innerHTML = options.map((option,index) => `<button class="battle-option ${index === selected ? 'active' : ''}" data-battle="${index}"><span>${escapeHtml(option)}</span><span>›</span></button>`).join('');
  document.querySelectorAll('[data-battle]').forEach(button => button.onclick = () => { if (battle.locked || actor?.team !== 'party') return; if (battle.phase === 'target') battle.targetIndex = Number(button.dataset.battle); else state.battleSelected = Number(button.dataset.battle); battleConfirm(); });
  $('party-panel').innerHTML = roster.map(hero => `<div class="party-card ${hero === actor ? 'current' : ''} ${hero.hp <= 0 ? 'fallen' : ''}"><div class="party-name"><span style="color:${hero.color}">✦</span> ${hero.name}<small>${hero.guard ? 'GUARD' : hero.hp <= 0 ? 'FALLEN' : ''}</small></div><div class="stat-line"><span>HP</span><b>${hero.hp}</b><span class="stat-max">/ ${hero.maxHp}</span></div><div class="meter"><i style="width:${100*hero.hp/hero.maxHp}%"></i></div><div class="mp-line">MP ${hero.mp} <span> / ${hero.maxMp}</span></div></div>`).join('') + `<div class="reserve-label">RESERVE · ${state.run.party[state.run.reserve].name}</div>`;
  $('enemy-status').innerHTML = livingEnemies().map(enemy => `<div class="enemy-pill"><span>${escapeHtml(enemy.name)}${enemy.broken ? ' · BROKEN' : ''}${enemy.intent ? ' · CHARGING' : ''}</span><b>${enemy.hp} / ${enemy.maxHp}</b><div class="enemy-meter"><i style="width:${100*enemy.hp/enemy.maxHp}%"></i></div></div>`).join('');
  const order = [...livingParty(),...livingEnemies()].sort((first,second) => first.tick-second.tick).slice(0,5);
  $('turn-order').innerHTML = order.map(unit => `<span class="turn-chip ${unit.team === 'enemy' ? 'foe' : ''}">${escapeHtml(unit.name.split(' ')[0])}</span>`).join('');
}
function targetCandidates() {
  if (state.battle.targetType === 'enemy') return livingEnemies();
  if (state.battle.targetType === 'fallen') return state.run.active.map(index => state.run.party[index]).filter(hero => hero.hp <= 0);
  return state.run.active.map(index => state.run.party[index]).filter(hero => hero.hp > 0);
}
function chooseTarget(action, targetType) {
  state.battle.action = action; state.battle.targetType = targetType; state.battle.targetIndex = 0;
  if (!targetCandidates().length) { state.battle.phase = 'choosing'; toast(targetType === 'fallen' ? 'No fallen active travelers.' : 'No valid target.'); return renderBattle(); }
  state.battle.phase = 'target'; renderBattle();
}
function battleConfirm() {
  const battle = state.battle, actor = battle?.turn; if (!battle || battle.locked || actor?.team !== 'party') return;
  sound('select');
  if (battle.phase === 'target') return resolveAction(battle.action, targetCandidates()[battle.targetIndex]);
  if (battle.phase === 'item') {
    if (state.battleSelected === 0) { if (!state.run.potions) return toast('No potions left.'); return chooseTarget('Potion','ally'); }
    if (!state.run.feathers) return toast('No phoenix feathers left.'); return chooseTarget('Phoenix','fallen');
  }
  const command = battleCommands[state.battleSelected];
  if (command === 'Strike') return chooseTarget('Strike','enemy');
  if (command === 'Art') { if (actor.mp < actor.artCost) return toast('Not enough MP.'); return chooseTarget('Art', actor.id === 'sera' ? 'ally' : 'enemy'); }
  if (command === 'Items') { battle.phase = 'item'; state.battleSelected = 0; return renderBattle(); }
  if (command === 'Guard') { actor.guard = true; state.run.resonance = Math.min(100,state.run.resonance + 18); announce(`${actor.name} braces for the next hit.`); battle.locked = true; return afterAction(); }
  if (command === 'Swap') {
    const reserve = state.run.party[state.run.reserve]; if (reserve.hp <= 0) return toast('The reserve traveler has fallen.');
    const actorIndex = state.run.party.indexOf(actor), position = state.run.active.indexOf(actorIndex);
    state.run.active[position] = state.run.reserve; state.run.reserve = actorIndex; reserve.tick = actor.tick - Math.round(100 / actor.speed);
    announce(`${reserve.name} steps in for ${actor.name}.`); battle.locked = true; return afterAction();
  }
  if (command === 'Summon') {
    if (state.run.resonance < 100) return toast('Build resonance to 100% first.');
    state.run.resonance = 0; battle.locked = true; livingEnemies().forEach(enemy => enemy.hp = Math.max(0,enemy.hp - 105));
    livingParty().forEach(hero => hero.hp = Math.min(hero.maxHp,hero.hp + 35));
    announce('Marea, the sea spirit, washes over the battlefield!'); sound('summon'); return afterAction();
  }
}
function resolveAction(action, target) {
  if (!target) return; const actor = state.battle.turn; state.battle.locked = true;
  if (action === 'Potion') { state.run.potions--; const amount = Math.min(target.maxHp-target.hp,65); target.hp += amount; announce(`${target.name} recovers ${amount} HP.`); sound('heal'); }
  else if (action === 'Phoenix') { state.run.feathers--; target.hp = Math.ceil(target.maxHp * .45); target.tick = actor.tick + 2; announce(`${target.name} rises again.`); sound('heal'); }
  else if (action === 'Art' && actor.id === 'sera') { actor.mp -= actor.artCost; const amount = Math.min(target.maxHp-target.hp,75); target.hp += amount; announce(`${actor.name} mends ${target.name} for ${amount} HP.`); sound('heal'); }
  else {
    let damage = actor.power + Math.floor(Math.random()*7);
    if (action === 'Art') { actor.mp -= actor.artCost; damage = Math.round(damage * 1.5); if (actor.id === 'nami' && target.kind === 'wisp') damage *= 2; if (actor.id === 'lio') target.tick += 5; if (actor.id === 'toren') target.broken = true; }
    if (target.kind === 'shell' && !target.broken) damage = Math.max(1,Math.round(damage * .45));
    target.hp = Math.max(0,target.hp-damage); announce(`${actor.name} ${action === 'Art' ? `uses ${actor.art}` : 'strikes'}: ${damage} damage.`); sound('hit');
  }
  afterAction();
}
function battleWon() {
  const index = state.battle.index; state.run.stage = index + 1; state.run.triggered = false; state.run.sp += index === 2 ? 2 : 1; state.run.resonance = Math.min(100,state.run.resonance + 15); addScore((index+1)*300);
  show($('battle-hud'), false); show($('explore-hud'), true); updateEnemyVisuals([]); sound('victory');
  const lines = index === 0 ? [['Nami','That light didn’t vanish. It went ahead of us.'],['Lio','Maybe even memories know the way home.']] : index === 1 ? [['Toren','There. A shell breaks like any other promise.'],['Sera','Then let’s make better ones.']] : [['Nami','Listen. The island is breathing again.'],['Lio','We’re not finished. The light still needs a place to rest.']];
  openDialogue(lines, () => { state.mode = 'field'; toast(`Victory · +${index === 2 ? 2 : 1} sphere point${index === 2 ? 's' : ''}. Press △ / Q for Sphere Path.`); });
  $('objective').textContent = index === 2 ? 'Carry the light to the far shrine.' : 'Follow the lights to the far shrine.';
}
function battleLost() { state.mode = 'overlay'; state.modeBeforeOverlay = 'battle'; state.overlay = 'defeat'; renderOverlay(); }
function retryBattle() { show(screens.overlay, false); state.overlay = ''; startBattle(state.battle.index, true); }
function finishJourney() {
  addScore(1000); state.mode = 'overlay'; state.modeBeforeOverlay = 'field'; state.overlay = 'ending'; renderOverlay();
  if (window.AIHub?.active && !state.scoreSent) { state.scoreSent = true; AIHub.result({score:state.run.score}); }
  if (state.attract) { show(screens.overlay,false); state.autoAt = performance.now() + 3000; state.mode = 'attract-end'; }
}
function interact() {
  if (state.mode !== 'field') return; const z = playerBody.translation().z;
  if (Math.abs(z-7) < 2.6 && !state.run.shrine) {
    state.run.shrine = true; state.run.party.forEach(hero => { hero.hp=hero.maxHp; hero.mp=hero.maxMp; }); state.run.potions++; addScore(150); sound('heal');
    openDialogue([['Sera','A resting light. Let it hold us for a moment.'],['Lio','For once, I didn’t mind standing still.']], () => { state.mode='field'; toast('Party restored · potion found · +150 points'); });
  } else if (z < -15 && state.run.stage >= 3) {
    openDialogue([['Nami','The light is warm. I thought it would be colder.'],['Lio','Maybe it was never meant to be a goodbye.'],['Sera','Whatever tomorrow brings, we will remember this together.']], finishJourney);
  } else toast('There is nothing to examine here. Follow the lights.');
}
function updateField(delta) {
  if (!playerBody || state.mode !== 'field') return;
  let horizontal = (state.held.has('right') ? 1 : 0) - (state.held.has('left') ? 1 : 0);
  let vertical = (state.held.has('down') ? 1 : 0) - (state.held.has('up') ? 1 : 0);
  const pad = getPad(); if (pad) { if (Math.abs(pad.axes[0] || 0) > .17) horizontal = pad.axes[0]; if (Math.abs(pad.axes[1] || 0) > .17) vertical = pad.axes[1]; }
  if (state.attract) { horizontal = 0; vertical = -1; }
  if (state.settings.invertX) horizontal *= -1; if (state.settings.invertY && !state.attract) vertical *= -1;
  const length = Math.hypot(horizontal,vertical); if (length > 1) { horizontal/=length; vertical/=length; }
  const movement = {x:horizontal*4.8*delta,y:-.12,z:vertical*4.8*delta};
  controller.computeColliderMovement(playerCollider,movement); const corrected = controller.computedMovement(), current = playerBody.translation();
  playerBody.setNextKinematicTranslation({x:current.x+corrected.x,y:current.y+corrected.y,z:current.z+corrected.z}); world.step();
  const pos = playerBody.translation(); playerModel.position.set(pos.x,pos.y-1,pos.z);
  if (length > .1) playerModel.rotation.y = Math.atan2(horizontal,vertical);
  playerModel.userData.moving = length > .1;
  camera.position.lerp(new THREE.Vector3(pos.x*.3,8.5,pos.z+10.8),.06); camera.lookAt(pos.x*.3,1,pos.z-2.2);
  $('explore-prompt').textContent = Math.abs(pos.z-7)<2.6 && !state.run.shrine ? '✕  REST AT THE LIGHT' : pos.z < -15 && state.run.stage >= 3 ? '✕  PLACE THE LAST LIGHT' : '';
  if (!state.run.triggered && state.run.stage < 3 && pos.z < [12,1,-9][state.run.stage]) {
    const next = state.run.stage; state.run.triggered = true;
    const text = [ ['Lio','Something moved beneath the water. It remembered us first.'], ['Toren','That shell will turn a blade. Let me break its guard.'], ['Nami','The Hollow Lantern. It keeps every memory that hurts.'] ][next];
    openDialogue([text], () => startBattle(next));
  }
  if (state.attract && Math.abs(pos.z-7)<1 && !state.run.shrine) interact();
  if (state.attract && pos.z < -17 && state.run.stage >= 3) interact();
}
function activate(direction) {
  if (state.mode === 'title') { state.selected = (state.selected + direction + titleOptions.length) % titleOptions.length; renderTitle(); }
  else if (state.mode === 'overlay') {
    if (state.overlay === 'path') state.pathSelected = (state.pathSelected + direction + state.run.party.length) % state.run.party.length;
    else if (state.overlay === 'settings') state.selected = (state.selected + direction + 3) % 3;
    else if (state.overlay === 'pause') state.selected = (state.selected + direction + 5) % 5;
    renderOverlay();
  } else if (state.mode === 'battle' && !state.battle.locked) {
    if (state.battle.phase === 'target') state.battle.targetIndex = (state.battle.targetIndex + direction + targetCandidates().length) % targetCandidates().length;
    else { const count = state.battle.phase === 'item' ? 2 : battleCommands.length; state.battleSelected = (state.battleSelected + direction + count) % count; }
    renderBattle();
  }
  sound('move');
}
function perform(action) {
  if (action === 'confirm') {
    if (state.mode === 'title') titleConfirm(); else if (state.mode === 'dialog') advanceDialogue(); else if (state.mode === 'overlay') overlayConfirm(); else if (state.mode === 'field') interact(); else if (state.mode === 'battle') battleConfirm();
  } else if (action === 'back') {
    if (state.mode === 'overlay') closeOverlay();
    else if (state.mode === 'battle' && !state.battle.locked && state.battle.phase !== 'choosing') { state.battle.phase = 'choosing'; state.battleSelected = 0; renderBattle(); }
    else if (state.mode === 'field') openOverlay('pause');
  } else if (action === 'path' && state.mode === 'field') { state.pathSelected = 0; openOverlay('path'); }
  else if (action === 'pause' && state.mode === 'field') openOverlay('pause');
  else if (action === 'up') activate(-1); else if (action === 'down') activate(1);
}
function activity() { state.lastInput = performance.now(); if (state.attract) { showTitle(); return true; } return false; }
document.addEventListener('keydown', event => {
  if (event.repeat && !['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(event.key)) return;
  if (activity()) { event.preventDefault(); return; }
  const key = event.key.toLowerCase(), directions = {arrowup:'up',w:'up',arrowdown:'down',s:'down',arrowleft:'left',a:'left',arrowright:'right',d:'right'};
  if (directions[key]) { event.preventDefault(); state.held.add(directions[key]); if (state.mode !== 'field' && !event.repeat) perform(directions[key] === 'left' || directions[key] === 'up' ? 'up' : 'down'); }
  else if (key === 'enter' || key === ' ') { event.preventDefault(); perform('confirm'); }
  else if (key === 'escape' || key === 'backspace') { event.preventDefault(); perform('back'); }
  else if (key === 'q') perform('path'); else if (key === 'p') perform('pause');
  startMusic();
});
document.addEventListener('keyup', event => { const keys = {arrowup:'up',w:'up',arrowdown:'down',s:'down',arrowleft:'left',a:'left',arrowright:'right',d:'right'}; if (keys[event.key.toLowerCase()]) state.held.delete(keys[event.key.toLowerCase()]); });
document.addEventListener('pointerdown', () => { activity(); startMusic(); }, true);
$('dialog').addEventListener('click', () => { if (state.mode === 'dialog' && !state.attract) advanceDialogue(); });
document.querySelector('.modal-close').addEventListener('click', closeOverlay);
$('touch-settings').onclick = () => { if (state.mode !== 'overlay') openOverlay('settings'); };
function getPad() { return [...(navigator.getGamepads?.() || [])].find(Boolean); }
function pollPad(now) {
  const pad = getPad(); if (!pad) { state.padButtons=[]; state.padDirection=''; return; }
  pad.buttons.forEach((button,index) => { const pressed = button.pressed || button.value > .5; if (pressed && !state.padButtons[index]) { if (activity()) return; const action = {0:'confirm',1:'back',3:'path',9:'pause',12:'up',13:'down',14:'up',15:'down'}[index]; if (action) perform(action); startMusic(); } state.padButtons[index]=pressed; });
  let axisX = pad.axes[0] || 0, axisY = pad.axes[1] || 0; if (state.settings.invertX) axisX = -axisX; if (state.settings.invertY) axisY = -axisY;
  const direction = Math.abs(axisY) > .55 ? (axisY < 0 ? 'up' : 'down') : Math.abs(axisX) > .55 ? (axisX < 0 ? 'up' : 'down') : '';
  if (direction && (direction !== state.padDirection || now > state.padRepeat)) { if (activity()) return; if (state.mode !== 'field') perform(direction); state.padRepeat = now + 270; }
  state.padDirection = direction;
}
function updateTouchNotice() { const touchOnly = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches && !getPad(); show($('touch-notice'), touchOnly); }
window.addEventListener('gamepadconnected', updateTouchNotice); window.addEventListener('gamepaddisconnected', updateTouchNotice); updateTouchNotice();
function sound(kind) {
  if (!state.settings.sound || !audioContext || audioContext.state !== 'running') return;
  const note = {move:330,select:520,hit:105,heal:660,battle:180,victory:600,summon:220,warn:140}[kind] || 330;
  const oscillator = audioContext.createOscillator(), gain = audioContext.createGain(), time = audioContext.currentTime;
  oscillator.type = kind === 'hit' ? 'triangle' : 'sine'; oscillator.frequency.setValueAtTime(note,time); oscillator.frequency.exponentialRampToValueAtTime(note * (kind === 'hit' ? .45 : 1.35),time+.16);
  gain.gain.setValueAtTime(.0001,time); gain.gain.exponentialRampToValueAtTime(.045,time+.015); gain.gain.exponentialRampToValueAtTime(.0001,time+.3);
  oscillator.connect(gain).connect(audioContext.destination); oscillator.start(time); oscillator.stop(time+.31);
}
function startMusic() {
  if (!state.settings.sound) return;
  try { audioContext ||= new AudioContext(); if (audioContext.state === 'suspended') audioContext.resume(); } catch (_) { return; }
  if (musicTimer) return;
  const notes = [220,277.18,329.63,415.3,329.63,277.18,246.94,329.63,369.99,493.88,369.99,329.63,220,277.18,329.63,554.37];
  musicTimer = setInterval(() => {
    if (!audioContext || audioContext.state !== 'running' || !state.settings.sound) return;
    const time = audioContext.currentTime, oscillator = audioContext.createOscillator(), gain = audioContext.createGain(); oscillator.type='sine'; oscillator.frequency.value=notes[musicStep++ % notes.length];
    gain.gain.setValueAtTime(.0001,time); gain.gain.exponentialRampToValueAtTime(.018,time+.08); gain.gain.exponentialRampToValueAtTime(.0001,time+1.3); oscillator.connect(gain).connect(audioContext.destination); oscillator.start(time); oscillator.stop(time+1.35);
  }, 630);
}
function stopMusic() { clearInterval(musicTimer); musicTimer = null; }
async function connectHub() {
  try { const info = await AIHub.connect({mode:'parallel',seats:[1,4]}); if (!info) return; show(screens.overlay,false); state.overlay=''; begin(false); AIHub.ready(); }
  catch (_) { toast('Unable to join the AI Hub room.'); }
}
if (window.AIHub) {
  AIHub.on('time-up', () => { if (state.run && !state.scoreSent) { state.scoreSent=true; AIHub.result({score:state.run.score}); toast('Time is up. Your journey score is submitted.'); } });
  AIHub.on('end', () => { state.held.clear(); stopMusic(); });
  AIHub.probe(() => ({mode:state.mode, overlay:state.overlay, engine:state.engine, stage:state.run?.stage, score:state.run?.score, battle:state.battle?.phase, attract:state.attract}));
}
renderTitle(); show($('loading'),false);

async function initEngine() {
  try {
    if (!navigator.gpu || !(await navigator.gpu.requestAdapter())) throw new Error('WebGPU is unavailable');
    [THREE, RAPIER] = await Promise.all([import('three'), import('https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.19.3/+esm')]);
    await RAPIER.init();
    renderer = new THREE.WebGPURenderer({antialias:true}); await renderer.init();
    if (!renderer.backend.isWebGPUBackend) throw new Error('WebGPU backend is unavailable');
    renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(innerWidth,innerHeight); renderer.setClearColor(0xb7dce0); renderer.outputColorSpace = THREE.SRGBColorSpace;
    document.body.prepend(renderer.domElement); renderer.domElement.id='world-canvas';
    buildWorld(); state.engine='ready';
    window.addEventListener('resize', () => { renderer.setSize(innerWidth,innerHeight); camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); });
    clock = new THREE.Clock(); renderer.setAnimationLoop(frame);
  } catch (error) { state.engine='unavailable'; console.error('WebGPU initialization:',error); }
}
function buildWorld() {
  scene = new THREE.Scene(); scene.background = new THREE.Color(0xb9dce0); scene.fog = new THREE.Fog(0xb9dce0,35,100);
  camera = new THREE.PerspectiveCamera(47,innerWidth/innerHeight,.1,180); camera.position.set(0,8.5,30); camera.lookAt(0,1,16);
  scene.add(new THREE.HemisphereLight(0xe0f9f3,0x527c8b,2.2)); const sun = new THREE.DirectionalLight(0xfff3c8,2.8); sun.position.set(-10,20,10); scene.add(sun);
  const mat = color => new THREE.MeshToonMaterial({color});
  const sand = mat(0xd7c49b), light = mat(0xf2e6ca), dark = mat(0x9d947d), teal = mat(0x2b9e9c), grass = mat(0x588c72), leaf = mat(0x3a7770), gold=mat(0xe7bb66);
  function box(width,height,depth,material,x,y,z,rot=0) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(width,height,depth),material); mesh.position.set(x,y,z); mesh.rotation.y=rot; scene.add(mesh); return mesh; }
  function sphere(radius, material,x,y,z) { const mesh=new THREE.Mesh(new THREE.SphereGeometry(radius,12,8),material);mesh.position.set(x,y,z);scene.add(mesh);return mesh; }
  sea = new THREE.Mesh(new THREE.PlaneGeometry(200,200,30,30),mat(0x55b9bd)); sea.rotation.x=-Math.PI/2; sea.position.y=-.6; scene.add(sea);
  box(5.8,.65,53,sand,0,-.33,0);
  for (let index=0; index<31; index++) { const z=23-index*1.6; box(5.4,.08,1.48,index%3===0?light:sand,0,.04,z); if (index%2===0) { box(.2,.5,1.48,light,-3,.18,z); box(.2,.5,1.48,light,3,.18,z); } }
  for (const side of [-1,1]) for (let index=0;index<11;index++) {
    const z=21-index*4.4, x=side*4.4; box(.45,1.2,.45,light,x,.4,z); const crystal=sphere(.25,gold,x,1.25,z); sceneryAnimated.push({object:crystal,base:1.25,offset:index});
  }
  for (const side of [-1,1]) for (let index=0;index<7;index++) {
    const z=20-index*9, x=side*(9+(index%3)*2); const island=new THREE.Mesh(new THREE.CylinderGeometry(2.5,3.8,1.6,7),sand);island.position.set(x,-.25,z);scene.add(island);
    const top=new THREE.Mesh(new THREE.CylinderGeometry(2.45,2.6,.3,7),grass);top.position.set(x,.6,z);scene.add(top);
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.13,.25,3.3,6),dark);trunk.position.set(x,2.2,z);trunk.rotation.z=side*.13;scene.add(trunk);
    for(let petal=0;petal<5;petal++){const frond=new THREE.Mesh(new THREE.ConeGeometry(.55,2.5,4),leaf);frond.position.set(x+Math.cos(petal*1.26)*.8,3.9,z+Math.sin(petal*1.26)*.8);frond.rotation.z=Math.PI/2;frond.rotation.y=petal*1.26;scene.add(frond);}
  }
  for(let index=0;index<7;index++){const cliff=new THREE.Mesh(new THREE.ConeGeometry(3+index%2,8+index%3,5),mat(index%2?0x83aaa2:0x96b4aa));cliff.position.set((index-3)*12,2,-43-(index%2)*8);scene.add(cliff);}
  for(const side of [-1,1]) { box(.65,6,.65,light,side*3.6,3,-20); box(1,1,1,gold,side*3.6,6,-20); }
  box(8,.65,.8,light,0,6,-20); const shrine=new THREE.Mesh(new THREE.OctahedronGeometry(1.1),gold);shrine.position.set(0,2.5,-20);scene.add(shrine);sceneryAnimated.push({object:shrine,base:2.5,offset:0});
  const rest=new THREE.Mesh(new THREE.OctahedronGeometry(.7),teal);rest.position.set(4,1.8,7);scene.add(rest);sceneryAnimated.push({object:rest,base:1.8,offset:1});
  playerModel = makePerson(); scene.add(playerModel);
  world = new RAPIER.World({x:0,y:-9.81,z:0});
  world.createCollider(RAPIER.ColliderDesc.cuboid(2.9,.3,26).setTranslation(0,-.3,0));
  for(const side of [-1,1]) world.createCollider(RAPIER.ColliderDesc.cuboid(.18,1,26).setTranslation(side*3.08,.7,0));
  playerBody=world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0,1,19)); playerCollider=world.createCollider(RAPIER.ColliderDesc.capsule(.45,.35),playerBody); controller=world.createCharacterController(.04);
}
function makePerson() {
  const group=new THREE.Group(), skin=new THREE.MeshToonMaterial({color:0xe3ae89}), navy=new THREE.MeshToonMaterial({color:0x244f5a}), ivory=new THREE.MeshToonMaterial({color:0xf4e8cd}), brown=new THREE.MeshToonMaterial({color:0x58483f}), gold=new THREE.MeshToonMaterial({color:0xd1a659});
  function part(geometry,material,x,y,z) {const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);group.add(mesh);return mesh;}
  part(new THREE.SphereGeometry(.3,10,8),skin,0,1.85,0);part(new THREE.ConeGeometry(.34,.4,7),brown,0,2.1,0);part(new THREE.CylinderGeometry(.3,.37,.72,7),ivory,0,1.3,0);
  part(new THREE.BoxGeometry(.6,.2,.4),navy,0,.97,0);part(new THREE.BoxGeometry(.2,.62,.23),navy,-.17,.58,0);part(new THREE.BoxGeometry(.2,.62,.23),navy,.17,.58,0);
  const left=part(new THREE.BoxGeometry(.18,.62,.19),skin,-.4,1.33,0),right=part(new THREE.BoxGeometry(.18,.62,.19),skin,.4,1.33,0);part(new THREE.BoxGeometry(.15,.75,.12),gold,.5,1.15,-.18);
  group.userData.arms=[left,right]; return group;
}
function updateEnemyVisuals(enemies) {
  if (!scene || !playerBody) return; enemiesVisual.forEach(enemy=>scene.remove(enemy)); enemiesVisual=[];
  const playerZ=playerBody.translation().z;
  enemies.forEach((enemy,index) => { const material=new THREE.MeshToonMaterial({color:enemy.kind==='boss'?0x705c89:enemy.kind==='shell'?0x587a7e:0x85d4d5}); const mesh=new THREE.Mesh(enemy.kind==='shell'?new THREE.IcosahedronGeometry(.8,0):new THREE.OctahedronGeometry(enemy.kind==='boss'?1.3:.7,0),material); mesh.position.set((index-(enemies.length-1)/2)*2,1.3,playerZ-4);scene.add(mesh);enemiesVisual.push(mesh); });
}
function frame() {
  const now=performance.now(), delta=Math.min(clock.getDelta(),.05); pollPad(now);
  if (window.AIHub?.active && state.mode !== 'title' && typeof AIHub.time === 'function' && AIHub.time() < 0) { renderer.render(scene,camera); return; }
  if (state.mode==='title' && state.engine==='ready' && now-state.lastInput>10000) begin(true);
  if (state.attract && state.mode==='dialog' && now>state.autoAt) advanceDialogue();
  if (state.attract && state.mode==='attract-end' && now>state.autoAt) begin(true);
  if (state.attract && state.mode==='battle' && state.battle?.turn?.team==='party' && !state.battle.locked && now>state.autoAt) {
    const battle=state.battle; if (battle.phase==='choosing') { battle.autoCounter++; state.battleSelected = state.run.resonance>=100 ? 5 : battle.turn.id==='sera' && livingParty().some(hero=>hero.hp<hero.maxHp*.6) ? 1 : battle.turn.mp>=battle.turn.artCost && battle.autoCounter%2 ? 1 : 0; }
    if (battle.phase==='target' && battle.targetType==='ally') { const targets=targetCandidates(); battle.targetIndex=targets.findIndex(hero=>hero.hp===Math.min(...targets.map(item=>item.hp))); }
    battleConfirm(); state.autoAt=now+500;
  }
  updateField(delta);
  sceneryAnimated.forEach(item => {item.object.position.y=item.base+Math.sin(now*.0015+item.offset)*.15;item.object.rotation.y+=delta*.3;});
  enemiesVisual.forEach((enemy,index)=>{enemy.rotation.y+=delta;enemy.position.y=1.3+Math.sin(now*.003+index)*.15;});
  if (playerModel?.userData.arms) playerModel.userData.arms.forEach((arm,index)=>{arm.rotation.x=playerModel.userData.moving?Math.sin(now*.009+index*Math.PI)*.6:0;});
  renderer.render(scene,camera);
}
initEngine();
