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

/** What `login` stores per server; the token is never printed. */
export type Credential = {
  token: string;
  user: { id: string; name: string; email: string };
};

type Hosts = Record<string, Credential>;

/**
 * Resolved the way gh resolves its own: an explicit override, then
 * XDG_CONFIG_HOME, then %AppData% on Windows, then ~/.config everywhere else —
 * always outside any repository.
 */
export function configDir(env: NodeJS.ProcessEnv = process.env) {
  if (env.AI_TUTOR_CONFIG_DIR) {
    return env.AI_TUTOR_CONFIG_DIR;
  }
  if (env.XDG_CONFIG_HOME) {
    return join(env.XDG_CONFIG_HOME, "ai-tutor");
  }
  if (process.platform === "win32" && env.APPDATA) {
    return join(env.APPDATA, "ai-tutor");
  }
  return join(homedir(), ".config", "ai-tutor");
}

export const hostsFile = () => join(configDir(), "hosts.json");

async function readHosts(): Promise<Hosts> {
  try {
    return JSON.parse(await readFile(hostsFile(), "utf8")) as Hosts;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

/**
 * Replaces the file through a sibling that is created owner-only, so the token
 * is never readable by anyone else, not even between write and rename.
 */
async function writeHosts(hosts: Hosts) {
  const dir = configDir();
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const file = hostsFile();
  if (Object.keys(hosts).length === 0) {
    await rm(file, { force: true });
    return;
  }

  const temp = `${file}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(hosts, null, 2)}\n`, {
    mode: 0o600,
  });
  // `mode` is filtered through the umask; this is not.
  await chmod(temp, 0o600);
  await rename(temp, file);
}

/** Credentials are keyed by server, so a token is only ever sent where it was issued. */
export async function loadCredential(server: string) {
  return (await readHosts())[server];
}

export async function saveCredential(server: string, credential: Credential) {
  await writeHosts({ ...(await readHosts()), [server]: credential });
}

export async function deleteCredential(server: string) {
  const { [server]: removed, ...rest } = await readHosts();
  if (removed) {
    await writeHosts(rest);
  }
  return removed;
}
