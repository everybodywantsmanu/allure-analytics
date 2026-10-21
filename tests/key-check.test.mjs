// The Google key check (api.js, checkKey) on Google-shaped answers: the
// refused-key bodies are real ones. No network, no key.
// Run with: node --test tests/
import { checkKey, KEY_FORMAT } from '../src/api.js';

const res = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const err = (code, status, reason, message) => ({ error: { code, status, message, details: [{ '@type': 'type.googleapis.com/google.rpc.ErrorInfo', reason }] } });
const BODIES = {
  ok400: res(400, { error: { code: 400, message: 'Required parameter: url', status: 'INVALID_ARGUMENT', errors: [{ reason: 'badRequest' }] } }),
  invalid: res(400, err(400, 'INVALID_ARGUMENT', 'API_KEY_INVALID', 'API key not valid. Please pass a valid API key.')),
  disabled: res(403, err(403, 'PERMISSION_DENIED', 'SERVICE_DISABLED', 'Chrome UX Report API has not been used in project 123 before or it is disabled.')),
  blocked: res(403, err(403, 'PERMISSION_DENIED', 'API_KEY_SERVICE_BLOCKED', 'Requests to this API chromeuxreport method are blocked.')),
  referrer: res(403, err(403, 'PERMISSION_DENIED', 'API_KEY_HTTP_REFERRER_BLOCKED', 'Requests from referer http://localhost:4173/ are blocked.')),
  quota: res(429, err(429, 'RESOURCE_EXHAUSTED', 'RATE_LIMIT_EXCEEDED', "Quota exceeded for quota metric 'Queries' and limit 'Queries per day'")),
  rate: res(429, err(429, 'RESOURCE_EXHAUSTED', 'RATE_LIMIT_EXCEEDED', "Quota exceeded for quota metric 'Queries' and limit 'Queries per minute'")),
  ok200: res(200, { record: {} }),
  nodata: res(404, { error: { code: 404, message: 'chrome ux report data not found', status: 'NOT_FOUND' } }),
  boom: res(500, { error: { code: 500, message: 'Internal error' } }),
};
const fetchWith = (psi, crux) => async url => {
  const b = url.includes('pagespeedonline') ? psi : crux;
  if (b === 'net') throw new TypeError('Failed to fetch');
  return BODIES[b];
};
const CASES = [
  ['all good', 'ok400', 'ok200', { psi: 'ok', crux: 'ok' }],
  ['bad key', 'invalid', 'invalid', { psi: 'refused', crux: 'refused' }],
  ['CrUX not enabled', 'ok400', 'disabled', { psi: 'ok', crux: 'off' }],
  ['CrUX not allowed for the key', 'ok400', 'blocked', { psi: 'ok', crux: 'off' }],
  ['PageSpeed not enabled', 'disabled', 'ok200', { psi: 'off', crux: 'ok' }],
  ['site restriction', 'referrer', 'referrer', { psi: 'refused', crux: 'refused' }],
  ['daily quota', 'quota', 'ok200', { psi: 'quota', crux: 'ok' }],
  ['rate limit only', 'rate', 'ok200', { psi: 'ok', crux: 'ok' }],
  ['CrUX has no data', 'ok400', 'nodata', { psi: 'ok', crux: 'ok' }],
  ['offline', 'net', 'net', { psi: 'network', crux: 'network' }],
  ['server error', 'boom', 'boom', { psi: 'unknown', crux: 'unknown' }],
];

let failures = 0;
const KEY = 'AIzaSyTESTLOCALMOCK00000000000000000000';
for (const [label, psi, crux, want] of CASES) {
  const got = await checkKey(KEY, { fetch: fetchWith(psi, crux) });
  const ok = got.psi === want.psi && got.crux === want.crux;
  if (!ok) failures++;
  console.log(ok ? '✓' : '✗', label.padEnd(30), JSON.stringify(got), ok ? '' : `expected ${JSON.stringify(want)}`);
}
for (const [value, want] of [[KEY, true], ['AIza123', false], ['', false], [`${KEY}x`, false]]) {
  if (KEY_FORMAT.test(value) !== want) { failures++; console.log('✗ format', JSON.stringify(value)); }
}
console.log(failures ? `\n${failures} FAILURES` : '\nALL CLEAN');
process.exitCode = failures ? 1 : 0;
