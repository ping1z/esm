import Compiler from "../build/compiler.js"

import assert from "assert"
import fs from "fs-extra"
import globby from "globby"
import path from "path"

const SCRIPT = 1
const MODULE = 2

const files = globby
  .sync(["output/**/*.{js,mjs}"])
  .map(path.normalize)

const tests = files
  .reduce((tests, thePath) => {
    const dirPath = path.dirname(thePath)
    const kind = path.basename(thePath).replace(/\.m?js$/, "")

    if (! tests[dirPath]) {
      tests[dirPath] = { __proto__: null }
    }

    tests[dirPath][kind] = {
      content: fs.readFileSync(thePath, "utf8"),
      sourceType: path.extname(thePath) === ".mjs" ? MODULE : SCRIPT
    }

    return tests
  }, { __proto__: null })

describe("output", () =>
  Object
    .keys(tests)
    .forEach((dirPath) => {
      const name = path.basename(dirPath).split("-").join(" ")
      const test = tests[dirPath]

      it(`compiles ${name} example as expected`, () => {
        const result = Compiler.compile(test.actual.content, {
          sourceType: test.actual.sourceType
        })

        // Remove zero-width joiners and trim trailing whitespace.
        const expected = test.expected.content.trimRight()
        const actual = result.code.replace(/\u200d/g, "").trimRight()

        assert.strictEqual(actual, expected)
      })
    })
)
