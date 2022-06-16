module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {}, _tempexports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = __MODS__[modId].m; m._exports = m._tempexports; var desp = Object.getOwnPropertyDescriptor(m, "exports"); if (desp && desp.configurable) Object.defineProperty(m, "exports", { set: function (val) { if(typeof val === "object" && val !== m._exports) { m._exports.__proto__ = val.__proto__; Object.keys(val).forEach(function (k) { m._exports[k] = val[k]; }); } m._tempexports = val }, get: function () { return m._tempexports; } }); __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1655364969007, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.createLyla = exports.LYLA_ERROR = exports.isLylaError = exports.defineLylaError = void 0;
var error_js_1 = require("./error.js");
Object.defineProperty(exports, "defineLylaError", { enumerable: true, get: function () { return error_js_1.defineLylaError; } });
Object.defineProperty(exports, "isLylaError", { enumerable: true, get: function () { return error_js_1.isLylaError; } });
Object.defineProperty(exports, "LYLA_ERROR", { enumerable: true, get: function () { return error_js_1.LYLA_ERROR; } });
var core_1 = require("./core");
Object.defineProperty(exports, "createLyla", { enumerable: true, get: function () { return core_1.createLyla; } });

}, function(modId) {var map = {"./error.js":1655364969008,"./core":1655364969009}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1655364969008, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.isLylaError = exports.defineLylaError = exports.LYLA_ERROR = void 0;
var LYLA_ERROR;
(function (LYLA_ERROR) {
    /**
     * Request encountered an error, fired by XHR `onerror` event. It doesn't mean
     * your network has error, for example CORS error also triggers NETWORK_ERROR.
     */
    LYLA_ERROR["NETWORK"] = "NETWORK";
    /**
     * Request is aborted.
     */
    LYLA_ERROR["ABORTED"] = "ABORTED";
    /**
     * Response text is not valid JSON.
     */
    LYLA_ERROR["INVALID_JSON"] = "INVALID_JSON";
    /**
     * Trying resolving `response.json` with `responseType='arraybuffer'` or
     * `responseType='blob'`.
     */
    LYLA_ERROR["INVALID_CONVERSION"] = "INVALID_CONVERSION";
    /**
     * Request timeout.
     */
    LYLA_ERROR["TIMEOUT"] = "TIMEOUT";
    /**
     * HTTP status error.
     */
    LYLA_ERROR["HTTP"] = "HTTP";
    /**
     * Request `options` is not valid. It's not a response error.
     */
    LYLA_ERROR["BAD_REQUEST"] = "BAD_REQUEST";
})(LYLA_ERROR = exports.LYLA_ERROR || (exports.LYLA_ERROR = {}));
class _LylaError extends Error {
}
function defineLylaError(lylaErrorProps, stack) {
    const lylaError = new _LylaError();
    lylaError.name = `LylaError[${lylaErrorProps.type}]`;
    if (stack) {
        lylaError.stack += stack;
    }
    return Object.assign(lylaError, lylaErrorProps);
}
exports.defineLylaError = defineLylaError;
function isLylaError(error) {
    return error instanceof _LylaError;
}
exports.isLylaError = isLylaError;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1655364969009, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.createLyla = void 0;
const error_js_1 = require("./error.js");
const utils_js_1 = require("./utils.js");
function isOkStatus(status) {
    return 200 <= status && status < 300;
}
function createLyla(lylaOptions) {
    async function request(options) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        if ((_a = lylaOptions === null || lylaOptions === void 0 ? void 0 : lylaOptions.hooks) === null || _a === void 0 ? void 0 : _a.onInit) {
            for (const hook of lylaOptions.hooks.onInit) {
                options = await hook(options);
            }
        }
        if ((_b = options === null || options === void 0 ? void 0 : options.hooks) === null || _b === void 0 ? void 0 : _b.onInit) {
            for (const hook of options.hooks.onInit) {
                options = await hook(options);
            }
        }
        let _options = (0, utils_js_1.mergeOptions)(lylaOptions, options);
        _options.method = (_c = _options.method) === null || _c === void 0 ? void 0 : _c.toUpperCase();
        _options.responseType = options.responseType || 'text';
        _options.url = _options.url || '';
        if (_options.baseUrl) {
            _options.url = (0, utils_js_1.mergeUrl)(_options.baseUrl, _options.url);
        }
        let stack;
        try {
            stack = (_d = new Error().stack) === null || _d === void 0 ? void 0 : _d.replace(/^Error/, '');
        }
        catch (_) { }
        // Resolve query string, patch it to URL
        if (_options.query) {
            const urlSearchParams = new URLSearchParams(_options.query);
            const queryString = urlSearchParams.toString();
            if (_options.url.includes('?')) {
                throw (0, error_js_1.defineLylaError)({
                    type: error_js_1.LYLA_ERROR.BAD_REQUEST,
                    message: "`options.query` can't be set if `options.url` contains '?'",
                    detail: undefined,
                    error: undefined,
                    response: undefined
                }, undefined);
            }
            if (queryString.length) {
                _options.url = _options.url + '?' + queryString;
            }
        }
        if ((_e = _options.hooks) === null || _e === void 0 ? void 0 : _e.onBeforeRequest) {
            for (const hook of (_f = _options.hooks) === null || _f === void 0 ? void 0 : _f.onBeforeRequest) {
                _options = await hook(_options);
            }
        }
        // Move json data to body as string
        if (_options.json !== undefined) {
            if (_options.body !== undefined) {
                throw (0, error_js_1.defineLylaError)({
                    type: error_js_1.LYLA_ERROR.BAD_REQUEST,
                    message: "`options.json` can't be used together `options.body`. If you want to use `options.json`, you should left `options.body` as `undefined`",
                    detail: undefined,
                    error: undefined,
                    response: undefined
                }, undefined);
            }
            _options.body = JSON.stringify(_options.json);
        }
        const { timeout, url = '', method = 'get', body, responseType = 'text', withCredentials = false, signal, onUploadProgress, onDownloadProgress } = _options;
        async function handleResponseError(error) {
            var _a, _b;
            if ((_a = _options.hooks) === null || _a === void 0 ? void 0 : _a.onResponseError) {
                for (const hook of (_b = _options.hooks) === null || _b === void 0 ? void 0 : _b.onResponseError) {
                    await hook(error);
                }
            }
        }
        let _resolve;
        let _reject;
        // make request headers
        const requestHeaders = {};
        (0, utils_js_1.mergeHeaders)(requestHeaders, lylaOptions.headers);
        (0, utils_js_1.mergeHeaders)(requestHeaders, options.headers);
        // Set 'content-type' header
        if (_options.json !== undefined) {
            requestHeaders['content-type'] =
                (_g = requestHeaders['content-type']) !== null && _g !== void 0 ? _g : 'application/json';
        }
        requestHeaders['accept'] = (_h = requestHeaders.accept) !== null && _h !== void 0 ? _h : '*/*';
        _options.headers = requestHeaders;
        let settled = false;
        function cleanup() {
            settled = true;
            if (signal) {
                signal.removeEventListener('abort', onAbortSignalReceived);
            }
        }
        let aborted = false;
        function onAbortSignalReceived() {
            if (aborted)
                return;
            aborted = true;
            const error = (0, error_js_1.defineLylaError)({
                type: error_js_1.LYLA_ERROR.ABORTED,
                message: 'Request aborted',
                detail: undefined,
                error: undefined,
                response: undefined
            }, stack);
            handleResponseError(error);
            _reject(error);
            adapterHandle.abort();
        }
        if (signal) {
            signal.addEventListener('abort', onAbortSignalReceived);
        }
        const adapterHandle = lylaOptions.adapter({
            url,
            method,
            body,
            json: _options.json,
            headers: requestHeaders,
            responseType,
            withCredentials,
            onNetworkError(detail) {
                const error = (0, error_js_1.defineLylaError)({
                    type: error_js_1.LYLA_ERROR.NETWORK,
                    message: 'Network error',
                    detail,
                    error: undefined,
                    response: undefined
                }, stack);
                handleResponseError(error);
                _reject(error);
            },
            onDownloadProgress,
            onUploadProgress,
            async onResponse(resp, detail) {
                var _a;
                if (aborted)
                    return;
                cleanup();
                let _json;
                let _jsonIsSet = false;
                let _cachedJson;
                let _cachedJsonParsingError;
                let response = {
                    requestOptions: _options,
                    status: resp.status,
                    statusText: resp.statusText,
                    headers: (0, utils_js_1.mergeHeaders)({}, resp.headers),
                    body: resp.body,
                    detail,
                    set json(value) {
                        _jsonIsSet = true;
                        _json = value;
                    },
                    get json() {
                        if (_jsonIsSet)
                            return _json;
                        if (responseType !== 'text') {
                            const error = (0, error_js_1.defineLylaError)({
                                type: error_js_1.LYLA_ERROR.INVALID_CONVERSION,
                                message: `Can not convert ${responseType} to JSON`,
                                detail: undefined,
                                error: undefined,
                                response
                            }, undefined);
                            handleResponseError(error);
                            throw error;
                        }
                        if (_cachedJson === undefined) {
                            try {
                                return (_cachedJson = JSON.parse(resp.body));
                            }
                            catch (e) {
                                _cachedJsonParsingError = e;
                            }
                        }
                        else {
                            return _cachedJson;
                        }
                        if (_cachedJsonParsingError) {
                            const error = (0, error_js_1.defineLylaError)({
                                type: error_js_1.LYLA_ERROR.INVALID_JSON,
                                message: _cachedJsonParsingError.message,
                                detail: undefined,
                                error: _cachedJsonParsingError,
                                response
                            }, undefined);
                            handleResponseError(error);
                            throw error;
                        }
                    }
                };
                if (!isOkStatus(resp.status)) {
                    const reason = `${resp.status} ${resp.statusText}`;
                    const error = (0, error_js_1.defineLylaError)({
                        type: error_js_1.LYLA_ERROR.HTTP,
                        message: `Request failed with ${reason}`,
                        detail: undefined,
                        error: undefined,
                        response
                    }, stack);
                    handleResponseError(error);
                    _reject(error);
                }
                if ((_a = _options.hooks) === null || _a === void 0 ? void 0 : _a.onAfterResponse) {
                    for (const hook of _options.hooks.onAfterResponse) {
                        response = await hook(response);
                    }
                }
                _resolve(response);
            }
        });
        const requestPromise = new Promise((resolve, reject) => {
            _resolve = resolve;
            _reject = (e) => {
                cleanup();
                reject(e);
            };
        });
        if (timeout) {
            setTimeout(() => {
                if (settled)
                    return;
                adapterHandle.abort();
                aborted = true;
                const error = (0, error_js_1.defineLylaError)({
                    type: error_js_1.LYLA_ERROR.TIMEOUT,
                    message: timeout
                        ? `Timeout of ${timeout}ms exceeded`
                        : 'Timeout exceeded',
                    detail: undefined,
                    error: undefined,
                    response: undefined
                }, stack);
                handleResponseError(error);
                _reject(error);
            }, timeout);
        }
        if (method === 'GET' && body) {
            throw (0, error_js_1.defineLylaError)({
                type: error_js_1.LYLA_ERROR.BAD_REQUEST,
                message: "Can not send a request with body in 'GET' method.",
                error: undefined,
                response: undefined,
                detail: undefined
            }, undefined);
        }
        return requestPromise;
    }
    function createRequestShortcut(method) {
        return (url, options) => {
            return request(Object.assign(Object.assign({}, options), { method,
                url }));
        };
    }
    function extend(options) {
        const extendedOptions = (0, utils_js_1.mergeOptions)(lylaOptions, options);
        return createLyla(extendedOptions).lyla;
    }
    return {
        lyla: Object.assign(request, {
            extend,
            get: createRequestShortcut('get'),
            post: createRequestShortcut('post'),
            put: createRequestShortcut('put'),
            patch: createRequestShortcut('patch'),
            head: createRequestShortcut('head'),
            delete: createRequestShortcut('delete'),
            options: createRequestShortcut('options'),
            trace: createRequestShortcut('trace'),
            connect: createRequestShortcut('connect')
        }),
        catchError(handler) {
            return (e) => {
                if ((0, error_js_1.isLylaError)(e)) {
                    return handler({ error: undefined, lylaError: e });
                }
                else {
                    return handler({ error: e, lylaError: undefined });
                }
            };
        },
        matchError(error, matcher) {
            if ((0, error_js_1.isLylaError)(error)) {
                return matcher({ lylaError: error, error: undefined });
            }
            else {
                return matcher({ lylaError: undefined, error });
            }
        }
    };
}
exports.createLyla = createLyla;

}, function(modId) { var map = {"./error.js":1655364969008,"./utils.js":1655364969010}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1655364969010, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeOptions = exports.mergeHeaders = exports.mergeUrl = void 0;
function mergeUrl(baseUrl, relativeUrl) {
    if (isAbsoluteUrl(relativeUrl)) {
        return relativeUrl;
    }
    return relativeUrl
        ? baseUrl.replace(/\/+$/, '') + '/' + relativeUrl.replace(/^\/+/, '')
        : baseUrl;
}
exports.mergeUrl = mergeUrl;
function isAbsoluteUrl(url) {
    // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
    // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
    // by any combination of letters, digits, plus, period, or hyphen.
    return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
}
function isObject(value) {
    return value && typeof value === 'object';
}
function mergeHeaders(target, source) {
    if (!source)
        return target;
    for (const [key, value] of Object.entries(source)) {
        if (value === undefined) {
            delete target[key];
        }
        else {
            target[key.toLowerCase()] = typeof value === 'string' ? value : `${value}`;
        }
    }
    return target;
}
exports.mergeHeaders = mergeHeaders;
function mergeOptions(...sources) {
    let merged = {};
    for (const source of sources) {
        if (Array.isArray(source)) {
            if (!Array.isArray(merged)) {
                merged = [];
            }
            merged.push(...source);
        }
        else if (isObject(source)) {
            for (let [key, value] of Object.entries(source)) {
                if (isObject(value) && key in merged) {
                    value = mergeOptions(merged[key], value);
                }
                merged[key] = value;
            }
        }
    }
    return merged;
}
exports.mergeOptions = mergeOptions;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1655364969007);
})()
//miniprogram-npm-outsideDeps=[]
//# sourceMappingURL=index.js.map