import module from "../../module.js"
import path from "path"
import require from "../../require.js"

const isWin = process.platform === "win32"

const __filename = import.meta.url.slice(isWin ? 8 : 7)
const __dirname = path.dirname(__filename)

// Masquerade as the REPL module.
const pkgPath = path.resolve(__dirname, "../../../index.js")
const repl = new module.constructor("<repl>")

repl.children.push(require.cache[pkgPath])
delete require.cache[pkgPath]
repl.require(pkgPath)

export default repl