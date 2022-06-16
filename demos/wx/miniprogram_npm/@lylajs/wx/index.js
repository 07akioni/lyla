module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {}, _tempexports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = __MODS__[modId].m; m._exports = m._tempexports; var desp = Object.getOwnPropertyDescriptor(m, "exports"); if (desp && desp.configurable) Object.defineProperty(m, "exports", { set: function (val) { if(typeof val === "object" && val !== m._exports) { m._exports.__proto__ = val.__proto__; Object.keys(val).forEach(function (k) { m._exports[k] = val[k]; }); } m._tempexports = val }, get: function () { return m._tempexports; } }); __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1655364969011, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.matchError = exports.catchError = exports.lyla = void 0;
var instance_1 = require("./instance");
Object.defineProperty(exports, "lyla", { enumerable: true, get: function () { return instance_1.lyla; } });
Object.defineProperty(exports, "catchError", { enumerable: true, get: function () { return instance_1.catchError; } });
Object.defineProperty(exports, "matchError", { enumerable: true, get: function () { return instance_1.matchError; } });

}, function(modId) {var map = {"./instance":1655364969012}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1655364969012, function(require, module, exports) {

var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchError = exports.catchError = exports.lyla = void 0;
const core_1 = require("@lylajs/core");
const adapter_1 = require("./adapter");
_a = (0, core_1.createLyla)({ adapter: adapter_1.adapter }), exports.lyla = _a.lyla, exports.catchError = _a.catchError, exports.matchError = _a.matchError;

}, function(modId) { var map = {"./adapter":1655364969013}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1655364969013, function(require, module, exports) {

Object.defineProperty(exports, "__esModule", { value: true });
exports.adapter = void 0;
const adapter = ({ url, method, headers, body, responseType, onResponse, onNetworkError
// Not used, just leave it here
// json,
// withCredentials,
// onDownloadProgress,
// onUploadProgress,
 }) => {
    const requestTask = wx.request({
        url,
        method,
        header: headers,
        data: body,
        responseType,
        // https://developers.weixin.qq.com/miniprogram/dev/api/network/request/wx.request.html
        // Docs said if it's not json, response data won't be transformed to json.
        dataType: 'text',
        fail(res) {
            onNetworkError(res);
        },
        success(res) {
            onResponse({
                body: res.data,
                status: res.statusCode,
                statusText: `${res.statusCode}`,
                headers: res.header
            }, res);
        }
    });
    return {
        abort() {
            requestTask.abort();
        }
    };
};
exports.adapter = adapter;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1655364969011);
})()
//miniprogram-npm-outsideDeps=["@lylajs/core"]
//# sourceMappingURL=index.js.map