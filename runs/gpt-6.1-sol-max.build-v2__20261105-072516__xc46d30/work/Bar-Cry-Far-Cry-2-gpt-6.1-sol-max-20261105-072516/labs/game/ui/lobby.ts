/** @file Standalone co-op lobby, local room links and WebRTC invite/reply codes. */
import { TabsNet } from '../net/tabs';
import { RtcNet } from '../net/rtc';
import { shell, button, type Context } from './context';
export function lobby(ctx: Context): void {
  if (ctx.net && !ctx.inHub) {
    const old = ctx.net;
    ctx.net = null;
    old.close();
  }
  const root = shell(
    ctx,
    'Co-op',
    'CONTRACT RUN · ONE TO FOUR MERCS',
    'Reach the Pump Station. Burn the fuel. Survive. Extract together.',
  );
  const connect = (net: TabsNet | RtcNet) => {
    ctx.net?.close();
    ctx.net = net;
    net.onStart = () => ctx.startNet();
    net.on('end', () => {
      if (ctx.screen === 'lobby') lobby(ctx);
    });
  };
  const roster = (host: boolean) => {
    const old = root.querySelector('.roster');
    old?.remove();
    const p = document.createElement('p');
    p.className = 'roster';
    p.textContent = `Crew: ${ctx.net?.players.map((p) => p.name).join(' · ') ?? ''}`;
    root.prepend(p);
    if (!host) p.append(document.createTextNode(' · Waiting for the host.'));
  };
  const field = (hint: string) => {
    const input = document.createElement('textarea');
    input.setAttribute('aria-label', hint);
    input.rows = 2;
    input.autocomplete = 'off';
    root.append(input);
    return input;
  };
  button(root, 'Host · same computer', () => {
    const room = `BC-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36).slice(0, 5).toUpperCase()}`,
      net = new TabsNet(room, true);
    connect(net);
    root.replaceChildren();
    const p = document.createElement('h2');
    p.textContent = room;
    root.append(p);
    root.insertAdjacentHTML(
      'beforeend',
      '<p>Open this game in another tab. Choose Join same computer and enter this room.</p>',
    );
    net.onRoster = () => roster(true);
    roster(true);
    button(root, 'Start contract', () => net.start());
    button(root, 'Back', () => lobby(ctx));
  });
  button(root, 'Join · same computer', () => {
    root.replaceChildren();
    const label = document.createElement('p');
    label.textContent = 'Enter the host’s room code.';
    root.append(label);
    const input = field('Room code');
    button(root, 'Join room', () => {
      const net = new TabsNet(input.value.trim().toUpperCase(), false);
      connect(net);
      net.onRoster = () => roster(false);
      label.textContent = 'Listening for the host…';
    });
    button(root, 'Back', () => lobby(ctx));
  });
  button(root, 'Host · invite code', () => {
    const net = new RtcNet(true);
    connect(net);
    root.replaceChildren();
    root.insertAdjacentHTML(
      'beforeend',
      '<p>Send your invitation, then paste the guest’s reply. Repeat for more guests.</p>',
    );
    const output = field('Your invitation');
    output.readOnly = true;
    const reply = field('Guest reply');
    const make = button(root, 'Make invitation', () => {
      make.disabled = true;
      void net
        .offer()
        .then((code) => {
          output.value = code;
          make.disabled = false;
        })
        .catch((e) => {
          output.value = String(e);
          make.disabled = false;
        });
    });
    button(root, 'Copy invitation', () => {
      output.select();
      void navigator.clipboard?.writeText(output.value).catch(() => {});
    });
    button(root, 'Accept guest reply', () => {
      void net
        .accept(reply.value)
        .then(() => {
          reply.value = '';
        })
        .catch((e) => {
          reply.value = String(e);
        });
    });
    button(root, 'Start contract', () => net.start());
    button(root, 'Back', () => lobby(ctx));
    net.onRoster = () => roster(true);
  });
  button(root, 'Join · invite code', () => {
    const net = new RtcNet(false);
    connect(net);
    root.replaceChildren();
    root.insertAdjacentHTML('beforeend', '<p>Paste the host’s invitation. Return the reply code to the host.</p>');
    const input = field('Host invitation'),
      output = field('Your reply');
    output.readOnly = true;
    button(root, 'Make reply', () => {
      void net
        .answer(input.value)
        .then((code) => {
          output.value = code;
        })
        .catch((e) => {
          output.value = String(e);
        });
    });
    button(root, 'Copy reply', () => {
      output.select();
      void navigator.clipboard?.writeText(output.value).catch(() => {});
    });
    button(root, 'Back', () => lobby(ctx));
    net.onRoster = () => roster(false);
  });
  button(root, 'Run the contract solo', () => ctx.start('contract'));
}
