import contextlib
import functools
import http.server
import json
import pathlib
import threading
import traceback

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
ART = ROOT / "artifacts"
ART.mkdir(exist_ok=True)
results = []


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


@contextlib.contextmanager
def server():
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{httpd.server_port}"
    finally:
        httpd.shutdown()
        httpd.server_close()
        thread.join()


def check(name, fn):
    try:
        detail = fn()
        results.append({"test": name, "pass": True, "detail": detail})
    except Exception as exc:  # noqa: BLE001 - report each independent verification failure
        msg = str(exc)
        results.append(
            {"test": name, "pass": False, "error": msg, "trace": traceback.format_exc()}
        )
        print(f"FAIL {name}: {msg}", flush=True)


def ready(page):
    page.wait_for_function(
        'window.__below?.ready === true || !!document.querySelector(".fatal-detail") || window.__testFatal',
        timeout=60000,
    )
    assert not page.evaluate("window.__testFatal || null"), page.evaluate(
        "window.__testFatal || null"
    )
    fatal = page.locator(".fatal-detail")
    assert fatal.count() == 0, fatal.inner_text() if fatal.count() else ""
    assert page.title() == "The Great Below-About"


FULL_ROUTE = r"""() => {
 const api=window.__below,g=api.game;api.test.manual(true);api.test.start();g.invincible=true;
 const points=[];let frames=0,jumpUntil=0;
 const tick=(i={})=>{g.tick(1/60,i);frames++;if(frames>20000)throw Error('Route exceeded frame budget');};
 const pos=()=>g.position;
 const walk=(target,max=2000,jumpGaps=true)=>{
  let reached=false;
  for(let n=0;n<max;n++){
   const p=pos(),dx=target-p.x;if(Math.abs(dx)<.16&&Math.abs(g.body.linvel().x)<1.1){reached=true;break;}
   let x=Math.abs(dx)<.12?0:Math.sign(dx)*Math.min(1,Math.abs(dx)*2.8);
   let should=false;
   if(jumpGaps&&g.grounded&&Math.abs(dx)>1.5){
    const floors=[[-12,16,0],[22,32,0],[36,62,0],[-12,32,-12],[36,52,-12],[56,66,-12],[-12,-6,-26],[-2,5,-26],[42,52,-26],[56,66,-26],[-12,18,-40],[23,48,-40],[53,96,-40],[66,70,4],[80,96,4]];
    const f=floors.find(([a,b,y])=>p.x>a-.1&&p.x<b+.1&&Math.abs(p.y-.75-y)<.35);
    if(f){const edge=x>0?f[1]:f[0];if(Math.abs(p.x-edge)<1.25&&Math.abs(target-edge)>1.4)should=true;}
   }
   if(g.mode==='swim'&&((x<0&&p.x<8)||(x>0&&p.x>39)))should=true;
   if(should&&frames>=jumpUntil)jumpUntil=frames+27;
   tick({x,jump:frames<jumpUntil});
  }
  if(!reached)throw Error('Walk to '+target+' failed at '+JSON.stringify(api.snapshot()));
 };
 const climb=(x,y)=>{
  walk(x,1200,false);
  for(let n=0;n<1500;n++){const p=pos();if(Math.abs(p.y-y)<.12)break;tick({x:Math.abs(p.x-x)>.2?Math.sign(x-p.x)*.25:0,y:Math.sign(y-p.y)});if(n===1499)throw Error('Climb to '+y+' failed: '+JSON.stringify(api.snapshot()));}
  points.push({feature:'ladder',x:pos().x,y:pos().y});
 };
 walk(30);points.push({feature:'first gap',x:pos().x,y:pos().y});
 climb(34,-11.16);walk(8,1800,false);if(!g.rescued.pip)throw Error('Pip was not rescued');points.push({feature:'Pip',x:pos().x,y:pos().y});
 walk(49);climb(54,-25.16);walk(48,1000,false);walk(.4,3000,false);if(!g.rescued.fox)throw Error('Fox was not rescued');points.push({feature:'river and fox',x:pos().x,y:pos().y,swim:g.waterTime});
 climb(-4,-39.16);walk(74,4000,true);points.push({feature:'lower chasms',x:pos().x,y:pos().y});
 for(let n=0;n<180&&!g.carry;n++)tick({y:1,jump:n<30});if(!g.carry)throw Error('Could not board balloon');
 let pops=0;
 for(let n=0;n<3000;n++){
  const p=pos();if(!g.carry){pops++;throw Error('Balloon popped during scripted route at '+JSON.stringify(p));}
  const target=p.y<-5?68.4:p.y<5?75:85;
  const dx=target-p.x;
  if(p.y>5.2&&p.x>83){tick({action:true,x:1});break;}
  tick({x:Math.abs(dx)<.15?0:Math.sign(dx)*Math.min(1,Math.abs(dx)*2),y:p.y<5?1:0});
  if(n===2999)throw Error('Balloon could not reach loft '+JSON.stringify(api.snapshot()));
 }
 walk(88,1200,false);for(let n=0;n<120&&!g.finished;n++)tick({});
 if(!g.finished)throw Error('Complete expedition did not finish '+JSON.stringify(api.snapshot()));
 if(g.waterTime<2)throw Error('River was not traversed by swimming');
 points.push({feature:'Prism and completion',...api.snapshot()});
 return {frames,points,score:g.score,discoveries:g.rescued};
}"""


