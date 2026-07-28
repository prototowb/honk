import test   from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

const { redactSecrets, fetchWithTimeout, httpTimeoutMs } = await import('../lib/http.js');

// ── redactSecrets: scrub credential carriers from persisted/surfaced text ────

test('redacts access_token in a query string (Graph API URL shape)', () => {
  const s = redactSecrets('IG container 400: https://graph.facebook.com/v21.0/123?fields=status_code&access_token=EAAG1234secret');
  assert.ok(!s.includes('EAAG1234secret'));
  assert.match(s, /access_token=\[REDACTED\]/);
});

test('redacts api_key / signature form params echoed in error bodies', () => {
  const s = redactSecrets('Cloudinary 401: bad request ?api_key=12345&signature=deadbeef&timestamp=1');
  assert.ok(!s.includes('12345') && !s.includes('deadbeef'));
  assert.ok(s.includes('timestamp=1'), 'non-secret params survive');
});

test('redacts Bearer and OAuth authorization material', () => {
  const s = redactSecrets('401 Unauthorized: Bearer abcdef123456789 rejected');
  assert.ok(!s.includes('abcdef123456789'));
});

test('redacts JSON-embedded credentials (accessJwt, access_token)', () => {
  const s = redactSecrets('{"accessJwt":"eyJhbGciOi.secret","did":"did:plc:x"}');
  assert.ok(!s.includes('eyJhbGciOi.secret'));
  assert.ok(s.includes('did:plc:x'), 'non-secret fields survive');
});

test('leaves ordinary error text untouched', () => {
  const msg = 'IG container still processing after 12 checks — try again shortly';
  assert.equal(redactSecrets(msg), msg);
});

// ── fetchWithTimeout: no outbound call may hang forever ──────────────────────

test('httpTimeoutMs defaults to 30s and honours HONK_HTTP_TIMEOUT_MS', () => {
  delete process.env.HONK_HTTP_TIMEOUT_MS;
  assert.equal(httpTimeoutMs(), 30_000);
  process.env.HONK_HTTP_TIMEOUT_MS = '150';
  assert.equal(httpTimeoutMs(), 150);
  process.env.HONK_HTTP_TIMEOUT_MS = 'nonsense';
  assert.equal(httpTimeoutMs(), 30_000);
  delete process.env.HONK_HTTP_TIMEOUT_MS;
});

test('fetchWithTimeout aborts a hung request instead of hanging forever', async () => {
  // A server that accepts the connection and never responds.
  const server = createServer(() => { /* never respond */ });
  await new Promise(res => server.listen(0, '127.0.0.1', res));
  const { port } = server.address();
  process.env.HONK_HTTP_TIMEOUT_MS = '200';
  try {
    await assert.rejects(
      () => fetchWithTimeout(`http://127.0.0.1:${port}/hang`),
      (e) => e.name === 'TimeoutError' || /timeout/i.test(String(e.cause || e)),
    );
  } finally {
    delete process.env.HONK_HTTP_TIMEOUT_MS;
    server.close();
    server.closeAllConnections?.();
  }
});

test('fetchWithTimeout passes normal responses through', async () => {
  const server = createServer((req, res) => { res.end('ok'); });
  await new Promise(res => server.listen(0, '127.0.0.1', res));
  const { port } = server.address();
  try {
    const r = await fetchWithTimeout(`http://127.0.0.1:${port}/`);
    assert.equal(await r.text(), 'ok');
  } finally {
    server.close();
  }
});
