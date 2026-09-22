import {
  chmod,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { CliError } from "./errors";

export const DEFAULT_SERVER = "http://localhost:3000";

/** `AI_TUTOR_URL`, else the local dev server; no trailing slash. */
export function serverUrl(env = process.env) {
  const raw = env.AI_TUTOR_URL || DEFAULT_SERVER;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new CliError(`AI_TUTOR_URL is not a valid URL: ${raw}`);
  }
  return url.href.replace(/\/+$/, "");
}

/**
 * Resolved the way gh resolves its own: an explicit override, then the XDG
 * base directory, then %AppData% on Windows, then ~/.config.
 */
export function configDir(env = process.env) {
  if (env.AI_TUTOR_CONFIG_DIR) return env.AI_TUTOR_CONFIG_DIR;
  if (env.XDG_CONFIG_HOME) return join(env.XDG_CONFIG_HOME, "ai-tutor");
  if (process.platform === "win32" && env.APPDATA) {
    return join(env.APPDATA, "ai-tutor");
  }
  return join(homedir(), ".config", "ai-tutor");
}

export const hostsFile = () => join(configDir(), "hosts.json");

/** One signed session token per server URL. */
const Hosts = z.record(z.string(), z.object({ token: z.string().min(1) }));
type Hosts = z.infer<typeof Hosts>;

async function readHosts(): Promise<Hosts> {
  let text: string;
  try {
    text = await readFile(hostsFile(), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw error;
  }
  const parsed = Hosts.safeParse(JSON.parse(text));
  if (!parsed.success) {
    throw new CliError(
      `${hostsFile()} is corrupt; delete it and run \`ai-tutor login\` again.`,
    );
  }
  return parsed.data;
}

async function writeHosts(hosts: Hosts) {
  const file = hostsFile();
  if (Object.keys(hosts).length === 0) {
    await rm(file, { force: true });
    return;
  }
  const dir = configDir();
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await chmod(dir, 0o700);
  // Write-then-rename so a crash never leaves a half-written token file, and
  // chmod explicitly because `mode` is ignored when the file already exists.
  const temp = `${file}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(hosts, null, 2)}\n`, {
    mode: 0o600,
  });
  await chmod(temp, 0o600);
  await rename(temp, file);
}

export async function readToken(server: string) {
  return (await readHosts())[server]?.token;
}

export async function saveToken(server: string, token: string) {
  const hosts = await readHosts();
  hosts[server] = { token };
  await writeHosts(hosts);
}

export async function deleteToken(server: string) {
  const hosts = await readHosts();
  delete hosts[server];
  await writeHosts(hosts);
}
