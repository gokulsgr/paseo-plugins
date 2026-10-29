/// <reference types="node" />
import { execFile, spawn, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir, hostname } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { accountList, type AccountList, type LoginState, type Provider } from "../shared/accounts";

const run = promisify(execFile);
const home = homedir();
const binDir = join(home, ".local/share/account-switcher/bin");
// The daemon may start without a login shell's PATH; the scripts need jq, rsync and the agent CLIs.
const env = {
  ...process.env,
  PATH: [binDir, join(home, ".local/bin"), "/opt/homebrew/bin", "/usr/local/bin", process.env.PATH ?? "/usr/bin:/bin"].join(":"),
};

function tool(provider: Provider): string {
  const installed = join(binDir, `${provider}-accounts`);
  return existsSync(installed) ? installed : `${provider}-accounts`;
}

function agentBin(name: string): string {
  const local = join(home, ".local/bin", name);
  return existsSync(local) ? local : name;
}

async function accounts(provider: Provider, ...args: string[]): Promise<string> {
  try {
    const { stdout } = await run(tool(provider), args, { env, timeout: 120_000, maxBuffer: 4 * 1024 * 1024 });
    return stdout.trim();
  } catch (error) {
    const failed = error as { stderr?: string; code?: number | string };
    throw new Error(failed.stderr?.trim() || `${provider}-accounts ${args[0]} failed (exit ${failed.code ?? "?"})`);
  }
}

export async function list(provider: Provider): Promise<AccountList> {
  const parsed = JSON.parse(await accounts(provider, "ls", "--json"));
  return accountList.parse({ ...parsed, provider, host: hostname().replace(/\.local$/, "") });
}

export async function use(provider: Provider, id: string): Promise<{ active: string }> {
  await accounts(provider, "use", id);
  return { active: id };
}

export async function remove(provider: Provider, id: string): Promise<{ removed: string }> {
  cancel(provider, id);
  await accounts(provider, "remove", id);
  return { removed: id };
}

/** The config folder new sessions should use, or null for the System default login. */
export function activeDir(provider: "claude" | "codex"): string | null {
  try {
    return readFileSync(join(home, `.${provider}-accounts/active-dir`), "utf8").trim() || null;
  } catch {
    return null;
  }
}

type LoginSession = { child: ChildProcess; state: LoginState; output: string; finish?: () => Promise<void> };
const logins = new Map<string, LoginSession>();
const idle: LoginState = { status: "idle", url: null, message: null };
const key = (provider: Provider, id: string) => `${provider}:${id}`;

// Each CLI prints a sign-in link: Claude's page then shows a code to paste back, Codex's page
// redirects to a 127.0.0.1 address only the host can reach, and Cursor's finishes by itself.
const signInLink: Record<Provider, RegExp> = {
  claude: /https:\/\/[^\s\u0007\u001b]*oauth\/authorize[^\s\u0007\u001b]*/,
  codex: /https:\/\/auth\.openai\.com\/[^\s\u0007\u001b]*/,
  cursor: /https:\/\/cursor\.com\/[^\s\u0007\u001b]*/,
};

const plainText = (text: string) => text.replace(/\u001b\][^\u0007]*\u0007|\u001b\[[0-9;?]*[A-Za-z]/g, "").trim();

export function loginState(provider: Provider, id: string): LoginState {
  return logins.get(key(provider, id))?.state ?? idle;
}

export async function startLogin(provider: Provider, given?: string): Promise<LoginState & { id: string }> {
  let id = given;
  if (!id) {
    id = provider === "cursor" ? "new" : (await accounts(provider, "add")).split("\n").pop() ?? "";
  }
  const current = logins.get(key(provider, id));
  if (current?.state.status === "waiting") return { ...current.state, id };

  let command: string;
  let args: string[];
  let extraEnv: Record<string, string> = {};
  let finish: (() => Promise<void>) | undefined;
  if (provider === "cursor") {
    // Cursor signs one login in for the whole machine, so save the live one and sign it out first.
    await accounts("cursor", "begin-add");
    command = agentBin("cursor-agent");
    args = ["login"];
    finish = async () => {
      await accounts("cursor", "finish-add");
    };
  } else {
    const dir = (await list(provider)).accounts.find((one) => one.id === id)?.dir;
    if (!dir) throw new Error(`No ${provider} account ${id}`);
    command = agentBin(provider);
    args = provider === "claude" ? ["auth", "login"] : ["login"];
    extraEnv = provider === "claude" ? { CLAUDE_CONFIG_DIR: dir } : { CODEX_HOME: dir };
  }

  const child = spawn(command, args, { env: { ...env, ...extraEnv }, stdio: ["pipe", "pipe", "pipe"] });
  const session: LoginSession = { child, output: "", finish, state: { status: "waiting", url: null, message: null } };
  logins.set(key(provider, id), session);

  const read = (chunk: Buffer) => {
    session.output += chunk.toString();
    const url = session.output.match(signInLink[provider])?.[0];
    if (url && !session.state.url) session.state = { ...session.state, url };
  };
  child.stdout?.on("data", read);
  child.stderr?.on("data", read);
  child.on("error", (error) => {
    session.state = { ...session.state, status: "failed", message: error.message };
  });
  child.on("exit", (code) => {
    if (session.state.status !== "waiting") return;
    const last = plainText(session.output).split("\n").pop();
    if (code !== 0) {
      session.state = { ...session.state, status: "failed", message: last || `Sign-in exited with code ${code}` };
      if (provider === "cursor") void accounts("cursor", "cancel-add").catch(() => {});
      return;
    }
    const done = session.finish ? session.finish() : Promise.resolve();
    done.then(
      () => {
        session.state = { ...session.state, status: "done", message: null };
      },
      (error: Error) => {
        session.state = { ...session.state, status: "failed", message: error.message };
      },
    );
  });

  // Give the CLI a moment to print its link before the screen asks for it.
  for (let waited = 0; waited < 4000 && !session.state.url && session.state.status === "waiting"; waited += 100) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return { ...session.state, id };
}

export async function sendCode(provider: Provider, id: string, code: string): Promise<LoginState> {
  const session = logins.get(key(provider, id));
  if (!session || session.state.status !== "waiting") throw new Error("No sign-in is waiting for a code");
  const value = code.trim();
  if (provider === "codex") {
    // The browser could not reach the host's 127.0.0.1, so the host calls its own callback.
    const callback = new URL(value);
    if (!["127.0.0.1", "localhost"].includes(callback.hostname) || !callback.pathname.startsWith("/auth/callback")) {
      throw new Error("Paste the whole 127.0.0.1:1455/auth/callback address from the browser");
    }
    await fetch(callback, { redirect: "manual" });
    return session.state;
  }
  session.child.stdin?.write(`${value}\n`);
  return session.state;
}

export function cancel(provider: Provider, id: string): LoginState {
  const session = logins.get(key(provider, id));
  if (session?.state.status === "waiting") {
    session.child.kill();
    if (provider === "cursor") void accounts("cursor", "cancel-add").catch(() => {});
  }
  logins.delete(key(provider, id));
  return idle;
}

export function cancelAll(): void {
  for (const name of [...logins.keys()]) {
    const [provider, id] = name.split(":") as [Provider, string];
    cancel(provider, id);
  }
}
