"""The real bundled game's co-op flow and AI Hub protocol conformance."""

from urllib.parse import quote, urlencode, urljoin


def run_game_network_tests(browser, base_url, game_path):
    """Use actual rendered game copies; return (failure messages, check count)."""
    failures = []
    count = 0
    base = base_url.rstrip("/") + "/"
    game_path = str(game_path)
    game_url = urljoin(base, quote(game_path, safe="/?=&:"))
    separator = "&" if "?" in game_url else "?"
    # Compatibility graphics keeps these network checks independent of adapter
    # limits with two worlds open. The primary suite tests WebGPU separately.
    standalone_url = game_url + separator + "webgl=1"
    folder = game_path.rsplit("/", 1)[-1].removesuffix(".html")
    harness_url = urljoin(base, quote(folder) + "/hub/harness.html")
    game_from_harness = (
        "../../" + game_path + ("&" if "?" in game_path else "?") + "webgl=1"
    )
    context = browser.new_context(viewport={"width": 800, "height": 500})
    host = context.new_page()
    guest = context.new_page()
    page_errors = []
    host.on("pageerror", lambda error: page_errors.append(f"host: {error}"))
    guest.on("pageerror", lambda error: page_errors.append(f"guest: {error}"))

    def check(label, action):
        nonlocal count
        count += 1
        try:
            action()
            return True
        except Exception as error:  # noqa: BLE001 - collect browser assertion failures.
            failures.append(f"Game co-op: {label}: {error}")
            return False

    def wait(page, condition, timeout=30000):
        page.wait_for_function(condition, timeout=timeout)

    def press_until(page, key, observed, condition):
        page.keyboard.down(key)
        try:
            wait(observed, condition)
        finally:
            page.keyboard.up(key)

    def teleport_team(x, z):
        host.evaluate(
            "([x,z])=>{__game.teleport(x+2,z+1,0);__game.teleport(x,z,1)}",
            [x, z],
        )
        wait(
            guest,
            f"Math.hypot(__game.state().players[1].x-({x}),__game.state().players[1].z-({z}))<2",
        )

    def load_and_link():
        for page in [host, guest]:
            page.goto(standalone_url, wait_until="domcontentloaded", timeout=90000)
            wait(page, "window.__game?.ready", 90000)
            assert "Extra-Small Visitor" in page.title(), (
                "The server did not serve this game"
            )
        room = host.evaluate("__game.network.createLocalRoom()")
        guest.evaluate("code=>__game.network.joinLocalRoom(code)", room)
        wait(host, "__game.network.connected")
        wait(guest, "__game.network.connected")
        host.evaluate(
            "()=>{__game.game.activity();__game.start();__game.game.cheats.god=true;__game.game.cheats.agents=false}"
        )
        wait(guest, "__game.state().mode==='playing'")
        assert host.evaluate(
            "__game.network.isHost && __game.network.players.length===2"
        )
        assert guest.evaluate("!__game.network.isHost && __game.game.localIndex()===1")

    def movement():
        teleport_team(3, 12)
        before = host.evaluate("__game.state().players.map(p=>({x:p.x,z:p.z}))")
        press_until(
            guest,
            "d",
            host,
            f"__game.state().players[1].x>{before[1]['x'] + 0.4}",
        )
        assert host.evaluate(
            f"Math.hypot(__game.state().players[0].x-({before[0]['x']}),__game.state().players[0].z-({before[0]['z']}))<.25"
        ), "Guest movement affected the host's kid"
        target_x = host.evaluate("__game.state().players[1].x")
        wait(guest, f"Math.abs(__game.state().players[1].x-({target_x}))<.5")

    def friendship():
        teleport_team(2, 19)
        press_until(guest, "e", host, "__game.state().stage==='collect'")
        wait(guest, "__game.state().stage==='collect'")

    def first_part():
        teleport_team(-22, 10)
        press_until(guest, "e", host, "__game.state().collected.includes('toy')")
        wait(guest, "__game.state().collected.includes('toy')")
        assert not guest.evaluate(
            "__game.game.parts.find(p=>p.id==='toy').model.visible"
        )

    def bloom():
        teleport_team(-8, 3)
        press_until(guest, "f", host, "__game.state().healed.includes(0)")
        wait(guest, "__game.state().healed.includes(0)")
        assert not guest.evaluate("__game.game.flowers[0].halo.visible")
        assert guest.evaluate("__game.game.flowers[0].model.scale.x>1.5")

    def candy_replication():
        teleport_team(-5, 3)
        for thrower in [host, guest]:
            before = host.evaluate(
                "({candy:__game.state().candy,throws:__game.state().stats.distractions})"
            )
            press_until(
                thrower,
                "c",
                host,
                f"__game.state().stats.distractions==={before['throws'] + 1}",
            )
            wait(
                guest,
                f"__game.state().candy==={before['candy'] - 1}&&__game.state().stats.distractions==={before['throws'] + 1}&&__game.game.remoteCandyMeshes.size>0",
            )
            assert host.evaluate("__game.state().candies.length>0"), (
                "The authoritative candy projectile is missing"
            )

    def remaining_parts():
        for part, x, z in [("record", 22, 4), ("antenna", -16, -12)]:
            teleport_team(x, z)
            press_until(
                guest, "e", host, f"__game.state().collected.includes('{part}')"
            )
            wait(guest, f"__game.state().collected.includes('{part}')")
        wait(host, "__game.state().stage==='signal'")
        wait(guest, "__game.state().stage==='signal'")

    def shared_signal():
        teleport_team(0, -32)
        press_until(guest, "e", host, "__game.state().mode==='tuning'")
        wait(guest, "__game.state().mode==='tuning'")
        wait(host, "!__game.game.tuning.playing", 45000)
        wait(guest, "!__game.game.tuning.playing", 45000)
        sequence = host.evaluate("__game.game.tuning.sequence")
        for index, note in enumerate(sequence):
            guest.keyboard.press(str(note + 1))
            if index < len(sequence) - 1:
                wait(host, f"__game.game.tuning.progress==={index + 1}")
                wait(guest, f"__game.game.tuning.progress==={index + 1}")
            else:
                wait(host, "__game.state().stage==='ride'")
                wait(guest, "__game.state().stage==='ride'")
        assert guest.evaluate("__game.state().signalSolved")

    def flight_and_ending():
        teleport_team(5, -27)
        press_until(guest, "e", host, "__game.state().stage==='flight'")
        wait(guest, "__game.state().stage==='flight'")
        wait(
            guest,
            "__game.game.flightRoot.visible && !__game.game.players[1].model.root.visible",
        )
        host.evaluate(
            "()=>{__game.game.tuningVars.flightSpeed=16;__game.advance(20,{boost:true})}"
        )
        wait(host, "__game.state().mode==='ending'")
        wait(guest, "__game.state().mode==='ending'")
        assert guest.evaluate(
            "!document.getElementById('ending').classList.contains('hidden')"
        ), "The shared ending screen is hidden"

    def no_script_errors():
        assert not page_errors, "; ".join(page_errors[:4])

    try:
        linked = check("actual game loads and two browser tabs link", load_and_link)
        if linked:
            check("guest movement is authoritative and stays on kid two", movement)
            friends = check(
                "guest can befriend the visitor and sync the chapter", friendship
            )
            if friends:
                check("guest collects a part and both models disappear", first_part)
                check("guest heartlight heals flowers in both worlds", bloom)
                check(
                    "both friends throw visible shared candy projectiles",
                    candy_replication,
                )
                found_parts = check(
                    "all guest-collected pieces advance both chapters", remaining_parts
                )
                if found_parts:
                    solved = check(
                        "guest can answer all four shared signal notes", shared_signal
                    )
                    if solved:
                        check(
                            "guest starts the flight and both reach the ending",
                            flight_and_ending,
                        )
            check("no JavaScript errors in either game copy", no_script_errors)
        host.close()
        guest.close()
        harness = context.new_page()

        def hub_scenario(scenario):
            query = urlencode(
                {
                    "game": game_from_harness,
                    "players": 2,
                    "auto": 1,
                    "play": 2500,
                    "latency": 150,
                    "jitter": 50,
                    "loss": 5,
                    "scenario": scenario,
                }
            )
            harness.goto(harness_url + "?" + query, wait_until="domcontentloaded")
            wait(harness, "window.__hubCheck?.done", 90000)
            report = harness.evaluate("window.__hubCheck")
            failed = [
                f"{c['name']}: {c['detail']}" for c in report["checks"] if not c["pass"]
            ]
            assert report["pass"], "; ".join(failed)

        for scenario in ["standard", "server", "host-leave"]:
            check(
                f"actual AI Hub harness ({scenario}, 150ms latency, 5% loss)",
                lambda scenario=scenario: hub_scenario(scenario),
            )
    finally:
        context.close()
    return failures, count
