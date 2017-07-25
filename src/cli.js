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
    const normalized = {}

    if (event.action) {
      normalized.actionName = actionName(event.action)
    } else if (event.type) {
      normalized.actionName = event.type
    }

    if (event.kind) {
      normalized.kind = event.kind
    } else {
      normalized.kind = 'unknown'
    }

    if (event.directory) {
      normalized.directory = event.directory
    }

    if (event.file) {
      normalized.fileName = event.file
    } else if (event.oldFile && event.newFile) {
      normalized.fileName = `{${event.oldFile} => ${event.newFile}}`
    } else if (event.oldPath && event.newPath === '') {
      normalized.fileName = event.oldPath
    } else if (event.oldPath && event.newPath) {
      normalized.fileName = `{${event.oldPath} => ${event.newPath}}`
    }

    const fileName = event.file || `{${event.oldFile} => ${event.newFile}}`

    let output = `${normalized.actionName}:`.header
    output += ' '
    if (normalized.directory) {
      output += ` ${normalized.directory}${path.sep}`.sidenote
    }
    output += normalized.fileName.cyan
    console.log(output)
  }
}
