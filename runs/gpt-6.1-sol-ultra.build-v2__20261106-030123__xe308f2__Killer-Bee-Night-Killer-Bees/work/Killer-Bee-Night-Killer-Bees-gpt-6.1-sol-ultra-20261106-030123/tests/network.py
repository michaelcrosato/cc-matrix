"""Quiet real-Hub and real-WebRTC browser checks; invoked by tools/test.mjs."""

from __future__ import annotations

import json
import pathlib
import sys
import threading
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

DEV = pathlib.Path(__file__).resolve().parents[1]
WORK = DEV.parent
SELECTION = json.loads((DEV / "selection.json").read_text())
ARTIFACT = WORK / (SELECTION["slug"] + ".html")
RESULTS = []


def record(name, condition, detail=""):
    RESULTS.append({"name": name, "pass": bool(condition), "detail": str(detail)})


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WORK), **kwargs)

    def log_message(self, *args):
        pass


def watch_script():
    return """(() => {
      window.__netErrors=[];
      addEventListener('error', e=>__netErrors.push(e.message));
      addEventListener('unhandledrejection', e=>__netErrors.push(String(e.reason)));
      if(!/[?&]aihub=/.test(location.search))return;
      window.__hubViolations=[];
      for(const key of ['alert','confirm','prompt','open'])window[key]=()=>{__hubViolations.push(key);return null;};
      for(const key of ['RTCPeerConnection','WebSocket','EventSource']){const Original=window[key];if(Original)window[key]=function(...args){__hubViolations.push(key);return new Original(...args);};}
    })();"""


def run_harness(browser, base, scenario, players=2, latency=True):
    context = browser.new_context(viewport={"width": 1280, "height": 860})
    context.add_init_script(watch_script())
    page = context.new_page()
    errors = []
    warnings = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on(
        "console",
        lambda m: warnings.append(m.text) if m.text.startswith("[AIHub]") else None,
    )
    query = {
        "game": "/"
        + str(ARTIFACT.relative_to(WORK) if ARTIFACT.is_absolute() else ARTIFACT),
        "players": players,
        "auto": 1,
        "scenario": scenario,
        "play": 8000,
    }
    if latency:
        query.update(latency=150, jitter=50, loss=5)
    url = (
        base
        + "/"
        + DEV.name
        + "/vendor/hub/harness.html?"
        + urllib.parse.urlencode(query)
    )
    page.goto(url)
    try:
        if players == 2 and scenario in ("standard", "server"):
            page.wait_for_function(
                """() => [...document.querySelectorAll('iframe')].some(f=>f.contentWindow?.__night?.session?.canStep())""",
                timeout=30000,
            )
            game_frames = [
                f for f in page.frames[1:] if f.evaluate("!!window.__night?.session")
            ]
            authority = next(
                f for f in game_frames if f.evaluate("__night.session.host")
            )
            guest = next(
                f for f in game_frames if f.evaluate("__night.session.localIndex===1")
            )
            before = authority.evaluate("__night.world.players[1].x")
            guest.evaluate("__night.inject(1,{x:1,y:0,focus:true,ray:100})")
            authority.wait_for_function(
                "(before)=>__night.world.players[1].x>before+5&&__night.world.players[1].focus&&__night.world.players[1].raySeen===100",
                arg=before,
                timeout=4000,
            )
            record(f"Hub {scenario} guest intentions steer real authority", True)
            guest.evaluate("__night.inject(1,{x:0,y:0,focus:false,ray:100})")
            authority.wait_for_function("!__night.world.players[1].focus", timeout=4000)
            record(f"Hub {scenario} guest Focus release survives latency", True)
            if scenario == "server":
                record(
                    "Hub dedicated authority has no local render/input seat",
                    authority.evaluate(
                        "__night.game.headless&&__night.session.server&&__night.session.localIndex===-1"
                    ),
                )
        page.wait_for_selector('body[data-complete="true"]', timeout=90000)
        report = page.evaluate("window.__hubCheck")
        record(
            f"Hub {scenario} {players}p conformance",
            report and report.get("pass"),
            json.dumps(
                [c for c in (report or {}).get("checks", []) if not c.get("pass")]
            ),
        )
        record(
            f"Hub {scenario} {players}p no protocol warnings", not warnings, warnings
        )
        record(f"Hub {scenario} {players}p no page exceptions", not errors, errors)
        (DEV / "evidence" / f"hub-{scenario}-{players}.json").write_text(
            json.dumps(report, indent=2)
        )
        frames = []
        for frame in page.frames[1:]:
            try:
                frames.append(
                    frame.evaluate(
                        "({active:!!window.AIHub?.active,server:!!window.AIHub?.server,violations:window.__hubViolations||[],errors:window.__netErrors||[],state:window.__night?.snapshot?.(),network:window.__night?.session?.diagnostics})"
                    )
                )
            except PlaywrightError as error:
                if not frame.is_detached():
                    errors.append(str(error))
        record(
            f"Hub {scenario} {players}p permitted APIs only",
            all(not f.get("violations") and not f.get("errors") for f in frames),
            frames,
        )
        diagnostics = [f["network"] for f in frames if f.get("network")]
        record(
            f"Hub {scenario} {players}p packet budget",
            all(
                d["maxBytes"] <= 16384 and d["maxPerSecond"] <= 19 for d in diagnostics
            ),
            diagnostics,
        )
    except (PlaywrightError, OSError, ValueError) as error:
        record(f"Hub {scenario} {players}p completed", False, error)
    finally:
        context.close()


