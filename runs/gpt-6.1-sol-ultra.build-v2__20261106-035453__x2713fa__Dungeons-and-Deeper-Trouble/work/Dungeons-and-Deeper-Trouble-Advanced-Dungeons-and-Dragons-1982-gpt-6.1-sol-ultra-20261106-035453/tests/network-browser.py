"""Real production RTCDataChannel offer/answer test; no signaling backend or mocked RTC."""

import json
import sys
from pathlib import Path

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "reports" / "network-browser.json"
FIXTURE = ROOT / "reports" / "network-fixture.html"
source = (ROOT / "src/net/network.js").read_text()
fixture = (
    """<!doctype html><meta charset="utf-8"><title>DT network fixture</title><body data-game="dt-network-fixture"><script>"""
    + source
    + """</script><script>
window.fixture={state:{ammo:6,wounds:0,cache:3,tools:[],relics:[],players:[0,1]},stopped:null};
const F=fixture;
F.peer=DTNet.createPeer({
 init(info){F.info=info;F.state.players=info.playerIds;},
 snapshot(){return F.state;},restore(s){F.state=s;},
 applyInput(id,h,events){for(const e of events){if(e.type==='fire'&&F.state.ammo>0){F.state.ammo--;F.state.wounds++;}if(e.type==='interact'&&F.state.cache){F.state.ammo+=F.state.cache;F.state.cache=0;}if(e.type==='travel'){F.state.tools=['axe','boat','key'];F.state.relics=['dawn','dusk'];}}},
 removePlayer(id){F.state.players=F.state.players.filter(x=>x!==id);},
 status(s){F.status=s;},stop(s){F.stopped=s;}
},{iceServers:[]});
F.timer=setInterval(()=>F.peer.update(),16);
</script>"""
)
FIXTURE.write_text(fixture)
checks = []


def record(name, fn):
    try:
        fn()
        checks.append({"name": name, "pass": True})
    except (AssertionError, PlaywrightError, ValueError, TypeError, KeyError) as exc:
        checks.append({"name": name, "pass": False, "detail": str(exc)})


