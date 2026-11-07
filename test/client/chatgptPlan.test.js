'use strict';

// Unit tests for lib/chatgptPlan.js against a mocked OpenAI auth server and Responses stream.
// Run: node --test test/client/*.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');

const {
  ChatGPTPlan,
  runChatGPTCli,
  createPkce,
  parseCallback,
  parseScopes,
  startCallbackListener,
  writeJsonAtomic,
  readLockOwner,
  renameWithRetry,
  renameWithRetryAsync,
  recoverAuthTmp,
  constants,
} = require('../../lib/chatgptPlan');

const FULL_SCOPE = 'chatgpt.tokens.use.direct email offline_access openid profile resource.invoke';
const NO_PLAN_SCOPE = 'email offline_access openid profile resource.invoke';
const ISSUED_CLIENT_ID = 'oaiapp_test123';

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const JWK = { ...publicKey.export({ format: 'jwk' }), kid: 'test-key', use: 'sig', alg: 'RS256' };

function signJwt(payload, { key = privateKey, kid = 'test-key' } = {}) {
  const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const input = `${enc({ alg: 'RS256', typ: 'JWT', kid })}.${enc(payload)}`;
  const sig = crypto.sign('RSA-SHA256', Buffer.from(input), key).toString('base64url');
  return `${input}.${sig}`;
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => resolve(data));
  });
}

