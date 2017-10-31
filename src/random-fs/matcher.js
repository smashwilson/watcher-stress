const EXACT = {exact: true}
const UNEXPECTED = {unexpected: true}

class Match {
  static exact (action) { return new Match(action, EXACT) }

  static unknown (action, count) { return new Match(action, {unknown: count}) }

  static unexpected (action) { return new Match(action, UNEXPECTED) }

  static split (unknownCount) { return new Match('rename', {split: true, unknown: unknownCount}) }

  constructor (action, opts) {
    this.action = action
    this.opts = opts
  }

  getAction () {
    return this.action
  }

  when (callbacks) {
    callbacks[this.action](this)
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

  isSplitExact () {
    return this.opts.split && this.opts.unknownCount === 0
  }

  isSplitHalfUnknown () {
    return this.opts.split && this.opts.unknownCount === 1
  }

  isSplitFullUnknown () {
    return this.opts.split && this.opts.unknownCount === 2
  }
}

class SingleEventMatcher {
  constructor (spec) {
    this.action = spec.action
    this.kind = spec.kind
    this.path = spec.path
    this.oldPath = spec.oldPath

    this.creationTime = Date.now()
    this.latencyMs = null
  }

  matches (evt) {
    if (
      this.action === evt.action &&
      this.path === evt.path &&
      (evt.kind === 'unknown' || this.kind === evt.kind) &&
      (this.oldPath === null || this.oldPath === evt.oldPath)
    ) {
      this.latencyMs = Date.now() - this.creationTime

      return evt.kind === 'unknown'
        ? Match.unknown(evt.action, 1)
        : Match.exact(evt.action)
    }

    return null
  }

  hasMatched () {
    return this.latencyMs !== null
  }

  getPaths () {
    const ps = [this.path]
    if (this.oldPath) ps.push(this.oldPath)
    return ps
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

    for (const pair of this.pairMatchers) {
      if (!pair.match) {
        pair.match = pair.matcher.matches(evt)
      }

      if (pair.match) {
        if (pair.match.isExact()) exact++
        if (pair.match.isUnknown()) unknown++
      }
    }

    if (exact + unknown === 2) {
      return Match.split(unknown)
    }

    return null
  }

  getPaths () {
    return this.renameMatcher.getPaths()
  }
}

module.exports = {SingleEventMatcher, RenameEventMatcher, Match}