def require(value, message):
    if not value:
        raise AssertionError(message)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    try:
        host_context = browser.new_context()
        guest_context = browser.new_context()
        host = host_context.new_page()
        guest = guest_context.new_page()
        errors = []
        for page in [host, guest]:
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(FIXTURE.as_uri())
            require(
                page.locator("body").get_attribute("data-game") == "dt-network-fixture",
                "wrong fixture",
            )

        def pair():
            offer = host.evaluate("fixture.peer.offer()")
            require(offer.startswith("DT1."), "missing real offer")
            reply = guest.evaluate("(offer)=>fixture.peer.answer(offer)", offer)
            host.evaluate("(reply)=>fixture.peer.accept(reply)", reply)
            for page in [host, guest]:
                page.wait_for_function(
                    "fixture.peer.link?.bootstrapped===true", timeout=15000
                )
            require(
                host.evaluate("fixture.peer.pc.connectionState") == "connected",
                "host not connected",
            )
            require(
                guest.evaluate("fixture.peer.channel.readyState") == "open",
                "guest channel not open",
            )

        record("real WebRTC file offer/answer and full bootstrap", pair)
        if checks[-1]["pass"]:

            def pulse():
                guest.evaluate(
                    "fixture.peer.input({ax:1},[{type:'fire'}]); fixture.peer.input({ax:1},[])"
                )
                host.wait_for_function("fixture.state.wounds===1")
                guest.wait_for_function(
                    "fixture.state.wounds===1 && fixture.state.ammo===5"
                )
                guest.wait_for_function("fixture.peer.link.events.length===0")
                guest.wait_for_timeout(220)
                require(host.evaluate("fixture.state.wounds") == 1, "pulse duplicated")

            record("press shorter than one send interval spends one arrow once", pulse)

            def contested():
                host.evaluate("fixture.peer.input({},[{type:'interact'}])")
                guest.evaluate("fixture.peer.input({},[{type:'interact'}])")
                guest.wait_for_function(
                    "fixture.state.cache===0 && fixture.state.ammo===8"
                )
                require(
                    host.evaluate("fixture.state.ammo") == 8,
                    "contested cache duplicated",
                )

            record("shared pickup applied atomically once", contested)

            def progression():
                guest.evaluate(
                    "fixture.peer.input({},[{type:'travel',target:'summit'}])"
                )
                host.wait_for_function("fixture.state.relics.length===2")
                guest.wait_for_function(
                    "fixture.state.relics.length===2 && fixture.state.tools.length===3"
                )
                require(
                    host.evaluate("JSON.stringify(fixture.state)")
                    == guest.evaluate("JSON.stringify(fixture.state)"),
                    "progression mismatch",
                )

            record("authoritative tools and relics agree after input", progression)

            def departure():
                guest.evaluate("fixture.peer.cancel()")
                host.wait_for_function("fixture.state.players.length===1")
                require(
                    host.evaluate("fixture.peer.canStep()"), "host cannot continue solo"
                )
                require(
                    host.evaluate("fixture.peer.pc===null"),
                    "orphaned ICE connection can later kill continuing authority",
                )
                host.evaluate("fixture.peer.input({},[{type:'fire'}])")
                require(
                    host.evaluate("fixture.state.wounds") == 2,
                    "solo continuation failed",
                )

            record("guest departure removes avatar and host continues solo", departure)
            record("fresh reconnection creates new epoch and full state", pair)
            if checks[-1]["pass"]:

                def host_loss():
                    host.evaluate("fixture.peer.cancel()")
                    guest.wait_for_function(
                        "fixture.stopped==='host-left'", timeout=10000
                    )
                    require(
                        not guest.evaluate("fixture.peer.canStep()"),
                        "guest continues after authority loss",
                    )

                record("host departure stops guest instead of migrating", host_loss)

        def malformed():
            guest.evaluate("fixture.peer.cancel()")
            result = guest.evaluate(
                "async()=>{try{await fixture.peer.answer('DT1.bad');return false}catch(e){return e.message.length>0}}"
            )
            require(result, "malformed invitation accepted")
            require(
                guest.evaluate("fixture.peer.pc===null"),
                "malformed invitation opened a socket",
            )

        record(
            "malformed invitation rejected before connection construction", malformed
        )

        def cancellation_retry():
            result = guest.evaluate("""async()=>{
              const cancelled=Promise.race([fixture.peer.offer().then(()=>false,()=>true),new Promise(resolve=>setTimeout(()=>resolve(false),5000))]);
              fixture.peer.cancel();
              const fresh=fixture.peer.offer();
              const signal=await fresh;
              const wasCancelled=await cancelled;
              const valid=signal.startsWith('DT1.')&&fixture.peer.pc.signalingState==='have-local-offer';
              fixture.peer.cancel();
              return wasCancelled&&valid;
            }""")
            require(result, "cancelled operation damaged the immediate retry")

        record(
            "cancel and immediate retry isolate pending signaling operations",
            cancellation_retry,
        )
        record("no browser runtime errors", lambda: require(not errors, repr(errors)))
        for page in [host, guest]:
            page.evaluate("clearInterval(fixture.timer);fixture.peer.cancel()")
        host_context.close()
        guest_context.close()
    finally:
        browser.close()
REPORT.write_text(
    json.dumps(
        {
            "checks": checks,
            "scope": "real Chromium production WebRTC, two separate contexts, file:// fixture; WAN unknown",
        },
        indent=2,
    )
)
for check in checks:
    if not check["pass"]:
        print(check["name"] + ": " + check.get("detail", "failed"), file=sys.stderr)
failed = sum(not c["pass"] for c in checks)
print(f"Real WebRTC: {len(checks) - failed} passed, {failed} failed.")
sys.exit(bool(failed))
