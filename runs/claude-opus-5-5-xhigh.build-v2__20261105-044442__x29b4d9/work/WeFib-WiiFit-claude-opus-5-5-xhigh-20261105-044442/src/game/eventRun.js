import { h } from '../ui/dom.js';
import { EVENT_CLASSES } from '../events/index.js';
import { promptHTML } from '../input/glyphs.js';
import { diagram } from '../ui/diagrams.js';
import { TIER_NAMES } from '../data/events.js';
import { line } from '../data/dialogue.js';
import { showResults } from './results.js';
import { SPEAKERS } from '../ui/speech.js';

/**
 * Runs one event: Intro Card → instructor counts 3-2-1 → play → whistle → results.
 * opts: { id, tier, lanes, mode, config, onResult(ev, results) -> handled, onLeave, skipIntro, god, retry, seed }
 */
export class EventRun {
  constructor(game, opts) {
    this.game = game; this.opts = opts; this.name = 'event'; this.canPause = opts.mode !== 'attract' && opts.mode !== 'session';
    this.ev = null; this.handle = null; this.stage = 'intro';
  }
  enter() {
    const { game, opts } = this;
    const Cls = EVENT_CLASSES[opts.id];
    game.setIsland('hidden');
    game.fx.clear(); game.comic.clear(); game.speech.clear();
    this.ev = new Cls({ game, tier: opts.tier || 0, lanes: opts.lanes, mode: opts.mode || 'solo', config: opts.config, god: opts.god || game.god });
    game.currentEvent = this.ev;
    this.ev.build();
    game.sea.setLevel(this.ev.seaLevel);
    game.palette.set(this.ev.data.palette || opts.palette || game.programmePalette(), 1.5);
    game.focus(0, 0, 0, Math.max(14, 8 + this.ev.lanes.length * 3));
    this.ev.cameraShot(true);
    game.ui.clear();
    const hud = game.hud;
    hud.reset();
    if (this.ev.discs) hud.setDiscs(this.ev.lanes.filter((l) => l.kind !== 'bot' || opts.mode === 'attract').filter((l) => l.kind !== 'ghost'), this.ev.lanes.length > 1 && opts.mode !== 'session');
    hud.setPrompts(this.ev.data.verbs);
    this.ev.hudSetup(hud);
    if (opts.afterBuild) opts.afterBuild(this.ev);
    this.handle = game.scripts.run(this.flow());
  }
  *flow() {
    const { game, ev, opts } = this;
    if (!opts.skipIntro) {
      game.hud.show(false);
      this.stage = 'intro';
      let go = false;
      game.audio.music(ev.data.music, this.musicOpts());
      game.ui.only({
        name: 'intro',
        back: opts.onLeave ? () => this.leave() : null,
        build: (s) => {
          const d = ev.data;
          const tierName = TIER_NAMES[ev.tier];
          const card = h('div.intro.tag',
            h('div.diagram', { html: diagram(d.diagram) }),
            h('div',
              h('div.who', `${d.discipline} · ${SPEAKERS[d.instructor].name} · ${d.place}`),
              h('h2', d.title),
              h('p', d.line),
              h('p', d.can),
              h('p.cant', d.cant),
              h('p.who', { 'data-tier': '1' }, `${tierName} · Marbles if you finish`)));
          s.el.append(card);
          const row = h('div.row', { style: 'margin-top:1.6rem' });
          s.el.append(row);
          const verbEl = h('div.row', { style: 'gap:1.6rem' });
          row.append(verbEl);
          const render = () => { verbEl.innerHTML = d.verbs.map(([v, t]) => promptHTML(v, t, game.input.lastDevice, game.save.settings.glyphs)).join(''); };
          render();
          s.def.update = null;
          s.updateFn = () => { if (s.lastDev !== game.input.lastDevice) { s.lastDev = game.input.lastDevice; render(); } };
          s.el.append(s.item(h('div', { style: 'margin-top:1.6rem' }, 'Begin'), { use: () => { go = true; } }));
        },
      });
      yield () => go;
      game.ui.clear();
    }
    this.stage = 'countdown';
    game.hud.show(true);
    ev.cameraShot(false);
    if (ev.intro3d) yield* ev.intro3d();
    if (!opts.skipCountdown) {
      for (const n of ['3', '2', '1']) {
        game.hud.flash(n, 0.7);
        game.audio.sfx('metronome', { vel: 1 });
        yield 0.7;
      }
      game.hud.flash('Begin', 0.6);
      game.audio.sfx('bell');
    }
    if (opts.manualBegin) return;
    this.stage = 'play';
    ev.begin();
    if (opts.afterBegin) opts.afterBegin(ev);
    if (!ev.ownsMusic) game.audio.music(ev.data.music, this.musicOpts());
    yield () => this.forceEnd || ev.isDone();
    this.stage = 'whistle';
    ev.phase = 'done';
    game.audio.sfx('whistle');
    game.hud.flash(ev.endWord || 'Time!', 1.2);
    if (ev.outro3d) yield* ev.outro3d();
    yield 1.2;
    const results = ev.lanes.filter((l) => l.kind !== 'ghost').map((l) => ({ lane: l, ...ev.laneResult(l) }));
    this.results = results;
    this.stage = 'results';
    game.hud.show(false);
    if (opts.onResult) yield* opts.onResult(ev, results, this);
  }
  musicOpts() { return this.ev.musicOpts ? this.ev.musicOpts() : {}; }
  /** Dev Mode: jump to Results. */
  skip() { this.forceEnd = true; if (this.ev.phase !== 'play') this.ev.phase = 'play'; }
  restart() {
    const { game, opts } = this;
    game.setMode(new EventRun(game, { ...opts }), 'event');
  }
  leave() {
    const { opts } = this;
    if (opts.onLeave) opts.onLeave();
  }
  exit() {
    const { game, ev } = this;
    if (this.handle) this.handle.cancel();
    game.hud.show(false);
    game.hud.reset();
    game.speech.clear();
    if (ev) { ev.dispose(); }
    game.currentEvent = null;
    game.ui.clear();
  }
  fixed(dt) { this.ev.fixed(dt); }
  frame(dt) { this.ev.frame(dt); }
}
