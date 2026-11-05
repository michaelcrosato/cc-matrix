// The driver brain (plan §7.5): the same intent a player gives (steer, gas, brake, drift), from the road ahead and the
// traffic. The bot, the attract demo, the tests and the rivals all drive through CarSim with no special physics.
(() => {
'use strict';
const E = My3D2dge, OB = window.OB || (window.OB = {});
const { clamp } = E;

class Brain {
  /** new OB.Brain({ forks: ['L', 'R', ...] (the side it takes at each fork, in order), skill, drift }) */
  constructor(o = {}) {
    this.forks = o.forks || []; this.skill = o.skill || 1; this.driftOk = o.drift !== false;
    this.laneT = 0; this.laneX = null; this.laneRoom = 0; this.laneScore = 0;
  }
  /** the lane the car should be in: a clear one (nothing alongside, nothing within a second's run ahead) with the most
   *  room; the lane it is in is kept unless another is clearly better. Decided every 0.4 s, so it is committed to. */
  chooseLane(car, st, traffic) {
    const lanes = st.def.lanes;
    this.laneT -= 1 / 120;
    if (this.laneT > 0 && this.laneX !== null) return { x: this.laneX, room: this.laneRoom, score: this.laneScore };
    this.laneT = .4;
    let best = { x: car.x, room: 0, score: -1e9 };
    for (let i = 0; i < lanes; i++) {
      const x = -1 + (2 * i + 1) / lanes;
      let clear = true, room = 4000;
      for (const v of traffic.list) {
        if (Math.abs(v.x - x) >= .3) continue;
        const dz = v.z - car.z;
        if (dz > -300 && dz < 1800) clear = false;
        else if (dz >= 1800 && dz < room) room = dz;
      }
      const score = (clear ? 10000 : 0) + room - Math.abs(x - car.x) * 300 + (Math.abs(x - car.x) < .1 ? 200 : 0);
      if (score > best.score) best = { x, room, score };
    }
    this.laneX = best.x; this.laneRoom = best.room; this.laneScore = best.score;
    return best;
  }
  /** the intent for this step. car: the CarSim; st: { def, road, len }; traffic: the Traffic; info: { forkWanted, forkSide } */
  intent(car, st, traffic, info = {}) {
    const cap = 2.0 * this.skill, vt = car.vtop();
    // the road ahead: the sharpest bend within 2,500 units sets the speed; the racing line goes into it
    let curve = 0;
    for (let k = 1; k <= 13; k++) { const c = st.road.curveAt(car.z + k * 200); if (Math.abs(c) > Math.abs(curve)) curve = c; }
    let target = clamp(Math.abs(curve) < .5 ? vt : vt * Math.sqrt(cap / (Math.abs(curve) * OB.tune('curvePush'))), 60, vt);
    // the traffic: the lane it chooses; slow to the car in front only when no lane is clear
    const pick = this.chooseLane(car, st, traffic);
    // the car in front in the lane it is in: keep the distance (it can't pass in time), and in any lane not yet clear
    let ahead = 1e9;
    for (const v of traffic.list) if (Math.abs(v.x - car.x) < .3 && v.z > car.z + 60 && v.z - car.z < 1200) ahead = Math.min(ahead, v.kmh);
    if (ahead < 1e8) target = Math.min(target, ahead * 1.05 + 10);
    if (pick.score < 10000) {
      let ahead2 = 1e9;
      for (const v of traffic.list) if (Math.abs(v.x - pick.x) < .3 && v.z > car.z + 60 && v.z - car.z < 1800) ahead2 = Math.min(ahead2, v.kmh);
      if (ahead2 < 1e8) target = Math.min(target, ahead2 * 1.05 + 10);
    }
    // the fork: the side the route plan wants, at the decision point
    let lane = pick.x;
    if (info.forkWanted && info.forkSide) lane = info.forkSide === 'L' ? -.6 : .6;
    const steer = clamp((lane - car.x) * 2.2 - car.vx * .25, -1, 1);
    // drifting: a sharp bend at speed, with the drift button held into it
    const sharp = Math.abs(curve) >= 4.5 && car.v > 170 && this.driftOk;
    const gas = car.v < target ? 1 : 0, brake = car.v > target + 12 ? clamp((car.v - target) / 40, .2, 1) : 0;
    return { steer, gas, brake: sharp && car.v > target ? 0 : brake, drift: sharp && Math.abs(steer) > .3, shiftDown: false, shiftUp: false };
  }
}
OB.Brain = Brain;
})();
