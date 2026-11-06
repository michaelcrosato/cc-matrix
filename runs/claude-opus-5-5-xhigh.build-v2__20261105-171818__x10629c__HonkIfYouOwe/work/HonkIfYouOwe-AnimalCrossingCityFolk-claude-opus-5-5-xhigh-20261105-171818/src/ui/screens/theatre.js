// The Palace Theatre: a short sketch per visit. Press Laugh on the punchline to learn an emote.
import { panel, drawText, dim, textBlock, bar } from '../draw.js';
import { Stream } from '../../core/rng.js';

export const SKETCHES = [
  { setup: ['Knock knock.', "Who's there?", 'The tax office.', 'The tax office who?'], punch: 'NO. WE ask the questions.' },
  { setup: ['Doctor, doctor!', "I think I'm a goose.", 'How long has this been going on?', 'Since I was an egg.'], punch: 'That will be forty beans.' },
  { setup: ['To be, or not to be.', 'I said: to be, or not to be.', 'Sir, this is a queue.', 'Very well. Which one is it for?'], punch: 'To be. It\'s always to be. It\'s the only window open.' },
  { setup: ['My horse! My horse!', 'My kingdom for a horse!', 'We have a llama, sir.', 'Does it know the way to Bosworth?'], punch: 'It knows the way. It would prefer not.' },
  { setup: ["Alas, poor Morris!", 'I knew him, Horatio.', 'That is a turnip, sir.'.replace('turnip', 'potato'), 'I knew him well.'], punch: 'It has his eyes.' },
  { setup: ['Is this a dagger I see before me?', 'No, my lord. It is a very long spoon.', 'Does it have a point?', 'That is what I keep asking the playwright.'], punch: 'He says the soup is the point.' },
];
class Theatre {
  constructor(g, onDone) {
    this.id = 'theatre';
    this.onDone = onDone;
    this.s = new Stream(`${g.world.seed}:sketch:${g.world.clock.day}`).pick(SKETCHES);
    this.line = 0;
    this.t = 0;
    this.state = 'setup';
    this.result = null;
    this.window = 0;
  }
  currentText() { return this.state === 'punch' ? this.s.punch : this.s.setup[this.line] ?? ''; }
  update(g, inp, dt) {
    this.t += dt;
    const press = inp.confirm || inp.mouse.click;
    const bellows = g.actorOf('bellows');
    if (this.state === 'setup') {
      if (this.t > 1.6) { this.t = 0; this.line++; if (bellows) bellows.play(this.line % 2 ? 'Talk' : 'Bow', 0.1, { once: true }); if (this.line >= this.s.setup.length) { this.state = 'punch'; this.t = 0; g.sound('uiTab'); } }
      if (press) { this.state = 'done'; this.result = { won: false, early: true }; this.t = 0; g.sound('uiCancel'); g.events.emit('laughed', { hit: false }); }
    } else if (this.state === 'punch') {
      // The laugh only lands while the punchline hangs in the air.
      if (press) { this.state = 'done'; this.result = { won: true }; this.t = 0; g.sound('applause'); g.sound('laugh'); g.player.play('Laugh', 0.05, { once: true }); if (bellows) bellows.play('Bow', 0.1, { once: true }); g.events.emit('laughed', { hit: true }); }
      if (this.t > 2.4) { this.state = 'done'; this.result = { won: false }; this.t = 0; g.events.emit('laughed', { hit: false }); }
    } else if (this.t > 1.1) { g.ui.pop(this); this.onDone(this.result); }
  }
  prompts() { return this.state === 'done' ? null : [['confirm', 'LAUGH']]; }
  draw(g, hud) {
    panel(hud, 60, 196, 360, 40, { fill: 'white', trim: 'red' });
    const text = this.state === 'done' ? (this.result.won ? 'The house comes down. It is only you, but still.' : 'A long silence. Somebody coughs in another room.') : this.currentText();
    textBlock(hud, 72, 204, 336, text, { color: this.state === 'punch' ? 'red' : 'ink' });
    if (this.state === 'punch') bar(hud, 72, 228, 336, 3, 1 - this.t / 2.4, 'red');
  }
}
export const theatreScreen = (g, onDone) => new Theatre(g, onDone);
export { dim, drawText };
