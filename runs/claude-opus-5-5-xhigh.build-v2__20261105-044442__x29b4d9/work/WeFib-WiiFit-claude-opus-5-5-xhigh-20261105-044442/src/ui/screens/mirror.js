import * as THREE from 'three/webgpu';
import { h } from '../dom.js';
import { PAINTS, paintColour, Doll } from '../../art/doll.js';
import { HATS, LATE_PAINTS } from '../../data/unlocks.js';
import { rot2 } from '../../render/cameraRig.js';

/** The Mirror: paint and hat picker, on a doll that spins. Locked things show a marble count. */
export function openMirror(game, hub) {
  const p = game.save.profile, pr = game.programme;
  const doll = new Doll({ shirt: paintColour(p.paint), hat: p.hat });
  const art = game.art;
  const m = art.spots.mirror;
  doll.root.position.set(0, 0, 2.4);
  m.add(doll.root);
  doll.rig.loop('breathe');
  let yaw = 0;
  let paintI = PAINTS.findIndex((x) => x.id === p.paint), hatI = HATS.findIndex((x) => x.id === p.hat);
  let scr = null;
  const close = () => {
    m.remove(doll.root);
    game.ui.close(scr);
    game.save.write();
    if (hub && hub.doll) { hub.doll.setShirt(paintColour(p.paint)); hub.doll.setHat(p.hat); }
    hub.mirrorShot = false;
  };
  const camBack = game.rig.tPos.clone();
  scr = game.ui.open({
    name: 'mirror', prompts: [['use', 'Choose'], ['back', 'Back']], back: close,
    update: (dt) => {
      yaw += dt * 0.7;
      doll.root.rotation.y = yaw;
      doll.update(dt);
    },
    build: (s) => {
      s.el.append(h('div.h2', { style: 'margin-top:3rem' }, 'The Mirror'));
      const col = h('div.col', { style: 'position:absolute;right:9rem;top:30rem;align-items:stretch' });
      s.el.append(col);
      const paintEl = h('span'), hatEl = h('span');
      const renderP = () => {
        const x = PAINTS[paintI];
        const lock = LATE_PAINTS.find((l) => l.id === x.id);
        const locked = !pr.paintsOpen().includes(x.id);
        paintEl.textContent = locked ? `${x.name} (${lock ? lock.at : 0} marbles)` : x.name;
        if (!locked) { p.paint = x.id; }
        doll.setShirt(x.shirt);
      };
      const renderH = () => {
        const x = HATS[hatI];
        const locked = !pr.hatsOpen().some((o) => o.id === x.id);
        hatEl.textContent = locked ? `${x.name} (${x.at} marbles)` : x.name;
        if (!locked) p.hat = x.id;
        doll.setHat(x.id);
      };
      const shiftP = (d) => { paintI = (paintI + d + PAINTS.length) % PAINTS.length; renderP(); game.audio.sfx('uiMove'); };
      const shiftH = (d) => { hatI = (hatI + d + HATS.length) % HATS.length; renderH(); game.audio.sfx('uiMove'); };
      col.append(s.item(h('div', 'Paint: ', paintEl), { left: () => shiftP(-1), right: () => shiftP(1), use: () => shiftP(1), silent: true }));
      col.append(s.item(h('div', 'Hat: ', hatEl), { left: () => shiftH(-1), right: () => shiftH(1), use: () => shiftH(1), silent: true }));
      col.append(s.item(h('div', 'That will do'), { use: close }));
      renderP(); renderH();
      const line = game.line('trudy', 'mirror');
      game.speech.say('trudy', line, { auto: 4 });
    },
  });
  // Frame the doll and the mirror.
  hub.mirrorShot = true;
  return { camBack, THREE, rot2 };
}
