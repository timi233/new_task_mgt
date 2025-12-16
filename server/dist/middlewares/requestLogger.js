"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
const logger_1 = require("../utils/logger");
const log = (0, logger_1.createModuleLogger)('http');
const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = { method: req.method, url: req.originalUrl, status: res.statusCode, duration: `${duration}ms` };
        if (res.statusCode >= 400) {
            log.warn('请求异常', logData);
        }
        else {
            log.debug('请求完成', logData);
        }
    });
    next();
};
exports.requestLogger = requestLogger;
//# sourceMappingURL=requestLogger.js.map