import type { PluginPopoverProps, PluginSidebarItemProps } from "@getpaseo/plugin/client";
import { useRpc } from "@getpaseo/plugin/client";
import { Icon, SidebarRow, useToast } from "@getpaseo/plugin/client/ui";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { listAccounts, providers, useAccount, type AccountList, type Provider } from "../shared/accounts";
import { providerInfo } from "./providers";

// Sidebar items and popovers are outside the screens' query client, so this keeps its own state.
function useAccountList(provider: Provider) {
  const read = useRpc(listAccounts);
  const [data, setData] = useState<AccountList | null>(null);
  const reload = useCallback(() => {
    read({ provider })
      .then(setData)
      .catch(() => setData(null));
  }, [read, provider]);
  useEffect(() => {
    reload();
    const timer = setInterval(reload, 30_000);
    return () => clearInterval(timer);
  }, [reload]);
  return data;
}

function activeEmail(data: AccountList | null): string {
  if (!data) return "…";
  const email =
    data.active === "default"
      ? data.systemDefault?.email
      : data.accounts.find((one) => one.id === data.active)?.email;
  return email ?? (data.active === "none" ? "signed out" : data.active);
}

function makePopover(provider: Provider) {
  return function SwitcherPopover({ theme, close, openScreen }: PluginPopoverProps) {
    const data = useAccountList(provider);
    const use = useRpc(useAccount);
    const toast = useToast();
    const [busy, setBusy] = useState(false);
    const c = theme.colors;
    const pick = async (id: string, email: string | null) => {
      setBusy(true);
      try {
        await use({ provider, id });
        toast.show(`${providerInfo[provider].title} now uses ${email ?? id}`);
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
              <View style={{ width: 16 }}>{active ? <Icon name="Check" size={16} color={c.foreground} /> : null}</View>
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
          accessibilityLabel="Manage accounts"
          onPress={() => openScreen({ screenId: "accounts" })}
          style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 10 }}
        >
          <Icon name="Settings" size={16} color={c.foregroundMuted} />
          <Text style={{ color: c.foregroundMuted, fontSize: 14 }}>Manage accounts…</Text>
        </Pressable>
      </View>
    );
  };
}

const popovers = Object.fromEntries(providers.map((provider) => [provider, makePopover(provider)])) as Record<
  Provider,
  ReturnType<typeof makePopover>
>;

function ProviderRow({ provider, active, openPopover }: { provider: Provider; active: boolean; openPopover: PluginSidebarItemProps["openPopover"] }) {
  const data = useAccountList(provider);
  const info = providerInfo[provider];
  return (
    <SidebarRow
      id={provider}
      icon={{ svg: info.icon }}
      label={`${info.title}: ${activeEmail(data)}`}
      active={active}
      onPress={() => openPopover(popovers[provider])}
    />
  );
}

export function SwitcherItem({ currentScreen, openPopover }: PluginSidebarItemProps) {
  const onAccounts = currentScreen?.screenId === "accounts";
  return (
    <>
      {providers.map((provider) => (
        <ProviderRow key={provider} provider={provider} active={onAccounts} openPopover={openPopover} />
      ))}
    </>
  );
}
