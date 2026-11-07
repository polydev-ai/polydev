'use strict';

// After the ChatGPT plan hits its usage limit, the answer still comes from the user's own OpenAI
// key or Polydev's free requests on the server, and says so plainly (no upsell). Codex is skipped
// as the stand-in only when it is signed in with ChatGPT (it may draw on the same plan) and the
// server can answer; otherwise Codex answers, and says so too.
// Run: node --test test/client/*.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'polydev-limit-test-'));
process.env.HOME = home;
process.env.USERPROFILE = home;
delete process.env.POLYDEV_USER_TOKEN;

const StdioMCPWrapper = require('../../mcp/stdio-wrapper');
const { ChatGPTPlanError, usageLimitNote } = require('../../lib/chatgptPlan');

const UPSELL = /\b(upgrade|buy|purchase|pricing|subscribe|top[- ]?up|pro plan|paid plan|credits?)\b/i;

function serverReply(rows) {
  const body = rows.map((r) => `## ${r.model}\n\nanswer from ${r.model}\n\nPaid by: ${r.label}\n`).join('\n---\n\n');
  const summary = { perspectives: rows.map((r) => ({ model: r.model, provider: r.provider, paid_by: r.paid_by, error: null })) };
  return `# Multiple AI Perspectives\n\n${body}\n\n\`\`\`json\n${JSON.stringify(summary)}\n\`\`\`\n`;
}

function wrapperWith({ paused = false, rows, codex = true, codexAuth = 'chatgpt' }) {
  const w = new StdioMCPWrapper();
  w.userToken = 'pd_test';
  w.fetchUserModelPreferences = async () => {};
  w.allProviders = [];
  w.getAllAvailableProviders = async () => ({ available: codex ? ['codex_cli'] : [] });
  w.getExcludedCliForCurrentIDE = () => null;
  w.sendProgressNotification = () => {};
  w.recordLocalUsage = async () => {};
  const calls = { plan: 0, codex: 0, server: [] };
  w.chatgpt = {
    usable: () => !paused,
    status: () => ({ signedIn: true, planEnabled: true, pausedUntil: paused ? new Date(Date.now() + 60000).toISOString() : null, ineligible: false }),
    takeWelcome: () => null,
    chooseModel: async (m) => m || 'gpt-test',
    createResponse: async () => {
      calls.plan += 1;
      throw new ChatGPTPlanError('subscription_sharing_usage_limit_exceeded', 'Usage limit reached. Manage usage: https://chatgpt.com/settings/usage', { usageLimit: true });
    },
  };
  w.cliManager.sendCliPrompt = async () => { calls.codex += 1; return { success: true, content: 'codex answer', paid_by: 'Codex on this machine' }; };
  w.cliManager.getCliStatus = async () => ({ codex_cli: { available: true, authenticated: true, auth_method: codexAuth } });
  w.forwardToRemoteServer = async (req) => {
    calls.server.push(req.params.arguments);
    return { result: { content: [{ type: 'text', text: serverReply(rows) }] } };
  };
  return { w, calls };
}

test('the usage-limit note is neutral and names what paid', () => {
  assert.equal(usageLimitNote('your API key'), 'Your ChatGPT plan hit its usage limit; this answer was paid by your API key.');
  for (const n of [usageLimitNote('your API key'), usageLimitNote('Polydev free requests', 'gpt-6-luna'), usageLimitNote(null)]) {
    assert.ok(!UPSELL.test(n), n);
  }
});

test('a named OpenAI model after a usage limit: the server answers with the user key and the answer says so', async () => {
  const { w, calls } = wrapperWith({ rows: [{ model: 'gpt-6', provider: 'openai', paid_by: 'your_api_key', label: 'your API key' }] });
  const out = await w.localSendCliPrompt({ prompt: 'hi', model: 'gpt-6' });
  assert.equal(typeof out, 'string', JSON.stringify(out));
  assert.equal(calls.plan, 1);
  assert.equal(calls.codex, 0, 'Codex is not the stand-in after a usage limit');
  assert.deepEqual(calls.server[0].models, ['gpt-6'], 'the model goes to the server');
  assert.ok(out.includes('Your ChatGPT plan hit its usage limit; this answer was paid by your API key.'), out);
  assert.ok(out.indexOf('hit its usage limit') < out.indexOf('answer from gpt-6'), 'the note comes before the answer');
  assert.ok(out.includes('Manage usage: https://chatgpt.com/settings/usage'), 'the limit itself is still reported');
});

test('default selection while paused: no plan request, the free requests answer, and the note says so', async () => {
  const { w, calls } = wrapperWith({
    paused: true,
    rows: [
      { model: 'gpt-6-luna', provider: 'openai', paid_by: 'polydev_free', label: 'Polydev free requests' },
      { model: 'gemini-4-flash', provider: 'google', paid_by: 'polydev_free', label: 'Polydev free requests' },
    ],
  });
  const out = await w.localSendCliPrompt({ prompt: 'hi' });
  assert.equal(typeof out, 'string', JSON.stringify(out));
  assert.equal(calls.plan, 0, 'no request while paused');
  assert.equal(calls.codex, 0);
  assert.ok(calls.server[0].request_providers.some((p) => p.provider === 'openai'), 'OpenAI is asked of the server');
  assert.ok(out.includes('Your ChatGPT plan hit its usage limit; the gpt-6-luna answer was paid by Polydev free requests.'), out);
});

