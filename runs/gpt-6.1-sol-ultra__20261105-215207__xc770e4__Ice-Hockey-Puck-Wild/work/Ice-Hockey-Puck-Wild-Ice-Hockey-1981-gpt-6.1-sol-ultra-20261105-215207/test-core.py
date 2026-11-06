"""Core game tests. Run with the installed Playwright Python interpreter."""
from pathlib import Path
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args): pass

def check_core():
    root = Path(__file__).resolve().parent
    server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=str(root)))
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    failures = []
    count = 0
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True)
            page = browser.new_page(ignore_https_errors=True)
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(f"http://127.0.0.1:{server.server_port}/core-harness.html")
            if page.title() != "Puck Wild core verification":
                raise AssertionError("wrong verification page")
            page.wait_for_function("!!window.core", timeout=60000)
            result = page.evaluate(SUITE)
            count, failures = result["count"], result["failures"]
            if errors: failures.extend("browser: " + e for e in errors)
            browser.close()
    except Exception as exc:
        failures.append("core harness: " + str(exc))
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
    return count, failures

SUITE = r"""async () => {
 const {HockeyGame,DEFAULTS}=window.core;
 const failures=[];let count=0;
 const assert=(condition,message)=>{if(!condition)throw new Error(message)};
 const step=(g,n=1,inputs=[{},{}])=>{for(let i=0;i<n;i++)g.update(1/60,inputs)};
 const place=(p,x,z,angle=0)=>{p.x=x;p.z=z;p.angle=angle;p.vx=0;p.vz=0;p.body.setTranslation({x,y:.9,z},true);p.body.setLinvel({x:0,y:0,z:0},true)};
 const quiet=(g)=>{g.config.ai=0;for(const p of g.players)p.aiTimer=1000;g.remote=true;};
 const create=async(mode='solo')=>{const g=await HockeyGame.create();g.start(mode);quiet(g);step(g,140);return g;};
 const test=async(name,fn)=>{count++;let g;try{g=await create();await fn(g);}catch(e){failures.push(name+': '+e.message)}finally{g?.world.free()}};
 await test('Rapier runtime and faceoff',g=>{assert(g.world.bodies.len()===7,'expected six skaters/goalies and puck');assert(g.phase==='play','faceoff did not enter live play');assert(g.period===1&&g.time<DEFAULTS.period,'period clock not running');});
 await test('movement inertia and turning',g=>{const p=g.players[0];place(p,-10,-8);g.setPuck(15,9);step(g,40,[{x:1,z:0},{}]);assert(p.x>-7,'skater did not accelerate');assert(p.vx>8,'top speed not reached');const vx=p.vx;step(g,1);assert(p.vx>0&&p.vx<vx,'release should retain momentum and slow');step(g,80);assert(Math.abs(p.vx)<.5,'skater should coast to a stop');});
 await test('boost drains and replenishes stamina',g=>{const p=g.players[0];place(p,-15,-8);g.setPuck(15,9);step(g,30,[{x:1,boost:true},{}]);assert(p.stamina<.85,'boost failed to drain stamina');assert(p.vx>10,'boost speed was not greater');const stamina=p.stamina;step(g,30);assert(p.stamina>stamina,'stamina failed to recover');});
 await test('switch changes the controlled teammate',g=>{assert(g.control[0]===0,'bad initial control');g.action(0,'switch');assert(g.control[0]===1,'switch did not select teammate');g.action(0,'switch');assert(g.control[0]===0,'second switch did not return');});
 await test('passing and teammate reception',g=>{place(g.players[0],-12,-7);place(g.players[1],-5,-7);g.control[0]=0;g.givePuck(0);g.action(0,'pass');assert(g.owner===null,'pass did not release puck');assert(g.control[0]===1,'pass did not switch control');assert(g.stats.passes[0]===1&&g.heat[0]>.3,'pass stats/heat not recorded');step(g,30);assert(g.owner===1,'teammate did not receive pass');});
 await test('charged shot releases on button lift',g=>{place(g.players[0],-10,-8);g.control[0]=0;g.givePuck(0);step(g,40,[{shoot:true,aim:{x:1,z:0}},{}]);assert(g.players[0].charge>.6,'holding shot did not charge');step(g,1,[{aim:{x:1,z:0}},{}]);assert(g.owner===null&&g.stats.shots[0]===1,'button release did not shoot');assert(g.puckBody.linvel().x>30,'charged shot too slow');});
 await test('wild-shot heat is consumed',g=>{place(g.players[0],-10,-8);g.control[0]=0;g.givePuck(0);g.heat[0]=1;g.players[0].charge=1;g.action(0,'shoot',{x:1,z:0});assert(g.heat[0]===0&&g.shotPower===2,'wild shot not activated');assert(g.puckBody.linvel().x>45,'wild shot lacks power');});
 await test('checking stuns and knocks puck free',g=>{place(g.players[0],-10,-7);place(g.players[2],-8,-7,Math.PI);g.control[0]=0;g.givePuck(2);g.action(0,'check');assert(g.players[2].stun>.5,'rival not stunned');assert(g.owner===null,'check did not release rival puck');assert(g.stats.checks[0]===1,'check not recorded');assert(g.players[2].body.linvel().x>8,'check did not apply impulse');});
 await test('puck rebounds from boards',g=>{g.owner=null;g.pickupLock=2;g.setPuck(0,12,0,20);step(g,15);assert(g.puckBody.linvel().z<0,'puck did not bounce off boards');assert(g.puck.z<14.2,'puck escaped boards');});
 await test('mouth goal and non-goal outside posts',g=>{g.owner=null;g.pickupLock=1;g.setPuck(24.6,5,0,0);step(g,1);assert(g.scores[0]===0,'outside-post shot incorrectly scored');g.setPuck(24.6,1.4,0,0);step(g,1);assert(g.scores[0]===1&&g.phase==='goal','legal puck did not score');step(g,190);assert(g.phase==='play'&&Math.abs(g.puck.x)<1,'goal did not reset faceoff');});
 await test('goalie saves incoming puck',g=>{g.owner=null;g.pickupLock=0;place(g.players[5],22.5,0,Math.PI);g.setPuck(20.8,0,22,0);step(g,5);assert(g.stats.saves[1]>0,'goalie did not save close shot');assert(g.scores[0]===0,'saved shot incorrectly scored');assert(g.puckBody.linvel().x<0,'goalie did not clear rebound');});
 await test('three periods reach a final result',g=>{g.config.period=.08;g.time=.08;g.scores=[2,1];step(g,600);assert(g.phase==='result','full match did not finish');assert(g.period===3&&g.winner===0,'wrong final period/winner');assert(g.events.some(e=>e.type==='finish'),'no match result event');});
 await test('tie enters sudden death and winning goal finishes',g=>{g.config.period=.08;g.time=.08;g.scores=[1,1];step(g,570);assert(g.period===4&&g.phase==='overtime','tied game did not enter overtime');g.goal(1);step(g,190);assert(g.phase==='result'&&g.winner===1,'sudden death goal did not finish match');});
 await test('skills club complete playthrough',async g=>{g.start('practice');quiet(g);step(g,140);assert(g.owner===0,'practice should start with a puck');place(g.players[0],-17,-8);g.givePuck(0);step(g,145,[{x:1},{}]);assert(g.drill.step===1,'skating drill did not complete');place(g.players[0],-12,-7);place(g.players[1],-5,-7);g.control[0]=0;g.givePuck(0);g.action(0,'pass');assert(g.drill.step===2,'passing drill did not complete');step(g,30);assert(g.owner===1,'practice pass did not catch');step(g,35,[{shoot:true,aim:{x:1,z:0}},{}]);step(g,1,[{aim:{x:1,z:0}},{}]);assert(g.drill.step===3,'charged-shot drill did not complete');const id=g.control[0];place(g.players[id],-10,-8);place(g.players[2],-8,-8);g.players[id].cd=0;g.action(0,'check');assert(g.drill.step===4,'check drill did not complete');g.owner=null;g.pickupLock=1;g.setPuck(24.6,1,0,0);step(g,1);assert(g.drill.done&&g.phase==='result'&&g.winner===0,'final skills goal did not complete session');});
 await test('opponent actions cannot complete player skills',g=>{g.start('practice');quiet(g);step(g,140);place(g.players[2],-7,5,Math.PI);place(g.players[3],-13,5,Math.PI);g.control[1]=2;g.drill.step=1;g.givePuck(2);g.action(1,'pass');assert(g.stats.passes[1]===1&&g.drill.step===1,'opponent pass advanced player drill');g.drill.step=2;g.control[1]=2;g.givePuck(2);g.players[2].charge=1;g.action(1,'shoot',{x:-1,z:0});assert(g.stats.shots[1]===1&&g.drill.step===2,'opponent charged shot advanced player drill');g.drill.step=3;place(g.players[0],-9,5);g.players[2].cd=0;g.givePuck(0);g.action(1,'check');assert(g.stats.checks[1]>=1&&g.players[0].stun>0,'opponent check did not physically land');assert(g.drill.step===3,'opponent check advanced player drill');g.drill.step=4;g.goal(1);assert(g.scores[1]===1&&g.drill.step===4&&!g.drill.done&&g.phase==='goal','opponent goal completed player session');});
 await test('attract AI releases a genuine Wild Shot',g=>{g.start('attract');quiet(g);assert(g.heat[0]===1&&g.heat[1]===1,'attract did not prime both teams');step(g,140);const p=g.players[0];place(p,10,-5);g.givePuck(0);p.aiTimer=0;g.ai(p,1/60);assert(g.owner===null&&g.stats.shots[0]===1,'attract AI did not shoot');assert(g.heat[0]===0&&g.heat[1]===1&&g.shotPower===2,'attract shot did not consume own heat and activate power');assert(Math.hypot(g.puckBody.linvel().x,g.puckBody.linvel().z)>g.config.shot*.88*1.3,'attract Wild Shot missing speed multiplier');assert(g.banner==='WILD SHOT!'&&g.effects.some(e=>e.type==='super'),'attract shot missing presentation');});
 return {count,failures};
}"""

if __name__ == "__main__":
    total, failures = check_core()
    for failure in failures: print("FAIL " + failure)
    print(f"{total - len(failures)}/{total} core checks passed")
    raise SystemExit(bool(failures))
