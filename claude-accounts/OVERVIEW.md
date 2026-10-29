Switch the Claude account that new Claude sessions use, in one click, the way Orca's account switcher works.

Each extra account gets its own Claude config folder that links back to `~/.claude` for chats, skills, hooks, plugins and settings, so switching never moves a session. Only the login and the account's own state stay separate. Your normal `~/.claude` login is the "System default".

The sidebar footer shows the active account; click it to pick another. The accounts screen (also under Settings and in the Command Center) adds an account, signs one in again, or removes one. Signing in runs `claude auth login` on the host: the host's browser opens, or you open the link on this device and paste the code it shows.

New Claude agents and the "Claude Code" terminal profile follow the choice. Sessions already running keep the login they started with. Requires the `claude-accounts` command on the host (`~/.local/share/claude-accounts/bin`), plus `jq` and `rsync`.
