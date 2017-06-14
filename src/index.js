const program = require('commander')
const colors = require('colors')

const cli = require('./cli')

colors.setTheme({
  banner: ['bold', 'inverse'],
  header: ['green', 'underline'],
  sidenote: 'dim',
  dangerBanner: ['red', 'bold', 'inverse'],
  danger: ['red', 'bold']
})

program
  .version('0.0.0')
  .option('-d, --debounce [ms]', 'configure debouncing interval', parseInt)
  .option('-i, --interval [ms]', 'interval to publish resource usage statistics', parseInt)
  .option('-r, --resource-log [path]', 'log resource usage to a JSON file')
  .option('-c, --cli [paths,]', 'CLI mode', str => str.split(','))
  .option('-w, --watchers [count]', 'Watcher creation and destruction', parseInt)
  .parse(process.argv)

program.interval = program.interval || 10 * 60 * 1000

// Ensure exactly one benchmarking action is specified
const actionOptions = [program.cli, program.watchers].filter(option => option !== undefined).length
if (actionOptions !== 1) {
  console.error('You must specify exactly one of --cli or --watchers.')
  program.help()
}

if (program.cli) {
  cli(program.cli, {
    debounce: program.debounce,
    usageInterval: program.interval,
    resourceLog: program.resourceLog
  })
}
