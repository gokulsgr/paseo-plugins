# Paseo plugins

Two [Paseo](https://paseo.sh) plugins, built against Paseo 0.13.2 on macOS.

| Plugin | What it does |
| --- | --- |
| [`claude-accounts`](claude-accounts) | Switch the Claude account new sessions use in one click, the way Orca's account switcher works. Accounts screen, sidebar switcher, Settings entry, ⌘K item. |
| [`linear-link`](linear-link) | A header button on every workspace tied to a Linear issue. It opens the issue in that workspace's Paseo browser tab. |

## claude-accounts

Each extra account gets its own Claude config folder. Chats, skills, hooks, plugins and settings
are links into `~/.claude`, so switching moves no session; only the login and the account's own
state stay separate. `~/.claude` is the "System default" account.

The plugin drives the `claude-accounts` command in [`claude-accounts/bin`](claude-accounts/bin),
which needs `jq` and `rsync`. Put it where the plugin looks first, or anywhere on `PATH`:

```bash
mkdir -p ~/.local/share/claude-accounts
ln -s "$PWD/claude-accounts/bin" ~/.local/share/claude-accounts/bin
ln -s ~/.local/share/claude-accounts/bin/claude-accounts ~/.local/bin/claude-accounts
```

New sessions follow the picked account through `claude-routed`:

- Chat agents: the plugin sets `CLAUDE_CONFIG_DIR` when a Claude session opens.
- Terminals: point the Paseo "Claude Code" terminal profile's command at
  `~/.local/share/claude-accounts/bin/claude-routed`, and add this to `~/.zshrc` for `claude` typed
  in any shell:

  ```zsh
  claude() { "$HOME/.local/share/claude-accounts/bin/claude-routed" "$@"; }
  ```

Sessions already running keep the login they started with.

## linear-link

The issue id comes from the workspace title, then its name, then its git branch. The Linear
workspace slug and issue prefix are constants in [`linear-link/client/issue.ts`](linear-link/client/issue.ts)
(`everquint`, `AMP-`); change them for your own workspace. No Linear API key is needed.

## Install

```bash
paseo plugin install github:gokulsgr/paseo-plugins:claude-accounts
paseo plugin install github:gokulsgr/paseo-plugins:linear-link
```

Plugins are trusted, unsandboxed code: turn on **Settings → Plugins → Enable plugins** only for
plugins you have read.
