// Portable development launcher. The same built UI is served by FastAPI.
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { resolve } from "node:path";
const localPython = resolve(
  process.platform === "win32"
    ? ".venv/Scripts/python.exe"
    : ".venv/bin/python",
);
const python = existsSync(localPython)
  ? localPython
  : process.platform === "win32"
    ? "python"
    : "python3";
const args = process.argv.slice(2);
const portIndex = args.indexOf("--port");
const port = portIndex >= 0 ? args[portIndex + 1] : process.env.PORT || "8000";
if (!/^\d+$/.test(port)) throw new Error("Port must be an integer.");
const child = spawn(
  python,
  ["-m", "uvicorn", "acme.main:app", "--host", "0.0.0.0", "--port", port],
  { stdio: "inherit", env: { ...process.env, PYTHONPATH: resolve("backend") } },
);
child.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", (code) => process.exit(code ?? 1));
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () => child.kill(signal));
