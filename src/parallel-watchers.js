const path = require('path')
const {reportUsage, reportError} = require('./helpers')
const {PromiseQueue} = require('./queue')
const {createTree, churn, Report} = require('./random-fs')

module.exports = async function (facade, opts) {
  console.log('>> PARALLEL WATCHER STRESS TEST <<'.banner)

  const watcherStartPromises = []
  const errors = []
  const trees = []
  const callbacksByTree = new Map()
  const queue = new PromiseQueue(5)

  function rootNumber (i) {
    if (!opts.root) return null
    return path.join(opts.root, `root-${i}`)
  }

  function logNumber (i) {
    if (!opts.loggingDir) return null
    return path.join(opts.loggingDir, `change-${i}.log`)
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

            const treeCb = callbacksByTree.get(tree)
            treeCb && events.forEach(treeCb)
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

  const watchers = (await Promise.all(watcherStartPromises)).filter(Boolean)
  console.log(`\n>> ${watchers.length} WATCHERS STARTED <<`.banner)
  reportUsage()

  // Synthesize some filesystem events
  console.log(`\n>> CREATING FILESYSTEM EVENTS <<`.banner)

  const report = new Report({loggingDir: opts.loggingDir})
  await Promise.all(
    trees.map((tree, i) => queue.enqueue(() => churn({
      tree,
      subscribe: cb => { callbacksByTree.set(tree, cb) },
      iterations: opts.churnCount,
      profile: opts.churnProfile,
      report,
      logPath: logNumber(i)
    })))
  )

  reportUsage()

  console.log(`\n>> STOPPING WATCHERS <<`.banner)

  const watcherStopPromises = []
  for (let k = 0; k < watchers.length; k++) {
    watcherStopPromises.push((async () => {
      const watcher = watchers[k]
      const hadError = errors[k]
      await watcher.stop()

      let summary = ''
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

  console.log('\n')
  report.summarize()
  reportUsage()
}
