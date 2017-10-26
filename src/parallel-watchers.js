const fs = require('fs-extra')
const path = require('path')
const {atRandom, reportUsage, reportError} = require('./helpers')
const {createTree} = require('./random-fs')

module.exports = async function (facade, opts) {
  console.log('>> PARALLEL WATCHER STRESS TEST <<'.banner)

  const watcherStartPromises = []
  const eventCounts = []
  const errors = []
  const trees = []

  function rootNumber (i) {
    if (!opts.root) return null
    return path.join(opts.root, `root-${i}`)
  }

  for (let i = 0; i < opts.count; i++) {
    const tree = await createTree({
      root: rootNumber(i),
      prefix: 'parallel-',
      directoryCount: 100,
      fileCount: 1000
    })
    trees.push(tree)
    const root = tree.getRoot()

    watcherStartPromises.push((async () => {
      try {
        const watcher = await facade.start(
          root,
          {},
          (err, events) => {
            if (err) {
              reportError(err)
              return
            }

            eventCounts[i] = (eventCounts[i] || 0) + events.length
          }
        )

        console.log(`watcher #${i} started`.header + ` on ${root}`.sidenote)
        return watcher
      } catch (err) {
        errors[i] = true
        reportError(err)
        return null
      }
    })())
  }

  const watchers = (await Promise.all(watcherStartPromises))
    .filter(watcher => watcher !== null)
  console.log(`\n>> ${watchers.length} WATCHERS STARTED <<`.banner)
  reportUsage()

  // Synthesize some filesystem events
  console.log(`\n>> CREATING FILESYSTEM EVENTS <<`.banner)
  for (let j = 0; j < 1000; j++) {
    const someFile = atRandom(trees).randomFile()
    await fs.appendFile(someFile, `eh ${j}\n`, {encoding: 'utf8'})
  }

  await new Promise(resolve => setTimeout(resolve, 1000))

  console.log(`\n>> STOPPING WATCHERS <<`.banner)

  const watcherStopPromises = []
  for (let k = 0; k < watchers.length; k++) {
    watcherStopPromises.push((async () => {
      const watcher = watchers[k]
      const eventCount = eventCounts[k]
      const hadError = errors[k]
      await watcher.stop()

      let summary = ''
      if (eventCount !== undefined) {
        summary += ` after ${eventCount || 0} events`.sidenote
      }
      if (hadError) {
        summary += ` with an error`.danger
      }

      console.log(`watcher #${k} stopped`.header + summary)
    })())
  }
  await Promise.all(watcherStopPromises)

  console.log(`>> ${watchers.length} WATCHERS STOPPED <<`.banner)
  const errorCount = errors.filter(Boolean).length
  if (errorCount > 0) {
    console.log(`${errorCount} reported errors`)
  }
  reportUsage()
}
