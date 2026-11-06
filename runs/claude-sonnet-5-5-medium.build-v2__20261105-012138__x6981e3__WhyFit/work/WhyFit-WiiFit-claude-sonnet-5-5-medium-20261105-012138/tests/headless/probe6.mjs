import { boot, go, play, wait } from '../../tools/lib-node.mjs';
const { app, engine } = await boot('title');
engine.step(30);
// idle on title 10 s -> attract
await wait(engine, 11);
console.log('attract?', app.attract && app.attract.i, app.scene.status(), engine.errors);
const seen = new Set();
await play(engine, () => { const id = app.scene?.constructor?.id + ':' + (app.scene?.actId ?? ''); if (!seen.has(id)) { seen.add(id); console.log(Math.round(engine.time), id); } return seen.size >= 13 || !app.attract; }, 400);
console.log('errors', engine.errors);
// any input exits
engine.input.setKey('KeyX', true); await wait(engine, 1); engine.input.setKey('KeyX', false);
await wait(engine, 3);
console.log('after input', app.attract, app.scene.status());
process.exit(0);
