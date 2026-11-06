/* Local signaling fixture only; shipped gameplay defaults to secure PeerJS Cloud. */
import { PeerServer } from 'peer';
let owned;
PeerServer({ port: 0, host: '127.0.0.1', path: '/signal', allow_discovery: false }, (server) => {
  owned = server;
  process.stdout.write(
    JSON.stringify({
      url: 'http://127.0.0.1:' + server.address().port + '/signal',
      pid: process.pid,
    }) + '\n',
  );
});
process.on('SIGTERM', () => {
  owned?.close();
  process.exit(0);
});
