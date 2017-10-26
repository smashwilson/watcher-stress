const fs = require('fs-extra')

const {SingleEventMatcher, RenameEventMatcher} = require('./matcher')

class Change {
  constructor (tree) {
    this.tree = tree
  }
}

class FileCreationChange extends Change {
  async enact () {
    const filePath = await this.tree.createNewFile()
    return new SingleEventMatcher({
      action: 'created',
      kind: 'file',
      path: filePath
    })
  }
}

class FileModificationChange extends Change {
  async enact () {
    const filePath = this.tree.randomFile()
    await fs.appendFile('appended a line\n', filePath)
    return new SingleEventMatcher({
      action: 'modified',
      kind: 'file',
      path: filePath
    })
  }
}

class FileDeletionChange extends Change {
  async enact () {
    const filePath = this.tree.randomFile()
    this.tree.fileWasDeleted(filePath)
    await fs.unlink(filePath)
    return new SingleEventMatcher({
      action: 'deleted',
      kind: 'file',
      path: filePath
    })
  }
}

class FileRenameChange extends Change {
  async enact () {
    const beforePath = this.tree.randomFile()
    const afterPath = this.tree.newFileName()
    this.tree.fileWasDeleted(beforePath)
    await fs.rename(beforePath, afterPath)
    return new RenameEventMatcher({
      kind: 'file',
      oldPath: beforePath,
      newPath: afterPath
    })
  }
}

class DirectoryCreationChange extends Change {
  async enact () {
    const dirPath = await this.tree.createNewDirectory()
    return new SingleEventMatcher({
      action: 'created',
      kind: 'directory',
      path: dirPath
    })
  }
}

class DirectoryDeletionChange extends Change {
  async enact () {
    const dirPath = this.tree.randomEmptyDirectory()
    this.tree.directoryWasDeleted(dirPath)
    await fs.unlink(dirPath)
    return new SingleEventMatcher({
      action: 'deleted',
      kind: 'directory',
      path: dirPath
    })
  }
}

class DirectoryRenameChange extends Change {
  async enact () {
    const beforePath = this.tree.randomEmptyDirectory()
    const afterPath = this.tree.newDirectoryName()
    this.tree.directoryWasDeleted(beforePath)
    await fs.rename(beforePath, afterPath)
    return new RenameEventMatcher({
      kind: 'directory',
      oldPath: beforePath,
      newPath: afterPath
    })
  }
}

module.exports = {
  FileCreationChange,
  FileModificationChange,
  FileDeletionChange,
  FileRenameChange,
  DirectoryCreationChange,
  DirectoryDeletionChange,
  DirectoryRenameChange
}
