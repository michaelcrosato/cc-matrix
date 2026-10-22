// In-game About & Credits body. Built from the same source text that goes into the file's HTML comment.
import SOURCE_INFO from './source-info.txt';

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const ABOUT_HTML = `
  <div class="about">
    <p class="lead">Starfock 64 is an original spiritual successor to Starfox 64 for the Nintendo 64. It is a demo built to show the complete game loop: flight, lock-on, bombs, barrel rolls, ring gates, boss phases, attract mode and settings.</p>
    <h2>Controls</h2>
    <ul class="controls">
      <li><b>Left stick / arrows</b> Fly</li>
      <li><b>Cross / Space</b> Laser (hold for rapid fire)</li>
      <li><b>Square / K</b> Hold to lock on, release to fire missiles</li>
      <li><b>Circle / Q or E</b> Barrel roll (deflects shots)</li>
      <li><b>L2 hold / Shift</b> Boost, <b>L1 hold / Ctrl</b> Brake</li>
      <li><b>Triangle / B</b> Smart bomb</li>
      <li><b>Options / Esc</b> Pause</li>
    </ul>
    <pre class="info">${escape(SOURCE_INFO)}</pre>
  </div>`;
