export const CSS = `
:root {
  color-scheme: dark;
  --ink: #101218;
  --paper: #f6f1e6;
  --blue: #3d7cff;
  --orange: #ff7424;
  --line: rgba(246, 241, 230, 0.85);
}
html, body {
  margin: 0;
  height: 100%;
  overflow: hidden;
  background: #101218;
  color: var(--paper);
  font-family: Impact, "Arial Narrow", "Arial Black", sans-serif;
}
#view { display: block; }
#ui, #hud, #gate, #notice {
  position: fixed;
  inset: 0;
}
#ui, #hud { pointer-events: none; }
button, textarea { pointer-events: auto; font: inherit; color: inherit; }
.panel {
  position: absolute;
  left: 4vw;
  top: 6vh;
  bottom: 5vh;
  width: min(46vw, 760px);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1.2vh;
  padding: 2vh 2vw;
  background: linear-gradient(90deg, rgba(8, 10, 16, 0.82), rgba(8, 10, 16, 0.28) 80%, transparent);
}
h1 {
  margin: 0;
  font-size: 9vh;
  line-height: 0.86;
  letter-spacing: 0.02em;
}
.kicker {
  margin: 0 0 1vh;
  font-size: 2.5vh;
  letter-spacing: 0.22em;
}
button.item, button.back {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: 0.45vh solid transparent;
  border-radius: 1.2vh;
  padding: 0.7vh 1.6vh;
  font-size: 4.4vh;
  letter-spacing: 0.04em;
  cursor: pointer;
}
button.item.selected, button.item:focus-visible {
  border-color: var(--line);
  background: rgba(255, 255, 255, 0.08);
}
.gate-copy {
  font-size: 5.4vh;
  line-height: 1.05;
  max-width: 12em;
  margin: 0 0 2vh;
}
#hud .board {
  position: absolute;
  top: 2vh;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 3vw;
  font-size: 8vh;
  line-height: 1;
  text-shadow: 0 0.4vh 0 #000;
}
#hud .blue { color: var(--blue); }
#hud .orange { color: var(--orange); }
#hud .clock { min-width: 3ch; text-align: center; }
#call {
  position: absolute;
  top: 16vh;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 13vh;
  letter-spacing: 0.06em;
  text-shadow: 0 0.5vh 0 #000, 0 0 2vh rgba(0, 0, 0, 0.6);
}
.boosts { position: absolute; inset: 0; }
.meter {
  position: absolute;
  width: min(28vw, 360px);
  height: 2.4vh;
  border: 0.35vh solid var(--paper);
  background: rgba(0, 0, 0, 0.45);
}
.meter > span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #ffe08a, #ff8a1e);
  width: 0%;
}
.meter b {
  position: absolute;
  left: 0;
  bottom: 2.8vh;
  font-size: 2.2vh;
  font-weight: normal;
  letter-spacing: 0.08em;
}
.credits, .help, .status, label.field {
  font-family: "Segoe UI", "Helvetica Neue", sans-serif;
  font-weight: 650;
}
.credits, .help {
  white-space: pre-wrap;
  overflow: auto;
  max-height: 62vh;
  font-size: 2vh;
  line-height: 1.35;
  background: rgba(0, 0, 0, 0.35);
  padding: 1.4vh 1.2vw;
}
label.field { display: flex; flex-direction: column; gap: 0.6vh; font-size: 2.4vh; letter-spacing: 0.08em; }
textarea {
  width: 100%;
  height: 14vh;
  box-sizing: border-box;
  background: #0c0e14;
  border: 0.3vh solid var(--line);
  border-radius: 0.8vh;
  padding: 0.8vh;
  font-family: ui-monospace, monospace;
  font-size: 1.5vh;
  resize: none;
}
#notice, #blocker {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #101218;
  z-index: 5;
  text-align: center;
  padding: 6vh;
}
#notice p, #blocker p { font-size: 3.4vh; max-width: 22em; line-height: 1.3; }
.attract-tag {
  position: absolute;
  left: 3vw;
  bottom: 3vh;
  font-size: 3vh;
  letter-spacing: 0.14em;
}
`;
