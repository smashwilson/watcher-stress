const path = require('path')
const fs = require('mz/fs')
const nsfw = require('nsfw')

const {actionName, reportError, reportUsage} = require('./helpers')

module.exports = async function (roots, opts) {
  const realRoots = []
  const watchers = await Promise.all(
    roots.map(async root => {
      const realRoot = await fs.realpath(root)
      realRoots.push(realRoot)

      return nsfw(
        realRoot,
        reportEvents,
        {debounceMS: opts.debounce, errorCallback: reportError}
      )
    })
  )

  await Promise.all(watchers.map(watcher => watcher.start()))

  console.log('>> WATCHERS STARTED <<'.banner)
  console.log(` on paths ${realRoots.join(' ')}`.sidenote)

  setInterval(reportUsage, opts.usageInterval)
}

function reportEvents (events) {
  console.log('\n>> EVENT BATCH <<'.banner)
  for (const event of events) {
    const fileName = event.file || `{${event.oldFile} => ${event.newFile}}`

    console.log(
      `${actionName(event.action)}:`.header +
      ` ${event.directory}${path.sep}`.sidenote +
      fileName.cyan
    )
  }
}
