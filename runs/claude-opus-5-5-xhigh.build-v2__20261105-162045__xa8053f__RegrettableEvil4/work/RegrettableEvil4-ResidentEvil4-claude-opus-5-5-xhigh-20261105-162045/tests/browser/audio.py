# First boot: music at 10%. The music bus really makes sound. Reset returns to 10%. Voices speak.
import sys, pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from _common import *

s = Suite()
with sync_playwright() as pw:
    b = launch(pw)
    page, errs = open_game(b, '?g_noattract=1')
    s.ok(page.evaluate('window.__PIXEL_ENGINE__.audio.volume.music') == 0.1, 'music 0.1 on first boot')
    # Unlock audio with a real key, run live for a moment.
    page.evaluate('async () => { const e = await window.__PIXEL_READY__; e.manual = false; }')
    page.keyboard.press('KeyK')
    page.wait_for_timeout(1500)
    info = page.evaluate("""async () => {
      const e = window.__PIXEL_ENGINE__;
      const a = e.audio;
      const ctx = a.context;
      if (!ctx) return { no: true };
      const an = ctx.createAnalyser();
      an.fftSize = 2048;
      // Tap every gain we can find on the manager: the music bus goes through a node it owns.
      const nodes = [];
      for (const k of Object.keys(a)) { const v = a[k]; if (v && v.gain && v.connect) nodes.push([k, v]); }
      for (const k of Object.getOwnPropertyNames(Object.getPrototypeOf(a))) { void k; }
      let tapped = [];
      for (const [k, v] of nodes) { try { v.connect(an); tapped.push(k); } catch (_) {} }
      const buf = new Float32Array(an.fftSize);
      let peak = 0;
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 100));
        an.getFloatTimeDomainData(buf);
        for (const x of buf) peak = Math.max(peak, Math.abs(x));
      }
      return { state: ctx.state, playing: a.playing, peak, tapped, music: a.volume.music };
    }""")
    s.ok(info.get('state') == 'running', f"audio context running after a key ({info})")
    s.ok(info.get('playing') == 'title', f"the title song plays ({info.get('playing')})")
    s.ok(info.get('peak', 0) > 0.0005, f"music bus above silence at 10% ({info.get('peak')}, via {info.get('tapped')})")
    s.ok(info.get('music') == 0.1, f"still 0.1 after a fade ({info.get('music')})")
    # Settings: change, then Reset restores 10%.
    page.evaluate("async () => { window.__SCREENS__.openSettings(); }")
    page.wait_for_timeout(200)
    page.evaluate("async () => { const s = window.__APP__.settings; s.music = 0.7; window.__APP__.applySettings(); }")
    page.wait_for_timeout(300)
    s.ok(abs(page.evaluate('window.__PIXEL_ENGINE__.audio.volume.music') - 0.7) < 0.01, 'the music slider changes the channel')
    page.evaluate("window.__APP__.resetSettings()")
    page.wait_for_timeout(1200)
    s.ok(page.evaluate('window.__PIXEL_ENGINE__.audio.volume.music') == 0.1, 'Reset returns to 10%')
    s.ok(page.evaluate('window.__PIXEL_ENGINE__.audio.persist') is False, "the engine's own volume persistence is off")
    # Voice blips count when someone speaks.
    c0 = page.evaluate('window.__APP__.voice.count')
    page.evaluate("window.__APP__.voice.speak('dame', 'YOU ARE NINE DAYS LATE', 0, 20)")
    s.ok(page.evaluate('window.__APP__.voice.count') > c0, 'voice syllables play')
    s.ok(errs == [], f'no console errors: {errs[:3]}')
    page.close()
    b.close()
s.done()
