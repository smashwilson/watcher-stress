const sfw = require('sfw')
const nsfw = require('nsfw')

class SfwFacade {
  async start(rootDir, callback) {
    return await sfw.watch(rootDir, callback)
  }

  async stop(watcher) {
    await watcher.unwatch()
  }
}

class NsfwFacade {
  async start(rootDir, callback) {
    const watcher = await nsfw(
      rootDir,
      events => { callback(null, events) },
      {debounceMS: 1, errorCallback: err => { callback(err) } }
    )
    await watcher.start()
    return watcher
  }

  async stop(watcher) {
    await watcher.stop()
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
