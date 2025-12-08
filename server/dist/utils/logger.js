"use strict";
/**
 * 统一日志服务
 * 提供结构化、分级、带模块标签的日志输出
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createModuleLogger = exports.logger = exports.LogModule = exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["ERROR"] = 0] = "ERROR";
    LogLevel[LogLevel["WARN"] = 1] = "WARN";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["DEBUG"] = 3] = "DEBUG";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
var LogModule;
(function (LogModule) {
    // 业务模块
    LogModule["WORK_ORDER"] = "\u5DE5\u5355";
    LogModule["APPROVAL"] = "\u5BA1\u6279";
    LogModule["USER"] = "\u7528\u6237";
    LogModule["CUSTOMER"] = "\u5BA2\u6237";
    LogModule["EVALUATION"] = "\u8BC4\u4EF7";
    LogModule["STATISTICS"] = "\u7EDF\u8BA1";
    // 第三方服务
    LogModule["FEISHU"] = "\u98DE\u4E66";
    LogModule["FEISHU_WS"] = "\u98DE\u4E66WS";
    LogModule["FEISHU_CALLBACK"] = "\u98DE\u4E66\u56DE\u8C03";
    LogModule["FEISHU_MESSAGE"] = "\u98DE\u4E66\u6D88\u606F";
    // 系统模块
    LogModule["SERVER"] = "\u670D\u52A1\u5668";
    LogModule["DATABASE"] = "\u6570\u636E\u5E93";
    LogModule["AUTH"] = "\u8BA4\u8BC1";
    LogModule["MIDDLEWARE"] = "\u4E2D\u95F4\u4EF6";
    // 其他
    LogModule["SYSTEM"] = "\u7CFB\u7EDF";
})(LogModule || (exports.LogModule = LogModule = {}));
class Logger {
    constructor() {
        this.config = {
            level: process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG,
            enableColors: process.env.NODE_ENV !== 'production',
            enableTimestamp: true,
        };
        // 颜色代码
        this.colors = {
            reset: '\x1b[0m',
            bright: '\x1b[1m',
            dim: '\x1b[2m',
            red: '\x1b[31m',
            yellow: '\x1b[33m',
            blue: '\x1b[34m',
            cyan: '\x1b[36m',
            gray: '\x1b[90m',
        };
    }
    /**
     * 设置日志级别
     */
    setLevel(level) {
        this.config.level = level;
    }
    /**
     * 格式化时间戳
     */
    formatTimestamp() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const ms = String(now.getMilliseconds()).padStart(3, '0');
        return `${hours}:${minutes}:${seconds}.${ms}`;
    }
    /**
     * 应用颜色
     */
    colorize(text, color) {
        if (!this.config.enableColors)
            return text;
        return `${color}${text}${this.colors.reset}`;
    }
    /**
     * 格式化日志消息
     */
    formatMessage(level, module, message, data) {
        const parts = [];
        // 时间戳
        if (this.config.enableTimestamp) {
            const timestamp = this.colorize(this.formatTimestamp(), this.colors.gray);
            parts.push(timestamp);
        }
        // 日志级别
        let levelStr = '';
        let levelColor = this.colors.reset;
        switch (level) {
            case LogLevel.ERROR:
                levelStr = 'ERROR';
                levelColor = this.colors.red + this.colors.bright;
                break;
            case LogLevel.WARN:
                levelStr = 'WARN ';
                levelColor = this.colors.yellow;
                break;
            case LogLevel.INFO:
                levelStr = 'INFO ';
                levelColor = this.colors.blue;
                break;
            case LogLevel.DEBUG:
                levelStr = 'DEBUG';
                levelColor = this.colors.cyan;
                break;
        }
        parts.push(this.colorize(levelStr, levelColor));
        // 模块标签
        const moduleStr = `[${module}]`;
        parts.push(this.colorize(moduleStr, this.colors.bright));
        // 消息
        parts.push(message);
        return parts.join(' ');
    }
    /**
     * 输出日志
     */
    log(level, module, message, data) {
        if (level > this.config.level)
            return;
        const formattedMessage = this.formatMessage(level, module, message, data);
        // 根据级别选择输出方法
        if (level === LogLevel.ERROR) {
            console.error(formattedMessage);
            if (data !== undefined) {
                console.error(data);
            }
        }
        else if (level === LogLevel.WARN) {
            console.warn(formattedMessage);
            if (data !== undefined) {
                console.warn(data);
            }
        }
        else {
            console.log(formattedMessage);
            if (data !== undefined) {
                console.log(data);
            }
        }
    }
    /**
     * ERROR 级别日志
     */
    error(module, message, error) {
        this.log(LogLevel.ERROR, module, message, error);
    }
    /**
     * WARN 级别日志
     */
    warn(module, message, data) {
        this.log(LogLevel.WARN, module, message, data);
    }
    /**
     * INFO 级别日志
     */
    info(module, message, data) {
        this.log(LogLevel.INFO, module, message, data);
    }
    /**
     * DEBUG 级别日志
     */
    debug(module, message, data) {
        this.log(LogLevel.DEBUG, module, message, data);
    }
    /**
     * 创建模块专用日志器
     */
    module(module) {
        return {
            error: (message, error) => this.error(module, message, error),
            warn: (message, data) => this.warn(module, message, data),
            info: (message, data) => this.info(module, message, data),
            debug: (message, data) => this.debug(module, message, data),
        };
    }
}
// 导出单例
exports.logger = new Logger();
// 导出便捷方法
const createModuleLogger = (module) => exports.logger.module(module);
exports.createModuleLogger = createModuleLogger;
//# sourceMappingURL=logger.js.map