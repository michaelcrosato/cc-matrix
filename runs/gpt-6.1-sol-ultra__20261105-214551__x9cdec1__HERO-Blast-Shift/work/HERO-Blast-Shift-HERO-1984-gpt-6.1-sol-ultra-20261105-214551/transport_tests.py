# ruff: noqa: BLE001
# Collect each browser-check failure so the suite can report all independent failures.
"""Two-copy standalone transport and procedural audio checks for the bundled game."""

from urllib.parse import urljoin

GAME_FILE = "HERO-Blast-Shift-HERO-1984-gpt-6.1-sol-ultra-20261105-214551.html"


def run_transport_tests(browser, base_url):
    results = []
    context = browser.new_context(
        viewport={"width": 960, "height": 540}, device_scale_factor=1
    )
    pages = []

    def record(name, check):
        try:
            detail = check()
            results.append((name, True, detail or ""))
        except Exception as exc:
            results.append((name, False, str(exc)))

    def require(condition, detail):
        if not condition:
            raise AssertionError(detail)

    def boot():
        for _ in range(2):
            page = context.new_page()
            pages.append(page)
            page.goto(
                urljoin(base_url.rstrip("/") + "/", GAME_FILE),
                wait_until="domcontentloaded",
                timeout=120000,
            )
            page.wait_for_function("window.__gameReady === true", timeout=120000)
            page.evaluate("window.__game.set('idle', -1000000000)")
            state = page.evaluate("window.__game.state")
            require(
                state["ready"] and state["mode"] == "title",
                f"Wrong initial game state: {state}",
            )
            require(not state["errors"], f"Boot errors: {state['errors']}")
        return "Two standalone bundled copies booted."

    record("transport: two complete copies boot", boot)
    if len(pages) != 2 or not results[-1][1]:
        context.close()
        return results
    first, second = pages

    def local_pair():
        for page in pages:
            page.evaluate("""() => {
              __game.start(); __game.loadLevel(1);
              __game.set('health', 1); __game.set('fuel', 17);
              __game.network.enableLocal();
            }""")
        for page in pages:
            page.wait_for_function(
                "__game.state.network.remoteCount === 1", timeout=15000
            )
            state = page.evaluate("__game.state.network")
            require(
                state["transport"] == "BroadcastChannel", f"Wrong transport: {state}"
            )
        return "BroadcastChannel discovered both copies."

    record("transport: local race discovery", local_pair)

    def local_start():
        first.evaluate("__game.network.startRace()")
        for page in pages:
            page.wait_for_function(
                "__game.state.network.started && __game.state.sector === 0",
                timeout=15000,
            )
            state = page.evaluate(
                """() => ({...__game.state, countdown:__game.network.countdown})"""
            )
            require(state["mode"] == "playing", f"Race did not start: {state['mode']}")
            require(
                state["health"] == 3 and state["fuel"] > 99,
                f"Race did not reset equipment: {state}",
            )
            require(
                state["rescued"] == 0 and state["score"] == 0,
                f"Race did not reset progress: {state}",
            )
            require(
                not state["network"]["canPlay"] and 0 < state["countdown"] <= 3100,
                f"Race missed synchronized countdown: {state['network']}, {state['countdown']}",
            )
        for page in pages:
            page.wait_for_function(
                "__game.state.network.canPlay && __game.state.menu === null",
                timeout=20000,
            )
        return "Both players reset into the same three-second countdown."

    record("transport: synchronized local race", local_start)

    def ghosts_move():
        for page in pages:
            page.wait_for_function(
                """Array.from(__game.network.remote.values()).some(r => r.state && r.seq > 0)""",
                timeout=20000,
            )
        first.evaluate("__game.teleport(9, 23)")
        second.wait_for_function(
            """Array.from(__game.network.remote.values()).some(r => r.state && Math.abs(r.state.x - 9) < .25 && r.seq > 0)""",
            timeout=15000,
        )
        for page in pages:
            state = page.evaluate("__game.state")
            remote = page.evaluate(
                "Array.from(__game.network.remote.values()).map(r => ({state:r.state,seq:r.seq}))"
            )
            require(
                state["network"]["remoteCount"] == 1, f"Lost rival: {state['network']}"
            )
            require(
                any(
                    r.get("state", {}).get("sector") == state["sector"] for r in remote
                ),
                f"No same-sector rival: {remote}",
            )
            require(
                "Local pilot" in page.locator("#ghosts").inner_text(),
                "Rival HUD is missing.",
            )
            require(not state["errors"], f"Race runtime errors: {state['errors']}")
        return "Position packets reached the other complete game and rival HUD."

    record("transport: live ghost movement", ghosts_move)

    def local_finish():
        first.evaluate(
            "__game.network.finish({score:4321,rescued:3,time:25,success:false})"
        )
        second.wait_for_function(
            "Array.from(__game.network.remote.values()).some(r=>r.finished && r.state.score===4321 && r.state.rescued===3)",
            timeout=10000,
        )
        first.evaluate("__game.network.startRace()")
        for page in pages:
            page.wait_for_function(
                "Array.from(__game.network.remote.values()).every(r=>!r.finished)",
                timeout=10000,
            )
            page.wait_for_function(
                "__game.network.canPlay && __game.state.menu === null", timeout=15000
            )
        return "Final rival result propagates and clears on a new race."

    record("transport: local final result and rematch", local_finish)

    def local_leave():
        first.evaluate("__game.network.disconnect()")
        second.wait_for_function(
            "__game.state.network.remoteCount === 0", timeout=10000
        )
        second.evaluate("__game.network.disconnect()")
        for page in pages:
            state = page.evaluate("__game.state.network")
            require(
                state["transport"] == "none" and state["remoteCount"] == 0,
                f"Disconnect failed: {state}",
            )
        return "Leaving removes the rival and closes local channels."

    record("transport: local leave cleanup", local_leave)

    def rtc_pair():
        # Actual browser ICE, SDP, SCTP, and data channel: no transport mocks.
        offer = first.evaluate("__game.network.createOffer()")
        require(
            isinstance(offer, str) and len(offer) > 100, "Missing host connection code."
        )
        answer = second.evaluate("code => __game.network.acceptOffer(code)", offer)
        require(
            isinstance(answer, str) and len(answer) > 100,
            "Missing reply connection code.",
        )
        first.evaluate("code => __game.network.acceptAnswer(code)", answer)
        for page in pages:
            page.wait_for_function(
                '__game.network.dataChannel?.readyState === "open" && __game.state.network.remoteCount === 1',
                timeout=30000,
            )
            require(
                page.evaluate("__game.state.network.transport") == "WebRTC",
                "Wrong direct transport.",
            )
        return "Native WebRTC connection codes established a data channel."

    record("transport: direct WebRTC offer and reply", rtc_pair)

    def rtc_race():
        first.evaluate("__game.network.startRace()")
        for page in pages:
            page.wait_for_function(
                "__game.state.network.started && __game.state.network.canPlay && __game.state.menu === null",
                timeout=20000,
            )
            page.wait_for_function(
                """__game.network.remote.get('peer')?.state && __game.network.remote.get('peer').seq > 0""",
                timeout=20000,
            )
        second.evaluate("__game.teleport(11, 22)")
        first.wait_for_function(
            """Math.abs((__game.network.remote.get('peer')?.state?.x ?? -100) - 11) < .25""",
            timeout=15000,
        )
        for page in pages:
            require(
                not page.evaluate("__game.state.errors"),
                "Runtime error during direct race.",
            )
        return "Peer race reset, countdown, and live ghost replication passed."

    if results[-1][1]:
        record("transport: direct WebRTC race", rtc_race)

        def rtc_finish():
            second.evaluate(
                "__game.network.finish({score:7654,rescued:6,time:34,success:true})"
            )
            first.wait_for_function(
                "__game.network.remote.get('peer')?.finished && __game.network.remote.get('peer').success && __game.network.remote.get('peer').state.rescued===6",
                timeout=10000,
            )
            return "Direct rival success and final score reach the other pilot."

        record("transport: direct WebRTC final result", rtc_finish)

    def departure_results():
        first.evaluate(
            "__game.tick(3);__game.set('lives',1);__game.set('health',1);__game.hurt(1)"
        )
        require(
            first.evaluate("__game.state.mode") == "result",
            "Could not open local race results",
        )
        second.evaluate("__game.network.disconnect()")
        first.wait_for_function("__game.state.network.remoteCount === 0", timeout=10000)
        require(
            "disconnected" in first.locator("#race-results").inner_text(),
            "Race results kept waiting for a departed rival",
        )
        return "Standalone results refresh when the rival leaves."

    record("transport: results after rival departure", departure_results)

    def audio():
        first.evaluate("__game.network.disconnect()")
        second.evaluate("__game.network.disconnect()")
        before = first.evaluate("__game.sound.diagnostics()")
        require(
            before["music"] == 0.10 and before["sfx"] == 0.65,
            f"Incorrect default volumes: {before}",
        )
        rendered = first.evaluate("__game.renderAudioTest()")
        require(rendered["finite"], f"Non-finite audio: {rendered}")
        require(rendered["samples"] == 264600, f"Offline duration differs: {rendered}")
        require(
            0.005 < rendered["rms"] < 0.5, f"Silent or excessive audio RMS: {rendered}"
        )
        require(0.1 < rendered["peak"] < 1, f"Silent or clipping audio: {rendered}")
        first.evaluate("""async () => {
          await __game.sound.unlock();
          __game.sound.update(.1, {flying:true,sector:2,danger:true});
          __game.sound.play('rescue'); __game.sound.voice('win');
        }""")
        first.wait_for_function(
            "__game.sound.diagnostics().musicSteps > 0", timeout=10000
        )
        require(
            first.evaluate("__game.sound.diagnostics().unlocked"),
            "Audio did not unlock.",
        )
        return f"6-second synthesis: {rendered['samples']} finite samples, peak {rendered['peak']:.3f}, RMS {rendered['rms']:.4f}."

    record("audio: procedural render and defaults", audio)
    for page in pages:
        try:
            page.evaluate("__game.network.disconnect(); __game.sound.suspend(true)")
        except Exception:  # noqa: S110 — the context is closed immediately after cleanup.
            pass
    context.close()
    return results
