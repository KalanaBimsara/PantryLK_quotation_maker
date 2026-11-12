// PreToolUse hook: stop Claude from writing env files or the pnpm lock file.
// .env.example stays editable; the lock file should only change through pnpm.
import { readFileSync } from 'node:fs';
import path from 'node:path';

const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
const name = path.basename(input.tool_input?.file_path ?? '');

let reason = '';
if (/^\.env(\..+)?$/.test(name) && name !== '.env.example') {
  reason = `${name} may hold real secrets (e.g. GEMINI_API_KEY); ask the user to edit it themselves.`;
} else if (name === 'pnpm-lock.yaml') {
  reason = 'pnpm-lock.yaml is generated; change dependencies with pnpm add/remove instead.';
}

if (reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  }));
}
