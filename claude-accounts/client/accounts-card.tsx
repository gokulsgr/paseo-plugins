import type { PluginTheme } from "@getpaseo/plugin";
import { useRpc } from "@getpaseo/plugin/client";
import { ExternalLink, Icon, TextInput, useToast } from "@getpaseo/plugin/client/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  addAccount,
  cancelLogin,
  getLoginState,
  listAccounts,
  removeAccount,
  sendLoginCode,
  startLogin,
  useAccount,
  type Account,
} from "../shared/accounts";
import { claudeIcon } from "./icons";

const LIST_KEY = ["claude-accounts", "list"];

export function formatAdded(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function makeStyles(theme: PluginTheme, compact: boolean) {
  const c = theme.colors;
  return {
    card: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 16,
      padding: compact ? 16 : 28,
      gap: 20,
      backgroundColor: c.surface1,
    },
    titleRow: { flexDirection: "row" as const, alignItems: "center" as const, gap: 10 },
    title: { color: c.foreground, fontSize: 18, fontWeight: "600" as const },
    muted: { color: c.foregroundMuted, fontSize: 14, lineHeight: 20 },
    sectionRow: {
      flexDirection: compact ? ("column" as const) : ("row" as const),
      alignItems: compact ? ("flex-start" as const) : ("center" as const),
      justifyContent: "space-between" as const,
      gap: 12,
    },
    sectionTitle: { color: c.foreground, fontSize: 16, fontWeight: "600" as const },
    button: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 6,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: c.surface0,
    },
    buttonText: { color: c.foreground, fontSize: 14, fontWeight: "500" as const },
    plainButton: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, paddingVertical: 6 },
    row: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 12,
      padding: compact ? 14 : 18,
      gap: 6,
      backgroundColor: c.surface0,
    },
    rowActive: { borderColor: c.foregroundMuted, backgroundColor: c.surface2 },
    rowTop: {
      flexDirection: compact ? ("column" as const) : ("row" as const),
      alignItems: compact ? ("flex-start" as const) : ("center" as const),
      justifyContent: "space-between" as const,
      gap: 10,
    },
    rowName: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8, flexWrap: "wrap" as const },
    rowTitle: { color: c.foreground, fontSize: 16, fontWeight: "500" as const },
    chip: { borderWidth: 1, borderColor: c.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
    chipText: { color: c.foregroundMuted, fontSize: 12 },
    actions: { flexDirection: "row" as const, alignItems: "center" as const, gap: 16 },
    danger: { color: c.statusDanger, fontSize: 14 },
    login: { gap: 10, borderTopWidth: 1, borderTopColor: c.border, paddingTop: 12, marginTop: 6 },
    input: {
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      color: c.foreground,
      backgroundColor: c.surface1,
      fontSize: 14,
    },
    link: { color: c.accent, fontSize: 14 },
  };
}

type Styles = ReturnType<typeof makeStyles>;

