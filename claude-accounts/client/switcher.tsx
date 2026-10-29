import type { PluginPopoverProps, PluginSidebarItemProps } from "@getpaseo/plugin/client";
import { useRpc } from "@getpaseo/plugin/client";
import { Icon, SidebarRow, useToast } from "@getpaseo/plugin/client/ui";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { listAccounts, useAccount, type AccountList } from "../shared/accounts";
import { claudeIcon } from "./icons";

// Sidebar items and popovers are outside the screens' query client, so this keeps its own state.
function useAccountList() {
  const read = useRpc(listAccounts);
  const [data, setData] = useState<AccountList | null>(null);
  const reload = useCallback(() => {
    read({})
      .then(setData)
      .catch(() => setData(null));
  }, [read]);
  useEffect(() => {
    reload();
    const timer = setInterval(reload, 30_000);
    return () => clearInterval(timer);
  }, [reload]);
  return { data, reload };
}

function activeLabel(data: AccountList | null): string {
  if (!data) return "Claude";
  const email =
    data.active === "default"
      ? data.systemDefault.email
      : data.accounts.find((one) => one.id === data.active)?.email;
  return `Claude: ${email ?? data.active}`;
}

function SwitcherPopover({ theme, close, openScreen }: PluginPopoverProps) {
  const { data } = useAccountList();
  const use = useRpc(useAccount);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const c = theme.colors;
  const pick = async (id: string, email: string | null) => {
    setBusy(true);
    try {
      await use({ id });
      toast.show(`New Claude sessions use ${email ?? id}`);
      close();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      setBusy(false);
    }
  };
  const options = data
    ? [
        { id: "default", email: data.systemDefault.email, note: "System default", loggedIn: data.systemDefault.loggedIn },
        ...data.accounts.map((one) => ({ id: one.id, email: one.email, note: one.orgName, loggedIn: one.loggedIn })),
      ]
    : [];
  return (
    <View style={{ padding: 8, minWidth: 280, gap: 2 }}>
      {data === null ? <Text style={{ color: c.foregroundMuted, padding: 10 }}>Loading accounts…</Text> : null}
      {options.map((option) => {
        const active = data?.active === option.id;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityLabel={`Use ${option.email ?? option.id}`}
            disabled={busy || active || !option.loggedIn}
            onPress={() => void pick(option.id, option.email)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              padding: 10,
              borderRadius: 8,
              backgroundColor: pressed || active ? c.surface2 : "transparent",
              opacity: option.loggedIn ? 1 : 0.5,
            })}
          >
            <View style={{ width: 16 }}>
              {active ? <Icon name="Check" size={16} color={c.foreground} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.foreground, fontSize: 14 }}>{option.email ?? "Not signed in"}</Text>
              {option.note ? <Text style={{ color: c.foregroundMuted, fontSize: 12 }}>{option.note}</Text> : null}
            </View>
          </Pressable>
        );
      })}
      <View style={{ height: 1, backgroundColor: c.border, marginVertical: 6 }} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Manage Claude accounts"
        onPress={() => openScreen({ screenId: "accounts" })}
        style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 10 }}
      >
        <Icon name="Settings" size={16} color={c.foregroundMuted} />
        <Text style={{ color: c.foregroundMuted, fontSize: 14 }}>Manage accounts…</Text>
      </Pressable>
    </View>
  );
}

export function SwitcherItem({ currentScreen, openPopover }: PluginSidebarItemProps) {
  const { data } = useAccountList();
  return (
    <SidebarRow
      icon={{ svg: claudeIcon }}
      label={activeLabel(data)}
      active={currentScreen?.screenId === "accounts"}
      onPress={() => openPopover(SwitcherPopover)}
    />
  );
}
