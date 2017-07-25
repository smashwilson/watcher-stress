const program = require('commander')
const colors = require('colors')

const cli = require('./cli')
const {createFacade} = require('./facade')
const serialWatchers = require('./serial-watchers')
const parallelWatchers = require('./parallel-watchers')
const {setResourceLogFile} = require('./helpers')

colors.setTheme({
  banner: ['bold', 'inverse'],
  header: ['green', 'underline'],
  sidenote: 'dim',
  dangerBanner: ['red', 'bold', 'inverse'],
  danger: ['red', 'bold']
})

program
  .version('0.0.0')
  .option('--use [impl]', 'use specified watcher implementation (sfw, nsfw)', /^(sfw|nsfw)$/i)
  .option('-d, --debounce [ms]', 'configure debouncing interval', parseInt)
  .option('-i, --interval [ms]', 'interval to publish resource usage statistics', parseInt)
  .option('-r, --resource-log [path]', 'log resource usage to a JSON file')
  .option('-c, --cli [paths,]', 'CLI mode', str => str.split(','))
  .option('--serial-watchers [count]', 'Exercise rapid watcher creation and destruction', parseInt)
  .option('--parallel-watchers [count]', 'Exercise simultaneous watchers', parseInt)
  .parse(process.argv)

program.interval = program.interval || 10 * 60 * 1000
setResourceLogFile(program.resourceLog)

// Ensure a backing implementation is specified
const facade = createFacade(program.use)

// Ensure exactly one benchmarking action is specified
const actionOptions = [program.cli, program.serialWatchers, program.parallelWatchers].filter(option => option !== undefined).length
if (actionOptions !== 1) {
  console.error('You must specify exactly one of --cli, --serial-watchers or --parallel-watchers.')
  program.help()
}

if (program.cli) {
  cli(program.cli, facade, {
    debounce: program.debounce,
    usageInterval: program.interval
  })
}

if (program.serialWatchers) {
  serialWatchers(program.serialWatchers, facade)
}

if (program.parallelWatchers) {
  parallelWatchers(program.parallelWatchers, facade)
}
