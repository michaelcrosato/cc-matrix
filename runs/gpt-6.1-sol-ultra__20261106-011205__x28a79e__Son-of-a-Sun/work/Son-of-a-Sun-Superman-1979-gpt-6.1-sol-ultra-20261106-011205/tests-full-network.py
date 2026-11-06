"""Check real shared-world controls and boss presentation in the complete game."""
import functools
import http.server
import pathlib
import threading

from playwright.sync_api import sync_playwright


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


root = pathlib.Path(__file__).resolve().parent
server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(root)))
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{server.server_port}"
failures = []
checks = 0


def check(value, message):
    global checks
    checks += 1
    if not value:
        failures.append(message)


try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=[
            "--enable-unsafe-webgpu", "--enable-features=Vulkan", "--use-webgpu-adapter=swiftshader",
        ])
        context = browser.new_context(viewport={"width": 960, "height": 540})
        host, guest = context.new_page(), context.new_page()
        errors = []
        for page in [host, guest]:
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(base + "/game.html?test=1")
            page.wait_for_function("window.__sun?.state.ready || window.__bootError", timeout=180000)
            check(page.evaluate("!window.__bootError && __sun.state.backend === 'WebGPU'"), "Game did not boot with WebGPU")
        host.evaluate("__sun.openMenu('tabroom')")
        host.locator("#roomName").fill("FULL-GAME-CHECK")
        host.locator("[data-act=hosttab]").click()
        guest.evaluate("__sun.openMenu('tabroom')")
        guest.locator("#roomName").fill("FULL-GAME-CHECK")
        guest.locator("[data-act=jointab]").click()
        guest.wait_for_function("__sun.state.network.connected && __sun.state.actors === 2")
        host.wait_for_function("__sun.state.actors === 2")
        check(host.evaluate("__sun.state.network.role === 'host' && __sun.state.mode === 'playing'"), "Host did not enter shared gameplay")
        check(guest.evaluate("__sun.state.network.role === 'guest' && __sun.state.mode === 'playing'"), "Partner did not enter shared gameplay")
        guest_y = host.evaluate("__sun.state.heroes.find(h=>h.id==='1').pos[1]")
        guest.evaluate("__sun.input({x:0,z:0,y:1})")
        host.wait_for_function("start => __sun.state.heroes.find(h=>h.id==='1').pos[1] > start+5", arg=guest_y, timeout=20000)
        guest.evaluate("__sun.input({x:0,z:0,y:0})")
        check(host.evaluate("__sun.state.heroes.find(h=>h.id==='1').pos[1]") > guest_y + 5, "Guest input did not move its authoritative host hero")
        guest.wait_for_function("start => __sun.state.heroes.find(h=>h.id==='1').pos[1] > start+5", arg=guest_y)
        check(guest.evaluate("__sun.primaryId") == "1", "Guest camera/control owner has incorrect id")
        host_y = guest.evaluate("__sun.state.heroes.find(h=>h.id==='0').pos[1]")
        host.evaluate("__sun.input({x:0,z:0,y:1})")
        guest.wait_for_function("start => __sun.state.heroes.find(h=>h.id==='0').pos[1] > start+5", arg=host_y, timeout=20000)
        host.evaluate("__sun.input({x:0,z:0,y:0})")
        check(True, "Host movement did not reach guest")
        host.evaluate("async () => {await __sun.action('skip');await __sun.action('skip');await __sun.action('skip');}")
        guest.wait_for_function("__sun.state.mission === 3 && __sun.state.drones.some(d=>d[4])")
        check(guest.evaluate("__sun.state.drones.length === 6 && __sun.state.drones.every(d=>d[4])"), "Guest cannot see synchronized enemy drones")
        host.evaluate("__sun.warp([0,55,-115])")
        guest.wait_for_function("__sun.state.bolts.length > 0", timeout=25000)
        check(True, "Guest cannot see enemy projectiles")
        host.evaluate("__sun.warp([18,2,92]);__sun.input({action:true,x:0,z:0,y:0})")
        guest.wait_for_function("__sun.state.heroes.find(h=>h.id==='0').reporter", timeout=10000)
        host.evaluate("__sun.input({action:false,x:0,z:0,y:0})")
        check(guest.evaluate("__sun.state.heroes.find(h=>h.id==='0').reporter"), "Reporter identity transformation did not synchronize")
        check(guest.evaluate("__sun.state.bonusIdentity") == host.evaluate("__sun.state.bonusIdentity"), "Bonus completion flag did not synchronize")
        check(guest.evaluate("__sun.state.bridgeDone.length === 3 && __sun.state.bridgePos.length === 3"), "Bridge bonus state did not synchronize")
        check(not errors, "Runtime errors: " + "; ".join(errors))
        guest.evaluate("__sun.online.close()")
        host.wait_for_function("__sun.state.actors === 1")
        check(True, "Disconnected guest hero remained in host world")
        context.close()
        browser.close()
except Exception as error:
    failures.append(str(error))
finally:
    server.shutdown()
    server.server_close()
for failure in failures:
    print("FAIL:", failure)
print(f"{checks} full-game network checks, {len(failures)} failures")
raise SystemExit(bool(failures))
