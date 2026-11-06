# ruff: noqa: BLE001
# Collect each browser-check failure so the suite can report all independent failures.
"""Official AI Hub conformance scenarios, consumed by the project's single test command."""

from urllib.parse import urlencode

GAME_DIR = "HERO-Blast-Shift-HERO-1984-gpt-6.1-sol-ultra-20261105-214551"
GAME_FILE = GAME_DIR + ".html"


def run_hub_tests(browser, base_url, scenarios=None):
    """Return (cases, errors); never print routine status or leak pages/contexts."""
    cases, errors = [], []
    scenarios = scenarios or [
        ("AI Hub two-player ghost race", {"players": 2}),
        (
            "AI Hub four-player adverse network",
            {"players": 4, "latency": 150, "jitter": 50, "loss": 5},
        ),
        (
            "AI Hub host leaves ghost race",
            {
                "players": 4,
                "latency": 150,
                "jitter": 50,
                "loss": 5,
                "scenario": "host-leave",
            },
        ),
    ]
    for label, options in scenarios:
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()
        page_errors = []
        page.on(
            "pageerror",
            lambda error, sink=page_errors: sink.append(
                getattr(error, "stack", str(error))
            ),
        )
        try:
            query = urlencode({"game": "../" + GAME_FILE, "auto": 1, **options})
            url = base_url.rstrip("/") + "/" + GAME_DIR + "/harness.html?" + query
            page.goto(url, wait_until="domcontentloaded", timeout=30000)
            if page.title() != "AI Hub · session harness":
                # The title changed between protocol revisions; the harness object identifies the page.
                page.wait_for_function("window.__hubCheck !== undefined", timeout=10000)
            page.wait_for_function(
                'document.body.dataset.complete === "true"', timeout=120000
            )
            report = page.evaluate("window.__hubCheck")
            failures = [
                check for check in report.get("checks", []) if not check.get("pass")
            ]
            if report.get("pass") and not page_errors:
                cases.append(label)
            else:
                details = "; ".join(
                    f"{item['name']}: {item.get('detail', '')}" for item in failures
                )
                frames = page.evaluate(
                    'Array.from(document.querySelectorAll("iframe"), f=>{let s;try{s=f.contentWindow?.__game?.state;}catch(error){s={errors:[String(error)]};}return {ready:f.contentWindow?.__gameReady,mode:s?.mode,renderer:s?.renderer,frames:s?.frames,errors:s?.errors,network:s?.network,loading:f.contentDocument?.querySelector("#load-status")?.textContent}})'
                )
                errors.append(
                    f"{label}: {details or 'incomplete report'}; frames={frames}"
                    + (f"; errors: {page_errors}" if page_errors else "")
                )
        except Exception as exc:
            try:
                state = page.evaluate(
                    '({report:window.__hubCheck,log:document.querySelector("#log")?.textContent})'
                )
            except Exception:
                state = "unavailable"
            errors.append(f"{label}: {exc}; state={state}")
        finally:
            context.close()
    return cases, errors


def run_network_transport_tests(browser, base_url):
    """Exercise real local-tab and WebRTC finish packets without the renderer."""
    cases, errors = [], []
    context = browser.new_context()
    a, b = context.new_page(), context.new_page()
    try:
        module_url = base_url.rstrip("/") + "/" + GAME_DIR + "/network.js"
        for page in (a, b):
            page.goto(module_url, wait_until="domcontentloaded")
            page.evaluate("""async () => {
                const {Network} = await import('./network.js');
                window.finishes = [];
                window.net = new Network({onRivalFinish:(state,id,success)=>finishes.push({state,id,success})});
                await net.init();
            }""")
        a.evaluate("net.enableLocal()")
        b.evaluate("net.enableLocal()")
        a.wait_for_function("net.remoteCount===1")
        b.wait_for_function("net.remoteCount===1")
        a.evaluate("net.startRace()")
        b.wait_for_function("net.started")
        a.wait_for_function("net.canPlay")
        a.evaluate("net.update(0.2,{x:12,y:8,sector:1,score:100,rescued:2})")
        b.wait_for_function("Array.from(net.remote.values()).some(r=>r.state?.x===12)")
        cases.append("Local-tab pairing, countdown and ghost state")
        a.evaluate(
            "net.finish({x:24,y:12,sector:2,score:6400,rescued:6,time:125,success:true})"
        )
        b.wait_for_function(
            "Array.from(net.remote.values()).some(r=>r.finished&&r.success&&r.state.score===6400&&r.state.rescued===6)&&finishes.length===1"
        )
        cases.append("Local-tab finish packet and callback")
        a.evaluate("net.startRace()")
        b.wait_for_function(
            "Array.from(net.remote.values()).every(r=>!r.finished&&!r.success)"
        )
        cases.append("New race clears rival result flags")
        for page in (a, b):
            page.evaluate("net.disconnect()")
        offer = a.evaluate("net.createOffer()")
        answer = b.evaluate("(code)=>net.acceptOffer(code)", offer)
        a.evaluate("(code)=>net.acceptAnswer(code)", answer)
        a.wait_for_function("net.dataChannel.readyState==='open'", timeout=20000)
        b.wait_for_function("net.dataChannel.readyState==='open'", timeout=20000)
        a.evaluate("net.startRace()")
        b.wait_for_function("net.started")
        a.wait_for_function("net.canPlay")
        a.evaluate("net.update(0.2,{x:22,y:18,sector:2,score:4000,rescued:4})")
        b.wait_for_function("net.remote.get('peer')?.state?.x===22")
        cases.append("WebRTC offer/answer, race and ghost state")
        a.evaluate(
            "net.finish({x:38,y:10,sector:2,score:7200,rescued:6,time:115,success:true})"
        )
        b.wait_for_function(
            "net.remote.get('peer')?.finished&&net.remote.get('peer').success&&net.remote.get('peer').state.score===7200&&finishes.length===2"
        )
        cases.append("WebRTC finish packet and callback")
        a.evaluate("net.disconnect()")
        b.wait_for_function("net.remoteCount===0")
        b.evaluate("net.disconnect()")
        cases.append("Peer disconnect removes rivals")
    except Exception as exc:
        errors.append(f"Standalone network transport: {exc}")
    finally:
        context.close()
    return cases, errors


if __name__ == "__main__":
    import sys

    from playwright.sync_api import sync_playwright

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True,
            args=[
                "--enable-unsafe-webgpu",
                "--enable-features=Vulkan",
                "--use-webgpu-adapter=swiftshader",
            ],
        )
        cases, errors = run_hub_tests(
            browser, sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:38507"
        )
        browser.close()
    for error in errors:
        print("FAIL:", error)
    print(f"{len(cases)} hub scenarios passed; {len(errors)} failures")
    raise SystemExit(bool(errors))
