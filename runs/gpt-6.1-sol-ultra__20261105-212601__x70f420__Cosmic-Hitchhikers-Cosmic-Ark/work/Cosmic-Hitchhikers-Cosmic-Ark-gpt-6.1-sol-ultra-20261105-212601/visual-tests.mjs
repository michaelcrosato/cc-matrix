import * as THREE from 'three';
import { Visuals } from './visuals.js';
let checks = 0, failures = 0;
function check(name, ok) { checks++; if (!ok) { failures++; console.log(`FAIL ${name}`); } }
const scene = new THREE.Scene(), visuals = new Visuals(THREE, scene);
for (let planet = 0; planet < 3; planet++) {
  visuals.update(.1, { phase: 'rescue', planet, ark: { x: 0, y: 5 }, ship: { x: 0, y: -3 }, beam: true, shield: 1, cargo: 1,
    creatures: [{ id: 1, x: 0, y: -7.3, progress: .5 }, { id: 2, x: 5, y: -7.3, captured: true }],
    hazards: [{ id: 10, x: 15.7, y: -4, side: 1, kind: 'warning' }],
    meteors: [{ id: 1, x: 8, y: 4, armored: true, r: .7 }, { id: 2, x: 5, y: 5, waver: true }], bolts: [] });
  scene.updateMatrixWorld(true); let finite = true;
  scene.traverse(o => { finite &&= o.matrixWorld.elements.every(Number.isFinite); });
  check(`planet ${planet + 1} has finite model transforms`, finite);
  check(`planet ${planet + 1} cleans up old animation mixers`, visuals.mixers.length === 3);
  check(`planet ${planet + 1} has sentry targeting telegraph`, visuals.maps.hazards['10'].userData.warning);
  check(`planet ${planet + 1} lifts creature toward shuttle`, visuals.maps.creatures['1'].position.y > -7.3);
  check(`planet ${planet + 1} hides cargo creature`, !visuals.maps.creatures['2'].visible);
  check(`planet ${planet + 1} shows correct cargo count`, visuals.cargo[0].visible && !visuals.cargo[1].visible);
}
visuals.spawnEffect('rescue', 0, 0);
visuals.update(1, { phase: 'escape', ark: { x: 0, y: 0 } });
check('expired particles are removed', visuals.effects.length === 0);
check('escape retains aiming reticle', visuals.sight.visible);
check('escape removes rescue surface', !visuals.surface.visible);
console.log(`${checks} checks, ${failures} failed`);
process.exitCode = failures ? 1 : 0;
