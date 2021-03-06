#!/usr/bin/env node

const program = require('commander')
const colors = require('colors')
const seedrandom = require('seedrandom')
const path = require('path')

const cli = require('./cli')
const {createFacade, available} = require('./facade')
const serialWatchers = require('./serial-watchers')
const parallelWatchers = require('./parallel-watchers')
const churn = require('./churn')
const gen = require('./gen')
const {setResourceLogFile, reportError} = require('./helpers')

colors.setTheme({
  banner: ['bold', 'inverse'],
  header: ['green', 'underline'],
  sidenote: 'dim',
  dangerBanner: ['red', 'bold', 'inverse'],
  danger: ['red', 'bold']
})

const watcherNames = available().join(', ')
const watcherRx = new RegExp('^(' + available().join('|') + ')$', 'i')

program
  .version(require('../package.json').version)
  .option('--use <impl>', `use specified watcher implementation (${watcherNames})`, watcherRx)
  .option('--seed <seed>', 'seed the PRNG for predictable output')
  .option('--logging-dir <path>', '(watcher only) produce diagnostic logging to files within a directory')
  .option('--log-main-stdout', '(watcher only) log main thread activity directly to stdout')
  .option('--log-worker-stdout', '(watcher only) log worker thread activity directly to stdout')
  .option('--log-polling-stdout', '(watcher only) log polling thread activity directly to stdout')
  .option('--poll', '(watcher only) force polling mode')
  .option('--polling-interval <ms>', '(watcher only) milliseconds between polling cycles', parseInt)
  .option('--polling-throttle <count>', '(watcher only) number of system calls to perform each cycle', parseInt)
  .option('--worker-cache <size>', '(watcher, MacOS only) recent stat calls to cache for rename correlation', parseInt)
  .option('--debounce <ms>', '(nsfw only) configure debouncing interval', parseInt)
  .option('-i, --interval <ms>', 'interval to publish resource usage statistics', parseInt)
  .option('-r, --resource-log <path>', 'log resource usage to a JSON file')
  .option('-c, --cli <paths,>', 'CLI mode', str => str.split(','))
  .option('-e, --exercise <exercise>', 'choose an exercise to perform (serial, parallel, churn)', /^(serial|parallel|churn)$/)
  .option('-r, --root <path>', 'specify a root path for exercises')
  .option('-g, --gen [path]', 'generate a random filesystem structure beneath a path')
  .option('--watcher-count <count>', 'configure the number of watchers for an exercise (default: 1000)', parseInt)
  .option('--churn-count <count>', 'number of randomized filesystem events to generate (default: 1000)', parseInt)
  .option('--churn-profile <path>', 'configure the relative occurrences of kinds of filesystem events')
  .option('--dir-chance <0..1>', 'chance to generate a new subdirectory (default: 0.05)', parseFloat)
  .option('--dir-count <count>', 'number of random directories to generate (default: 10)', parseInt)
  .option('--file-count <count>', 'number of random files to generate (default: 200)', parseInt)
  .parse(process.argv)

program.interval = program.interval || 10 * 60 * 1000
setResourceLogFile(program.resourceLog)

program.watcherCount = program.watcherCount || 1000
program.churnCount = program.churnCount || 1000
program.churnProfile = program.churnProfile || path.join(__dirname, 'default-churn-profile.json')

// Ensure a backing implementation is specified
const facade = createFacade(program.use)

// Ensure exactly one benchmarking action is specified
const actionOptions = [program.cli, program.exercise, program.gen].filter(option => option !== undefined).length
if (actionOptions !== 1) {
  console.error('You must specify exactly one of --cli, --exercise, or --gen.')
  program.help()
}

if (program.gen === true) {
  if (!program.root) {
    console.error('--gen requires a path or a --root.'.dangerBanner)
    program.help()
  }

  program.gen = program.root
}

// Attempt to load the churn profile
let churnProfile = null
if (program.exercise) {
  try {
    churnProfile = require(program.churnProfile)
  } catch (e) {
    console.error('Unable to load churn profile'.dangerBanner)
    console.error(e.toString().danger)
    program.help()
  }
}

const decodedSeed = program.seed
  ? Buffer.from(program.seed, 'base64').toString('utf8')
  : null

const seed = seedrandom(decodedSeed, {global: true})

const encodedSeed = Buffer.from(seed, 'utf8').toString('base64')
console.log(`--seed ${encodedSeed}\n\n`.dim)

async function main () {
  try {
    await facade.init({
      loggingDir: program.loggingDir,
      logMainStdout: program.logMainStdout,
      logWorkerStdout: program.logWorkerStdout,
      logPollingStdout: program.logPollingStdout,
      pollingInterval: program.pollingInterval,
      pollingThrottle: program.pollingThrottle,
      workerCacheSize: program.workerCache
    })

    if (program.cli) {
      await cli(program.cli, facade, {
        root: program.root,
        debounce: program.debounce,
        usageInterval: program.interval,
        poll: program.poll
      })
    } else if (program.gen) {
      await gen(program.gen, {
        dirChance: program.dirChance || 0.05,
        dirCount: program.dirCount || 10,
        fileCount: program.fileCount || 200
      })
    } else if (program.exercise === 'serial') {
      await serialWatchers(facade, {
        root: program.root,
        poll: program.poll,
        count: program.watcherCount || 1000,
        loggingDir: program.loggingDir,
        churnCount: program.churnCount,
        churnProfile
      })
    } else if (program.exercise === 'parallel') {
      await parallelWatchers(facade, {
        root: program.root,
        poll: program.poll,
        count: program.watcherCount || 1000,
        loggingDir: program.loggingDir,
        churnCount: program.churnCount,
        churnProfile
      })
    } else if (program.exercise === 'churn') {
      await churn(facade, {
        root: program.root,
        poll: program.poll,
        loggingDir: program.loggingDir,
        churnCount: program.churnCount,
        churnProfile,
        dirCount: program.dirCount || 10,
        fileCount: program.fileCount || 200
      })
    }

    process.exit(0)
  } catch (err) {
    reportError(err)
    process.exit(1)
  }
}

main()
