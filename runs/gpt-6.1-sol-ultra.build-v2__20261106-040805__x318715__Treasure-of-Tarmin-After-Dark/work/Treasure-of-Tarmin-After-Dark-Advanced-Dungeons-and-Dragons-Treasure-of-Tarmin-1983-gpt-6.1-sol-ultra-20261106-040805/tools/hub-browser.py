"""Run the pinned official AI Hub harness against an isolated release copy."""

import argparse
import contextlib
import functools
import hashlib
import http.server
import json
import shutil
import threading
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--game", required=True)
    parser.add_argument(
        "--scenario",
        default="all",
        choices=[
            "all",
            "standard",
            "stress",
            "host-leave",
            "server",
            "solo",
            "peer",
            "ui-peer",
        ],
    )
    args = parser.parse_args()
    game = Path(args.game).resolve()
    dev = Path(__file__).resolve().parents[1]
    evidence = dev / "tools" / "network-evidence"
    evidence.mkdir(parents=True, exist_ok=True)
    tree = evidence / "isolated-release"
    tree.mkdir(exist_ok=True)
    shutil.copyfile(game, tree / "release.html")
    if args.scenario == "peer":
        return peer_test(dev, evidence)
    if args.scenario == "ui-peer":
        return release_peer_test(tree, evidence)
    for name in ["harness.html", "bridge.js", "round.js"]:
        shutil.copyfile(dev / "vendor" / "hub" / name, tree / name)
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(tree))
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    port = server.server_address[1]
    base = f"http://127.0.0.1:{port}"
    scenarios = {
        "standard": {"players": 2},
        "stress": {"players": 2, "latency": 150, "jitter": 50, "loss": 5},
        "host-leave": {
            "players": 2,
            "scenario": "host-leave",
            "latency": 150,
            "jitter": 50,
            "loss": 5,
        },
        "server": {
            "players": 2,
            "scenario": "server",
            "latency": 150,
            "jitter": 50,
            "loss": 5,
        },
        "solo": {"players": 1},
    }
    names = list(scenarios) if args.scenario == "all" else [args.scenario]
    reports = []
    failures = []
    count = 0
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--disable-dev-shm-usage",
                    "--use-gl=angle",
                    "--use-angle=swiftshader",
                    "--enable-unsafe-swiftshader",
                ],
            )
            try:
                for name in names:
                    context = browser.new_context(
                        viewport={"width": 1600, "height": 1000}
                    )
                    page = context.new_page()
                    errors = []
                    page.on(
                        "pageerror",
                        lambda error, errors=errors: errors.append(str(error)),
                    )
                    params = {
                        "game": "release.html?test=1",
                        "auto": 1,
                        "play": 4000,
                        "seed": 14383,
                        **scenarios[name],
                    }
                    try:
                        page.goto(
                            base + "/harness.html?" + urlencode(params),
                            wait_until="domcontentloaded",
                            timeout=60000,
                        )
                        page.wait_for_function(
                            "document.body.dataset.complete === 'true'", timeout=90000
                        )
                        report = page.evaluate("window.__hubCheck")
                        report["case"] = name
                        report["outerErrors"] = errors
                        reports.append(report)
                        for check in report.get("checks", []):
                            count += 1
                            if not check.get("pass"):
                                failures.append(
                                    f"{name}: {check.get('name')}: {check.get('detail')}"
                                )
                        count += 1
                        if not report.get("pass") or errors:
                            failures.append(
                                f"{name}: official harness did not pass"
                                + (f": {errors}" if errors else "")
                            )
                            page.screenshot(
                                path=str(evidence / f"hub-{name}-failure.png")
                            )
                        copies = []
                        for frame in page.frames:
                            if "release.html" not in frame.url:
                                continue
                            copy = frame.evaluate("""() => {
                              const t=window.__gameTest,c=t?.controller,s=c?.state;
                              return c ? {ended:c.ended,server:c.server,diag:c.diagnostics(),world:s?JSON.stringify({floor:s.floor,boss:s.bossDefeated,treasure:s.treasureClaimed,round:s.round,doors:s.doors,enemies:s.enemies}):null,audio:t.audio?.diagnostics?.()} : null;
                            }""")
                            if copy:
                                copies.append(copy)
                        report["gameSpecific"] = copies
                        if copies:
                            count += 2
                            if not all(c["ended"] for c in copies):
                                failures.append(
                                    f"{name}: authoritative controllers did not stop at end"
                                )
                            if (
                                name != "host-leave"
                                and len({c["world"] for c in copies}) > 1
                            ):
                                failures.append(
                                    f"{name}: final floor, doors, enemy pools/phase or treasure disagree"
                                )
                            count += 1
                            if not all(
                                c["diag"]["maxPacket"] <= 15500
                                and c["diag"]["peakPerSecond"] <= 16
                                for c in copies
                            ):
                                failures.append(
                                    f"{name}: measured packet/rate budget exceeded"
                                )
                    except Exception as error:  # noqa: BLE001 -- preserve any harness failure as evidence
                        count += 1
                        failures.append(f"{name}: {type(error).__name__}: {error}")
                        with contextlib.suppress(Exception):
                            reports.append(
                                {
                                    "case": name,
                                    "error": str(error),
                                    "harness": page.evaluate(
                                        "window.__hubCheck || null"
                                    ),
                                }
                            )
                    finally:
                        context.close()
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
    (evidence / "hub-report.json").write_text(
        json.dumps(
            {
                "artifact": game.name,
                "sha256": hashlib.sha256(game.read_bytes()).hexdigest(),
                "checks": count,
                "failures": failures,
                "scenarios": reports,
            },
            indent=2,
        )
    )
    for failure in failures:
        print("FAIL Hub:", failure)
    print(f"{count - len(failures)}/{count} Hub checks passed")
    return 1 if failures else 0


