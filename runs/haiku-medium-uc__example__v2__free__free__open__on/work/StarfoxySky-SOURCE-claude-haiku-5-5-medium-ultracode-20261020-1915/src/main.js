// Entry point: mounts the canvas and the UI root, then starts the app.

import { App } from './app.js';

const canvas = document.getElementById('stage');
const uiRoot = document.getElementById('ui');
const app = new App(uiRoot, canvas);
app.start();
