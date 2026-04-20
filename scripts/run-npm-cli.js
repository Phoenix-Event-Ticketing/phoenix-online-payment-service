/**
 * Runs npm's CLI in the same Node install as this script, with IPv4-first DNS.
 * Fixes some Windows setups where `npm audit` hits registry over IPv6 and gets EACCES.
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const execDir = path.dirname(process.execPath);
const candidates = [
  path.join(execDir, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  path.join(execDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
];

const npmCli = candidates.find((p) => fs.existsSync(p));
if (!npmCli) {
  console.error(
    'Could not find npm-cli.js next to this Node install. Run `npm audit` from a normal Node/npm install.',
  );
  process.exit(1);
}

const extra = '--dns-result-order=ipv4first';
const preload = path.join(__dirname, 'ipv4-first-dns.cjs');
const merged = [process.env.NODE_OPTIONS, extra].filter(Boolean).join(' ').trim();

const nodeArgs = [
  extra,
  `--require=${preload}`,
  npmCli,
  ...process.argv.slice(2),
];

const result = spawnSync(process.execPath, nodeArgs, {
  stdio: 'inherit',
  env: { ...process.env, NODE_OPTIONS: merged },
  windowsHide: true,
});

process.exit(result.status === null ? 1 : result.status);
