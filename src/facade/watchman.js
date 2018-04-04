const path = require('path')

let watchman = null
try {
  watchman = require('fb-watchman')
} catch (err) {
  //
}

const TYPES = new Map([
  ['b', 'file'],
  ['c', 'file'],
  ['d', 'directory'],
  ['f', 'file'],
  ['p', 'file'],
  ['l', 'symlink'],
  ['s', 'file'],
  ['D', 'file']
])

class WatcherFacade {
  static isLoaded () {
    return watchman !== null
  }

  init (options) {
    this.id = 0
    this.subscriptions = new Map()

    this.client = new watchman.Client()

    this.client.on('subscription', resp => {
      const callback = this.subscriptions.get(resp.subscription)
      if (!callback) {
        console.error(`Unrecognized subscription: ${resp.subscription}`)
        return
      }

      const events = resp.files.map(file => {
        return {
          action: file.exists ? 'modified' : 'deleted',
          kind: TYPES.get(file.type) || 'unknown',
          path: path.join(resp.root, file.name),
          oldPath: ''
        }
      })
      callback(null, events)
    })
  }

  async start (rootDir, options, callback) {
    return new Promise((resolve, reject) => {
      this.client.command(['watch-project', rootDir], (err, resp) => {
        if (err) {
          reject(err)
          return
        }

        if ('warning' in resp) {
          console.log(`warning: ${resp}`)
        }

        const sub = {
          fields: ['name', 'type', 'exists']
        }

        const subName = `sub-${this.id}`
        this.id++

        this.subscriptions.set(subName, callback)
        this.client.command(['subscribe', resp.watch, subName, sub], (err, resp) => {
          if (err) {
            reject(err)
            return
          }

          if ('warning' in resp) {
            console.log(`warning: ${resp}`)
          }
        })
      })

      resolve({
        stop: () => {
          return new Promise((resolve, reject) => {
            this.client.command(['unsubscribe', rootDir, subName], err => {
              if (err) {
                reject(err)
                return
              }
              resolve()
            })
          })
        }
      })
    })
  }
}

module.exports = {Constructor: WatcherFacade, name: 'watchman'}
