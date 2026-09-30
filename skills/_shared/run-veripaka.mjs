#!/usr/bin/env node
// Run in-process so cancellation reaches the CLI owner rather than killing it
// before it can seal the execution/result and release the project lock.
await import(new URL('../../dist/src/cli/main.js', import.meta.url).href);
