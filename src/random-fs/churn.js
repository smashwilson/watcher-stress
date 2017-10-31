const {PromiseQueue} = require('../queue')
const {chooseProportionally, reportError} = require('../helpers')

const {Unmatched} = require('./unmatched')
const changes = require('./changes')

async function churn ({tree, subscribe, iterations, profile, report}) {
  const unmatched = new Unmatched()

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
      const matcher = await change.enact()
      unmatched.expect(matcher)
      process.stdout.write('.')
    } catch (e) {
      process.stdout.write('\nX'.danger)
      reportError(e)
      process.stdout.write('\n')
    }

    if (changeCount % 80 === 79) process.stdout.write('\n')
  }

  return report
}

module.exports = {churn}
