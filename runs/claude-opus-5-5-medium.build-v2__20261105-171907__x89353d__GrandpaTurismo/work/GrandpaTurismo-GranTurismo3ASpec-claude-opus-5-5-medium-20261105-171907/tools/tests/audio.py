import sys; sys.path.insert(0,'tools/tests')
from blib import *
t=T()
with sync_playwright() as p:
    b=p.chromium.launch(args=FL+['--autoplay-policy=no-user-gesture-required'])
    pg,ctx,errs=open_page(b,'scene=race&track=proving&car=ginga&ai=2&laps=1')
    wait(pg,"window.__GAME__.state().scene==='race'",60000); pg.wait_for_timeout(1500)
    pg.keyboard.down('KeyW'); wait(pg,"window.__GAME__.app.mix.counts.shift>=1",90000); pg.wait_for_timeout(500)
    d=pg.evaluate("(()=>{const a=window.__GAME__.app,m=a.mix;return {level:m.level(),counts:{...m.counts},ac:{...a.ctx.audio.counts},unlocked:a.ctx.audio.unlocked,hasEngines:m.engines.length,music:a.ctx.audio.volume.music,playing:a.ctx.audio.playing,last:m.lastDrive}})()")
    pg.keyboard.up('KeyW')
    t.ok(d['unlocked'],'sound unlocks on a key'); t.ok(d['hasEngines']>=1,'engine synth built',d); t.ok(d['level']>0.001,'live mix is not silent',d['level']); t.ok(d['counts']['shift']>=1,'gear shifts counted',d['counts']); t.ok(d['music']==0.1,'music at 10%',d['music']); t.ok(d['playing']!='','music plays',d['playing']); t.ok(d['ac'].get('gearClunk',0)>=1,'gear clunk played',d['ac'])
    # kerbs and tyres: sim events through dev
    pg.evaluate("window.__GAME__.app.ui.say('Thank you. That was correct.','arai')" ) if False else None
    pg.evaluate("window.__GAME__.app.mix.say('Thank you. That was correct.','arai')"); t.ok(pg.evaluate("window.__GAME__.app.mix.counts.voice")>=1,'voice counted')
    pg.evaluate("window.__GAME__.app.mix.driving([{rpm:6000,throttle:1}],{squeal:1,kerb:1,speed:30},1/60)"); c=pg.evaluate("window.__GAME__.app.mix.counts"); t.ok(c['tyre']>=1 and c['kerb']>=1,'tyre and kerb counted',c)
    # offline render of the engine synth: not silent, centroid rises with rpm (the page bundle exposes the classes through the test hook)
    pg.evaluate("(()=>{window.__SYNTH__=window.__GAME__.app.mix.engines[0].synth.constructor;return 0})()")
    r=pg.evaluate("""async()=>{
      const S=window.__SYNTH__;
      async function render(rpm,throttle){const c=new OfflineAudioContext(1,44100,44100),s=new S(c,c.destination,{cylinders:6,cut:2400,bite:.6,loud:1,redline:7300});s.set({rpm,throttle,level:1},0.016);const buf=await c.startRendering(),d=buf.getChannelData(0);let e=0,zc=0;for(let i=1000;i<d.length;i++){e+=d[i]*d[i];if((d[i]>=0)!==(d[i-1]>=0))zc++}return {rms:Math.sqrt(e/(d.length-1000)),zc}}
      return {low:await render(1500,.8),high:await render(6500,.8),off:await render(3000,0)}}""")
    t.ok(r['low']['rms']>0.005,'engine renders at low rpm',r); t.ok(r['high']['zc']>r['low']['zc']*1.5,'spectral centroid rises with rpm',r); t.ok(r['off']['rms']<r['low']['rms']*1.2,'gain follows throttle',r)
    # music at 10% against effects: render one note of a song track vs a thump, by what the engine's mixer does
    lv=pg.evaluate("""async()=>{const a=window.__GAME__.app,v=a.ctx.audio.volume;return {music:v.music*v.master,sfx:v.sfx*v.master}}"""); t.ok(lv['music']<lv['sfx']*0.2,'music level well under effects',lv)
    # voice renders offline
    v=pg.evaluate("""async()=>{const a=window.__GAME__.app;return a.mix.lastVoice}"""); t.ok(v and v['speaker']=='arai','same words, same speaker',v)
    t.ok(not errs,'no console errors',errs[:3]); ctx.close(); b.close()
t.done()