def main():
    with server() as origin, sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--enable-unsafe-webgpu",
                "--enable-features=Vulkan",
                "--use-webgpu-adapter=swiftshader",
            ],
        )
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080}, device_scale_factor=1
        )
        page = context.new_page()
        page_errors = []
        page.on("pageerror", lambda e: page_errors.append(str(e)))
        page.add_init_script(
            "window.addEventListener('error',e=>window.__testFatal=e.message);"
        )
        page.goto(origin + "/index.html?test=1", wait_until="load", timeout=120000)
        check("Single-file bundle, metadata, feedback and syntax", extras.package)
        check("Boot and genuine WebGPU renderer", lambda: boot(page))
        check("Title composition screenshot", lambda: shot(page, "title.png"))
        check("Native animation clips and default sound level", lambda: animation(page))
        check(
            "Complete expedition through actual physics",
            lambda: page.evaluate(FULL_ROUTE),
        )
        check("Checkpoint rewind and persistent discoveries", lambda: rewind(page))
        check(
            "All wildlife contacts, cave rat and balloon pop",
            lambda: extras.wildlife(page),
        )
        check("Procedural audio offline signal", lambda: audio_proof(page))
        check("Menus, map and live developer sliders", lambda: menus(page))
        check(
            "About screen and all required feedback tabs", lambda: extras.credits(page)
        )
        check(
            "Developer free flight, warp, reset and single-step",
            lambda: extras.developer_tools(page),
        )
        check(
            "Long-fall scoring and live procedural audio",
            lambda: extras.falls_and_live_audio(page),
        )
        check("Attract loop and any-input return", lambda: extras.attract_check(page))
        check(
            "Controller emulation, glyphs and reserved chord",
            lambda: extras.controller(page),
        )
        check("No runtime errors", lambda: no_errors(page_errors, page))
        context.close()
        check(
            "Offline file launch with downloads blocked",
            lambda: extras.offline(browser),
        )
        check(
            "Touch, multitouch, compact menu and assistance",
            lambda: extras.touch(browser, origin),
        )
        check(
            "Standalone WebRTC race on two isolated devices",
            lambda: extras.rtc(browser, origin),
        )
        check(
            "Standalone local room transport", lambda: extras.broadcast(browser, origin)
        )
        check(
            "WebGL 2 fallback and visual compositions",
            lambda: extras.fallback(browser, origin),
        )
        for players, scenario in [(2, "standard"), (4, "standard"), (4, "host-leave")]:
            check(
                f"Official AI Hub harness: {players} seats, {scenario}",
                lambda p=players, s=scenario: extras.harness(browser, origin, p, s),
            )
        browser.close()
    (ART / "test-results.json").write_text(json.dumps(results, indent=2))
    failed = sum(not r["pass"] for r in results)
    print(
        f"{len(results)} checks · {len(results) - failed} passed · {failed} failed",
        flush=True,
    )
    return 1 if failed else 0


def boot(page):
    ready(page)
    data = page.evaluate("window.__below.snapshot()")
    assert data["diagnostics"]["backend"] == "WebGPU", data["diagnostics"]
    assert data["screen"] == "title", data["screen"]
    page.evaluate("window.__below.test.manual(true)")
    return data["diagnostics"]


def shot(page, name):
    page.wait_for_function("__below.snapshot().diagnostics.frames>2", timeout=30000)
    page.screenshot(path=str(ART / name))
    return name


def animation(page):
    data = page.evaluate(
        """() => ({clips:Object.keys(__below.art.player.actions),music:__below.audio.musicVolume})"""
    )
    assert all(
        k in data["clips"]
        for k in ["idle", "run", "jump", "climb", "swim", "float", "wave"]
    ), data
    assert data["music"] == 0.1, data
    return data


def rewind(page):
    data = page.evaluate(
        """() => {const a=__below,g=a.game;g.finished=false;g.invincible=false;g.invuln=0;const before={gold:g.collected.size,score:g.score,cp:g.checkpoint};g.hurt('test creature');a.test.step(90);return{before,after:a.snapshot()};}"""
    )
    assert len(data["after"]["collected"]) == data["before"]["gold"]
    assert data["after"]["score"] < data["before"]["score"]
    assert data["after"]["deaths"] == 1
    return {
        "scorePenalty": data["before"]["score"] - data["after"]["score"],
        "checkpoint": data["after"]["checkpoint"],
    }


def audio_proof(page):
    data = page.evaluate("window.__below.audio.proof()")
    assert 0.001 < data["peak"] < 1, data
    assert data["rms"] > 0.0001, data
    return data


def menus(page):
    data = page.evaluate(
        """() => {const a=__below;a.test.start();a.ui.open('pause');a.ui.open('dev');const el=document.querySelector('[data-setting="dev-speed"]');el.value='10.5';el.dispatchEvent(new Event('input',{bubbles:true}));const value=a.game.params.speed;a.ui.act('reset-balance');const reset=a.game.params.speed;a.ui.playing();a.ui.open('map');const map=!!document.querySelector('#map-player');a.ui.back();return{value,reset,map,screen:a.ui.screen};}"""
    )
    assert data == {"value": 10.5, "reset": 8.2, "map": True, "screen": ""}, data
    return data


def no_errors(errors, page):
    assert not errors, errors
    diag = page.evaluate("window.__below.snapshot().diagnostics")
    assert not errors, errors
    assert not diag["errors"], diag["errors"]
    return {"pageErrors": len(errors)}


import extras

extras.configure(ROOT, ART, ready, shot)

if __name__ == "__main__":
    raise SystemExit(main())
