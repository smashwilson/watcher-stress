const fs = require('fs-extra')

const {reportError, reportUsage} = require('./helpers')

module.exports = async function (roots, facade, opts) {
  if (opts.root) roots.push(opts.root)
  const realRoots = []
  await Promise.all(
    roots.map(async root => {
      const realRoot = await fs.realpath(root)
      realRoots.push(realRoot)

      return facade.start(
        realRoot,
        {poll: opts.poll},
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

  return new Promise(resolve => {})
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
