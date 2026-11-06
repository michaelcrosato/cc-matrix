"""Real PeerJS cloud transport check, two pages in one Chromium process."""

import functools
import http.server
import json
import pathlib
import threading
import time

from playwright.sync_api import sync_playwright

BASE = pathlib.Path(__file__).resolve().parent.parent
RESULT = BASE / "evidence" / "net-peer.json"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def run():
    checks = []
    errors = []

    def check(name, passed, detail=""):
        checks.append({"name": name, "pass": bool(passed), "detail": detail})

    handler = functools.partial(QuietHandler, directory=str(BASE))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    browser = None
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True, args=["--autoplay-policy=no-user-gesture-required"]
            )
            context = browser.new_context()
            host = context.new_page()
            guest = context.new_page()
            for page in [host, guest]:
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.goto(f"http://127.0.0.1:{server.server_port}/tests/net-peer.html")
                check("fixture identity", page.title() == "Bomb Union network fixture")
            code = host.evaluate("net.host()")
            check("cloud-signaled host ready", len(code) == 6)
            seat = guest.evaluate("(code)=>net.join(code)", code)
            check("cloud-signaled direct data connection", seat == 1)
            host.wait_for_function("net.roster.filter(p=>p.connected).length===2")
            host.evaluate("net.start('waterfront',19082)")
            guest.wait_for_function(
                "net.state && net.state.caseId==='waterfront' && net.running"
            )
            check(
                "shared initial state",
                host.evaluate("net.state.seed") == guest.evaluate("net.state.seed"),
            )
            check("locked party workload", host.evaluate("net.state.party") == 2)
            # Seat claims are authoritative and exclusive.
            host.evaluate("net.command({type:'claim',board:'B1'})")
            guest.wait_for_function("net.state.boards[0].claim===0")
            guest.evaluate("net.command({type:'claim',board:'B1'})")
            time.sleep(0.6)
            check(
                "exclusive board claim", host.evaluate("net.state.boards[0].claim") == 0
            )
            guest.evaluate("net.command({type:'claim',board:'B2'})")
            guest.wait_for_function("net.state.boards[1].claim===1")
            check(
                "parallel repair claims",
                host.evaluate("net.state.boards[1].claim") == 1,
            )
            # Drive the same ordinary actions used by the UI. No dev modifications.
            for page, board in [(host, "B1"), (guest, "B2")]:
                guard = 0
                while not page.evaluate(
                    "(id)=>net.state.boards.find(b=>b.id===id).complete", board
                ):
                    guard += 1
                    if guard > 30:
                        raise AssertionError("repair action loop did not converge")
                    action = page.evaluate(
                        "(id)=>BU.Sim.nextAction(net.state,id)", board
                    )
                    if not action:
                        raise AssertionError("no next action for unfinished board")
                    previous = page.evaluate(
                        "(id)=>net.state.boards.find(b=>b.id===id).revision", board
                    )
                    page.evaluate("(action)=>net.command(action)", action)
                    if action["type"] == "begin":
                        page.wait_for_timeout(650)
                        page.evaluate('(board)=>net.command({type:"end",board})', board)
                    page.wait_for_function(
                        "([id,rev])=>net.state.boards.find(b=>b.id===id).revision>rev",
                        arg=[board, previous],
                    )
                    page.wait_for_timeout(1050)
            guest.wait_for_function("net.state.boards.filter(b=>b.complete).length>=2")
            check(
                "both seats performed complete repairs",
                host.evaluate("net.state.boards.filter(b=>b.complete).length") == 2,
            )
            check(
                "shared evidence truth",
                host.evaluate("JSON.stringify(net.state.evidence)")
                == guest.evaluate("JSON.stringify(net.state.evidence)"),
            )
            token = guest.evaluate("net.token")
            guest.evaluate("net.connection.close()")
            host.wait_for_function("net.roster.find(p=>p.id===1).connected===false")
            check(
                "disconnect released board and hold",
                host.evaluate(
                    "net.state.boards.every(b=>b.claim!==1 && (!b.hold || b.hold.seat!==1))"
                ),
            )
            guest.evaluate("net.reconnect()")
            guest.wait_for_function(
                "net.connected && net.state && net.state.seats.includes(1)"
            )
            check(
                "snapshot rejoin reclaimed token",
                guest.evaluate("net.token") == token
                and guest.evaluate("net.seat") == 1,
            )
            check(
                "rejoin evidence intact",
                host.evaluate("JSON.stringify(net.state.evidence)")
                == guest.evaluate("JSON.stringify(net.state.evidence)"),
            )
            # Infer from actual evidence. Finish route if two packs were insufficient.
            for index in range(2, 4):
                if host.evaluate("BU.Sim.candidates(net.state.evidence[0]).length===1"):
                    break
                board = f"B{index + 1}"
                host.evaluate('(board)=>net.command({type:"claim",board})', board)
                for _ in range(30):
                    if host.evaluate(
                        "(board)=>net.state.boards.find(b=>b.id===board).complete",
                        board,
                    ):
                        break
                    action = host.evaluate(
                        "(board)=>BU.Sim.nextAction(net.state,board)", board
                    )
                    host.evaluate("(action)=>net.command(action)", action)
                    if action["type"] == "begin":
                        host.wait_for_timeout(650)
                        host.evaluate('(board)=>net.command({type:"end",board})', board)
            code_digits = host.evaluate(
                "net.state.evidence.map(e=>BU.Sim.candidates(e)[0])"
            )
            host.evaluate('(code)=>net.command({type:"propose",code})', code_digits)
            guest.wait_for_function("net.state.proposal!==null")
            guest.evaluate('net.command({type:"vote",accept:true})')
            host.wait_for_function('net.state.status==="won"')
            guest.wait_for_function('net.state.status==="won"')
            check(
                "shared cooperative code result",
                host.evaluate("net.state.status") == "won"
                and guest.evaluate("net.state.status") == "won",
            )
            # Fill the remaining seats through the actual shipped admission path.
            full_result = guest.evaluate("""async () => {
              window.extraRooms=[];
              for(let i=0;i<2;i++){const n=new BU.Network();extraRooms.push(n);await n.join(net.code);}
              const rejected=new BU.Network();extraRooms.push(rejected);
              try {await rejected.join(net.code);return 'unexpected admission';}
              catch(e) {return e.message;}
            }""")
            check(
                "full room has actionable refusal",
                "full" in full_result.lower(),
                full_result,
            )
            version_result = guest.evaluate("""() => new Promise((resolve,reject)=>{
              const p=new Peer({secure:true,debug:0,config:{iceServers:[{urls:'stun:stun.l.google.com:19302'}]}});
              const timeout=setTimeout(()=>{p.destroy();reject(new Error('version test timed out'));},18000);
              p.on('open',()=>{const c=p.connect('bombunion-v1-'+net.code.toLowerCase(),{reliable:true,serialization:'json'});
                c.on('open',()=>c.send({bu:99,content:1,t:'hello',token:'invalid-version'}));
                c.on('data',d=>{clearTimeout(timeout);p.destroy();resolve(d.reason||'');});
              });p.on('error',e=>{clearTimeout(timeout);p.destroy();reject(e);});
            })""")
            check(
                "version mismatch is rejected",
                "version" in version_result.lower(),
                version_result,
            )
            guest.evaluate("extraRooms.forEach(n=>n.leave())")
            unavailable = guest.evaluate("""async () => {
              const n=new BU.Network();
              try {await n.join('ZZZZZZ');n.leave();return 'unexpected room';}
              catch(e) {n.leave();return e.message;}
            }""")
            check(
                "unavailable room has actionable retry",
                "unavailable" in unavailable.lower() or "answer" in unavailable.lower(),
                unavailable,
            )
            host.evaluate("net.leave()")
            guest.wait_for_function("net.ended")
            check("host departure stops guest", not guest.evaluate("net.canPlay"))
            check("no browser runtime errors", not errors, "; ".join(errors))
            context.close()
            browser.close()
            browser = None
    except Exception as exc:  # noqa: BLE001 - test runner persists failures
        check("real standalone transport path", False, str(exc))
    finally:
        if browser:
            browser.close()
        server.shutdown()
        server.server_close()
    RESULT.write_text(
        json.dumps(
            {
                "checks": checks,
                "errors": errors,
                "boundary": "Two Chromium pages on one WSL2 machine, real secure PeerJS Cloud signaling and WebRTC. Cross-network NAT traversal is unverified.",
            },
            indent=2,
        )
    )
    for result in checks:
        if not result["pass"]:
            print("FAIL:", result["name"], result["detail"])
    failures = sum(not result["pass"] for result in checks)
    print(
        json.dumps(
            {"checks": checks, "failures": [r["name"] for r in checks if not r["pass"]]}
        )
    )
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(run())
