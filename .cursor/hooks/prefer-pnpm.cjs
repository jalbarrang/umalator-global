#!/usr/bin/env node

const fs = require('node:fs');

function respond(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

function tokenize(command) {
  // Minimal tokenizer that preserves quoted segments.
  const tokens = [];
  const re = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|(\S+)/g;
  let match;
  while ((match = re.exec(command)) !== null) {
    tokens.push(match[1] ?? match[2] ?? match[3]);
  }
  return tokens;
}

const deny = (userMessage, agentMessage) =>
  respond({
    continue: true,
    permission: 'deny',
    user_message: userMessage,
    agent_message: agentMessage,
  });

let payload = {};
try {
  const input = fs.readFileSync(0, 'utf8');
  payload = input.trim() ? JSON.parse(input) : {};
} catch {
  respond({ continue: true, permission: 'allow' });
  process.exit(0);
}

const command = String(payload.command || '').trim();
if (!command) {
  respond({ continue: true, permission: 'allow' });
  process.exit(0);
}

const args = tokenize(command);

// Block npm or npx usage

if (args[0] === 'npm') {
  deny(
    'Blocked: do not run npm from the agent.',
    'npm or npx are blocked by project policy. Use pnpm to replace npm.',
  );
  process.exit(0);
}

if (args[0] === 'npx') {
  deny(
    'Blocked: do not run npx from the agent.',
    'npm or npx are blocked by project policy. Use pnpm exec to replace npx.',
  );
  process.exit(0);
}

respond({ continue: true, permission: 'allow' });
