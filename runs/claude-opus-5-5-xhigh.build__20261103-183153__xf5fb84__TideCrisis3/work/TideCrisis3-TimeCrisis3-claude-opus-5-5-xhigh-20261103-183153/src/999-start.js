/* 999-start: start the game once every fragment has registered (not when tools/build.mjs runs it headless) */
if (!(typeof window !== 'undefined' && window.TC_NO_BOOT) && !globalThis.TC_BUILD) TC.boot();