function sse(events) {
  return events.map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`).join('');
}

/** Mock of auth.openai.com + api.openai.com. Each test sets `mock.behaviour`. */
async function startMock() {
  const mock = {
    calls: { token: [], revoke: [], responses: [], models: [] },
    authCodes: new Map(), // code -> { nonce, challenge, redirectUri, clientId }
    refreshCounter: 0,
    behaviour: {},
  };
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    const body = await readBody(req);
    const b = mock.behaviour;
    if (url.pathname === '/jwks') {
      mock.calls.jwks = (mock.calls.jwks || 0) + 1;
      if (b.jwksDown) { res.writeHead(503).end(); return; }
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({ keys: [JWK] }));
      return;
    }
    if (url.pathname === '/token') {
      const form = Object.fromEntries(new URLSearchParams(body));
      mock.calls.token.push(form);
      if (form.grant_type === 'authorization_code') {
        const pending = mock.authCodes.get(form.code);
        const challengeOk = pending && crypto.createHash('sha256').update(form.code_verifier).digest('base64url') === pending.challenge;
        if (!pending || !challengeOk || form.redirect_uri !== pending.redirectUri) {
          res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ error: 'invalid_grant' }));
          return;
        }
        const nowS = Math.floor(Date.now() / 1000);
        const idToken = signJwt({
          iss: b.idIssuer || 'https://auth.openai.com',
          sub: b.subject || 'user-sub-1',
          aud: [b.idAudience || form.client_id],
          nonce: b.badNonce ? 'wrong-nonce' : pending.nonce,
          email: 'user@example.com',
          iat: nowS,
          exp: nowS + 3600,
        }, b.signWithOtherKey ? { key: crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey } : {});
        res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({
          access_token: 'access-0',
          refresh_token: 'refresh-0',
          id_token: idToken,
          token_type: 'Bearer',
          expires_in: b.expiresIn ?? 3600,
          scope: b.grantedScope ?? FULL_SCOPE,
        }));
        return;
      }
      if (form.grant_type === 'refresh_token') {
        if (b.refreshError) {
          res.writeHead(400, { 'content-type': 'application/json' }).end(JSON.stringify({ error: b.refreshError }));
          return;
        }
        mock.refreshCounter += 1;
        const n = mock.refreshCounter;
        const nowS = b.nowS ?? Math.floor(Date.now() / 1000);
        const idToken = b.refreshIdToken ? signJwt({
          iss: 'https://auth.openai.com',
          sub: b.refreshIdSubject || 'user-sub-1',
          aud: [form.client_id],
          email: 'user@example.com',
          iat: nowS,
          exp: nowS + 3600,
        }) : undefined;
        res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({
          access_token: `access-${n}`,
          refresh_token: `refresh-${n}`,
          ...(idToken ? { id_token: idToken } : {}),
          token_type: 'Bearer',
          expires_in: 3600,
          scope: FULL_SCOPE,
        }));
        return;
      }
    }
    if (url.pathname === '/revoke') {
      mock.calls.revoke.push(Object.fromEntries(new URLSearchParams(body)));
      res.writeHead(200).end();
      return;
    }
    if (url.pathname === '/v1/responses') {
      mock.calls.responses.push({ auth: req.headers.authorization, body: JSON.parse(body) });
      if (b.responsesStatus) {
        res.writeHead(b.responsesStatus, { 'content-type': 'application/json', 'x-request-id': 'req_test' })
          .end(JSON.stringify(b.responsesBody || {}));
        return;
      }
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      const chunks = b.stream || sse([
        { type: 'response.created', response: { id: 'resp_1' } },
        { type: 'response.output_text.delta', delta: 'Hello, ' },
        { type: 'response.output_text.delta', delta: 'world!' },
        { type: 'response.completed', response: { id: 'resp_1', model: 'gpt-test', usage: { total_tokens: 7 } } },
      ]);
      // Send in small pieces to exercise the SSE buffer.
      for (let i = 0; i < chunks.length; i += 17) res.write(chunks.slice(i, i + 17));
      res.end();
      return;
    }
    if (url.pathname === '/v1/models') {
      mock.calls.models.push({ auth: req.headers.authorization });
      res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify({
        models: [
          { slug: 'gpt-test', display_name: 'GPT Test', visibility: 'list' },
          { slug: 'gpt-hidden', display_name: 'Hidden', visibility: 'hide' },
          { slug: 'gpt-mini', display_name: 'GPT Mini', visibility: 'list' },
          { slug: 'gpt-no-visibility', display_name: 'No visibility field' },
        ],
      }));
      return;
    }
    res.writeHead(404).end();
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  mock.base = base;
  mock.endpoints = {
    issuer: 'https://auth.openai.com',
    authorization_endpoint: `${base}/authorize`,
    token_endpoint: `${base}/token`,
    revocation_endpoint: `${base}/revoke`,
    jwks_uri: `${base}/jwks`,
  };
  mock.close = () => new Promise((r) => server.close(r));
  return mock;
}

/**
 * A fake browser: reads the authorization URL, "approves" it and calls the loopback callback.
 * `opts.callbackState` overrides state, `opts.error` sends an OAuth error.
 */
function fakeBrowser(mock, opts = {}) {
  const seen = [];
  const open = async (authUrl) => {
    const u = new URL(authUrl);
    const p = Object.fromEntries(u.searchParams);
    seen.push(p);
    const code = `code-${seen.length}`;
    const issued = p.client_id === constants.DYNAMIC_CLIENT_ID ? ISSUED_CLIENT_ID : p.client_id;
    mock.authCodes.set(code, { nonce: p.nonce, challenge: p.code_challenge, redirectUri: p.redirect_uri, clientId: issued });
    const cb = new URL(p.redirect_uri);
    if (opts.wrongStateFirst) {
      const bad = new URL(cb);
      bad.searchParams.set('code', 'stolen-code');
      bad.searchParams.set('state', 'not-the-state');
      const r = await fetch(bad);
      opts.wrongStateStatus = r.status;
      await r.text();
    }
    if (opts.skipCallback) return;
    cb.searchParams.set('state', opts.callbackState || p.state);
    if (opts.error) {
      cb.searchParams.set('error', opts.error);
    } else {
      cb.searchParams.set('code', code);
      if (!opts.omitClientId && p.client_id === constants.DYNAMIC_CLIENT_ID) cb.searchParams.set('client_id', issued);
      cb.searchParams.set('scope', FULL_SCOPE);
    }
    setTimeout(() => { fetch(cb).then((r) => r.text()).catch(() => {}); }, 5);
  };
  return { open, seen };
}

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'polydev-chatgpt-test-'));
}

function makePlan(mock, browser, extra = {}) {
  return new ChatGPTPlan({
    storageDir: path.join(tmpDir(), 'chatgpt'),
    endpoints: mock.endpoints,
    apiBase: `${mock.base}/v1`,
    openBrowser: browser.open,
    preferredPort: 0,
    ...extra,
  });
}

let mock;
test.before(async () => { mock = await startMock(); });
test.after(async () => { await mock.close(); });
test.beforeEach(() => {
  mock.behaviour = {};
  mock.calls = { token: [], revoke: [], responses: [], models: [], jwks: 0 };
  mock.refreshCounter = 0;
});

test('PKCE uses S256 with a fresh verifier each time', () => {
  const a = createPkce();
  const b = createPkce();
  assert.equal(a.method, 'S256');
  assert.match(a.verifier, /^[A-Za-z0-9_-]{43,128}$/);
  assert.equal(a.challenge, crypto.createHash('sha256').update(a.verifier).digest('base64url'));
  assert.ok(!a.challenge.includes('='));
  assert.notEqual(a.verifier, b.verifier);
});

test('first sign-in registers with dynamic_agent_client and saves the issued client_id', async () => {
  const browser = fakeBrowser(mock);
  const plan = makePlan(mock, browser);
  const result = await plan.signIn({ timeoutMs: 5000 });

  const p = browser.seen[0];
  assert.equal(p.client_id, 'dynamic_agent_client');
  assert.equal(p.agent_name_hint, 'Polydev');
  assert.match(p.ext_agent_host_id, /^urn:uuid:[0-9a-f-]{36}$/);
  assert.equal(p.response_type, 'code');
  assert.equal(p.code_challenge_method, 'S256');
  assert.equal(p.scope, 'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct');
  assert.equal(p.resource, 'https://api.openai.com/v1');
  assert.match(p.redirect_uri, /^http:\/\/127\.0\.0\.1:\d+\/auth\/callback$/);
  assert.ok(p.state && p.nonce);
  assert.equal(p.id_token_hint, undefined);

  const exchange = mock.calls.token[0];
  assert.equal(exchange.grant_type, 'authorization_code');
  assert.equal(exchange.client_id, ISSUED_CLIENT_ID, 'code exchange uses the issued client_id');
  assert.equal(exchange.redirect_uri, p.redirect_uri);
  assert.equal(exchange.resource, 'https://api.openai.com/v1');
  assert.equal(crypto.createHash('sha256').update(exchange.code_verifier).digest('base64url'), p.code_challenge);

  assert.equal(result.planEnabled, true);
  assert.equal(result.showWelcome, true);
  assert.equal(result.email, 'user@example.com');

  const record = plan.loadRecord();
  assert.equal(record.client_id, ISSUED_CLIENT_ID);
  assert.equal(record.subject, 'user-sub-1');
  assert.ok(record.scopes.includes('chatgpt.tokens.use.direct'));

  // Second sign-in reuses the issued client, the host id, and fresh state/nonce/PKCE.
  await plan.signIn({ timeoutMs: 5000 });
  const p2 = browser.seen[1];
  assert.equal(p2.client_id, ISSUED_CLIENT_ID);
  assert.equal(p2.agent_name_hint, undefined);
  assert.equal(p2.ext_agent_host_id, p.ext_agent_host_id);
  assert.equal(p2.login_hint, 'user@example.com');
  assert.ok(p2.id_token_hint, 'the browser URL carries id_token_hint on reauthorization');
  assert.notEqual(p2.state, p.state);
  assert.notEqual(p2.nonce, p.nonce);
  assert.notEqual(p2.code_challenge, p.code_challenge);
});

test('the printable sign-in URL never carries id_token_hint', async () => {
  const browser = fakeBrowser(mock);
  const plan = makePlan(mock, browser);
  await plan.signIn({ timeoutMs: 5000 });
  let printed = null;
  await plan.signIn({ timeoutMs: 5000, onAuthUrl: (u) => { printed = u; } });
  assert.ok(printed);
  assert.equal(new URL(printed).searchParams.get('id_token_hint'), null);
});

test('credential files are written with mode 0600 in a 0700 directory', { skip: process.platform === 'win32' }, async () => {
  const browser = fakeBrowser(mock);
  const plan = makePlan(mock, browser);
  const oldMask = process.umask(0o000);
  try {
    await plan.signIn({ timeoutMs: 5000 });
  } finally {
    process.umask(oldMask);
  }
  assert.equal(fs.statSync(plan.authFile).mode & 0o777, 0o600);
  assert.equal(fs.statSync(plan.hostFile).mode & 0o777, 0o600);
  assert.equal(fs.statSync(plan.storageDir).mode & 0o777, 0o700);

  const file = path.join(tmpDir(), 'x', 'y.json');
  writeJsonAtomic(file, { a: 1 });
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), { a: 1 });
});

test('status never exposes tokens', async () => {
  const browser = fakeBrowser(mock);
  const plan = makePlan(mock, browser);
  await plan.signIn({ timeoutMs: 5000 });
  const s = JSON.stringify(plan.status());
  assert.ok(!s.includes('access-0'));
  assert.ok(!s.includes('refresh-0'));
  assert.ok(!s.includes(ISSUED_CLIENT_ID));
  assert.equal(plan.status().planEnabled, true);
});

test('a callback with the wrong state is rejected and its code is never exchanged', async () => {
  assert.throws(() => parseCallback('/auth/callback?code=x&state=evil', 'good'), { code: 'state_mismatch' });
  assert.deepEqual(parseCallback('/auth/callback?code=x&state=good&client_id=c', 'good'),
    { code: 'x', clientId: 'c', scope: null });

  const opts = { wrongStateFirst: true };
  const browser = fakeBrowser(mock, opts);
  const plan = makePlan(mock, browser);
  await plan.signIn({ timeoutMs: 5000 });
  assert.equal(opts.wrongStateStatus, 400);
  assert.equal(mock.calls.token.length, 1);
  assert.notEqual(mock.calls.token[0].code, 'stolen-code');
});

test('sign-in fails when only wrong-state callbacks arrive', async () => {
  const browser = fakeBrowser(mock, { callbackState: 'attacker-state' });
  const plan = makePlan(mock, browser);
  await assert.rejects(plan.signIn({ timeoutMs: 400 }), { code: 'timeout' });
  assert.equal(mock.calls.token.length, 0);
});

test('the loopback listener answers 400 for a mismatched state', async () => {
  const listener = await startCallbackListener({ state: 'expected', preferredPort: 0, timeoutMs: 2000 });
  const bad = await fetch(`${listener.redirectUri}?code=a&state=other`);
  assert.equal(bad.status, 400);
  await bad.text();
  const ok = await fetch(`${listener.redirectUri}?code=b&state=expected`);
  assert.equal(ok.status, 200);
  await ok.text();
  assert.deepEqual(await listener.result, { code: 'b', clientId: null, scope: null });
  assert.equal(listener.rejectedCallbacks, 1);
});

test('a declined consent stops without exchanging a code', async () => {
  const browser = fakeBrowser(mock, { error: 'access_denied' });
  const plan = makePlan(mock, browser);
  await assert.rejects(plan.signIn({ timeoutMs: 5000 }), { code: 'access_denied' });
  assert.equal(mock.calls.token.length, 0);
});

test('a new registration without an issued client_id is incomplete', async () => {
  const browser = fakeBrowser(mock, { omitClientId: true });
  const plan = makePlan(mock, browser);
  await assert.rejects(plan.signIn({ timeoutMs: 5000 }), { code: 'registration_incomplete' });
  assert.equal(mock.calls.token.length, 0);
});

test('ID token checks: nonce, audience, issuer and signature', async () => {
  for (const [behaviour, label] of [
    [{ badNonce: true }, 'nonce'],
    [{ idAudience: 'someone-else' }, 'audience'],
    [{ idIssuer: 'https://evil.example' }, 'issuer'],
    [{ signWithOtherKey: true }, 'signature'],
  ]) {
    mock.behaviour = behaviour;
    const plan = makePlan(mock, fakeBrowser(mock));
    await assert.rejects(plan.signIn({ timeoutMs: 5000 }), { code: 'invalid_id_token' }, label);
    const record = plan.loadRecord();
    assert.equal(record.access_token, undefined, `${label}: no tokens saved`);
  }
});

test('missing chatgpt.tokens.use.direct keeps the sign-in but turns plan usage off', async () => {
  mock.behaviour = { grantedScope: NO_PLAN_SCOPE };
  const plan = makePlan(mock, fakeBrowser(mock));
  const result = await plan.signIn({ timeoutMs: 5000 });
  assert.equal(result.planEnabled, false);
  assert.equal(result.showWelcome, false);
  const s = plan.status();
  assert.equal(s.signedIn, true);
  assert.equal(s.planEnabled, false);
  assert.equal(plan.usable(), false);
  await assert.rejects(plan.createResponse({ model: 'gpt-test', prompt: 'hi' }), { code: 'plan_not_enabled' });
  assert.equal(mock.calls.responses.length, 0, 'no inference without the plan scope');
  assert.deepEqual(parseScopes('b a  a'), ['a', 'b']);
});

test('enabling plan usage after a decline asks for consent again', async () => {
  mock.behaviour = { grantedScope: NO_PLAN_SCOPE };
  const browser = fakeBrowser(mock);
  const plan = makePlan(mock, browser);
  await plan.signIn({ timeoutMs: 5000 });
  mock.behaviour = {};
  const r = await plan.signIn({ timeoutMs: 5000 });
  assert.equal(browser.seen[1].prompt, 'consent');
  assert.equal(browser.seen[1].scope.includes('chatgpt.tokens.use.direct'), true);
  assert.equal(r.planEnabled, true);
});

test('inference sends store:false and stream:true and returns text after response.completed', async () => {
  const plan = makePlan(mock, fakeBrowser(mock));
  await plan.signIn({ timeoutMs: 5000 });
  const out = await plan.createResponse({ model: 'gpt-test', prompt: 'Say hello' });
  assert.equal(out.text, 'Hello, world!');
  assert.equal(out.model, 'gpt-test');
  assert.equal(out.paid_by, 'ChatGPT plan');
  const call = mock.calls.responses[0];
  assert.equal(call.auth, 'Bearer access-0');
  assert.equal(call.body.store, false);
  assert.equal(call.body.stream, true);
  assert.deepEqual(call.body.input, [{ role: 'user', content: 'Say hello' }]);
  for (const banned of ['temperature', 'max_output_tokens', 'metadata', 'user', 'previous_response_id', 'background', 'top_p']) {
    assert.equal(call.body[banned], undefined, `${banned} is not sent`);
  }
});

test('a stream that ends before response.completed is a failure', async () => {
  const plan = makePlan(mock, fakeBrowser(mock));
  await plan.signIn({ timeoutMs: 5000 });
  mock.behaviour = { stream: sse([{ type: 'response.output_text.delta', delta: 'partial answer' }]) };
  await assert.rejects(plan.createResponse({ model: 'gpt-test', prompt: 'x' }), { code: 'stream_incomplete' });
});

test('response.failed and response.incomplete are failures', async () => {
  const plan = makePlan(mock, fakeBrowser(mock));
  await plan.signIn({ timeoutMs: 5000 });
  mock.behaviour = { stream: sse([
    { type: 'response.output_text.delta', delta: 'a' },
    { type: 'response.failed', response: { error: { code: 'server_error', message: 'boom' } } },
  ]) };
  await assert.rejects(plan.createResponse({ model: 'gpt-test', prompt: 'x' }), { code: 'server_error' });
  mock.behaviour = { stream: sse([
    { type: 'response.incomplete', response: { incomplete_details: { reason: 'max_output_tokens' } } },
  ]) };
  await assert.rejects(plan.createResponse({ model: 'gpt-test', prompt: 'x' }), { code: 'response_incomplete' });
});

test('text is read from response.completed output when no deltas arrive', async () => {
  const plan = makePlan(mock, fakeBrowser(mock));
  await plan.signIn({ timeoutMs: 5000 });
  mock.behaviour = { stream: sse([
    { type: 'response.completed', response: { model: 'gpt-test', output: [{ type: 'message', content: [{ type: 'output_text', text: 'From output' }] }] } },
  ]) };
  const out = await plan.createResponse({ model: 'gpt-test', prompt: 'x' });
  assert.equal(out.text, 'From output');
});

test('usage limit exceeded leads with Manage usage and pauses plan requests', async () => {
  const plan = makePlan(mock, fakeBrowser(mock));
  await plan.signIn({ timeoutMs: 5000 });
  mock.behaviour = { responsesStatus: 429, responsesBody: { error: { code: 'subscription_sharing_usage_limit_exceeded', message: 'limit' } } };
  const err = await plan.createResponse({ model: 'gpt-test', prompt: 'x' }).catch((e) => e);
  assert.equal(err.code, 'subscription_sharing_usage_limit_exceeded');
  assert.ok(err.message.startsWith('Usage limit reached. Manage usage: https://chatgpt.com/settings/usage'), err.message);
  assert.equal(err.usageLimit, true, 'marked as a usage limit, so the caller can fall back and say so');
  assert.ok(!err.noFallback, 'falling back to the user key or free requests is allowed');
  assert.equal(err.requestId, 'req_test');
  assert.equal(plan.usable(), false, 'plan requests pause after a usage limit');
  assert.ok(plan.status().pausedUntil);

  // The same limit arriving mid-stream as response.failed.
  const plan2 = makePlan(mock, fakeBrowser(mock));
  await plan2.signIn({ timeoutMs: 5000 });
  mock.behaviour = { stream: sse([
    { type: 'response.output_text.delta', delta: 'start' },
    { type: 'response.failed', response: { error: { code: 'subscription_sharing_usage_limit_exceeded' } } },
  ]) };
  await assert.rejects(plan2.createResponse({ model: 'gpt-test', prompt: 'x' }), { code: 'subscription_sharing_usage_limit_exceeded' });
});

test('direct-admission errors with a detail body keep the status', async () => {
  const plan = makePlan(mock, fakeBrowser(mock));
  await plan.signIn({ timeoutMs: 5000 });
  mock.behaviour = { responsesStatus: 403, responsesBody: { detail: 'region not permitted' } };
  const err = await plan.createResponse({ model: 'gpt-test', prompt: 'x' }).catch((e) => e);
  assert.equal(err.code, 'forbidden');
  assert.equal(err.status, 403);
  assert.match(err.message, /region not permitted/);
});

test('refresh rotates the refresh token and stores the replacement', async () => {
  let clock = Date.now();
  const plan = makePlan(mock, fakeBrowser(mock), { now: () => clock });
  await plan.signIn({ timeoutMs: 5000 });
  assert.equal(plan.loadRecord().refresh_token, 'refresh-0');

  clock += 58 * 60 * 1000; // within the 5-minute refresh margin
  await plan.createResponse({ model: 'gpt-test', prompt: 'x' });
  let refreshCall = mock.calls.token.find((c) => c.grant_type === 'refresh_token');
  assert.equal(refreshCall.client_id, ISSUED_CLIENT_ID, 'refresh uses the issued client_id, not dynamic_agent_client');
  assert.equal(refreshCall.refresh_token, 'refresh-0');
  assert.equal(refreshCall.resource, 'https://api.openai.com/v1');
  assert.equal(refreshCall.scope, undefined, 'scope is omitted to keep the grant');
  assert.equal(mock.calls.responses.at(-1).auth, 'Bearer access-1');
  assert.equal(plan.loadRecord().refresh_token, 'refresh-1');

  clock += 58 * 60 * 1000;
  await plan.createResponse({ model: 'gpt-test', prompt: 'x' });
  const second = mock.calls.token.filter((c) => c.grant_type === 'refresh_token')[1];
  assert.equal(second.refresh_token, 'refresh-1', 'the rotated token is used next time');
  assert.equal(plan.loadRecord().refresh_token, 'refresh-2');
  assert.equal(fs.statSync(plan.authFile).mode & 0o777, process.platform === 'win32' ? fs.statSync(plan.authFile).mode & 0o777 : 0o600);
});

test('concurrent refreshes in one process are serialised', async () => {
  let clock = Date.now();
  const plan = makePlan(mock, fakeBrowser(mock), { now: () => clock });
  await plan.signIn({ timeoutMs: 5000 });
  clock += 58 * 60 * 1000;
  await Promise.all([plan.refresh(), plan.refresh(), plan.refresh()]);
  assert.equal(mock.calls.token.filter((c) => c.grant_type === 'refresh_token').length, 1);
  assert.equal(plan.loadRecord().refresh_token, 'refresh-1');
});

test('a revoked session (invalid_grant on refresh) asks the user to sign in again', async () => {
  let clock = Date.now();
  const plan = makePlan(mock, fakeBrowser(mock), { now: () => clock });
  await plan.signIn({ timeoutMs: 5000 });
  clock += 58 * 60 * 1000;
  mock.behaviour = { refreshError: 'invalid_grant' };
  const err = await plan.createResponse({ model: 'gpt-test', prompt: 'x' }).catch((e) => e);
  assert.equal(err.code, 'sign_in_required');
  assert.match(err.message, /sign in again/);
  const record = plan.loadRecord();
  assert.equal(record.refresh_token, null);
  assert.equal(record.access_token, null);
  assert.equal(record.client_id, ISSUED_CLIENT_ID, 'the client registration is kept for the next sign-in');
  assert.equal(plan.usable(), false);
});

test('model list keeps visibility "list" models in server order', async () => {
  const plan = makePlan(mock, fakeBrowser(mock));
  await plan.signIn({ timeoutMs: 5000 });
  const models = await plan.listModels();
  assert.deepEqual(models.map((m) => m.slug), ['gpt-test', 'gpt-mini']);
  assert.equal(await plan.chooseModel(), 'gpt-test');
  assert.equal(await plan.chooseModel('GPT-MINI'), 'gpt-mini');
  assert.equal(await plan.chooseModel('gpt-nope'), null);
});

test('sign-out revokes the refresh token and deletes the tokens', async () => {
  const plan = makePlan(mock, fakeBrowser(mock));
  await plan.signIn({ timeoutMs: 5000 });
  const r = await plan.signOut();
  assert.equal(r.revoked, true);
  assert.deepEqual(mock.calls.revoke[0], { token: 'refresh-0', token_type_hint: 'refresh_token', client_id: ISSUED_CLIENT_ID });
  const record = plan.loadRecord();
  assert.equal(record.access_token, undefined);
  assert.equal(record.refresh_token, undefined);
  assert.equal(record.id_token, undefined);
  assert.equal(record.client_id, ISSUED_CLIENT_ID);
  assert.equal(plan.status().signedIn, false);

  await plan.signOut({ forget: true });
  assert.equal(fs.existsSync(plan.authFile), false);
  assert.equal(fs.existsSync(plan.hostFile), true, 'the host id survives sign-out');
});

test('the welcome notice is shown once', async () => {
  const plan = makePlan(mock, fakeBrowser(mock));
  await plan.signIn({ timeoutMs: 5000 });
  const first = plan.takeWelcome();
  assert.match(first, /^You're using your ChatGPT plan\nEligible usage in this app uses your ChatGPT plan/);
  assert.equal(plan.takeWelcome(), null);
  const again = await plan.signIn({ timeoutMs: 5000 });
  assert.equal(again.showWelcome, false);
});

// ----- review fixes -----

test('a refresh saves the rotated tokens before verifying; a JWKS outage keeps and uses them', async () => {
  let clock = Date.now();
  const first = makePlan(mock, fakeBrowser(mock), { now: () => clock });
  await first.signIn({ timeoutMs: 5000 });
  // A second process with a cold key cache, while OpenAI's JWKS is unreachable.
  const plan = new ChatGPTPlan({ storageDir: first.storageDir, endpoints: mock.endpoints, apiBase: `${mock.base}/v1`, now: () => clock });
  clock += 58 * 60 * 1000;
  mock.behaviour = { refreshIdToken: true, jwksDown: true };
  const out = await plan.createResponse({ model: 'gpt-test', prompt: 'x' });
  assert.equal(out.text, 'Hello, world!');
  assert.equal(mock.calls.responses.at(-1).auth, 'Bearer access-1');
  let record = plan.loadRecord();
  assert.equal(record.refresh_token, 'refresh-1', 'the rotated refresh token is saved');
  assert.equal(record.id_token_unverified, true);
  assert.equal(record.needs_sign_in, false);

  // JWKS back: the next refresh presents refresh-1 (not the spent refresh-0) and verifies.
  clock += 58 * 60 * 1000;
  mock.behaviour = { refreshIdToken: true, nowS: Math.floor(clock / 1000) };
  await plan.createResponse({ model: 'gpt-test', prompt: 'x' });
  const refreshes = mock.calls.token.filter((c) => c.grant_type === 'refresh_token');
  assert.deepEqual(refreshes.map((c) => c.refresh_token), ['refresh-0', 'refresh-1']);
  record = plan.loadRecord();
  assert.equal(record.refresh_token, 'refresh-2');
  assert.equal(record.id_token_unverified, undefined);
});

test('a refreshed ID token for another account is not used, but kept so logout can revoke it', async () => {
  let clock = Date.now();
  const plan = makePlan(mock, fakeBrowser(mock), { now: () => clock });
  await plan.signIn({ timeoutMs: 5000 });
  clock += 58 * 60 * 1000;
  mock.behaviour = { refreshIdToken: true, refreshIdSubject: 'someone-else' };
  const before = mock.calls.responses.length;
  const err = await plan.createResponse({ model: 'gpt-test', prompt: 'x' }).catch((e) => e);
  assert.equal(err.code, 'account_mismatch');
  assert.equal(mock.calls.responses.length, before, 'the unverified access token is not used');
  const record = plan.loadRecord();
  assert.equal(record.refresh_token, 'refresh-1');
  assert.equal(record.id_token_rejected, true);
  assert.equal(plan.usable(), false);
  assert.equal(plan.status().signedIn, false);
  await plan.signOut();
  assert.equal(mock.calls.revoke.at(-1).token, 'refresh-1');
});

test('the refresh lock is not stolen from a live holder inside the worst-case window', async () => {
  const plan = makePlan(mock, fakeBrowser(mock));
  fs.mkdirSync(plan.storageDir, { recursive: true });
  fs.writeFileSync(plan.lockFile, String(process.pid));
  const t = (Date.now() - 100 * 1000) / 1000; // 100 s old: past the old 60 s threshold
  fs.utimesSync(plan.lockFile, t, t);
  await assert.rejects(plan._withFileLock(async () => 'ran', { timeoutMs: 300 }), { code: 'lock_timeout' });
  assert.ok(fs.existsSync(plan.lockFile));
});

test('a refresh lock past the stale threshold (by this.now()) or from a dead process is taken', async () => {
  // Stale by the injected clock.
  const real = Date.now();
  const plan = makePlan(mock, fakeBrowser(mock), { now: () => real + 200 * 1000 });
  fs.mkdirSync(plan.storageDir, { recursive: true });
  fs.writeFileSync(plan.lockFile, String(process.pid));
  assert.equal(await plan._withFileLock(async () => 'ran', { timeoutMs: 300 }), 'ran');

  // Fresh, but the process that wrote it has exited.
  const { spawnSync } = require('node:child_process');
  const dead = spawnSync(process.execPath, ['-e', 'process.stdout.write(String(process.pid))']).stdout.toString();
  const plan2 = makePlan(mock, fakeBrowser(mock));
  fs.mkdirSync(plan2.storageDir, { recursive: true });
  fs.writeFileSync(plan2.lockFile, dead);
  assert.equal(await plan2._withFileLock(async () => 'ran', { timeoutMs: 300 }), 'ran');
});

test('a usage-limit pause and a not-eligible answer survive a restart', async () => {
  const plan = makePlan(mock, fakeBrowser(mock));
  await plan.signIn({ timeoutMs: 5000 });
  mock.behaviour = { responsesStatus: 429, responsesBody: { error: { code: 'subscription_sharing_usage_limit_exceeded' } } };
  await assert.rejects(plan.createResponse({ model: 'gpt-test', prompt: 'x' }));
  const restarted = new ChatGPTPlan({ storageDir: plan.storageDir, endpoints: mock.endpoints, apiBase: `${mock.base}/v1` });
  assert.equal(restarted.usable(), false);
  assert.ok(restarted.status().pausedUntil);
  const calls = mock.calls.responses.length;
  await assert.rejects(restarted.createResponse({ model: 'gpt-test', prompt: 'x' }), { code: 'subscription_sharing_usage_limit_exceeded' });
  assert.equal(mock.calls.responses.length, calls, 'no request while paused');

  const plan2 = makePlan(mock, fakeBrowser(mock));
  await plan2.signIn({ timeoutMs: 5000 });
  mock.behaviour = { responsesStatus: 403, responsesBody: { error: { code: 'subscription_sharing_user_not_eligible' } } };
  await assert.rejects(plan2.createResponse({ model: 'gpt-test', prompt: 'x' }), { code: 'subscription_sharing_user_not_eligible' });
  const restarted2 = new ChatGPTPlan({ storageDir: plan2.storageDir, endpoints: mock.endpoints, apiBase: `${mock.base}/v1` });
  assert.equal(restarted2.usable(), false);
  assert.equal(restarted2.status().ineligible, true);
  const calls2 = mock.calls.responses.length;
  await assert.rejects(restarted2.createResponse({ model: 'gpt-test', prompt: 'x' }), { code: 'subscription_sharing_user_not_eligible' });
  assert.equal(mock.calls.responses.length, calls2, 'no request after not-eligible');

  // Signing in again clears both.
  mock.behaviour = {};
  const again = new ChatGPTPlan({ storageDir: plan2.storageDir, endpoints: mock.endpoints, apiBase: `${mock.base}/v1`, openBrowser: fakeBrowser(mock).open, preferredPort: 0 });
  await again.signIn({ timeoutMs: 5000 });
  assert.equal(again.usable(), true);
  assert.equal(again.loadRecord().ineligible, false);
});

test('a 401 from /responses refreshes and retries at most once per token', async () => {
  const plan = makePlan(mock, fakeBrowser(mock));
  await plan.signIn({ timeoutMs: 5000 });
  mock.behaviour = { responsesStatus: 401, responsesBody: { detail: 'nope' } };
  const refreshes = () => mock.calls.token.filter((c) => c.grant_type === 'refresh_token').length;

  await assert.rejects(plan.createResponse({ model: 'gpt-test', prompt: 'x' }), { code: 'unauthorized' });
  assert.equal(refreshes(), 1);
  assert.deepEqual(mock.calls.responses.map((c) => c.auth), ['Bearer access-0', 'Bearer access-1']);

  await assert.rejects(plan.createResponse({ model: 'gpt-test', prompt: 'x' }), { code: 'unauthorized' });
  assert.equal(refreshes(), 1, 'no second forced refresh for a token that was already refused after one');
  assert.equal(mock.calls.responses.length, 3);
});

test('model list drops models without visibility "list"', async () => {
  const plan = makePlan(mock, fakeBrowser(mock));
  await plan.signIn({ timeoutMs: 5000 });
  const slugs = (await plan.listModels()).map((m) => m.slug);
  assert.ok(!slugs.includes('gpt-no-visibility'));
  assert.ok(!slugs.includes('gpt-hidden'));
});

test('chatgpt login always prints the sign-in link, without id_token_hint', async () => {
  const browser = fakeBrowser(mock);
  const plan = makePlan(mock, browser);
  await plan.signIn({ timeoutMs: 5000 }); // so the next sign-in would carry id_token_hint to the browser
  const lines = [];
  const code = await runChatGPTCli(['login'], { out: (l) => lines.push(l), plan });
  assert.equal(code, 0, lines.join('\n'));
  const text = lines.join('\n');
  assert.ok(browser.seen.at(-1).id_token_hint, 'the browser URL carries id_token_hint');
  const link = lines.find((l) => l.trim().startsWith('http'));
  assert.ok(link, `a link is printed even though the browser opened:\n${text}`);
  assert.ok(!link.includes('id_token_hint'));
  assert.ok(new URL(link.trim()).searchParams.get('state'));
});

// ----- one lock for every auth.json read-modify-write -----

test('the lock file names its holder with a random owner token', async () => {
  const plan = makePlan(mock, fakeBrowser(mock));
  let inside;
  await plan._withFileLock(async () => { inside = readLockOwner(plan.lockFile); });
  assert.equal(inside.pid, process.pid);
  assert.match(inside.token, /^[A-Za-z0-9_-]{20,}$/);
  assert.equal(fs.existsSync(plan.lockFile), false, 'released after use');
  // Older clients wrote a bare pid.
  fs.writeFileSync(plan.lockFile, '4242');
  assert.deepEqual(readLockOwner(plan.lockFile), { pid: 4242, token: null });
});

test('a flag write waits for a refresh in another process and keeps its new tokens', async () => {
  const a = makePlan(mock, fakeBrowser(mock));
  await a.signIn({ timeoutMs: 5000 });
  const b = new ChatGPTPlan({ storageDir: a.storageDir, endpoints: mock.endpoints, apiBase: `${mock.base}/v1` });
  let release;
  const held = a._withFileLock(async () => {
    await new Promise((r) => { release = r; });
    await a.saveRecord({ ...a.loadRecord(), refresh_token: 'rotated-inside-lock' });
  });
  await new Promise((r) => setTimeout(r, 20));
  const flag = b._persistFlags({ ineligible: true });
  await new Promise((r) => setTimeout(r, 150));
  assert.notEqual(a.loadRecord().ineligible, true, 'the flag write waits for the lock');
  release();
  await held;
  await flag;
  const record = a.loadRecord();
  assert.equal(record.refresh_token, 'rotated-inside-lock', 'the rotated token is not overwritten');
  assert.equal(record.ineligible, true, 'the flag is merged in');
});

test('the welcome mark, a usage-limit pause and sign-in all go through the lock', async () => {
  const a = makePlan(mock, fakeBrowser(mock));
  await a.signIn({ timeoutMs: 5000 });
  const b = new ChatGPTPlan({ storageDir: a.storageDir, endpoints: mock.endpoints, apiBase: `${mock.base}/v1` });
  let lockedCalls = 0;
  for (const p of [a, b]) {
    const orig = p._withFileLock.bind(p);
    p._withFileLock = (fn, o) => { lockedCalls += 1; return orig(fn, o); };
  }
  assert.ok(a.takeWelcome());
  assert.equal(a.takeWelcome(), null, 'not handed out twice while the mark is being written');
  mock.behaviour = { responsesStatus: 429, responsesBody: { error: { code: 'subscription_sharing_usage_limit_exceeded' } } };
  await assert.rejects(b.createResponse({ model: 'gpt-test', prompt: 'x' }), { code: 'subscription_sharing_usage_limit_exceeded' });
  await a.flushWrites();
  const record = a.loadRecord();
  assert.equal(record.welcome_shown, true);
  assert.ok(record.paused_until, 'saved before the error is reported');
  assert.ok(lockedCalls >= 2, `${lockedCalls} locked writes`);

  // Sign-in's final save runs under the lock and keeps the welcome mark.
  mock.behaviour = {};
  lockedCalls = 0;
  const again = await a.signIn({ timeoutMs: 5000 });
  assert.ok(lockedCalls >= 1);
  assert.equal(again.showWelcome, false);
  assert.equal(a.loadRecord().welcome_shown, true);
  assert.equal(a.loadRecord().paused_until, null, 'signing in clears the pause');
});

test('writes are atomic: no temp files are left beside auth.json', async () => {
  const plan = makePlan(mock, fakeBrowser(mock));
  await plan.signIn({ timeoutMs: 5000 });
  await Promise.all([plan._persistFlags({ a: 1 }), plan.markWelcomeShown(), plan._persistFlags({ b: 2 })]);
  const leftovers = fs.readdirSync(plan.storageDir).filter((f) => f.endsWith('.tmp') || f.startsWith('refresh.lock'));
  assert.deepEqual(leftovers, []);
  const record = plan.loadRecord();
  assert.equal(record.a, 1);
  assert.equal(record.b, 2);
  assert.equal(record.welcome_shown, true);
  if (process.platform !== 'win32') assert.equal(fs.statSync(plan.authFile).mode & 0o777, 0o600);
});

test('breaking a stale lock never removes a newer lock taken meanwhile', () => {
  const plan = makePlan(mock, fakeBrowser(mock));
  fs.mkdirSync(plan.storageDir, { recursive: true });
  // Process B looks at a stale lock...
  fs.writeFileSync(plan.lockFile, JSON.stringify({ pid: 999999, token: 'stale-token' }));
  const old = (Date.now() - 600 * 1000) / 1000;
  fs.utimesSync(plan.lockFile, old, old);
  const seenStat = fs.statSync(plan.lockFile);
  const seenOwner = readLockOwner(plan.lockFile);
  // ...meanwhile process A breaks it and takes a fresh lock...
  fs.unlinkSync(plan.lockFile);
  fs.writeFileSync(plan.lockFile, JSON.stringify({ pid: process.pid, token: 'fresh-token' }));
  // ...then B acts on what it saw.
  assert.equal(plan._breakStaleLock(seenStat, seenOwner), false);
  assert.equal(readLockOwner(plan.lockFile).token, 'fresh-token', "A's lock stays");
  assert.equal(fs.existsSync(`${plan.lockFile}.break`), false, 'the break lock is released');

  // The lock B saw, still in place, is removed.
  const st = fs.statSync(plan.lockFile);
  assert.equal(plan._breakStaleLock(st, readLockOwner(plan.lockFile)), true);
  assert.equal(fs.existsSync(plan.lockFile), false);
});

test('a holder whose lock was replaced does not remove the new holder\'s lock', async () => {
  const plan = makePlan(mock, fakeBrowser(mock));
  await plan._withFileLock(async () => {
    fs.unlinkSync(plan.lockFile);
    fs.writeFileSync(plan.lockFile, JSON.stringify({ pid: process.pid, token: 'someone-else' }));
  });
  assert.equal(readLockOwner(plan.lockFile).token, 'someone-else');
});

test('processes racing for a stale lock never hold it at the same time', { timeout: 30000 }, async () => {
  const { spawn } = require('node:child_process');
  const dir = path.join(tmpDir(), 'chatgpt');
  fs.mkdirSync(dir, { recursive: true });
  const lockFile = path.join(dir, 'refresh.lock');
  fs.writeFileSync(lockFile, JSON.stringify({ pid: 999999, token: 'stale' }));
  const old = (Date.now() - 600 * 1000) / 1000;
  fs.utimesSync(lockFile, old, old);
  const log = path.join(dir, 'log.txt');
  const go = Date.now() + 700;
  const script = `
    const fs = require('fs');
    const { ChatGPTPlan } = require(${JSON.stringify(path.resolve(__dirname, '../../lib/chatgptPlan.js'))});
    const plan = new ChatGPTPlan({ storageDir: ${JSON.stringify(dir)} });
    const wait = ${go} - Date.now();
    setTimeout(async () => {
      for (let i = 0; i < 3; i++) {
        await plan._withFileLock(async () => {
          fs.appendFileSync(${JSON.stringify(log)}, 'in ' + process.pid + '\\n');
          await new Promise((r) => setTimeout(r, 15));
          fs.appendFileSync(${JSON.stringify(log)}, 'out ' + process.pid + '\\n');
        }, { timeoutMs: 20000 });
      }
    }, Math.max(0, wait));
  `;
  const kids = Array.from({ length: 6 }, () => spawn(process.execPath, ['-e', script], { stdio: 'inherit' }));
  const codes = await Promise.all(kids.map((k) => new Promise((r) => k.on('exit', r))));
  assert.deepEqual(codes, [0, 0, 0, 0, 0, 0]);
  const lines = fs.readFileSync(log, 'utf8').trim().split('\n');
  assert.equal(lines.length, 6 * 3 * 2);
  for (let i = 0; i < lines.length; i += 2) {
    const [kind, pid] = lines[i].split(' ');
    assert.equal(kind, 'in', `line ${i}: ${lines[i]}`);
    assert.equal(lines[i + 1], `out ${pid}`, `overlap at line ${i + 1}: ${lines.slice(i, i + 3).join(' | ')}`);
  }
  assert.deepEqual(fs.readdirSync(dir).filter((f) => f.startsWith('refresh.lock')), [], 'no lock or break lock left');
});

// ----- lock and write robustness -----

test('a dangling symlink at the lock path is broken, not spun on', { skip: process.platform === 'win32' }, async () => {
  const plan = makePlan(mock, fakeBrowser(mock));
  fs.mkdirSync(plan.storageDir, { recursive: true });
  fs.symlinkSync(path.join(plan.storageDir, 'nowhere'), plan.lockFile);
  const t0 = Date.now();
  assert.equal(await plan._withFileLock(async () => 'ran', { timeoutMs: 2000 }), 'ran');
  assert.ok(Date.now() - t0 < 1500, `took ${Date.now() - t0} ms`);
});

test('the lock wait gives up at its deadline even when breaking a stale lock keeps failing', async () => {
  const plan = makePlan(mock, fakeBrowser(mock));
  fs.mkdirSync(plan.storageDir, { recursive: true });
  fs.writeFileSync(plan.lockFile, JSON.stringify({ pid: 999999, token: 'stale' }));
  const old = (Date.now() - 600 * 1000) / 1000;
  fs.utimesSync(plan.lockFile, old, old);
  let attempts = 0;
  plan._breakStaleLock = () => { attempts += 1; return false; }; // e.g. EPERM on unlink
  const t0 = Date.now();
  await assert.rejects(plan._withFileLock(async () => 'ran', { timeoutMs: 300 }), { code: 'lock_timeout' });
  assert.ok(Date.now() - t0 < 2000);
  assert.ok(attempts > 0 && attempts < 200, `${attempts} break attempts: it sleeps between them`);
});

test('a lock whose owner cannot be read on release is still removed when it is the one this holder made',
  { skip: process.platform === 'win32' || (process.getuid && process.getuid() === 0) }, async () => {
    const plan = makePlan(mock, fakeBrowser(mock));
    await plan._withFileLock(async () => { fs.chmodSync(plan.lockFile, 0o000); });
    assert.equal(fs.existsSync(plan.lockFile), false);
  });

test('a rename refused for a moment (Windows EPERM/EBUSY) is retried', () => {
  let n = 0;
  const flaky = (a, b) => { n += 1; if (n < 3) { const e = new Error('busy'); e.code = n === 1 ? 'EPERM' : 'EBUSY'; throw e; } fs.renameSync(a, b); };
  const dir = tmpDir();
  const file = path.join(dir, 'auth.json');
  writeJsonAtomic(file, { v: 1 }, { rename: flaky });
  assert.equal(n, 3);
  assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), { v: 1 });
  assert.deepEqual(fs.readdirSync(dir).filter((f) => f.endsWith('.tmp')), []);
  const enoent = () => { const e = new Error('gone'); e.code = 'ENOENT'; throw e; };
  assert.throws(() => renameWithRetry('a', 'b', { rename: enoent }), { code: 'ENOENT' }, 'other errors are not retried');
});

test('a rotated refresh token whose rename kept failing is recovered from its temp file under the lock', async () => {
  const plan = makePlan(mock, fakeBrowser(mock));
  await plan.signIn({ timeoutMs: 5000 });
  const before = plan.loadRecord();
  const refused = () => { const e = new Error('locked by antivirus'); e.code = 'EPERM'; throw e; };
  assert.throws(() => writeJsonAtomic(plan.authFile, { ...before, refresh_token: 'rotated' }, { rename: refused }), { code: 'EPERM' });
  assert.equal(plan.loadRecord().refresh_token, before.refresh_token, 'the old file is untouched');
  assert.equal(fs.readdirSync(plan.storageDir).filter((f) => f.endsWith('.tmp')).length, 1, 'the new tokens are kept in the temp file');
  const seen = await plan._withFileLock(async () => plan.loadRecord().refresh_token);
  assert.equal(seen, 'rotated');
  assert.deepEqual(fs.readdirSync(plan.storageDir).filter((f) => f.endsWith('.tmp')), []);
  // An older leftover never replaces a newer file.
  fs.writeFileSync(`${plan.authFile}.1.abc.tmp`, JSON.stringify({ refresh_token: 'older' }));
  const past = (Date.now() - 60 * 1000) / 1000;
  fs.utimesSync(`${plan.authFile}.1.abc.tmp`, past, past);
  assert.deepEqual(await recoverAuthTmp(plan.authFile), { installed: false, pending: null });
  assert.equal(plan.loadRecord().refresh_token, 'rotated');
  assert.equal(fs.existsSync(`${plan.authFile}.1.abc.tmp`), false);
});

test('a newer temp file that still cannot be put in place is the record for the locked section, and is kept', async () => {
  const plan = makePlan(mock, fakeBrowser(mock));
  await plan.signIn({ timeoutMs: 5000 });
  const before = plan.loadRecord();
  const refused = () => { const e = new Error('locked by antivirus'); e.code = 'EPERM'; throw e; };
  assert.throws(() => writeJsonAtomic(plan.authFile, { ...before, refresh_token: 'rotated' }, { rename: refused }), { code: 'EPERM' });
  // An older leftover, still newer than auth.json, must not be installed when the newest one fails.
  const older = `${plan.authFile}.1.abc.tmp`;
  fs.writeFileSync(older, JSON.stringify({ ...before, refresh_token: 'older' }));
  const newest = fs.readdirSync(plan.storageDir).find((f) => f.endsWith('.tmp') && !f.endsWith('.1.abc.tmp'));
  const t = fs.statSync(path.join(plan.storageDir, newest)).mtimeMs / 1000;
  fs.utimesSync(older, t - 0.5, t - 0.5);
  const fileTime = (t - 1);
  fs.utimesSync(plan.authFile, fileTime, fileTime);
  plan._renameForTests = refused; // the rename stays refused for this whole access
  const seen = await plan._withFileLock(async () => plan.loadRecord().refresh_token);
  assert.equal(seen, 'rotated', 'the section sees the newest record, not the stale file');
  assert.equal(JSON.parse(fs.readFileSync(plan.authFile, 'utf8')).refresh_token, before.refresh_token, 'the file is unchanged');
  assert.ok(fs.existsSync(path.join(plan.storageDir, newest)), 'the newest temp file is kept for next time');
  assert.equal(fs.existsSync(older), false, 'the older leftover is removed, not installed');
  assert.equal(plan.loadRecord().refresh_token, before.refresh_token, 'outside the section the override is gone');
  // A refresh inside such a section uses the newest refresh token.
  delete plan._renameForTests;
  const again = await plan._withFileLock(async () => plan.loadRecord().refresh_token);
  assert.equal(again, 'rotated');
  assert.equal(JSON.parse(fs.readFileSync(plan.authFile, 'utf8')).refresh_token, 'rotated', 'installed once the rename works');
  assert.deepEqual(fs.readdirSync(plan.storageDir).filter((f) => f.endsWith('.tmp')), []);
});

test('a save refused inside a locked section leaves its record as the current one for the rest of the section', async () => {
  const plan = makePlan(mock, fakeBrowser(mock));
  await plan.signIn({ timeoutMs: 5000 });
  const before = plan.loadRecord();
  plan._renameForTests = () => { const e = new Error('busy'); e.code = 'EBUSY'; throw e; };
  const seen = await plan._withFileLock(async () => {
    await assert.rejects(plan.saveRecord({ ...before, refresh_token: 'rotated-2' }), { code: 'EBUSY' });
    return plan.loadRecord().refresh_token;
  });
  assert.equal(seen, 'rotated-2');
  delete plan._renameForTests;
  assert.equal(await plan._withFileLock(async () => plan.loadRecord().refresh_token), 'rotated-2');
});

test('sign-out deletes leftover temp files, so recovery cannot bring the tokens back', async () => {
  for (const forget of [true, false]) {
    const plan = makePlan(mock, fakeBrowser(mock));
    await plan.signIn({ timeoutMs: 5000 });
    const before = plan.loadRecord();
    const refused = () => { const e = new Error('locked'); e.code = 'EPERM'; throw e; };
    assert.throws(() => writeJsonAtomic(plan.authFile, { ...before, refresh_token: 'leftover' }, { rename: refused }));
    fs.writeFileSync(`${plan.authFile}.77.def.tmp`, JSON.stringify({ ...before, refresh_token: 'other-leftover' }));
    plan._renameForTests = refused; // recovery at sign-out can't install them either
    await plan.signOut({ forget });
    delete plan._renameForTests;
    const left = fs.readdirSync(plan.storageDir).filter((f) => f.endsWith('.tmp'));
    if (forget) assert.deepEqual(left, [], 'forget: no temp files are left');
    // Without forget the refused save of the signed-out record leaves only its own temp file.
    for (const f of left) assert.equal(JSON.parse(fs.readFileSync(path.join(plan.storageDir, f), 'utf8')).refresh_token, undefined);
    assert.ok(left.length <= 1);
    const after = await plan._withFileLock(async () => plan.loadRecord());
    if (forget) assert.equal(after, null, 'nothing comes back after forget');
    else {
      assert.equal(after.refresh_token, undefined);
      assert.equal(after.access_token, undefined);
    }
  }
});

test('the async rename retry waits without blocking the event loop', async () => {
  let n = 0;
  const flaky = (a, b) => { n += 1; if (n < 4) { const e = new Error('busy'); e.code = 'EBUSY'; throw e; } };
  let ticks = 0;
  const timer = setInterval(() => { ticks += 1; }, 5);
  await renameWithRetryAsync('a', 'b', { rename: flaky, delays: [40, 40, 40] });
  clearInterval(timer);
  assert.equal(n, 4);
  assert.ok(ticks >= 5, `${ticks} timer ticks ran during the retries`);
  const enoent = () => { const e = new Error('gone'); e.code = 'ENOENT'; throw e; };
  await assert.rejects(renameWithRetryAsync('a', 'b', { rename: enoent }), { code: 'ENOENT' });
});

test('processes that die while holding the lock: the rest never hold it at the same time', { timeout: 60000 }, async () => {
  const { spawn } = require('node:child_process');
  const lib = process.env.POLYDEV_LOCK_LIB || path.resolve(__dirname, '../../lib/chatgptPlan.js');
  const dir = path.join(tmpDir(), 'chatgpt');
  fs.mkdirSync(dir, { recursive: true });
  const log = path.join(dir, 'log.txt');
  const go = Date.now() + 800;
  const kids = 10;
  const rounds = 4;
  const dieAt = (i) => 1 + (i % 3); // every holder dies once, holding the lock, after 1-3 full rounds
  const script = (index) => `
    const fs = require('fs');
    const { ChatGPTPlan } = require(${JSON.stringify(lib)});
    const plan = new ChatGPTPlan({ storageDir: ${JSON.stringify(dir)} });
    const say = (w) => fs.appendFileSync(${JSON.stringify(log)}, w + ' ' + process.pid + '\\n');
    setTimeout(async () => {
      for (let i = 0; i < ${rounds}; i++) {
        await plan._withFileLock(async () => {
          say('in');
          if (i === ${dieAt(index)}) { say('died'); process.exit(0); } // leaves the lock behind
          await new Promise((r) => setTimeout(r, 5));
          say('out');
        }, { timeoutMs: 40000 });
      }
    }, Math.max(0, ${go} - Date.now()));
  `;
  const procs = Array.from({ length: kids }, (_, i) => spawn(process.execPath, ['-e', script(i)], { stdio: 'inherit' }));
  const codes = await Promise.all(procs.map((k) => new Promise((r) => k.on('exit', r))));
  assert.deepEqual(codes, Array(kids).fill(0));
  const lines = fs.readFileSync(log, 'utf8').trim().split('\n');
  for (let i = 0; i < lines.length; i += 2) {
    const [kind, pid] = lines[i].split(' ');
    assert.equal(kind, 'in', `line ${i}: ${lines.slice(i, i + 3).join(' | ')}`);
    assert.ok(lines[i + 1] === `out ${pid}` || lines[i + 1] === `died ${pid}`, `overlap at line ${i + 1}: ${lines.slice(i, i + 3).join(' | ')}`);
  }
  assert.equal(lines.filter((l) => l.startsWith('died')).length, kids);
  const expected = Array.from({ length: kids }, (_, i) => dieAt(i) * 2 + 2).reduce((a, b) => a + b, 0);
  assert.equal(lines.length, expected, 'every round ran');
});
