"""Real standalone co-op UI and gameplay tests for the unified test command."""


def game_coop_checks(browser, base_url, game_path, departure_only=False):
    results = []
    pages = []
    game_url = base_url.rstrip("/") + "/" + game_path.lstrip("/")

    def open_game():
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        pages.append(page)
        page.goto(game_url, wait_until="domcontentloaded")
        page.wait_for_function("window.__gameReady === true", timeout=60000)
        return page

    def connect(host, guest):
        # Loading another full 3D page can take longer than the attract delay.
        # A real input dismisses the replay before the visible UI is clicked.
        host.evaluate("__game.title()")
        host.locator("#online").click()
        host.locator("#host").click()
        host.locator("#codeOut").wait_for(state="attached", timeout=20000)
        offer = host.locator("#codeOut").input_value()
        guest.evaluate("__game.title()")
        guest.locator("#online").click()
        guest.locator("#join").click()
        guest.locator("#codeIn").fill(offer)
        guest.locator("#reply").click()
        guest.locator("#codeOut").wait_for(state="attached", timeout=20000)
        answer = guest.locator("#codeOut").input_value()
        host.locator("#codeIn").fill(answer)
        host.locator("#accept").click()
        for page in [host, guest]:
            page.wait_for_function("__game.network.connected && __game.screen==='play'", timeout=15000)

    def key(page, code, down=True):
        page.evaluate("([code,down])=>dispatchEvent(new KeyboardEvent(down?'keydown':'keyup',{key:code==='Space'?' ':code.replace('Key','').toLowerCase(),code,bubbles:true}))", [code, down])

    try:
        host, guest = open_game(), open_game()
        connect(host, guest)
        if departure_only:
            host.close()
            guest.wait_for_function("!__game.network.connected && __game.screen==='title'", timeout=15000)
            results.append(("Host departure returns guest to fresh safe solo edition", guest.evaluate("__game.player.reporter && __game.player.power===100 && __game.state.phase==='reporter' && __game.player.pos[1]<1"), ""))
            return results
        results.append(("Standalone co-op connects through actual invitation UI", host.evaluate("__game.network.players===2 && __game.network.isHost") and guest.evaluate("__game.network.players===2 && !__game.network.isHost"), ""))

        key(guest, "KeyE")
        key(guest, "KeyE", False)
        host.wait_for_function("__game.state.phase==='active'", timeout=8000)
        guest.wait_for_function("__game.state.phase==='active'", timeout=8000)
        results.append(("Standalone guest action transforms both heroes", host.evaluate("__game.snapshot().players.every(p=>!p.reporter)"), ""))

        key(guest, "Space")
        host.wait_for_function("__game.snapshot().players[1].pos[1]>5", timeout=8000)
        key(guest, "Space", False)
        guest.wait_for_function("__game.player.flying && __game.player.pos[1]>5", timeout=8000)
        results.append(("Standalone guest flight is authoritative on host", True, ""))

        before = host.evaluate("__game.state.scans")
        key(guest, "KeyQ")
        key(guest, "KeyQ", False)
        host.wait_for_function("n=>__game.state.scans>n", arg=before, timeout=8000)
        guest.wait_for_function("n=>__game.state.scans>n", arg=before, timeout=8000)
        results.append(("Standalone guest scan replicates once", host.evaluate("__game.state.scans") == before + 1, ""))

        # The existing developer API accepts an optional seat. Set up real cargo
        # ownership deterministically, then exercise the real transport departure.
        entities = host.evaluate("__game.entities()")
        slot, girder = next((i, item) for i, item in enumerate(entities) if item["type"] == "girder" and not item["done"])
        host.evaluate("p=>{__game.teleport(p[0],p[2],5,1);__game.interact(1)}", girder["pos"])
        host.wait_for_function("i=>__game.snapshot().players[1].carry===i", arg=slot, timeout=8000)
        guest.close()
        host.wait_for_function("!__game.network.connected && __game.network.players===1", timeout=15000)
        host.wait_for_function("i=>__game.snapshot().players[1].carry===-1 && __game.snapshot().entities[i].carrier===-1", arg=slot, timeout=8000)
        dropped = host.evaluate("i=>__game.entities()[i]", slot)
        host.evaluate("p=>{__game.teleport(p[0],p[2],5);__game.interact()}", dropped["pos"])
        results.append(("Departed partner releases bridge cargo for solo recovery", host.evaluate("__game.player.carrying==='girder' && !__game.state.won"), ""))

        host.locator("#pauseBtn").click()
        host.locator("#quit").click()
        guest = open_game()
        connect(host, guest)
        host.close()
        guest.wait_for_function("!__game.network.connected && __game.screen==='title'", timeout=15000)
        results.append(("Host departure returns guest to fresh safe solo edition", guest.evaluate("__game.player.reporter && __game.player.power===100 && __game.state.phase==='reporter' && __game.player.pos[1]<1"), ""))
    except Exception as exc:
        diagnostics = []
        for index, page in enumerate(pages):
            if not page.is_closed():
                try:
                    diagnostics.append(f"page {index}: {page.evaluate('({screen:window.__game?.screen,network:window.__game?.network,screenHidden:document.querySelector("#screen")?.hidden})')}")
                except Exception:
                    pass
        results.append(("Standalone co-op gameplay", False, str(exc) + "; " + "; ".join(diagnostics)))
    finally:
        for page in pages:
            if not page.is_closed():
                page.close()
    return results


def invite_cancel_checks(browser, base_url, game_path):
    """Leaving a pending asynchronous invitation must not write a removed UI."""
    page = browser.new_page(viewport={"width": 1280, "height": 720})
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    try:
        page.goto(base_url.rstrip("/") + "/" + game_path.lstrip("/"), wait_until="domcontentloaded")
        page.wait_for_function("window.__gameReady === true", timeout=60000)
        page.evaluate("__game.title()")
        page.locator("#online").click()
        page.locator("#host").click()
        page.locator("#back").click()
        # ICE gathering has a 6.5-second upper bound. Cover its late resolution.
        page.wait_for_timeout(7000)
        passed = not errors and page.evaluate("!__game.network.connected && document.querySelector('#netFields')===null")
        return [("Cancelled invitation cannot write removed UI", passed, "; ".join(errors))]
    except Exception as exc:
        return [("Cancelled invitation cannot write removed UI", False, str(exc))]
    finally:
        page.close()
