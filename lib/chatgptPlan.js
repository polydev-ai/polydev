'use strict';

/**
 * Sign in with ChatGPT: ChatGPT plan usage for the local Polydev client.
 *
 * Follows OpenAI's open-source "ChatGPT plan usage" contract
 * (https://developers.openai.com/siwc/token-sharing-open-source):
 *   - OAuth 2.0 authorization code + PKCE (S256) + OpenID Connect, system browser,
 *     loopback redirect http://127.0.0.1:<port>/auth/callback, fresh state/nonce/PKCE each time.
 *   - First sign-in registers a client with client_id=dynamic_agent_client; the issued client_id
 *     is saved and reused. A stable per-installation ext_agent_host_id (urn:uuid:...) is saved
 *     before the first sign-in.
 *   - The ID token is verified (RS256 signature against the JWKS, issuer, audience, expiry, nonce)
 *     and plan usage is on only when the granted scopes include chatgpt.tokens.use.direct.
 *   - Inference: POST https://api.openai.com/v1/responses with the access token, store:false,
 *     stream:true; success only after response.completed.
 *   - Refresh tokens rotate. Every read-modify-write of auth.json (refresh, sign-in, sign-out,
 *     the usage-limit / not-eligible flags, the welcome mark) runs under one lock file shared by
 *     all Polydev processes on this machine, and every write is atomic (temp file + rename, 0600).
 *
 * Tokens and the client_id stay on this machine in a 0600 file under ~/.polydev/chatgpt/.
 * Nothing here sends them to polydev.ai or writes them to logs.
 */

const crypto = require('crypto');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const ISSUER = 'https://auth.openai.com';
const DISCOVERY_URL = `${ISSUER}/.well-known/openid-configuration`;
const DEFAULT_ENDPOINTS = Object.freeze({
  issuer: ISSUER,
  authorization_endpoint: 'https://auth.openai.com/api/accounts/authorize',
  token_endpoint: 'https://auth.openai.com/api/accounts/oauth/token',
  revocation_endpoint: 'https://auth.openai.com/api/accounts/oauth/revoke',
  jwks_uri: 'https://auth.openai.com/.well-known/jwks.json',
});
const API_BASE = 'https://api.openai.com/v1';
const RESOURCE = 'https://api.openai.com/v1';
const PLAN_SCOPE = 'chatgpt.tokens.use.direct';
const SCOPES = ['openid', 'profile', 'email', 'offline_access', 'resource.invoke', PLAN_SCOPE];
const DYNAMIC_CLIENT_ID = 'dynamic_agent_client';
const AGENT_NAME = 'Polydev';
const CALLBACK_PATH = '/auth/callback';
const PREFERRED_PORT = 1455;
const MANAGE_USAGE_URL = 'https://chatgpt.com/settings/usage';
const PAID_BY_LABEL = 'ChatGPT plan';

// Wording from OpenAI's UI/UX guidelines for ChatGPT plan usage.
const TEXT = Object.freeze({
  action: 'Continue with ChatGPT',
  welcomeTitle: "You're using your ChatGPT plan",
  welcomeBody: `Eligible usage in this app uses your ChatGPT plan. You can manage usage in ChatGPT settings: ${MANAGE_USAGE_URL}`,
  inUse: 'Using ChatGPT plan',
  manageUsage: 'Manage usage',
  limitReached: 'Usage limit reached',
});

// Refresh-token errors that mean the token set is unusable (sign in again).
const UNUSABLE_REFRESH_CODES = new Set([
  'invalid_grant',
  'invalid_refresh_token',
  'token_expired',
  'refresh_token_expired',
  'refresh_token_invalidated',
  'refresh_token_reused',
]);

const REFRESH_MARGIN_MS = 5 * 60 * 1000;
const CLOCK_SKEW_S = 5;
const USAGE_LIMIT_PAUSE_MS = 15 * 60 * 1000;
const MODELS_CACHE_MS = 10 * 60 * 1000;
// Worst case inside the refresh lock is about 60 s (discovery 15 s + token 30 s + JWKS 15 s).
const LOCK_STALE_MS = 180 * 1000;
const LOCK_WAIT_MS = 90 * 1000;
// The break lock (see _breakStaleLock) is held for a few synchronous file calls.
const BREAK_STALE_MS = 10 * 1000;
// How long a failed plan request waits for its pause / not-eligible flag to be saved.
const FLAG_WRITE_WAIT_MS = 3000;

/**
 * The line shown with an answer that something else paid for after the ChatGPT plan hit its usage
 * limit. Neutral wording: it says what happened and what paid, nothing more.
 *   usageLimitNote('your API key') -> "Your ChatGPT plan hit its usage limit; this answer was paid by your API key."
 */
function usageLimitNote(paidBy, model) {
  if (!paidBy) return 'Your ChatGPT plan hit its usage limit; each answer below says what paid for it.';
  return `Your ChatGPT plan hit its usage limit; ${model ? `the ${model} answer` : 'this answer'} was paid by ${paidBy}.`;
}

class ChatGPTPlanError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.name = 'ChatGPTPlanError';
    this.code = code;
    Object.assign(this, extra);
  }
}

// ---------- small helpers ----------

function base64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function randomValue(bytes = 32) {
  return base64url(crypto.randomBytes(bytes));
}

/** PKCE pair (RFC 7636), S256 only. */
function createPkce() {
  const verifier = randomValue(32); // 43 chars
  const challenge = base64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge, method: 'S256' };
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

function parseScopes(scope) {
  if (Array.isArray(scope)) return [...new Set(scope.filter(Boolean))].sort();
  if (typeof scope !== 'string') return [];
  return [...new Set(scope.split(/[\s+]+/).filter(Boolean))].sort();
}

/**
 * Who holds a lock file: `{ pid, token }`. Lock files hold JSON `{"pid":..,"token":..}`; older
 * clients wrote only the pid, which reads as `{ pid, token: null }`. Null when it can't be read.
 */
function readLockOwner(lockFile) {
  let raw;
  try { raw = fs.readFileSync(lockFile, 'utf8'); } catch (_) { return null; }
  try {
    const o = JSON.parse(raw);
    if (o && typeof o === 'object') return { pid: parseInt(o.pid, 10), token: typeof o.token === 'string' ? o.token : null };
  } catch (_) { /* a bare pid, or a file still being written */ }
  return { pid: parseInt(raw, 10), token: null };
}

