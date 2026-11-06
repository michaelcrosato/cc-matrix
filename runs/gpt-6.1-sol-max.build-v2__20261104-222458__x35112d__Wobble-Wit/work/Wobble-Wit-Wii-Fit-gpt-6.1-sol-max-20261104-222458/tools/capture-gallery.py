from pathlib import Path
import subprocess,json
root=Path(__file__).resolve().parents[1];engine=root/'engine';out=root/'out';out.mkdir(exist_ok=True)
scenes=[('title','fit',0),('island','fit/hub',0),('breath','fit/event/breath-bloom',240),('pose','fit/event/pose-parade',240),('squat','fit/event/tempo-squats',90),('plank','fit/event/plank-standoff',240),('step','fit/event/step-party',240),('floatie','fit/event/floatie-spin',600),('lap','fit/event/morning-lap',600),('tide','fit/event/tide-table',360),('paddle','fit/event/paddle-slalom',600),('tray','fit/event/tray-trek',600),('dive','fit/event/cannonball-cup',480),('finale','fit/event/big-stand',240)]
for name,scene,ticks in scenes:
 play=f'play bot=true ticks={ticks}' if ticks else 'step ticks=1'
 commands=f'load scene={scene}\n{play}\ncapture width=1920 height=1080 out={out/name}.png\n'
 r=subprocess.run([str(engine/'target/debug/pav'),'repl'],input=commands,text=True,capture_output=True,cwd=engine)
 (root/'notes'/f'capture-{name}.log').write_text(r.stdout+r.stderr)
 if r.returncode:raise RuntimeError(f'{name}: {r.stderr[-500:]}')
(out/'index.html').write_text('<!doctype html><meta charset="utf-8"><title>Wobble Wit · captures</title><style>body{background:#e6f1ec;font:20px system-ui;color:#263e54;margin:40px}img{max-width:100%;display:block;border-radius:20px}figure{margin:40px 0}</style><h1>Wobble Wit · native 1080p captures</h1>'+''.join(f'<figure><figcaption>{name}</figcaption><img src="{name}.png" alt="{name}"></figure>'for name,_,_ in scenes))
print(f'{len(scenes)} native captures')
