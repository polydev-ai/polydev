'use strict';

// Unit tests for lib/cliManager.js with a stubbed child_process.spawn: nothing user-written may
// reach argv (the CLIs are started through cmd.exe on Windows), and Codex runs isolated.
// Run: node --test test/client/*.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const { EventEmitter } = require('node:events');

const { CLIManager } = require('../../lib/cliManager');

const HOSTILE_PROMPT = '-p --dangerously-skip-permissions "quoted" & powershell -c calc | whoami > out.txt\n%PATH% ^& $(id) `id`\nsecond line';

/** A fake spawn: records each call and replies with `reply(args)` on stdout. */
function fakeSpawn(reply) {
  const calls = [];
  const spawn = (command, args, options) => {
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.killed = false;
    child.kill = () => { child.killed = true; };
    const call = { command, args, options, stdin: '', stdinEnded: false, cwdExisted: options.cwd ? fs.existsSync(options.cwd) : null };
    child.stdin = {
      on() {},
      write(chunk) { call.stdin += chunk; },
      end() {
        call.stdinEnded = true;
        setImmediate(() => {
          child.stdout.emit('data', Buffer.from(reply(call)));
          child.emit('close', 0);
        });
      },
    };
    calls.push(call);
    return child;
  };
  return { spawn, calls };
}

const claudeReply = () => JSON.stringify({
  type: 'result', is_error: false, result: 'pong from claude',
  modelUsage: { 'claude-test': { inputTokens: 3, outputTokens: 2 } },
});
const codexReply = () => 'pong from codex, a sufficiently long answer';

function manager(reply) {
  const fake = fakeSpawn(reply);
  const m = new CLIManager({ spawn: fake.spawn });
  const ok = { available: true, authenticated: true, version: 'test', last_checked: new Date() };
  m.setCachedStatus({ claude_code: ok, codex_cli: ok });
  return { m, calls: fake.calls };
}

function assertNoUserTextInArgv(args) {
  const joined = args.join('\u0000');
  for (const piece of ['powershell', 'whoami', 'calc', 'second line', 'quoted', '%PATH%', '$(id)']) {
    assert.ok(!joined.includes(piece), `argv must not contain "${piece}": ${JSON.stringify(args)}`);
  }
}

test('Claude Code gets the prompt on stdin; argv holds only fixed flags', async () => {
  const { m, calls } = manager(claudeReply);
  const result = await m.sendCliPrompt('claude_code', HOSTILE_PROMPT, 'args', 10000, 'claude-test-model');
  assert.equal(result.success, true, result.error);
  assert.equal(result.content, 'pong from claude');
  assert.equal(calls.length, 1);
  const { args, options, stdin } = calls[0];
  assertNoUserTextInArgv(args);
  assert.equal(stdin, `${HOSTILE_PROMPT}\n`, 'the whole prompt, newlines included, goes on stdin');
  const empty = process.platform === 'win32' ? '""' : '';
  assert.deepEqual(args.slice(0, 14), ['-p', '--output-format', 'json', '--tools', empty,
    '--max-turns', '1', '--strict-mcp-config', '--no-session-persistence', '--setting-sources', empty,
    '--settings', 'polydev-claude-settings.json', '--model']);
  assert.equal(args[14], 'claude-test-model');
  assert.equal(args.length, 15, 'no prompt argument after the flags');
  assert.ok(!args.includes('--dangerously-skip-permissions'));
  assert.ok(!args.includes('--bare'), '--bare would not read the user\'s own Claude login');
  assertIsolated(args);
  assert.equal(options.shell, process.platform === 'win32');
});

test('Claude Code runs with no user or project settings or hooks, in a fresh directory holding only its settings file', async () => {
  const { m, calls } = manager((call) => {
    call.dirAtRun = fs.readdirSync(call.options.cwd);
    call.settingsAtRun = JSON.parse(fs.readFileSync(require('node:path').join(call.options.cwd, 'polydev-claude-settings.json'), 'utf8'));
    return claudeReply();
  });
  const result = await m.sendCliPrompt('claude_code', 'hello', 'args', 10000, null);
  assert.equal(result.success, true, result.error);
  const call = calls[0];
  const at = (flag) => call.args[call.args.indexOf(flag) + 1];
  assert.equal(at('--setting-sources'), process.platform === 'win32' ? '""' : '', 'no settings sources: user, project and local are all skipped');
  assert.equal(at('--settings'), 'polydev-claude-settings.json', 'relative, so no path with spaces reaches argv');
  assert.deepEqual(call.settingsAtRun, { disableAllHooks: true });
  assert.deepEqual(call.dirAtRun, ['polydev-claude-settings.json'], 'no CLAUDE.md or project files in the working directory');
  assert.ok(call.options.cwd.startsWith(os.tmpdir()) && call.options.cwd !== os.tmpdir(), call.options.cwd);
  assert.equal(fs.existsSync(call.options.cwd), false, 'the per-run directory is removed');
});

function assertIsolated(args) {
  const at = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
  assert.equal(at('--setting-sources'), process.platform === 'win32' ? '""' : '', `--setting-sources "" missing: ${JSON.stringify(args)}`);
  assert.equal(at('--settings'), 'polydev-claude-settings.json');
  assert.ok(args.includes('--strict-mcp-config'));
}

