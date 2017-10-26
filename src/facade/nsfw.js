const path = require('path')

let nsfw = null
const NSFW_ACTIONS = new Map()
try {
  nsfw = require('nsfw')

  NSFW_ACTIONS.set(nsfw.actions.MODIFIED, 'modified')
  NSFW_ACTIONS.set(nsfw.actions.CREATED, 'created')
  NSFW_ACTIONS.set(nsfw.actions.DELETED, 'deleted')
  NSFW_ACTIONS.set(nsfw.actions.RENAMED, 'renamed')
} catch (err) {
  //
}

class NsfwFacade {
  static isLoaded () {
    return nsfw !== null
  }

  init () {
    return Promise.resolve()
  }

  async start (rootDir, options, callback) {
    const w = await nsfw(
      rootDir,
      events => callback(null, events.map(event => {
        return {
          action: NSFW_ACTIONS.get(event.action) || `unknown ${event.action}`,
          kind: 'unknown',
          oldPath: event.oldFile ? path.join(event.directory, event.oldFile) : undefined,
          path: path.join(event.directory, event.file || event.newFile)
        }
      })),
      {debounceMS: 1, errorCallback: err => { callback(err) }}
    )
    await w.start()
    return {
      stop: w.stop.bind(w)
    }
  }
}

module.exports = {Constructor: NsfwFacade, name: 'nsfw'}
