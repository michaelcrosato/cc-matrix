"""Actual Web Audio signal checks; called by the project's single test entry point."""

import json
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = Path(__file__).resolve().parents[1]
SCRIPT = (BASE / "src/audio.js").read_text()


def run(page):
    page.add_script_tag(content=SCRIPT)
    return page.evaluate("""async () => {
      const results = [];
      function check(name, ok, detail='') { results.push({name, pass:!!ok, detail:ok?'':detail}); }
      async function render(volumes, scene, action) {
        const context = new OfflineAudioContext(1, 44100 * 2, 44100);
        const audio = new HappyAudio(volumes, context);
        await audio.unlock(); audio.setScene(scene);
        audio.update(1/60, {speed:80,maxSpeed:100,slip:.7,surface:'gravel'});
        if (action) action(audio);
        const output = await context.startRendering();
        const data = output.getChannelData(0);
        let energy=0,peak=0,finite=true,tail=0;
        for (let i=0;i<data.length;i++) {
          finite &&= Number.isFinite(data[i]);
          peak=Math.max(peak,Math.abs(data[i])); energy+=data[i]*data[i];
          if (i>44100) tail+=data[i]*data[i];
        }
        return {audio, rms:Math.sqrt(energy/data.length), peak, finite, tail:Math.sqrt(tail/44100)};
      }
      const music = await render({sfx:0,voice:0},'title');
      check('music initial gain exactly .10', music.audio.settings.music===.1 && Math.abs(music.audio.buses.music.gain.value-.1)<1e-7, music.audio.buses.music.gain.value);
      check('original score emits bounded samples', music.rms>0.00001 && music.peak<.95 && music.finite, JSON.stringify(music));
      const engine = await render({music:0,voice:0},'driving');
      check('engine and tyre oscillators emit bounded samples',engine.rms>.001&&engine.peak<.95&&engine.finite,JSON.stringify({rms:engine.rms,peak:engine.peak}));
      const effects = await render({music:0,voice:0},'off', a=>['countdown','go','gate','lap','crash','water','recover','point','finish','discovery'].forEach(n=>a.cue(n)));
      check('all effect cues render without clipping',effects.rms>.001&&effects.peak<.95&&effects.finite,JSON.stringify({rms:effects.rms,peak:effects.peak}));
      const voice = await render({music:0,sfx:0},'off',a=>a.gibberish());
      check('gibberish voice emits distinct signal',voice.rms>.0001&&voice.peak<.95&&voice.finite,JSON.stringify({rms:voice.rms,peak:voice.peak}));
      const muted = await render({mute:true},'driving',a=>{a.cue('finish');a.gibberish();});
      check('master mute silences every bus',muted.peak===0,muted.peak);
      const zero = await render({master:0},'driving',a=>a.cue('crash'));
      check('master zero silences loops and effects',zero.peak===0,zero.peak);
      const quieter = await render({music:.025,sfx:0,voice:0},'title');
      check('music slider changes measured output',quieter.rms<music.rms*.4&&quieter.rms>0,JSON.stringify({quiet:quieter.rms,normal:music.rms}));
      const stopped = await render({},'driving',a=>{a.cue('finish');a.stop();});
      check('stop clears transient cues and silences old scene',stopped.tail<.00001,stopped.tail);
      const paused = await render({},'driving',a=>a.update(1/60,{paused:true}));
      check('pause silences engine and score',paused.tail<.00001,paused.tail);
      const retries = await render({},'title',a=>{const e=a.engineA;for(let i=0;i<30;i++){a.setScene('driving');a.update(.02,{speed:50});a.setScene('results');a.update(.02,{});a.setScene('title');}check('retries reuse engine and bound active notes',a.engineA===e&&a.sources.size<30,a.sources.size);a.stop();});
      check('retry cleanup leaves no runaway signal',retries.tail<.00001,retries.tail);
      const destroyed = await render({},'driving',a=>a.destroy());
      check('destroy disconnects all sources',destroyed.peak===0,destroyed.peak);
      return results;
    }""")


if __name__ == "__main__":
    results = []
    with sync_playwright() as p:
        for name in ["chromium", "webkit"]:
            browser = getattr(p, name).launch(headless=True)
            page = browser.new_page()
            page.set_content(
                "<!doctype html><title>Auto Lap Happy audio verification</title>"
            )
            for row in run(page):
                row["name"] = name + " " + row["name"]
                results.append(row)
            browser.close()
    print(json.dumps(results))
