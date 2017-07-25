const fs = require('mz/fs')
const {tempDir, randomTree, atRandom, reportUsage, reportError} = require('./helpers')

module.exports = async function (count, facade) {
  console.log('>> PARALLEL WATCHER STRESS TEST <<'.banner)

  const root = await tempDir('parallel-')
  const {files, directories} = await randomTree(root, 10000)

  const watcherStartPromises = []
  const eventCounts = []
  const errors = []
  for (let i = 0; i < count; i++) {
    const root = atRandom(directories)
    watcherStartPromises.push((async () => {
      try {
        const watcher = await facade.start(
          root,
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
    const someFile = atRandom(files)
    await fs.appendFile(someFile, `eh ${j}\n`, {encoding: 'utf8'})
  }

  await new Promise(resolve => setTimeout(resolve, 1000))

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
