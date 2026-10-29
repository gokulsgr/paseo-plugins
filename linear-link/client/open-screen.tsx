import type { PluginScreenProps } from "@getpaseo/plugin/client";
import { ExternalLink } from "@getpaseo/plugin/client/ui";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { issueUrl } from "./issue";

// React may mount a screen twice in a row; one click must still open one tab.
const recentlyOpened = new Map<string, number>();

export function OpenLinearScreen({ theme, layout, params, navigation }: PluginScreenProps) {
  const issue = params.issue ?? "";
  const workspaceId = params.workspaceId ?? "";
  const url = issueUrl(issue);
  const openBrowser = navigation?.openBrowser;
  const [error, setError] = useState<string | null>(null);

  const open = () => {
    if (!openBrowser) return;
    try {
      openBrowser({ url, workspaceId });
      navigation?.openWorkspace({ workspaceId });
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  };

  useEffect(() => {
    const key = `${workspaceId}:${issue}:${params.at ?? ""}`;
    if (Date.now() - (recentlyOpened.get(key) ?? 0) < 5000) return;
    recentlyOpened.set(key, Date.now());
    open();
    // Open once per click; `at` changes with every click.
  }, [workspaceId, issue, params.at]);

  const c = theme.colors;
  return (
    <View style={{ flex: 1, padding: layout.compact ? 16 : 32, gap: 12, backgroundColor: c.surface0 }}>
      <Text style={{ color: c.foreground, fontSize: 16 }}>
        {openBrowser ? `Opening ${issue} in this workspace's browser…` : `Paseo's browser is only in the desktop app.`}
      </Text>
      {error ? <Text style={{ color: c.statusDanger }}>{error}</Text> : null}
      {openBrowser ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Open ${issue} again`} onPress={open}>
          <Text style={{ color: c.accent }}>Open it again</Text>
        </Pressable>
      ) : null}
      <ExternalLink href={url} accessibilityLabel={`Open ${issue} in the system browser`}>
        <Text style={{ color: c.foregroundMuted }}>Open in the system browser instead</Text>
      </ExternalLink>
    </View>
  );
}
