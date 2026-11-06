"""AI Hub conformance scenarios; imported by the game's single test command."""

from pathlib import Path
import subprocess
from urllib.parse import quote, urlencode, urlsplit


PROJECT = Path(__file__).resolve().parent
SCENARIOS = (
    ("single-player", 1, "standard", 0, 0, 0),
    ("two-player", 2, "standard", 60, 20, 0),
    ("dedicated server", 2, "server", 60, 20, 0),
    ("host departure", 2, "host-leave", 60, 20, 0),
    ("lossy network", 2, "standard", 150, 50, 5),
)



def adapter_check(require):
    script = r"""
import fs from 'node:fs';
globalThis.window = globalThis;
window.addEventListener = () => {};
globalThis.document = {createElement: () => ({}),head:{appendChild(script) {queueMicrotask(() => script.onerror());}}};
const {createOnline} = await import('data:text/javascript;base64,' + Buffer.from(fs.readFileSync('online.js','utf8')).toString('base64'));
const require = (ok,msg) => {if(!ok) throw new Error(msg);};
const wait = ms => new Promise(r=>setTimeout(r,ms));
const seen={hostStart:0,guestStart:0,state:null,input:null,seat:null,left:0,end:''};
const host=createOnline({onStart:()=>seen.hostStart++,onInput:(x,seat)=>{seen.input=x;seen.seat=seat;},onLeave:()=>seen.left++});
const guest=createOnline({onStart:()=>seen.guestStart++,onState:x=>seen.state=x,onEnd:x=>seen.end=x});
require(guest.join('bad')===false&&guest.role==='solo','invalid code changed role');
const room=host.host(); guest.join(room);
await wait(120);
require(host.connected&&guest.connected,'BroadcastChannel handshake');
require(seen.hostStart===1&&seen.guestStart===1,'both start once');
require(host.mySeat===0&&guest.mySeat===1,'seat assignment');
host.sendState({score:400,balls:[{x:2,y:4}]});guest.sendInput({x:5});
guest.sendInput({x:6,serve:true});guest.sendInput({x:7,burst:true});
await wait(85);guest.sendInput({x:8});await wait(25);
require(seen.state?.score===400,'host state to guest');
require(seen.input?.x===8&&seen.seat===1,'guest input to host');
require(seen.input.serve&&seen.input.burst,'throttling lost one-shot action');
await wait(85);guest.sendInput({x:9});await wait(25);
require(!seen.input.serve&&!seen.input.burst,'one-shot action repeated');
guest.leave();await wait(50);
require(!host.connected&&seen.left===1,'guest disconnect');host.leave();
const h2=createOnline();const g2=createOnline({onEnd:x=>seen.end=x});g2.join(h2.host());
await wait(80);h2.leave();await wait(50);
require(seen.end==='host-left'&&!g2.connected,'host disconnect');g2.leave();
"""
    result = subprocess.run(
        ["node", "--input-type=module"],
        input=script,
        text=True,
        capture_output=True,
        cwd=PROJECT,
        timeout=20,
    )
    require(result.returncode == 0, result.stderr.strip() or result.stdout.strip())

def run_hub_checks(browser, game_url, check, require):
    """Use the supplied browser and result collector, without starting a server."""
    parsed = urlsplit(game_url)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    harness = f"{origin}/{quote(PROJECT.name)}/hub/harness.html"
    reports = []
    check("online adapter and queued action reliability", lambda: adapter_check(require))
    context = browser.new_context(viewport={"width": 1280, "height": 800})
    try:
        for label, players, scenario, latency, jitter, loss in SCENARIOS:
            def scenario_check(
                label=label,
                players=players,
                scenario=scenario,
                latency=latency,
                jitter=jitter,
                loss=loss,
            ):
                page = context.new_page()
                try:
                    query = urlencode(
                        {
                            "game": parsed.path,
                            "players": players,
                            "scenario": scenario,
                            "latency": latency,
                            "jitter": jitter,
                            "loss": loss,
                            "play": 2000,
                            "auto": 1,
                        }
                    )
                    page.goto(f"{harness}?{query}", wait_until="load", timeout=120000)
                    require("AI Hub Session Harness" in page.title(), "wrong harness page")
                    page.wait_for_function(
                        "document.body.dataset.complete === 'true'", timeout=120000
                    )
                    report = page.evaluate("window.__hubCheck")
                    reports.append(report)
                    failures = [
                        f"{item['name']}: {item.get('detail', '')}"
                        for item in report.get("checks", [])
                        if not item.get("pass")
                    ]
                    require(report.get("pass"), " | ".join(failures) or str(report))
                finally:
                    page.close()
            check(f"AI Hub {label} conformance", scenario_check)
    finally:
        context.close()
    return reports


if __name__ == "__main__":
    import functools
    import http.server
    import threading

    from playwright.sync_api import sync_playwright

    root = PROJECT.parent
    game = root / f"{PROJECT.name}.html"
    count = 0
    failures = []

    class QuietHandler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *_args):
            pass

    def require(condition, message):
        if not condition:
            raise AssertionError(message)

    def check(name, fn):
        global count
        count += 1
        try:
            fn()
        except Exception as exc:
            failures.append(f"FAIL {name}: {exc}")

    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(root))
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                headless=True,
                args=[
                    "--enable-unsafe-webgpu",
                    "--enable-features=Vulkan",
                    "--use-webgpu-adapter=swiftshader",
                    "--no-sandbox",
                ],
            )
            run_hub_checks(
                browser,
                f"http://127.0.0.1:{server.server_port}/{quote(game.name)}",
                check,
                require,
            )
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
    for failure in failures:
        print(failure)
    print(f"{count} checks; {len(failures)} failures")
    raise SystemExit(1 if failures else 0)