def peer_test(dev, evidence):
    """Native peers with UI-exchanged codes, using the production transport/model."""
    tree = evidence / "peer-fixture"
    (tree / "src").mkdir(parents=True, exist_ok=True)
    for name in ["net.js", "core.js", "content.js"]:
        shutil.copyfile(dev / "src" / name, tree / "src" / name)
    (
        tree / "index.html"
    ).write_text("""<!doctype html><meta charset="utf-8"><title>Tarmin network verification fixture</title>
<button id="host">Host</button><button id="guest">Join</button><button id="cancel">Cancel</button>
<button id="offer">Create offer</button><button id="answer">Create answer</button><button id="accept">Connect</button>
<textarea id="code"></textarea><p id="status"></p>
<button id="attack">Attack</button><button id="south">Step south</button><button id="pickup">Claim key</button>
<script type="module">
import {createPeerLobby} from './src/net.js';
const $=id=>document.getElementById(id);
const status=(s,d)=>{$('status').textContent=s+': '+(d||'');window.statusState=s;};
function make(role){window.lobby?.cancel();window.controller=null;window.lobby=createPeerLobby({role,timeoutMs:30000,onStatus:status,onReady:c=>{window.controller=c;},onState:s=>{window.run=s;},onEnd:e=>{window.end=e;}});}
function run(id,fn){$(id).onclick=async()=>{try{await fn();}catch(e){status('error',e.message);}};}
run('host',()=>make('host'));run('guest',()=>make('guest'));run('cancel',()=>window.lobby.cancel());
run('offer',async()=>{$('code').value=await window.lobby.makeOffer();});
run('answer',async()=>{$('code').value=await window.lobby.acceptOffer($('code').value);});
run('accept',()=>window.lobby.acceptAnswer($('code').value));
run('attack',()=>window.controller.send({type:'attack',target:'marrow-first'}));
run('south',()=>window.controller.send({type:'move',dx:0,dy:1}));
run('pickup',()=>window.controller.send({type:'pickup',target:'upper-key'}));
window.fixtureReady=true;
</script>""")
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(tree))
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    url = f"http://127.0.0.1:{server.server_address[1]}/index.html"
    failures = []
    count = 0
    evidence_state = {}

    def check(name, value):
        nonlocal count
        count += 1
        if not value:
            failures.append(name)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=["--disable-dev-shm-usage"])
            contexts = [browser.new_context(), browser.new_context()]
            host, guest = [c.new_page() for c in contexts]
            try:
                for page in [host, guest]:
                    page.goto(url)
                    page.wait_for_function("window.fixtureReady === true")
                host.locator("#host").click()
                guest.locator("#guest").click()
                guest.locator("#code").fill("TARMIN1.broken")
                guest.locator("#answer").click()
                guest.wait_for_function("window.statusState === 'error'")
                check(
                    "malformed UI invite gives recoverable error",
                    "damaged" in guest.locator("#status").inner_text(),
                )
                host.locator("#offer").click()
                host.wait_for_function(
                    "document.querySelector('#code').value.startsWith('TARMIN1.')"
                )
                offer = host.locator("#code").input_value()
                guest.locator("#code").fill(offer)
                guest.locator("#answer").click()
                guest.wait_for_function(
                    "window.statusState === 'answer-ready' || window.statusState === 'connecting'"
                )
                answer = guest.locator("#code").input_value()
                host.locator("#code").fill(answer)
                host.locator("#accept").click()
                for page in [host, guest]:
                    page.wait_for_function(
                        "window.controller && window.controller.state", timeout=30000
                    )
                check(
                    "two isolated browser contexts join via real WebRTC",
                    host.evaluate(
                        "controller.mode==='webrtc' && lobby.connectionState==='connected'"
                    )
                    and guest.evaluate(
                        "controller.mode==='webrtc' && lobby.connectionState==='connected'"
                    ),
                )
                check(
                    "initial authoritative snapshots agree",
                    host.evaluate("controller.state.expedition")
                    == guest.evaluate("controller.state.expedition"),
                )
                host.locator("#attack").click()
                guest.wait_for_function(
                    "controller.state.encounter && controller.state.encounter.plans.host"
                )
                guest.locator("#attack").click()
                host.wait_for_function("controller.state.stats.rounds===1")
                guest.wait_for_function("controller.state.stats.rounds===1")
                check(
                    "both committed intentions resolve one shared round",
                    host.evaluate("controller.state.stats.rounds") == 1,
                )
                host.locator("#attack").click()
                guest.wait_for_function(
                    "controller.state.encounter && controller.state.encounter.plans.host"
                )
                guest.locator("#attack").click()
                host.wait_for_function(
                    "controller.state.enemies.find(e=>e.id==='marrow-first').alive===false"
                )
                guest.wait_for_function(
                    "controller.state.enemies.find(e=>e.id==='marrow-first').alive===false"
                )
                check(
                    "shared combat death and costs agree",
                    host.evaluate("JSON.stringify(controller.state.players)")
                    == guest.evaluate("JSON.stringify(controller.state.players)"),
                )
                for _ in range(2):
                    host.locator("#south").click()
                    guest.locator("#south").click()
                    guest.wait_for_timeout(250)
                host.locator("#pickup").click()
                guest.locator("#pickup").click()
                guest.wait_for_function("controller.state.keyring.includes('brass')")
                check(
                    "contested shared key claimed exactly once",
                    host.evaluate(
                        "controller.state.loot.filter(l=>l.id==='upper-key'&&l.claimed).length===1 && controller.state.keyring.length===1"
                    ),
                )
                check(
                    "transport traffic respects Hub-compatible budget",
                    host.evaluate(
                        "controller.diagnostics().maxPacket<=15500 && controller.diagnostics().peakPerSecond<=16"
                    ),
                )
                guest.locator("#cancel").click()
                host.wait_for_function(
                    "controller.state.players.guest.connected===false"
                )
                check(
                    "departing guest leaves supplies and host continues",
                    host.evaluate(
                        "!controller.ended && controller.state.loot.some(l=>l.bag==='guest')"
                    ),
                )
                check(
                    "guest cancel closes peer connection",
                    guest.evaluate(
                        "lobby.connectionState==='closed' && lobby.diagnostics().canceled"
                    ),
                )
                evidence_state = {
                    "host": host.evaluate("controller.diagnostics()"),
                    "guest": guest.evaluate("lobby.diagnostics()"),
                }
                host.locator("#cancel").click()
                host.locator("#host").click()
                check(
                    "cancel allows a clean setup retry",
                    host.evaluate(
                        "lobby.connectionState==='new' && !lobby.diagnostics().canceled"
                    ),
                )
                host.locator("#cancel").click()
            except Exception as error:  # noqa: BLE001 -- preserve any peer failure as evidence
                count += 1
                failures.append(
                    f"native peer test threw: {type(error).__name__}: {error}"
                )
                with contextlib.suppress(Exception):
                    evidence_state = {
                        "hostStatus": host.locator("#status").inner_text(),
                        "guestStatus": guest.locator("#status").inner_text(),
                        "host": host.evaluate("window.lobby?.diagnostics()"),
                        "guest": guest.evaluate("window.lobby?.diagnostics()"),
                    }
            finally:
                for context in contexts:
                    context.close()
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
    (evidence / "peer-report.json").write_text(
        json.dumps(
            {"checks": count, "failures": failures, "evidence": evidence_state},
            indent=2,
        )
    )
    for failure in failures:
        print("FAIL peer:", failure)
    print(f"{count - len(failures)}/{count} native WebRTC checks passed")
    return 1 if failures else 0


