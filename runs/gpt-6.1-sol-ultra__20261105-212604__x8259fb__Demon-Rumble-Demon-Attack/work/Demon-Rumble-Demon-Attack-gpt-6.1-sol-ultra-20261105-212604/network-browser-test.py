"""Standalone direct-connection smoke test; no server or physical controller needed."""
from pathlib import Path
from playwright.sync_api import sync_playwright


def run():
    failures = []
    count = 0

    def check(condition, name):
        nonlocal count
        count += 1
        if not condition:
            failures.append(name)

    source = Path(__file__).with_name('network.js').read_text().replace('export class NetworkDirector', 'globalThis.NetworkDirector = class NetworkDirector')
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        host, guest = context.new_page(), context.new_page()
        for page in (host, guest):
            page.set_content('<title>Demon Rumble network check</title>')
            page.add_script_tag(content=source)
            page.evaluate('''() => {
              window.starts=0; window.world=null; window.input=null; window.endInfo=null;
              window.net = new NetworkDirector({
                onStart:()=>starts++, onSnapshot:w=>world=w,
                onRemoteInput:(v,s)=>input={v,s}, onEnd:(reason,details)=>endInfo={reason,details}
              });
            }''')
        offer = host.evaluate('net.createOffer()')
        check(offer.startswith('DR1:'), 'Host generates invite')
        answer = guest.evaluate('(code)=>net.acceptOffer(code)', offer)
        check(answer.startswith('DR1:'), 'Guest generates reply')
        host.evaluate('(code)=>net.acceptAnswer(code)', answer)
        try:
            host.wait_for_function('starts === 1 && net.active', timeout=15000)
            guest.wait_for_function('starts === 1 && net.active', timeout=15000)
            check(True, 'Both peers connect and start once')
        except Exception:
            check(False, 'Both peers connect and start once')
        host.evaluate('net.update(.1,{score:73,wave:2},{})')
        guest.wait_for_function('world?.score === 73', timeout=5000)
        check(guest.evaluate('world.wave === 2'), 'Host world reaches guest')
        guest.evaluate('net.update(.1,null,{axis:-.5,fire:true})')
        host.wait_for_function('input?.v.fire', timeout=5000)
        check(host.evaluate('input.s === 1 && input.v.axis === -.5'), 'Guest input reaches correct host seat')
        host.evaluate('net.finish(73,true)')
        guest.wait_for_function('endInfo !== null', timeout=5000)
        check(guest.evaluate('endInfo.reason === "finished" && endInfo.details.won && endInfo.details.score === 73'), 'Guest receives final outcome')
        check(host.evaluate('net.active && net.status === "finished"'), 'Finished session retains role until disconnect')
        for page in (host, guest):
            page.evaluate('net.disconnect()')
        check(host.evaluate('!net.active && net.status === "offline"'), 'Disconnect releases session')
        browser.close()
    return count, failures


if __name__ == '__main__':
    try:
        count, failures = run()
    except Exception as error:
        print(f'FAIL: WebRTC smoke test: {error}')
        raise SystemExit(1)
    for failure in failures:
        print(f'FAIL: {failure}')
    print(f'{count} direct-network checks, {len(failures)} failures')
    raise SystemExit(bool(failures))
