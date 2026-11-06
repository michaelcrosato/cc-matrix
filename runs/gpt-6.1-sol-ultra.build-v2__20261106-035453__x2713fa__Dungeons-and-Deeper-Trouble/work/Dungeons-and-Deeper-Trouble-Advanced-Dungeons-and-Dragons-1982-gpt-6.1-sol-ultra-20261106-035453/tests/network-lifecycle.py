"""Actual artifact: invite into an existing cave, reconnect safely, and end on host loss."""

import hashlib
import json
import sys
from pathlib import Path

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / "build-config.json").read_text())
ARTIFACT = ROOT.parent / CONFIG["filename"]
ARTIFACT_HASH = hashlib.sha256(ARTIFACT.read_bytes()).hexdigest()
checks = []


def require(value, message):
    if not value:
        raise AssertionError(message)


def check(name, fn):
    try:
        fn()
        checks.append({"name": name, "pass": True})
        return True
    except (AssertionError, PlaywrightError, ValueError, TypeError, KeyError) as e:
        checks.append({"name": name, "pass": False, "detail": str(e)})
        return False


errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    contexts = []
    try:
        pages = []
        for i in range(2):
            context = browser.new_context(viewport={"width": 960, "height": 540})
            contexts.append(context)
            page = context.new_page()
            pages.append(page)
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(ARTIFACT.as_uri())
            page.wait_for_function("document.body.dataset.ready==='true'")
            page.evaluate("__DT.game.stop()")
        host, guest = pages

        def prepare():
            host.evaluate(
                "__DT.start('solo');__DT.game.stop();__DT.app.travel('chalk');__DT.game.advance(1.4)"
            )
            require(
                host.evaluate("__DT.state.cave") == "chalk",
                "production route did not enter cave",
            )
            # One ordinary bow action before inviting proves quiver and flight state preservation.
            host.evaluate(
                "__DT.app.inputs.sample=()=>null;__DT.app.command(1,{ax:0,ay:-1,actions:[{type:'fire'}]});__DT.game.advance(.25)"
            )
            require(
                host.evaluate("__DT.state.quiver") == 2,
                "initial ordinary shot not released",
            )

        ready = check(
            "production solo expedition enters cave and fires before invitation",
            prepare,
        )
        before = host.evaluate("__DT.snapshot()")

        def pair():
            for page in pages:
                page.evaluate(
                    "() => {const a=__DT.app;a.peer?.cancel();a.pairing=true;a.peer=DTNet.createPeer(a.networkHooks(),{iceServers:[]});}"
                )
            offer = host.evaluate("__DT.app.peer.offer()")
            answer = guest.evaluate("(s)=>__DT.app.peer.answer(s)", offer)
            host.evaluate("(s)=>__DT.app.peer.accept(s)", answer)
            # Clocks are stopped to hold the pre-invite authoritative state exactly.
            for page in pages:
                page.evaluate(
                    "window.__pump=setInterval(()=>__DT.app.net?.update(),20)"
                )
            for page in pages:
                page.wait_for_function(
                    "__DT.app.peer.link?.bootstrapped===true", timeout=12000
                )
            for page in pages:
                page.evaluate("clearInterval(window.__pump)")

        connected = (
            check("late guest joins through real complete offer/answer", pair)
            if ready
            else False
        )
        first_epoch = host.evaluate("__DT.app.net?.inspect().epoch")
        if connected:

            def preserved():
                current = host.evaluate("__DT.snapshot()")
                require(
                    current["cave"] == before["cave"]
                    and current["time"] == before["time"],
                    "joining restarted the cave",
                )
                require(
                    current["quiver"] == before["quiver"], "joining reset shared quiver"
                )
                require(
                    current["enemies"] == before["enemies"]
                    and current["pickups"] == before["pickups"],
                    "joining reset enemies or supplies",
                )
                require(
                    [p["id"] for p in current["players"]] == [0, 1],
                    "seat IDs not remapped",
                )
                require(
                    guest.evaluate("__DT.snapshot()") == current,
                    "late guest did not receive complete current state",
                )
                require(
                    current["arrows"][0]["owner"] == 0,
                    "pre-invite projectile ownership not remapped",
                )

            check(
                "current cave, arrows, resources and wounds survive late join atomically",
                preserved,
            )

            def safe_anchor():
                require(
                    host.evaluate(
                        "(()=>{const s=__DT.app.sim,p=s.state.players[1],q=s.state.players[0];return s.clearAt(p.x,p.y,5)&&Math.hypot(p.x-q.x,p.y-q.y)<30&&p.invuln>=2.9})()"
                    ),
                    "guest did not spawn protected at a safe party anchor",
                )

            check("late guest spawns safely near party with protection", safe_anchor)

            def departure():
                guest.evaluate("__DT.app.peer.cancel()")
                host.wait_for_function("__DT.state.players.length===1")
                require(
                    host.evaluate("__DT.app.net.canStep() && __DT.app.peer.pc===null"),
                    "departure left orphaned transport or halted authority",
                )

            check(
                "departed guest removes avatar and closes only the transport", departure
            )
            # Rejoin the same current host world with a new peer/input epoch.
            reconnected = check(
                "real reconnect obtains a fresh channel and full state", pair
            )
            if reconnected:

                def fresh():
                    require(
                        host.evaluate("__DT.app.net.inspect().epoch") != first_epoch,
                        "input epoch reused across reconnect",
                    )
                    require(
                        host.evaluate("__DT.state.quiver") == 2,
                        "reconnect minted arrows",
                    )
                    require(
                        guest.evaluate("__DT.snapshot()")
                        == host.evaluate("__DT.snapshot()"),
                        "reconnect failed full resync",
                    )

                check(
                    "reconnect preserves progression and changes the input epoch", fresh
                )

                def host_loss():
                    host.evaluate("__DT.app.peer.cancel()")
                    guest.wait_for_function("__DT.app.ended===true", timeout=10000)
                    require(
                        not guest.evaluate("__DT.app.net.canStep()"),
                        "guest invented host migration",
                    )

                check(
                    "host loss stops the actual guest and exposes its connection-ended flow",
                    host_loss,
                )
        check(
            "no engine or browser errors during lifecycle transitions",
            lambda: require(
                not errors
                and all(not page.evaluate("__DT.game.errors.length") for page in pages),
                repr(errors),
            ),
        )
    finally:
        for context in contexts:
            try:
                for page in context.pages:
                    page.evaluate("clearInterval(window.__pump);window.__DT?.stop()")
            except PlaywrightError:
                pass
            context.close()
        browser.close()
(ROOT / "reports/network-lifecycle.json").write_text(
    json.dumps(
        {"artifact": ARTIFACT.name, "sha256": ARTIFACT_HASH, "checks": checks}, indent=2
    )
)
failed = sum(not c["pass"] for c in checks)
for c in checks:
    if not c["pass"]:
        print(c["name"] + ": " + c.get("detail", ""), file=sys.stderr)
print(f"Network lifecycle: {len(checks) - failed} passed, {failed} failed.")
sys.exit(bool(failed))
