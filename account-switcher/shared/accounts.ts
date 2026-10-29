import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const providers = ["claude", "codex", "cursor"] as const;
export const provider = z.enum(providers);
export type Provider = z.infer<typeof provider>;

const login = z.object({
  loggedIn: z.boolean(),
  email: z.string().nullable(),
  orgName: z.string().nullable(),
  subscriptionType: z.string().nullable(),
});

const account = login.extend({ id: z.string(), dir: z.string(), addedAt: z.string() });

export const accountList = z.object({
  provider,
  host: z.string(),
  active: z.string(),
  // Cursor has one login for the whole machine, so it has no separate "System default" row.
  systemDefault: login.nullable(),
  accounts: z.array(account),
});

export type AccountList = z.infer<typeof accountList>;
export type Account = z.infer<typeof account>;

const target = z.object({ provider });
const one = target.extend({ id: z.string() });

export const listAccounts = defineRpc({ name: "accounts.list", input: target, output: accountList });

export const useAccount = defineRpc({
  name: "accounts.use",
  input: one,
  output: z.object({ active: z.string() }),
});

export const removeAccount = defineRpc({
  name: "accounts.remove",
  input: one,
  output: z.object({ removed: z.string() }),
});

export const loginState = z.object({
  status: z.enum(["idle", "waiting", "done", "failed"]),
  url: z.string().nullable(),
  message: z.string().nullable(),
});

export type LoginState = z.infer<typeof loginState>;

/** Starts a sign-in. Without `id` it adds an account; with one it signs that account in again. */
export const startLogin = defineRpc({
  name: "accounts.login.start",
  input: target.extend({ id: z.string().optional() }),
  output: loginState.extend({ id: z.string() }),
});

/** Claude takes the code its page shows; Codex takes the failed 127.0.0.1 address. */
export const sendLoginCode = defineRpc({
  name: "accounts.login.code",
  input: one.extend({ code: z.string().min(1) }),
  output: loginState,
});

export const getLoginState = defineRpc({ name: "accounts.login.state", input: one, output: loginState });

export const cancelLogin = defineRpc({ name: "accounts.login.cancel", input: one, output: loginState });