/** True when the lock names a process on this machine that no longer exists. */
function lockOwnerGone(owner) {
  const pid = owner ? owner.pid : NaN;
  if (!Number.isInteger(pid) || pid <= 0 || pid === process.pid) return false;
  try {
    process.kill(pid, 0);
    return false;
  } catch (e) {
    return e.code === 'ESRCH';
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isOpenAIModel(model) {
  if (typeof model !== 'string') return false;
  const m = model.trim().toLowerCase().replace(/^openai\//, '');
  return /^(gpt|chatgpt|codex|o\d)/.test(m);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  try { fs.chmodSync(dir, 0o700); } catch (_) { /* not supported on this platform */ }
}

/** Block this thread for `ms` (only for a few short retries inside synchronous file code). */
function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// Windows may refuse a rename for a moment while antivirus or an indexer has the file open.
const RENAME_RETRY_CODES = new Set(['EPERM', 'EACCES', 'EBUSY']);
const RENAME_RETRY_DELAYS_MS = [10, 20, 40, 80, 160, 320];

/** renameSync, retried briefly on the transient Windows errors (as graceful-fs does). For sync callers. */
function renameWithRetry(from, to, { delays = RENAME_RETRY_DELAYS_MS, rename = fs.renameSync } = {}) {
  for (let i = 0; ; i++) {
    try {
      rename(from, to);
      return;
    } catch (e) {
      if (!RENAME_RETRY_CODES.has(e.code) || i >= delays.length) throw e;
      sleepSync(delays[i]);
    }
  }
}

/** The same retry without blocking the event loop, for async callers. */
async function renameWithRetryAsync(from, to, { delays = RENAME_RETRY_DELAYS_MS, rename = fs.renameSync } = {}) {
  for (let i = 0; ; i++) {
    try {
      rename(from, to);
      return;
    } catch (e) {
      if (!RENAME_RETRY_CODES.has(e.code) || i >= delays.length) throw e;
      await sleep(delays[i]);
    }
  }
}

function writeTmpJson(file, data) {
  ensureDir(path.dirname(file));
  const tmp = `${file}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`;
  const fd = fs.openSync(tmp, 'wx', 0o600);
  try {
    fs.writeFileSync(fd, JSON.stringify(data, null, 2) + '\n');
    try { fs.fsyncSync(fd); } catch (_) { /* best effort */ }
  } finally {
    fs.closeSync(fd);
  }
  try { fs.chmodSync(tmp, 0o600); } catch (_) { /* best effort */ }
  return tmp;
}

/**
 * Atomic write with owner-only permissions (0600): a temp file beside the target, then a rename.
 * If the rename still fails after its retries, the temp file is kept (it may hold a freshly
 * rotated refresh token); recoverAuthTmp() picks it up on the next locked access.
 */
function writeJsonAtomic(file, data, { rename } = {}) {
  const tmp = writeTmpJson(file, data);
  renameWithRetry(tmp, file, rename ? { rename } : undefined);
  try { fs.chmodSync(file, 0o600); } catch (_) { /* best effort */ }
}

/** writeJsonAtomic for async callers: the rename retries wait without blocking the event loop. */
async function writeJsonAtomicAsync(file, data, { rename } = {}) {
  const tmp = writeTmpJson(file, data);
  await renameWithRetryAsync(tmp, file, rename ? { rename } : undefined);
  try { fs.chmodSync(file, 0o600); } catch (_) { /* best effort */ }
}

function authTmpNames(file) {
  const dir = path.dirname(file);
  const base = path.basename(file);
  const re = new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.\\d+\\.[0-9a-f]+\\.tmp$`);
  try { return fs.readdirSync(dir).filter((n) => re.test(n)).map((n) => path.join(dir, n)); } catch (_) { return []; }
}

/** Delete every leftover `<file>.<pid>.<hex>.tmp` (sign-out: none may bring tokens back). */
function removeAuthTmps(file) {
  for (const full of authTmpNames(file)) {
    try { fs.unlinkSync(full); } catch (_) { /* gone */ }
  }
}

/**
 * Put back an auth.json write whose rename failed. The newest readable `<file>.<pid>.<hex>.tmp`
 * that is newer than the file replaces it; older ones are removed. If that newest one can't be
 * installed (the rename is still refused), it is kept and returned as `pending`: it is the
 * current record, and the caller must use it instead of the stale file (refreshing with the
 * file's spent refresh token would end the sign-in). Only call this while holding the lock (every
 * auth.json write runs under it, so no temp file is still being written).
 * @returns {Promise<{ installed: boolean, pending: object | null }>}
 */
async function recoverAuthTmp(file, { rename } = {}) {
  const names = authTmpNames(file);
  if (!names.length) return { installed: false, pending: null };
  let current = 0;
  try { current = fs.statSync(file).mtimeMs; } catch (_) { /* no file yet */ }
  const candidates = names.map((full) => {
    try { return { full, mtimeMs: fs.statSync(full).mtimeMs }; } catch (_) { return null; }
  }).filter(Boolean).sort((a, b) => b.mtimeMs - a.mtimeMs);
  let installed = false;
  let pending = null;
  let decided = false; // the newest readable newer candidate was handled; the rest are older
  for (const c of candidates) {
    if (!decided && c.mtimeMs > current) {
      let data = null;
      try { data = JSON.parse(fs.readFileSync(c.full, 'utf8')); } catch (_) { /* unreadable */ }
      if (data && typeof data === 'object') {
        decided = true;
        try {
          await renameWithRetryAsync(c.full, file, rename ? { rename } : undefined);
          try { fs.chmodSync(file, 0o600); } catch (_) { /* best effort */ }
          installed = true;
        } catch (_) {
          pending = data; // kept on disk for the next time
        }
        continue;
      }
    }
    try { fs.unlinkSync(c.full); } catch (_) { /* gone */ }
  }
  return { installed, pending };
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    if (e instanceof SyntaxError) return null; // corrupt file: treat as absent
    throw e;
  }
}

function decodeJwt(token) {
  if (typeof token !== 'string') throw new ChatGPTPlanError('invalid_id_token', 'The ID token is missing.');
  const parts = token.split('.');
  if (parts.length !== 3) throw new ChatGPTPlanError('invalid_id_token', 'The ID token is malformed.');
  try {
    return {
      header: JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')),
      payload: JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')),
      signingInput: `${parts[0]}.${parts[1]}`,
      signature: Buffer.from(parts[2], 'base64url'),
    };
  } catch (_) {
    throw new ChatGPTPlanError('invalid_id_token', 'The ID token could not be decoded.');
  }
}

function requestIdOf(res) {
  try {
    return res.headers.get('openai-request-id') || res.headers.get('x-request-id') || null;
  } catch (_) {
    return null;
  }
}

function authorizeUrl(endpoint, params) {
  const url = new URL(endpoint);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  return url.toString();
}

function callbackPage(title, body) {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;color:#111;background:#fff}
@media (prefers-color-scheme: dark){body{color:#eee;background:#111}}</style></head>
<body><h1>${esc(title)}</h1><p>${esc(body)}</p></body></html>`;
}

/**
 * Validate a loopback callback against the pending attempt.
 * Throws on a state mismatch so no code from an unknown attempt is ever exchanged.
 */
function parseCallback(requestUrl, expectedState) {
  const url = new URL(requestUrl, 'http://127.0.0.1');
  const q = url.searchParams;
  if (!safeEqual(q.get('state') || '', expectedState)) {
    throw new ChatGPTPlanError('state_mismatch', 'The sign-in response did not match this sign-in attempt.');
  }
  if (q.get('error')) {
    return { error: q.get('error'), errorDescription: q.get('error_description') || null };
  }
  const code = q.get('code');
  if (!code) throw new ChatGPTPlanError('missing_code', 'The sign-in response had no authorization code.');
  return { code, clientId: q.get('client_id') || null, scope: q.get('scope') || null };
}

/**
 * Start the loopback listener before the browser opens. Resolves `result` with the first
 * callback whose state matches; callbacks with another state get a 400 and are ignored.
 */
function startCallbackListener({ state, preferredPort = PREFERRED_PORT, timeoutMs = 300000 }) {
  return new Promise((resolveListener, rejectListener) => {
    let settle;
    const result = new Promise((resolve, reject) => { settle = { resolve, reject }; });
    let done = false;
    let rejectedCallbacks = 0;
    const server = http.createServer((req, res) => {
      let url;
      try { url = new URL(req.url, 'http://127.0.0.1'); } catch (_) { res.writeHead(400).end(); return; }
      if (url.pathname !== CALLBACK_PATH) { res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found'); return; }
      let cb;
      try {
        cb = parseCallback(req.url, state);
      } catch (e) {
        rejectedCallbacks += 1;
        res.writeHead(400, { 'content-type': 'text/html; charset=utf-8' })
          .end(callbackPage('Sign-in not completed', `${e.message} Return to Polydev and try again.`));
        if (e.code !== 'state_mismatch') finish(() => settle.reject(e));
        return;
      }
      const ok = !cb.error;
      res.writeHead(ok ? 200 : 400, { 'content-type': 'text/html; charset=utf-8' }).end(ok
        ? callbackPage('Signed in to ChatGPT', 'You can close this tab and return to Polydev.')
        : callbackPage('Sign-in not completed', 'ChatGPT did not grant access. You can close this tab.'));
      finish(() => settle.resolve(cb));
    });
    const timer = setTimeout(() => finish(() => settle.reject(
      new ChatGPTPlanError('timeout', 'Timed out waiting for ChatGPT sign-in in the browser.'))), timeoutMs);
    timer.unref?.();
    function finish(fn) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      server.close();
      fn();
    }
    const listen = (port) => {
      server.once('error', (err) => {
        if (port !== 0 && err.code === 'EADDRINUSE') { listen(0); return; }
        rejectListener(err);
      });
      server.listen(port, '127.0.0.1', () => {
        const actualPort = server.address().port;
        resolveListener({
          redirectUri: `http://127.0.0.1:${actualPort}${CALLBACK_PATH}`,
          result,
          get rejectedCallbacks() { return rejectedCallbacks; },
          close: () => finish(() => settle.reject(new ChatGPTPlanError('cancelled', 'Sign-in was cancelled.'))),
        });
      });
    };
    listen(preferredPort);
  });
}

async function defaultOpenBrowser(url) {
  const mod = await import('open');
  await mod.default(url);
}

// ---------- the client ----------

class ChatGPTPlan {
  constructor(options = {}) {
    this.storageDir = options.storageDir || process.env.POLYDEV_CHATGPT_DIR || path.join(os.homedir(), '.polydev', 'chatgpt');
    this.authFile = path.join(this.storageDir, 'auth.json');
    this.hostFile = path.join(this.storageDir, 'host.json');
    this.lockFile = path.join(this.storageDir, 'refresh.lock');
    this.fetch = options.fetch || globalThis.fetch;
    this.discoveryUrl = options.discoveryUrl || DISCOVERY_URL;
    this.fixedEndpoints = options.endpoints || null; // tests pass these
    this.apiBase = (options.apiBase || API_BASE).replace(/\/$/, '');
    this.openBrowser = options.openBrowser || defaultOpenBrowser;
    this.preferredPort = options.preferredPort ?? PREFERRED_PORT;
    this.now = options.now || (() => Date.now());
    this._endpoints = null;
    this._jwks = null;
    this._refreshChain = Promise.resolve();
    this._modelsCache = null;
    // Mirrors of the persisted `paused_until` / `ineligible` fields (see planFlags()).
    this.pausedUntil = 0; // set after a usage-limit error
    this.ineligible = false; // set after subscription_sharing_user_not_eligible
    // Access tokens that already led to one forced refresh after a 401 (or came out of one and
    // were refused too). A 401 with one of these is reported, not refreshed again.
    this._unauthorizedTokens = new Set();
    this._pendingWrites = new Set();
    this._welcomeTaken = false; // the welcome text was handed out by this process
  }

  // ----- storage -----

  getHostId() {
    const saved = readJson(this.hostFile);
    if (saved && typeof saved.ext_agent_host_id === 'string' && saved.ext_agent_host_id) return saved.ext_agent_host_id;
    const id = `urn:uuid:${crypto.randomUUID()}`;
    writeJsonAtomic(this.hostFile, { ext_agent_host_id: id, created_at: new Date(this.now()).toISOString() });
    return id;
  }

  loadRecord() {
    // Inside a locked section whose newest record could not be put in place yet (see
    // recoverAuthTmp), that record is the current one.
    if (this._pendingRecord) return this._pendingRecord;
    return readJson(this.authFile);
  }

  async saveRecord(record) {
    try {
      await writeJsonAtomicAsync(this.authFile, record, this._renameForTests ? { rename: this._renameForTests } : undefined);
    } catch (e) {
      // The temp file holding `record` is kept; for the rest of this locked section it is the
      // current record.
      if (this._inFileLock) this._pendingRecord = record;
      throw e;
    }
    this._pendingRecord = null; // the file now holds the newest record
  }

  /**
   * The usage-limit pause and the not-eligible answer are saved in auth.json (0600), so a new
   * process does not retry a request ChatGPT already refused. Signing in again clears both.
   */
  planFlags() {
    const record = this.loadRecord();
    const saved = record && record.paused_until ? Date.parse(record.paused_until) || 0 : 0;
    const pausedUntil = Math.max(this.pausedUntil || 0, saved);
    const ineligible = !!(this.ineligible || (record && record.ineligible));
    return { pausedUntil, ineligible };
  }

  /**
   * Merge `patch` into auth.json under the lock (re-read inside it, so a refresh or sign-in by
   * another process is never overwritten with older tokens). Never rejects: the in-memory flag
   * still applies to this process if the write fails. Pending writes are tracked so a caller can
   * wait for them (createResponse does before it reports the error).
   */
  _persistFlags(patch) {
    return this._track(this.withRefreshLock(async () => {
      const record = this.loadRecord();
      if (record) await this.saveRecord({ ...record, ...patch });
    }).catch(() => {}));
  }

  /** Remember a background write until it settles. */
  _track(promise) {
    this._pendingWrites.add(promise);
    promise.finally(() => this._pendingWrites.delete(promise)).catch(() => {});
    return promise;
  }

  /** Wait for background writes (flags, welcome mark) started so far. */
  async flushWrites() {
    await Promise.all([...this._pendingWrites]);
  }

  // ----- OIDC metadata -----

  async getEndpoints() {
    if (this.fixedEndpoints) return this.fixedEndpoints;
    if (this._endpoints) return this._endpoints;
    try {
      const res = await this.fetch(this.discoveryUrl, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
      if (res.ok) {
        const doc = await res.json();
        if (doc && doc.issuer === ISSUER && doc.authorization_endpoint && doc.token_endpoint && doc.jwks_uri) {
          this._endpoints = {
            issuer: doc.issuer,
            authorization_endpoint: doc.authorization_endpoint,
            token_endpoint: doc.token_endpoint,
            revocation_endpoint: doc.revocation_endpoint || DEFAULT_ENDPOINTS.revocation_endpoint,
            jwks_uri: doc.jwks_uri,
          };
          return this._endpoints;
        }
      }
    } catch (_) { /* fall back to the documented endpoints */ }
    this._endpoints = { ...DEFAULT_ENDPOINTS };
    return this._endpoints;
  }

  async getJwk(kid) {
    const find = () => (this._jwks || []).find((k) => (kid ? k.kid === kid : true) && (!k.use || k.use === 'sig'));
    let jwk = find();
    if (!jwk) {
      const ep = await this.getEndpoints();
      let res;
      try {
        res = await this.fetch(ep.jwks_uri, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
      } catch (e) {
        throw new ChatGPTPlanError('jwks_unavailable', `Could not load OpenAI's signing keys: ${e.message}`, { transient: true });
      }
      if (!res.ok) throw new ChatGPTPlanError('jwks_unavailable', `Could not load OpenAI's signing keys (HTTP ${res.status}).`, { transient: true });
      const doc = await res.json();
      this._jwks = Array.isArray(doc.keys) ? doc.keys : [];
      jwk = find();
    }
    if (!jwk) throw new ChatGPTPlanError('invalid_id_token', 'The ID token was signed with an unknown key.');
    return jwk;
  }

  /** Verify an OpenAI ID token: RS256 signature, issuer, audience, expiry, nonce, subject. */
  async verifyIdToken(idToken, { clientId, nonce, expectedSubject, requireNonce = true }) {
    const { header, payload, signingInput, signature } = decodeJwt(idToken);
    if (header.alg !== 'RS256') throw new ChatGPTPlanError('invalid_id_token', `Unexpected ID token algorithm ${header.alg}.`);
    const jwk = await this.getJwk(header.kid);
    let key;
    try {
      key = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    } catch (_) {
      throw new ChatGPTPlanError('invalid_id_token', 'OpenAI signing key could not be read.');
    }
    if (!crypto.verify('RSA-SHA256', Buffer.from(signingInput), key, signature)) {
      throw new ChatGPTPlanError('invalid_id_token', 'The ID token signature is not valid.');
    }
    const ep = await this.getEndpoints();
    if (payload.iss !== ep.issuer) throw new ChatGPTPlanError('invalid_id_token', 'The ID token issuer is wrong.');
    const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    if (!clientId || !aud.includes(clientId)) throw new ChatGPTPlanError('invalid_id_token', 'The ID token was issued for another client.');
    if (aud.length > 1 && payload.azp !== undefined && payload.azp !== clientId) {
      throw new ChatGPTPlanError('invalid_id_token', 'The ID token authorized party is wrong.');
    }
    const nowS = Math.floor(this.now() / 1000);
    if (typeof payload.exp !== 'number' || payload.exp + CLOCK_SKEW_S < nowS) throw new ChatGPTPlanError('invalid_id_token', 'The ID token has expired.');
    if (typeof payload.iat !== 'number') throw new ChatGPTPlanError('invalid_id_token', 'The ID token has no issue time.');
    if (requireNonce && !safeEqual(String(payload.nonce || ''), String(nonce || ''))) {
      throw new ChatGPTPlanError('invalid_id_token', 'The ID token nonce did not match.');
    }
    if (typeof payload.sub !== 'string' || !payload.sub) throw new ChatGPTPlanError('invalid_id_token', 'The ID token has no subject.');
    if (payload.sid !== undefined && (typeof payload.sid !== 'string' || !payload.sid.trim())) {
      throw new ChatGPTPlanError('invalid_id_token', 'The ID token session identifier is invalid.');
    }
    if (expectedSubject && payload.sub !== expectedSubject) {
      throw new ChatGPTPlanError('account_mismatch',
        'You signed in with a different ChatGPT account than the one saved here. Run `polydev-ai chatgpt logout --forget` first to switch accounts.');
    }
    return payload;
  }

  async tokenRequest(params) {
    const ep = await this.getEndpoints();
    let res;
    try {
      res = await this.fetch(ep.token_endpoint, {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params).toString(),
        signal: AbortSignal.timeout(30000),
      });
    } catch (e) {
      throw new ChatGPTPlanError('network_error', `Could not reach OpenAI sign-in: ${e.message}`, { transient: true });
    }
    const text = await res.text();
    let body = null;
    try { body = JSON.parse(text); } catch (_) { /* non-JSON body */ }
    if (!res.ok) {
      const errField = body && body.error;
      const code = (errField && typeof errField === 'object' ? errField.code : errField) || (body && body.code) || `http_${res.status}`;
      const desc = (body && (body.error_description || (errField && errField.message))) || '';
      throw new ChatGPTPlanError(String(code), `OpenAI sign-in returned HTTP ${res.status} (${code})${desc ? `: ${desc}` : ''}.`, {
        status: res.status, requestId: requestIdOf(res), transient: res.status >= 500,
      });
    }
    if (!body || typeof body !== 'object') throw new ChatGPTPlanError('invalid_token_response', 'OpenAI sign-in returned an unreadable response.');
    return body;
  }

  buildRecord(base, tokens, claims, scopes) {
    const nowMs = this.now();
    const expiresIn = Number(tokens.expires_in) || 3600;
    return {
      ...base,
      email: claims ? (claims.email || base.email || null) : (base.email || null),
      issuer: base.issuer || ISSUER,
      subject: claims ? claims.sub : base.subject,
      id_token: tokens.id_token || base.id_token || null,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || base.refresh_token || null,
      token_type: tokens.token_type || 'Bearer',
      expires_in: expiresIn,
      expires_at: new Date(nowMs + expiresIn * 1000).toISOString(),
      earliest_refresh_at: tokens.earliest_refresh_at ? new Date(
        typeof tokens.earliest_refresh_at === 'number' ? tokens.earliest_refresh_at * 1000 : tokens.earliest_refresh_at).toISOString() : null,
      scopes,
      plan_enabled: scopes.includes(PLAN_SCOPE),
      needs_sign_in: false,
      saved_at: new Date(nowMs).toISOString(),
    };
  }

  // ----- sign in -----

  /**
   * Run "Continue with ChatGPT" in the system browser.
   * @returns {Promise<{email, planEnabled, showWelcome, firstRegistration}>}
   */
  async signIn({ timeoutMs = 300000, onAuthUrl } = {}) {
    const hostId = this.getHostId();
    const record = this.loadRecord();
    const isReturning = !!(record && record.client_id);
    const ep = await this.getEndpoints();
    const pkce = createPkce();
    const state = randomValue(32);
    const nonce = randomValue(32);
    const listener = await startCallbackListener({ state, preferredPort: this.preferredPort, timeoutMs });

    const params = {
      response_type: 'code',
      client_id: isReturning ? record.client_id : DYNAMIC_CLIENT_ID,
      redirect_uri: listener.redirectUri,
      scope: SCOPES.join(' '),
      resource: RESOURCE,
      state,
      nonce,
      code_challenge: pkce.challenge,
      code_challenge_method: 'S256',
      ext_agent_host_id: hostId,
    };
    if (!isReturning) params.agent_name_hint = AGENT_NAME;
    if (isReturning && record.email) params.login_hint = record.email;
    // The user chose to turn plan usage on after an earlier decline: ask for consent again.
    if (isReturning && record.plan_enabled === false && record.subject) params.prompt = 'consent';

    // The id_token_hint version goes only to the browser; the printable URL never carries it.
    const printableUrl = authorizeUrl(ep.authorization_endpoint, params);
    const browserUrl = isReturning && record.id_token
      ? authorizeUrl(ep.authorization_endpoint, { ...params, id_token_hint: record.id_token })
      : printableUrl;

    let opened = false;
    try {
      await this.openBrowser(browserUrl);
      opened = true;
    } catch (_) { /* print the URL instead */ }
    if (onAuthUrl) onAuthUrl(printableUrl, opened);

    const cb = await listener.result;

    if (cb.error) {
      if (cb.error === 'access_denied') {
        throw new ChatGPTPlanError('access_denied',
          'ChatGPT sign-in was declined, so ChatGPT plan usage is off. To turn it on later, run `polydev-ai chatgpt login` and allow ChatGPT plan usage. '
          + 'Other ways to pay: Codex on this machine, or your own OpenAI API key at https://www.polydev.ai/dashboard/models.');
      }
      throw new ChatGPTPlanError(cb.error, `ChatGPT sign-in failed (${cb.error})${cb.errorDescription ? `: ${cb.errorDescription}` : ''}.`);
    }

    let clientId;
    let base;
    if (!isReturning) {
      if (!cb.clientId || cb.clientId === DYNAMIC_CLIENT_ID) {
        throw new ChatGPTPlanError('registration_incomplete', 'ChatGPT did not return a client registration. Please try signing in again.');
      }
      clientId = cb.clientId;
      // Save the registration before exchanging the code, so a failed exchange does not register again.
      base = { issuer: ep.issuer, client_id: clientId, ext_agent_host_id: hostId, registered_at: new Date(this.now()).toISOString() };
      await this.withRefreshLock(async () => {
        // Keep the welcome mark if another process wrote a record meanwhile.
        const current = this.loadRecord();
        if (current && current.welcome_shown) base.welcome_shown = true;
        await this.saveRecord(base);
      });
    } else {
      if (cb.clientId && cb.clientId !== record.client_id) {
        throw new ChatGPTPlanError('client_mismatch', 'ChatGPT returned a different client registration than the saved one; nothing was changed.');
      }
      clientId = record.client_id;
      base = { ...record, ext_agent_host_id: hostId };
    }

    const tokens = await this.tokenRequest({
      grant_type: 'authorization_code',
      client_id: clientId,
      code: cb.code,
      code_verifier: pkce.verifier,
      redirect_uri: listener.redirectUri,
      resource: RESOURCE,
    });
    if (typeof tokens.id_token !== 'string') {
      throw new ChatGPTPlanError('invalid_id_token', 'ChatGPT did not return a verifiable identity. Please try signing in again.');
    }
    const claims = await this.verifyIdToken(tokens.id_token, { clientId, nonce, expectedSubject: record && record.subject });
    if (typeof tokens.access_token !== 'string' || !tokens.access_token) {
      throw new ChatGPTPlanError('invalid_token_response', 'ChatGPT did not return an access token.');
    }
    const scopes = parseScopes(tokens.scope !== undefined ? tokens.scope : cb.scope);
    const next = await this.withRefreshLock(async () => {
      // Re-read under the lock: the welcome mark may have been written while the browser was open.
      const current = this.loadRecord();
      const welcomeShown = !!((record && record.welcome_shown) || (current && current.welcome_shown) || base.welcome_shown);
      const built = this.buildRecord({ ...base, welcome_shown: welcomeShown }, tokens, claims, scopes);
      built.paused_until = null;
      built.ineligible = false;
      delete built.id_token_unverified;
      delete built.id_token_rejected;
      await this.saveRecord(built);
      return built;
    });
    this._modelsCache = null;
    this._unauthorizedTokens.clear();
    this.pausedUntil = 0;
    this.ineligible = false;
    return {
      email: next.email,
      planEnabled: next.plan_enabled,
      showWelcome: next.plan_enabled && !next.welcome_shown,
      firstRegistration: !isReturning,
    };
  }

  /** Save that the welcome notice was shown (under the lock; never rejects). */
  markWelcomeShown() {
    this._welcomeTaken = true;
    return this._track(this.withRefreshLock(async () => {
      const record = this.loadRecord();
      if (record && !record.welcome_shown) await this.saveRecord({ ...record, welcome_shown: true });
    }).catch(() => {}));
  }

  /**
   * Returns the one-time welcome text if it has not been shown yet, and marks it shown. Stays
   * synchronous for its callers: the mark is written in the background under the lock, and this
   * process does not hand the text out twice meanwhile.
   */
  takeWelcome() {
    if (this._welcomeTaken) return null;
    const record = this.loadRecord();
    if (!record || !record.plan_enabled || record.welcome_shown) return null;
    this.markWelcomeShown();
    return `${TEXT.welcomeTitle}\n${TEXT.welcomeBody}`;
  }

  // ----- tokens -----

  needsRefresh(record) {
    if (!record || !record.expires_at) return true;
    const exp = Date.parse(record.expires_at);
    const nowMs = this.now();
    if (nowMs < exp - REFRESH_MARGIN_MS) return false;
    const earliest = record.earliest_refresh_at ? Date.parse(record.earliest_refresh_at) : 0;
    if (earliest && nowMs < earliest && nowMs < exp - 30000) return false;
    return true;
  }

  async withRefreshLock(fn) {
    const run = this._refreshChain.then(() => this._withFileLock(fn));
    this._refreshChain = run.catch(() => {});
    return run;
  }

  // The locked section can take about a minute in the worst case (discovery 15 s + token request
  // 30 s + JWKS 15 s), so a lock is only treated as stale well after that, or at once when the
  // process that wrote it is gone. Waiters wait longer than one worst-case refresh.
  //
  // Each holder writes a random owner token into the lock, re-reads it after creating it (and
  // starts over if its token is not there), and removes it on release only while it still carries
  // its own token. Breaking a stale lock is serialised by a second, short-lived lock file
  // (refresh.lock.break, held only for a few synchronous file calls): under it the breaker checks
  // that the lock is still the very one it judged stale (same inode, mtime and owner token) before
  // deleting it. A lock can only be created while none exists, so no newer lock can be deleted by a
  // breaker acting on an old observation, and two processes never both believe they took it.
  async _withFileLock(fn, { timeoutMs = LOCK_WAIT_MS, staleMs = LOCK_STALE_MS } = {}) {
    ensureDir(this.storageDir);
    const token = randomValue(16);
    const body = JSON.stringify({ pid: process.pid, token });
    const start = this.now();
    let held = null; // { ino, mtimeMs } of the lock file this holder made
    for (;;) {
      let created = false;
      try {
        const fd = fs.openSync(this.lockFile, 'wx', 0o600);
        created = true;
        try { fs.writeSync(fd, body); } finally { fs.closeSync(fd); }
      } catch (e) {
        if (created) { try { fs.unlinkSync(this.lockFile); } catch (_) { /* gone */ } throw e; }
        if (e.code !== 'EEXIST') throw e;
      }
      // lstat: a dangling symlink at the lock path makes 'wx' fail with EEXIST while stat says ENOENT.
      let st = null;
      let owner = null;
      try {
        st = fs.lstatSync(this.lockFile);
        owner = readLockOwner(this.lockFile);
      } catch (_) { /* gone meanwhile, or unreadable */ }
      if (st && owner && owner.token === token) {
        held = { ino: st.ino, mtimeMs: st.mtimeMs };
        break;
      }
      let brokeIt = false;
      if (st && !created) {
        const notALockFile = !st.isFile(); // e.g. a symlink: never a lock any holder made
        if (notALockFile || this.now() - st.mtimeMs > staleMs || lockOwnerGone(owner)) brokeIt = this._breakStaleLock(st, owner);
      }
      // The deadline holds on every pass, also when breaking a stale lock keeps failing.
      if (this.now() - start > timeoutMs) throw new ChatGPTPlanError('lock_timeout', 'Another Polydev process is refreshing the ChatGPT sign-in; try again.', { transient: true });
      await sleep(brokeIt || created ? 2 + Math.floor(Math.random() * 8) : 50 + Math.floor(Math.random() * 100));
    }
    try {
      const { pending } = await recoverAuthTmp(this.authFile, this._renameForTests ? { rename: this._renameForTests } : undefined);
      this._pendingRecord = pending;
    } catch (_) { /* best effort */ }
    this._inFileLock = true;
    try {
      return await fn();
    } finally {
      this._inFileLock = false;
      this._pendingRecord = null;
      this._releaseLock(token, held);
    }
  }

  /**
   * Remove the lock only while it is still this holder's. A read that fails for a moment (Windows
   * antivirus) is retried; if the owner still can't be read, the lock is removed when it is the
   * same file this holder made (same inode and mtime), so it does not block others for 180 s.
   */
  _releaseLock(token, held) {
    let owner = null;
    for (let i = 0; i < 3; i++) {
      let exists = true;
      try { fs.lstatSync(this.lockFile); } catch (e) { if (e.code === 'ENOENT') exists = false; }
      if (!exists) return;
      owner = readLockOwner(this.lockFile);
      if (owner) break;
      sleepSync(20 * (i + 1));
    }
    if (owner) {
      if (owner.token !== token) return; // another holder's lock
    } else {
      let st;
      try { st = fs.lstatSync(this.lockFile); } catch (_) { return; }
      if (!held || st.ino !== held.ino || st.mtimeMs !== held.mtimeMs) return;
    }
    try { fs.unlinkSync(this.lockFile); } catch (_) { /* already gone */ }
  }

  /**
   * Break the stale lock described by `seenStat` / `seenOwner`, and only that one. Returns true
   * when it was removed.
   */
  _breakStaleLock(seenStat, seenOwner) {
    const breakFile = `${this.lockFile}.break`;
    try {
      fs.closeSync(fs.openSync(breakFile, 'wx', 0o600));
    } catch (e) {
      if (e.code !== 'EEXIST') return false;
      // Another process is breaking it right now. Its break lock is held for a few file calls,
      // so one older than BREAK_STALE_MS belongs to a process that died in between.
      try {
        if (this.now() - fs.lstatSync(breakFile).mtimeMs > BREAK_STALE_MS) fs.unlinkSync(breakFile);
      } catch (_) { /* gone already */ }
      return false;
    }
    if (this._testHooks && this._testHooks.afterBreakLock) this._testHooks.afterBreakLock();
    try {
      let st;
      try { st = fs.lstatSync(this.lockFile); } catch (_) { return false; } // already gone
      const owner = readLockOwner(this.lockFile);
      const same = st.ino === seenStat.ino && st.mtimeMs === seenStat.mtimeMs
        && ((owner && owner.token) || null) === ((seenOwner && seenOwner.token) || null);
      if (!same) return false; // a newer lock: leave it to its holder
      try { fs.unlinkSync(this.lockFile); } catch (_) { return false; }
      return true;
    } finally {
      try { fs.unlinkSync(breakFile); } catch (_) { /* gone */ }
    }
  }

  /** Refresh with the rotating refresh token. Stores the replacement set atomically. */
  async refresh({ force = false } = {}) {
    return this.withRefreshLock(async () => {
      const record = this.loadRecord(); // re-read: another process may have refreshed already
      if (!record || !record.refresh_token || !record.client_id) {
        throw new ChatGPTPlanError('sign_in_required', 'Not signed in to ChatGPT. Run `polydev-ai chatgpt login` (Continue with ChatGPT).');
      }
      if (!force && !this.needsRefresh(record)) return record;
      let tokens;
      try {
        tokens = await this.tokenRequest({
          grant_type: 'refresh_token',
          client_id: record.client_id,
          refresh_token: record.refresh_token,
          resource: RESOURCE,
        });
      } catch (e) {
        if (UNUSABLE_REFRESH_CODES.has(e.code)) {
          await this.saveRecord({ ...record, access_token: null, refresh_token: null, expires_at: null, needs_sign_in: true });
          throw new ChatGPTPlanError('sign_in_required',
            'Your ChatGPT connection has ended (it was disconnected in ChatGPT settings or has expired). Run `polydev-ai chatgpt login` to sign in again.',
            { cause: e.code });
        }
        if (e.code === 'invalid_client') {
          throw new ChatGPTPlanError('invalid_client',
            'OpenAI rejected the saved Polydev client registration. Run `polydev-ai chatgpt logout --forget`, then `polydev-ai chatgpt login`.');
        }
        throw e; // network or server error: keep the credentials
      }
      if (typeof tokens.access_token !== 'string' || !tokens.access_token) {
        throw new ChatGPTPlanError('invalid_token_response', 'OpenAI returned no access token on refresh.', { transient: true });
      }
      // The refresh token has rotated: the old one is now spent. Save the new set first, before
      // anything else can fail (the JWKS fetch below is a network call), or the next refresh would
      // present a used token and force a new sign-in.
      const scopes = tokens.scope !== undefined ? parseScopes(tokens.scope) : (record.scopes || []);
      const next = this.buildRecord(record, tokens, null, scopes);
      if (!tokens.id_token) next.id_token = record.id_token || null;
      const hasIdToken = typeof tokens.id_token === 'string';
      if (hasIdToken) next.id_token_unverified = true;
      delete next.id_token_rejected;
      await this.saveRecord(next);
      if (!hasIdToken) return next;

      // Then verify the new ID token.
      //  - Verified: record the claims and clear the pending mark.
      //  - Could not check (JWKS unreachable): the tokens came straight from OpenAI's token
      //    endpoint over TLS in exchange for this client's own refresh token, so the access token
      //    is used for this request; the mark stays and the next refresh verifies again.
      //  - Checked and wrong (bad signature, issuer, audience, other account): the tokens stay saved
      //    only so `chatgpt logout` can revoke them, they are not used, and the user is asked to
      //    sign in again.
      try {
        const claims = await this.verifyIdToken(tokens.id_token, { clientId: record.client_id, requireNonce: false, expectedSubject: record.subject });
        const verified = { ...next, email: claims.email || next.email, subject: claims.sub };
        delete verified.id_token_unverified;
        await this.saveRecord(verified);
        return verified;
      } catch (e) {
        if (e && e.transient) return next;
        await this.saveRecord({ ...next, id_token_rejected: true, needs_sign_in: true });
        throw new ChatGPTPlanError(e.code === 'account_mismatch' ? 'account_mismatch' : 'invalid_id_token',
          `${e.message} The new tokens are kept only so \`polydev-ai chatgpt logout\` can revoke them; run \`polydev-ai chatgpt login\` to sign in again.`);
      }
    });
  }

  async getAccessToken() {
    let record = this.loadRecord();
    if (!record || !record.client_id || (!record.access_token && !record.refresh_token)) {
      throw new ChatGPTPlanError(record && record.needs_sign_in ? 'sign_in_required' : 'not_signed_in',
        record && record.needs_sign_in
          ? 'Your ChatGPT connection has ended. Run `polydev-ai chatgpt login` to sign in again.'
          : 'ChatGPT is not connected. Run `polydev-ai chatgpt login` (Continue with ChatGPT).');
    }
    if (!record.plan_enabled) {
      throw new ChatGPTPlanError('plan_not_enabled',
        'Signed in to ChatGPT, but ChatGPT plan usage is off. Run `polydev-ai chatgpt login` and allow ChatGPT plan usage, or use Codex on this machine or your own OpenAI API key.');
    }
    if (record.id_token_rejected) {
      throw new ChatGPTPlanError('sign_in_required', 'The ChatGPT sign-in could not be verified. Run `polydev-ai chatgpt login` to sign in again.');
    }
    if (!record.access_token || this.needsRefresh(record)) record = await this.refresh();
    return { token: record.access_token, record };
  }

  // ----- inference -----

  usable() {
    const record = this.loadRecord();
    if (!record || !record.plan_enabled || !record.client_id || record.needs_sign_in) return false;
    if (!record.access_token && !record.refresh_token) return false;
    const flags = this.planFlags();
    if (flags.ineligible) return false;
    if (this.now() < flags.pausedUntil) return false;
    return true;
  }

  errorFromResponsesCode(code, { status, message, param, requestId } = {}) {
    const ref = requestId ? ` (request ${requestId})` : '';
    switch (code) {
      case 'subscription_sharing_usage_limit_exceeded':
        this.pausedUntil = this.now() + USAGE_LIMIT_PAUSE_MS;
        this._persistFlags({ paused_until: new Date(this.pausedUntil).toISOString() });
        return new ChatGPTPlanError(code,
          `${TEXT.limitReached}. ${TEXT.manageUsage}: ${MANAGE_USAGE_URL}\nThe limit may apply to your ChatGPT plan or to Polydev's use of it; ChatGPT settings show which. Polydev pauses ChatGPT plan requests for a while.${ref}`,
          { status, requestId, usageLimit: true, manageUsageUrl: MANAGE_USAGE_URL });
      case 'subscription_sharing_user_not_eligible':
        this.ineligible = true;
        this._persistFlags({ ineligible: true });
        return new ChatGPTPlanError(code, `ChatGPT plan usage is not available for this ChatGPT account, workspace or policy (it needs an eligible plan such as Plus or Pro). If that changes, run \`polydev-ai chatgpt login\` again.${ref}`, { status, requestId, ineligible: true });
      case 'subscription_sharing_usage_unavailable':
      case 'subscription_sharing_user_unavailable':
        return new ChatGPTPlanError(code, `ChatGPT plan usage is temporarily unavailable; try again later.${ref}`, { status, requestId, transient: true });
      case 'subscription_sharing_unsupported_capability':
        return new ChatGPTPlanError(code, `The ChatGPT plan route does not support part of this request${param ? ` (${param})` : ''}.${ref}`, { status, requestId, param });
      case 'subscription_sharing_route_not_supported':
        return new ChatGPTPlanError(code, `The ChatGPT plan route does not support this endpoint.${ref}`, { status, requestId });
      case 'subscription_sharing_invalid_user':
        return new ChatGPTPlanError(code, `ChatGPT could not validate this account. If this keeps happening, run \`polydev-ai chatgpt login\` to sign in again.${ref}`, { status, requestId });
      case 'chatpass_v2_scope_not_authorized':
      case 'chatpass_v2_invalid_authorization_context':
        return new ChatGPTPlanError(code, `The ChatGPT plan permission does not cover this request. Check the connection with \`polydev-ai chatgpt status\`.${ref}`, { status, requestId });
      default:
        return new ChatGPTPlanError(code || `http_${status}`,
          `ChatGPT plan request failed${status ? ` (HTTP ${status})` : ''}${code ? ` [${code}]` : ''}${message ? `: ${message}` : ''}.${ref}`,
          { status, requestId, transient: status === 503 || status >= 500 });
    }
  }

  async errorFromHttp(res) {
    const requestId = requestIdOf(res);
    let text = '';
    try { text = await res.text(); } catch (_) { /* ignore */ }
    let body = null;
    try { body = JSON.parse(text); } catch (_) { /* not JSON */ }
    const err = body && typeof body.error === 'object' ? body.error : null;
    const code = err && err.code ? err.code : null;
    const message = (err && err.message) || (body && typeof body.detail === 'string' ? body.detail : '') || '';
    if (!code && res.status === 401) {
      return new ChatGPTPlanError('unauthorized', `ChatGPT did not accept the sign-in for plan usage (HTTP 401)${message ? `: ${message}` : ''}. Check \`polydev-ai chatgpt status\`.`, { status: 401, requestId });
    }
    if (!code && res.status === 403) {
      return new ChatGPTPlanError('forbidden', `ChatGPT plan usage was refused (HTTP 403)${message ? `: ${message}` : ''}.`, { status: 403, requestId });
    }
    if (!code && res.status === 503) {
      return new ChatGPTPlanError('unavailable', `ChatGPT plan usage is unavailable right now (HTTP 503)${message ? `: ${message}` : ''}.`, { status: 503, requestId, transient: true });
    }
    return this.errorFromResponsesCode(code, { status: res.status, message, param: err && err.param, requestId });
  }

  /** Send one prompt with the user's ChatGPT plan. Resolves only after response.completed. */
  async createResponse({ model, prompt, instructions, timeoutMs = 300000 }) {
    const flags = this.planFlags();
    if (flags.ineligible) {
      throw new ChatGPTPlanError('subscription_sharing_user_not_eligible',
        'ChatGPT plan usage is not available for this ChatGPT account (it needs an eligible plan such as Plus or Pro). If that changes, run `polydev-ai chatgpt login` again.', { ineligible: true });
    }
    if (this.now() < flags.pausedUntil) {
      throw new ChatGPTPlanError('subscription_sharing_usage_limit_exceeded',
        `${TEXT.limitReached} earlier. ${TEXT.manageUsage}: ${MANAGE_USAGE_URL}`, { usageLimit: true, paused: true, manageUsageUrl: MANAGE_USAGE_URL });
    }
    if (!model) throw new ChatGPTPlanError('no_model', 'No model was chosen for the ChatGPT plan request.');
    const body = {
      model,
      input: [{ role: 'user', content: prompt }],
      store: false,
      stream: true,
    };
    if (instructions) body.instructions = instructions;

    let out;
    let requestId;
    try {
      const res = await this._withAuthRetry((token) => this._postResponses(token, body, timeoutMs));
      requestId = requestIdOf(res);
      if (!res.ok) throw await this.errorFromHttp(res);
      out = await this.parseResponseStream(res.body, { requestId });
    } catch (e) {
      // The pause / not-eligible flag is saved before the error is reported (waiting a few seconds
      // at most: the lock can be held by a refresh in another process).
      await Promise.race([this.flushWrites(), new Promise((r) => setTimeout(r, FLAG_WRITE_WAIT_MS).unref())]);
      throw e;
    }
    return { ...out, model: out.model || model, paid_by: PAID_BY_LABEL };
  }

  /**
   * Make an authorized request. A 401 leads to one forced refresh and one retry per access token:
   * if the refreshed token is refused too, later requests with it get the 401 reported instead of
   * spending another refresh each time.
   */
  async _withAuthRetry(doRequest) {
    const { token } = await this.getAccessToken();
    let res = await doRequest(token);
    if (res.status !== 401) return res;
    if (this._unauthorizedTokens.has(token)) return res;
    this._unauthorizedTokens.add(token);
    try { await res.text(); } catch (_) { /* drain */ }
    const refreshed = await this.refresh({ force: true });
    const next = refreshed.access_token;
    if (!next || next === token) return doRequest(token);
    res = await doRequest(next);
    if (res.status === 401) this._unauthorizedTokens.add(next);
    return res;
  }

  async _postResponses(token, body, timeoutMs) {
    try {
      return await this.fetch(`${this.apiBase}/responses`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
          accept: 'text/event-stream',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (e) {
      throw new ChatGPTPlanError('network_error', `Could not reach the OpenAI Responses API: ${e.message}`, { transient: true });
    }
  }

  /** Parse a Responses SSE stream. Success only on response.completed. */
  async parseResponseStream(stream, { requestId } = {}) {
    if (!stream) throw new ChatGPTPlanError('stream_incomplete', 'The ChatGPT plan response had no body.');
    const decoder = new TextDecoder();
    let buffer = '';
    let text = '';
    let doneText = '';
    let completed = null;
    let failure = null;

    const handle = (raw) => {
      let eventName = null;
      const data = [];
      for (const line of raw.split(/\r?\n/)) {
        if (line.startsWith('event:')) eventName = line.slice(6).trim();
        else if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
      }
      if (!data.length) return;
      const payload = data.join('\n');
      if (payload === '[DONE]') return;
      let evt;
      try { evt = JSON.parse(payload); } catch (_) { return; }
      const type = evt.type || eventName;
      switch (type) {
        case 'response.output_text.delta':
          if (typeof evt.delta === 'string') text += evt.delta;
          break;
        case 'response.output_text.done':
          if (typeof evt.text === 'string') doneText += evt.text;
          break;
        case 'response.completed':
          completed = evt.response || {};
          break;
        case 'response.failed': {
          const e = (evt.response && evt.response.error) || {};
          failure = { code: e.code || 'response_failed', message: e.message || 'The response failed.' };
          break;
        }
        case 'response.incomplete': {
          const reason = evt.response && evt.response.incomplete_details && evt.response.incomplete_details.reason;
          failure = { code: 'response_incomplete', message: `The response stopped early${reason ? ` (${reason})` : ''}.` };
          break;
        }
        case 'error': {
          const e = evt.error || evt;
          failure = { code: e.code || 'stream_error', message: e.message || 'The stream reported an error.', param: e.param };
          break;
        }
        default:
          break;
      }
    };

    try {
      for await (const chunk of stream) {
        buffer += typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
        let idx;
        while ((idx = buffer.search(/\r?\n\r?\n/)) !== -1) {
          const raw = buffer.slice(0, idx);
          buffer = buffer.slice(idx).replace(/^\r?\n\r?\n/, '');
          handle(raw);
        }
        if (completed || failure) break;
      }
    } catch (e) {
      if (!completed && !failure) {
        throw new ChatGPTPlanError('stream_interrupted', `The ChatGPT plan stream was interrupted before it completed: ${e.message}`, { transient: true, requestId });
      }
    }
    buffer += decoder.decode();
    if (!completed && !failure && buffer.trim()) handle(buffer);

    if (failure) throw this.errorFromResponsesCode(failure.code, { message: failure.message, param: failure.param, requestId });
    if (!completed) {
      throw new ChatGPTPlanError('stream_incomplete', 'The ChatGPT plan stream ended before response.completed, so no answer was returned.', { transient: true, requestId });
    }
    if (!text) text = doneText;
    if (!text && Array.isArray(completed.output)) {
      for (const item of completed.output) {
        for (const part of (item && item.content) || []) {
          if (part && part.type === 'output_text' && typeof part.text === 'string') text += part.text;
        }
      }
    }
    return { text, model: completed.model || null, usage: completed.usage || null, id: completed.id || null };
  }

  /** Models the signed-in ChatGPT account can use, in the server's order. */
  async listModels({ refresh = false } = {}) {
    if (!refresh && this._modelsCache && this.now() - this._modelsCache.at < MODELS_CACHE_MS) return this._modelsCache.models;
    const get = (t) => this.fetch(`${this.apiBase}/models`, {
      headers: { authorization: `Bearer ${t}`, accept: 'application/json' },
      signal: AbortSignal.timeout(20000),
    });
    let res;
    try {
      res = await this._withAuthRetry(get);
    } catch (e) {
      if (e instanceof ChatGPTPlanError) throw e;
      throw new ChatGPTPlanError('network_error', `Could not list ChatGPT plan models: ${e.message}`, { transient: true });
    }
    if (!res.ok) throw await this.errorFromHttp(res);
    const doc = await res.json();
    const raw = Array.isArray(doc.models) ? doc.models : (Array.isArray(doc.data) ? doc.data : []);
    const models = raw
      .filter((m) => m && m.visibility === 'list') // only models meant to be shown in a picker
      .map((m) => ({ slug: m.slug || m.id, display_name: m.display_name || m.slug || m.id }))
      .filter((m) => typeof m.slug === 'string' && m.slug);
    this._modelsCache = { at: this.now(), models };
    return models;
  }

  /** Pick a model: the requested one if the account has it, else the account's first model. */
  async chooseModel(requested) {
    const models = await this.listModels();
    if (requested) {
      const want = String(requested).trim().replace(/^openai\//i, '').toLowerCase();
      const hit = models.find((m) => m.slug.toLowerCase() === want);
      return hit ? hit.slug : null;
    }
    return models.length ? models[0].slug : null;
  }

  // ----- status and sign out -----

  status() {
    const record = this.loadRecord();
    const host = readJson(this.hostFile);
    const flags = this.planFlags();
    const signedIn = !!(record && record.client_id && (record.access_token || record.refresh_token) && !record.needs_sign_in);
    return {
      signedIn,
      email: record ? record.email || null : null,
      planEnabled: !!(record && record.plan_enabled && signedIn),
      needsSignIn: !!(record && record.needs_sign_in),
      clientRegistered: !!(record && record.client_id),
      hostId: host ? host.ext_agent_host_id : null,
      accessTokenExpiresAt: record ? record.expires_at || null : null,
      pausedUntil: this.now() < flags.pausedUntil ? new Date(flags.pausedUntil).toISOString() : null,
      ineligible: flags.ineligible,
      storage: this.authFile,
      manageUsageUrl: MANAGE_USAGE_URL,
    };
  }

  /** Revoke the refresh token, then delete the tokens. `forget` also deletes the client registration. */
  async signOut({ forget = false } = {}) {
    // Under the lock, so a refresh in another process can't rotate the refresh token between the
    // revocation and the delete (which would leave a live token on disk).
    return this.withRefreshLock(() => this._signOutLocked({ forget }));
  }

  async _signOutLocked({ forget }) {
    const record = this.loadRecord();
    let revoked = null;
    let revokeError = null;
    if (record && record.refresh_token && record.client_id) {
      const ep = await this.getEndpoints();
      const delays = [0, 500, 1500];
      for (const delay of delays) {
        if (delay) await sleep(delay);
        try {
          const res = await this.fetch(ep.revocation_endpoint, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ token: record.refresh_token, token_type_hint: 'refresh_token', client_id: record.client_id }).toString(),
            signal: AbortSignal.timeout(15000),
          });
          try { await res.text(); } catch (_) { /* drain */ }
          if (res.ok) { revoked = true; revokeError = null; break; }
          revoked = false;
          revokeError = `HTTP ${res.status}`;
          if (res.status < 500) break; // not retryable
        } catch (e) {
          revoked = false;
          revokeError = e.message;
        }
      }
    }
    // A leftover temp file from a refused rename may hold tokens: delete them all first, so the
    // next locked access can't put the tokens back. (If the save below is refused, its own temp
    // file, which holds no tokens, is the one that stays.)
    removeAuthTmps(this.authFile);
    this._pendingRecord = null;
    if (forget) {
      try { fs.unlinkSync(this.authFile); } catch (_) { /* already gone */ }
    } else if (record) {
      {
        const kept = {
          issuer: record.issuer || ISSUER,
          client_id: record.client_id,
          subject: record.subject || null,
          email: record.email || null,
          ext_agent_host_id: record.ext_agent_host_id || null,
          registered_at: record.registered_at || null,
          welcome_shown: !!record.welcome_shown,
          ineligible: !!record.ineligible,
          signed_out_at: new Date(this.now()).toISOString(),
        };
        try {
          await this.saveRecord(kept);
        } catch (_) {
          // The rename is refused: its temp file (no tokens) is newer than auth.json and replaces
          // it on the next locked access. Remove the old file now if the system lets us.
          try { fs.unlinkSync(this.authFile); } catch (_e) { /* the temp file still wins next time */ }
        }
      }
    }
    this._modelsCache = null;
    return { hadSession: !!(record && (record.refresh_token || record.access_token)), revoked, revokeError, forgot: forget };
  }
}

// ---------- terminal command: polydev-ai chatgpt login|logout|status|models ----------

async function runChatGPTCli(argv, { out = (s) => process.stdout.write(`${s}\n`), plan = new ChatGPTPlan() } = {}) {
  const sub = argv[0] || 'status';
  try {
    if (sub === 'login') {
      out(`${TEXT.action}: opening your browser to sign in to ChatGPT...`);
      const result = await plan.signIn({
        onAuthUrl: (url, opened) => {
          out(opened
            ? 'If the browser did not open (for example over SSH), open this link to continue:'
            : 'Could not open a browser. Open this link to continue:');
          out(`  ${url}`);
          out('Waiting for you to finish in the browser (up to 5 minutes)...');
        },
      });
      if (result.planEnabled) {
        if (result.showWelcome) {
          out(`\n${TEXT.welcomeTitle}\n${TEXT.welcomeBody}`);
          await plan.markWelcomeShown();
        } else {
          out(`\nSigned in to ChatGPT as ${result.email || 'your account'}. ChatGPT plan usage is on. ${TEXT.manageUsage}: ${MANAGE_USAGE_URL}`);
        }
      } else {
        out(`\nSigned in to ChatGPT as ${result.email || 'your account'}, but ChatGPT plan usage is off because that permission was not granted.`
          + '\nTo turn it on, run `polydev-ai chatgpt login` again and allow ChatGPT plan usage.'
          + '\nOther ways to pay for OpenAI models: Codex on this machine, or your own OpenAI API key at https://www.polydev.ai/dashboard/models.');
      }
      return 0;
    }
    if (sub === 'logout') {
      const forget = argv.includes('--forget');
      const r = await plan.signOut({ forget });
      if (!r.hadSession) out('No active ChatGPT sign-in on this machine.');
      else if (r.revoked) out('Signed out of ChatGPT. The session was revoked and the tokens on this machine were deleted.');
      else out(`Signed out locally and deleted the tokens, but OpenAI did not confirm the revocation (${r.revokeError || 'unknown error'}).`
        + `\nYou can disconnect Polydev in ChatGPT settings: ${MANAGE_USAGE_URL}`);
      if (forget) out('The saved Polydev client registration was also removed.');
      return 0;
    }
    if (sub === 'status') {
      const s = plan.status();
      if (!s.signedIn) {
        out(s.needsSignIn
          ? 'ChatGPT: connection ended. Run `polydev-ai chatgpt login` to sign in again.'
          : `ChatGPT: not connected. Run \`polydev-ai chatgpt login\` (${TEXT.action}) to use your ChatGPT plan.`);
        return 0;
      }
      out(`ChatGPT: signed in as ${s.email || 'your account'}`);
      out(s.planEnabled
        ? `ChatGPT plan usage: on (${TEXT.inUse} for OpenAI models). ${TEXT.manageUsage}: ${MANAGE_USAGE_URL}`
        : 'ChatGPT plan usage: off. Run `polydev-ai chatgpt login` and allow ChatGPT plan usage to turn it on.');
      out(`Credentials: ${s.storage} (only on this machine)`);
      return 0;
    }
    if (sub === 'models') {
      const models = await plan.listModels({ refresh: true });
      if (!models.length) out('No models are available to this ChatGPT account.');
      for (const m of models) out(`${m.slug}${m.display_name && m.display_name !== m.slug ? `  (${m.display_name})` : ''}`);
      return 0;
    }
    out('Usage: polydev-ai chatgpt <login|logout [--forget]|status|models>');
    out(`  login    ${TEXT.action}: sign in and use your ChatGPT plan for OpenAI models`);
    out('  logout   revoke the session and delete the tokens on this machine (--forget also removes the client registration)');
    out('  status   show whether ChatGPT plan usage is on');
    out('  models   list the models your ChatGPT plan can use');
    return sub === 'help' || sub === '--help' || sub === '-h' ? 0 : 1;
  } catch (e) {
    out(`ChatGPT: ${e.message}`);
    return 1;
  }
}

module.exports = {
  ChatGPTPlan,
  ChatGPTPlanError,
  runChatGPTCli,
  createPkce,
  parseCallback,
  parseScopes,
  startCallbackListener,
  isOpenAIModel,
  writeJsonAtomic,
  readLockOwner,
  usageLimitNote,
  renameWithRetry,
  renameWithRetryAsync,
  recoverAuthTmp,
  removeAuthTmps,
  constants: {
    ISSUER, API_BASE, RESOURCE, SCOPES, PLAN_SCOPE, DYNAMIC_CLIENT_ID, AGENT_NAME,
    CALLBACK_PATH, MANAGE_USAGE_URL, PAID_BY_LABEL, TEXT, DEFAULT_ENDPOINTS,
  },
};
