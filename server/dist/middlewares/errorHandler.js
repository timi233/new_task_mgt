"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = exports.errorHandler = void 0;
const logger_1 = require("../utils/logger");
const log = (0, logger_1.createModuleLogger)('error-handler');
const errorHandler = (err, req, res, next) => {
    log.error('请求处理错误', { method: req.method, path: req.path, error: err.message, stack: err.stack });
    const statusCode = err.statusCode || 500;
    const code = err.code || 5000;
    const message = err.message || '服务器内部错误';
    res.status(statusCode).json({
        code,
        message,
        data: null,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
exports.errorHandler = errorHandler;
class ApiError extends Error {
    constructor(message, statusCode = 500, code = 5000) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
    static badRequest(message = '参数错误') {
        return new ApiError(message, 400, 1001);
    }
    static unauthorized(message = '未授权') {
        return new ApiError(message, 401, 1002);
    }
    static forbidden(message = '权限不足') {
        return new ApiError(message, 403, 1003);
    }
    static notFound(message = '资源不存在') {
        return new ApiError(message, 404, 1004);
    }
    static businessError(message = '业务逻辑错误') {
        return new ApiError(message, 400, 1005);
    }
    static internal(message = '服务器内部错误') {
        return new ApiError(message, 500, 5000);
    }
}
exports.ApiError = ApiError;
//# sourceMappingURL=errorHandler.js.map