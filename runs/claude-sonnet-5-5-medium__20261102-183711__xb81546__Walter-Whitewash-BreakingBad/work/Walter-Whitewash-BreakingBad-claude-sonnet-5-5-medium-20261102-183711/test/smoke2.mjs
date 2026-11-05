import { load } from './_load.mjs';
const { d, game } = load();
game.go('play', { fresh: true }); game.advance(1);
console.log('talk pages sample:', JSON.stringify(d.talk.pages && d.talk.pages[0]) + ' open=' + d.talk.open);
// skip intro dialogue
for (let i=0;i<40;i++){ game.input.tap('confirm'); game.advance(.3); }
console.log(JSON.stringify(game.debug.snapshot()));
game.input.hold('right'); game.advance(2); game.input.hold('right', false);
console.log(JSON.stringify(game.debug.snapshot()), game.errors.map(e=>e.message));
for (const st of d.stations()) console.log(st.id, Math.round(st.x), Math.round(st.y));
