import * as THREE from 'three/webgpu';
import { esc } from '../ui/dom.js';
import { TITLE } from '../data/config.js';
export function install(game) {
  const S = game.screens, ui = game.ui, audio = game.audio;
  game.playEnding = () => {
    const p = game.profile; p.levelled = true; p.met = Array.from(new Set([...(p.met || []), ...game.programmeDays().flatMap((d) => d.classes)])); game.persist();
    game.wipe(() => game.go('ending'), 0.5);
  };
  S.ending = {
    enter() {
      game.setScene('island', { palette: 'golden', music: 'level' }); const isl = game.island; isl.restTarget = 0; isl.setTiltStatic(0); isl.setLevel(1); isl.setMarbles(game.profile.marbleList || []); this.t = 0; this.stage = 0; ui.set(''); game.audio.sfx('creak');
      game.run(function* () {
        yield 2; yield game.say('trudy', game.line('trudy', 'ending')); audio.sfx('reveal'); yield game.say('trudy', "My bubble. It's in the middle. It has never been in the middle."); yield 1;
        S.ending.credits = true; yield 16; S.ending.credits = false; ui.set(''); yield game.say('trudy', "It's quite flat, isn't it? ...Same time tomorrow?");
        game.profile.day++; game.profile.doneToday = []; game.profile.checkedIn = false; (game.profile.calendar = game.profile.calendar || []).push(game.profile.day - 1); game.persist(); game.wipe(() => game.go('island', { fresh: true }));
      });
    },
    fixed(dt) {
      this.t += dt; if (this.credits && !this.shown) { this.shown = true; ui.set(`<div class="center" style="height:100%"><div id="cr" class="paper mid" style="width:70vw;text-align:center;transform:translateY(40vh)">${esc(TITLE)}<br><br>A level island, finally.<br><br>Trudy · Ms. Stillwater · Coach Bolster<br>Gentle Margaret · Retired Kevin · Both Sandras<br>Unsteady Paul · Young Gerald · Gary<br><br>Made with Three.js, Rapier and a great deal of wobble.<br>Fredoka by Hafontia, SIL OFL.<br><br>Thank you for standing.</div></div>`); } if (this.shown) { const c = document.getElementById('cr'); if (c) c.style.transform = `translateY(${40 - Math.min(110, (this.t - 6) * 8)}vh)`; if (!this.credits && this.shown) this.shown = false; }
    },
    frame(dt) { const a = this.t * 0.12; const c = game.gfx.camera; c.position.set(Math.sin(a) * 34, 8 + Math.sin(a * 2) * 2, Math.cos(a) * 34); c.lookAt(0, 4, 0); game.island.frame(dt); },
    nav() { }, exit() { this.shown = false; },
  };
}
