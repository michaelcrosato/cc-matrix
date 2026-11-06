"""Exercise actual manual pairing UI with its default STUN policy, no ICE override."""

import hashlib
import json
import sys
import time
from pathlib import Path

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads((ROOT / "build-config.json").read_text())
ARTIFACT = ROOT.parent / CONFIG["filename"]
ARTIFACT_HASH = hashlib.sha256(ARTIFACT.read_bytes()).hexdigest()
checks = []
observations = {}
errors = []


def require(value, message):
    if not value:
        raise AssertionError(message)


def check(name, fn):
    try:
        fn()
        checks.append({"name": name, "pass": True})
        return True
    except (AssertionError, PlaywrightError, ValueError, TypeError, KeyError) as exc:
        checks.append({"name": name, "pass": False, "detail": str(exc)})
        return False


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
            page.wait_for_function(
                "document.body.dataset.game==='dungeons-and-deeper-trouble' && document.body.dataset.ready==='true'"
            )
        host, guest = pages

        def host_offer():
            started = time.monotonic()
            host.evaluate("__DT.app.ui.pair('host')")
            observations["offerSeconds"] = round(time.monotonic() - started, 2)
            observations["hostBeforeConnect"] = host.evaluate(
                "({status:__DT.app.ui.pairStatus,peer:__DT.app.peer.inspect()})"
            )
            require(
                host.evaluate("__DT.app.ui.pairOut.startsWith('DT1.')"),
                "default UI did not produce an invitation",
            )
            require(
                host.evaluate("__DT.app.peer.pc.iceGatheringState==='complete'"),
                "exported incomplete ICE gathering",
            )
            require(observations["offerSeconds"] < 20, "default invitation not bounded")

        offered = check(
            "actual Host UI produces complete default-policy invitation", host_offer
        )
        replied = False
        if offered:
            offer = host.evaluate("__DT.app.ui.pairOut")

            def guest_reply():
                guest.evaluate("__DT.app.ui.pair('guest')")
                guest.evaluate("(text)=>{__DT.app.ui.pairIn=text}", offer)
                started = time.monotonic()
                guest.evaluate("__DT.app.ui.connectPair()")
                observations["replySeconds"] = round(time.monotonic() - started, 2)
                observations["guestBeforeConnect"] = guest.evaluate(
                    "({status:__DT.app.ui.pairStatus,peer:__DT.app.peer.inspect()})"
                )
                require(
                    guest.evaluate("__DT.app.ui.pairOut.startsWith('DT1.')"),
                    "default UI did not produce a reply",
                )
                require(
                    guest.evaluate("__DT.app.peer.pc.iceGatheringState==='complete'"),
                    "reply has incomplete ICE gathering",
                )

            replied = check(
                "actual Join UI produces complete default-policy reply", guest_reply
            )
        if replied:
            reply = guest.evaluate("__DT.app.ui.pairOut")

            def connect():
                host.evaluate("(text)=>{__DT.app.ui.pairIn=text}", reply)
                host.evaluate("__DT.app.ui.connectPair()")
                for page in pages:
                    page.wait_for_function(
                        "__DT.app.peer.link?.bootstrapped===true", timeout=15000
                    )
                require(
                    guest.evaluate("__DT.snapshot().players.length") == 2,
                    "guest did not bootstrap roster",
                )

            connected = check(
                "actual Connect UI opens real data channel and shared world", connect
            )

            def local_scope():
                for key in ["hostBeforeConnect", "guestBeforeConnect"]:
                    before = observations[key]
                    if before["peer"]["localCandidatesOnly"]:
                        require(
                            "LAN" in before["status"] and "relay" in before["status"],
                            "fallback falsely promises WAN connectivity",
                        )

            check(
                "fallback explicitly describes LAN candidates and relay limitation",
                local_scope,
            )
            if connected:

                def command():
                    host.evaluate("__DT.app.travel('chalk')")
                    for page in pages:
                        page.wait_for_function(
                            "__DT.state.cave==='chalk'", timeout=10000
                        )
                    guest.evaluate(
                        "__DT.app.send({ax:0,ay:-1,actions:[{type:'fire'}]});__DT.app.send({actions:[]})"
                    )
                    host.wait_for_function("__DT.state.stats.shots===1", timeout=5000)
                    guest.wait_for_function(
                        "__DT.state.stats.shots===1 && __DT.state.quiver===2",
                        timeout=5000,
                    )
                    require(
                        host.evaluate("__DT.state.quiver") == 2,
                        "default UI peer input failed",
                    )

                check(
                    "default UI connection carries one authoritative bow command",
                    command,
                )
        check(
            "no runtime or engine errors in default pairing flow",
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
                    page.evaluate("window.__DT?.stop()")
            except PlaywrightError:
                pass
            context.close()
        browser.close()
(ROOT / "reports/network-default-ui.json").write_text(
    json.dumps(
        {
            "artifact": ARTIFACT.name,
            "sha256": ARTIFACT_HASH,
            "checks": checks,
            "observations": observations,
            "scope": "two local Chromium contexts; default public STUN attempted; fallback host candidates are local/LAN only; WAN unknown",
        },
        indent=2,
    )
)
failed = sum(not c["pass"] for c in checks)
for c in checks:
    if not c["pass"]:
        print(c["name"] + ": " + c.get("detail", ""), file=sys.stderr)
print(f"Default pairing UI: {len(checks) - failed} passed, {failed} failed.")
sys.exit(bool(failed))
