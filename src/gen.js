const {createTree} = require('./random-fs')

module.exports = async function (root, opts) {
  console.log('>> RANDOM DIRECTORY GENERATION <<'.banner)
  await createTree({
    root,
    directoryChance: opts.dirChance,
    directoryCount: opts.dirCount,
    fileCount: opts.fileCount
  })
  console.log('>> DIRECTORY GENERATION COMPLETE <<'.banner)
}
