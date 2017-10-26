const temp = require('temp').track()
const humanFormat = require('human-format')
const fs = require('fs-extra')

let nsfw = null
let CREATED = 'created'
let DELETED = 'deleted'
let MODIFIED = 'modified'
let RENAMED = 'renamed'
try {
  nsfw = require('nsfw')

  CREATED = nsfw.actions.CREATED
  DELETED = nsfw.actions.DELETED
  MODIFIED = nsfw.actions.MODIFIED
  RENAMED = nsfw.actions.RENAMED
} catch (err) {
  //
}

function tempDir (prefix) {
  return new Promise((resolve, reject) => {
    temp.mkdir({prefix}, (err, dirPath) => {
      if (err) {
        reject(err)
        return
      }

      resolve(dirPath)
    })
  })
}

const actionNames = new Map([
  [CREATED, 'created'],
  [DELETED, 'deleted'],
  [MODIFIED, 'modified'],
  [RENAMED, 'renamed']
])

function actionName (action) {
  return actionNames.get(action) || `unknown: ${action}`
}

const timeScale = new humanFormat.Scale({
  seconds: 1,
  minutes: 60,
  hours: 3600,
  days: 86400,
  months: 2592000
})

function humanSeconds (seconds) {
  return humanFormat(seconds, {scale: timeScale}) + ` (${seconds}s)`.sidenote
}

function humanBytes (bytes) {
  return humanFormat(bytes) + ` (${bytes}b)`.sidenote
}

function atRandom (array) {
  const ind = Math.floor(Math.random() * array.length)
  return array[ind]
}

function reportError (error) {
  console.error('>> ERROR <<'.dangerBanner)
  let msg = 'No further information provided.'
  if (error.stack) msg = error.stack
  if (typeof error.toString === 'function') msg = error.toString()
  console.error(msg.danger)
}

let cpuUsage = null
let resourceLogFile = null

function setResourceLogFile (file) {
  resourceLogFile = file
}

async function reportUsage () {
  cpuUsage = process.cpuUsage(cpuUsage)
  const memUsage = process.memoryUsage()
  const uptime = process.uptime()

  let memSummary = ''
  if (memUsage.rss) {
    memSummary += ' rss ' + humanBytes(memUsage.rss)
  }
  if (memUsage.heapTotal) {
    memSummary += ' total heap ' + humanBytes(memUsage.heapTotal)
  }
  if (memUsage.heapUsed) {
    memSummary += ' used heap ' + humanBytes(memUsage.heapUsed)
  }
  if (memUsage.external) {
    memSummary += ' external ' + humanBytes(memUsage.external)
  }

  console.log('\n>> RESOURCE USAGE <<'.banner)
  console.log('uptime'.header + ' ' + humanSeconds(uptime))
  console.log('CPU usage:'.header + ' ' + cpuUsage.user + ' user ' + cpuUsage.system + ' system')
  console.log('RAM usage:'.header + memSummary)

  if (resourceLogFile) {
    const payload = {cpuUsage, uptime, memUsage}
    await fs.appendFile(resourceLogFile, JSON.stringify(payload) + '\n', {encoding: 'utf8'})
  }
}

module.exports = {
  tempDir,
  actionName,
  humanSeconds,
  humanBytes,
  atRandom,
  reportError,
  setResourceLogFile,
  reportUsage
}
