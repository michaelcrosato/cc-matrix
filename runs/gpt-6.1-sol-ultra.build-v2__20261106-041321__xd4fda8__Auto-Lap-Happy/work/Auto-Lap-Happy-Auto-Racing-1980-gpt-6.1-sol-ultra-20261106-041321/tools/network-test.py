import http.server
import json
import pathlib
import sys
import threading

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]


class Quiet(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def log_message(self, *a):
        pass


server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Quiet)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
base = "http://127.0.0.1:" + str(server.server_port)
mode = sys.argv[1] if len(sys.argv) > 1 else "loopback"
fixture_url = (
    (ROOT / "tools" / "network-fixture.html").as_uri()
    if mode == "file"
    else base + "/tools/network-fixture.html"
)
results = []


def check(name, ok, detail=""):
    results.append({"name": name, "pass": bool(ok), "detail": str(detail)})


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--disable-dev-shm-usage"])
    context = browser.new_context()
    host = context.new_page()
    guest = context.new_page()
    for page in [host, guest]:
        page.goto(fixture_url)
    check("fixture identity", host.title() == "Auto Lap Happy transport test", host.url)
    offer = host.evaluate("net.createOffer()")
    check(
        "offer contains full gathered candidates",
        "a=candidate:" in json.loads(offer)["sdp"]["sdp"],
    )
    answer = guest.evaluate("(text)=>net.acceptOffer(text)", offer)
    check(
        "answer contains full gathered candidates",
        "a=candidate:" in json.loads(answer)["sdp"]["sdp"],
    )
    host.evaluate("(text)=>net.acceptAnswer(text)", answer)
    for page in [host, guest]:
        page.wait_for_function("net.connected && net.peerReady", timeout=15000)
    check(
        "real direct reliable channel",
        host.evaluate("net.channels.reliable.readyState") == "open"
        and guest.evaluate("net.channels.reliable.readyState") == "open",
    )
    check(
        "real direct unreliable channel",
        host.evaluate("net.channels.fast.readyState") == "open"
        and guest.evaluate("net.channels.fast.readyState") == "open",
    )
    host.evaluate("net.startDirect({course:2,cars:[3,4],target:10})")
    for page in [host, guest]:
        page.wait_for_function("net.started")
    check(
        "matched countdown/config",
        host.evaluate("net.config.course") == guest.evaluate("net.config.course") == 2
        and host.evaluate("Math.abs(net.clock()+3)<1")
        and guest.evaluate("Math.abs(net.clock()+3)<1"),
    )
    guest.evaluate(
        "net.update(.125,null,{steer:.4,brake:.3,throttle:.7,recover:false})"
    )
    host.wait_for_function("inputs.length>0")
    check(
        "guest intents reach authority",
        host.evaluate(
            "inputs[0][0]===1 && inputs[0][1].steer===.4 && inputs[0][1].brake===.3"
        ),
    )
    host.evaluate("net.update(.125,{scores:[2,1],tick:20,cars:[[1,2,3],[4,5,6]]},null)")
    guest.wait_for_function("snaps.length>0")
    check(
        "host snapshots reach guest",
        guest.evaluate("snaps[0].tick===20 && snaps[0].scores[0]===2"),
    )
    host.evaluate(
        """() => {net.receive(net.packet('i',{n:9,i:{steer:.6,brake:0,throttle:1}}),1);net.receive(net.packet('i',{n:8,i:{steer:-1,brake:0,throttle:1}}),1); }"""
    )
    check(
        "reordered intents rejected",
        host.evaluate("inputs[inputs.length-1][1].steer===.6"),
    )
    host.wait_for_timeout(650)
    host.evaluate("net.update(.125,{scores:[2,1]},null)")
    check(
        "stale input safely brakes",
        host.evaluate("inputs[inputs.length-1][1].brake===1"),
    )
    host.evaluate(
        "net.testDelay=150;net.testLoss=.05;window.testTick=50;window.lossTimer=setInterval(()=>net.update(.125,{scores:[6,3],tick:++testTick},null),130)"
    )
    guest.evaluate(
        "net.testDelay=150;net.testLoss=.05;window.lossTimer=setInterval(()=>net.update(.125,null,{steer:.25,brake:.2,throttle:.8,recover:false}),130)"
    )
    guest.wait_for_function("snaps.some(s=>s.tick>50 && s.scores[0]===6)")
    host.wait_for_function("inputs.some(s=>s[1].steer===.25)")
    check(
        "delayed lossy snapshots converge over real RTC",
        guest.evaluate("snaps.at(-1).scores[0]===6"),
    )
    check(
        "delayed lossy input reaches authority over real RTC",
        host.evaluate("inputs.some(s=>s[1].steer===.25)"),
    )
    for page in [host, guest]:
        page.evaluate("clearInterval(lossTimer);net.testDelay=0;net.testLoss=0")
    host.evaluate("net.finish([10,4])")
    guest.wait_for_function("net.finished")
    check(
        "authoritative finish exactly once",
        host.evaluate('events.filter(x=>x[0]==="finish").length===1')
        and guest.evaluate('events.filter(x=>x[0]==="finish").length===1'),
    )
    host.evaluate("net.startDirect({course:4})")
    for page in [host, guest]:
        page.wait_for_function("net.started && !net.finished && net.config.course===4")
    check("direct rematch reuses connection", True)
    guest.evaluate(
        "window.beforeOldRound=snaps.length;net.receive({...net.packet('s',{n:99999,s:{tick:99999}}),r:net.round-1},0)"
    )
    check(
        "late previous round snapshot rejected",
        guest.evaluate("snaps.length===beforeOldRound"),
    )
    for label, expr in [
        ("malformed invite", '"{bad"'),
        ("truncated invite", json.dumps(offer[:40])),
        ("wrong description type", json.dumps(answer)),
        (
            "incompatible build",
            json.dumps(offer.replace("auto-lap-happy-1", "auto-lap-happy-999")),
        ),
    ]:
        error = guest.evaluate(
            '(text)=>{try{HappyNetwork.validateInvite(text,"offer");return ""}catch(e){return e.message}}',
            json.loads(expr),
        )
        check(label, bool(error), error)
    dup = host.evaluate(
        '(text)=>net.acceptAnswer(text).then(()=>"accepted",e=>e.message)', answer
    )
    check("duplicate reply rejected", "already" in dup, dup)
    host.evaluate("net.destroy()")
    guest.wait_for_function("!net.connected")
    check("peer closure cleans up guest", guest.evaluate("net.finished && !net.active"))
    context.close()
    browser.close()
server.shutdown()
server.server_close()
(ROOT / "evidence" / ("network-direct-" + mode + ".json")).write_text(
    json.dumps(results, indent=2)
)
print(json.dumps(results))
