--!strict
-- Script: ServerScriptService > Server (this folder syncs as a single Script)
-- Bootstrapper: requires every ModuleScript in Systems/, calls Init() on all
-- of them, then Start() on all of them. Two phases so a system can safely
-- reference another system's state in Start() knowing every Init() already ran.

local systemsFolder = script:WaitForChild("Systems")

type System = {
	Init: (() -> ())?,
	Start: (() -> ())?,
}

local systems: { [string]: System } = {}

for _, child in systemsFolder:GetChildren() do
	if child:IsA("ModuleScript") then
		local ok, result = pcall(require, child)
		if ok then
			systems[child.Name] = result :: System
		else
			warn(`[Server] Failed to require system "{child.Name}": {result}`)
		end
	end
end

for name, system in systems do
	if system.Init then
		local ok, err = pcall(system.Init)
		if not ok then
			warn(`[Server] {name}.Init() failed: {err}`)
		end
	end
end

for name, system in systems do
	if system.Start then
		task.spawn(function()
			local ok, err = pcall(system.Start :: () -> ())
			if not ok then
				warn(`[Server] {name}.Start() failed: {err}`)
			end
		end)
	end
end

print("[Server] All systems started")
