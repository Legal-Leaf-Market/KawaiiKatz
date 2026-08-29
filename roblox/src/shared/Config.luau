--!strict
-- ModuleScript: ReplicatedStorage > Shared > Config
-- Shared, read-only game configuration. Both server and client require this;
-- nothing here may be secret and nothing here is authoritative on its own —
-- the server re-checks every value that matters (prices, cooldowns, limits).

local Config = table.freeze({
	GAME_NAME = "TBD",
	VERSION = "0.1.0",
})

return Config
