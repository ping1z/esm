import Entry from "../build/entry.js"
import Runtime from "../build/runtime.js"

import assert from "assert"
import createNamespace from "./create-namespace.js"
import isPlainObject from "./is-plain-object.js"
import fs from "fs-extra"
import module from "./module.js"
import path from "path"
import repl from "repl"
import require from "./require.js"
import vm from "vm"

const ZWJ = "\u200d"
const PKG_PREFIX = "esm" + ZWJ
const SHARED_SYMBOL = Symbol.for(PKG_PREFIX + ":shared")

const esmPath = path.resolve("../esm.js")
const indexPath = path.resolve("../index.js")
const pkgPath = path.resolve("../package.json")

const isWin = process.platform === "win32"
const fileProtocol = "file://" + (isWin ? "/" : "")
const parent = require.cache[indexPath].parent
const shared = require(SHARED_SYMBOL)

const pkgIndex = parent.children.findIndex((child) => child.filename === indexPath)
const pkgJSON = fs.readJsonSync(pkgPath)
const pkgURL = fileProtocol + pkgPath.replace(/\\/g, "/")

describe("repl hook", () => {
  let context

  before(() => {
    const argv = process.argv.slice()

    context = vm.createContext({
      module: new module.constructor("<repl>")
    })

    process.argv = argv.slice(0, 1)
    Reflect.deleteProperty(require.cache, esmPath)
    Reflect.deleteProperty(require.cache, indexPath)

    shared.env.repl = true
    context.module.require(indexPath)

    process.argv = argv
    Reflect.deleteProperty(require.cache, esmPath)
    Reflect.deleteProperty(require.cache, indexPath)

    shared.env.repl = false
    parent.children.splice(pkgIndex, 1)
    parent.require(indexPath)
  })

  it("should work with a global context", () => {
    const r = repl.start({ useGlobal: true })
    const code = 'import { default as globalAssert } from "assert"'
    const entry = Entry.get(r.context.module)

    entry.addBuiltinModules = () => {}
    entry.require = require
    entry.runtimeName = "_"
    Runtime.enable(entry, {})

    assert.strictEqual(typeof globalAssert, "undefined")

    r.eval(code, null, "repl", () => {
      assert.strictEqual(typeof globalAssert, "function")
    })

    r.close()
  })

  it("should work with a non-global context", () => {
    const r = repl.start({})
    const code = 'import { default as localAssert } from "assert"'

    assert.strictEqual(typeof context.localAssert, "undefined")

    r.eval(code, context, "repl", () => {
      assert.strictEqual(typeof context.localAssert, "function")
    })

    r.close()
  })

  it("should use a plain object for `module.exports`", () => {
    const r = repl.start({})
    const code = "var exports = module.exports"

    r.eval(code, context, "repl", () => {
      assert.ok(isPlainObject(context.exports))
    })

    r.close()
  })

  it("should support importing `.json` files", (done) => {
    const r = repl.start({})
    const code = [
      'import static from "' + pkgURL + '"',
      'var dynamic = import("' + pkgURL + '")'
    ].join("\n")

    r.eval(code, context, "repl", () => {
      context.dynamic
        .then((dynamic) => {
          const pkgNs = createNamespace(Object.assign({
            default: pkgJSON
          }, pkgJSON))

          assert.deepStrictEqual(dynamic, pkgNs)
          assert.deepStrictEqual(context.static, pkgJSON)
        })
        .then(done)
        .catch(done)
    })

    r.close()
  })

  it("should recover from import errors", () => {
    const r = repl.start({
      eval(code, callback) {
        let error = null

        try {
          vm.createScript(code)
            .runInContext(context, { displayErrors: false })
        } catch (e) {
          error = e
        }

        callback(error)
      }
    })

    r.eval('import { NOT_EXPORTED } from "path"', (error1) => {
      r.eval('import { join } from "path"', (error2) => {
        assert.ok(error1.message.includes("' does not provide an export named '"))
        assert.strictEqual(error2, null)
      })
    })

    r.close()
  })
})
