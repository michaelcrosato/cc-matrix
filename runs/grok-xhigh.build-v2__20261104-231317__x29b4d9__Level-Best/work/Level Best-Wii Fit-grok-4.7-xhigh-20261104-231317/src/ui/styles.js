export const CSS = `
:root { color: #1A1420; font-family: Fredoka, "Trebuchet MS", sans-serif; }
html, body { margin: 0; height: 100%; background: #8FB4E0; overflow: hidden; }
body * { font-size: 36px; }
canvas, .bg { position: fixed; inset: 0; width: 100%; height: 100%; display: block; z-index: 0; }
#boot-line { position: fixed; inset: 5%; z-index: 3; font-size: 48px; pointer-events: none; }
#ui { position: fixed; inset: 5%; z-index: 2; box-sizing: border-box; padding: 28px 40px; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none; font-size: 36px; line-height: 1.25; overflow: hidden; }
#ui button, #ui input, #ui .hit { pointer-events: auto; font: inherit; font-size: 36px; color: #1A1420; }
h1, h2, p, li, button, label, span, input { font-size: 36px; }
h1 { font-size: 84px; margin: 0; line-height: 1; }
h2 { font-size: 54px; margin: 0 0 8px; line-height: 1.1; }
p { margin: 2px 0; }
button, .choice {
  box-sizing: border-box; display: block; width: 100%; text-align: left; margin: 4px 0; padding: 8px 18px;
  background: #fff6e4; border: 4px solid #1A1420; border-radius: 14px;
  transform: rotate(-0.4deg); box-shadow: 4px 4px 0 #1A1420;
}
button.is-focus, input.is-focus, button:focus-visible, input:focus-visible {
  outline: 6px solid #F5B700; outline-offset: 3px; transform: rotate(0.4deg);
}
.row { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; }
.tag { background: #fff6e4; border: 3px solid #1A1420; border-radius: 12px; padding: 8px 14px; display: inline-block; }
.speech { background: #fffdf6; border: 4px solid #1A1420; border-radius: 16px; padding: 16px 20px; max-width: 70%; }
.hud { display: flex; justify-content: space-between; align-items: flex-start; }
.score { font-size: 64px; }
.time { font-size: 42px; }
.disc { width: 140px; height: 140px; border: 4px solid #1A1420; border-radius: 50%; background: #efe7da; position: relative; }
.dot { width: 22px; height: 22px; border-radius: 50%; background: #E8443A; position: absolute; left: 50%; top: 50%; }
.prompts { display: flex; gap: 18px; align-items: center; }
.prompts svg { width: 36px; height: 36px; }
input[type="range"] { box-sizing: border-box; width: 100%; height: 36px; accent-color: #E8443A; }
.pages { font-size: 30px; }
.hidden { display: none; }
.card-name { font-size: 36px; margin: 4px 0; }
`;
