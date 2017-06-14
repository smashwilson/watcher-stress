const path = require('path')
const fs = require('mz/fs')
const nsfw = require('nsfw')

const {actionName, humanBytes, humanSeconds} = require('./helpers')

let cpuUsage = null

module.exports = async function (roots, opts) {
  cpuUsage = process.cpuUsage()

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

  setInterval(() => reportUsage(opts.resourceLog), opts.usageInterval)
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

function reportError (error) {
  console.error('>> ERROR <<'.dangerBanner)
  console.error(error.stack.danger)
}

async function reportUsage (logFile) {
  cpuUsage = process.cpuUsage(cpuUsage)
  const memUsage = process.memoryUsage()
  const uptime = process.uptime()

  console.log('\n>> RESOURCE USAGE <<'.banner)
  console.log('uptime'.header + ' ' + humanSeconds(uptime))
  console.log('CPU usage:'.header + ' ' + cpuUsage.user + ' user ' + cpuUsage.system + ' system')
  console.log('RAM usage:'.header +
    ' rss ' + humanBytes(memUsage.rss) +
    ' total heap ' + humanBytes(memUsage.heapTotal) +
    ' used heap ' + humanBytes(memUsage.heapUsed) +
    ' external ' + humanBytes(memUsage.external))

  if (logFile) {
    const payload = {cpuUsage, uptime, memUsage}
    await fs.appendFile(logFile, JSON.stringify(payload) + '\n', {encoding: 'utf8'})
  }
}
