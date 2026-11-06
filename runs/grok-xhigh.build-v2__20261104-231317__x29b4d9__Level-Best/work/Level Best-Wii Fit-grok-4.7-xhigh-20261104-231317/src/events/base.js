import { makeWorld, addGround, createDollBody, freeWorld, bodyCount, dollGroups, RAPIER, finiteVec } from '../physics/world.js';
import { freshBalance, balanceStep, checkFall, resetCore, tickTimers, pressFlail, tuneFrom, swayTorque, cobOf, difficultyOf, DEG } from '../physics/balancer.js';
import { spawnRagdoll, removeRagdoll, ragdollNan } from '../physics/ragdoll.js';
import { getTune } from '../core/tuning.js';
import { LANE_GAP } from '../data/config.js';

export { DEG };

export function laneSpec(i, kind = 'local', extra = {}) {
  return { id: i, kind, x: i * LANE_GAP, z: 0, ...extra };
}

/** Shared standing doll: foot joint, torque step, ragdoll, dispose. */
export class Standing {
  constructor(opts = {}) {
    this.tier = opts.tier ?? 1;
    this.lanes = (opts.lanes && opts.lanes.length ? opts.lanes : [laneSpec(0, 'local')]).map((lane, i) => ({
      id: lane.id ?? i,
      kind: lane.kind ?? 'local',
      x: lane.x ?? i * LANE_GAP,
      z: lane.z ?? 0,
      name: lane.name ?? 'Guest',
      colour: lane.colour ?? '#E8443A',
    }));
    this.states = this.lanes.map(() => freshBalance());
    this.dolls = [];
    this.rags = this.lanes.map(() => null);
    this.world = null;
    this.t = 0;
    this.done = false;
    this.god = !!opts.god;
    this.ph = opts.ph ?? 0.7;
    this.nan = false;
    this.difficulty = opts.difficulty ?? 'standard';
    this.bodiesAtBuild = 0;
    this.marginMul = 1;
    this.ankleOverride = null;
    this.reflexOverride = null;
  }

  tune(extra = {}) {
    const live = {
      maxLean: getTune('maxLean'),
      margin: getTune('margin'),
      zeta: getTune('zeta'),
      ankleMax: getTune('ankleMax'),
      reflex: getTune('reflex'),
      flailBoost: getTune('flailBoost'),
      fallAngle: getTune('fallAngle'),
      recoverTime: getTune('recoverTime'),
      swayScale: getTune('swayScale'),
    };
    const diff = difficultyOf(this.difficulty);
    return tuneFrom(live, {
      maxLean: extra.maxLean,
      margin: (extra.margin ?? live.margin) * this.marginMul,
      ankleMax: this.ankleOverride ?? extra.ankleMax ?? live.ankleMax,
      ankleMul: diff.ankleMul,
      reflex: this.reflexOverride ?? extra.reflex ?? live.reflex,
      disturbScale: diff.disturb * (extra.disturbScale ?? 1),
      swayScale: extra.swayScale ?? 1,
    });
  }

  buildWorld(iterations = 8, ground = 30) {
    this.world = makeWorld(iterations);
    addGround(this.world, ground);
    this.dolls = this.lanes.map((lane, i) => createDollBody(this.world, i, lane.x, lane.z));
    this.bodiesAtBuild = bodyCount(this.world);
  }

  stepCores(dt, extraTune, disturb) {
    this.t += dt;
    const tune = this.tune(extraTune);
    for (let i = 0; i < this.lanes.length; i++) {
      const state = this.states[i];
      tickTimers(state, dt);
      if (state.fallen) {
        if (this.rags[i] && state.recoverLeft <= 0) this.recover(i);
        continue;
      }
      const d = disturb ? disturb(i, this.t, state) : { nx: 0, nz: 0 };
      let shove = 0;
      if (state.gustLeft > 0) {
        shove = state.gustN || 0;
        state.gustLeft -= dt;
      }
      balanceStep(this.dolls[i].body, state, dt, tune, (d.nx || 0) + shove, d.nz || 0);
    }
    this.world.step();
    for (let i = 0; i < this.lanes.length; i++) {
      const state = this.states[i];
      const body = this.dolls[i].body;
      if (!finiteVec(body.translation())) this.nan = true;
      if (state.fallen) {
        if (this.rags[i] && ragdollNan(this.rags[i])) this.nan = true;
        continue;
      }
      if (checkFall(body, state, tune, this.god)) this.beginFall(i);
    }
    return tune;
  }

  beginFall(i) {
    const doll = this.dolls[i];
    this.rags[i] = spawnRagdoll(this.world, doll);
    doll.body.setEnabled(false);
    if (this.onFall) this.onFall(i);
  }

  recover(i) {
    if (this.rags[i]) removeRagdoll(this.world, this.rags[i]);
    this.rags[i] = null;
    resetCore(this.dolls[i], this.states[i]);
    if (this.onRecover) this.onRecover(i);
  }

  tryFlail(i) {
    return pressFlail(this.states[i], getTune('flailCooldown'));
  }

  cob(i) {
    return cobOf(this.states[i], getTune('maxLean'));
  }

  sway(i, amount, tremor) {
    const ph = this.ph + i * 1.3;
    return swayTorque(this.t, ph, amount, tremor);
  }

  dispose() {
    for (let i = 0; i < this.rags.length; i++) {
      if (this.rags[i] && this.world) removeRagdoll(this.world, this.rags[i]);
      this.rags[i] = null;
    }
    freeWorld(this.world);
    this.world = null;
    this.dolls = [];
  }

  addMass(i, mass, local) {
    const col = this.world.createCollider(
      RAPIER.ColliderDesc.ball(0.06).setMass(mass).setTranslation(local.x, local.y, local.z).setCollisionGroups(dollGroups(i)),
      this.dolls[i].body,
    );
    return col;
  }
}