function Chip({ styles, label }: { styles: Styles; label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

function SignIn({ id, styles, theme, onDone }: { id: string; styles: Styles; theme: PluginTheme; onDone: () => void }) {
  const toast = useToast();
  const readState = useRpc(getLoginState);
  const submitCode = useRpc(sendLoginCode);
  const cancel = useRpc(cancelLogin);
  const [code, setCode] = useState("");
  const state = useQuery({
    queryKey: ["claude-accounts", "login", id],
    queryFn: async () => {
      const next = await readState({ id });
      if (next.status === "done") {
        toast.show("Signed in");
        onDone();
      }
      return next;
    },
    refetchInterval: 1500,
  });
  const send = useMutation({ mutationFn: submitCode, onError: (error) => toast.error(String(error)) });
  const current = state.data;
  return (
    <View style={styles.login}>
      <Text style={styles.muted}>
        {current?.status === "failed"
          ? `Sign-in failed: ${current.message ?? "unknown error"}`
          : "Finish signing in in your browser. If it did not open, use the link, then paste the code it shows."}
      </Text>
      {current?.url ? (
        <ExternalLink href={current.url} accessibilityLabel="Open the Claude sign-in page">
          <Text style={styles.link}>Open sign-in page</Text>
        </ExternalLink>
      ) : null}
      <View style={styles.actions}>
        <TextInput
          value={code}
          onChangeText={setCode}
          placeholder="Paste the code here"
          placeholderTextColor={theme.colors.foregroundMuted}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, { flex: 1 }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send the sign-in code"
          disabled={!code.trim() || send.isPending}
          onPress={() => send.mutate({ id, code: code.trim() }, { onSuccess: () => setCode("") })}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Submit</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel signing in"
          onPress={() => void cancel({ id }).then(onDone)}
          style={styles.plainButton}
        >
          <Text style={styles.muted}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function AccountsCard({ theme, compact }: { theme: PluginTheme; compact: boolean }) {
  const styles = useMemo(() => makeStyles(theme, compact), [theme, compact]);
  const toast = useToast();
  const queryClient = useQueryClient();
  const refresh = () => void queryClient.invalidateQueries({ queryKey: LIST_KEY });
  const fail = (error: unknown) => toast.error(error instanceof Error ? error.message : String(error));

  const list = useQuery({ queryKey: LIST_KEY, queryFn: useRpc(listAccounts).bind(null, {}) });
  const use = useMutation({ mutationFn: useRpc(useAccount), onSuccess: refresh, onError: fail });
  const add = useMutation({ mutationFn: useRpc(addAccount), onError: fail });
  const remove = useMutation({ mutationFn: useRpc(removeAccount), onSuccess: refresh, onError: fail });
  const login = useMutation({ mutationFn: useRpc(startLogin), onError: fail });
  const [signingIn, setSigningIn] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const beginLogin = (id: string) => {
    setSigningIn(id);
    login.mutate({ id });
  };
  const finishLogin = () => {
    setSigningIn(null);
    refresh();
  };

  const data = list.data;
  const host = data?.host ?? "this computer";

  const accountRow = (account: Account) => {
    const active = data?.active === account.id;
    return (
      <View key={account.id} style={[styles.row, active && styles.rowActive]}>
        <View style={styles.rowTop}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Use ${account.email ?? account.id} for new Claude sessions`}
            disabled={!account.loggedIn || active}
            onPress={() => use.mutate({ id: account.id })}
            style={{ flex: 1, gap: 4 }}
          >
            <View style={styles.rowName}>
              <Text style={styles.rowTitle}>{account.email ?? "Not signed in"}</Text>
              <Chip styles={styles} label={host} />
              {active ? <Chip styles={styles} label="Active" /> : null}
            </View>
            <Text style={styles.muted}>
              {[account.orgName, formatAdded(account.addedAt)].filter(Boolean).join(" · ")}
            </Text>
          </Pressable>
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Sign ${account.email ?? account.id} in again`}
              onPress={() => beginLogin(account.id)}
              style={styles.plainButton}
            >
              <Icon name="RefreshCw" size={16} color={theme.colors.foregroundMuted} />
              <Text style={styles.muted}>Sign in again</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove ${account.email ?? account.id}`}
              onPress={() => {
                if (confirmRemove !== account.id) return setConfirmRemove(account.id);
                setConfirmRemove(null);
                remove.mutate({ id: account.id });
              }}
              style={styles.plainButton}
            >
              <Icon name="Trash2" size={16} color={confirmRemove === account.id ? theme.colors.statusDanger : theme.colors.foreground} />
              <Text style={confirmRemove === account.id ? styles.danger : styles.buttonText}>
                {confirmRemove === account.id ? "Confirm remove" : "Remove"}
              </Text>
            </Pressable>
          </View>
        </View>
        {signingIn === account.id ? (
          <SignIn id={account.id} styles={styles} theme={theme} onDone={finishLogin} />
        ) : null}
      </View>
    );
  };

  const defaultActive = data?.active === "default";
  return (
    <View style={styles.card}>
      <View style={{ gap: 8 }}>
        <View style={styles.titleRow}>
          <Icon icon={{ svg: claudeIcon }} size={24} />
          <Text style={styles.title}>Claude</Text>
        </View>
        <Text style={styles.muted}>
          Optional. Paseo can use your normal Claude login; add accounts only if you want quick switching without
          moving chat sessions.
        </Text>
      </View>

      <View style={styles.sectionRow}>
        <View style={{ flex: compact ? undefined : 1, gap: 4 }}>
          <Text style={styles.sectionTitle}>Accounts</Text>
          <Text style={styles.muted}>
            Showing accounts managed by {host}. New accounts sign in there; you finish in this device's browser.
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a Claude account"
          disabled={add.isPending}
          onPress={() =>
            add.mutate({}, {
              onSuccess: ({ id }) => {
                refresh();
                beginLogin(id);
              },
            })
          }
          style={styles.button}
        >
          <Icon name="Plus" size={16} color={theme.colors.foreground} />
          <Text style={styles.buttonText}>Add Account</Text>
        </Pressable>
      </View>

      {list.isError ? <Text style={styles.danger}>Could not read accounts: {String(list.error)}</Text> : null}

      <View style={{ gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Use the System default Claude login for new sessions"
          disabled={defaultActive}
          onPress={() => use.mutate({ id: "default" })}
          style={[styles.row, defaultActive && styles.rowActive]}
        >
          <View style={styles.rowName}>
            <Text style={styles.rowTitle}>
              System default: {data ? (data.systemDefault.email ?? "signed out") : "…"}
            </Text>
            {defaultActive ? <Chip styles={styles} label="Active" /> : null}
          </View>
          <Text style={styles.muted}>Use your current {host} Claude login.</Text>
        </Pressable>
        {data?.accounts.map(accountRow)}
      </View>

      <Text style={styles.muted}>
        Click an account to use it. New Claude sessions and terminals use it; sessions already running keep theirs.
      </Text>
    </View>
  );
}
