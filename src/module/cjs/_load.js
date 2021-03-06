// Based on Node's `Module._load`.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js

import Module from "../../module.js"

import _load from "../_load.js"
import { dirname } from "../../safe/path.js"
import loader from "./loader.js"
import shared from "../../shared.js"

function load(request, parent, isMain, preload) {
  let called = false

  const filename = Module._resolveFilename(request, parent, isMain)

  const entry = _load(filename, parent, isMain, Module, (entry) => {
    const { parsing, passthru } = shared.moduleState
    const mod = entry.module

    Module._cache[filename] = mod

    if (passthru &&
        ! parsing) {
      return
    }

    called = true

    if (! mod.paths) {
      mod.paths = Module._nodeModulePaths(dirname(filename))
    }

    let threw = true

    try {
      loader(entry, preload)
      threw = false
    } finally {
      if (threw) {
        Reflect.deleteProperty(Module._cache, filename)
      }
    }
  })

  if (! called &&
      preload) {
    preload(entry)
  }

  return entry
}

export default load