def run_direct(browser, base):
    context1 = browser.new_context()
    context2 = browser.new_context()
    first = context1.new_page()
    second = context2.new_page()
    try:
        for page in (first, second):
            page.goto(base + "/" + ARTIFACT.name)
            page.wait_for_function("window.__night && window.NightNet", timeout=15000)
        record(
            "Direct malformed codes recover",
            first.evaluate(
                "(() => {try{NightNet.decodeDescription('broken','offer');return false;}catch{return true;}})()"
            ),
        )
        # Public debug hooks use the exact menu connection callbacks and ordinary intentions.
        first.evaluate("window.__testPeer=__night.makePeer()")
        second.evaluate("window.__testPeer=__night.makePeer()")
        offer = first.evaluate("window.__testPeer.createOffer()")
        answer = second.evaluate("(code)=>window.__testPeer.acceptOffer(code)", offer)
        first.evaluate("(code)=>window.__testPeer.applyAnswer(code)", answer)
        for page in (first, second):
            page.wait_for_function("window.__testPeer.session?.active", timeout=15000)
        first.wait_for_function("__night.world?.players?.length===2", timeout=10000)
        second.wait_for_function("__night.world?.players?.length===2", timeout=10000)
        before = first.evaluate(
            "({x:__night.world.players[1].x,y:__night.world.players[1].y})"
        )
        second.evaluate("__night.inject(1,{x:1,y:0,focus:true,ray:1})")
        first.wait_for_function(
            "(before)=>Math.hypot(__night.world.players[1].x-before.x,__night.world.players[1].y-before.y)>8",
            arg=before,
            timeout=8000,
        )
        record("Direct actual WebRTC controls authoritative guest swarm", True)
        second.evaluate("__night.inject(1,{x:0,y:0,focus:false,ray:1})")
        first.wait_for_function("!__night.world.players[1].focus", timeout=5000)
        record("Direct remote Focus releases", True)
        snapshots = [
            p.evaluate(
                "({tick:__night.world.tick,score:__night.world.score,stage:__night.world.stage,players:__night.world.players.map(p=>({id:p.id,bees:p.bees,charge:p.charge}))})"
            )
            for p in (first, second)
        ]
        record(
            "Direct both peers display same team world",
            snapshots[0]["stage"] == snapshots[1]["stage"]
            and snapshots[0]["score"] == snapshots[1]["score"]
            and snapshots[0]["players"] == snapshots[1]["players"],
            snapshots,
        )
        second.evaluate("""() => {
          const original=__testPeer.session.callbacks.onSnapshot;
          __testPeer.session.callbacks.onSnapshot=w=>{
            if(w.stats?.networkReliableProbe)window.__reliableProbe={targets:w.targets.length,rivals:w.rivals.length,husks:w.husks.length};
            original(w);
          };
        }""")
        probe_bytes = first.evaluate("""() => {
          const s=__testPeer.session,w=structuredClone(__night.world), t=w.targets[0];
          w.targets=Array.from({length:12},(_,i)=>({...t,id:1000+i}));
          w.rivals=Array.from({length:5},(_,i)=>({id:2000+i,x:30+i*20,y:40,r:9.5,stage:'hunter',warning:0,age:40,angle:0}));
          w.husks=Array.from({length:12},(_,i)=>({id:3000+i,x:24+i*24,y:150,r:9,born:w.time,type:'left'}));
          w.stats.networkReliableProbe=1;
          const packet={v:1,k:'s',q:++s.seq,w:NightNet.pack(w,[])};
          s.send(packet,true);return NightNet.bytes(packet);
        }""")
        second.wait_for_function(
            "window.__reliableProbe?.targets===12&&__reliableProbe.rivals===5&&__reliableProbe.husks===12",
            timeout=5000,
        )
        record(
            "Direct worst authored full snapshot uses real reliable delivery",
            1200 < probe_bytes <= 16384,
            probe_bytes,
        )
        first.evaluate("__testPeer.session.finish(__night.world,false)")
        first.wait_for_function("__testPeer.session.ended", timeout=5000)
        second.wait_for_function("__testPeer.session.ended", timeout=5000)
        record(
            "Direct final result acknowledged and channel closed",
            first.evaluate("__testPeer.channel.readyState") == "closed"
            and second.evaluate("__testPeer.channel.readyState") == "closed",
        )
        # Setup cancellation creates no running leftover authority and permits a fresh offer.
        offer2 = first.evaluate("__testPeer.createOffer()")
        first.evaluate("__testPeer.cancel()")
        record(
            "Direct cancellation closes peer and permits retry",
            offer2.startswith("KBN1.")
            and first.evaluate("__testPeer.pc===null && __testPeer.channel===null"),
        )
        offer3 = first.evaluate("__testPeer.createOffer()")
        answer3 = second.evaluate("code=>__testPeer.acceptOffer(code)", offer3)
        first.evaluate("code=>__testPeer.applyAnswer(code)", answer3)
        for page in (first, second):
            page.wait_for_function("__testPeer.session?.active", timeout=10000)
        second.evaluate("__testPeer.cancel()")
        first.wait_for_function("__testPeer.session?.ended", timeout=6000)
        record(
            "Direct connection loss stops the authority and neutralizes input",
            first.evaluate(
                "__testPeer.session.inputs.every(a=>a.x===0&&a.y===0&&!a.focus)&&__night.world.phase==='failed'"
            ),
        )
        for page in (first, second):
            page.evaluate("__night.toTitle()")
            page.wait_for_function(
                "__night.game.sceneName==='title'&&__night.world===null", timeout=5000
            )
        record("Direct disconnect cleanly returns both players to title", True)
    except (PlaywrightError, OSError, ValueError) as error:
        record("Direct real game integration", False, error)
    finally:
        context1.close()
        context2.close()


