import assert from "node:assert/strict"
import test from "node:test"
import { formatGroupRouteCount, getCollapseGlyph } from "../src/lib/group-ui.ts"

test("formatGroupRouteCount returns the visible Chinese copy", () => {
  assert.equal(formatGroupRouteCount(0), "0 条路由")
  assert.equal(formatGroupRouteCount(1), "1 条路由")
  assert.equal(formatGroupRouteCount(20), "20 条路由")
})

test("getCollapseGlyph switches between expanded and collapsed states", () => {
  assert.equal(getCollapseGlyph(false), "^")
  assert.equal(getCollapseGlyph(true), "v")
})
