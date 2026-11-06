"""Exercise real native synth voices and original compositions with offline samples."""

import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
report = {"passed": 0, "failures": [], "measurements": {}}


def check(condition, label):
    if condition:
        report["passed"] += 1
    else:
        report["failures"].append(label)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    try:
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        errors = []
        requests = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("request", lambda r: requests.append(r.url))
        page.goto((ROOT / "game.html").as_uri())
        page.wait_for_function("window.__wizard && window.WizardAudioData")
        check(
            page.evaluate("__game.settings.music === .1"),
            "Fresh music setting is not10%",
        )
        page.keyboard.press("ArrowDown")
        page.evaluate(
            "__wizard.audio.unlock(); __game.resume(); __game.audio.applyVolume()"
        )
        check(
            page.evaluate(
                "__game.audio.musicVolume === .1 && Math.abs(__game.audio.bus('music').gain.value-.1)<.0001"
            ),
            "Actual music bus is not10%",
        )
        measurements = page.evaluate("""async () => {
          const data=WizardAudioData,a=__game.audio,ctx=new OfflineAudioContext(2,44100*19,44100),bus=ctx.createGain();
          bus.gain.value=.65;bus.connect(ctx.destination);
          const native=Object.create(Object.getPrototypeOf(a));native.ctx=ctx;native._waves={};native._rnd=My3D2dge.rng(1982);
          native._noise=ctx.createBuffer(1,44100,44100);const noise=native._noise.getChannelData(0);let seed=1982;for(let i=0;i<noise.length;i++){seed=(seed*1664525+1013904223)>>>0;noise[i]=(seed/4294967296)*2-1;}
          let t=.05;
          for(const spec of Object.values(data.sounds)){native._voice(spec,bus,t);t+=.9;}
          for(let i=0;i<7;i++)data.syllable(ctx,bus,16+i*.12,110+i%3*37,i,.12);
          const rendered=await ctx.startRendering();let finite=true,peak=0,sum=0,tail=0;const out=rendered.getChannelData(0);
          for(let i=0;i<out.length;i++){finite=finite&&Number.isFinite(out[i]);peak=Math.max(peak,Math.abs(out[i]));sum+=out[i]*out[i];if(i>out.length-4410)tail=Math.max(tail,Math.abs(out[i]));}
          return {finite,peak,rms:Math.sqrt(sum/out.length),tail,duration:rendered.duration,soundCount:Object.keys(data.sounds).length,songCount:Object.keys(data.songs).length};
        }""")
        report["measurements"] = measurements
        check(measurements["finite"], "Synth output contains nonfinite samples")
        check(0.001 < measurements["peak"] < 0.99, "Synth output is silent or clips")
        check(measurements["rms"] > 0.0001, "Synth output has no intended signal")
        check(measurements["tail"] < 0.00001, "Voice envelopes do not terminate")
        check(measurements["duration"] == 19, "Offline duration differs")
        check(
            measurements["soundCount"] >= 17 and measurements["songCount"] == 6,
            "Missing cues or composition states",
        )
        music = page.evaluate("""async()=>{
          const songs=WizardAudioData.songs,a=__game.audio,ctx=new OfflineAudioContext(1,44100*22,44100),bus=ctx.createGain();bus.gain.value=.1;bus.connect(ctx.destination);
          const native=Object.create(Object.getPrototypeOf(a));native.ctx=ctx;native._waves={};native._rnd=My3D2dge.rng(1982);native._noise=ctx.createBuffer(1,44100,44100);
          const frequency=n=>{const m=/^([A-G])(#|b)?(\\d)$/.exec(n);if(!m)return null;return 440*2**(((+m[3]+1)*12+({C:0,D:2,E:4,F:5,G:7,A:9,B:11}[m[1]])+(m[2]==='#'?1:m[2]==='b'?-1:0)-69)/12);};
          let start=.05;const spans=[];
          for(const[name,song]of Object.entries(songs)){let count=0;for(const tr of song.tracks){if(tr.wave==='drums')continue;const notes=tr.notes.split(/\\s+/).filter(n=>n!=='|');for(let i=0;i<Math.min(notes.length,16);i++){const f=frequency(notes[i]);if(f){native._voice({wave:tr.wave,freq:f,dur:.1,vol:tr.vol||.1},bus,start+i*.11);count++;}}}spans.push({name,start,end:start+2,notes:count});start+=3.4;}
          const buffer=await ctx.startRendering(),d=buffer.getChannelData(0);return spans.map(s=>{let sum=0;for(let i=Math.floor(s.start*44100);i<s.end*44100;i++)sum+=d[i]*d[i];return {...s,rms:Math.sqrt(sum/(2*44100))};});
        }""")
        report["compositions"] = music
        check(
            all(s["rms"] > 0.00001 and s["notes"] > 0 for s in music),
            "An original composition renders silent",
        )
        page.evaluate("__wizard.audio.babble()")
        page.wait_for_function("__wizard.audio.voices.size===0")
        check(
            page.evaluate("__wizard.audio.voices.size===0"), "Gibberish sources leaked"
        )
        page.evaluate("__wizard.audio.silence()")
        check(page.evaluate("__game.audio.song===null"), "Silence left music scheduled")
        page.evaluate("__wizard.audio.stop()")
        check(
            page.evaluate("__wizard.audio.stopped && __wizard.audio.voices.size===0"),
            "Terminal audio stop failed",
        )
        check(not errors, "Audio browser runtime errors: " + str(errors))
        check(
            not any(
                u.lower().split("?")[0].endswith((".wav", ".mp3", ".ogg", ".m4a"))
                for u in requests
            ),
            "An audio file was requested",
        )
        page.close()
    except Exception as error:  # noqa: BLE001 - report browser/test failures before cleanup
        report["failures"].append(str(error))
    finally:
        browser.close()

(ROOT / "evidence/audio-browser.json").write_text(json.dumps(report, indent=2))
for failure in report["failures"]:
    print("FAIL " + failure)
print(f"{report['passed']} passed; {len(report['failures'])} failed")
raise SystemExit(bool(report["failures"]))
