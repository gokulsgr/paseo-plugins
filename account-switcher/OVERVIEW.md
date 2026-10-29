Switch between several Claude, Codex and Cursor accounts in one click, the way Orca's account switcher works.

One "Accounts" button in the sidebar footer lists every account of each tool; click one to switch to it. The Accounts screen (also under Settings and in the Command Center) adds an account, signs one in again, or removes one.

Claude and Codex accounts each get their own config folder that links back to `~/.claude` or `~/.codex` for chats, skills, hooks, plugins and settings, so switching never moves a session. New agents and the Claude Code and Codex terminal profiles follow the choice; sessions already running keep their login.

Cursor's CLI keeps one login per machine, so switching swaps that login with a saved copy in the Keychain. Every running Cursor agent sees the change; the Cursor app's own login is not touched.

Signing in runs the tool's own login on the host: the host's browser opens, or you open the link on this device. Claude then shows a code to paste back; Codex sends the browser to a 127.0.0.1 address, which you paste back when the host is remote.

Requires the scripts in `bin/` on the host (`~/.local/share/account-switcher/bin`), plus `jq`, `rsync` and `python3`. macOS only for Cursor, which uses the Keychain.
