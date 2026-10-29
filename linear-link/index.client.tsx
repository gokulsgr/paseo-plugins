import type { PluginButtonRegistration, PluginClientContext } from "@getpaseo/plugin/client";
import { issueOf, linearIcon, type WorkspaceNames } from "./client/issue";
import { OpenLinearScreen } from "./client/open-screen";

export default function contribute(client: PluginClientContext) {
  // Only a screen or panel may open Paseo's browser, so the header button goes through one.
  client.addScreen({ id: "open", title: (params) => params.issue ?? "Linear", Component: OpenLinearScreen });

  const buttons = new Map<string, { issue: string; button: PluginButtonRegistration }>();
  const lifetime = new AbortController();

  const drop = (workspaceId: string) => {
    buttons.get(workspaceId)?.button.remove();
    buttons.delete(workspaceId);
  };

  const sync = (workspace: WorkspaceNames & { id: string }) => {
    if (lifetime.signal.aborted) return;
    const issue = issueOf(workspace);
    const current = buttons.get(workspace.id);
    if (current?.issue === issue) return;
    drop(workspace.id);
    if (!issue) return;
    const button = client.addHeaderButton({
      id: "linear",
      workspaceId: workspace.id,
      button: {
        title: `Open ${issue} in Linear`,
        icon: { svg: linearIcon },
        label: issue,
        behavior: {
          kind: "action",
          onPress: () =>
            client.openScreen({
              screenId: "open",
              params: { issue, workspaceId: workspace.id, at: String(Date.now()) },
            }),
        },
      },
    });
    buttons.set(workspace.id, { issue, button });
  };

  const dropAll = () => {
    for (const id of [...buttons.keys()]) drop(id);
  };

  // An owned subscription delivers every workspace, then each change, and a fresh snapshot after
  // a reconnect.
  void client.paseo.workspaces
    .list({ subscribe: {} })
    .then(({ subscription }) => {
      if (lifetime.signal.aborted) return void subscription.release();
      lifetime.signal.addEventListener("abort", () => void subscription.release());
      subscription.subscribe({
        snapshot: ({ entries }) => {
          dropAll();
          for (const workspace of entries) sync(workspace);
        },
        update: (message) => {
          if (message.type !== "workspace_update") return;
          const update = message.payload;
          if (update.kind === "upsert") return sync(update.workspace);
          drop(update.id);
        },
      });
    })
    .catch((error) => {
      if (!lifetime.signal.aborted) console.error("Linear link: workspace list failed", error);
    });

  return () => {
    lifetime.abort();
    dropAll();
  };
}
