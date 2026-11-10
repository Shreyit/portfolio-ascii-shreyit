// Copies the sql.js WebAssembly binary into public/vendor so it is served
// from our own origin (no CDN at runtime). Runs on postinstall.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const source = require.resolve("sql.js/dist/sql-wasm-browser.wasm");
const target = join(root, "public", "vendor", "sql-wasm.wasm");

mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
console.log(`copied ${source} -> ${target}`);
