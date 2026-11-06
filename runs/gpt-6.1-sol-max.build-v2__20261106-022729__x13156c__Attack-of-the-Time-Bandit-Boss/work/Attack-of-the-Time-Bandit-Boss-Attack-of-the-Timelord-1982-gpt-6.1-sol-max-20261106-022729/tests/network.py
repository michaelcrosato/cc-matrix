import functools
import json
import threading
import traceback
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
config = json.loads((root / "build-config.json").read_text())


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = ThreadingHTTPServer(
    ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(root.parent))
)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
base = "http://127.0.0.1:" + str(server.server_port)
game_url = base + "/" + urllib.parse.quote(config["base"] + ".html")
assert config["title"] in urllib.request.urlopen(game_url).read().decode()
results = []
details = {
    "hubRevision": config["hubCommit"],
    "peerjs": "1.5.5",
    "harness": [],
    "standalone": {},
}


def check(name, fn):
    try:
        fn()
        results.append({"name": name, "pass": True})
    except Exception:
        results.append({"name": name, "pass": False, "error": traceback.format_exc()})


def expect(value, message="assertion failed"):
    if not value:
        raise AssertionError(message)


with sync_playwright() as pw:
    browser = pw.chromium.launch(
        headless=True, args=["--autoplay-policy=no-user-gesture-required"]
    )
    for params in [
        {"players": 2},
        {"players": 4, "latency": 150, "jitter": 50, "loss": 5},
        {
            "players": 4,
            "latency": 150,
            "jitter": 50,
            "loss": 5,
            "scenario": "host-leave",
        },
        {"players": 2, "scenario": "server"},
    ]:
        page = browser.new_page(viewport={"width": 1280, "height": 900})
        label = "Hub conformance " + json.dumps(params)

        def harness_case():
            query = urllib.parse.urlencode(
                {"game": "/" + config["base"] + ".html", "auto": 1, **params}
            )
            url = (
                base
                + "/"
                + urllib.parse.quote(config["base"])
                + "/vendor/hub/harness.html?"
                + query
            )
            page.goto(url)
            page.wait_for_function(
                "document.body.dataset.complete==='true'", timeout=70000
            )
            report = page.evaluate("window.__hubCheck")
            details["harness"].append({"params": params, "report": report})
            expect(
                report["pass"],
                json.dumps([c for c in report["checks"] if not c["pass"]]),
            )
            states = []
            for frame in page.frames[1:]:
                try:
                    states.append(frame.evaluate("TimeBandit.snapshot()"))
                except Exception as error:
                    raise AssertionError("Unreachable game frame") from error
            details["harness"][-1]["states"] = states
            expect(
                all(s["terminated"] for s in states), "a remaining peer did not stop"
            )
            expect(all(s["errors"] == [] for s in states), "engine errors")
            expect(
                all(not frame.evaluate("!!window.Peer") for frame in page.frames[1:]),
                "PeerJS initialized in Hub",
            )
            for frame in page.frames[1:]:
                expect(
                    frame.evaluate("!game.audio.ctx || game.audio.muted"),
                    "end did not mute audio",
                )
            for s in states:
                if s["packets"]:
                    expect(s["packets"]["maxBytes"] <= 16384, "Hub packet too big")
                    expect(s["packets"]["maxSecond"] <= 20, "Hub message rate too high")
            if params.get("scenario") == "server":
                host = next(s for s in states if s["server"])
                expect(len(host["players"]) == 2, "server phantom seat")

        check(label, harness_case)
        page.close()
    # Additional gameplay-state agreement in a hosted session before time-up.
    page = browser.new_page(viewport={"width": 1280, "height": 900})

    def shared_actions():
        query = urllib.parse.urlencode(
            {"game": "/" + config["base"] + ".html?test=1", "players": 2, "limit": 60}
        )
        # Use harness automatic flow to release its normal card; inspect traffic mid-run before it ends.
        query = urllib.parse.urlencode(
            {
                "game": "/" + config["base"] + ".html?test=1",
                "players": 2,
                "auto": 1,
                "play": 20000,
            }
        )
        page.goto(
            base
            + "/"
            + urllib.parse.quote(config["base"])
            + "/vendor/hub/harness.html?"
            + query
        )
        page.wait_for_function(
            "document.querySelectorAll('iframe').length>=2 && Array.from(document.querySelectorAll('iframe')).every(f=>f.contentWindow.TimeBandit?.snapshot().tick>260)",
            timeout=25000,
        )
        frames = [f for f in page.frames[1:] if f.evaluate("!!window.TimeBandit")]
        host = next(f for f in frames if f.evaluate("AIHub.isHost"))
        guest = next(f for f in frames if not f.evaluate("AIHub.isHost"))
        before = host.evaluate("TimeBandit.world.players.find(p=>p.id!==AIHub.me).x")
        guest.evaluate(
            "dispatchEvent(new KeyboardEvent('keydown',{code:'ArrowRight',key:'ArrowRight',bubbles:true}))"
        )
        page.wait_for_timeout(260)
        guest.evaluate(
            "dispatchEvent(new KeyboardEvent('keyup',{code:'ArrowRight',key:'ArrowRight',bubbles:true}))"
        )
        page.wait_for_timeout(200)
        after = host.evaluate("TimeBandit.world.players.find(p=>p.id!==AIHub.me).x")
        expect(after > before + 10, "remote movement did not reach host")
        guest.evaluate(
            "dispatchEvent(new KeyboardEvent('keydown',{code:'Space',key:' ',bubbles:true}))"
        )
        page.wait_for_timeout(250)
        expect(
            host.evaluate(
                "TimeBandit.world.events.some(e=>e.type==='shot' && e.owner!==AIHub.me)"
            ),
            "remote shot absent",
        )
        guest.evaluate(
            "dispatchEvent(new KeyboardEvent('keyup',{code:'Space',key:' ',bubbles:true}))"
        )
        page.wait_for_timeout(200)
        hs = host.evaluate("TimeBandit.snapshot()")
        gs = guest.evaluate("TimeBandit.snapshot()")
        expect(hs["phase"] == gs["phase"])
        expect(hs["score"] == gs["score"])
        expect(len(hs["players"]) == len(gs["players"]))
        # An input packet claiming another seat cannot set integrity or score.
        host_before = host.evaluate("TimeBandit.world.score")
        guest.evaluate(
            "AIHub.send({k:'a',n:900000,m:Infinity,x:99999,f:true,b:1,score:999999},{to:AIHub.host,reliable:true})"
        )
        page.wait_for_timeout(150)
        expect(host.evaluate("TimeBandit.world.score") == host_before)
        details["hostedGameplay"] = {
            "beforeX": before,
            "afterX": after,
            "host": hs,
            "guest": gs,
        }

    check(
        "Hub remote actions affect the authoritative game and peers converge",
        shared_actions,
    )
    page.close()
    page = browser.new_page(viewport={"width": 1280, "height": 900})

    def stressed_gameplay():
        query = urllib.parse.urlencode(
            {
                "game": "/" + config["base"] + ".html?test=1",
                "players": 4,
                "auto": 1,
                "play": 20000,
                "latency": 150,
                "jitter": 50,
                "loss": 5,
            }
        )
        page.goto(
            base
            + "/"
            + urllib.parse.quote(config["base"])
            + "/vendor/hub/harness.html?"
            + query
        )
        page.wait_for_function(
            "document.querySelectorAll('iframe').length>=3 && Array.from(document.querySelectorAll('iframe')).every(f=>f.contentWindow.TimeBandit?.snapshot().tick>280)",
            timeout=25000,
        )
        frames = [f for f in page.frames[1:] if f.evaluate("!!window.TimeBandit")]
        authority = next(f for f in frames if f.evaluate("AIHub.isHost"))
        guest_frame = next(f for f in frames if not f.evaluate("AIHub.isHost"))
        guest_id = guest_frame.evaluate("AIHub.me")
        authority.evaluate(
            "(id)=>{const w=TimeBandit.world;w.players.find(p=>p.id===id).hp=0;w.enemies=[];}",
            guest_id,
        )
        authority.wait_for_function("TimeBandit.world.phase==='intermission'")
        score = authority.evaluate("TimeBandit.world.score")
        for frame in frames:
            frame.wait_for_function(
                "([id,score])=>TimeBandit.world.phase==='intermission' && TimeBandit.world.players.find(p=>p.id===id).hp===1 && TimeBandit.world.threats.length===0 && TimeBandit.world.score===score",
                arg=[guest_id, score],
                timeout=3000,
            )
        authority.evaluate(
            "TimeBandit.world.brake=100;TimeBandit.world.brakeCooldown=0"
        )
        guest_frame.wait_for_function("TimeBandit.world.brake===100", timeout=3000)
        guest_frame.evaluate(
            "dispatchEvent(new KeyboardEvent('keydown',{code:'ShiftLeft',key:'Shift',bubbles:true}))"
        )
        page.wait_for_timeout(100)
        guest_frame.evaluate(
            "dispatchEvent(new KeyboardEvent('keyup',{code:'ShiftLeft',key:'Shift',bubbles:true}))"
        )
        # Brake edges survive the intermission and are applied on the first eligible play tick.
        for frame in frames:
            frame.wait_for_function(
                "TimeBandit.world.wave===1 && TimeBandit.world.stats.brakes===1",
                timeout=6500,
            )
        # A collision fixture tests reliable terminal convergence separately from legitimate campaign tests.
        authority.evaluate(
            "(()=>{const w=TimeBandit.world;for(const p of w.players.filter(p=>p.connected)){p.x=100+p.id*170;p.hp=1;p.inv=0;w.threats.push({id:99900+p.id,kind:'dart',x:p.x,y:p.y,px:p.x,py:p.y,vx:0,vy:0,age:0,warn:0,state:'air',target:p.id,tx:p.x,ty:p.y,r:5,life:1,ground:false});}})()"
        )
        page.wait_for_function("document.body.dataset.complete==='true'", timeout=15000)
        expect(page.evaluate("__hubCheck.pass"))
        states = [frame.evaluate("TimeBandit.snapshot()") for frame in frames]
        expect(
            all(s["terminated"] and s["score"] == states[0]["score"] for s in states)
        )
        details["stressedGameplay"] = {
            "latency": 150,
            "jitter": 50,
            "loss": 5,
            "states": states,
            "result": page.evaluate("__hubCheck"),
        }

    check(
        "stressed Hub wave-clear recovery, guest brake edge and terminal convergence",
        stressed_gameplay,
    )
    page.close()
    # Real standalone rooms: two independent contexts, default public PeerServer, actual RTCDataChannels.
    c1 = browser.new_context(viewport={"width": 1280, "height": 720})
    c2 = browser.new_context(viewport={"width": 1280, "height": 720})
    host = c1.new_page()
    guest = c2.new_page()
    host.set_default_timeout(6000)
    guest.set_default_timeout(6000)
    for p in [host, guest]:
        p.goto(game_url + "?test=1")
        p.wait_for_function("document.body.dataset.booted==='true'")
    linked = False

    def room_connect():
        global linked
        host.get_by_role("button", name="Online co-op", exact=True).click()
        host.get_by_role("button", name="Create room", exact=True).click()
        host.wait_for_function("TimeBandit.transport?.peer?.open===true", timeout=23000)
        code = host.evaluate("TimeBandit.transport.code")
        details["standalone"]["code"] = code
        guest.get_by_role("button", name="Online co-op", exact=True).click()
        guest.get_by_role("button", name="Join room", exact=True).click()
        guest.get_by_role("textbox", name="Room code", exact=True).fill(code)
        guest.get_by_role("button", name="Connect", exact=True).click()
        guest.wait_for_function(
            "TimeBandit.transport?.me===1 && TimeBandit.transport?.hostLink?.open",
            timeout=23000,
        )
        expect(host.evaluate("TimeBandit.transport.roster.length") == 2)
        rtc = guest.evaluate(
            "TimeBandit.transport.hostLink.peerConnection.connectionState"
        )
        expect(rtc == "connected", rtc)
        details["standalone"]["rtcState"] = rtc
        linked = True

    check("standalone Create/Join uses real PeerJS/WebRTC data handshake", room_connect)
    if linked:

        def room_play():
            guest.get_by_role("button", name="Ready / Not ready", exact=True).click()
            host.wait_for_function("TimeBandit.transport.roster.every(p=>p.ready)")
            host.get_by_role("button", name="Start campaign", exact=True).click()
            guest.wait_for_function("TimeBandit.world?.phase==='playing'")
            before = host.evaluate("TimeBandit.world.players[1].x")
            guest.keyboard.down("ArrowRight")
            guest.wait_for_timeout(300)
            guest.keyboard.up("ArrowRight")
            guest.wait_for_timeout(200)
            expect(host.evaluate("TimeBandit.world.players[1].x") > before + 10)
            guest.keyboard.down("Space")
            guest.wait_for_timeout(250)
            guest.keyboard.up("Space")
            expect(
                host.evaluate(
                    "TimeBandit.world.events.some(e=>e.type==='shot'&&e.owner===1)"
                )
            )
            host.evaluate("TimeBandit.world.brake=100")
            guest.wait_for_timeout(150)
            guest.keyboard.down("Shift")
            guest.wait_for_timeout(70)
            guest.keyboard.up("Shift")
            host.wait_for_function("TimeBandit.world.stats.brakes===1")
            guest.wait_for_function("TimeBandit.world.stats.brakes===1")
            host_state = host.evaluate("TimeBandit.snapshot()")
            guest.wait_for_timeout(200)
            guest_state = guest.evaluate("TimeBandit.snapshot()")
            expect(host_state["phase"] == guest_state["phase"])
            expect(host_state["players"][1]["hp"] == guest_state["players"][1]["hp"])
            details["standalone"]["play"] = {"host": host_state, "guest": guest_state}

        check(
            "standalone ready/start, remote movement/fire and shared integrity",
            room_play,
        )

        def room_results_replay():
            # Trigger loss through actual hostile collisions; test tools may set encounter fixtures.
            host.evaluate(
                "(()=>{const w=TimeBandit.world;for(const p of w.players){p.hp=1;p.inv=0;w.threats.push({id:90000+p.id,kind:'dart',x:p.x,y:p.y,px:p.x,py:p.y,vx:0,vy:0,age:0,warn:0,state:'air',target:p.id,tx:p.x,ty:p.y,r:5,life:1,ground:false});}})()"
            )
            host.wait_for_function("TimeBandit.world.phase==='results'")
            guest.wait_for_function("TimeBandit.world.phase==='results'")
            expect(
                host.evaluate("TimeBandit.world.score")
                == guest.evaluate("TimeBandit.world.score")
            )
            host.get_by_role(
                "button", name="Return to room / Replay", exact=True
            ).click()
            guest.wait_for_function("TimeBandit.ui.screen==='room'")
            guest.get_by_role("button", name="Ready / Not ready", exact=True).click()
            host.wait_for_function("TimeBandit.transport.roster.every(p=>p.ready)")
            host.get_by_role("button", name="Start campaign", exact=True).click()
            guest.wait_for_function(
                "TimeBandit.transport.run===2 && TimeBandit.world.tick>0"
            )
            expect(host.evaluate("TimeBandit.world.players.every(p=>p.hp===3)"))

        check(
            "standalone shared loss, results and replay with same roster",
            room_results_replay,
        )

        def guest_leave():
            guest.evaluate("TimeBandit.leaveRoom()")
            host.wait_for_function("TimeBandit.transport.roster.length===1")
            expect(host.evaluate("TimeBandit.world.players[1].connected===false"))

        check("standalone guest departure removes its active cannon", guest_leave)

        def host_leave():
            # Rejoin in the lobby and then close the host link.
            host.evaluate("TimeBandit.transport.lobby()")
            guest.evaluate(
                "TimeBandit.connectRoom(false,'" + details["standalone"]["code"] + "')"
            )
            guest.wait_for_function("TimeBandit.transport?.me===1", timeout=23000)
            host.evaluate("TimeBandit.leaveRoom()")
            guest.wait_for_function("TimeBandit.snapshot().terminated===true")
            expect(
                guest.get_by_role(
                    "button", name="Return to solo", exact=True
                ).is_visible()
            )
            guest.get_by_role("button", name="Return to solo", exact=True).click()
            expect(guest.evaluate("TimeBandit.ui.screen==='title'"))

        check("standalone host departure ends run and offers solo fallback", host_leave)
    else:
        details["standalone"]["externalLimitation"] = (
            host.locator(".esh-mod").inner_text()
            if host.locator(".esh-mod").count()
            else "Public signaling unavailable."
        )

    def failed_join():
        guest.evaluate("TimeBandit.leaveRoom()")
        guest.evaluate("TimeBandit.connectRoom(false,'ZZZZZZZZ')")
        guest.wait_for_function(
            "document.body.textContent.includes('No room with that code') || document.body.textContent.includes('timed out') || document.body.textContent.includes('failed')",
            timeout=25000,
        )
        expect(not guest.evaluate("TimeBandit.transport?.hostLink?.open===true"))
        expect(
            guest.get_by_role(
                "button", name="Leave room / Solo", exact=True
            ).is_visible()
        )
        guest.get_by_role("button", name="Leave room / Solo", exact=True).click()
        expect(guest.evaluate("TimeBandit.ui.screen==='title'"))

    check("failed standalone join reports error and returns to solo", failed_join)
    c1.close()
    c2.close()
    browser.close()
server.shutdown()
server.server_close()
print(json.dumps({"results": results, "details": details}))
