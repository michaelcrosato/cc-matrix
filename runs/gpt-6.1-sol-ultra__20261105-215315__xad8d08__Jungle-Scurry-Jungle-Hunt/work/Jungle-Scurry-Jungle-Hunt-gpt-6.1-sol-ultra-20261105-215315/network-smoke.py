"""Transport-only checks; run via project's unified test command when integrated."""
import os
from playwright.sync_api import sync_playwright

base = os.environ.get('GAME_TEST_ORIGIN', 'http://127.0.0.1:42199')
errors = []
checks = 0

def check(condition, name):
    global checks
    checks += 1
    if not condition:
        errors.append(name)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context()
    host = context.new_page()
    guest = context.new_page()
    try:
        for page in [host, guest]:
            page.goto(base + '/network.js')
            page.evaluate("""async () => {
              const {ExpeditionNet} = await import('./network.js');
              window.events = {starts:0, inputs:[], states:[], leaves:[], finish:null};
              window.net = new ExpeditionNet({
                onStart: () => events.starts++,
                onInput: (input,id) => events.inputs.push({input,id}),
                onState: state => events.states.push(state),
                onLeave: leave => events.leaves.push(leave),
                onFinish: result => events.finish = result
              });
            }""")
        check(host.evaluate('net.mode === "solo" && net.isHost'), 'Initial solo transport')
        offer = host.evaluate('net.createOffer({iceServers:[]})')
        answer = guest.evaluate('(offer) => net.acceptOffer(offer,{iceServers:[]})', offer)
        host.evaluate('(answer) => net.acceptAnswer(answer)', answer)
        host.wait_for_function('net.connected', timeout=15000)
        guest.wait_for_function('net.connected', timeout=15000)
        check(host.evaluate('net.players.length===2') and guest.evaluate('net.me===1 && !net.isHost'), 'Direct handshake and seats')
        host.evaluate('net.begin({seed:27})')
        guest.wait_for_function('events.starts===1')
        check(guest.evaluate('net.canPlay'), 'Direct start lifecycle')
        host.evaluate('net.sendState({stage:3,x:56},true)')
        guest.evaluate('net.sendInput({x:1,jump:true},true)')
        guest.wait_for_function('events.states.length>0')
        host.wait_for_function('events.inputs.length>0')
        check(guest.evaluate('events.states[0].stage===3'), 'Host snapshots reach guest')
        check(host.evaluate('events.inputs[0].id===1 && events.inputs[0].input.jump'), 'Guest inputs reach host')
        host.evaluate('net.finish({scores:{0:50,1:70},won:true})')
        guest.wait_for_function('events.finish !== null')
        check(guest.evaluate('events.finish.won && events.finish.standings[0].length===2'), 'Direct team finish')
        guest.evaluate('net.leave()')
        host.wait_for_function('!net.connected')
        check(host.evaluate('events.leaves.length===1'), 'Direct disconnect lifecycle')
    except Exception as exc:
        errors.append(str(exc))
    finally:
        browser.close()
for error in errors:
    print('FAIL ' + error)
print(f'{checks-len(errors)}/{checks} direct network checks passed')
raise SystemExit(bool(errors))
