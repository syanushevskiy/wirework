// `pnpm -r run test` SKIPS a package that has no `test` script, silently.
// This refuses to let that happen: every package under packages/ must
// declare one, or be named here with the reason it has nothing to test.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const EXEMPT = {
  "@wirework/view-data-models-examples": "fixtures: data only, checked by the engine's tests",
};

const root = join(process.cwd(), "packages");
const missing = readdirSync(root, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => JSON.parse(readFileSync(join(root, entry.name, "package.json"), "utf8")))
  .filter((pkg) => typeof pkg.scripts?.test !== "string" && !(pkg.name in EXEMPT))
  .map((pkg) => pkg.name);

if (missing.length > 0) {
  console.error(
    `These packages have no "test" script, so pnpm test:unit would skip them silently:\n  ${missing.join("\n  ")}`,
  );
  process.exit(1);
}
