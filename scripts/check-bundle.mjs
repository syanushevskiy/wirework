/**
 * The bundle check (doc/ADR/0018-lazy-widgets.md): a lazy widget stays lazy.
 *
 * Read after `pnpm --filter playground build`. The demo's code editor is
 * registered with `load`, so its component must be in a chunk of its own —
 * and one careless import (the component's module from a contract file,
 * from the registration, from anything the entry reaches) puts it back into
 * what every page downloads, with no test of behaviour noticing. This is
 * the test that notices: the editor's mark is in exactly one chunk, never
 * the entry, and the entry stays within its budget.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const DIST = "apps/playground/dist";
/** A string only the editor's component holds (apps/playground/src/widgets/code-editor.tsx). */
const MARK = "ww-demo-code-editor-chunk";
/** What every visitor downloads, at most — today's entry plus room to breathe. Lower it when the entry shrinks. */
const ENTRY_BUDGET_KB = 2400;

const fail = (message) => {
  console.error(`check-bundle: ${message}`);
  process.exit(1);
};

let html;
try {
  html = readFileSync(join(DIST, "index.html"), "utf8");
} catch {
  fail(`no build at ${DIST} — run "pnpm --filter playground build" first`);
}

const entry = /<script[^>]*type="module"[^>]*src="\/?(assets\/[^"]+\.js)"/.exec(html)?.[1];
if (entry === undefined) fail("index.html names no entry script");

const chunks = readdirSync(join(DIST, "assets"))
  .filter((file) => file.endsWith(".js"))
  .map((file) => {
    const text = readFileSync(join(DIST, "assets", file), "utf8");
    return { file: `assets/${file}`, kb: Math.round(Buffer.byteLength(text) / 1000), marked: text.includes(MARK) };
  });

const entryChunk = chunks.find((chunk) => chunk.file === entry);
if (entryChunk === undefined) fail(`the entry ${entry} is not among the built chunks`);

const marked = chunks.filter((chunk) => chunk.marked);
if (entryChunk.marked) {
  fail(`the code editor is in the ENTRY chunk (${entry}): something the application starts with imports its component`);
}
if (marked.length !== 1) {
  fail(`the code editor's mark is in ${marked.length} chunks (expected exactly one, apart from the entry)`);
}
if (entryChunk.kb > ENTRY_BUDGET_KB) {
  fail(`the entry chunk is ${entryChunk.kb} kB, over its budget of ${ENTRY_BUDGET_KB} kB`);
}

console.log(
  `check-bundle: entry ${entryChunk.kb} kB (budget ${ENTRY_BUDGET_KB} kB); the code editor in ${marked[0].file}, ${marked[0].kb} kB`,
);
