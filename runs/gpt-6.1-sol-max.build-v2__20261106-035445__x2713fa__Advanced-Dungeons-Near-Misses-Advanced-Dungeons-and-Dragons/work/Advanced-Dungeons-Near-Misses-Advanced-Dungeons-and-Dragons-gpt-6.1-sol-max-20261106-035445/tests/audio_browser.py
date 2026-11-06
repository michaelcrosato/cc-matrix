"""Production engine synth and mix probes; no human listening is claimed."""

from pathlib import Path
from playwright.sync_api import sync_playwright


def run(browser):
    page = browser.new_page(viewport={"width": 960, "height": 640})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    checks = 0
    try:
        page.goto((Path(__file__).parent / "audio-fixture.html").resolve().as_uri())
        assert page.evaluate("fixture.game.audio.ctx === null"), (
            "Audio context opened before gesture"
        )
        checks += 1
        page.locator("#unlock").click()
        page.wait_for_function("fixture.game.audio.ready")
        levels = page.evaluate(
            "({music:fixture.game.audio.musicVolume,bus:fixture.game.audio._musBus.gain.value})"
        )
        assert abs(levels["music"] - 0.1) < 1e-7 and abs(levels["bus"] - 0.1) < 1e-7, (
            levels
        )
        checks += 1
        page.evaluate("fixture.sim.state.players[0].focus=true")
        page.wait_for_function("fixture.sound.stats.ducked")
        assert (
            abs(page.evaluate("fixture.game.audio._musBus.gain.value") - 0.035) < 1e-6
        )
        checks += 1
        page.evaluate(
            "fixture.sim.state.players[0].focus=false;fixture.game.settings.set('music',.32)"
        )
        page.wait_for_function("!fixture.sound.stats.ducked")
        assert abs(page.evaluate("fixture.game.audio._musBus.gain.value") - 0.32) < 1e-6
        checks += 1
        results = page.evaluate("""async () => {
          const results=[];
          const A=fixture.game.audio;
          for(const [name,cue] of Object.entries(NM.Sound.CUES)) {
            const ctx=new OfflineAudioContext(1,88200,44100),bus=ctx.createGain();bus.connect(ctx.destination);
            const voice=Object.create(Object.getPrototypeOf(A));
            voice.ctx=ctx;voice._ins=A._ins;voice._waves={};voice._rnd=()=>.25;
            voice._noise=ctx.createBuffer(1,44100,44100);const noise=voice._noise.getChannelData(0);
            let seed=19;for(let i=0;i<noise.length;i++){seed=(seed*1664525+1013904223)>>>0;noise[i]=seed/2147483648-1;}
            for(const def of Array.isArray(cue)?cue:[cue])voice._voice(def,bus,.01,1,false);
            const buffer=await ctx.startRendering(),data=buffer.getChannelData(0);let max=0,sum=0,bad=0;
            for(const value of data){if(!Number.isFinite(value))bad++;max=Math.max(max,Math.abs(value));sum+=value*value;}
            results.push({name,peak:max,rms:Math.sqrt(sum/data.length),bad});
          }
          for(const name of ['nm-ash','nm-air']){
            const ctx=new OfflineAudioContext(1,44100,44100);A._ins[name](ctx,ctx.destination,.01,440,.6,.25);
            const data=(await ctx.startRendering()).getChannelData(0);let max=0,sum=0;
            for(const value of data){max=Math.max(max,Math.abs(value));sum+=value*value;}
            results.push({name,peak:max,rms:Math.sqrt(sum/data.length),bad:[...data].filter(x=>!Number.isFinite(x)).length});
          }
          return results;
        }""")
        for result in results:
            assert (
                result["bad"] == 0
                and 0 < result["rms"] < 0.3
                and 0 < result["peak"] < 1
            ), result
            checks += 1
        page.evaluate(
            "fixture.sim.state.events=[{id:'voice1',kind:'voice',text:'Mind the echo.',time:0}]"
        )
        page.wait_for_function("fixture.sound.stats.voices>0")
        assert page.evaluate(
            "Math.abs(fixture.game.audio.voiceVolume-.7)<1e-6 && Math.abs(fixture.game.audio._voiceBus.gain.value-.7)<1e-6"
        )
        checks += 1
        voice_signal = page.evaluate("""async () => {
          const a=fixture.game.audio,analyser=a.ctx.createAnalyser();analyser.fftSize=1024;
          const silent=a.ctx.createGain();silent.gain.value=0;analyser.connect(silent);silent.connect(a.ctx.destination);a.bus('voice').connect(analyser);
          fixture.sound.voice('Under stone, the mountain dreams.');
          let peak=0,bad=0;const data=new Float32Array(1024);
          for(let i=0;i<20;i++){await new Promise(r=>setTimeout(r,25));analyser.getFloatTimeDomainData(data);for(const v of data){peak=Math.max(peak,Math.abs(v));if(!Number.isFinite(v))bad++;}}
          analyser.disconnect();silent.disconnect();return {peak,bad};
        }""")
        assert voice_signal["bad"] == 0 and 0 < voice_signal["peak"] < 1, voice_signal
        checks += 1
        page.evaluate("fixture.sound.stop()")
        assert page.evaluate(
            "fixture.sound.stats.activeSources===0 && fixture.game.audio.song===null"
        )
        checks += 1
        assert not errors, errors
        assert not page.evaluate("fixture.game.errors"), page.evaluate(
            "fixture.game.errors"
        )
        checks += 1
        page.reload()
        assert abs(page.evaluate("fixture.game.audio.musicVolume") - 0.32) < 1e-6
        checks += 1
    finally:
        page.evaluate("fixture.game.dispose()")
        page.close()
    return checks


if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            print(f"{run(browser)} browser audio checks passed")
        finally:
            browser.close()
