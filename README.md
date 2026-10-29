# Paseo plugins

Two [Paseo](https://paseo.sh) plugins, built against Paseo 0.13.2 on macOS.

| Plugin | What it does |
| --- | --- |
| [`account-switcher`](account-switcher) | Switch between several Claude, Codex and Cursor accounts in one click, the way Orca's account switcher works. Accounts screen, a sidebar row per tool, a Settings entry and a ⌘K item. |
| [`linear-link`](linear-link) | A header button on every workspace tied to a Linear issue. It opens the issue in that workspace's Paseo browser tab. |

## account-switcher

| Tool | How an account is kept | What switching changes |
| --- | --- | --- |
| Claude | Its own `CLAUDE_CONFIG_DIR`; chats, skills, hooks, plugins and settings link to `~/.claude` | New sessions; running ones keep their login |
| Codex | Its own `CODEX_HOME`; skills, hooks, plugins, rules and `AGENTS.md` link to `~/.codex`, sessions and the thread database are shared through `sqlite_home`, `config.toml` is copied | New sessions; running ones keep their login |
| Cursor | A saved copy of the login in the Keychain; `cursor-agent` has one login per machine whatever its config folder | The live login, for every running `cursor-agent` at once. The Cursor app is not touched |

`~/.claude` and `~/.codex` stay the "System default" accounts. Orca has no Cursor switcher; this
one swaps the `cursor-access-token` and `cursor-refresh-token` Keychain entries and saves the live
login first, so nothing is lost.

The plugin drives the scripts in [`account-switcher/bin`](account-switcher/bin) (`jq`, `rsync`
and `python3` required). Link them where the plugin looks first:

```bash
mkdir -p ~/.local/share/account-switcher
ln -s "$PWD/account-switcher/bin" ~/.local/share/account-switcher/bin
for t in claude codex cursor; do ln -s ~/.local/share/account-switcher/bin/$t-accounts ~/.local/bin/; done
```

New sessions follow the picked account:

- Chat agents: the plugin sets `CLAUDE_CONFIG_DIR` or `CODEX_HOME` when a session opens.
- Terminals: point the Paseo "Claude Code" and "Codex" terminal profiles at
  `~/.local/share/account-switcher/bin/claude-routed` and `codex-routed`, and add this to `~/.zshrc`:

  ```zsh
  claude() { "$HOME/.local/share/account-switcher/bin/claude-routed" "$@"; }
  codex() { "$HOME/.local/share/account-switcher/bin/codex-routed" "$@"; }
  ```

The same scripts work without Paseo: `claude-accounts use personal`, `codex-accounts ls`,
`cursor-accounts use <id>`.

## linear-link

The issue id comes from the workspace title, then its name, then its git branch. The Linear
workspace slug and issue prefix are constants in [`linear-link/client/issue.ts`](linear-link/client/issue.ts)
(`everquint`, `AMP-`); change them for your own workspace. No Linear API key is needed.

## Install

```bash
paseo plugin install github:gokulsgr/paseo-plugins:account-switcher
paseo plugin install github:gokulsgr/paseo-plugins:linear-link
```

Plugins are trusted, unsandboxed code: turn on **Settings → Plugins → Enable plugins** only for
plugins you have read.
