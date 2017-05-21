/*
 MIT License http://www.opensource.org/licenses/mit-license.php
 Author Tobias Koppers @sokra
 */
import { Dictionary } from './concord'
function globToRegExp(glob: string) {
    // * [^\\\/]*
    // /**/ /.+/
    // ^* \./.+ (concord special)
    // ? [^\\\/]
    // [!...] [^...]
    // [^...] [^...]
    // / [\\\/]
    // {...,...} (...|...)
    // ?(...|...) (...|...)?
    // +(...|...) (...|...)+
    // *(...|...) (...|...)*
    // @(...|...) (...|...)
    if (/^\(.+\)$/.test(glob)) {
        // allow to pass an RegExp in brackets
        return new RegExp(glob.substr(1, glob.length - 2))
    }
    const tokens = tokenize(glob)
    const process = createRoot()
    const regExpStr = tokens.map(process).join('')
    return new RegExp(`^${regExpStr}$`)
}

const SIMPLE_TOKENS: Dictionary<string> = {
    '@(': 'one',
    '?(': 'zero-one',
    '+(': 'one-many',
    '*(': 'zero-many',
    '|': 'segment-sep',
    '/**/': 'any-path-segments',
    '**': 'any-path',
    '*': 'any-path-segment',
    '?': 'any-char',
    '{': 'or',
    '/': 'path-sep',
    ',': 'comma',
    ')': 'closing-segment',
    '}': 'closing-or'
}

interface Token {
    type: string
    value?: string
}

function tokenize(glob: string) {
    return glob.split(/([@?+*]\(|\/\*\*\/|\*\*|[?*]|\[[\!\^]?(?:[^\]\\]|\\.)+\]|\{|,|\/|[|)}])/g)
        .map(item => {
            if (!item) {
                return null
            }
            const t = SIMPLE_TOKENS[item]
            if (t) {
                return {
                    type: t
                }
            }
            if (item[0] === '[') {
                if (item[1] === '^' || item[1] === '!') {
                    return {
                        type: 'inverted-char-set',
                        value: item.substr(2, item.length - 3)
                    }
                }
                else {
                    return {
                        type: 'char-set',
                        value: item.substr(1, item.length - 2)
                    }
                }
            }
            return {
                type: 'string',
                value: item
            }
        })
        .filter(Boolean)
        .concat({
            type: 'end'
        }) as Token[]
}

function createRoot() {
    const inOr = [] as boolean[]
    const process = createSegment()
    let initial = true
    return (token: Token) => {
        switch (token.type) {
            case 'or':
                inOr.push(initial)
                return '('
            case 'comma':
                if (inOr.length) {
                    initial = inOr[inOr.length - 1]
                    return '|'
                }
                else {
                    return process({
                        type: 'string',
                        value: ','
                    }, initial)
                }
            case 'closing-or':
                if (inOr.length === 0) {
                    throw new Error('Unmatched \'}\'')
                }
                inOr.pop()
                return ')'
            case 'end':
                if (inOr.length) {
                    throw new Error('Unmatched \'{\'')
                }
                return process(token, initial)
            default:
                const result = process(token, initial)
                initial = false
                return result
        }
    }
}

function createSegment() {
    const inSegment = [] as string[]
    const process = createSimple()
    return (token: Token, initial: boolean) => {
        switch (token.type) {
            case 'one':
            case 'one-many':
            case 'zero-many':
            case 'zero-one':
                inSegment.push(token.type)
                return '('
            case 'segment-sep':
                if (inSegment.length) {
                    return '|'
                }
                else {
                    return process({
                        type: 'string',
                        value: '|'
                    }, initial)
                }
            case 'closing-segment':
                const segment = inSegment.pop()
                switch (segment) {
                    case 'one':
                        return ')'
                    case 'one-many':
                        return ')+'
                    case 'zero-many':
                        return ')*'
                    case 'zero-one':
                        return ')?'
                }
                throw new Error("Unexcepted segment " + segment);
            case 'end':
                if (inSegment.length > 0) {
                    throw new Error('Unmatched segment, missing \')\'')
                }
                return process(token, initial)
            default:
                return process(token, initial)
        }
    }
}

function createSimple() {
    return (token: Token, initial: boolean) => {
        switch (token.type) {
            case 'path-sep':
                return '[\\\\/]+'
            case 'any-path-segments':
                return '[\\\\/]+(?:(.+)[\\\\/]+)?'
            case 'any-path':
                return '(.*)'
            case 'any-path-segment':
                if (initial) {
                    return '\\.[\\\\/]+(?:.*[\\\\/]+)?([^\\\\/]+)'
                }
                else {
                    return '([^\\\\/]*)'
                }
            case 'any-char':
                return '[^\\\\/]'
            case 'inverted-char-set':
                return `[^${token.value}]`
            case 'char-set':
                return `[${token.value}]`
            case 'string':
                return token.value.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
            case 'end':
                return ''
            default:
                throw new Error(`Unsupported token '${token.type}'`)
        }
    }
}

export { globToRegExp }
