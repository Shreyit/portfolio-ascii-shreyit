// Copies the sql.js WebAssembly binary into public/vendor so it is served
// from our own origin (no CDN at runtime). Runs on postinstall and again
// before every build (prebuild), so a host that restores cached
// node_modules and skips postinstall still ships the file.
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const source = require.resolve("sql.js/dist/sql-wasm-browser.wasm");
const target = join(root, "public", "vendor", "sql-wasm.wasm");

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
// Fail loudly rather than ship something that is not WebAssembly.
const magic = readFileSync(target).subarray(0, 4);
if (!magic.equals(Buffer.from([0x00, 0x61, 0x73, 0x6d]))) {
  throw new Error(`${target} is not a WebAssembly binary`);
}
console.log(`copied ${source} -> ${target}`);
