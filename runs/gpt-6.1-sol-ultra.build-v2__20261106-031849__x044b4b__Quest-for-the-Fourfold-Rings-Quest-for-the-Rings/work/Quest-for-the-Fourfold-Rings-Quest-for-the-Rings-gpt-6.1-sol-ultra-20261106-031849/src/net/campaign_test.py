"""A normal whole campaign over AI Hub, hosted by a copy with no player seat."""

from __future__ import annotations

import argparse
import functools
import hashlib
import http.server
import json
import os
import threading
import time
from pathlib import Path
from urllib.parse import urlencode

from harness_test import DEV, WORK, QuietHandler
from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

PILOT = """() => {
 const windows=[...document.querySelectorAll('iframe')].map(f=>f.contentWindow);
 const server=windows.find(w=>w.AIHub.server);
 const clients=windows.filter(w=>!w.AIHub.server).sort((a,b)=>a.AIHub.me-b.AIHub.me);
 const pilot={done:false,error:null,actions:[],routes:[],rooms:[],events:[],samples:[],seen:new Set(),
    started:performance.now(),lastIntent:-Infinity,lastSample:-Infinity,retries:0,lastEpoch:-1,lastState:null};
 window.__campaignPilot=pilot;
 const neutral=()=>({mx:0,my:0,ax:1,ay:0,primary:false,power:false,dodge:false,interact:false,ping:false});
 function capture(w){return {mode:w.mode,roomId:w.roomId,epoch:w.epoch,time:w.time,roomTime:w.roomTime,
   rings:w.rings.slice(),dread:w.dread,bound:w.bound,finalBeat:w.finalBeat,assisted:w.assisted,invulnerable:w.invulnerable,
   humans:w.heroes.map(h=>!h.ai),tuning:{...w.tuning},stations:w.stations.map(s=>({index:s.index,active:s.active,progress:s.progress})),
   heroes:w.heroes.map(h=>({id:h.id,x:h.x,y:h.y,hp:h.hp,down:h.down,ai:h.ai,state:h.aiState})),
   ring:w.ring?{x:w.ring.x,y:w.ring.y,carrier:w.ring.carrier,secured:w.ring.secured}:null,
   stats:{...w.stats},exit:{...server.RingContent.rooms[w.roomId].exit}};}
 function command(seat,cmd){
   if(!clients[seat].__ring.testCommand(seat,cmd))throw new Error('client ordinary command rejected for own seat '+seat);
   pilot.actions.push({at:Math.round((performance.now()-pilot.started)/10)/100,seat,epoch:server.__ring.world.epoch,command:cmd});
 }
 function stop(error){if(error)pilot.error=error;clearInterval(pilot.timer);for(let seat=0;seat<2;seat++)command(seat,neutral());pilot.done=true;}
 function tick(){try {
   const w=server.__ring.world,now=performance.now();
   for(const e of w.events){const key=String(e.id);if(!pilot.seen.has(key)){pilot.seen.add(key);pilot.events.push({...e,epoch:w.epoch});}}
   if(w.epoch!==pilot.lastEpoch){pilot.lastEpoch=w.epoch;pilot.rooms.push({room:w.roomId,mode:w.mode,epoch:w.epoch,time:w.time,rings:w.rings.slice()});}
   if(now-pilot.lastSample>1000){pilot.lastSample=now;pilot.samples.push(capture(w));}
   pilot.lastState=capture(w);
   if(w.assisted||w.invulnerable){stop('campaign became assisted');return;}
   if(w.heroes.some(h=>h.ai)){stop('a remote human seat unexpectedly transferred to AI');return;}
   if(w.mode==='victory'){pilot.final=capture(w);pilot.defaults=server.RingContent.defaults();stop();return;}
   if(server.__ring.net.ended){stop('session ended before an authoritative victory');return;}
   if(w.mode==='board'){
      for(let seat=0;seat<2;seat++)command(seat,neutral());
      if(now-pilot.lastIntent>500){
        const route=['dungeon','crystal','inferno','shifting'].find((r,i)=>!w.rings[i])||'final';
        const accepted=clients[0].__ring.inputIntent({type:'route',value:route});
        if(accepted!==false){pilot.routes.push({route,rings:w.rings.slice(),dread:w.dread,time:w.time});pilot.lastIntent=now;}
      }
      return;
   }
   if(w.mode==='failed'){
      for(let seat=0;seat<2;seat++)command(seat,neutral());
      if(now-pilot.lastIntent>800){
        if(++pilot.retries>12){stop('campaign exceeded twelve normal retries');return;}
        clients[0].__ring.inputIntent({type:'retry'});pilot.lastIntent=now;
      }
      return;
   }
   for(let seat=0;seat<2;seat++){
      const h=w.heroes[seat];
      let cmd=h.down?neutral():server.RingSim.companion(w,h,1/120,true);
      // This is an ordinary partial-stick input, not a speed/tuning change.
      // Smaller steps keep the native waypoint policy stable over 10Hz transport.
      cmd={...cmd,mx:cmd.mx*.72,my:cmd.my*.72};
      command(seat,cmd);
   }
 }catch(e){stop(String(e.stack||e));}}
 pilot.timer=setInterval(tick,50);tick();
}"""