def run_natural_victory(browser, base):
    context = browser.new_context(viewport={"width": 1280, "height": 860})
    context.add_init_script(watch_script())
    page = context.new_page()
    try:
        query = {
            "game": "/" + ARTIFACT.name,
            "players": 2,
            "auto": 1,
            "scenario": "standard",
            "play": 60000,
            "seed": 7,
            "limit": 900,
        }
        page.goto(
            base
            + "/"
            + DEV.name
            + "/vendor/hub/harness.html?"
            + urllib.parse.urlencode(query)
        )
        page.wait_for_function(
            """() => [...document.querySelectorAll('iframe')].some(f=>f.contentWindow?.__night?.session?.host&&f.contentWindow.__night.session.canStep())""",
            timeout=30000,
        )
        authority = next(
            f for f in page.frames[1:] if f.evaluate("!!window.__night?.session?.host")
        )
        authority.wait_for_function(
            "__night.session.diagnostics.sent>0&&__night.session.diagnostics.received>0",
            timeout=5000,
        )
        proof = authority.evaluate("""() => {
          const w=__night.world,g=__night.game;
          window.__naturalFinishCount=0;
          const finish=AIHub.finish;
          AIHub.finish=function(result){window.__naturalFinishCount++;window.__naturalFinish=result;return finish.call(AIHub,result);};
          g.stop();
          const seen=new Set([w.stage]);
          for(let i=0;i<900*120&&w.phase!=='won'&&w.phase!=='failed';i++){
            NightSim.step(w,w.players.map(p=>NightSim.bot(w,p.id)),1/120);
            if(w.phase==='result')NightSim.next(w);
            seen.add(w.stage);
          }
          const proof={phase:w.phase,time:w.time,score:w.score,stats:{...w.stats},stages:[...seen],assisted:w.assisted,invulnerable:w.invulnerable};
          g.start();return proof;
        }""")
        record(
            "Hub natural victory earned with ordinary campaign actions",
            proof["phase"] == "won"
            and len(proof["stages"]) == 6
            and not proof["assisted"]
            and not proof["invulnerable"],
            proof,
        )
        record(
            "Hub natural victory exercises full six-encounter arc",
            proof["stats"].get("clear") == 6
            and proof["stats"].get("collapse") == 61
            and proof["stats"].get("ray", 0) > 0
            and proof["stats"].get("pulse", 0) > 0,
            proof["stats"],
        )
        record(
            "Hub natural campaign completes within hard session cap",
            0 < proof["time"] < 900,
            proof["time"],
        )
        page.wait_for_selector('body[data-complete="true"]', timeout=20000)
        report = page.evaluate("window.__hubCheck")
        finish = authority.evaluate(
            "({count:__naturalFinishCount,result:__naturalFinish,network:__night.session.diagnostics})"
        )
        record(
            "Hub natural campaign finish is once-only tied team win",
            finish["count"] == 1
            and finish["result"]["won"] is True
            and finish["result"]["standings"] == [[0, 1]]
            and finish["result"]["scores"]["0"] == proof["score"]
            and finish["result"]["scores"]["1"] == proof["score"],
            finish,
        )
        final_states = []
        for frame in page.frames[1:]:
            if frame.evaluate("!!window.__night?.world"):
                final_states.append(
                    frame.evaluate(
                        "({phase:__night.world.phase,score:__night.world.score})"
                    )
                )
        record(
            "Hub final world reaches both teammates before end",
            len(final_states) == 2
            and all(
                w["phase"] == "won" and w["score"] == proof["score"]
                for w in final_states
            ),
            final_states,
        )
        record(
            "Hub natural victory passes official real harness",
            report.get("pass"),
            [c for c in report.get("checks", []) if not c.get("pass")],
        )
        (DEV / "evidence/hub-natural-victory.json").write_text(
            json.dumps({"proof": proof, "finish": finish, "harness": report}, indent=2)
        )
    except (PlaywrightError, OSError, ValueError, StopIteration) as error:
        record("Hub natural campaign integration", False, error)
    finally:
        context.close()


