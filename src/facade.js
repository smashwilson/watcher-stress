const path = require('path')

const watcher = require('@atom/watcher')
const nsfw = require('nsfw')

class WatcherFacade {
  start (rootDir, options, callback) {
    return watcher.watch(rootDir, options, callback)
  }

  stop (watcher) {
    return watcher.unwatch()
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
    const watcher = await nsfw(
      rootDir,
      events => callback(null, events.map(event => {
        return {
          action: NSFW_ACTIONS.get(event.action) || `unknown ${event.action}`,
          kind: 'unknown',
          oldPath: event.oldFile ? path.join(event.directory, event.oldFile) : undefined,
          path: path.join(event.directory, event.file || event.newFile)
        }
      })),
      {debounceMS: 1, errorCallback: err => { callback(err) } }
    )
    await watcher.start()
    return watcher
  }

  stop (watcher) {
    return watcher.stop()
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
