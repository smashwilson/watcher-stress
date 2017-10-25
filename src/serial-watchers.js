const fs = require('mz/fs')
const path = require('path')

const {atRandom, reportUsage, reportError} = require('./helpers')
const {createTree} = require('./random-fs')

module.exports = async function (facade, opts) {
  console.log('>> SERIAL WATCHER STRESS TEST <<'.banner)

  const tree = await createTree({
    root: opts.root,
    prefix: 'serial-',
    directoryCount: 1000,
    fileCount: 10000
  })

  for (let i = 0; i < opts.count; i++) {
    await runWatcher(facade, i, opts, tree.randomDirectory())
  }

  await reportUsage()
}

async function runWatcher (facade, i, opts, directory) {
  console.log(`starting watcher #${i}`.header + ` on ${path.basename(directory)}`.sidenote)

  let eventCount = 0

  const watcher = await facade.start(
    directory,
    {poll: opts.poll},
    (err, events) => {
      if (err) {
        reportError(err)
        return
      }
      eventCount += events.length
    }
  )

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
