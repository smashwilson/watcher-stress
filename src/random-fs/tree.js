const path = require('path')
const fs = require('fs-extra')
const {atRandom, tempDir} = require('../helpers')
const {fileCreation: FileCreationChange, directoryCreation: DirectoryCreationChange} = require('./changes')

class Tree {
  constructor (opts) {
    this.prefix = opts.prefix || 'watcher-stress-'
    this.directoryChance = opts.directoryChance || 0.05

    this.id = 0
    this.root = opts.root

    this.directories = new Set()
    this.emptyDirectories = new Set()
    this.files = new Set()
  }

  namegen (prefix, suffix = '') {
    const name = `${prefix}${this.id}${suffix}`
    this.id++
    return name
  }

  newDirectoryName (notWithin = null) {
    return path.join(this.randomDirectory(notWithin), this.namegen('directory-'))
  }

  newFileName () {
    return path.join(this.randomDirectory(), this.namegen('file-', '.txt'))
  }

  getRoot () {
    return this.root
  }

  hasFile () {
    return this.files.size > 0
  }

  hasDirectory () {
    return this.directories.size > 0
  }

  hasEmptyDirectory () {
    return this.emptyDirectories.size > 0
  }

  randomDirectory (notWithin = null, notRoot = false) {
    if (this.directories.size === 0) console.trace()
    let potential = Array.from(this.directories)

    if (notWithin) {
      potential = potential.filter(dirPath => !dirPath.startsWith(dirPath))

      if (potential.length === 0) {
        return path.dirname(notWithin)
      }
    }

    if (notRoot) {
      potential = potential.filter(dirPath => dirPath !== this.root)
    }

    return atRandom(potential)
  }

  randomEmptyDirectory () {
    return atRandom(Array.from(this.emptyDirectories))
  }

  randomFile () {
    return atRandom(Array.from(this.files))
  }

  directoryWillBeAdded (dirPath) {
    this.emptyDirectories.delete(path.dirname(dirPath))
  }

  directoryWasAdded (dirPath, empty = true) {
    this.directories.add(dirPath)
    if (empty) {
      this.emptyDirectories.add(dirPath)
    }
  }

  fileWillBeAdded (filePath) {
    this.emptyDirectories.delete(path.dirname(filePath))
  }

  fileWasAdded (filePath) {
    this.files.add(filePath)
  }

  directoryWasDeleted (dirPath) {
    this.emptyDirectories.delete(dirPath)
    this.directories.delete(dirPath)
  }

  async directoryWasRenamed (beforePath, op, afterPath) {
    const beforeWasEmpty = this.emptyDirectories.has(beforePath)
    this.directoryWasDeleted(beforePath)

    const filesToAdd = new Set()
    const directoriesToAdd = new Set()
    const emptyDirectoriesToAdd = new Set()

    for (const existingFile of this.files) {
      if (existingFile.startsWith(beforePath + path.sep)) {
        this.files.delete(existingFile)
        filesToAdd.add(existingFile.replace(beforePath + path.sep, afterPath + path.sep))
      }
    }

    for (const existingDir of this.directories) {
      if (existingDir.startsWith(beforePath + path.sep)) {
        this.directories.delete(existingDir)
        const wasEmpty = this.emptyDirectories.delete(existingDir)

        const renamed = existingDir.replace(beforePath + path.sep, afterPath + path.sep)

        directoriesToAdd.add(renamed)
        if (wasEmpty) {
          emptyDirectoriesToAdd.add(renamed)
        }
      }
    }

    await op()

    for (const f of filesToAdd) this.files.add(f)
    for (const d of directoriesToAdd) this.directories.add(d)
    for (const d of emptyDirectoriesToAdd) this.emptyDirectories.add(d)

    this.directoryWasAdded(afterPath, beforeWasEmpty)

    if (beforePath === this.root) this.root = afterPath
  }

  fileWasDeleted (filePath) {
    return this.files.delete(filePath)
  }

  async generate (opts) {
    if (!this.root) {
      const tmp = await tempDir(this.prefix)
      this.root = path.join(tmp, 'root')
    }
    await fs.mkdirs(this.root)

    this.directories.add(this.root)

    let directoriesRemaining = opts.directoryCount || 100
    let filesRemaining = opts.fileCount || 1000

    while (directoriesRemaining > 0 || filesRemaining > 0) {
      if (directoriesRemaining > 0 && Math.random() < this.directoryChance) {
        const ch = new DirectoryCreationChange(this)
        ch.prepare()
        await ch.enact()
        directoriesRemaining--
      } else {
        const ch = new FileCreationChange(this)
        ch.prepare()
        await ch.enact()
        filesRemaining--
      }
    }
  }
}

module.exports = {Tree}
