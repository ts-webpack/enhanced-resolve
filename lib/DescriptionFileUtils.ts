/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import forEachBail = require('./forEachBail')
import Resolver = require('./Resolver')

function loadDescriptionFile(resolver: Resolver, directory: string, filenames: string[], callback: (...args) => any) {
    (function findDescriptionFile(directory: string) {
        forEachBail(
            filenames,
            function (filename, callback) {
                const descriptionFilePath = resolver.join(directory, filename)
                if (resolver.fileSystem.readJson) {
                    resolver.fileSystem.readJson(descriptionFilePath, (err, content) => {
                        if (err) {
                            if (typeof err.code !== 'undefined') {
                                return callback()
                            }
                            return onJson(err)
                        }
                        onJson(null, content)
                    })
                }
                else {
                    resolver.fileSystem.readFile(descriptionFilePath, (err, content) => {
                        if (err) {
                            return callback()
                        }
                        let json
                        try {
                            json = JSON.parse(content)
                        } catch (e) {
                            onJson(e)
                        }
                        onJson(null, json)
                    })
                }

                function onJson(err: Error | null, content?: string) {
                    if (err) {
                        if (callback.log) {
                            callback.log(`${descriptionFilePath} (directory description file): ${err}`)
                        }
                        else {
                            err.message = `${descriptionFilePath} (directory description file): ${err}`
                        }
                        return callback(err)
                    }
                    callback(null, {
                        content,
                        directory,
                        path: descriptionFilePath
                    })
                }
            },
            function (err, result) {
                if (err) {
                    return callback(err)
                }
                if (result) {
                    return callback(null, result)
                }
                else {
                    const upDir = cdUp(directory)
                    if (!upDir) {
                        return callback()
                    }
                    else {
                        return findDescriptionFile(upDir)
                    }
                }
            }
        )
    })(directory)
}

function getField(content, field: string) {
    if (!content) {
        return undefined
    }
    if (Array.isArray(field)) {
        let current = content
        for (let j = 0; j < field.length; j++) {
            if (current === null || typeof current !== 'object') {
                current = null
                break
            }
            current = current[field[j]]
        }
        if (typeof current === 'object') {
            return current
        }
    }
    else {
        if (typeof content[field] === 'object') {
            return content[field]
        }
    }
}

function cdUp(directory: string) {
    if (directory === '/') {
        return null
    }
    const i = directory.lastIndexOf('/')
    const j = directory.lastIndexOf('\\')
    const p = i < 0 ? j : j < 0 ? i : i < j ? j : i
    if (p < 0) {
        return null
    }
    return directory.substr(0, p || 1)
}

export {
    loadDescriptionFile,
    getField,
    cdUp
}
