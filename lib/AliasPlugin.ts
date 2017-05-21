/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import createInnerCallback = require('./createInnerCallback');
import Resolver = require('./Resolver');
import { LoggingCallbackWrapper, ResolverRequest } from './common-types';
import { AliasItem } from './ResolverFactory';

function startsWith(string: string, searchString: string) {
    const stringLength = string.length;
    const searchLength = searchString.length;

    // early out if the search length is greater than the search string
    if (searchLength > stringLength) {
        return false;
    }
    let index = -1;
    while (++index < searchLength) {
        if (string.charCodeAt(index) !== searchString.charCodeAt(index)) {
            return false;
        }
    }
    return true;
}

class AliasPlugin {
    alias: string;
    name: string;
    onlyModule: boolean;

    constructor(
        public source: string,
        public options: AliasItem,
        public target: string,
    ) {
        this.name = options.name;
        this.alias = options.alias;
        this.onlyModule = options.onlyModule;
    }

    apply(resolver: Resolver) {
        const target = this.target;
        const name = this.name;
        const alias = this.alias;
        const onlyModule = this.onlyModule;
        resolver.plugin(this.source, function (request: ResolverRequest, callback: LoggingCallbackWrapper) {
            const innerRequest = request.request;
            if (!innerRequest) {
                return callback();
            }
            if (innerRequest === name || (!onlyModule && startsWith(innerRequest, `${name}/`))) {
                if (innerRequest !== alias && !startsWith(innerRequest, `${alias}/`)) {
                    const newRequestStr = alias + innerRequest.substr(name.length);
                    const obj = Object.assign({}, request, {
                        request: newRequestStr,
                    });
                    return resolver.doResolve(
                        target,
                        obj,
                        `aliased with mapping '${name}': '${alias}' to '${newRequestStr}'`,
                        createInnerCallback(function (err: Error, result) {
                            if (arguments.length > 0) {
                                return callback(err, result);
                            }

                            // don't allow other aliasing or raw request
                            callback(null, null);
                        }, callback),
                    );
                }
            }
            return callback();
        });
    }
}

export = AliasPlugin
