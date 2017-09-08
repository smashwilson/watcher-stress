const path = require('path')
const fs = require('mz/fs')

const {actionName, reportError, reportUsage} = require('./helpers')

module.exports = async function (roots, facade, opts) {
  const realRoots = []
  const watchers = await Promise.all(
    roots.map(async root => {
      const realRoot = await fs.realpath(root)
      realRoots.push(realRoot)

      return facade.start(
        realRoot,
        (err, events) => {
          if (err) {
            reportError(err)
            return
          }

          reportEvents(events)
        }
      )
    })
  )

  console.log('>> WATCHERS STARTED <<'.banner)
  console.log(` on paths ${realRoots.join(' ')}`.sidenote)

  setInterval(reportUsage, opts.usageInterval)
}

function reportEvents (events) {
  console.log('\n>> EVENT BATCH <<'.banner)
  for (const event of events) {
    let output = `${event.action}:`.header
    output += ` ${event.kind} `
    if (event.oldPath) {
      output += `(${event.oldPath} => ${event.path})`
    } else {
      output += event.path
    }
    console.log(output)
  }
}
