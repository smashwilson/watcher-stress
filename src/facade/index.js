const facades = new Map(['./nsfw', './watcher'].map(file => {
  const required = require(file)
  return [required.name, required.Constructor]
}))

exports.createFacade = function (implName = 'watcher') {
  const Constructor = facades.get(implName)
  if (!Constructor) {
    throw new Error(`Unrecognized watcher facade: ${implName}`)
  }
  return new Constructor()
}

exports.available = function () {
  return Object.keys(facades)
}
