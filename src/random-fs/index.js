const {Tree} = require('./tree')

exports.createTree = async function (options) {
  const t = new Tree(options)
  if (options.directoryCount || options.fileCount) {
    await t.generate(options)
  }
  return t
}
