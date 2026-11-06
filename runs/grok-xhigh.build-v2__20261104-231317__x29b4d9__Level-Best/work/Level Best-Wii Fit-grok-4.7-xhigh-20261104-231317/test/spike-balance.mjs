import { initRapier, makeWorld, addGround, createDollBody, freeWorld, RAPIER } from '../src/physics/world.js';
import { freshBalance, balanceStep, checkFall, resetCore, readLean, DEG } from '../src/physics/balancer.js';
import { spawnRagdoll, removeRagdoll, ragdollNan } from '../src/physics/ragdoll.js';

const DT = 1 / 120;
const tune = { maxLean: 18, margin: 0.45, zeta: 0.4, ankleMax: 4.6, reflex: 10, flailBoost: 1.9, fallAngle: 45, recoverTime: 2.2, swayScale: 1, disturbScale: 1 };

await initRapier();

function run({ seconds, wishX = 0, wishZ = 0, nx = 0, nz = 0, gustFor = 0.5, gustAt = 0.2, mass = 0, massY = 1.2, flailWhen = null, sample = 0.5 }) {
  const world = makeWorld(8);
  addGround(world);
  const doll = createDollBody(world, 0, 0, 0);
  if (mass > 0) {
    world.createCollider(
      RAPIER.ColliderDesc.ball(0.08).setMass(mass).setTranslation(0, massY, 0).setCollisionGroups(0),
      doll.body,
    );
  }
  const state = freshBalance();
  let peak = 0;
  let fellAt = null;
  const samples = [];
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) {
    const t = i * DT;
    state.wishX = wishX;
    state.wishZ = wishZ;
    const gustOn = nx !== 0 && t >= gustAt && t < gustAt + gustFor;
    if (flailWhen && flailWhen(state, t) && state.flailCool <= 0 && state.flailLeft <= 0) {
      state.flailLeft = 0.35;
      state.flailCool = 2;
    }
    if (state.flailLeft > 0) state.flailLeft = Math.max(0, state.flailLeft - DT);
    if (state.flailCool > 0) state.flailCool = Math.max(0, state.flailCool - DT);
    if (!state.fallen) balanceStep(doll.body, state, DT, tune, gustOn ? nx : 0, gustOn ? nz : 0);
    world.step();
    const lean = readLean(doll.body);
    peak = Math.max(peak, Math.abs(lean.leanX));
    if (i % Math.round(sample / DT) === 0) samples.push(Number((lean.leanX / DEG).toFixed(2)));
    if (!state.fallen && checkFall(doll.body, state, tune)) fellAt = Number(t.toFixed(3));
    if (state.fallen) break;
  }
  const end = readLean(doll.body);
  freeWorld(world);
  return { peak: Number((peak / DEG).toFixed(2)), end: Number((end.leanX / DEG).toFixed(2)), fellAt, falls: state.falls, samples };
}

const rest = run({ seconds: 2, nx: 0, gustFor: 0 });
const full = run({ seconds: 6, wishX: 1, sample: 0.5 });
const gust2 = run({ seconds: 2, nx: 2 });
const gust25 = run({ seconds: 2, nx: 2.5 });
const gust3 = run({ seconds: 2, nx: 3 });
const gust35 = run({ seconds: 2, nx: 3.5 });
const loaded = run({ seconds: 2, nx: 2, mass: 0.2, massY: 1.15 });
const early = run({ seconds: 2.5, nx: 3.5, flailWhen: (_s, t) => t >= 0.2 && t < 0.22 });
const timed = run({ seconds: 2.5, nx: 3.5, flailWhen: (s, t) => t > 0.25 && !s.fallen && Math.abs(s.leanX) > 28 * DEG });
const brace = run({ seconds: 2, nx: 3, wishX: -0.6 });

console.log(JSON.stringify({ rest, full, gust2, gust25, gust3, gust35, loaded, early, timed, brace }, null, 2));

// fall and recover
{
  const world = makeWorld(8);
  addGround(world);
  const doll = createDollBody(world, 0, 0, 0);
  const state = freshBalance();
  let rag = null;
  let refell = 0;
  for (let i = 0; i < Math.round(6 / DT); i++) {
    const t = i * DT;
    if (state.flailLeft > 0) state.flailLeft = Math.max(0, state.flailLeft - DT);
    if (!state.fallen) {
      balanceStep(doll.body, state, DT, tune, t < 0.8 ? 8 : 0, 0);
      world.step();
      if (checkFall(doll.body, state, tune)) {
        rag = spawnRagdoll(world, doll);
        doll.body.setEnabled(false);
      }
    } else if (rag) {
      world.step();
      if (state.recoverLeft > 0) state.recoverLeft -= DT;
      if (state.recoverLeft <= 0) {
        removeRagdoll(world, rag);
        rag = null;
        resetCore(doll, state);
        world.step();
      }
    } else {
      state.wishX = 0;
      balanceStep(doll.body, state, DT, tune, 0, 0);
      world.step();
      if (checkFall(doll.body, state, tune)) refell += 1;
    }
  }
  console.log('recover', { falls: state.falls, refell, fallen: state.fallen, nan: ragdollNan(rag), lean: readLean(doll.body).tilt / DEG });
  freeWorld(world);
}
