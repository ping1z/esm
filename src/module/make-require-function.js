// Based on Node's `internalModule.makeRequireFunction` method.
// Copyright Node.js contributors. Released under MIT license:
// https://github.com/nodejs/node/blob/master/lib/internal/module.js

import moduleState from "./state.js"
import { resolve } from "path"
import resolveFilename from "./resolve-filename.js"

function makeRequireFunction(mod, loader = mod.require) {
  function require(request) {
    moduleState.requireDepth += 1

    try {
      return loader.call(mod, request)
    } finally {
      moduleState.requireDepth -= 1
    }
  }

  function resolve(request) {
    return resolveFilename(request, mod)
  }

  require.cache = moduleState._cache
  require.extensions = moduleState._extensions
  require.main = process.mainModule
  require.resolve = resolve

  return require
}

export default makeRequireFunction