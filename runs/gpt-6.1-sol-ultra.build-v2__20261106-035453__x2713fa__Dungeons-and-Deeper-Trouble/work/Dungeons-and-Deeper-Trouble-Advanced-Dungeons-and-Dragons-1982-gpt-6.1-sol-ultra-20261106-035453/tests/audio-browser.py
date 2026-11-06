import json
from pathlib import Path

from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
config = json.loads((root / "build-config.json").read_text())
url = (root.parent / config["filename"]).as_uri()
checks = 0
failures = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    try:
        page = browser.new_page()
        page.goto(url)
        page.wait_for_function("window.__DT && __DT.app && __DT.app.ready")
        result = page.evaluate("""async()=>{
   const list=[];
   for(const [name,spec]of Object.entries(DTAudio.CUES)){
    const duration=Math.max(...spec.map(v=>(v.delay||0)+v.d))+.08;
    const ctx=new OfflineAudioContext(2,Math.ceil(duration*22050),22050);
    DTAudio.synthCue(ctx,ctx.destination,0,spec,0,917);
    const buffer=await ctx.startRendering();let peak=0,sum=0,finite=true,tail=0;
    for(let ch=0;ch<buffer.numberOfChannels;ch++){const data=buffer.getChannelData(ch);for(let i=0;i<data.length;i++){const v=data[i];finite=finite&&Number.isFinite(v);peak=Math.max(peak,Math.abs(v));sum+=v*v;if(i>data.length-220)tail=Math.max(tail,Math.abs(v));}}
    list.push({name,peak,rms:Math.sqrt(sum/(buffer.length*2)),finite,tail,duration});
   }
   return list;
  }""")
        for cue in result:
            checks += 1
            if not (
                cue["finite"]
                and 0.001 < cue["peak"] < 0.65
                and cue["rms"] > 0.00001
                and cue["tail"] < 0.0001
            ):
                failures.append("Audio signal " + json.dumps(cue))
        page.keyboard.press("ArrowDown")
        page.wait_for_timeout(150)
        levels = page.evaluate(
            """()=>{const a=__DT.app.audio;const before=a.settings();a.audio.duck(false);a.audio.applyVolume();const normal=a.audio.bus('music').gain.value;a.audio.duck(true);const ducked=a.audio.bus('music').gain.value;a.play('shoot');a.voice('The road remembers.');const active=a.active.size;a.stop();return{...before,normal,ducked,active,stopped:a.active.size};}"""
        )
        checks += 1
        if abs(levels["normal"] - 0.1) > 0.00001:
            failures.append("Music default bus is not 10%: " + json.dumps(levels))
        checks += 1
        if abs(levels["ducked"] - 0.035) > 0.00001:
            failures.append("Focus music duck incorrect: " + json.dumps(levels))
        checks += 1
        if not (levels["ready"] and levels["active"] > 0 and levels["stopped"] == 0):
            failures.append("Audio unlock/cue/voice/stop failed: " + json.dumps(levels))
        (root / "reports/audio-signals.json").write_text(
            json.dumps({"cues": result, "buses": levels}, indent=2)
        )
    finally:
        browser.close()
for f in failures:
    print(f)
print(f"{checks} audio browser checks; {len(failures)} failures")
raise SystemExit(1 if failures else 0)
