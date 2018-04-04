const facades = new Map(
  ['./nsfw', './watcher', './watchman']
    .map(file => require(file))
    .filter(impl => impl.Constructor.isLoaded())
    .map(impl => [impl.name, impl.Constructor])
)

exports.createFacade = function (implName = 'watcher') {
  const Constructor = facades.get(implName)
  if (!Constructor) {
    throw new Error(`Unrecognized watcher facade: ${implName}`)
  }
  return new Constructor()
}

exports.available = function () {
  return Array.from(facades.keys())
}
