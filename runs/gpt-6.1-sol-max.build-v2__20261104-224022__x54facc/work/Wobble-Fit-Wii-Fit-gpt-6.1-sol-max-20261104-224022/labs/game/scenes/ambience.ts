/** @file Persistent cairn, creeping plaques, Tare's hop and the finale's guest procession. */
import { placeActor, Quaternion, Vector3, type World } from '../../../engine/sim-api';
import { flowOf, type GameComponents } from './state';
import { put } from './world';
import { spawnGuest } from '../cast/guest';
import { heightAt } from './terrain';
export function ambience(w: World<GameComponents>): void {
  const f = flowOf(w);
  if (!f.roundOnly && !f.demo && f.cairn.length < Math.min(90, f.pebbles) && w.tick % 8 === 0) {
    const i = f.cairn.length,
      level = Math.floor(i / 3),
      angle = i * 2.4;
    f.cairn.push(put(w, 'pebble', -7 + Math.sin(angle) * 0.22, 34 + Math.cos(angle) * 0.22, 8 + level * 0.16));
  }
  const tare = w.get(f.tare)?.sceneProp;
  if (tare) {
    const walking = f.mode === 'roam';
    tare.x = walking ? f.feet[0] + 1.4 : -60.5;
    tare.z = walking ? f.feet[2] + 1.4 : 22;
    tare.y = (walking ? heightAt(tare.x, tare.z) : 8) + Math.abs(Math.sin(w.tick / 18)) * 0.13;
  }
  if (w.tick % 120 === 0 && !f.roundOnly)
    for (const e of w.query('plaque')) {
      if (!e.sceneProp) continue;
      e.sceneProp.x = e.plaque.x + Math.min(4, f.day - 1) * 0.3;
      e.sceneProp.z = e.plaque.z + Math.min(4, f.day - 1) * 0.18;
    }
  const r = f.event;
  const plumb = w.get(f.plumb);
  if (plumb?.puppet)
    plumb.puppet.body =
      f.mode === 'event' && r.id === 'tilt' && r.phase === 4 && r.tick > 202 * 60 && r.tick < 207 * 60
        ? 'body:plumbAwake'
        : 'body:plumb';
  if (f.mode === 'event' && r.id === 'tilt' && r.phase === 0)
    placeActor(w, f.plumb, [-52 + Math.sin(w.tick / 12) * 0.025, 8.2, 13]);
  if (!f.roundOnly && f.drinks.length === 0) {
    put(w, 'drinkTable', 4, 38, 8);
    f.drinks = [
      put(w, 'drinkGlass', 3.6, 38, 9),
      put(w, 'drinkGlass', 4.1, 38.2, 9),
      put(w, 'drinkGlass', 4.4, 37.8, 9),
    ];
    f.marbles = [put(w, 'marbleQuiet', 29.5, -48, 12.35), put(w, 'marbleQuiet', 30.4, -48.4, 12.35)];
    f.phone = put(w, 'phoneStone', -50.2, 20, 9.1);
  }
  if (!f.roundOnly) {
    f.drinks.forEach((id, i) => {
      const p = w.get(id)?.sceneProp;
      if (p) p.x = [3.6, 4.1, 4.4][i] + (f.complete ? 0 : Math.min(4, f.day - 1)) * 0.14;
    });
    f.marbles.forEach((id, i) => {
      const p = w.get(id)?.sceneProp;
      if (p && f.day >= 4 && !f.complete) p.x = [29.5, 30.4][i] + Math.sin(w.tick / 150 + i) * 0.3;
    });
    const phone = w.get(f.phone)?.sceneProp,
      bex = w.get(f.others[1])?.actor;
    if (phone && bex) {
      phone.x = bex.x - 0.15;
      phone.y = bex.y + (f.mode === 'front' || f.event.id === 'pond' ? 0.55 : 1.15);
      phone.z = bex.z + 0.25;
    }
  }
  if (!f.roundOnly)
    for (const e of w.query('sceneProp'))
      if (e.sceneProp.prop === 'prop:beacon') {
        const a = w.tick / 140;
        e.sceneProp.q = [0, Math.sin(a / 2), 0, Math.cos(a / 2)];
      }
  if (tare && f.mode === 'event' && r.id !== 'group' && r.id !== 'pose' && r.id !== 'line' && r.id !== 'paddle') {
    tare.x = f.feet[0] + 2.8;
    tare.z = f.feet[2] + 1;
    tare.y = Math.max(2.1, heightAt(tare.x, tare.z)) + Math.abs(Math.sin(w.tick / 18)) * 0.13;
  }
  if (!f.roundOnly)
    for (const e of w.query('sceneProp'))
      if (e.sceneProp.prop === 'prop:sea') {
        const q = new Quaternion();
        if (f.mode === 'event' && r.id === 'tilt' && r.phase === 3 && !w.settings.get<boolean>('game.reduced'))
          q.setFromAxisAngle(new Vector3(-90, -94, -140).normalize(), -f.wobble.x * 0.2);
        e.sceneProp.q = [q.x, q.y, q.z, q.w];
      }
  if (f.mode === 'event' && r.id === 'line' && tare) {
    tare.x = -62;
    tare.z = 42 + r.progress;
    tare.y = 2.25 + Math.abs(Math.sin(w.tick / 18)) * 0.1;
    const board = w.get(f.props[0])?.sceneProp;
    if (board) board.z = tare.z;
  }
  if (f.mode === 'event' && r.id === 'pond') {
    if (r.tick > 1440 && f.props.length === 0) f.props.push(put(w, 'frog', -69.65, -11.6, 4.65));
    if (r.tick > 1920 && f.props.length < 2) f.props.push(put(w, 'gull', -70, -12, 5.4));
  }
  if (f.mode === 'event' && r.id === 'tilt' && r.phase === 2) {
    if (f.props.length === 0) {
      f.props.push(
        put(w, 'counterRails', 58, 12),
        put(w, 'counterRails', 64, 12),
        put(w, 'counterCart', 58, 5, heightAt(58, 12) + 0.1),
        put(w, 'counterCart', 64, 5, heightAt(64, 12) + 0.1),
      );
    }
    for (const id of f.props.slice(2)) {
      const prop = w.get(id)?.sceneProp;
      if (prop) prop.z = 5 + Math.min(1, r.count / 80) * 14;
    }
  }
  if (f.mode === 'event' && r.id === 'tilt') {
    if (f.finaleGuests.length === 0) {
      f.finaleGuests = [f.others[2], f.others[0], f.others[1]];
      placeActor(w, f.others[2], [74, heightAt(74, 8) + 0.15, 8]);
      for (let i = 3; i < 12; i++) f.finaleGuests.push(spawnGuest(w, -12 + i * 2, 8.2, 34 + (i % 3) * 2, i % 4));
    }
    if (r.phase === 1 || r.phase === 2)
      for (let i = 0; i < f.finaleGuests.length; i++) {
        const id = f.finaleGuests[i],
          e = w.get(id);
        if (!e?.actor) continue;
        const delivered = i < r.guests;
        const tx = delivered ? 74 : Math.max(-30, 10 - r.tilt * 3 + i * 2),
          tz = delivered ? 8 + (i % 3) * 2 : 34 + (i % 3) * 2;
        const x = e.actor.x + (tx - e.actor.x) * 0.009,
          z = e.actor.z + (tz - e.actor.z) * 0.009;
        placeActor(w, id, [x, heightAt(x, z) + 0.15, z], Math.PI / 2);
      }
  }
}
