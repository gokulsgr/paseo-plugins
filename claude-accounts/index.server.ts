import type { PluginServerContext } from "@getpaseo/plugin/server";
import * as accounts from "./server/accounts";
import {
  addAccount,
  cancelLogin,
  getLoginState,
  listAccounts,
  removeAccount,
  sendLoginCode,
  startLogin,
  useAccount,
} from "./shared/accounts";

export default function contribute(server: PluginServerContext) {
  server.handle(listAccounts, () => accounts.list());
  server.handle(useAccount, ({ id }) => accounts.use(id));
  server.handle(addAccount, () => accounts.add());
  server.handle(removeAccount, ({ id }) => accounts.remove(id));
  server.handle(startLogin, ({ id }) => accounts.startLogin(id));
  server.handle(sendLoginCode, ({ id, code }) => accounts.sendCode(id, code));
  server.handle(getLoginState, ({ id }) => accounts.loginState(id));
  server.handle(cancelLogin, ({ id }) => accounts.cancel(id));

  // Chat agents follow the picked account the way terminals do through claude-routed. A session
  // already running keeps the login it opened with.
  const removeHook = server.before("agent.session_open", ({ request }) => {
    if (request.provider.split("/")[0] !== "claude" || request.env.CLAUDE_CONFIG_DIR) return;
    const dir = accounts.activeDir();
    if (!dir) return;
    return { ...request, env: { ...request.env, CLAUDE_CONFIG_DIR: dir } };
  });

  return () => {
    removeHook();
    accounts.cancelAll();
  };
}
