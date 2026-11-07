'use strict';

// connect_chatgpt_plan returns the sign-in link while the loopback listener is still waiting
// (SSH / remote IDE), and chatgpt_plan_status reports the outcome later.
// Run: node --test test/client/*.test.js

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// Isolate the wrapper from the real home directory and token.
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'polydev-connect-test-'));
process.env.HOME = home;
process.env.USERPROFILE = home;
delete process.env.POLYDEV_USER_TOKEN;

const StdioMCPWrapper = require('../../mcp/stdio-wrapper');

const LINK = 'https://auth.example.test/authorize?client_id=c&state=s';

function fakePlan() {
  let finish;
  const state = { signedIn: false, planEnabled: false, calls: 0 };
  return {
    state,
    finish: (result) => finish(result),
    signIn({ onAuthUrl }) {
      state.calls += 1;
      return new Promise((resolve) => {
        setImmediate(() => onAuthUrl(LINK, false));
        finish = (result) => { state.signedIn = true; state.planEnabled = result.planEnabled; resolve(result); };
      });
    },
    status() {
      return { signedIn: state.signedIn, planEnabled: state.planEnabled, email: 'user@example.com', needsSignIn: false, pausedUntil: null, ineligible: false };
    },
    takeWelcome() { return null; },
  };
}

test('connect_chatgpt_plan returns the link before sign-in finishes; status reports the result', async () => {
  const wrapper = new StdioMCPWrapper();
  wrapper.isSandboxed = () => false;
  const plan = fakePlan();
  wrapper.chatgpt = plan;

  const reply = await Promise.race([
    wrapper.handleConnectChatGPTPlan({ arguments: { timeout_seconds: 60 } }, 1),
    new Promise((_, reject) => setTimeout(() => reject(new Error('the tool waited for the sign-in to finish')), 2000)),
  ]);
  const text = reply.result.content[0].text;
  assert.ok(text.includes(LINK), text);
  assert.ok(!text.includes('id_token_hint'));
  assert.ok(!reply.result.isError);

  // A second call while waiting returns the same link and starts nothing new.
  const again = await wrapper.handleConnectChatGPTPlan({ arguments: {} }, 2);
  assert.ok(again.result.content[0].text.includes(LINK));
  assert.equal(plan.state.calls, 1);

  const waiting = wrapper.handleChatGPTPlanStatus({}, 3).result.content[0].text;
  assert.match(waiting, /waiting for you in the browser/);
  assert.ok(waiting.includes(LINK));

  plan.finish({ email: 'user@example.com', planEnabled: true, showWelcome: false });
  await new Promise((r) => setImmediate(r));
  const done = wrapper.handleChatGPTPlanStatus({}, 4).result.content[0].text;
  assert.match(done, /ChatGPT plan: connected as user@example.com/);
});
