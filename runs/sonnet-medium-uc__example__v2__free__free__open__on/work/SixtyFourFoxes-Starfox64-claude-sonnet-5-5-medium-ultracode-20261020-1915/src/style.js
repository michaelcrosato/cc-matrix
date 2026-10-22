export const CSS = `
:root{--ink:#0a1020;--panel:rgba(10,18,40,.86);--cy:#7cf3ff;--or:#ff8a3a;--ye:#ffd34a;--red:#ff4a6a;--gr:#5fe38a;--fg:#f2f6ff;--u:min(1vw,1.78vh)}
#ui{position:fixed;inset:0;z-index:5;font-family:"Rajdhani","Trebuchet MS","Segoe UI",system-ui,sans-serif;color:var(--fg);pointer-events:none;user-select:none;font-size:calc(var(--u)*1.7)}
#ui *{box-sizing:border-box}
.hidden{display:none!important}
.hud{position:absolute;inset:0;font-weight:700;text-shadow:0 2px 0 #000,0 0 6px #000}
.hud .top-bar{position:absolute;left:0;right:0;top:0;height:calc(var(--u)*.5);background:rgba(0,0,0,.4)}
.progress i{display:block;height:100%;background:linear-gradient(90deg,var(--cy),var(--or));width:0}
.tl{position:absolute;left:calc(var(--u)*3);top:calc(var(--u)*2.4)}
.lbl{font-size:calc(var(--u)*1.6);letter-spacing:.2em;color:var(--cy)}
.shield{position:relative;height:calc(var(--u)*2.4);width:240px;background:#06101e;border:3px solid #000;border-radius:6px;box-shadow:0 0 0 2px var(--cy);overflow:hidden;transform:skewX(-12deg)}
.shield i{display:block;height:100%;background:linear-gradient(180deg,#9bffa8,#2fcf6a);transition:width .15s}
.shield.low i{background:linear-gradient(180deg,#ffb0a0,#ff3a3a);animation:blink .5s infinite}
.shield b{display:none}
@keyframes blink{50%{opacity:.45}}
.subrow{display:flex;gap:calc(var(--u)*1.6);margin-top:calc(var(--u)*.8);align-items:center}
.bombs span{font-size:calc(var(--u)*2.2);color:#2a3550;margin-right:2px}.bombs span.on{color:var(--or);text-shadow:0 0 8px var(--or),0 2px 0 #000}
.bombs em{font-style:normal;font-size:calc(var(--u)*1.2);color:#9fb0d0;margin-left:6px;letter-spacing:.15em}
.laser{font-size:calc(var(--u)*1.3);padding:2px 10px;background:#06101e;border:2px solid var(--cy);border-radius:4px;color:var(--cy);letter-spacing:.12em}.laser[data-lv="1"]{color:#8aff9a;border-color:#8aff9a}.laser[data-lv="2"]{color:var(--ye);border-color:var(--ye)}
.tr{position:absolute;right:calc(var(--u)*3);top:calc(var(--u)*2.2);text-align:right}
.score{font-size:calc(var(--u)*4.4);font-style:italic;font-weight:800;letter-spacing:.04em;font-variant-numeric:tabular-nums}
.kills{font-size:calc(var(--u)*2.2);color:var(--ye)}.kills span{font-size:calc(var(--u)*1.3);color:#fff;letter-spacing:.18em}
.combo{font-size:calc(var(--u)*1.6);color:var(--or);height:calc(var(--u)*2)}
.objective{position:absolute;left:50%;top:calc(var(--u)*2.4);transform:translateX(-50%);max-width:34vw;text-align:center;font-size:calc(var(--u)*1.5);color:var(--ye);letter-spacing:.08em;text-transform:uppercase}
.hint{position:absolute;left:50%;top:calc(var(--u)*9.5);transform:translateX(-50%);background:var(--panel);border:3px solid var(--cy);padding:calc(var(--u)*1) calc(var(--u)*2.4);border-radius:10px;font-size:calc(var(--u)*2);text-align:center;max-width:46vw}
kbd{display:inline-block;min-width:1.6em;padding:0 .45em;margin:0 .1em;background:#fff;color:#0a1020;border-radius:.4em;border:2px solid #000;text-shadow:none;font-family:inherit;box-shadow:0 2px 0 #000}
.bossbar{position:absolute;left:50%;top:calc(var(--u)*5);transform:translateX(-50%);width:44vw;text-align:center}
.bn{font-size:calc(var(--u)*1.8);letter-spacing:.3em;color:var(--red)}
.bb{height:calc(var(--u)*1.6);background:#1a0a14;border:3px solid #000;box-shadow:0 0 0 2px var(--red);transform:skewX(-14deg);overflow:hidden}.bb i{display:block;height:100%;background:linear-gradient(180deg,#ff9aa8,#ff3a5a);transition:width .2s}
.allies{position:absolute;left:calc(var(--u)*3);top:calc(var(--u)*14);display:flex;flex-direction:column;gap:calc(var(--u)*.7)}
.ally{display:flex;align-items:center;gap:8px;font-size:calc(var(--u)*1.4);color:var(--c);letter-spacing:.12em}.ally .ab{width:calc(var(--u)*9);height:calc(var(--u)*.9);background:#06101e;border:2px solid #000;box-shadow:0 0 0 1px var(--c)}.ally .ab i{display:block;height:100%;background:var(--c)}
.ally em{font-style:normal;color:#fff;background:var(--red);padding:0 6px;border-radius:3px;animation:blink .45s infinite}.ally.gone{opacity:.45}
.comm{position:absolute;left:calc(var(--u)*3);bottom:calc(var(--u)*3);display:flex;gap:calc(var(--u)*1.4);width:min(48vw,calc(var(--u)*58));background:var(--panel);border:3px solid var(--c,#7cf3ff);border-radius:12px;padding:calc(var(--u)*1.1);animation:slidein .25s}
.face{width:calc(var(--u)*9);height:calc(var(--u)*9);flex:none;border-radius:8px;overflow:hidden;border:2px solid #000}
.cname{font-size:calc(var(--u)*1.4);letter-spacing:.2em}.cbody{font-size:calc(var(--u)*2.1);line-height:1.2;margin-top:4px;min-height:2.4em}
@keyframes slidein{from{transform:translateX(-30px);opacity:0}}
.boostwrap{position:absolute;right:calc(var(--u)*3);bottom:calc(var(--u)*2.6);width:calc(var(--u)*24);text-align:center}
.boost{height:calc(var(--u)*1.1);background:#06101e;border:3px solid #000;box-shadow:0 0 0 2px #fff6;transform:skewX(-20deg);overflow:hidden}.boost i{display:block;height:100%;background:linear-gradient(90deg,#ffd34a,#ff7a3a)}.boost.lock i{background:#7a3a3a}
.blabel{font-size:calc(var(--u)*1.1);letter-spacing:.3em;color:#cfe;opacity:.8}
.ret{position:absolute;pointer-events:none;transform:translate(-50%,-50%);display:none}
.ret.near{width:calc(var(--u)*3);height:calc(var(--u)*3);border:3px solid var(--cy);border-radius:50%;box-shadow:0 0 8px var(--cy)}
.ret.far{width:calc(var(--u)*7);height:calc(var(--u)*7)}.ret.far svg{width:100%;height:100%;stroke:var(--cy);stroke-width:4;fill:none;filter:drop-shadow(0 0 4px var(--cy))}.ret.far .chg{stroke:var(--ye);stroke-dasharray:188;stroke-dashoffset:188;transform:rotate(-90deg);transform-origin:50% 50%;stroke-width:6}
.ret.far.charging svg{stroke:var(--ye)}
.lock{position:absolute;width:calc(var(--u)*6);height:calc(var(--u)*6);border:3px solid var(--red);transform:translate(-50%,-50%) rotate(45deg);box-shadow:0 0 10px var(--red);animation:lk .25s}
@keyframes lk{from{transform:translate(-50%,-50%) rotate(135deg) scale(2);opacity:0}}
.fx-flash{position:absolute;inset:0;opacity:0}.fx-flash.damage.go{animation:fd .5s}.fx-flash.heal.go{animation:fh .5s}.fx-flash.bomb.go{animation:fb .8s}
@keyframes fd{0%{opacity:.7;background:radial-gradient(transparent 30%,#f00)}100%{opacity:0}}@keyframes fh{0%{opacity:.5;background:radial-gradient(transparent 40%,#5fe38a)}100%{opacity:0}}@keyframes fb{0%{opacity:.9;background:#fff}100%{opacity:0}}
.warn{position:absolute;left:50%;top:30%;transform:translateX(-50%);font-size:calc(var(--u)*4);color:var(--red);font-style:italic;letter-spacing:.1em;animation:blink .3s infinite}
.tail{position:absolute;left:50%;top:70%;transform:translateX(-50%);font-size:calc(var(--u)*3);color:var(--red);animation:blink .3s infinite}
.arena{position:absolute;left:50%;top:22%;transform:translateX(-50%);font-size:calc(var(--u)*3);color:var(--or);animation:blink .5s infinite}
.banner{position:absolute;left:0;right:0;top:34%;text-align:center;animation:ban 3s both;background:linear-gradient(90deg,transparent,rgba(5,10,25,.8) 20%,rgba(5,10,25,.8) 80%,transparent);padding:calc(var(--u)*1.4) 0}
.b1{font-size:calc(var(--u)*7);font-style:italic;font-weight:800;letter-spacing:.12em;color:#fff;text-shadow:0 4px 0 var(--or),0 0 20px #000}.b2{font-size:calc(var(--u)*2.4);letter-spacing:.3em;color:var(--cy)}
@keyframes ban{0%{opacity:0;transform:scale(1.3)}12%{opacity:1;transform:scale(1)}85%{opacity:1}100%{opacity:0}}
.toast{position:absolute;left:50%;top:60%;transform:translateX(-50%);font-size:calc(var(--u)*3);color:var(--ye);font-style:italic;animation:ts 1.7s both;letter-spacing:.1em}
@keyframes ts{0%{opacity:0;transform:translate(-50%,10px)}10%{opacity:1;transform:translate(-50%,0)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-10px)}}
.pop{position:absolute;transform:translate(-50%,-50%);font-size:calc(var(--u)*2.2);color:var(--ye);animation:pp .9s both}
@keyframes pp{to{transform:translate(-50%,-220%);opacity:0}}
.radarwrap{position:absolute;right:calc(var(--u)*3);bottom:calc(var(--u)*8);text-align:center}.radarwrap canvas{width:calc(var(--u)*17);height:calc(var(--u)*17)}.rleft{font-size:calc(var(--u)*1.5);color:#ff9aa8;letter-spacing:.15em}
.demo{position:absolute;left:50%;top:calc(var(--u)*12);transform:translateX(-50%);white-space:nowrap;font-size:calc(var(--u)*2.4);background:rgba(0,0,0,.6);padding:.2em .8em;border-radius:8px;animation:blink 1.2s infinite;letter-spacing:.12em}.demo b{color:var(--red)}
/* ---------- menus ---------- */
.screen{position:absolute;inset:0;display:flex;pointer-events:auto}
.screen.dim{background:radial-gradient(ellipse at 30% 50%,rgba(6,12,30,.88),rgba(6,12,30,.55) 60%,rgba(6,12,30,.25))}
.panel{margin:auto 0 auto calc(var(--u)*7);width:min(46vw,calc(var(--u)*56));max-height:92vh;display:flex;flex-direction:column;padding-bottom:calc(var(--u)*3.4)}
.panel>.card{flex:0 1 auto;overflow:auto;min-height:0;scrollbar-width:thin}
.panel.rowitems .items{flex-direction:row;flex-wrap:wrap;overflow:visible;margin-top:calc(var(--u)*1.2)}.panel.rowitems .item{flex:1 1 28%;justify-content:center}
.panel.wide{width:min(70vw,calc(var(--u)*90));margin:auto}
.panel.center{margin:auto;text-align:center;align-items:center}
.logo{font-style:italic;font-weight:900;font-size:calc(var(--u)*6.2);white-space:nowrap;line-height:.92;letter-spacing:.02em;text-transform:uppercase;color:#fff;text-shadow:0 .06em 0 var(--or),0 .12em 0 #000,0 0 30px rgba(0,0,0,.8);transform:skewX(-8deg);margin-bottom:calc(var(--u)*.6)}
.logo small{display:block;white-space:nowrap;font-size:.25em;letter-spacing:.2em;color:var(--cy);text-shadow:0 2px 0 #000;margin-top:.5em}
.title-h{font-size:calc(var(--u)*4);font-weight:800;font-style:italic;letter-spacing:.1em;text-transform:uppercase;margin-bottom:calc(var(--u)*1.4);text-shadow:0 .07em 0 var(--or),0 .13em 0 #000;transform:skewX(-8deg)}
.items{display:flex;flex-direction:column;gap:calc(var(--u)*.7);overflow:auto;padding:6px 10px 6px 4px;scrollbar-width:none}
.item{display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--panel);border:3px solid #000;border-left:calc(var(--u)*.9) solid #3a4a6e;padding:calc(var(--u)*.65) calc(var(--u)*1.8);border-radius:6px;font-size:calc(var(--u)*2.2);font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;transform:skewX(-8deg);transition:transform .08s}
.item>*{transform:skewX(8deg)}
.item.focus{background:linear-gradient(90deg,#ff8a3a,#ffb35a);color:#0a1020;border-left-color:#fff;transform:skewX(-8deg) translateX(calc(var(--u)*1.2));box-shadow:0 0 0 3px #fff,0 8px 24px rgba(255,138,58,.4)}
.item.disabled{opacity:.4}
.item .sub{font-size:.55em;opacity:.8;letter-spacing:.05em;text-transform:none;display:block}
.item .val{font-size:.9em;color:var(--cy);min-width:6em;text-align:right}.item.focus .val{color:#0a1020}
.slider{position:relative;width:calc(var(--u)*18);height:calc(var(--u)*1.3);background:#06101e;border:2px solid #000;border-radius:4px;overflow:hidden}.slider i{display:block;height:100%;background:var(--cy)}.item.focus .slider i{background:#0a1020}
.sect{font-size:calc(var(--u)*1.5);letter-spacing:.3em;color:var(--cy);margin:calc(var(--u)*.6) 0 0 calc(var(--u)*1);text-transform:uppercase}
.tabs{display:flex;gap:calc(var(--u)*1);margin-bottom:calc(var(--u)*1.2)}.tab{padding:.3em 1.2em;background:var(--panel);border:3px solid #000;border-radius:6px;font-size:calc(var(--u)*2);letter-spacing:.14em;cursor:pointer;color:#9fb0d0}.tab.on{background:var(--cy);color:#0a1020}
.prompts{position:absolute;left:0;right:0;bottom:0;display:flex;gap:calc(var(--u)*3);justify-content:center;padding:calc(var(--u)*1.1);background:linear-gradient(0deg,rgba(0,0,0,.75),transparent);font-size:calc(var(--u)*1.9);font-weight:700;letter-spacing:.1em;pointer-events:none}
.prompts span{color:#cfe}.prompts kbd{margin-right:.5em}
.card{background:var(--panel);border:3px solid #000;box-shadow:0 0 0 2px var(--cy);border-radius:12px;padding:calc(var(--u)*1.4) calc(var(--u)*2.2)}
.press{position:absolute;left:0;right:0;bottom:16vh;text-align:center;font-size:calc(var(--u)*3.4);font-weight:800;letter-spacing:.3em;animation:blink 1.1s infinite;text-shadow:0 3px 0 #000}
.stagegrid{display:flex;gap:calc(var(--u)*2)}
.about{overflow:auto;font-size:calc(var(--u)*1.75);line-height:1.34;max-height:62vh;padding-right:12px;scrollbar-width:thin;white-space:pre-wrap;font-weight:600}
.about h3{margin:1em 0 .2em;color:var(--ye);letter-spacing:.14em;font-size:1.15em;text-transform:uppercase}.about b{color:var(--cy)}
table.bind{width:100%;border-collapse:collapse;font-size:calc(var(--u)*1.7)}table.bind td{padding:.16em .6em;border-bottom:1px solid #fff3}table.bind td:first-child{color:var(--ye);width:36%}
.rows{display:flex;flex-direction:column;gap:calc(var(--u)*.5);font-size:calc(var(--u)*2.4)}.row{display:flex;justify-content:space-between;border-bottom:2px solid #fff2;padding:.1em 0}.row b{color:var(--ye);font-variant-numeric:tabular-nums}
.rank{font-size:calc(var(--u)*14);font-weight:900;font-style:italic;color:var(--ye);text-shadow:0 .05em 0 var(--or),0 .1em 0 #000;line-height:1}
.testpad{position:relative;width:calc(var(--u)*12);height:calc(var(--u)*12);background:#06101e;border:3px solid var(--cy);border-radius:50%;flex:none}.testpad i{position:absolute;width:18%;height:18%;border-radius:50%;background:var(--ye);left:41%;top:41%}
.testpad:before,.testpad:after{content:"";position:absolute;background:#fff3}.testpad:before{left:50%;top:0;bottom:0;width:2px}.testpad:after{top:50%;left:0;right:0;height:2px}
.fade{position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;transition:opacity .35s;z-index:50}.fade.on{opacity:1}
.err{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#080a14;pointer-events:auto;z-index:99;text-align:center;font-size:calc(var(--u)*2.4)}
.err h1{font-size:calc(var(--u)*5);color:var(--or);font-style:italic;margin:0 0 .3em}
@media (max-aspect-ratio:1/1){.panel{width:90vw;margin:auto}.comm{width:90vw}.score{font-size:calc(var(--u)*3)}}
`;

