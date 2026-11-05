# Plays a round through a stand-in AI Hub host: the host answers hello, starts the round, and ends it at time-up.
# Checks that the game joins, starts with the hub's seed, and posts its score as the result.
import sys, time, pathlib, json
from playwright.sync_api import sync_playwright

GAME = pathlib.Path(sys.argv[1]).resolve()
OUT = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else '/tmp/hb-shots'); OUT.mkdir(parents=True, exist_ok=True)
HOST = OUT / 'hub-host.html'
HOST.write_text(f"""<!doctype html><html><body style="margin:0;background:#000">
<iframe id="g" src="{GAME.as_uri()}?aihub=1" style="border:0;width:1280px;height:720px"></iframe>
<script>
window.__log = [];
window.addEventListener('message', function (e) {{
  var m = e.data; if (!m || m.aihub !== 1) return;
  window.__log.push(m);
  if (m.type === 'hello') e.source.postMessage({{ aihub: 1, type: 'welcome', me: 'p1', host: 'p1', players: [{{ id: 'p1', name: 'Me' }}], seed: 424242, mode: 'parallel', round: 1, limitMs: 480000, splash: false }}, '*');
}});
window.sendToGame = function (msg) {{ document.getElementById('g').contentWindow.postMessage(Object.assign({{ aihub: 1 }}, msg), '*'); }};
</script></body></html>""")

checks = []
def check(name, ok, detail=''):
    checks.append({'check': name, 'ok': bool(ok), 'detail': str(detail)})
    print(('PASS ' if ok else 'FAIL ') + name + (' ' + str(detail) if detail else ''), flush=True)

with sync_playwright() as p:
    browser = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    page = browser.new_page(viewport={'width': 1280, 'height': 720})
    errs = []
    page.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
    page.goto(HOST.as_uri())
    time.sleep(3.5)
    log = page.evaluate('() => window.__log.map(m => m.type)')
    check('client says hello to the hub', 'hello' in log, log[:5])
    frame = page.frames[1]
    time.sleep(0.5)
    # Title menu with the hub: NEW SHIFT, CONTINUE (disabled), PLAY TOGETHER. Move down twice and pick.
    # Title menu: NEW SHIFT, CONTINUE (greyed out), PLAY TOGETHER, OPTIONS, ABOUT. One step down reaches PLAY TOGETHER.
    frame.locator('#screen').click(position={'x': 640, 'y': 650})
    time.sleep(0.3)
    page.keyboard.press('ArrowDown'); time.sleep(0.3)
    page.screenshot(path=str(OUT / 'hub-menu.png'))
    page.keyboard.press('Enter'); time.sleep(0.8)
    time.sleep(0.5)
    page.screenshot(path=str(OUT / 'hub-waiting.png'))
    log = page.evaluate('() => window.__log.map(m => m.type)')
    check('joining sends ready to the hub', 'ready' in log, log[-6:])
    page.evaluate("() => window.sendToGame({ type: 'start', in: 0 })")
    time.sleep(2.0)
    scene = page.frames[1].evaluate('() => window.HALF_BAKED.scene()')
    hubOn = page.frames[1].evaluate('() => window.HALF_BAKED.state() && window.HALF_BAKED.state().hub')
    check('start begins the hub round in the lab', scene == 'lab' and hubOn is True, f'{scene} hub={hubOn}')
    seedOk = page.frames[1].evaluate('() => window.HALF_BAKED.state().seed')
    check('the round uses the hub seed', seedOk == 424242, seedOk)
    page.frames[1].evaluate('() => { window.HALF_BAKED.state().cash = 1234; }')
    time.sleep(0.5)
    page.evaluate("() => window.sendToGame({ type: 'time-up', graceMs: 5000 })")
    time.sleep(2.5)
    log_msgs = page.evaluate('() => window.__log')
    results = [m for m in log_msgs if m.get('type') == 'result']
    check('time-up posts the result once', len(results) == 1, len(results))
    check('the result carries the cash score', results and results[0].get('score') == 1234, results[:1])
    scene = page.frames[1].evaluate('() => window.HALF_BAKED.scene()')
    check('time-up shows the results', scene == 'results', scene)
    page.screenshot(path=str(OUT / 'hub-results.png'))
    check('no page errors in the hub run', not [e for e in errs if e.startswith('PAGEERROR')], errs[:3])
    browser.close()

passed = sum(1 for c in checks if c['ok'])
print(f'{passed}/{len(checks)} hub checks passed', flush=True)
(OUT / 'hub.json').write_text(json.dumps(checks, indent=1))
