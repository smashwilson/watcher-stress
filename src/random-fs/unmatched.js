const {Match} = require('./matcher')

class Unmatched {
  constructor () {
    this.head = null
    this.tail = null

    this.byPath = new Map()
  }

  expect (matcher) {
    const node = {matcher, prev: null, next: null}

    if (!this.head) {
      this.head = node
      this.tail = node
    } else {
      this.tail.next = node
      node.prev = this.tail

      this.tail = node
    }

    for (const p of matcher.getPaths()) {
      let ms = this.byPath.get(p)
      if (!ms) {
        ms = new Set()
        this.byPath.set(p, ms)
      }
      ms.add(node)
    }
  }

  observe (evt) {
    const potential = new Set()
    for (const p of [evt.path, evt.oldPath]) {
      if (!p) continue
      for (const node of this.byPath.get(p) || []) {
        potential.add(node)
      }
    }

    for (const node of potential) {
      const m = node.matcher.matches(evt)
      if (m) {
        // Remove this node
        if (node.prev) node.prev.next = node.next
        if (node.next) node.next.prev = node.prev
        if (this.tail === node) this.tail = node.prev
        if (this.head === node) this.head = node.next

        for (const p of node.matcher.getPaths()) {
          const ms = this.byPath.get(p)
          if (ms) ms.delete(node)
        }

        return m
      }
    }

    return Match.unexpected(evt.action)
  }
}

module.exports = {Unmatched}
