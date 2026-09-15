// Usage: node stdout-tap.mjs <copy file> <command> [args...]
// Runs the command with stdin, stdout, and stderr passed through, and copies
// every byte of its stdout to <copy file>. The MCP client SDK silently skips
// stdout lines that are not JSON, so the test reads this copy to prove there
// were none.
import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";

const [copyFile, command, ...args] = process.argv.slice(2);
const copy = createWriteStream(copyFile);
const child = spawn(command, args, { stdio: ["pipe", "pipe", "inherit"] });

process.stdin.pipe(child.stdin);
child.stdout.on("data", (chunk) => {
  copy.write(chunk);
  process.stdout.write(chunk);
});
child.on("exit", (code) => {
  copy.end(() => process.exit(code ?? 1));
});
