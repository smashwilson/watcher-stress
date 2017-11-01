const fs = require('fs-extra')
const path = require('path')

const {humanMilliseconds} = require('../helpers')

class Report {
  constructor (options) {
    this.created = {
      exact: 0,
      unknown: 0,
      unexpected: 0,
      missed: 0
    }

    this.modified = {
      exact: 0,
      unknown: 0,
      unexpected: 0,
      missed: 0
    }

    this.deleted = {
      exact: 0,
      unknown: 0,
      unexpected: 0,
      missed: 0
    }

    this.renamed = {
      exact: 0,
      unknown: 0,
      splitExact: 0,
      splitHalfUnknown: 0,
      splitFullUnknown: 0,
      unexpected: 0,
      missed: 0
    }

    this.latencies = []

    if (options.loggingDir) {
      this.unexpectedLog = fs.createWriteStream(path.join(options.loggingDir, 'unexpected.log'))
      this.missedLog = fs.createWriteStream(path.join(options.loggingDir, 'missed.log'))
    } else {
      this.unexpectedLog = null
      this.missedLog = null
    }
  }

  logUnexpected (match) {
    if (!this.unexpectedLog) return

    this.unexpectedLog.write(JSON.stringify(match.getEvent()))
    this.unexpectedLog.write('\n')
  }

  logMissed (match) {
    if (!this.missedLog) return

    this.missedLog.write(JSON.stringify(match.getEvent()))
    this.missedLog.write('\n')
  }

  count (match) {
    function increment (counters) {
      if (match.isExact()) counters.exact++
      if (match.isUnknown()) counters.unknown++
      if (match.isUnexpected()) counters.unexpected++
      if (match.isMissed()) counters.missed++
      if (match.isSplitExact()) counters.splitExact++
      if (match.isSplitHalfUnknown()) counters.splitHalfUnknown++
      if (match.isSplitFullUnknown()) counters.splitFullUnknown++
    }

    match.when({
      created: () => increment(this.created),
      modified: () => increment(this.modified),
      deleted: () => increment(this.deleted),
      renamed: () => increment(this.renamed)
    })

    if (match.measuredLatency()) {
      this.latencies.push(match.getLatency())
    }

    if (match.isUnexpected()) this.logUnexpected(match)
    if (match.isMissed()) this.logMissed(match)
  }

  summarize () {
    if (this.unexpectedLog) this.unexpectedLog.end()
    if (this.missedLog) this.missedLog.end()

    function total (counters) {
      return Object.keys(counters).reduce((sum, key) => sum + counters[key], 0)
    }

    function section (name, counters) {
      const t = total(counters)

      console.log(`${name.header} total: ${t}`)
      for (const key of Object.keys(counters)) {
        const decamel = key.replace(/([a-z])([A-Z])/g, (m, p1, p2) => p1 + ' ' + p2.toLowerCase())
        const percent = t !== 0
          ? Math.floor((counters[key] / t) * 10000) / 100
          : 0

        console.log(` - ${decamel}: ${counters[key]} ` + `(${percent}%)`.sidenote)
      }
    }

    console.log('>> ACCURACY <<'.banner)
    for (const key of ['created', 'modified', 'deleted', 'renamed']) {
      section(key, this[key])
    }

    const mean = this.latencies.reduce((sum, ms) => sum + ms) / this.latencies.length
    this.latencies.sort()
    const median = this.latencies[Math.ceil(this.latencies.length * 0.5)]
    const percentile95 = this.latencies[Math.ceil(this.latencies.length * 0.95)]
    const max = this.latencies[this.latencies.length - 1]

    console.log('\n>> LATENCY <<'.banner)
    console.log(` - mean: ${humanMilliseconds(mean)}`)
    console.log(` - median: ${humanMilliseconds(median)}`)
    console.log(` - 95%: ${humanMilliseconds(percentile95)}`)
    console.log(` - maximum: ${humanMilliseconds(max)}`)
  }
}

module.exports = {Report}