def run(game: Path, evidence: Path) -> dict:
    result = {
        "game": game.name,
        "sha256": hashlib.sha256(game.read_bytes()).hexdigest(),
        "mode": "actual AI Hub shared-world; two remote browser players plus server-only authority",
        "input": "ordinary persistent client testCommand inputs and validated route/retry intentions; native companion policy chooses inputs; no dev/objective/health/tuning/advance mutations",
        "policyNote": "The native companion action chooser updates observational aiState and navigation runtime caches. Both authoritative hero ai flags stay false, so normal human rules and no companion relocation apply.",
        "passed": 0,
        "failed": 0,
        "failures": [],
        "checks": [],
    }
    handler = functools.partial(QuietHandler, directory=str(WORK))
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    started = time.monotonic()
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            try:
                page = browser.new_page(viewport={"width": 1280, "height": 800})
                errors: list[str] = []
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.add_init_script("""window.__campaignFinishes=[];
                    addEventListener('message',e=>{if(e.data?.aihub===1&&e.data?.type==='finish'){
                      let server=false,id=null;try{server=e.source.AIHub.server===true;id=e.source.AIHub.me;}catch{}
                      window.__campaignFinishes.push({server,id,outcome:JSON.parse(JSON.stringify(e.data))});
                    }});""")
                harness = DEV / "vendor/hub/harness.html"
                query = urlencode(
                    {
                        "game": os.path.relpath(game, harness.parent),
                        "players": "2",
                        "scenario": "server",
                        "latency": "30",
                        "jitter": "10",
                        "loss": "0",
                        "seed": "4169",
                        "limit": "900",
                    }
                )
                page.goto(
                    f"http://127.0.0.1:{httpd.server_address[1]}/{harness.relative_to(WORK).as_posix()}?{query}",
                    wait_until="domcontentloaded",
                )
                page.wait_for_function(
                    """() => [...document.querySelectorAll('iframe')].length===3 &&
                    [...document.querySelectorAll('iframe')].every(f=>f.contentWindow.__ring?.net)""",
                    timeout=45000,
                )
                page.locator("#release").click()
                page.wait_for_function(
                    """() => [...document.querySelectorAll('iframe')].every(f=>f.contentWindow.__ring.net.playing)""",
                    timeout=20000,
                )
                page.evaluate(PILOT)
                try:
                    page.wait_for_function(
                        "window.__campaignPilot.done", timeout=540000
                    )
                except PlaywrightError as timeout_error:
                    result["failures"].append(str(timeout_error))
                pilot = page.evaluate("""() => {
                  const p=window.__campaignPilot;clearInterval(p.timer);
                  return {done:p.done,error:p.error,actions:p.actions,routes:p.routes,rooms:p.rooms,events:p.events,
                    samples:p.samples,lastState:p.lastState,final:p.final,defaults:p.defaults,retries:p.retries};
                }""")
                result["pilot"] = pilot
                if pilot.get("error"):
                    result["failures"].append(pilot["error"])
                if pilot.get("final"):
                    page.wait_for_function(
                        "window.__campaignFinishes.length>0", timeout=10000
                    )
                    page.wait_for_function(
                        "document.querySelector('#round').textContent.includes('Ended played')",
                        timeout=10000,
                    )
                if pilot.get("final"):
                    page.wait_for_function(
                        """() => [...document.querySelectorAll('iframe')]
                      .filter(f=>!f.contentWindow.AIHub.server).every(f=>{
                        const w=f.contentWindow.__ring.world;
                        return w.mode==='victory'&&w.rings.every(Boolean)&&w.bound===4;
                      })""",
                        timeout=10000,
                    )
                clients_final = page.evaluate("""() => [...document.querySelectorAll('iframe')]
                    .filter(f=>!f.contentWindow.AIHub.server).map(f=>{
                      const w=f.contentWindow.__ring.world;
                      return {id:f.contentWindow.AIHub.me,mode:w.mode,rings:w.rings,bound:w.bound,epoch:w.epoch};
                    })""")
                result["clientsFinal"] = clients_final
                finishes = page.evaluate("window.__campaignFinishes")
                result["finishes"] = finishes
                result["errors"] = errors
                final = pilot.get("final") or {}
                events = pilot.get("events", [])

                def check(name, passed, detail=None):
                    result["checks"].append(
                        {"name": name, "pass": bool(passed), "detail": detail}
                    )

                check(
                    "server-only world reaches victory through ordinary client inputs",
                    final.get("mode") == "victory",
                )
                check(
                    "four campaign rings are secured", final.get("rings") == [True] * 4
                )
                secured = [e for e in events if e["type"] == "ring-secured"]
                check(
                    "each recovered ring is secured exactly once",
                    len(secured) == 4
                    and sorted(e["index"] for e in secured) == [0, 1, 2, 3],
                    secured,
                )
                core = {
                    family + str(i)
                    for family in ["dungeon", "crystal", "inferno", "shifting"]
                    for i in [1, 2]
                }
                visited = {room["room"] for room in pilot.get("rooms", [])}
                check(
                    "all eight core rooms and the final site were played",
                    core | {"final"} <= visited,
                    sorted(visited),
                )
                bound = [e for e in events if e["type"] == "seal-bound"]
                check(
                    "four stations bind exactly once",
                    len(bound) == 4
                    and sorted(e["index"] for e in bound) == [0, 1, 2, 3],
                    bound,
                )
                check(
                    "dragon is contained by seals rather than killed",
                    len([e for e in events if e["type"] == "dragon-bound"]) == 1
                    and final.get("bound") == 4,
                )
                check(
                    "both remote human seats remain human controlled",
                    final.get("humans") == [True, True],
                )
                check(
                    "default tuning and ordinary resources are retained",
                    final.get("tuning") == pilot.get("defaults")
                    and not final.get("assisted", True)
                    and not final.get("invulnerable", True),
                )
                heroes = final.get("heroes", [])
                exit_point = final.get("exit", {"x": -9999, "y": -9999})
                check(
                    "both heroes complete the final shared escape",
                    len(heroes) == 2
                    and all(
                        (
                            (h["x"] - exit_point["x"]) ** 2
                            + (h["y"] - exit_point["y"]) ** 2
                        )
                        ** 0.5
                        <= 38
                        for h in heroes
                    ),
                    heroes,
                )
                check(
                    "only the server reports one completed cooperative victory",
                    len(finishes) == 1
                    and finishes[0]["server"]
                    and finishes[0]["outcome"].get("won") is True
                    and finishes[0]["outcome"].get("standings") == [[0, 1]],
                    finishes,
                )
                check(
                    "both remote clients receive the terminal winning world",
                    len(clients_final) == 2
                    and all(
                        client["mode"] == "victory"
                        and client["rings"] == [True] * 4
                        and client["bound"] == 4
                        for client in clients_final
                    ),
                    clients_final,
                )
                check(
                    "no page errors or debug events",
                    not errors and not any(e["type"] == "debug" for e in events),
                    errors,
                )
                if not final:
                    result["failures"].append("No authoritative victory was reached")
            finally:
                browser.close()
    except (PlaywrightError, OSError, AssertionError, ValueError) as error:
        result["failures"].append(str(error))
    finally:
        httpd.shutdown()
        httpd.server_close()
        thread.join(timeout=2)
    result["seconds"] = round(time.monotonic() - started, 2)
    result["passed"] = sum(check["pass"] for check in result["checks"])
    result["failed"] = len(result["failures"]) + sum(
        not check["pass"] for check in result["checks"]
    )
    evidence.parent.mkdir(parents=True, exist_ok=True)
    evidence.write_text(json.dumps(result, indent=2), encoding="utf-8")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--game", type=Path, default=WORK / (DEV.name + ".html"))
    parser.add_argument(
        "--evidence", type=Path, default=DEV / "evidence/hub-campaign.json"
    )
    args = parser.parse_args()
    output = run(args.game.resolve(), args.evidence.resolve())
    for failure in output["failures"]:
        print("FAIL " + failure)
    for failure in [check for check in output["checks"] if not check["pass"]]:
        print("FAIL " + failure["name"])
    print(f"{output['passed']} passed, {output['failed']} failed")
    raise SystemExit(1 if output["failed"] else 0)
