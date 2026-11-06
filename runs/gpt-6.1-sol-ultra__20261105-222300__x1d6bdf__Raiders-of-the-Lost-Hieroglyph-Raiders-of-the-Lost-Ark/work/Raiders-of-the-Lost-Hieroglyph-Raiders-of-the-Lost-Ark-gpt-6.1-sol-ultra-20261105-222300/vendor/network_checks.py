"""Reusable focused multiplayer checks; called by the game's one-command suite."""

def run_network_checks(browser, page_url, module_url):
    checks = 0
    context = browser.new_context()
    context.route("https://esm.sh/peerjs@1.5.5?bundle", lambda route: route.fulfill(
        content_type="text/javascript", body="export class Peer {on(){} destroy(){}}"))
    try:
        host, guest = context.new_page(), context.new_page()
        for page in (host, guest):
            page.goto(page_url)
            page.evaluate("""async url => {
                const {createNetwork} = await import(url);
                window.netEvents = [];
                window.testNet = createNetwork({
                    onState: x => netEvents.push(['state', x]),
                    onInput: (x,id) => netEvents.push(['input', x, id]),
                    onPeer: x => netEvents.push(['peer', x]),
                    onStatus: x => netEvents.push(['status', x])
                });
            }""", module_url)
        code = host.evaluate("testNet.host()")
        assert len(code) == 6, "Host must produce a six-character invite code"
        checks += 1
        assert guest.evaluate("testNet.join('BAD')") is False, "Invalid room code must be rejected"
        checks += 1
        guest.evaluate("code => testNet.join(code)", code)
        host.wait_for_function("testNet.connected")
        guest.wait_for_function("testNet.connected")
        assert host.evaluate("testNet.isHost") and not guest.evaluate("testNet.isHost"), "Host/guest roles"
        checks += 1
        host.evaluate("testNet.sendState({stage:2, x:5})")
        guest.wait_for_function("netEvents.some(e=>e[0]==='state' && e[1].stage===2)")
        checks += 1
        guest.evaluate("testNet.sendInput({x:1, whip:true})")
        host.wait_for_function("netEvents.some(e=>e[0]==='input' && e[1].whip && e[2]===1)")
        checks += 1
        assert host.evaluate("testNet.transport") == "local", "Same-device traffic must remain local"
        checks += 1
        guest.evaluate("testNet.leave()")
        host.wait_for_function("!testNet.connected")
        checks += 1
        host.evaluate("testNet.leave()")
    finally:
        context.close()
    context = browser.new_context()
    try:
        page = context.new_page()
        page.goto(page_url)
        page.evaluate("""async url => {
            const listeners = {};
            window.hubCalls = [];
            window.AIHub = {
                active:true, me:2, host:2, isHost:true, server:true,
                players:[{id:0,name:'A'},{id:1,name:'B'}],
                on:(event,fn)=>{listeners[event]=fn;return ()=>{}},
                connect:async ()=>AIHub,
                ready:()=>hubCalls.push(['ready']),
                send:(data,opts)=>{hubCalls.push(['send',data,opts]);return true},
                finish:data=>hubCalls.push(['finish',data])
            };
            window.hubListeners = listeners;
            const {createNetwork} = await import(url);
            window.testHubNet = createNetwork({onStart:()=>hubCalls.push(['start']),onEnd:()=>hubCalls.push(['end'])});
            await testHubNet.connectHub();
            testHubNet.ready();
        }""", module_url)
        assert page.evaluate("testHubNet.active && testHubNet.isHost && testHubNet.server && testHubNet.me===2"), "Dedicated server must retain host authority without a player"
        checks += 1
        page.evaluate("hubListeners.start({in:0})")
        page.wait_for_function("testHubNet.started")
        checks += 1
        assert page.evaluate("testHubNet.sendState({stage:1})"), "Hub host must send world traffic"
        checks += 1
        page.evaluate("hubListeners['time-up']({graceMs:100})")
        assert page.evaluate("hubCalls.some(x=>x[0]==='finish' && x[1].standings[0].join(',')==='0,1' && x[1].won===false)"), "Hub time-up must submit all players as a team"
        checks += 1
        page.evaluate("hubListeners.end({reason:'finished'})")
        assert page.evaluate("testHubNet.ended && !testHubNet.started && !testHubNet.sendState({stage:2})"), "Round end must stop traffic"
        checks += 1
    finally:
        context.close()
    return checks
