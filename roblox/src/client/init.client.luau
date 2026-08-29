--!strict
-- LocalScript: StarterPlayer > StarterPlayerScripts > Client
-- Client bootstrapper, mirror of the server one: requires every ModuleScript
-- in Controllers/, calls Init() on all, then Start() on all.

local controllersFolder = script:WaitForChild("Controllers")

type Controller = {
	Init: (() -> ())?,
	Start: (() -> ())?,
}

local controllers: { [string]: Controller } = {}

for _, child in controllersFolder:GetChildren() do
	if child:IsA("ModuleScript") then
		local ok, result = pcall(require, child)
		if ok then
			controllers[child.Name] = result :: Controller
		else
			warn(`[Client] Failed to require controller "{child.Name}": {result}`)
		end
	end
end

for name, controller in controllers do
	if controller.Init then
		local ok, err = pcall(controller.Init)
		if not ok then
			warn(`[Client] {name}.Init() failed: {err}`)
		end
	end
end

for name, controller in controllers do
	if controller.Start then
		task.spawn(function()
			local ok, err = pcall(controller.Start :: () -> ())
			if not ok then
				warn(`[Client] {name}.Start() failed: {err}`)
			end
		end)
	end
end

print("[Client] All controllers started")
