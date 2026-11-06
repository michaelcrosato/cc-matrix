import { createApp } from './app/director.js';

const params = new URLSearchParams(location.search);
const app = createApp({ params });
window.__game = app.api;
const info = await AIHub.connect({ mode: 'shared-world', seats: [1, 4], card: true });
if (info) app.startSession(info);
else await app.startStandalone();
