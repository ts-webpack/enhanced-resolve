/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import Resolver = require('./Resolver')

class FileKindPlugin {
    constructor(public source: string, public target: string) {
    }

    apply(resolver: Resolver) {
        const target = this.target
        resolver.plugin(this.source, function (request, callback) {
            if (request.directory) {
                return callback()
            }
            const obj = Object.assign({}, request)
            delete obj.directory
            resolver.doResolve(target, obj, null, callback)
        })
    }
}

export = FileKindPlugin