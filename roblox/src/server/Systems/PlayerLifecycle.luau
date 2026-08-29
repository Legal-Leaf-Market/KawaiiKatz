--!strict
-- ModuleScript: ServerScriptService > Server > Systems > PlayerLifecycle
-- Owns the join/leave path. Every per-player Trove is created here and
-- cleaned here, so other systems can register per-player setup without each
-- reimplementing PlayerAdded/PlayerRemoving bookkeeping.

local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Trove = require(ReplicatedStorage:WaitForChild("Shared"):WaitForChild("Trove"))

local PlayerLifecycle = {}

local playerTroves: { [Player]: Trove.Trove } = {}

-- Other systems call this to get a Trove that is cleaned when the player leaves.
function PlayerLifecycle.GetTrove(player: Player): Trove.Trove?
	return playerTroves[player]
end

local function onPlayerAdded(player: Player)
	playerTroves[player] = Trove.new()
end

local function onPlayerRemoving(player: Player)
	local trove = playerTroves[player]
	if trove then
		playerTroves[player] = nil
		trove:Clean()
	end
end

function PlayerLifecycle.Init()
	Players.PlayerAdded:Connect(onPlayerAdded)
	Players.PlayerRemoving:Connect(onPlayerRemoving)

	-- Players who joined before this system initialized (Studio test edge case).
	for _, player in Players:GetPlayers() do
		if playerTroves[player] == nil then
			onPlayerAdded(player)
		end
	end
end

return PlayerLifecycle
