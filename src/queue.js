class PromiseQueue {
  constructor (parallelism) {
    this.parallelism = parallelism

    this.waiting = []
    this.running = new Set()
    this.becameEmpty = () => {}
  }

  enqueue (asyncFn) {
    return new Promise((resolve, reject) => {
      this.waiting.push({asyncFn, resolve, reject})
      this.next()
    })
  }

  next () {
    if (this.waiting.length === 0) {
      this.becameEmpty()
      return
    }

    if (this.running.size >= this.parallelism) {
      return
    }

    const {asyncFn, resolve, reject} = this.waiting.shift()
    const promise = asyncFn()
    this.running.add(promise)

    promise.then(
      () => {
        this.running.delete(promise)
        resolve()
        this.next()
      },
      err => {
        this.running.delete(promise)
        reject(err)
        this.next()
      }
    )
  }

  waitingCount () {
    return this.waiting.length
  }

  whenEmpty () {
    if (this.waiting.length === 0) {
      return Promise.resolve()
    }

    return new Promise(resolve => {
      this.becameEmpty = resolve
    })
  }
}

module.exports = {PromiseQueue}
