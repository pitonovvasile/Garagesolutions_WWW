import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tmp = await mkdtemp(path.join(tmpdir(), "aero-impact-test-"));
const outfile = path.join(tmp, "aerodynamicImpact.test.mjs");

await esbuild.build({
  entryPoints: [path.join(root, "tests/aerodynamicImpact.test.ts")],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node20",
  sourcemap: "inline",
});

const child = spawn(process.execPath, ["--test", outfile], {
  stdio: "inherit",
});

const code = await new Promise((resolve) => {
  child.on("close", resolve);
});

await rm(tmp, { recursive: true, force: true });
if (code !== 0) {
  process.exit(typeof code === "number" ? code : 1);
}
