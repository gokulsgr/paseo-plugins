import type { PluginPopoverProps, PluginSidebarItemProps } from "@getpaseo/plugin/client";
import { useRpc } from "@getpaseo/plugin/client";
import { Icon, SidebarRow, useToast } from "@getpaseo/plugin/client/ui";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { listAccounts, providers, useAccount, type AccountList, type Provider } from "../shared/accounts";
import { accountsIcon, providerInfo } from "./providers";

// Popovers are outside the screens' query client, so each section keeps its own state.
function useAccountList(provider: Provider) {
  const read = useRpc(listAccounts);
  const [data, setData] = useState<AccountList | null>(null);
  const reload = useCallback(() => {
    read({ provider })
      .then(setData)
      .catch(() => setData(null));
  }, [read, provider]);
  useEffect(reload, [reload]);
  return data;
}

function ProviderSection({ provider, theme, close }: { provider: Provider } & Pick<PluginPopoverProps, "theme" | "close">) {
  const data = useAccountList(provider);
  const use = useRpc(useAccount);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const info = providerInfo[provider];
  const c = theme.colors;
  const pick = async (id: string, email: string | null) => {
    setBusy(true);
    try {
      await use({ provider, id });
      toast.show(`${info.title} now uses ${email ?? id}`);
      close();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
      setBusy(false);
    }
  };
  const options = data
    ? [
        ...(data.systemDefault
          ? [{ id: "default", email: data.systemDefault.email, note: "System default", loggedIn: data.systemDefault.loggedIn }]
          : []),
        ...data.accounts.map((one) => ({ id: one.id, email: one.email, note: one.orgName, loggedIn: one.loggedIn })),
      ]
    : [];
  return (
    <View style={{ gap: 2 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingTop: 8, paddingBottom: 2 }}>
        <Icon icon={{ svg: info.icon }} size={14} color={c.foregroundMuted} />
        <Text style={{ color: c.foregroundMuted, fontSize: 12, fontWeight: "600" }}>{info.title}</Text>
      </View>
      {data === null ? <Text style={{ color: c.foregroundMuted, paddingHorizontal: 10, paddingVertical: 6 }}>Loading…</Text> : null}
      {options.map((option) => {
        const active = data?.active === option.id;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityLabel={`Use ${option.email ?? option.id} for ${info.title}`}
            disabled={busy || active || !option.loggedIn}
            onPress={() => void pick(option.id, option.email)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: pressed || active ? c.surface2 : "transparent",
              opacity: option.loggedIn ? 1 : 0.5,
            })}
          >
            <View style={{ width: 16 }}>{active ? <Icon name="Check" size={16} color={c.foreground} /> : null}</View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.foreground, fontSize: 14 }}>{option.email ?? "Not signed in"}</Text>
              {option.note ? <Text style={{ color: c.foregroundMuted, fontSize: 12 }}>{option.note}</Text> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function AccountsPopover({ theme, close, openScreen }: PluginPopoverProps) {
  const c = theme.colors;
  return (
    <View style={{ padding: 8, minWidth: 300, gap: 6 }}>
      {providers.map((provider) => (
        <ProviderSection key={provider} provider={provider} theme={theme} close={close} />
      ))}
      <View style={{ height: 1, backgroundColor: c.border, marginVertical: 4 }} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Manage accounts"
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
  return (
    <SidebarRow
      icon={{ svg: accountsIcon }}
      label="Accounts"
      active={currentScreen?.screenId === "accounts"}
      onPress={() => openPopover(AccountsPopover)}
    />
  );
}
