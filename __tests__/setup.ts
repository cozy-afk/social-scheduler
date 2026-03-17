// Polyfill Web APIs needed by next/server in jsdom environment
import { TextEncoder, TextDecoder } from 'util';

Object.assign(global, { TextDecoder, TextEncoder });

// Minimal fetch / Request / Response polyfills (jsdom doesn't include them)
if (typeof global.Request === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Request, Response, Headers, fetch } = require('undici');
  Object.assign(global, { Request, Response, Headers, fetch });
}
