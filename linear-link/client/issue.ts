const LINEAR_ORG = "everquint";
const ISSUE = /\b(AMP-\d+)\b/i;

export type WorkspaceNames = {
  title?: string | null;
  name?: string | null;
  gitRuntime?: { currentBranch?: string | null } | null;
};

/** The Linear issue a workspace is for: its title first, then its name, then its branch. */
export function issueOf(workspace: WorkspaceNames): string | null {
  for (const text of [workspace.title, workspace.name, workspace.gitRuntime?.currentBranch]) {
    const match = text?.match(ISSUE);
    if (match) return match[1].toUpperCase();
  }
  return null;
}

// Linear resolves an issue link without the title slug.
export function issueUrl(id: string): string {
  return `https://linear.app/${LINEAR_ORG}/issue/${id}`;
}

export const linearIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M2.4 13.9 10.1 21.6A9.9 9.9 0 0 1 2.4 13.9ZM2.1 10.9 13.1 21.9A10 10 0 0 0 15.7 21L3 8.3A10 10 0 0 0 2.1 10.9ZM3.9 6.6 17.4 20.1A10 10 0 0 0 19.3 18.5L5.5 4.7A10 10 0 0 0 3.9 6.6ZM7.3 3.3A10 10 0 1 1 20.7 16.7Z"/></svg>`;
