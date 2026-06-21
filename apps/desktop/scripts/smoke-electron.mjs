import { spawn } from "node:child_process";
import { once } from "node:events";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const desktopDir = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const electronBin = join(desktopDir, "node_modules", ".bin", process.platform === "win32" ? "electron.cmd" : "electron");
const childEnv = { ...process.env };
delete childEnv.ELECTRON_RUN_AS_NODE;

const child = spawn(electronBin, ["."], {
  cwd: desktopDir,
  stdio: "inherit",
  env: {
    ...childEnv,
    ICPC_TRAINER_DESKTOP_SMOKE: "1",
    ICPC_TRAINER_WEB_URL:
      "data:text/html,%3C!doctype%20html%3E%3Ctitle%3EICPC%20Trainer%3C%2Ftitle%3E%3Cbody%3EICPC%20Trainer%3C%2Fbody%3E"
  }
});

const timeout = setTimeout(() => {
  child.kill();
  console.error("Electron smoke test timed out.");
  process.exit(1);
}, 15_000);

const [code, signal] = await once(child, "exit");
clearTimeout(timeout);

if (signal) {
  console.error(`Electron exited with signal ${signal}.`);
  process.exit(1);
}

process.exit(Number(code ?? 0));
