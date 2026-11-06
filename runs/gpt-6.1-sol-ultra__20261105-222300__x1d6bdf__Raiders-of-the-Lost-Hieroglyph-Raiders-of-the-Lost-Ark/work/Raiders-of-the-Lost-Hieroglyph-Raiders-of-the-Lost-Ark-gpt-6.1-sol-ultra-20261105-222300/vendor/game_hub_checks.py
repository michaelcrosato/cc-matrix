"""AI Hub's official harness plus live game assertions for the one-command suite.

The browser must be launched with this workstation's WebGPU/SwiftShader flags.
Only one harness page lives at once; closing its context destroys its game frames.
"""
from urllib.parse import quote, urlencode, urljoin, urlsplit


def run_game_hub_checks(browser, page_url):
    """Return passed check count or raise one assertion containing failures."""
    parsed = urlsplit(page_url)
    filename = parsed.path.rsplit("/", 1)[-1]
    folder = filename.removesuffix(".html")
    harness_url = urljoin(page_url, quote(folder) + "/vendor/harness.html")
    game_path = "../../" + filename
    checks = 0
    failures = []
    scenarios = [
        ("standard", {}),
        ("server", {"scenario": "server"}),
        ("host-leave", {"scenario": "host-leave"}),
        ("latency", {"latency": "150", "jitter": "50", "loss": "5"}),
    ]
    for name, extras in scenarios:
        context = browser.new_context(viewport={"width": 1280, "height": 720})
        page = context.new_page()
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        try:
            query = {"game": game_path, "players": "2", "auto": "1", "play": "3000", **extras}
            page.goto(harness_url + "?" + urlencode(query), wait_until="domcontentloaded")
            page.wait_for_function("document.title.includes('AI Hub')", timeout=5000)
            if name in ("standard", "server"):
                # All copies connect and ready with no key, including the hidden server.
                page.wait_for_function("""() => {
                    const frames=[...document.querySelectorAll('#grid iframe')];
                    return frames.length >= 2 && frames.every(f =>
                        f.contentWindow.__game?.state.ready &&
                        f.contentWindow.__game.network.started);
                }""", timeout=60000)
                copies = page.evaluate("""() => [...document.querySelectorAll('#grid iframe')].map(f=>({
                    title:f.title,
                    state:f.contentWindow.__game.state,
                    me:f.contentWindow.__game.network.me,
                    server:f.contentWindow.__game.network.server,
                    host:f.contentWindow.__game.network.isHost,
                    titleHidden:f.contentDocument.querySelector('#title').classList.contains('hidden')
                }))""")
                assert all(c["state"]["network"]["active"] and c["titleHidden"] for c in copies), "Hub must bypass title on every copy"
                checks += 1
                assert all(c["state"]["renderer"] == "webgpu" for c in copies), "Every Hub copy must use WebGPU"
                checks += 1
                if name == "server":
                    server = next(c for c in copies if c["server"])
                    assert server["host"] and server["me"] not in [p["id"] for p in server["state"]["players"]], "Dedicated server must simulate only the remote players"
                    checks += 1
                # Physical keyboard input on a guest must move its authoritative actor.
                # The official harness's synthetic keys can also be held concurrently.
                host_index = next(i for i,c in enumerate(copies) if c["host"])
                guest_index = next(i for i,c in enumerate(copies) if not c["host"])
                guest_id = copies[guest_index]["me"]
                before = next(p for p in copies[host_index]["state"]["players"] if p["id"] == guest_id)
                page.evaluate("""index => {
                    const w=document.querySelectorAll('#grid iframe')[index].contentWindow;
                    w.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowRight',code:'ArrowRight',bubbles:true}));
                }""", guest_index)
                page.wait_for_timeout(650)
                page.evaluate("""index => {
                    const w=document.querySelectorAll('#grid iframe')[index].contentWindow;
                    w.dispatchEvent(new w.KeyboardEvent('keyup',{key:'ArrowRight',code:'ArrowRight',bubbles:true}));
                }""", guest_index)
                after = page.evaluate("""([index,id]) => document.querySelectorAll('#grid iframe')[index].contentWindow.__game.state.players.find(p=>p.id===id)""", [host_index, guest_id])
                assert abs(after["x"]-before["x"]) + abs(after["z"]-before["z"]) > 0.1, "Guest controls must reach authoritative simulation"
                checks += 1
            page.wait_for_function("document.body.dataset.complete === 'true'", timeout=90000)
            report = page.evaluate("window.__hubCheck")
            for check in report.get("checks", []):
                if check["pass"]:
                    checks += 1
                else:
                    failures.append(f"{name}: {check['name']}: {check.get('detail','')}")
            assert report.get("done") and report.get("pass"), "Official harness rejected the game"
            if name in ("standard", "server", "latency"):
                ended = page.evaluate("""() => [...document.querySelectorAll('#grid iframe')].map(f=>({
                    ended:f.contentWindow.__game.network.ended,
                    paused:f.contentWindow.__game.state.audio.paused,
                    send:f.contentWindow.__game.network.sendInput({mx:1}),
                }))""")
                assert all(c["ended"] and c["paused"] and not c["send"] for c in ended), "Hub end must stop sound and traffic on every copy"
                checks += 1
            assert not errors, "Harness page errors: " + "; ".join(errors)
            checks += 1
        except Exception as error:
            if str(error) != "Official harness rejected the game":
                failures.append(f"{name}: {error}")
        finally:
            context.close()
    assert not failures, "\n".join(failures)
    return checks
