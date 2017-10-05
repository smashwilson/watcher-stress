const path = require('path')

const watcher = require('@atom/watcher')
const nsfw = require('nsfw')

class WatcherFacade {
  async start (rootDir, options, callback) {
    const w = await watcher.watch(rootDir, options, callback)
    return {
      stop: w.unwatch.bind(w)
    }
  }
}

const NSFW_ACTIONS = new Map([
  [nsfw.actions.MODIFIED, 'modified'],
  [nsfw.actions.CREATED, 'created'],
  [nsfw.actions.DELETED, 'deleted'],
  [nsfw.actions.RENAMED, 'renamed']
])

class NsfwFacade {
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

const FACADES = {
  watcher: WatcherFacade,
  nsfw: NsfwFacade
}

exports.createFacade = function (implName = 'watcher') {
  const Constructor = FACADES[implName]
  if (!Constructor) {
    throw new Error(`Unrecognized watcher implementation: ${implName}`)
  }
  return new Constructor()
}
