// PostToolUse hook: type-check the project after Claude edits a .ts/.tsx file.
// Exit 2 sends the compiler errors back to Claude; exit 0 stays silent.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const input = JSON.parse(readFileSync(0, 'utf8') || '{}');
const filePath = input.tool_input?.file_path ?? input.tool_response?.filePath ?? '';

if (!/\.tsx?$/.test(filePath)) process.exit(0);

const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
const tsc = path.join(projectDir, 'node_modules', 'typescript', 'bin', 'tsc');
if (!existsSync(tsc)) process.exit(0);

const result = spawnSync(process.execPath, [tsc, '--noEmit', '--pretty', 'false', '-p', projectDir], {
  cwd: projectDir,
  encoding: 'utf8',
});

if (result.status !== 0) {
  process.stderr.write(`TypeScript errors after editing ${path.basename(filePath)}:\n${result.stdout}${result.stderr}`);
  process.exit(2);
}
