const fs = require('mz/fs')
const path = require('path')
const nsfw = require('nsfw')

const {tempDir, randomTree, atRandom, reportUsage} = require('./helpers')

module.exports = async function watchers (count) {
  console.log('>> WATCHER STRESS TEST <<'.banner)

  const root = await tempDir('watcher-')
  const {directories} = await randomTree(root, 10000)

  for (let i = 0; i < count; i++) {
    await runWatcher(i, atRandom(directories))
  }

  await reportUsage()
}

async function runWatcher (i, directory) {
  console.log(`starting watcher #${i}`.header + ` on ${path.basename(directory)}`.sidenote)

  let eventCount = 0

  const watcher = await nsfw(
    directory,
    events => { eventCount += events.length },
    {debounceMS: 1}
  )
  await watcher.start()

  const entries = await fs.readdir(directory)
  const files = (await Promise.all(
    entries.map(async entry => {
      const fullPath = path.join(directory, entry)
      const stat = await fs.stat(fullPath)
      return stat.isFile() ? fullPath : null
    })
  )).filter(entry => entry !== null)

  if (files.length > 0) {
    for (let i = 0; i < 10; i++) {
      await fs.appendFile(atRandom(files), `wat wat ${i}\n`, {encoding: 'utf8'})
    }

    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log(`watcher on ${path.basename(directory)} captured ${eventCount} events`)

  await watcher.stop()
  console.log(`watcher #${i} stopped`)
}
