import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

const login = z.object({
  loggedIn: z.boolean(),
  email: z.string().nullable(),
  orgName: z.string().nullable(),
  subscriptionType: z.string().nullable(),
});

const account = login.extend({ id: z.string(), dir: z.string(), addedAt: z.string() });

export const accountList = z.object({
  host: z.string(),
  active: z.string(),
  systemDefault: login,
  accounts: z.array(account),
});

export type AccountList = z.infer<typeof accountList>;
export type Account = z.infer<typeof account>;

export const listAccounts = defineRpc({
  name: "accounts.list",
  input: z.object({}),
  output: accountList,
});

export const useAccount = defineRpc({
  name: "accounts.use",
  input: z.object({ id: z.string() }),
  output: z.object({ active: z.string() }),
});

export const addAccount = defineRpc({
  name: "accounts.add",
  input: z.object({}),
  output: z.object({ id: z.string() }),
});

export const removeAccount = defineRpc({
  name: "accounts.remove",
  input: z.object({ id: z.string() }),
  output: z.object({ removed: z.string() }),
});

export const loginState = z.object({
  status: z.enum(["idle", "waiting", "done", "failed"]),
  url: z.string().nullable(),
  message: z.string().nullable(),
});

export type LoginState = z.infer<typeof loginState>;

export const startLogin = defineRpc({
  name: "accounts.login.start",
  input: z.object({ id: z.string() }),
  output: loginState,
});

export const sendLoginCode = defineRpc({
  name: "accounts.login.code",
  input: z.object({ id: z.string(), code: z.string().min(1) }),
  output: loginState,
});

export const getLoginState = defineRpc({
  name: "accounts.login.state",
  input: z.object({ id: z.string() }),
  output: loginState,
});

export const cancelLogin = defineRpc({
  name: "accounts.login.cancel",
  input: z.object({ id: z.string() }),
  output: loginState,
});
