import { TW } from '../world/townMap.js';
// Smaller systems: notice board, stars, wardrobe, plant/bury, gifts hub, seasons, year blurb, rating.
import { THREE, PALETTE, applySky } from '../engine.js';
import { item, CLOTHES } from '../data/items.js';
import { seasonOf, SEASONS, dayTypeOf } from '../core/calendar.js';
import { ListScreen, PocketsScreen, confirmBox } from '../ui/screens.js';
import { W, H } from '../ui/controls.js';
import { songNamed } from '../audio/composer.js';
export const notice = {
  async read(g) {
    const w = g.world; const lines = [`Today is ${['Market Day', 'Errand Day', 'Show Day', 'Festival Day'][g.dayType]} in ${SEASONS[g.season]}.`];
    if (g.dayType === 0) lines.push(`Old Rind's cheese: ${g.sys.cheese?.priceText?.(g) ?? 'whispers'}.`); if (g.dayType === 2) lines.push('Tonight at 20:00: Vesper plays under the plaza lamp. Bring ears.'); if (g.dayType === 3) lines.push('FESTIVAL! The whole village is in attendance, including those who are not.');
    lines.push(`Debt: ${w.debt} beans. (It is not on the notice board. The goose added it with a marker.)`);
    for (const l of lines) await g.say(null, l);
  },
};
export const stars = {
  async sit(g, t) {
    const p = g.player; g.cutsceneStart(); p.pos.x = t.at[0]; p.pos.z = t.at[1]; p.actor.play('Sit'); p.anim = 'Sit';
    if (t.at[1] > 10) { await g.say(null, 'You sit. The bench takes it well.'); const end = g.t + 3; while (g.t < end) await new Promise(r => g.after(0.2, r)); } else if (g.hour >= 19 || g.hour < 4) { g.zoomOverride = 1.2; await g.say(null, 'The sky is enormous tonight. It has opinions. They are mostly stars.'); const i = Math.floor(g.rng() * 6); if (!g.world.almanac.stars[i]) { g.world.almanac.stars[i] = true; g.sfx('reveal'); await g.say(null, `You find a constellation: ${['The Overdue Library Book', 'The Big Spoon', 'The Goose in Waiting', 'The Reluctant Ladder', 'The Slow Soup', 'The Mayor (Estimated)'][i]}. It is named. Gently.`); } if (g.cosmetic() < 0.6) { g.sfx('wish'); await g.say(null, 'A shooting star! You wish. A present will come in the morning.'); g.world.wishes.push(g.world.day); g.sys.mail.queue(g, { from: 'The Sky', subject: 'A wish granted', body: 'We heard you. It was rather loud. Enclosed: a thing.', gift: 'seedpack', arriveDay: g.world.day + 1 }); } g.zoomOverride = null; } else await g.say(null, 'You sit and look at the sky. It is daytime. The stars are on break.');
    p.anim = null; g.cutsceneEnd();
  },
};
export const wardrobe = {
  wear(g, it) { const w = g.world; const slot = it.slot; if (slot === 'outfit') w.look.outfit = it.id; else if (slot === 'hat') w.look.hat = w.look.hat === it.id ? null : it.id; else if (slot === 'glasses') w.look.glasses = w.look.glasses === it.id ? null : it.id; else if (slot === 'umbrella') w.look.umbrella = it.id; g.player.rebuild(); g.sys.memory.add(g, 'outfit', { item: it.id }); g.sfx('pickup'); g.ui.toast('Wearing: ' + it.name); w.outfitOwned = [...new Set([...(w.outfitOwned ?? []), it.id])]; },
};
export const plant = {
  front(g) { const p = g.player; const f = p.facing ?? { x: 0, z: 1 }; return [Math.floor(p.pos.x + f.x * 0.9), Math.floor(p.pos.z + f.z * 0.9)]; },
  seeds(g, it) { const [x, z] = this.front(g); if (g.tiles[z * TW + x] !== 0 || g.grid.solid(x + 0.5, z + 0.5)) { g.ui.toast('Needs grass. Seeds are picky.'); return; } if (g.sys.flowers.plant(g, x, z)) { g.take(it.id); g.sfx('pick'); } },
  sapling(g, it) { const [x, z] = this.front(g); const w = g.world; if (g.tiles[z * TW + x] !== 0 || g.grid.solid(x + 0.5, z + 0.5)) { g.ui.toast('Needs open grass.'); return; } g.take(it.id); w.town.trees.push({ id: 't' + g.uid(), x, z, kind: it.id === 'pear' ? 'pear' : 'oak', fruit: 0, stage: 0, planted: w.day, age: 0, hp: 3 }); g.syncAll(); g.sfx('dig'); g.ui.toast('Planted. It will take three days, and a lot of staring.'); },
  bury(g, it) { const [x, z] = this.front(g); const w = g.world; let h = w.town.holes.find(q => q.x === x && q.z === z); if (!h) { g.ui.toast('Dig a hole first. Beans like a place to think.'); return; } if (h.buried) return; g.take(it.id); h.buried = { day: w.day, n: 1000 }; g.sfx('dig'); g.ui.toast("Buried. 'Beans are currency, dear. You can't plant them.' You absolutely can."); },
  grow(g) { const w = g.world; for (const h of w.town.holes) if (h.buried && w.day - h.buried.day >= 2 && !h.grown) { h.grown = true; g.dropItem('beanbag', h.x + 0.5, h.z + 1.2, true); g.dropItem('beanbag', h.x + 1.5, h.z + 1.2, true); g.dropItem('beanbag', h.x + 0.5, h.z + 2.2, true); h.buried = null; w.town.holes.splice(w.town.holes.indexOf(h), 1); } },
};
export const seasons = {
  async turn(g, s) {
    const e = g.engine.screen; g.sfx('bell'); g.setMusic('sting' + s); g.banner = { text: SEASONS[s].toUpperCase() }; await new Promise(r => g.after(2.6, r)); g.banner = null; g.updateMusic(true);
  },
};
export const year = { blurb(g) { const w = g.world; return ['Spring: the Seed Toss', 'Summer: the Lantern Float', 'Autumn: the Great Soup', 'Winter: the Long Night'][g.season] + ` · Day ${w.day} of 16`; } };
export const rating = {
  townScore(g) { const w = g.world; const trees = w.town.trees.filter(t => !t.felled).length; const flowers = w.town.flowers.filter(f => !f.wilt).length; const weeds = w.town.weeds.length; const score = Math.min(100, Math.round(trees * 0.8 + flowers * 3 - weeds * 2.2 + 20)); const grade = score >= 85 ? 'S' : score >= 65 ? 'A' : score >= 45 ? 'B' : 'C'; return { score, grade, trees, flowers, weeds }; },
};
