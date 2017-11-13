const {Match} = require('./matcher')

class Unmatched {
  constructor () {
    this.byPath = new Map()
  }

  expect (matcher) {
    for (const p of matcher.getPaths()) {
      let ms = this.byPath.get(p)
      if (!ms) {
        ms = new Set()
        this.byPath.set(p, ms)
      }
      ms.add(matcher)
    }
  }

  observe (evt) {
    const potential = new Set()
    for (const p of [evt.path, evt.oldPath]) {
      if (!p) continue
      for (const matcher of this.byPath.get(p) || []) {
        potential.add(matcher)
      }
    }

    for (const matcher of potential) {
      const m = matcher.matches(evt)
      if (m) {
        if (m.isComplete()) {
          // Remove this node
          for (const p of matcher.getPaths()) {
            const ms = this.byPath.get(p)
            if (ms) ms.delete(matcher)
          }
        }

        return m
      }
    }

    return Match.unexpected(evt.action, evt)
  }

  allMissed () {
    const missed = []
    for (const [, matchers] of this.byPath) {
      for (const matcher of matchers) {
        missed.push(matcher.missed())
      }
    }
    return missed
  }
}

module.exports = {Unmatched}
