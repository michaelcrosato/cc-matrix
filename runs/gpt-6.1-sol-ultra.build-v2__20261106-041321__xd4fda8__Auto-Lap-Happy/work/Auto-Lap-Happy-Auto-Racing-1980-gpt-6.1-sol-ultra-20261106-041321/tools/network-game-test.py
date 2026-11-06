import http.server
import json
import pathlib
import sys
import threading

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]


class Quiet(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def log_message(self, *a):
        pass


server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Quiet)
threading.Thread(target=server.serve_forever, daemon=True).start()
mode = sys.argv[1] if len(sys.argv) > 1 else "loopback"
url = (
    (ROOT / "index.html").as_uri()
    if mode == "file"
    else "http://127.0.0.1:" + str(server.server_port) + "/index.html"
)
results = []


def check(name, passed, detail=""):
    results.append({"name": name, "pass": bool(passed), "detail": detail})


with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True,
        args=[
            "--disable-dev-shm-usage",
            "--use-gl=angle",
            "--use-angle=swiftshader",
            "--enable-unsafe-swiftshader",
        ],
    )
    context = browser.new_context(viewport={"width": 1280, "height": 720})
    context.add_init_script(
        """window.__testPad={index:0,id:'Test standard pad',connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:18},()=>({pressed:false,touched:false,value:0}))};navigator.getGamepads=()=>[window.__testPad];"""
    )
    host = context.new_page()
    guest = context.new_page()
    errors = []
    for page, role in [(host, "host"), (guest, "join")]:
        page.on("pageerror", lambda e, errors=errors: errors.append(str(e)))
        page.goto(url)
        page.wait_for_function("window.__happy")
        page.evaluate("__happy.game.stop()")
        check("actual game identity", page.title() == "Auto Lap Happy", page.url)
        page.locator('[data-action="multi"]').click()
        page.locator(f'[data-action="{role}"]').click()
    try:
        host.locator('[data-action="create-offer"]').click()
        host.wait_for_function(
            'document.querySelector("#connection-output").value.length>100'
        )
        offer = host.locator("#connection-output").input_value()
        host.evaluate(
            "Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(new DOMException('Test permission denial','NotAllowedError'))}})"
        )
        host.locator('[data-action="copy"]').click()
        check(
            "clipboard denial preserves selectable connection text",
            host.locator("#connection-output").input_value() == offer
            and "refused" in host.locator("#network-status").inner_text(),
        )
        guest.locator("#import-connection").set_input_files(
            {
                "name": "invitation.txt",
                "mimeType": "text/plain",
                "buffer": offer.encode(),
            }
        )
        guest.wait_for_function(
            'document.querySelector("#connection-input").value.length>100'
        )
        check(
            "invitation text file import fills actual input",
            guest.locator("#connection-input").input_value() == offer,
        )
        guest.locator('[data-action="create-answer"]').click()
        guest.wait_for_function(
            'document.querySelector("#connection-output").value.length>100'
        )
        answer = guest.locator("#connection-output").input_value()
        host.locator("#connection-input").fill(answer)
        host.locator('[data-action="apply-answer"]').click()
        for page in [host, guest]:
            page.wait_for_function(
                "__happy.network.connected && __happy.network.peerReady", timeout=15000
            )
        check("actual invitation and reply screens establish real channels", True)
        host.locator('[data-action="direct-start"]').click()
        for page in [host, guest]:
            page.wait_for_function(
                '__happy.screen==="driving" && __happy.network.clock()>=0',
                timeout=15000,
            )
            page.evaluate("__happy.game.start();dispatchEvent(new Event('focus'))")
        check(
            "actual peers enter one matched duel",
            host.evaluate("__happy.sim.courseIndex")
            == guest.evaluate("__happy.sim.courseIndex")
            and host.evaluate("__happy.sim.humans===2")
            and guest.evaluate("__happy.sim.cars.length===2"),
        )
        host.evaluate(
            """() => {window.contacts=0;const collide=My3D2dge.Car.collide;My3D2dge.Car.collide=function(cars){if(cars.length>1&&Math.hypot(cars[0].x-cars[1].x,cars[0].y-cars[1].y)<cars[0].r+cars[1].r)contacts++;return collide(cars);};}"""
        )
        host.keyboard.down("d")
        guest.keyboard.down("a")
        host.wait_for_function("contacts>0", timeout=10000)
        host.keyboard.up("d")
        guest.keyboard.up("a")
        check(
            "actual network cars make physical contact",
            host.evaluate("contacts>0"),
            host.evaluate("contacts"),
        )
        host.evaluate(
            """window.driver=setInterval(()=>{const h=__happy,c=h.sim.cars[h.network.localSeat];if(!c)return;const i=h.sim.aiIntent(c);__testPad.axes[0]=i.steer;__testPad.buttons[6]={pressed:i.brake>.05,touched:true,value:i.brake};__testPad.buttons[7]={pressed:true,touched:true,value:i.gas};},20);"""
        )
        guest.keyboard.down("Space")
        host.wait_for_function("__happy.sim.score[0]>=1", timeout=20000)
        check(
            "legitimate driving awards clear-lead point",
            host.evaluate(
                '__happy.sim.events.some(e=>e.type==="point"&&e.points===1&&e.seat===0)'
            ),
            host.evaluate("__happy.sim.score"),
        )
        for page in [host, guest]:
            page.evaluate("__happy.network.testDelay=150;__happy.network.testLoss=.05")
        guest.keyboard.down("r")
        host.wait_for_function(
            '__happy.sim.events.some(e=>e.type==="point"&&e.points===2)', timeout=35000
        )
        check(
            "remote recover input awards crash points once",
            host.evaluate(
                '__happy.sim.events.some(e=>e.type==="point"&&e.points===2&&e.seat===0)'
            ),
            host.evaluate("__happy.sim.score"),
        )
        for page in [host, guest]:
            page.wait_for_function('__happy.screen==="results"', timeout=90000)
        guest.keyboard.up("r")
        guest.keyboard.up("Space")
        host.evaluate("clearInterval(driver)")
        check(
            "input-driven actual direct duel reaches results on both peers",
            host.evaluate('__happy.sim.state==="finished"&&__happy.sim.score[0]>=10')
            and guest.evaluate(
                '__happy.sim.state==="finished"&&__happy.sim.score[0]>=10'
            ),
        )
        check(
            "actual direct game converges through delay and loss",
            host.evaluate("__happy.sim.score") == guest.evaluate("__happy.sim.score"),
        )
        old_round = host.evaluate("__happy.network.round")
        host.locator('[data-action="retry"]').click()
        for page in [host, guest]:
            page.wait_for_function(
                '__happy.screen==="driving"&&__happy.network.clock()<0&&__happy.sim.score[0]===0',
                timeout=10000,
            )
        check(
            "actual results rematch resets both peers",
            host.evaluate("__happy.network.round")
            == guest.evaluate("__happy.network.round")
            == old_round + 1,
        )
        guest.keyboard.press("Escape")
        check(
            "online pause says race continues",
            guest.locator("#ui").inner_text().find("RACE CONTINUES") >= 0,
        )
        host.evaluate(
            "__happy.game.stop();Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))"
        )
        host.wait_for_function("__happy.network.clock()>.5", timeout=6000)
        tick = host.evaluate("__happy.sim.tick")
        host.wait_for_timeout(600)
        check(
            "authority runs without renderer or visible host",
            host.evaluate("__happy.sim.tick") > tick + 35,
        )
        check(
            "common timeline does not double-step authority",
            host.evaluate(
                "Math.abs(__happy.sim.tick-Math.floor(__happy.network.clock()*120))<20"
            ),
        )
        host.evaluate("__happy.network.startAt=performance.now()-241000")
        for page in [host, guest]:
            page.wait_for_function('__happy.sim.state==="finished"', timeout=10000)
        check(
            "direct deadline follows monotonic clock",
            host.evaluate(
                '__happy.sim.finishedResult.time===240 && __happy.sim.finishedResult.reason.includes("draw")'
            ),
        )
        host.evaluate("__happy.network.destroy()")
        guest.wait_for_function('__happy.screen==="connection-ended"', timeout=10000)
        check(
            "actual host closure has actionable guest result",
            "Return to multiplayer" in guest.locator("#ui").inner_text(),
        )
        check("actual direct game has no page errors", not errors, errors)
    except (PlaywrightError, OSError, ValueError) as e:
        check("actual direct game flow", False, str(e))
        for page, label in [(host, "host"), (guest, "guest")]:
            try:
                (ROOT / "evidence" / ("direct-game-" + label + ".json")).write_text(
                    json.dumps(
                        page.evaluate(
                            '({screen:__happy.screen,attracting:__happy.attracting,state:__happy.sim.state==="idle"?{state:"idle"}:__happy.sim.snapshot(),net:{status:__happy.network.status,kind:__happy.network.kind,connected:__happy.network.connected,clock:__happy.network.clock()},ui:document.querySelector("#ui").innerText})'
                        ),
                        indent=2,
                    )
                )
            except (PlaywrightError, OSError):
                pass
    finally:
        context.close()
        browser.close()
server.shutdown()
server.server_close()
(ROOT / "evidence" / ("direct-game-" + mode + ".json")).write_text(
    json.dumps(results, indent=2)
)
print(json.dumps(results))
