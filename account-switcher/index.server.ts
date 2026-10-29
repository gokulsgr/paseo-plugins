import type { PluginServerContext } from "@getpaseo/plugin/server";
import * as accounts from "./server/accounts";
import {
  cancelLogin,
  getLoginState,
  listAccounts,
  removeAccount,
  sendLoginCode,
  startLogin,
  useAccount,
} from "./shared/accounts";

const homeVariable = { claude: "CLAUDE_CONFIG_DIR", codex: "CODEX_HOME" } as const;

export default function contribute(server: PluginServerContext) {
  server.handle(listAccounts, ({ provider }) => accounts.list(provider));
  server.handle(useAccount, ({ provider, id }) => accounts.use(provider, id));
  server.handle(removeAccount, ({ provider, id }) => accounts.remove(provider, id));
  server.handle(startLogin, ({ provider, id }) => accounts.startLogin(provider, id));
  server.handle(sendLoginCode, ({ provider, id, code }) => accounts.sendCode(provider, id, code));
  server.handle(getLoginState, ({ provider, id }) => accounts.loginState(provider, id));
  server.handle(cancelLogin, ({ provider, id }) => accounts.cancel(provider, id));

  // Chat agents follow the picked account the way terminals do through claude-routed and
  // codex-routed. A session already running keeps the login it opened with. Cursor needs nothing:
  // its one login is swapped for the whole machine.
  const removeHook = server.before("agent.session_open", ({ request }) => {
    const name = request.provider.split("/")[0];
    if (name !== "claude" && name !== "codex") return;
    const variable = homeVariable[name];
    if (request.env[variable]) return;
    const dir = accounts.activeDir(name);
    if (!dir) return;
    return { ...request, env: { ...request.env, [variable]: dir } };
  });

  return () => {
    removeHook();
    accounts.cancelAll();
  };
}
