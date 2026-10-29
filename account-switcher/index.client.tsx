import type { PluginClientContext, PluginScreenProps, PluginSurfaceProps } from "@getpaseo/plugin/client";
import { ScrollView } from "@getpaseo/plugin/client/ui";
import { View } from "react-native";
import { providers } from "./shared/accounts";
import { AccountsCard } from "./client/accounts-card";
import { accountsIcon } from "./client/providers";
import { SwitcherItem } from "./client/switcher";

function AllCards({ theme, compact }: { theme: PluginScreenProps["theme"]; compact: boolean }) {
  return (
    <View style={{ gap: 24 }}>
      {providers.map((provider) => (
        <AccountsCard key={provider} provider={provider} theme={theme} compact={compact} />
      ))}
    </View>
  );
}

function AccountsScreen({ theme, layout }: PluginScreenProps) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.surface0 }}>
      <View style={{ padding: layout.compact ? 16 : 32, maxWidth: 960, width: "100%", alignSelf: "center" }}>
        <AllCards theme={theme} compact={layout.compact} />
      </View>
    </ScrollView>
  );
}

function AccountsSettings({ theme, layout }: PluginSurfaceProps) {
  return <AllCards theme={theme} compact={layout.compact} />;
}

export default function contribute(client: PluginClientContext) {
  client.addScreen({ id: "accounts", title: "Accounts", Component: AccountsScreen });
  client.addSettingsScreen({ id: "accounts", title: "Accounts", icon: { svg: accountsIcon }, Component: AccountsSettings });
  client.addSidebarFooterItem({ id: "switcher", title: "Account switcher", Component: SwitcherItem });
  client.addCommandCenterItem({
    id: "manage-accounts",
    title: "Accounts: switch Claude, Codex or Cursor",
    icon: { svg: accountsIcon },
    context: "global",
    onSelect({ openScreen }) {
      openScreen({ screenId: "accounts" });
    },
  });
  return () => {};
}
