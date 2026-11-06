from pathlib import Path
import json,base64
R=Path(__file__).resolve().parent.parent

def run_gpu(p):
 flags=['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-vulkan=swiftshader','--use-webgpu-adapter=swiftshader','--disable-vulkan-surface','--autoplay-policy=no-user-gesture-required']
 b=p.chromium.launch(headless=True,args=flags);page=b.new_page(viewport={'width':1280,'height':720});page.add_init_script((R/'test/stand-in.js').read_text()+';standInCanvas();');errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 out=[]
 try:
  page.goto((R.parent/(R.name+'.html')).as_uri()+'?backend=webgpu');page.wait_for_function("window.__game?.game.sceneName==='title'",timeout=180000);page.wait_for_timeout(500);page.evaluate('__game.game.stop();__game.game.audio.mute(true)')
  backend=page.evaluate('My3D2dge.World3D.backend');out.append({'name':'WebGPU backend','pass':backend=='WebGPU','detail':backend})
  result=page.evaluate('() => {const q=__game;const a=q.run(120),b=q.run(120);q.S.tool="map";q.S.toolT=1;q.Fire.ignite(q.hero.x+10*16,q.hero.y,8,true);q.setHour(18.6);q.game.advance(.02,{draw:true});return {a,b};}')
  out.append({'name':'WebGPU deterministic replay','pass':result['a']==result['b'],'detail':str(result)})
  page.wait_for_timeout(1000)
  # This readback is test-only; the game simulation never reads the GPU.
  data=page.evaluate('window.__readFrame(1)');(R/'test/screenshots').mkdir(exist_ok=True);(R/'test/screenshots/webgpu.png').write_bytes(base64.b64decode(data.split(',')[1]))
  out.append({'name':'WebGPU fire/map/daynight no errors','pass':not errors and page.evaluate('__game.game.errors.length===0'),'detail':str(errors)})
 finally:b.close()
 b=p.chromium.launch(headless=True,args=['--autoplay-policy=no-user-gesture-required','--use-angle=swiftshader','--enable-webgl']);page=b.new_page(viewport={'width':1280,'height':720})
 try:
  page.goto((R.parent/(R.name+'.html')).as_uri()+'?backend=webgl');page.wait_for_function("window.__game?.game.sceneName==='title'",timeout=180000);page.evaluate('__game.game.stop();__game.game.audio.mute(true)')
  baseline=page.evaluate('__game.run(120)');out.append({'name':'WebGL and WebGPU replay hashes match','pass':baseline==result['a'],'detail':str({'WebGL':baseline,'WebGPU':result['a']})})
 finally:b.close()
 (R/'test/gpu-report.json').write_text(json.dumps(out,indent=2));return out
