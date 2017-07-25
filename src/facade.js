const sfw = require('sfw')
const nsfw = require('nsfw')

class SfwFacade {
  start (rootDir, callback) {
    return sfw.watch(rootDir, callback)
  }

  stop (watcher) {
    return watcher.unwatch()
  }
}

class NsfwFacade {
  async start (rootDir, callback) {
    const watcher = await nsfw(
      rootDir,
      events => { callback(null, events) },
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
  sfw: SfwFacade,
  nsfw: NsfwFacade
}

exports.createFacade = function (implName) {
  const Constructor = FACADES[implName]
  if (!Constructor) {
    throw new Error(`Unrecognized watcher implementation: ${implName}`)
  }
  return new Constructor()
}