test('an old Claude Code that lacks the isolation flags is reported, never retried without them', async () => {
  const { m, calls } = manager(() => '');
  const executed = [];
  m.executeCliCommand = async (command, args) => { executed.push(args); return { stdout: '', stderr: "error: unknown option '--setting-sources'" }; };
  const result = await m.sendCliPrompt('claude_code', 'hello', 'args', 10000, 'claude-test-model');
  assert.equal(result.success, false);
  assert.equal(result.error_code, 'CLI_TOO_OLD');
  assert.equal(calls.length, 0);
  assert.ok(executed.length >= 1);
  executed.forEach(assertIsolated);
});

test('every Claude Code run, the retry with the default model included, keeps the isolation flags', async () => {
  let n = 0;
  const { m, calls } = manager(() => {
    n += 1;
    return n === 1
      ? JSON.stringify({ type: 'result', is_error: true, result: 'model not found: claude-nope' })
      : claudeReply();
  });
  const result = await m.sendCliPrompt('claude_code', 'hello', 'args', 10000, 'claude-nope');
  assert.equal(result.success, true, result.error);
  assert.equal(calls.length, 2, 'one retry with the default model');
  calls.forEach((c) => assertIsolated(c.args));
  assert.ok(!calls[1].args.includes('--model'));
});

test('a sign-in failure under the isolation flags explains settings-based sign-in and does not mark Claude Code signed out', async () => {
  const { m } = manager(() => '');
  m.executeCliCommand = async () => ({ stdout: JSON.stringify({ type: 'result', is_error: true, result: 'Invalid API key · Please run /login' }), stderr: '' });
  const result = await m.sendCliPrompt('claude_code', 'hello', 'args', 10000, null);
  assert.equal(result.success, false);
  assert.equal(result.error_code, 'AUTH_FROM_SETTINGS', result.error);
  assert.match(result.error, /gets its sign-in from settings/);
  assert.match(result.error, /API key in Polydev/);
  assert.equal(m.statusCache.get('claude_code').authenticated, true, 'still treated as signed in');
});

test('codex login status keeps only the kind of sign-in, never a key preview', () => {
  const m = new CLIManager({ spawn: fakeSpawn(() => '').spawn });
  assert.deepEqual(m.parseAuthenticationStatus('codex_cli', { stdout: 'Logged in using ChatGPT\n', exit_code: 0 }), { authenticated: true, method: 'chatgpt' });
  const apiKey = m.parseAuthenticationStatus('codex_cli', { stdout: 'Logged in using an API key - sk-proj-***ABCDE\n', exit_code: 0 });
  assert.deepEqual(apiKey, { authenticated: true, method: 'api_key' });
  assert.ok(!JSON.stringify(apiKey).includes('sk-'));
});

test('Codex gets the prompt on stdin via "-", in a fresh empty directory, with MCP and plugins off', async () => {
  const { m, calls } = manager(codexReply);
  const result = await m.sendCliPrompt('codex_cli', HOSTILE_PROMPT, 'args', 10000, 'gpt-test');
  assert.equal(result.success, true, result.error);
  const { args, options, stdin, cwdExisted } = calls[0];
  assertNoUserTextInArgv(args);
  assert.ok(stdin.endsWith(HOSTILE_PROMPT), 'the whole prompt goes on stdin');
  assert.equal(args[0], 'exec');
  assert.equal(args.at(-1), '-', 'the prompt argument is "-" (read stdin)');
  const pairs = (flag) => args.flatMap((a, i) => (a === flag ? [args[i + 1]] : []));
  assert.deepEqual(pairs('-s'), ['read-only']);
  assert.deepEqual(pairs('-m'), ['gpt-test']);
  for (const override of ['mcp_servers={}', 'features.plugins=false', 'features.apps=false', 'features.code_mode_host=false']) {
    assert.ok(pairs('-c').includes(override), `missing -c ${override}`);
  }
  assert.ok(!args.some((a) => a.startsWith('--disable')), '--disable errors on unknown features in some versions');
  assert.ok(options.cwd && options.cwd.startsWith(os.tmpdir()) && options.cwd !== process.cwd(), `cwd ${options.cwd}`);
  assert.equal(cwdExisted, true);
  assert.deepEqual(fs.existsSync(options.cwd) ? fs.readdirSync(options.cwd) : [], [], 'the working directory is empty');
  // The per-call directory is removed after the run.
  await new Promise((r) => setImmediate(r));
  assert.equal(fs.existsSync(options.cwd), false);
});

test('hostile model names are rejected before anything is started', async () => {
  for (const providerId of ['claude_code', 'codex_cli']) {
    for (const bad of ['gpt-5 & calc', '--dangerously-skip-permissions', 'a"b', 'x'.repeat(101), 'model\nline', 'm;rm', '$(id)']) {
      const { m, calls } = manager(providerId === 'codex_cli' ? codexReply : claudeReply);
      const result = await m.sendCliPrompt(providerId, 'hello', 'args', 10000, bad);
      assert.equal(result.success, false, `${providerId} accepted ${JSON.stringify(bad)}`);
      assert.equal(result.error_code, 'INVALID_MODEL_NAME');
      assert.equal(calls.length, 0, 'no process is started');
    }
  }
});

test('ordinary model names pass the allowlist', async () => {
  for (const good of ['gpt-6.1-sol', 'claude-opus-5-5', 'openai/gpt-test', 'model:tag_1', 'sonnet']) {
    const { m, calls } = manager(claudeReply);
    const result = await m.sendCliPrompt('claude_code', 'hello', 'args', 10000, good);
    assert.equal(result.success, true, `${good}: ${result.error}`);
    assert.equal(calls.length, 1);
  }
});
