--!strict
-- ModuleScript: ReplicatedStorage > Shared > Trove
-- Minimal cleanup container (Trove/Maid pattern). Anything added to a Trove
-- is released in one :Clean() call, which is how every system in this project
-- avoids leaking RBXScriptConnections and orphaned instances.

export type Cleanable =
	RBXScriptConnection
	| Instance
	| thread
	| () -> ()
	| { Destroy: (any) -> () }

local Trove = {}
Trove.__index = Trove

export type Trove = typeof(setmetatable({} :: {
	_items: { Cleanable },
	_cleaning: boolean,
}, Trove))

function Trove.new(): Trove
	return setmetatable({
		_items = {},
		_cleaning = false,
	}, Trove)
end

-- Track any cleanable object. Returns the same object so calls can be inlined:
--   local part = trove:Add(Instance.new("Part"))
function Trove.Add<T>(self: Trove, item: T & Cleanable): T
	assert(not self._cleaning, "Cannot add to a Trove while it is cleaning")
	table.insert(self._items, item)
	return item
end

-- Convenience wrapper: connect and track the connection in one call.
function Trove.Connect(self: Trove, signal: RBXScriptSignal, handler: (...any) -> ()): RBXScriptConnection
	return self:Add(signal:Connect(handler))
end

-- Release everything in reverse insertion order.
function Trove.Clean(self: Trove)
	if self._cleaning then
		return
	end
	self._cleaning = true

	for index = #self._items, 1, -1 do
		local item = self._items[index]
		self._items[index] = nil

		if typeof(item) == "RBXScriptConnection" then
			item:Disconnect()
		elseif typeof(item) == "Instance" then
			item:Destroy()
		elseif typeof(item) == "thread" then
			task.cancel(item)
		elseif typeof(item) == "function" then
			item()
		elseif typeof(item) == "table" then
			(item :: any):Destroy()
		end
	end

	self._cleaning = false
end

-- Alias so a Trove can itself be added to another Trove.
Trove.Destroy = Trove.Clean

return Trove
