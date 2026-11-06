#!/usr/bin/env python3
import json
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from urllib.parse import quote

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[2]
NAME = 'Wee Bit of Zen-Wii Fit-gpt-6.1-terra-max-20261104-221356'
URL = (ROOT / f'{NAME}.html').as_uri()
checks = 0
failures = 0


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


def check(name, condition, detail=''):
    global checks, failures
    checks += 1
    if not condition:
        failures += 1
        print(f'FAIL: {name}' + (f' — {detail}' if detail else ''))


def gameplay(page):
    page.goto(URL, wait_until='load')
    page.wait_for_function('window.__ZEN !== undefined')
    check('standalone title', page.evaluate("__ZEN.state.screen === 'title'"))
    check('music defaults to 10%', page.evaluate('__ZEN.state.settings.music === 10'))
    check('title has an accessible primary action', page.locator('button[data-action="slots"]').count() == 1)
    page.evaluate("__ZEN.step(11)")
    check('title has an attract mode', page.evaluate("__ZEN.state.screen === 'attract'"))
    page.keyboard.press('Enter')
    check('keyboard exits attract mode', page.evaluate("__ZEN.state.screen === 'title'"))
    page.locator('button[data-action="about"]').first.click()
    about = page.locator('#app').inner_text().lower()
    for heading in ('source information', 'testing feedback', 'engine feedback', 'prompt feedback'):
        check(f'credits include {heading}', heading in about)
    page.evaluate("__ZEN.action('about-back'); __ZEN.action('settings')")
    check('settings opens', page.evaluate("__ZEN.state.screen === 'settings'"))
    page.evaluate("__ZEN.action('toggle', 'gentle'); __ZEN.action('settings-back')")
    check('accessibility setting toggles', page.evaluate('__ZEN.state.settings.gentle === true'))
    page.evaluate("__ZEN.action('slots')")
    check('profile sections stack vertically', page.eval_on_selector('.page--slots .main-wrap', "element => getComputedStyle(element).flexDirection === 'column'"))
    page.evaluate("__ZEN.action('slot', '0')")
    check('outfit swatches have distinct colors', page.evaluate("new Set([...document.querySelectorAll('.swatch')].map(element => getComputedStyle(element).backgroundColor)).size > 1"))
    page.locator('#nickname').fill('Test Walker')
    page.evaluate("__ZEN.action('create-member')")
    check('create a named profile', page.evaluate("__ZEN.state.screen === 'intro' && __ZEN.state.member.name === 'Test Walker'"))
    page.reload(wait_until='load')
    page.evaluate("__ZEN.action('slots'); __ZEN.action('slot', '0')")
    check('profile survives reload', page.evaluate("__ZEN.state.member.name === 'Test Walker'"))
    check('setting survives reload', page.evaluate('__ZEN.state.settings.gentle === true'))

    results = page.evaluate('''() => {
      const z = window.__ZEN, found = [];
      const verify = (name, value) => found.push({ name, pass: !!value });
      for (let day = 1; day <= 5; day++) {
        verify(`day ${day} starts`, z.state.member.day === day);
        z.action('check'); z.step(20);
        verify(`day ${day} check-in`, z.state.screen === 'question');
        z.action('question-answer', 'bright'); z.action('island');
        for (let session = 0; session < 3; session++) {
          z.startActivity(ACTIVITIES[(day * 3 + session) % ACTIVITIES.length], { seconds: .1 });
          z.step(.2);
          verify(`day ${day} session ${session + 1}`, z.state.screen === 'result');
          z.action('result-continue');
        }
        verify(`day ${day} records sessions`, z.state.member.sessions >= 3);
        z.action('sleep');
        if (day < 5) { verify(`day ${day} recap`, z.state.screen === 'recap'); z.action('next-day'); }
      }
      verify('festival unlocks', z.state.screen === 'festival');
      for (let event = 0; event < 3; event++) {
        z.action('festival-start'); z.step(31);
        verify(`festival event ${event + 1}`, z.state.screen === 'result');
        z.action('result-continue');
      }
      verify('story reaches the ending', z.state.screen === 'ending' && z.state.member.finished);
      z.action('free-play');
      verify('free practice follows ending', z.state.screen === 'island');
      for (const activity of ACTIVITIES) {
        z.startActivity(activity, { seconds: 1 });
        if (activity.id === 'step') attemptInput('arrowleft');
        if (activity.id === 'jog') { attemptInput('j'); attemptInput('k'); }
        if (activity.id === 'hoop') { attemptInput('q'); attemptInput('e'); }
        z.step(1.1);
        verify(`${activity.name} completes`, z.state.screen === 'result' && Number.isFinite(z.state.result.percent));
        z.action('result-continue');
      }
      z.startActivity(ACTIVITIES.find(activity => activity.id === 'stork'));
      z.step(46);
      verify('full-length session completes', z.state.screen === 'result');
      z.action('result-continue');
      z.startActivity(ACTIVITIES[0], { seconds: 5 }); z.step(.5); z.action('pause');
      const paused = z.state.activity.elapsed; z.step(2);
      verify('pause freezes the workout', z.state.activity.elapsed === paused);
      z.action('dev'); tuning.spring = 3; z.action('reset-tuning');
      verify('developer tuning resets', tuning.spring === tuningDefaults.spring);
      z.action('resume'); verify('pause resumes', z.state.screen === 'play');
      z.action('leave-play');
      for (const count of [2, 3, 4]) {
        z.state.classPlayers = [];
        z.action('class');
        if (count >= 3) z.action('class-toggle', '2');
        if (count >= 4) z.action('class-toggle', '3');
        z.action('start-class');
        verify(`${count}-person class starts`, z.state.classActors.length === count - 1);
        z.step(36);
        verify(`${count}-person class finishes`, z.state.screen === 'class-result' && z.state.classScores.length === count);
        verify(`${count}-person class has independent scores`, new Set(z.state.classScores.map(item => item.score)).size > 1);
        const rows = [...document.querySelectorAll('.page--class-result .row')];
        verify(`${count}-person class displays real scores`, z.state.classScores.every((player, index) => rows[index]?.textContent.includes(player.name) && rows[index]?.textContent.includes(`${player.score} points`)));
      }
      z.state.classPlayers = []; z.action('class'); z.action('class-toggle', '1');
      verify('second keyboard player joins', z.state.classPlayers[1].source === 'keyboard');
      z.action('start-class'); keys.add('l'); z.step(1); keys.delete('l');
      verify('second keyboard controls their own player', z.state.classActors[0].px > 0);
      z.action('leave-play'); z.action('island');
      return found;
    }''')
    for result in results:
        check(result['name'], result['pass'])

    gamepad = page.evaluate('''() => {
      const z = window.__ZEN;
      const makePad = index => ({ index, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) });
      const first = makePad(0), second = makePad(1);
      Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [first, second] });
      z.action('home'); document.querySelector('[data-action="slots"]').focus();
      first.buttons[0].pressed = true; pollGamepad();
      const selected = z.state.screen === 'slots';
      first.buttons[0].pressed = false; pollGamepad();
      z.state.classPlayers = []; z.action('class');
      second.buttons[9].pressed = true; pollGamepad();
      const joined = z.state.classPlayers.some(player => player?.source === 'gamepad' && player.padIndex === 1);
      second.buttons[9].pressed = false; pollGamepad();
      z.action('start-class'); second.axes[0] = 1; z.step(1);
      const moved = z.state.classActors.some(actor => actor.player.padIndex === 1 && actor.px > 0);
      delete navigator.getGamepads;
      z.action('leave-play');
      return { selected, joined, moved };
    }''')
    check('gamepad selects a menu item', gamepad['selected'])
    check('second gamepad joins class', gamepad['joined'])
    check('second gamepad controls its own player', gamepad['moved'])

    sound = page.evaluate('''async () => {
      unlockAudio(); await audioContext.resume();
      const analyser = audioContext.createAnalyser(); analyser.fftSize = 2048;
      const connect = AudioNode.prototype.connect;
      AudioNode.prototype.connect = function(destination, ...args) {
        if (destination === audioContext.destination) connect.call(this, analyser);
        return connect.call(this, destination, ...args);
      };
      tone(440, .3, 1); await new Promise(resolve => setTimeout(resolve, 100));
      const samples = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(samples);
      AudioNode.prototype.connect = connect;
      return samples.some(sample => Math.abs(sample) > .00001);
    }''')
    check('procedural audio produces samples', sound)