def run():
    (DEV / "evidence").mkdir(exist_ok=True)
    html = ARTIFACT.read_text()
    sdk = (DEV / "vendor/hub/session.js").read_text()
    first_script = html.split("<script>", 1)[1].split("</script>", 1)[0]
    record("SDK first script byte-identical", first_script == sdk)
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = "http://127.0.0.1:" + str(server.server_address[1])
    try:
        identity = urllib.request.urlopen(base + "/" + ARTIFACT.name).read().decode()
        record(
            "Own loopback server serves chosen game",
            f"<title>{SELECTION['title']}</title>" in identity,
        )
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
            )
            try:
                if "--direct-only" not in sys.argv and "--natural-only" not in sys.argv:
                    for scenario, players, latency in [
                        ("standard", 1, False),
                        ("standard", 2, True),
                        ("host-leave", 2, True),
                        ("server", 2, True),
                    ]:
                        run_harness(browser, base, scenario, players, latency)
                if "--natural-only" not in sys.argv:
                    run_direct(browser, base)
                if "--direct-only" not in sys.argv:
                    run_natural_victory(browser, base)
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
    suffix = (
        "-direct"
        if "--direct-only" in sys.argv
        else "-natural"
        if "--natural-only" in sys.argv
        else ""
    )
    (DEV / "evidence" / ("network" + suffix + "-results.json")).write_text(
        json.dumps(RESULTS, indent=2)
    )
    for result in RESULTS:
        if not result["pass"]:
            print("FAIL " + result["name"] + ": " + result["detail"], file=sys.stderr)
    print(
        f"{sum(r['pass'] for r in RESULTS)}/{len(RESULTS)} network browser checks passed"
    )
    return all(r["pass"] for r in RESULTS)


if __name__ == "__main__":
    raise SystemExit(0 if run() else 1)
