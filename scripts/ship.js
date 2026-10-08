// Publishes the current JavaScript to installed apps on the "preview" channel (over the air).
// Usage: npm run ship -- "what changed"
const { spawnSync } = require('node:child_process');

const message = process.argv.slice(2).join(' ').trim() || 'Update';
const args = [
  '--yes',
  'eas-cli@latest',
  'update',
  '--channel',
  'preview',
  '--environment',
  'preview',
  '--platform',
  'android',
  '--non-interactive',
  '--message',
  JSON.stringify(message),
];
const result = spawnSync('npx', args, { stdio: 'inherit', shell: true });
process.exit(result.status ?? 1);
