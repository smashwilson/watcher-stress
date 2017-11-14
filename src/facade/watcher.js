const path = require('path')

let watcher = null
try {
  watcher = require('@atom/watcher')
} catch (err) {
  //
}

class WatcherFacade {
  static isLoaded () {
    return watcher !== null
  }

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

    if (options.workerCacheSize) {
      opts.workerCacheSize = options.workerCacheSize
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

module.exports = {Constructor: WatcherFacade, name: 'watcher'}
