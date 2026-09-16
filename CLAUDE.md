# CLAUDE.md

## Shell command rules (keep auto mode prompt-free)

This project runs Claude Code in auto mode with reads outside the working directory blocked. Any shell command that can't be statically analyzed triggers a manual approval prompt and stops the work. Follow these rules for every Bash call.

### Never pipe code into an interpreter
- Do NOT use `node -e`, `node -`, `python -c`, `python -`, `bash -c`, `sh -c`, `eval`, or `npx tsx -e`.
- Do NOT pipe into interpreters: `... | node`, `... | python`, `... | bash`.
- Do NOT use heredocs or here-strings in shell commands: `<<EOF`, `<<'EOF'`, `<<<`.
- Do NOT create or edit files via the shell (`cat > file <<EOF`, `echo ... > file`, `sed -i`). Use the Edit/Write tools instead.

### One-off scripts go in a file
1. Write the script with the Write tool to `.claude-tmp/<name>.mjs` (or `.ts` / `.py`).
2. Run it with a plain command: `node .claude-tmp/<name>.mjs`.
3. Delete it when finished unless it is worth keeping. If so, move it to `scripts/` and add an npm script.

### Keep commands simple
- Run from the repo root. Avoid `cd other/dir && ...`.
- One command per Bash call. Avoid long `&&` / `;` chains, subshells `$(...)`, and backticks.
- Keep everything inside the repo. Do not read or write `~`, `/tmp`, or other absolute paths outside the project. Use `.claude-tmp/` for scratch files and logs.
- Prefer npm scripts from `package.json` over ad-hoc commands. Check `package.json` for the exact script names before running anything.

## E2E tests (Playwright)

- Full suite: `npm run test:e2e` (or `npx playwright test` if no script exists).
- Single file: `npx playwright test tests/e2e/<file>.spec.ts`
- Single test: `npx playwright test tests/e2e/<file>.spec.ts -g "<test name>"`
- Never use interactive flags: `--ui`, `--debug`, `--headed`, or `npx playwright show-report`. They block the session.
- Use `--reporter=line` for compact output.
- When a test fails, read the error output and the relevant spec/page files with the Read tool. Do not write ad-hoc scripts to inspect results.
- After changing test steps, rerun only the affected spec files first, then the full suite.