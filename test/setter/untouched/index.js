import assert from "assert"

// Import the CJS module first, but do not register any setters.
import "../../fixture/cjs/setter/untouched/a.js"
import { sum } from "../../fixture/cjs/setter/untouched/b.js"

export default () => {
  assert.strictEqual(sum(), 3)
}
