/// <reference types="node" />
import { execFile, spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir, hostname } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { accountList, type AccountList, type LoginState } from "../shared/accounts";

const run = promisify(execFile);
const home = homedir();
const installedCli = join(home, ".local/share/claude-accounts/bin/claude-accounts");
const cli = existsSync(installedCli) ? installedCli : "claude-accounts";
const activeDirFile = join(home, ".claude-accounts/active-dir");
const claudeBin = existsSync(join(home, ".local/bin/claude")) ? join(home, ".local/bin/claude") : "claude";
// The daemon may start without a login shell's PATH; the CLI needs jq, rsync and claude.
const env = {
  ...process.env,
  PATH: [join(home, ".local/bin"), "/opt/homebrew/bin", "/usr/local/bin", process.env.PATH ?? "/usr/bin:/bin"].join(":"),
};

async function accounts(...args: string[]): Promise<string> {
  try {
    const { stdout } = await run(cli, args, { env, timeout: 120_000, maxBuffer: 4 * 1024 * 1024 });
    return stdout.trim();
  } catch (error) {
    const failed = error as { stderr?: string; code?: number | string };
    throw new Error(failed.stderr?.trim() || `claude-accounts ${args[0]} failed (exit ${failed.code ?? "?"})`);
  }
}

export async function list(): Promise<AccountList> {
  const parsed = JSON.parse(await accounts("ls", "--json"));
  return accountList.parse({ ...parsed, host: hostname().replace(/\.local$/, "") });
}

export async function use(id: string): Promise<{ active: string }> {
  await accounts("use", id);
  return { active: id };
}

export async function add(): Promise<{ id: string }> {
  return { id: (await accounts("add")).split("\n").pop() ?? "" };
}

export async function remove(id: string): Promise<{ removed: string }> {
  cancel(id);
  await accounts("remove", id);
  return { removed: id };
}

/** The folder new Claude sessions should use, or null for the System default login. */
export function activeDir(): string | null {
  try {
    return readFileSync(activeDirFile, "utf8").trim() || null;
  } catch {
    return null;
  }
}

type LoginSession = { child: ChildProcess; state: LoginState; output: string };
const logins = new Map<string, LoginSession>();
const idle: LoginState = { status: "idle", url: null, message: null };

export function loginState(id: string): LoginState {
  return logins.get(id)?.state ?? idle;
}

// `claude auth login` opens the daemon machine's browser and also prints a link whose page shows a
// code to paste back, which is how a remote host or a blocked browser finishes.
export async function startLogin(id: string): Promise<LoginState> {
  const current = logins.get(id);
  if (current?.state.status === "waiting") return current.state;
  const { accounts: all } = await list();
  const dir = all.find((one) => one.id === id)?.dir;
  if (!dir) throw new Error(`No account ${id}`);

  const child = spawn(claudeBin, ["auth", "login"], {
    env: { ...env, CLAUDE_CONFIG_DIR: dir },
    stdio: ["pipe", "pipe", "pipe"],
  });
  const session: LoginSession = { child, output: "", state: { status: "waiting", url: null, message: null } };
  logins.set(id, session);

  const read = (chunk: Buffer) => {
    session.output += chunk.toString();
    const url = session.output.match(/https:\/\/[^\s\u0007\u001b]*oauth\/authorize[^\s\u0007\u001b]*/)?.[0];
    if (url && !session.state.url) session.state = { ...session.state, url };
  };
  child.stdout?.on("data", read);
  child.stderr?.on("data", read);
  child.on("error", (error) => {
    session.state = { ...session.state, status: "failed", message: error.message };
  });
  child.on("exit", (code) => {
    if (session.state.status !== "waiting") return;
    const last = session.output.replace(/\u001b\][^\u0007]*\u0007|\u001b\[[0-9;]*m/g, "").trim().split("\n").pop();
    session.state =
      code === 0
        ? { ...session.state, status: "done", message: null }
        : { ...session.state, status: "failed", message: last || `Sign-in exited with code ${code}` };
  });

  // Give the CLI a moment to print its link before the screen asks for it.
  for (let waited = 0; waited < 3000 && !session.state.url && session.state.status === "waiting"; waited += 100) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return session.state;
}

export function sendCode(id: string, code: string): LoginState {
  const session = logins.get(id);
  if (!session || session.state.status !== "waiting") throw new Error("No sign-in is waiting for a code");
  session.child.stdin?.write(`${code.trim()}\n`);
  return session.state;
}

export function cancel(id: string): LoginState {
  const session = logins.get(id);
  if (session?.state.status === "waiting") session.child.kill();
  logins.delete(id);
  return idle;
}

export function cancelAll(): void {
  for (const id of [...logins.keys()]) cancel(id);
}
