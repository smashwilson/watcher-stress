const path = require('path')

const watcher = require('@atom/watcher')
let nsfw = {
  actions: {
    CREATED: 'created',
    MODIFIED: 'modified',
    DELETED: 'deleted',
    RENAMED: 'renamed'
  }
}
try {
  nsfw = require('nsfw')
} catch (err) {
  //
}

class WatcherFacade {
  init (options) {
    const loggingDir = options.loggingDir

    const opts = {}

    if (loggingDir) {
      opts.mainLog = path.join(loggingDir, 'main.log')
      opts.workerLog = path.join(loggingDir, 'worker.log')
      opts.pollingLog = path.join(loggingDir, 'polling.log')
    }

    if (options.logMainStdout) {
      opts.mainLog = watcher.STDOUT
    }

    if (options.logWorkerStdout) {
      opts.workerLog = watcher.STDOUT
    }

    if (options.logPollingStdout) {
      opts.pollingLog = watcher.STDOUT
    }

    if (options.pollingInterval) {
      opts.pollingInterval = options.pollingInterval
    }

    if (options.pollingThrottle) {
      opts.pollingThrottle = options.pollingThrottle
    }

    return watcher.configure(opts)
  }

  async start (rootDir, options, callback) {
    const w = await watcher.watchPath(rootDir, options, events => callback(null, events))
    w.onDidError(err => callback(err))
    return {
      stop: w.dispose.bind(w)
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

const FACADES = {watcher: WatcherFacade}

if (nsfw) {
  FACADES.nsfw = NsfwFacade
}

exports.createFacade = function (implName = 'watcher') {
  const Constructor = FACADES[implName]
  if (!Constructor) {
    throw new Error(`Unrecognized watcher implementation: ${implName}`)
  }
  return new Constructor()
}

exports.available = function () {
  return Object.keys(FACADES)
}
