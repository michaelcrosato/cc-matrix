"""Networking verification. Run with the installed Playwright Python interpreter."""

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


FIXTURE = """<!doctype html><html><head><meta charset="utf-8">
<script>SESSION_SOURCE</script>
<meta name="hub:session" content="1"><meta name="hub:session-players" content="1-2">
<meta name="hub:session-mode" content="shared-world"><meta name="hub:session-goal" content="Catch bombs">
<meta name="hub:session-howto" content="Move left or right"><meta name="hub:session-minutes" content="5">
</head><body><h1>Ka-Splat network test fixture</h1><div id="network"></div>
<script type="module">
import {Online} from './online.js';
window.events = []; window.inputs=[]; window.snapshots=[];
let timer; let score=0;
const online=new Online({
onStart(){events.push('start'); if(online.hubActive) timer=setInterval(()=>{online.sendInput({x:Math.sin(performance.now()*.001),splash:false});if(online.isHost)online.broadcast({score:++score});},90);},
onInput(id,input){inputs.push({id,...input});},onSnapshot(s){snapshots.push(s);},
onEnd(reason){events.push('end:'+reason);clearInterval(timer);},
onLeave(id){events.push('leave:'+id);},onConnected(){events.push('connected');}
});window.online=online;
await online.init();online.ready();if(!online.hubActive)online.mount(document.getElementById('network'));
window.loaded=true;
</script></body></html>"""


def main():
    fixture_path = ROOT / "network-test-fixture.html"
    fixture_path.write_text(
        FIXTURE.replace("SESSION_SOURCE", (ROOT / "hub/session.js").read_text())
    )
    server = ThreadingHTTPServer(
        ("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT))
    )
    server.daemon_threads = True
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    origin = f"http://127.0.0.1:{server.server_port}"
    failures = []
    checks = 0

    def check(condition, label):
        nonlocal checks
        checks += 1
        if not condition:
            failures.append(label)
            print("FAIL:", label)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context()
            a = context.new_page()
            b = context.new_page()
            errors = []
            a.on("pageerror", lambda error: errors.append(str(error)))
            b.on("pageerror", lambda error: errors.append(str(error)))
            for page in (a, b):
                page.goto(origin + "/network-test-fixture.html")
                page.wait_for_function("window.loaded === true")
            check(
                a.locator("h1").inner_text() == "Ka-Splat network test fixture",
                "fixture page served",
            )
            invalid = b.evaluate(
                "async()=>{try{await online.acceptOffer('bad');return false}catch(e){return e.message.includes('complete invitation')}}"
            )
            check(invalid, "invalid invitation reports readable error")
            offer = a.evaluate("async()=>await online.createOffer()")
            answer = b.evaluate("async(code)=>await online.acceptOffer(code)", offer)
            a.evaluate("async(code)=>await online.acceptAnswer(code)", answer)
            for page in (a, b):
                page.wait_for_function("online.connected", timeout=15000)
            check(
                a.evaluate(
                    "online.isHost && online.localId===0 && online.players.length===2"
                ),
                "host identity and both seats",
            )
            check(
                b.evaluate(
                    "!online.isHost && online.localId===1 && online.players.length===2"
                ),
                "guest identity and both seats",
            )
            b.evaluate("online.sendInput({x:3.5,splash:true})")
            a.wait_for_function("inputs.some(i=>i.id===1 && i.x===3.5 && i.splash)")
            check(True, "guest input reaches authoritative host")
            b.evaluate("online.sendInput({x:0,splash:false})")
            b.wait_for_timeout(100)
            a.evaluate("inputs.length=0")
            b.evaluate(
                "async()=>{for(let i=0;i<30;i++){online.sendInput({x:i*.01,splash:true});await new Promise(r=>setTimeout(r,16));}}"
            )
            b.wait_for_timeout(100)
            held = a.evaluate("inputs.filter(i=>i.id===1)")
            check(
                len(held) <= 8 and sum(1 for item in held if item["splash"]) == 1,
                "held splash remains one action and respects network rate limit",
            )
            a.evaluate("online.sendInput({x:-2,splash:false})")
            check(
                a.evaluate("inputs.some(i=>i.id===0 && i.x===-2)"),
                "host own input delivered",
            )
            a.evaluate("online.broadcast({score:111,wave:3,bombs:[{x:2,y:4}]},true)")
            b.wait_for_function("snapshots.length===1")
            check(
                b.evaluate("snapshots[0].score===111 && snapshots[0].bombs[0].x===2"),
                "world snapshot reaches guest",
            )
            a.evaluate("online.start()")
            b.wait_for_function("events.includes('start')")
            check(
                a.evaluate("events.includes('start')"), "host and guest start together"
            )
            a.evaluate("online.disconnect()")
            b.wait_for_function("!online.connected")
            check(
                b.evaluate("events.includes('leave:0')"), "guest observes disconnection"
            )
            check(not errors, "standalone browser errors: " + "; ".join(errors))
            a.close()
            b.close()
            context.close()

            context = browser.new_context()
            page = context.new_page()
            for label, suffix in [
                ("standard", ""),
                ("impaired", "&latency=150&jitter=50&loss=5"),
                ("server", "&scenario=server"),
                ("host leave", "&scenario=host-leave"),
            ]:
                page.goto(
                    origin
                    + "/hub/harness.html?game=../network-test-fixture.html&players=2&auto=1&play=2500"
                    + suffix
                )
                page.wait_for_function(
                    "document.body.dataset.complete==='true'", timeout=60000
                )
                report = page.evaluate("window.__hubCheck")
                for item in report.get("checks", []):
                    check(
                        item["pass"],
                        f"Hub {label}: {item['name']} {item.get('detail', '')}",
                    )
                if not report.get("checks"):
                    check(False, f"Hub {label}: no checks")
            page.close()
            context.close()
            browser.close()
    except Exception as error:  # noqa: BLE001 — Report setup failures in the test summary.
        check(False, f"test execution: {error}")
    finally:
        server.shutdown()
        server.server_close()
    print(
        f"{checks - len(failures)}/{checks} networking checks passed; {len(failures)} failures"
    )
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
