const EXACT = {exact: true}

class Match {
  static exact (latency, action) { return new Match(latency, action, EXACT) }

  static unknown (latency, action, count) { return new Match(latency, action, {unknown: count}) }

  static split (latency, unknownCount) { return new Match(latency, 'rename', {split: true, unknown: unknownCount}) }

  static unexpected (action, evt) { return new Match(0, action, {unexpected: true, event: evt}) }

  static missed (action, evt) { return new Match(0, action, {missed: true, event: evt}) }

  constructor (latency, action, opts) {
    this.latency = latency
    this.action = action
    this.opts = opts
  }

  getAction () {
    return this.action
  }

  getLatency () {
    return this.latency
  }

  getEvent () {
    return this.opts.event
  }

  when (callbacks) {
    const fn = callbacks[this.action]
    if (fn) fn(this)
  }

  isExact () {
    return this.opts.exact === true
  }

  isUnknown () {
    return !this.opts.split && (this.opts.unknown || 0) > 0
  }

  isUnexpected () {
    return this.opts.unexpected === true
  }

  isMissed () {
    return this.opts.missed === true
  }

  isSplitExact () {
    return this.opts.split && this.opts.unknownCount === 0
  }

  isSplitHalfUnknown () {
    return this.opts.split && this.opts.unknownCount === 1
  }

  isSplitFullUnknown () {
    return this.opts.split && this.opts.unknownCount === 2
  }

  measuredLatency () {
    return !this.isUnexpected() && !this.isMissed()
  }
}

class SingleEventMatcher {
  constructor (spec) {
    this.action = spec.action
    this.kind = spec.kind
    this.path = spec.path
    this.oldPath = spec.oldPath

    this.creationTime = Date.now()
  }

  matches (evt) {
    if (
      this.action === evt.action &&
      this.path === evt.path &&
      (evt.kind === 'unknown' || this.kind === evt.kind) &&
      (this.oldPath === null || this.oldPath === evt.oldPath)
    ) {
      const latency = Date.now() - this.creationTime

      return evt.kind === 'unknown'
        ? Match.unknown(latency, evt.action, 1)
        : Match.exact(latency, evt.action)
    }

    return null
  }

  getPaths () {
    const ps = [this.path]
    if (this.oldPath) ps.push(this.oldPath)
    return ps
  }

  missed () {
    const evt = {action: this.action, kind: this.kind, path: this.path}
    if (this.oldPath) evt.oldPath = this.oldPath
    return Match.missed(this.action, evt)
  }
}

class RenameEventMatcher {
  constructor (spec) {
    this.renameMatcher = new SingleEventMatcher({
      action: 'renamed',
      kind: spec.kind,
      path: spec.path,
      oldPath: spec.oldPath
    })

    this.pairMatchers = [
      {
        match: null,
        matcher: new SingleEventMatcher({
          action: 'deleted',
          kind: spec.kind,
          path: spec.oldPath
        })
      },
      {
        match: null,
        matcher: new SingleEventMatcher({
          action: 'created',
          kind: spec.kind,
          path: spec.path
        })
      }
    ]
  }

  matches (evt) {
    const renameM = this.renameMatcher.matches(evt)
    if (renameM) return renameM

    let exact = 0
    let unknown = 0
    let latency = 0

    for (const pair of this.pairMatchers) {
      if (!pair.match) {
        pair.match = pair.matcher.matches(evt)
      }

      if (pair.match) {
        if (pair.match.isExact()) exact++
        if (pair.match.isUnknown()) unknown++

        latency = Math.max(pair.match.getLatency())
      }
    }

    if (exact + unknown === 2) {
      return Match.split(latency, unknown)
    }

    return null
  }

  getPaths () {
    return this.renameMatcher.getPaths()
  }

  missed () {
    return Match.missed('renamed', this.renameMatcher.missed().getEvent())
  }
}

module.exports = {SingleEventMatcher, RenameEventMatcher, Match}
