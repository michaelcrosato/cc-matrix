import uuid
from contextlib import contextmanager
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


@contextmanager
def server():
    instance = ThreadingHTTPServer(
        ("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT))
    )
    thread = Thread(target=instance.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{instance.server_port}"
    finally:
        instance.shutdown()
        instance.server_close()
        thread.join()


def main():
    checks = 0
    failures = []

    def check(condition, message):
        nonlocal checks
        checks += 1
        if not condition:
            failures.append(message)

    with server() as origin, sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            headless=True, args=["--autoplay-policy=no-user-gesture-required"]
        )
        context = browser.new_context()
        host = context.new_page()
        guest = context.new_page()
        for page in (host, guest):
            page.goto(origin + "/hub-README.md")
            page.evaluate("""async () => {
              const {ExpeditionNetwork}=await import('/hub.js');
              window.inputs=[];window.worlds=[];
              window.net=new ExpeditionNetwork((data,id)=>inputs.push({data,id}),world=>worlds.push(world));
            }""")
        check(
            host.evaluate("net.role === 'solo' && net.running && net.playerId === 0"),
            "Solo network defaults",
        )
        room = "TEST-" + uuid.uuid4().hex[:12].upper()
        host.evaluate("(room)=>net.hostLocal(room)", room)
        guest.evaluate("(room)=>net.joinLocal(room)", room)
        host.wait_for_function("net._paired")
        guest.wait_for_function("net._paired")
        check(
            host.evaluate('net.role === "host" && net.players.length === 2')
            and guest.evaluate('net.role === "guest" && net.playerId === 1'),
            "BroadcastChannel seat assignment",
        )
        guest.evaluate("net.sendInput({x:9,y:-9,jump:true,action:true})")
        host.wait_for_function("inputs.length > 0")
        check(
            host.evaluate(
                "inputs[0].id===1 && inputs[0].data.x===1 && inputs[0].data.y===-1 && inputs[0].data.jump"
            ),
            "Remote input routing and clamping",
        )
        host.evaluate("net.sendSnapshot({score:4000,players:[{id:0,x:2},{id:1,x:5}]})")
        guest.wait_for_function("worlds.length > 0")
        check(
            guest.evaluate("worlds[0].score===4000 && worlds[0].players[1].x===5"),
            "Host-authoritative world replication",
        )
        guest.evaluate(
            'net.sendSnapshot({score:-1});net._receive({type:"world",world:{score:-2},seq:-1},0)'
        )
        check(
            guest.evaluate("worlds.length === 1"),
            "Stale snapshots and guest authority rejected",
        )
        host.evaluate("net.solo()")
        guest.evaluate("net.solo()")
        offer = host.evaluate("net.createOffer()")
        answer = guest.evaluate("(offer)=>net.answerOffer(offer)", offer)
        host.evaluate("(answer)=>net.acceptAnswer(answer)", answer)
        host.wait_for_function(
            'net.connected && net.channel.readyState === "open"', timeout=20000
        )
        guest.wait_for_function(
            'net.connected && net.channel.readyState === "open"', timeout=20000
        )
        check(
            host.evaluate('net.status.includes("direct peer")'),
            "Standalone WebRTC direct connection",
        )
        guest.evaluate("net.sendInput({x:.5,y:0,action:true})")
        host.wait_for_function("inputs.length > 1")
        host.evaluate("net.sendSnapshot({score:12345,players:[{id:1,x:42}]})")
        guest.wait_for_function("worlds.length > 1")
        check(
            guest.evaluate("worlds.at(-1).score===12345")
            and host.evaluate("inputs.at(-1).data.x===.5"),
            "Bidirectional direct multiplayer transport",
        )
        for page in (host, guest):
            page.evaluate("net.dispose()")
        host.evaluate("""async () => {
          window.events={}; window.readyCount=0;window.sent=[];window.finishes=[];window.hubTime=-10;
          window.AIHub={active:true,
            connect:async()=>({me:2,host:2,isHost:true,server:true,players:[{id:0,name:'a'},{id:1,name:'b'}]}),
            on:(name,fn)=>{events[name]=fn;return ()=>delete events[name]},
            ready:()=>readyCount++,time:()=>hubTime,
            send:(data)=>{sent.push(data);return true},finish:data=>finishes.push(data)};
          const {ExpeditionNetwork}=await import('/hub.js');window.net=new ExpeditionNetwork();await net.init();
          net.ready();net.ready();
        }""")
        check(
            host.evaluate(
                'net.isServer && net.role==="host" && net.playerId===2 && readyCount===1 && !net.running'
            ),
            "Hub playerless host and gesture-free ready",
        )
        host.evaluate(
            'events.start();window.hubTime=0;net.sendSnapshot({score:5000});net.setScore(5000,false);events["time-up"]();events["time-up"]()'
        )
        check(
            host.evaluate(
                'net.running && sent.length===1 && finishes.length===1 && finishes[0].standings[0].join(",")==="0,1" && finishes[0].scores[0]===5000 && finishes[0].won===false'
            ),
            "Hub synchronized start and exactly-once time-up result",
        )
        host.evaluate('events.end({reason:"finished"});net.sendSnapshot({score:6})')
        check(
            host.evaluate("net.ended && !net.running && sent.length===1"),
            "Hub end stops outgoing traffic",
        )
        host.evaluate("net.dispose()")
        audit = host.evaluate(
            """async()=>{const {CavernAudio}=await import('/audio.js');return CavernAudio.auditOffline()}"""
        )
        check(
            audit["finite"] and audit["rms"] > 0.0001 and 0 < audit["peak"] <= 1,
            "Procedural music and voices render finite, audible, unclipped audio",
        )
        check(
            audit["musicVolume"] == 0.1 and audit["notes"] > 8 and audit["voices"] == 1,
            "Default music volume and procedural voice scheduling",
        )
        context.close()
        browser.close()
    for failure in failures:
        print("FAIL:", failure)
    print(f"{checks - len(failures)}/{checks} network/audio checks passed")
    return bool(failures)


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (PlaywrightError, OSError, ValueError, KeyError) as error:
        print("FAIL:", type(error).__name__ + ":", str(error))
        raise SystemExit(1)
