"""Native synth checks. Run with the installed Playwright Python; no audio is heard."""
import json
import pathlib
import sys

from playwright.sync_api import sync_playwright


ROOT = pathlib.Path(__file__).resolve().parents[1]
PROBE = r"""async () => {
  const E = My3D2dge;
  const game = new E.Game({headless:true, id:'night-audio-test', menu:false});
  const controller = NightAudio.create(game);
  const initial = controller.diagnostics();
  const assertions = [];
  const check = (pass, message) => assertions.push({pass:!!pass,message});
  check(game.settings.default('music') === .1 && game.audio.musicVolume === .1,
        'The actual native persisted music default is ten percent');
  check(game.settings.spec('voice').group === 'Sound' && game.audio.voiceVolume === .55,
        'Chatter has a separate native voice setting');
  controller.unlock(); controller.testTone(); controller.update({phase:'playing',players:[],rivals:[]});
  check(initial.silent && game.audio.ctx === null, 'Dedicated/headless audio never opens an audio device');
  const AC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  async function render({muted=false,bus='sfx',level=1,all=false}={}) {
    const sampleRate = 44100, seconds=4;
    const c = new AC(1, sampleRate*seconds, sampleRate);
    const out = c.createGain(); out.gain.value = muted ? 0 : .7; out.connect(c.destination);
    const target=c.createGain(); target.gain.value=level; target.connect(out);
    const A=game.audio; A.ctx=c;
    const noise=c.createBuffer(1,sampleRate,sampleRate),d=noise.getChannelData(0);
    for(let i=0;i<d.length;i++)d[i]=Math.sin(i*12.9898)*.5;
    A._noise=noise;
    if(all) {
      let at=.02;
      for(const sound of Object.values(NightAudio.sounds)) {
        for(const voice of Array.isArray(sound)?sound:[sound]) A._voice(voice,target,at,1,false);
        at+=.115;
      }
      NightAudio.babble(c,target,1,()=>{});
      NightAudio.bell(c,target,2.8,659.25,.4,.12);
    } else NightAudio.bell(c,target,.02,440,.25,.12);
    const buffer = await c.startRendering(), data=buffer.getChannelData(0);
    let peak=0,sum=0,tail=0,finite=true;
    for(let i=0;i<data.length;i++){const value=data[i]; finite&&=Number.isFinite(value);peak=Math.max(peak,Math.abs(value));sum+=value*value;if(i>data.length-sampleRate*.1)tail=Math.max(tail,Math.abs(value));}
    return {finite,peak,rms:Math.sqrt(sum/data.length),tail};
  }
  const mixed=await render({all:true});
  check(mixed.finite && mixed.rms>.0001 && mixed.peak<1,
        'Authored native effects, instruments and gibberish produce finite nonzero unclipped samples');
  check(mixed.tail<.0001, 'Every authored one-shot decays to silence');
  const full=await render(),quiet=await render({bus:'music',level:.1}),mute=await render({muted:true});
  check(Math.abs(quiet.rms/full.rms-.1)<.0001 && mute.peak===0,
        'Native bus gain and master mute control synthesized output');
  game.audio.ctx=null;game.dispose();
  return {assertions,mixed,musicGainRatio:quiet.rms/full.rms,mutePeak:mute.peak};
}"""


def run(artifact=None):
    results = {}
    failures = []
    count = 0
    with sync_playwright() as playwright:
        for name in ("chromium", "webkit"):
            browser = getattr(playwright, name).launch(headless=True)
            page = browser.new_page()
            try:
                if artifact:
                    page.goto(pathlib.Path(artifact).resolve().as_uri(), wait_until="load")
                else:
                    page.set_content("<!doctype html><html><head></head><body></body></html>")
                    page.add_script_tag(content=(ROOT / "vendor/engine/my-3d2dge.js").read_text())
                    page.add_script_tag(content=(ROOT / "src/audio.js").read_text())
                result = page.evaluate(PROBE)
                results[name] = result
                for assertion in result["assertions"]:
                    count += 1
                    if not assertion["pass"]:
                        failures.append(f"FAIL audio/{name}: {assertion['message']}")
            except Exception as error:
                failures.append(f"FAIL audio/{name}: {error}")
            finally:
                browser.close()
    (ROOT / "evidence").mkdir(exist_ok=True)
    (ROOT / "evidence/audio-results.json").write_text(json.dumps(results, indent=2))
    return count, failures


if __name__ == "__main__":
    total, errors = run(sys.argv[1] if len(sys.argv) > 1 else None)
    for error in errors:
        print(error)
    print(f"Audio: {total - len(errors)}/{total} checks passed")
    raise SystemExit(bool(errors))
