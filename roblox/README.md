# Roblox game (Rojo project)

The game's source of truth lives here in git, not in Studio. Rojo maps the
`src/` tree into a Roblox place; you edit `.luau` files in your editor and
Studio receives them live.

## One-time setup

1. Install [Rokit](https://github.com/rojo-rbx/rokit) (or Aftman), then from
   this directory run `rokit install` (or `aftman install`) to get the pinned
   Rojo version.
2. In Roblox Studio, install the Rojo plugin (the Rojo CLI can do it for you:
   `rojo plugin install`).

## Daily loop

```sh
cd roblox
rojo serve
```

Then in Studio: open your place, click the Rojo plugin, Connect. Edits to
files under `src/` appear in Studio immediately. To produce a standalone
place file instead: `rojo build -o build.rbxlx`.

Publishing to Roblox's servers stays a Studio action (File > Publish to
Roblox), done from a place that is connected to, or built from, this project.

## Layout

| Path | Syncs to | Purpose |
|---|---|---|
| `src/shared/` | `ReplicatedStorage.Shared` | Modules both sides use: `Net` (all remotes), `Trove` (cleanup), `Config` |
| `src/server/` | `ServerScriptService.Server` | Server bootstrap + `Systems/` modules |
| `src/client/` | `StarterPlayer.StarterPlayerScripts.Client` | Client bootstrap + `Controllers/` modules |

## Conventions

- `--!strict` at the top of every script.
- Services via `game:GetService()`, never `game.Players` style indexing.
- `task.wait/spawn/delay` only; the legacy globals are banned.
- The server is authoritative for anything that matters (currency, cooldowns,
  damage, position checks). Remotes exist only in `src/shared/Net.luau`;
  declare a name there before using it anywhere.
- A gameplay feature is a ModuleScript in `Systems/` (server) or
  `Controllers/` (client) returning optional `Init()` and `Start()`. The
  bootstrappers run every `Init()` first, then every `Start()`.
- Event connections are owned by a `Trove`; per-player ones go on the Trove
  from `PlayerLifecycle.GetTrove(player)` so they die with the player.