def release_peer_test(tree, evidence):
    """Actual release UI. Explicit test-only scenario seeding is recorded below."""
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(tree))
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    url = f"http://127.0.0.1:{server.server_address[1]}/release.html?test=1"
    count = 0
    failures = []
    result = {
        "scenarioSeeding": "Normal UI connection and opening combat, rest, handoff and contested loot. Render loops stop after renderer initialization to isolate network/UI authority from the software GPU. Test-only authoritative state seeds depleted pools/no-food revival, ladder positions, and boss preparation; subsequent actions use production handlers."
    }

    def check(name, value):
        nonlocal count
        count += 1
        if not value:
            failures.append(name)

    def action(page, value):
        return page.evaluate("a=>__gameTest.command(a)", value)

    def synced(page, expression):
        page.wait_for_function("window.__gameTest && " + expression, timeout=20000)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--disable-dev-shm-usage",
                    "--use-gl=angle",
                    "--use-angle=swiftshader",
                    "--enable-unsafe-swiftshader",
                ],
            )
            contexts = [
                browser.new_context(viewport={"width": 1280, "height": 800}),
                browser.new_context(viewport={"width": 1280, "height": 800}),
            ]
            host, guest = [c.new_page() for c in contexts]
            errors = []
            try:
                for page in [host, guest]:
                    page.on("pageerror", lambda e: errors.append(str(e)))
                    page.goto(url, wait_until="domcontentloaded")
                for page, role in [(host, "host"), (guest, "join")]:
                    page.wait_for_function(
                        "document.body.dataset.ready==='true'", timeout=60000
                    )
                    page.evaluate(
                        """role=>{__gameTest.game.stop();if(__gameTest.attract)window.dispatchEvent(new KeyboardEvent('keydown',{key:'Shift',code:'ShiftLeft',bubbles:true}));document.querySelector('[data-ui=coop]').click();document.querySelector('[data-ui='+role+']').click();}""",
                        role,
                    )
                guest.locator("#invite-in").fill("TARMIN1.broken")
                guest.locator("[data-ui=accept-code]").click()
                guest.wait_for_function(
                    "document.querySelector('#connection-status').textContent.includes('damaged')"
                )
                check("release UI reports malformed invite and permits retry", True)
                host.locator("[data-ui=make-offer]").click()
                host.wait_for_function(
                    "document.querySelector('#invite-out').value.startsWith('TARMIN1.')"
                )
                guest.locator("#invite-in").fill(
                    host.locator("#invite-out").input_value()
                )
                guest.locator("[data-ui=accept-code]").click()
                guest.wait_for_function(
                    "document.querySelector('#invite-out').value.startsWith('TARMIN1.')"
                )
                host.locator("#invite-in").fill(
                    guest.locator("#invite-out").input_value()
                )
                host.locator("[data-ui=accept-code]").click()
                for page in [host, guest]:
                    synced(
                        page,
                        "__gameTest.screen==='play' && __gameTest.controller?.mode==='webrtc' && __gameTest.controller.state",
                    )
                check(
                    "release UI establishes real two-context WebRTC expedition",
                    host.evaluate("__gameTest.state.expedition")
                    == guest.evaluate("__gameTest.state.expedition"),
                )
                for round_number in [1, 2]:
                    action(host, {"type": "attack", "target": "marrow-first"})
                    synced(guest, "__gameTest.state.encounter?.plans.host")
                    action(guest, {"type": "attack", "target": "marrow-first"})
                    for page in [host, guest]:
                        synced(page, f"__gameTest.state.stats.rounds==={round_number}")
                check(
                    "release peers resolve shared combat and single enemy death",
                    host.evaluate(
                        "!__gameTest.state.enemies.find(e=>e.id==='marrow-first').alive"
                    )
                    and guest.evaluate(
                        "!__gameTest.state.enemies.find(e=>e.id==='marrow-first').alive"
                    ),
                )
                ration_before = guest.evaluate("__gameTest.state.players.guest.food")
                guest.evaluate("__gameTest.showPack()")
                guest.locator("[data-ui=rest]").click()
                synced(guest, "__gameTest.screen==='confirm'")
                before_food = guest.evaluate("__gameTest.state.players.guest.food")
                check(
                    "guest rest preview consumes no ration",
                    before_food == ration_before,
                )
                guest.locator("#confirm-action").click()
                synced(
                    guest, f"__gameTest.state.players.guest.food==={ration_before - 1}"
                )
                check(
                    "guest confirmation restores strength exactly once",
                    host.evaluate(
                        f"__gameTest.state.players.guest.war===__gameTest.state.players.guest.maxWar && __gameTest.state.players.guest.food==={ration_before - 1}"
                    ),
                )
                host.evaluate("__gameTest.showPack()")
                host.locator("[data-ui=handoff]").click()
                synced(
                    guest,
                    "__gameTest.state.players.guest.pack.some(i=>i?.kind==='shield')",
                )
                check(
                    "nearby item handoff is authoritative and unique",
                    host.evaluate(
                        "__gameTest.state.players.host.pack[0]===null && __gameTest.state.players.guest.pack.filter(i=>i?.kind==='shield').length===2"
                    ),
                )
                for _ in range(2):
                    action(host, {"type": "move", "dx": 0, "dy": 1})
                    action(guest, {"type": "move", "dx": 0, "dy": 1})
                    guest.wait_for_timeout(250)
                action(host, {"type": "pickup", "target": "upper-key"})
                action(guest, {"type": "pickup", "target": "upper-key"})
                synced(guest, "__gameTest.state.keyring.includes('brass')")
                check(
                    "contested release pickup cannot duplicate key or loot",
                    host.evaluate(
                        "__gameTest.state.keyring.length===1 && __gameTest.state.loot.filter(l=>l.id==='upper-key'&&l.claimed).length===1"
                    ),
                )
                for channel in ["war", "spirit"]:
                    host.evaluate(
                        "channel=>{const s=__gameTest.state;s.players.guest[channel]=0;s.players.guest.down=true;s.players.host.food=0;}",
                        channel,
                    )
                    synced(guest, "__gameTest.state.players.guest.down")
                    no_food = action(host, {"type": "revive", "target": "guest"})
                    check(
                        f"{channel}-depleted revive rejects without ration",
                        no_food.get("ok") is False
                        and host.evaluate("__gameTest.state.players.guest.down"),
                    )
                    host.evaluate("__gameTest.state.players.host.food=1")
                    action(host, {"type": "revive", "target": "guest"})
                    synced(guest, "!__gameTest.state.players.guest.down")
                    check(
                        f"{channel}-depleted revive restores both pools and consumes once",
                        guest.evaluate(
                            "__gameTest.state.players.guest.war>=Math.ceil(__gameTest.state.players.guest.maxWar*.3) && __gameTest.state.players.guest.spirit>=Math.ceil(__gameTest.state.players.guest.maxSpirit*.3) && __gameTest.state.players.host.food===0"
                        ),
                    )
                for floor in [0, 1]:
                    host.evaluate(
                        "()=>{for(const p of Object.values(__gameTest.state.players)){p.x=9;p.y=1;p.lastSafe={x:9,y:1};}}"
                    )
                    synced(
                        guest,
                        "__gameTest.state.players.guest.x===9 && __gameTest.state.players.guest.y===1",
                    )
                    action(host, {"type": "descend", "confirm": True})
                    check(
                        f"floor {floor + 1} descent waits for ally readiness",
                        host.evaluate("__gameTest.state.floor") == floor,
                    )
                    action(guest, {"type": "descend", "confirm": True})
                    synced(guest, f"__gameTest.state.floor==={floor + 1}")
                    check(
                        f"floor {floor + 1} descent moves both peers to one floor",
                        host.evaluate("__gameTest.state.floor") == floor + 1,
                    )
                host.evaluate(
                    """()=>{const s=__gameTest.state;for(const p of Object.values(s.players)){p.x=6;p.y=5;p.lastSafe={x:6,y:5};p.war=p.maxWar;p.spirit=p.maxSpirit;p.food=7;p.arrows=99;p.armor={kind:'armor',id:p.id+':test-armor'};p.ring={kind:'ring',id:p.id+':test-ring'};}}"""
                )
                synced(
                    guest,
                    "__gameTest.state.players.guest.x===6 && __gameTest.state.players.guest.arrows===99",
                )
                action(host, {"type": "move", "dx": 1, "dy": 0})
                synced(guest, "__gameTest.state.encounter?.id==='warden'")
                phases = set()
                for _ in range(30):
                    state = host.evaluate(
                        "({phase:__gameTest.state.enemies.find(e=>e.id==='warden').phase,preparation:__gameTest.state.encounter?.preparation,done:__gameTest.state.bossDefeated,round:__gameTest.state.stats.rounds})"
                    )
                    phases.add(state["phase"])
                    if state["done"]:
                        break
                    if state["preparation"]:
                        for page in [host, guest]:
                            action(page, {"type": "rest", "confirm": True})
                            page.wait_for_timeout(150)
                        action(host, {"type": "continueBoss"})
                        synced(guest, "!__gameTest.state.encounter.preparation")
                    round_count = host.evaluate("__gameTest.state.stats.rounds")
                    action(host, {"type": "attack", "target": "warden"})
                    synced(guest, "__gameTest.state.encounter?.plans.host")
                    action(guest, {"type": "attack", "target": "warden"})
                    synced(host, f"__gameTest.state.stats.rounds>{round_count}")
                    synced(guest, f"__gameTest.state.stats.rounds>{round_count}")
                check("shared boss traverses all three phases", phases == {1, 2, 3})
                check(
                    "boss defeat does not auto-claim treasure",
                    host.evaluate(
                        "__gameTest.state.bossDefeated && !__gameTest.state.treasureClaimed"
                    ),
                )
                action(host, {"type": "move", "dx": 1, "dy": 0})
                action(host, {"type": "interact", "target": "treasure"})
                synced(
                    guest,
                    "__gameTest.state.status==='victory' && __gameTest.state.treasureClaimed",
                )
                check(
                    "actual release peers both display treasure-claim victory",
                    host.evaluate("__gameTest.screen==='victory'")
                    and guest.evaluate("__gameTest.screen==='victory'"),
                )
                result["host"] = host.evaluate("__gameTest.controller.diagnostics()")
                result["guest"] = guest.evaluate("__gameTest.controller.diagnostics()")
                check(
                    "actual release measured traffic fits protocol bounds",
                    all(
                        result[c]["maxPacket"] <= 15500
                        and result[c]["peakPerSecond"] <= 16
                        for c in ["host", "guest"]
                    ),
                )
                guest.evaluate("__gameTest.controller.close()")
                synced(host, "__gameTest.state.players.guest.connected===false")
                check(
                    "release controller close recovers guest bag and leaves host live",
                    host.evaluate(
                        "!__gameTest.controller.ended && __gameTest.state.loot.some(l=>l.bag==='guest')"
                    ),
                )
                host.evaluate("__gameTest.stop()")
                check("release peer session produced no browser exceptions", not errors)
            except Exception as error:  # noqa: BLE001 -- preserve any release failure as evidence
                count += 1
                failures.append(
                    f"actual release peer test threw: {type(error).__name__}: {error}"
                )
                for name, page in [("host", host), ("guest", guest)]:
                    with contextlib.suppress(Exception):
                        result[name] = page.evaluate(
                            "({screen:window.__gameTest?.screen,diag:window.__gameTest?.controller?.diagnostics(),state:window.__gameTest?.state})"
                        )
                        page.screenshot(
                            path=str(evidence / f"release-peer-{name}-failure.png")
                        )
                result["errors"] = errors
            finally:
                for context in contexts:
                    context.close()
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
    (evidence / "release-peer-report.json").write_text(
        json.dumps(
            {
                "checks": count,
                "failures": failures,
                "evidence": result,
                "sha256": hashlib.sha256(
                    (tree / "release.html").read_bytes()
                ).hexdigest(),
            },
            indent=2,
        )
    )
    for failure in failures:
        print("FAIL release peer:", failure)
    print(f"{count - len(failures)}/{count} release WebRTC checks passed")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
