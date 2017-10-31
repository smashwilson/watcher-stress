const {Tree} = require('./tree')
const {churn} = require('./churn')
const {Report} = require('./report')

exports.createTree = async function (options) {
  const t = new Tree(options)
  if (options.directoryCount || options.fileCount) {
    await t.generate(options)
  }
  return t
}

exports.churn = churn

exports.Report = Report
