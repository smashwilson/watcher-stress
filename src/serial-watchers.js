const path = require('path')
const {reportUsage, reportError} = require('./helpers')
const {createTree, churn, Report} = require('./random-fs')

module.exports = async function (facade, opts) {
  console.log('>> SERIAL WATCHER STRESS TEST <<'.banner)

  const tree = await createTree({
    root: opts.root,
    prefix: 'serial-',
    directoryCount: 1000,
    fileCount: 10000
  })

  const report = new Report({
    loggingDir: opts.loggingDir
  })

  for (let i = 0; i < opts.count; i++) {
    await runWatcher(facade, i, opts, tree, report)
  }

  console.log('\n')
  report.summarize()
  await reportUsage()
}

async function runWatcher (facade, i, opts, tree, report) {
  console.log(`starting watcher #${i}`.header)

  let receive = () => {}

  const watcher = await facade.start(
    tree.getRoot(),
    {poll: opts.poll},
    (err, events) => {
      if (err) {
        reportError(err)
        return
      }
      events.forEach(receive)
    }
  )

  console.log(`creating ${opts.churnCount} filesystem events\n`)
  await churn({
    tree,
    subscribe: cb => { receive = cb },
    iterations: opts.churnCount,
    profile: opts.churnProfile,
    report,
    logPath: path.join(opts.loggingDir, 'changes.log')
  })

  await watcher.stop()
  console.log(`\n\nwatcher #${i} stopped`)
}
