const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const token = process.env.VERCEL_TOKEN;
if (!token) { require('fs').writeFileSync(require('path').join(__dirname, 'deploy-log.txt'), 'VERCEL_TOKEN not set\n', 'utf8'); process.exit(1); }
const logPath = path.join(__dirname, 'deploy-log.txt');

try {
  process.env.VERCEL_TOKEN = token;
  const out = execSync('npx vercel --prod --yes', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 120000,
    cwd: __dirname
  });
  fs.writeFileSync(logPath, (out.stdout || '') + (out.stderr || '') + '\nDone.', 'utf8');
} catch (e) {
  const msg = (e.stdout || '') + (e.stderr || '') + '\n' + (e.message || '');
  fs.writeFileSync(logPath, msg, 'utf8');
  process.exitCode = 1;
}
