import test from "node:test"
import assert from "node:assert/strict"
import { isGroupCollapsed, toggleCollapsedGroupId } from "../src/lib/group-collapse.ts"

test("toggleCollapsedGroupId adds a group id when it is expanded", () => {
  assert.deepEqual(toggleCollapsedGroupId([], "group-a"), ["group-a"])
})

test("toggleCollapsedGroupId removes a group id when it is already collapsed", () => {
  assert.deepEqual(toggleCollapsedGroupId(["group-a", "group-b"], "group-a"), ["group-b"])
})

test("isGroupCollapsed returns true only for stored ids", () => {
  assert.equal(isGroupCollapsed(["group-a"], "group-a"), true)
  assert.equal(isGroupCollapsed(["group-a"], "group-b"), false)
})
