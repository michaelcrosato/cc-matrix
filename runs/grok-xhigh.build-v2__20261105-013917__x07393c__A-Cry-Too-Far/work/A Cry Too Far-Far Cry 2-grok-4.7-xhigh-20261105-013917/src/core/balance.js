import { TUNING_RANGES } from '../content/tuning-defaults.js';
import { TUNING, resetTuning, setTuning } from './tuning.js';

/** The slider and the dev pad both call this. The value is live on the next use. */
export function applySlider(world, key, value) {
  const range = TUNING_RANGES[key];
  if (!range) return false;
  const v = Math.max(range[0], Math.min(range[1], value));
  setTuning(key, v);
  if (world && key === 'enemyHealth') {
    for (const actor of world.actors) {
      if (actor.kind !== 'soldier' || !actor.alive) continue;
      const ratio = actor.max ? actor.hp / actor.max : 1;
      actor.max = 100 * v;
      actor.hp = actor.max * ratio;
    }
  }
  if (world?.car && key === 'vehicleTopSpeed') world.car.o.topSpeed = v;
  return true;
}

export function resetSliders(world) {
  resetTuning();
  if (!world) return;
  applySlider(world, 'enemyHealth', TUNING.enemyHealth);
  if (world.car) applySlider(world, 'vehicleTopSpeed', TUNING.vehicleTopSpeed);
}
