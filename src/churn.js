const path = require('path')
const {reportError} = require('./helpers')
const {createTree, churn, Report} = require('./random-fs')

module.exports = async function (facade, opts) {
  console.log('>> CHURN TEST <<'.banner)

  let eventCallback = () => {}

  console.log('generating initial tree'.sidenote)
  const tree = await createTree({
    root: opts.root,
    prefix: 'churn-',
    directoryCount: opts.dirCount,
    fileCount: opts.fileCount
  })
  console.log(`tree generated at ${tree.getRoot()}`.sidenote)

  console.log('starting watcher'.sidenote)
  const w = await facade.start(
    tree.getRoot(),
    {},
    (err, events) => {
      if (err) {
        reportError(err)
        return
      }

      events.forEach(eventCallback)
    }
  )
  console.log(`\n>> PRODUCING ${opts.churnCount} FILESYSTEM EVENTS <<`.banner)

  const report = new Report({loggingDir: opts.loggingDir})
  const changeLog = opts.loggingDir ? path.join(opts.loggingDir, 'changes.log') : null
  await churn({
    tree,
    subscribe: cb => { eventCallback = cb },
    iterations: opts.churnCount,
    profile: opts.churnProfile,
    report,
    logPath: changeLog
  })

  console.log(`\n>> STOPPING WATCHER <<`.banner)

  await w.stop()

  console.log('\n')
  report.summarize()
}
