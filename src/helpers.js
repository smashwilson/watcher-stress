const path = require('path')
const temp = require('temp').track()
const humanFormat = require('human-format')
const nsfw = require('nsfw')
const fs = require('mz/fs')
const {CREATED, DELETED, MODIFIED, RENAMED} = nsfw.actions

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

async function randomTree (initialRoot, entries) {
  const roots = [initialRoot]
  const files = []

  for (let i = 0; i < entries; i++) {
    const root = roots[Math.floor(Math.random() * roots.length)]

    if (Math.random() < 0.05) {
      const dName = path.join(root, `d-${i}`)
      await fs.mkdir(dName, 0o770)
      roots.push(dName)
    } else {
      const fName = path.join(root, `f-${i}.txt`)
      await fs.writeFile(fName, '\n', {encoding: 'utf8'})
      files.push(fName)
    }
  }

  return {directories: roots, files}
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

exports.tempDir = tempDir
exports.actionName = actionName
exports.humanSeconds = humanSeconds
exports.humanBytes = humanBytes
