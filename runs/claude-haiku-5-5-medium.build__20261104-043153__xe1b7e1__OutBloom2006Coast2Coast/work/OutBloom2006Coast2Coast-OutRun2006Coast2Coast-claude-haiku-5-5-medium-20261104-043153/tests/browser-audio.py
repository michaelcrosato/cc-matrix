# Plays each radio song and a race's continuous voices in Chromium: no errors, the song is playing.
import pathlib
from playwright.sync_api import sync_playwright
HERE = pathlib.Path(__file__).resolve().parent.parent
BUNDLE = HERE.parent / 'OutBloom2006Coast2Coast-OutRun2006Coast2Coast-claude-haiku-5-5-medium-20261104-043153.html'
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required']); pg = b.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type in ('error', 'warning') and 'pointer-lock' not in m.text else None)
    pg.goto(BUNDLE.as_uri()); pg.wait_for_timeout(1000)
    pg.keyboard.press('Enter'); pg.wait_for_timeout(500)   # a key: the browser lets the sound start
    res = pg.evaluate("""() => { const out = {}; for (const k of ['sunburst','coastline','shuffle','vendetta','pastel','lemon','moonflower','lastlight']) { OB.Music.play(k); out[k] = OB.game.audio.song ? 'playing' : 'none'; } OB.Music.stop(0); return out; }""")
    print(res)
    pg.evaluate("() => OB.game.go('race', { mode: 'demo', demo: true, car: 'orchidea', paint: 0, passenger: 'marisol', route: null, seed: 4, cheats: {} }, {fade: 0})")
    pg.wait_for_timeout(6000)
    print('engine loops', pg.evaluate("() => OB.race ? OB.race.status : null"), 'audio failed:', pg.evaluate("() => OB.game.audio.failed"))
    print('errors', errs[:4]); b.close()
