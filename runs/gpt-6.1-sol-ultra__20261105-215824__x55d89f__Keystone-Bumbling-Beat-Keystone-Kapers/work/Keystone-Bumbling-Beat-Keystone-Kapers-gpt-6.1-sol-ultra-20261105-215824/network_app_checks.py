"""Two-copy standalone gameplay checks, aggregated by the root test command."""

from __future__ import annotations

import json
import secrets
import time
from urllib.parse import urljoin


def run_checks(browser, base_url: str, game_url: str) -> dict:
    """Use the supplied browser, close both owned pages, and return quiet counts."""
    from playwright.sync_api import Error as PlaywrightError

    passed = 0
    failures = []
    runtime_errors = []
    room_code = None
    context = browser.new_context(viewport={"width": 1280, "height": 800})
    host = context.new_page()
    guest = context.new_page()
    for page in (host, guest):
        page.on("pageerror", lambda error: runtime_errors.append(str(error)))

    def check(name, test):
        nonlocal passed
        try:
            test()
            passed += 1
            return True
        except (PlaywrightError, AssertionError, KeyError, ValueError) as error:
            failures.append(f"Network app {name}: {error}")
            return False

    def diagnostics():
        result = {}
        for name, page in (("host", host), ("guest", guest)):
            try:
                result[name] = page.evaluate("""() => {
                  const g = window.__game;
                  if (!g) return {initialized:false};
                  const p = g.game.players[1];
                  return {screen:g.screen,mode:g.mode,elapsed:g.game.elapsed,
                    steps:g.game.metrics.steps,frames:g.renderer.frames,
                    network:g.network,remote:p ? {x:p.x,y:p.y,floor:p.floor,
                    ground:p.ground,transition:p.transition,lastInput:p.lastInput} : null,
                    displayedMode:g.state.mode,displayedCase:g.state.caseIndex,
                    visibility:document.visibilityState,focus:document.hasFocus(),
                    inputTrace:(window.__networkInputTrace || []).slice(-8)};
                }""")
            except PlaywrightError as error:
                result[name] = {"diagnosticError": str(error)}
        return json.dumps(result, separators=(",", ":"))

    def wait_host(condition, stage, *, arg=None):
        # Software GPU rendering can spend many wall seconds on a short ride.
        # Extend only when actual simulation steps advanced during the first wait.
        before = host.evaluate("__game.game.metrics.steps")
        started = time.monotonic()
        try:
            host.wait_for_function(condition, arg=arg, timeout=10000, polling=100)
        except PlaywrightError as initial:
            after = host.evaluate("__game.game.metrics.steps")
            if after <= before:
                raise AssertionError(
                    f"{stage}; simulation stalled; {diagnostics()}"
                ) from initial
            remaining = max(1000, int((45 - (time.monotonic() - started)) * 1000))
            try:
                host.wait_for_function(
                    condition, arg=arg, timeout=remaining, polling=100
                )
            except PlaywrightError as error:
                raise AssertionError(f"{stage}; {diagnostics()}") from error

    def expect(value, message):
        if not value:
            raise AssertionError(message)

    def setup():
        nonlocal room_code
        url = urljoin(base_url.rstrip("/") + "/", game_url)
        for page in (host, guest):
            page.goto(url, wait_until="domcontentloaded", timeout=30000)
            page.wait_for_function("!!window.__game", timeout=60000)
            expect("Keystone Bumbling Beat" in page.title(), "Unexpected game page")
        guest.evaluate("__game.attract()")
        expect(
            guest.evaluate("__game.game.attract"),
            "Could not set up pre-join attract regression",
        )
        code = "NET" + secrets.token_hex(3).upper()
        room_code = code
        host.evaluate("code => __game.bridge.openLocalRoom(code, true)", code)
        guest.evaluate("code => __game.bridge.openLocalRoom(code, false)", code)
        for page in (host, guest):
            page.wait_for_function(
                "__game.network.connected && __game.state.coop", timeout=20000
            )
        expect(host.evaluate("__game.network.isHost"), "Host role not assigned")
        expect(
            guest.evaluate("!__game.network.isHost && __game.network.me === 1"),
            "Guest role not assigned",
        )
        expect(
            guest.evaluate("!__game.game.attract && __game.mode === 'remote'"),
            "Guest retained solo attract state after joining",
        )
        host.evaluate("""() => {
          window.__networkInputTrace = [];
          const original = __game.bridge.callbacks.onInput;
          __game.bridge.callbacks.onInput = (input, seat) => {
            __networkInputTrace.push({time:performance.now(),seat,input:{...input}});
            if (__networkInputTrace.length > 100) __networkInputTrace.shift();
            original(input,seat);
          };
        }""")
        guest.evaluate("""() => {
          window.__networkInputTrace = [];
          const original = __game.bridge.sendInput.bind(__game.bridge);
          __game.bridge.sendInput = (input, force) => {
            __networkInputTrace.push({time:performance.now(),input:{...input}});
            if (__networkInputTrace.length > 100) __networkInputTrace.shift();
            return original(input,force);
          };
          window.addEventListener('blur',()=>__networkInputTrace.push({event:'blur',time:performance.now()}));
        }""")

    def guest_state():
        host.evaluate("__game.game.score = 4321")
        guest.wait_for_function(
            "__game.state.score === 4321 && __game.state.players.length === 2",
            timeout=15000,
        )
        expect(
            guest.evaluate("__game.network.received > 0 && __game.screen === ''"),
            "Guest did not display host world",
        )

    def held_interact():
        # Put the remote seat at the lift. Holding E must cause one ride, just
        # as it does locally; repeated 10 Hz held packets must not create edges.
        host.evaluate("""() => {
          __game.game.freezeCrook = true;
          __game.game.invincible = true;
          __game.teleport(0, 0, 1);
        }""")
        wait_host(
            "__game.game.players[1].ground && !__game.game.players[1].transition",
            "lift setup: remote player grounded",
        )
        guest.keyboard.down("e")
        wait_host(
            "__game.game.players[1].transition?.dest === 1",
            "held E: first lift ride starts toward floor1",
        )
        wait_host(
            "__game.game.players[1].floor === 1 && !__game.game.players[1].transition",
            "held E: first lift ride completes on floor1",
        )
        elapsed = host.evaluate("__game.game.elapsed")
        wait_host(
            "start => __game.game.elapsed > start + .65",
            "held E: observe another .65 simulation seconds",
            arg=elapsed,
        )
        expect(
            host.evaluate(
                "__game.game.players[1].floor === 1 && !__game.game.players[1].transition"
            ),
            "Held remote E repeated the lift ride",
        )
        guest.keyboard.up("e")
        wait_host(
            "!__game.game.players[1].lastInput.interact",
            "remote interaction release reaches host",
        )

    def remote_down_use():
        # At the middle floor, downward travel requires the remote held modifier.
        guest.keyboard.down("s")
        guest.keyboard.down("e")
        wait_host(
            "__game.game.players[1].transition?.dest === 0",
            "down+E: descending lift starts",
        )
        wait_host(
            "__game.game.players[1].floor === 0 && !__game.game.players[1].transition",
            "down+E: descending lift completes on floor0",
        )
        guest.keyboard.up("e")
        guest.keyboard.up("s")
        wait_host(
            "!__game.game.players[1].lastInput.interact",
            "remote interaction release reaches host",
        )

    def case_result():
        host.evaluate("__game.capture()")
        for page in (host, guest):
            page.wait_for_function(
                "__game.state.mode === 'caseclear' && __game.screen === 'result'",
                timeout=15000,
            )
        expect(
            guest.locator("#continue-button").is_disabled(),
            "Guest can advance host's case",
        )

    def advance_case():
        host.evaluate("__game.action('continue')")
        for page in (host, guest):
            page.wait_for_function(
                "__game.state.caseIndex === 1 && __game.state.mode === 'playing' && __game.screen === ''",
                timeout=15000,
            )
        expect(
            guest.evaluate(
                "!document.querySelector('#result').classList.contains('active')"
            ),
            "Guest retained result overlay",
        )

        start_x = host.evaluate("__game.game.players[1].x")
        guest.keyboard.down("d")
        host.wait_for_function(
            "start => __game.game.players[1].x > start + 1", arg=start_x, timeout=10000
        )
        guest.keyboard.up("d")

    def replay_after_shift():
        # Fast-forward remaining cases through the public developer hooks, then
        # check the guest can leave the final report for a fresh standalone shift.
        for expected_case in (2, None):
            host.evaluate("__game.capture()")
            guest.wait_for_function(
                "__game.state.mode === 'caseclear' && __game.screen === 'result'",
                timeout=15000,
            )
            host.evaluate("__game.action('continue')")
            if expected_case is not None:
                guest.wait_for_function(
                    "__game.state.caseIndex === 2 && __game.state.mode === 'playing' && __game.screen === ''",
                    timeout=15000,
                )
            else:
                guest.wait_for_function(
                    "__game.state.mode === 'won' && __game.screen === 'result'",
                    timeout=15000,
                )
        host.evaluate("__game.action('continue')")
        for page in (host, guest):
            page.wait_for_function(
                "__game.state.caseIndex === 0 && __game.state.mode === 'playing' && __game.screen === ''",
                timeout=15000,
            )
        expect(
            host.evaluate(
                "__game.state.metrics.catches === 0 && __game.state.score === 0"
            ),
            "New shift retained previous metrics or score",
        )

    def guest_leave_and_rejoin():
        guest.evaluate("__game.bridge.disconnect()")
        wait_host(
            "!__game.network.connected && __game.game.players[1].active === false",
            "guest leave disables departed body",
        )
        expect(
            host.evaluate(
                "__game.network.players.length === 1 && __game.network.players[0].id === 0 && !__game.game.players[1].body.isEnabled()"
            ),
            "Departed guest seat/body remained active",
        )
        host.evaluate("__game.capture()")
        host.wait_for_function("__game.screen === 'result'", timeout=15000)
        host.evaluate("__game.action('continue')")
        wait_host(
            "__game.state.caseIndex === 1 && __game.game.players[1].active === false && __game.game.players[0].active",
            "departure persists across case load",
        )
        guest.evaluate("code => __game.bridge.openLocalRoom(code, false)", room_code)
        for page in (host, guest):
            page.wait_for_function(
                "__game.network.connected && __game.state.caseIndex === 0 && __game.state.mode === 'playing' && __game.screen === ''",
                timeout=20000,
            )
        expect(
            host.evaluate(
                "__game.game.players[1].active && __game.network.players.length === 2"
            ),
            "Rejoining partner did not receive a fresh active seat",
        )

    def surviving_seat_mapping():
        # A real dedicated-host round has a third rendering copy. This controlled
        # metadata stand-in exercises its exact seat mapping with the same two
        # real pages and the guest's real network/keyboard input.
        host.evaluate("""() => {
          const b = __game.bridge;
          b.server = true; b.me = 2; b.host = 2;
          b.players = b.players.filter(p => p.id !== 0);
          b.callbacks.onLeave({id:0,reason:'left'});
          __game.game.freezeCrook = true;
          __game.game.invincible = true;
          __game.teleport(0, 0, 1);
        }""")
        expect(
            host.evaluate(
                "__game.game.players[0].active === false && __game.game.players[1].active"
            ),
            "Removing network seat0 deactivated the wrong cop",
        )
        guest.keyboard.down("d")
        wait_host(
            "__game.game.players[1].x > 1",
            "surviving network seat1 still controls original cop1",
        )
        guest.keyboard.up("d")
        expect(
            host.evaluate(
                "__game.game.players[0].active === false && __game.game.players[1].active"
            ),
            "Remaining input remapped to departed cop0",
        )

    try:
        if check("room join and authority", setup):
            check("guest renders host snapshots", guest_state)
            held_ok = check("held remote interaction rides once", held_interact)
            if held_ok:
                check("remote down-use descends the middle lift", remote_down_use)
            if check("case report reaches both copies", case_result) and check(
                "host advance releases guest result screen", advance_case
            ):
                check(
                    "final report returns both copies to a new shift",
                    replay_after_shift,
                )
            if check(
                "guest departure persists and rejoin resets seats",
                guest_leave_and_rejoin,
            ):
                check(
                    "dedicated-host surviving seat retains its cop",
                    surviving_seat_mapping,
                )
            check(
                "no runtime errors",
                lambda: expect(not runtime_errors, "; ".join(runtime_errors)),
            )
    finally:
        for page in (host, guest):
            try:
                page.keyboard.up("e")
                page.keyboard.up("s")
                page.keyboard.up("d")
                page.evaluate("window.__game?.bridge.disconnect()")
            except PlaywrightError:
                pass
        context.close()
    return {"passed": passed, "failed": len(failures), "failures": failures}