def hub(browser, players, scenario='standard'):
    context = browser.new_context()
    page = context.new_page()
    try:
        page.goto(f'{HUB_URL}?auto=1&game=game.html&players={players}&play=7000&scenario={scenario}')
        page.wait_for_function('window.__hubCheck && window.__hubCheck.done', timeout=60000)
        report = page.evaluate('window.__hubCheck')
        for item in report['checks']:
            check(f'Hub {players} {scenario}: {item["name"]}', item['pass'], item.get('detail', ''))
        check(f'Hub {players} {scenario}: conformance finished', report['pass'])
    except Exception as error:
        check(f'Hub {players} {scenario} completed', False, str(error).splitlines()[0])
    finally:
        context.close()


def smoke(browser, label, context_options=None):
    context = browser.new_context(**(context_options or {}))
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    try:
        page.goto(URL, wait_until='load')
        page.wait_for_function('window.__ZEN !== undefined')
        check(f'{label} renders title', page.evaluate("__ZEN.state.screen === 'title'"))
        if context_options and context_options.get('has_touch'):
            check(f'{label} shows required controller notice', page.get_by_text('Controller or keyboard required').count() == 1)
            page.locator('.touch-notice [data-action="settings"]').click()
            check(f'{label} can open settings', page.evaluate("__ZEN.state.screen === 'settings'"))
        else:
            page.evaluate("__ZEN.action('slots'); __ZEN.action('slot', '0'); __ZEN.action('create-member'); __ZEN.action('check'); __ZEN.step(20)")
            check(f'{label} plays check-in', page.evaluate("__ZEN.state.screen === 'question'"))
        check(f'{label} has no JavaScript errors', not errors, '; '.join(errors))
    except Exception as error:
        check(f'{label} smoke test', False, str(error).splitlines()[0])
    finally:
        context.close()


