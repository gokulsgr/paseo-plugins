import type { PluginClientContext, PluginScreenProps, PluginSurfaceProps } from "@getpaseo/plugin/client";
import { ScrollView } from "@getpaseo/plugin/client/ui";
import { View } from "react-native";
import { AccountsCard } from "./client/accounts-card";
import { claudeIcon } from "./client/icons";
import { SwitcherItem } from "./client/switcher";

function AccountsScreen({ theme, layout }: PluginScreenProps) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.surface0 }}>
      <View style={{ padding: layout.compact ? 16 : 32, maxWidth: 960, width: "100%", alignSelf: "center" }}>
        <AccountsCard theme={theme} compact={layout.compact} />
      </View>
    </ScrollView>
  );
}

function AccountsSettings({ theme, layout }: PluginSurfaceProps) {
  return <AccountsCard theme={theme} compact={layout.compact} />;
}

export default function contribute(client: PluginClientContext) {
  client.addScreen({ id: "accounts", title: "Claude accounts", Component: AccountsScreen });
  client.addSettingsScreen({ id: "accounts", title: "Claude accounts", icon: { svg: claudeIcon }, Component: AccountsSettings });
  client.addSidebarFooterItem({ id: "switcher", title: "Claude account", Component: SwitcherItem });
  client.addCommandCenterItem({
    id: "manage-accounts",
    title: "Claude accounts",
    icon: { svg: claudeIcon },
    context: "global",
    onSelect({ openScreen }) {
      openScreen({ screenId: "accounts" });
    },
  });
  return () => {};
}
