import functools
import http.server
import json
import sys
import threading
import traceback
import urllib.parse
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / 'evidence'
checks = 0
failures = []
reports = []

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

def check(name, condition, detail=''):
    global checks
    checks += 1
    if not condition:
        failures.append({'name': name, 'detail': str(detail)})

handler = functools.partial(QuietHandler, directory=str(ROOT.parent))
server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
origin = 'http://127.0.0.1:' + str(server.server_address[1])
artifact = '/' + ROOT.name + '.html'
harness = '/' + ROOT.name + '/vendor/hub/harness.html'

try:
    served = urllib.request.urlopen(origin + artifact).read().decode()
    check('Owned loopback origin serves the actual exported game', '<title>Astro Battle Jam' in served)
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for seats, scenario in [(1, 'standard'), (2, 'standard'), (2, 'host-leave'), (2, 'server')]:
            page = browser.new_page(viewport={'width': 1600, 'height': 1000})
            errors = []
            warnings = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.on('console', lambda m: warnings.append(m.text) if m.type in ['error', 'warning'] else None)
            params = {'game': artifact, 'players': seats, 'latency': 150, 'jitter': 50, 'loss': 5, 'auto': 1, 'scenario': scenario, 'play': 6000}
            page.goto(origin + harness + '?' + urllib.parse.urlencode(params))
            page.wait_for_selector('body[data-complete="true"]', timeout=60000)
            report = page.evaluate('window.__hubCheck')
            reports.append(report)
            check('Official harness ' + str(seats) + '-seat ' + scenario, report['pass'], [c for c in report['checks'] if not c['pass']])
            check('Hub ' + scenario + ' has no page errors', not errors, errors)
            protocol = [m for m in warnings if '[AIHub]' in m or 'my-3D2dge:' in m]
            check('Hub ' + scenario + ' has no protocol/rate/engine warnings', not protocol, protocol)
            states = page.evaluate('Array.from(document.querySelectorAll("iframe")).map(f=>f.contentWindow.__game?.game.debug.snapshot()).filter(Boolean)')
            check('Hub ' + scenario + ' stops every remaining copy', all(s['session']['ended'] for s in states if s['session']), states)
            if scenario == 'server':
                server_state = next(s for s in states if s['session']['info'].get('server'))
                check('Server host has no local cannon seat', all(ship['id'] != server_state['session']['info']['me'] for ship in server_state['world']['ships']))
            page.close()
        # A manual shared-world round checks semantics which transport conformance cannot prove.
        page = browser.new_page(viewport={'width': 1600, 'height': 1000})
        params = {'game': artifact, 'players': 2, 'latency': 150, 'jitter': 50, 'loss': 5, 'limit': 90}
        page.goto(origin + harness + '?' + urllib.parse.urlencode(params))
        page.wait_for_function('Array.from(document.querySelectorAll("iframe")).length===2 && Array.from(document.querySelectorAll("iframe")).every(f=>f.contentWindow.__game?.app.session?.debug.ready===1)')
        frames = [f for f in page.frames if 'aihub=1' in f.url]
        host = next(f for f in frames if f.evaluate('__game.app.session.info.isHost'))
        guest = next(f for f in frames if not f.evaluate('__game.app.session.info.isHost'))
        check('Session bypasses standalone gates without any gesture', all(f.evaluate('__game.app.screen === "hubwait" && __game.game.audio.ctx === null && __game.app.session.state.tick === 0') for f in frames))
        page.click('#release')
        page.wait_for_function('Array.from(document.querySelectorAll("iframe")).every(f=>f.contentWindow.__game?.app.session?.started)')
        check('Start event still observes countdown before tick zero', all(f.evaluate('__game.app.session.hub.time() < 0 && __game.app.session.state.tick === 0') for f in frames))
        guest.wait_for_function('__game.app.screen === "play"')
        def key(frame, code, down):
            frame.evaluate('(o)=>document.body.dispatchEvent(new KeyboardEvent(o.down?"keydown":"keyup",{code:o.code,key:o.code,bubbles:true,cancelable:true}))', {'code': code, 'down': down})
        key(guest, 'Space', True)
        host.wait_for_function('__game.app.sim === null && __game.app.session.sim.s.stats.shots >= 4')
        key(guest, 'Space', False)
        key(guest, 'KeyQ', True)
        try:
            host.wait_for_function('__game.app.session.sim.s.ships[1].repairs > 0', timeout=5000)
        except Exception:
            reports.append({'repairDebug': [f.evaluate('({state:__game.app.session.state,screen:__game.app.screen,command:__game.app.session.current,ack:__game.app.session.ack,inputs:Array.from(__game.app.session.inputs),pending:Array.from(__game.app.session.pendingRepair),debug:__game.app.session.debug,repairDown:__game.game.input.down("repair"),gate:__game.app.gate})') for f in frames]})
            raise
        key(guest, 'KeyQ', False)
        guest.wait_for_function('__game.app.session.state.ships[1].repairs > 0')
        check('Guest fire and repair reach host authority and replicate charge cost', guest.evaluate('__game.app.session.state.ships[1].charges===0 && __game.app.session.ack[__game.app.session.info.me]===1'))
        agreement = 'Array.from(document.querySelectorAll("iframe")).map(f=>{const s=f.contentWindow.__game.app.session.state;return JSON.stringify({b:s.bunkers.map(b=>b.rows),c:s.ships.map(p=>p.charges),d:s.ships.map(p=>p.deaths),r:s.reserve,score:s.score})})'
        page.wait_for_function('()=>{const a=' + agreement + ';return a[0]===a[1]}')
        check('Remote repairs agree on bunker masks, charges and team state', True)
        # Inject one authoritative falling bomb below cover to exercise the ordinary hit/respawn path.
        host.evaluate('''() => { const q=__game.app.session.sim,s=q.s,p=s.ships[1];p.shield=0;s.shots.push({id:q.id(),x:p.x,y:p.y-10,vx:0,vy:120,team:1,owner:-1,kind:'bomb',life:200}); }''')
        guest.wait_for_function('__game.app.session.state.ships[1].deaths===1 && !__game.app.session.state.ships[1].active')
        check('Authoritative remote death and reserve debit are replicated', guest.evaluate('__game.app.session.state.reserve===3'))
        guest.wait_for_function('__game.app.session.state.ships[1].active && __game.app.session.state.ships[1].shield>0')
        check('Remote protected respawn consumes reserve exactly once', guest.evaluate('__game.app.session.state.reserve===3'))
        before = host.evaluate('__game.app.session.state.tick')
        key(guest, 'Escape', True)
        key(guest, 'Escape', False)
        guest.wait_for_function('__game.app.screen === "pause"')
        host.wait_for_function('(t)=>__game.app.session.state.tick > t+60', arg=before)
        check('Guest local overlay leaves host world and input heartbeats alive', host.evaluate('__game.app.session.state.tick') > before + 60)
        guest.evaluate('__game.game.debug.show("encounters")')
        check('Every Hub world mutation is visibly disabled', guest.evaluate('__game.game.debug.snapshot().rows.filter(r=>r.label!=="MORE TOOLS" && r.label!=="BACK").every(r=>r.disabled.includes("Hub owns"))'))
        page.click('#timeup')
        guest.wait_for_function('__game.app.session.ended')
        ended = [f.evaluate('({tick:__game.app.session.state.tick,phase:__game.app.session.state.phase,reason:__game.app.session.state.reason,score:__game.app.session.state.score,sent:__game.app.session.debug.sent})') for f in frames]
        reports.append({'semanticTerminal': ended})
        check('Terminal world outcome is delivered to every copy before Hub end', all(s['phase']=='defeat' and s['reason']=='TIME EXPIRED' for s in ended), ended)
        page.close()
        browser.close()
except Exception:
    failures.append({'name': 'Hub suite execution', 'detail': traceback.format_exc()})
finally:
    server.shutdown()
    server.server_close()

(EVIDENCE / 'hub-tests.json').write_text(json.dumps({'count': checks, 'failures': failures, 'reports': reports}, indent=2))
for f in failures:
    print('FAIL ' + f['name'] + ': ' + f['detail'], file=sys.stderr)
print(json.dumps({'suite': 'hub', 'count': checks, 'failed': len(failures)}))
sys.exit(1 if failures else 0)