def compact_navigation(browser):
    context = browser.new_context(viewport={'width': 375, 'height': 667})
    page = context.new_page()
    try:
        page.goto(URL, wait_until='load')
        page.evaluate("__ZEN.action('slots')")
        page.eval_on_selector('#app', 'element => element.scrollTop = element.scrollHeight')
        check('compact profile list scrolls', page.eval_on_selector('#app', 'element => element.scrollTop > 0'))
        page.evaluate("__ZEN.action('slot', '0')")
        check('new screen starts at top', page.eval_on_selector('#app', 'element => element.scrollTop === 0'))
        page.eval_on_selector('#app', 'element => element.scrollTop = element.scrollHeight')
        old_scroll = page.eval_on_selector('#app', 'element => element.scrollTop')
        page.evaluate("__ZEN.action('outfit', '1')")
        check('editing a screen keeps its scroll position', old_scroll > 0 and page.eval_on_selector('#app', 'element => element.scrollTop') == old_scroll)
    except Exception as error:
        check('compact navigation ran', False, str(error).splitlines()[0])
    finally:
        context.close()


def main():
    global HUB_URL
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
    Thread(target=server.serve_forever, daemon=True).start()
    HUB_URL = f'http://127.0.0.1:{server.server_port}/{quote(NAME)}/tests/hub/harness.html'
    with sync_playwright() as playwright:
        chromium = playwright.chromium.launch(headless=True, args=['--autoplay-policy=no-user-gesture-required'])
        context = chromium.new_context(viewport={'width': 1280, 'height': 720})
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        try:
            gameplay(page)
        except Exception as error:
            check('Chromium playthrough ran', False, str(error).splitlines()[0])
        check('Chromium playthrough has no JavaScript errors', not errors, '; '.join(errors))
        context.close()
        for players in [1, 2, 3, 4]:
            hub(chromium, players)
        hub(chromium, 4, 'host-leave')
        chromium.close()
        for engine in ['firefox', 'webkit']:
            browser = getattr(playwright, engine).launch(headless=True)
            smoke(browser, engine)
            if engine == 'webkit':
                compact_navigation(browser)
                smoke(browser, 'iPhone WebKit', playwright.devices['iPhone 13'])
            browser.close()
    server.shutdown()
    server.server_close()
    print(f'{checks} checks, {failures} failures')
    return 1 if failures else 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except Exception as error:
        check('test runner', False, str(error).splitlines()[0])
        print(f'{checks} checks, {failures} failures')
        sys.exit(1)
