import * as THREE from 'three';
import { world, burst } from './world.js';
import { enemies, firePlayerShot } from './entities.js';
import { player } from './player.js';
import { sfx } from './audio.js';
import { addToast } from './hud.js';

// Two AI wingmen fly in formation beside the ship, shoot the nearest target ahead,
// and can be shot down. A downed wingman returns to formation after a short delay.

const WING_HP = 3;
const DOWN_TIME = 12;
const WING_FIRE_INTERVAL = 0.45;
const SLOTS = [
  { x: -3.4, y: -0.7, name: 'Rex' },
  { x: 3.4, y: -0.7, name: 'Mira' },
];

export const wingmen = [];

function buildWingman(color) {
  const root = new THREE.Group();
  const hull = new THREE.MeshStandardMaterial({ color, metalness: 0.4, roughness: 0.4, flatShading: true });
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.45, 3.6, 7), hull);
  body.rotation.x = -Math.PI / 2;
  body.castShadow = true;
  root.add(body);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(3, 0.08, 1.6), hull);
  wing.position.set(0, 0, 0.5);
  wing.castShadow = true;
  root.add(wing);
  world.scene.add(root);
  return root;
}

export function resetWingmen() {
  for (const w of wingmen) world.scene.remove(w.root);
  wingmen.length = 0;
  for (const slot of SLOTS) {
    const color = slot.name === 'Rex' ? 0x3fbf6a : 0xc84fd9;
    wingmen.push({
      name: slot.name,
      slot,
      root: buildWingman(color),
      x: player.x + slot.x,
      y: player.y + slot.y,
      hp: WING_HP,
      down: false,
      downT: 0,
      fireT: Math.random() * WING_FIRE_INTERVAL,
    });
  }
}

export function clearWingmen() {
  for (const w of wingmen) world.scene.remove(w.root);
  wingmen.length = 0;
}

// Nearest living enemy ahead of the formation within gun range, or null.
function nearestTarget(w) {
  let best = null;
  let bestD = Infinity;
  for (const e of enemies) {
    if (!e.alive) continue;
    const ahead = -e.z * player.facing;
    if (ahead < -5 || ahead > 170) continue;
    const dx = e.x - w.x;
    if (Math.abs(dx) > 6) continue;
    const d = Math.abs(dx) + Math.abs(e.y - w.y) * 0.5 + ahead * 0.02;
    if (d < bestD) { bestD = d; best = e; }
  }
  return best;
}

// Formation follows the ship. Wingmen aim by moving only in the firing lane, so they hit targets that line up.
export function updateWingmen(dt, facing) {
  for (const w of wingmen) {
    if (w.down) {
      w.downT -= dt;
      w.root.visible = false;
      if (w.downT <= 0) {
        w.down = false;
        w.hp = WING_HP;
        w.root.visible = true;
        addToast(`${w.name} back in the fight`, '#5cf2a6');
        sfx('pickup');
      }
      continue;
    }
    const tx = player.x + w.slot.x;
    const ty = player.y + w.slot.y;
    const k = Math.min(1, dt * 6);
    w.x += (tx - w.x) * k;
    w.y += (ty - w.y) * k;
    w.root.position.set(w.x, w.y, 0);
    w.root.rotation.set(0, player.turnAngle, -(tx - w.x) * 0.2);

    w.fireT -= dt;
    if (w.fireT <= 0) {
      const target = nearestTarget(w);
      if (target) {
        firePlayerShot(w.x, w.y, -0.5, facing, 'wingman');
        w.fireT = WING_FIRE_INTERVAL;
      } else {
        w.fireT = 0.15;
      }
    }
  }
}

// Returns true if an enemy shot struck a wingman. Caller removes the shot.
export function hitWingman(x, y, z) {
  for (const w of wingmen) {
    if (w.down) continue;
    const dx = x - w.x, dy = y - w.y, dz = z;
    if (dx * dx + dy * dy + dz * dz < 1.6 * 1.6) {
      w.hp--;
      burst(w.x, w.y, 0, 20, 0xffaa77, 14, 0.7);
      if (w.hp <= 0) {
        w.down = true;
        w.downT = DOWN_TIME;
        sfx('bigExplode');
        burst(w.x, w.y, 0, 60, 0xffaa55, 22, 1.2);
        addToast(`${w.name} is down`, '#ff8866');
      }
      return true;
    }
  }
  return false;
}
