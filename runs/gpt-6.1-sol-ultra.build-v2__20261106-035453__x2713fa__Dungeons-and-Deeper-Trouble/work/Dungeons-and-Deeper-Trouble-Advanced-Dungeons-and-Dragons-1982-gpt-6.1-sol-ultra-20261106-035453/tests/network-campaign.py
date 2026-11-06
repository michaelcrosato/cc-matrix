"""Actual delivered campaign, real WebRTC, production command director; no world mutations."""

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
LEAVE = "--guest-leave" in sys.argv
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
    except (AssertionError, PlaywrightError, ValueError, TypeError, KeyError) as exc:
        checks.append({"name": name, "pass": False, "detail": str(exc)})
        return False


INSTALL_DIRECTOR = """() => {
 const app=__DT.app, game=__DT.game;
 const test=window.__networkTest={events:[],commands:0,finishedCalls:0,checkpointFrames:[],lastTool:'',lastRelic:0};
 const event=app.sim.event.bind(app.sim);
 app.sim.event=(type,data={})=>{if(['fire','enemy-hit','pickup','tool','bank-lesson','cave-enter','victory','defeat'].includes(type))test.events.push({type,...data});return event(type,data);};
 let captured=null;
 const facade=new Proxy({}, {get(_target,key){if(key==='submit')return(id,cmd)=>{captured=cmd;}; const value=app.sim[key];return typeof value==='function'?value.bind(app.sim):value;}});
 test.director=new DTDirector.ExpeditionDirector(facade,app.localId);
 app.inputs.sample=(_input,id)=>{
   captured=null;
   if(app.net.authority)test.director.update(1/120);
   else {
     const sim=app.sim,s=sim.state,p=s.players.find(p=>p.id===app.localId),leader=s.players.find(p=>p.id!==app.localId);
     const cmd=test.director.input();
     if(s.phase==='victory'){test.director.done=true;return cmd;}
     if(s.phase==='defeat'){test.director.errors.push('Expedition defeated');return cmd;}
     if(s.phase==='cave'&&p&&!p.down&&leader&&!s.transition){
       if(test.director.cave!==s.cave){test.director.cave=s.cave;test.director.progress.push(s.cave);}
       const gap=Math.hypot(leader.x-p.x,leader.y-p.y);
       if(gap>28){
         // Smooth only through radius-clear segments. A near grid corner must
         // not be skipped by a chord that clips a wall or diagonal bank.
         let next=null;
         if(sim.moveClear(p,leader,5))next=leader;
         else for(const point of sim.path(p,leader)){
           if(!sim.moveClear(p,point,5))break;
           next=point;
         }
         if(next){const dx=next.x-p.x,dy=next.y-p.y,n=Math.hypot(dx,dy)||1;cmd.mx=dx/n;cmd.my=dy/n;cmd.sprint=true;}
       }
       const threat=s.enemies.filter(e=>e.hp>0&&e.kind!=='ooze'&&e.kind!=='target'&&sim.isVisible(e.x,e.y)&&Math.hypot(e.x-p.x,e.y-p.y)<135).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];
       if(threat){
         const dx=threat.x-p.x,dy=threat.y-p.y,n=Math.hypot(dx,dy)||1;cmd.ax=dx/n;cmd.ay=dy/n;
         const armor=threat.kind==='guardian1'&&(-cmd.ax*Math.cos(threat.aim)-cmd.ay*Math.sin(threat.aim))>.35;
         const shield=threat.kind==='guardian2'&&(threat.state!=='recover'||threat.woundedCycle);
         if(!armor&&!shield&&p.bow==='idle'&&sim.lineClear(p.x,p.y,threat.x,threat.y))cmd.actions.push(test.director.command('fire'));
         if((threat.state==='windup'||threat.state==='attack')&&n<80&&p.dashCooldown<=0){
           const angle=threat.attackDir+Math.PI/2;cmd.mx=Math.cos(angle);cmd.my=Math.sin(angle);cmd.actions.push(test.director.command('dash'));
         }
       }
       const pickup=s.pickups.find(q=>q.count>0&&Math.hypot(q.x-p.x,q.y-p.y)<27);
       if(pickup&&Math.floor(s.time*4)!==test.lastInteract){cmd.actions.push(test.director.command('interact'));test.lastInteract=Math.floor(s.time*4);}
       if(leader.down&&gap<30)cmd.heldInteract=true;
     }
     captured=cmd;
   }
   test.commands++;return captured;
 };
 const finish=app.net.finish.bind(app.net);
 app.net.finish=(...args)=>{if(!app.net.link?.finished)test.finishedCalls++;return finish(...args);};
 game.stop();
 test.timer=setInterval(()=>{game.advance(.05); const s=app.sim.state; const tools=JSON.stringify(s.tools); if(tools!==test.lastTool||s.relics.length!==test.lastRelic){test.checkpointFrames.push({time:s.time,tools:s.tools,relics:s.relics,phase:s.phase});test.lastTool=tools;test.lastRelic=s.relics.length;}},20);
}"""

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    contexts = []
    errors = []
    states = {}
    try:
        pages = []
        for seat in [0, 1]:
            context = browser.new_context(viewport={"width": 960, "height": 540})
            contexts.append(context)
            page = context.new_page()
            pages.append(page)
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(ARTIFACT.as_uri())
            page.wait_for_function(
                "document.body.dataset.game==='dungeons-and-deeper-trouble' && document.body.dataset.ready==='true'"
            )
            page.evaluate(
                "localStorage.setItem('network-test-sentinel','solo-'+Math.random())"
            )
        host, guest = pages
        guest_save = guest.evaluate(
            "localStorage.getItem('deeper-trouble:campaign:1:a')"
        )

        def pair():
            for page in pages:
                page.evaluate(
                    "() => {const a=__DT.app;a.pairing=true;a.peer=DTNet.createPeer(a.networkHooks(),{iceServers:[]});}"
                )
            offer = host.evaluate("__DT.app.peer.offer()")
            answer = guest.evaluate("(offer)=>__DT.app.peer.answer(offer)", offer)
            host.evaluate("(answer)=>__DT.app.peer.accept(answer)", answer)
            for page in pages:
                page.wait_for_function(
                    "__DT.app.peer.link?.bootstrapped===true", timeout=15000
                )
            require(
                host.evaluate("__DT.app.net.authority") is True, "host not authority"
            )
            require(
                guest.evaluate("__DT.app.net.authority") is False,
                "guest became authority",
            )

        paired = check(
            "actual delivered file pairs two contexts through production WebRTC", pair
        )
        if paired:

            def first_shot():
                host.evaluate("__DT.app.travel('chalk')")
                for page in pages:
                    page.wait_for_function("__DT.state.cave==='chalk'", timeout=10000)
                guest.evaluate(
                    "__DT.app.send({mx:0,my:0,ax:0,ay:-1,actions:[{type:'fire'}]});__DT.app.send({mx:0,my:0,actions:[]})"
                )
                host.wait_for_function("__DT.state.stats.shots===1", timeout=6000)
                guest.wait_for_function(
                    "__DT.state.stats.shots===1 && __DT.state.quiver===2", timeout=6000
                )
                guest.wait_for_timeout(400)
                require(
                    host.evaluate("__DT.state.stats.shots") == 1,
                    "short pulse fired more than once",
                )

            check(
                "remote sub-interval fire uses one real shaft exactly once", first_shot
            )
            for page in pages:
                page.evaluate(INSTALL_DIRECTOR)
            start = time.monotonic()
            last_progress = 0
            guest_left = False
            while time.monotonic() - start < 110:
                phase = host.evaluate("__DT.state.phase")
                if LEAVE and not guest_left and host.evaluate("__DT.state.tools.axe"):
                    guest.wait_for_function("__DT.state.tools.axe===true")
                    guest.evaluate(
                        "clearInterval(__networkTest.timer);__DT.app.peer.cancel()"
                    )
                    host.wait_for_function("__DT.state.players.length===1")
                    check(
                        "actual guest removal leaves authority able to continue",
                        lambda: require(
                            host.evaluate("__DT.app.net.canStep()"),
                            "authority stopped after guest removal",
                        ),
                    )
                    guest_left = True
                if phase in ["victory", "defeat"]:
                    break
                time.sleep(0.3)
            for page in pages:
                page.evaluate("clearInterval(__networkTest.timer)")
            # Pump only transport after stopping clocks, so the final state becomes comparable.
            host.evaluate("window.__pump=setInterval(()=>__DT.app.net.update(),20)")
            guest.evaluate("window.__pump=setInterval(()=>__DT.app.net.update(),20)")
            guest.wait_for_timeout(700)
            for label, page in [("host", host), ("guest", guest)]:
                states[label] = page.evaluate(
                    "({state:__DT.snapshot(),network:__DT.app.net.inspect(),events:__networkTest.events,director:{done:__networkTest.director.done,errors:__networkTest.director.errors,progress:__networkTest.director.progress},finishedCalls:__networkTest.finishedCalls,commands:__networkTest.commands})"
                )

            def full_clear():
                s = states["host"]["state"]
                require(
                    s["phase"] == "victory",
                    "campaign did not win: "
                    + json.dumps(
                        {
                            "phase": s["phase"],
                            "cave": s["cave"],
                            "players": s["players"],
                            "director": states["host"]["director"],
                        }
                    ),
                )
                require(not s["stats"]["assisted"], "online director used assistance")
                if LEAVE:
                    require(
                        guest_left and len(s["players"]) == 1,
                        "guest departure did not produce a solo finish",
                    )
                require(
                    len(s["relics"]) == 2 and all(s["tools"].values()),
                    "missing tool or relic",
                )

            check(
                "standard-rules expedition finishes solo after guest departure"
                if LEAVE
                else "standard-rules two-ranger expedition reaches shared victory",
                full_clear,
            )

            def agreement():
                a, b = states["host"]["state"], states["guest"]["state"]
                require(
                    a["tools"] == b["tools"] and a["relics"] == b["relics"],
                    "progression disagrees",
                )
                require(a["quiver"] == b["quiver"], "shared quiver disagrees")
                require(
                    [(e["id"], e["hp"]) for e in a["enemies"]]
                    == [(e["id"], e["hp"]) for e in b["enemies"]],
                    "enemy wounds disagree",
                )

            if not LEAVE:
                check(
                    "production tools, relics, quiver and wounds agree on both copies",
                    agreement,
                )

            def unique_hits():
                events = states["host"]["events"]
                hits = [e["arrow"] for e in events if e["type"] == "enemy-hit"]
                require(bool(hits), "no enemy was hit")
                require(
                    len(set(hits)) == len(hits),
                    "one real projectile applied repeated wounds",
                )
                require(
                    states["host"]["state"]["stats"]["hits"] == len(hits),
                    "hit statistics differ from actual hit events",
                )

            check(
                "every projectile applies at most one wound across real peers",
                unique_hits,
            )

            def supply_once():
                events = [
                    e
                    for e in states["host"]["events"]
                    if e["type"] == "pickup"
                    and e.get("idPickup") == "chalk-rest-quiver"
                ]
                require(
                    sum(e.get("count", 0) for e in events) == 7,
                    "shared first cache was duplicated or lost",
                )

            check(
                "contested authored supply credits exactly its seven shafts",
                supply_once,
            )
            check(
                "guest campaign save stays separate",
                lambda: require(
                    guest.evaluate(
                        "localStorage.getItem('deeper-trouble:campaign:1:a')"
                    )
                    == guest_save,
                    "guest overwrote solo campaign",
                ),
            )
            check(
                "authority resolves shared victory only once",
                lambda: require(
                    states["host"]["finishedCalls"] == 1,
                    "finish call count " + str(states["host"]["finishedCalls"]),
                ),
            )
            for page in pages:
                page.evaluate("clearInterval(window.__pump)")
        check(
            "no engine or browser errors",
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
                    page.evaluate(
                        "clearInterval(window.__pump);if(window.__networkTest)clearInterval(__networkTest.timer);window.__DT?.stop()"
                    )
            except PlaywrightError:
                pass
            context.close()
        browser.close()
(
    ROOT
    / "reports"
    / ("network-campaign-guest-leave.json" if LEAVE else "network-campaign.json")
).write_text(
    json.dumps(
        {
            "artifact": ARTIFACT.name,
            "sha256": ARTIFACT_HASH,
            "checks": checks,
            "copies": states,
        },
        indent=2,
    )
)
failed = sum(not c["pass"] for c in checks)
for c in checks:
    if not c["pass"]:
        print(c["name"] + ": " + c.get("detail", ""), file=sys.stderr)
print(f"Network campaign: {len(checks) - failed} passed, {failed} failed.")
sys.exit(bool(failed))
