"""Official AI Hub automatic conformance scenarios, silent until caller reports."""
from urllib.parse import urlencode


def hub_checks(browser, base_url, game_path, scenarios=("normal", "host-leave", "server")):
    """base_url serves workspace root; game_path and harness path are relative to it."""
    results = []
    folder = "Super-Delivery-Superman-1979-gpt-6.1-sol-ultra-20261106-011211"
    for scenario in scenarios:
        page = browser.new_page(viewport={"width": 1600, "height": 900})
        try:
            query = {"game": "/" + game_path.lstrip("/"), "players": "2", "auto": "1", "play": "6000", "limit": "60", "seed": "1979"}
            if scenario != "normal":
                query["scenario"] = scenario
            if scenario == "normal":
                query.update({"latency": "150", "jitter": "50", "loss": "5"})
            page.goto(f"{base_url}/{folder}/hub-harness/harness.html?{urlencode(query)}", wait_until="domcontentloaded")
            page.wait_for_function("window.__hubCheck?.done === true", timeout=180000)
            report = page.evaluate("window.__hubCheck")
            failures = [f"{c['name']}: {c.get('detail', '')}" for c in report.get("checks", []) if not c.get("pass")]
            results.append((f"AI Hub {scenario} conformance", bool(report.get("pass")), "; ".join(failures)))
            if not report.get("pass"):
                # Detail is kept as a test artifact, not printed on passing runs.
                from pathlib import Path
                import json
                Path(__file__).with_name(f"hub-{scenario}-report.json").write_text(json.dumps(report, indent=2))
        except Exception as exc:
            results.append((f"AI Hub {scenario} conformance", False, str(exc)))
        finally:
            page.close()
    return results


def hub_gameplay_checks(browser, base_url, game_path):
    """Exercise guest actions against the host's real physics and mission state."""
    results = []
    page = browser.new_page(viewport={"width": 1600, "height": 900})
    folder = "Super-Delivery-Superman-1979-gpt-6.1-sol-ultra-20261106-011211"
    try:
        query = urlencode({"game": "/" + game_path.lstrip("/"), "players": "2", "limit": "60", "seed": "1979"})
        page.goto(f"{base_url}/{folder}/hub-harness/harness.html?{query}", wait_until="domcontentloaded")
        page.wait_for_function("document.querySelectorAll('iframe').length===2 && [...document.querySelectorAll('iframe')].every(f=>f.contentWindow.__gameReady)", timeout=60000)
        frames = [frame for frame in page.frames if frame.parent_frame is not None]
        host = next(frame for frame in frames if frame.evaluate("AIHub.isHost"))
        guest = next(frame for frame in frames if not frame.evaluate("AIHub.isHost"))
        page.locator("#release").click()
        guest.wait_for_function("AIHub.time()>=0 && __game.screen==='play'", timeout=15000)

        def key(frame, code, down=True):
            frame.evaluate("([code,down])=>dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{key:code==='Space'?' ':code.replace('Key','').toLowerCase(),code,bubbles:true}))", [code, down])

        key(guest, "KeyE")
        key(guest, "KeyE", False)
        host.wait_for_function("__game.state.phase==='active'", timeout=8000)
        guest.wait_for_function("__game.state.phase==='active'", timeout=8000)
        results.append(("Co-op guest interaction transforms both heroes", host.evaluate("__game.snapshot().players.every(p=>!p.reporter)"), ""))

        key(guest, "Space")
        host.wait_for_function("__game.snapshot().players[1].pos[1]>5", timeout=8000)
        key(guest, "Space", False)
        guest.wait_for_function("__game.player.flying && __game.player.pos[1]>5", timeout=8000)
        results.append(("Co-op guest flight runs in host Rapier world", True, ""))

        before = host.evaluate("__game.state.scans")
        key(guest, "KeyQ")
        key(guest, "KeyQ", False)
        host.wait_for_function("n=>__game.state.scans>n", arg=before, timeout=8000)
        guest.wait_for_function("n=>__game.state.scans>n", arg=before, timeout=8000)
        results.append(("Co-op guest scan is consumed once and replicated", host.evaluate("__game.state.scans") == before + 1, ""))

        page.locator("#timeup").click()
        host.wait_for_function("__game.screen==='ended'", timeout=8000)
        guest.wait_for_function("__game.screen==='ended'", timeout=8000)
        results.append(("Co-op hub end freezes both copies", True, ""))
    except Exception as exc:
        results.append(("Co-op real guest controls", False, str(exc)))
    finally:
        page.close()
    return results
