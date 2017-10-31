const {PromiseQueue} = require('../queue')
const {chooseProportionally, reportError} = require('../helpers')

const {Unmatched} = require('./unmatched')
const changes = require('./changes')

async function churn ({tree, subscribe, iterations, parallel, profile, report}) {
  const unmatched = new Unmatched()
  const queue = new PromiseQueue(parallel)

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

  const changePromises = []
  let changeCount = 0
  while (changeCount < iterations || queue.waitingCount() > 0) {
    const viable = changeChoices.filter(choice => choice[1].isViable())
    if (viable.length > 0) {
      const change = chooseProportionally(viable)

      changeCount++
      changePromises.push(queue.enqueue(async () => {
        if (!change.isViable()) {
          process.stdout.write('-'.sidenote)
          changeCount--
          return
        }

        try {
          const matcher = await change.enact()
          unmatched.expect(matcher)
          process.stdout.write('.')
        } catch (e) {
          process.stdout.write('X\n')
          reportError(e)
        }
      }, change))
    }

    if (queue.waitingCount() > parallel) {
      await queue.whenEmpty()
      process.stdout.write('\n')
    }
  }

  await Promise.all(changePromises)

  return report
}

module.exports = {churn}
