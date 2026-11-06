#!/usr/bin/env python3
"""Pack the actual Pavilion WASM product, authored shell, font, protocol and metadata."""
from pathlib import Path
import base64,gzip,json,re,subprocess
root=Path(__file__).resolve().parents[1]
workspace=root.parent
build=root/'build'
build.mkdir(exist_ok=True)
wasm=root/'engine/target/wasm32-unknown-unknown/dist/pav_surgery.wasm'
if wasm.exists():
 subprocess.run(['wasm-bindgen','--target','web','--no-typescript','--out-dir',str(build),'--out-name','surgery',str(wasm)],check=True,capture_output=True)
else:
 assert (build/'surgery.js').exists() and (build/'surgery_bg.wasm').exists(), 'Run tools/build.sh first'
glue=(build/'surgery.js').read_text()
blob=base64.b64encode(gzip.compress((build/'surgery_bg.wasm').read_bytes(),compresslevel=9)).decode()
loader='''\nasync function initWasm(){
const binary=atob("WASM_BYTES"),compressed=Uint8Array.from(binary,c=>c.charCodeAt(0));
const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'));
const bytes=await new Response(stream).arrayBuffer();
await __wbg_init({module_or_path:bytes});
}\n'''.replace('WASM_BYTES',blob)
app=(root/'web/app.js').read_text().replace('/*WASM_IMPORT*/',glue+loader)
client=(root/'vendor/session.js').read_text()
for name,text in [('client',client),('app',app)]:
 for bad in ['</script','<!--']:
  assert bad not in text.lower(),f'{name} contains HTML parser delimiter {bad}'
font=base64.b64encode((root/'vendor/BarlowCondensed-SemiBold.ttf').read_bytes()).decode()
css=(root/'web/style.css').read_text().replace('/*FONT*/',font)
about=json.loads((workspace/'exit-interview.json').read_text())
html=(root/'web/index.html').read_text().replace('<!--SESSION-->','<script>\n'+client+'\n</script>')
for marker,text in [('/*CSS*/',css),('/*AUDIO*/',(root/'web/audio.js').read_text()),('/*APP*/',app),('/*ABOUT*/',json.dumps(about,ensure_ascii=False)),('/*STORY*/',(root/'web/story.json').read_text())]:html=html.replace(marker,text)
title=re.search(r'pub const TITLE: &str = "([^"]+)"', (root/'engine/crates/pav_core/src/games/surgery/mod.rs').read_text())[1]
html=re.sub(r'<title>.*?</title>',lambda m:'<title>'+title+'</title>',html,count=1)
html=html.replace('</head>','<script type="application/json" id="font-license">'+json.dumps({'font':'Barlow Condensed Semibold','license':(root/'vendor/Barlow-OFL.txt').read_text()},ensure_ascii=False)+'</script>\n</head>')
out=workspace/(root.name+'.html')
out.write_text(html)
(root/'tests/hub').mkdir(exist_ok=True)
for name in ['harness.html','bridge.js','round.js']:(root/'tests/hub'/name).write_bytes((root/'vendor'/name).read_bytes())
(root/'tests/hub/game.html').write_bytes(out.read_bytes())
print(str(out)+' ('+str(round(out.stat().st_size/1024/1024,2))+' MiB)')
