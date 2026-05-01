import assert from "node:assert/strict"
import test from "node:test"
import { formatPopupSavedCount, getQuickAddIdleStatus } from "../src/lib/popup-ui.ts"

test("getQuickAddIdleStatus returns the ready message", () => {
  assert.equal(getQuickAddIdleStatus(), "准备就绪")
})

test("formatPopupSavedCount returns visible Chinese copy", () => {
  assert.equal(formatPopupSavedCount(0), "已保存 0 条收藏")
  assert.equal(formatPopupSavedCount(3), "已保存 3 条收藏")
})