test('other ChatGPT plan failures still fall back to Codex', async () => {
  const { w, calls } = wrapperWith({ rows: [] });
  w.chatgpt.createResponse = async () => { throw new ChatGPTPlanError('stream_incomplete', 'ended early', { transient: true }); };
  const out = await w.localSendCliPrompt({ prompt: 'hi', model: 'gpt-6' });
  assert.equal(calls.codex, 1);
  assert.ok(String(out).includes('Codex answered instead'), out);
  assert.ok(!String(out).includes('hit its usage limit'));
});

test('after a usage limit, Codex signed in with an API key answers, and the answer says so', async () => {
  const { w, calls } = wrapperWith({ codexAuth: 'api_key', rows: [] });
  const out = await w.localSendCliPrompt({ prompt: 'hi', model: 'gpt-6' });
  assert.equal(calls.codex, 1);
  assert.equal(calls.server.length, 0, 'the answered model is not sent to the server again');
  assert.ok(String(out).includes('Your ChatGPT plan hit its usage limit; this answer was paid by Codex on this machine.'), out);
});

test('after a usage limit with the Polydev server unreachable, Codex answers even when signed in with ChatGPT', async () => {
  const { w, calls } = wrapperWith({ rows: [] });
  w._serverUnreachableAt = Date.now();
  const out = await w.localSendCliPrompt({ prompt: 'hi', model: 'gpt-6' });
  assert.equal(calls.codex, 1);
  assert.ok(String(out).includes('this answer was paid by Codex on this machine'), out);
});

test('named models that all answer on this machine are reported to the server so they can be ranked', async () => {
  const { w, calls } = wrapperWith({ rows: [] });
  w.chatgpt.createResponse = async ({ model }) => ({ text: 'plan answer', model });
  const reports = [];
  w.reportCliResultsToServer = async (prompt, results, args) => { reports.push({ prompt, results, args }); };
  const out = await w.localSendCliPrompt({ prompt: 'hi', model: 'gpt-6' });
  assert.equal(typeof out, 'string', JSON.stringify(out));
  assert.equal(calls.server.length, 0, 'get_perspectives is not called: every named model answered here');
  assert.equal(reports.length, 1, 'the local answers are reported once');
  assert.equal(reports[0].prompt, 'hi');
  assert.ok(reports[0].results.some((r) => r.success && r.provider_id === 'chatgpt_plan'), JSON.stringify(reports[0].results));
});

test('when the server is asked anyway, the local answers go with that request and are not reported again', async () => {
  const { w, calls } = wrapperWith({ rows: [{ model: 'gemini-4-flash', provider: 'google', paid_by: 'polydev_free', label: 'Polydev free requests' }] });
  w.chatgpt.createResponse = async ({ model }) => ({ text: 'plan answer', model });
  let reported = 0;
  w.reportCliResultsToServer = async () => { reported += 1; };
  await w.localSendCliPrompt({ prompt: 'hi', models: ['gpt-6', 'gemini-4-flash'] });
  assert.equal(calls.server.length, 1);
  assert.equal(reported, 0);
});

test('the report is fire-and-forget: a slow or failing server never delays or breaks the answer', async () => {
  const { w } = wrapperWith({ rows: [] });
  w.chatgpt.createResponse = async ({ model }) => ({ text: 'plan answer', model });
  const realFetch = global.fetch;
  const seen = [];
  global.fetch = (url, opts) => {
    seen.push({ url: String(url), opts });
    return new Promise((resolve, reject) => opts.signal.addEventListener('abort', () => reject(opts.signal.reason)));
  };
  try {
    const t0 = Date.now();
    const out = await w.localSendCliPrompt({ prompt: 'hi', model: 'gpt-6' });
    assert.equal(typeof out, 'string');
    assert.ok(Date.now() - t0 < 2000, 'the answer does not wait for the report');
    const report = seen.find((s) => s.url.endsWith('/report-cli-results'));
    assert.ok(report, seen.map((s) => s.url).join());
    assert.ok(report.opts.signal, 'the report has a timeout');
    const body = JSON.parse(report.opts.body);
    assert.deepEqual(Object.keys(body).sort(), ['cli_results', 'max_tokens', 'prompt', 'temperature'], 'only the fields report-cli-results accepts');
    assert.deepEqual(Object.keys(body.cli_results[0]).sort(), ['content', 'error', 'latency_ms', 'model', 'provider_id', 'success', 'tokens_used']);
    // A timed-out report is swallowed.
    await w.reportCliResultsToServer('hi', [{ success: true, provider_id: 'codex_cli', model: 'gpt-6', content: 'x' }], {}, { timeoutMs: 20 });
  } finally {
    global.fetch = realFetch;
  }
});
