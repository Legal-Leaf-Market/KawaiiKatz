--!strict
-- ModuleScript: ReplicatedStorage > Shared > Net
-- Single owner of every RemoteEvent/RemoteFunction in the game.
--
-- The server CREATES remotes (get-or-create), the client WAITS for them, so
-- there is exactly one code path that names a remote and no script ever
-- Instance.new()s one ad hoc. Add new remote names to the lists below; both
-- sides read the same definition, so a typo fails loudly at startup instead
-- of silently at first fire.

local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

local FOLDER_NAME = "Remotes"

-- Every remote in the game is declared here and nowhere else.
local REMOTE_EVENTS: { string } = {
	-- e.g. "NotifyPlayer",
}

local REMOTE_FUNCTIONS: { string } = {
	-- e.g. "RequestInventory",
}

local Net = {}

local function getFolder(): Folder
	if RunService:IsServer() then
		local folder = ReplicatedStorage:FindFirstChild(FOLDER_NAME)
		if folder == nil then
			folder = Instance.new("Folder")
			folder.Name = FOLDER_NAME
			folder.Parent = ReplicatedStorage
		end
		return folder :: Folder
	end
	return ReplicatedStorage:WaitForChild(FOLDER_NAME) :: Folder
end

local function assertDeclared(name: string, list: { string }, kind: string)
	if table.find(list, name) == nil then
		error(`Net: "{name}" is not a declared {kind}. Add it to Net.luau.`, 3)
	end
end

function Net.remoteEvent(name: string): RemoteEvent
	assertDeclared(name, REMOTE_EVENTS, "RemoteEvent")
	local folder = getFolder()
	if RunService:IsServer() then
		local remote = folder:FindFirstChild(name)
		if remote == nil then
			remote = Instance.new("RemoteEvent")
			remote.Name = name
			remote.Parent = folder
		end
		return remote :: RemoteEvent
	end
	return folder:WaitForChild(name) :: RemoteEvent
end

function Net.remoteFunction(name: string): RemoteFunction
	assertDeclared(name, REMOTE_FUNCTIONS, "RemoteFunction")
	local folder = getFolder()
	if RunService:IsServer() then
		local remote = folder:FindFirstChild(name)
		if remote == nil then
			remote = Instance.new("RemoteFunction")
			remote.Name = name
			remote.Parent = folder
		end
		return remote :: RemoteFunction
	end
	return folder:WaitForChild(name) :: RemoteFunction
end

return Net
