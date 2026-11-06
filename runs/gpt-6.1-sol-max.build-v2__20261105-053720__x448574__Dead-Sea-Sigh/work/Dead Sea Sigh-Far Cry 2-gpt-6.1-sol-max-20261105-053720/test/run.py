from pathlib import Path
import sys,json,argparse,time
from playwright.sync_api import sync_playwright
from browser_checks import run_browser
from hub_check import run_hub
R=Path(__file__).resolve().parent.parent
URL=(R.parent/(R.name+'.html')).as_uri()
parser=argparse.ArgumentParser();parser.add_argument('--suite',choices=['all','core','story','browser','hub','hub-render','hub-actions','gpu'],default='all');opts=parser.parse_args()
results=[]
def add(name,ok,detail=''):results.append({'name':name,'pass':bool(ok),'detail':str(detail)})
with sync_playwright() as p:
 if opts.suite in ['all','core','story']:
  b=p.chromium.launch(headless=True,args=['--autoplay-policy=no-user-gesture-required'])
  if opts.suite in ['all','core']:
   page=b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   page.goto(URL+'?norender=1&backend=webgl');page.wait_for_function('window.__game?.ready',timeout=90000);page.evaluate('__game.game.stop();__game.game.audio.mute(true)')
   add('boot and defaults',page.evaluate("document.title==='Dead Sea Sigh'&&__game.S.hp===100&&__game.game.settings.music===.1&&__game.game.settings.glyphs==='playstation'"))
   add('deterministic replay',page.evaluate('() => __game.run(120)===__game.run(120)'))
   results.extend(page.evaluate((R/'test/checks.js').read_text()));add('core no page errors',not errors and page.evaluate('__game.game.errors.length===0'),errors)
   # Offline Web Audio proves generated voice and percussion are non-silent and finite.
   audio=page.evaluate("""async () => {const c=new OfflineAudioContext(1,22050,22050),g=c.createGain();g.connect(c.destination);__game.voiceSound(c,g,'a',2,'Ilse Tarn');const A=__game.game.audio,old=A.ctx;A.ctx=c;for(const v of A.presets.gun_parson)A._voice(v,c.destination,.12,1);A.ctx=old;const b=await c.startRendering(),d=b.getChannelData(0);let energy=0;for(const v of d){if(!Number.isFinite(v))return false;energy+=v*v;}return energy>1;}""")
   add('offline generated voice and gunshot',audio);add('music bus defaults below effects',page.evaluate('__game.game.audio.musicVolume<__game.game.audio.sfxVolume&&__game.game.audio.musicVolume===.1'))
   page.close()
  if opts.suite in ['all','story']:
   for ending in ['contract','arithmetic','sounding']:
    page=b.new_page();page.goto(URL+'?norender=1&backend=webgl');page.wait_for_function('window.__game?.ready',timeout=90000);page.evaluate('__game.game.stop();__game.game.audio.mute(true);__game.game.fadeTime=0')
    try:
     report=page.evaluate('(ending)=>__game.Bot.playthrough(ending)',ending);add('complete campaign / '+ending,report['pass'],report)
    except Exception as e:add('complete campaign / '+ending,False,str(e)[:800])
    page.close()
  b.close()
  (R/'test/report.json').write_text(json.dumps(results,indent=2))
 if opts.suite in ['all','browser']:
  try:results.extend(run_browser(p))
  except Exception as e:add('browser suite',False,str(e)[:1200])
  (R/'test/report.json').write_text(json.dumps(results,indent=2))
 if opts.suite in ['all','hub','hub-render']:
  try:
   if opts.suite!='hub-render':results.extend(run_hub(p))
   results.extend(run_hub(p,render=True,scenarios=[(2,'standard')]))
  except Exception as e:add('hub suite',False,str(e)[:1200])
  (R/'test/report.json').write_text(json.dumps(results,indent=2))
 if opts.suite=='hub-actions':results.extend(run_hub(p,render=False,scenarios=[(2,'standard')],actions=True))
 if opts.suite in ['all','gpu']:
  try:
   from gpu_check import run_gpu
   results.extend(run_gpu(p))
  except Exception as e:add('WebGPU suite',False,str(e)[:1200])
(R/'test/report.json').write_text(json.dumps(results,indent=2))
if opts.suite=='all' and all(r['pass'] for r in results):(R/'test/final-report.json').write_text(json.dumps(results,indent=2))
for r in results:
 if not r['pass']:print('FAIL '+r['name']+': '+str(r.get('detail',''))[:1500])
fail=sum(not r['pass'] for r in results);print(f'{len(results)-fail}/{len(results)} checks passed; {fail} failures')
sys.exit(bool(fail))
