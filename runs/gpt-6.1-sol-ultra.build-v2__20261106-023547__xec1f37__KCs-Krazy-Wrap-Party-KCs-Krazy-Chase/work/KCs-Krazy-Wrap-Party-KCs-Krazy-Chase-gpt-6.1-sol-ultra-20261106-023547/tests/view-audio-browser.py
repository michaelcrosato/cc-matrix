"""Finite procedural audio and real native bus lifecycle checks in Chromium."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json
p=Path(__file__).resolve().parents[1]
def run():
    passed=0; failures=[]
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True)
        page=browser.new_page(viewport={'width':1536,'height':864})
        project=json.loads((p/'project.json').read_text())
        page.goto((p.parent/(project['slug']+'.html')).as_uri())
        page.wait_for_function('window.__garden && window.__garden.game')
        page.mouse.click(600,500)
        data=page.evaluate('''async()=>{
          const ctx=new OfflineAudioContext(1,Math.ceil(44100*1.2),44100);
          const probe=GardenAudio.renderOffline(ctx),buffer=await ctx.startRendering(),d=buffer.getChannelData(0);
          let max=0,sum=0,finite=true;for(const x of d){finite=finite&&Number.isFinite(x);max=Math.max(max,Math.abs(x));sum+=x*x;}
          const game=window.__garden.game;window.audioTest=window.__garden.audio;audioTest.scene('play',0);audioTest.unlock();const startsBefore=audioTest.debug().musicStarts;audioTest.unlock();audioTest.scene('play',0);
          const live=audioTest.debug(),gains={music:game.audio.bus('music').gain.value,sfx:game.audio.bus('sfx').gain.value,voice:game.audio.bus('voice').gain.value};
          audioTest.pause(true);const pause=audioTest.debug();audioTest.pause(false);audioTest.events([{type:'bite',x:2,y:2}],{garden:0,level:{w:15},sentries:[]});const voice=audioTest.debug();audioTest.stop();const stop=audioTest.debug();
          return {startsBefore,probe,max,rms:Math.sqrt(sum/d.length),finite,live,gains,pause,voice,stop,errors:game.errors};
        }''')
        checks=[('offline synth finite, nonzero and bounded',data['finite'] and .00001<data['rms']<.3 and .001<data['max']<.8),('fresh native music bus is ten percent',abs(data['gains']['music']-.1)<.00001),('effects and voice use separate adjustable buses',abs(data['gains']['sfx']-.55)<.00001 and abs(data['gains']['voice']-.4)<.00001),('repeated unlock and scene do not stack loops',data['live']['musicStarts']==data['startsBefore']),('pause mutes music effects and voice master',data['pause']['muted']),('gibberish is synthesized into tracked voices',data['voice']['voiceCount']>=1 and data['voice']['activeVoices']>0),('end stops loop and all voice nodes',not data['stop']['songPlaying'] and data['stop']['activeVoices']==0 and data['stop']['muted']),('native rendering reports no errors',not data['errors'])]
        for name,ok in checks:
            if ok: passed+=1
            else: failures.append(name)
        (p/'artifacts/audio-check.json').write_text(json.dumps(data,indent=2))
        browser.close()
    return {'passed':passed,'failed':len(failures),'failures':failures}
if __name__=='__main__':
    result=run()
    for failure in result['failures']:print('FAIL '+failure)
    print(f"{result['passed']} passed, {result['failed']} failed")
    raise SystemExit(1 if result['failed'] else 0)
