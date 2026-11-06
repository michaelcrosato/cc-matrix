() =>
  [...document.querySelectorAll('iframe')].map((frame) => {
    const W = frame.contentWindow;
    if (!W.__game) return null;
    const s = W.__game.debug.snapshot();
    if (!W.AIHub.server && !W.pilotInstalled) {
      W.pilotInstalled = true;
      W.testPad = {
        index: 0,
        id: 'Route test standard pad',
        connected: true,
        mapping: 'standard',
        axes: [0, 0, 0, 0],
        buttons: Array.from({ length: 17 }, () => ({
          pressed: false,
          value: 0,
        })),
      };
      W.navigator.getGamepads = () => [W.testPad];
      W.__game.game.hook('input', () => {
        const s = W.__game.debug.snapshot();
        if (s.phase === 'ended') return;
        const data = W.FF.SECTIONS[s.section],
          actors = s.actors.map((p) => ({ ...p, body: { ...p, w: 9, h: 22 } })),
          p = actors.find((p) => p.id === W.AIHub.me);
        const proxy = {
          ...s,
          data,
          cfg: W.FF.DEFAULTS,
          actors,
          floor: (q) => q.floor,
          usable: (q, dir = 1) =>
            s.windows.filter(
              (w) => w.floor === q.floor - (dir < 0 ? 1 : 0) && w.usable,
            ),
          powered: () => s.powerUntil > s.time,
        };
        const a = W.FF.bot(proxy, p),
          pad = W.testPad,
          d = W.__game.game.settings.deadzone;
        pad.axes[0] = a.x ? Math.sign(a.x) * (d + Math.abs(a.x) * (1 - d)) : 0;
        pad.axes[1] = 0;
        for (const [button, on] of [
          [0, a.jump],
          [12, a.up],
          [13, a.down],
        ])
          pad.buttons[button] = { pressed: !!on, value: on ? 1 : 0 };
      });
    }
    return { server: W.AIHub.server, s };
  });
