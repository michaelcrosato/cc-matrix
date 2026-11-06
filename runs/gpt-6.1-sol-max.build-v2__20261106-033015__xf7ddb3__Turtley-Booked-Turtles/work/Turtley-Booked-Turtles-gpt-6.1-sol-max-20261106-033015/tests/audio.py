import json
import pathlib
import sys
from playwright.sync_api import sync_playwright
root=pathlib.Path(__file__).resolve().parents[1]
count=0
failures=[]
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True)
  page=browser.new_page()
  page.goto((root/'build/game.html').as_uri())
  page.get_by_role('button',name='Check in • Solo',exact=True).click()
  report=page.evaluate('''async()=>{
    const results=[];const test=(name,pass)=>results.push({name,pass});
    async function render(bus,volume=1,mute=false,cue=null){
      const ctx=new OfflineAudioContext(1,22050,22050),A=Object.create(Object.getPrototypeOf(TB.app.game.audio));
      Object.assign(A,{ctx,_waves:{},_rnd:()=>.4,volume:1,musicVolume:bus==='music'?volume:1,sfxVolume:bus==='sfx'?volume:1,voiceVolume:bus==='voice'?volume:1,muted:mute,_ins:{'turtle-voice':TB.formant}});
      A._master=ctx.createGain();A._master.connect(ctx.destination);for(const [n,key] of [['sfx','_sfxBus'],['music','_musBus'],['voice','_voiceBus']]){A[key]=ctx.createGain();A[key].connect(A._master);}A.applyVolume();
      A._noise=ctx.createBuffer(1,22050,22050);const rng=new TB.Stream(42,'audio-test');for(let i=0,d=A._noise.getChannelData(0);i<d.length;i++)d[i]=rng.next()*2-1;
      const target=bus==='music'?A._musBus:bus==='voice'?A._voiceBus:A._sfxBus;
      if(bus==='voice')TB.formant(ctx,target,.01,330,.25,.15);
      else if(bus==='music'){for(let i=0;i<4;i++)A._voice({wave:'triangle',freq:[293.66,369.99,440,369.99][i],dur:.12,vol:.2},target,.01+i*.15);}
      else if(cue){A._voice(TB.app.game.audio.presets[cue],target,.01);}
      else {A._voice(TB.app.game.audio.presets['tb-delivery'],target,.01);A._voice(TB.app.game.audio.presets['tb-hit'],target,.45);}
      const data=(await ctx.startRendering()).getChannelData(0);let peak=0,sum=0,finite=true;for(const x of data){finite=finite&&Number.isFinite(x);peak=Math.max(peak,Math.abs(x));sum+=x*x;}return {peak,rms:Math.sqrt(sum/data.length),finite};
    }
    for(const bus of ['music','sfx','voice']){const full=await render(bus),zero=await render(bus,0),muted=await render(bus,1,true);test(bus+' finite audible signal',full.finite&&full.rms>.001&&full.peak<1);test(bus+' volume zero silent',zero.peak===0);test(bus+' master mute silent',muted.peak===0);}
    for(const name of Object.keys(TB.app.game.audio.presets).filter(n=>n.startsWith('tb-'))){const sound=await render('sfx',1,false,name);test(name+' produces a finite cue',sound.finite&&sound.peak>0&&sound.peak<1);}
    const loud=await render('music',1),quiet=await render('music',.1);test('10 percent music gain measured',Math.abs(quiet.rms/loud.rms-.1)<.0001);
    const a=TB.app;test('persistent music default matches actual bus',a.game.settings.music===.1&&a.game.audio.musicVolume===.1&&Math.abs(a.game.audio.bus('music').gain.value-.1)<.001);
    const song=a.game.audio.song;for(let i=0;i<8;i++)a.sound.music(true);test('no duplicate music graph on repeated starts',a.game.audio.song===song);
    a.sound.stop();test('music and gibberish nodes stop',a.game.audio.song===null&&a.sound.nodes.size===0);
    return results;
  }''')
  count=len(report)
  failures=[x['name'] for x in report if not x['pass']]
  (root/'build/audio-evidence.json').write_text(json.dumps(report,indent=2))
  browser.close()
except Exception as e:
 failures.append(str(e))
print(json.dumps({'count':count,'failures':failures}))
sys.exit(1 if failures else 0)
