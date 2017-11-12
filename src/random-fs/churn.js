const fs = require('fs-extra')

const {chooseProportionally, reportError} = require('../helpers')
const {Unmatched} = require('./unmatched')
const changes = require('./changes')

async function churn ({tree, subscribe, iterations, profile, report, logPath}) {
  const unmatched = new Unmatched()

  let changeLog = null
  if (logPath) {
    changeLog = fs.createWriteStream(logPath)
  }

  const changeChoices = Object.keys(profile).map(change => {
    const ChangeConstructor = changes[change]
    if (!ChangeConstructor) {
      throw new Error(`Unrecognized change name: ${change}`)
    }
    return [profile[change].proportion, new ChangeConstructor(tree)]
  })

  subscribe(evt => {
    const match = unmatched.observe(evt)
    report.count(match)
  })

  for (let changeCount = 0; changeCount < iterations; changeCount++) {
    const viable = changeChoices.filter(choice => choice[1].isViable())
    const change = chooseProportionally(viable)

    try {
      change.prepare()
      unmatched.expect(change.matcher())
      if (changeLog) {
        changeLog.write(change.toString())
        changeLog.write('\n')
      }

      await change.enact()
      process.stdout.write('.')
    } catch (e) {
      process.stdout.write('\nX'.danger)
      reportError(e)
      process.stdout.write('\n')
    }

    if (changeCount % 80 === 79) process.stdout.write('\n')
  }

  // Pause to allow the final changes a chance to arrive.
  await new Promise(resolve => setTimeout(resolve, 500))

  for (const missed of unmatched.allMissed()) {
    report.count(missed)
  }

  if (changeLog) changeLog.end()
  return report
}

module.exports = {churn}
