// New Arrival, the bus conversation, Day One errands.
import { THREE } from '../engine.js';
import { newWorld, saveWorld } from '../core/world.js';
import { TextEntry, ListScreen } from '../ui/screens.js';
import { W, H } from '../ui/controls.js';
import { textWidth } from '../ui/draw.js';
import { SPAWNS } from '../world/townMap.js';
import { HOSTS } from '../data/neighbours.js';
import { item } from '../data/items.js';
export const HAIR_COLS = ['plum', 'ink', 'orange', 'sand', 'red', 'lime', 'blue', 'white'];
export class LookScreen {
  constructor() { this.id = 'look'; this.st = { i: 0 }; this.freeze = true; this.promise = new Promise(r => { this.resolve = r; }); }
  tick(ui, dt, active) {
    const g = ui.game, d = ui.d, w = g.world, L = w.look; if (g.place === 'salon') g.player.yaw += ui.c.dt * 1.4; d.rect(0, H - 120, W, 120, 'night'); d.text(240, H - 112, 'Your reflection, in a bus window', 'sand', { align: 'center' });
    const rows = [{ label: 'Hair style', value: L.hairStyle + 1 }, { label: 'Hair colour', value: L.hair }, { label: 'Skin', value: L.skin }, { label: 'Shirt', value: L.outfit.replace('tee_', '').replace('_', ' ') }, { label: "That'll do", value: '' }];
    const cols = ['sand', 'orange', 'white', 'mist', 'lime']; const tees = ['tee_red', 'tee_blue', 'tee_lime'];
    const r = ui.menu(this.st, rows, { x: 150, y: H - 98, w: 180, rh: 17, active, color: 'white', selFill: 'sky' });
    if (r.adj || r.pick >= 0) { const k = r.adj || 1; const i = this.st.i; if (i === 0) L.hairStyle = (L.hairStyle + k + 6) % 6; else if (i === 1) L.hair = HAIR_COLS[(HAIR_COLS.indexOf(L.hair) + k + 8) % 8]; else if (i === 2) L.skin = cols[(cols.indexOf(L.skin) + k + 5) % 5]; else if (i === 3) L.outfit = tees[(tees.indexOf(L.outfit) + k + 3) % 3]; else if (r.pick >= 0) { ui.pop(this); this.resolve(); return; } if (i < 4) { g.player.rebuild(); g.sfx('tick'); } }
    ui.prompt('confirm', 'Done'); ui.prompt('nav', 'Change');
  }
}
export const intro = {
  async begin(g) {
    const ui = g.ui; g.noAttract = true; const world = newWorld(1 + Math.floor(Math.random() * 1000)); g.resetWorldView(world); g.ui.clear();
    const name = await new Promise(res => { const te = new TextEntry({ title: 'What is your name?', max: 12, text: '', suggest: () => ['Pat', 'Moss', 'Juniper', 'Biscuit', 'Wren', 'Clover', 'Dot', 'Pickle'][Math.floor(Math.random() * 8)] }); ui.push(te); te.promise.then(res); });
    world.name = (name || 'Pat').trim() || 'Pat';
    const clock = await new Promise(res => { const sc = new ListScreen({ title: 'How does time pass?', items: [{ label: 'Village Time', sub: 'The village runs its own clock. It stops while you talk and browse. A day takes about 19 minutes.', v: 'village' }, { label: 'Real Clock', sub: 'The date and time of your own device. The village keeps pace with the real world. Quietly judging.', v: 'real' }], onPick: () => 'close', pickLabel: 'Choose' }); ui.push(sc); sc.promise.then(res); });
    g.settings.clock = clock?.v ?? 'village'; world.clockMode = g.settings.clock === 'real' ? 'real' : 'village';
    await this.bus(g, world); this.afterBus(g, world);
    g.noAttract = false;
  },
  async bus(g, world) {
    g.mode = 'play'; g.player.actor.show(true); g.cutsceneStart(); g.npcs.setVisible(false); g.setMusic('bus'); const hester = { name: 'Hester', type: 'warm', pitch: HOSTS.hester.pitch, voice: 'warm' };
    g.player.pos.x = 4; g.player.pos.z = 23; world.min = 1200; g.sys.time.onLoad(g); g.sys.time.visual(g, 0, true); g.town.busMesh.visible = true; g.town.busMesh.position.set(4, 0, 21.4); g.town.busMesh.rotation.y = Math.PI / 2;
    g.target.set(4, 0.8, 22.5); g.zoomOverride = 2.2;
    await g.say(hester, 'End of the line? Nobody gets off there on purpose.'); await g.say(hester, `Name's Hester. I only drive the bus. You're ${world.name}, I assume. You look like someone who owes money.`);
    await g.say(hester, "Town's called... well. I only drive the bus. That's the town's problem.");
    const a = await g.ask(hester, 'What are you running from?', ['A long story', 'A short story', 'My own opinion', 'An invoice']); world.look.hairStyle = a; world.look.hair = HAIR_COLS[(a * 2) % 8];
    const b = await g.ask(hester, 'Favourite weather?', ['Rain', 'Sun', 'Snow', 'Whatever is current']); world.look.outfit = ['tee_blue', 'tee_red', 'tee_lime', 'tee_red'][b]; world.look.skin = ['sand', 'orange', 'white', 'mist'][b];
    const c = await g.ask(hester, 'How do you take bad news?', ['Sitting down', 'Standing up', 'Sideways']); world.look.eyes = c;
    g.player.rebuild(); await g.say(hester, "There. Look at the window. That's you. That's what you'll be wearing when it all goes wrong."); g.ui.push(new LookScreen()); await g.ui.top.promise;
    await g.say(hester, 'This is your stop. The only stop. Mind the goose.'); g.sfx('bus'); g.zoomOverride = null; g.town.busMesh.visible = false; g.cutsceneEnd(); g.npcs.setVisible(true);
  },
  afterBus(g, world) {
    g.startGame(world, true); world.min = 1200; world.day = 1; g.flags.slowDayOne = true; g.sys.errands.begin(g); g.sys.time.visual(g, 0, true); g.setMusic('bed'); g.sys.errands.arrival(g);
  },
};
const STEPS = [
  { id: 'parcel', text: 'Fetch the parcel from Dorrit', done: 'parcel' }, { id: 'weed', text: 'Pull a weed and sell it at the store', done: 'sellweed' }, { id: 'net', text: "Ask Tavi about a net, then catch a bug", done: 'bug' },
  { id: 'rod', text: 'Ask Bartleby about a rod, then catch a fish', done: 'fish' }, { id: 'shovel', text: "Ask Mayor Trundle for a shovel, then dig", done: 'dig' }, { id: 'can', text: "Ask Clementine for a can and water the Mayor's sapling", done: 'water' }, { id: 'letter', text: 'Write to Gran at the Post', done: 'letter' },
];
export const errands = {
  sapling: { x: 24.5, z: 24.5 },
  begin(g) { const e = g.world.errands; e.active = true; e.done ??= {}; e.has ??= {}; this.refresh(g); },
  refresh(g) { const w = g.world, e = w.errands; if (!e.active || e.finished) { g.errandLine = null; return; } const left = STEPS.filter(s => !e.done[s.id]); g.errandLine = [`Errands (${STEPS.length - left.length}/${STEPS.length})`, ...left.slice(0, 3).map(s => '- ' + s.text)]; },
  async arrival(g) {
    const w = g.world, p = g.player; g.cutsceneStart(); const gander = g.sys.venues.host('gander'); p.pos.x = 5; p.pos.z = 23; p.setFacing(1, 0); g.town.busMesh.visible = false; g.target.set(5, 0.8, 23);
    await g.say(gander, "You're late. No, you're exactly on time. I've already billed you for being late."); await g.say(gander, `Welcome to ${w.townName}, ${w.name}. This way. Mind the debt; it's not a puddle, it's a lifestyle.`);
    await g.say(gander, 'This is your roofless shack. The roof is included. The rain is complimentary. The 8,000 beans are not.'); w.flags.debtKnown = true;
    await g.say(gander, 'Apron on. Small errands, small payments. Dorrit has a parcel for me; start there. Everyone is on the map. Everyone owes me.'); g.cutsceneEnd(); g.errandLine = null; this.refresh(g); g.ui.toast('Errands added. Press Map to find people.');
  },
  /** Called by g.errandProgress from tools/verbs. */
  progress(g, kind, def) {
    const w = g.world, e = w.errands; if (!e.active || e.finished) return;
    const ok = (id) => { if (e.done[id]) return; e.done[id] = true; g.addBeans(0); w.debt = Math.max(0, w.debt - 286); w.debtPaid += 286; g.sfx('coin'); g.ui.toast(`Errand done: ${STEPS.find(s => s.id === id).text}. (-286 debt)`); this.refresh(g); if (STEPS.every(s => e.done[s.id])) this.finish(g); };
    if (kind === 'sellweed') ok('weed'); if (kind === 'bug' && e.has.net) ok('net'); if (kind === 'fish' && e.has.rod) ok('rod'); if (kind === 'dig' && e.has.shovel) ok('shovel'); if (kind === 'water' && e.has.can) ok('can'); if (kind === 'letter') ok('letter'); if (kind === 'parcel') ok('parcel');
  },
  async onTalkNpc(g, n) {
    const w = g.world, e = w.errands; if (!e.active || e.finished) return false; const id = n.id;
    if (id === 'dorrit' && !e.has.parcel) { e.has.parcel = true; await g.say(n, "A parcel for the goose, mmhm. It's soup. She'll say it isn't. It's soup."); await g.say(n, "Take it to Mrs. Gander at the store. If she asks, it isn't soup, mmhm."); g.ui.toast('Got: Dorrit\'s parcel (it smells of soup)'); return true; }
    if (id === 'tavi' && !e.has.net) { e.has.net = true; g.give('net'); g.sfx('reveal'); await g.say(n, "Oh! You're the new one! Have a net! I found it! Or I made it! Isn't it?!"); await g.say(n, 'Catch a bug! Sneak up, hold the button, let go! It feels like a hug, isn\'t it?!'); return true; }
    if (id === 'bartleby' && !e.has.rod) { e.has.rod = true; g.give('rod'); g.sfx('reveal'); await g.say(n, "A rod. Take it. I'd prefer not to be asked about it. |Catch a fish. I'd prefer not to know how."); return true; }
    return false;
  },
  async onTalkHost(g, id) { // mayor, clementine
    const w = g.world, e = w.errands; if (!e.active || e.finished) return false; const who = { name: HOSTS[id].name, type: 'hearth', pitch: HOSTS[id].pitch };
    if (id === 'trundle' && !e.has.shovel) { e.has.shovel = true; g.give('shovel'); g.sfx('reveal'); await g.say(who, 'Welcome... new... person. I was on my way to... cut something. Have a shovel.'); await g.say(who, 'There is a crack... in the plaza. Dig it. I will... watch. I am... already watching.'); w.town.cracks.push({ x: 20, z: 24, fossil: true }); g.syncAll(); return true; }
    if (id === 'clementine' && !e.has.can) { e.has.can = true; g.give('can'); g.sfx('reveal'); await g.say(who, "A watering can. The bee insists. |The Mayor's sapling is by the plaza bench. It needs a drink and a pep talk."); this.plantSapling(g); return true; }
    return false;
  },
  plantSapling(g) { const w = g.world; if (!w.town.trees.find(t => t.id === 'mayorsapling')) { w.town.trees.push({ id: 'mayorsapling', x: 24, z: 24, kind: 'oak', fruit: 0, stage: 0, planted: w.day, age: 0, hp: 3 }); g.syncAll(); } },
  async onGiveParcel(g) { const w = g.world, e = w.errands; if (e.has.parcel && !e.done.parcel) { this.progress(g, 'parcel'); return true; } return false; },
  async finish(g) {
    const w = g.world; w.errands.finished = true; g.errandLine = null; g.flags.slowDayOne = false; g.cutsceneStart(); const gander = g.sys.venues.host('gander');
    await g.say(gander, "You've paid off 2,000 beans. You're free to go. Not that you were ever not free. Legally."); g.cutsceneEnd(); g.sys.mail.queue(g, { from: 'Gran', subject: 'Welcome (with concern)', body: `Dear ${w.name}, Mrs. Gander forwarded your letter. She added a fee. I am proud of you. Eat something. Love, Gran.`, arriveDay: w.day + 1 });
    g.sys.mail.queue(g, { from: 'Tavi', subject: 'HI!!', body: "You came to town and it's already better, isn't it?! Come say hi! Hi!", gift: 'seedpack', arriveDay: w.day + 1 });
  },
};
